import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entrySchema, normalizeTerm, scheduleReview, safeUrl, csvCell, cambridgeUrl } from '../src/lib/model';
import { parseCambridge } from '../src/lib/cambridge';
test('can save only a word, without any translation or examples', () => {
  const value = entrySchema.parse({ term: ' take off ', content: {} });
  assert.equal(value.term, 'take off'); assert.equal(value.definition, ''); assert.deepEqual(value.content.examples, []); assert.equal(value.content.definitionSource, 'Chưa có nghĩa');
});
test('caps additional examples at two and requires a real English sentence', () => {
  assert.equal(entrySchema.safeParse({ term: 'test', content: { examples: [{ en: '', vi: '' }] } }).success, false);
  assert.equal(entrySchema.safeParse({ term: 'test', content: { examples: Array(3).fill({ en: 'A sentence.', vi: '' }) } }).success, false);
});
test('normalizes whitespace for duplicate detection and encodes dictionary paths', () => {
  assert.equal(normalizeTerm('  Take   Off  '), 'take off'); assert.equal(cambridgeUrl('take off'), 'https://dictionary.cambridge.org/dictionary/english/take-off');
});
test('review intervals progress and reset when forgotten', () => {
  const now = new Date('2026-11-18T10:00:00Z');
  assert.equal(scheduleReview(0, true, now).nextReviewAt.toISOString(), '2026-11-19T10:00:00.000Z');
  assert.equal(scheduleReview(1, true, now).nextReviewAt.toISOString(), '2026-11-21T10:00:00.000Z');
  assert.equal(scheduleReview(5, true, now).reviewStage, 5);
  assert.equal(scheduleReview(4, false, now).reviewStage, 0);
  assert.equal(scheduleReview(4, false, now).nextReviewAt.toISOString(), '2026-11-19T10:00:00.000Z');
});
test('links never execute script and CSV neutralizes formula injection', () => {
  assert.equal(safeUrl('javascript:alert(1)'), ''); assert.equal(safeUrl('https://example.com'), 'https://example.com/');
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"'); assert.equal(csvCell('a"b'), '"a""b"');
});
test('Cambridge parser preserves source meanings and caps examples', () => {
  const senses = parseCambridge('<div class="entry-body__el"><span class="pos">verb</span><span class="ipa">test</span><div class="def-block"><div class="def">to become successful:</div><span class="trans" lang="vi">thành công</span><div class="examp"><span class="eg">Sales took off.</span></div><div class="examp"><span class="eg">Her career took off.</span></div><div class="examp"><span class="eg">Third.</span></div></div></div>');
  assert.equal(senses[0].definition, 'to become successful'); assert.equal(senses[0].meaningVi, 'thành công'); assert.equal(senses[0].partOfSpeech, 'verb'); assert.equal(senses[0].examples.length, 2);
  assert.deepEqual(parseCambridge('<html>Access denied</html>'), []);
});
