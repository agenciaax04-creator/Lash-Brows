import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const GET: APIRoute = async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('work_photos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data ?? []);
};

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const image_url = typeof body.image_url === 'string' ? body.image_url.trim() : '';
  const alt = typeof body.alt === 'string' ? body.alt.trim() : null;
  const sort_order = Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0;

  if (!image_url) return new Response('Missing image_url', { status: 400 });
  if (!Number.isFinite(sort_order) || sort_order < 0 || sort_order > 8) {
    return new Response('Invalid sort_order (must be 0..8)', { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { count: existingCount, error: countError } = await supabase
    .from('work_photos')
    .select('id', { count: 'exact', head: true });

  if (countError) return new Response(countError.message, { status: 500 });
  if ((existingCount ?? 0) >= 9) return new Response('Max work photos reached (9)', { status: 400 });

  const { data, error } = await supabase
    .from('work_photos')
    .insert({ image_url, alt, sort_order })
    .select('*')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};

export const PUT: APIRoute = async ({ request }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  const supabase = getSupabaseServerClient();

  for (const item of items) {
    const id = typeof item?.id === 'string' ? item.id : '';
    const sort_order = Number.isFinite(item?.sort_order) ? Number(item.sort_order) : null;
    if (!id || sort_order === null) continue;
    if (sort_order < 0 || sort_order > 8) continue;
    await supabase.from('work_photos').update({ sort_order }).eq('id', id);
  }

  return new Response(null, { status: 204 });
};
