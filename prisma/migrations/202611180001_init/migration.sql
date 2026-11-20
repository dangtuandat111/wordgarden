CREATE TABLE "User" ("id" TEXT PRIMARY KEY,"email" TEXT NOT NULL UNIQUE,"name" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "Folder" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"name" TEXT NOT NULL,"color" TEXT NOT NULL DEFAULT 'sage',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "Folder_userId_name_key" ON "Folder"("userId","name");
CREATE TABLE "Entry" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"folderId" TEXT REFERENCES "Folder"("id") ON DELETE SET NULL,"term" TEXT NOT NULL,"normalizedTerm" TEXT NOT NULL,"definition" TEXT NOT NULL,"content" JSONB NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"reviewStage" INTEGER NOT NULL DEFAULT 0,"nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"reviewedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX "Entry_userId_normalizedTerm_definition_key" ON "Entry"("userId","normalizedTerm","definition");
CREATE INDEX "Entry_userId_nextReviewAt_idx" ON "Entry"("userId","nextReviewAt");
