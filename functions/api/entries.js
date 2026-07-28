// GET  /api/entries   -> 一覧取得（誰でも閲覧可能）
// POST /api/entries   -> 新規登録（管理者パスワードが必要）

async function verifyPassword(password, env) {
  if (!password) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === env.ADMIN_PASSWORD_HASH;
}

export async function onRequestGet({ env }) {
  const list = (await env.KAKOMON_KV.get('entries', 'json')) || [];
  return Response.json(list);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }

  const ok = await verifyPassword(body.password, env);
  if (!ok) return new Response('Unauthorized', { status: 401 });

  const entry = body.entry || {};
  if (!entry.year || !entry.subject || !entry.url) {
    return new Response('Missing required fields', { status: 400 });
  }

  const list = (await env.KAKOMON_KV.get('entries', 'json')) || [];
  const newEntry = {
    id: crypto.randomUUID(),
    year: String(entry.year || ''),
    term: entry.term || '',
    examType: entry.examType || '',
    subject: entry.subject || '',
    teacher: entry.teacher || '',
    title: entry.title || '',
    url: entry.url || '',
    note: entry.note || '',
    createdAt: Date.now(),
  };
  list.push(newEntry);
  await env.KAKOMON_KV.put('entries', JSON.stringify(list));
  return Response.json(newEntry, { status: 201 });
}
