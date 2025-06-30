import express from "express";
import { deserializeUser } from "../middleware/deserializeUser";
import { requireUser } from "../middleware/requireUser";
import { paymentController } from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import { createCheckoutSchema } from "schemas/payment.schema";

const router = express.Router();

// Ensure user is authenticated
router.use(deserializeUser, requireUser);

router.post('/initiatePayment', validate(createCheckoutSchema), paymentController().initiatePayment);

export { router as paymentRouter };
