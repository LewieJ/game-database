# Marathon Contracts API — Frontend Integration Guide

> **Base URL (production):** `https://marathon-contracts-api.heymarathondb.workers.dev`  
> **Base URL (local dev):** `http://localhost:8787`  
> **All responses** are JSON. All list responses wrap data in `{ data: [...] }`.  
> **CORS:** Open (`*`) — no credentials or special headers required for GET requests.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Response Shape](#response-shape)
3. [Endpoints](#endpoints)
   - [Root / Discovery](#root--discovery)
   - [Health Check](#health-check)
   - [Contracts](#contracts)
   - [Factions](#factions)
   - [Contract Tags](#contract-tags)
4. [TypeScript Types](#typescript-types)
5. [Factions Reference](#factions-reference)
6. [Tags Reference](#tags-reference)
7. [Enums & Constants](#enums--constants)
8. [Error Responses](#error-responses)
9. [Filtering Contracts](#filtering-contracts)
10. [Example Fetch Patterns](#example-fetch-patterns)

---

## Quick Start

```ts
const API = "https://marathon-contracts-api.heymarathondb.workers.dev";

// All contracts for a faction
const res = await fetch(`${API}/api/contracts?faction=cyberacme`);
const { data } = await res.json(); // ContractListing[]

// Single contract detail
const detail = await fetch(`${API}/api/contracts/cyber-liaison-alpha`);
const contract = await detail.json(); // ContractDetail
```

---

## Response Shape

### List endpoints
```json
{
  "data": [ ...items ],
  "total": 12,
  "filters": { "faction": "cyberacme" }
}
```

### Detail endpoints (contracts)
```json
{
  "data": { ...contract },
  "meta": { "slug": "cyber-liaison-alpha", "fetched_at": "2026-03-03T..." }
}
```

### Error responses
```json
{
  "error": "Contract not found",
  "code": 404
}
```

---

## Endpoints

### Root / Discovery

```
GET /
```

Returns API metadata, all available endpoints, query parameter reference, and all 6 factions with colors.

**No parameters.**

```ts
type RootResponse = {
  name: string;
  version: string;
  base_url: string;
  endpoints: Record<string, string>;
  query_params: Record<string, Record<string, string>>;
  factions: { slug: string; name: string; color: string }[];
};
```

---

### Health Check

```
GET /health
```

```json
{ "status": "ok", "timestamp": "2026-03-03T12:00:00.000Z" }
```

Use this to check if the worker is alive before making other calls.

---

### Contracts

#### List Contracts

```
GET /api/contracts
```

Returns a flat list of contract summaries. Supports filtering via query params.

| Param        | Type     | Description |
|--------------|----------|-------------|
| `faction`    | string   | Faction slug (`cyberacme`, `nucaloric`, `traxus`, `mida`, `arachne`, `sekiguchi`) |
| `type`       | string   | `liaison` \| `standard` \| `priority` |
| `difficulty` | string   | `easy` \| `normal` \| `hard` |
| `map`        | string   | `perimeter` \| `dire-marsh` \| `outpost` \| `any-zone` |
| `scope`      | string   | `single_run` \| `cumulative` |
| `tag`        | string   | Tag slug (e.g. `combat`, `stealth`, `delivery`) |
| `chain`      | string   | Chain slug — returns all contracts in a quest chain |
| `active`     | boolean  | `true` (default) \| `false` |
| `season`     | string   | Season slug |

**Example requests:**
```
GET /api/contracts?faction=traxus&type=priority
GET /api/contracts?tag=stealth&difficulty=hard
GET /api/contracts?chain=cyber-chain-alpha
GET /api/contracts?active=false
```

**Response:**
```ts
type ContractsListResponse = {
  data: ContractListing[];
  total: number;
  filters: Record<string, string>;
};
```

**`ContractListing` shape:**
```ts
{
  slug: string;
  name: string;
  description: string | null;
  contract_type: "liaison" | "standard" | "priority";
  difficulty: "easy" | "normal" | "hard" | null;
  difficulty_rating: number | null;          // 1–5
  scope: "single_run" | "cumulative" | null;
  faction: {
    slug: string;
    name: string;
    color_surface: string;                   // hex, e.g. "#01d838"
    color_on_surface: string;
  };
  map_slug: string | null;
  season_slug: string | null;
  season_name: string | null;
  is_active: boolean;
  is_repeatable: boolean;
  is_rerollable: boolean;
  max_rerolls: number | null;
  reroll_cost: { amount: number; currency_slug: string } | null;
  chain_slug: string | null;
  chain_position: number | null;
  chain_total: number | null;
  tags: { slug: string; name: string; color: string | null }[];
  reward_preview: {
    total_reputation: number;
    item_count: number;
    has_weapon: boolean;
    has_cosmetic: boolean;
    primary_reward_icon: string | null;
  };
  sort_order: number;
  estimated_time_minutes: number | null;
  estimated_time_range: string | null;
}
```

---

#### Get Contract Detail

```
GET /api/contracts/:slug
```

Returns full contract data including all steps, step rewards, completion rewards, chain info, and related contracts.

**Example:**
```
GET /api/contracts/cyber-liaison-alpha
```

**Response:**
```ts
type ContractDetailResponse = {
  data: ContractDetail;
  meta: { slug: string; fetched_at: string };
};
```

**`ContractDetail` shape** (extends ContractListing, adds):
```ts
{
  // ...all ContractListing fields, plus:
  flavor_text: string | null;
  story_text: string | null;
  story_image_url: string | null;
  video_url: string | null;
  tips: string[];                            // parsed JSON array
  agent_name: string | null;
  required_rank: number | null;
  available_from: string | null;             // ISO date
  available_until: string | null;            // ISO date
  cooldown_hours: number | null;
  time_difficulty_note: string | null;
  steps: ContractStep[];
  completion_rewards: Reward[];
  prerequisites: { slug: string; name: string }[];
  choice_groups: ChoiceRewardGroup[];
  related: ContractListing[];
}
```

**`ContractStep` shape:**
```ts
{
  step_number: number;
  name: string | null;
  description: string | null;
  count: number;                             // e.g. "Kill 5 enemies" → count: 5
  is_sequential: boolean;
  map_slug: string | null;
  location_hint: string | null;
  walkthrough: string | null;
  rewards: Reward[];
}
```

**`Reward` shape:**
```ts
{
  reward_type: "credits" | "reputation" | "salvage" | "weapon" | "weapon_mod"
             | "cosmetic" | "upgrade_token" | "faction_token" | "item";
  amount: number;
  display_name: string | null;
  icon_url: string | null;
  reference_slug: string | null;
  reference_table: string | null;
  faction_slug: string | null;
  rarity: string | null;
  is_guaranteed: boolean;
  drop_chance: number | null;               // 0.0–1.0
  cosmetic_type: string | null;
}
```

---

#### Get Contract Rotation

```
GET /api/contracts/rotation
```

Returns today's active contract rotation per faction (contracts that are "live" today).

```ts
type RotationResponse = {
  data: {
    date: string;                            // YYYY-MM-DD
    factions: {
      faction_slug: string;
      contracts: ContractListing[];
    }[];
  };
};
```

> **Note:** The rotation table requires manual population. Returns empty arrays per faction when unpopulated.

---

### Factions

#### List All Factions

```
GET /api/factions
```

Returns all 6 factions with full metadata.

```ts
type FactionsListResponse = {
  data: Faction[];
  total: number;
};
```

**`Faction` shape:**
```ts
{
  slug: string;
  name: string;
  description: string | null;
  color_surface: string;                     // primary brand color, hex
  color_on_surface: string;                  // text/icon color for use on surface
  agent_name: string | null;                 // NPC contact name
  agent_description: string | null;
  icon_url: string | null;
  reputation_methods: string[];              // parsed JSON array
}
```

---

#### Get Faction Detail

```
GET /api/factions/:slug
```

Same shape as a single Faction object.

```
GET /api/factions/cyberacme
GET /api/factions/mida
```

---

#### Get Faction Contracts

```
GET /api/factions/:slug/contracts
```

Supports same filters as `/api/contracts` (minus `faction`): `type`, `difficulty`, `scope`.

```
GET /api/factions/traxus/contracts?type=priority
GET /api/factions/nucaloric/contracts?difficulty=hard
```

Returns `{ data: ContractListing[], total: number }`.

---

#### Get Faction Upgrades

```
GET /api/factions/:slug/upgrades
```

| Param      | Type   | Description |
|------------|--------|-------------|
| `category` | string | `inventory` \| `function` \| `armory` \| `stat` |
| `tier`     | number | `1` – `6` |

```
GET /api/factions/sekiguchi/upgrades?category=armory
GET /api/factions/cyberacme/upgrades?tier=1
```

**`FactionUpgrade` shape:**
```ts
{
  id: number;
  faction_slug: string;
  slug: string;
  name: string;
  description: string | null;
  category: "inventory" | "function" | "armory" | "stat";
  tier: number;                              // 1–6
  sort_order: number;
  salvage_costs: {
    salvage_type: string;
    amount: number;
    display_name: string | null;
    icon_url: string | null;
  }[];
}
```

Response: `{ data: FactionUpgrade[], total: number, faction: Faction }`

---

#### Get Faction Reputation Ranks

```
GET /api/factions/:slug/reputation
```

Returns all reputation rank thresholds and unlocks for a faction.

```ts
type ReputationResponse = {
  data: ReputationRank[];
  faction: Faction;
  total: number;
};

type ReputationRank = {
  rank_number: number;
  rank_name: string | null;
  reputation_required: number;
  icon_url: string | null;
  unlocks: {
    unlock_type: string;
    reference_slug: string | null;
    display_name: string | null;
    icon_url: string | null;
  }[];
};
```

---

### Contract Tags

```
GET /api/contract-tags
```

Returns all tags with usage counts.

```ts
type TagsResponse = {
  data: {
    slug: string;
    name: string;
    color: string | null;
    description: string | null;
    contract_count: number;
  }[];
  total: number;
};
```

---

## TypeScript Types

Copy-paste ready types for frontend use:

```ts
// ─── Factions ─────────────────────────────────────────────────────────────

export const FACTION_SLUGS = [
  "cyberacme", "nucaloric", "traxus", "mida", "arachne", "sekiguchi"
] as const;
export type FactionSlug = typeof FACTION_SLUGS[number];

export type ContractType = "liaison" | "standard" | "priority";
export type Difficulty   = "easy" | "normal" | "hard";
export type Scope        = "single_run" | "cumulative";
export type UpgradeCategory = "inventory" | "function" | "armory" | "stat";

export type RewardType =
  | "credits" | "reputation" | "salvage" | "weapon"
  | "weapon_mod" | "cosmetic" | "upgrade_token" | "faction_token" | "item";

// ─── Core types ───────────────────────────────────────────────────────────

export interface TagObject {
  slug: string;
  name: string;
  color: string | null;
}

export interface RewardPreview {
  total_reputation: number;
  item_count: number;
  has_weapon: boolean;
  has_cosmetic: boolean;
  primary_reward_icon: string | null;
}

export interface Reward {
  reward_type: RewardType;
  amount: number;
  display_name: string | null;
  icon_url: string | null;
  reference_slug: string | null;
  reference_table: string | null;
  faction_slug: string | null;
  rarity: string | null;
  is_guaranteed: boolean;
  drop_chance: number | null;
  cosmetic_type: string | null;
}

export interface ContractStep {
  step_number: number;
  name: string | null;
  description: string | null;
  count: number;
  is_sequential: boolean;
  map_slug: string | null;
  location_hint: string | null;
  walkthrough: string | null;
  rewards: Reward[];
}

export interface FactionSummary {
  slug: FactionSlug;
  name: string;
  color_surface: string;
  color_on_surface: string;
}

export interface ContractListing {
  slug: string;
  name: string;
  description: string | null;
  contract_type: ContractType;
  difficulty: Difficulty | null;
  difficulty_rating: number | null;
  scope: Scope | null;
  faction: FactionSummary;
  map_slug: string | null;
  season_slug: string | null;
  season_name: string | null;
  is_active: boolean;
  is_repeatable: boolean;
  is_rerollable: boolean;
  max_rerolls: number | null;
  reroll_cost: { amount: number; currency_slug: string } | null;
  chain_slug: string | null;
  chain_position: number | null;
  chain_total: number | null;
  tags: TagObject[];
  reward_preview: RewardPreview;
  sort_order: number;
  estimated_time_minutes: number | null;
  estimated_time_range: string | null;
}

export interface ContractDetail extends ContractListing {
  flavor_text: string | null;
  story_text: string | null;
  story_image_url: string | null;
  video_url: string | null;
  tips: string[];
  agent_name: string | null;
  required_rank: number | null;
  available_from: string | null;
  available_until: string | null;
  cooldown_hours: number | null;
  time_difficulty_note: string | null;
  steps: ContractStep[];
  completion_rewards: Reward[];
  prerequisites: { slug: string; name: string }[];
  related: ContractListing[];
}

export interface Faction {
  slug: FactionSlug;
  name: string;
  description: string | null;
  color_surface: string;
  color_on_surface: string;
  agent_name: string | null;
  agent_description: string | null;
  icon_url: string | null;
  reputation_methods: string[];
}

export interface FactionUpgrade {
  id: number;
  faction_slug: FactionSlug;
  slug: string;
  name: string;
  description: string | null;
  category: UpgradeCategory;
  tier: number;
  sort_order: number;
  salvage_costs: {
    salvage_type: string;
    amount: number;
    display_name: string | null;
    icon_url: string | null;
  }[];
}

export interface ReputationRank {
  rank_number: number;
  rank_name: string | null;
  reputation_required: number;
  icon_url: string | null;
  unlocks: {
    unlock_type: string;
    reference_slug: string | null;
    display_name: string | null;
    icon_url: string | null;
  }[];
}
```

---

## Factions Reference

| Slug        | Display Name | Surface Color | On-Surface Color | Agent       |
|-------------|-------------|---------------|------------------|-------------|
| `cyberacme` | Cyberacme   | `#01d838`     | `#000000`        | AIMOS       |
| `nucaloric` | Nucaloric   | `#ff125d`     | `#ffffff`        | Heliana Rix |
| `traxus`    | Traxus      | `#ff7300`     | `#000000`        | Dex Carter  |
| `mida`      | Mida        | `#be72e4`     | `#ffffff`        | Sable Koss  |
| `arachne`   | Arachne     | `#e40b0d`     | `#ffffff`        | Void Sys    |
| `sekiguchi` | Sekiguchi   | `#cfb72f`     | `#000000`        | Director Emi|

---

## Tags Reference

| Slug          | Name          | Use Case |
|---------------|---------------|----------|
| `liaison`     | Liaison       | Faction story / lore missions |
| `contested`   | Contested     | PvP-adjacent or high-conflict zones |
| `priority`    | Priority      | High-value, time-sensitive objectives |
| `stealth`     | Stealth       | Avoid detection / silent approaches |
| `combat`      | Combat        | Kill-based objectives |
| `extraction`  | Extraction    | Survive & extract |
| `exploration` | Exploration   | Navigate / discover areas |
| `delivery`    | Delivery      | Carry items to a destination |
| `defense`     | Defense       | Hold a position |
| `sabotage`    | Sabotage      | Destroy targets / disrupt systems |
| `intel`       | Intel         | Gather info / scan targets |
| `bounty`      | Bounty        | Hunt specific named targets |

---

## Enums & Constants

```ts
export const CONTRACT_TYPES: ContractType[]    = ["liaison", "standard", "priority"];
export const DIFFICULTIES: Difficulty[]        = ["easy", "normal", "hard"];
export const SCOPES: Scope[]                   = ["single_run", "cumulative"];
export const UPGRADE_CATEGORIES: UpgradeCategory[] = ["inventory", "function", "armory", "stat"];
export const MAP_SLUGS = ["perimeter", "dire-marsh", "outpost", "any-zone"] as const;
export const TAG_SLUGS = [
  "liaison", "contested", "priority", "stealth", "combat",
  "extraction", "exploration", "delivery", "defense",
  "sabotage", "intel", "bounty"
] as const;
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `200`  | OK |
| `404`  | Resource not found (contract slug, faction slug) |
| `500`  | Internal server error / D1 query failure |

All errors follow:
```json
{ "error": "Human-readable message", "code": 404 }
```

---

## Filtering Contracts

Filter params can be combined freely:

```ts
// Contracts for a specific faction + type
fetch(`${API}/api/contracts?faction=sekiguchi&type=standard`)

// Hard combat contracts on perimeter map
fetch(`${API}/api/contracts?tag=combat&difficulty=hard&map=perimeter`)

// All parts of a quest chain (preserves sort_order / chain_position)
fetch(`${API}/api/contracts?chain=traxus-heist-chain`)

// Inactive / archived contracts
fetch(`${API}/api/contracts?active=false`)
```

---

## Example Fetch Patterns

### React / Next.js hook

```tsx
import { useEffect, useState } from "react";
import type { ContractListing } from "@/types/contracts";

const API = process.env.NEXT_PUBLIC_CONTRACTS_API ?? "http://localhost:8787";

export function useContracts(faction?: string, type?: string) {
  const [data, setData] = useState<ContractListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (faction) params.set("faction", faction);
    if (type)    params.set("type", type);

    fetch(`${API}/api/contracts?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setData(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [faction, type]);

  return { data, loading, error };
}
```

### Fetch a faction with its contracts

```ts
async function getFactionWithContracts(slug: string) {
  const [factionRes, contractsRes] = await Promise.all([
    fetch(`${API}/api/factions/${slug}`),
    fetch(`${API}/api/factions/${slug}/contracts`),
  ]);
  const faction   = await factionRes.json();
  const contracts = await contractsRes.json();
  return { faction: faction.data, contracts: contracts.data };
}
```

### Contract detail page

```ts
// pages/contracts/[slug].tsx  or  app/contracts/[slug]/page.tsx
export async function generateStaticParams() {
  const res = await fetch(`${API}/api/contracts`);
  const { data }: { data: ContractListing[] } = await res.json();
  return data.map((c) => ({ slug: c.slug }));
}

export default async function ContractPage({ params }: { params: { slug: string } }) {
  const res = await fetch(`${API}/api/contracts/${params.slug}`, {
    next: { revalidate: 3600 }, // ISR — revalidate every hour
  });
  const { data: contract }: { data: ContractDetail } = await res.json();
  // ...render
}
```

### Faction color utility

```ts
/**
 * Get the CSS custom properties for a faction's brand colors.
 * Use as `style={factionStyle("cyberacme")}` on any container.
 */
function factionStyle(slug: FactionSlug): React.CSSProperties {
  const colors: Record<FactionSlug, [string, string]> = {
    cyberacme: ["#01d838", "#000000"],
    nucaloric: ["#ff125d", "#ffffff"],
    traxus:    ["#ff7300", "#000000"],
    mida:      ["#be72e4", "#ffffff"],
    arachne:   ["#e40b0d", "#ffffff"],
    sekiguchi: ["#cfb72f", "#000000"],
  };
  const [surface, onSurface] = colors[slug];
  return {
    "--faction-color":    surface,
    "--faction-on-color": onSurface,
  } as React.CSSProperties;
}
```

---

*Generated March 3, 2026 — Marathon Contracts API v1.0.0*
