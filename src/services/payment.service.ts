import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from 'config';
import { AppDataSource } from '../utils/data-source';
import { PaymentTransaction } from '../entities/paymentTransaction.entity';
import { createSignature } from '../helpers';

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
}

export const createCheckoutService = async (
  input: PaymentInput,
  req?: { ip?: string; headers?: Record<string, string | string[] | undefined> }
) => {
  const clientRequestId = uuidv4();
  const timestamp = Date.now();

  const body = {
    storeId: input.storeId,
    transactionType: input.transactionType,
    transactionOrigin: input.transactionOrigin,
    transactionAmount: input.transactionAmount,
    checkoutSettings: {
      webHooksUrl: config.get<string>('paymentWebhookUrl'),
      redirectBackUrls: {
        successUrl: config.get<string>('paymentRedirectSuccessUrl'),
        failureUrl: config.get<string>('paymentRedirectFailureUrl'),
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
    const response = await axios.post(CHECKOUT_URL, requestBody, { headers });
    await AppDataSource.manager.save(
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
    return response.data;
  } catch (error) {
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
  const response = await axios.get(url, { headers });
  return response.data;
}; 