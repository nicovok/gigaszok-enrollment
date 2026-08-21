# Beiratkozás

A self-hosted enrollment management system for sports clubs. Parents submit a registration form; the admin tracks payments and sends email notifications — all from a single dashboard.

Built for [Gigászok Sportegyesület](https://gigaszok.hu) to replace a manual spreadsheet workflow.

## Features

- **Multi-term support** — manage multiple enrollment seasons (e.g. 2025/26, 2026/27) in parallel, each with its own webhook URL slug
- **Automatic registration** — OpnForm (or any form tool) fires a webhook on submission; the child's name is stored instantly
- **Payment tracking via CSV** — upload a bank statement CSV; the app matches transfer references (`Adomány - <child_name>`) and marks applicants as paid in O(n) time using a Map lookup
- **Email notifications**
  - Registration confirmation (sent on webhook arrival)
  - Payment confirmation (sent when payment is detected via CSV or toggled manually)
  - Reminder to unpaid applicants (bulk or individual)
  - Custom broadcast to any subset (all / paid / unpaid)
- **Customisable email templates** — per-term subject, body, and banner image; variables: `{child_name}`, `{parent_name}`, `{bank_adatok}`
- **Outgoing webhooks** — fire your own webhooks on `registration`, `payment`, and `reminder` events, with optional auth header
- **Admin auth via PocketID** — OIDC/OAuth2, signed HS256 JWT stored in `localStorage`

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Native HTTP server, SQLite driver, TypeScript bundler — no Express, no Webpack |
| Database | `bun:sqlite` (raw SQL) | Zero-dependency, single-file, sufficient for this scale |
| Frontend | React 19 + [Mantine 7](https://mantine.dev) | Component library with modals, notifications, and form primitives |
| State | [Zustand](https://zustand.docs.pmnd.rs) | Minimal stores; cross-store access via `getState()` avoids prop drilling |
| Email | Nodemailer + pooled SMTP | HTML email with inline CID attachments (logo/footer/optional banner) |
| Auth | [PocketID](https://github.com/stonith404/pocket-id) | Self-hosted OIDC provider |
| Deploy | Docker (multi-stage) | Bun compiles to a single static binary; final image is `debian:bookworm-slim` |

## Project structure

```
backend/
  index.ts              # Bun.serve() entry — registers routes, global error handler
  db.ts                 # SQLite init, migrations, shared query helpers
  schema.ts             # Shared TypeScript types + const arrays (single source of truth)
  config.ts             # Typed .env reader
  middleware.ts         # requireAuth() — throws AuthError on failure
  auth.ts               # JWT sign/verify, PocketID OIDC flow
  payment.ts            # handlePaymentConfirmed() — email + webhook side-effects
  email_log.ts          # logEmail() shared utility
  csv.ts                # Pure CSV parsing functions (no I/O)
  webhook_caller.ts     # fireWebhook() — outgoing webhook dispatcher
  email/
    renderer.ts         # Pure template interpolation functions
    templates.ts        # Default email templates
    assets.ts           # Logo/footer buffer loading + banner cache
    transport.ts        # Nodemailer pooled transporter
    send.ts             # sendRegistrationEmail / sendReminderEmail / …
  routes/
    auth.ts             # /api/auth/*
    terms.ts            # /api/terms CRUD
    applicants.ts       # Applicant CRUD + email log
    messaging.ts        # Broadcast, bulk remind, individual emails
    csv_import.ts       # POST /api/terms/:id/csv
    email_templates.ts  # GET/PUT/DELETE templates + banner upload
    outgoing_webhooks.ts
    webhook.ts          # POST /webhooks/:slug — public inbound webhook

frontend/
  index.tsx             # React root — MantineProvider, ModalsProvider, Notifications
  types.ts              # Frontend types (mirror backend schema)
  lib/
    api.ts              # apiFetch() — auth header + 401 → logout handling
    utils.ts            # formatDate()
  stores/               # Zustand stores (one per domain)
  modules/dashboard/    # Main UI: header, stats bar, applicants table, all modals
```

## Data model

```sql
terms          id, name, slug (unique), active, webhook_secret, created_at
admins         id, pocketid_sub, name, email, created_at
applicants     id, term_id, child_name, parent_name, email, raw_json, paid, created_at
email_logs     id, applicant_id, type, sent_at
email_templates  id, term_id, type, subject, body, banner_path, created_at
outgoing_webhooks  id, term_id, event, url, auth_header, created_at
```

Indexes: `idx_applicants_term(term_id, paid)`, `idx_email_logs_applicant(applicant_id)`.

## Running locally

**Prerequisites:** [Bun](https://bun.sh/docs/installation) ≥ 1.1, a running [PocketID](https://github.com/stonith404/pocket-id) instance, an SMTP server.

```bash
git clone https://github.com/nicovok/beiratkozas
cd beiratkozas
bun install
cp .env.example .env   # fill in values
bun run dev            # hot reload on :3000
```

### Environment variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: `3000`) |
| `POCKETID_CLIENT_ID` | OAuth2 client ID from PocketID |
| `POCKETID_CLIENT_SECRET` | OAuth2 client secret |
| `POCKETID_REDIRECT_URI` | `https://<host>/api/auth/callback` |
| `JWT_SECRET` | HS256 signing key (min. 32 chars) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port |
| `SMTP_USR` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | Sender address |
| `DB_PATH` | SQLite file path (default: `beiratkozas.db`) |
| `DATA_DIR` | Directory for uploaded banner images |

### Email assets

Place three images in `backend/`:

| File | Usage |
|---|---|
| `email-logo.png` | Shown in email header when no custom banner is set |
| `email-banner.png` | Default banner (currently unused; per-template banners take priority) |
| `email-footer.png` | Footer image embedded in every outgoing email |

## Deployment

```bash
# Build a self-contained binary
bun build --compile backend/index.ts --outfile beiratkozas

# Or with Docker
docker compose up -d
```

The Docker image compiles the binary in a Bun builder stage and copies it into a minimal `debian:bookworm-slim` runtime — no Node, no Bun in production.

The frontend is bundled by Bun at startup and served as a static SPA from the same binary.

## Webhook contract (inbound)

`POST /webhooks/:slug` — public, no auth required.

Expected JSON body (OpnForm format):

```json
{
  "child_name": "Kovács Péter",
  "parent_name": "Kovács János",
  "email": "kovacs.janos@example.com"
}
```

Additional fields are stored as-is in `raw_json`.
