# Personal GitHub workflow

Use this procedure for the first publication and every later contribution. Run commands from the project root in PowerShell, one block at a time, and stop on any failed command. The agreed destination is a **public** repository named `wordgarden` owned by the personal GitHub account selected during login. Confirm a different destination explicitly before using it.

This is an operating procedure, not evidence that Git, a remote repository, secret scanning, or CI has been configured. Publishing source does not deploy the application or create a release. GitHub Actions is outside this workflow's current scope.

## 1. Prepare the account and tools

Install Git, GitHub CLI, and a Gitleaks version supporting `git` and `stdin`. Obtain Gitleaks from its [official installation instructions](https://github.com/gitleaks/gitleaks#installing). If GitHub CLI is missing on Windows:

```powershell
winget install --id GitHub.cli --exact
```

Open a new terminal after installation. Confirm `git --version`, `gh --version`, and `gitleaks version` succeed. Then authenticate through the browser:

```powershell
gh auth login --hostname github.com --git-protocol https --web
gh auth status --hostname github.com
gh api user --jq '{login: .login, type: .type}'
```

Verify the login is the intended personal account and the type is `User`. If another account is active, use `gh auth switch --hostname github.com --user PERSONAL_LOGIN` with the actual login, then verify again. Do not place tokens in commands, remote URLs, project files, or documentation. Keep CLI credentials outside the repository and use the operating system credential store; do not select insecure storage.

## 2. Establish or inspect the repository

Check `git rev-parse --show-toplevel`. If the folder is not a repository, initialize it:

```powershell
git init -b main
```

If it is already a repository, confirm the reported root is this project, then inspect `git status --short`, `git branch --show-current`, and `git remote -v`. Preserve existing changes and history. Do not reinitialize an existing project, replace its remote, or force-push to resolve a mismatch.

Configure author identity only for this repository. Replace the following values with the intended public display name and the exact GitHub-provided `noreply` address from the account's email settings:

```powershell
git config --local user.name "YOUR_PUBLIC_NAME"
git config --local user.email "YOUR_GITHUB_NOREPLY_ADDRESS"
```

Check both values with `git config --local --get user.name` and `git config --local --get user.email` before committing. Commit messages, author names, email addresses, branch names, and file paths become public too.

## 3. Prepare each change

For a new feature or material behavior change, create its [feature record](features/README.md) before coding. Follow [development and testing](development.md), update affected documentation in English, and retain Vietnamese UI labels when describing user actions. Routine fixes and documentation maintenance do not need a feature record.

After the initial publication, start from a clean working tree on `main`:

```powershell
git switch main
git pull --ff-only origin main
git switch -c docs/describe-change
```

Choose a descriptive `feat/`, `fix/`, `docs/`, or `chore/` branch name. If local work exists, preserve it before switching; if fast-forward fails, inspect the divergence instead of resetting or forcing. For the first publication, prepare the initial commit directly on `main`.

## 4. Review content before every commit

Before staging, review all intended files, including hidden files, configuration, scripts, documentation, fixtures, and binary attachments. Never publish real credentials, private keys, auth/capture tokens, cookies, personal vocabulary exports, database dumps, backups, or sensitive screenshots/logs. Example configuration must contain safe placeholders or clearly identified disposable local defaults only.

Maintain `.gitignore` so it excludes generated output (`node_modules/`, `.next/`, `*.tsbuildinfo`), local environment variants, credentials, backups, exports, and local reports. Keep `.env.example` available with safe example values. The current ignore file must be reviewed and extended as needed; do not assume every environment variant or export is already covered. Never ignore all JSON/CSV files indiscriminately because the project uses legitimate source files with those extensions.

Inspect `git status --short --untracked-files=all` and `git ls-files` locally. Use `git check-ignore -v -- PATH` to verify a sensitive local path is ignored. Ignore rules do not remove previously tracked content. For a tracked local-only file, review and use `git rm --cached -- PATH` to stop tracking it while retaining the local file; resolve any existing history exposure separately.

Stage only reviewed paths using `git add -- PATH...`, replacing the placeholder with actual paths. Avoid a blanket first commit of the entire folder. Review `git diff --cached --name-status` and `git diff --cached --check`, then inspect the full staged diff locally. Do not paste potentially sensitive diff output into chat or shared logs.

Scan the staged patch using [Gitleaks stdin mode](https://github.com/gitleaks/gitleaks#stdin):

```powershell
$stagedPatch = git diff --cached --no-ext-diff --no-textconv --binary
if ($LASTEXITCODE -ne 0) { throw 'Cannot read staged content.' }
$stagedPatch | gitleaks stdin --redact=100
if ($LASTEXITCODE -ne 0) { throw 'Secret scan failed or found a candidate; stop.' }
Remove-Variable stagedPatch
```

Resolve every candidate before continuing. A scanner error, missing tool, or incomplete scan is a failed gate. Review binaries, personal information, and other content that a text scanner may miss manually. Do not disable rules or add a baseline to silence unexplained findings. If a false positive is confirmed, record a narrow, non-sensitive explanation and rerun the scan. Any staged change after review requires another scan.

Run the applicable checks from [development and testing](development.md). Code changes require `npm run typecheck`, `npm test`, and `npm run build`; documentation-only changes require relative-link and factual-reference checks. Record outcomes in [VERIFICATION.md](../VERIFICATION.md), including failures and checks not run. Scan any newly staged evidence before committing.

Commit only when these gates pass:

```powershell
git commit -m "docs: describe the reviewed change"
```

Use a message matching the actual change; for the first commit, use `chore: initialize Wordgarden repository`.

## 5. Scan committed history before every push

Run the following after committing and again if any commit changes. Scan all local refs so an earlier commit containing a secret is not overlooked:

```powershell
gitleaks git . --log-opts="--all" --redact=100
if ($LASTEXITCODE -ne 0) { throw 'History scan failed or found a candidate; do not push.' }
```

Inspect the author metadata and content of all commits that will be published, not only the latest working tree. If a secret was committed, removing it in a later commit is insufficient. Stop publication, revoke or rotate the credential, and clean every affected unpublished commit before rescanning. If it already reached GitHub, treat it as exposed; coordinate history cleanup and access recovery rather than force-pushing blindly. Report paths and remediation status without disclosing values. A clean scan plus manual review reduces risk; it cannot prove the absence of all sensitive information.

## 6. Publish the first commit

Only after the preceding gates pass, replace `PERSONAL_LOGIN` with the verified login and check whether `PERSONAL_LOGIN/wordgarden` already exists. A lookup failure can mean an authentication or network error; distinguish that from a confirmed missing repository. If it exists, inspect ownership and history before connecting it; do not overwrite it or choose another name silently.

For a confirmed new destination:

```powershell
gh repo create PERSONAL_LOGIN/wordgarden --public --source=. --remote=origin
git remote -v
gh repo view PERSONAL_LOGIN/wordgarden --json nameWithOwner,visibility,url
```

Verify the owner, repository name, public visibility, and token-free HTTPS remote URL match the intended destination before uploading source:

```powershell
git push -u origin main
gh repo edit PERSONAL_LOGIN/wordgarden --default-branch main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

The local and remote commit hashes must match. If repository creation succeeds but push fails, inspect the existing remote and retry only the failed step after resolving the cause; do not recreate the repository.

## 7. Publish later changes

Repeat the content review, applicable checks, and staged/history scans for every change. Confirm the personal account and remote before pushing. Push the current topic branch with `git push -u origin HEAD`, then open a pull request targeting `main`. Review the diff and verification evidence before merging. If no CI is configured, record local checks explicitly rather than claiming automated checks passed.

After merging, return to `main` with `git switch main` from a clean working tree, run `git pull --ff-only origin main`, and verify the intended change is present on GitHub. Report the repository/PR URL, published commit, review and scan outcomes, and any unresolved limitation. Never attach raw credentials or unredacted scan reports.

Source publication is separate from a [release or deployment](releases/README.md). Do not tag a release, mark a feature released, or update PROD solely because a push or merge succeeded. Keep historical deployment evidence accurate: a newly created source commit does not retroactively identify a previously deployed image.

## References

- [GitHub CLI browser authentication](https://cli.github.com/manual/gh_auth_login)
- [GitHub CLI repository creation](https://cli.github.com/manual/gh_repo_create)
- [GitHub commit email settings](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)
- [Gitleaks commands and redaction options](https://github.com/gitleaks/gitleaks#usage)
