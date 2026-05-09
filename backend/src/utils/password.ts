import crypto from 'node:crypto';

const iterations = 120000;
const keylen = 32;
const digest = 'sha256';

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, iterStr, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterStr || !salt || !hash) return false;
  const compare = crypto.pbkdf2Sync(password, salt, Number(iterStr), keylen, digest).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(compare, 'hex'), Buffer.from(hash, 'hex'));
}
