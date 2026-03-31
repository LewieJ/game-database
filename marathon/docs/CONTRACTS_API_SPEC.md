# Contracts API — Full Specification & Faction Reference

> **API Base URL:** `https://helpbot.marathondb.gg`  
> **Status:** Proposed — defines the ideal API shape for a standalone contracts backend  
> **Last Updated:** March 2026  
> **Author:** Frontend team (MarathonDB)

---

## Table of Contents

1. [Purpose](#purpose)
2. [The Six Factions — Complete Reference](#the-six-factions--complete-reference)
   - [Faction Summary Table](#faction-summary-table)
   - [CyberAcme (CYAC)](#cyberacme-cyac)
   - [Nucaloric (NUCAL)](#nucaloric-nucal)
   - [Traxus](#traxus)
   - [MIDA](#mida)
   - [Arachne](#arachne)
   - [Sekiguchi (SekGen)](#sekiguchi-sekgen)
3. [Contract System — How It Works In-Game](#contract-system--how-it-works-in-game)
4. [Current API State vs In-Game Data](#current-api-state-vs-in-game-data)
5. [Endpoints](#endpoints)
   - [List Contracts](#1-list-contracts)
   - [Contract Detail](#2-contract-detail)
   - [Faction Contracts](#3-faction-contracts)
   - [Contract Tags](#4-contract-tags)
   - [Active Contract Rotation](#5-active-contract-rotation-new)
   - [Faction Reputation Summary](#6-faction-reputation-summary-new)
   - [Faction Upgrades](#7-faction-upgrades)
   - [Single Faction Detail](#8-single-faction-detail)
6. [Data Models](#data-models)
   - [Faction](#faction)
   - [Contract (Listing)](#contract-listing)
   - [Contract (Detail)](#contract-detail-1)
   - [ContractStep](#contractstep)
   - [Reward](#reward)
   - [ChoiceRewardGroup](#choicerewardgroup)
   - [Prerequisite](#prerequisite)
   - [Warning](#warning)
   - [MediaAsset](#mediaasset)
   - [EnemyBriefing](#enemybriefing)
   - [FactionUpgrade](#factionupgrade)
   - [ReputationRank](#reputationrank)
7. [All Known Contracts — Per Faction](#all-known-contracts--per-faction)
8. [Faction Upgrade Trees — Per Faction](#faction-upgrade-trees--per-faction)
9. [Contract Tags Reference](#contract-tags-reference)
10. [Contract Types Taxonomy](#contract-types-taxonomy)
11. [Reward Types Taxonomy](#reward-types-taxonomy)
12. [New Fields — Gap Analysis](#new-fields--gap-analysis)
13. [Frontend Usage Patterns](#frontend-usage-patterns)
14. [Priority Matrix](#priority-matrix)
15. [Example Responses](#example-responses)

---

## Purpose

This document is a **comprehensive standalone reference** for building a contracts backend from scratch. It contains:

- **Every known faction** with their API data, colors, agents, reputation methods, lore, and upgrade trees
- **Every known contract** across all six factions, with step objectives, reputation rewards, and scope
- **The ideal API structure** with TypeScript interfaces, endpoint definitions, and example responses
- **Gap analysis** between the current API and what the in-game UI shows

Sources:
- Live API at `helpbot.marathondb.gg` (fetched March 2026)
- In-game UI screenshots (contract cards, detail views, reward grids)
- marathon-guide.com faction/contract/upgrade pages
- Frontend rendering code (`contract-detail.js`, `contracts-listing.js`, `faction-hub.js`)

---

## The Six Factions — Complete Reference

### Faction Summary Table

| # | Slug | Display Name | Color | Text Color | Agent Name | Contracts | Upgrades | Salvage Material |
|---|------|-------------|-------|------------|------------|-----------|----------|-----------------|
| 1 | `cyberacme` | Cyberacme | `#01d838` (green) | `#1c1a1b` | Cyberacme Agent | ~15 | ~20 | Unstable Diode |
| 2 | `nucaloric` | Nucaloric | `#ff125d` (pink/red) | `#1c1a1b` | Nucaloric Agent | ~14 | ~20 | Unstable Biomass |
| 3 | `traxus` | Traxus | `#ff7300` (orange) | `#1c1a1b` | Traxus Agent | ~12 | ~20 | Alien Alloy, Reflex Coil |
| 4 | `mida` | Mida | `#be72e4` (purple) | `#1c1a1b` | MIDA Agent | ~16 | ~20 | Volatile Compounds, Surveillance Lens |
| 5 | `arachne` | Arachne | `#e40b0d` (red) | `#1c1a1b` | Arachne Agent | ~13 | ~20 | Unstable Gel |
| 6 | `sekiguchi` | Sekiguchi | `#cfb72f` (gold/yellow) | `#1c1a1b` | SekGen Agent | ~3 | ~20 | Unstable Diode |

> **Note:** Contract and upgrade counts are approximate based on available data. The game launched March 5, 2026 — more contracts are expected to be added over time.

---

### CyberAcme (CYAC)

**API slug:** `cyberacme`  
**Full name:** CyberAcme  
**Color:** `#01d838` (bright green)  
**Text color:** `#1c1a1b` (near-black)  
**Agent name:** Cyberacme Agent  
**Agent description:** "Advanced AI representative of Cyberacme corporation."

**Database entry:**
```json
{
  "id": 1,
  "slug": "cyberacme",
  "name": "Cyberacme",
  "description": "Cyberacme is a leading technology company specializing in advanced cybernetics and artificial intelligence. They are known for their cutting-edge products and innovative solutions.",
  "color_surface": "#01d838",
  "color_on_surface": "#1c1a1b",
  "agent_name": "Cyberacme Agent",
  "agent_description": "Advanced AI representative of Cyberacme corporation.",
  "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png"
}
```

**Reputation Methods (how players earn rep):**
1. Successfully Exfiltrating
2. Engaging with Intercept Events

**Frontend Tagline:** "Cutting-Edge Cybernetics & AI"

**Lore (from faction page):** CyberAcme is the default/starter faction. Their contracts serve as the tutorial system — they include the "Introducing: [Faction]" Liaison contracts that teach players about all other factions. CyberAcme's theme is general combat readiness, adaptation, and utility.

**Icon path:** `assets/items/reputations/cyberacme-200x200.png`  
**Current contracts count:** 0 in API (but ~15 known from in-game — see contracts section)  
**Current upgrades count:** 0 in API (but ~20 known from in-game — see upgrades section)

---

### Nucaloric (NUCAL)

**API slug:** `nucaloric`  
**Full name:** Nucaloric (commonly "NuCal")  
**Color:** `#ff125d` (hot pink / magenta)  
**Text color:** `#1c1a1b`  
**Agent name:** Nucaloric Agent  
**Agent description:** "Energy sector specialist representing Nucaloric interests."

**Database entry:**
```json
{
  "id": 2,
  "slug": "nucaloric",
  "name": "Nucaloric",
  "description": "Nucaloric is a global leader in energy production and distribution, focusing on sustainable and renewable energy sources. They are committed to reducing carbon emissions and promoting environmental sustainability.",
  "color_surface": "#ff125d",
  "color_on_surface": "#1c1a1b",
  "agent_name": "Nucaloric Agent",
  "agent_description": "Energy sector specialist representing Nucaloric interests.",
  "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/nucaloric-200x200.png"
}
```

**Reputation Methods:**
1. Gather Sparkleaf (Perimeter)
2. Calling in and looting Supply Drops
3. Exfiltrating with NuCal valuables

**Frontend Tagline:** "Sustainable Energy & Power"

**Lore:** Nucaloric's operations center around harnessing Tau Ceti IV's unique energy resources. Their fusion reactors and power grid infrastructure are critical to maintaining operations across the colony. Runners aligned with NuCal take on energy-related contracts, protect infrastructure, and collect biological/botanical specimens. NuCal is bound by a Corporate Nonviolence Treaty with the UESC — so they hire Runners to do their fighting.

**Icon path:** `assets/items/reputations/nucaloric-200x200.png`  
**Faction-specific salvage material:** Unstable Biomass  
**Current contracts count:** 1 in API, ~14 known from in-game  
**Current upgrades count:** 0 in API, ~20 known from in-game

---

### Traxus

**API slug:** `traxus`  
**Full name:** Traxus (Traxus OffWorld Industries)  
**Color:** `#ff7300` (orange)  
**Text color:** `#1c1a1b`  
**Agent name:** Traxus Agent  
**Agent description:** "Logistics coordinator for Traxus operations."

**Database entry:**
```json
{
  "id": 3,
  "slug": "traxus",
  "name": "Traxus",
  "description": "Traxus is a multinational corporation specializing in transportation and logistics. They are known for their advanced supply chain solutions and innovative transportation technologies.",
  "color_surface": "#ff7300",
  "color_on_surface": "#1c1a1b",
  "agent_name": "Traxus Agent",
  "agent_description": "Logistics coordinator for Traxus operations.",
  "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/traxus-200x200.png"
}
```

**Reputation Methods:**
1. Looting Arms Lockers and Munitions Crates
2. Completing Convoy and Lockdown
3. Exfiltrating with Traxus valuables

**Frontend Tagline:** "Transportation & Logistics"

**Lore:** Traxus controls Tau Ceti IV's supply lines. Their cargo networks, shipping routes, and logistics infrastructure keep the colony running. "Control the supply chain, control the colony." Runners handle escort missions, cargo recovery, weapon field-testing, and supply line defense. Rewards focus on loot and extraction efficiency. Traxus contracts heavily center around weapons, weapon mods, and salvage materials.

**Icon path:** `assets/items/reputations/traxus-200x200.png`  
**Faction-specific salvage materials:** Alien Alloy, Reflex Coil  
**Current contracts count:** 1 in API, ~12 known from in-game  
**Current upgrades count:** 0 in API, ~20 known from in-game

---

### MIDA

**API slug:** `mida`  
**Full name:** MIDA (often stylized in all-caps)  
**Color:** `#be72e4` (purple)  
**Text color:** `#1c1a1b`  
**Agent name:** MIDA Agent  
**Agent description:** "Financial advisor representing MIDA Multi-Tool."

**Database entry:**
```json
{
  "id": 4,
  "slug": "mida",
  "name": "Mida",
  "description": "Mida is a leading financial services company specializing in investment banking and asset management. They are known for their expertise in financial markets and innovative investment strategies.",
  "color_surface": "#be72e4",
  "color_on_surface": "#1c1a1b",
  "agent_name": "MIDA Agent",
  "agent_description": "Financial advisor representing MIDA Multi-Tool.",
  "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/mida-200x200.png"
}
```

**Reputation Methods:**
1. Looting Lockboxes
2. Completing Showcase Events
3. Exfiltrating with MIDA valuables

**Frontend Tagline:** "Finance & Asset Management"

**Lore:** MIDA's influence on Tau Ceti IV extends far beyond banking. They fund expeditions, broker deals between factions, and control credit flow across the colony. Their interests are vast and their resources seemingly limitless. MIDA contracts have a distinctive nihilistic/anarchic tone — contract descriptions use slashes: "rip through them // send a message // more personal". A trailer introduced "Gantry" as MIDA's named agent. Runners working for MIDA take on high-stakes contracts with premium credit payouts. Their faction rewards lean heavily toward economic advantages and exclusive luxury cosmetics.

**Icon path:** `assets/items/reputations/mida-200x200.png`  
**Faction-specific salvage materials:** Volatile Compounds, Surveillance Lens  
**Current contracts count:** 0 in API, ~16 known from in-game  
**Current upgrades count:** 0 in API, ~20 known from in-game

---

### Arachne

**API slug:** `arachne`  
**Full name:** Arachne  
**Color:** `#e40b0d` (red)  
**Text color:** `#1c1a1b`  
**Agent name:** Arachne Agent  
**Agent description:** "Security specialist from Arachne division."

**Database entry:**
```json
{
  "id": 5,
  "slug": "arachne",
  "name": "Arachne",
  "description": "Arachne is a global leader in cybersecurity and information security solutions. They are known for their advanced threat detection and prevention technologies.",
  "color_surface": "#e40b0d",
  "color_on_surface": "#1c1a1b",
  "agent_name": "Arachne Agent",
  "agent_description": "Security specialist from Arachne division.",
  "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/arachne-200x200.png"
}
```

**Reputation Methods:**
1. Looting Runner Bags
2. Downing Runners with Precision Damage
3. Eliminating Runners with Finishers
4. Exfiltrating with Arachne valuables

**Frontend Tagline:** "Global Leader in Cybersecurity"

**Lore:** Arachne operates at the intersection of surveillance and protection, weaving digital networks that monitor and secure the most sensitive data flows in the solar system. Their presence on Tau Ceti IV reflects their ambition to control information at its source. Runners aligned with Arachne gain access to intelligence networks, threat detection tools, and security-focused contracts that reward precision and information gathering. Arachne is the most PvP-focused faction — many contracts require eliminating or downing enemy Runners.

**Icon path:** `assets/items/reputations/arachne-200x200.png`  
**Faction-specific salvage material:** Unstable Gel  
**Current contracts count:** 0 in API, ~13 known from in-game  
**Current upgrades count:** 0 in API, ~20 known from in-game

---

### Sekiguchi (SekGen)

**API slug:** `sekiguchi`  
**Full name:** Sekiguchi (commonly "SekGen" / Sekiguchi Genetics)  
**Color:** `#cfb72f` (gold/yellow)  
**Text color:** `#1c1a1b`  
**Agent name:** SekGen Agent  
**Agent description:** "Engineering representative of Sekiguchi Genetics."

**Database entry:**
```json
{
  "id": 6,
  "slug": "sekiguchi",
  "name": "Sekiguchi",
  "description": "Sekiguchi is a multinational corporation specializing in manufacturing and engineering. They are known for their advanced production technologies and innovative engineering solutions.",
  "color_surface": "#cfb72f",
  "color_on_surface": "#1c1a1b",
  "agent_name": "SekGen Agent",
  "agent_description": "Engineering representative of Sekiguchi Genetics.",
  "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/sekiguchi-200x200.png"
}
```

**Reputation Methods:**
1. Looting Core Storage and Bioprinters
2. Engaging with Anomalous Extraction
3. Completing Targeted Treasure Events
4. Exfiltrating with SekGen valuables

**Frontend Tagline:** "Manufacturing & Engineering"

**Lore:** Sekiguchi's factories and engineering labs on Tau Ceti IV produce everything from weapon components to Runner shell parts. Their manufacturing dominance makes them an essential partner for any Runner looking to upgrade their arsenal. Runners aligned with Sekiguchi take on production-focused contracts — retrieving materials, field testing prototypes, and defending manufacturing facilities. The name "Sekiguchi Genetics" (SekGen) hints at bio-engineering — their upgrades focus on energy amplification and biological augmentation with runner-specific enhancements.

**Icon path:** `assets/items/reputations/sekiguchi-200x200.png`  
**Faction-specific salvage material:** Unstable Diode  
**Current contracts count:** 1 in API, ~3 known from in-game  
**Current upgrades count:** 0 in API, ~20 known from in-game

> **Note:** Sekiguchi was not included in the Server Slam ("Early contracts for five factions: CyberAcme, NuCaloric, Traxus, MIDA, and Arachne"). This may explain its lower contract count.

---

## Contract System — How It Works In-Game

Based on in-game observation and the three reference screenshots:

### Faction Tab Bar
The top of the contracts screen shows tabs for all six factions: **CYAC | NUCAL | TRAXUS | MIDA | ARACHNE | SEKGEN**. Each tab shows that faction's available contracts.

### Sidebar (Left)
- **Faction rank** — displayed as "RANK 4" with a progress bar (e.g. "278/300 REP")
- **Faction logo** — large icon
- **Agent section** — the faction's AI agent
- **Contracts / Upgrades tabs** — toggle between viewing contracts and the upgrade tree

### Contract Cards
Each contract is displayed as a card showing:
- **Title** — e.g. "INTRODUCING: NUCALORIC", "CAN'T ADAPT: CAN'T FIGHT I"
- **Type badge** — `Liaison`, `Standard`, or `Priority`
- **Description** — brief objective summary
- **Scope indicator** — "IN A SINGLE RUN:" or implied cumulative
- **Step objectives** — each with a count (e.g. `[0/1]`), a description, and a reputation reward (e.g. `90`)
- **"Show Story & Rewards" button** — expands to show completion rewards

### Contract Detail View
When clicking "Show Story & Rewards":
- **Story art** — large branded image (Liaison contracts have full art with faction logo)
- **Flavor text** — atmospheric quote (e.g. "Everything runs on CyberAcme, or nothing runs at all. Especially you.")
- **Story text** — longer narrative for Liaison contracts
- **COMPLETION REWARDS** — grid of item icons with quantities (×300, ×1,000)
- **"Show Objectives" / "Show Story & Rewards" toggle**
- **Status badges** — "Active", "Unlimited"
- **Reroll button** — "Reroll (9)" costing credits (e.g. $150 with 8K balance)

### Contract Types Observed
| Type | Description | Characteristics |
|------|-------------|----------------|
| **Liaison** | Story/introduction contracts | One-time, sequential steps, story art, narrative text, introduces factions to each other. CyberAcme has one Liaison per faction ("Introducing: X"). |
| **Standard** | Core gameplay contracts | Repeatable, may show "Unlimited" badge, can be rerolled, 60 rep per step typical |
| **Priority** | High-value time-sensitive contracts | 150 rep per step typical, often single-run scope, harder objectives, chain quests |

### Reputation & Ranks
- Each faction has ranks (observed: Rank 1 through at least Rank 9+)
- Each rank requires a set amount of reputation to advance
- Upgrades are gated behind specific ranks
- Contracts may require minimum rank to access

### Upgrade System
- 6 tiers (I through VI) displayed as columns
- 4 categories per upgrade: **Inventory**, **Function**, **Armory**, **Stat**
- Each upgrade has:
  - Position in the tree (tier + category)
  - Credit cost
  - Salvage material cost (faction-specific)
  - Rank requirement
  - Description of what it unlocks/does
  - Some upgrades have prerequisites (other upgrades)

---

## Current API State vs In-Game Data

### What the API already handles well
| Feature | API Field | Status |
|---------|-----------|--------|
| Contract name/description | `name`, `description` | ✅ Working |
| Faction association | `faction.*` | ✅ Working |
| Difficulty rating | `difficulty`, `difficulty_rating` | ✅ Working |
| Scope (single run vs cumulative) | `scope` | ✅ Working |
| Step objectives with progress | `steps[]` with `description`, `count` | ✅ Working |
| Per-step reputation rewards | `steps[].rewards[]` | ✅ Working |
| Tags (combat, extraction, etc.) | `tags`, `tag_objects` | ✅ Working |
| Map association | `map_slug` | ✅ Working |
| Chain/quest-line tracking | `chain_slug`, `chain_position`, `chain_total` | ✅ Working |
| Active/repeatable status | `is_active`, `is_repeatable` | ✅ Working |
| Time estimates | `estimated_time_minutes`, `estimated_time_range` | ✅ Working |
| Prerequisites | `prerequisites[]` | ✅ Structure exists |
| Walkthrough content | `steps[].walkthrough` | ✅ Working |
| Enemies per step | `steps[].enemies[]` | ✅ Structure exists |

### What exists but is empty/incomplete
| Feature | API Field | Issue |
|---------|-----------|-------|
| Completion rewards | `completion_rewards[]` | Always `[]` — no items populated |
| Choice rewards | `choice_rewards[]` | Always `[]` — no data yet |
| Reward icons | `rewards[].icon_url` | Always `null` |
| Related contracts | `related_contracts[]` | Always `[]` |
| Reward summary text | `reward_summary` | Always `null` |
| Season linkage | `season_id`, `season_slug` | Always `null` |
| Step media | `steps[].media[]` | Always `[]` |
| Step names | `steps[].name` | Often empty string `""` |

### What is missing entirely (observed in-game, not in API)
| Feature | In-Game Evidence | Needed |
|---------|-----------------|--------|
| **Flavor / story text** | "Everything runs on CyberAcme, or nothing runs at all." | `flavor_text` field |
| **Story art image** | Large branded art on Liaison contracts | `story_image_url` field |
| **Contract type taxonomy** | Liaison, Standard, Priority badges | Better `contract_type` values |
| **Completion reward items** | Weapons, materials, currencies with icons + quantities | Populated `completion_rewards[]` |
| **Reroll mechanics** | "Reroll (9)" costing $150 | `reroll` object |
| **Unlimited status** | "Unlimited" badge on standard contracts | `is_unlimited` field |
| **Required faction rank** | Contracts gated behind rank levels | `required_rank` field |
| **Most contracts missing** | Only 3 exist in API; ~75+ known from in-game | Need bulk contract data |

---

## Endpoints

### 1. List Contracts

```
GET /api/contracts
```

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `faction` | string | Filter by faction slug (e.g. `cyberacme`) |
| `type` | string | Filter by contract type (`liaison`, `standard`, `priority`) |
| `difficulty` | string | Filter by difficulty (`easy`, `normal`, `hard`) |
| `map` | string | Filter by map slug (`perimeter`, `dire-marsh`, `outpost`, `any-zone`) |
| `season` | string | Filter by season slug |
| `tag` | string | Filter by tag slug |
| `active` | boolean | Only show active contracts (default: true) |
| `scope` | string | Filter by scope (`single_run`, `cumulative`) |
| `chain` | string | Filter by chain slug (get all parts of a quest chain) |

**Response:**

```json
{
  "success": true,
  "count": 75,
  "data": [ ContractListing, ... ],
  "meta": {
    "by_type": { "liaison": 6, "standard": 55, "priority": 14 },
    "by_faction": { "cyberacme": 15, "nucaloric": 14, "traxus": 12, "mida": 16, "arachne": 13, "sekiguchi": 5 },
    "by_difficulty": { "easy": 20, "normal": 40, "hard": 15 },
    "total_active": 75
  }
}
```

> **Frontend note:** The listing endpoint should be lightweight — no steps[], no walkthrough, no media. Just enough for cards and table rows.

---

### 2. Contract Detail

```
GET /api/contracts/:slug
```

**Response:**

```json
{
  "success": true,
  "contract": { ContractDetail }
}
```

> This is the **full** contract object with steps, rewards, walkthrough content, media, enemies, etc.

---

### 3. Faction Contracts

```
GET /api/factions/:slug/contracts
```

Same as `GET /api/contracts?faction=:slug` but includes faction context in the envelope.

**Query parameters:** same `type`, `difficulty`, `scope` filters as List Contracts.

**Response:**

```json
{
  "success": true,
  "faction": {
    "slug": "cyberacme",
    "name": "CyberAcme",
    "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
    "color_surface": "#01d838",
    "color_on_surface": "#1c1a1b"
  },
  "count": 15,
  "data": [ ContractListing, ... ]
}
```

---

### 4. Contract Tags

```
GET /api/contract-tags
```

Returns the 12 tags used to classify contracts. Already exists — see [contract tags reference](#contract-tags-reference).

---

### 5. Active Contract Rotation *(NEW)*

```
GET /api/contracts/rotation
```

Returns the contracts currently available in each faction's active rotation slots.

**Response:**

```json
{
  "success": true,
  "rotation_timestamp": "2026-03-03T00:00:00Z",
  "next_refresh": "2026-03-04T00:00:00Z",
  "refresh_cycle": "daily",
  "factions": {
    "cyberacme": {
      "liaison": [ "introducing-nucaloric", "introducing-traxus", "introducing-mida", "introducing-arachne", "introducing-sekiguchi" ],
      "standard": [ "instant-transfer", "target-acquired", "prime-time" ],
      "priority": [ "welcome-to-tau-ceti-1", "return-on-investment" ]
    },
    "nucaloric": {
      "liaison": [],
      "standard": [ "data-mapping", "one-thousand-thousand-slimy-things-1", "ecological-niche" ],
      "priority": [ "survival-directive", "data-reconstruction-1" ]
    }
  }
}
```

> **Why:** The in-game UI shows a fixed set of available contracts per faction at any given time. Some rotate daily/weekly. This endpoint lets the frontend show "today's contracts" and countdown timers.

---

### 6. Faction Reputation Summary *(NEW)*

```
GET /api/factions/:slug/reputation
```

Returns the reputation rank structure for a faction (not player-specific — just the rank definitions).

**Response:**

```json
{
  "success": true,
  "faction_slug": "cyberacme",
  "faction_name": "CyberAcme",
  "max_rank": 10,
  "ranks": [
    {
      "rank": 1,
      "name": "Rank 1",
      "reputation_required": 0,
      "reputation_to_next": 100,
      "unlocks": [
        { "type": "contract", "slug": "introducing-nucaloric", "name": "Introducing: Nucaloric" },
        { "type": "upgrade", "slug": "expansion", "name": "Expansion" }
      ]
    },
    {
      "rank": 3,
      "name": "Rank 3",
      "reputation_required": 300,
      "reputation_to_next": 500,
      "unlocks": [
        { "type": "upgrade", "slug": "expansion", "name": "Expansion (requires Rank 3)" }
      ]
    }
  ]
}
```

---

### 7. Faction Upgrades

```
GET /api/factions/:slug/upgrades
```

Returns the full upgrade tree for a faction.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category (`inventory`, `function`, `armory`, `stat`) |
| `tier` | number | Filter by tier (1–6) |

**Response:**

```json
{
  "success": true,
  "faction_slug": "cyberacme",
  "count": 20,
  "data": [ FactionUpgrade, ... ]
}
```

---

### 8. Single Faction Detail

```
GET /api/factions/:slug
```

Returns full faction data including reputation methods, contracts summary, upgrades summary.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "cyberacme",
    "name": "Cyberacme",
    "description": "Cyberacme is a leading technology company...",
    "color_surface": "#01d838",
    "color_on_surface": "#1c1a1b",
    "agent_name": "Cyberacme Agent",
    "agent_description": "Advanced AI representative of Cyberacme corporation.",
    "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
    "reputation_methods": [
      "Successfully Exfiltrating",
      "Engaging with Intercept Events"
    ],
    "contracts_count": 15,
    "upgrades_count": 20,
    "contracts": [ ... ],
    "upgrades": [ ... ]
  }
}
```

---

## Data Models

### Faction

```typescript
interface Faction {
  id: number;
  slug: string;                    // URL-safe identifier
  name: string;                    // Display name
  description: string;             // Long description
  color_surface: string;           // Hex primary color
  color_on_surface: string;        // Hex text color for readability on color_surface
  agent_name: string;              // "Cyberacme Agent", "SekGen Agent", etc.
  agent_description: string;       // Short agent blurb
  icon_url: string;                // Full URL to 200x200 faction icon
  icon_url_low: string;            // Low-res variant
  icon_url_high: string;           // High-res variant
  reputation_methods: string[];    // Human-readable ways to earn rep
  contracts_count: number;
  upgrades_count: number;
  created_at: string;              // ISO datetime
}
```

---

### Contract (Listing)

Returned by `/api/contracts` and `/api/factions/:slug/contracts` in the `data[]` array. Lightweight — no steps or walkthrough content.

```typescript
interface ContractListing {
  // ── Identity ──
  slug: string;                    // URL-safe unique identifier
  name: string;                    // Display name ("Introducing: Nucaloric")
  description: string;             // Short objective summary

  // ── Classification ──
  contract_type: ContractType;     // "liaison" | "standard" | "priority"
  difficulty: string;              // "easy" | "normal" | "hard"
  difficulty_rating: number;       // 1–5 numeric scale
  scope: "single_run" | "cumulative";

  // ── Faction ──
  faction_slug: string;
  faction_name: string;
  faction_icon: string;            // URL to faction icon (200x200)
  faction_color: string;           // Hex surface color

  // ── Season / Time ──
  season_id: number | null;
  season_slug: string | null;
  season_name: string | null;
  is_active: boolean;
  is_repeatable: boolean;
  is_unlimited: boolean;           // True for contracts with no expiry
  available_from: string | null;   // ISO datetime
  available_until: string | null;  // ISO datetime

  // ── Metadata ──
  estimated_time_minutes: number | null;
  estimated_time_range: string | null;
  step_count: number;
  total_reputation: number;
  reward_summary: string | null;

  // ── Tags ──
  tags: string[];
  tag_objects: TagObject[];

  // ── Map ──
  map_slug: string | null;         // "perimeter" | "dire-marsh" | "outpost" | "any-zone"

  // ── Chain (quest line) ──
  chain_slug: string | null;
  chain_position: number | null;
  chain_total: number | null;

  // ── Access ──
  required_rank: number | null;    // Minimum faction rank needed

  // ── Sort ──
  sort_order: number;

  // ── Timestamps ──
  created_at: string;
  updated_at: string;

  // ── Reward preview ──
  reward_preview: RewardPreview | null;
}

interface RewardPreview {
  total_reputation: number;
  item_count: number;
  has_weapon: boolean;
  has_cosmetic: boolean;
  primary_reward_icon: string | null;
}

interface TagObject {
  slug: string;
  name: string;
  color: string;
}
```

---

### Contract (Detail)

Returned by `/api/contracts/:slug` as `contract`. Full object with all content.

```typescript
interface ContractDetail {
  slug: string;
  name: string;
  description: string;
  contract_type: ContractType;     // "liaison" | "standard" | "priority"
  difficulty: string;
  difficulty_rating: number;
  scope: "single_run" | "cumulative";

  // ── Faction (expanded) ──
  faction: {
    slug: string;
    name: string;
    agent_name: string;
    icon_url: string;
    color_surface: string;
    color_on_surface: string;
  };

  // ── Story / Flavor Content ──
  flavor_text: string | null;      // Short atmospheric quote
                                   // e.g. "Everything runs on CyberAcme, or nothing runs at all."
  story_text: string | null;       // Longer narrative for Liaison contracts (supports markdown)
  story_image_url: string | null;  // Full-width art for Liaison contracts (~1200×400)

  // ── Season / Time ──
  season: { slug: string; name: string } | null;
  is_active: boolean;
  is_repeatable: boolean;
  is_unlimited: boolean;
  available_from: string | null;
  available_until: string | null;
  cooldown_hours: number | null;

  // ── Reroll System ──
  reroll: {
    is_rerollable: boolean;
    max_rerolls: number | null;    // e.g. 9 (the "Reroll (9)" button)
    cost: {
      currency_slug: string;       // e.g. "credits"
      currency_name: string;
      currency_icon: string | null;
      amount: number;              // e.g. 150
    } | null;
  } | null;

  // ── Access ──
  required_rank: number | null;
  prerequisites: Prerequisite[];

  // ── Time / Difficulty ──
  estimated_time_minutes: number | null;
  estimated_time_range: string | null;
  time_difficulty_note: string | null;

  // ── Tags ──
  tags: string[];
  map_slug: string | null;

  // ── Chain ──
  chain_slug: string | null;
  chain_position: number | null;
  chain_total: number | null;

  // ── Steps / Objectives ──
  steps: ContractStep[];

  // ── Rewards ──
  completion_rewards: Reward[];    // Items/rep on full completion
  choice_rewards: ChoiceRewardGroup[];
  total_reputation: number;
  reward_summary: string | null;

  // ── Enemies ──
  enemies: EnemyBriefing[];

  // ── Warnings / Notes ──
  warnings: Warning[];

  // ── Media ──
  media: MediaAsset[];

  // ── Guide Content ──
  tips: string[];
  video_url: string | null;

  // ── Related ──
  related_contracts: {
    slug: string;
    name: string;
    contract_type: ContractType;
    faction_slug: string;
  }[];

  // ── Timestamps ──
  created_at: string;
  updated_at: string;
}
```

---

### ContractStep

```typescript
interface ContractStep {
  step_number: number;             // 1-indexed
  name: string;                    // Short name ("Locate Employee", "Download Data")
  description: string;             // Full objective text
  count: number;                   // How many times (e.g. 15 = "Defeat 15 hostiles")
  is_sequential: boolean;          // Must previous steps be done first?

  // ── Location ──
  map_slug: string | null;
  location_hint: string | null;

  // ── Step Rewards ──
  rewards: Reward[];               // Rep/items earned for THIS step

  // ── Guide Content ──
  walkthrough: string | null;      // Markdown walkthrough text
  media: MediaAsset[];
  warnings: Warning[];
  enemies: EnemyBriefing[];
}
```

---

### Reward

```typescript
interface Reward {
  reward_type: RewardType;         // "reputation" | "item" | "weapon" | "material" |
                                   // "currency" | "cosmetic" | "xp"
  amount: number;                  // Quantity
  display_name: string;            // Human label

  // ── Icon & Visual ──
  icon_url: string | null;         // CRITICAL: needed for reward grid rendering

  // ── Reference (cross-link) ──
  reference_slug: string | null;   // Slug of the item in its respective table
  reference_table: string | null;  // "weapons" | "weapon_mods" | "implants" | "materials" | etc.

  // ── Faction (for reputation rewards) ──
  faction_slug: string | null;

  // ── Rarity ──
  rarity: string | null;           // "common" | "uncommon" | "rare" | "epic" | "legendary"

  // ── Drop mechanics ──
  is_guaranteed: boolean;
  drop_chance: number | null;      // 0-100 percentage if not guaranteed

  // ── Cosmetic ──
  cosmetic_type: string | null;    // "weapon_skin" | "runner_skin" | "sticker" | etc.
}
```

---

### ChoiceRewardGroup

```typescript
interface ChoiceRewardGroup {
  group_id: number;
  prompt: string;                  // "Choose a reward"
  min_picks: number;
  max_picks: number;
  options: Reward[];
}
```

---

### Prerequisite

```typescript
interface Prerequisite {
  type: "contract" | "reputation_rank" | "item" | "season_pass";
  slug: string | null;
  name: string | null;
  description: string;
  rank_required: number | null;
  faction_slug: string | null;
}
```

---

### Warning

```typescript
interface Warning {
  type: "mistake" | "danger" | "hint" | "tip";
  severity: "low" | "medium" | "high";
  message: string;
}
```

---

### MediaAsset

```typescript
interface MediaAsset {
  type: "image" | "video";
  url: string;
  alt: string | null;
  caption: string | null;
}
```

---

### EnemyBriefing

```typescript
interface EnemyBriefing {
  enemy_type: string;              // "Tick Swarmer", "Runner", "UESC Commander"
  quantity: string;                 // "3-5", "Many", "1"
  threat_level: number;            // 1–5
  location: string | null;
  notes: string | null;
}
```

---

### FactionUpgrade

```typescript
interface FactionUpgrade {
  slug: string;
  name: string;                    // "Expansion", "Informant", "Credit Limit"
  description: string;             // "Gain additional rows of vault capacity..."
  category: UpgradeCategory;       // "inventory" | "function" | "armory" | "stat"
  tier: number;                    // 1–6
  faction_slug: string;

  // ── Cost ──
  credit_cost: number;             // e.g. 2500
  salvage_costs: {
    material_slug: string;         // e.g. "unstable-diode"
    material_name: string;
    material_icon: string | null;
    amount: number;
  }[];

  // ── Requirements ──
  required_rank: number;           // Faction rank needed
  prerequisite_upgrade_slug: string | null; // Must unlock this upgrade first

  // ── Effect ──
  effect_summary: string | null;   // "Vault Size +8 rows"
  unlocks_items: {
    name: string;
    icon_url: string | null;
    reference_slug: string | null;
    reference_table: string | null;
  }[];

  // ── Position ──
  position_row: number;            // Visual tree position
  sort_order: number;

  icon_url: string | null;         // Category icon (inventory/function/armory/stat)
}

type UpgradeCategory = "inventory" | "function" | "armory" | "stat";
```

---

### ReputationRank

```typescript
interface ReputationRank {
  rank: number;
  name: string;
  reputation_required: number;     // Total rep to reach this rank
  reputation_to_next: number;      // Rep needed to advance to next rank
  unlocks: {
    type: "contract" | "upgrade" | "cosmetic" | "title";
    slug: string;
    name: string;
  }[];
}
```

---

## All Known Contracts — Per Faction

Below is every contract observed in-game or on marathon-guide.com. Each entry includes: name, type, scope, step descriptions with counts, and per-step reputation reward.

> **Legend:**
> - `[N]` = count required for that step
> - `[X++]` = bonus progress for X (e.g. `[Runners++]` means Runner kills give extra progress)
> - Rep column = reputation earned for completing that step

---

### CyberAcme Contracts (~15 known)

**Liaison Contracts (one-time introductions):**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Introducing: Nucaloric** | Liaison | Single Run | 1. Find NuCal Employee ID in building east of OVERFLOW `[1]` | 90 |
| | | | 2. Download employee data from workstation nearby `[1]` | 90 |
| | | | 3. Deliver NuCal Employee ID to DCON northeast of OVERFLOW `[1]` | 90 |
| **Introducing: Traxus** | Liaison | Single Run | 1. Hack terminal at Intersection, Complex, or Bio-Research `[1]` | 90 |
| | | | 2. Acquire Shipping Manifest from UESC Commander `[1]` | 90 |
| | | | 3. Scan the nearby stacked shipping container before it is picked up `[1]` | 90 |
| **Introducing: Mida** | Liaison | Single Run | 1. Defeat UESC across Tau Ceti IV `[15]` | 90 |
| | | | 2. Smash glass across Tau Ceti IV `[20]` | 90 |
| **Introducing: Arachne** | Liaison | Single Run | 1. Deal damage to enemy Runners `[60]` | 75 |
| | | | 2. Down an enemy Runner `[1]` | 75 |
| **Introducing: Sekiguchi** | Liaison | Single Run | 1. Inject Necrotic Sample in southern Flight Control `[1]` | 30 |
| | | | 2. Scan your shell in southeastern Orientation `[1]` | 30 |

**Priority Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Welcome to Tau Ceti 1/2** | Priority | Cumulative | 1. Defeat UESC in Perimeter `[3]` | 150 |
| | | | 2. Scan FTL array at any UESC radio tower in Perimeter `[1]` | 150 |
| **Return on Investment** | Priority | Cumulative | 1. Exfil Frag Grenades `[1]` | 150 |
| | | | 2. Exfil Claymore Mines `[1]` | 150 |

**Standard Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Instant Transfer** | Standard | Cumulative | 1. Find data cards `[2]` | 60 |
| **Target Acquired** | Standard | Cumulative | 1. Activate a Target Acquisition Device (TAD) `[1]` | 60 |
| | | | 2. Eliminate UESC `[10]` | 60 |
| **A Runner can't adapt; they can't fight** | Standard | Cumulative | 1. Loot tool carts `[1]` | 60 |
| | | | 2. Use utility or survivability consumables `[10]` | 60 |
| **Prime Time** | Standard | Cumulative | 1. Use prime ability `[1]` | 60 |
| | | | 2. Eliminate hostiles `[Runners++]` `[5]` | 60 |
| **Big Robot? Still Robot** | Standard | Cumulative | 1. Defeat UESC Commanders `[1]` | 60 |
| **Shell Games I** | Standard | Cumulative | 1. Use tactical ability `[2]` | 60 |
| | | | 2. Defeat hostiles `[Runners++]` `[5]` | 60 |
| **No Weapon: Can't Fight I** | Standard | Cumulative | 1. Loot Arms Lockers `[1]` | 60 |
| | | | 2. Defeat hostiles with a weapon `[5]` | 60 |
| **Build Meets Craft I** | Standard | Cumulative | 1. Loot Core Storage containers `[1]` | 60 |
| | | | 2. Loot Bioprinters `[1]` | 60 |
| **Can't Survive: Can't Fight I** | Standard | Cumulative | 1. Use health, cleanse, or buff consumables `[3]` | 60 |
| **Instant Transfer I** | Standard | Cumulative | 1. Find data cards `[2]` | 60 |
| **Emergent Opportunities I** | Standard | Cumulative | 1. Activate a TAD `[1]` | 60 |
| | | | 2. Defeat UESC `[10]` | 60 |
| **Trash to Treasure I** | Standard | Cumulative | 1. Exfil Valuables `[CyAc treasures++]` `[6]` | 60 |
| **Deconstructed I** | Standard | Cumulative | 1. Deliver Salvage to DCON `[8]` | 60 |

---

### Nucaloric Contracts (~14 known)

**Priority Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Survival Directive** | Priority | Cumulative | 1. Download geological survey in southeast building in Station `[1]` | 150 |
| | | | 2. Download botany report from second-floor terminal in Overflow `[1]` | 150 |
| **Data Reconstruction 1/3** | Priority | Single Run | 1. Scan Sparkleaf Bioprinters in SOUTH RELAY `[2]` | 150 |
| | | | 2. Scan Fungal Bioprinters in OVERFLOW `[2]` | 150 |
| | | | 3. Download Agriculture Report in NORTH RELAY `[1]` | 150 |

**Standard Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Data Mapping** | Standard | Cumulative | 1. Find data cards `[2]` | 60 |
| | | | 2. Find data cards in AI UPLINK `[1]` | 60 |
| **One Thousand Thousand Slimy Things I** | Standard | Cumulative | 1. Destroy Tick Nests `[2]` | 20 |
| | | | 2. Exfil Chitin Samples `[3]` | 60 |
| **Ecological Niche** | Standard | Cumulative | 1. Destroy tick nests `[2]` | 60 |
| | | | 2. Exfil Chitin Samples `[3]` | 60 |
| **Assault with battery** | Standard | Cumulative | 1. Volt Battery eliminations `[5]` | 60 |
| | | | 2. Eliminate UESC `[Recruits award more progress]` `[20]` | 60 |
| **Chemical Peel** | Standard | Cumulative | 1. Deal Chem Grenade damage to UESC or Runners `[eliminations++]` `[50]` | 60 |
| | | | 2. Eliminate hostiles `[Runners++]` `[5]` | 60 |
| **You're rubber I'm glue** | Standard | Cumulative | 1. DCON Biomass, Reclaimed Biostripping, Sterilized Biostripping, or Neural Insulation `[4]` | 60 |
| | | | 2. Loot containers for NuCaloric `[10]` | 60 |
| **Growth Mindset I** | Standard | Cumulative | 1. Exfil plant salvage `[higher rarity++]` `[4]` | 60 |
| **Sterile Environment I** | Standard | Cumulative | 1. Defeat UESC `[10]` | 60 |
| **Contained Analysis I** | Standard | Cumulative | 1. Loot containers `[NuCal preferred++]` `[10]` | 60 |
| | | | 2. Loot Implants and consumables, then place in a DCON `[5]` | 60 |
| **Planted Evidence I** | Standard | Cumulative | 1. Deliver plant Salvage to DCON `[higher rarity++]` `[4]` | 60 |
| | | | 2. Loot containers `[NuCal preferred++]` `[10]` | 60 |
| **Nano Metrics I** | Standard | Cumulative | 1. Deliver Unstable Biomass to DCON `[4]` | 60 |
| | | | 2. Loot containers `[NuCal preferred++]` `[10]` | 60 |
| **Shelf-Stable I** | Standard | Cumulative | 1. Exfil Valuables `[NuCal treasures++]` `[6]` | 60 |
| **Assault With Battery I** | Standard | Cumulative | 1. Defeat hostiles using Volt Batteries `[5]` | 60 |
| | | | 2. Defeat UESC Recruits `[5]` | 60 |
| **Compound Solutions I** | Standard | Cumulative | 1. Deliver biostrip Salvage to DCON `[higher rarity++]` `[4]` | 60 |
| | | | 2. Loot containers `[NuCal preferred++]` `[10]` | 60 |

---

### Traxus Contracts (~12 known)

**Priority Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Cutthroat Competition** | Priority | Single Run | 1. Loot Deimosite Rods in FIELD MAINTENANCE `[2]` | 150 |
| **Equitable Distribution 1/4** | Priority | Single Run | 1. Acquire self-erasing Data Drive from second floor of HAULER `[1]` | 150 |
| | | | 2. Deliver data drive to DCON within the time limit `[1]` | 150 |

**Standard Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Arms Dealer** | Standard | Single Run | 1. Loot arms lockers in FIELD MAINTENANCE `[2]` | 60 |
| | | | 2. Exfil ballistic weapons `[2]` | 60 |
| **Inventory Control I** | Standard | Cumulative | 1. Loot containers `[Traxus preferred++]` `[10]` | 20 |
| | | | 2. Loot weapons and weapon mods, then place in DCON `[2]` | 20 |
| **Field Testing: SMGs I** | Standard | Cumulative | 1. Defeat hostiles with a weapon `[submachine guns++]` `[6]` | 60 |
| | | | 2. Defeat hostiles without dying `[Runners++]` `[3]` | 60 |
| **Raw Materials I** | Standard | Cumulative | 1. Deliver rod Salvage to DCON `[higher rarity++]` `[8]` | 60 |
| | | | 2. Loot containers `[Traxus preferred++]` `[10]` | 60 |
| **Sustainable Reuse I** | Standard | Cumulative | 1. Deliver filament Salvage to DCON `[higher rarity++]` `[8]` | 60 |
| | | | 2. Loot containers `[Traxus preferred++]` `[10]` | 60 |
| **Field Testing: Assault Rifles I** | Standard | Cumulative | 1. Defeat hostiles with a weapon `[assault rifles++]` `[10]` | 60 |
| | | | 2. Defeat hostiles without dying `[Runners++]` `[3]` | 60 |
| **Field Testing: Precision Rifle I** | Standard | Cumulative | 1. Defeat hostiles with a weapon `[precision rifles++]` `[6]` | 60 |
| | | | 2. Defeat hostiles with precision damage `[Runners++]` `[2]` | 60 |
| **Value Proposition I** | Standard | Cumulative | 1. Exfil Valuables `[Traxus treasures++]` `[6]` | 60 |
| **Asset Recovery I** | Standard | Cumulative | 1. Deliver wire Salvage to DCON `[higher rarity++]` `[8]` | 60 |
| | | | 2. Loot containers `[Traxus preferred++]` `[10]` | 60 |
| **Targeted Strategy I** | Standard | Cumulative | 1. Defeat hostiles without dying `[Runners++]` `[3]` | 60 |
| | | | 2. Down Runners `[precision damage++]` `[1]` | 60 |

---

### MIDA Contracts (~16 known)

**Priority Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Order/Chaos** | Priority | Single Run | 1. Trigger alarms in south Complex by hacking a terminal `[1]` | 150 |
| | | | 2. Acquire Security Commander credentials `[1]` | 150 |
| | | | 3. Download data from terminal inside south Maintenance `[1]` | 150 |
| **Protect/Destroy 1/5** | Priority | Single Run | 1. Destroy the bio-sample analyzer inside west Quarantine `[1]` | 150 |
| | | | 2. Acquire UESC Biohazard Sample `[1]` | 150 |
| | | | 3. Deliver sample to DCON `[1]` | 150 |
| **Truth/Lies** | Priority | Single Run | 1. Acquire a Transponder from second-floor Flight Control `[1]` | 150 |
| | | | 2. Hack Transponder at first-floor terminal in Flight Control `[1]` | 150 |
| | | | 3. Upload malware to dropships outside of Flight Control `[2]` | 150 |

**Standard Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Heads/Tails** | Standard | Cumulative | 1. Activate guarded exfil `[1]` | 60 |
| | | | 2. Eliminate UESC `[Elites++]` `[20]` | 60 |
| **Fire/Fuel** | Standard | Cumulative | 1. Break windows `[5]` | 60 |
| **Rip/Tear** | Standard | Cumulative | 1. Ballistic weapon eliminations `[8]` | 60 |
| | | | 2. Eliminate UESC `[10]` | 60 |
| **Blow/Up** | Standard | Cumulative | 1. Deal explosive damage to UESC or Runners `[100]` | 60 |
| | | | 2. Eliminate hostiles without dying `[Runners++]` `[3]` | 60 |
| **Consume/Control** | Standard | Cumulative | 1. Eliminate hostiles `[Runners++]` `[5]` | 60 |
| **Murder/Take** | Standard | Cumulative | 1. Eliminate UESC `[10]` | 60 |
| | | | 2. Loot containers for MIDA `[10]` | 60 |
| **Smash/Grab I** | Standard | Cumulative | 1. Break windows `[5]` | 60 |
| **Us/Them I** | Standard | Single Run | 1. Defeat hostiles without dying `[Runners++]` `[3]` | 60 |
| **Consume/Control I** | Standard | Cumulative | 1. Defeat UESC `[10]` | 60 |
| | | | 2. Loot containers `[MIDA preferred++]` `[10]` | 60 |
| **Stand/Fight I** | Standard | Cumulative | 1. Defeat hostiles `[Runners++]` `[5]` | 60 |
| **Escape/Defy I** | Standard | Cumulative | 1. Activate a guarded exfil `[1]` | 60 |
| | | | 2. Defeat UESC `[Elites++]` `[20]` | 60 |
| **Justice/Revenge I** | Standard | Cumulative | 1. Defeat hostiles with a ballistic weapon `[8]` | 60 |
| | | | 2. Defeat UESC `[10]` | 60 |
| **Spark/Ignite I** | Standard | Cumulative | 1. Defeat hostiles with explosive equipment `[Runners++]` `[2]` | 60 |
| | | | 2. Deliver compound Salvage to DCON `[higher rarity++]` `[4]` | 60 |
| **Reclaim/Resist I** | Standard | Cumulative | 1. Deliver lens Salvage to DCON `[higher rarity++]` `[4]` | 60 |
| **Unlock/Unleash I** | Standard | Cumulative | 1. Loot Lockboxes `[1]` | 60 |

> **Note:** MIDA contracts have a distinctive slash-naming convention (Heads/Tails, Rip/Tear, etc.) and their flavor text uses double-slash poetry: "rip through them // send a message // more personal"

---

### Arachne Contracts (~13 known)

**Priority Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Contract Name** *(placeholder)* | Priority | Cumulative | 1. Eliminate downed Runners `[10]` | 150 |

**Standard Contracts:**

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Best in class** | Standard | Cumulative | 1. Weapon eliminations `[Machine Guns++]` `[6]` | 60 |
| | | | 2. Eliminate Runners `[2]` | 60 |
| **Climbing the ranks** | Standard | Cumulative | 1. Exfil RF Gel, Drone Resin, Biomata Resin, or Reflex Coils `[6]` | 60 |
| | | | 2. Loot containers for Arachne `[10]` | 60 |
| **Killing in the name of** | Standard | Cumulative | 1. Eliminate hostiles `[Runners++]` `[5]` | 60 |
| | | | 2. Exfil weapons and cores `[2]` | 60 |
| **Zero sum game** | Standard | Cumulative | 1. Eliminate Runners `[2]` | 60 |
| | | | 2. Loot containers for Arachne `[10]` | 60 |
| **Exhumation I** | Standard | Cumulative | 1. Exfil resin Salvage `[higher rarity++]` `[6]` | 60 |
| | | | 2. Loot containers `[Arachne preferred++]` `[10]` | 60 |
| **Colony Remains I** | Standard | Cumulative | 1. Exfil node Salvage `[higher rarity++]` `[6]` | 60 |
| | | | 2. Loot containers `[Arachne preferred++]` `[10]` | 60 |
| **Fatal Instrument I** | Standard | Cumulative | 1. Defeat Runners without dying `[2]` | 60 |
| **Life-Death Equation I** | Standard | Single Run | 1. Defeat Runners `[2]` | 60 |
| **Spoils of War I** | Standard | Cumulative | 1. Defeat hostiles `[Runners++]` `[5]` | 60 |
| | | | 2. Exfil weapons and Cores `[2]` | 60 |
| **Brutal Hymn I** | Standard | Cumulative | 1. Defeat hostiles with a weapon `[shotguns++]` `[5]` | 60 |
| | | | 2. Defeat Runners `[2]` | 60 |
| **Ancient Relics I** | Standard | Single Run | 1. Exfil Valuables `[Arachne treasures++]` `[6]` | 60 |
| **Technologies of Violence I** | Standard | Cumulative | 1. Defeat hostiles with a weapon `[machine guns++]` `[6]` | 60 |
| | | | 2. Defeat Runners `[2]` | 60 |

> **Note:** Arachne is the most PvP-focused faction. Nearly every contract involves eliminating or downing enemy Runners. Their tone is ruthless and direct.

---

### Sekiguchi Contracts (~3 known)

| Contract | Type | Scope | Steps | Rep/Step |
|----------|------|-------|-------|----------|
| **Cutthroat Competition** | Priority | Single Run | 1. Loot Deimosite Rods in FIELD MAINTENANCE `[2]` | 150 |
| | | | 2. Exfil Successfully `[1]` | 150 |
| **Friction II** | Standard | Single Run | 1. Defeat hostiles with precision damage `[Runners++]` `[5]` | 90 |
| | | | 2. Exfil Implants and Cores `[5]` | 90 |

> **Note:** Sekiguchi has the fewest known contracts. It was excluded from the Server Slam preview. More contracts are expected post-launch.

---

## Faction Upgrade Trees — Per Faction

Upgrades are organized in tiers (I–VI) with four categories. Each faction has a unique tree. Below are all observed upgrade names per faction.

### Upgrade Categories

| Category | Slug | Icon Path | Description |
|----------|------|-----------|-------------|
| Inventory | `inventory` | `assets/factions/upgrades/inventory-48x48.png` | Storage, vault, carry capacity |
| Function | `function` | `assets/factions/upgrades/function-48x48.png` | Gameplay mechanics, passives |
| Armory | `armory` | `assets/factions/upgrades/armory-48x48.png` | Weapons, mods, equipment unlocks |
| Stat | `stat` | `assets/factions/upgrades/stat-48x48.png` | Stat boosts, passive improvements |

---

### CyberAcme Upgrades

| Upgrade | Category | Notes |
|---------|----------|-------|
| Expansion | Inventory | Vault capacity +8 rows. Rank 3. $2,500 + 12 Unstable Diode |
| Informant | Function | |
| Credit Limit | Inventory | |
| Enhanced Weaponry | Armory | |
| Deluxe Weaponry | Armory | |
| Heat Sink | Stat | |
| Carrier | Armory | |
| Carrier+ | Armory | |
| Quick Vent | Stat | |
| Scavenger | Stat | |
| Loot Siphon | Stat | |
| Soundproof | Function | |
| Active Cool | Stat | |
| Firm Stance | Stat | |
| Loose Change | Function | |
| Locksmith | Armory | |
| Fixative | Function | |
| Slider | Function | |

---

### Nucaloric Upgrades

| Upgrade | Category | Notes |
|---------|----------|-------|
| Safeguard | Armory | Free daily Shield Charges. Rank 1. $750 + 16 Unstable Biomass |
| Advanced Shields | Armory | |
| Safeguard+ | Armory | |
| Shield Comm | Function | |
| Shielded | Armory | |
| Armored | Armory | |
| Restore | Armory | |
| Advanced Patch | Armory | |
| Restore+ | Armory | |
| Health Comm | Function | |
| Panacea Kit | Armory | |
| Regen | Armory | |
| Null Hazard | Stat | |
| Reinforce | Stat | |
| Unfazed | Stat | |
| Resist Comm | Function | |
| Recovery | Stat | |
| Advanced Mch | Armory | |
| Helping Hands | Armory | |
| Self-Revive | Armory | |
| Field Medic | Function | |

> **Theme:** NuCal upgrades focus heavily on survivability — shields, health, resistance, and revival.

---

### Traxus Upgrades

| Upgrade | Category | Notes |
|---------|----------|-------|
| Deluxe Chips | Armory | Deluxe chip mods. VIP Rank 1. $5,000 + 3 Alien Alloy + 11 Reflex Coil |
| Enhanced Chips | Armory | |
| Tad Boost | Function | |
| Tracker | Stat | |
| Deluxe Smg Mods | Armory | |
| Enhanced Heavy Submachine Gun | Armory | |
| Smg Mods | Armory | |
| Ar Mods | Armory | |
| Enhanced Light Ar | Armory | |
| Deluxe Ar Mods | Armory | |
| Volt Pr | Armory | |
| Volt Mods | Armory | |
| Precision Mods | Armory | |
| Mips Sniper | Armory | |
| Deluxe Volt Mods | Armory | |
| Enhanced Volt Submachine Gun | Armory | |
| Enhanced Hardline Pr | Armory | |
| Deluxe Precision Mods | Armory | |

> **Theme:** Traxus upgrades focus heavily on weapons and weapon mods — SMGs, ARs, precision rifles, and equipment.

---

### MIDA Upgrades

| Upgrade | Category | Notes |
|---------|----------|-------|
| Eyes Open | Armory | Proximity Sensor. Rank 9. $2,000 + 28 Volatile Compounds + 14 Surveillance Lens |
| Bad Step | Armory | |
| Got Em | Armory | |
| Survivor | Armory | |
| Graceful | Armory | |
| Sprinter | Armory | |
| Spare Rounds | Armory | |
| Hot Potato | Armory | |
| Explosives | Armory | |
| Lights Out | Armory | |
| Anti-Virus Packs | Armory | |
| Anti Virus | Function | |
| Bullseye | Armory | |
| Chemist | Armory | |
| Flex Matrix | Stat | |
| Cardio Kick | Armory | |
| Full Throttle | Function | |
| Cloud Cover | Function | |

> **Theme:** MIDA upgrades focus on combat versatility — explosives, mobility, anti-virus tools, and equipment.

---

### Arachne Upgrades

| Upgrade | Category | Notes |
|---------|----------|-------|
| Lmg Mods | Armory | Enhanced LMG mods. Rank 1. $750 + 13 Unstable Gel |
| Railgun Mods | Armory | |
| Shotgun Mods | Armory | |
| Hard Strike | Stat | |
| Knife Fight | Armory | |
| Hurting Hands | Armory | |
| Mips Railgun | Armory | |
| Mips Shotgun | Armory | |
| Cutthroat | Stat | |
| Enhanced Retaliator Lmg | Armory | |
| Enhanced Mips Railgun | Armory | |
| Enhanced Mips Shotgun | Armory | |
| Reboot | Stat | |
| Deluxe Retaliator Lmg | Armory | |
| Deluxe Mips Railgun | Armory | |
| Deluxe Mips Shotgun | Armory | |
| Leech | Function | |
| Heat Death | Function | |

> **Theme:** Arachne upgrades focus on heavy weapons — LMGs, railguns, shotguns, melee — matching their aggressive PvP identity.

---

### Sekiguchi Upgrades

| Upgrade | Category | Notes |
|---------|----------|-------|
| Energy Amp | Armory | Energy Amps. Rank 1. $750 + 10 Unstable Diode |
| Amped | Armory | |
| Amp Stock | Armory | |
| Scab Factory | Stat | (appears twice at different tiers) |
| Lethal Amp | Function | |
| Triage | Armory | Runner-specific upgrade |
| Destroyer | Armory | Runner-specific upgrade |
| Assassin | Armory | Runner-specific upgrade |
| Vandal | Armory | Runner-specific upgrade |
| Recon | Armory | Runner-specific upgrade |
| Thief | Armory | Runner-specific upgrade |
| Triage+ | Armory | Enhanced runner-specific |
| Destroyer+ | Armory | Enhanced runner-specific |
| Assassin+ | Armory | Enhanced runner-specific |
| Vandal+ | Armory | Enhanced runner-specific |
| Recon+ | Armory | Enhanced runner-specific |
| Thief+ | Armory | Enhanced runner-specific |
| Harvester | Armory | |
| Capacitors | Armory | |
| Tac Amp | Stat | |
| Prime Amp | Stat | |
| Head Start | Function | |
| Primed | Function | |

> **Theme:** Sekiguchi uniquely has runner-specific upgrades (one per runner shell + enhanced versions), plus energy amplification.

---

## Contract Tags Reference

12 tags exist in the system. These classify contracts for filtering.

| # | Slug | Name | Color | Description | Used By |
|---|------|------|-------|-------------|---------|
| 1 | `liaison` | Liaison | `#888888` | Contracts involving interaction between factions | 0 contracts tagged |
| 2 | `contested` | Contested | `#ef4444` | Takes place in PvP-active zones | 0 |
| 3 | `priority` | Priority | `#f59e0b` | High-priority / time-sensitive missions | 0 |
| 4 | `stealth` | Stealth | `#6366f1` | Rewards sneaky approaches | 0 |
| 5 | `combat` | Combat | `#dc2626` | Primarily combat-focused | 2 |
| 6 | `extraction` | Extraction | `#22c55e` | Requires successful extraction to complete | 2 |
| 7 | `exploration` | Exploration | `#06b6d4` | Discovery / exploration focused | 2 |
| 8 | `delivery` | Delivery | `#8b5cf6` | Fetch & deliver objectives | 3 |
| 9 | `defense` | Defense | `#f97316` | Hold or protect an objective | 0 |
| 10 | `sabotage` | Sabotage | `#e11d48` | Destroy or disrupt enemy assets | 1 |
| 11 | `intel` | Intel | `#0ea5e9` | Data retrieval / hacking | 1 |
| 12 | `bounty` | Bounty | `#a855f7` | Target elimination | 1 |

---

## Contract Types Taxonomy

| Type | Slug | In-Game Badge | Characteristics | Typical Rep/Step |
|------|------|--------------|-----------------|-----------------|
| **Liaison** | `liaison` | Blue/teal | One-time, sequential. Story art + narrative. CyberAcme hosts all "Introducing: X" contracts. | 30–90 |
| **Standard** | `standard` | White/default | Core gameplay loop. Repeatable. May show "Unlimited" badge. Can be rerolled. | 60 |
| **Priority** | `priority` | Orange/gold | High-value. Often single-run scope. Harder objectives. May be chain quests (1/3, 1/4, 1/5). | 150 |

> **Migration note:** The current API uses only `"permanent"` for all contracts. This should be replaced or supplemented with the taxonomy above.

---

## Reward Types Taxonomy

| Type | Slug | Description | Example |
|------|------|-------------|---------|
| Reputation | `reputation` | Faction reputation points | +90 CyberAcme Rep |
| Currency | `currency` | In-game credits | ×8,000 Credits |
| Material | `material` | Crafting/salvage materials | ×300 Salvage Kit |
| Weapon | `weapon` | Weapon reward | ×1 Surplus Autorifle |
| Weapon Mod | `weapon_mod` | Weapon modification | ×1 Extended Mag |
| Implant | `implant` | Implant reward | ×1 Neural Boost |
| Core | `core` | Runner core reward | ×1 Siphon Strike |
| Cosmetic | `cosmetic` | Skins, stickers, backgrounds, etc. | ×1 Neon Spire |
| XP | `xp` | Account/battle pass XP | +500 XP |
| Item | `item` | Generic/uncategorized item | ×1 Unknown Item |

---

## New Fields — Gap Analysis

### Priority 0 — Needed for basic feature parity with in-game UI

| Field | Location | Type | Description |
|-------|----------|------|-------------|
| `contract_type` values | Contract | enum | Change from `"permanent"` to: `"liaison"`, `"standard"`, `"priority"` |
| `completion_rewards[]` data | ContractDetail | Reward[] | **Currently always empty.** Most impactful gap. In-game shows "COMPLETION REWARDS" grid with icons + quantities |
| `icon_url` on rewards | Reward | string | **Currently always null.** Every reward needs an icon for the visual grid |
| `flavor_text` | ContractDetail | string | Atmospheric quote below the title |
| `is_unlimited` | Contract | boolean | "Unlimited" badge on Standard contracts |
| **Bulk contract data** | — | — | Only 3 contracts exist in API; ~75+ are known from in-game |

### Priority 1 — Enhances the experience significantly

| Field | Location | Type | Description |
|-------|----------|------|-------------|
| `story_text` | ContractDetail | string | Longer narrative for Liaison contracts |
| `story_image_url` | ContractDetail | string | Hero art for Liaison contracts |
| `required_rank` | Contract | number | Minimum faction rank to access |
| `reference_slug` + `reference_table` | Reward | strings | Cross-links rewards to item detail pages |
| `reward_preview` | ContractListing | object | Lightweight reward summary for listing cards |
| `reward_summary` data | Contract | string | Human-readable text like "225 Rep + 3 Items" |
| `step.name` populated | ContractStep | string | Currently often empty string |

### Priority 2 — Nice-to-have

| Field | Location | Type | Description |
|-------|----------|------|-------------|
| `reroll` | ContractDetail | object | Reroll mechanics (count, cost) |
| `related_contracts[]` data | ContractDetail | array | Populate with related/next contracts |
| `choice_rewards[]` data | ContractDetail | array | Populate when applicable |
| Rotation endpoint | new endpoint | — | Active contract rotation with refresh timer |
| Reputation ranks endpoint | new endpoint | — | Faction rank definitions with unlocks |
| `season` data | Contract | object | When seasons launch |

---

## Frontend Usage Patterns

### Contract Listing Page (`contracts/index.html`)
```
Fetches: GET /api/contracts
Uses: slug, name, description, contract_type, difficulty, difficulty_rating,
      scope, faction_*, step_count, total_reputation, reward_summary, tags,
      tag_objects, map_slug, chain_*, is_active, sort_order, reward_preview
```

### Contract Detail Page (`contracts/:slug/index.html`)
```
Fetches: GET /api/contracts/:slug
Uses: Everything from ContractDetail — steps with walkthroughs, completion_rewards,
      choice_rewards, flavor_text, story_text, story_image_url, enemies, warnings,
      media, prerequisites, tips, video_url, reroll, related_contracts
```

### Faction Hub Page (`factions/:slug/index.html`)
```
Fetches: GET /api/factions/:slug/contracts
Uses: Lightweight listing — name, slug, contract_type, scope, description,
      step_count, total_reputation, steps (for preview only)
```

### Frontend API Client (`js/api.js`)
```javascript
// Existing endpoints the frontend already calls:
MarathonAPI.getContracts(options)          // GET /api/contracts?type=&faction=&difficulty=
MarathonAPI.getContractBySlug(slug)        // GET /api/contracts/:slug
MarathonAPI.getContractTags()              // GET /api/contract-tags
MarathonAPI.getFactionContracts(slug, type) // GET /api/factions/:slug/contracts?type=
MarathonAPI.getFactionUpgrades(slug, cat, tier) // GET /api/factions/:slug/upgrades?category=&tier=
MarathonAPI.getFactionBySlug(slug)         // GET /api/factions/:slug
MarathonAPI.getFactions()                  // GET /api/factions
```

---

## Priority Matrix

### P0 — Do first (unblocks core rendering)

1. **Add all ~75 contracts** to the database with correct types, steps, and rep values
2. **Populate `completion_rewards[]`** with real item data including `icon_url`, `display_name`, `amount`
3. **Use correct `contract_type`** values: `liaison`, `standard`, `priority`
4. **Add `flavor_text`** field to contract detail responses
5. **Add `is_unlimited`** boolean
6. **Populate `icon_url`** on all reward objects

### P1 — High value, do soon

7. **Add `story_text`** and **`story_image_url`** for Liaison contracts
8. **Add `required_rank`** field
9. **Populate `reward_summary`** with human-readable text
10. **Add `reward_preview`** to listing responses
11. **Populate `reference_slug` + `reference_table`** on rewards
12. **Populate `step.name`** on all steps

### P2 — Future enhancements

13. **Add `reroll` object** with cost/count data
14. **Build rotation endpoint** for daily/weekly contract tracking
15. **Build reputation ranks endpoint** for rank structure
16. **Populate `choice_rewards[]`**
17. **Populate `related_contracts[]`**
18. **Season data** when seasons launch
19. **Faction upgrade details** with full descriptions, costs, prerequisites

---

## Example Responses

### Standard Contract Detail (fully populated)

```json
{
  "success": true,
  "contract": {
    "slug": "target-acquired",
    "name": "Target Acquired",
    "description": "Target Acquisition Devices (TADs) temporarily mark hostiles. They can be found at major POIs across New Cascadian locations.",
    "flavor_text": "Everything runs on CyberAcme, or nothing runs at all. Especially you.",
    "story_text": null,
    "story_image_url": null,
    "contract_type": "standard",
    "difficulty": "normal",
    "difficulty_rating": 2,
    "scope": "cumulative",
    "faction": {
      "slug": "cyberacme",
      "name": "CyberAcme",
      "agent_name": "Cyberacme Agent",
      "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
      "color_surface": "#01d838",
      "color_on_surface": "#1c1a1b"
    },
    "season": null,
    "is_active": true,
    "is_repeatable": true,
    "is_unlimited": true,
    "available_from": null,
    "available_until": null,
    "cooldown_hours": null,
    "required_rank": 1,
    "reroll": {
      "is_rerollable": true,
      "max_rerolls": 9,
      "cost": {
        "currency_slug": "credits",
        "currency_name": "Credits",
        "currency_icon": "https://helpbot.marathondb.gg/assets/items/currency/credits-128x128.png",
        "amount": 150
      }
    },
    "estimated_time_minutes": 10,
    "estimated_time_range": "5–15",
    "time_difficulty_note": null,
    "tags": ["combat"],
    "map_slug": "any-zone",
    "chain_slug": null,
    "chain_position": null,
    "chain_total": null,
    "prerequisites": [],
    "steps": [
      {
        "step_number": 1,
        "name": "Activate TAD",
        "description": "Activate a Target Acquisition Device (TAD)",
        "count": 1,
        "is_sequential": false,
        "map_slug": null,
        "location_hint": "Found at major POIs in any zone",
        "rewards": [
          {
            "reward_type": "reputation",
            "amount": 60,
            "display_name": "CyberAcme Reputation",
            "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
            "faction_slug": "cyberacme",
            "reference_slug": null,
            "reference_table": null,
            "rarity": null,
            "is_guaranteed": true,
            "drop_chance": null,
            "cosmetic_type": null
          }
        ],
        "walkthrough": null,
        "media": [],
        "warnings": [],
        "enemies": []
      },
      {
        "step_number": 2,
        "name": "Eliminate UESC",
        "description": "Eliminate UESC",
        "count": 10,
        "is_sequential": false,
        "map_slug": null,
        "location_hint": null,
        "rewards": [
          {
            "reward_type": "reputation",
            "amount": 60,
            "display_name": "CyberAcme Reputation",
            "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
            "faction_slug": "cyberacme",
            "reference_slug": null,
            "reference_table": null,
            "rarity": null,
            "is_guaranteed": true,
            "drop_chance": null,
            "cosmetic_type": null
          }
        ],
        "walkthrough": null,
        "media": [],
        "warnings": [],
        "enemies": []
      }
    ],
    "completion_rewards": [
      {
        "reward_type": "material",
        "amount": 300,
        "display_name": "Salvage Kit",
        "icon_url": "https://helpbot.marathondb.gg/assets/items/materials/salvage-kit.png",
        "reference_slug": "salvage-kit",
        "reference_table": "materials",
        "faction_slug": null,
        "rarity": null,
        "is_guaranteed": true,
        "drop_chance": null,
        "cosmetic_type": null
      }
    ],
    "choice_rewards": [],
    "total_reputation": 120,
    "reward_summary": "120 Rep + Salvage Kit ×300",
    "enemies": [],
    "warnings": [],
    "media": [],
    "tips": [],
    "video_url": null,
    "related_contracts": [
      {
        "slug": "emergent-opportunities-1",
        "name": "Emergent Opportunities I",
        "contract_type": "standard",
        "faction_slug": "cyberacme"
      }
    ],
    "created_at": "2026-03-05T00:00:00Z",
    "updated_at": "2026-03-05T00:00:00Z"
  }
}
```

### Liaison Contract Detail (with story content)

```json
{
  "success": true,
  "contract": {
    "slug": "introducing-nucaloric",
    "name": "Introducing: Nucaloric",
    "description": "In Perimeter, retrieve a NuCal ID from a tick-infested building. Use the nearby workstation, then head northeast of the infested building to find the DCON on a rooftop.",
    "flavor_text": "The future of energy. Clean. Renewable. Ours.",
    "story_text": "NuCaloric is a pioneer in sustainable energy production on Tau Ceti IV. Their interest in the colony's unique biological resources has led them to establish research outposts across Perimeter. They are looking for Runners willing to assist in securing data and biological samples.",
    "story_image_url": "https://helpbot.marathondb.gg/assets/contracts/introducing-nucaloric-hero.jpg",
    "contract_type": "liaison",
    "difficulty": "easy",
    "difficulty_rating": 2,
    "scope": "single_run",
    "faction": {
      "slug": "cyberacme",
      "name": "CyberAcme",
      "agent_name": "Cyberacme Agent",
      "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
      "color_surface": "#01d838",
      "color_on_surface": "#1c1a1b"
    },
    "is_active": true,
    "is_repeatable": false,
    "is_unlimited": false,
    "required_rank": null,
    "reroll": null,
    "steps": [
      {
        "step_number": 1,
        "name": "Locate Employee",
        "description": "Find NuCal Employee ID in the building east of \"OVERFLOW\"",
        "count": 1,
        "is_sequential": true,
        "map_slug": "perimeter",
        "location_hint": "Head directly East from \"Overflow\"",
        "rewards": [
          {
            "reward_type": "reputation",
            "amount": 90,
            "display_name": "CyberAcme Reputation",
            "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
            "faction_slug": "cyberacme",
            "is_guaranteed": true
          }
        ],
        "walkthrough": "Head directly East from the Overflow region...",
        "media": [],
        "warnings": [],
        "enemies": []
      },
      {
        "step_number": 2,
        "name": "Download data",
        "description": "Download employee data from the workstation nearby.",
        "count": 1,
        "is_sequential": true,
        "map_slug": null,
        "location_hint": "This workstation is very near by!",
        "rewards": [
          {
            "reward_type": "reputation",
            "amount": 90,
            "display_name": "CyberAcme Reputation",
            "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
            "faction_slug": "cyberacme",
            "is_guaranteed": true
          }
        ]
      },
      {
        "step_number": 3,
        "name": "Deliver ID",
        "description": "THEN Deliver NuCal Employee ID to DCON northeast of OVERFLOW",
        "count": 1,
        "is_sequential": true,
        "map_slug": null,
        "location_hint": null,
        "rewards": [
          {
            "reward_type": "reputation",
            "amount": 90,
            "display_name": "CyberAcme Reputation",
            "icon_url": "https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png",
            "faction_slug": "cyberacme",
            "is_guaranteed": true
          }
        ]
      }
    ],
    "completion_rewards": [
      {
        "reward_type": "weapon",
        "amount": 1,
        "display_name": "Surplus Autorifle",
        "icon_url": "https://helpbot.marathondb.gg/assets/items/weapons/surplus-autorifle.png",
        "reference_slug": "surplus-autorifle",
        "reference_table": "weapons",
        "rarity": "uncommon",
        "is_guaranteed": true
      },
      {
        "reward_type": "material",
        "amount": 500,
        "display_name": "NuCal Supply Tokens",
        "icon_url": "https://helpbot.marathondb.gg/assets/items/materials/nucal-supply-tokens.png",
        "reference_slug": null,
        "reference_table": "materials",
        "rarity": null,
        "is_guaranteed": true
      }
    ],
    "total_reputation": 270,
    "reward_summary": "270 Rep + Surplus Autorifle + NuCal Supply Tokens ×500",
    "tips": ["Gameplay tip box - design test"],
    "video_url": null,
    "related_contracts": [],
    "created_at": "2026-02-14T15:20:16Z",
    "updated_at": "2026-02-14T15:20:16Z"
  }
}
```

---

## Known Maps

Contracts reference these map slugs:

| Slug | Display Name | Notes |
|------|-------------|-------|
| `perimeter` | Perimeter | First zone. Regions: Columns, Data Wall, East Wall, Hauler, North Relay, Overflow, Ravine, South Relay, Station, Tunnels |
| `dire-marsh` | Dire Marsh | Second zone. Regions: AI Uplink, Algae Ponds, Bio-Research, Complex, Field Maintenance, Intersection, Maintenance, Quarantine |
| `outpost` | Outpost | Third zone. Regions: Airfield, Flight Control, Orientation |
| `any-zone` | Any Zone | Contract can be completed in any zone |

---

## Known Salvage Materials

These are the faction-specific crafting materials used in upgrade costs:

| Material | Icon Path | Used By |
|----------|-----------|---------|
| Unstable Diode | `assets/items/salvage/unstable-diode-64x64.png` | CyberAcme, Sekiguchi |
| Unstable Biomass | `assets/items/salvage/unstable-biomass-64x64.png` | Nucaloric |
| Alien Alloy | `assets/items/salvage/alien-alloy-64x64.png` | Traxus |
| Reflex Coil | `assets/items/salvage/reflex-coil-64x64.png` | Traxus |
| Volatile Compounds | `assets/items/salvage/compounds-64x64.png` | MIDA |
| Surveillance Lens | `assets/items/salvage/lens-64x64.png` | MIDA |
| Unstable Gel | `assets/items/salvage/unstable-gel-64x64.png` | Arachne |

---

## Known Currencies

| Currency | Icon Path |
|----------|-----------|
| Credits | `assets/items/currency/credits-128x128.png` |

---

*End of specification. This document contains all known faction, contract, upgrade, and reward data as of March 2026. Update as new content is discovered in-game.*
