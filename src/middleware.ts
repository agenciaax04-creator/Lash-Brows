import type { MiddlewareHandler } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const prerender = false;

function base64UrlDecodeToString(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function base64UrlEncodeBuffer(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sign(payload: string, secret: string) {
  const sig = createHmac('sha256', secret).update(payload).digest();
  return base64UrlEncodeBuffer(sig);
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isValidSession(token: string | undefined, secret: string) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  const expectedSig = sign(payload, secret);
  if (!safeEqual(sig, expectedSig)) return false;

  try {
    const json = base64UrlDecodeToString(payload);
    const data = JSON.parse(json) as { iat?: number };
    const iat = typeof data.iat === 'number' ? data.iat : 0;
    const maxAgeMs = 12 * 60 * 60 * 1000;
    if (!iat || Date.now() - iat > maxAgeMs) return false;
    return true;
  } catch {
    return false;
  }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/admin')) {
    return next();
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return next();
  }

  if (pathname === '/admin/forgot' || pathname === '/admin/reset') {
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return next();
  }

  const secret = import.meta.env.ADMIN_SESSION_SECRET ?? '';
  if (!secret) return context.redirect('/admin?error=config');

  const token = context.cookies.get('admin_session')?.value;
  const ok = isValidSession(token, secret);
  if (!ok) {
    return context.redirect('/admin?error=session');
  }

  return next();
};
