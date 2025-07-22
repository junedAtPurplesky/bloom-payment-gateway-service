export default {
  port: 'PORT',
  postgresConfig: {
    host: 'POSTGRES_HOST',
    port: 'POSTGRES_PORT',
    username: 'POSTGRES_USER',
    password: 'POSTGRES_PASSWORD',
    database: 'POSTGRES_DB',
  },

  accessTokenPrivateKey: 'JWT_ACCESS_TOKEN_PRIVATE_KEY',
  accessTokenPublicKey: 'JWT_ACCESS_TOKEN_PUBLIC_KEY',
  refreshTokenPrivateKey: 'JWT_REFRESH_TOKEN_PRIVATE_KEY',
  refreshTokenPublicKey: 'JWT_REFRESH_TOKEN_PUBLIC_KEY',

  smtp: {
    host: 'EMAIL_HOST',
    pass: 'EMAIL_PASS',
    port: 'EMAIL_PORT',
    user: 'EMAIL_USER',
  },

  brevoApiKeyEmail: 'BREVO_API_KEY_EMAIL',
  brevoSenderEmail: 'BREVO_SENDER_EMAIL',
  brevoSenderName: 'BREVO_SENDER_NAME',
  gatewayApiKey: 'GATEWAY_API_KEY',
  apiKey: 'FISERV_API_KEY',
  apiSecret: 'FISERV_API_SECRET',
  checkoutUrl: 'CHECKOUT_URL',
  orderDetailsUrl: 'ORDER_DETAILS_URL',
  dynatrace: {
    enabled: 'DYNATRACE_ENABLED',
    environment: 'DYNATRACE_ENVIRONMENT',
    beaconUrl: 'DYNATRACE_BEACON_URL',
    applicationId: 'DYNATRACE_APPLICATION_ID'
  },
};
