# Bloom Payment Gateway Service

**This application is responsible for processing payment transactions through the Bloom Payment Gateway.**

## Features

- ✅ Payment transaction processing
- ✅ Swagger API documentation
- ✅ Dynatrace OneAgent SDK integration for transaction monitoring
- ✅ Console logging for all API calls
- ✅ Multi-environment support (dev, preprod, prod)
- ✅ Docker containerization
- ✅ Health check endpoints
- ✅ Rate limiting
- ✅ API key authentication
- ✅ Salesforce integration for payment status updates

## How to run the application

### Development

```bash
# Install dependencies
yarn install

# Start development server
yarn start:dev

# Or use the default start command
yarn start
```

### Pre-production

```bash
yarn start:preprod
```

### Production

```bash
yarn start:prod
```

## API Documentation

Once the server is running, you can access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

## Environment Configuration

The application supports multiple environments:

- **Development**: Uses `config/default.ts`
- **Pre-production**: Uses `config/preprod.json`
- **Production**: Uses `config/production.json`

Set the `NODE_ENV` environment variable to switch between environments.

## Dynatrace Integration

This application uses the official Dynatrace OneAgent SDK for comprehensive monitoring:

### Features
- **Transaction Tracing**: All payment transactions are traced with custom attributes
- **API Call Monitoring**: Outgoing API calls to Fiserv are traced with performance metrics
- **Database Operations**: Database operations are traced for performance monitoring
- **Error Tracking**: All errors are logged with context and transaction IDs
- **Custom Metrics**: Payment-specific metrics are collected (transaction counts, amounts, etc.)

### Configuration
Dynatrace monitoring is configured per environment:

```json
{
  "dynatrace": {
    "enabled": true,
    "environment": "production"
  }
}
```

### Health Check
The health check endpoint includes Dynatrace status:

```
GET /api/healthChecker
```

Response includes:
```json
{
  "status": "success",
  "services": {
    "database": "connected",
    "dynatrace": {
      "enabled": true,
      "initialized": true,
      "environment": "production",
      "sdkState": "ACTIVE"
    }
  }
}
```

## Docker Instructions

### Three Environment Setup

The application supports three environments: **Development**, **UAT**, and **Production**.

### Development Environment

```bash
# Build and start development environment
docker-compose up -d

# Or explicitly use dev compose file
docker-compose -f docker-compose.dev.yml --env-file env.dev up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

**Access:**
- Application: http://localhost:3000
- Database: localhost:5433
- Database Name: `bloom_payment_gateway_dev`

### UAT Environment

```bash
# Start UAT environment
docker-compose -f docker-compose.uat.yml --env-file env.uat up -d

# View logs
docker-compose -f docker-compose.uat.yml logs -f app

# Stop services
docker-compose -f docker-compose.uat.yml down
```

**Access:**
- Application: http://localhost:3001
- Database: localhost:5434
- Database Name: `bloom_payment_gateway_uat`

### Production Environment

1. **Copy and edit the production environment file:**
   ```bash
   cp env.prod .env.prod
   # Edit .env.prod with your production values
   ```

2. **Start production environment:**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f app
   ```

**Access:**
- Application: http://localhost:3002
- Database: localhost:5435
- Database Name: `bloom_payment_gateway_prod`

### Option 2: Standalone Docker Image

#### Build the Docker Image

```bash
docker build -t bloom-payment-gateway-service .

# Run the container
docker run -p 3000:3000 bloom-payment-gateway-service

# Or use the npm scripts
yarn docker:build
yarn docker:run
```

#### Save the Docker Image as a Tarball

```bash
docker save -o bloom-payment-gateway-service.tar bloom-payment-gateway-service
```

#### Distribute the Tarball
You can now distribute the `bloom-payment-gateway-service.tar` file. To load it on another machine:

```bash
docker load -i bloom-payment-gateway-service.tar
```

#### Run the Container

```bash
# With environment variables
docker run -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  -e DB_DATABASE=bloom_payment_gateway \
  bloom-payment-gateway-service
```

## Environment Variables

The application requires the following environment variables:

### Required
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port (default: 5432)
- `POSTGRES_USER` - Database username (default: postgres)
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name (varies by environment)
- `JWT_ACCESS_TOKEN_PRIVATE_KEY` - JWT access token private key
- `JWT_ACCESS_TOKEN_PUBLIC_KEY` - JWT access token public key
- `JWT_REFRESH_TOKEN_PRIVATE_KEY` - JWT refresh token private key
- `JWT_REFRESH_TOKEN_PUBLIC_KEY` - JWT refresh token public key

### Optional
- `NODE_ENV` - Environment (development/uat/production)
- `PORT` - Application port (default: 3000)
- `GATEWAY_API_KEY` - Gateway API key
- `FISERV_API_KEY` - Fiserv API key
- `FISERV_API_SECRET` - Fiserv API secret

### Salesforce Configuration
- `SALESFORCE_ENABLED` - Enable/disable Salesforce integration (default: false)
- `SALESFORCE_BASE_URL` - Salesforce base URL (test.salesforce.com for dev/UAT, login.salesforce.com for prod)
- `SALESFORCE_CLIENT_ID` - Salesforce OAuth client ID
- `SALESFORCE_CLIENT_SECRET` - Salesforce OAuth client secret
- `SALESFORCE_USERNAME` - Salesforce integration user username
- `SALESFORCE_PASSWORD` - Salesforce integration user password

### Environment-Specific Database Names
- **Development**: `bloom_payment_gateway_dev`
- **UAT**: `bloom_payment_gateway_uat`
- **Production**: `bloom_payment_gateway_prod`

## Health Check

Once the application is running, you can check its health:

```bash
curl http://localhost:3000/api/healthChecker
```

## Database Setup

The application uses PostgreSQL. When using Docker Compose, the database is automatically set up with environment-specific configurations:

### Development
- **Database**: `bloom_payment_gateway_dev`
- **Username**: `postgres`
- **Password**: `password`
- **Port**: `5433`

### UAT
- **Database**: `bloom_payment_gateway_uat`
- **Username**: `postgres`
- **Password**: `password`
- **Port**: `5434`

### Production
- **Database**: `bloom_payment_gateway_prod`
- **Username**: `postgres`
- **Password**: `password`
- **Port**: `5435`

The database schema will be automatically created when the application starts.

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Check environment variables are correctly set
- Verify network connectivity between containers

### Application Won't Start
- Check logs: `docker-compose logs app`
- Verify all required environment variables are set
- Ensure port 3000 is not already in use

### Data Persistence
- Database data is persisted in a Docker volume named `postgres_data`
- To reset data: `docker-compose down -v && docker-compose up -d`
## Logging

### Console Logs
All API calls are logged to the console with detailed information including:
- Request method and URL
- Request headers and body
- Response status and body
- Request duration

### Dynatrace Logs
Transaction events are logged to Dynatrace (when enabled) including:
- Payment initiation with custom attributes (amount, currency, merchant ID, etc.)
- Payment success/failure events
- Webhook events with transaction status updates
- Error tracking with context and stack traces
- Database operation performance
- Outgoing API call performance to Fiserv

### Log Format
Dynatrace logs include structured data:
```json
{
  "transactionId": "order-123",
  "amount": 100.00,
  "currency": "USD",
  "status": "success",
  "merchantId": "merchant-456",
  "customerId": "customer-789",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "production",
  "service": "payment-gateway"
}
```

## Database

The application uses PostgreSQL. You can run it locally using Docker:

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=bloom_payment_gateway \
  -p 5432:5432 \
  postgres:15-alpine
```

## Health Check

The application provides a health check endpoint:

```
GET /api/healthChecker
```

## Available Scripts

- `yarn start` - Start development server
- `yarn start:dev` - Start development server with dev environment
- `yarn start:preprod` - Start server with pre-production environment
- `yarn start:prod` - Start server with production environment
- `yarn build` - Build the application
- `yarn test` - Run tests
- `yarn docker:build` - Build Docker image
- `yarn docker:run` - Run Docker container

## Dynatrace OneAgent SDK

This application uses the official Dynatrace OneAgent SDK for Node.js:

- **Package**: `@dynatrace/oneagent-sdk`
- **Version**: 1.5.0
- **Documentation**: [GitHub Repository](https://github.com/Dynatrace/OneAgent-SDK-for-NodeJs)

The SDK provides:
- Custom service tracing
- Database operation monitoring
- Outgoing web request tracing
- Custom metrics collection
- Error tracking and reporting

### Prerequisites
To use the full Dynatrace SDK functionality:
1. Dynatrace OneAgent must be installed on the host
2. The OneAgent must be properly configured
3. The application must run with appropriate permissions

### Fallback Behavior
When the OneAgent SDK is not available (development environment), the application falls back to console logging with the same structured format for consistency.

## Salesforce Integration

This application integrates with Salesforce to update payment status when users are redirected to success or failure pages.

### Features
- **Automatic Token Management**: Handles Salesforce OAuth token acquisition and refresh
- **Payment Status Updates**: Updates payment status in Salesforce on success/failure redirects
- **Error Handling**: Graceful handling of Salesforce API failures without affecting user experience
- **Transaction Tracing**: All Salesforce API calls are traced with Dynatrace for monitoring
- **Environment-Specific Configuration**: Different Salesforce instances for dev, UAT, and production

### Configuration
Salesforce integration is configured per environment:

```json
{
  "salesforce": {
    "enabled": true,
    "baseUrl": "https://login.salesforce.com",
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret",
    "username": "your_username",
    "password": "your_password"
  }
}
```

### Environment URLs
- **Development/UAT**: `https://test.salesforce.com`
- **Production**: `https://login.salesforce.com`

### API Endpoints
The integration uses two Salesforce endpoints:

1. **Token Endpoint**: `POST /services/oauth2/token`
   - Used for OAuth authentication
   - Supports password grant type

2. **Payment Update Endpoint**: `POST /services/apexrest/v1/submit-invoice`
   - Updates payment status in Salesforce
   - Requires Bearer token authentication

### Usage
When users are redirected to success or failure pages, the application automatically:

1. Extracts the `orderId` from the URL query parameters
2. Authenticates with Salesforce (if not already authenticated)
3. Updates the payment status via the Salesforce API using the orderId as the payment ID
4. Logs the transaction to Dynatrace for monitoring

### URL Parameters
Success/Failure pages accept these query parameters:
**Example URLs:**
```
/api/gateway/payment/success?orderId=ORDER123
/api/gateway/payment/failure?orderId=ORDER123&error=Declined
```

### Health Check
The health check endpoint includes Salesforce status:

```
GET /api/healthChecker
```

Response includes:
```json
{
  "status": "success",
  "services": {
    "database": "connected",
    "dynatrace": { ... },
    "salesforce": {
      "enabled": true,
      "baseUrl": "https://login.salesforce.com",
      "hasValidToken": true,
      "tokenExpiry": 1640995200000
    }
  }
}
```
