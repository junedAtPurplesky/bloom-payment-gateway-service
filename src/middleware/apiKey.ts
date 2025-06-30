import { Request, Response, NextFunction } from 'express';
import config from 'config';
import { AppDataSource } from '../utils/data-source';
import { ApiRequestLog } from '../entities/apiRequestLog.entity';

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'];
  const validKeys = (config.get<string>('gatewayApiKey') || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  if (validKeys.length === 0) {
    return res.status(500).json({ error: 'Server misconfiguration: No API keys set' });
  }

  const start = Date.now();
  res.on('finish', async () => {
    const durationMs = Date.now() - start;
    const log = new ApiRequestLog();
    log.route = req.originalUrl;
    log.method = req.method;
    log.requestBody = JSON.stringify(req.body || {});
    log.responseBody = JSON.stringify(res.locals.responseBody || {});
    log.statusCode = res.statusCode;
    log.apiKeyUsed = typeof apiKeyHeader === 'string' ? apiKeyHeader : '';
    log.ipAddress = req.ip;
    log.userAgent = req.headers['user-agent'] || '';
    log.durationMs = durationMs;
    await AppDataSource.manager.save(log);
  });

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string' || !validKeys.includes(apiKeyHeader)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
} 