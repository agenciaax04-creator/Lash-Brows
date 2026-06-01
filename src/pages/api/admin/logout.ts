import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('admin_session', { path: '/' });
  return redirect('/admin', 302);
};
