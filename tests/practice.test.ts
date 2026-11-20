import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDay, maskTerm, normalizeAnswer, practiceSentence } from '../src/lib/practice';

test('masks every exact word with Unicode boundaries, escaping punctuation and matching phrases', () => {
  assert.equal(maskTerm('Learn, then LEARN. A learner learns.', 'learn'), '_____, then _____. A learner learns.');
  assert.equal(maskTerm('We take off. Then TAKE   OFF again.', 'take off'), 'We _____. Then _____ again.');
  assert.equal(maskTerm('Use C++ today.', 'C++'), 'Use _____ today.');
  assert.equal(maskTerm('élearn learné learned', 'learn'), null);
  assert.equal(maskTerm('They learned it.', 'learn'), null);
  assert.equal(maskTerm('Nothing.', ''), null);
});

test('chooses original sentence first, then usable examples; does not invent sentences', () => {
  assert.deepEqual(practiceSentence('learn', { sentence: 'I learn daily.', examples: [{ en: 'We learn.', vi: '' }] }), { sentence: 'I learn daily.', prompt: 'I _____ daily.' });
  assert.deepEqual(practiceSentence('learn', { sentence: 'No match.', examples: [{ en: 'We learn.', vi: '' }] }), { sentence: 'We learn.', prompt: 'We _____.' });
  assert.equal(practiceSentence('learn', {}), null);
  assert.equal(practiceSentence('learn', { examples: 'broken' }), null);
});

test('grading normalizes case, Unicode and whitespace but does not accept synonyms or typos', () => {
  assert.equal(normalizeAnswer('  TAKE   OFF '), normalizeAnswer('take off'));
  assert.equal(normalizeAnswer('cafe\u0301'), normalizeAnswer('café'));
  assert.notEqual(normalizeAnswer('learns'), normalizeAnswer('learn'));
  assert.notEqual(normalizeAnswer('study'), normalizeAnswer('learn'));
});

test('local date follows an IANA timezone across midnight and DST', () => {
  const date = new Date('2026-11-19T18:30:00Z');
  assert.equal(localDay('Asia/Hovd', date), '2026-11-20');
  assert.equal(localDay('America/New_York', date), '2026-11-19');
  assert.equal(localDay('America/New_York', new Date('2026-03-08T07:30:00Z')), '2026-03-08');
  assert.throws(() => localDay('Invalid/Zone', date));
});
