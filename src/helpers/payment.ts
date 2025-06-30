import crypto from 'crypto';

export function createSignature(rawSignature: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawSignature).digest('base64');
} 
