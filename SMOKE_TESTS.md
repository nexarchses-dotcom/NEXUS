# NEXUS Trade & Enterprise — M1 Smoke Tests (Foundation)

These prove the foundation end-to-end on the **Products** module. Run after deploying the
Apps Script web app + Cloudflare Worker and running `setup()`.

> Replace `WORKER` with your Cloudflare Worker URL and `TOKEN` with the session token returned
> by login. All responses follow the envelope `{ success, data, error, meta }` and always return
> HTTP 200 — check `success`, not the status code.

## 0. Prerequisites
1. In the Apps Script editor, run `setup()` once. Confirm 18 sheets created with headers and a
   SuperAdmin user row exists for your `AdminEmail`.
2. Set `Config.GoogleOAuthClientId`, `Config.AllowedOrigin`, `Config.AppsScriptUrl`.
3. Deploy the web app (Execute as me / Anyone). Paste its `/exec` URL into `worker.js`
   (`APPS_SCRIPT_URL`) and set `ALLOWED_ORIGIN`. Deploy the Worker.
4. Run `installTriggers()` (optional in M1; agents are stubs until M6).

## 1. Public config — secrets allowlist (Section 0.10)
```bash
curl -s "WORKER/api/config"
```
**Expect:** `success:true`; `data` contains only `AppName, PrimaryColor, CustomerPortalEnabled,
DefaultCurrency, feature_registration_open, use_rbac`. **Must NOT** contain `TwilioSID`,
`GoogleCloudAPIKey`, `AdminEmail`, or any token.

## 2. Auth — Google ID token → session
Obtain a Google ID token by signing in through the deployed frontend (the `GoogleLogin` button),
or post one directly:
```bash
curl -s -X POST "WORKER/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"idToken":"<GOOGLE_ID_TOKEN>"}'
```
**Expect:** `success:true`, `data.token` present. An unknown email → `UNAUTHENTICATED`.
Save the token as `TOKEN`.

## 3. Identity + permissions
```bash
curl -s "WORKER/api/me" -H "Authorization: Bearer TOKEN"
```
**Expect:** your user, `roleIds` includes the SuperAdmin role, `modules` lists `*` or `Products`.

## 4. Form schema is config-driven (the keystone)
```bash
curl -s "WORKER/api/meta/form-fields?module=Products" -H "Authorization: Bearer TOKEN"
```
**Expect:** the 7 seeded Products fields (name, category, description, unit, minOrderQty,
priceRange, isActive). **Add a row to the FormFields sheet and re-run — the new field appears
with no code change.** That proves the promise.

## 5. CREATE — full 9-step pipeline
```bash
curl -s -X POST "WORKER/api/products" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Class F Fly Ash","category":"Cement Additives","unit":"MT","minOrderQty":25,"isActive":"true"}'
```
**Expect:** `success:true`, `data.recordId` is a UUID. Then verify side effects:
- **Products** sheet has the new row.
- **AuditTrail** sheet has a `create` row for `Products` with the recordId.
- **EventLog** sheet has a `CREATED` row for `Products`.

## 6. VALIDATION — required field rejected
```bash
curl -s -X POST "WORKER/api/products" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"No name here"}'
```
**Expect:** `success:false`, `error.code:"VALIDATION_FAILED"`, `error.fields.name` present.

## 7. LIST + pagination
```bash
curl -s "WORKER/api/products?pageSize=10&page=1" -H "Authorization: Bearer TOKEN"
```
**Expect:** `data` is an array; `meta` has `page, pageSize, total, hasMore`.

## 8. READ single
```bash
curl -s "WORKER/api/products/<RECORD_ID>" -H "Authorization: Bearer TOKEN"
```
**Expect:** the single record. Unknown id → `NOT_FOUND`.

## 9. UPDATE
```bash
curl -s -X PUT "WORKER/api/products/<RECORD_ID>" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"priceRange":"₱3,200–₱3,800 / MT"}'
```
**Expect:** `success:true`; AuditTrail gets an `update` row with `oldValue`/`newValue`.

## 10. Idempotency
Send the same CREATE twice with a header `Idempotency-Key: test-123`:
```bash
curl -s -X POST "WORKER/api/products" -H "Authorization: Bearer TOKEN" \
  -H "Idempotency-Key: test-123" -H "Content-Type: application/json" \
  -d '{"name":"Idempotent Item","unit":"PC","minOrderQty":1,"isActive":"true"}'
```
**Expect:** second call does not create a duplicate row (returns the prior result).

## 11. DELETE
```bash
curl -s -X DELETE "WORKER/api/products/<RECORD_ID>" -H "Authorization: Bearer TOKEN"
```
**Expect:** `success:true`; row gone; AuditTrail + EventLog record the delete.

## 12. RBAC (optional, with use_rbac=true)
Create a Viewer user, sign in, attempt a CREATE → expect `FORBIDDEN`. A GET → succeeds.

---

### Definition of Done — M1
- [ ] All 12 checks pass.
- [ ] Every mutation writes AuditTrail **and** EventLog.
- [ ] Public config never leaks a secret.
- [ ] Adding a FormFields row changes the Products form with no redeploy.
- [ ] Frontend builds (`npm run build`) and the Products screen performs create/edit/delete.
