import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return new Response('Missing email', { status: 400 });

  const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';
  const allowlistRaw =
    process.env.ADMIN_EMAIL_ALLOWLIST ?? import.meta.env.ADMIN_EMAIL_ALLOWLIST ?? process.env.ADMIN_EMAIL ?? '';

  if (!url || !anonKey) return new Response('Missing SUPABASE_URL or SUPABASE_ANON_KEY', { status: 500 });

  const allowlist = allowlistRaw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0 && !allowlist.includes(email)) {
    return new Response('Forbidden', { status: 403 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const origin = request.headers.get('origin') ?? '';
  const fallbackOrigin = process.env.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? '';
  const base = origin || fallbackOrigin;
  if (!base) return new Response('Missing origin', { status: 500 });

  const redirectTo = `${base.replace(/\/$/, '')}/admin/reset`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) return new Response(error.message, { status: 500 });

  return new Response(null, { status: 204 });
};
