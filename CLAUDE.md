# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Beiratkozás – school enrollment management. Parents fill an OpnForm → webhook fires → child name stored. Admin uploads bank CSV periodically to mark 5000 Ft payments. Supports multiple enrollment terms (e.g. 2026/27, 2027/28), each with its own webhook URL slug.

## Commands

```bash
bun install                                            # install deps
bun --hot backend/index.ts                             # dev (hot reload, port 3000)
bun build --compile backend/index.ts --outfile beiratkozas  # production binary
```

## Tech Stack

Mirrors `../berletek/` exactly:

- **Runtime/server**: Bun (`Bun.serve` with native route object — no Express)
- **Database**: `bun:sqlite` (raw SQL, no ORM — `db.prepare(...).run/get/all`)
- **Frontend**: React 19 + Mantine 7, bundled by Bun via `frontend/index.html` as entry
- **Auth**: PocketID (OIDC/OAuth2) → custom HS256 JWT stored in `localStorage`
- **Types**: shared via `backend/schema.ts` — frontend imports types directly from backend

## Project Structure

```
backend/
  index.ts          # Bun.serve() entry: registers all routes, global error handler
  db.ts             # SQLite init + CREATE TABLE IF NOT EXISTS
  auth.ts           # signToken / verifyToken / getPocketIDAuthUrl / exchangeCodeForToken
  middleware.ts     # requireAuth(req) — throws AuthError on failure
  config.ts         # reads .env into typed config object
  schema.ts         # all shared TypeScript types (Admin, Term, Applicant, BunRequest<T>)
  routes/
    auth.ts         # /api/auth/login, /callback, /logout, /verify
    terms.ts        # /api/terms CRUD (admin only)
    applicants.ts   # /api/terms/:id/applicants, /api/terms/:id/csv
    webhook.ts      # POST /webhooks/:slug — public, no auth
frontend/
  index.html        # HTML shell (script src="./index.tsx")
  index.tsx         # React root, MantineProvider
  index.css
  modules/
    root.tsx        # auth bootstrap: reads ?token= from URL, verifies, redirects
    dashboard.tsx   # admin UI: term switcher, applicant table, CSV upload
```

## Data Model

```sql
admins
  id TEXT PK, pocketid_sub TEXT UNIQUE, name TEXT, email TEXT, created_at INTEGER

terms
  id TEXT PK, name TEXT (e.g. "2026/27"), slug TEXT UNIQUE (e.g. "beiratkozas2627"),
  active INTEGER DEFAULT 1, created_at INTEGER

applicants
  id TEXT PK, term_id TEXT FK→terms, child_name TEXT,
  raw_json TEXT,          -- full OpnForm webhook payload
  paid INTEGER DEFAULT 0, -- 0=not paid, 1=paid
  created_at INTEGER
```

## Key Patterns from berletek

**Routing** — routes are a plain object spread into `Bun.serve({ routes })`:
```typescript
export const webhookRoutes = {
  "/webhooks/:slug": {
    async POST(req: Request) {
      const slug = (req as BunRequest<{ slug: string }>).params.slug;
      ...
    },
  },
};
```

**Auth middleware** — `requireAuth` throws `AuthError`; the global error handler in `index.ts` catches it and returns 401. No try/catch needed in route handlers for auth.

**Frontend auth flow** — `root.tsx` bootstraps auth: checks `?token=` URL param → stores in `localStorage` → calls `/api/auth/verify` → redirects to PocketID if invalid. After login, all requests use `Authorization: Bearer <token>`.

**Type casting for params** — use `req as BunRequest<{ paramName: string }>` to access typed URL params.

## Webhook Contract

OpnForm POST body must contain a field named `child_name` (same spelling used in the bank transfer reference). The webhook stores `child_name` plus the full raw JSON body. Webhook is public — no auth required, but validate that the term slug exists.

## CSV Processing Logic

Bank statement CSV rows are matched with this rule:
- Column containing transfer reference matches pattern `Adomány - <child_name>` (case-insensitive trim)
- Amount column equals `5000` (Ft)
- On match: set `paid = 1` for the applicant in the matching term

The CSV format from the bank must be inspected on first upload to identify column indices. Store column mapping in config or derive it from the header row.

## Auth / Environment

Same PocketID setup as berletek (`https://auth.nicoprt.xyz`). `.env` required:
```
PORT=3000
POCKETID_CLIENT_ID=...
POCKETID_CLIENT_SECRET=...
POCKETID_REDIRECT_URI=https://<host>/api/auth/callback
JWT_SECRET=<strong-secret>
```

JWT payload (`sub`) holds the admin's `id` from the `admins` table (not the PocketID sub). `requireAuth` returns the decoded payload; use `payload.sub` as `admin_id`.
