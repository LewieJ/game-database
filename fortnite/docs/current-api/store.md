# Item shop / store (Epic + optional enriched BR)

Public routes backed by the Worker **service account** (Epic) and/or **fortnite-api.com**. Responses are **heavily cached** to limit upstream traffic.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | **`/v1/store`** | Same as **`/v1/store/catalog`**. Epic **`/fortnite/api/storefront/v2/catalog`** (raw storefront JSON). |
| GET | **`/v1/store/catalog`** | Alias of `/v1/store`. |
| GET | **`/v1/store/br`** | Primary: [fortnite-api.com](https://fortnite-api.com) **`/v2/shop/br`** (BR shop with images/metadata). On failure, same body as Epic **`/v1/store`**, plus `note`. |
| GET | `/fortnite/shop` | Legacy; same payload and cache as **`/v1/store`**. |
| GET | `/fortnite/catalog` | Legacy; same as **`/fortnite/shop`**. |
| GET | `/fortnite/shop/enriched` | Legacy; same behavior as **`/v1/store/br`**. |

## Caching

1. **Workers KV** (`env.TOKENS`): **6 hours** TTL for both Epic catalog and enriched BR JSON (`src/api/store-catalog.js`: `EPIC_STORE_KV_TTL_SEC`, `ENRICHED_BR_SHOP_KV_TTL_SEC`). Keys are versioned (`v2`) so you can bump TTL or shape without colliding with old entries.
2. **HTTP `Cache-Control`**: `public, max-age=120, s-maxage=7200, stale-while-revalidate=14400` — short browser cache, **2h** shared (CDN) max-age, SWR for resiliency.

## Response hints

Every success body includes:

- **`cached`** — `true` if served from KV (still within TTL).
- **`cache_age_minutes`** — age of the KV entry used.
- **`_fapi`** — `source`, `kv_hit`, `kv_ttl_seconds`, `cached_at` (ISO).

Epic catalog may also include **`_metadata`** from the client (`lastModified`, `eTag`, etc.).

## Requirements

- **`SERVICE_ACCOUNT_ID`** must be set for Epic-backed routes (same as profile/search). Enriched-only path still needs Epic for fallback when fortnite-api.com fails.

## Examples

```bash
curl -sS "https://fapi.gdb.gg/v1/store"
curl -sS "https://fapi.gdb.gg/v1/store/br"
```

## Upstream reference

- Epic storefront: [FortniteEndpointsDocumentation — Storefront](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/Fortnite/Storefront)
