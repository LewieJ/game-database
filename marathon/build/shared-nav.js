/**
 * Shared Navigation Component
 * 
 * Single source of truth for the desktop navbar used across all SSG scripts.
 * Matches the canonical navbar layout from index.html (homepage).
 * 
 * Usage:
 *   const { generateNavigation } = require('./shared-nav');
 *   const navHtml = generateNavigation('weapons');  // activeSection highlights current page
 * 
 * Valid activeSection values:
 *   weapons, runners, cores, implants, mods, items,
 *   cosmetics, weapon-skins, runner-skins, stickers, backgrounds, charms, emblems,
 *   factions, contracts, tier-lists, news, loadouts, servers
 */

function generateNavigation(activeSection = '') {
    const cosmeticsActive = ['cosmetics','weapon-skins','runner-skins','stickers','backgrounds','charms','emblems'].includes(activeSection);
    const factionsActive = ['factions','contracts'].includes(activeSection);
    const loadoutsActive = ['loadouts'].includes(activeSection);
    const dbActive = ['cores','implants','mods','items'].includes(activeSection);
    return `
    <!-- Navigation -->
    <nav class="navbar navbar--edge">
        <div class="nav-inner nav-inner--edge">
            <!-- Left: Logo + Action buttons -->
            <div class="nav-left">
                <a href="//marathon/" class="nav-logo">
                    <img src="//marathon/Icon.png" alt="MarathonDB" class="logo-icon" width="28" height="28">
                    <span>MARATHON<span class="logo-accent">DB</span></span>
                </a>
            </div>

            <!-- Center: Nav links -->
            <div class="nav-center">
                <a href="//marathon/weapons/" class="nav-link${activeSection === 'weapons' ? ' active' : ''}">Weapons</a>
                <a href="//marathon/runners/" class="nav-link${activeSection === 'runners' ? ' active' : ''}">Runners</a>
                <a href="//marathon/items/ranked-rewards/" class="nav-link nav-link--ranked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"//marathon/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"//marathon/><path d="M4 22h16"//marathon/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"//marathon/></svg>Ranked Rewards</a>

                <span class="nav-divider"></span>

                <!-- Database links (collapse to dropdown on narrow screens) -->
                <a href="//marathon/cores/" class="nav-link nav-db-link${activeSection === 'cores' ? ' active' : ''}">Cores</a>
                <a href="//marathon/implants/" class="nav-link nav-db-link${activeSection === 'implants' ? ' active' : ''}">Implants</a>
                <a href="//marathon/mods/" class="nav-link nav-db-link${activeSection === 'mods' ? ' active' : ''}">Mods</a>
                <a href="//marathon/items/" class="nav-link nav-db-link${activeSection === 'items' ? ' active' : ''}">Items</a>
                <div class="nav-dropdown nav-db-dropdown">
                    <button class="nav-dropdown-toggle${dbActive ? ' active' : ''}">
                        Database
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M6 9l6 6 6-6"//marathon/></svg>
                    </button>
                    <div class="nav-dropdown-menu">
                        <a href="//marathon/cores/" class="nav-dropdown-item${activeSection === 'cores' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"//marathon/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"//marathon/><path d="M2 12h20"//marathon/></svg>
                            Cores
                        </a>
                        <a href="/implants/" class="nav-dropdown-item${activeSection === 'implants' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"//marathon/><circle cx="9" cy="7" r="4"//marathon/><path d="M23 21v-2a4 4 0 0 0-3-3.87"//marathon/><path d="M16 3.13a4 4 0 0 1 0 7.75"//marathon/></svg>
                            Implants
                        </a>
                        <a href="/mods/" class="nav-dropdown-item${activeSection === 'mods' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 3v18"//marathon/><path d="M3 12h18"//marathon/></svg>
                            Mods
                        </a>
                        <a href="/items/" class="nav-dropdown-item${activeSection === 'items' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"//marathon/></svg>
                            Items
                        </a>
                    </div>
                </div>

                <span class="nav-divider"></span>

                <!-- Cosmetics dropdown -->
                <div class="nav-dropdown nav-dropdown--cosmetics">
                    <button class="nav-dropdown-toggle nav-dropdown-toggle--cosmetics${cosmeticsActive ? ' active' : ''}">
                        Cosmetics
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M6 9l6 6 6-6"//marathon/></svg>
                    </button>
                    <div class="nav-dropdown-menu">
                        <a href="//marathon/weapon-skins/" class="nav-dropdown-item${activeSection === 'weapon-skins' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"//marathon/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"//marathon/></svg>
                            Weapon Skins
                        </a>
                        <a href="/runner-skins/" class="nav-dropdown-item${activeSection === 'runner-skins' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"//marathon/><circle cx="12" cy="7" r="4"//marathon/></svg>
                            Runner Skins
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <a href="//marathon/stickers/" class="nav-dropdown-item${activeSection === 'stickers' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"//marathon/><path d="M15 3v6h6"//marathon/></svg>
                            Stickers
                        </a>
                        <a href="/backgrounds/" class="nav-dropdown-item${activeSection === 'backgrounds' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"//marathon/><circle cx="9" cy="9" r="2"//marathon/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"//marathon/></svg>
                            Backgrounds
                        </a>
                        <a href="/charms/" class="nav-dropdown-item${activeSection === 'charms' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 3h12l4 6-10 13L2 9Z"//marathon/><path d="M11 3l1 6h-9"//marathon/><path d="M13 3l-1 6h9"//marathon/></svg>
                            Charms
                        </a>
                        <a href="/emblems/" class="nav-dropdown-item${activeSection === 'emblems' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"//marathon/></svg>
                            Emblems
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <span class="nav-dropdown-label">Cross-Promotion</span>
                        <a href="//marathon/pages/cosmetics-destiny2" class="nav-dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"//marathon/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"//marathon/><path d="M2 12h20"//marathon/></svg>
                            Destiny 2 Items
                        </a>
                    </div>
                </div>

                <span class="nav-divider"></span>

                <!-- More dropdown -->
                <div class="nav-dropdown">
                    <button class="nav-dropdown-toggle">
                        More
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M6 9l6 6 6-6"//marathon/></svg>
                    </button>
                    <div class="nav-dropdown-menu">
                        <a href="//marathon/factions/" class="nav-dropdown-item${factionsActive ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"//marathon/><circle cx="9" cy="7" r="4"//marathon/><path d="M22 21v-2a4 4 0 0 0-3-3.87"//marathon/><path d="M16 3.13a4 4 0 0 1 0 7.75"//marathon/></svg>
                            Factions
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <a href="//marathon/loadout-builder/" class="nav-dropdown-item${loadoutsActive ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1"//marathon/><rect x="14" y="3" width="7" height="7" rx="1"//marathon/><rect x="3" y="14" width="7" height="7" rx="1"//marathon/><rect x="14" y="14" width="7" height="7" rx="1"//marathon/></svg>
                            Loadout Builder
                        </a>
                        <a href="/tier-lists/" class="nav-dropdown-item${activeSection === 'tier-lists' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 5h10"//marathon/><path d="M11 9h7"//marathon/><path d="M11 13h10"//marathon/><path d="M11 17h7"//marathon/><path d="M3 5l2 2 4-4"//marathon/><path d="M3 13l2 2 4-4"//marathon/></svg>
                            Tier Lists
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <a href="//marathon/news/" class="nav-dropdown-item${activeSection === 'news' ? ' active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"//marathon/><path d="M18 14h-8"//marathon/><path d="M15 18h-5"//marathon/><path d="M10 6h8v4h-8V6Z"//marathon/></svg>
                            News
                        </a>
                        <a href="/population/" class="nav-dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 3v18h18"//marathon/><path d="M18 17V9"//marathon/><path d="M13 17V5"//marathon/><path d="M8 17v-3"//marathon/></svg>
                            Population
                        </a>
                        <a href="/servers/" class="nav-dropdown-item${activeSection === 'servers' ? ' active' : ''}" style="font-size:0.82rem">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"//marathon/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"//marathon/><line x1="6" y1="6" x2="6.01" y2="6"//marathon/><line x1="6" y1="18" x2="6.01" y2="18"//marathon/></svg>
                            Down Detector
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <a href="//marathon/marathon-pc-requirements/" class="nav-dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2"//marathon/><path d="M8 21h8"//marathon/><path d="M12 17v4"//marathon/></svg>
                            PC Requirements
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <button id="feedbackNavBtn" class="nav-dropdown-item nav-dropdown-item--btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Provide Feedback</button>
                    </div>
                </div>
            </div>

            <!-- Right: Search -->
        </div>
    </nav>`;
}

module.exports = { generateNavigation };
