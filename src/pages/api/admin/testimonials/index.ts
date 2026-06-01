import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const GET: APIRoute = async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('testimonials')
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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const quote = typeof body.quote === 'string' ? body.quote.trim() : '';
  let stars = Number.isFinite(body.stars) ? Number(body.stars) : 5;

  if (!name || !quote) return new Response('Missing required fields', { status: 400 });

  stars = Math.max(1, Math.min(5, Math.round(stars)));

  const supabase = getSupabaseServerClient();

  const { count: existingCount, error: countError } = await supabase
    .from('testimonials')
    .select('id', { count: 'exact', head: true });

  if (countError) return new Response(countError.message, { status: 500 });
  if ((existingCount ?? 0) >= 14) return new Response('Max testimonials reached (14)', { status: 400 });

  const { data: maxRow, error: maxError } = await supabase
    .from('testimonials')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) return new Response(maxError.message, { status: 500 });
  const sort_order = Number.isFinite(maxRow?.sort_order) ? Number(maxRow?.sort_order) + 1 : 0;

  const { data, error } = await supabase
    .from('testimonials')
    .insert({ name, quote, stars, sort_order })
    .select('*')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};
