import { z } from 'zod';
export const exampleSchema = z.object({ en: z.string().min(1).max(1200), vi: z.string().max(1500) });
export const contentSchema = z.object({
  phonetic: z.string().max(200).default(''), partOfSpeech: z.string().max(100).default(''),
  meaningVi: z.string().max(2000).default(''), sentence: z.string().max(5000).default(''),
  sentenceVi: z.string().max(5000).default(''), contextNote: z.string().max(3000).default(''),
  examples: z.array(exampleSchema).max(2).default([]),
  definitionSource: z.enum(['Cambridge Dictionary', 'Cambridge (đối chiếu thủ công)', 'Tự nhập', 'Chưa có nghĩa']).default('Chưa có nghĩa'),
  sourceUrl: z.string().max(2000).default(''), dictionaryUrl: z.string().max(2000).default(''),
  notes: z.string().max(5000).default(''), tags: z.array(z.string().max(50)).max(15).default([]),
});
export type Content = z.infer<typeof contentSchema>;
export const entrySchema = z.object({ term: z.string().trim().min(1).max(200), definition: z.string().trim().max(3000).default(''), folderId: z.string().nullable().default(null), content: contentSchema });
export type EntryInput = z.infer<typeof entrySchema>;
export type SavedEntry = EntryInput & { id: string; version: number; reviewStage: number; nextReviewAt: string; createdAt: string; updatedAt: string };
export type Folder = { id: string; name: string; color: string };
export const emptyContent: Content = contentSchema.parse({});
export function normalizeTerm(term: string) { return term.trim().toLocaleLowerCase('en').replace(/\s+/g, ' '); }
export function cambridgeUrl(term: string) { return `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(normalizeTerm(term).replace(/ /g, '-'))}`; }
export function safeUrl(url: string) { try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function scheduleReview(stage: number, remembered: boolean, now = new Date()) {
  const days = [1, 3, 7, 14, 30];
  const nextStage = remembered ? Math.min(stage + 1, days.length) : 0;
  const interval = remembered ? days[Math.min(stage, days.length - 1)] : 1;
  return { reviewStage: nextStage, reviewedAt: now, nextReviewAt: new Date(now.getTime() + interval * 86400000) };
}
export function csvCell(value: string) { return '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"'; }
