import { z } from 'zod';

export const createCheckoutZodSchema = z.object({
  storeId: z.string(),
  transactionType: z.string(),
  transactionOrigin: z.string(),
  transactionAmount: z.object({
    total: z.number(),
    currency: z.string(),
  }),
  checkoutSettings: z.object({
    webHooksUrl: z.string().url(),
    redirectBackUrls: z.object({
      successUrl: z.string().url(),
      failureUrl: z.string().url(),
    }),
  }),
  order: z.object({
    orderId: z.string(),
    orderDetails: z.object({
      invoiceNumber: z.string(),
    }),
    billing: z.object({
      person: z.object({
        firstName: z.string(),
        lastName: z.string(),
      }),
      contact: z.object({
        mobilePhone: z.string(),
        email: z.string().email(),
      }),
      address: z.object({
        address1: z.string(),
        city: z.string(),
        country: z.string(),
        postalCode: z.string(),
      }),
    }),
  }),
}); 