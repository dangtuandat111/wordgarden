# Project overview

Wordgarden helps an individual learner retain English words found while reading. Each saved word or phrase can retain the sentence where it appeared. A learner may save immediately, add a meaning later, then revisit it through scheduled flashcards.

| Area | Current behavior |
| --- | --- |
| Library | Create, edit, search, filter, and delete entries; organize folders. |
| Context | Original sentence, optional translation, notes, tags, links, definition, and at most two extra examples. |
| Dictionary | Best effort parsing of public Cambridge pages; choose a sense or compare manually. |
| Review | New entries due immediately; remembering advances through 1, 3, 7, 14, 30 day intervals; forgetting schedules tomorrow. |
| Daily practice | Up to ten due words per local day in persisted fill-in-the-blank sessions; optional Cambridge-related suggestions require explicit saving. |
| Output | Browser print dialog for study sheets/worksheets; CSV and JSON export; JSON import. |
| Capture | Chrome/Edge extension saves selected text and context in local mode. |
| Accounts | Default local account; separately configurable Google OAuth and per-user isolation. |

PostgreSQL holds the data. Docker binds the default app to `127.0.0.1:3080` for one computer. The PWA manifest supports adding the site to a home screen, but the app requires a server connection.

Cambridge may refuse automated requests or change its HTML. Lookup failure leaves the word available to save without a meaning. Wordgarden neither bypasses access restrictions nor invents definitions, examples, or translations. It does not write Cambridge Word Lists. Quick capture works only with `LOCAL_MODE=true`; Google mode requires the extension's open-form route. JSON import restores content and folders, but resets the review schedule for newly imported entries. See the [roadmap](roadmap.md) for proposals and the [verification record](../VERIFICATION.md) for evidence.
