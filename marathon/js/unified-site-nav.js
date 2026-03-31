/**
 * Injects #global-nav and loads /assets/global.js once.
 * Included from pages that use /marathon/css/rnk-theme.css (Marathon hub).
 */
(function () {
  'use strict';
  var MARK = 'data-rnk-unified-loaded';

  function mount() {
    var el = document.getElementById('global-nav');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-nav';
      if (document.body.firstChild) {
        document.body.insertBefore(el, document.body.firstChild);
      } else {
        document.body.appendChild(el);
      }
    }
    if (document.querySelector('script[' + MARK + ']')) return;
    var s = document.createElement('script');
    s.src = '/assets/global.js';
    s.defer = true;
    s.setAttribute(MARK, 'true');
    (document.body || document.documentElement).appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
