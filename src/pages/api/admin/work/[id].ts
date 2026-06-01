import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  const id = String(params.id ?? '').trim();
  if (!id) return new Response('Missing id', { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('work_photos').delete().eq('id', id);
  if (error) return new Response(error.message, { status: 500 });

  return new Response(null, { status: 204 });
};
