export default {
  origin: '*',
  accessTokenExpiresIn: 1440,
  refreshTokenExpiresIn: 1440,
  emailFrom: 'developmentbyjuned@gmail.com',
  brevoApiKeyEmail: process.env.BREVO_API_KEY_EMAIL || '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || '',
  brevoSenderName: process.env.BREVO_SENDER_NAME || '',
  gatewayApiKey: process.env.GATEWAY_API_KEY || 'changeme-dev-key',
  paymentRedirectSuccessUrl: process.env.PAYMENT_REDIRECT_SUCCESS_URL || 'http://localhost:3000/api/gateway/payment/success',
  paymentRedirectFailureUrl: process.env.PAYMENT_REDIRECT_FAILURE_URL || 'http://localhost:3000/api/gateway/payment/failure',
};
