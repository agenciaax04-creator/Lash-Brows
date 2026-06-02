import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
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
  let email = '';
  let password = '';
  let bodyLength = 0;

  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { email?: unknown; username?: unknown; password?: unknown };
      email = String(body?.email ?? body?.username ?? '').trim();
      password = String(body?.password ?? '');
    } catch {
      return redirect('/admin?error=invalid', 302);
    }
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const form = await request.formData();
      email = String(form.get('email') ?? form.get('username') ?? '').trim();
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
      email = String(params.get('email') ?? params.get('username') ?? '').trim();
      password = String(params.get('password') ?? '');
    } catch {
      const q = new URLSearchParams({ error: 'invalid', ct: contentType || '-', bl: String(bodyLength) });
      return redirect(`/admin?${q.toString()}`, 302);
    }
  }

  const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';
  const secret = process.env.ADMIN_SESSION_SECRET ?? import.meta.env.ADMIN_SESSION_SECRET ?? '';
  const allowlistRaw =
    process.env.ADMIN_EMAIL_ALLOWLIST ?? import.meta.env.ADMIN_EMAIL_ALLOWLIST ?? process.env.ADMIN_EMAIL ?? '';

  if (!url || !anonKey || !secret || !allowlistRaw) {
    console.error('[admin/login] Missing env vars', {
      hasSupabaseUrl: Boolean(url),
      hasSupabaseAnonKey: Boolean(anonKey),
      hasSecret: Boolean(secret),
      hasAllowlist: Boolean(allowlistRaw),
    });
    return redirect('/admin?error=config', 302);
  }

  if (!email || !password) return redirect('/admin?error=invalid', 302);

  const allowlist = allowlistRaw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user?.email) return redirect('/admin?error=invalid', 302);

  const userEmail = String(data.user.email).trim().toLowerCase();
  const isAllowed = allowlist.includes(userEmail);
  if (!isAllowed) return redirect('/admin?error=forbidden', 302);

  const issuedAt = Date.now();
  const payload = base64UrlEncode(JSON.stringify({ u: userEmail, iat: issuedAt }));
  const token = `${payload}.${sign(payload, secret)}`;

  cookies.set('admin_session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 12,
  });

  return redirect('/admin/dashboard', 302);
};
