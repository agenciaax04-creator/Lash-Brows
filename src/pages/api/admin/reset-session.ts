import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const access_token = typeof body?.access_token === 'string' ? body.access_token : '';
  const refresh_token = typeof body?.refresh_token === 'string' ? body.refresh_token : '';

  if (!access_token || !refresh_token) return new Response('Missing tokens', { status: 400 });

  const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';

  if (!url || !anonKey) return new Response('Missing SUPABASE_URL or SUPABASE_ANON_KEY', { status: 500 });

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error || !data?.session) return new Response(error?.message ?? 'Invalid session', { status: 400 });

  cookies.set('sb_access_token', data.session.access_token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 10,
  });

  cookies.set('sb_refresh_token', data.session.refresh_token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60,
  });

  return new Response(null, { status: 204 });
};
