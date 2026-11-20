# Wordgarden

Xem [tài nguyên máy và reset/dọn dữ liệu](docs/resources-and-reset.md) để kiểm tra dung lượng, dừng dịch vụ hoặc tạo lại bản local sạch.

Wordgarden is a local English vocabulary notebook. Save a word with its original sentence, add a meaning when available, and review due flashcards. PostgreSQL stores the data; an optional Chrome/Edge extension captures words while you read.

## Start locally

Start Docker Desktop, then run:

```powershell
docker compose up -d --build
docker compose ps
```

Open **http://localhost:3080**. The first build requires internet access. Startup waits for the database, runs migrations, then starts the web service. No `.env` is needed for local defaults. `docker compose down` preserves data; **do not use `down -v` if you want to keep your words**.

You can save words and context, try Cambridge lookup, organize folders, review cards, print study sheets, export CSV/JSON, import JSON, and capture selections with the extension. Cambridge lookup may be blocked. The app does not generate translations or examples, sync Cambridge Word Lists, or work offline.

See the [documentation index](docs/README.md) for the [user guide](docs/user-guide.md), [developer setup](docs/developer-setup.md), architecture, API, operations, roadmap, [feature workflow](docs/features/README.md), [release process](docs/releases/README.md), and [verification record](VERIFICATION.md). Coding agents should follow the root [repository rules](AGENTS.md).
