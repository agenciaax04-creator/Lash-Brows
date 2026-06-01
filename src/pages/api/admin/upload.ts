import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { getSupabaseBucketName, getSupabaseServerClient } from '../../../lib/supabaseServer';
import { requireAdminAuth } from '../../../lib/adminSession';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response('Invalid form data', { status: 400 });
  }

  const file = form.get('file');
  const folder = form.get('folder');

  if (!(file instanceof File)) {
    return new Response('Missing file', { status: 400 });
  }

  const bucket = getSupabaseBucketName();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const safeExt = ext ? `.${ext}` : '';
  const keyFolder = typeof folder === 'string' && folder.length ? folder : 'uploads';
  const objectPath = `${keyFolder}/${randomUUID()}${safeExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  if (error) return new Response(error.message, { status: 500 });

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return Response.json({ url: data.publicUrl, path: objectPath });
};
