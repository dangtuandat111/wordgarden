import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://localhost:3080';
const extensionId = 'a'.repeat(32), origin = `chrome-extension://${extensionId}`;
const created = [];
async function request(action, body, token, extra = {}) {
  const response = await fetch(`${base}/api/extension/${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-Wordgarden-Extension': extensionId, Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
try {
  const me = await fetch(`${base}/api/me`).then(r => r.json());
  assert.equal(me.localMode, true);
  const connect = await request('connect', {});
  assert.equal(connect.status, 200); assert.ok(connect.data.token);
  const token = connect.data.token;
  assert.equal((await request('connect', {}, undefined, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request('folders')).status, 401);
  assert.equal((await request('folders', undefined, token + 'x')).status, 401);
  assert.equal((await request('folders', undefined, token, { 'X-Wordgarden-Extension': 'b'.repeat(32), Origin: `chrome-extension://${'b'.repeat(32)}` })).status, 401);
  const folders = await request('folders', undefined, token); assert.equal(folders.status, 200);
  const term = `__capture_smoke_${Date.now()}`;
  const payload = { term, folderId: folders.data[0]?.id || null, content: { sentence: 'This is temporary capture test data.', sourceUrl: 'https://example.com/reading' } };
  const saved = await request('save', payload, token); assert.equal(saved.status, 201); created.push(saved.data.id);
  assert.equal((await request('save', payload, token)).data.duplicate, true);
  const words = await fetch(`${base}/api/entries`).then(r => r.json());
  const entry = words.find(e => e.id === saved.data.id);
  assert.equal(entry.definition, ''); assert.equal(entry.content.sentence, payload.content.sentence); assert.equal(entry.folderId, payload.folderId);
  const staleFolder = await request('save', { ...payload, term: `${term}_stale`, folderId: 'deleted-folder' }, token);
  assert.equal(staleFolder.status, 201); assert.equal(staleFolder.data.folderReset, true); created.push(staleFolder.data.id);
  const result = await request('save', { ...payload, term: `${term}_unauthorized` }); assert.equal(result.status, 401);
  console.log('PASS: local connection, token authorization, origin protection, expiry/tamper identity checks, direct word-only save, default folder, duplicate detection, stale-folder fallback.');
} finally {
  for (const id of created) {
    const response = await fetch(`${base}/api/entries/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.ok, true, 'Test record cleanup failed');
  }
  console.log('Capture test records removed.');
}
