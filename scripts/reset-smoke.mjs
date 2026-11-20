// Run with node --import tsx, against the disposable verification database only.
import assert from 'node:assert/strict';
const database = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(database.pathname, '/wordgarden_reset_verification', 'Use the isolated verification database.');
assert.equal(process.env.LOCAL_MODE, 'true');
const { db } = await import('../src/lib/db.ts');
const { POST: reset, GET: get } = await import('../src/app/api/[...path]/route.ts');
const { GET: extensionGet, POST: extensionPost } = await import('../src/app/api/extension/[action]/route.ts');
const { createCaptureToken } = await import('../src/lib/capture-token.ts');
const origin = process.env.AUTH_URL;
const extensionId = 'a'.repeat(32);
const context = resource => ({ params: Promise.resolve({ path: [resource] }) });
const request = (body, requestOrigin = origin) => new Request(`${origin}/api/reset`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(requestOrigin ? { Origin: requestOrigin } : {}) }, body: JSON.stringify(body),
});
try {
  await get(new Request(`${origin}/api/me`), context('me'));
  const user = await db.user.findUniqueOrThrow({ where: { email: 'local@wordgarden.local' } });
  const folder = await db.folder.findFirstOrThrow({ where: { userId: user.id } });
  await db.entry.create({ data: { userId: user.id, folderId: folder.id, term: 'reset fixture', normalizedTerm: 'reset fixture', definition: 'A disposable record.', content: { notes: 'private', sentence: 'Test sentence.' }, reviewStage: 3, reviewedAt: new Date() } });
  const other = await db.user.create({ data: { email: 'other@verification.local', name: 'Other', folders: { create: { name: 'Keep me' } }, entries: { create: { term: 'keep', normalizedTerm: 'keep', definition: '', content: {} } } } });
  const { token } = createCaptureToken(user.id, extensionId, process.env.AUTH_SECRET);
  assert.equal((await reset(request({ confirmation: 'wrong' }), context('reset'))).status, 400);
  assert.equal((await reset(request({ confirmation: 'RESET WORDGARDEN' }, 'https://other.example'), context('reset'))).status, 403);
  assert.equal((await reset(request({ confirmation: 'RESET WORDGARDEN' }, ''), context('reset'))).status, 403);
  assert.equal((await reset(request({}), context('reset'))).status, 400);
  assert.equal(await db.entry.count({ where: { userId: user.id } }), 1, 'Rejected requests keep data');
  assert.equal((await reset(request({ confirmation: 'RESET WORDGARDEN' }), context('reset'))).status, 200);
  assert.equal(await db.user.count({ where: { id: user.id } }), 0);
  assert.equal(await db.entry.count({ where: { userId: user.id } }), 0);
  assert.equal(await db.folder.count({ where: { userId: user.id } }), 0);
  assert.equal(await db.entry.count({ where: { userId: other.id } }), 1, 'Other accounts survive');
  assert.equal(await db.folder.count({ where: { userId: other.id } }), 1);
  for (const action of ['folders', 'save']) {
    const req = new Request(`${origin}/api/extension/${action}`, { method: action === 'folders' ? 'GET' : 'POST', headers: { 'X-Wordgarden-Extension': extensionId, Authorization: `Bearer ${token}`, Origin: `chrome-extension://${extensionId}`, 'Content-Type': 'application/json' }, ...(action === 'save' ? { body: JSON.stringify({ term: 'should not return' }) } : {}) });
    assert.equal((await (action === 'folders' ? extensionGet : extensionPost)(req, { params: Promise.resolve({ action }) })).status, 401, 'Old tokens are revoked');
  }
  await get(new Request(`${origin}/api/me`), context('me'));
  const fresh = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  assert.notEqual(fresh.id, user.id);
  assert.equal(await db.folder.count({ where: { userId: fresh.id } }), 3);
  assert.equal(await db.entry.count({ where: { userId: fresh.id } }), 0);
  console.log('Reset verified: confirmation/origin guards, cascades, account isolation, token revocation, fresh workspace.');
} finally { await db.$disconnect(); }
