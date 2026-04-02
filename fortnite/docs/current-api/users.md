# Users & account lookup

These routes use the **service account** token from KV (`SERVICE_ACCOUNT_ID` must be set and authenticated). They do **not** take `auth_account_id` as a query parameter.

Upstream: Epic **User Search Service** (`/api/v1/search/...`) — see [SearchUsers.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/UserSearchService/SearchUsers.md).

## Search by name prefix

`GET /user/search`

| Query | Required | Description |
|-------|----------|-------------|
| `username` or `displayName` | Yes | Prefix to search (Epic “prefix” semantics) |
| `platform` | No | `epic` (default), `psn`, `xbl`, `steam`, `nsw` |

### Example

```bash
curl -sS "https://fapi.gdb.gg/user/search?username=jyml&platform=epic"
```

### Response shape

Array of hits (normalized):

```json
[
  {
    "accountId": "956f46275d1c45949038ee0017190934",
    "displayName": "jyml",
    "matchType": "exact",
    "raw": { }
  }
]
```

- `displayName` prefers the **epic** platform match when present; otherwise the first match.
- `raw` is the Epic row as returned (for debugging or future fields).

On success, the Worker may **upsert** `account_id` / `display_name` into D1 (`player_profiles`) for caching; failures to write do not fail the HTTP response.

## Exact display name (Account Service)

`GET /account/displayName/{displayName}`

Epic exact match on display name. `{displayName}` should be URL-encoded if it contains special characters.

```bash
curl -sS "https://fapi.gdb.gg/account/displayName/Ninja"
```

## Bulk lookup by Epic account ids

`GET /account/bulk?accountId=...&accountId=...`

Repeat `accountId` for each id.

```bash
curl -sS "https://fapi.gdb.gg/account/bulk?accountId=956f46275d1c45949038ee0017190934"
```

## Single account by id

`GET /user/{accountId}`

```bash
curl -sS "https://fapi.gdb.gg/user/956f46275d1c45949038ee0017190934"
```

## External auths (linked platforms)

`GET /user/{accountId}/externalAuths`

```bash
curl -sS "https://fapi.gdb.gg/user/956f46275d1c45949038ee0017190934/externalAuths"
```

## Profile bundle (next step)

After you have an `accountId`, load **stats + ranked** in one call:

`GET /v1/profile/{accountId}` — see [profile.md](./profile.md).

## Errors

| Condition | Typical response |
|-----------|------------------|
| `SERVICE_ACCOUNT_ID` not configured | `503` with setup message |
| No tokens in KV for service account | `401` / error body: authenticate via `/admin/auth` |
| Epic API error | `500` with Epic message snippet |
