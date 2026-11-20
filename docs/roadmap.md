# Proposed roadmap

These are proposals for a personal local learning tool, not implemented capabilities or commitments. Validate priorities with real use before scheduling work.

| Priority | Opportunity and value | Dependency and suggested completion criterion |
| --- | --- | --- |
| 1 | Improve the library/editor/review experience so capturing and revisiting a word takes fewer steps. | Observe current workflows first; complete when common tasks work clearly on desktop and phone without losing any existing fields. |
| 2 | Make Cambridge fallback and manual enrichment clearer when automated lookup is blocked. | Preserve source attribution; complete when a learner can save immediately and later fill a verified meaning without confusion. |
| 3 | Make extension capture more reliable across ordinary reading pages. | Test actual Chrome/Edge permissions and DOM variants; complete when success, duplicate, failure, and retry states are distinguishable. |
| 4 | Improve review feedback and visibility of due work. | Keep existing scheduling semantics unless deliberately redesigned; complete with tests for dates and a clear progress display. |
| 5 | Strengthen data portability and recovery. | Exercise backup restore on an isolated instance; complete when a documented recovery drill restores content and review dates. |

Ideas requiring separate discovery include Google-mode quick capture, offline access, and Cambridge Word Lists integration. These require authentication, sync, or third-party capability decisions before implementation. See [current limitations](overview.md#current-limits) and [verification](../VERIFICATION.md).

## Temporarily hidden enrichment

Requested on 2026-11-20. These controls are hidden, not removed or released as repaired. See the [feature record](features/hide-unready-enrichment/README.md).

| Deferred capability | Hidden surfaces and restoration gates | Completion required before restoring |
| --- | --- | --- |
| Cambridge dictionary lookup | Editor lookup, bilingual toggle, sense picker, outbound dictionary links, settings help and promotional text. Web gate: `featureVisibility.cambridge` in `src/lib/feature-visibility.ts`. | Verify live English and bilingual retrieval, sense selection, attribution, timeouts/blocked-page fallback, and saving without lookup. Restore matching help text. |
| Related vocabulary | Word details and practice results; same web Cambridge gate. Components are not mounted while hidden. | Verify live evidence and labels, cache fallback, no-results behavior, explicit draft/save, and no requests while hidden. |
| Cambridge extension actions | Selection lookup, context menu and sense capture; local `cambridgeVisible` constants in `extension/background.js` and `extension/content.js`. | Verify on installed Chrome/Edge, including permission handling, real-page sense/example capture, and persisted menu cleanup after update/reload. Restore manifest description and instructions together. |
| Additional-example editing | Editor add/edit/remove controls and enrichment prompts. Web gate: `featureVisibility.additionalExampleEditing`; prompts were removed from details/practice. | Reproduce and fix the reported failure; verify adding, editing, removing, validation, save/reload and translations. Preserve old examples on unrelated edits. Restore prompts and matching editor wording. |

Original context editing, manual meanings, existing source attribution, saved-example display, print/export/import and daily practice remain available. APIs, parsers and data structures are retained. No database migration is needed. These internal gates are not user-facing settings or authorization boundaries.
