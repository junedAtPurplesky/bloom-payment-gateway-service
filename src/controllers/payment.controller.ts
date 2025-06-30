import { Request, Response } from "express";
import { createCheckoutService, getOrderDetailsService } from '../services/payment.service';
import { AppDataSource } from '../utils/data-source';
import { WebhookEvent } from '../entities/webhookEvent.entity';
import { PaymentTransaction } from '../entities/paymentTransaction.entity';

export const intiatePayment = async (req: Request, res: Response) => {
  try {
    const result = await createCheckoutService(req.body, req);
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

export const paymentWebhookHandler = async (req: Request, res: Response) => {
  try {
    const eventType = req.body?.eventType || 'unknown';
    const orderId = req.body?.orderId || req.body?.order?.orderId;
    let relatedTransactionId: string | undefined = undefined;
    if (orderId) {
      const transaction = await AppDataSource.manager.findOne(PaymentTransaction, { where: { orderId } });
      if (transaction) {
        relatedTransactionId = transaction.id;
        transaction.webhookReceived = true;
        transaction.status = req.body?.status || transaction.status;
        await AppDataSource.manager.save(transaction);
      }
    }
    const webhookEvent = new WebhookEvent();
    webhookEvent.eventType = eventType;
    webhookEvent.payload = JSON.stringify(req.body);
    webhookEvent.relatedTransactionId = relatedTransactionId;
    webhookEvent.processed = true;
    await AppDataSource.manager.save(webhookEvent);
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: (error as any).message || 'Internal server error' });
  }
};
