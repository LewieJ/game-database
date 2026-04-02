# Fortnite API — current reference (post-testing)

Single source of truth for **verified** public Worker routes. Implementation details live in `src/index.js` and `src/api/`.

## Hand off to frontend (basic review)

Share **this entire folder** (`docs/current-api/`): it is the up-to-date contract for the rebuilt API.

| Read first | Why |
|------------|-----|
| [users.md](./users.md) | Search → `accountId`, lightweight account routes |
| [profile.md](./profile.md) | **`GET /v1/profile/{accountId}`** — stats summary, ranked current + historical, query flags |
| [auth.md](./auth.md) | Only if they operate the Worker (Epic login, secrets). **App developers** calling **`https://fapi.gdb.gg`** only need the routes above; auth is server-side. |

**Minimal integration path:** `GET /user/search?username=…` → `GET /v1/profile/{accountId}` (32-hex id from search). Handle **`meta.partial`** and **`meta.errors`** when any slice fails.

## Base URLs

| Environment | URL |
|-------------|-----|
| **Production (custom domain)** | `https://fapi.gdb.gg` |
| Workers.dev (same deployment) | `https://fortnite-api.lewie.workers.dev` |

All paths below are relative to the base (e.g. `GET https://fapi.gdb.gg/health`).

## Documents in this folder

| File | Topic |
|------|--------|
| [auth.md](./auth.md) | Epic OAuth, service account, token refresh |
| [users.md](./users.md) | User search, account lookup |
| [profile.md](./profile.md) | **`GET /v1/profile/{accountId}`** — stats + ranked bundle |

## Epic upstream reference

Community route documentation: [FortniteEndpointsDocumentation — EpicGames](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames).

## Adding new endpoints

When you validate a route in production:

1. Add or extend a markdown file under `docs/current-api/`.
2. Link it from this README.
3. Avoid duplicating the same curl blocks in root-level `*.md` files.
