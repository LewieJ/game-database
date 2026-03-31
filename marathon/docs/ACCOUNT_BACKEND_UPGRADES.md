# Account Backend Upgrades — Bungie Profile Enrichment & Player Search

This document outlines all backend changes needed to enrich user accounts with full Bungie identity data and enable player search/profile lookup. These are **account-level changes** using Bungie's existing API — no Marathon-specific endpoints required.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Problem Summary](#2-problem-summary)
3. [Bungie API Calls to Add](#3-bungie-api-calls-to-add)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Updated OAuth Callback Flow](#5-updated-oauth-callback-flow)
6. [Updated API Response Shapes](#6-updated-api-response-shapes)
7. [New Endpoints — Player Search](#7-new-endpoints--player-search)
8. [New Endpoints — Public Profile Resolution](#8-new-endpoints--public-profile-resolution)
9. [Bungie API Reference](#9-bungie-api-reference)
10. [Frontend Expectations](#10-frontend-expectations)
11. [Future: Marathon Game Data](#11-future-marathon-game-data)

---

## 1. Current State

During OAuth callback, the backend currently:
1. Exchanges the auth code for an access token
2. Stores the **Bungie.net membership ID** from the token response (e.g. `31374339`)
3. Stores the **basic display name** from the token response (e.g. `MarathonDB.GG`)
4. Creates or logs in the user

**What's stored in `linked_accounts`:**
```
provider:              "bungie"
provider_user_id:      "31374339"        ← Bungie.net account ID
provider_display_name: "MarathonDB.GG"   ← Missing #code discriminator
```

---

## 2. Problem Summary

| Issue | Current | Expected |
|---|---|---|
| Display name | `MarathonDB.GG` | `MarathonDB.GG#1580` |
| Stored ID | `31374339` (Bungie.net account ID only) | Also store game membership IDs (e.g. `4611686018501899368`) |
| Player search | Not possible | Search by Bungie name, resolve to profile |
| Public profile | Only shows MarathonDB data | Should show Bungie identity + linked platforms |

The `31374339` is the **Bungie.net account membership ID** — the account-level ID. The `4611686018501899368` is a **Destiny membership ID** (game-level). When Marathon launches, there will be a separate Marathon membership ID. All of these live under the same Bungie.net account.

---

## 3. Bungie API Calls to Add

### 3a. GetMembershipDataForCurrentUser (during OAuth callback)

**When:** Immediately after exchanging the OAuth code for an access token.

```
GET https://www.bungie.net/Platform/User/GetMembershipDataForCurrentUser/
Headers:
  Authorization: Bearer {access_token}
  X-API-Key: {your_bungie_api_key}
```

**Response:**
```json
{
  "Response": {
    "destinyMemberships": [
      {
        "membershipType": 3,
        "membershipId": "4611686018501899368",
        "displayName": "MarathonDB.GG",
        "bungieGlobalDisplayName": "MarathonDB.GG",
        "bungieGlobalDisplayNameCode": 1580,
        "crossSaveOverride": 0,
        "isPublic": true
      }
    ],
    "primaryMembershipId": "4611686018501899368",
    "bungieNetUser": {
      "membershipId": "31374339",
      "uniqueName": "MarathonDB.GG",
      "displayName": "MarathonDB.GG",
      "profilePicture": 70525,
      "profileTheme": 84,
      "userTitle": 0,
      "about": "",
      "firstAccess": "2021-08-24T...",
      "lastUpdate": "2026-03-01T...",
      "isDeleted": false,
      "showActivity": true
    }
  },
  "ErrorCode": 1,
  "ThrottleSeconds": 0,
  "ErrorStatus": "Success"
}
```

**Key fields to extract:**

| Field | Path | Example | What it is |
|---|---|---|---|
| Bungie.net ID | `bungieNetUser.membershipId` | `31374339` | Account-level ID (already stored) |
| Global display name | `bungieNetUser.displayName` or `destinyMemberships[0].bungieGlobalDisplayName` | `MarathonDB.GG` | Display name |
| Display name code | `destinyMemberships[0].bungieGlobalDisplayNameCode` | `1580` | The `#1580` discriminator |
| Full Bungie ID | Concatenated | `MarathonDB.GG#1580` | The human-readable unique Bungie ID |
| Game membership ID | `destinyMemberships[].membershipId` | `4611686018501899368` | Game-level platform ID |
| Membership type | `destinyMemberships[].membershipType` | `3` (Steam) | Which platform |
| Primary membership | `primaryMembershipId` | `4611686018501899368` | Cross-save primary |
| Profile picture ID | `bungieNetUser.profilePicture` | `70525` | Bungie avatar (can resolve to image URL) |

### 3b. BungieMembershipType Values

```
0  = None
1  = Xbox
2  = PSN
3  = Steam
4  = Blizzard (deprecated)
5  = Stadia (deprecated)
10 = TigerDemon
254 = BungieNext
???  = Marathon (TBD — expected when game launches)
```

---

## 4. Database Schema Changes

### linked_accounts table — add columns

```sql
-- Add to existing linked_accounts table:
ALTER TABLE linked_accounts ADD COLUMN bungie_display_name_code  INTEGER     NULL;
ALTER TABLE linked_accounts ADD COLUMN bungie_global_display_name TEXT       NULL;

-- Or store the full name as provider_display_name = "MarathonDB.GG#1580"
-- (simpler — recommended approach below)
```

### New table: bungie_memberships

Stores game-level membership IDs separately from the Bungie.net account link.

```sql
CREATE TABLE bungie_memberships (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL REFERENCES users(user_id),
    bungie_net_membership_id TEXT NOT NULL,          -- "31374339" (the account level ID)
    membership_type       INTEGER NOT NULL,          -- 3 = Steam, 1 = Xbox, 2 = PSN, etc.
    membership_id         TEXT NOT NULL,             -- "4611686018501899368" (game level ID)
    display_name          TEXT,                      -- platform-specific display name
    is_primary            BOOLEAN DEFAULT FALSE,     -- cross-save primary
    is_public             BOOLEAN DEFAULT TRUE,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(membership_type, membership_id)
);

CREATE INDEX idx_bungie_memberships_user ON bungie_memberships(user_id);
CREATE INDEX idx_bungie_memberships_lookup ON bungie_memberships(membership_id);
CREATE INDEX idx_bungie_memberships_bungie_net ON bungie_memberships(bungie_net_membership_id);
```

### users table — add Bungie identity cache

```sql
ALTER TABLE users ADD COLUMN bungie_display_name      TEXT    NULL;  -- "MarathonDB.GG"
ALTER TABLE users ADD COLUMN bungie_display_name_code INTEGER NULL;  -- 1580
ALTER TABLE users ADD COLUMN bungie_net_membership_id TEXT    NULL;  -- "31374339"
ALTER TABLE users ADD COLUMN bungie_avatar_path       TEXT    NULL;  -- "/img/profile/avatars/..."
```

---

## 5. Updated OAuth Callback Flow

```
Bungie OAuth callback with ?code=...
         │
         ▼
    1. Exchange code for access_token + membership_id
         │
         ▼
    2. NEW: Call GetMembershipDataForCurrentUser with access_token
         │
         ├── Extract bungieGlobalDisplayName + bungieGlobalDisplayNameCode
         ├── Extract destinyMemberships[] (all game platform IDs)
         ├── Extract primaryMembershipId
         └── Extract bungieNetUser.profilePicture
         │
         ▼
    3. Look up user by bungie_net_membership_id
         │
    ┌────┴────┐
  EXISTS    NEW USER
    │          │
    ▼          ▼
  4a. Update   4b. Store pending registration data
  linked_accounts.provider_display_name = "MarathonDB.GG#1580"
  Upsert bungie_memberships rows
  Update users.bungie_* cache columns
    │          │
    ▼          ▼
  Set cookie   Redirect to /auth/create-account?token=...
  Redirect /   (same as today, but store richer data on complete-registration)
```

### Key change in step 2:

```js
// After exchanging code for token:
const tokenData = await exchangeCode(code);
const accessToken = tokenData.access_token;
const bungieNetId = tokenData.membership_id; // "31374339"

// NEW — Fetch full membership data:
const membershipResp = await fetch(
  'https://www.bungie.net/Platform/User/GetMembershipDataForCurrentUser/',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-API-Key': BUNGIE_API_KEY,
    }
  }
);
const membershipData = await membershipResp.json();
const bungieUser = membershipData.Response.bungieNetUser;
const destinyMemberships = membershipData.Response.destinyMemberships;
const primaryId = membershipData.Response.primaryMembershipId;

// Build full display name:
const globalName = destinyMemberships[0]?.bungieGlobalDisplayName || bungieUser.displayName;
const nameCode = destinyMemberships[0]?.bungieGlobalDisplayNameCode;
const fullDisplayName = nameCode ? `${globalName}#${nameCode}` : globalName;

// Store fullDisplayName as provider_display_name
// Store each destinyMemberships[] entry in bungie_memberships table
// Store bungieUser.profilePicture for avatar resolution
```

---

## 6. Updated API Response Shapes

### GET /user/me — enhanced

```json
{
  "success": true,
  "data": {
    "user_id": 1000,
    "username": "MyName",
    "avatar_id": null,
    "premium": false,
    "created_at": "2026-03-04T05:07:41.000Z",
    "bungie_display_name": "MarathonDB.GG",
    "bungie_display_name_code": 1580,
    "bungie_net_membership_id": "31374339",
    "linked_accounts": [
      {
        "provider": "bungie",
        "provider_user_id": "31374339",
        "provider_display_name": "MarathonDB.GG#1580",
        "created_at": "..."
      }
    ],
    "bungie_memberships": [
      {
        "membership_type": 3,
        "membership_type_name": "Steam",
        "membership_id": "4611686018501899368",
        "display_name": "MarathonDB.GG",
        "is_primary": true
      }
    ],
    "owned_items_count": 12
  }
}
```

### GET /user/linked-accounts — enhanced

```json
{
  "success": true,
  "data": [
    {
      "provider": "bungie",
      "provider_user_id": "31374339",
      "provider_display_name": "MarathonDB.GG#1580",
      "bungie_memberships": [
        {
          "membership_type": 3,
          "membership_type_name": "Steam",
          "membership_id": "4611686018501899368",
          "is_primary": true
        }
      ],
      "created_at": "..."
    }
  ]
}
```

---

## 7. New Endpoints — Player Search

### POST /search/players

Proxies Bungie's `SearchByGlobalNamePost` endpoint. The backend should proxy this rather than having the frontend call Bungie directly (keeps the API key server-side).

**Request:**
```json
{
  "display_name_prefix": "MarathonDB",
  "page": 0
}
```

**Backend logic:**
```js
const bungieResp = await fetch(
  `https://www.bungie.net/Platform/User/Search/GlobalName/${page}/`,
  {
    method: 'POST',
    headers: {
      'X-API-Key': BUNGIE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayNamePrefix: displayNamePrefix })
  }
);
```

**Bungie's response shape:**
```json
{
  "Response": {
    "searchResults": [
      {
        "bungieGlobalDisplayName": "MarathonDB.GG",
        "bungieGlobalDisplayNameCode": 1580,
        "bungieNetMembershipId": "31374339",
        "destinyMemberships": [
          {
            "membershipType": 3,
            "membershipId": "4611686018501899368",
            "displayName": "MarathonDB.GG",
            "bungieGlobalDisplayName": "MarathonDB.GG",
            "bungieGlobalDisplayNameCode": 1580
          }
        ]
      }
    ],
    "page": 0,
    "hasMore": false
  }
}
```

**MarathonDB response (transformed):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "bungie_name": "MarathonDB.GG#1580",
        "bungie_net_membership_id": "31374339",
        "memberships": [
          {
            "type": 3,
            "type_name": "Steam",
            "id": "4611686018501899368"
          }
        ],
        "marathondb_user": {
          "user_id": 1000,
          "username": "MarathonDB"
        }
      }
    ],
    "page": 0,
    "has_more": false
  }
}
```

**Note:** The `marathondb_user` field is populated by cross-referencing `bungie_net_membership_id` against the `users` table. If the searched player doesn't have a MarathonDB account, this will be `null`.

### POST /search/players/exact

Exact lookup by Bungie Name + Code. Proxies `SearchDestinyPlayerByBungieName`.

**Request:**
```json
{
  "display_name": "MarathonDB.GG",
  "display_name_code": 1580
}
```

**Backend logic:**
```js
const bungieResp = await fetch(
  `https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayerByBungieName/-1/`,
  {
    method: 'POST',
    headers: {
      'X-API-Key': BUNGIE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName: displayName,
      displayNameCode: displayNameCode
    })
  }
);
```

---

## 8. New Endpoints — Public Profile Resolution

### GET /profile/bungie/:bungieNetId

Resolve a Bungie.net membership ID to a full profile.

**Backend logic:**
1. Check local `users` table for a MarathonDB account linked to this Bungie ID
2. Call `GetMembershipDataById` for fresh Bungie data:
   ```
   GET https://www.bungie.net/Platform/User/GetMembershipDataById/{bungieNetId}/254/
   X-API-Key: {api_key}
   ```
3. Merge and return

**Response:**
```json
{
  "success": true,
  "data": {
    "bungie_net_membership_id": "31374339",
    "bungie_name": "MarathonDB.GG#1580",
    "bungie_avatar_url": "https://www.bungie.net/img/profile/avatars/cc15.jpg",
    "memberships": [
      {
        "type": 3,
        "type_name": "Steam",
        "id": "4611686018501899368",
        "display_name": "MarathonDB.GG",
        "is_primary": true
      }
    ],
    "marathondb_user": {
      "user_id": 1000,
      "username": "MarathonDB",
      "premium": false,
      "created_at": "2026-03-04T...",
      "owned_items_count": 12
    }
  }
}
```

### GET /profile/:username

Resolve a MarathonDB username to a full profile (for `marathondb.gg/profile/MarathonDB`).

**Backend logic:**
1. Look up the user by username in the `users` table
2. Join with `linked_accounts` and `bungie_memberships`
3. Return combined data

---

## 9. Bungie API Reference

All calls require the `X-API-Key` header. Authenticated calls also need `Authorization: Bearer {token}`.

**Base URL:** `https://www.bungie.net/Platform`

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/User/GetMembershipDataForCurrentUser/` | Bearer token | Get all memberships for the logged-in user |
| GET | `/User/GetMembershipDataById/{membershipId}/{membershipType}/` | API key only | Get memberships by known ID |
| GET | `/User/GetBungieNetUserById/{id}/` | API key only | Get Bungie.net user profile |
| POST | `/User/Search/GlobalName/{page}/` | API key only | Fuzzy search by display name |
| POST | `/Destiny2/SearchDestinyPlayerByBungieName/{membershipType}/` | API key only | Exact lookup by Name#Code (use `-1` for all platforms) |

**Rate limits:** Bungie enforces 25 req/sec per API key. Player search should be debounced on the frontend (300ms+) and optionally cached on the backend.

**Bungie avatar resolution:**
```
Profile picture ID → https://www.bungie.net/img/profile/avatars/cc{id}.jpg
```
The exact path mapping may vary. Check `bungieNetUser.profilePicturePath` if available, or resolve via the Bungie avatar endpoint.

---

## 10. Frontend Expectations

The frontend is already built to handle richer data. Here's what changes with enhanced responses:

### Settings page — already handled
- `provider_display_name` is rendered as-is → changing from `"MarathonDB.GG"` to `"MarathonDB.GG#1580"` works automatically
- `provider_user_id` shown below the name → will still show `"31374339"` (Bungie.net ID) which is correct
- The `bungie_memberships` array (if added to the response) can be rendered as sub-items under the Bungie card showing each platform

### Nav auth dropdown — already handled
- `initNavAuth()` in `js/auth.js` reads `user.username` for the dropdown — no change needed

### Future: Player profile pages
- Frontend will call `GET /profile/bungie/{id}` or `GET /profile/{username}`
- URL structure: `/profile/{username}` for MarathonDB users, `/profile/bungie/{bungieNetId}` for Bungie-only lookups
- Profile page will render: Bungie identity, platform memberships, item collection, and (future) Marathon stats

### Future: Search component
- Autocomplete/search bar will call `POST /search/players` with debounce
- Results show `bungie_name`, platform icons, and link to profile page
- If `marathondb_user` is populated, link to `/profile/{username}`; otherwise `/profile/bungie/{bungieNetId}`

---

## 11. Future: Marathon Game Data

When Marathon launches, Bungie will likely add:
- A new `membershipType` value (e.g. `6` or similar) for Marathon
- New `Marathon.*` API endpoints (similar to `Destiny2.*`)
- Marathon-specific profile data, match history, stats

**What stays the same:**
- OAuth flow — unchanged, Bungie accounts are shared across games
- `GetMembershipDataForCurrentUser` — will return Marathon memberships in `destinyMemberships[]` (likely renamed or expanded)
- Player search — same endpoints, Marathon memberships will appear in results

**What we'll add then:**
- Call Marathon stats endpoints with the Marathon membership ID
- Display match history, KD, ranked info on profile pages
- Leaderboard integration

**No current work needed for Marathon-specific data.** Everything in this doc is account-level and works today.

---

## Summary of Backend Tasks

| # | Task | Priority | Complexity |
|---|---|---|---|
| 1 | Call `GetMembershipDataForCurrentUser` in OAuth callback | **High** | Low |
| 2 | Store full display name with `#code` discriminator | **High** | Low |
| 3 | Create `bungie_memberships` table | **High** | Medium |
| 4 | Store game membership IDs from OAuth | **High** | Low |
| 5 | Update `/user/me` response with enriched Bungie data | **High** | Low |
| 6 | Update `/user/linked-accounts` response | **High** | Low |
| 7 | Add `POST /search/players` (proxy Bungie search) | Medium | Medium |
| 8 | Add `POST /search/players/exact` (exact name lookup) | Medium | Low |
| 9 | Add `GET /profile/bungie/:id` (public profile resolution) | Medium | Medium |
| 10 | Add `GET /profile/:username` (MarathonDB profile) | Medium | Low |
| 11 | Cache/refresh Bungie data periodically (optional) | Low | Medium |
