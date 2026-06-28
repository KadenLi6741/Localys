import { createHmac, timingSafeEqual } from 'crypto';

const getSecret = () => {
  const secret = process.env.ORDER_VERIFICATION_SECRET;
  if (!secret) throw new Error('ORDER_VERIFICATION_SECRET environment variable is not set');
  return secret;
};

export function generateToken(orderId: string): string {
  return createHmac('sha256', getSecret()).update(orderId).digest('hex');
}

export function verifyToken(orderId: string, token: string): boolean {
  const expected = generateToken(orderId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
