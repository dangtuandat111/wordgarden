import { Prisma, type PracticeQuestion } from '@prisma/client';
import { db } from './db';
import { contentSchema, scheduleReview } from './model';
import { localDay, normalizeAnswer, practiceSentence } from './practice';
import { HttpError } from './user';

// Never expose term, unmasked sentence, or meaning before an answer is submitted.
export function publicQuestion(question: PracticeQuestion) {
  const { id, position, prompt, submittedAt, skipped } = question;
  return { id, position, prompt, submittedAt, skipped,
    ...(submittedAt ? { entryId: question.entryId, term: question.term, sentence: question.sentence,
      definition: question.definition, meaningVi: question.meaningVi, answer: question.answer, correct: question.correct } : {}) };
}

export async function dailyPractice(userId: string, timezone: string) {
  const now = new Date();
  const day = localDay(timezone, now);
  let session = await db.practiceSession.findUnique({ where: { userId_day: { userId, day } }, include: { questions: { orderBy: { position: 'asc' } } } });
  if (!session) {
    const candidates = await db.entry.findMany({ where: { userId, nextReviewAt: { lte: now } }, orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }] });
    const questions = [];
    for (const entry of candidates) {
      const selected = practiceSentence(entry.term, entry.content);
      if (!selected) continue;
      questions.push({ position: questions.length, entryId: entry.id, entryVersion: entry.version,
        term: entry.term, definition: entry.definition, meaningVi: contentSchema.parse(entry.content).meaningVi, ...selected });
      if (questions.length === 10) break;
    }
    // Do not lock an empty day: a learner can add a usable example and try again.
    if (!questions.length) return { day, timezone, questions: [] };
    try {
      session = await db.practiceSession.create({ data: { userId, day, timezone, questions: { create: questions } }, include: { questions: { orderBy: { position: 'asc' } } } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      session = await db.practiceSession.findUniqueOrThrow({ where: { userId_day: { userId, day } }, include: { questions: { orderBy: { position: 'asc' } } } });
    }
  }
  return { day: session.day, timezone: session.timezone, questions: session.questions.map(publicQuestion) };
}

export async function submitPractice(userId: string, questionId: string, answer: string) {
  return db.$transaction(async tx => {
    // Serialize submissions to this question, including requests arriving from other tabs.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT q."id" FROM "PracticeQuestion" q
      JOIN "PracticeSession" s ON s."id" = q."sessionId"
      WHERE q."id" = ${questionId} AND s."userId" = ${userId} FOR UPDATE OF q`;
    if (!locked.length) throw new HttpError(404, 'Không tìm thấy câu hỏi.');
    const question = await tx.practiceQuestion.findUniqueOrThrow({ where: { id: questionId } });
    if (question.submittedAt) return publicQuestion(question);
    const entry = await tx.entry.findFirst({ where: { id: question.entryId, userId } });
    const correct = normalizeAnswer(answer) === normalizeAnswer(question.term);
    let skipped = !entry || entry.version !== question.entryVersion;
    if (entry && !skipped) {
      const result = await tx.entry.updateMany({ where: { id: entry.id, userId, version: question.entryVersion },
        data: { ...scheduleReview(entry.reviewStage, correct), version: { increment: 1 } } });
      skipped = result.count === 0;
    }
    const updated = await tx.practiceQuestion.update({ where: { id: question.id }, data: {
      answer, correct: skipped ? null : correct, skipped, submittedAt: new Date(),
    } });
    return publicQuestion(updated);
  });
}
