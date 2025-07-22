import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from 'config';
import { AppDataSource } from '../utils/data-source';
import { PaymentTransaction } from '../entities/paymentTransaction.entity';
import { createSignature } from '../helpers';
import { dynatraceService } from '../utils/dynatrace';

const API_KEY = config.get<string>('apiKey');
const API_SECRET = config.get<string>('apiSecret');
const CHECKOUT_URL = config.get<string>('checkoutUrl');
const ORDER_DETAILS_URL = config.get<string>('orderDetailsUrl');

interface PaymentAmount {
  total: number;
  currency: string;
}

interface PaymentOrder {
  orderId: string;
  orderDetails: { invoiceNumber: string };
  billing: {
    person: { firstName: string; lastName: string };
    contact: { mobilePhone: string; email: string };
    address: { address1: string; city: string; country: string; postalCode: string };
  };
}

interface PaymentInput {
  storeId: string;
  transactionType: string;
  transactionOrigin: string;
  transactionAmount: PaymentAmount;
  order: PaymentOrder;
  checkoutSettings: {
    webHooksUrl: string;
    redirectBackUrls: {
      successUrl: string;
      failureUrl: string;
    };
  }
}

export const createCheckoutService = async (
  input: PaymentInput,
  req?: { ip?: string; headers?: Record<string, string | string[] | undefined> }
) => {
  const clientRequestId = uuidv4();
  const timestamp = Date.now();
  const startTime = Date.now();

  const body = {
    storeId: input.storeId,
    transactionType: input.transactionType,
    transactionOrigin: input.transactionOrigin,
    transactionAmount: input.transactionAmount,
    checkoutSettings: {
      webHooksUrl: input.checkoutSettings.webHooksUrl,
      redirectBackUrls: {
        successUrl: input.checkoutSettings.redirectBackUrls.successUrl,
        failureUrl: input.checkoutSettings.redirectBackUrls.successUrl,
      },
    },
    order: input.order,
  };

  const requestBody = JSON.stringify(body);
  const rawSignature = API_KEY + clientRequestId + timestamp + requestBody;
  const messageSignature = createSignature(rawSignature, API_SECRET);

  const headers = {
    'Api-Key': API_KEY,
    'Client-Request-Id': clientRequestId,
    'Timestamp': String(timestamp),
    'Message-Signature': messageSignature,
    'Content-Type': 'application/json',
  };

  try {
    // Trace outgoing request to Fiserv API
    const apiStartTime = Date.now();
    const response = await axios.post(CHECKOUT_URL, requestBody, { headers });
    const apiDuration = Date.now() - apiStartTime;
    
    // Log outgoing request to Dynatrace
    try {
      await dynatraceService.traceOutgoingRequest(CHECKOUT_URL, 'POST', apiDuration);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to trace outgoing request:', dynatraceError);
    }

    // Save transaction to database with tracing
    const dbStartTime = Date.now();
    const transaction = await AppDataSource.manager.save(
      Object.assign(new PaymentTransaction(), {
        orderId: response.data.order?.orderId || '',
        amount: body.transactionAmount.total,
        currency: body.transactionAmount.currency,
        status: response.data.status || 'pending',
        gatewayResponse: JSON.stringify(response.data),
        clientRequestId,
        ipAddress: req?.ip || '',
        userAgent: req?.headers?.['user-agent']?.toString() || '',
        webhookReceived: false,
      })
    );
    const dbDuration = Date.now() - dbStartTime;
    
    // Log database operation to Dynatrace
    try {
      await dynatraceService.traceDatabaseOperation('INSERT', 'payment_transactions', dbDuration);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to trace database operation:', dynatraceError);
    }

    // Add custom metrics
    try {
      await dynatraceService.addCustomMetric('payment_transactions_created', 1);
      await dynatraceService.addCustomMetric('payment_amount_total', body.transactionAmount.total, 'Currency');
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to add custom metrics:', dynatraceError);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[PAYMENT] Checkout completed in ${totalDuration}ms for order ${response.data.order?.orderId}`);

    return response.data;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error('Checkout service error');
      await dynatraceService.logError(errorObj, 'create_checkout_service', clientRequestId);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log error:', dynatraceError);
    }

    // Add error metrics
    try {
      await dynatraceService.addCustomMetric('payment_transactions_failed', 1);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to add error metric:', dynatraceError);
    }

    console.error(`[PAYMENT] Checkout failed after ${totalDuration}ms:`, error);

    if (axios.isAxiosError(error) && error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
      };
    }
    return {
      status: 500,
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
};

export const getOrderDetailsService = async (orderId: string) => {
  const clientRequestId = uuidv4();
  const timestamp = Date.now().toString();
  const startTime = Date.now();
  
  const rawSignature = API_KEY + clientRequestId + timestamp;
  const messageSignature = createSignature(rawSignature, API_SECRET);

  const headers = {
    'Api-Key': API_KEY,
    'Client-Request-Id': clientRequestId,
    'Timestamp': timestamp,
    'Message-Signature': messageSignature,
    'Content-Type': 'application/json',
  };

  const url = `${ORDER_DETAILS_URL}/${orderId}`;
  
  try {
    // Trace outgoing request to Fiserv API
    const apiStartTime = Date.now();
    const response = await axios.get(url, { headers });
    const apiDuration = Date.now() - apiStartTime;
    
    // Log outgoing request to Dynatrace
    try {
      await dynatraceService.traceOutgoingRequest(url, 'GET', apiDuration);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to trace outgoing request:', dynatraceError);
    }

    // Add custom metrics
    try {
      await dynatraceService.addCustomMetric('order_details_requests', 1);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to add custom metric:', dynatraceError);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[PAYMENT] Order details retrieved in ${totalDuration}ms for order ${orderId}`);

    return response.data;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    // Log error to Dynatrace
    try {
      const errorObj = error instanceof Error ? error : new Error('Get order details service error');
      await dynatraceService.logError(errorObj, 'get_order_details_service', orderId);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to log error:', dynatraceError);
    }

    // Add error metrics
    try {
      await dynatraceService.addCustomMetric('order_details_requests_failed', 1);
    } catch (dynatraceError) {
      console.error('[DYNATRACE] Failed to add error metric:', dynatraceError);
    }

    console.error(`[PAYMENT] Order details failed after ${totalDuration}ms:`, error);

    // Return proper error response from Fiserv instead of throwing
    if (axios.isAxiosError(error) && error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
      };
    }
    return {
      status: 500,
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}; 