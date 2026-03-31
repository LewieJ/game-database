'use strict';

/**
 * Shared footer for gdb.gg Marathon hub (SSG output).
 * Cross-link: transparent attribution to MarathonDB.gg for SEO (related property, followed link).
 */
function generateFooter() {
    return `
    <footer class="footer">
        <div class="container">
            <div class="footer-main">
                <div class="footer-brand">
                    <span class="footer-logo">gdb.gg</span><span class="footer-logo-sub">Marathon</span>
                </div>
                <div class="footer-nav">
                    <a href="//marathon/weapons/" class="footer-link">Weapons</a>
                    <a href="//marathon/runners/" class="footer-link">Runners</a>
                    <a href="//marathon/cores/" class="footer-link">Cores</a>
                    <a href="//marathon/implants/" class="footer-link">Implants</a>
                    <a href="//marathon/items/" class="footer-link">Items</a>
                    <a href="//marathon/mods/" class="footer-link">Mods</a>
                    <a href="//marathon/contracts/" class="footer-link">Contracts</a>
                    <a href="//marathon/weapon-skins/" class="footer-link">Skins</a>
                    <a href="//marathon/tier-lists/" class="footer-link">Tier Lists</a>
                    <a href="//marathon/marathon-pc-requirements/" class="footer-link">PC Requirements</a>
                    <a href="//marathon/news/" class="footer-link">News</a>
                </div>
                <div class="footer-social">
                    <a href="https://x.com/MarathonDB" target="_blank" rel="noopener noreferrer" class="footer-social-link" title="X/Twitter">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </a>
                    <a href="https://discord.gg/TPhQW2aPBC" target="_blank" rel="noopener noreferrer" class="footer-social-link" title="Discord">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                    </a>
                    <a href="mailto:Heymarathondb@Gmail.com" class="footer-social-link" title="Email">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                        </svg>
                    </a>
                </div>
            </div>
            <div class="footer-data-partner">
                <p class="footer-data-partner-label">Data source</p>
                <p class="footer-data-partner-text">Structured Marathon data on this hub is provided by <a href="https://marathondb.gg/" rel="noopener noreferrer">MarathonDB.gg</a> — operated as a companion database alongside gdb.gg. Visit MarathonDB for APIs, datasets, and the core data pipeline.</p>
            </div>
            <div class="footer-legal">
                <p class="footer-disclaimer">Marathon™ is a trademark of Bungie, Inc. This site is not affiliated with or endorsed by Bungie.</p>
                <p class="footer-links"><a href="//marathon/pages/about">About</a> · <a href="//marathon/pages/contact">Contact</a> · <a href="//marathon/pages/privacy-policy">Privacy Policy</a> · <a href="//marathon/pages/terms-and-conditions">Terms</a></p>
            </div>
        </div>
    </footer>`;
}

module.exports = { generateFooter };
