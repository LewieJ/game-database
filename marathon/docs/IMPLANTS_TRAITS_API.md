# Implants Traits API — Frontend Guide

**Base URL:** `https://implants.marathondb.gg`

Traits are a standalone catalog of named abilities/properties that can be associated with implants. They live in their own table (`implant_traits`) with a unique `slug` per trait.

---

## Data Shape

### Trait Object

```ts
interface Trait {
  id: number;           // internal DB id
  slug: string;         // URL-safe unique key, e.g. "iron-skin"
  name: string;         // display name, e.g. "Iron Skin"
  description: string;  // flavour / mechanic text
  slot: string | null;  // implant slot: "head" | "torso" | "legs" | "shield" | null
  created_at: string;   // ISO datetime string
}
```

---

## Public Endpoints

These are read-only and require **no authentication**.

---

### `GET /api/traits`

Returns the full traits catalog, sorted alphabetically by name.

**Request**
```
GET https://implants.marathondb.gg/api/traits
```

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `slot` | string | ❌ | Filter by implant slot: `head`, `torso`, `legs`, or `shield`. |

**Example — filter by slot**
```
GET https://implants.marathondb.gg/api/traits?slot=head
```

**Response**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "slug": "hardened",
      "name": "Hardened",
      "description": "Reduces incoming damage from explosives.",
      "slot": "torso"
    },
    {
      "slug": "iron-skin",
      "name": "Iron Skin",
      "description": "Passively increases armour integrity.",
      "slot": null
    }
  ]
}
```

> **Note:** The public endpoint returns `slug`, `name`, `description`, and `slot` only (no `id` or `created_at`). A `slot` of `null` means the trait is not restricted to a specific slot.

---

### Traits on Implant Responses

Every implant returned from `/api/implants`, `/api/implants/slot/:slot`, and `/api/implants/:slug` includes a `traits` array. This is a legacy JSON column kept for backwards compatibility and currently holds `[]` for all implants since migration `0004`. Use `/api/traits` for the authoritative catalog.

```json
{
  "id": 7,
  "slug": "neural-boost-v2",
  "name": "Neural Boost V2",
  "slot": "head",
  "rarity": "deluxe",
  "traits": [],
  "stats": [
    { "stat_name": "agility", "stat_value": 12 }
  ]
}
```

---

## Admin Endpoints

These endpoints are used to manage the traits catalog. They sit under `/api/admin/traits`.

> **Auth:** These routes are admin-only. Ensure any requests include appropriate authorization headers as required by your deployment.

---

### `GET /api/admin/traits`

Returns the full catalog including all fields (`id`, `created_at`).

**Request**
```
GET https://implants.marathondb.gg/api/admin/traits
```

**Response**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": 1,
      "slug": "hardened",
      "name": "Hardened",
      "description": "Reduces incoming damage from explosives.",
      "slot": "torso",
      "created_at": "2026-01-15 10:00:00"
    }
  ]
}
```

---

### `POST /api/admin/traits`

Creates a new trait. The `slug` is **auto-generated** from the `name` — you do not supply it.

**Request**
```
POST https://implants.marathondb.gg/api/admin/traits
Content-Type: application/json
```

**Body**
```json
{
  "name": "Iron Skin",
  "description": "Passively increases armour integrity.",
  "slot": "torso"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Used to generate the slug. |
| `description` | string | ❌ | Defaults to `""` if omitted. |
| `slot` | string | ❌ | Implant slot: `head`, `torso`, `legs`, or `shield`. Defaults to `null` (any slot). |

**Slug generation rules:**
- Lowercased
- Apostrophes (`'`, `'`) removed
- Spaces → `-`
- All non-alphanumeric/hyphen characters stripped
- Consecutive hyphens collapsed
- Leading/trailing hyphens removed

Examples:
- `"Iron Skin"` → `iron-skin`
- `"Runner's Edge"` → `runners-edge`
- `"AMP V2"` → `amp-v2`

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": 13,
    "slug": "iron-skin",
    "name": "Iron Skin",
    "description": "Passively increases armour integrity.",
    "slot": "torso",
    "created_at": "2026-03-08 12:00:00"
  }
}
```

**Error — duplicate name**
```json
{
  "success": false,
  "error": "Trait \"Iron Skin\" already exists"
}
```

---

### `PUT /api/admin/traits/:slug`

Updates an existing trait's `name`, `description`, and/or `slot`. At least one field must be provided.

**Request**
```
PUT https://implants.marathondb.gg/api/admin/traits/iron-skin
Content-Type: application/json
```

**Body** *(all fields optional, but at least one required)*
```json
{
  "name": "Iron Skin",
  "description": "Updated description text.",
  "slot": "legs"
}
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | Replaces the display name. Does **not** update the slug. |
| `description` | string | Replaces the description. |
| `slot` | string \| null | Sets the implant slot. Pass `null` or `""` to clear it. |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": 13,
    "slug": "iron-skin",
    "name": "Iron Skin",
    "description": "Updated description text.",
    "slot": "legs",
    "created_at": "2026-03-08 12:00:00"
  }
}
```

**Error — not found**
```json
{
  "success": false,
  "error": "Trait not found"
}
```

---

### `DELETE /api/admin/traits/:slug`

Permanently removes a trait from the catalog.

**Request**
```
DELETE https://implants.marathondb.gg/api/admin/traits/iron-skin
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Trait deleted"
}
```

**Error — not found**
```json
{
  "success": false,
  "error": "Trait not found"
}
```

---

## Usage Examples

### Fetch all traits and render them

```ts
const res = await fetch('https://implants.marathondb.gg/api/traits');
const { data: traits } = await res.json();

for (const trait of traits) {
  console.log(`[${trait.slot ?? 'any'}] ${trait.name}: ${trait.description}`);
}
```

### Add a new trait

```ts
const res = await fetch('https://implants.marathondb.gg/api/admin/traits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Iron Skin',
    description: 'Passively increases armour integrity.',
    slot: 'torso',
  }),
});
const result = await res.json();
// result.data.slug === "iron-skin"
// result.data.slot === "torso"
```

### Update a trait's description

```ts
const res = await fetch('https://implants.marathondb.gg/api/admin/traits/iron-skin', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: 'New description here.' }),
});
```

### Delete a trait

```ts
await fetch('https://implants.marathondb.gg/api/admin/traits/iron-skin', {
  method: 'DELETE',
});
```

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/traits` | Public | List all traits (slug, name, description, slot). Supports `?slot=` filter. |
| `GET` | `/api/admin/traits` | Admin | List all traits (full fields inc. id, slot, created_at) |
| `POST` | `/api/admin/traits` | Admin | Create a trait (slug auto-generated from name, optional slot) |
| `PUT` | `/api/admin/traits/:slug` | Admin | Update name, description, and/or slot |
| `DELETE` | `/api/admin/traits/:slug` | Admin | Delete a trait permanently |
