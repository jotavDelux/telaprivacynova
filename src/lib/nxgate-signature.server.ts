import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyNxGateSignature(body: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (!timestamp || !signature || !secret || !/^\d{1,12}$/.test(timestamp) || !/^sha256=[a-fA-F0-9]{64}$/.test(signature)) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'));
}