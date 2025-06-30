import { Request, Response } from "express";
import { createCheckoutService, getOrderDetailsService } from '../services/payment.service';

export const intiatePayment = async (req: Request, res: Response) => {
  try {
    const result = await createCheckoutService(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await getOrderDetailsService(orderId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const paymentSuccessHandler = (req: Request, res: Response) => {
  const { orderId } = req.query;
  res.render('payment-success', { orderId });
};

export const paymentFailureHandler = (req: Request, res: Response) => {
  const { orderId } = req.query;
  res.render('payment-failure', { orderId });
};
