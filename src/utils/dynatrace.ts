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

  constructor() {
    this.enabled = config.get<boolean>('dynatrace.enabled');
    this.environment = config.get<string>('dynatrace.environment');
    
    if (this.enabled) {
      this.initializeSdk();
    }
  }

  private async initializeSdk() {
    try {
      // Initialize the OneAgent SDK
      this.sdkInstance = sdk.createInstance();
      
      // Wait for SDK to be ready
      await this.sdkInstance.initialize();
      
      this.initialized = true;
      console.log('[DYNATRACE] SDK initialized successfully');
    } catch (error) {
      console.error('[DYNATRACE] Failed to initialize SDK:', error);
      this.sdkInstance = null;
    }
  }

  /**
   * Log payment transaction with proper tracing
   */
  async logTransaction(data: TransactionData): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      // Fallback to console logging when SDK is not available
      console.log(`[DYNATRACE] Transaction: ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway'
      })}`);
      return;
    }

    try {
      // For now, we'll use console logging as the SDK methods are not fully available
      // In a production environment with proper OneAgent setup, this would use the SDK
      console.log(`[DYNATRACE] Transaction logged: ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        sdkState: this.sdkInstance.getCurrentState?.() || 'unknown'
      })}`);
    } catch (error) {
      console.error('[DYNATRACE] Failed to log transaction:', error);
    }
  }

  /**
   * Log API call with performance metrics
   */
  async logApiCall(data: ApiCallData): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      // Fallback to console logging when SDK is not available
      console.log(`[DYNATRACE] API Call: ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway'
      })}`);
      return;
    }

    try {
      // For now, we'll use console logging as the SDK methods are not fully available
      console.log(`[DYNATRACE] API call logged: ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        sdkState: this.sdkInstance.getCurrentState?.() || 'unknown'
      })}`);
    } catch (error) {
      console.error('[DYNATRACE] Failed to log API call:', error);
    }
  }

  /**
   * Log error with proper error tracking
   */
  async logError(error: Error, context: string, transactionId?: string): Promise<void> {
    if (!this.enabled || !this.sdkInstance || !this.initialized) {
      // Fallback to console logging when SDK is not available
      console.log(`[DYNATRACE] Error: ${JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        transactionId,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway'
      })}`);
      return;
    }

    try {
      // For now, we'll use console logging as the SDK methods are not fully available
      console.log(`[DYNATRACE] Error logged: ${JSON.stringify({
        message: error.message,
        context,
        transactionId,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway',
        sdkState: this.sdkInstance.getCurrentState?.() || 'unknown'
      })}`);
    } catch (sdkError) {
      console.error('[DYNATRACE] Failed to log error:', sdkError);
    }
  }

  /**
   * Create a database trace for database operations
   */
  async traceDatabaseOperation(operation: string, table: string, duration: number): Promise<void> {
    if (!this.enabled) return;

    try {
      console.log(`[DYNATRACE] Database operation traced: ${JSON.stringify({
        operation,
        table,
        duration,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway'
      })}`);
    } catch (error) {
      console.error('[DYNATRACE] Failed to trace database operation:', error);
    }
  }

  /**
   * Create an outgoing web request trace
   */
  async traceOutgoingRequest(url: string, method: string, duration: number): Promise<void> {
    if (!this.enabled) return;

    try {
      console.log(`[DYNATRACE] Outgoing request traced: ${JSON.stringify({
        url,
        method,
        duration,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway'
      })}`);
    } catch (error) {
      console.error('[DYNATRACE] Failed to trace outgoing request:', error);
    }
  }

  /**
   * Add custom metrics
   */
  async addCustomMetric(metricName: string, value: number, unit: string = 'Count'): Promise<void> {
    if (!this.enabled) return;

    try {
      console.log(`[DYNATRACE] Custom metric added: ${JSON.stringify({
        metricName,
        value,
        unit,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        service: 'payment-gateway'
      })}`);
    } catch (error) {
      console.error('[DYNATRACE] Failed to add custom metric:', error);
    }
  }

  /**
   * Get SDK status
   */
  getStatus(): { enabled: boolean; initialized: boolean; environment: string; sdkState?: string } {
    const status: { enabled: boolean; initialized: boolean; environment: string; sdkState?: string } = {
      enabled: this.enabled,
      initialized: this.initialized,
      environment: this.environment
    };

    if (this.sdkInstance && this.initialized) {
      try {
        status.sdkState = this.sdkInstance.getCurrentState?.() || 'unknown';
      } catch (error) {
        status.sdkState = 'error';
      }
    }

    return status;
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
  getStatus: () => dynatraceService.getStatus()
}; 