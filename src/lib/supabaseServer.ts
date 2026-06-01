import { createClient } from '@supabase/supabase-js';

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase env vars are not configured');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? import.meta.env.SUPABASE_STORAGE_BUCKET ?? 'lash-brows';
}
