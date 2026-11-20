import { load } from 'cheerio';
import { z } from 'zod';
import { db } from './db';
import { cambridgeUrl, normalizeTerm } from './model';

const relatedSchema = z.object({ term: z.string().min(1).max(200),
  relation: z.enum(['synonym', 'antonym', 'word-family', 'related']), url: z.string(), sourceUrl: z.string() });
export type RelatedWord = z.infer<typeof relatedSchema>;

export function cambridgeLink(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== 'https:' || url.hostname !== 'dictionary.cambridge.org' || url.port || url.username || url.password) return null;
    if (!/^\/(?:dictionary\/english\/[a-z0-9%-]+|topics\/[a-z0-9%/-]+)\/?$/.test(url.pathname)) return null;
    url.hash = ''; url.search = '';
    return url.href;
  } catch { return null; }
}

export function parseRelated(html: string, sourceUrl: string) {
  const $ = load(html);
  const words: RelatedWord[] = [];
  function collect(selector: string, relation: RelatedWord['relation']) {
    $(selector).find('a[href]').each((_, anchor) => {
      const element = $(anchor);
      const url = cambridgeLink(element.attr('href') || '', sourceUrl);
      if (!url || !new URL(url).pathname.startsWith('/dictionary/english/')) return;
      const term = (element.find('.x-h, .hw, .dsense').first().text() || element.clone().find('.pos, .usage, .lab, .region, .level, .cefr, .guideword').remove().end().text()).trim().replace(/\s+/g, ' ');
      if (!term || term.length > 200 || words.some(word => normalizeTerm(word.term) === normalizeTerm(term))) return;
      words.push({ term, relation, url, sourceUrl });
    });
  }
  // Explicit relationship containers only; never infer antonyms from page-wide text.
  collect('.xref.synonyms, .xref.synonym', 'synonym');
  collect('.xref.antonyms, .xref.antonym, .xref.opposites, .xref.opposite', 'antonym');
  collect('.xref.word-family, .word-family', 'word-family');
  collect('.smartt, .smartt-body, .topic-body', 'related');
  const topic = $('.smartt a[href], .smartt-body a[href]').toArray()
    .map(anchor => cambridgeLink($(anchor).attr('href') || '', sourceUrl))
    .find(url => url && new URL(url).pathname.startsWith('/topics/'));
  return { words: words.slice(0, 30), topic: topic || null };
}

async function fetchPage(url: string) {
  if (!cambridgeLink(url, url)) throw new Error('Invalid Cambridge URL');
  const response = await fetch(url, { headers: { Accept: 'text/html' }, redirect: 'error', signal: AbortSignal.timeout(6000), cache: 'no-store' });
  if (!response.ok) throw new Error('Cambridge unavailable');
  // Bound memory as well as the number of pages fetched.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2_000_000) throw new Error('Page too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

// Deduplicate concurrent lookups for this user's term without retaining failed results.
const inflight = new Map<string, Promise<RelatedWord[]>>();
async function retrieve(userId: string, term: string) {
  const key = `${userId}:${normalizeTerm(term)}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const pending = (async () => {
    const source = cambridgeUrl(term);
    const html = await fetchPage(source);
    if (!load(html)('.entry-body, .entry-body__el').length) throw new Error('Dictionary markup unavailable');
    const parsed = parseRelated(html, source);
    let words = parsed.words;
    if (words.length < 5 && parsed.topic) {
      try { words = [...words, ...parseRelated(await fetchPage(parsed.topic), parsed.topic).words]; } catch { /* Keep usable first-page evidence. */ }
    }
    const unique = words.filter((word, index) => normalizeTerm(word.term) !== normalizeTerm(term)
      && words.findIndex(other => normalizeTerm(other.term) === normalizeTerm(word.term)) === index).slice(0, 30);
    await db.relatedCache.upsert({ where: { userId_normalizedTerm: { userId, normalizedTerm: normalizeTerm(term) } },
      create: { userId, normalizedTerm: normalizeTerm(term), items: unique }, update: { items: unique, fetchedAt: new Date() } });
    return unique;
  })();
  inflight.set(key, pending);
  try { return await pending; } finally { inflight.delete(key); }
}

export async function relatedWords(userId: string, term: string) {
  const cached = await db.relatedCache.findUnique({ where: { userId_normalizedTerm: { userId, normalizedTerm: normalizeTerm(term) } } });
  const parsedCache = z.array(relatedSchema).safeParse(cached?.items);
  let words = parsedCache.success ? parsedCache.data : [];
  let stale = false;
  if (!cached || !parsedCache.success || Date.now() - cached.fetchedAt.getTime() >= 86400000) {
    try { words = await retrieve(userId, term); }
    catch { stale = true; }
  }
  const saved = await db.entry.findMany({ where: { userId }, select: { normalizedTerm: true } });
  const excluded = new Set([normalizeTerm(term), ...saved.map(entry => entry.normalizedTerm)]);
  return { items: words.filter(word => !excluded.has(normalizeTerm(word.term))).slice(0, 5), stale,
    message: stale ? (words.length ? 'Cambridge tạm không truy cập được. Đang hiển thị gợi ý đã lưu.' : 'Chưa lấy được gợi ý Cambridge. Bạn vẫn có thể ôn tập bình thường.') : '' };
}
