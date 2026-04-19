# AGENTS.md — Coding Agent Guidelines for AgentropolisGooGle

This file defines conventions, PR requirements, and workflow rules for any
AI coding agent (Copilot, Codex, or similar) working in this repository.

---

## Repository layout

```
AgentropolisGooGle/
├── google-backend/       # TypeScript/Express AI agent engine (primary service)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/       # Express routers
│   │   └── services/     # Business logic
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── AGENTS.md             # This file
```

All backend work happens inside `google-backend/`. Run every command
(`npm install`, `npm run build`, `npm test`) from that directory unless
stated otherwise.

---

## Environment setup

1. Copy `.env.example` → `.env` and fill in credentials before running the server.
2. Required variables:
   - `GOOGLE_API_KEY` — Google AI (Gemini) API key
   - `CLOUDFLARE_API_TOKEN` — Cloudflare API token (crawl feature)
   - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID (crawl feature)
   - `PORT` — defaults to `3001`

---

## Build & test commands

| Task | Command (run from `google-backend/`) |
|------|--------------------------------------|
| Install dependencies | `npm install` |
| Type-check & compile | `npm run build` |
| Run development server | `npm run dev` |
| Run tests | `npm test` |

- **Always run `npm run build` before opening a PR** to confirm there are no TypeScript errors.
- **Always run `npm test`** and ensure all tests pass before opening a PR.

---

## Coding conventions

### TypeScript
- Target: `ES2020`, `"strict": true` — no implicit `any`, no unchecked nulls.
- All new files must be `.ts`; no plain `.js` files in `src/`.
- Use `async/await`; avoid raw `.then()` chains.
- Export classes and interfaces by name (no default exports for services).

### Express routes
- Route handlers live in `src/routes/`; business logic lives in `src/services/`.
- Validate all request body fields and return `400` with a descriptive `{ error }` message before calling any service.
- Return `500` with `{ error, details }` on unexpected failures; log with `console.error`.

### Error handling
- Wrap all `async` route handlers in try/catch.
- Always use `err instanceof Error ? err.message : String(err)` when surfacing error details.

### Secrets & credentials
- **Never** commit real secrets. Use environment variables loaded via `dotenv`.
- Authorization headers must use the form: `` `Bearer ${this.apiToken}` ``.

---

## Pull request guidelines

1. **Branch naming**: `copilot/<short-description>` or `codex/<short-description>`.
2. **Commit messages**: Use conventional commits format — `feat:`, `fix:`, `docs:`, `chore:`, etc.
3. **PR size**: Keep PRs focused; one logical change per PR.
4. **Draft PRs first**: Open as draft while CI is running; mark ready only after all checks pass.
5. **PR description**: Include a summary of changes and reference any related issues.
6. **Tests**: Every new service method or route must have a corresponding test in `src/__tests__/`.
7. **No secrets in diffs**: If a diff includes a real API key or token, the PR must be closed and the secret rotated before a new PR is opened.

---

## Automated agent PR flow

When an AI agent opens a PR automatically (e.g., via the `codex-agent` workflow):

1. The agent creates a branch from `main`.
2. It implements the requested change, runs `npm run build` and `npm test`.
3. It opens a **draft** PR with a description generated from the task prompt.
4. A human reviewer must approve and mark the PR ready before merging.

---

## Review checklist (for reviewers)

- [ ] `npm run build` passes with no errors
- [ ] `npm test` passes with no failures
- [ ] No secrets or credentials in the diff
- [ ] Input validation present in new/modified routes
- [ ] Error handling follows the pattern above
- [ ] PR description is clear and complete
