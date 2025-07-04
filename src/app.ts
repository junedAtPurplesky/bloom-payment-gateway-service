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

import { AppDataSource } from './utils/data-source';
import AppError from './utils/appError';
import validateEnv from './utils/validateEnv';
import { paymentGatewayRouter } from './routes/payment.routes';


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

    // 3. Cookie Parser
    app.use(cookieParser());

    // 4. Cors
    app.use(
      cors({
        origin: config.get<string>('origin'),
        credentials: true,
      })
    );

    app.use(helmet());

    // Rate limiting for gateway routes
    const gatewayLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });

    app.use('/api/gateway', gatewayLimiter);

    // ROUTES
    app.use('/api/gateway/payment', paymentGatewayRouter);

    // HEALTH CHECKER
    app.get('/api/healthChecker', async (_, res: Response) => {

      res.status(200).json({
        status: 'success',
        message: 'Welcome to Payment Gateway, lets get started',
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
