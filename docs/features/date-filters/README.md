# Vocabulary date filters

**ID:** `date-filters`\
**Status:** `verified`\
**Owner/request:** User, 2026-11-20

## Goal
Find saved vocabulary by creation date or most recent review date.

## Scope and exclusions
Shared filters for library, flashcard review, print and filtered CSV/JSON export. Daily practice remains library-wide. No schema migration or deployment.

## Settled decisions
- Creation and addition are the same timestamp (`createdAt`); imports receive a fresh creation date.
- Last review uses `reviewedAt`, including existing flashcard and daily-practice scheduling behavior.
- Inclusive browser-local calendar dates; open-ended ranges; today, last 7 days and last 30 days include today.
- Never-reviewed mode ignores the range. Date filters combine with existing filters and persist only until reload.
- Invalid ranges show a Vietnamese error and block review, print and filtered export.

## Acceptance criteria
- Both date fields, presets, open-ended ranges, never-reviewed mode and clearing work together with existing filters.
- Counts, review queue, print and filtered exports use the same matching entries.
- Controls remain accessible on narrow screens; daily practice is unaffected.

## Implementation record
Shared date predicates and reusable Vietnamese date controls, integrated into Garden state. SavedEntry includes nullable reviewedAt.

## Verification
- 2026-11-20: TypeScript passed; unit tests passed 21/21; production build passed.
- Date tests also passed with TZ=America/New_York, including DST and leap-year boundaries.
- Headless Chrome against the production build, using intercepted synthetic API fixtures only: combined search/folder/date filters, presets, never-reviewed mode, review refresh, print entries, filtered export IDs, invalid-range blocking, clearing and reload passed. No database writes.
- Desktop (1440 px) and mobile (390 px) screenshots inspected; no mobile horizontal overflow.
- Targeted ESLint passed for new logic, component and tests. Optional full local ESLint reports 13 existing findings in unchanged behavior (API any, legacy links/effects, capture test any); they remain outside this feature. The local review hook is disabled; no rules were suppressed. No Sonar configuration or scanner is available.
- Initial sandbox test failed on Windows junction permissions; rerun outside sandbox passed. Initial build could not resolve worktree dependencies; isolated locked dependency installation resolved it. Initial browser attempts could not reach the sandbox server; an isolated server outside sandbox resolved it. Temporary browser-script locator/scope errors were corrected before the passing run.
- Live database integration, physical printing and production deployment were not run. Existing API/storage behavior is unchanged.

## Release
**Versioned release:** None.\
**Deployed:** No.
