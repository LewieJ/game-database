# Competitive calendar & event viewer (gdb.gg site)

The **Fortnite Worker** (`fapi.gdb.gg`) no longer proxies MyFortniteStats tournament JSON or leaderboards. The **static site** loads schedule, CMS artwork, and standings through a **same-origin** Pages Function so the browser never calls `myfortnitestats.com` directly (avoids CORS).

---

## Same-origin proxy (`/mfs/*`)

Implemented at repo root: `functions/mfs/[[path]].js` (Cloudflare Pages). **GET/HEAD only.**

| Path | Upstream |
|------|----------|
| **`/mfs/events-data`** | `https://myfortnitestats.com/api/events-data` |
| **`/mfs/cms-data`** | `https://myfortnitestats.com/api/cms-data` |
| **`/mfs/event-leaderboard`** | `https://myfortnitestats.com/api/event-leaderboard` (query string forwarded) |

**Leaderboard query params:** `eventId`, `sessionId` (Epic **`eventWindowId`**), `page` (0-based), `pageSize`.

---

## Frontend pages

- **`fortnite/events.html`** — Fetches **`/mfs/events-data`** and **`/mfs/cms-data`** in parallel, merges into the same shape as the old “combined” payload (`schedule`, `cms_by_display_id`), then flattens windows for the cards UI.
- **`fortnite/event.html`** — Loads calendar via the same two endpoints, finds the parent **`eventId`** in **`schedule.events`**, merges CMS copy/images, and loads the table with **`/mfs/event-leaderboard`**. Display names fall back to **“Player”** when Epic resolution is not available (the Worker used bulk account lookup; that path was removed).

---

## Local development

- Plain static **`serve`** does **not** execute Pages Functions — **`/mfs/*` will 404**.
- Use **`npx wrangler pages dev .`** from the **game-database** repo root so **`/mfs`** proxies work while editing **`fortnite/*.html`**.

---

## Combined payload (client merge)

Match keys used in **`fortnite/events.html`** / **`event.html`**:

```text
data.schedule          ← raw events-data JSON
data.assets            ← raw cms-data JSON
data.cms_by_display_id ← map tournament_display_id → CMS row
```

Join rule: for each entry in **`data.schedule.events`**, read **`displayDataId`** and look up **`data.cms_by_display_id[displayDataId]`** when present.

---

## Other gdb.gg pages

Shop, profile, CCU, and user search may still call **`https://fapi.gdb.gg`**; only **competitive calendar / tournament viewer** traffic was moved off the Worker as described here.
