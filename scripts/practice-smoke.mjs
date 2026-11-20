// Run only with the isolated daily-practice verification database and server.
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const base = process.env.TEST_URL;
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)
  || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/practice_test' || database.port !== '55434') {
  throw new Error('Use the disposable practice_test database on localhost:55434 and an isolated TEST_URL.');
}
const db = new PrismaClient();
async function api(path, body, method = body === undefined ? 'GET' : 'POST', expected = 200) {
  const response = await fetch(`${base}/api/${path}`, { method,
    headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`);
  return result;
}
let userId, otherId;
try {
  await api('me');
  const user = await db.user.findUniqueOrThrow({ where: { email: 'local@wordgarden.local' } });
  userId = user.id;
  assert.equal(await db.entry.count({ where: { userId } }), 0, 'Verification database must start empty.');
  assert.equal((await api('practice', { timezone: 'Asia/Hovd' })).questions.length, 0);
  assert.equal(await db.practiceSession.count({ where: { userId } }), 0);
  await api('practice', { timezone: 'Bad/Zone' }, 'POST', 400);
  const entries = [];
  for (let i = 0; i < 12; i++) {
    entries.push(await api('entries', { term: `word${i}`, content: { sentence: `Use word${i}; WORD${i} is useful.`, meaningVi: 'Nghĩa thử nghiệm' }, definition: `Definition ${i}` }, 'POST', 201));
  }
  await api('entries', { term: 'unsuitable', content: {} }, 'POST', 201);
  await db.entry.updateMany({ where: { userId }, data: { nextReviewAt: new Date('2026-01-01T00:00:00Z') } });
  const [session, concurrentSession] = await Promise.all([api('practice', { timezone: 'Asia/Hovd' }), api('practice', { timezone: 'Asia/Hovd' })]);
  assert.deepEqual(session, concurrentSession);
  assert.equal(session.questions.length, 10);
  for (const q of session.questions) {
    assert.equal(q.term, undefined); assert.equal(q.sentence, undefined); assert.equal(q.definition, undefined);
    assert.equal(q.entryId, undefined); assert.equal(q.prompt, 'Use _____; _____ is useful.');
  }
  const questions = await db.practiceQuestion.findMany({ where: { session: { userId } }, orderBy: { position: 'asc' } });
  const ordered = await db.entry.findMany({ where: { userId, term: { not: 'unsuitable' } }, orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }], take: 10 });
  assert.deepEqual(questions.map(q => q.entryId), ordered.map(e => e.id));
  const first = questions[0];
  const [right, retry] = await Promise.all([api(`practice/${first.id}/answer`, { answer: `  ${first.term.toUpperCase()}  ` }), api(`practice/${first.id}/answer`, { answer: 'wrong' })]);
  assert.deepEqual(right, retry);
  const after = await db.entry.findUniqueOrThrow({ where: { id: first.entryId } });
  assert.equal(after.version, first.entryVersion + 1);
  assert.equal(after.reviewStage, right.correct ? 1 : 0);
  const second = questions[1];
  assert.equal((await api(`practice/${second.id}/answer`, { answer: second.term })).correct, true);
  assert.equal((await db.entry.findUniqueOrThrow({ where: { id: second.entryId } })).reviewStage, 1);
  const third = questions[2];
  assert.equal((await api(`practice/${third.id}/answer`, { answer: 'incorrect' })).correct, false);
  assert.equal((await db.entry.findUniqueOrThrow({ where: { id: third.entryId } })).reviewStage, 0);
  const stale = questions[3];
  await db.entry.update({ where: { id: stale.entryId }, data: { version: { increment: 1 } } });
  assert.equal((await api(`practice/${stale.id}/answer`, { answer: stale.term })).skipped, true);
  assert.equal((await db.entry.findUniqueOrThrow({ where: { id: stale.entryId } })).version, stale.entryVersion + 1);
  const deleted = questions[4];
  await db.entry.delete({ where: { id: deleted.entryId } });
  assert.equal((await api(`practice/${deleted.id}/answer`, { answer: deleted.term })).skipped, true);
  const other = await db.user.create({ data: { email: 'other@practice-test.local', name: 'Isolated test' } }); otherId = other.id;
  const otherSession = await db.practiceSession.create({ data: { userId: other.id, day: session.day, timezone: 'UTC', questions: { create: {
    position: 0, entryId: 'missing', entryVersion: 1, term: 'private', prompt: '_____', sentence: 'private', definition: '', meaningVi: '' } } }, include: { questions: true } });
  await api(`practice/${otherSession.questions[0].id}/answer`, { answer: 'private' }, 'POST', 404);
  const cacheTerm = entries.find(e => e.id !== deleted.entryId);
  await db.relatedCache.create({ data: { userId, normalizedTerm: cacheTerm.normalizedTerm, items: [
    { term: cacheTerm.term, relation: 'related', url: 'https://dictionary.cambridge.org/dictionary/english/test', sourceUrl: 'https://dictionary.cambridge.org/dictionary/english/test' },
    { term: 'optional', relation: 'synonym', url: 'https://dictionary.cambridge.org/dictionary/english/optional', sourceUrl: 'https://dictionary.cambridge.org/dictionary/english/test' },
    ...Array.from({ length: 6 }, (_, i) => ({ term: `extra${i}`, relation: 'related', url: 'https://dictionary.cambridge.org/dictionary/english/test', sourceUrl: 'https://dictionary.cambridge.org/dictionary/english/test' })),
  ] } });
  const before = await db.entry.count({ where: { userId } });
  const related = await api(`entries/${cacheTerm.id}/related`);
  assert.equal(related.items.length, 5); assert.equal(related.items[0].term, 'optional');
  assert.equal(await db.entry.count({ where: { userId } }), before);
  await api('entries', { term: 'optional', content: { sentence: 'This step is optional.' } }, 'POST', 201);
  assert.equal((await api(`entries/${cacheTerm.id}/related`)).items.some(item => item.term === 'optional'), false);
  const resumed = await api('practice', { timezone: 'Asia/Hovd' });
  assert.equal(resumed.questions.filter(q => q.submittedAt).length, 5);
  assert.equal(resumed.questions[5].term, undefined);
  for (const q of questions.slice(5)) await api(`practice/${q.id}/answer`, { answer: q.term });
  assert.equal((await api('practice', { timezone: 'Asia/Hovd' })).questions.length, 10);
  assert.equal(await db.practiceSession.count({ where: { userId } }), 1);
  // A prior day's session does not consume today's quota; a new day is a new fixed session.
  await db.practiceSession.updateMany({ where: { userId }, data: { day: '2000-01-01' } });
  const nextDay = await api('practice', { timezone: 'Asia/Hovd' });
  assert.notEqual(nextDay.questions[0].id, first.id);
  assert.equal(await db.practiceSession.count({ where: { userId } }), 2);
  await api('reset', { confirmation: 'RESET WORDGARDEN' });
  assert.equal(await db.practiceSession.count({ where: { userId } }), 0);
  assert.equal(await db.practiceQuestion.count({ where: { sessionId: first.sessionId } }), 0);
  assert.equal(await db.relatedCache.count({ where: { userId } }), 0);
  assert.equal(await db.user.count({ where: { id: otherId } }), 1);
  console.log('Daily practice API: session race, hidden answers, grading, idempotency, stale/deleted entries, isolation, cache filtering, resume, completion and reset passed.');
} finally {
  await db.user.deleteMany({ where: { id: { in: [userId, otherId].filter(Boolean) } } });
  await db.$disconnect();
}
