import { Request, Response, NextFunction } from 'express';
import config from 'config';

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'];
  const validKeys = (config.get<string>('gatewayApiKey') || '').split(',').map(k => k.trim());

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string' || !validKeys.includes(apiKeyHeader)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
} 