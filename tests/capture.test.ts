import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createCaptureToken, verifyCaptureToken } from '../src/lib/capture-token';
const extensionId = 'a'.repeat(32), secret = 'test-secret-with-at-least-32-characters';
test('capture credential is scoped to one extension, expires, and detects tampering', () => {
  const now = Date.now(), { token } = createCaptureToken('local-user', extensionId, secret, now);
  assert.equal(verifyCaptureToken(token, extensionId, secret, now).userId, 'local-user');
  assert.throws(() => verifyCaptureToken(token, 'b'.repeat(32), secret, now));
  assert.throws(() => verifyCaptureToken(token, extensionId, secret, now + 31 * 86400000));
  assert.throws(() => verifyCaptureToken(token + 'x', extensionId, secret, now));
  assert.throws(() => verifyCaptureToken('not-a-token', extensionId, secret, now));
});
type CaptureResult = { ok: boolean; message: string };
type CaptureBody = { term: string; definition: string; folderId: string | null; content: {
  sentence: string; sourceUrl: string; examples: { en: string; vi: string }[] } };
type Sender = { id: string; url: string; tab?: { id: number } };
function background(fetcher: typeof fetch) {
  const storage: { appUrl: string; captureToken: string; defaultFolderId: string; failedCapture?: { term: string } | null; lastResult?: CaptureResult } = { appUrl: 'http://localhost:3080', captureToken: 'capture-credential', defaultFolderId: 'work' };
  const menus: { id: string }[] = [{ id: 'lookup-word' }];
  const opened: unknown[] = [], calls: { path: string; body: CaptureBody }[] = [];
  let listener: (message: unknown, sender: Sender, respond: (value: CaptureResult) => void) => boolean | undefined;
  const chrome = {
    storage: { local: { setAccessLevel: async () => {}, get: async () => ({ ...storage }), set: async (data: Partial<typeof storage>) => Object.assign(storage, data) } },
    permissions: { contains: async () => true },
    runtime: { id: extensionId, getURL: (path: string) => `chrome-extension://${extensionId}/${path}`, onInstalled: { addListener: () => {} }, onMessage: { addListener: (fn: typeof listener) => { listener = fn; } } },
    contextMenus: { removeAll: (done: () => void) => { menus.length = 0; done(); }, create: (menu: { id: string }) => menus.push(menu), onClicked: { addListener: () => {} } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    tabs: { create: async (data: unknown) => opened.push(data) },
  };
  vm.runInNewContext(readFileSync('extension/background.js', 'utf8'), { chrome, URL, URLSearchParams, AbortSignal, TypeError, fetch: async (path: string, options: RequestInit) => { calls.push({ path, body: options.body ? JSON.parse(String(options.body)) : undefined }); return fetcher(path, options); } });
  const message = (data: unknown, sender = { id: extensionId, url: 'https://example.com/article', tab: { id: 1 } }) => new Promise<CaptureResult>(resolve => listener(data, sender, resolve));
  return { storage, opened, calls, message, menus };
}
test('one-click save writes through the API without opening a form or tab', async () => {
  const bg = background(async () => new Response(JSON.stringify({ id: 'entry', message: 'Đã lưu', duplicate: false }), { status: 201 }));
  const result = await bg.message({ type: 'quick-save', term: 'resilient', sentence: 'A resilient team.', definition: 'untrusted definition' });
  assert.equal(result.ok, true); assert.equal(bg.opened.length, 0);
  assert.equal(bg.calls[0].body.term, 'resilient'); assert.equal(bg.calls[0].body.folderId, 'work');
  assert.equal(bg.calls[0].body.content.sentence, 'A resilient team.');
  assert.equal(bg.calls[0].body.content.sourceUrl, 'https://example.com/article');
  assert.equal(bg.calls[0].body.definition, '', 'Other websites cannot masquerade as Cambridge');
});
test('network failure reports failure and retains the last capture for explicit retry', async () => {
  const bg = background(async () => { throw new TypeError('offline'); });
  const result = await bg.message({ type: 'quick-save', term: 'resilient', sentence: 'A resilient team.' });
  assert.equal(result.ok, false); assert.equal(bg.storage.failedCapture?.term, 'resilient');
  assert.equal(bg.storage.lastResult?.ok, false); assert.equal(bg.opened.length, 0);
});
test('Cambridge capture retains only two real examples', async () => {
  const bg = background(async () => new Response(JSON.stringify({ id: 'entry', message: 'Đã lưu' }), { status: 201 }));
  await bg.message({ type: 'quick-save', term: 'take off', definition: 'To leave the ground.', examples: ['First.', 'Second.', 'Third.'] }, { id: extensionId, url: 'https://dictionary.cambridge.org/dictionary/english/take-off', tab: { id: 1 } });
  assert.equal(bg.calls[0].body.definition, 'To leave the ground.'); assert.equal(bg.calls[0].body.content.examples.length, 2);
});

test('worker startup rebuilds menus without Cambridge and retains ordinary capture actions', () => {
  const bg = background(async () => new Response('{}'));
  assert.deepEqual(bg.menus.map(menu => menu.id), ['save-word', 'edit-word']);
});
