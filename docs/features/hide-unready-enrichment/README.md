# Hide unready enrichment

**ID:** `hide-unready-enrichment`\
**Status:** `verified`\
**Owner/request:** User, 2026-11-20

## Goal

Temporarily hide Cambridge actions and additional-example editing across the web app and extension until they are ready for everyday use.

## Scope and exclusions

Hide dictionary lookup, related suggestions, Cambridge navigation/capture controls, example editors, and example-enrichment prompts. Keep original context sentences, existing examples and attribution, manual meanings, practice, and ordinary extension capture. Preserve APIs, parsers, stored content, and export formats.

## Settled decisions

Use internal disabled-by-default visibility flags, without user-facing switches. Do not mount hidden lookup/suggestion components or issue their requests. Preserve hidden fields when editing an existing entry. Existing Cambridge attribution remains readable, but new manual entries cannot select Cambridge as their source. No migration or deployment is included.

## Acceptance criteria

- [x] Cambridge actions and related requests are absent from the active web UI.
- [x] Additional-example editing and enrichment prompts are absent; saved examples still display.
- [x] Extension selection/menu/sense controls for Cambridge are absent after reload/update.
- [x] Ordinary capture and editing preserve existing context, examples, and attribution.
- [x] Applicable checks pass; unavailable manual checks are recorded explicitly.

## Implementation record

Added internal web and extension visibility gates, unmounted lookup/suggestion surfaces, removed enrichment prompts, preserved saved examples and attribution, and refreshed user documentation. Restoration requirements are tracked in the roadmap.

The available local review reported 13 pre-existing lint findings. Resolved them without changing API formats: typed CSV/test data, marked export links as downloads, used Next navigation for the brand, deferred cancellable mount initialization, and keyed related results/practice input to their request/question instead of resetting state synchronously in effects.

## Verification

| Check | Result | Evidence/date |
| --- | --- | --- |
| TypeScript | Passed | `npm run typecheck`, 2026-11-20 |
| Unit tests | Passed, 18/18 | Initial sandbox junction permission failure; permission-adjusted rerun passed |
| Production build | Passed | `npm run build`, 2026-11-20 |
| Available local ESLint review | Passed, zero warnings/errors | All source, extension, tests, scripts and Next config |
| Web acceptance | Passed | Headless Chrome, 1440px and 390px, mocked API: editor, save payload preservation, practice result, print and settings; zero lookup/related requests and browser errors |
| Extension acceptance | Passed in fixtures | Menu startup unit test; actual content script injected into headless Chrome on mocked Cambridge HTML; hidden lookup/sense controls and ordinary sentence capture |
| Installed Chrome/Edge extension update | Not run | Real extension permissions, reload and live pages still need manual confirmation |
| Sonar | Not available | No scanner/configuration or connected Sonar tool found |
| Semantic/content review | Passed | Hidden fields preserved, UI-only gates, unchanged schema/API formats; no blocking findings |

Browser checks used only intercepted synthetic API responses and did not access the personal database. Temporary browser tooling and screenshots are ignored local artifacts. Localhost access initially failed across sandbox boundaries; using a permission-adjusted local server and browser resolved it. Staged-content and all-ref history Gitleaks scans passed without findings. The complete available local review runner passed. See the verification record for details.

## Release

**Versioned release:** None.\
**Deployed:** No.
