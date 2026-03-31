# Auth Callback Fix — `{"success":false,"error":"Authentication failed"}`

## Issue

Users complete Bungie OAuth successfully but are redirected back to:

```
https://accounts.marathondb.gg/auth/bungie/callback?code=c8a667e10ab51e0b8b43bd165a4df447
```

and see `{"success":false,"error":"Authentication failed"}` instead of being logged in.

The Bungie side of the flow is working — the `code` is being issued correctly. The failure is happening inside the callback handler on our backend.

---

## Likely Causes & Required Fixes

### 1. Session Cookie `SameSite` Setting — CRITICAL

When `/auth/bungie/login` initiates the OAuth flow, the backend stores a `state` value in the session to prevent CSRF. When Bungie redirects back with `?code=...`, the backend must read that `state` from the session cookie to validate the response.

**The problem:** The redirect back from Bungie is a cross-site navigation. If the session cookie is set with `SameSite=Strict`, the browser will **not** send it on that redirect, so the state lookup fails and authentication is rejected.

**Required fix:** The session cookie must use `SameSite=Lax`.

```
Set-Cookie: marathondb_session=...; 
  Domain=accounts.marathondb.gg;
  SameSite=Lax;        ← NOT Strict — Strict breaks OAuth redirects
  Secure;
  HttpOnly;
  Path=/
```

---

### 2. Redirect URI Must Exactly Match the Bungie App Portal — CRITICAL

When exchanging the `code` for an access token, the `redirect_uri` in the POST body must be **byte-for-byte identical** to the URI registered in the Bungie developer portal at https://www.bungie.net/en/Application.

Common mismatches that cause silent failures:
- `http://` vs `https://`
- Trailing slash present or absent
- `www.` prefix difference
- Derived from the request `Host` header instead of a hard-coded constant

**Required fix:** Hard-code the redirect URI as a constant. Do not derive it dynamically from the incoming request.

```js
// Token exchange request body — redirect_uri must be a hard-coded constant
const body = new URLSearchParams({
  grant_type: 'authorization_code',
  code: code,
  redirect_uri: 'https://accounts.marathondb.gg/auth/bungie/callback', // must exactly match Bungie portal
  client_id: BUNGIE_CLIENT_ID,
  client_secret: BUNGIE_CLIENT_SECRET,
});

const tokenRes = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
});
```

---

### 3. CORS Configuration — HIGH

All API calls from the frontend use `credentials: 'include'` (required to send the session cookie cross-origin). This requires the backend to respond with an **explicit origin**, not a wildcard.

**Required fix:**

```
Access-Control-Allow-Origin: https://marathondb.gg
Access-Control-Allow-Credentials: true
```

`Access-Control-Allow-Origin: *` will not work with credentialed requests — the browser will block the response.

If the site is also accessed via `www.marathondb.gg`, reflect the request `Origin` header conditionally for that second origin rather than using `*`.

---

### 4. Add Granular Error Logging to the Callback Handler — HIGH

Currently the handler returns the same generic `"Authentication failed"` string for every failure mode, making it impossible to diagnose remotely. The callback has at least three distinct failure points:

| Stage | What can fail |
|---|---|
| State validation | Session cookie not present / state mismatch |
| Token exchange | Bungie returns an error (wrong `client_secret`, wrong `redirect_uri`, expired code) |
| Membership fetch | `GetMembershipDataForCurrentUser` call fails (wrong API key, network error, unhandled exception) |

**Required fix:** Return (or at minimum log) the specific failure reason:

```js
// Example — surface distinct error codes
try {
  // 1. Validate state
  if (req.query.state !== session.oauthState) {
    return res.json({ success: false, error: 'state_mismatch' });
  }

  // 2. Exchange code for token
  const tokenData = await exchangeCode(req.query.code);
  if (!tokenData.access_token) {
    return res.json({ success: false, error: 'token_exchange_failed', detail: tokenData });
  }

  // 3. Fetch membership data
  const membershipData = await getMembershipData(tokenData.access_token);
  if (membershipData.ErrorCode !== 1) {
    return res.json({ success: false, error: 'membership_fetch_failed', detail: membershipData });
  }

  // ... rest of login / registration flow

} catch (err) {
  console.error('OAuth callback error:', err);
  return res.json({ success: false, error: 'internal_error', detail: err.message });
}
```

---

### 5. Call `GetMembershipDataForCurrentUser` After Token Exchange — MEDIUM

Per our internal spec ([ACCOUNT_BACKEND_UPGRADES.md](./ACCOUNT_BACKEND_UPGRADES.md)), the callback must call this Bungie endpoint immediately after receiving the access token to retrieve the full Bungie identity (display name + `#code` discriminator, game membership IDs, avatar).

If this call is either missing or throwing an unhandled exception, it may be the direct cause of the `"Authentication failed"` response.

```
GET https://www.bungie.net/Platform/User/GetMembershipDataForCurrentUser/
Headers:
  Authorization: Bearer {access_token}
  X-API-Key: {BUNGIE_API_KEY}
```

The backend must handle cases where `destinyMemberships` is an empty array (Bungie account with no game linked) without throwing.

---

## Diagnostic Steps (Before Code Changes)

If you want to identify which step is failing before making changes, temporarily modify the callback to return the raw error detail as described in point 4 above, then attempt a login and inspect the response body in browser DevTools → Network tab → the callback request.

---

## Summary

| # | Change | Priority |
|---|---|---|
| 1 | Set session cookie to `SameSite=Lax` | **Critical** |
| 2 | Hard-code `redirect_uri` in token exchange — must match Bungie portal exactly | **Critical** |
| 3 | Set `Access-Control-Allow-Origin: https://marathondb.gg` + `Access-Control-Allow-Credentials: true` | High |
| 4 | Add per-stage error logging/responses in the callback handler | High |
| 5 | Implement `GetMembershipDataForCurrentUser` call post-token-exchange (see `ACCOUNT_BACKEND_UPGRADES.md`) | Medium |

Items 1 and 2 are the most likely root cause. Both can be verified and fixed in under an hour.
