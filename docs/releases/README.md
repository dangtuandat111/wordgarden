# Release process

`latest.md` describes the accepted development line. A numbered `<version>.md` is a frozen release record. `prod.md` describes the build actually deployed. These are different states; do not copy unfinished features into release or PROD documentation.

## Prepare a release

1. Review [feature records](../features/README.md). Only `verified` features with complete acceptance and verification evidence are candidates. A feature still `proposed`, `approved`, or `in progress` remains outside the versioned release.
2. Select a version identifier and create `<version>.md` from [_template.md](_template.md). List only included, verified changes; include small fixes directly in the release record.
3. Run `npm run typecheck`, `npm test`, and `npm run build`. Run relevant smoke tests only against an isolated local-mode database. Perform manual browser/extension/print checks when those areas changed. Record results and any unverified area in the release record.
4. Verify that every listed feature has a record at `verified` or `released`, with passing relevant checks. Confirm release notes describe the built artifact and known limitations. A failed required check stops the release; do not change `prod.md`.
5. After the exact build is deployed and its health/critical flow is checked, update `prod.md` with the deployed artifact identifier, date, environment, and link to the versioned release. Mark included feature records `released`. Keep `latest.md` current for continuing development.

Before the first formal release, follow the [personal GitHub workflow](../git-workflow.md), commit the release state, and tag it (for example `v0.1.0`) so the source can be recovered. A Docker image ID identifies a local artifact but does not establish a source commit. Initializing Git does not retroactively identify an existing deployment. Do not invent a source reference or claim a formal release until one is recorded.

## Review checklist

- Every release feature is `verified` and has acceptance and test evidence.
- No unsettled or unfinished feature appears in the versioned release or `prod.md`.
- Versioned record names the exact build, checks, limitations, and recovery path.
- `prod.md` changes only after deployment and post-deployment verification.
- README, user/developer docs, and feature index describe the shipped behavior accurately.
