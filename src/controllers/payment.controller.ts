import { Request, Response } from "express";
import { createCheckoutService, getOrderDetailsService } from '../services/payment.service';
import { salesforceService } from '../services/salesforce.service';
import { AppDataSource } from '../utils/data-source';
import { PaymentTransaction } from '../entities/paymentTransaction.entity';
import { dynatraceService } from '../utils/dynatrace';

/**
 * @swagger
 * /api/gateway/payment/initiate:
 *   post:
 *     summary: Initiate a payment transaction
 *     tags: [Payment]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency (e.g., USD, EUR)
 *               merchantId:
 *                 type: string
 *                 description: Merchant identifier
 *               customerId:
 *                 type: string
 *                 description: Customer identifier
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 checkoutUrl:
 *                   type: string
 *                 orderId:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
export const intiatePayment = async (req: Request, res: Response) => {
  try {
    const result = await createCheckoutService(req.body, req);
    
    // Log transaction to Dynatrace
    await dynatraceService.logTransaction({
      transactionId: result.orderId,
      amount: req.body.amount,
      currency: req.body.currency,
      status: 'initiated',
      merchantId: req.body.merchantId,
      customerId: req.body.customerId
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    // Log error to Dynatrace
    await dynatraceService.logError(error, 'initiate_payment');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/gateway/payment/order/{orderId}:
 *   get:
 *     summary: Get order details by order ID
 *     tags: [Payment]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order identifier
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 order:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await getOrderDetailsService(orderId);
    res.status(200).json(result);
  } catch (error: any) {
    // Log error to Dynatrace
    await dynatraceService.logError(error, 'get_order_details', req.params.orderId);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/gateway/payment/success:
 *   get:
 *     summary: Payment success page
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Order identifier (same as paymentId)
 *     responses:
 *       200:
 *         description: Success page rendered
 */
export const paymentSuccessHandler = async (req: Request, res: Response) => {
  const { orderId } = req.query;
  
  try {
    // Log successful payment to Dynatrace
    if (orderId) {
      await dynatraceService.logTransaction({
        transactionId: orderId as string,
        amount: 0, // Amount would be retrieved from transaction
        currency: 'USD', // Default currency
        status: 'success'
      });
    }

    // Update payment status in Salesforce if orderId is provided
    if (orderId) {
      try {
        await salesforceService.updatePaymentStatus(
          orderId as string,
          'Success',
          'Payment processed successfully',
          orderId as string
        );
        console.log(`✅ Payment status updated in Salesforce for order: ${orderId}`);
      } catch (salesforceError) {
        console.error('❌ Failed to update Salesforce payment status:', salesforceError);
        console.log(`📝 Payment success logged locally for order: ${orderId}`);
        // Don't fail the request if Salesforce update fails
        // Log error to Dynatrace
        await dynatraceService.logError(salesforceError as Error, 'salesforce_success_update', orderId as string);
      }
    }
  } catch (error) {
    console.error('Error in payment success handler:', error);
    // Log error to Dynatrace
    await dynatraceService.logError(error as Error, 'payment_success_handler');
  }
  
  // Add cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.render('payment-success', { orderId: orderId || null });
};

/**
 * @swagger
 * /api/gateway/payment/failure:
 *   get:
 *     summary: Payment failure page
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Order identifier (same as paymentId)
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error message
 *     responses:
 *       200:
 *         description: Failure page rendered
 */
export const paymentFailureHandler = async (req: Request, res: Response) => {
  const { orderId, error } = req.query;
  
  // Log failed payment access
  console.log(`Payment failure page accessed for order: ${orderId}`);
  
  try {
    // Log failed payment to Dynatrace
    if (orderId) {
      await dynatraceService.logTransaction({
        transactionId: orderId as string,
        amount: 0, // Amount would be retrieved from transaction
        currency: 'USD', // Default currency
        status: 'failed'
      });
    }

    // Update payment status in Salesforce if orderId is provided
    if (orderId) {
      try {
        const errorMessage = error as string || 'Payment processing failed';
        await salesforceService.updatePaymentStatus(
          orderId as string,
          'Failed',
          errorMessage,
          orderId as string
        );
      } catch (salesforceError) {
        console.error('Failed to update Salesforce payment status:', salesforceError);
        // Don't fail the request if Salesforce update fails
        // Log error to Dynatrace
        await dynatraceService.logError(salesforceError as Error, 'salesforce_failure_update', orderId as string);
      }
    }
  } catch (error) {
    console.error('Error in payment failure handler:', error);
    // Log error to Dynatrace
    await dynatraceService.logError(error as Error, 'payment_failure_handler');
  }
  
  // Add cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.render('payment-failure', { orderId: orderId || null });
};

/**
 * @swagger
 * /api/gateway/payment/webhook:
 *   post:
 *     summary: Payment webhook handler
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *               orderId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       500:
 *         description: Internal server error
 */
export const paymentWebhookHandler = async (req: Request, res: Response) => {
  try {
    const eventType = req.body?.eventType || 'unknown';
    const orderId = req.body?.orderId || req.body?.order?.orderId;
    
    if (orderId) {
      const transaction = await AppDataSource.manager.findOne(PaymentTransaction, { where: { orderId } });
      if (transaction) {
        transaction.webhookReceived = true;
        transaction.status = req.body?.status || transaction.status;
        await AppDataSource.manager.save(transaction);
        
        // Log webhook event to Dynatrace
        await dynatraceService.logTransaction({
          transactionId: orderId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status
        });
      }
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    // Log error to Dynatrace
    await dynatraceService.logError(error as Error, 'webhook_handler');
    res.status(500).json({ error: (error as any).message || 'Internal server error' });
  }
};
