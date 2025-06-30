import express from "express";
import { intiatePayment, getOrderDetails, paymentSuccessHandler, paymentFailureHandler } from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import { createCheckoutZodSchema } from '../schemas/payment.schema';
import { apiKeyMiddleware } from '../middleware/apiKey';

const router = express.Router();

router.use(apiKeyMiddleware);

router.post('/intiatePayment', validate(createCheckoutZodSchema), intiatePayment);
router.get('/order/:orderId', getOrderDetails);
router.get('/success', paymentSuccessHandler);
router.get('/failure', paymentFailureHandler);

export { router as paymentGatewayRouter };
