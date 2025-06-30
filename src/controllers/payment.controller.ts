import { Request, Response } from "express";

import { createCheckoutService, getOrderDetailsService } from '../services';

export const paymentController = () => {
  const initiatePayment = async (req: Request, res: Response) => {
    try {
      const result = await createCheckoutService(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  const getOrderDetails = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const result = await getOrderDetailsService(orderId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  return {
    initiatePayment,
    getOrderDetails,
  }
}
