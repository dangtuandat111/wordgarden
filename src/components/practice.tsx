'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyContent, type EntryInput, type SavedEntry } from '@/lib/model';
import { featureVisibility } from '@/lib/feature-visibility';
import type { RelatedWord } from '@/lib/related';

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Không kết nối được ứng dụng.');
  return value;
}

const labels = { synonym: 'Đồng nghĩa', antonym: 'Trái nghĩa', 'word-family': 'Họ từ', related: 'Cùng nhóm từ liên quan' };
export function RelatedWords({ entryId, term, onCreate, refreshKey = 0 }: { entryId: string; term: string; onCreate: (draft: EntryInput) => void; refreshKey?: number }) {
  type Result = { items: RelatedWord[]; message: string };
  const [response, setResponse] = useState<{ key: string; result: Result | null; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${entryId}:${attempt}:${refreshKey}`;
  const result = response?.key === requestKey ? response.result : null;
  const error = response?.key === requestKey ? response.error : '';
  useEffect(() => {
    let active = true;
    request<{ items: RelatedWord[]; message: string }>(`entries/${encodeURIComponent(entryId)}/related`)
      .then(value => { if (active) setResponse({ key: requestKey, result: value, error: '' }); })
      .catch(err => { if (active) setResponse({ key: requestKey, result: null, error: err.message }); });
    return () => { active = false; };
  }, [entryId, requestKey]);
  return <section className="related-words" aria-label="Gợi ý từ liên quan">
    <h3>Từ liên quan đến “{term}”</h3>
    <p>Chỉ thêm vào thư viện khi bạn chọn tạo và lưu từ.</p>
    {!result && !error && <p role="status">Đang tìm gợi ý Cambridge…</p>}
    {(error || result?.message) && <p role="status">{error || result?.message}</p>}
    {result && !result.items.length && !result.message && <p>Chưa có gợi ý phù hợp từ Cambridge.</p>}
    {(error || result?.message) && <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>}
    {result?.items.map(word => <div className="related-word" key={word.term}>
      <div><strong>{word.term}</strong><small>{labels[word.relation]} · từ “{term}”</small>
        <a href={word.sourceUrl} target="_blank" rel="noreferrer">Nguồn Cambridge ↗</a></div>
      <button className="secondary" onClick={() => onCreate({ term: word.term, definition: '', folderId: null,
        content: { ...emptyContent, tags: [], examples: [], dictionaryUrl: word.url,
          contextNote: `${labels[word.relation]} với “${term}”. Tham khảo: ${word.sourceUrl}` } })}>Tạo từ</button>
    </div>)}
  </section>;
}

type Question = { id: string; position: number; prompt: string; submittedAt: string | null; skipped: boolean;
  entryId?: string; term?: string; sentence?: string; definition?: string; meaningVi?: string; answer?: string; correct?: boolean | null };
type Session = { day: string; timezone: string; questions: Question[] };

export function DailyPractice({ entries, onCreate, onReviewed }: { entries: SavedEntry[];
  onCreate: (draft: EntryInput) => void; onReviewed: () => Promise<void> }) {
  const [session, setSession] = useState<Session | null>(null);
  const [answerInput, setAnswerInput] = useState<{ key: string; text: string } | null>(null);
  const [feedback, setFeedback] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loadedDay = useRef('');
  const loading = useRef(false);
  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setBusy(true); setError('');
    try {
      const next = await request<Session>('practice', { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      if (loadedDay.current !== next.day) { setFeedback(null); setAnswerInput(null); }
      loadedDay.current = next.day; setSession(next);
    }
    catch (err) { setError((err as Error).message); }
    finally { loading.current = false; setBusy(false); }
  }, []);
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    // Recheck the server's local-day session on focus and across midnight.
    const focus = () => { if (!document.hidden) void load(); };
    const timer = setInterval(focus, 60000);
    window.addEventListener('focus', focus);
    return () => { clearTimeout(initialLoad); clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [load]);
  const current = session?.questions.find(question => !question.submittedAt);
  const answerKey = `${session?.day}:${current?.id}`;
  const answer = answerInput?.key === answerKey ? answerInput.text : '';
  const shown = feedback || (!current ? session?.questions.at(-1) : null);
  async function submit() {
    if (!current || !answer.trim() || busy) return;
    setBusy(true); setError('');
    loading.current = true;
    try {
      const updated = await request<Question>(`practice/${current.id}/answer`, { answer });
      setSession(value => value ? { ...value, questions: value.questions.map(question => question.id === updated.id ? updated : question) } : null);
      setFeedback(updated); setAnswerInput(null); await onReviewed();
    } catch (err) { setError((err as Error).message); }
    finally { loading.current = false; setBusy(false); }
  }
  const result = shown?.submittedAt ? shown : null;
  return <section className="review-area daily-practice">
    <div className="review-top"><span className="mini-tag">LUYỆN TẬP HÔM NAY</span><span>{session?.questions.filter(question => question.submittedAt).length || 0}/{session?.questions.length || 0} câu đã xử lý</span></div>
    <p>Tối đa 10 từ đến hạn · Điền từ tiếng Anh vào câu.</p>
    {error && <div className="notice danger" role="alert">{error} <button className="text-button" disabled={busy} onClick={() => void load()}>Tải lại</button></div>}
    {!session && busy && <p role="status">Đang mở bài luyện…</p>}
    {session && !session.questions.length && <div className="empty-state"><h3>{entries.length ? 'Chưa có câu phù hợp để luyện.' : 'Chưa có từ để luyện.'}</h3><p>{entries.length ? 'Cần từ đến hạn có câu chứa đúng từ hoặc cụm từ đã lưu. Bạn vẫn có thể ôn bằng thẻ lật.' : 'Lưu từ vựng và câu ví dụ trước khi bắt đầu.'}</p><button className="secondary" disabled={busy} onClick={() => void load()}>Kiểm tra lại</button></div>}
    {current && !feedback && <form className="flashcard practice-card" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label htmlFor="practice-answer">Điền từ còn thiếu</label><blockquote>{current.prompt}</blockquote>
      <input key={current.id} id="practice-answer" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={200} value={answer} onChange={event => setAnswerInput({ key: answerKey, text: event.target.value })} disabled={busy}/>
      <button className="primary" disabled={busy || !answer.trim()}>Kiểm tra</button>
    </form>}
    {result && <div className="practice-result" role="status">
      <h3>{result.skipped ? 'Đã bỏ qua câu này' : result.correct ? 'Chính xác!' : 'Chưa chính xác'}</h3>
      {result.skipped && <p>Từ đã được sửa, xóa hoặc ôn ở nơi khác. Lịch ôn không thay đổi.</p>}
      <h2>{result.term}</h2><p>Bạn trả lời: {result.answer}</p><blockquote>{result.sentence}</blockquote>
      <p>{result.definition || 'Chưa có nghĩa.'}</p>{result.meaningVi && <p>{result.meaningVi}</p>}
      {feedback && <button className="primary" onClick={() => { setFeedback(null); setAnswerInput(null); }}> {current ? 'Câu tiếp theo' : 'Hoàn thành'}</button>}
      {featureVisibility.cambridge && !result.skipped && result.entryId && <RelatedWords key={result.id} entryId={result.entryId} term={result.term!} onCreate={onCreate} refreshKey={entries.length}/>}
    </div>}
    {session && session.questions.length > 0 && !current && !feedback && <p role="status">Đã hoàn thành bài luyện hôm nay. Ngày mai quay lại nhé.</p>}
    {session && session.questions.some(question => question.submittedAt) && <details><summary>Kết quả đã làm</summary>{session.questions.filter(question => question.submittedAt).map(question => <p key={question.id}>{question.term}: {question.skipped ? 'Bỏ qua' : question.correct ? 'Đúng' : 'Sai'}</p>)}</details>}
  </section>;
}
