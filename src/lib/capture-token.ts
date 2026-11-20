import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
export const extensionIdSchema = z.string().regex(/^[a-p]{32}$/);
const claimsSchema = z.object({ userId: z.string().min(1), extensionId: extensionIdSchema, scope: z.literal('capture'), expiresAt: z.number().int() });
function signature(payload: string, secret: string) {
  if (secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
export function createCaptureToken(userId: string, extensionId: string, secret: string, now = Date.now()) {
  const claims = claimsSchema.parse({ userId, extensionId, scope: 'capture', expiresAt: now + 30 * 86400000 });
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return { token: `${payload}.${signature(payload, secret)}`, expiresAt: claims.expiresAt };
}
export function verifyCaptureToken(token: string, extensionId: string, secret: string, now = Date.now()) {
  if (token.length > 4000) throw new Error('Invalid token');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid token');
  const expected = Buffer.from(signature(parts[0], secret)), actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Invalid signature');
  const claims = claimsSchema.parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')));
  if (claims.extensionId !== extensionId || claims.expiresAt <= now) throw new Error('Expired or mismatched token');
  return claims;
}
