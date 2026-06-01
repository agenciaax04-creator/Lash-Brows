import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../../lib/adminSession';

export const prerender = false;

export const GET: APIRoute = async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('hero_settings').select('*').eq('id', 1).single();

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

  const address = typeof body.address === 'string' ? body.address : undefined;
  const title = typeof body.title === 'string' ? body.title : undefined;
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle : undefined;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('hero_settings')
    .update({
      ...(address !== undefined ? { address } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
};
