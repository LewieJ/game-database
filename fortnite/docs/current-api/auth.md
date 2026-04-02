# Authentication

The Worker uses Epic’s **authorization code** flow with the public **Fortnite PC** OAuth client. Tokens are stored in **KV** (`TOKENS` binding). API routes that call Epic use the **service account** configured on the Worker.

## Prerequisites

- `EPIC_CLIENT_ID` — set in `wrangler.toml` (public Fortnite PC client id).
- `EPIC_CLIENT_SECRET` — `wrangler secret put EPIC_CLIENT_SECRET` (never commit).
- `SERVICE_ACCOUNT_ID` — Epic account id of the user you authenticate as the bot (must match the account used in `/admin/auth`).
- After first auth, tokens are keyed as `token:{SERVICE_ACCOUNT_ID}` in KV.

## Discover login URL

`GET /auth/epic` or `GET /auth/epic/authorize-url`

Returns `authorization_url` (open in browser while signed into Epic), plus hints for token exchange.

## Exchange code (per-user tokens)

`POST /auth/code`  
Body: `{ "code": "<authorizationCode>", "code_verifier": "<optional PKCE>" }`

Stores tokens under the authenticated Epic `account_id`.

## Service account (recommended for public API routes)

`POST /admin/auth`  
Body: `{ "code": "<authorizationCode>", "code_verifier": "<optional>" }`

- Stores tokens for the signed-in Epic user.
- If `SERVICE_ACCOUNT_ID` is already set in the Worker, the authenticated account **must** match it.

Then ensure `SERVICE_ACCOUNT_ID` in `wrangler.toml` (or dashboard) equals the returned `service_account_id`, and redeploy if you change it.

## Status and manual refresh

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/status` | Token / expiry metadata (no secrets) |
| POST | `/admin/token/refresh` | Runs the same refresh path as real traffic (access token refreshed when near expiry) |

## Auto-refresh behaviour

- **On request:** Before Epic calls, `getValidToken` refreshes the access token if it expires within ~5 minutes.
- **Cron:** With `[triggers]` enabled, a scheduled run calls `getServiceToken()` every 15 minutes so tokens stay warm without traffic.
- **Heavy jobs** (profiles, CCU, crawlers) run only when `CRON_HEAVY=true`.

## Examples

```bash
curl -sS "https://fapi.gdb.gg/auth/epic"
curl -sS -X POST "https://fapi.gdb.gg/admin/auth" \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_SINGLE_USE_CODE"}'
curl -sS "https://fapi.gdb.gg/admin/status"
```
