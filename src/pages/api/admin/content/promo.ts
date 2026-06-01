import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const GET: APIRoute = async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('promo_settings').select('*').eq('id', 1).single();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return Response.json(data);
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

  const title = typeof body.title === 'string' ? body.title : undefined;
  const description = typeof body.description === 'string' ? body.description : undefined;
  const price = typeof body.price === 'string' ? body.price : undefined;
  const image_url = typeof body.image_url === 'string' ? body.image_url : undefined;
  const image_alt = typeof body.image_alt === 'string' ? body.image_alt : undefined;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('promo_settings')
    .update({
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(image_url !== undefined ? { image_url } : {}),
      ...(image_alt !== undefined ? { image_alt } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};
