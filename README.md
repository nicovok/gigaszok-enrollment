# Beiratkozás — Gigászok Sportegyesület

Enrollment management system built for Gigászok Sportegyesület. Parents fill out an OpnForm registration form; the data is transformed by an n8n workflow and pushed into the system via webhook. From there, the admin tracks registration fee payments and triggers further automations — such as issuing membership cards in the club's bérlet system.

## Flow

```
OpnForm (registration form)
    ↓
n8n (data transformation, validation)
    ↓
POST /webhooks/:slug  →  applicant stored (child_name, parent_name, email)
    ↓
Admin dashboard
    ├── manual payment toggle
    └── bank statement CSV upload  →  automatic matching
            ↓
        payment detected
            ├── confirmation email to parent
            └── outgoing webhook  →  n8n / membership system / other automations
```

## Features

- **Multi-term support** — manage multiple enrollment seasons (e.g. 2025/26, 2026/27) in parallel, each with its own webhook URL slug
- **OpnForm + n8n integration** — the system exposes a public webhook endpoint; an n8n workflow transforms the OpnForm submission and calls it
- **Payment tracking — two ways**
  - Manual: the admin toggles payment status per applicant in the dashboard
  - Automatic: upload a bank statement CSV — transfer references (`Adomány - <child_name>`) are matched against applicants in O(n) time using a Map lookup
- **Email notifications** — registration confirmation, payment confirmation, reminders (bulk or individual), custom broadcast (filtered by: all / paid / unpaid)
- **Customisable email templates** — per-term subject, body, and banner image; template variables: `{child_name}`, `{parent_name}`, `{bank_adatok}`
- **Outgoing webhooks** — configurable URLs called on `registration`, `payment`, and `reminder` events (e.g. triggering an n8n workflow to create a membership card), with optional auth header
- **Admin auth** — PocketID OIDC/OAuth2, signed HS256 JWT

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Built-in HTTP server, SQLite driver, TypeScript bundler — no Express, no Webpack |
| Database | `bun:sqlite` (raw SQL) | Zero dependencies, single file, sufficient for this scale |
| Frontend | React 19 + [Mantine 7](https://mantine.dev) | Modals, notifications, and form primitives out of the box |
| State | [Zustand](https://zustand.docs.pmnd.rs) | Minimal stores; cross-store access via `getState()` without prop drilling |
| Email | Nodemailer + pooled SMTP | HTML email with inline CID attachments (logo / footer / optional banner) |
| Auth | [PocketID](https://github.com/stonith404/pocket-id) | Self-hosted OIDC provider |
| Deploy | Docker (multi-stage) | Bun compiles to a single static binary; final image is `debian:bookworm-slim` |

## Project structure

```
backend/
  index.ts              # Bun.serve() entry point, global error handler
  db.ts                 # SQLite init, migrations, shared query helpers
  schema.ts             # TypeScript types + const arrays (single source of truth)
  config.ts             # Typed .env reader
  middleware.ts         # requireAuth() — throws AuthError on failure
  auth.ts               # JWT sign/verify, PocketID OIDC flow
  payment.ts            # handlePaymentConfirmed() — email + webhook side effects
  email_log.ts          # logEmail() shared utility
  csv.ts                # Pure CSV parsing functions (no I/O, no DB)
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
    email_templates.ts  # Template GET/PUT/DELETE + banner upload
    outgoing_webhooks.ts
    webhook.ts          # POST /webhooks/:slug — public inbound webhook

frontend/
  index.tsx             # React root — MantineProvider, ModalsProvider, Notifications
  types.ts              # Frontend types (mirroring backend schema)
  lib/
    api.ts              # apiFetch() — auth header injection + 401 → logout
    utils.ts            # formatDate()
  stores/               # Zustand stores (one per domain)
  modules/dashboard/    # Main UI: header, stats bar, applicants table, all modals
```

## Data model

```sql
terms              id, name, slug (unique), active, webhook_secret, created_at
admins             id, pocketid_sub, name, email, created_at
applicants         id, term_id, child_name, parent_name, email, raw_json, paid, created_at
email_logs         id, applicant_id, type, sent_at
email_templates    id, term_id, type, subject, body, banner_path, created_at
outgoing_webhooks  id, term_id, event, url, auth_header, created_at
```

Indexes: `idx_applicants_term(term_id, paid)`, `idx_email_logs_applicant(applicant_id)`.

## Running locally

**Prerequisites:** [Bun](https://bun.sh/docs/installation) ≥ 1.1, a running [PocketID](https://github.com/stonith404/pocket-id) instance, an SMTP server.

```bash
git clone https://github.com/nicovok/gigaszok-enrollment
cd gigaszok-enrollment
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

Place the following images in `backend/`:

| File | Usage |
|---|---|
| `email-logo.png` | Shown in the email header when no custom banner is set |
| `email-footer.png` | Embedded as footer in every outgoing email |

## Deployment

```bash
# Build a self-contained binary
bun build --compile backend/index.ts --outfile beiratkozas

# Or with Docker
docker compose up -d
```

The Docker image compiles the binary in a Bun builder stage and copies it into a minimal `debian:bookworm-slim` runtime — no Node, no Bun in the final container.

The frontend is bundled by Bun at build time and served as a static SPA from the same binary.

## Inbound webhook (n8n → system)

`POST /webhooks/:slug` — public, no auth required.

The n8n workflow transforms the OpnForm submission and calls this endpoint with:

```json
{
  "child_name": "Kovács Péter",
  "parent_name": "Kovács János",
  "email": "kovacs.janos@example.com"
}
```

The full payload is stored as-is in `raw_json`. The `slug` identifies the enrollment term (e.g. `beiratkozas2627`).

## Outgoing webhook payload

Fired on `registration`, `payment`, and `reminder` events to the configured URL:

```json
{
  "event": "payment",
  "term_id": "...",
  "applicant": {
    "id": "...",
    "child_name": "Kovács Péter",
    "parent_name": "Kovács János",
    "email": "kovacs.janos@example.com",
    "paid": 1,
    "created_at": 1700000000000
  },
  "timestamp": 1700000000000
}
```
