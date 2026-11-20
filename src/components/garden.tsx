'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Sprout, Search, Plus, ArrowUpRight, ArrowRight, ChevronRight, Check, X, FolderOpen, Layers, Printer, Settings, Download, Upload, Grid2X2, List, Trash2, Pencil, RotateCcw, Eye, EyeOff, Bookmark, CheckCircle2, AlertCircle, Loader2, LogOut, Monitor, Leaf, CalendarDays } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { cambridgeUrl, emptyContent, safeUrl, type Content, type Folder, type SavedEntry, type EntryInput } from '@/lib/model';
import type { DictionarySense } from '@/lib/cambridge';

type View = 'library' | 'review' | 'print' | 'settings';
type Me = { name: string; email: string; localMode: boolean };
type Draft = EntryInput & { id?: string; version?: number };
const blank = (): Draft => ({ term: '', definition: '', folderId: null, content: { ...emptyContent, tags: [], examples: [] } });
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(`/api/${path}`, { method, ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), cache: 'no-store' });
  const data = await r.json();
  if (!r.ok) { const error = new Error(data.error || 'Không kết nối được ứng dụng.'); Object.assign(error, { status: r.status }); throw error; }
  return data;
}
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term || !text) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return <>{text.split(new RegExp(`(${escaped})`, 'gi')).map((part, i) => part.toLowerCase() === term.toLowerCase() ? <mark key={i}>{part}</mark> : part)}</>;
}
function SourceLink({ url, children }: { url: string; children: React.ReactNode }) {
  const href = safeUrl(url); return href ? <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={13} /></a> : null;
}
function dateText(date: string) { return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

export default function Garden() {
  const [me, setMe] = useState<Me | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('library');
  const [folderId, setFolderId] = useState('all');
  const [query, setQuery] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detail, setDetail] = useState<SavedEntry | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [folderModal, setFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [showVi, setShowVi] = useState(true);
  const [allExamples, setAllExamples] = useState(true);
  const [worksheet, setWorksheet] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const importInput = useRef<HTMLInputElement>(null);
  const loadedCapture = useRef(false);
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 4500); };
  const refresh = useCallback(async () => {
    const [words, groups] = await Promise.all([api<SavedEntry[]>('entries'), api<Folder[]>('folders')]);
    setEntries(words); setFolders(groups);
  }, []);
  useEffect(() => {
    api<Me>('me').then(async user => { setMe(user); await refresh(); }).catch(e => { if (e.status === 401) setLoginRequired(true); else setError(e.message); }).finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (!me) return;
    const update = () => { if (!document.hidden) refresh().catch(() => {}); };
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 30000);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [me, refresh]);
  useEffect(() => {
    if (!me || loadedCapture.current) return;
    loadedCapture.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    if (params.get('term')) {
      const next = blank(); next.term = params.get('term')!.slice(0, 200);
      next.content.sentence = (params.get('sentence') || '').slice(0, 5000);
      next.content.sourceUrl = safeUrl(params.get('url') || '');
      if (params.get('definition')) {
        next.definition = params.get('definition')!.slice(0, 3000);
        next.content.definitionSource = 'Cambridge (đối chiếu thủ công)';
        next.content.dictionaryUrl = next.content.sourceUrl;
        try { next.content.examples = JSON.parse(params.get('examples') || '[]').slice(0, 2).map((en: string) => ({ en: String(en).slice(0, 1200), vi: '' })); } catch {}
      }
      setDraft(next); window.history.replaceState({}, '', '/');
    }
  }, [me]);
  useEffect(() => {
    const dismiss = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDetail(null); if (!busy) { setDraft(null); setFolderModal(false); } } };
    document.addEventListener('keydown', dismiss); return () => document.removeEventListener('keydown', dismiss);
  }, [busy]);
  const filtered = useMemo(() => entries.filter(e => (folderId === 'all' || (folderId === 'none' ? !e.folderId : e.folderId === folderId)) && (!dueOnly || new Date(e.nextReviewAt) <= new Date()) && [e.term, e.definition, e.content.meaningVi, e.content.sentence, e.content.notes, ...e.content.tags].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())), [entries, folderId, query, dueOnly]);
  const due = entries.filter(e => new Date(e.nextReviewAt) <= new Date());
  const reviewQueue = filtered.filter(e => new Date(e.nextReviewAt) <= new Date());
  const current = reviewQueue[0];
  const activeFolder = folders.find(f => f.id === folderId);
  const folderLabel = activeFolder?.name || (folderId === 'none' ? 'Chưa phân loại' : 'Tất cả từ vựng');
  const titles = { library: folderLabel, review: 'Một chút mỗi ngày.', print: 'Mang việc học lên giấy.', settings: 'Góc thiết lập.' };
  const changeView = (next: View) => { setView(next); setFlipped(false); setReviewed(0); setError(''); };
  const openNew = () => { const next = blank(); if (activeFolder) next.folderId = activeFolder.id; setDraft(next); };
  async function save(value: Draft) {
    setBusy(true);
    try { await api(value.id ? `entries/${value.id}` : 'entries', value.id ? 'PATCH' : 'POST', value); await refresh(); setDraft(null); notify(value.id ? 'Đã cập nhật từ vựng.' : 'Đã gieo thêm một từ mới.'); }
    finally { setBusy(false); }
  }
  async function remove(entry: SavedEntry) {
    if (!window.confirm(`Xóa “${entry.term}” khỏi thư viện?`)) return;
    try { await api(`entries/${entry.id}`, 'DELETE', {}); await refresh(); setDetail(null); notify('Đã xóa từ.'); } catch (e) { setError((e as Error).message); }
  }
  async function resetWorkspace() {
    if (busy || resetConfirmation !== 'RESET WORDGARDEN') return;
    setBusy(true); setError('');
    try {
      await api('reset', 'POST', { confirmation: resetConfirmation });
      // Reload drops drafts, selected files, print views and all other in-memory state.
      window.location.replace('/');
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  async function review(remembered: boolean) {
    if (!current || busy) return;
    setBusy(true);
    try { await api(`entries/${current.id}/review`, 'PATCH', { remembered, version: current.version }); await refresh(); setReviewed(v => v + 1); setFlipped(false); }
    catch (e) { setError((e as Error).message); await refresh(); }
    finally { setBusy(false); }
  }
  const exportUrl = (format: string) => `/api/export?format=${format}&ids=${filtered.map(e => e.id).join(',')}`;

  if (loginRequired) return <main className="login"><div className="brand-icon"><Sprout size={36}/></div><h1>Wordgarden</h1><p>Một nơi nhỏ cho những từ bạn muốn nhớ.</p><button className="primary" onClick={() => signIn('google')}>Đăng nhập với Google <ArrowRight size={16}/></button><small>Chỉ tài khoản được cho phép mới có thể truy cập.</small></main>;

  return <div className="app-shell">
    <aside className="sidebar no-print">
      <a href="/" className="brand"><span className="brand-icon"><Sprout size={25}/></span><span>wordgarden<span className="brand-dot">.</span></span></a>
      <p className="sidebar-label">KHÔNG GIAN HỌC CỦA BẠN</p>
      <nav className="main-nav" aria-label="Điều hướng chính">
        <button className={view === 'library' ? 'active' : ''} onClick={() => { changeView('library'); setFolderId('all'); }}><BookOpen size={19}/> Thư viện từ <span className="nav-count">{entries.length}</span></button>
        <button className={view === 'review' ? 'active' : ''} onClick={() => changeView('review')}><Layers size={19}/> Ôn tập <span className="nav-count warm">{due.length}</span></button>
        <button className={view === 'print' ? 'active' : ''} onClick={() => changeView('print')}><Printer size={19}/> In & xuất tệp</button>
      </nav>
      <div className="folder-heading"><p className="sidebar-label">THƯ MỤC</p><button className="icon-button" title="Thêm thư mục" onClick={() => setFolderModal(true)}><Plus size={17}/></button></div>
      <nav className="folders" aria-label="Thư mục">
        {folders.map(f => <button key={f.id} className={folderId === f.id ? 'chosen' : ''} onClick={() => { setFolderId(f.id); changeView('library'); }}><span className={`folder-dot ${f.color}`}/><span>{f.name}</span><span className="folder-count">{entries.filter(e => e.folderId === f.id).length}</span></button>)}
        <button className={folderId === 'none' ? 'chosen' : ''} onClick={() => { setFolderId('none'); changeView('library'); }}><FolderOpen size={15}/><span>Chưa phân loại</span><span className="folder-count">{entries.filter(e => !e.folderId).length}</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="small-note"><Leaf size={20}/><p>Little words.<br/><strong>Lasting knowledge.</strong></p></div><button className={`settings-link ${view === 'settings' ? 'active' : ''}`} onClick={() => changeView('settings')}><Settings size={18}/> Thiết lập & hướng dẫn</button><div className="profile"><span className="avatar">{me?.name?.[0] || 'W'}</span><div><strong>{me?.name || 'Wordgarden'}</strong><small>{me?.localMode ? 'Không gian local' : me?.email || 'Đang kết nối…'}</small></div><span className="online-dot" title="Dữ liệu lưu trên server"/></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar no-print"><span><span className="status-dot"/>{me?.localMode ? 'LOCAL WORKSPACE' : 'PERSONAL WORKSPACE'}</span><span className="top-date"><CalendarDays size={14}/>{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></header>
      <div className="content-wrap">
        <div className="page-heading no-print"><div><p className="eyebrow">YOUR WORDS, IN CONTEXT</p><h1>{titles[view]}</h1><p className="subtitle">{view === 'library' ? 'Nhặt một từ hay. Giữ lại cả câu chuyện.' : view === 'review' ? 'Gặp lại những từ cũ, nhớ thêm một chút mới.' : view === 'print' ? 'Một cuốn sổ nhỏ, theo bạn ra ngoài màn hình.' : 'Mọi thứ bạn cần để bắt đầu và học tiếp.'}</p></div><div className="heading-actions"><button className="secondary" onClick={() => changeView('settings')}><Monitor size={17}/> Lưu từ khi lướt web</button><button className="primary" onClick={openNew}><Plus size={18}/> Thêm từ mới</button></div></div>
        {error && <div className="notice danger no-print" role="alert"><AlertCircle size={18}/><span>{error}</span><button onClick={() => setError('')} className="icon-button"><X size={16}/></button></div>}
        {loading ? <div className="loading"><Loader2 className="spin"/> Đang mở khu vườn của bạn…</div> : <>
          {view === 'library' && <>
            <section className="welcome-panel"><div><span className="mini-tag"><span className="status-dot"/> A LITTLE EVERY DAY</span><h2>Từ nhỏ hôm nay,<br/>thế giới rộng ngày mai.</h2><p>Lưu từ trong ngữ cảnh. Hiểu cách dùng.<br/>Và biến điều vừa đọc thành điều bạn nhớ.</p><button className="text-button" onClick={() => changeView('review')}>Bắt đầu ôn tập <ArrowRight size={16}/></button></div><div className="botanical" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="leaf-shape leaf-one"/><div className="leaf-shape leaf-two"/><div className="leaf-shape leaf-three"/><div className="stem"/><span className="floating-word word-one">in context</span><span className="floating-word word-two">little by little</span><span className="botanical-star">✧</span></div><div className="welcome-stats"><div><strong>{entries.length.toString().padStart(2, '0')}</strong><span>từ đã lưu</span></div><div><strong>{due.length.toString().padStart(2, '0')}</strong><span>từ chờ ôn</span></div></div></section>
            <div className="section-head"><h2>Bộ sưu tập của bạn <span>{filtered.length}</span></h2><button className={`filter-pill ${dueOnly ? 'selected' : ''}`} onClick={() => setDueOnly(!dueOnly)}><RotateCcw size={14}/> Đến hạn ôn</button></div>
            <div className="toolbar"><label className="searchbox"><Search size={18}/><input aria-label="Tìm từ vựng" placeholder="Tìm từ, nghĩa hoặc ghi chú…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button className="icon-button" onClick={() => setQuery('')}><X size={15}/></button>}</label><select aria-label="Lọc thư mục" value={folderId} onChange={e => setFolderId(e.target.value)}><option value="all">Tất cả thư mục</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}<option value="none">Chưa phân loại</option></select><div className="view-toggle"><button title="Xem thẻ" className={layout === 'grid' ? 'selected' : ''} onClick={() => setLayout('grid')}><Grid2X2 size={17}/></button><button title="Xem danh sách" className={layout === 'list' ? 'selected' : ''} onClick={() => setLayout('list')}><List size={19}/></button></div></div>
            {filtered.length ? <div className={`entry-grid ${layout === 'list' ? 'entry-list' : ''}`}>{filtered.map(e => <article className="word-card" key={e.id}>
              <div className="card-top"><span className={`folder-tag ${folders.find(f => f.id === e.folderId)?.color || 'sage'}`}><span className="tiny-dot"/>{folders.find(f => f.id === e.folderId)?.name || 'Chưa phân loại'}</span><button className="icon-button" title={`Sửa ${e.term}`} onClick={() => setDraft(e)}><Pencil size={15}/></button></div>
              <button className="word-title" onClick={() => setDetail(e)}>{e.term}<ArrowUpRight size={18}/></button><p className="word-pronunciation">{e.content.phonetic && `/${e.content.phonetic.replace(/^\/|\/$/g, '')}/`}{e.content.partOfSpeech && <span>{e.content.partOfSpeech}</span>}</p>
              <p className={`word-definition ${!e.definition ? 'muted' : ''}`}>{e.definition || 'Đã giữ lại từ này. Bổ sung nghĩa khi bạn muốn.'}</p>{showVi && e.content.meaningVi && <p className="word-vi">{e.content.meaningVi}</p>}
              {e.content.sentence && <blockquote><Highlight text={e.content.sentence} term={e.term}/></blockquote>}
              <div className="card-footer"><span>{e.definition ? e.content.definitionSource : 'Chưa có nghĩa'}</span><button onClick={() => setDetail(e)}>Xem lại <ChevronRight size={14}/></button></div>
            </article>)}<button className="add-card" onClick={openNew}><span><Plus size={23}/></span><strong>Thêm một từ mới</strong><small>Một bước nhỏ cho vốn từ của bạn</small></button></div> : <div className="empty-state"><div className="empty-icon"><Bookmark size={28}/><span>✧</span></div><h3>{query || dueOnly ? 'Chưa có từ phù hợp.' : 'Giữ lại một từ hay.'}</h3><p>{query || dueOnly ? 'Thử đổi bộ lọc hoặc thêm từ vào thư viện.' : 'Bắt đầu với một từ bạn vừa đọc. Không cần có nghĩa ngay — cứ lưu câu gốc trước.'}</p><button className="primary" onClick={openNew}><Plus size={17}/> Lưu từ đầu tiên</button><small>Tra Cambridge · Lưu ngữ cảnh · Ôn theo nhịp của bạn</small></div>}
            <footer className="page-footer"><Sprout size={15}/><span>Your vocabulary, thoughtfully collected.</span><span>{entries.length} từ · {folders.length} thư mục</span></footer>
          </>}
          {view === 'review' && <section className="review-area"><div className="review-top"><span className="mini-tag">DAILY PRACTICE</span><span>{reviewed} đã ôn · {reviewQueue.length} còn lại</span></div>{current ? <><div className={`flashcard ${flipped ? 'flipped' : ''}`}><span className="eyebrow">{flipped ? 'NGHĨA & CÁCH DÙNG' : 'BẠN CÒN NHỚ TỪ NÀY?'}</span><h2>{current.term}</h2>{!flipped && current.content.sentence && <blockquote><Highlight text={current.content.sentence} term={current.term}/></blockquote>}{flipped && <><p className="flash-definition">{current.definition || 'Từ này chưa có nghĩa. Mở mục từ để bổ sung.'}</p>{showVi && current.content.meaningVi && <p className="word-vi">{current.content.meaningVi}</p>}{current.content.examples.map((ex, i) => <blockquote key={i}><Highlight text={ex.en} term={current.term}/>{showVi && ex.vi && <small>{ex.vi}</small>}</blockquote>)}{showVi && current.content.sentenceVi && <p>{current.content.sentenceVi}</p>}<button className="text-button" onClick={() => setDraft(current)}>Bổ sung / sửa mục từ <Pencil size={13}/></button></>}<button className="flip-button" onClick={() => setFlipped(!flipped)}><RotateCcw size={15}/>{flipped ? 'Xem mặt trước' : 'Lật thẻ xem nghĩa'}</button></div><div className="review-actions">{flipped ? <><button className="secondary" disabled={busy} onClick={() => review(false)}><RotateCcw size={17}/> Chưa nhớ</button><button className="primary" disabled={busy} onClick={() => review(true)}><Check size={18}/> Đã nhớ</button></> : <p>Đọc câu gốc, thử nhớ nghĩa rồi lật thẻ.</p>}</div></> : <div className="empty-state"><div className="empty-icon"><CheckCircle2 size={32}/></div><h3>{reviewed ? 'Một chút tiến bộ, mỗi ngày.' : 'Bạn đã ôn hết rồi.'}</h3><p>Chưa có thẻ đến hạn trong bộ lọc hiện tại. Bạn có thể thêm từ mới hoặc quay lại thư viện.</p><button className="primary" onClick={() => changeView('library')}>Về thư viện <ArrowRight size={16}/></button></div>}<button className="text-button center" onClick={() => setShowVi(!showVi)}>{showVi ? <EyeOff size={15}/> : <Eye size={15}/>} {showVi ? 'Ẩn' : 'Hiện'} tiếng Việt</button></section>}
          {view === 'print' && <><section className="print-options no-print"><h2><Printer size={21}/> Chuẩn bị trang in</h2><div className="print-control-row"><label>Thư mục<select value={folderId} onChange={e => setFolderId(e.target.value)}><option value="all">Tất cả thư mục</option>{folders.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}<option value="none">Chưa phân loại</option></select></label><label>Kiểu tài liệu<select value={worksheet ? 'worksheet' : 'study'} onChange={e => setWorksheet(e.target.value === 'worksheet')}><option value="study">Tài liệu học</option><option value="worksheet">Phiếu tự kiểm tra + đáp án</option></select></label><label className="checkbox-label"><input type="checkbox" checked={showVi} onChange={e => setShowVi(e.target.checked)}/> Hiện tiếng Việt</label><label className="checkbox-label"><input type="checkbox" checked={allExamples} onChange={e => setAllExamples(e.target.checked)}/> Kèm ví dụ bổ sung</label></div><div className="print-actions"><button className="primary" disabled={!filtered.length} onClick={() => window.print()}><Printer size={17}/> In / Lưu PDF</button><a className="secondary" href={exportUrl('csv')}><Download size={16}/> Xuất CSV</a><a className="secondary" href={exportUrl('json')}><Download size={16}/> Sao lưu JSON</a><span>{filtered.length} mục trong bộ lọc hiện tại</span></div></section><section className="print-sheet"><div className="print-brand"><Sprout size={22}/> wordgarden.</div><h2>{worksheet ? 'Một chút tự kiểm tra' : 'Sổ từ vựng của tôi'}</h2><p className="print-subtitle">{folderLabel} · {filtered.length} từ · {new Date().toLocaleDateString('vi-VN')}</p>{!filtered.length && <p>Chưa có từ để in. Thêm từ vào thư viện trước nhé.</p>}{[...folders.map(f => ({ id: f.id, name: f.name })), { id: null, name: 'Chưa phân loại' }].map(f => { const words = filtered.filter(e => e.folderId === f.id); return words.length ? <div key={f.id || 'none'}><h3 className="print-folder">{f.name}</h3>{words.map((e, i) => <article className="print-entry" key={e.id}><h3><span>{i + 1}.</span> {e.term} <small>{e.content.partOfSpeech} {e.content.phonetic}</small></h3>{worksheet ? <><div className="answer-line"/><div className="answer-line"/></> : <EntryBody entry={e} showVi={showVi} allExamples={allExamples}/ >}{worksheet && e.content.sentence && <blockquote><Highlight text={e.content.sentence} term={e.term}/></blockquote>}</article>)}</div> : null; })}{worksheet && filtered.length > 0 && <div className="answer-key"><h2>Đáp án tham khảo</h2>{filtered.map(e => <div className="print-entry" key={e.id}><strong>{e.term}</strong><p>{e.definition || 'Chưa có nghĩa'}</p>{showVi && <p>{e.content.meaningVi}</p>}</div>)}</div>}</section></>}
          {view === 'settings' && <div className="settings-grid"><section className="settings-card"><span className="settings-icon"><Monitor size={22}/></span><h2>Không gian của bạn</h2><p>{me?.localMode ? 'Đang dùng tài khoản local, dữ liệu lưu trong PostgreSQL của Docker. Chỉ truy cập trên máy này.' : `Đăng nhập bằng ${me?.email}. Dữ liệu cùng tài khoản được dùng chung trên các thiết bị.`}</p><div className="notice"><CheckCircle2 size={17}/><span>Lưu trên server · Không phụ thuộc bộ nhớ trình duyệt</span></div>{!me?.localMode && <button className="secondary" onClick={() => signOut() }><LogOut size={16}/> Đăng xuất</button>}</section><section className="settings-card"><span className="settings-icon peach"><BookOpen size={22}/></span><h2>Tra cứu Cambridge</h2><p>Tra Anh–Anh hoặc Anh–Việt từ Cambridge. Khi không đọc được trang, app giữ nguyên từ và câu gốc, để trống phần nghĩa.</p><p>Không tự dịch cả câu hoặc tự tạo ví dụ. Bạn có thể nhập bản dịch, thêm 1–2 ví dụ hoặc lưu ví dụ thật từ trang Cambridge qua extension.</p><span className="subtle-badge">Word Lists: chưa tích hợp tự động</span></section><section className="settings-card"><span className="settings-icon lavender"><Bookmark size={22}/></span><h2>Bôi đen → lưu từ</h2><ol><li>Mở <code>chrome://extensions</code> hoặc <code>edge://extensions</code>.</li><li>Bật Developer mode → Load unpacked → chọn thư mục <code>extension</code> của project.</li><li>Mở extension → Kết nối Wordgarden tại http://localhost:3080 → chọn thư mục mặc định.</li><li>Bật nút bôi đen cho trang đang đọc hoặc mọi website. Sau đó bôi đen → Lưu từ: lưu ngay từ, câu gốc và link, không mở form.</li><li>Cũng có thể chuột phải → “Lưu ngay vào Wordgarden”. Muốn sửa trước khi lưu, chọn “Mở form lưu…”.</li><li>Trên trang Cambridge, extension có nút “Lưu nghĩa này” bên cạnh từng nghĩa.</li></ol><p>Điện thoại: mở app, dán từ và câu gốc vào “Thêm từ mới”.</p></section><section className="settings-card"><span className="settings-icon"><Download size={22}/></span><h2>Dữ liệu luôn ở bên bạn</h2><p>JSON giữ toàn bộ nội dung từ và thư mục. Nhập lại sẽ bỏ qua từ/nghĩa đã có; lịch ôn bắt đầu lại. CSV dành cho Excel và bảng tính.</p><div className="button-row"><a className="secondary" href="/api/export?format=json"><Download size={15}/> Tải JSON</a><button className="secondary" onClick={() => importInput.current?.click()}><Upload size={15}/> Nhập JSON</button></div><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 2_000_000) throw new Error('Tệp quá lớn (tối đa 2 MB).'); const result = await api<{ created: number; skipped: number }>('import', 'POST', JSON.parse(await file.text())); await refresh(); notify(`Đã nhập ${result.created} từ, bỏ qua ${result.skipped} từ trùng.`); } catch (err) { setError((err as Error).message); } finally { e.target.value = ''; } }}/></section><section className="settings-card full-width"><h2>Quản lý thư mục</h2>{folders.map(f => <div className="folder-manager" key={f.id}><span className={`folder-dot ${f.color}`}/><strong>{f.name}</strong><span>{entries.filter(e => e.folderId === f.id).length} từ</span><button className="icon-button" title={`Xóa thư mục ${f.name}`} onClick={async () => { if (!window.confirm(`Xóa thư mục “${f.name}”? Từ bên trong sẽ chuyển về Chưa phân loại.`)) return; try { await api(`folders/${f.id}`, 'DELETE', {}); if (folderId === f.id) setFolderId('all'); await refresh(); } catch (e) { setError((e as Error).message); } }}><Trash2 size={16}/></button></div>)}<button className="text-button" onClick={() => setFolderModal(true)}><Plus size={16}/> Thêm thư mục</button></section></div>}
          {view === 'settings' && <section className="settings-card reset-card">
            <h2><Trash2 size={20}/> Reset toàn bộ dữ liệu</h2>
            <p>Xóa vĩnh viễn mọi từ, nghĩa, câu gốc, ghi chú, thư mục và lịch ôn của tài khoản hiện tại. Kết nối extension cũ sẽ mất hiệu lực. Khi mở lại, app tạo không gian mới với 3 thư mục mặc định.</p>
            <p>App không lưu bản sao tệp nhập hoặc trang in trên server. JSON/CSV/PDF đã tải xuống, bản sao lưu SQL và dữ liệu extension cần dọn riêng.</p>
            <button className="secondary danger-text" disabled={busy} onClick={() => { setError(''); setResetConfirmation(''); setResetOpen(true); }}><Trash2 size={16}/> Reset toàn bộ dữ liệu…</button>
            {me?.localMode && <p>Để xóa cả dữ liệu Docker, bản sao lưu trong dự án, thư viện và bản build: chạy <code>.\scripts\cleanup.ps1 -Action Reset</code> trong thư mục dự án. Để ngừng dùng CPU/RAM: chạy <code>docker compose stop</code>.</p>}
          </section>}
        </>}
      </div>
    </main>
    {resetOpen && <div className="modal-backdrop no-print"><form className="modal compact-modal reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description" onSubmit={e => { e.preventDefault(); void resetWorkspace(); }}>
      <h2 id="reset-title">Xóa toàn bộ dữ liệu?</h2>
      <p id="reset-description">Bạn sắp xóa {entries.length} từ, {folders.length} thư mục cùng toàn bộ nội dung và lịch ôn. Không thể hoàn tác. Hãy đóng các tab Wordgarden khác trước khi reset.</p>
      <p>Tệp đã tải xuống và dữ liệu extension cần xóa riêng. Trong extension, chọn “Xóa dữ liệu extension”.</p>
      <label>Nhập RESET WORDGARDEN để xác nhận<input autoFocus autoComplete="off" spellCheck={false} value={resetConfirmation} disabled={busy} onChange={e => setResetConfirmation(e.target.value)}/></label>
      {error && <div className="notice danger" role="alert">{error}</div>}
      <div className="button-row"><button type="button" className="secondary" disabled={busy} onClick={() => setResetOpen(false)}>Hủy</button><button type="submit" className="primary" disabled={busy || resetConfirmation !== 'RESET WORDGARDEN'}>{busy ? <Loader2 className="spin" size={16}/> : <Trash2 size={16}/>} Xóa vĩnh viễn</button></div>
    </form></div>}
    {toast && <div className="toast no-print" role="status"><CheckCircle2 size={18}/>{toast}</div>}
    {draft && <Editor draft={draft} folders={folders} busy={busy} onClose={() => !busy && setDraft(null)} onSave={save}/>}
    {detail && <div className="modal-backdrop no-print" onClick={() => setDetail(null)}><section className="modal detail-modal" role="dialog" aria-modal="true" aria-label={detail.term} onClick={e => e.stopPropagation()}><div className="modal-top"><span className="eyebrow">YOUR COLLECTED WORD</span><button className="icon-button" title="Đóng" onClick={() => setDetail(null)}><X size={20}/></button></div><h2>{detail.term}</h2><p className="word-pronunciation">{detail.content.phonetic} <span>{detail.content.partOfSpeech}</span></p><EntryBody entry={detail} showVi allExamples/><div className="detail-meta"><span>Lưu ngày {dateText(detail.createdAt)}</span><span>Ôn tiếp: {dateText(detail.nextReviewAt)}</span></div><div className="modal-footer"><button className="text-button danger-text" onClick={() => remove(detail)}><Trash2 size={16}/> Xóa từ</button><button className="primary" onClick={() => { setDraft(detail); setDetail(null); }}><Pencil size={16}/> Chỉnh sửa</button></div></section></div>}
    {folderModal && <div className="modal-backdrop no-print"><form className="modal compact-modal" role="dialog" aria-modal="true" aria-label="Tạo thư mục" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await api('folders', 'POST', { name: folderName }); await refresh(); setFolderName(''); setFolderModal(false); notify('Đã tạo thư mục.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><div className="modal-top"><h2>Một góc học mới</h2><button type="button" className="icon-button" title="Đóng" onClick={() => setFolderModal(false)}><X size={20}/></button></div><label>Tên thư mục<input autoFocus required maxLength={80} placeholder="Ví dụ: Travel & adventures" value={folderName} onChange={e => setFolderName(e.target.value)}/></label><button className="primary" disabled={busy || !folderName.trim()}><Plus size={16}/> Tạo thư mục</button></form></div>}
  </div>;
}

function EntryBody({ entry, showVi, allExamples }: { entry: EntryInput; showVi: boolean; allExamples: boolean }) {
  const c = entry.content;
  return <div className="entry-body"><div className="definition-block"><span className="field-caption">ENGLISH DEFINITION</span><p>{entry.definition || 'Chưa có nghĩa — bạn có thể bổ sung sau.'}</p><small>{entry.definition ? c.definitionSource : 'Đã lưu từ, chưa dịch'}</small></div>{showVi && c.meaningVi && <div className="translation-block"><span className="field-caption">NGHĨA TIẾNG VIỆT</span><p>{c.meaningVi}</p></div>}{c.sentence && <div className="example-block"><span className="field-caption">CÂU GỐC · NGỮ CẢNH</span><blockquote><Highlight text={c.sentence} term={entry.term}/></blockquote>{showVi && c.sentenceVi && <p className="example-vi">{c.sentenceVi}</p>}<SourceLink url={c.sourceUrl}>Bài đọc gốc</SourceLink></div>}{c.contextNote && <p className="context-note">{c.contextNote}</p>}{allExamples && c.examples.length > 0 && <div className="example-block"><span className="field-caption">VÍ DỤ BỔ SUNG</span>{c.examples.map((ex, i) => <div className="additional-example" key={i}><blockquote><Highlight text={ex.en} term={entry.term}/></blockquote>{showVi && ex.vi && <p className="example-vi">{ex.vi}</p>}</div>)}</div>}{c.notes && <div className="notes-block"><span className="field-caption">GHI CHÚ CỦA BẠN</span><p>{c.notes}</p></div>}{c.tags.length > 0 && <div className="tags">{c.tags.map(t => <span key={t}>#{t}</span>)}</div>}<div className="source-links"><SourceLink url={c.dictionaryUrl || cambridgeUrl(entry.term)}>Tra Cambridge</SourceLink></div></div>;
}

function Editor({ draft, folders, busy, onClose, onSave }: { draft: Draft; folders: Folder[]; busy: boolean; onClose: () => void; onSave: (value: Draft) => Promise<void> }) {
  const [value, setValue] = useState<Draft>(structuredClone(draft));
  const [lookupBusy, setLookupBusy] = useState(false);
  const [senses, setSenses] = useState<DictionarySense[]>([]);
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupUrl, setLookupUrl] = useState('');
  const [error, setError] = useState('');
  const [vietnamese, setVietnamese] = useState(false);
  const [expanded, setExpanded] = useState(!!draft.id || !!draft.definition);
  const lookupCounter = useRef(0);
  const c = value.content;
  const updateContent = (data: Partial<Content>) => setValue(v => ({ ...v, content: { ...v.content, ...data } }));
  async function lookup() {
    if (!value.term.trim()) return;
    const request = ++lookupCounter.current;
    setLookupBusy(true); setLookupMessage(''); setSenses([]);
    try {
      const result = await api<{ senses: DictionarySense[]; url: string; message: string }>('lookup', 'POST', { term: value.term, vietnamese });
      if (request !== lookupCounter.current) return;
      setSenses(result.senses); setLookupUrl(result.url); setLookupMessage(result.message);
      if (result.senses.length) setExpanded(true);
    } catch (e) { if (request === lookupCounter.current) setLookupMessage((e as Error).message); }
    finally { if (request === lookupCounter.current) setLookupBusy(false); }
  }
  function selectSense(sense: DictionarySense) {
    setValue(v => ({ ...v, definition: sense.definition, content: { ...v.content, phonetic: sense.phonetic, partOfSpeech: sense.partOfSpeech, meaningVi: sense.meaningVi, examples: sense.examples, definitionSource: 'Cambridge Dictionary', dictionaryUrl: lookupUrl } }));
    setSenses([]); setExpanded(true);
  }
  return <div className="modal-backdrop no-print" onClick={onClose}><form className="modal editor-modal" role="dialog" aria-modal="true" aria-label={value.id ? 'Chỉnh sửa từ' : 'Thêm từ mới'} onClick={e => e.stopPropagation()} onSubmit={async e => { e.preventDefault(); setError(''); try { await onSave(value); } catch (err) { setError((err as Error).message); } }}>
    <div className="modal-top"><span className="eyebrow">A NEW WORD, A NEW POSSIBILITY</span><button className="icon-button" type="button" title="Đóng" onClick={onClose}><X size={20}/></button></div><h2>{value.id ? 'Chăm chút một từ.' : 'Giữ lại điều vừa đọc.'}</h2><p className="subtitle">Có thể lưu chỉ từ và câu gốc. Nghĩa để sau cũng được.</p>
    <div className="editor-scroll"><label>Từ / cụm từ <span className="required">*</span><div className="term-input"><input autoFocus required maxLength={200} placeholder="Ví dụ: take off" value={value.term} onChange={e => { lookupCounter.current++; setLookupBusy(false); setSenses([]); setLookupMessage(''); setValue(v => ({ ...v, term: e.target.value })); }}/><button className="secondary" type="button" disabled={lookupBusy || !value.term.trim()} onClick={lookup}>{lookupBusy ? <Loader2 className="spin" size={16}/> : <Search size={16}/>} Tra Cambridge</button></div></label>
      <div className="lookup-options"><label><input type="checkbox" checked={vietnamese} onChange={e => { setVietnamese(e.target.checked); lookupCounter.current++; setLookupBusy(false); setSenses([]); }}/> Tra Anh–Việt</label><SourceLink url={vietnamese ? `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(value.term.trim().replace(/ /g, '-'))}` : cambridgeUrl(value.term)}>Mở trang Cambridge</SourceLink></div>
      {lookupBusy && <div className="notice"><Loader2 size={16} className="spin"/><span>Đang tra Cambridge… Bạn vẫn có thể lưu từ ngay.</span></div>}
      {lookupMessage && <div className="notice"><AlertCircle size={17}/><span>{lookupMessage}</span></div>}
      {senses.length > 0 && <div className="sense-list"><span className="field-caption">CHỌN NGHĨA PHÙ HỢP VỚI CÂU GỐC</span>{senses.map((s, i) => <button type="button" key={i} onClick={() => selectSense(s)}><small>{s.partOfSpeech}</small><p>{s.definition}</p>{s.meaningVi && <span>{s.meaningVi}</span>}<ChevronRight size={17}/></button>)}</div>}
      <label>Câu gốc / ngữ cảnh<textarea maxLength={5000} rows={3} placeholder="Dán cả câu chứa từ bạn muốn học…" value={c.sentence} onChange={e => updateContent({ sentence: e.target.value })}/></label>
      <div className="form-row"><label>Thư mục<select value={value.folderId || ''} onChange={e => setValue(v => ({ ...v, folderId: e.target.value || null }))}><option value="">Chưa phân loại</option>{folders.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label><label>Link bài đọc<input type="url" maxLength={2000} placeholder="https://…" value={c.sourceUrl} onChange={e => updateContent({ sourceUrl: e.target.value })}/></label></div>
      <button type="button" className="expand-button" onClick={() => setExpanded(!expanded)}>{expanded ? <EyeOff size={16}/> : <Plus size={16}/>} {expanded ? 'Thu gọn phần nghĩa & ví dụ' : 'Bổ sung nghĩa, bản dịch & ví dụ'}<ChevronRight className={expanded ? 'rotate' : ''} size={16}/></button>
      {expanded && <div className="expanded-fields"><label>Nghĩa Anh–Anh<textarea rows={2} maxLength={3000} placeholder="Chọn nghĩa Cambridge phía trên hoặc nhập thủ công…" value={value.definition} onChange={e => setValue(v => ({ ...v, definition: e.target.value, content: { ...v.content, definitionSource: 'Tự nhập' } }))}/></label><div className="form-row"><label>Từ loại<input maxLength={100} placeholder="phrasal verb" value={c.partOfSpeech} onChange={e => updateContent({ partOfSpeech: e.target.value })}/></label><label>Phiên âm<input maxLength={200} placeholder="/…/" value={c.phonetic} onChange={e => updateContent({ phonetic: e.target.value })}/></label></div><label>Nguồn nghĩa<select value={c.definitionSource} onChange={e => updateContent({ definitionSource: e.target.value as Content['definitionSource'] })}>{['Chưa có nghĩa', 'Cambridge Dictionary', 'Cambridge (đối chiếu thủ công)', 'Tự nhập'].map(s => <option key={s}>{s}</option>)}</select></label><label>Nghĩa tiếng Việt<input maxLength={2000} value={c.meaningVi} placeholder="Nhập nếu bạn đã tra được…" onChange={e => updateContent({ meaningVi: e.target.value })}/></label><label>Bản dịch cả câu<textarea maxLength={5000} rows={2} placeholder="Nhập thủ công · Không tự dịch câu" value={c.sentenceVi} onChange={e => updateContent({ sentenceVi: e.target.value })}/></label><label>Giải thích ngữ cảnh<textarea maxLength={3000} rows={2} placeholder="Trong câu này từ được dùng như thế nào?" value={c.contextNote} onChange={e => updateContent({ contextNote: e.target.value })}/></label><div className="examples-heading"><span>Ví dụ bổ sung <small>tối đa 2 câu</small></span><button type="button" className="text-button" disabled={c.examples.length >= 2} onClick={() => updateContent({ examples: [...c.examples, { en: '', vi: '' }] })}><Plus size={14}/> Thêm câu</button></div>{c.examples.map((ex, i) => <div className="example-editor" key={i}><div><span className="field-caption">VÍ DỤ {i + 1}</span><button type="button" className="icon-button" title="Bỏ ví dụ" onClick={() => updateContent({ examples: c.examples.filter((_, index) => index !== i) })}><X size={14}/></button></div><textarea aria-label={`Ví dụ ${i + 1}`} required maxLength={1200} rows={2} placeholder="Câu tiếng Anh (từ Cambridge hoặc do bạn nhập)" value={ex.en} onChange={e => updateContent({ examples: c.examples.map((item, j) => j === i ? { ...item, en: e.target.value } : item) })}/><input aria-label={`Dịch ví dụ ${i + 1}`} maxLength={1500} placeholder="Bản dịch tiếng Việt (tùy chọn)" value={ex.vi} onChange={e => updateContent({ examples: c.examples.map((item, j) => j === i ? { ...item, vi: e.target.value } : item) })}/></div>)}<label>Ghi chú<textarea maxLength={5000} rows={2} value={c.notes} onChange={e => updateContent({ notes: e.target.value })}/></label><label>Tags <small>cách nhau bằng dấu phẩy</small><input maxLength={700} value={c.tags.join(', ')} onChange={e => updateContent({ tags: e.target.value.split(',').map(s => s.trim()).slice(0, 15) })} placeholder="work, useful phrases"/></label></div>}
      {error && <div className="notice danger" role="alert"><AlertCircle size={16}/>{error}</div>}
    </div><div className="modal-footer"><span><Bookmark size={14}/> {value.definition ? 'Lưu cùng nghĩa đã chọn' : 'Lưu từ trước, bổ sung nghĩa sau'}</span><button className="primary" type="submit" disabled={busy || !value.term.trim()}>{busy ? <Loader2 className="spin" size={17}/> : <Check size={17}/>} {value.id ? 'Lưu thay đổi' : 'Lưu từ'}</button></div>
  </form></div>;
}
