import express from "express";
import { intiatePayment, getOrderDetails, paymentSuccessHandler, paymentFailureHandler, paymentWebhookHandler } from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import { createCheckoutZodSchema } from '../schemas/payment.schema';
import { apiKeyMiddleware } from '../middleware/apiKey';

const router = express.Router();

router.get('/success', paymentSuccessHandler);
router.use(apiKeyMiddleware);

router.post('/initiatePayment', validate(createCheckoutZodSchema), intiatePayment);
router.get('/order/:orderId', getOrderDetails);
router.get('/failure', paymentFailureHandler);
router.post('/webhook', paymentWebhookHandler);

export { router as paymentGatewayRouter };
