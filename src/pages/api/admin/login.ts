import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const prerender = false;

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlEncodeBuffer(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function sign(payload: string, secret: string) {
  const sig = createHmac('sha256', secret).update(payload).digest();
  return base64UrlEncodeBuffer(sig);
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const contentType = request.headers.get('content-type') ?? '';
  let username = '';
  let password = '';
  let bodyLength = 0;

  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { username?: unknown; password?: unknown };
      username = String(body?.username ?? '').trim();
      password = String(body?.password ?? '');
    } catch {
      return redirect('/admin?error=invalid', 302);
    }
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const form = await request.formData();
      username = String(form.get('username') ?? '').trim();
      password = String(form.get('password') ?? '');
    } catch {
      const q = new URLSearchParams({ error: 'invalid', ct: contentType || '-', bl: String(bodyLength) });
      return redirect(`/admin?${q.toString()}`, 302);
    }
  } else {
    try {
      const raw = await request.text();
      bodyLength = raw.length;
      const params = new URLSearchParams(raw);
      username = String(params.get('username') ?? '').trim();
      password = String(params.get('password') ?? '');
    } catch {
      const q = new URLSearchParams({ error: 'invalid', ct: contentType || '-', bl: String(bodyLength) });
      return redirect(`/admin?${q.toString()}`, 302);
    }
  }

  const expectedUser = process.env.ADMIN_USER ?? import.meta.env.ADMIN_USER ?? '';
  const expectedPass = process.env.ADMIN_PASS ?? import.meta.env.ADMIN_PASS ?? '';
  const secret = process.env.ADMIN_SESSION_SECRET ?? import.meta.env.ADMIN_SESSION_SECRET ?? '';

  if (!expectedUser || !expectedPass || !secret) {
    console.error('[admin/login] Missing env vars', {
      hasUser: Boolean(expectedUser),
      hasPass: Boolean(expectedPass),
      hasSecret: Boolean(secret),
    });
    return redirect('/admin?error=config', 302);
  }

  const ok =
    safeEqual(username.toLowerCase(), expectedUser.trim().toLowerCase()) && safeEqual(password, expectedPass);
  if (!ok) {
    const q = new URLSearchParams({
      error: 'invalid',
      u: username,
      eu: expectedUser,
      pl: String(password.length),
      epl: String(expectedPass.length),
      ct: contentType || '-',
      bl: String(bodyLength),
    });
    return redirect(`/admin?${q.toString()}`, 302);
  }

  const issuedAt = Date.now();
  const payload = base64UrlEncode(JSON.stringify({ u: username, iat: issuedAt }));
  const token = `${payload}.${sign(payload, secret)}`;

  cookies.set('admin_session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 60 * 60 * 12,
  });

  return redirect('/admin/dashboard', 302);
};
