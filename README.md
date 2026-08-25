# MenuSheet

QR-code digital menu SaaS for restaurants — **₹100/month**. Owners manage their menu in
their own Google Sheet; customers scan a QR code and get a fast, branded menu page.
No backend server anywhere: Google Sheets is the database, Apps Script is the API,
a Cloudflare Worker is the only cron logic, and Cloudflare Pages serves a fully static
Next.js export with free unlimited bandwidth.

## Architecture

```
Restaurant Sheet ──Apps Script──► /r/{id} page (static export + live client fetch)
Admin Sheet ──Admin Apps Script──► Admin Dashboard (Supabase Auth + allow-list)
                ▲                        │
                └── Cloudflare Worker ───┘   (daily 00:00 IST reconciliation cron)
```

- **Public pages** are pre-rendered at build time from `data/` snapshots; after load,
  the browser fetches `?action=getMenu` from the restaurant's own Apps Script with a
  localStorage cache (6 h TTL) so repeat QR scans never hit quota.
- **Billing state** lives in the Admin Sheet (source of truth). The Worker reconciles
  every restaurant's Settings tab nightly and auto-deactivates expired accounts.
- **Admin Dashboard** (`/admin`, unlisted + noindex) uses Supabase Authentication with a
  hard email allow-list. The Supabase SDK is code-split into admin chunks only.

```
├── app/                     # Next.js App Router (output: 'export')
│   ├── page.tsx             # Landing (marketing)
│   ├── r/[id]/page.tsx      # Public themed menu pages
│   ├── sitemap.ts robots.ts # SEO plumbing (admin excluded)
│   └── admin/               # Login + protected dashboard (route group)
├── components/              # Landing/admin/public components
├── themes/                  # Per-restaurant theme modules (+ demo)
├── lib/                     # Auth, admin API, caching, types
├── data/                    # Build-time manifest + menu snapshots (committed seed)
├── scripts/generate-static-data.js   # prebuild sync from Admin Sheet
├── apps-script/             # restaurant-template.gs + admin.gs
├── cloudflare-worker/       # nightly reconciliation cron (Wrangler project)
└── docs/                    # onboarding checklist + sheet templates
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (see file comments)
npm run dev                  # http://localhost:3000 — demo restaurant works with no env
```

`/r/demo` renders "The Green Fork" from the committed fixture
(`data/menus/demo.json`) without any Google setup.

## Deploy

```bash
npm run deploy
```

`prebuild` pulls fresh data from your Admin Sheet when `ADMIN_APPS_SCRIPT_URL` +
`SHARED_SECRET` are set (falls back to committed data otherwise). New restaurants or
themes require this redeploy; day-to-day menu edits do not.

## Ops docs

- [`docs/onboarding-checklist.md`](docs/onboarding-checklist.md) — full runbook:
  platform setup, per-restaurant onboarding, renewals, SHARED_SECRET rotation.
- [`themes/README.md`](themes/README.md) — theme generation prompt template.
- [`cloudflare-worker/`](cloudflare-worker/) — Wrangler project (`30 18 * * *` = 00:00 IST).
