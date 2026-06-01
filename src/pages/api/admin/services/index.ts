import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const GET: APIRoute = async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('services')
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

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const price = typeof body.price === 'string' ? body.price.trim() : null;
  const image_url = typeof body.image_url === 'string' ? body.image_url.trim() : null;
  const image_alt = typeof body.image_alt === 'string' ? body.image_alt.trim() : null;
  const requestedSortOrder = Number.isFinite(body.sort_order) ? Number(body.sort_order) : null;

  if (!title || !description) {
    return new Response('Missing required fields', { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { count: existingCount, error: countError } = await supabase
    .from('services')
    .select('id', { count: 'exact', head: true });

  if (countError) return new Response(countError.message, { status: 500 });
  if ((existingCount ?? 0) >= 10) return new Response('Max services reached (10)', { status: 400 });

  let sort_order = 0;
  if (requestedSortOrder !== null) {
    sort_order = requestedSortOrder;
  } else {
    const { data: maxRow, error: maxError } = await supabase
      .from('services')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) return new Response(maxError.message, { status: 500 });
    sort_order = Number.isFinite(maxRow?.sort_order) ? Number(maxRow?.sort_order) + 1 : 0;
  }

  const { data, error } = await supabase
    .from('services')
    .insert({ title, description, price, image_url, image_alt, sort_order })
    .select('*')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};
