# Development and testing

Begin with [developer setup](developer-setup.md). For a feature change, trace the UI in `src/components/garden.tsx`, the relevant API handler, shared Zod model, and Prisma schema. Keep validation and persisted data aligned. If the schema changes, add a Prisma migration in development and verify it against an isolated database; production Compose applies committed migrations via `prisma migrate deploy`.

## Feature and release workflow

Read the root [agent rules](../AGENTS.md). For a new feature or material behavior change, create `docs/features/<feature-id>/README.md` from the [feature template](features/_template.md) **before coding**. Settle the goal, scope, and acceptance criteria; move through `proposed → approved → in progress → verified → released`, or `dropped`. A direct request to build the feature can establish approval of its defined scope. Update the record as code and evidence change. Small bug fixes, wording edits, and routine maintenance do not need a new feature record.

For initial Git setup and every later commit or push, follow the [personal GitHub workflow](git-workflow.md). Verify the personal account and destination, review staged content, and pass staged-content and history secret scans before publication. A source push is separate from a release or deployment.

Use a lowercase, hyphen-separated feature ID. Keep implementation code in `src/`, `extension/`, `prisma/`, and `tests/`; the feature folder is documentation only. Resolve ordinary implementation details within the user's request, and ask only about product choices that materially change the intended result. Update affected docs in the same change. For documentation-only work, check links and factual references.

Add only accepted work to [latest development](releases/latest.md), with its actual status. Keep unapproved ideas in feature records or the roadmap. When preparing a version, follow the [release checklist](releases/README.md): only completed, verified features appear in a versioned release. Update [PROD](releases/prod.md) only after that exact build is deployed and checked. `package.json` and the extension manifest have separate version numbers and do not by themselves establish a release.

When asking an agent to code, a useful prompt is: “Build feature X. Follow AGENTS.md; create its feature record before changing code, then update status and verification evidence.” For a release: “Prepare a release from verified features using docs/releases/README.md. Do not update PROD until deployment is confirmed.” The agent should still follow repository rules when the prompt does not repeat them.

Run these checks from the repository root:

```powershell
npm run typecheck
npm test
npm run build
```

The unit tests cover model rules, Cambridge parsing, capture tokens, and mocked extension background behavior. `scripts/smoke.mjs` exercises the main API; `scripts/capture-smoke.mjs` exercises local extension capture. Both create temporary records and attempt cleanup, but run them **only against a disposable local-mode database** because cleanup can fail if the process is interrupted:

```powershell
$env:TEST_URL='http://localhost:3000'
node scripts/smoke.mjs
node scripts/capture-smoke.mjs
Remove-Item Env:TEST_URL
```

For manual acceptance, save a word without a meaning, edit it, filter by folder, review it, exercise a Cambridge failure, print in Chrome/Edge, and check extension capture in a real browser when changing extension code. Confirm conflicts and errors are understandable. Before handing off, update relevant documentation and [verification evidence](../VERIFICATION.md), run the appropriate checks once, and record anything unverified. See [workflows](workflows.md) for expected behavior.
