// PUT    /api/entries/:id  -> 更新（管理者パスワードが必要）
// DELETE /api/entries/:id  -> 削除（管理者パスワードが必要）

async function verifyPassword(password, env) {
  if (!password) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === env.ADMIN_PASSWORD_HASH;
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }

  const ok = await verifyPassword(body.password, env);
  if (!ok) return new Response('Unauthorized', { status: 401 });

  const list = (await env.KAKOMON_KV.get('entries', 'json')) || [];
  const idx = list.findIndex((e) => e.id === params.id);
  if (idx === -1) return new Response('Not Found', { status: 404 });

  const entry = body.entry || {};
  list[idx] = {
    ...list[idx],
    year: String(entry.year ?? list[idx].year),
    term: entry.term ?? list[idx].term,
    examType: entry.examType ?? list[idx].examType,
    subject: entry.subject ?? list[idx].subject,
    teacher: entry.teacher ?? list[idx].teacher,
    title: entry.title ?? list[idx].title,
    url: entry.url ?? list[idx].url,
    note: entry.note ?? list[idx].note,
  };
  await env.KAKOMON_KV.put('entries', JSON.stringify(list));
  return Response.json(list[idx]);
}

export async function onRequestDelete({ request, env, params }) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    // パスワードなしのリクエストは下の認証チェックで弾かれる
  }

  const ok = await verifyPassword(body.password, env);
  if (!ok) return new Response('Unauthorized', { status: 401 });

  let list = (await env.KAKOMON_KV.get('entries', 'json')) || [];
  list = list.filter((e) => e.id !== params.id);
  await env.KAKOMON_KV.put('entries', JSON.stringify(list));
  return new Response(null, { status: 204 });
}
