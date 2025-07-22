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
  const startTime = Date.now();
  
  try {
    const result = await createCheckoutService(req.body, req);
    
    // Log transaction to Dynatrace
    try {
      await dynatraceService.logTransaction({
        transactionId: result.order?.orderId || 'unknown',
        amount: req.body.amount || 0,
        currency: req.body.currency || 'USD',
        status: 'initiated',
        merchantId: req.body.merchantId,
        customerId: req.body.customerId
      });
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log transaction:', dynatraceError);
    }
    
    res.status(200).json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error(error?.message || 'Unknown error');
      await dynatraceService.logError(errorObj, 'initiate_payment', req.body?.orderId);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log error:', dynatraceError);
    }
    
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
  const startTime = Date.now();
  
  try {
    const { orderId } = req.params;
    const result = await getOrderDetailsService(orderId);
    res.status(200).json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error(error?.message || 'Unknown error');
      await dynatraceService.logError(errorObj, 'get_order_details', req.params.orderId);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log error:', dynatraceError);
    }
    
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
  const startTime = Date.now();
  
  try {
    // Log successful payment to Dynatrace
    if (orderId) {
      try {
        await dynatraceService.logTransaction({
          transactionId: orderId as string,
          amount: 0, // Amount would be retrieved from transaction
          currency: 'USD', // Default currency
          status: 'success'
        });
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to log success transaction:', dynatraceError);
      }
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
        try {
          const errorObj = salesforceError instanceof Error ? salesforceError : new Error('Salesforce update failed');
          await dynatraceService.logError(errorObj, 'salesforce_success_update', orderId as string);
        } catch (dynatraceError) {
          console.error('[DYNATRACE] Failed to log Salesforce error:', dynatraceError);
        }
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Error in payment success handler:', error);
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error('Payment success handler error');
      await dynatraceService.logError(errorObj, 'payment_success_handler', orderId as string);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log error:', dynatraceError);
    }
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
 *     responses:
 *       200:
 *         description: Failure page rendered
 */
export const paymentFailureHandler = async (req: Request, res: Response) => {
  const { orderId } = req.query;
  const startTime = Date.now();
  
  try {
    // Log failed payment to Dynatrace
    if (orderId) {
      try {
        await dynatraceService.logTransaction({
          transactionId: orderId as string,
          amount: 0, // Amount would be retrieved from transaction
          currency: 'USD', // Default currency
          status: 'failed'
        });
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to log failure transaction:', dynatraceError);
      }
    }

    // Update payment status in Salesforce if orderId is provided
    if (orderId) {
      try {
        await salesforceService.updatePaymentStatus(
          orderId as string,
          'Failed',
          'Payment processing failed',
          orderId as string
        );
        console.log(`✅ Payment failure status updated in Salesforce for order: ${orderId}`);
      } catch (salesforceError) {
        console.error('❌ Failed to update Salesforce payment failure status:', salesforceError);
        console.log(`📝 Payment failure logged locally for order: ${orderId}`);
        // Don't fail the request if Salesforce update fails
        // Log error to Dynatrace
        try {
          const errorObj = salesforceError instanceof Error ? salesforceError : new Error('Salesforce failure update failed');
          await dynatraceService.logError(errorObj, 'salesforce_failure_update', orderId as string);
        } catch (dynatraceError) {
          console.error('[DYNATRACE] Failed to log Salesforce error:', dynatraceError);
        }
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Error in payment failure handler:', error);
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error('Payment failure handler error');
      await dynatraceService.logError(errorObj, 'payment_failure_handler', orderId as string);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log error:', dynatraceError);
    }
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
  const startTime = Date.now();
  
  try {
    const eventType = req.body?.eventType || 'unknown';
    const orderId = req.body?.orderId || req.body?.order?.orderId;
    
    if (orderId) {
      const dbStartTime = Date.now();
      const transaction = await AppDataSource.manager.findOne(PaymentTransaction, { where: { orderId } });
      const dbDuration = Date.now() - dbStartTime;
      
      // Trace database operation
      try {
        await dynatraceService.traceDatabaseOperation('SELECT', 'payment_transactions', dbDuration);
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to trace database operation:', dynatraceError);
      }
      
      if (transaction) {
        const updateStartTime = Date.now();
        transaction.webhookReceived = true;
        transaction.status = req.body?.status || transaction.status;
        await AppDataSource.manager.save(transaction);
        const updateDuration = Date.now() - updateStartTime;
        
        // Trace database update operation
        try {
          await dynatraceService.traceDatabaseOperation('UPDATE', 'payment_transactions', updateDuration);
        } catch (dynatraceError) {
          console.error('[DYNATRACE] Failed to trace database update:', dynatraceError);
        }
        
        // Log webhook event to Dynatrace
        try {
          await dynatraceService.logTransaction({
            transactionId: orderId,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status
          });
        } catch (dynatraceError) {
          console.error('[DYNATRACE] Failed to log webhook transaction:', dynatraceError);
        }
      }
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error('Webhook handler error');
      await dynatraceService.logError(errorObj, 'webhook_handler');
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log webhook error:', dynatraceError);
    }
    
    res.status(500).json({ error: (error as any).message || 'Internal server error' });
  }
};
