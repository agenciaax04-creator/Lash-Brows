import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password || password.length < 8) return new Response('Password too short', { status: 400 });

  const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';

  if (!url || !anonKey) return new Response('Missing SUPABASE_URL or SUPABASE_ANON_KEY', { status: 500 });

  const access_token = cookies.get('sb_access_token')?.value ?? '';
  const refresh_token = cookies.get('sb_refresh_token')?.value ?? '';

  if (!access_token || !refresh_token) return new Response('Missing reset session', { status: 401 });

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) return new Response(sessionError.message, { status: 401 });

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) return new Response(error.message, { status: 500 });

  const email = data?.user?.email ? String(data.user.email).toLowerCase().trim() : '';
  const allowlistRaw =
    process.env.ADMIN_EMAIL_ALLOWLIST ?? import.meta.env.ADMIN_EMAIL_ALLOWLIST ?? process.env.ADMIN_EMAIL ?? '';
  const allowlist = allowlistRaw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email || (allowlist.length > 0 && !allowlist.includes(email))) {
    return new Response('Forbidden', { status: 403 });
  }

  cookies.delete('sb_access_token', { path: '/' });
  cookies.delete('sb_refresh_token', { path: '/' });

  return new Response(null, { status: 204 });
};
