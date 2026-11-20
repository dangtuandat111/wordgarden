import { contentSchema, normalizeTerm } from './model';

export function normalizeAnswer(value: string) {
  return normalizeTerm(value.normalize('NFC'));
}

export function maskTerm(sentence: string, term: string): string | null {
  const normalized = sentence.normalize('NFC');
  const escaped = term.normalize('NFC').trim().split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  if (!escaped) return null;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
  let found = false;
  const masked = normalized.replace(pattern, () => { found = true; return '_____'; });
  return found ? masked : null;
}

export function practiceSentence(term: string, content: unknown) {
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) return null;
  for (const sentence of [parsed.data.sentence, ...parsed.data.examples.map(example => example.en)]) {
    const prompt = maskTerm(sentence, term);
    if (prompt) return { sentence, prompt };
  }
  return null;
}

export function localDay(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
