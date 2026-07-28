// POST /api/verify -> 管理者パスワードの照合のみ行う（データは返さない）

async function verifyPassword(password, env) {
  if (!password) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === env.ADMIN_PASSWORD_HASH;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }
  const ok = await verifyPassword(body.password, env);
  return new Response(null, { status: ok ? 200 : 401 });
}
