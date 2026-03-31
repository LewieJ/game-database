// Faction Contract Definitions — Static data for the contract completion checklist
// Data sourced from Marathon Contracts API (D1) seed data, Mar 2026.
//
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  HOW TO ADD NEW CONTRACTS                                          ║
// ║                                                                    ║
// ║  1. Add a new object to the faction's `contracts` array below.     ║
// ║  2. Each contract needs at minimum: slug, name, type, steps[].     ║
// ║  3. The slug must be lowercase a-z, 0-9, hyphens only.            ║
// ║  4. The slug must match what gets stored in the backend DB.        ║
// ║  5. Deploy — that's it. No backend changes needed for new data.   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const FACTION_CONTRACTS = {

  // ═══════════════════════════════════════════════════════════════════
  // CYBERACME
  // ═══════════════════════════════════════════════════════════════════
  cyberacme: {
    name: 'CyberAcme',
    color: '#01d838',
    contracts: [
      // ── Liaison ──
      { slug: 'introducing-nucaloric', name: 'Introducing: NuCaloric', type: 'liaison', reputation: 270, map: 'Perimeter', scope: 'single_run', repeatable: false,
        description: 'In Perimeter, retrieve a NuCal ID from a tick-infested building, download employee data, then deliver the ID.',
        steps: [{ name: 'Locate NuCal Employee ID', count: 1 }, { name: 'Download employee data from terminal', count: 1 }, { name: 'Deliver ID to DCON', count: 1 }] },
      { slug: 'introducing-traxus', name: 'Introducing: Traxus', type: 'liaison', reputation: 270, map: 'Perimeter', scope: 'single_run', repeatable: false,
        description: 'In Dire Marsh, hack a UESC terminal, defeat the Commander for their shipping manifest, then scan the container.',
        steps: [{ name: 'Hack terminal at Intersection, Complex, or Bio-Research', count: 1 }, { name: 'Acquire Shipping Manifest from UESC Commander', count: 1 }, { name: 'Scan the nearby stacked shipping container', count: 1 }] },
      { slug: 'introducing-mida', name: 'Introducing: MIDA', type: 'liaison', reputation: 180, map: 'All Maps', scope: 'single_run', repeatable: false,
        description: 'Across Tau Ceti IV, defeat UESC combat units and smash glass in buildings.',
        steps: [{ name: 'Defeat UESC across Tau Ceti IV', count: 15 }, { name: 'Smash glass across Tau Ceti IV', count: 20 }] },
      { slug: 'introducing-arachne', name: 'Introducing: Arachne', type: 'liaison', reputation: 150, map: 'All Maps', scope: 'single_run', repeatable: false,
        description: 'In any zone, deal damage to enemy Runners and successfully down an enemy Runner.',
        steps: [{ name: 'Deal damage to enemy Runners', count: 60 }, { name: 'Down an enemy Runner', count: 1 }] },
      { slug: 'introducing-sekiguchi', name: 'Introducing: Sekiguchi', type: 'liaison', reputation: 60, map: 'Outpost', scope: 'single_run', repeatable: false,
        description: 'In Outpost, inject a Necrotic Sample in Flight Control and scan your shell in Orientation.',
        steps: [{ name: 'Inject Necrotic Sample in southern Flight Control', count: 1 }, { name: 'Scan your shell in southeastern Orientation', count: 1 }] },
      // ── Priority ──
      { slug: 'welcome-to-tau-ceti-1', name: 'Welcome to Tau Ceti [1/2]', type: 'priority', reputation: 300, map: 'Perimeter', scope: 'cumulative', repeatable: true, chain: 'welcome-to-tau-ceti', chainPos: 1, chainTotal: 2,
        description: 'In Perimeter, defeat UESC combat units, then scan an FTL array at any of the UESC radio towers.',
        steps: [{ name: 'Defeat UESC in Perimeter', count: 3 }, { name: 'Scan FTL array at any UESC radio tower', count: 1 }] },
      { slug: 'return-on-investment', name: 'Return on Investment', type: 'priority', reputation: 300, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Extract with valuable salvage items across New Cascadia.',
        steps: [{ name: 'Exfil Frags', count: 1 }, { name: 'Exfil Claymores', count: 1 }] },
      // ── Standard ──
      { slug: 'instant-transfer', name: 'Instant Transfer', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Data cards can be found all over New Cascadia. When found, they immediately transfer credits to your account.',
        steps: [{ name: 'Find data cards', count: 2 }] },
      { slug: 'target-acquired', name: 'Target Acquired', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Activate a Target Acquisition Device (TAD) and use it to eliminate UESC.',
        steps: [{ name: 'Activate a Target Acquisition Device (TAD)', count: 1 }, { name: 'Eliminate UESC', count: 10 }] },
      { slug: 'cant-adapt-cant-fight', name: "A Runner Can't Adapt; They Can't Fight", type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Loot tool carts and use utility or survivability consumables.',
        steps: [{ name: 'Loot tool carts', count: 1 }, { name: 'Use utility or survivability consumables', count: 10 }] },
      { slug: 'prime-time', name: 'Prime Time', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Use your prime ability and eliminate hostiles, especially Runners.',
        steps: [{ name: 'Use prime ability', count: 1 }, { name: 'Eliminate hostiles [Runners++]', count: 5 }] },
      { slug: 'big-robot-still-robot', name: 'Big Robot? Still Robot', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Defeat UESC Commanders, identifiable by their white frames.',
        steps: [{ name: 'Defeat UESC Commanders', count: 1 }] },
      { slug: 'shell-games-1', name: 'Shell Games I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Use your tactical ability and defeat hostiles, especially Runners.',
        steps: [{ name: 'Use tactical ability', count: 2 }, { name: 'Defeat hostiles [Runners++]', count: 5 }] },
      { slug: 'no-weapon-cant-fight-1', name: "No Weapon: Can't Fight I", type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Loot Arms Lockers and defeat hostiles with weapons.',
        steps: [{ name: 'Loot Arms Lockers', count: 1 }, { name: 'Defeat hostiles with a weapon', count: 5 }] },
      { slug: 'build-meets-craft-1', name: 'Build Meets Craft I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Loot Core Storage containers and Bioprinters.',
        steps: [{ name: 'Loot Core Storage containers', count: 1 }, { name: 'Loot Bioprinters', count: 1 }] },
      { slug: 'cant-survive-cant-fight-1', name: "Can't Survive: Can't Fight I", type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Use health, cleanse, or buff consumables.',
        steps: [{ name: 'Use health, cleanse, or buff consumables', count: 3 }] },
      { slug: 'instant-transfer-1', name: 'Instant Transfer I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Find data cards across all zones.',
        steps: [{ name: 'Find data cards', count: 2 }] },
      { slug: 'emergent-opportunities-1', name: 'Emergent Opportunities I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Activate a TAD and defeat UESC.',
        steps: [{ name: 'Activate a Target Acquisition Device (TAD)', count: 1 }, { name: 'Defeat UESC', count: 10 }] },
      { slug: 'trash-to-treasure-1', name: 'Trash to Treasure I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfil Valuables. Gain more progress for Valuables with a CyAc icon.',
        steps: [{ name: 'Exfil Valuables [CyAc treasures++]', count: 6 }] },
      { slug: 'deconstructed-1', name: 'Deconstructed I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Salvage to DCON for analysis.',
        steps: [{ name: 'Deliver Salvage to DCON', count: 8 }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // NUCALORIC
  // ═══════════════════════════════════════════════════════════════════
  nucaloric: {
    name: 'NuCaloric',
    color: '#ff125d',
    contracts: [
      // ── Priority ──
      { slug: 'survival-directive', name: 'Survival Directive', type: 'priority', reputation: 300, map: 'Perimeter', scope: 'cumulative', repeatable: true,
        description: 'Download geological survey and botany report data.',
        steps: [{ name: 'Download Geo Survey data', count: 1 }, { name: 'Download Botany Report data', count: 1 }] },
      { slug: 'data-reconstruction-1', name: 'Data Reconstruction [1/3]', type: 'priority', reputation: 450, map: 'Perimeter', scope: 'single_run', repeatable: true, chain: 'data-reconstruction', chainPos: 1, chainTotal: 3,
        description: 'Scan Sparkleaf and Fungal Bioprinters, then download the Agriculture Report.',
        steps: [{ name: 'Scan Sparkleaf Bioprinters', count: 2 }, { name: 'Scan Fungal Bioprinters', count: 2 }, { name: 'Download Agriculture Report', count: 1 }] },
      // ── Standard ──
      { slug: 'data-mapping', name: 'Data Mapping', type: 'standard', reputation: 120, map: 'Dire Marsh', scope: 'cumulative', repeatable: true,
        description: 'Find data cards in Dire Marsh, including one from Uplink.',
        steps: [{ name: 'Find data cards', count: 2 }, { name: 'Find data card in Uplink', count: 1 }] },
      { slug: 'one-thousand-slimy-things-1', name: 'One Thousand Thousand Slimy Things I', type: 'standard', reputation: 80, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Destroy tick nests and exfiltrate chitin samples.',
        steps: [{ name: 'Destroy Tick Nests', count: 2 }, { name: 'Exfil Chitin Samples', count: 3 }] },
      { slug: 'ecological-niche', name: 'Ecological Niche', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Destroy tick nests and collect chitin samples.',
        steps: [{ name: 'Destroy Tick Nests', count: 2 }, { name: 'Exfil Chitin Samples', count: 3 }] },
      { slug: 'assault-with-battery', name: 'Assault With Battery', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Use Volt batteries to defeat enemies and eliminate UESC.',
        steps: [{ name: 'Volt Battery kills', count: 5 }, { name: 'Defeat UESC', count: 20 }] },
      { slug: 'chemical-peel', name: 'Chemical Peel', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deal damage with Chem Grenades and eliminate hostiles.',
        steps: [{ name: 'Chem Grenade damage', count: 50 }, { name: 'Eliminate hostiles', count: 5 }] },
      { slug: 'youre-rubber-im-glue', name: "You're Rubber, I'm Glue", type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver biomass salvage to DCON and loot NuCal containers.',
        steps: [{ name: 'DCON Biomass Salvage', count: 4 }, { name: 'Loot NuCal Containers', count: 10 }] },
      { slug: 'growth-mindset-1', name: 'Growth Mindset I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfiltrate plant salvage materials.',
        steps: [{ name: 'Exfil Plant Salvage', count: 4 }] },
      { slug: 'sterile-environment-1', name: 'Sterile Environment I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Defeat UESC forces.',
        steps: [{ name: 'Defeat UESC', count: 10 }] },
      { slug: 'contained-analysis-1', name: 'Contained Analysis I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Loot containers and deliver implants to DCON.',
        steps: [{ name: 'Loot Containers', count: 10 }, { name: 'DCON Implants', count: 5 }] },
      { slug: 'planted-evidence-1', name: 'Planted Evidence I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver plant salvage and loot NuCaloric containers.',
        steps: [{ name: 'Deliver Plant Salvage', count: 4 }, { name: 'Loot NuCal Containers', count: 10 }] },
      { slug: 'nano-metrics-1', name: 'Nano Metrics I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Unstable Biomass and loot NuCaloric containers.',
        steps: [{ name: 'Deliver Unstable Biomass', count: 4 }, { name: 'Loot NuCal Containers', count: 10 }] },
      { slug: 'shelf-stable-1', name: 'Shelf-Stable I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfiltrate valuable items.',
        steps: [{ name: 'Exfil Valuables', count: 6 }] },
      { slug: 'assault-with-battery-1', name: 'Assault With Battery I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Use Volt batteries and defeat UESC Recruits.',
        steps: [{ name: 'Volt Battery kills', count: 5 }, { name: 'Defeat UESC Recruits', count: 5 }] },
      { slug: 'compound-solutions-1', name: 'Compound Solutions I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Biostrip Salvage and loot NuCaloric containers.',
        steps: [{ name: 'Deliver Biostrip Salvage', count: 4 }, { name: 'Loot NuCal Containers', count: 10 }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TRAXUS
  // ═══════════════════════════════════════════════════════════════════
  traxus: {
    name: 'Traxus',
    color: '#ff7300',
    contracts: [
      // ── Priority ──
      { slug: 'cutthroat-competition', name: 'Cutthroat Competition', type: 'priority', reputation: 150, map: 'Dire Marsh', scope: 'single_run', repeatable: true,
        description: 'Loot Deimosite Rods from Field Maintenance crates in Dire Marsh.',
        steps: [{ name: 'Loot Deimosite Rods', count: 2 }] },
      { slug: 'equitable-distribution-1', name: 'Equitable Distribution [1/4]', type: 'priority', reputation: 300, map: 'Perimeter', scope: 'single_run', repeatable: true, chain: 'equitable-distribution', chainPos: 1, chainTotal: 4,
        description: 'Acquire a Data Drive and deliver it to DCON.',
        steps: [{ name: 'Acquire Data Drive', count: 1 }, { name: 'Deliver to DCON', count: 1 }] },
      // ── Standard ──
      { slug: 'arms-dealer', name: 'Arms Dealer', type: 'standard', reputation: 120, map: 'Dire Marsh', scope: 'single_run', repeatable: true,
        description: 'Loot Arms Lockers and exfiltrate ballistic weapons.',
        steps: [{ name: 'Loot Arms Lockers', count: 2 }, { name: 'Exfil Ballistic Weapons', count: 2 }] },
      { slug: 'inventory-control-1', name: 'Inventory Control I', type: 'standard', reputation: 40, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Loot Traxus containers and deliver weapons or mods to DCON.',
        steps: [{ name: 'Loot Traxus Containers', count: 10 }, { name: 'DCON Weapons/Mods', count: 2 }] },
      { slug: 'field-testing-smgs-1', name: 'Field Testing: SMGs I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get kills with SMGs and survive encounters vs Runners.',
        steps: [{ name: 'SMG Kills', count: 6 }, { name: 'Survive vs Runners', count: 3 }] },
      { slug: 'raw-materials-1', name: 'Raw Materials I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Rod Salvage and loot Traxus containers.',
        steps: [{ name: 'Deliver Rod Salvage', count: 8 }, { name: 'Loot Traxus Containers', count: 10 }] },
      { slug: 'sustainable-reuse-1', name: 'Sustainable Reuse I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Filament Salvage and loot Traxus containers.',
        steps: [{ name: 'Deliver Filament Salvage', count: 8 }, { name: 'Loot Traxus Containers', count: 10 }] },
      { slug: 'field-testing-ar-1', name: 'Field Testing: Assault Rifles I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get kills with Assault Rifles and survive encounters vs Runners.',
        steps: [{ name: 'AR Kills', count: 10 }, { name: 'Survive vs Runners', count: 3 }] },
      { slug: 'field-testing-precision-1', name: 'Field Testing: Precision Rifle I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get precision kills and down Runners with precision shots.',
        steps: [{ name: 'Precision Kills', count: 6 }, { name: 'Down Runners with Precision', count: 2 }] },
      { slug: 'value-proposition-1', name: 'Value Proposition I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfiltrate valuable items.',
        steps: [{ name: 'Exfil Valuables', count: 6 }] },
      { slug: 'asset-recovery-1', name: 'Asset Recovery I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Wire Salvage and loot Traxus containers.',
        steps: [{ name: 'Deliver Wire Salvage', count: 8 }, { name: 'Loot Traxus Containers', count: 10 }] },
      { slug: 'targeted-strategy-1', name: 'Targeted Strategy I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Survive encounters with Runners and down them with precision.',
        steps: [{ name: 'Survive vs Runners', count: 3 }, { name: 'Down Runners with Precision', count: 1 }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MIDA
  // ═══════════════════════════════════════════════════════════════════
  mida: {
    name: 'MIDA',
    color: '#be72e4',
    contracts: [
      // ── Priority ──
      { slug: 'order-chaos', name: 'Order/Chaos', type: 'priority', reputation: 450, map: 'Dire Marsh', scope: 'single_run', repeatable: true,
        description: 'Trigger alarms, acquire credentials, and download classified data.',
        steps: [{ name: 'Trigger Alarms', count: 1 }, { name: 'Acquire Credentials', count: 1 }, { name: 'Download Classified Data', count: 1 }] },
      { slug: 'protect-destroy-1', name: 'Protect/Destroy [1/5]', type: 'priority', reputation: 450, map: 'Dire Marsh', scope: 'single_run', repeatable: true, chain: 'protect-destroy', chainPos: 1, chainTotal: 5,
        description: 'Destroy an Analyzer, acquire a Sample, and deliver it to DCON.',
        steps: [{ name: 'Destroy Analyzer', count: 1 }, { name: 'Acquire Sample', count: 1 }, { name: 'Deliver to DCON', count: 1 }] },
      { slug: 'truth-lies', name: 'Truth/Lies', type: 'priority', reputation: 450, map: 'Outpost', scope: 'single_run', repeatable: true,
        description: 'Acquire a Transponder, hack it, and upload malware to UESC terminals.',
        steps: [{ name: 'Acquire Transponder', count: 1 }, { name: 'Hack Transponder', count: 1 }, { name: 'Upload Malware', count: 2 }] },
      // ── Standard ──
      { slug: 'heads-tails', name: 'Heads/Tails', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Activate a Guarded Exfil and eliminate UESC Elites.',
        steps: [{ name: 'Activate Guarded Exfil', count: 1 }, { name: 'Eliminate UESC Elites', count: 20 }] },
      { slug: 'fire-fuel', name: 'Fire/Fuel', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Smash glass windows across buildings.',
        steps: [{ name: 'Break Windows', count: 5 }] },
      { slug: 'rip-tear', name: 'Rip/Tear', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get ballistic weapon kills and eliminate UESC.',
        steps: [{ name: 'Ballistic Kills', count: 8 }, { name: 'Eliminate UESC', count: 10 }] },
      { slug: 'blow-up', name: 'Blow/Up', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deal explosive damage and survive encounters with Runners.',
        steps: [{ name: 'Explosive Damage', count: 100 }, { name: 'Survive vs Runners', count: 3 }] },
      { slug: 'consume-control', name: 'Consume/Control', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate hostiles across New Cascadia.',
        steps: [{ name: 'Eliminate Hostiles', count: 5 }] },
      { slug: 'murder-take', name: 'Murder/Take', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate UESC and loot MIDA containers.',
        steps: [{ name: 'Eliminate UESC', count: 10 }, { name: 'Loot MIDA containers', count: 10 }] },
      { slug: 'smash-grab-1', name: 'Smash/Grab I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Smash glass windows.',
        steps: [{ name: 'Break Windows', count: 5 }] },
      { slug: 'us-them-1', name: 'Us/Them I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'single_run', repeatable: true,
        description: 'Survive encounters with enemy Runners.',
        steps: [{ name: 'Survive vs Runners', count: 3 }] },
      { slug: 'consume-control-1', name: 'Consume/Control I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Defeat UESC and loot MIDA containers.',
        steps: [{ name: 'Defeat UESC', count: 10 }, { name: 'Loot MIDA containers', count: 10 }] },
      { slug: 'stand-fight-1', name: 'Stand/Fight I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate hostiles.',
        steps: [{ name: 'Eliminate Hostiles', count: 5 }] },
      { slug: 'escape-defy-1', name: 'Escape/Defy I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Activate a Guarded Exfil and defeat UESC Elites.',
        steps: [{ name: 'Activate Guarded Exfil', count: 1 }, { name: 'Defeat UESC Elites', count: 20 }] },
      { slug: 'justice-revenge-1', name: 'Justice/Revenge I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get ballistic kills and defeat UESC.',
        steps: [{ name: 'Ballistic Kills', count: 8 }, { name: 'Defeat UESC', count: 10 }] },
      { slug: 'spark-ignite-1', name: 'Spark/Ignite I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get explosive kills and deliver Compound Salvage.',
        steps: [{ name: 'Explosive Kills', count: 2 }, { name: 'Deliver Compound Salvage', count: 4 }] },
      { slug: 'reclaim-resist-1', name: 'Reclaim/Resist I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Deliver Lens Salvage to DCON.',
        steps: [{ name: 'Deliver Lens Salvage', count: 4 }] },
      { slug: 'unlock-unleash-1', name: 'Unlock/Unleash I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Loot lockboxes across New Cascadia.',
        steps: [{ name: 'Loot Lockboxes', count: 1 }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // ARACHNE
  // ═══════════════════════════════════════════════════════════════════
  arachne: {
    name: 'Arachne',
    color: '#e40b0d',
    contracts: [
      // ── Priority ──
      { slug: 'arachne-priority-1', name: 'Finisher Protocol', type: 'priority', reputation: 150, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate downed enemy Runners.',
        steps: [{ name: 'Eliminate Downed Runners', count: 10 }] },
      // ── Standard ──
      { slug: 'best-in-class', name: 'Best in Class', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get machine gun kills and eliminate enemy Runners.',
        steps: [{ name: 'Machine Gun Kills', count: 6 }, { name: 'Eliminate Runners', count: 2 }] },
      { slug: 'climbing-the-ranks', name: 'Climbing the Ranks', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfiltrate salvage and loot Arachne containers.',
        steps: [{ name: 'Exfil Salvage', count: 6 }, { name: 'Loot Arachne containers', count: 10 }] },
      { slug: 'killing-in-the-name-of', name: 'Killing in the Name Of', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate hostiles and exfiltrate weapons or cores.',
        steps: [{ name: 'Eliminate Hostiles', count: 5 }, { name: 'Exfil Weapons/Cores', count: 2 }] },
      { slug: 'zero-sum-game', name: 'Zero Sum Game', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate enemy Runners and loot Arachne containers.',
        steps: [{ name: 'Eliminate Runners', count: 2 }, { name: 'Loot Arachne containers', count: 10 }] },
      { slug: 'exhumation-1', name: 'Exhumation I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfil Resin Salvage and loot Arachne containers.',
        steps: [{ name: 'Exfil Resin Salvage', count: 6 }, { name: 'Loot Arachne containers', count: 10 }] },
      { slug: 'colony-remains-1', name: 'Colony Remains I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Exfil Node Salvage and loot Arachne containers.',
        steps: [{ name: 'Exfil Node Salvage', count: 6 }, { name: 'Loot Arachne containers', count: 10 }] },
      { slug: 'fatal-instrument-1', name: 'Fatal Instrument I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate Runners without dying.',
        steps: [{ name: 'Eliminate Runners (No Death)', count: 2 }] },
      { slug: 'life-death-equation-1', name: 'Life-Death Equation I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'single_run', repeatable: true,
        description: 'Eliminate enemy Runners in a single run.',
        steps: [{ name: 'Eliminate Runners', count: 2 }] },
      { slug: 'spoils-of-war-1', name: 'Spoils of War I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Eliminate hostiles and exfiltrate weapons or cores.',
        steps: [{ name: 'Eliminate Hostiles', count: 5 }, { name: 'Exfil Weapons/Cores', count: 2 }] },
      { slug: 'brutal-hymn-1', name: 'Brutal Hymn I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get shotgun kills and eliminate enemy Runners.',
        steps: [{ name: 'Shotgun Kills', count: 5 }, { name: 'Eliminate Runners', count: 2 }] },
      { slug: 'ancient-relics-1', name: 'Ancient Relics I', type: 'standard', reputation: 60, map: 'All Maps', scope: 'single_run', repeatable: true,
        description: 'Exfiltrate valuables in a single run.',
        steps: [{ name: 'Exfil Valuables', count: 6 }] },
      { slug: 'technologies-of-violence-1', name: 'Technologies of Violence I', type: 'standard', reputation: 120, map: 'All Maps', scope: 'cumulative', repeatable: true,
        description: 'Get machine gun kills and eliminate enemy Runners.',
        steps: [{ name: 'Machine Gun Kills', count: 6 }, { name: 'Eliminate Runners', count: 2 }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SEKIGUCHI
  // ═══════════════════════════════════════════════════════════════════
  sekiguchi: {
    name: 'Sekiguchi',
    color: '#73f2c9',
    contracts: [
      // ── Priority ──
      { slug: 'sekiguchi-cutthroat-competition', name: 'Cutthroat Competition', type: 'priority', reputation: 300, map: 'Dire Marsh', scope: 'single_run', repeatable: true,
        description: 'Loot Deimosite Rods and exfiltrate successfully.',
        steps: [{ name: 'Loot Deimosite Rods', count: 2 }, { name: 'Exfil Successfully', count: 1 }] },
      // ── Standard ──
      { slug: 'friction-2', name: 'Friction II', type: 'standard', reputation: 180, map: 'All Maps', scope: 'single_run', repeatable: true,
        description: 'Get precision kills and exfiltrate items in a single run.',
        steps: [{ name: 'Precision Kills', count: 5 }, { name: 'Exfil Items', count: 5 }] },
    ],
  },
};

// Make available globally (used by profile page inline scripts)
window.FACTION_CONTRACTS = FACTION_CONTRACTS;
