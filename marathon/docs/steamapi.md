# Marathon Steam Player Tracker — Frontend Integration Guide

**Base URL:** `https://steam.marathondb.gg`

All endpoints return JSON with CORS enabled (`Access-Control-Allow-Origin: *`).
Responses are cached for 60 seconds (`Cache-Control: public, max-age=60`).

---

## Tracked Apps

| Key | Steam App ID | Label | Notes |
| --- | ------------ | ----- | ----- |
| `marathon` | 3065800 | Marathon | Main game (parent app — currently returns no player data from Steam) |
| `demo` | 4254230 | Marathon Demo | **Active playtest** — this is where all player count data comes from |

Every endpoint (except `GET /`) accepts the **`?app=`** query parameter:

| Value | Behaviour |
| ----- | --------- |
| `marathon` | Filter to app 3065800 **(default)** |
| `demo` | Filter to app 4254230 |
| `all` | Return combined data from both apps |

> **Tip:** Since players are tracked under the demo app ID, use `?app=demo` for all player-count queries until Valve migrates counts to the main app.

---

## Endpoints

### `GET /`

API overview and health check. Returns metadata, tracked apps, the latest snapshot, all-time peak, and available endpoints.

**Response:**

```json
{
  "api": "Marathon Player Tracker",
  "game": "Marathon (Bungie)",
  "tracked_apps": {
    "marathon": { "steam_app_id": 3065800, "label": "Marathon" },
    "demo": { "steam_app_id": 4254230, "label": "Marathon Demo" }
  },
  "description": "Hourly Steam player count snapshots for charting player population.",
  "total_snapshots": 142,
  "latest_snapshot": {
    "app_id": 4254230,
    "player_count": 142237,
    "timestamp": 1772135136,
    "recorded_at": "2026-02-26 19:45:36"
  },
  "all_time_peak": {
    "app_id": 4254230,
    "player_count": 142237,
    "timestamp": 1772135136,
    "recorded_at": "2026-02-26 19:45:36"
  },
  "endpoints": {
    "GET /current": "Most recent player count snapshot. Params: app (marathon|demo|all, default marathon)",
    "GET /history": "Historical snapshots. Params: app, hours (default 24), days, from, to, limit",
    "GET /stats": "Aggregate stats (peak, low, average). Params: app, hours, days, from, to",
    "GET /peak": "All-time peak snapshot. Params: app"
  }
}
```

---

### `GET /current`

Returns the most recent player count snapshot.

**Query Parameters:**

| Param | Type   | Default    | Description |
| ----- | ------ | ---------- | ----------- |
| `app` | string | `marathon` | `marathon`, `demo`, or `all` |

**Response:**

```json
{
  "app_id": 4254230,
  "player_count": 142237,
  "timestamp": 1772135136,
  "recorded_at": "2026-02-26 19:45:36"
}
```

| Field          | Type    | Description                                  |
| -------------- | ------- | -------------------------------------------- |
| `app_id`       | integer | Steam App ID this snapshot belongs to        |
| `player_count` | integer | Number of concurrent Steam players           |
| `timestamp`    | integer | Unix timestamp (seconds) when collected      |
| `recorded_at`  | string  | Datetime when the row was inserted (UTC)     |

**Errors:**

| Status | Meaning               |
| ------ | --------------------- |
| 404    | No data collected yet |

---

### `GET /history`

Returns historical snapshots within a time window (newest first).

**Query Parameters:**

| Param   | Type    | Default    | Description                                          |
| ------- | ------- | ---------- | ---------------------------------------------------- |
| `app`   | string  | `marathon` | `marathon`, `demo`, or `all`                         |
| `hours` | integer | `24`       | Return data from the last N hours (1–8760)           |
| `days`  | integer | —          | Return data from the last N days (1–365). Overrides `hours` |
| `from`  | integer | —          | Unix timestamp (seconds) — start of custom range     |
| `to`    | integer | now        | Unix timestamp (seconds) — end of custom range       |
| `limit` | integer | `10000`    | Max rows to return (1–10 000)                        |

> **Priority:** `from`/`to` > `days` > `hours`

**Examples:**

```
GET /history?app=demo                         → last 24 hours, demo
GET /history?app=demo&hours=48                → last 48 hours, demo
GET /history?app=demo&days=7                  → last 7 days, demo
GET /history?app=all&days=30&limit=500        → last 30 days, both apps, max 500 rows
GET /history?app=demo&from=1771819200&to=1771906800  → custom range
```

**Response:**

```json
{
  "app_id": 4254230,
  "count": 24,
  "from_timestamp": 1772048736,
  "to_timestamp": 1772135136,
  "data": [
    {
      "app_id": 4254230,
      "player_count": 142237,
      "timestamp": 1772135136,
      "recorded_at": "2026-02-26 19:45:36"
    },
    {
      "app_id": 4254230,
      "player_count": 138500,
      "timestamp": 1772131200,
      "recorded_at": "2026-02-26 18:00:00"
    }
  ]
}
```

> When `?app=all`, the top-level `app_id` is `"all"` and each item in `data` has its own `app_id`.

---

### `GET /stats`

Returns aggregate statistics (peak, low, average) over a time window. Accepts the same time and app parameters as `/history`.

**Query Parameters:** Same as `/history` (`app`, `hours`, `days`, `from`, `to`).

**Response:**

```json
{
  "app_id": 4254230,
  "window": {
    "from_timestamp": 1772048736,
    "to_timestamp": 1772135136
  },
  "peak": 142237,
  "low": 98000,
  "average": 120000,
  "data_points": 24,
  "all_time_peak": {
    "player_count": 142237,
    "timestamp": 1772135136,
    "recorded_at": "2026-02-26 19:45:36"
  }
}
```

| Field            | Type         | Description                                |
| ---------------- | ------------ | ------------------------------------------ |
| `app_id`         | int/string   | Steam App ID or `"all"`                    |
| `window`         | object       | The resolved time window                   |
| `peak`           | integer/null | Highest player count in window             |
| `low`            | integer/null | Lowest player count in window              |
| `average`        | integer/null | Rounded average player count               |
| `data_points`    | integer      | Number of snapshots in window              |
| `all_time_peak`  | object       | The single highest snapshot ever recorded  |

---

### `GET /peak`

Returns the all-time peak player count snapshot.

**Query Parameters:**

| Param | Type   | Default    | Description |
| ----- | ------ | ---------- | ----------- |
| `app` | string | `marathon` | `marathon`, `demo`, or `all` |

**Response:**

```json
{
  "app_id": 4254230,
  "player_count": 142237,
  "timestamp": 1772135136,
  "recorded_at": "2026-02-26 19:45:36"
}
```

**Errors:**

| Status | Meaning               |
| ------ | --------------------- |
| 404    | No data collected yet |

---

## Frontend Usage Examples

### Fetch current player count (vanilla JS)

```js
const BASE = 'https://steam.marathondb.gg';

const res = await fetch(`${BASE}/current?app=demo`);
const data = await res.json();
console.log(`${data.player_count.toLocaleString()} players online`);
```

### Fetch both apps at once

```js
const [marathon, demo] = await Promise.all([
  fetch(`${BASE}/current?app=marathon`).then(r => r.ok ? r.json() : null),
  fetch(`${BASE}/current?app=demo`).then(r => r.json()),
]);

const totalPlayers = (marathon?.player_count ?? 0) + (demo?.player_count ?? 0);
```

### Build a chart with 7 days of data

```js
const res = await fetch(`${BASE}/history?app=demo&days=7`);
const { data } = await res.json();

// data is newest-first; reverse for chronological charting
const chronological = data.reverse();

const labels = chronological.map(d =>
  new Date(d.timestamp * 1000).toLocaleDateString()
);
const values = chronological.map(d => d.player_count);

// Feed labels + values into Chart.js, Recharts, D3, etc.
```

### Dashboard stats card

```js
const res = await fetch(`${BASE}/stats?app=demo&days=30`);
const stats = await res.json();
// stats.peak, stats.low, stats.average, stats.data_points
```

### React hook example

```jsx
import { useState, useEffect } from 'react';

function usePlayerCount(app = 'demo') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://steam.marathondb.gg/current?app=${app}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [app]);

  return { data, loading };
}

export default function PlayerBadge() {
  const { data, loading } = usePlayerCount('demo');
  if (loading) return <span>Loading…</span>;
  return <span>{data.player_count.toLocaleString()} online</span>;
}
```

---

## Data Collection

- Player counts are collected **hourly** (every hour at :00) via a Cloudflare Worker cron trigger.
- Source: [Steam GetNumberOfCurrentPlayers API](https://partner.steamgames.com/doc/webapi/ISteamUserStats#GetNumberOfCurrentPlayers)
- **Tracked apps:** Marathon (3065800) and Marathon Demo (4254230)
- Data is stored in Cloudflare D1 (SQLite) with an `app_id` column per row.
- Each cron run collects both apps in parallel via `Promise.allSettled` — one app failing doesn't block the other.

## Error Handling

| Status | Meaning                |
| ------ | ---------------------- |
| 200    | Success                |
| 404    | Resource not found / no data yet |
| 405    | Method not allowed (only GET is supported) |
| 500    | Internal server error  |

All error responses follow:

```json
{
  "error": "Description of the problem"
}
```

## Rate Limits

This API is served via Cloudflare Workers. There are no application-level rate limits, but Cloudflare's standard protections apply. Responses are cached for 60 seconds — aggressive polling faster than once per minute provides no benefit.
