(() => {
  if (window.__wordgardenInstalled) return;
  window.__wordgardenInstalled = true;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483647;display:none;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = ':host{all:initial}div{display:flex;gap:5px;padding:5px;background:#f7f9ef;border:1px solid #cddbbb;border-radius:8px;box-shadow:0 5px 20px #172e2426}button{border:0;background:#355d45;color:white;font:12px Arial,sans-serif;padding:9px 12px;border-radius:5px;cursor:pointer}button+button{background:#e7eedc;color:#6c8757}';
  const wrapper = document.createElement('div');
  wrapper.style.flexWrap = 'wrap';
  const save = document.createElement('button'); save.textContent = '＋ Lưu từ';
  const lookup = document.createElement('button'); lookup.textContent = 'Cambridge ↗';
  wrapper.append(save, lookup); shadow.append(style, wrapper); document.documentElement.append(host);
  const status = document.createElement('p');
  status.style.cssText = 'margin:0;padding:0 5px;flex-basis:100%;max-width:270px;color:#6c8757;font:11px/1.6 Arial,sans-serif;';
  wrapper.append(status);
  let captured = { term: '', sentence: '' };
  const send = data => chrome.runtime.sendMessage({ type: 'quick-save', ...data });
  save.onpointerdown = e => e.preventDefault();
  lookup.onpointerdown = e => e.preventDefault();
  let captureVersion = 0;
  save.onclick = async () => {
    const version = captureVersion;
    save.disabled = true; save.textContent = 'Đang lưu…';
    try {
      const result = await send(captured);
      if (version !== captureVersion) return;
      save.textContent = result?.ok ? (result.duplicate ? '✓ Đã có từ này' : '✓ Đã lưu') : '↻ Thử lưu lại';
      status.textContent = result?.message || 'Chưa lưu được. Mở extension để kết nối.';
      if (result?.ok) setTimeout(() => { if (version === captureVersion) host.style.display = 'none'; }, 2500);
    } catch { if (version === captureVersion) { status.textContent = 'Hãy tải lại trang sau khi cập nhật extension.'; save.textContent = '↻ Thử lại'; } }
    finally { if (version === captureVersion) save.disabled = false; }
  };
  lookup.onclick = () => { window.open(`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(captured.term.replace(/\s+/g, '-'))}`, '_blank', 'noopener,noreferrer'); host.style.display = 'none'; };
  document.addEventListener('pointerup', e => {
    if (e.composedPath().includes(host)) return;
    const selection = window.getSelection();
    const term = selection?.toString().trim();
    const anchor = selection?.anchorNode?.parentElement;
    if (!term || term.length > 200 || anchor?.closest('input, textarea, [contenteditable="true"]')) { host.style.display = 'none'; return; }
    const range = selection.getRangeAt(0).getBoundingClientRect();
    const node = anchor?.closest('p, li, blockquote, h1, h2, h3, td') || anchor;
    const context = node?.textContent?.replace(/\s+/g, ' ').trim() || term;
    const at = context.indexOf(term);
    const segments = Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(context));
    const sentence = segments.find(s => at >= s.index && at < s.index + s.segment.length)?.segment || context;
    captured = { term, sentence: sentence.trim().slice(0, 5000) };
    captureVersion++; save.disabled = false; save.textContent = '＋ Lưu từ'; status.textContent = '';
    host.style.display = 'block'; host.style.left = `${Math.max(8, Math.min(range.left, innerWidth - 240))}px`; host.style.top = `${Math.min(Math.max(8, range.bottom + 8), innerHeight - 55)}px`;
  });
  document.addEventListener('scroll', () => { host.style.display = 'none'; }, { passive: true });
  if (location.hostname === 'dictionary.cambridge.org') {
    function addButtons() {
      document.querySelectorAll('.def-block').forEach(block => {
        if (block.querySelector('.wordgarden-save-sense')) return;
        const definition = block.querySelector('.def')?.textContent?.trim();
        if (!definition) return;
        const button = document.createElement('button'); button.className = 'wordgarden-save-sense'; button.textContent = '＋ Lưu nghĩa này vào Wordgarden';
        button.style.cssText = 'display:block;border:1px solid #cfdbbf;border-radius:5px;padding:7px 10px;margin:9px 0;background:#eef4e6;color:#4c7040;font:11px Arial,sans-serif;cursor:pointer;';
        button.onclick = async event => {
          event.preventDefault(); event.stopPropagation();
          const entry = block.closest('.entry-body__el');
          const term = entry?.querySelector('.hw')?.textContent?.trim() || document.querySelector('.hw')?.textContent?.trim() || document.title.split('|')[0].trim();
          const examples = Array.from(block.querySelectorAll('.examp .eg')).slice(0, 2).map(x => x.textContent.trim());
          button.disabled = true; button.textContent = 'Đang lưu…';
          try {
            const result = await send({ term, sentence: '', definition, examples });
            button.textContent = result?.ok ? (result.duplicate ? '✓ Nghĩa này đã có' : '✓ Đã lưu vào Wordgarden') : `Chưa lưu: ${result?.message || 'Mở extension để kết nối.'}`;
            if (!result?.ok) button.disabled = false;
          } catch { button.textContent = 'Chưa lưu. Tải lại trang rồi thử lại.'; button.disabled = false; }
        };
        block.append(button);
      });
    }
    addButtons();
    const observer = new MutationObserver(addButtons); observer.observe(document.body, { childList: true, subtree: true });
  }
})();
