import config from 'config';
import * as sdk from '@dynatrace/oneagent-sdk';

interface TransactionData {
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  merchantId?: string;
  customerId?: string;
}

interface ApiCallData {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  transactionId?: string;
}

class DynatraceService {
  private sdkInstance: any = null;
  private enabled: boolean;
  private environment: string;
  private initialized: boolean = false;
  private beaconUrl: string;
  private applicationId: string;
  private postgresConfig: any;
  private origin: string;

  constructor() {
    this.enabled = config.get<boolean>('dynatrace.enabled');
    this.environment = config.get<string>('dynatrace.environment');
    this.beaconUrl = config.has('dynatrace.beaconUrl') ? config.get<string>('dynatrace.beaconUrl') : '';
    this.applicationId = config.has('dynatrace.applicationId') ? config.get<string>('dynatrace.applicationId') : '';
    this.postgresConfig = config.get<any>('postgresConfig');
    this.origin = config.get<string>('origin');
    
    if (this.enabled) {
      this.initializeSdk();
    }
  }

  private async initializeSdk() {
    try {
      // Initialize the OneAgent SDK
      this.sdkInstance = sdk.createInstance();
      
      // Set up logging callbacks for SDK warnings and errors
      this.sdkInstance.setLoggingCallbacks({
        warning: (msg: string) => console.warn(`[DYNATRACE SDK] Warning: ${msg}`),
        error: (msg: string) => console.error(`[DYNATRACE SDK] Error: ${msg}`)
      });

      // Check SDK state
      const sdkState = this.sdkInstance.getCurrentState();
      console.log(`[DYNATRACE] SDK initialized successfully | Environment: ${this.environment} | State: ${sdkState} | Beacon URL: ${this.beaconUrl} | Application ID: ${this.applicationId}`);
      
      this.initialized = true;
    } catch (error) {
      console.error('[DYNATRACE] Failed to initialize SDK:', error);
      this.sdkInstance = null;
    }
  }

  /**
   * Get environment-specific database info
   */
  private getDatabaseInfo() {
    const dbHost = this.postgresConfig.host;
    const dbPort = this.postgresConfig.port;
    const dbName = this.postgresConfig.database;
    
    return this.sdkInstance.createDatabaseInfo(
      dbName,
      sdk.DatabaseVendor.POSTGRESQL,
      sdk.ChannelType.TCP_IP,
      `${dbHost}:${dbPort}`
    );
  }

  /**
   * Get environment-specific web application info
   */
  private getWebApplicationInfo() {
    const serviceName = `PaymentGatewayService-${this.environment}`;
    const applicationName = `PaymentGateway-${this.environment}`;
    const contextRoot = '/api/gateway';
    
    return this.sdkInstance.createWebApplicationInfo(
      serviceName,
      applicationName,
      contextRoot
    );
  }

  /**
   * Get environment-specific base URL for web requests
   */
  private getBaseUrl(): string {
    switch (this.environment) {
      case 'production':
        return 'https://bloom.com';
      case 'preprod':
        return 'https://preprod.bloom.com';
      case 'uat':
        return 'https://uat.bloom.com';
      case 'development':
      default:
        return 'http://localhost:3000';
    }
  }

  /**
   * Log payment transaction with proper tracing using custom service tracer
   */
  async logTransaction(data: TransactionData): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      console.log(`[DYNATRACE] Transaction (fallback): ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        beaconUrl: this.beaconUrl,
        applicationId: this.applicationId
      })}`);
      return;
    }

    try {
      // Create a custom service tracer for payment transactions
      const tracer = this.sdkInstance.traceCustomService(
        'processPaymentTransaction',
        `PaymentGatewayService-${this.environment}`
      );

      tracer.start();
      
      try {
        // Add custom request attributes for better filtering and analysis
        this.sdkInstance.addCustomRequestAttribute('transactionId', data.transactionId);
        this.sdkInstance.addCustomRequestAttribute('amount', data.amount.toString());
        this.sdkInstance.addCustomRequestAttribute('currency', data.currency);
        this.sdkInstance.addCustomRequestAttribute('status', data.status);
        this.sdkInstance.addCustomRequestAttribute('merchantId', data.merchantId || 'unknown');
        this.sdkInstance.addCustomRequestAttribute('customerId', data.customerId || 'unknown');
        this.sdkInstance.addCustomRequestAttribute('environment', this.environment);
        this.sdkInstance.addCustomRequestAttribute('applicationId', this.applicationId);

        // Log the transaction details
        console.log(`[DYNATRACE] Transaction traced: ${JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          environment: this.environment,
          service: 'payment-gateway',
          sdkState: this.sdkInstance.getCurrentState(),
          beaconUrl: this.beaconUrl,
          applicationId: this.applicationId
        })}`);

        // Mark as error if status indicates failure
        if (data.status.toLowerCase().includes('fail') || data.status.toLowerCase().includes('error')) {
          tracer.error(`Payment transaction failed: ${data.status}`);
        }
      } catch (error) {
        tracer.error(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      } finally {
        tracer.end();
      }
    } catch (error) {
      console.error('[DYNATRACE] Failed to log transaction:', error);
    }
  }

  /**
   * Log API call with performance metrics using incoming web request tracer
   */
  async logApiCall(data: ApiCallData): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      console.log(`[DYNATRACE] API Call (fallback): ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        beaconUrl: this.beaconUrl,
        applicationId: this.applicationId
      })}`);
      return;
    }

    try {
      // Create web application info for the payment gateway
      const webAppInfo = this.getWebApplicationInfo();

      // Create incoming web request tracer with environment-specific URL
      const baseUrl = this.getBaseUrl();
      const fullUrl = `${baseUrl}${data.endpoint}`;
      
      const tracer = this.sdkInstance.traceIncomingWebRequest(
        webAppInfo,
        fullUrl,
        data.method
      );

      tracer.start();
      
      try {
        // Add custom request attributes
        this.sdkInstance.addCustomRequestAttribute('endpoint', data.endpoint);
        this.sdkInstance.addCustomRequestAttribute('method', data.method);
        this.sdkInstance.addCustomRequestAttribute('duration', data.duration.toString());
        this.sdkInstance.addCustomRequestAttribute('transactionId', data.transactionId || 'unknown');
        this.sdkInstance.addCustomRequestAttribute('environment', this.environment);
        this.sdkInstance.addCustomRequestAttribute('applicationId', this.applicationId);
        this.sdkInstance.addCustomRequestAttribute('baseUrl', baseUrl);

        // Set response status code
        tracer.setStatusCode(data.statusCode);

        // Log the API call details
        console.log(`[DYNATRACE] API call traced: ${JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          environment: this.environment,
          service: 'payment-gateway',
          sdkState: this.sdkInstance.getCurrentState(),
          beaconUrl: this.beaconUrl,
          applicationId: this.applicationId,
          baseUrl
        })}`);

        // Mark as error if status code indicates failure
        if (data.statusCode >= 400) {
          tracer.error(`API call failed with status: ${data.statusCode}`);
        }
      } catch (error) {
        tracer.error(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      } finally {
        tracer.end();
      }
    } catch (error) {
      console.error('[DYNATRACE] Failed to log API call:', error);
    }
  }

  /**
   * Log error with proper error tracking using custom service tracer
   */
  async logError(error: Error, context: string, transactionId?: string): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      console.log(`[DYNATRACE] Error (fallback): ${JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        transactionId,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        beaconUrl: this.beaconUrl,
        applicationId: this.applicationId
      })}`);
      return;
    }

    try {
      // Create a custom service tracer for error logging
      const tracer = this.sdkInstance.traceCustomService(
        'logError',
        `PaymentGatewayService-${this.environment}`
      );

      tracer.start();
      
      try {
        // Add custom request attributes
        this.sdkInstance.addCustomRequestAttribute('errorMessage', error.message);
        this.sdkInstance.addCustomRequestAttribute('errorContext', context);
        this.sdkInstance.addCustomRequestAttribute('transactionId', transactionId || 'unknown');
        this.sdkInstance.addCustomRequestAttribute('environment', this.environment);
        this.sdkInstance.addCustomRequestAttribute('applicationId', this.applicationId);

        // Log the error details
        console.log(`[DYNATRACE] Error traced: ${JSON.stringify({
          message: error.message,
          context,
          transactionId,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          environment: this.environment,
          service: 'payment-gateway',
          sdkState: this.sdkInstance.getCurrentState(),
          beaconUrl: this.beaconUrl,
          applicationId: this.applicationId
        })}`);

        // Mark the tracer as having an error
        tracer.error(error.message);
      } catch (sdkError) {
        console.error('[DYNATRACE] Failed to log error:', sdkError);
        tracer.error(sdkError instanceof Error ? sdkError.message : 'Unknown SDK error');
      } finally {
        tracer.end();
      }
    } catch (error) {
      console.error('[DYNATRACE] Failed to create error tracer:', error);
    }
  }

  /**
   * Create a database trace for database operations using SQL database tracer
   */
  async traceDatabaseOperation(operation: string, table: string, duration: number): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      console.log(`[DYNATRACE] Database operation (fallback): ${JSON.stringify({
        operation,
        table,
        duration,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        beaconUrl: this.beaconUrl,
        applicationId: this.applicationId
      })}`);
      return;
    }

    try {
      // Create database info for PostgreSQL with environment-specific config
      const dbInfo = this.getDatabaseInfo();

      // Create SQL database tracer
      const tracer = this.sdkInstance.traceSQLDatabaseRequest(dbInfo, {
        statement: `${operation} on ${table}`
      });

      tracer.start();
      
      try {
        // Add custom request attributes
        this.sdkInstance.addCustomRequestAttribute('operation', operation);
        this.sdkInstance.addCustomRequestAttribute('table', table);
        this.sdkInstance.addCustomRequestAttribute('duration', duration.toString());
        this.sdkInstance.addCustomRequestAttribute('environment', this.environment);
        this.sdkInstance.addCustomRequestAttribute('applicationId', this.applicationId);
        this.sdkInstance.addCustomRequestAttribute('database', this.postgresConfig.database);
        this.sdkInstance.addCustomRequestAttribute('dbHost', this.postgresConfig.host);
        this.sdkInstance.addCustomRequestAttribute('dbPort', this.postgresConfig.port.toString());

        // Set result data if available
        tracer.setResultData({
          rowsReturned: 1, // Default value, could be made configurable
          roundTripCount: 1
        });

        console.log(`[DYNATRACE] Database operation traced: ${JSON.stringify({
          operation,
          table,
          duration,
          timestamp: new Date().toISOString(),
          environment: this.environment,
          service: 'payment-gateway',
          sdkState: this.sdkInstance.getCurrentState(),
          beaconUrl: this.beaconUrl,
          applicationId: this.applicationId,
          database: this.postgresConfig.database,
          dbHost: this.postgresConfig.host,
          dbPort: this.postgresConfig.port
        })}`);
      } catch (error) {
        tracer.error(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      } finally {
        tracer.end();
      }
    } catch (error) {
      console.error('[DYNATRACE] Failed to trace database operation:', error);
    }
  }

  /**
   * Create an outgoing web request trace using outgoing web request tracer
   */
  async traceOutgoingRequest(url: string, method: string, duration: number): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      console.log(`[DYNATRACE] Outgoing request (fallback): ${JSON.stringify({
        url,
        method,
        duration,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        beaconUrl: this.beaconUrl,
        applicationId: this.applicationId
      })}`);
      return;
    }

    try {
      // Create outgoing web request tracer
      const tracer = this.sdkInstance.traceOutgoingWebRequest(url, method);

      tracer.start();
      
      try {
        // Add custom request attributes
        this.sdkInstance.addCustomRequestAttribute('url', url);
        this.sdkInstance.addCustomRequestAttribute('method', method);
        this.sdkInstance.addCustomRequestAttribute('duration', duration.toString());
        this.sdkInstance.addCustomRequestAttribute('environment', this.environment);
        this.sdkInstance.addCustomRequestAttribute('applicationId', this.applicationId);

        // Add request headers (if available)
        tracer.addRequestHeader('User-Agent', `PaymentGatewayService-${this.environment}/1.0`);
        tracer.addRequestHeader('X-Application-ID', this.applicationId);
        tracer.addRequestHeader('X-Environment', this.environment);

        console.log(`[DYNATRACE] Outgoing request traced: ${JSON.stringify({
          url,
          method,
          duration,
          timestamp: new Date().toISOString(),
          environment: this.environment,
          service: 'payment-gateway',
          sdkState: this.sdkInstance.getCurrentState(),
          beaconUrl: this.beaconUrl,
          applicationId: this.applicationId
        })}`);

        // Set response status code (assuming success for now)
        tracer.setStatusCode(200);
      } catch (error) {
        tracer.error(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      } finally {
        tracer.end();
      }
    } catch (error) {
      console.error('[DYNATRACE] Failed to trace outgoing request:', error);
    }
  }

  /**
   * Add custom metrics (deprecated but still functional)
   */
  async addCustomMetric(metricName: string, value: number, unit: string = 'Count'): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      console.log(`[DYNATRACE] Custom metric (fallback): ${JSON.stringify({
        metricName,
        value,
        unit,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        beaconUrl: this.beaconUrl,
        applicationId: this.applicationId
      })}`);
      return;
    }

    try {
      // Create a custom service tracer for metrics
      const tracer = this.sdkInstance.traceCustomService(
        'addCustomMetric',
        `PaymentGatewayService-${this.environment}`
      );

      tracer.start();
      
      try {
        // Add custom request attributes for the metric
        this.sdkInstance.addCustomRequestAttribute('metricName', metricName);
        this.sdkInstance.addCustomRequestAttribute('metricValue', value.toString());
        this.sdkInstance.addCustomRequestAttribute('metricUnit', unit);
        this.sdkInstance.addCustomRequestAttribute('environment', this.environment);
        this.sdkInstance.addCustomRequestAttribute('applicationId', this.applicationId);

        console.log(`[DYNATRACE] Custom metric traced: ${JSON.stringify({
          metricName,
          value,
          unit,
          timestamp: new Date().toISOString(),
          environment: this.environment,
          service: 'payment-gateway',
          sdkState: this.sdkInstance.getCurrentState(),
          beaconUrl: this.beaconUrl,
          applicationId: this.applicationId
        })}`);
      } catch (error) {
        tracer.error(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      } finally {
        tracer.end();
      }
    } catch (error) {
      console.error('[DYNATRACE] Failed to add custom metric:', error);
    }
  }

  /**
   * Get SDK status with enhanced information
   */
  getStatus(): { enabled: boolean; initialized: boolean; environment: string; sdkState?: string; beaconUrl: string; applicationId: string; database: string; dbHost: string; dbPort: number } {
    const status: { enabled: boolean; initialized: boolean; environment: string; sdkState?: string; beaconUrl: string; applicationId: string; database: string; dbHost: string; dbPort: number } = {
      enabled: this.enabled,
      initialized: this.initialized,
      environment: this.environment,
      beaconUrl: this.beaconUrl,
      applicationId: this.applicationId,
      database: this.postgresConfig.database,
      dbHost: this.postgresConfig.host,
      dbPort: this.postgresConfig.port
    };

    if (this.sdkInstance && this.initialized) {
      try {
        status.sdkState = this.sdkInstance.getCurrentState();
      } catch (error) {
        status.sdkState = 'error';
      }
    }

    return status;
  }

  /**
   * Get trace context info for logging correlation
   */
  getTraceContextInfo(): { traceId: string; spanId: string } | null {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      return null;
    }

    try {
      const traceContextInfo = this.sdkInstance.getTraceContextInfo();
      return {
        traceId: traceContextInfo.getTraceId(),
        spanId: traceContextInfo.getSpanId()
      };
    } catch (error) {
      console.error('[DYNATRACE] Failed to get trace context info:', error);
      return null;
    }
  }
}

// Create singleton instance
export const dynatraceService = new DynatraceService();

// Export for backward compatibility
export const dynatraceLogger = {
  logTransaction: (data: TransactionData) => dynatraceService.logTransaction(data),
  logApiCall: (data: ApiCallData) => dynatraceService.logApiCall(data),
  logError: (error: Error, context: string, transactionId?: string) => dynatraceService.logError(error, context, transactionId),
  traceDatabaseOperation: (operation: string, table: string, duration: number) => dynatraceService.traceDatabaseOperation(operation, table, duration),
  traceOutgoingRequest: (url: string, method: string, duration: number) => dynatraceService.traceOutgoingRequest(url, method, duration),
  addCustomMetric: (metricName: string, value: number, unit?: string) => dynatraceService.addCustomMetric(metricName, value, unit),
  getStatus: () => dynatraceService.getStatus(),
  getTraceContextInfo: () => dynatraceService.getTraceContextInfo()
}; 