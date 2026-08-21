# Beiratkozás — Gigászok Sportegyesület

Beiratkozáskezelő rendszer a Gigászok Sportegyesület számára. A szülők egy OpnForm űrlapon jelentkeznek; az adatok n8n-en keresztül transzformálva érkeznek be webhookon, az adminisztrátor pedig a dashboardon nyomon követi a befizetéseket és triggereli a további automatizációkat.

## Folyamat

```
OpnForm (regisztrációs űrlap)
    ↓
n8n (adat-transzformáció, validáció)
    ↓
POST /webhooks/:slug  →  tárolt jelentkező (child_name, parent_name, email)
    ↓
Admin dashboard
    ├── manuális befizetés-rögzítés
    └── banki kivonat CSV feltöltés  →  automatikus párosítás
            ↓
        befizetés detektálva
            ├── email értesítés a szülőnek
            └── kimenő webhook  →  n8n / bérletrendszer / egyéb automatizáció
```

## Funkciók

- **Turnuskezelés** — több beiratkozási időszak párhuzamosan (pl. 2025/26, 2026/27), mindegyik saját webhook slug-gal
- **OpnForm + n8n integráció** — a rendszer egy publikus webhook endpointot biztosít; az n8n workflow az OpnForm adatokat transzformálja és hívja meg
- **Befizetés-követés kétféleképpen**
  - Manuálisan: az admin a dashboardon egyenként állítja be
  - Automatikusan: banki kivonat CSV feltöltésével — az átutalás közleménye (`Adomány - <gyerek neve>`) alapján O(n) Map-kereséssel párosítja a jelentkezőkkel
- **Email értesítések** — beiratkozás visszaigazolása, befizetés visszaigazolása, emlékeztető (tömeges vagy egyéni), egyedi broadcast (szűrve: mindenki / befizető / nem fizető)
- **Testreszabható email sablonok** — turnus-specifikus tárgy, szöveg és borítókép; változók: `{child_name}`, `{parent_name}`, `{bank_adatok}`
- **Kimenő webhookok** — a `registration`, `payment` és `reminder` eseményekre tetszőleges URL hívható (pl. n8n workflow a bérletrendszerhez), opcionális auth headerrel
- **Admin auth** — PocketID OIDC/OAuth2, HS256 JWT

## Tech stack

| Réteg | Technológia | Miért |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Beépített HTTP szerver, SQLite driver, TypeScript bundler — nincs Express, nincs Webpack |
| Adatbázis | `bun:sqlite` (raw SQL) | Függőségmentes, single-file, elegendő erre a skálára |
| Frontend | React 19 + [Mantine 7](https://mantine.dev) | Modals, notifications, form primitívek egy helyen |
| State | [Zustand](https://zustand.docs.pmnd.rs) | Minimális store-ok; cross-store hozzáférés `getState()`-en át |
| Email | Nodemailer + pooled SMTP | HTML email inline CID mellékletekkel (logó/footer/opcionális banner) |
| Auth | [PocketID](https://github.com/stonith404/pocket-id) | Self-hosted OIDC provider |
| Deploy | Docker (multi-stage) | Bun egyetlen statikus binárisba fordít; a végső image `debian:bookworm-slim` |

## Projekt struktúra

```
backend/
  index.ts              # Bun.serve() belépési pont, globális hibakezelő
  db.ts                 # SQLite init, migrációk, megosztott query helperek
  schema.ts             # TypeScript típusok + const tömbök (single source of truth)
  config.ts             # Típusos .env olvasó
  middleware.ts         # requireAuth() — AuthError-t dob hiba esetén
  auth.ts               # JWT sign/verify, PocketID OIDC flow
  payment.ts            # handlePaymentConfirmed() — email + webhook mellékhatások
  email_log.ts          # logEmail() megosztott utility
  csv.ts                # Pure CSV parsing (nincs I/O, nincs DB)
  webhook_caller.ts     # fireWebhook() — kimenő webhook dispatcher
  email/
    renderer.ts         # Pure sablon-interpolációs függvények
    templates.ts        # Alapértelmezett email sablonok
    assets.ts           # Logó/footer buffer betöltés + banner cache
    transport.ts        # Nodemailer pooled transporter
    send.ts             # sendRegistrationEmail / sendReminderEmail / …
  routes/
    auth.ts             # /api/auth/*
    terms.ts            # /api/terms CRUD
    applicants.ts       # Jelentkező CRUD + email napló
    messaging.ts        # Broadcast, tömeges emlékeztető, egyéni emailek
    csv_import.ts       # POST /api/terms/:id/csv
    email_templates.ts  # Sablon GET/PUT/DELETE + banner feltöltés
    outgoing_webhooks.ts
    webhook.ts          # POST /webhooks/:slug — publikus bejövő webhook

frontend/
  index.tsx             # React gyökér — MantineProvider, ModalsProvider, Notifications
  types.ts              # Frontend típusok (tükrözi a backend sémát)
  lib/
    api.ts              # apiFetch() — auth header + 401 → logout kezelés
    utils.ts            # formatDate()
  stores/               # Zustand store-ok (domain-enként egy)
  modules/dashboard/    # Fő UI: header, stats bar, jelentkezők táblázat, összes modal
```

## Adatmodell

```sql
terms              id, name, slug (unique), active, webhook_secret, created_at
admins             id, pocketid_sub, name, email, created_at
applicants         id, term_id, child_name, parent_name, email, raw_json, paid, created_at
email_logs         id, applicant_id, type, sent_at
email_templates    id, term_id, type, subject, body, banner_path, created_at
outgoing_webhooks  id, term_id, event, url, auth_header, created_at
```

Indexek: `idx_applicants_term(term_id, paid)`, `idx_email_logs_applicant(applicant_id)`.

## Helyi futtatás

**Előfeltételek:** [Bun](https://bun.sh/docs/installation) ≥ 1.1, futó [PocketID](https://github.com/stonith404/pocket-id) példány, SMTP szerver.

```bash
git clone https://github.com/nicovok/gigaszok-enrollment
cd gigaszok-enrollment
bun install
cp .env.example .env   # töltsd ki az értékeket
bun run dev            # hot reload, :3000
```

### Környezeti változók

| Változó | Leírás |
|---|---|
| `PORT` | HTTP port (alapértelmezett: `3000`) |
| `POCKETID_CLIENT_ID` | OAuth2 client ID a PocketID-ból |
| `POCKETID_CLIENT_SECRET` | OAuth2 client secret |
| `POCKETID_REDIRECT_URI` | `https://<host>/api/auth/callback` |
| `JWT_SECRET` | HS256 aláíró kulcs (min. 32 karakter) |
| `SMTP_HOST` | SMTP szerver hostname |
| `SMTP_PORT` | SMTP port |
| `SMTP_USR` | SMTP felhasználónév |
| `SMTP_PASS` | SMTP jelszó |
| `EMAIL_FROM` | Feladó email cím |
| `DB_PATH` | SQLite fájl elérési útja (alapértelmezett: `beiratkozas.db`) |
| `DATA_DIR` | Feltöltött banner képek könyvtára |

### Email képek

Helyezd el a következő képeket a `backend/` könyvtárban:

| Fájl | Szerepe |
|---|---|
| `email-logo.png` | Az email fejlécében jelenik meg, ha nincs egyedi banner beállítva |
| `email-footer.png` | Minden kimenő emailbe bekerül footer képként |

## Deploy

```bash
# Egyetlen statikus bináris
bun build --compile backend/index.ts --outfile beiratkozas

# Vagy Docker-rel
docker compose up -d
```

A Docker image Bun builder stage-ben fordítja a binárist, majd `debian:bookworm-slim` runtime image-be másolja — a végső konténerben nincs sem Node, sem Bun.

A frontend a Bun által induláskor kerül bundle-ölésre és a binárisból kerül kiszolgálásra SPA-ként.

## Bejövő webhook (n8n → rendszer)

`POST /webhooks/:slug` — publikus, auth nem szükséges.

Az n8n workflow az OpnForm adatokat transzformálja és ebben a formátumban hívja:

```json
{
  "child_name": "Kovács Péter",
  "parent_name": "Kovács János",
  "email": "kovacs.janos@example.com"
}
```

A teljes payload `raw_json` mezőben tárolódik. A `slug` az adott turnushoz tartozó egyedi azonosító (pl. `beiratkozas2627`).

## Kimenő webhook payload

Minden `registration`, `payment` és `reminder` eseményre a beállított URL-re kerül kiküldésre:

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
