// Temporary visibility gate; see docs/features/hide-unready-enrichment/README.md.
const cambridgeVisible = false;
// Keep capture credentials out of content scripts and the websites being read.
chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});
function refreshContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'save-word', title: 'Lưu ngay “%s” vào Wordgarden', contexts: ['selection'] });
    if (cambridgeVisible) chrome.contextMenus.create({ id: 'lookup-word', title: 'Tra “%s” trên Cambridge', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'edit-word', title: 'Mở form lưu “%s”…', contexts: ['selection'] });
  });
}
// Rebuild persisted menus on service-worker startup, including extension reloads.
refreshContextMenus();
function appOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Dùng HTTPS hoặc địa chỉ localhost cho ứng dụng.');
  return url.origin;
}
async function settings() {
  const config = await chrome.storage.local.get(['appUrl', 'captureToken', 'defaultFolderId']);
  return { ...config, appUrl: appOrigin(config.appUrl || 'http://localhost:3080') };
}
async function api(config, path, body, requireToken = true) {
  const target = new URL(config.appUrl);
  if (!await chrome.permissions.contains({ origins: [`${target.protocol}//${target.hostname}/*`] })) throw new Error('Mở extension và bấm Kết nối Wordgarden trước.');
  if (requireToken && !config.captureToken) throw new Error('Mở extension và bấm Kết nối Wordgarden trước.');
  const response = await fetch(`${config.appUrl}/api/extension/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-Wordgarden-Extension': chrome.runtime.id, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(requireToken ? { Authorization: `Bearer ${config.captureToken}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(12000), credentials: 'omit',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không lưu được từ.');
  return result;
}
async function connect(url) {
  const config = { appUrl: appOrigin(url) };
  const result = await api(config, 'connect', {}, false);
  await chrome.storage.local.set({ appUrl: config.appUrl, captureToken: result.token });
  return { ok: true, folders: result.folders };
}
async function openGarden(data) {
  const config = await settings();
  const url = new URL(config.appUrl); url.hash = new URLSearchParams(data).toString();
  await chrome.tabs.create({ url: url.href });
}
function captureData(message, sourceUrl) {
  const data = { term: String(message.term || '').trim().slice(0, 200), sentence: String(message.sentence || '').slice(0, 5000), url: sourceUrl || '' };
  try {
    if (new URL(sourceUrl).hostname === 'dictionary.cambridge.org' && message.definition) {
      data.definition = String(message.definition).slice(0, 3000);
      data.examples = (Array.isArray(message.examples) ? message.examples : []).slice(0, 2).map(s => String(s).slice(0, 1200)).filter(Boolean);
    }
  } catch {}
  return data;
}
async function quickSave(data) {
  if (!data.term) return { ok: false, message: 'Hãy bôi đen một từ hoặc cụm từ.' };
  try {
    const config = await settings();
    const result = await api(config, 'save', {
      term: data.term, definition: data.definition || '', folderId: config.defaultFolderId || null,
      content: { sentence: data.sentence || '', sourceUrl: data.url || '', definitionSource: data.definition ? 'Cambridge (đối chiếu thủ công)' : 'Chưa có nghĩa', dictionaryUrl: data.definition ? data.url : '', examples: (data.examples || []).map(en => ({ en, vi: '' })) },
    });
    if (result.folderReset) await chrome.storage.local.set({ defaultFolderId: '' });
    const response = { ok: true, duplicate: result.duplicate, message: result.message, term: data.term };
    await chrome.storage.local.set({ lastResult: response, failedCapture: null });
    await chrome.action.setBadgeText({ text: result.duplicate ? '·' : '✓' });
    await chrome.action.setBadgeBackgroundColor({ color: '#345c46' });
    return response;
  } catch (error) {
    const response = { ok: false, term: data.term, message: error instanceof TypeError || error.name === 'TimeoutError' ? 'Không kết nối được Wordgarden. Kiểm tra Docker rồi thử lại.' : error.message };
    await chrome.storage.local.set({ lastResult: response, failedCapture: data });
    await chrome.action.setBadgeText({ text: '!' }); await chrome.action.setBadgeBackgroundColor({ color: '#ad704f' });
    return response;
  }
}
async function showResult(tabId, result) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: (message, ok) => {
      const node = document.createElement('div'); node.textContent = `${ok ? '✓' : '!'} ${message}`;
      node.style.cssText = `position:fixed;bottom:24px;right:24px;max-width:360px;z-index:2147483647;padding:15px 20px;border-radius:9px;background:${ok ? '#345c46' : '#9a674a'};color:white;font:13px/1.7 Arial,sans-serif;box-shadow:0 6px 30px #20302230;`;
      document.documentElement.append(node); setTimeout(() => node.remove(), 5000);
    }, args: [result.message, result.ok] });
  } catch {}
}
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const term = (info.selectionText || '').trim().slice(0, 200);
  if (info.menuItemId === 'lookup-word') { if (!cambridgeVisible) return; await chrome.tabs.create({ url: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(term.replace(/\s+/g, '-'))}` }); return; }
  let sentence = '';
  if (tab?.id) {
    try {
      const result = await chrome.scripting.executeScript({ target: { tabId: tab.id, ...(info.frameId ? { frameIds: [info.frameId] } : {}) }, func: () => {
        const selection = window.getSelection(), text = selection?.toString().trim() || '';
        const node = selection?.anchorNode?.parentElement;
        if (node?.closest('input, textarea, [contenteditable="true"]')) return '';
        const block = node?.closest('p, li, blockquote, h1, h2, h3, td') || node;
        const context = block?.textContent?.replace(/\s+/g, ' ').trim() || text;
        const at = context.indexOf(text), segments = Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(context));
        return (segments.find(s => at >= s.index && at < s.index + s.segment.length)?.segment || context).trim().slice(0, 5000);
      } }); sentence = result[0]?.result || '';
    } catch {}
  }
  const data = captureData({ term, sentence }, info.frameUrl || info.pageUrl || tab?.url || '');
  if (info.menuItemId === 'edit-word') { await openGarden(data); return; }
  const result = await quickSave(data); if (tab?.id) await showResult(tab.id, result);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  const ownPage = sender.url?.startsWith(chrome.runtime.getURL('')) || !sender.tab;
  let job;
  if (ownPage && message.type === 'connect') job = connect(message.appUrl);
  else if (ownPage && message.type === 'folders') job = settings().then(config => api(config, 'folders')).then(folders => ({ ok: true, folders }));
  else if (ownPage && message.type === 'retry-capture') job = chrome.storage.local.get('failedCapture').then(({ failedCapture }) => failedCapture ? quickSave(failedCapture) : { ok: false, message: 'Chưa có từ cần thử lại.' });
  else if (message.type === 'quick-save' && sender.tab) job = quickSave(captureData(message, sender.url || sender.tab.url));
  if (!job) return;
  job.then(sendResponse).catch(error => sendResponse({ ok: false, message: error.message }));
  return true;
});
