// Faction Upgrade Definitions — Static data for the upgrade checklist
// Data sourced from user's verified Faction Upgrades v2 spreadsheet (Mar 2026).

const FACTION_UPGRADES = {
  // ═══════════════════════════════════════════════════════════════════
  // CYBERACME
  // ═══════════════════════════════════════════════════════════════════
  cyberacme: {
    name: 'CyberAcme',
    color: '#01d838',
    agent: 'Oni',
    materials: [
      { slug: 'unstable-diode',          name: 'Unstable Diode',          icon: 'https://items.marathondb.gg/images/items/unstable-diode.webp' },
      { slug: 'unstable-gel',            name: 'Unstable Gel',            icon: 'https://items.marathondb.gg/images/items/unstable-gel.webp' },
      { slug: 'unstable-gunmetal',       name: 'Unstable Gunmetal',       icon: 'https://items.marathondb.gg/images/items/unstable-gunmetal.webp' },
      { slug: 'unstable-biomass',        name: 'Unstable Biomass',        icon: 'https://items.marathondb.gg/images/items/unstable-biomass.webp' },
      { slug: 'unstable-lead',           name: 'Unstable Lead',           icon: 'https://items.marathondb.gg/images/items/unstable-lead.webp' },
    ],
    upgrades: [
      // ── Inventory ──
      {
        slug: 'cyac-expansion',
        name: 'Expansion',
        category: 'inventory',
        description: 'Gain additional rows of vault capacity for the rest of the current season.',
        maxLevel: 5,
        levels: [
          { level: 1, rank: 3, credits: 2500, effect: 'Vault Size +8 Rows', salvage: [{ slug: 'unstable-diode', amount: 12 }] },
          { level: 2, rank: 7, credits: 4000, effect: 'Vault Size +8 Rows', salvage: [{ slug: 'unstable-diode', amount: 22 }, { slug: 'unstable-gunmetal', amount: 12 }] },
          { level: 3, rank: 12, credits: 5000, effect: 'Vault Size +6 Rows', salvage: [{ slug: 'unstable-diode', amount: 27 }, { slug: 'unstable-gunmetal', amount: 15 }] },
          { level: 4, rank: 18, credits: 7000, effect: 'Vault Size +4 Rows', salvage: [{ slug: 'unstable-diode', amount: 30 }, { slug: 'unstable-gunmetal', amount: 18 }] },
          { level: 5, rank: 28, credits: 10000, effect: 'Vault Size +4 Rows', salvage: [{ slug: 'unstable-diode', amount: 50 }, { slug: 'unstable-gunmetal', amount: 30 }] },
        ],
      },
      {
        slug: 'cyac-credit-limit',
        name: 'Credit Limit',
        category: 'inventory',
        description: 'Raises your credit wallet\'s capacity for the rest of the season.',
        maxLevel: 5,
        levels: [
          { level: 1, rank: 4, credits: 2500, effect: 'Credit Wallet Capacity +20k', salvage: [] },
          { level: 2, rank: 8, credits: 4000, effect: 'Credit Wallet Capacity +50k', salvage: [] },
          { level: 3, rank: 12, credits: 7000, effect: 'Credit Wallet Capacity +200k', salvage: [] },
          { level: 4, rank: 18, credits: 10000, effect: 'Credit Wallet Capacity +700k', salvage: [] },
          { level: 5, rank: 25, credits: 50000, effect: 'Credit Wallet Capacity +9,000k', salvage: [] },
        ],
      },
      // ── Function ──
      {
        slug: 'cyac-informant-exe',
        name: 'Informant.exe',
        category: 'function',
        description: 'Increases data card credit rewards by 50%. This bonus additively stacks with other Informant upgrades.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 2, credits: 1500, effect: 'Data Card Credit Value +50%', salvage: [] },
          { level: 2, rank: 15, credits: 2000, effect: 'Data Card Credit Value +50%', salvage: [] },
        ],
      },
      {
        slug: 'cyac-soundproof-exe',
        name: 'Soundproof.exe',
        category: 'function',
        description: 'You make less noise while looting.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: 'Reduced looting noise', salvage: [] },
        ],
      },
      {
        slug: 'cyac-loose-change-exe',
        name: 'Loose Change.exe',
        category: 'function',
        description: 'Opening a container rewards you with 25 credits.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: '+25 Credits per container', salvage: [] },
        ],
      },
      {
        slug: 'cyac-fixative-exe',
        name: 'Fixative.exe',
        category: 'function',
        description: 'ROOK gains an increased chance of finding Matter Fixatives when defeating UESC.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 25, credits: 3500, effect: 'Increased Matter Fixative drops', salvage: [] },
        ],
      },
      {
        slug: 'cyac-slider-exe',
        name: 'Slider.exe',
        category: 'function',
        description: 'Your sprint slide generates less heat.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 7000, effect: 'Reduced slide heat', salvage: [] },
        ],
      },
      // ── Armory ──
      {
        slug: 'cyac-carrier',
        name: 'Carrier',
        category: 'armory',
        description: 'Unlocks Enhanced backpacks for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 5, credits: 1500, effect: '8XS Base Pack', salvage: [] },
        ],
      },
      {
        slug: 'cyac-carrier-plus',
        name: 'Carrier+',
        category: 'armory',
        description: 'Unlocks Deluxe backpacks for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 15, credits: 4000, effect: '16XS Base Pack', salvage: [] },
        ],
      },
      {
        slug: 'cyac-enhanced-weaponry',
        name: 'Enhanced Weaponry',
        category: 'armory',
        description: 'Unlocks Enhanced Overrun AR, V11 Punch, and CE Tactical Sidearm for purchase from CyberAcme.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 4, credits: 2500, effect: 'Unlock Enhanced weapons', salvage: [] },
        ],
      },
      {
        slug: 'cyac-deluxe-weaponry',
        name: 'Deluxe Weaponry',
        category: 'armory',
        description: 'Unlocks Deluxe Overrun AR, V11 Punch, and CE Tactical Sidearm for purchase from CyberAcme.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 14, credits: 4000, effect: 'Unlock Deluxe weapons', salvage: [] },
        ],
      },
      {
        slug: 'cyac-locksmith',
        name: 'Locksmith',
        category: 'armory',
        description: 'Unlocks lockbox key for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 4, credits: 2500, effect: 'Lockbox Key (Item)', salvage: [] },
        ],
      },
      {
        slug: 'cyac-keymaker',
        name: 'Keymaker',
        category: 'armory',
        description: 'Unlocks Deluxe Key templates for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 16, credits: 4000, effect: 'Deluxe Key Template (Item)', salvage: [] },
        ],
      },
      {
        slug: 'cyac-keymaker-plus',
        name: 'Keymaker+',
        category: 'armory',
        description: 'Unlocks Superior Key templates for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 28, credits: 7000, effect: 'Superior Key Template (Item)', salvage: [] },
        ],
      },
      // ── Stat ──
      {
        slug: 'cyac-heat-sink-exe',
        name: 'Heat Sink.exe',
        category: 'stat',
        description: 'Heat Capacity increases the number of movement actions (sprint, sliding) you can perform before overheating.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 1, credits: 2500, effect: 'Heat Capacity +20', salvage: [{ slug: 'unstable-biomass', amount: 12 }] },
          { level: 2, rank: 12, credits: 3500, effect: 'Heat Capacity +20', salvage: [{ slug: 'unstable-biomass', amount: 24 }, { slug: 'unstable-lead', amount: 12 }] },
        ],
      },
      {
        slug: 'cyac-scavenger-exe',
        name: 'Scavenger.exe',
        category: 'stat',
        description: 'Loot Speed increases how quickly items are revealed when looting containers.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: 'Loot Speed +20', salvage: [] },
          { level: 2, rank: 4, credits: 2500, effect: 'Loot Speed +20', salvage: [] },
          { level: 3, rank: 16, credits: 4000, effect: 'Loot Speed +20', salvage: [] },
        ],
      },
      {
        slug: 'cyac-quick-vent-exe',
        name: 'Quick Vent.exe',
        category: 'stat',
        description: 'Your heat recovery begins more quickly after actions that generate heat.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 4, credits: 2500, effect: 'Heat Recovery Speed -20%', salvage: [{ slug: 'unstable-gel', amount: 8 }] },
          { level: 2, rank: 20, credits: 4000, effect: 'Heat Recovery Speed -20%', salvage: [{ slug: 'unstable-gel', amount: 16 }] },
        ],
      },
      {
        slug: 'cyac-active-cool-exe',
        name: 'Active Cool.exe',
        category: 'stat',
        description: 'Your generated heat recovers more quickly.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 13, credits: 3500, effect: 'Heat Recovery Rate +15%', salvage: [{ slug: 'unstable-gel', amount: 24 }] },
          { level: 2, rank: 23, credits: 5000, effect: 'Heat Recovery Rate +15%', salvage: [{ slug: 'unstable-gel', amount: 30 }] },
        ],
      },
      {
        slug: 'cyac-firm-stance-exe',
        name: 'Firm Stance.exe',
        category: 'stat',
        description: 'Fall Resistance reduces the amount of damage you take after falling.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: 'Fall Resistance +20', salvage: [] },
          { level: 2, rank: 11, credits: 4000, effect: 'Fall Resistance +20', salvage: [] },
          { level: 3, rank: 26, credits: 5000, effect: 'Fall Resistance +20', salvage: [] },
        ],
      },
      {
        slug: 'cyac-loot-siphon-exe',
        name: 'Loot Siphon.exe',
        category: 'stat',
        description: 'Grants bonus tactical ability energy when opening an unlooted container.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 7, credits: 1500, effect: 'Tactical Energy on Container Loot +5%', salvage: [] },
          { level: 2, rank: 17, credits: 4000, effect: 'Tactical Energy on Container Loot +5%', salvage: [] },
        ],
      },
    ],
    capstones: [
      { rank: 1, nodesRequired: 6, name: 'Capstone I', reward: 'Bonus Pay' },
      { rank: 2, nodesRequired: 12, name: 'Capstone II', reward: 'CyberAcme Treasure Reputation +20%' },
      { rank: 3, nodesRequired: 18, name: 'Capstone III', reward: 'Unlocks Enhanced CyberAcme Sponsorship Kits for purchase' },
      { rank: 4, nodesRequired: 24, name: 'Capstone IV', reward: 'Stipend — Rook will now start runs with a small amount of credits in addition to their basic gear' },
      { rank: 5, nodesRequired: 30, name: 'Capstone V', reward: 'Max Looter — Unlocks Superior Backpacks for purchase in the Armory (24XS Backpack)' },
      { rank: 6, nodesRequired: 38, name: 'Capstone VI', reward: 'Carrier — Start with Deluxe Backpack' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // NUCALORIC
  // ═══════════════════════════════════════════════════════════════════
  nucaloric: {
    name: 'NuCaloric',
    color: '#ff125d',
    agent: 'Gaius',
    materials: [
      { slug: 'unstable-biomass',        name: 'Unstable Biomass',        icon: 'https://items.marathondb.gg/images/items/unstable-biomass.webp' },
      { slug: 'sparkleaf',               name: 'Sparkleaf',               icon: 'https://items.marathondb.gg/images/items/sparkleaf.webp' },
      { slug: 'reclaimed-biostripping',  name: 'Reclaimed Biostripping',  icon: 'https://items.marathondb.gg/images/items/reclaimed-biostripping.webp' },
      { slug: 'dermachem-pack',          name: 'Dermachem Pack',          icon: 'https://items.marathondb.gg/images/items/dermachem-pack.webp' },
      { slug: 'tarax-seed',              name: 'Tarax Seed',              icon: 'https://items.marathondb.gg/images/items/tarax-seed.webp' },
      { slug: 'biolens-seed',            name: 'Biolens Seed',            icon: 'https://items.marathondb.gg/images/items/biolens-seed.webp' },
      { slug: 'sterilized-biostripping', name: 'Sterilized Biostripping', icon: 'https://items.marathondb.gg/images/items/sterilized-biostripping.webp' },
      { slug: 'neurochem-pack',          name: 'Neurochem Pack',          icon: 'https://items.marathondb.gg/images/items/neurochem-pack.webp' },
      { slug: 'neural-insulation',       name: 'Neural Insulation',       icon: 'https://items.marathondb.gg/images/items/neural-insulation.webp' },
      { slug: 'hazard-capsule',          name: 'Hazard Capsule',          icon: 'https://items.marathondb.gg/images/items/hazard-capsule.webp' },
      { slug: 'enzyme-replicator',       name: 'Enzyme Replicator',       icon: 'https://items.marathondb.gg/images/items/enzyme-replicator.webp' },
    ],
    upgrades: [
      // ── Armory ──
      {
        slug: 'nucal-safeguard',
        name: 'Safeguard',
        category: 'armory',
        description: 'Unlocks daily free Shield Charges in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: 'Free Daily Shield Charges', salvage: [{ slug: 'unstable-biomass', amount: 16 }] },
        ],
      },
      {
        slug: 'nucal-advanced-shields',
        name: 'Advanced Shields',
        category: 'armory',
        description: 'Unlocks Advanced Shield Charges for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 6, credits: 1500, effect: 'Advanced Shield Charge', salvage: [{ slug: 'reclaimed-biostripping', amount: 10 }, { slug: 'unstable-biomass', amount: 10 }] },
        ],
      },
      {
        slug: 'nucal-safeguard-plus',
        name: 'Safeguard+',
        category: 'armory',
        description: 'Unlocks daily free Advanced Shield Charges in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 11, credits: 2000, effect: 'Free Daily Advanced Shield Charges', salvage: [{ slug: 'sterilized-biostripping', amount: 6 }, { slug: 'sparkleaf', amount: 16 }] },
        ],
      },
      {
        slug: 'nucal-shield-stock',
        name: 'Shield Stock',
        category: 'armory',
        description: 'Increases Advanced Shield Charge stock in the Armory by 5.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 12, credits: 1500, effect: 'Shield Charge Stock +5', salvage: [{ slug: 'reclaimed-biostripping', amount: 15 }, { slug: 'sparkleaf', amount: 8 }] },
        ],
      },
      {
        slug: 'nucal-shielded',
        name: 'Shielded',
        category: 'armory',
        description: 'Unlocks Enhanced shield implants for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 5, credits: 1500, effect: 'Protector V1', salvage: [{ slug: 'reclaimed-biostripping', amount: 12 }, { slug: 'unstable-biomass', amount: 13 }] },
        ],
      },
      {
        slug: 'nucal-armored',
        name: 'Armored',
        category: 'armory',
        description: 'Unlocks Deluxe shield implants for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 20, credits: 3500, effect: 'Protector V2', salvage: [{ slug: 'biolens-seed', amount: 7 }, { slug: 'neural-insulation', amount: 3 }] },
        ],
      },
      {
        slug: 'nucal-restore',
        name: 'Restore',
        category: 'armory',
        description: 'Unlocks daily free Patch Kits in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: 'Free Daily Patch Kits', salvage: [{ slug: 'unstable-biomass', amount: 23 }] },
        ],
      },
      {
        slug: 'nucal-advanced-patch',
        name: 'Advanced Patch',
        category: 'armory',
        description: 'Unlocks Advanced Patch Kits for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 8, credits: 1500, effect: 'Advanced Patch Kit', salvage: [{ slug: 'dermachem-pack', amount: 10 }, { slug: 'unstable-biomass', amount: 13 }] },
        ],
      },
      {
        slug: 'nucal-restore-plus',
        name: 'Restore+',
        category: 'armory',
        description: 'Unlocks daily free Advanced Patch Kits in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 10, credits: 2000, effect: 'Free Daily Advanced Patch Kits', salvage: [{ slug: 'neurochem-pack', amount: 5 }, { slug: 'sparkleaf', amount: 16 }] },
        ],
      },
      {
        slug: 'nucal-patch-stock',
        name: 'Patch Stock',
        category: 'armory',
        description: 'Increases Advanced Patch Kit stock in the Armory by 5.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 12, credits: 1500, effect: 'Patch Kit Stock +5', salvage: [{ slug: 'dermachem-pack', amount: 8 }, { slug: 'unstable-biomass', amount: 11 }] },
        ],
      },
      {
        slug: 'nucal-panacea-kit',
        name: 'Panacea Kit',
        category: 'armory',
        description: 'Unlocks Panacea Kits for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 25, credits: 5000, effect: 'Panacea Kit', salvage: [{ slug: 'hazard-capsule', amount: 2 }, { slug: 'neural-insulation', amount: 7 }] },
        ],
      },
      {
        slug: 'nucal-regen',
        name: 'Regen',
        category: 'armory',
        description: 'Unlocks Regen V2 implant for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 3, credits: 750, effect: 'Regen V2', salvage: [{ slug: 'unstable-biomass', amount: 10 }] },
        ],
      },
      {
        slug: 'nucal-regen-plus',
        name: 'Regen+',
        category: 'armory',
        description: 'Unlocks Regen V3 implant for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 10, credits: 1500, effect: 'Regen V3', salvage: [{ slug: 'reclaimed-biostripping', amount: 28 }, { slug: 'sparkleaf', amount: 14 }] },
        ],
      },
      {
        slug: 'nucal-regen-plus-plus',
        name: 'Regen++',
        category: 'armory',
        description: 'Unlocks Regen V4 implant for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 21, credits: 3500, effect: 'Regen V4', salvage: [{ slug: 'biolens-seed', amount: 7 }, { slug: 'neural-insulation', amount: 3 }] },
        ],
      },
      {
        slug: 'nucal-advanced-mch',
        name: 'Advanced MCH',
        category: 'armory',
        description: 'Unlocks Advanced Mechanic\'s Kits for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 6, credits: 1500, effect: 'Advanced Mechanic\'s Kit', salvage: [{ slug: 'reclaimed-biostripping', amount: 8 }, { slug: 'unstable-biomass', amount: 9 }] },
        ],
      },
      {
        slug: 'nucal-advanced-os',
        name: 'Advanced OS',
        category: 'armory',
        description: 'Unlocks Advanced OS Debugs for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 7, credits: 1500, effect: 'Advanced OS Debug', salvage: [{ slug: 'reclaimed-biostripping', amount: 10 }, { slug: 'unstable-biomass', amount: 10 }] },
        ],
      },
      {
        slug: 'nucal-helping-hands',
        name: 'Helping Hands',
        category: 'armory',
        description: 'Unlocks Helping Hands V2 implant for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 2, credits: 750, effect: 'Helping Hands V2', salvage: [{ slug: 'unstable-biomass', amount: 10 }] },
        ],
      },
      {
        slug: 'nucal-helping-hands-plus',
        name: 'Helping Hands+',
        category: 'armory',
        description: 'Unlocks Helping Hands V3 implant for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 11, credits: 1500, effect: 'Helping Hands V3', salvage: [{ slug: 'dermachem-pack', amount: 10 }, { slug: 'sparkleaf', amount: 13 }] },
        ],
      },
      {
        slug: 'nucal-helping-hands-plus-plus',
        name: 'Helping Hands++',
        category: 'armory',
        description: 'Unlocks Helping Hands V4 implant for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 22, credits: 3500, effect: 'Helping Hands V4', salvage: [{ slug: 'biolens-seed', amount: 9 }, { slug: 'tarax-seed', amount: 14 }] },
        ],
      },
      {
        slug: 'nucal-self-revive',
        name: 'Self-Revive',
        category: 'armory',
        description: 'Unlocks Self-Revives for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 12, credits: 1500, effect: 'Self-Revive', salvage: [{ slug: 'neurochem-pack', amount: 4 }, { slug: 'sparkleaf', amount: 14 }] },
        ],
      },
      // ── Stat ──
      {
        slug: 'nucal-null-hazard-exe',
        name: 'NULL_HAZARD.EXE',
        category: 'stat',
        description: 'Hazard Tolerance increases your maximum data buffer protection, which is restored by using HEC consumables.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 4, credits: 750, effect: 'Hazard Tolerance +50', salvage: [{ slug: 'unstable-biomass', amount: 19 }] },
          { level: 2, rank: 14, credits: 1500, effect: 'Hazard Tolerance +50', salvage: [{ slug: 'sterilized-biostripping', amount: 5 }, { slug: 'sparkleaf', amount: 12 }] },
        ],
      },
      {
        slug: 'nucal-tciv-resist-exe',
        name: 'TCIV_RESIST.EXE',
        category: 'stat',
        description: 'Ticks, lightning, and Heat Cascade deal reduced damage.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 21, credits: 3500, effect: 'Reduced environmental damage', salvage: [{ slug: 'biolens-seed', amount: 5 }, { slug: 'tarax-seed', amount: 7 }] },
        ],
      },
      {
        slug: 'nucal-reinforce-exe',
        name: 'REINFORCE.EXE',
        category: 'stat',
        description: 'Hardware reduces the duration of negative status effects that debilitate your Runner\'s physical chassis (Frost, Immobilize, Overheat, Toxin).',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 6, credits: 1500, effect: 'Hardware +20', salvage: [{ slug: 'reclaimed-biostripping', amount: 8 }, { slug: 'unstable-biomass', amount: 9 }] },
          { level: 2, rank: 16, credits: 2000, effect: 'Hardware +20', salvage: [{ slug: 'sterilized-biostripping', amount: 7 }, { slug: 'sparkleaf', amount: 25 }] },
          { level: 3, rank: 26, credits: 5000, effect: 'Hardware +20', salvage: [{ slug: 'hazard-capsule', amount: 2 }] },
        ],
      },
      {
        slug: 'nucal-unfazed-exe',
        name: 'UNFAZED.EXE',
        category: 'stat',
        description: 'Firewall reduces the duration of status effects that degrade your Runner\'s electronic systems (EMP, Hack).',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 7, credits: 1500, effect: 'Firewall +20', salvage: [{ slug: 'dermachem-pack', amount: 7 }, { slug: 'unstable-biomass', amount: 7 }] },
          { level: 2, rank: 18, credits: 2000, effect: 'Firewall +20', salvage: [{ slug: 'neurochem-pack', amount: 8 }, { slug: 'tarax-seed', amount: 5 }] },
          { level: 3, rank: 27, credits: 5000, effect: 'Firewall +20', salvage: [{ slug: 'hazard-capsule', amount: 2 }, { slug: 'tarax-seed', amount: 9 }] },
        ],
      },
      {
        slug: 'nucal-recovery-exe',
        name: 'RECOVERY.EXE',
        category: 'stat',
        description: 'Self-Repair Speed increases how quickly your consumables restore missing health or shields.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 9, credits: 1500, effect: 'Self-Repair Speed +20', salvage: [{ slug: 'dermachem-pack', amount: 10 }, { slug: 'unstable-biomass', amount: 13 }] },
          { level: 2, rank: 19, credits: 2000, effect: 'Self-Repair Speed +20', salvage: [{ slug: 'neurochem-pack', amount: 10 }, { slug: 'tarax-seed', amount: 6 }] },
          { level: 3, rank: 29, credits: 5000, effect: 'Self-Repair Speed +20', salvage: [{ slug: 'hazard-capsule', amount: 3 }, { slug: 'enzyme-replicator', amount: 3 }] },
        ],
      },
      // ── Function ──
      {
        slug: 'nucal-shield-comm',
        name: 'Shield Comm',
        category: 'function',
        description: 'NuCaloric standard contracts will now award Shield Charges in addition to other rewards.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 15, credits: 2000, effect: 'Shield Charges from contracts', salvage: [{ slug: 'sterilized-biostripping', amount: 12 }, { slug: 'tarax-seed', amount: 6 }] },
        ],
      },
      {
        slug: 'nucal-health-comm',
        name: 'Health Comm',
        category: 'function',
        description: 'NuCaloric standard contracts will now award Patch Kits in addition to other rewards.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 24, credits: 5000, effect: 'Patch Kits from contracts', salvage: [{ slug: 'hazard-capsule', amount: 2 }] },
        ],
      },
      {
        slug: 'nucal-resist-comm',
        name: 'Resist Comm',
        category: 'function',
        description: 'NuCaloric standard contracts will now award Mechanic\'s Kits or OS Reboots in addition to other rewards.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 22, credits: 3500, effect: 'Mechanic\'s Kits/OS Reboots from contracts', salvage: [{ slug: 'biolens-seed', amount: 9 }, { slug: 'neural-insulation', amount: 3 }] },
        ],
      },
      {
        slug: 'nucal-field-medic-exe',
        name: 'FIELD_MEDIC.EXE',
        category: 'function',
        description: 'Health and shield consumables take less time to use.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: 'Faster consumable use', salvage: [{ slug: 'hazard-capsule', amount: 3 }, { slug: 'enzyme-replicator', amount: 8 }] },
        ],
      },
    ],
    capstones: [
      { rank: 1, nodesRequired: 6, name: 'Capstone I', reward: 'Rook will now start runs with a Patch Kit and Shield Charge' },
      { rank: 2, nodesRequired: 12, name: 'Capstone II', reward: 'Treasure Hunter — Increases NuCaloric Treasure Reputation by 20%' },
      { rank: 3, nodesRequired: 18, name: 'Capstone III', reward: 'Unlocks Enhanced NuCaloric Sponsorship Kits for purchase. NuCaloric will now also barter wares for certain Superior Salvage.' },
      { rank: 4, nodesRequired: 24, name: 'Capstone IV', reward: '2nd Chance.exe — Self-Revives have a small chance to not be consumed on use' },
      { rank: 5, nodesRequired: 30, name: 'Capstone V', reward: 'Hush.exe — You make less noise while healing' },
      { rank: 6, nodesRequired: 38, name: 'Capstone VI', reward: 'Reinforced — Unlocks Superior Shield Implants for purchase in the Armory. NuCaloric will now barter their wares for certain Prestige Salvage.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TRAXUS
  // ═══════════════════════════════════════════════════════════════════
  traxus: {
    name: 'Traxus',
    color: '#ff7300',
    agent: 'Vulcan',
    materials: [
      { slug: 'unstable-gunmetal',       name: 'Unstable Gunmetal',       icon: 'https://items.marathondb.gg/images/items/unstable-gunmetal.webp' },
      { slug: 'deimosite-rods',          name: 'Deimosite Rods',          icon: 'https://items.marathondb.gg/images/items/deimosite-rods.webp' },
      { slug: 'altered-wire',            name: 'Altered Wire',            icon: 'https://items.marathondb.gg/images/items/altered-wire.webp' },
      { slug: 'plasma-filament',         name: 'Plasma Filament',         icon: 'https://items.marathondb.gg/images/items/plasma-filament.webp' },
      { slug: 'tachyon-filament',        name: 'Tachyon Filament',        icon: 'https://items.marathondb.gg/images/items/tachyon-filament.webp' },
      { slug: 'anomalous-wire',          name: 'Anomalous Wire',          icon: 'https://items.marathondb.gg/images/items/anomalous-wire.webp' },
      { slug: 'cetinite-rods',           name: 'Cetinite Rods',           icon: 'https://items.marathondb.gg/images/items/cetinite-rods.webp' },
      { slug: 'predictive-framework',    name: 'Predictive Framework',    icon: 'https://items.marathondb.gg/images/items/predictive-framework.webp' },
      { slug: 'ballistic-turbine',       name: 'Ballistic Turbine',       icon: 'https://items.marathondb.gg/images/items/ballistic-turbine.webp' },
      { slug: 'reflex-coil',             name: 'Reflex Coil',             icon: 'https://items.marathondb.gg/images/items/reflex-coil.webp' },
      { slug: 'alien-alloy',             name: 'Alien Alloy',             icon: 'https://items.marathondb.gg/images/items/alien-alloy.webp' },
    ],
    upgrades: [
      // ── Armory ──
      {
        slug: 'trax-smg-mods',
        name: 'SMG Mods',
        category: 'armory',
        description: 'Unlocks rotating Enhanced SMG mods from the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: 'Unlock Enhanced SMG mods (2 items)', salvage: [{ slug: 'unstable-gunmetal', amount: 10 }] },
          { level: 2, rank: 6, credits: 1500, effect: 'Unlock additional Enhanced SMG mods (2 items)', salvage: [{ slug: 'deimosite-rods', amount: 7 }, { slug: 'unstable-gunmetal', amount: 6 }] },
        ],
      },
      {
        slug: 'trax-deluxe-smg-mods',
        name: 'Deluxe SMG Mods',
        category: 'armory',
        description: 'Unlocks rotating Deluxe SMG mods from the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 18, credits: 3500, effect: 'Unlock deluxe SMG mods (3 items)', salvage: [{ slug: 'predictive-framework', amount: 4 }, { slug: 'tachyon-filament', amount: 6 }] },
        ],
      },
      {
        slug: 'trax-enhanced-heavy-submachine-gun',
        name: 'Enhanced Heavy Submachine Gun',
        category: 'armory',
        description: 'Unlocks Enhanced "Bully SMG" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 10, credits: 1500, effect: 'Unlocks Bully SMG for purchase', salvage: [{ slug: 'deimosite-rods', amount: 23 }, { slug: 'altered-wire', amount: 9 }] },
        ],
      },
      {
        slug: 'trax-enhanced-volt-submachine-gun',
        name: 'Enhanced Volt Submachine Gun',
        category: 'armory',
        description: 'Unlocks Enhanced "V22 Volt Thrower" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 15, credits: 2000, effect: 'Unlocks V22 Voltthrower for purchase', salvage: [{ slug: 'cetinite-rods', amount: 12 }, { slug: 'tachyon-filament', amount: 5 }] },
        ],
      },
      {
        slug: 'trax-ar-mods',
        name: 'AR Mods',
        category: 'armory',
        description: 'Unlocks rotating Enhanced AR mods from the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 2, credits: 750, effect: 'Unlock Enhanced AR mods (2 items)', salvage: [{ slug: 'unstable-gunmetal', amount: 10 }] },
          { level: 2, rank: 2, credits: 1500, effect: 'Unlock Enhanced AR mods (2 items)', salvage: [{ slug: 'altered-wire', amount: 7 }, { slug: 'unstable-gunmetal', amount: 6 }] },
        ],
      },
      {
        slug: 'trax-deluxe-ar-mods',
        name: 'Deluxe AR Mods',
        category: 'armory',
        description: 'Unlocks a rotating Deluxe AR mod in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 22, credits: 5000, effect: 'Unlock Deluxe AR mods (3 items)', salvage: [{ slug: 'alien-alloy', amount: 2 }] },
        ],
      },
      {
        slug: 'trax-enhanced-light-ar',
        name: 'Enhanced Light AR',
        category: 'armory',
        description: 'Unlocks Enhanced "M77 AR" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 14, credits: 2000, effect: 'Unlocks M77 AR for purchase in the armory', salvage: [{ slug: 'anomalous-wire', amount: 10 }, { slug: 'tachyon-filament', amount: 4 }] },
        ],
      },
      {
        slug: 'trax-enhanced-chips',
        name: 'Enhanced Chips',
        category: 'armory',
        description: 'Unlocks a set of enhanced weapon chip mods from the Armory',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 5, credits: 1500, effect: 'Unlock 3 weapon chips in the armory', salvage: [{ slug: 'altered-wire', amount: 7 }, { slug: 'unstable-gunmetal', amount: 6 }] },
          { level: 2, rank: 10, credits: 1500, effect: 'Unlock 3 weapon chips in the armory', salvage: [{ slug: 'altered-wire', amount: 19 }, { slug: 'plasma-filament', amount: 9 }] },
        ],
      },
      {
        slug: 'trax-deluxe-chips',
        name: 'Deluxe Chips',
        category: 'armory',
        description: 'Unlocks a set of Deluxe weapon chip mods in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: 'Unlock 4 weapon chips in the armory', salvage: [{ slug: 'alien-alloy', amount: 3 }, { slug: 'reflex-coil', amount: 11 }] },
        ],
      },
      {
        slug: 'trax-volt-mods',
        name: 'Volt Mods',
        category: 'armory',
        description: 'Unlocks rotating Enhanced volt weapon mod from the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 3, credits: 750, effect: '', salvage: [{ slug: 'unstable-gunmetal', amount: 13 }] },
          { level: 2, rank: 11, credits: 1500, effect: '', salvage: [{ slug: 'deimosite-rods', amount: 12 }, { slug: 'altered-wire', amount: 6 }] },
          { level: 3, rank: 17, credits: 1500, effect: '', salvage: [{ slug: 'cetinite-rods', amount: 12 }, { slug: 'altered-wire', amount: 11 }] },
        ],
      },
      {
        slug: 'trax-volt-pr',
        name: 'Volt PR',
        category: 'armory',
        description: 'Unlocks the V66 Lookout for purchase in the Armory (Weapon)',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 8, credits: 1500, effect: 'Unlocks item for purchase', salvage: [{ slug: 'deimosite-rods', amount: 19 }, { slug: 'altered-wire', amount: 7 }] },
          { level: 2, rank: 18, credits: 3500, effect: 'Unlocks item for purchase', salvage: [{ slug: 'predictive-framework', amount: 5 }, { slug: 'tachyon-filament', amount: 7 }] },
        ],
      },
      {
        slug: 'trax-deluxe-volt-mods',
        name: 'Deluxe Volt Mods',
        category: 'armory',
        description: 'Unlocks rotating Deluxe Volt weapon mod in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 20, credits: 3500, effect: 'Unlocks item for purchase', salvage: [{ slug: 'predictive-framework', amount: 7 }, { slug: 'reflex-coil', amount: 3 }] },
        ],
      },
      {
        slug: 'trax-precision-mods',
        name: 'Precision Mods',
        category: 'armory',
        description: 'Unlocks rotating enhanced precision weapon mod from the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 7, credits: 750, effect: '', salvage: [{ slug: 'unstable-gunmetal', amount: 19 }] },
          { level: 2, rank: 13, credits: 1500, effect: '', salvage: [{ slug: 'deimosite-rods', amount: 19 }, { slug: 'altered-wire', amount: 7 }] },
          { level: 3, rank: 19, credits: 2000, effect: '', salvage: [{ slug: 'cetinite-rods', amount: 4 }, { slug: 'tachyon-filament', amount: 4 }] },
        ],
      },
      {
        slug: 'trax-mips-sniper',
        name: 'MIPS Sniper',
        category: 'armory',
        description: 'Unlocks Enhanced "Longshot" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 9, credits: 1500, effect: 'Unlocks "Longshot" for purchase in the armory', salvage: [{ slug: 'anomalous-wire', amount: 5 }, { slug: 'plasma-filament', amount: 10 }] },
        ],
      },
      {
        slug: 'trax-enhanced-hardline-pr',
        name: 'Enhanced Hardline PR',
        category: 'armory',
        description: 'Unlocks Enhanced "Hardline PR" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 12, credits: 2000, effect: 'Unlocks "Hardline PR" for purchase in the armory', salvage: [{ slug: 'anomalous-wire', amount: 8 }, { slug: 'plasma-filament', amount: 21 }] },
        ],
      },
      {
        slug: 'trax-deluxe-precision-mods',
        name: 'Deluxe Precision Mods',
        category: 'armory',
        description: 'Unlocks rotating Deluxe precision weapon mod in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 25, credits: 5000, effect: '', salvage: [{ slug: 'alien-alloy', amount: 2 }, { slug: 'tachyon-filament', amount: 9 }] },
        ],
      },
      // ── Stat ──
      {
        slug: 'trax-tracker-exe',
        name: 'Tracker.exe',
        category: 'stat',
        description: 'Ping duration increases how long your ping persist on hostile targets.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 15, credits: 2000, effect: 'Ping Duration +30', salvage: [{ slug: 'anomalous-wire', amount: 7 }, { slug: 'plasma-filament', amount: 21 }] },
          { level: 2, rank: 26, credits: 5000, effect: 'Ping Duration +30', salvage: [{ slug: 'alien-alloy', amount: 2 }] },
        ],
      },
      {
        slug: 'trax-tad-boost',
        name: 'Tad Boost',
        category: 'stat',
        description: 'Expands the ping\'s area of effect when using a TAD',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 4, credits: 750, effect: 'Tad Ping Area +20m', salvage: [{ slug: 'unstable-gunmetal', amount: 19 }] },
        ],
      },
    ],
    capstones: [
      { rank: 1, nodesRequired: 5, name: 'Capstone I', reward: 'Proficient — Rook will now start runs with an Enhanced weapon. Traxus will now barter their wares for certain Deluxe Salvage.' },
      { rank: 2, nodesRequired: 10, name: 'Capstone II', reward: 'Treasure Hunter — Increases faction rep gained from Traxus Treasures' },
      { rank: 3, nodesRequired: 15, name: 'Capstone III', reward: 'Unlocks Enhanced Traxus Sponsorship Kits for purchase. Traxus will now also barter wares for certain Superior Salvage.' },
      { rank: 4, nodesRequired: 20, name: 'Capstone IV', reward: 'Bonus Mod — Traxus standard contracts will now award a bonus weapon mod in addition to other rewards' },
      { rank: 5, nodesRequired: 25, name: 'Capstone V', reward: 'Deluxe Weapons — Unlocks Deluxe weapons for purchase in the Armory' },
      { rank: 6, nodesRequired: 28, name: 'Capstone VI', reward: 'Superior Mods — Unlocks Superior weapon mods in the Armory. Traxus will now barter their wares for certain Prestige Salvage.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MIDA
  // ═══════════════════════════════════════════════════════════════════
  mida: {
    name: 'MIDA',
    color: '#be72e4',
    agent: 'Gantry',
    materials: [
      { slug: 'unstable-lead',           name: 'Unstable Lead',           icon: 'https://items.marathondb.gg/images/items/unstable-lead.webp' },
      { slug: 'surveillance-lens',       name: 'Surveillance Lens',       icon: 'https://items.marathondb.gg/images/items/surveillance-lens.webp' },
      { slug: 'dynamic-compounds',       name: 'Dynamic Compounds',       icon: 'https://items.marathondb.gg/images/items/dynamic-compounds.webp' },
      { slug: 'volatile-compounds',      name: 'Volatile Compounds',      icon: 'https://items.marathondb.gg/images/items/volatile-compounds.webp' },
      { slug: 'thoughtwave-lens',        name: 'Thoughtwave Lens',        icon: 'https://items.marathondb.gg/images/items/thoughtwave-lens.webp' },
      { slug: 'biolens-seed',            name: 'Biolens Seed',            icon: 'https://items.marathondb.gg/images/items/biolens-seed.webp' },
      { slug: 'ballistic-turbine',       name: 'Ballistic Turbine',       icon: 'https://items.marathondb.gg/images/items/ballistic-turbine.webp' },
      { slug: 'hazard-capsule',          name: 'Hazard Capsule',          icon: 'https://items.marathondb.gg/images/items/hazard-capsule.webp' },
      { slug: 'alien-alloy',             name: 'Alien Alloy',             icon: 'https://items.marathondb.gg/images/items/alien-alloy.webp' },
    ],
    upgrades: [
      // ── Stat ──
      {
        slug: 'mida-flex-matrix-exe',
        name: 'Flex Matrix.exe',
        category: 'stat',
        description: 'Agility increases your movement speed and jump height.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 3, credits: 750, effect: 'Agility +20', salvage: [{ slug: 'unstable-lead', amount: 16 }] },
          { level: 2, rank: 11, credits: 1500, effect: 'Agility +20', salvage: [{ slug: 'surveillance-lens', amount: 28 }, { slug: 'dynamic-compounds', amount: 10 }] },
          { level: 3, rank: 16, credits: 2000, effect: 'Agility +20', salvage: [{ slug: 'thoughtwave-lens', amount: 8 }, { slug: 'dynamic-compounds', amount: 26 }] },
        ],
      },
      // ── Armory ──
      {
        slug: 'mida-survivor',
        name: 'Survivor',
        category: 'armory',
        description: 'Unlocks Survivor Kit V2 Implant for purchase in the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 6, credits: 1500, effect: '', salvage: [{ slug: 'surveillance-lens', amount: 13 }, { slug: 'unstable-lead', amount: 9 }] },
          { level: 2, rank: 12, credits: 1500, effect: '', salvage: [{ slug: 'thoughtwave-lens', amount: 6 }, { slug: 'dynamic-compounds', amount: 11 }] },
          { level: 3, rank: 25, credits: 3500, effect: '', salvage: [{ slug: 'biolens-seed', amount: 10 }, { slug: 'ballistic-turbine', amount: 3 }] },
        ],
      },
      {
        slug: 'mida-graceful',
        name: 'Graceful',
        category: 'armory',
        description: 'Unlocks Graceful Landing Upgrades V2 Implant for purchase in the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 4, credits: 1500, effect: '', salvage: [{ slug: 'surveillance-lens', amount: 9 }, { slug: 'unstable-lead', amount: 5 }] },
          { level: 2, rank: 11, credits: 2000, effect: '', salvage: [{ slug: 'thoughtwave-lens', amount: 8 }, { slug: 'dynamic-compounds', amount: 26 }] },
          { level: 3, rank: 23, credits: 3500, effect: '', salvage: [{ slug: 'biolens-seed', amount: 8 }, { slug: 'ballistic-turbine', amount: 3 }] },
        ],
      },
      {
        slug: 'mida-sprinter',
        name: 'Sprinter',
        category: 'armory',
        description: 'Unlocks Bionic Leg Upgrades V2 Implant for purchase in the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 2, credits: 750, effect: '', salvage: [{ slug: 'unstable-lead', amount: 13 }] },
          { level: 2, rank: 9, credits: 1500, effect: '', salvage: [{ slug: 'thoughtwave-lens', amount: 5 }, { slug: 'dynamic-compounds', amount: 8 }] },
          { level: 3, rank: 24, credits: 3500, effect: '', salvage: [{ slug: 'biolens-seed', amount: 10 }, { slug: 'ballistic-turbine', amount: 3 }] },
        ],
      },
      {
        slug: 'mida-cardio-kick',
        name: 'Cardio Kick',
        category: 'armory',
        description: 'Unlocks "Cardio Kick Packs" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 12, credits: 1500, effect: '', salvage: [{ slug: 'thoughtwave-lens', amount: 4 }, { slug: 'dynamic-compounds', amount: 7 }] },
        ],
      },
      // ── Function ──
      {
        slug: 'mida-full-throttle',
        name: 'Full Throttle',
        category: 'function',
        description: 'Gain the effects of cardio kick for a short duration at the beginning of each run',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: '', salvage: [{ slug: 'alien-alloy', amount: 3 }, { slug: 'ballistic-turbine', amount: 11 }] },
        ],
      },
      {
        slug: 'mida-cloud-cover',
        name: 'Cloud Cover',
        category: 'function',
        description: 'Automatically deploy smoke cloud when activating an exfil site',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: '', salvage: [{ slug: 'hazard-capsule', amount: 3 }, { slug: 'biolens-seed', amount: 12 }] },
        ],
      },
      {
        slug: 'mida-anti-virus',
        name: 'Anti-Virus',
        category: 'function',
        description: 'Gain a small portion of active Anti Virus protection at the beginning of each run',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 11, credits: 1500, effect: 'Active Anti Virus protection.  40 seconds at the start of a match', salvage: [{ slug: 'surveillance-lens', amount: 28 }, { slug: 'dynamic-compounds', amount: 10 }] },
          { level: 2, rank: 18, credits: 2000, effect: 'Active Anti Virus protection.  40 seconds at the start of a match', salvage: [{ slug: 'thoughtwave-lens', amount: 12 }, { slug: 'volatile-compounds', amount: 4 }] },
          { level: 3, rank: 26, credits: 5000, effect: 'Active Anti Virus protection.  40 seconds at the start of a match', salvage: [{ slug: 'hazard-capsule', amount: 12 }] },
        ],
      },
      // ── Armory ──
      {
        slug: 'mida-anti-virus-packs',
        name: 'Anti-Virus Packs',
        category: 'armory',
        description: 'Unlocks "Anti Virus Packs" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 5, credits: 1500, effect: '', salvage: [{ slug: 'unstable-lead', amount: 23 }] },
        ],
      },
      {
        slug: 'mida-hot-potato',
        name: 'Hot Potato',
        category: 'armory',
        description: 'Unlocks "Heat Grenade" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 3, credits: 750, effect: '', salvage: [{ slug: 'unstable-lead', amount: 16 }] },
        ],
      },
      {
        slug: 'mida-explosives',
        name: 'Explosives',
        category: 'armory',
        description: 'Unlocks "Frag Grenade" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 4, credits: 750, effect: '', salvage: [{ slug: 'unstable-lead', amount: 16 }] },
        ],
      },
      {
        slug: 'mida-bullseye',
        name: 'Bullseye',
        category: 'armory',
        description: 'Unlocks "Flecette Grenade" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 8, credits: 1500, effect: '', salvage: [{ slug: 'dynamic-compounds', amount: 15 }, { slug: 'surveillance-lens', amount: 8 }] },
        ],
      },
      {
        slug: 'mida-eyes-open',
        name: 'Eyes Open',
        category: 'armory',
        description: 'Unlocks Proximity Sendor for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 9, credits: 1500, effect: '', salvage: [{ slug: 'dynamic-compounds', amount: 25 }, { slug: 'surveillance-lens', amount: 14 }] },
        ],
      },
      {
        slug: 'mida-bad-step',
        name: 'Bad Step',
        category: 'armory',
        description: 'Unlocks Claymores for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: '', salvage: [{ slug: 'unstable-lead', amount: 13 }] },
        ],
      },
      {
        slug: 'mida-got-em',
        name: 'Got Em',
        category: 'armory',
        description: 'Unlocks Trap Packs for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'dynamic-compounds', amount: 19 }, { slug: 'surveillance-lens', amount: 9 }] },
        ],
      },
      {
        slug: 'mida-chemist',
        name: 'Chemist',
        category: 'armory',
        description: 'Unlocks "Chem Grenade" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 11, credits: 1500, effect: '', salvage: [{ slug: 'volatile-compounds', amount: 4 }, { slug: 'surveillance-lens', amount: 10 }] },
        ],
      },
      {
        slug: 'mida-lights-out',
        name: 'Lights Out',
        category: 'armory',
        description: 'Unlocks "EMP Grenade" for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 12, credits: 2000, effect: '', salvage: [{ slug: 'volatile-compounds', amount: 6 }, { slug: 'surveillance-lens', amount: 16 }] },
        ],
      },
      {
        slug: 'mida-spare-rounds',
        name: 'Spare Rounds',
        category: 'armory',
        description: 'Unlocks "Ammo Crates" for purchase in the Armory',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 8, credits: 1500, effect: '', salvage: [{ slug: 'dynamic-compounds', amount: 19 }, { slug: 'surveillance-lens', amount: 9 }] },
          { level: 2, rank: 11, credits: 2000, effect: '', salvage: [{ slug: 'volatile-compounds', amount: 6 }, { slug: 'surveillance-lens', amount: 16 }] },
        ],
      },
    ],
    capstones: [
      { rank: 1, nodesRequired: 5, name: 'Capstone I', reward: 'Castling — Rook will now start runs with a stack of Claymores. MIDA will now barter their wares for certain Deluxe Salvage.' },
      { rank: 2, nodesRequired: 10, name: 'Capstone II', reward: 'Treasure Hunter — Increases rep gain from MIDA Treasures +20%' },
      { rank: 3, nodesRequired: 15, name: 'Capstone III', reward: 'Unlocks Enhanced MIDA Sponsorship Kits for purchase. MIDA will now also barter wares for certain Superior Salvage.' },
      { rank: 4, nodesRequired: 20, name: 'Capstone IV', reward: 'Bonus Equipment — MIDA standard contracts will now award at least a grenade or gadget' },
      { rank: 5, nodesRequired: 25, name: 'Capstone V', reward: 'Dome Up — Unlocks Bubble Shields for purchase in the Armory' },
      { rank: 6, nodesRequired: 29, name: 'Capstone VI', reward: 'Steady Hand.exe — Allows you to disarm Claymore mines. MIDA will now barter their wares for certain Prestige Salvage.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // ARACHNE
  // ═══════════════════════════════════════════════════════════════════
  arachne: {
    name: 'Arachne',
    color: '#e40b0d',
    agent: 'Charter',
    materials: [
      { slug: 'unstable-gel',            name: 'Unstable Gel',            icon: 'https://items.marathondb.gg/images/items/unstable-gel.webp' },
      { slug: 'drone-resin',             name: 'Drone Resin',             icon: 'https://items.marathondb.gg/images/items/drone-resin.webp' },
      { slug: 'drone-node',              name: 'Drone Node',              icon: 'https://items.marathondb.gg/images/items/drone-node.webp' },
      { slug: 'biomata-resin',           name: 'Biomata Resin',           icon: 'https://items.marathondb.gg/images/items/biomata-resin.webp' },
      { slug: 'enzyme-replicator',       name: 'Enzyme Replicator',       icon: 'https://items.marathondb.gg/images/items/enzyme-replicator.webp' },
      { slug: 'biomata-node',            name: 'Biomata Node',            icon: 'https://items.marathondb.gg/images/items/biomata-node.webp' },
      { slug: 'reflex-coil',             name: 'Reflex Coil',             icon: 'https://items.marathondb.gg/images/items/reflex-coil.webp' },
      { slug: 'synapse-cube',            name: 'Synapse Cube',            icon: 'https://items.marathondb.gg/images/items/synapse-cube.webp' },
      { slug: 'hazard-capsule',          name: 'Hazard Capsule',          icon: 'https://items.marathondb.gg/images/items/hazard-capsule.webp' },
    ],
    upgrades: [
      // ── Stat ──
      {
        slug: 'arach-hard-strike-exe',
        name: 'Hard Strike.exe',
        category: 'stat',
        description: 'Melee Damage increases the damage of your melee and knife attacks.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 5, credits: 1500, effect: 'Melee Damage +20', salvage: [{ slug: 'drone-resin', amount: 7 }, { slug: 'unstable-gel', amount: 6 }] },
          { level: 2, rank: 16, credits: 2000, effect: 'Melee Damage +20', salvage: [{ slug: 'biomata-resin', amount: 8 }, { slug: 'drone-node', amount: 22 }] },
          { level: 3, rank: 22, credits: 3500, effect: 'Melee Damage +20', salvage: [{ slug: 'reflex-coil', amount: 6 }, { slug: 'biomata-node', amount: 6 }] },
        ],
      },
      {
        slug: 'arach-cutthroat',
        name: 'Cutthroat',
        category: 'stat',
        description: 'Finisher Siphon increases the amount your shields recharge after you perform a finisher on a runner.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 6, credits: 750, effect: 'Finisher Siphon +20', salvage: [{ slug: 'unstable-gel', amount: 16 }] },
          { level: 2, rank: 18, credits: 2000, effect: 'Finisher Siphon +20', salvage: [{ slug: 'biomata-resin', amount: 12 }, { slug: 'biomata-node', amount: 4 }] },
          { level: 3, rank: 25, credits: 3500, effect: 'Finisher Siphon +20', salvage: [{ slug: 'reflex-coil', amount: 7 }, { slug: 'enzyme-replicator', amount: 3 }] },
        ],
      },
      // ── Armory ──
      {
        slug: 'arach-knife-fight',
        name: 'Knife Fight',
        category: 'armory',
        description: 'Unlocks Knife Fight V2 implant for purchase in the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 4, credits: 750, effect: '', salvage: [{ slug: 'unstable-gel', amount: 13 }] },
          { level: 2, rank: 11, credits: 1500, effect: '', salvage: [{ slug: 'drone-node', amount: 23 }, { slug: 'drone-resin', amount: 12 }] },
          { level: 3, rank: 24, credits: 3500, effect: '', salvage: [{ slug: 'enzyme-replicator', amount: 9 }, { slug: 'reflex-coil', amount: 3 }] },
        ],
      },
      {
        slug: 'arach-hurting-hands',
        name: 'Hurting Hands',
        category: 'armory',
        description: 'Unlocks Hurting Hands V2 implant for purchase in the Armory',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: '', salvage: [{ slug: 'unstable-gel', amount: 10 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'drone-node', amount: 19 }, { slug: 'drone-resin', amount: 9 }] },
          { level: 3, rank: 23, credits: 3500, effect: '', salvage: [{ slug: 'enzyme-replicator', amount: 7 }, { slug: 'reflex-coil', amount: 3 }] },
        ],
      },
      // ── Stat ──
      {
        slug: 'arach-reboot',
        name: 'Reboot',
        category: 'stat',
        description: 'Revive speed increases how quickly you can self revive or revive downed crew members',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 7, credits: 1500, effect: 'Revive speed +20', salvage: [{ slug: 'drone-resin', amount: 19 }, { slug: 'unstable-gel', amount: 17 }] },
          { level: 2, rank: 19, credits: 3500, effect: 'Revive speed +20', salvage: [{ slug: 'reflex-coil', amount: 5 }, { slug: 'biomata-node', amount: 5 }] },
          { level: 3, rank: 27, credits: 5000, effect: 'Revive speed +20', salvage: [{ slug: 'synapse-cube', amount: 2 }, { slug: 'biomata-resin', amount: 9 }] },
        ],
      },
      // ── Function ──
      {
        slug: 'arach-leech',
        name: 'Leech',
        category: 'function',
        description: 'Knife attacks restore a small amount of health',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 28, credits: 5000, effect: '', salvage: [{ slug: 'synapse-cube', amount: 2 }] },
        ],
      },
      {
        slug: 'arach-heat-death',
        name: 'Heat Death',
        category: 'function',
        description: 'Eliminating a hostile reduces your heat buildup.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 'VIP', credits: 5000, effect: '', salvage: [{ slug: 'hazard-capsule', amount: 2 }, { slug: 'enzyme-replicator', amount: 11 }] },
        ],
      },
      // ── Armory ──
      {
        slug: 'arach-lmg-mods',
        name: 'LMG Mods',
        category: 'armory',
        description: 'Unlocks a set of Enhanced LMG mods from the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: '', salvage: [{ slug: 'unstable-gel', amount: 13 }] },
        ],
      },
      {
        slug: 'arach-shotgun-mods',
        name: 'Shotgun Mods',
        category: 'armory',
        description: 'Unlocks a set of enhanced shotgun  mods from the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 3, credits: 750, effect: '', salvage: [{ slug: 'unstable-gel', amount: 19 }] },
        ],
      },
      {
        slug: 'arach-railgun-mods',
        name: 'Railgun Mods',
        category: 'armory',
        description: 'Unlocks a set of Enhanced railgun mods from the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 4, credits: 1500, effect: '', salvage: [{ slug: 'drone-resin', amount: 8 }, { slug: 'unstable-gel', amount: 9 }] },
        ],
      },
      {
        slug: 'arach-mips-railgun',
        name: 'MIPS Railgun',
        category: 'armory',
        description: 'Unlocks the ARES RG for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 2, credits: 750, effect: '', salvage: [{ slug: 'unstable-gel', amount: 13 }] },
        ],
      },
      {
        slug: 'arach-mips-shotgun',
        name: 'MIPS Shotgun',
        category: 'armory',
        description: 'Unlocks the WSTR Combat Shotgun for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 7, credits: 1500, effect: '', salvage: [{ slug: 'drone-node', amount: 7 }, { slug: 'unstable-gel', amount: 8 }] },
        ],
      },
      {
        slug: 'arach-enhanced-retaliator-lmg',
        name: 'Enhanced Retaliator LMG',
        category: 'armory',
        description: 'Unlocks the Enhanced, Retaliator LMG for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'biomata-node', amount: 4 }, { slug: 'drone-resin', amount: 11 }] },
        ],
      },
      {
        slug: 'arach-enhanced-mips-shotgun',
        name: 'Enhanced MIPS Shotgun',
        category: 'armory',
        description: 'Unlocks the Enhanced WSTR Combat Shotgun for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 13, credits: 2000, effect: '', salvage: [{ slug: 'biomata-node', amount: 6 }, { slug: 'drone-resin', amount: 18 }] },
        ],
      },
      {
        slug: 'arach-enhanced-mips-railgun',
        name: 'Enhanced MIPS Railgun',
        category: 'armory',
        description: 'Unlocks the Enhanced, ARES RG for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 15, credits: 2000, effect: '', salvage: [{ slug: 'biomata-resin', amount: 12 }, { slug: 'biomata-resin', amount: 4 }] },
        ],
      },
      {
        slug: 'arach-deluxe-retaliator-lmg',
        name: 'Deluxe Retaliator LMG',
        category: 'armory',
        description: 'Unlocks the Deluxe, Retaliator LMG for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 20, credits: 3500, effect: '', salvage: [{ slug: 'enzyme-replicator', amount: 9 }, { slug: 'reflex-coil', amount: 3 }] },
        ],
      },
      {
        slug: 'arach-deluxe-mips-shotgun',
        name: 'Deluxe MIPS Shotgun',
        category: 'armory',
        description: 'Unlocks the Enhanced WSTR Combat Shotgun for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 23, credits: 5000, effect: '', salvage: [{ slug: 'synapse-cube', amount: 2 }, { slug: 'biomata-resin', amount: 9 }] },
        ],
      },
      {
        slug: 'arach-deluxe-mips-railgun',
        name: 'Deluxe MIPS Railgun',
        category: 'armory',
        description: 'Unlocks the Deluxe ARES RG for purchase in the Armory',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 25, credits: 5000, effect: '', salvage: [{ slug: 'hazard-capsule', amount: 2 }, { slug: 'enzyme-replicator', amount: 7 }] },
        ],
      },
    ],
    capstones: [
      { rank: 1, nodesRequired: 5, name: 'Capstone I', reward: 'Boosted — Rook will now start runs with implants. Arachne will now barter their wares for certain Deluxe Salvage.' },
      { rank: 2, nodesRequired: 10, name: 'Capstone II', reward: 'Treasure Hunter — Increases faction rep gain from Arachne Treasures. Arachne Treasure Reputation +20%' },
      { rank: 3, nodesRequired: 15, name: 'Capstone III', reward: 'Unlocks Enhanced Arachne Sponsorship Kits for purchase. Arachne will now also barter wares for certain Superior Salvage.' },
      { rank: 4, nodesRequired: 20, name: 'Capstone IV', reward: 'Boomstick — Rook will now start runs with a WSTR Combat Shotgun and MIPS Rounds' },
      { rank: 5, nodesRequired: 25, name: 'Capstone V', reward: 'Factory Reset.exe — Reviving a crew member grants healing over time. The healing is interrupted upon taking damage.' },
      { rank: 6, nodesRequired: 28, name: 'Capstone VI', reward: 'Superior Armament — Unlocks Superior Retaliator LMG, WSTR Combat Shotgun, and ARES RG for purchase in the Armory. Arachne will now barter their wares for certain Prestige Salvage.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SEKIGUCHI
  // ═══════════════════════════════════════════════════════════════════
  sekiguchi: {
    name: 'Sekiguchi',
    color: '#73f2c9',
    agent: 'Nona',
    materials: [
      { slug: 'unstable-diode',          name: 'Unstable Diode',          icon: 'https://items.marathondb.gg/images/items/unstable-diode.webp' },
      { slug: 'fractal-circuit',         name: 'Fractal Circuit',         icon: 'https://items.marathondb.gg/images/items/fractal-circuit.webp' },
      { slug: 'storage-drive',           name: 'Storage Drive',           icon: 'https://items.marathondb.gg/images/items/storage-drive.webp' },
      { slug: 'amygdala-drive',          name: 'Amygdala Drive',          icon: 'https://items.marathondb.gg/images/items/amygdala-drive.webp' },
      { slug: 'neural-insulation',       name: 'Neural Insulation',       icon: 'https://items.marathondb.gg/images/items/neural-insulation.webp' },
      { slug: 'paradox-circuit',         name: 'Paradox Circuit',         icon: 'https://items.marathondb.gg/images/items/paradox-circuit.webp' },
      { slug: 'predictive-framework',    name: 'Predictive Framework',    icon: 'https://items.marathondb.gg/images/items/predictive-framework.webp' },
      { slug: 'synapse-cube',            name: 'Synapse Cube',            icon: 'https://items.marathondb.gg/images/items/synapse-cube.webp' },
      { slug: 'alien-alloy',             name: 'Alien Alloy',             icon: 'https://items.marathondb.gg/images/items/alien-alloy.webp' },
    ],
    upgrades: [
      // ── Stat ──
      {
        slug: 'sek-tac-amp-exe',
        name: 'Tac Amp.exe',
        category: 'stat',
        description: 'Tactical Recovery reduces the cooldown of your tactical and trait abilities.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 2, credits: 750, effect: 'Tactical Recovery +30', salvage: [{ slug: 'unstable-diode', amount: 16 }] },
          { level: 2, rank: 14, credits: 2000, effect: 'Tactical Recovery +30', salvage: [{ slug: 'paradox-circuit', amount: 8 }, { slug: 'storage-drive', amount: 30 }] },
        ],
      },
      {
        slug: 'sek-prime-amp',
        name: 'Prime Amp',
        category: 'stat',
        description: 'Prime Recovery reduces the cooldown of your prime ability.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 24, credits: 5000, effect: 'Prime Recovery +30', salvage: [{ slug: 'synapse-cube', amount: 2 }] },
        ],
      },
      // ── Function ──
      {
        slug: 'sek-lethal-amp-exe',
        name: 'Lethal Amp.EXE',
        category: 'function',
        description: 'Downing a Runner grants you tactical ability energy. Eliminating a Runner grants you prime ability energy.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 25, credits: 3500, effect: '', salvage: [{ slug: 'predictive-framework', amount: 7 }, { slug: 'neural-insulation', amount: 3 }] },
        ],
      },
      // ── Armory ──
      {
        slug: 'sek-energy-amp',
        name: 'Energy Amp',
        category: 'armory',
        description: 'Unlocks Energy Amps for purchase in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 1, credits: 750, effect: '', salvage: [{ slug: 'unstable-diode', amount: 10 }] },
        ],
      },
      {
        slug: 'sek-amped',
        name: 'Amped',
        category: 'armory',
        description: 'Unlocks daily free Energy Amps in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 10, credits: 1500, effect: 'Free Daily Energy Amps in the Armory', salvage: [{ slug: 'fractal-circuit', amount: 23 }, { slug: 'storage-drive', amount: 9 }] },
        ],
      },
      {
        slug: 'sek-amp-stock',
        name: 'Amp Stock',
        category: 'armory',
        description: 'Increases available stock of Energy Amps in the Armory.',
        maxLevel: 1,
        levels: [
          { level: 1, rank: 21, credits: 2000, effect: '', salvage: [{ slug: 'paradox-circuit', amount: 12 }, { slug: 'amygdala-drive', amount: 5 }] },
        ],
      },
      // ── Stat ──
      {
        slug: 'sek-scab-factory',
        name: 'Scab Factory',
        category: 'stat',
        description: 'Increases the time it takes to bleed out when downed.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 13, credits: 2000, effect: 'DBNO Time +30 seconds', salvage: [{ slug: 'amygdala-drive', amount: 7 }, { slug: 'fractal-circuit', amount: 20 }] },
          { level: 2, rank: 23, credits: 3500, effect: 'DBNO Time +30 seconds', salvage: [{ slug: 'predictive-framework', amount: 9 }, { slug: 'neural-insulation', amount: 3 }] },
        ],
      },
      // ── Function ──
      {
        slug: 'sek-head-start',
        name: 'Head Start',
        category: 'function',
        description: 'Partially fills your tactical ability charge at the start of a run.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 4, credits: 1500, effect: '', salvage: [{ slug: 'storage-drive', amount: 10 }, { slug: 'unstable-diode', amount: 10 }] },
          { level: 2, rank: 14, credits: 2000, effect: '', salvage: [{ slug: 'amygdala-drive', amount: 7 }, { slug: 'fractal-circuit', amount: 20 }] },
        ],
      },
      {
        slug: 'sek-primed-exe',
        name: 'Primed.EXE',
        category: 'function',
        description: 'Partially fills your prime ability charge at the start of a run.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 26, credits: 5000, effect: '', salvage: [{ slug: 'alien-alloy', amount: 2 }, { slug: 'neural-insulation', amount: 7 }] },
          { level: 2, rank: 'VIP', credits: 5000, effect: '', salvage: [{ slug: 'alien-alloy', amount: 3 }, { slug: 'neural-insulation', amount: 11 }] },
        ],
      },
      // ── Armory ──
      {
        slug: 'sek-capacitors',
        name: 'Capacitors',
        category: 'armory',
        description: 'Unlocks Augmented Capacitors V2 implant for purchase in the Armory.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 5, credits: 1500, effect: '', salvage: [{ slug: 'storage-drive', amount: 10 }, { slug: 'unstable-diode', amount: 10 }] },
          { level: 2, rank: 11, credits: 1500, effect: '', salvage: [{ slug: 'amygdala-drive', amount: 8 }, { slug: 'fractal-circuit', amount: 13 }] },
          { level: 3, rank: 24, credits: 1500, effect: '', salvage: [{ slug: 'predictive-framework', amount: 9 }, { slug: 'neural-insulation', amount: 3 }] },
        ],
      },
      {
        slug: 'sek-harvester',
        name: 'Harvester',
        category: 'armory',
        description: 'Unlocks Energy Harvesting V2 implant for purchase in the Armory.',
        maxLevel: 3,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'fractal-circuit', amount: 7 }, { slug: 'unstable-diode', amount: 6 }] },
          { level: 2, rank: 9, credits: 2000, effect: '', salvage: [{ slug: 'fractal-circuit', amount: 23 }, { slug: 'storage-drive', amount: 9 }] },
          { level: 3, rank: 23, credits: 3500, effect: '', salvage: [{ slug: 'neural-insulation', amount: 7 }, { slug: 'predictive-framework', amount: 3 }] },
        ],
      },
      {
        slug: 'sek-triage',
        name: 'Triage',
        category: 'armory',
        description: 'Unlocks 2 Enhanced cores for Triage in the Armory',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'storage-drive', amount: 8 }, { slug: 'unstable-diode', amount: 9 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'amygdala-drive', amount: 4 }, { slug: 'fractal-circuit', amount: 8 }] },
        ],
      },
      {
        slug: 'sek-destroyer',
        name: 'Destroyer',
        category: 'armory',
        description: 'Unlocks 2 Enhanced cores for Destroyer in the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'fractal-circuit', amount: 8 }, { slug: 'unstable-diode', amount: 9 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'paradox-circuit', amount: 4 }, { slug: 'storage-drive', amount: 8 }] },
        ],
      },
      {
        slug: 'sek-assassin',
        name: 'Assassin',
        category: 'armory',
        description: 'Unlocks 2 Enhanced cores for Assassin in the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'storage-drive', amount: 8 }, { slug: 'unstable-diode', amount: 9 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'amygdala-drive', amount: 4 }, { slug: 'fractal-circuit', amount: 8 }] },
        ],
      },
      {
        slug: 'sek-vandal',
        name: 'Vandal',
        category: 'armory',
        description: 'Unlocks 2 Enhanced cores for Vandal in the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'fractal-circuit', amount: 8 }, { slug: 'unstable-diode', amount: 9 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'paradox-circuit', amount: 4 }, { slug: 'storage-drive', amount: 8 }] },
        ],
      },
      {
        slug: 'sek-recon',
        name: 'Recon',
        category: 'armory',
        description: 'Unlocks 2 Enhanced cores for Recon in the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'storage-drive', amount: 8 }, { slug: 'unstable-diode', amount: 9 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'amygdala-drive', amount: 4 }, { slug: 'fractal-circuit', amount: 8 }] },
        ],
      },
      {
        slug: 'sek-thief',
        name: 'Thief',
        category: 'armory',
        description: 'Unlocks 2 Enhanced cores for Thief in the Armory.',
        maxLevel: 2,
        levels: [
          { level: 1, rank: 3, credits: 1500, effect: '', salvage: [{ slug: 'fractal-circuit', amount: 8 }, { slug: 'unstable-diode', amount: 9 }] },
          { level: 2, rank: 10, credits: 1500, effect: '', salvage: [{ slug: 'paradox-circuit', amount: 4 }, { slug: 'storage-drive', amount: 8 }] },
        ],
      },
    ],
    capstones: [
      { rank: 1, nodesRequired: 5, name: 'Capstone I', reward: 'Specialized — Rook will now start runs with Runner Cores. Sekiguchi will now barter their wares for certain Deluxe Salvage.' },
      { rank: 2, nodesRequired: 10, name: 'Capstone II', reward: 'Treasure Hunter — Increases faction rep gained from Sekiguchi Treasures by 20%' },
      { rank: 3, nodesRequired: 15, name: 'Capstone III', reward: 'Unlocks Enhanced Sekiguchi Sponsorship Kits for purchase. Sekiguchi will now also barter wares for certain Superior Salvage.' },
      { rank: 4, nodesRequired: 20, name: 'Capstone IV', reward: 'Commission — Sekiguchi standard contracts will now award cores in addition to other rewards' },
      { rank: 5, nodesRequired: 25, name: 'Capstone V', reward: 'Quiet Exit.exe — Rook gains the effects of Signal Mask after activating an exfil' },
      { rank: 6, nodesRequired: 32, name: 'Capstone VI', reward: 'Core All — Unlocks Superior Cores for each runner in the Armory. Sekiguchi will now barter their wares for certain Prestige Salvage.' },
    ],
  },
};

// Make available globally
if (typeof window !== 'undefined') window.FACTION_UPGRADES = FACTION_UPGRADES;
