CREATE TABLE "PracticeSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "day" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PracticeSession_userId_day_key" ON "PracticeSession"("userId", "day");
CREATE TABLE "PracticeQuestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "PracticeSession"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL,
  "entryId" TEXT NOT NULL,
  "entryVersion" INTEGER NOT NULL,
  "term" TEXT NOT NULL,
  "sentence" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "definition" TEXT NOT NULL,
  "meaningVi" TEXT NOT NULL,
  "answer" TEXT,
  "correct" BOOLEAN,
  "skipped" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "PracticeQuestion_sessionId_position_key" ON "PracticeQuestion"("sessionId", "position");
CREATE TABLE "RelatedCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "normalizedTerm" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RelatedCache_userId_normalizedTerm_key" ON "RelatedCache"("userId", "normalizedTerm");
