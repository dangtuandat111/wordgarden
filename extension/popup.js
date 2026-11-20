const field = document.getElementById('appUrl'), status = document.getElementById('status'), folder = document.getElementById('folder'), retry = document.getElementById('retry');
function message(text, error = false) { status.textContent = text; status.className = error ? 'error' : ''; }
function fillFolders(folders, selected = '') {
  folder.replaceChildren(new Option('Chưa phân loại', ''));
  folders.forEach(f => folder.append(new Option(f.name, f.id)));
  folder.value = selected;
}
async function send(data) {
  const result = await chrome.runtime.sendMessage(data);
  if (!result?.ok) throw new Error(result?.message || 'Không kết nối được. Kiểm tra Docker đang chạy.');
  return result;
}
function originFromField() {
  const url = new URL(field.value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Dùng HTTPS hoặc localhost cho địa chỉ ứng dụng.');
  return url.origin;
}
async function currentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Hãy mở website bạn muốn đọc trước.');
  return { tab, origin: `${url.protocol}//${url.hostname}/*`, id: `site-${url.hostname.replace(/[^a-zA-Z0-9]/g, '-')}-${url.protocol.slice(0, -1)}` };
}
document.getElementById('connect').onclick = async event => {
  try {
    const origin = originFromField();
    // Request permissions directly from the user's click, before any network call.
    const target = new URL(origin);
    if (!await chrome.permissions.request({ origins: [`${target.protocol}//${target.hostname}/*`] })) throw new Error('Chưa được cấp quyền kết nối ứng dụng.');
    event.target.disabled = true; message('Đang kết nối…');
    const result = await send({ type: 'connect', appUrl: origin });
    const { defaultFolderId = '' } = await chrome.storage.local.get('defaultFolderId');
    field.value = origin; fillFolders(result.folders, defaultFolderId);
    message('Đã kết nối. Chọn thư mục, rồi bôi đen trên trang bạn đang đọc để lưu ngay.');
  } catch (e) { message(e.message, true); }
  finally { event.target.disabled = false; }
};
folder.onchange = async () => { await chrome.storage.local.set({ defaultFolderId: folder.value }); message('Đã chọn thư mục lưu mặc định.'); };
async function register(id, matches) {
  await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {});
  await chrome.scripting.registerContentScripts([{ id, matches, js: ['content.js'], persistAcrossSessions: true }]);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && /^https?:/.test(tab.url || '')) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
}
document.getElementById('enable').onclick = async () => {
  try { const { origin, id } = await currentSite(); if (!await chrome.permissions.request({ origins: [origin] })) return; await register(id, [origin]); message('Đã bật. Bôi đen từ → Lưu từ, không mở form.'); } catch (e) { message(e.message, true); }
};
document.getElementById('enableAll').onclick = async () => {
  try { const origins = ['http://*/*', 'https://*/*']; if (!await chrome.permissions.request({ origins })) return; await register('all-websites', origins); message('Đã bật cho các website thông thường. Chỉ gửi dữ liệu khi bạn bấm Lưu.'); } catch (e) { message(e.message, true); }
};
document.getElementById('disableAll').onclick = async () => {
  await chrome.scripting.unregisterContentScripts();
  message('Đã tắt popup bôi đen. Tải lại các trang đang mở để gỡ nút. Menu chuột phải vẫn dùng được.');
};
retry.onclick = async () => {
  retry.disabled = true;
  try { const result = await send({ type: 'retry-capture' }); message(result.message); retry.hidden = true; } catch (e) { message(e.message, true); } finally { retry.disabled = false; }
};
document.getElementById('open').onclick = async () => { const { appUrl = 'http://localhost:3080' } = await chrome.storage.local.get('appUrl'); await chrome.tabs.create({ url: appUrl }); };
document.getElementById('reset').onclick = async event => {
  if (!window.confirm('Xóa kết nối, thư mục mặc định, kết quả lưu và từ chờ thử lại; tắt nút bôi đen của extension? Từ đã lưu trên server cần reset trong app.')) return;
  event.target.disabled = true;
  try {
    await chrome.scripting.unregisterContentScripts();
    await chrome.storage.local.clear();
    await chrome.action.setBadgeText({ text: '' });
    field.value = 'http://localhost:3080'; fillFolders([]); retry.hidden = true;
    message('Đã xóa dữ liệu extension. Tải lại các trang đang mở để gỡ nút; kết nối lại khi cần dùng.');
  } catch (e) { message(e.message, true); }
  finally { event.target.disabled = false; }
};
(async () => {
  const config = await chrome.storage.local.get(['appUrl', 'captureToken', 'defaultFolderId', 'lastResult', 'failedCapture']);
  field.value = config.appUrl || 'http://localhost:3080'; retry.hidden = !config.failedCapture;
  if (config.lastResult) message(`${config.lastResult.term}: ${config.lastResult.message}`, !config.lastResult.ok);
  if (config.captureToken) {
    try { const result = await send({ type: 'folders' }); fillFolders(result.folders, config.defaultFolderId); }
    catch (e) { message(e.message, true); }
  }
})();
