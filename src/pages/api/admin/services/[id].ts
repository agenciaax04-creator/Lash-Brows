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
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (typeof body.price === 'string') patch.price = body.price.trim();
  if (body.price === null) patch.price = null;
  if (typeof body.image_url === 'string') patch.image_url = body.image_url.trim();
  if (body.image_url === null) patch.image_url = null;
  if (typeof body.image_alt === 'string') patch.image_alt = body.image_alt.trim();
  if (body.image_alt === null) patch.image_alt = null;
  if (Number.isFinite(body.sort_order)) patch.sort_order = Number(body.sort_order);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('services').update(patch).eq('id', id).select('*').single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  const id = String(params.id ?? '').trim();
  if (!id) return new Response('Missing id', { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
};
