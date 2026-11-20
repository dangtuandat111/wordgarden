# Feature records

Create `docs/features/<feature-id>/README.md` from [_template.md](_template.md) before implementing a new feature or material user-visible behavior change. Use a stable lowercase, hyphen-separated ID such as `review-progress`. Keep code in the existing application directories. This directory records *why*, *what*, and *how it was checked*.

| Status | Meaning |
| --- | --- |
| `proposed` | Idea or requirements are not settled; do not list in `latest` or a release. |
| `approved` | Goal, scope, and acceptance criteria are settled; development may begin. An explicit user request can establish this. |
| `in progress` | Implementation is underway; list in `latest` with this status. |
| `verified` | Implementation and applicable checks are complete; eligible for a release record. |
| `released` | Included in a versioned release that was actually deployed. |
| `dropped` | Work will not proceed; keep the record and reason. |

Allowed transitions are `proposed → approved → in progress → verified → released`; `dropped` may follow any pre-release state. If a released feature changes materially, create a new record for that change. A small bug fix, wording edit, or routine maintenance can be documented in the change/release notes without a feature directory.

The index below lists records as they are created. Do not pre-populate it with historical features whose requirements and verification are unknown.

| Feature | Status | Summary |
| --- | --- | --- |
| [Daily practice](daily-practice/README.md) | verified | Daily sentence practice and optional Cambridge-related words. |
