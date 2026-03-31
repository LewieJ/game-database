# MarathonDB Frontend Integration Guide

Complete API reference for the MarathonDB accounts backend at `accounts.marathondb.gg`.

---

## Architecture Overview

```
marathondb.gg (frontend)          accounts.marathondb.gg (backend)
─────────────────────────         ──────────────────────────────────
Browser loads frontend   ──────►  API handles auth, data, sessions
Frontend makes API calls ──────►  Bungie OAuth redirects
Cookies set by backend   ◄──────  Session cookie (HttpOnly, Secure)
```

**Key principle:** The session cookie (`marathondb_session`) is set by the backend on `accounts.marathondb.gg`. All API calls from the frontend must include `credentials: 'include'` so the browser sends the cookie cross-origin.

---

## API Base URL

```
https://accounts.marathondb.gg
```

All endpoints are relative to this base.

---

## Global Fetch Configuration

Every API call from the frontend should use this pattern:

```js
const API = 'https://accounts.marathondb.gg';

async function api(method, path, body = null) {
  const opts = {
    method,
    credentials: 'include', // REQUIRED — sends session cookie
    headers: {},
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, opts);
  return res.json();
}
```

All responses follow the shape:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error message" }
```

---

## Pages to Build

### 1. Login Button (any page)

**Implementation:**

```html
<a href="https://accounts.marathondb.gg/auth/bungie/login">Login with Bungie</a>
```

This is a **full page redirect**, not an API call. The flow:

1. User clicks → navigates to `accounts.marathondb.gg/auth/bungie/login`
2. Backend redirects to Bungie OAuth
3. User authenticates with Bungie
4. Bungie redirects to `accounts.marathondb.gg/auth/bungie/callback`
5. Backend checks if the Bungie account exists:
   - **Existing user:** Sets session cookie → redirects to `https://marathondb.gg/`
   - **New user:** Redirects to `https://marathondb.gg/auth/create-account?token=TEMP_TOKEN`
   - **Error:** Returns JSON with a specific error code (see [OAuth Error Handling](#oauth-error-handling) below)

#### OAuth Error Handling

If the OAuth callback fails, the backend returns a JSON error response instead of redirecting. The frontend should handle the case where the user lands back on the site without a session after clicking login.

The callback returns specific error codes to help diagnose issues:

| Error string | Meaning | User-facing message suggestion |
|---|---|---|
| `token_exchange_failed` | Bungie rejected the auth code (expired, already used, or config mismatch) | "Login failed. Please try again." |
| `membership_fetch_failed` | Auth succeeded but Bungie profile data couldn't be loaded | "Login failed. Bungie may be experiencing issues. Try again later." |
| `session_creation_failed` | Auth and profile succeeded but session/database write failed | "Login failed due to a server error. Please try again." |

**Recommended approach:** Since the callback is a redirect-based flow (not a fetch call), these errors display as raw JSON in the browser. To handle this gracefully, add an error page or redirect:

```js
// On your app's error page or a catch-all route, check for auth errors
// If the user was just trying to log in and ended up at the callback URL showing JSON,
// you could add a client-side redirect from the callback domain:
// In practice, users rarely see this — it only happens if Bungie or the backend is down.
```

---

### 2. Account Creation Page

**URL:** `https://marathondb.gg/auth/create-account`

**When shown:** User is redirected here after first Bungie login.

**Query parameter:** `token` — temporary registration token (valid for 10 minutes)

**What to build:**
- Username input field
- Validation: 3–12 characters, alphanumeric only (`/^[a-zA-Z0-9]{3,12}$/`)
- Submit button
- Error display

**API call on submit:**

```js
const result = await api('POST', '/auth/complete-registration', {
  token: new URLSearchParams(window.location.search).get('token'),
  username: usernameInput.value,
});

if (result.success) {
  // Account created, session cookie is set
  // result.data = { user_id: 1000, username: "MyName" }
  window.location.href = '/';
} else {
  // Possible errors:
  //   "Username must be 3-12 alphanumeric characters"
  //   "Username is already taken"
  //   "Registration token expired or invalid"
}
```

**UI suggestions:**
- Show the Bungie display name as context ("Logging in as: MarathonDB.GG#1580")
- Real-time username validation before submit
- Show "username taken" error inline

---

### 3. Checking Auth State (every page load)

**Purpose:** Determine if the user is logged in and render the correct UI.

```js
async function checkAuth() {
  const result = await api('GET', '/user/me');
  if (result.success) {
    return result.data;
    // {
    //   user_id: 1000,
    //   username: "MyName",
    //   avatar_id: null,
    //   premium: false,
    //   created_at: "2026-03-04T05:07:41.000Z",
    //   bungie_display_name: "MarathonDB.GG",
    //   bungie_display_name_code: 1580,
    //   bungie_net_membership_id: "31374339",
    //   bungie_avatar_path: "/img/profile/avatars/bungie_day_15_07.jpg",
    //   linked_accounts: [
    //     { provider: "bungie", provider_display_name: "MarathonDB.GG#1580", ... }
    //   ],
    //   bungie_memberships: [
    //     {
    //       membership_type: 3,
    //       membership_type_name: "Steam",
    //       membership_id: "4611686018501899368",
    //       display_name: "MarathonDB.GG",
    //       is_primary: true
    //     }
    //   ],
    //   owned_items_count: 12
    // }
  }
  return null; // Not logged in
}

const user = await checkAuth();
if (user) {
  showProfileUI(user);
} else {
  showLoginButton();
}
```

---

### 4. User Profile / Settings Page

**URL:** `https://marathondb.gg/settings` or similar

#### Display current profile

```js
const user = await api('GET', '/user/me');
// Show: username, bungie identity, avatar, premium status, linked accounts, memberships
```

#### Change username

```js
const result = await api('POST', '/user/username', { username: 'NewName' });
// success: { data: { username: "NewName" } }
// errors: "Username must be 3-12 alphanumeric characters"
//         "Username is already taken"
```

#### View linked accounts

```js
const result = await api('GET', '/user/linked-accounts');
// {
//   data: [
//     {
//       provider: "bungie",
//       provider_user_id: "31374339",
//       provider_display_name: "MarathonDB.GG#1580",
//       created_at: "2026-03-04T...",
//       bungie_memberships: [
//         {
//           membership_type: 3,
//           membership_type_name: "Steam",
//           membership_id: "4611686018501899368",
//           is_primary: true
//         }
//       ]
//     },
//     {
//       provider: "steam",
//       provider_user_id: "76561198...",
//       provider_display_name: "MySteamName",
//       created_at: "..."
//     }
//   ]
// }
```

#### Link a platform account (Steam, Discord, Xbox, PSN)

```js
const result = await api('POST', '/link/steam', {
  provider_user_id: 'STEAM_ID_64',
  display_name: 'SteamPlayer',
});
// errors: "This platform account is already linked to another user"
//         "You already have a steam account linked. Unlink it first."
```

#### Unlink a platform account

```js
const result = await api('DELETE', '/link/steam');
// Note: Bungie cannot be unlinked (primary auth method)
// error: "Cannot unlink Bungie account — it is your primary login method"
```

#### Delete account (GDPR)

```js
// Show a confirmation dialog first!
const result = await api('DELETE', '/account');
// success: account + all data deleted, session cleared
// Redirect to home page after
```

---

### 5. Item Collection / Checklist

**Purpose:** Let users mark items (skins, cosmetics) as owned.

#### Get owned items

```js
const result = await api('GET', '/user/items');
// {
//   data: {
//     items: [
//       { item_id: 245, owned: true, updated_at: "..." },
//       { item_id: 246, owned: true, updated_at: "..." }
//     ],
//     owned_count: 2
//   }
// }
```

#### Mark item as owned

```js
const result = await api('POST', '/user/items/owned', { item_id: 245 });
```

#### Remove item from owned

```js
const result = await api('DELETE', '/user/items/owned', { item_id: 245 });
```

#### Bulk mark items (up to 100 at once)

```js
const result = await api('POST', '/user/items/bulk', { item_ids: [245, 246, 247, 248] });
```

#### View another user's items (public, no auth needed)

```js
const result = await fetch(`${API}/user/1000/items`).then(r => r.json());
```

---

### 6. Public User Profiles

**URL:** `https://marathondb.gg/user/1000` or `https://marathondb.gg/user/MyName`

**No auth required** — anyone can view.

#### By user ID

```js
const profile = await fetch(`${API}/user/1000`).then(r => r.json());
// {
//   data: {
//     user_id: 1000,
//     username: "MyName",
//     avatar_id: null,
//     premium: false,
//     created_at: "2026-03-04T...",
//     bungie_display_name: "MarathonDB.GG",
//     bungie_display_name_code: 1580,
//     bungie_net_membership_id: "31374339",
//     bungie_avatar_path: "/img/profile/avatars/bungie_day_15_07.jpg",
//     linked_accounts: [
//       { provider: "bungie", provider_display_name: "MarathonDB.GG#1580", created_at: "..." }
//     ],
//     bungie_memberships: [
//       {
//         membership_type: 3,
//         membership_type_name: "Steam",
//         membership_id: "4611686018501899368",
//         display_name: "MarathonDB.GG",
//         is_primary: true
//       }
//     ],
//     owned_items_count: 12
//   }
// }
```

#### By MarathonDB username (via profile endpoint)

```js
const profile = await fetch(`${API}/profile/MyName`).then(r => r.json());
// {
//   data: {
//     user_id: 1000,
//     username: "MyName",
//     premium: false,
//     created_at: "2026-03-04T...",
//     bungie_identity: {
//       display_name: "MarathonDB.GG",
//       display_name_code: 1580,
//       full_bungie_name: "MarathonDB.GG#1580",
//       bungie_net_membership_id: "31374339",
//       avatar_path: "https://www.bungie.net/img/profile/avatars/bungie_day_15_07.jpg"
//     },
//     memberships: [
//       {
//         type: 3,
//         type_name: "Steam",
//         id: "4611686018501899368",
//         display_name: "MarathonDB.GG",
//         cross_save_override: 0,
//         icon_path: "https://www.bungie.net/img/theme/destiny/icons/..."
//       }
//     ],
//     linked_accounts: [
//       { provider: "bungie", provider_user_id: "31374339", display_name: "MarathonDB.GG#1580" }
//     ]
//   }
// }
```

#### By Bungie.net membership ID (via profile endpoint)

```js
const profile = await fetch(`${API}/profile/bungie/31374339`).then(r => r.json());
// {
//   data: {
//     bungie_identity: {
//       bungie_net_membership_id: "31374339",
//       display_name: "MarathonDB.GG",
//       display_name_code: 1580,
//       full_bungie_name: "MarathonDB.GG#1580",
//       avatar_path: "https://www.bungie.net/img/profile/avatars/bungie_day_15_07.jpg"
//     },
//     memberships: [
//       {
//         type: 3,
//         type_name: "Steam",
//         id: "4611686018501899368",
//         display_name: "MarathonDB.GG",
//         cross_save_override: 0
//       }
//     ],
//     marathondb_user: {
//       user_id: 1000,
//       username: "MyName",
//       premium: false,
//       bungie_display_name: "MarathonDB.GG",
//       bungie_display_name_code: 1580,
//       bungie_avatar_path: "https://www.bungie.net/img/profile/avatars/...",
//       created_at: "2026-03-04T...",
//       memberships: [ ... ]
//     }
//   }
// }
```

> **Note:** `marathondb_user` is `null` if the Bungie account has no MarathonDB account. This endpoint also refreshes the user's cached Bungie data when fetched live from Bungie.

---

### 7. Player Search

**Purpose:** Search for Bungie players by display name. Results include whether each player has a MarathonDB account.

#### Fuzzy search (autocomplete / search bar)

```js
const result = await api('POST', '/search/players', {
  display_name_prefix: 'Marathon',
  page: 0,  // optional, defaults to 0
});
// {
//   data: {
//     results: [
//       {
//         bungie_name: "MarathonDB.GG#1580",
//         bungie_net_membership_id: "31374339",
//         memberships: [
//           { type: 3, type_name: "Steam", id: "4611686018501899368" }
//         ],
//         marathondb_user: {
//           user_id: 1000,
//           username: "MyName",
//           premium: false
//         }
//       },
//       {
//         bungie_name: "MarathonFan#9999",
//         bungie_net_membership_id: "12345678",
//         memberships: [
//           { type: 2, type_name: "PSN", id: "46116860185..." },
//           { type: 3, type_name: "Steam", id: "46116860185..." }
//         ],
//         marathondb_user: null  // no MarathonDB account
//       }
//     ],
//     page: 0,
//     has_more: true
//   }
// }
```

**UI suggestions:**
- Debounce input (300ms recommended)
- Show results as user types
- Display platform icons next to each result using `type` values
- Highlight results that have `marathondb_user` (they have a MarathonDB profile to link to)
- Load more pages on scroll or "Show More" button when `has_more` is `true`

#### Exact lookup (resolve a specific Bungie Name)

```js
const result = await api('POST', '/search/players/exact', {
  display_name: 'MarathonDB.GG',
  display_name_code: 1580,
});
// {
//   data: {
//     bungie_name: "MarathonDB.GG#1580",
//     memberships: [
//       {
//         type: 3,
//         type_name: "Steam",
//         id: "4611686018501899368",
//         display_name: "MarathonDB.GG",
//         bungie_global_display_name: "MarathonDB.GG",
//         bungie_global_display_name_code: 1580
//       }
//     ],
//     marathondb_user: {
//       user_id: 1000,
//       username: "MyName",
//       premium: false
//     }
//   }
// }
```

**Use case:** When a user types a full Bungie Name like `MarathonDB.GG#1580` in a search bar, parse it and use the exact endpoint for an instant match.

```js
// Parse "MarathonDB.GG#1580" into name + code
function parseBungieName(input) {
  const match = input.match(/^(.+)#(\d+)$/);
  if (match) {
    return { display_name: match[1], display_name_code: parseInt(match[2]) };
  }
  return null;
}
```

---

### 8. Logout

```js
await api('POST', '/auth/logout');
window.location.href = '/';
```

---

## Membership Type Reference

These values appear in `membership_type` / `type` fields across all endpoints:

| Value | Platform | Notes |
|-------|----------|-------|
| 0 | None | — |
| 1 | Xbox | Xbox Live |
| 2 | PSN | PlayStation Network |
| 3 | Steam | Steam |
| 4 | Blizzard | Deprecated |
| 5 | Stadia | Deprecated |
| 10 | TigerDemon | Internal |
| 254 | BungieNext | Bungie.net account level |

> Marathon will likely receive its own membership type value when the game launches.

---

## Complete API Reference

### Auth

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/auth/bungie/login` | No | — | Redirect to Bungie OAuth |
| GET | `/auth/bungie/callback` | No | — | OAuth callback (internal) |
| POST | `/auth/complete-registration` | No | `{ token, username }` | Create account |
| POST | `/auth/logout` | Yes | — | Destroy session |

### User

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/user/me` | Yes | — | Current user profile (enriched) |
| POST | `/user/username` | Yes | `{ username }` | Update username |
| GET | `/user/:id` | No | — | Public profile by user ID (enriched) |
| GET | `/user/linked-accounts` | Yes | — | Linked accounts + Bungie memberships |

### Items

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/user/items` | Yes | — | Get owned items |
| POST | `/user/items/owned` | Yes | `{ item_id }` | Mark item owned |
| DELETE | `/user/items/owned` | Yes | `{ item_id }` | Remove owned item |
| POST | `/user/items/bulk` | Yes | `{ item_ids[] }` | Bulk mark owned (max 100) |
| GET | `/user/:id/items` | No | — | Public user items |

### Link Accounts

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/link/:provider` | Yes | `{ provider_user_id, display_name? }` | Link platform account |
| DELETE | `/link/:provider` | Yes | — | Unlink platform account |

Valid providers: `steam`, `discord`, `xbox`, `psn`. Bungie is linked automatically via OAuth and cannot be unlinked.

### Search

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/search/players` | No | `{ display_name_prefix, page? }` | Fuzzy player search |
| POST | `/search/players/exact` | No | `{ display_name, display_name_code }` | Exact Bungie Name lookup |

### Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile/bungie/:bungieNetId` | No | Resolve Bungie.net ID to profile (live + cached) |
| GET | `/profile/:username` | No | Resolve MarathonDB username to full profile |

### Account

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| DELETE | `/account` | Yes | Permanently delete account + all data (GDPR) |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Detailed Response Shapes

### GET `/user/me` — Authenticated User

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
    "bungie_avatar_path": "/img/profile/avatars/bungie_day_15_07.jpg",
    "linked_accounts": [
      {
        "provider": "bungie",
        "provider_user_id": "31374339",
        "provider_display_name": "MarathonDB.GG#1580",
        "created_at": "2026-03-04T05:07:41.000Z"
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

### GET `/user/:id` — Public Profile

Same shape as `/user/me`. Available to anyone, no auth required.

### GET `/user/linked-accounts` — Linked Accounts

```json
{
  "success": true,
  "data": [
    {
      "provider": "bungie",
      "provider_user_id": "31374339",
      "provider_display_name": "MarathonDB.GG#1580",
      "created_at": "2026-03-04T05:07:41.000Z",
      "bungie_memberships": [
        {
          "membership_type": 3,
          "membership_type_name": "Steam",
          "membership_id": "4611686018501899368",
          "is_primary": true
        }
      ]
    },
    {
      "provider": "steam",
      "provider_user_id": "76561198...",
      "provider_display_name": "MySteamName",
      "created_at": "2026-03-05T..."
    }
  ]
}
```

> The `bungie_memberships` sub-array only appears on the `"bungie"` provider entry.

### POST `/search/players` — Fuzzy Search

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "bungie_name": "MarathonDB.GG#1580",
        "bungie_net_membership_id": "31374339",
        "memberships": [
          { "type": 3, "type_name": "Steam", "id": "4611686018501899368" }
        ],
        "marathondb_user": {
          "user_id": 1000,
          "username": "MyName",
          "premium": false
        }
      },
      {
        "bungie_name": "MarathonFan#9999",
        "bungie_net_membership_id": "12345678",
        "memberships": [
          { "type": 2, "type_name": "PSN", "id": "4611686018..." }
        ],
        "marathondb_user": null
      }
    ],
    "page": 0,
    "has_more": true
  }
}
```

### POST `/search/players/exact` — Exact Bungie Name Lookup

```json
{
  "success": true,
  "data": {
    "bungie_name": "MarathonDB.GG#1580",
    "memberships": [
      {
        "type": 3,
        "type_name": "Steam",
        "id": "4611686018501899368",
        "display_name": "MarathonDB.GG",
        "bungie_global_display_name": "MarathonDB.GG",
        "bungie_global_display_name_code": 1580
      }
    ],
    "marathondb_user": {
      "user_id": 1000,
      "username": "MyName",
      "premium": false
    }
  }
}
```

### GET `/profile/bungie/:bungieNetId` — Resolve by Bungie ID

```json
{
  "success": true,
  "data": {
    "bungie_identity": {
      "bungie_net_membership_id": "31374339",
      "display_name": "MarathonDB.GG",
      "display_name_code": 1580,
      "full_bungie_name": "MarathonDB.GG#1580",
      "avatar_path": "https://www.bungie.net/img/profile/avatars/bungie_day_15_07.jpg"
    },
    "memberships": [
      {
        "type": 3,
        "type_name": "Steam",
        "id": "4611686018501899368",
        "display_name": "MarathonDB.GG",
        "cross_save_override": 0
      }
    ],
    "marathondb_user": {
      "user_id": 1000,
      "username": "MyName",
      "premium": false,
      "bungie_display_name": "MarathonDB.GG",
      "bungie_display_name_code": 1580,
      "bungie_avatar_path": "https://www.bungie.net/img/profile/avatars/...",
      "created_at": "2026-03-04T...",
      "memberships": [
        {
          "type": 3,
          "type_name": "Steam",
          "id": "4611686018501899368",
          "display_name": "MarathonDB.GG",
          "cross_save_override": 0
        }
      ]
    }
  }
}
```

> `marathondb_user` is `null` when the Bungie account has no MarathonDB account. This endpoint fetches live data from Bungie and refreshes the local cache automatically.

### GET `/profile/:username` — Resolve by Username

```json
{
  "success": true,
  "data": {
    "user_id": 1000,
    "username": "MyName",
    "premium": false,
    "created_at": "2026-03-04T...",
    "bungie_identity": {
      "display_name": "MarathonDB.GG",
      "display_name_code": 1580,
      "full_bungie_name": "MarathonDB.GG#1580",
      "bungie_net_membership_id": "31374339",
      "avatar_path": "https://www.bungie.net/img/profile/avatars/bungie_day_15_07.jpg"
    },
    "memberships": [
      {
        "type": 3,
        "type_name": "Steam",
        "id": "4611686018501899368",
        "display_name": "MarathonDB.GG",
        "cross_save_override": 0,
        "icon_path": "https://www.bungie.net/img/theme/destiny/icons/..."
      }
    ],
    "linked_accounts": [
      {
        "provider": "bungie",
        "provider_user_id": "31374339",
        "display_name": "MarathonDB.GG#1580"
      }
    ]
  }
}
```

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created (new account, new link) |
| 400 | Bad request (validation error) |
| 401 | Not authenticated (no session / expired) |
| 404 | Resource not found |
| 409 | Conflict (username taken, account already linked) |
| 500 | Server error |

### OAuth Callback Error Strings (500 responses)

| Error | Stage | Cause |
|-------|-------|-------|
| `token_exchange_failed` | Code → token exchange | Auth code expired, already used, or Bungie config mismatch |
| `membership_fetch_failed` | Membership data fetch | Bungie API down or returned invalid data |
| `session_creation_failed` | DB / session write | Database or KV write failure |

---

## Cookie Behavior

The session cookie `marathondb_session` is:
- **HttpOnly** — JavaScript cannot read it
- **Secure** — Only sent over HTTPS
- **SameSite=Lax** — Sent on top-level navigations (redirects) and same-site requests
- **30-day expiry**
- Set on `accounts.marathondb.gg`

Since the frontend is on `marathondb.gg` (different subdomain), `credentials: 'include'` is **required** on every `fetch()` call.

---

## Anonymous vs. Authenticated Features

| Feature | Anonymous | Logged In |
|---------|-----------|-----------|
| Browse items | Yes | Yes |
| Search players | Yes | Yes |
| View public profiles | Yes | Yes |
| Resolve Bungie/username profiles | Yes | Yes |
| View guides | Yes | Yes |
| Mark items owned | No | Yes |
| Edit profile / username | No | Yes |
| Link platforms | No | Yes |
| Delete account | No | Yes |

When an anonymous user tries a protected action, show a login prompt.

---

## Auth Flow Diagram

```
                    marathondb.gg                    accounts.marathondb.gg              bungie.net
                    ─────────────                    ──────────────────────              ──────────
User clicks
"Login with Bungie"
        │
        ▼
Navigate to ──────────────────────► /auth/bungie/login
                                         │
                                         ▼
                                    302 Redirect ──────────────────────► /en/OAuth/Authorize
                                                                              │
                                                                     User authenticates
                                                                              │
                                                                              ▼
                                    /auth/bungie/callback ◄────────── 302 with ?code=...
                                         │
                                    Exchange code for token
                                    Fetch full membership data
                                    (display name, #code, avatar,
                                     platform memberships)
                                         │
                              ┌──── Account exists? ────┐
                              │                         │
                             YES                        NO
                              │                         │
                         Set cookie               Save pending data
                         Refresh cache            in KV (10min TTL)
                              │                         │
                              ▼                         ▼
  / ◄───────────── 302 Redirect          /auth/create-account?token=... ◄── 302
  │                                                     │
  │                                                User picks username
  │                                                     │
  │                                                     ▼
  │                                      POST /auth/complete-registration
  │                                      { token, username }
  │                                                     │
  │                                                Set cookie
  │                                                Store memberships
  │                                                     │
  ▼                                                     ▼
HOME (logged in)                                   HOME (logged in)
```

---

## Search + Profile Flow

```
┌─────────────────────────────┐
│   User types in search bar  │
│   "MarathonDB"              │
└──────────────┬──────────────┘
               │
               ▼
     POST /search/players
     { display_name_prefix: "MarathonDB" }
               │
               ▼
  ┌────────────────────────────┐
  │ Results (each with):       │
  │  • bungie_name             │
  │  • bungie_net_membership_id│
  │  • platform memberships    │
  │  • marathondb_user (or null│
  └────────────┬───────────────┘
               │
     User clicks a result
               │
     ┌─────────┴──────────┐
     │                    │
  Has MarathonDB       No MarathonDB
  account              account
     │                    │
     ▼                    ▼
  Navigate to         GET /profile/bungie/:id
  /user/{username}    (shows Bungie data only,
  or /profile/{user}   marathondb_user = null)
```

---

## Quick Reference: Bungie Avatar URL

The `bungie_avatar_path` field stores a relative path. To render it:

```js
function bungieAvatarUrl(avatarPath) {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath; // already full URL (profile endpoints)
  return `https://www.bungie.net${avatarPath}`;
}
```

> Profile endpoints (`/profile/bungie/:id` and `/profile/:username`) already return full URLs for `avatar_path`. The `/user/me` and `/user/:id` endpoints return the raw relative path in `bungie_avatar_path`.

---

## Quick Reference: Platform Icon Mapping

```js
const PLATFORM_ICONS = {
  1:   'xbox',     // Xbox
  2:   'psn',      // PlayStation
  3:   'steam',    // Steam
  254: 'bungie',   // Bungie.net
};

// Use with membership_type / type values from any endpoint
```
