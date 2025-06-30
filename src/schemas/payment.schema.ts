import Joi from 'joi';
import { z } from 'zod';

export const createCheckoutSchema = Joi.object({
  storeId: Joi.string().required(),
  transactionType: Joi.string().required(),
  transactionOrigin: Joi.string().required(),
  transactionAmount: Joi.object({
    total: Joi.number().required(),
    currency: Joi.string().required(),
  }).required(),
  checkoutSettings: Joi.object({
    webHooksUrl: Joi.string().uri().required(),
    redirectBackUrls: Joi.object({
      successUrl: Joi.string().uri().required(),
      failureUrl: Joi.string().uri().required(),
    }).required(),
  }).required(),
  order: Joi.object({
    orderId: Joi.string().required(),
    orderDetails: Joi.object({
      invoiceNumber: Joi.string().required(),
    }).required(),
    billing: Joi.object({
      person: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
      }).required(),
      contact: Joi.object({
        mobilePhone: Joi.string().required(),
        email: Joi.string().email().required(),
      }).required(),
      address: Joi.object({
        address1: Joi.string().required(),
        city: Joi.string().required(),
        country: Joi.string().required(),
        postalCode: Joi.string().required(),
      }).required(),
    }).required(),
  }).required(),
});

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