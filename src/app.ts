require('dotenv').config();
import express, { NextFunction, Request, Response } from 'express';
import config from 'config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
// import nodemailer from 'nodemailer';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { AppDataSource } from './utils/data-source';
import AppError from './utils/appError';
import validateEnv from './utils/validateEnv';
import { paymentGatewayRouter } from './routes/payment.routes';
import { apiLogger } from './middleware/logger';
import { specs } from './utils/swagger';
import { dynatraceService } from './utils/dynatrace';
import { salesforceService } from './services/salesforce.service';

// (async function () {
//   const credentials = await nodemailer.createTestAccount();
//   console.log(credentials);
// })();

AppDataSource.initialize()
  .then(async () => {
    console.log("Database connected successfully !");
    // VALIDATE ENV
    validateEnv();

    const app = express();

    // MIDDLEWARE

    // 1. Body parser
    app.use(express.json({ limit: '10kb' }));

    // 2. Logger
    if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

    // 3. API Logger (custom logging)
    app.use(apiLogger);

    // 4. Cookie Parser
    app.use(cookieParser());

    // 5. Cors
    app.use(
      cors({
        origin: config.get<string>('origin'),
        credentials: true,
      })
    );

    // Configure helmet with CSP that allows inline scripts for payment pages
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: []
        }
      }
    }));

    // Rate limiting for gateway routes
    const gatewayLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });

    app.use('/api/gateway', gatewayLimiter);

    // Swagger Documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Bloom Payment Gateway API Documentation'
    }));

    // ROUTES
    app.use('/api/gateway/payment', paymentGatewayRouter);

    // HEALTH CHECKER
    app.get('/api/healthChecker', async (_, res: Response) => {
      const dynatraceStatus = dynatraceService.getStatus();
      const salesforceStatus = salesforceService.getStatus();
      
      res.status(200).json({
        status: 'success',
        message: 'Welcome to Payment Gateway, lets get started',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: 'connected',
          dynatrace: dynatraceStatus,
          salesforce: salesforceStatus
        }
      });
    });

    // UNHANDLED ROUTE
    app.all('*', (req: Request, res: Response, next: NextFunction) => {
      next(new AppError(404, `Route ${req.originalUrl} not found`));
    });

    // GLOBAL ERROR HANDLER
    app.use(
      (error: AppError, req: Request, res: Response, next: NextFunction) => {
        error.status = error.status || 'error';
        error.statusCode = error.statusCode || 500;

        res.status(error.statusCode).json({
          status: error.status,
          message: error.message,
        });
      }
    );

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    const port = config.get<number>('port');
    app.listen(port);
    console.log(`Server started with pid: ${process.pid} on port: ${port}`);
  })
  .catch((error) => console.log("Connection Failed::", error));
