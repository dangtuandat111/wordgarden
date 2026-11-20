import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://localhost:3080';
const prefix = `__smoke_${Date.now()}`;
const created = [];
let folderId;
async function request(path, method = 'GET', body, extra = {}) {
  const response = await fetch(base + '/api/' + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data };
}
try {
  assert.equal((await request('health')).status, 200);
  assert.equal((await request('me')).data.localMode, true, 'Smoke test must run against local mode only');
  const folder = await request('folders', 'POST', { name: prefix });
  assert.equal(folder.status, 201); folderId = folder.data.id;
  const payload = { term: prefix, definition: '', folderId, content: { sentence: 'This is a test sentence.', notes: 'Temporary automated test data.' } };
  const saved = await request('entries', 'POST', payload);
  assert.equal(saved.status, 201); created.push(saved.data.id);
  assert.equal(saved.data.content.meaningVi, ''); assert.deepEqual(saved.data.content.examples, []);
  assert.equal((await request('entries', 'POST', payload)).status, 409, 'Duplicate must not create another entry');
  assert.equal((await request('entries', 'POST', payload, { Origin: 'https://untrusted.example' })).status, 403);
  const editedPayload = { ...payload, definition: 'A test definition.', version: saved.data.version };
  const edited = await request(`entries/${saved.data.id}`, 'PATCH', editedPayload);
  assert.equal(edited.status, 200); assert.equal(edited.data.version, 2);
  assert.equal((await request(`entries/${saved.data.id}`, 'PATCH', editedPayload)).status, 409, 'Stale edits must be rejected');
  const review = await request(`entries/${saved.data.id}/review`, 'PATCH', { version: 2, remembered: true });
  assert.equal(review.status, 200); assert.equal(review.data.reviewStage, 1);
  const exported = await request(`export?format=json&ids=${saved.data.id}`);
  assert.equal(exported.data.entries.length, 1); assert.equal(exported.data.entries[0].content.sentence, payload.content.sentence);
  const imported = await request('import', 'POST', exported.data);
  assert.equal(imported.status, 200); assert.equal(imported.data.skipped, 1); assert.equal(imported.data.created, 0);
  const csv = await request(`export?format=csv&ids=${saved.data.id}`); assert.equal(csv.status, 200); assert.match(csv.data, new RegExp(prefix));
  assert.equal((await request('entries', 'POST', { term: 'bad', content: { examples: Array(3).fill({ en: 'Too many.', vi: '' }) } })).status, 400);
  await request(`folders/${folderId}`, 'DELETE', {}); folderId = undefined;
  const entries = await request('entries'); assert.equal(entries.data.find(e => e.id === saved.data.id).folderId, null, 'Deleting a folder must preserve its words');
  console.log('PASS: health, local account, word-only save, duplicate prevention, origin check, edit, optimistic conflict, review, JSON export/import, CSV, validation, folder preservation.');
} finally {
  for (const id of created) await request(`entries/${id}`, 'DELETE', {});
  if (folderId) await request(`folders/${folderId}`, 'DELETE', {});
  console.log('Temporary test records removed.');
}
