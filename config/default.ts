export default {
  origin: '*',
  accessTokenExpiresIn: 1440,
  refreshTokenExpiresIn: 1440,
  emailFrom: 'developmentbyjuned@gmail.com',
  brevoApiKeyEmail: process.env.BREVO_API_KEY_EMAIL || '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || '',
  brevoSenderName: process.env.BREVO_SENDER_NAME || '',
  gatewayApiKey: process.env.GATEWAY_API_KEY || '8JJDqCWptrjm6fF5HoB7KUuCCRS2LsTs1YYAhra1VuDdQgG0SfKT3PdcTUHSHbk4NqmGRuk8tparu7yIAzS2Oa6x2edgoyPcZ7cddkuc0c5y5AXMAqXYXBUFsN9oBW2c',
  paymentRedirectSuccessUrl: process.env.PAYMENT_REDIRECT_SUCCESS_URL || 'http://localhost:3000/api/gateway/payment/success',
  paymentRedirectFailureUrl: process.env.PAYMENT_REDIRECT_FAILURE_URL || 'http://localhost:3000/api/gateway/payment/failure',
  checkoutUrl: process.env.CHECKOUT_URL || 'https://prod.emea.api.fiservapps.com/sandbox/exp/v1/checkouts',
  orderDetailsUrl: process.env.ORDER_DETAILS_URL || 'https://prod.emea.api.fiservapps.com/sandbox/ipp/payments-gateway/v2/orders',
  apiKey: process.env.FISERV_API_KEY || 'guu7gs1XhGsCkq0YMcFsbXBandW8jUAu',
  apiSecret: process.env.FISERV_API_SECRET || 'm0CO2odX602aMeqJSbQsgjqYGLsNBU1NgGQ7xLkeYhM',
  paymentWebhookUrl: process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:3000/api/gateway/payment/webhook',
  postgresConfig: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.POSTGRES_DB || 'bloom_payment_gateway'
  },
  port: parseInt(process.env.PORT || '3000'),
  dynatrace: {
    enabled: false,
    environment: 'development'
  },
  salesforce: {
    enabled: process.env.SALESFORCE_ENABLED === 'true' || false,
    baseUrl: process.env.SALESFORCE_BASE_URL || 'https://test.salesforce.com',
    clientId: process.env.SALESFORCE_CLIENT_ID || '3MVG9S24I7bX5qX5QkYQizLp6tT6QtRvCRShJIl9cKUUDsLATsglOLerQa8y5s_HhCQXbIboOOvxD8JD_piEE',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || 'B47B080BDEE62F22CF59B20BB74553094A82A21A267F640C3FE7B78E6430581D',
    username: process.env.SALESFORCE_USERNAME || 'integrationuser@bloomholding.com',
    password: process.env.SALESFORCE_PASSWORD || 'Inte@123'
  }
};
// https://prod.emea.api.fiservapps.com/sandbox/exp/v1/checkouts