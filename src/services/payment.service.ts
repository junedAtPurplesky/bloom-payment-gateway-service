import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from 'config';

import { createSignature } from '../helpers';

const API_KEY = process.env.FISERV_API_KEY || '';
const API_SECRET = process.env.FISERV_API_SECRET || '';
const CHECKOUT_URL = 'https://prod.emea.api.fiservapps.com/sandbox/exp/v1/checkouts';
const ORDER_DETAILS_URL = 'https://prod.emea.api.fiservapps.com/sandbox/ipp/payments-gateway/v2/orders';

export const createCheckoutService = async (body: any) => {
  const clientRequestId = uuidv4();
  const timestamp = Date.now().toString();
  const rawSignature = API_KEY + clientRequestId + timestamp + JSON.stringify(body);
  const messageSignature = createSignature(rawSignature, API_SECRET);

  // Inject redirectBackUrls from config
  body.checkoutSettings = body.checkoutSettings || {};
  body.checkoutSettings.redirectBackUrls = {
    successUrl: config.get('paymentRedirectSuccessUrl'),
    failureUrl: config.get('paymentRedirectFailureUrl'),
  };

  const headers = {
    'Api-Key': API_KEY,
    'Client-Request-Id': clientRequestId,
    'Timestamp': timestamp,
    'Message-Signature': messageSignature,
    'Content-Type': 'application/json',
  };

  const response = await axios.post(CHECKOUT_URL, body, { headers });
  return response.data;
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