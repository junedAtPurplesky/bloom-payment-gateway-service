import { Request, Response, NextFunction } from 'express';
import { dynatraceService } from '../utils/dynatrace';

export const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const { method, originalUrl, ip, headers } = req;
  
  // Log request
  console.log(`[API] ${new Date().toISOString()} - ${method} ${originalUrl} - IP: ${ip}`);
  console.log(`[API] Headers: ${JSON.stringify(headers)}`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[API] Request Body: ${JSON.stringify(req.body)}`);
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    console.log(`[API] ${new Date().toISOString()} - ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`);
    console.log(`[API] Response: ${JSON.stringify(data)}`);
    
    // Log to Dynatrace
    try {
      dynatraceService.logApiCall({
        endpoint: originalUrl,
        method,
        statusCode,
        duration,
        transactionId: req.body?.orderId || req.params?.orderId
      }).catch((dynatraceError) => {
        console.error('[DYNATRACE] Failed to log API call:', dynatraceError);
      });
    } catch (error) {
      console.error('[DYNATRACE] Failed to initiate API call logging:', error);
    }
    
    return originalJson.call(this, data);
  };

  next();
}; 