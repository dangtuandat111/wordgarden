# Data model

`prisma/schema.prisma` is authoritative. Each user owns folders and entries. Deleting a folder sets its entries' `folderId` to null; deleting a user cascades to both.

```mermaid
erDiagram
  User ||--o{ Folder : owns
  User ||--o{ Entry : owns
  Folder o|--o{ Entry : groups
  User { string id PK; string email UK; string name }
  Folder { string id PK; string userId FK; string name; string color }
  Entry { string id PK; string userId FK; string folderId FK; string term; string normalizedTerm; string definition; json content; int version; int reviewStage; datetime nextReviewAt }
```

An entry requires a nonempty `term`; `definition` may be empty. `normalizedTerm` trims, lowercases with English locale, and collapses whitespace. A database unique key covers `(userId, normalizedTerm, definition)`. Web save and JSON import treat that exact combination as duplicate. Extension quick save checks the normalized term alone when saving without a definition; with a definition it checks the term plus definition. This prevents a later word-only capture from creating another entry for a word already in the library.

`content` is validated by `src/lib/model.ts`: optional `phonetic`, `partOfSpeech`, `meaningVi`, `sentence`, `sentenceVi`, `contextNote`, `sourceUrl`, `dictionaryUrl`, `notes`; up to 15 `tags`; up to two `examples` with nonempty English text and optional Vietnamese text. `definitionSource` is one of `Cambridge Dictionary`, `Cambridge (đối chiếu thủ công)`, `Tự nhập`, or `Chưa có nghĩa`. Zod defines length limits and defaults; API consumers should read that schema before adding fields. Folder names are unique per user.

## Daily practice storage

`PracticeSession` belongs to a user, with a unique `(userId, day)` and the timezone used to create it. Its ordered `PracticeQuestion` rows snapshot the term, sentence, masked prompt, meanings, entry ID and entry version. The entry ID is deliberately not a cascading relation: deleting an entry preserves the session's fixed shape and allows submission to be marked skipped. Each question records one submitted answer, correctness or skipped status, and timestamp. A row lock and atomic version check ensure answer submission and review scheduling happen once together.

`RelatedCache` stores Cambridge relationship evidence as JSON per `(userId, normalizedTerm)`, with a retrieval timestamp. Successful retrieval is reused for 24 hours; older evidence is a fallback during fetch failure. Saved words are filtered at response time. All new records cascade when the user is reset. JSON/CSV formats remain unchanged and omit sessions/caches.

## Review schedule

New entries have stage 0 and `nextReviewAt` at creation. When remembered, the next interval uses the current stage in `[1, 3, 7, 14, 30]` days and stage increments up to 5. When forgotten, stage returns to 0 and the next date is tomorrow. `reviewedAt` records the last review. Every edit or review increments `version` to reject stale writes.

JSON export uses `{format:"wordgarden",version:1,exportedAt,entries}` and carries folder data and entry content. Import accepts at most 2,000 entries and a 2 MB body, skips duplicates, and creates fresh schedule/version values; it does not restore review history. CSV is a tabular content export. A PostgreSQL dump preserves review and database state: see [backup and restore](operations.md#database-backup-and-restore).
