# NEXUS Trade & Enterprise — Milestone 1 (Foundation)

**Powered by CYRABELL.** Config-driven industrial trading & business-management platform.
This package is **Milestone 1: Foundation** — the architecture, auth, the 9-step mutation
pipeline, and the config-driven CRUD engine, proven end-to-end on the **Products** module.
Milestones M2–M7 extend this same foundation (see the milestone kickoffs).

## What's in here
```
backend/
  Helpers.gs   — sheet ops, locking, idempotency, Config/License/Permission/
                 Validation/Transition/Audit/EventLog/Alarm services
  Code.gs      — routing, Google ID-token auth, 9-step pipeline, generic CRUD,
                 setup(), installTriggers()
worker/
  worker.js    — Cloudflare Worker CORS proxy (browser ↔ Apps Script)
frontend/      — Vite + React 18 shell (builds clean: 100 modules, ~83 kB gzip)
  src/lib/api.js          — envelope-unwrapping axios client
  src/context/            — ConfigContext (sets --color-primary), AuthContext
  src/components/         — Logo, Navbar, DataTable, DynamicForm
  src/screens/            — Login (Google), Dashboard, ModuleScreen (generic CRUD)
.github/workflows/deploy.yml — GitHub Pages deploy
SMOKE_TESTS.md             — 12 checks proving the foundation
```

## Deploy order
1. **Sheets + Apps Script.** Create a Google Sheet. Extensions → Apps Script. Paste
   `Helpers.gs` and `Code.gs`. Run `setup()` once (authorize when prompted).
2. **Config.** In the Sheet's Config tab set: `AdminEmail` (your Google email),
   `GoogleOAuthClientId`, `AllowedOrigin` (your GH Pages origin), `AppsScriptUrl` (filled after step 3).
3. **Deploy web app.** Deploy → New deployment → Web app → Execute as *me*, access *Anyone*.
   Copy the `/exec` URL into Config.AppsScriptUrl and into `worker/worker.js`.
4. **Cloudflare Worker.** Set `APPS_SCRIPT_URL` and `ALLOWED_ORIGIN` in `worker.js`; `wrangler deploy`.
5. **Frontend.** Set build env `VITE_API_BASE` (Worker URL) and `VITE_GOOGLE_CLIENT_ID`.
   `cd frontend && npm ci && npm run build`. Push to `main`; the workflow publishes to Pages.
6. **Verify.** Run `SMOKE_TESTS.md`.

## Design notes
- Primary colour comes from `Config.PrimaryColor` → `--color-primary` (change without rebuild).
- Forms render from the `FormFields` sheet via `/api/meta/form-fields` — add a field, no code change.
- Every mutation: authenticate → authorize → license → validate → lock → execute → audit →
  event log → (workflow, M6) → envelope response.

## Next
Feed milestone kickoff **M2 (Trading & Procurement)** to extend `ROUTE_TO_SHEET_`,
add Inventory/Warehouses + the reserve/deduct-under-lock logic, and the RFQ→quote→order flow.
The foundation does not change.
