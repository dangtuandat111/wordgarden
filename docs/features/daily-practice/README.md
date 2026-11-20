# Daily practice and related vocabulary

**ID:** `daily-practice`\
**Status:** `verified`\
**Owner/request:** Requested by the project owner, 20 November 2026.

## Goal

Practice up to ten due saved words each local day using fill-in-the-blank sentences. Offer optional Cambridge-related vocabulary without automatically adding entries.

## Scope and exclusions

Keep existing flashcards and scheduling. No AI, mandatory new-word lesson, notifications, or production deployment. An empty library starts nothing.

## Settled decisions

- Persist a fixed daily session and resume after reload; use the browser timezone.
- Use original sentences or examples containing exact whole-word/phrase matches; mask every occurrence. Normalize Unicode, whitespace and case when grading.
- Grade on the server, update scheduling once in a transaction, and skip deleted or stale entries.
- Show up to five Cambridge suggestions with evidence-backed relationship labels. Cache successful retrieval for 24 hours; source failures do not block practice.
- Only explicit saving through the existing editor creates an entry. Preserve the current initial review schedule.

## Acceptance criteria

- [x] Daily sessions contain at most ten eligible due entries and survive reload.
- [x] Answers remain hidden until submission; repeat submissions cannot advance scheduling twice.
- [x] Stale/deleted entries and user isolation are handled safely.
- [x] Related words exclude saved terms and open an editable draft, without automatic saving.
- [x] Cambridge failures leave practice available.
- [x] Required checks and isolated database verification are recorded.

## Implementation record

Implemented on `feat/daily-practice-v1`. Added persisted sessions/questions, server-side grading, optional cached Cambridge relationships, editor drafts and responsive navigation. Prisma relations explicitly preserve the existing migrations' ON UPDATE NO ACTION behavior.

## Verification

| Check | Result | Evidence/date |
| --- | --- | --- |
| TypeScript/tests/build | Passed | 20 November 2026; 17/17 tests |
| Isolated database/API | Passed | Migrations, schema diff, daily/main/capture smoke tests |
| Desktop/mobile UI | Passed | Empty state, grading, resume, draft cancel/save, 390 × 844 layout |

Live Cambridge successful retrieval remains unverified because access was blocked. Parser fixtures and synthetic cached suggestions verified relationship labels and the UI; live failure fallback was exercised. Sonar and a dedicated automated review tool were not configured/available. See [verification evidence](../../../VERIFICATION.md).

## Release

**Versioned release:** None.\
**Deployed:** No.
