/**
 * GDB.GG — Cookie Consent Banner
 * Handles GDPR compliance for EU visitors.
 * The NPA flag is set by an inline script in <head> before AdSense loads.
 * This script only handles the banner UI and user choice persistence.
 */
(function () {
    'use strict';

    var CONSENT_KEY = 'gdb_consent';

    function getConsent() {
        try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
    }

    function setConsent(value) {
        try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
    }

    function isEUTimezone() {
        try {
            var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            return /^Europe\/|^Atlantic\/(Canary|Faroe|Madeira)|^Arctic\/Longyearbyen/.test(tz);
        } catch (e) { return false; }
    }

    function needsConsentPrompt() {
        return !getConsent() && isEUTimezone();
    }

    function buildBanner() {
        var banner = document.getElementById('gdb-cookie-banner');
        if (!banner) return;

        banner.innerHTML =
            '<p class="gdb-cookie-text">We use cookies to personalise content and ads. ' +
            '<a href="/pages/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>.</p>' +
            '<div class="gdb-cookie-buttons">' +
            '<button class="gdb-cookie-btn gdb-cookie-btn--secondary" id="gdb-cookie-reject" type="button">Essential only</button>' +
            '<button class="gdb-cookie-btn gdb-cookie-btn--primary" id="gdb-cookie-accept" type="button">Accept all</button>' +
            '</div>';

        banner.classList.add('gdb-consent-visible');

        // Adjust mobile bottom nav position if present
        var height = banner.offsetHeight;
        document.documentElement.style.setProperty('--gdb-consent-height', height + 'px');

        document.getElementById('gdb-cookie-accept').addEventListener('click', function () {
            setConsent('all');
            banner.classList.remove('gdb-consent-visible');
            document.documentElement.style.removeProperty('--gdb-consent-height');
        });

        document.getElementById('gdb-cookie-reject').addEventListener('click', function () {
            setConsent('essential');
            banner.classList.remove('gdb-consent-visible');
            document.documentElement.style.removeProperty('--gdb-consent-height');
            // Signal non-personalized ads to AdSense for any post-consent ad loads
            window.adsbygoogle = window.adsbygoogle || [];
            window.adsbygoogle.requestNonPersonalizedAds = 1;
        });
    }

    if (needsConsentPrompt()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', buildBanner);
        } else {
            buildBanner();
        }
    }
})();
