# Marathon Items API — Documentation

**Base URL:** `https://items.marathondb.gg`  
**Version:** 1.0.0  
**Stack:** Cloudflare Workers + Hono, D1 (SQLite), R2 (images)  
**CORS:** All origins allowed

---

## Table of Contents

- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Public Endpoints](#public-endpoints)
  - [GET /api/items](#get-apiitems)
  - [GET /api/items/ranked](#get-apiitemsranked)
  - [GET /api/items/:slug](#get-apiitemsslug)
  - [GET /api/item-types](#get-apiitem-types)
  - [GET /api/stats](#get-apistats)
  - [GET /images/items/:slug.webp](#get-imagesitemsslugwebp)
- [Admin Endpoints](#admin-endpoints)
  - [GET /api/admin/items](#get-apiadminitems)
  - [GET /api/admin/items/:slug](#get-apiadminitemsslug)
  - [POST /api/admin/items](#post-apiadminitems)
  - [PUT /api/admin/items/:slug](#put-apiadminitemsslug)
  - [DELETE /api/admin/items/:slug](#delete-apiadminitemsslug)
  - [POST /api/admin/upload-image](#post-apiadminupload-image)
- [Data Reference](#data-reference)
  - [Item Object](#item-object)
  - [Rarities](#rarities)
  - [Vendor Listing Schema](#vendor-listing-schema)
  - [Ranked Ranks](#ranked-ranks)

---

## Response Format

All endpoints return JSON with a consistent envelope:

```json
{
  "success": true,
  "count": 42,       // present on list endpoints
  "data": [ ... ]    // array or single object
}
```

---

## Error Handling

Errors return the same shape with an HTTP status code:

```json
{
  "success": false,
  "error": "Item not found"
}
```

| Status | Meaning |
|--------|---------|
| `400`  | Bad request — missing or invalid parameters |
| `404`  | Resource not found |
| `500`  | Internal server error |

---

## Public Endpoints

These require **no authentication** and are freely accessible.

---

### GET /api/items

List items with optional filtering. Returns **active items only** by default.

**Query Parameters:**

| Param    | Type   | Default | Description |
|----------|--------|---------|-------------|
| `type`   | string | —       | Filter by `item_type` (e.g. `Weapon`, `Armor`) |
| `rarity` | string | —       | Filter by rarity (e.g. `superior`, `contraband`) |
| `active` | string | `1`     | `1` = active only, `0` = inactive only, `all` = no filter |

**Sort order:** `item_type` → rarity tier → `name` (alphabetical)

**Example request:**
```
GET /api/items?type=Weapon&rarity=superior
```

**Example response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "slug": "plasma-cutter",
      "name": "Plasma Cutter",
      "item_type": "Weapon",
      "rarity": "superior",
      "description": "High-powered energy weapon",
      "image_url": "/images/items/plasma-cutter.webp",
      "acquisition_note": null,
      "verified": 1,
      "value": 1500.0,
      "known_locations": ["Titan Station", "Orbital Hub"],
      "is_purchasable": 1,
      "vendor_listings": [],
      "is_ranked_reward": 0,
      "ranked_ranks": [],
      "is_active": 1,
      "created_at": "2025-01-15 10:30:00",
      "updated_at": "2025-01-15 10:30:00"
    }
  ]
}
```

> **Note:** `known_locations`, `vendor_listings`, and `ranked_ranks` are returned as parsed arrays/objects, not raw JSON strings.

---

### GET /api/items/ranked

Returns only active items flagged as **ranked rewards**, sorted the same as the main items list.

**Example request:**
```
GET /api/items/ranked
```

**Example response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 5,
      "slug": "diamond-trophy-armor",
      "name": "Diamond Trophy Armor",
      "item_type": "Armor",
      "rarity": "prestige",
      "is_ranked_reward": 1,
      "ranked_ranks": ["Diamond", "Pinnacle"],
      ...
    }
  ]
}
```

> Ranked items also appear in the regular `/api/items` list — this endpoint is a convenience filter.

---

### GET /api/items/:slug

Get a single item by its URL-friendly slug.

**Path parameters:**

| Param  | Type   | Description |
|--------|--------|-------------|
| `slug` | string | Unique item slug (e.g. `plasma-cutter`) |

**200 response:**
```json
{
  "success": true,
  "data": { /* full Item object */ }
}
```

**404 response:**
```json
{
  "success": false,
  "error": "Item not found"
}
```

---

### GET /api/item-types

Returns all distinct `item_type` values currently used in the database, sorted alphabetically. Useful for populating filter dropdowns.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": ["Armor", "Consumable", "Material", "Tool", "Weapon"]
}
```

---

### GET /api/stats

Aggregate item statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 128,
    "active": 115,
    "by_rarity": [
      { "rarity": "standard", "count": 40 },
      { "rarity": "enhanced", "count": 30 },
      { "rarity": "deluxe", "count": 25 },
      { "rarity": "superior", "count": 18 },
      { "rarity": "prestige", "count": 10 },
      { "rarity": "contraband", "count": 5 }
    ],
    "by_type": [
      { "item_type": "Weapon", "count": 35 },
      { "item_type": "Armor", "count": 28 }
    ]
  }
}
```

---

### GET /images/items/:slug.webp

Streams the item's WebP image from R2 storage. Returns a **binary image**, not JSON.

**Path parameters:**

| Param  | Type   | Description |
|--------|--------|-------------|
| `slug` | string | Item slug |

**Response headers:**

| Header          | Value |
|-----------------|-------|
| `Content-Type`  | `image/webp` |
| `Cache-Control` | `public, max-age=604800` (7 days) |
| `ETag`          | R2 object etag |

Returns `404` JSON error if no image exists.

---

## Admin Endpoints

All admin routes are under `/api/admin/`. These modify data.

---

### GET /api/admin/items

List **all** items including inactive. Supports the same `type` and `rarity` query filters as the public endpoint (but no `active` filter — everything is returned).

**Query parameters:**

| Param    | Type   | Description |
|----------|--------|-------------|
| `type`   | string | Filter by item type |
| `rarity` | string | Filter by rarity |

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [ /* array of Item objects */ ]
}
```

---

### GET /api/admin/items/:slug

Same as public detail endpoint, through the admin route. Returns the item regardless of `is_active` status.

---

### POST /api/admin/items

Create a new item. A URL-friendly `slug` is auto-generated from `name`, or you can provide one.

**Request body (JSON):**

| Field              | Type     | Required | Default | Description |
|--------------------|----------|----------|---------|-------------|
| `name`             | string   | **yes**  | —       | Item display name |
| `rarity`           | string   | **yes**  | —       | Must be one of the 6 rarity tiers |
| `slug`             | string   | no       | auto    | Override auto-generated slug |
| `item_type`        | string   | no       | `""`    | Category (e.g. "Weapon", "Armor") |
| `description`      | string   | no       | `null`  | Description text |
| `image_url`        | string   | no       | `null`  | Image path (usually set by upload) |
| `acquisition_note` | string   | no       | `null`  | How to acquire the item |
| `verified`         | boolean  | no       | `false` | Whether info is verified |
| `value`            | number   | no       | `null`  | Numerical value |
| `known_locations`  | string[] | no       | `[]`    | Array of location names |
| `is_purchasable`   | boolean  | no       | `false` | Can be purchased from vendors |
| `vendor_listings`  | array    | no       | `null`  | Vendor data (see [Vendor Schema](#vendor-listing-schema)) |
| `is_ranked_reward` | boolean  | no       | `false` | Whether this is a ranked reward item |
| `ranked_ranks`     | string[] | no       | `[]`    | Ranks required (see [Ranked Ranks](#ranked-ranks)) |
| `is_active`        | boolean  | no       | `true`  | Whether publicly visible |

**Slug generation:** The name is lowercased, apostrophes removed, spaces become hyphens, non-alphanumeric characters stripped. Example: `"Titan's Edge Mk.II"` → `"titans-edge-mkii"`.

**Example request:**
```json
{
  "name": "Plasma Cutter",
  "rarity": "superior",
  "item_type": "Weapon",
  "description": "High-powered energy weapon",
  "value": 1500,
  "known_locations": ["Titan Station"],
  "is_active": true
}
```

**201 response:**
```json
{
  "success": true,
  "data": { /* created Item object with generated id, slug, timestamps */ }
}
```

**Possible errors:**
- `400` — `name is required`
- `400` — `rarity is required`
- `400` — `Invalid rarity. Must be one of: standard, enhanced, deluxe, superior, prestige, contraband`
- `400` — `Could not generate a valid slug from the provided name`

---

### PUT /api/admin/items/:slug

Partially update an existing item. **Only include fields you want to change** — omitted fields retain their current values.

**Path parameters:**

| Param  | Type   | Description |
|--------|--------|-------------|
| `slug` | string | The item slug to update |

**Request body (JSON):** Same fields as create, but all are optional.

**Example — deactivate an item:**
```json
{
  "is_active": false
}
```

**Example — update vendor listings:**
```json
{
  "vendor_listings": [
    {
      "vendor_name": "Station Merchant",
      "credits": 500,
      "quantity": 3,
      "faction_rank": "Rank 2",
      "barters": []
    }
  ]
}
```

**200 response:**
```json
{
  "success": true,
  "data": { /* full updated Item object */ }
}
```

**Possible errors:**
- `404` — `Item not found`
- `400` — `Invalid rarity. Must be one of: ...`

> **Clearing nullable fields:** Send the field as `null` to clear it (e.g. `"description": null`). Sending an empty `known_locations` array (`[]`) stores `null` in the DB.

---

### DELETE /api/admin/items/:slug

Permanently deletes an item and its associated R2 image.

**Path parameters:**

| Param  | Type   | Description |
|--------|--------|-------------|
| `slug` | string | Item slug to delete |

**200 response:**
```json
{
  "success": true,
  "message": "Item \"plasma-cutter\" deleted"
}
```

**404 response:**
```json
{
  "success": false,
  "error": "Item not found"
}
```

> ⚠️ **Destructive** — cannot be undone. Both the database row and the R2 image are permanently removed.

---

### POST /api/admin/upload-image

Upload a WebP image for an item. Uses `multipart/form-data`.

**Query parameters:**

| Param  | Type   | Required | Description |
|--------|--------|----------|-------------|
| `slug` | string | **yes**  | Item slug to associate the image with |

**Form fields:**

| Field   | Type | Description |
|---------|------|-------------|
| `image` | File | WebP image file (must have an `image/*` content type) |

**Storage:** The image is stored at R2 key `items/{slug}.webp`.

**cURL example:**
```bash
curl -X POST \
  "https://items.marathondb.gg/api/admin/upload-image?slug=plasma-cutter" \
  -F "image=@plasma-cutter.webp"
```

**JavaScript example:**
```javascript
const formData = new FormData();
formData.append('image', file); // File or Blob

const res = await fetch(`/api/admin/upload-image?slug=${slug}`, {
  method: 'POST',
  body: formData,
});
const { success, url } = await res.json();
```

**200 response:**
```json
{
  "success": true,
  "url": "/images/items/plasma-cutter.webp?v=1710000000000"
}
```

> The `?v=` parameter is a cache buster so browsers and CDN edges treat re-uploaded images as new resources.

**Possible errors:**
- `400` — `slug query parameter is required`
- `400` — `Expected multipart/form-data`
- `400` — `Form field "image" (file) is required`
- `400` — `Uploaded file must be an image`

---

## Data Reference

### Item Object

Complete shape of an item returned by the API:

| Field              | Type            | Nullable | Description |
|--------------------|-----------------|----------|-------------|
| `id`               | integer         | no       | Auto-incrementing primary key |
| `slug`             | string          | no       | Unique URL-friendly identifier |
| `name`             | string          | no       | Display name |
| `item_type`        | string          | no       | Category (may be empty string `""`) |
| `rarity`           | string          | no       | One of 6 tiers (see below) |
| `description`      | string \| null  | yes      | Item description |
| `image_url`        | string \| null  | yes      | Path to item image (e.g. `/images/items/slug.webp`) |
| `acquisition_note` | string \| null  | yes      | Notes on how to acquire |
| `verified`         | `0` \| `1`      | no       | Whether info is verified (integer boolean) |
| `value`            | number \| null  | yes      | Numerical value |
| `known_locations`  | string[]        | no       | Parsed array of location names (empty `[]` if none) |
| `is_purchasable`   | `0` \| `1`      | no       | Can be purchased (integer boolean) |
| `vendor_listings`  | object[]        | no       | Parsed vendor data (empty `[]` if none) |
| `is_ranked_reward` | `0` \| `1`      | no       | Whether this is a ranked reward (integer boolean) |
| `ranked_ranks`     | string[]        | no       | Parsed array of rank names (empty `[]` if none) |
| `is_active`        | `0` \| `1`      | no       | Whether publicly visible (integer boolean) |
| `created_at`       | string          | no       | SQLite datetime string |
| `updated_at`       | string          | no       | SQLite datetime string |

> **Integer booleans:** `verified`, `is_purchasable`, `is_ranked_reward`, and `is_active` are stored as `0`/`1` in SQLite. When creating or updating via the API, you can send JavaScript `true`/`false` — the API converts them.

---

### Rarities

Six tiers, ordered from most common to rarest:

| Value        | Order | Description |
|--------------|-------|-------------|
| `standard`   | 1     | Most common |
| `enhanced`   | 2     | Uncommon |
| `deluxe`     | 3     | Rare |
| `superior`   | 4     | Very rare |
| `prestige`   | 5     | Extremely rare |
| `contraband` | 6     | Rarest / illicit |

List endpoints sort items: `item_type` → rarity (above order) → `name` alphabetically.

---

### Vendor Listing Schema

Each entry in the `vendor_listings` array:

```json
{
  "vendor_name": "Station Merchant",
  "credits": 500,
  "quantity": 3,
  "faction_rank": "Rank 2",
  "barters": [
    {
      "give": [
        { "name": "Scrap Metal", "quantity": 10 }
      ],
      "receive": [
        { "name": "Plasma Cutter", "quantity": 1 }
      ]
    }
  ]
}
```

| Field                     | Type     | Description |
|---------------------------|----------|-------------|
| `vendor_name`             | string   | Name of the vendor |
| `credits`                 | number   | Credit cost at this vendor |
| `quantity`                | number   | Available quantity |
| `faction_rank`            | string   | Required faction rank |
| `barters`                 | array    | Barter trades at this vendor |
| `barters[].give`          | array    | Items the player provides |
| `barters[].give[].name`   | string   | Item name |
| `barters[].give[].quantity`| number  | Amount required |
| `barters[].receive`       | array    | Items the player receives |
| `barters[].receive[].name` | string  | Item name |
| `barters[].receive[].quantity`| number | Amount received |

---

### Ranked Ranks

Six ranks that can be assigned to ranked reward items, ordered from lowest to highest:

| Value       | Order | Description |
|-------------|-------|-------------|
| `Bronze`    | 1     | Lowest rank |
| `Silver`    | 2     | |
| `Gold`      | 3     | |
| `Platinum`  | 4     | |
| `Diamond`   | 5     | |
| `Pinnacle`  | 6     | Highest rank |

Items flagged with `is_ranked_reward: true` should have one or more ranks in the `ranked_ranks` array indicating which ranks unlock the item.

---

### Health Check

```
GET /
```

Returns API metadata and the list of valid rarities:

```json
{
  "api": "Marathon Items API",
  "version": "1.0.0",
  "description": "Items database for Marathon video game.",
  "rarities": ["standard", "enhanced", "deluxe", "superior", "prestige", "contraband"],
  "endpoints": {
    "items": "/api/items",
    "item_detail": "/api/items/:slug",
    "ranked_items": "/api/items/ranked",
    "item_types": "/api/item-types",
    "stats": "/api/stats",
    "images": "/images/items/:slug.webp"
  }
}
```
