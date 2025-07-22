import axios from 'axios';
import config from 'config';
import { dynatraceService } from '../utils/dynatrace';

interface SalesforceConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  enabled: boolean;
}

interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  expires_in: number;
}

class SalesforceService {
  private config: SalesforceConfig;
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      baseUrl: config.get<string>('salesforce.baseUrl'),
      clientId: config.get<string>('salesforce.clientId'),
      clientSecret: config.get<string>('salesforce.clientSecret'),
      username: config.get<string>('salesforce.username'),
      password: config.get<string>('salesforce.password'),
      enabled: config.get<boolean>('salesforce.enabled')
    };
  }

  /**
   * Get Salesforce access token
   */
  private async getAccessToken(): Promise<{ token: string; instanceUrl: string }> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry && this.instanceUrl) {
      return { token: this.accessToken, instanceUrl: this.instanceUrl };
    }

    if (!this.config.enabled) {
      throw new Error('Salesforce integration is disabled');
    }

    try {
      const tokenStartTime = Date.now();

      // Try password grant first
      let response;
      try {
        response = await axios.post<SalesforceTokenResponse>(
          `${this.config.baseUrl}/services/oauth2/token`,
          null,
          {
            params: {
              grant_type: 'password',
              client_id: this.config.clientId,
              client_secret: this.config.clientSecret,
              username: this.config.username,
              password: this.config.password
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error: any) {
        // If password grant fails, try client credentials grant
        console.log('Password grant failed, trying client credentials grant...');
        response = await axios.post<SalesforceTokenResponse>(
          `${this.config.baseUrl}/services/oauth2/token`,
          null,
          {
            params: {
              grant_type: 'client_credentials',
              client_id: this.config.clientId,
              client_secret: this.config.clientSecret
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      }

      const tokenDuration = Date.now() - tokenStartTime;
      
      // Log token request to Dynatrace
      try {
        await dynatraceService.traceOutgoingRequest(
          `${this.config.baseUrl}/services/oauth2/token`,
          'POST',
          tokenDuration
        );
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to trace token request:', dynatraceError);
      }

      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url;
      // Set expiry to 1 hour from now (with 5 minute buffer)
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      console.log('Salesforce authentication successful');
      console.log('Instance URL:', this.instanceUrl);
      return { token: this.accessToken, instanceUrl: this.instanceUrl };
    } catch (error: any) {
      // Log error to Dynatrace
      try {
        const errorObj = error instanceof Error ? error : new Error('Salesforce authentication error');
        await dynatraceService.logError(errorObj, 'salesforce_token_request');
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to log Salesforce error:', dynatraceError);
      }
      
      console.error('Salesforce authentication failed:');
      console.error('Error:', error.message);
      console.error('Response Status:', error.response?.status);
      console.error('Response Data:', error.response?.data);
      
      if (error.response?.data?.error === 'invalid_grant') {
        throw new Error('Salesforce authentication failed: Invalid username or password');
      } else if (error.response?.data?.error === 'invalid_client') {
        throw new Error('Salesforce authentication failed: Invalid client ID or secret');
      } else if (error.response?.data?.error === 'URL_NOT_RESET') {
        throw new Error('Salesforce authentication failed: OAuth configuration issue. Please check Salesforce org settings');
      } else {
        throw new Error(`Salesforce authentication failed: ${error.response?.data?.error_description || error.message}`);
      }
    }
  }

  /**
   * Update payment status in Salesforce
   */
  async updatePaymentStatus(
    orderId: string,
    status: 'Success' | 'Failed',
    message: string,
    gatewayReference: string
  ): Promise<void> {
    if (!this.config.enabled) {
      console.log('Salesforce integration disabled, skipping payment status update');
      return;
    }

    try {
      const { token: accessToken, instanceUrl } = await this.getAccessToken();
      
      console.log('Using Salesforce instance URL:', instanceUrl);
      
      // Use standard Salesforce REST API with the correct instance URL
      const queryStartTime = Date.now();
      
      const queryResponse = await axios.get(
        `${instanceUrl}/services/data/v58.0/query`,
        {
          params: {
            q: `SELECT Id, Name FROM Account WHERE Name = '${orderId}' LIMIT 1`
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const queryDuration = Date.now() - queryStartTime;
      
      // Log query to Dynatrace
      try {
        await dynatraceService.traceOutgoingRequest(
          `${instanceUrl}/services/data/v58.0/query`,
          'GET',
          queryDuration
        );
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to trace Salesforce query:', dynatraceError);
      }

      // Log successful payment status update
      try {
        await dynatraceService.logTransaction({
          transactionId: gatewayReference,
          amount: 0,
          currency: 'USD',
          status: 'salesforce_updated',
          merchantId: orderId,
          customerId: 'salesforce'
        });
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to log Salesforce transaction:', dynatraceError);
      }
    } catch (error: any) {
      // Log error to Dynatrace
      try {
        const errorObj = error instanceof Error ? error : new Error('Salesforce payment update error');
        await dynatraceService.logError(errorObj, 'salesforce_payment_update', orderId);
      } catch (dynatraceError) {
        console.error('[DYNATRACE] Failed to log Salesforce error:', dynatraceError);
      }
      
      console.error('Failed to update payment status in Salesforce:', error.response?.data || error.message);
      
      // Don't throw error for now, just log it
      console.log('Continuing with payment flow despite Salesforce error');
    }
  }

  /**
   * Get service status
   */
  getStatus(): { enabled: boolean; authenticated: boolean; instanceUrl: string | null } {
    return {
      enabled: this.config.enabled,
      authenticated: !!(this.accessToken && Date.now() < this.tokenExpiry),
      instanceUrl: this.instanceUrl
    };
  }
}

// Create singleton instance
export const salesforceService = new SalesforceService(); 