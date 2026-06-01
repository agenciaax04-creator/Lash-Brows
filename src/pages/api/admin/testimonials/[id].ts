import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  const id = String(params.id ?? '').trim();
  if (!id) return new Response('Missing id', { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const patch: Record<string, any> = {};

  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.quote === 'string') patch.quote = body.quote.trim();

  if (Number.isFinite(body.stars)) {
    let stars = Math.round(Number(body.stars));
    stars = Math.max(1, Math.min(5, stars));
    patch.stars = stars;
  }

  if (Number.isFinite(body.sort_order)) patch.sort_order = Number(body.sort_order);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('testimonials').update(patch).eq('id', id).select('*').single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  const id = String(params.id ?? '').trim();
  if (!id) return new Response('Missing id', { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('testimonials').delete().eq('id', id);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
};
