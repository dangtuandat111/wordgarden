import { load } from 'cheerio';
import { cambridgeUrl, normalizeTerm } from './model';
export type DictionarySense = { definition: string; partOfSpeech: string; phonetic: string; examples: { en: string; vi: string }[]; meaningVi: string };
export function parseCambridge(html: string): DictionarySense[] {
  const $ = load(html);
  const senses: DictionarySense[] = [];
  $('.def-block').each((_, element) => {
    const block = $(element), entry = block.closest('.entry-body__el');
    const definition = block.find('.def').first().text().trim().replace(/:\s*$/, '');
    if (!definition) return;
    const examples = block.find('.examp').slice(0, 2).map((__, example) => ({ en: $(example).find('.eg').first().text().trim() || $(example).text().trim(), vi: '' })).get().filter(e => e.en);
    const meaningVi = block.find('.trans[lang="vi"], .trans.dtrans').first().text().trim();
    senses.push({ definition, partOfSpeech: entry.find('.pos').first().text().trim(), phonetic: entry.find('.ipa').first().text().trim(), examples, meaningVi });
  });
  return senses.slice(0, 24);
}
const cache = new Map<string, { until: number; senses: DictionarySense[] }>();
export async function lookupCambridge(term: string, vietnamese = false) {
  const url = vietnamese ? `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(normalizeTerm(term).replace(/ /g, '-'))}` : cambridgeUrl(term);
  const key = `${vietnamese}:${normalizeTerm(term)}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return { senses: hit.senses, url, status: 'ok', message: '' };
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(12000), redirect: 'follow', cache: 'no-store' });
    if (!response.ok) return { senses: [], url, status: 'unavailable', message: `Cambridge chưa cho phép tra tự động (HTTP ${response.status}). Bạn vẫn có thể lưu từ hoặc mở Cambridge để đối chiếu.` };
    const html = await response.text();
    const senses = parseCambridge(html);
    if (!senses.length) return { senses, url, status: 'unavailable', message: 'Chưa đọc được nghĩa từ Cambridge. Bạn có thể lưu từ trước, bổ sung nghĩa sau.' };
    if (cache.size > 200) cache.clear();
    cache.set(key, { until: Date.now() + 10 * 60000, senses });
    return { senses, url, status: 'ok', message: '' };
  } catch {
    return { senses: [], url, status: 'unavailable', message: 'Không kết nối được Cambridge. Từ và câu gốc vẫn có thể lưu bình thường.' };
  }
}
