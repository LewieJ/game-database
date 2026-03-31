/**
 * gdb.gg - Fortnite Index Page JavaScript
 * Search, autocomplete, carousel, and season widget functionality
 */

(function() {
  'use strict';

  // ==================== SEARCH MODE ====================
  let currentSearchMode = 'player'; // 'player' or 'island'
  const ISLAND_API_BASE = 'https://fortniteccu.gdb.gg';

  function initSearchModeToggle() {
    const toggle = document.getElementById('searchModeToggle');
    const input = document.getElementById('playerInput');
    if (!toggle || !input) return;

    toggle.querySelectorAll('.search-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === currentSearchMode) return;

        currentSearchMode = mode;
        toggle.querySelectorAll('.search-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update placeholder and clear input
        input.placeholder = mode === 'player' ? 'Enter Epic ID...' : 'Search islands by name, creator, or code...';
        input.value = '';
        
        // Hide dropdown
        const dropdown = document.getElementById('autocompleteDropdown');
        if (dropdown) dropdown.classList.remove('active');

        // Show/hide recent players
        const recentContainer = document.getElementById('recentSearches');
        if (recentContainer) {
          recentContainer.style.display = mode === 'player' && getRecentPlayers().length > 0 ? 'flex' : 'none';
        }

        input.focus();
      });
    });
  }

  // ==================== RECENT PLAYERS ====================
  const RECENT_PLAYERS_KEY = 'fortnite_recent_players';
  const MAX_RECENT_PLAYERS = 5;


  function getRecentPlayers() {
    try {
      const stored = localStorage.getItem(RECENT_PLAYERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveRecentPlayer(player) {
    const recent = getRecentPlayers();
    const filtered = recent.filter(p => p.id !== player.id);
    filtered.unshift({
      id: player.id,
      name: player.name,
      wins: player.wins,
      timestamp: Date.now()
    });
    const trimmed = filtered.slice(0, MAX_RECENT_PLAYERS);
    localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(trimmed));
    renderRecentPlayers();
  }

  function clearRecentPlayers() {
    localStorage.removeItem(RECENT_PLAYERS_KEY);
    renderRecentPlayers();
  }

  function renderRecentPlayers() {
    const container = document.getElementById('recentSearches');
    const list = document.getElementById('recentList');
    const recent = getRecentPlayers();
    
    if (!container || !list) return;
    
    if (recent.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'flex';
    list.innerHTML = recent.slice(0, 4).map(player => `
      <a href="profile.html?id=${player.id}&name=${encodeURIComponent(player.name)}" class="recent-tag">
        ${player.name}
      </a>
    `).join('');
  }

  // ==================== SEARCH AUTOCOMPLETE ====================
  const LEADERBOARD_CACHE_KEY = 'fortnite_leaderboard_cache';
  const CACHE_DURATION = 5 * 60 * 1000;

  let cachedLeaderboard = null;
  let selectedIndex = -1;
  let autocompleteItems = [];

  async function loadLeaderboardCache() {
    try {
      const cached = localStorage.getItem(LEADERBOARD_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          cachedLeaderboard = data;
          return;
        }
      }
      const response = await fetch('https://fortnite.gdb.gg/leaderboard?category=wins&limit=100');
      const data = await response.json();
      cachedLeaderboard = data.leaderboard || [];
      localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify({
        data: cachedLeaderboard,
        timestamp: Date.now()
      }));
    } catch (error) {
      cachedLeaderboard = [];
    }
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  function getAutocompleteSuggestions(query) {
    const q = query.toLowerCase();
    const results = { recent: [], popular: [] };

    const recent = getRecentPlayers();
    results.recent = recent.filter(p => p.name.toLowerCase().includes(q)).slice(0, 3);

    if (cachedLeaderboard && cachedLeaderboard.length > 0) {
      results.popular = cachedLeaderboard
        .filter(p => p.display_name.toLowerCase().includes(q))
        .filter(p => !results.recent.some(r => r.id === p.account_id))
        .slice(0, 5)
        .map(p => ({
          id: p.account_id,
          name: p.display_name,
          wins: p.total_wins,
          rank: p.rank
        }));
    }

    return results;
  }

  // ==================== ISLAND SEARCH ====================
  let islandSearchTimeout = null;

  async function searchIslands(query) {
    try {
      const response = await fetch(
        `${ISLAND_API_BASE}/ccu/search?q=${encodeURIComponent(query)}&limit=10`
      );
      return await response.json();
    } catch (error) {
      console.error('Island search failed:', error);
      return null;
    }
  }

  async function renderIslandAutocomplete(query) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;

    if (!query || query.length < 2) {
      dropdown.innerHTML = `
        <div class="autocomplete-empty">
          Type at least 2 characters to search islands
        </div>
      `;
      dropdown.classList.add('active');
      return;
    }

    dropdown.innerHTML = `
      <div class="autocomplete-empty" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
        <span class="loading"></span> Searching islands...
      </div>
    `;
    dropdown.classList.add('active');

    // Debounce
    if (islandSearchTimeout) clearTimeout(islandSearchTimeout);
    
    islandSearchTimeout = setTimeout(async () => {
      const data = await searchIslands(query);
      
      if (!data || !data.success || !data.islands || data.islands.length === 0) {
        dropdown.innerHTML = `
          <div class="autocomplete-empty">
            No islands found matching "${escapeHtml(query)}"
          </div>
        `;
        return;
      }

      let html = `<div class="autocomplete-section">
        <div class="autocomplete-section-title">🏝️ Islands (${data.islands.length} results)</div>`;
      
      data.islands.forEach((island, idx) => {
        html += `
          <div class="autocomplete-item island-result" data-index="${idx}" data-code="${island.code}" data-title="${escapeHtml(island.title)}" data-creator="${escapeHtml(island.creator || '')}">
            <div class="autocomplete-avatar" style="background: var(--fn-purple); font-size: 0.8rem;">🏝️</div>
            <div class="autocomplete-info">
              <div class="autocomplete-name">${highlightMatch(escapeHtml(island.title), query)}</div>
              <div class="autocomplete-stats">${escapeHtml(island.creator || 'Unknown')} • ${island.code}</div>
            </div>
            <span class="autocomplete-badge" style="background: rgba(52, 211, 153, 0.2); color: #34d399;">${formatNumber(island.ccu)}</span>
          </div>
        `;
      });
      
      html += `</div>`;
      dropdown.innerHTML = html;

      // Add click handlers
      dropdown.querySelectorAll('.island-result').forEach(item => {
        item.addEventListener('click', () => {
          const code = item.dataset.code;
          const title = encodeURIComponent(item.dataset.title);
          const creator = encodeURIComponent(item.dataset.creator);
          window.location.href = `playlist.html?code=${code}&type=creative&title=${title}&creator=${creator}`;
        });
      });
    }, 250);
  }

  function renderAutocomplete(query) {
    // Route to island search if in island mode
    if (currentSearchMode === 'island') {
      renderIslandAutocomplete(query);
      return;
    }

    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;
    
    if (!query || query.length < 1) {
      dropdown.classList.remove('active');
      autocompleteItems = [];
      return;
    }

    const suggestions = getAutocompleteSuggestions(query);
    const hasRecent = suggestions.recent.length > 0;
    const hasPopular = suggestions.popular.length > 0;

    if (!hasRecent && !hasPopular) {
      dropdown.innerHTML = `
        <div class="autocomplete-empty">
          No matching players found.<br>
          <span style="font-size: 0.8rem;">Press Enter to search Epic Games</span>
        </div>
      `;
      dropdown.classList.add('active');
      autocompleteItems = [];
      return;
    }

    let html = '';
    autocompleteItems = [];
    let idx = 0;

    if (hasRecent) {
      html += `<div class="autocomplete-section">
        <div class="autocomplete-section-title">Recent</div>`;
      suggestions.recent.forEach(player => {
        autocompleteItems.push(player);
        html += `
          <div class="autocomplete-item" data-index="${idx}" data-id="${player.id}" data-name="${player.name}">
            <div class="autocomplete-avatar">${player.name.charAt(0).toUpperCase()}</div>
            <div class="autocomplete-info">
              <div class="autocomplete-name">${highlightMatch(player.name, query)}</div>
              ${player.wins ? `<div class="autocomplete-stats"><span class="wins">${player.wins.toLocaleString()}</span> wins</div>` : ''}
            </div>
            <span class="autocomplete-badge recent">Recent</span>
          </div>
        `;
        idx++;
      });
      html += `</div>`;
    }

    if (hasPopular) {
      html += `<div class="autocomplete-section">
        <div class="autocomplete-section-title">Top Players</div>`;
      suggestions.popular.forEach(player => {
        autocompleteItems.push(player);
        html += `
          <div class="autocomplete-item" data-index="${idx}" data-id="${player.id}" data-name="${player.name}">
            <div class="autocomplete-avatar">${player.name.charAt(0).toUpperCase()}</div>
            <div class="autocomplete-info">
              <div class="autocomplete-name">${highlightMatch(player.name, query)}</div>
              <div class="autocomplete-stats"><span class="wins">${player.wins.toLocaleString()}</span> wins • Rank #${player.rank}</div>
            </div>
          </div>
        `;
        idx++;
      });
      html += `</div>`;
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');
    selectedIndex = -1;

    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        selectAutocompleteItem(item.dataset.id, item.dataset.name);
      });
    });
  }

  function selectAutocompleteItem(id, name) {
    const input = document.getElementById('playerInput');
    if (input) input.value = name;
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown) dropdown.classList.remove('active');
    const cleanId = (id || '').trim();
    if (!cleanId) return;
    window.location.href = `profile.html?id=${encodeURIComponent(cleanId)}&name=${encodeURIComponent(name)}&platform=Epic`;
  }

  function updateSelectedItem() {
    const items = document.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // ==================== SEARCH FORM ====================
  function displayNoAccounts(username) {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;
    resultContainer.innerHTML = `
      <div class="result error">
        <h2>No Accounts Found</h2>
        <p>We couldn't find any Fortnite accounts matching <strong>${username}</strong>.</p>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-tertiary);">
          Make sure the Epic Games username is spelled correctly. Usernames are case-sensitive.
        </p>
      </div>
    `;
  }

  function displayError(message) {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;
    resultContainer.innerHTML = `
      <div class="result error">
        <h2>Something Went Wrong</h2>
        <p>${message || 'An unexpected error occurred while searching for this player.'}</p>
      </div>
    `;
  }

  // ==================== SKIN ICONS ====================
  const SKIN_ICONS = [
    '/assets/fortnite/skin-icons/Ali-A_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Aloy_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Blitz_Knight_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Championship_Jonesy_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Champion_Stash%27d_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Cuddle_Team_Specialist_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Galaxia_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Green_Arrow_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Llambro_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Nick_Eh_30_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/Snowmando_-_Outfit_-_Fortnite.webp',
    '/assets/fortnite/skin-icons/The_Burning_Wolf_-_Outfit_-_Fortnite.webp'
  ];

  function getPlayerAvatar(accountId) {
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
      hash = ((hash << 5) - hash) + accountId.charCodeAt(i);
      hash = hash & hash;
    }
    return SKIN_ICONS[Math.abs(hash) % SKIN_ICONS.length];
  }

  // ==================== LEADERBOARD CAROUSEL ====================
  let currentCarouselIndex = 0;
  let carouselData = [];
  const carouselCategories = [
    { mode: 'ranked-br', label: 'CH7S1 Ranked · Battle Royale', endpoint: 'https://fortnite.gdb.gg/ranked/ch7s1/leaderboard/ranked-br?limit=4', type: 'ranked' },
    { mode: 'ranked-zb', label: 'CH7S1 Ranked · Zero Build', endpoint: 'https://fortnite.gdb.gg/ranked/ch7s1/leaderboard/ranked-zb?limit=4', type: 'ranked' },
    { mode: 'ranked_blastberry_nobuild', label: 'CH7S1 Ranked · Reload ZB', endpoint: 'https://fortnite.gdb.gg/ranked/ch7s1/leaderboard/ranked_blastberry_nobuild?limit=4', type: 'ranked' },
    { mode: 'general-kills', label: 'Lifetime · Most Kills', endpoint: 'https://fortnite.gdb.gg/leaderboard?category=kills&limit=4', type: 'general' }
  ];

  async function loadLeaderboardCarousel() {
    try {
      const category = carouselCategories[currentCarouselIndex];
      const response = await fetch(category.endpoint);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.leaderboard || data.leaderboard.length === 0) throw new Error('No data');
      
      carouselData = data.leaderboard;
      renderCarousel(category);
      
      const subtitle = document.getElementById('carouselSubtitle');
      if (subtitle) subtitle.textContent = category.label;
    } catch (error) {
      const track = document.getElementById('carouselTrack');
      if (track) {
        track.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: var(--text-tertiary); width: 100%;">
            Unable to load leaderboard
          </div>
        `;
      }
    }
  }

  function renderCarousel(category) {
    const container = document.getElementById('carouselTrack');
    if (!container) return;
    
    const html = carouselData.map((player, index) => {
      const rankClass = index === 0 ? '' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-4';
      
      let statLabel, statValue;
      if (category.type === 'ranked') {
        statLabel = player.current_rank_name || 'Unknown';
        statValue = Math.round((player.promotion_progress || 0) * 100) + '%';
      } else {
        statLabel = 'Kills';
        statValue = (player.total_kills || 0).toLocaleString();
      }

      return `
        <a href="/fortnite/profile.html?id=${player.account_id}&name=${encodeURIComponent(player.display_name || player.account_id)}" class="leader-card ${rankClass}">
          <div class="leader-rank">#${index + 1}</div>
          <div class="leader-avatar">
            <img src="${getPlayerAvatar(player.account_id)}" alt="">
          </div>
          <div class="leader-name">${player.display_name || player.account_id.substring(0, 8) + '...'}</div>
          <div class="leader-stat-label">${statLabel}</div>
          <div class="leader-stat-value">${statValue}</div>
        </a>
      `;
    }).join('');
    
    container.innerHTML = html;
  }

  function rotateCarousel() {
    currentCarouselIndex = (currentCarouselIndex + 1) % carouselCategories.length;
    loadLeaderboardCarousel();
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.animation = 'none';
      setTimeout(() => {
        progressBar.style.animation = 'progress 5s linear infinite';
      }, 10);
    }
  }

  // ==================== SEASON WIDGET ====================
  let seasonEndDate = null;

  async function loadSeasonWidget() {
    try {
      const response = await fetch('https://fortnite.gdb.gg/fortnite/timeline');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const clientEvents = data.channels?.['client-events'];
      
      if (!clientEvents?.states?.[0]?.state) return;
      
      const state = clientEvents.states[0].state;
      
      if (state.seasonNumber) {
        const widget = document.getElementById('seasonWidget');
        const title = document.getElementById('seasonWidgetTitle');
        if (widget) widget.style.display = 'flex';
        if (title) title.textContent = `Chapter 7, Season 1`;
        
        if (state.seasonEnd) {
          seasonEndDate = new Date(state.seasonEnd);
          updateSeasonCountdown();
        }
      }
    } catch (error) {
      // Silently fail - season widget is optional
    }
  }

  function updateSeasonCountdown() {
    if (!seasonEndDate) return;
    
    const now = new Date();
    const diff = seasonEndDate - now;
    
    const daysEl = document.getElementById('countdownDays');
    const hoursEl = document.getElementById('countdownHours');
    const minsEl = document.getElementById('countdownMins');
    
    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '0';
      if (hoursEl) hoursEl.textContent = '0';
      if (minsEl) minsEl.textContent = '0';
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (daysEl) daysEl.textContent = days;
    if (hoursEl) hoursEl.textContent = hours;
    if (minsEl) minsEl.textContent = mins;
  }

  // ==================== INITIALIZATION ====================
  function init() {
    // Initialize recent players
    renderRecentPlayers();
    
    const clearRecentBtn = document.getElementById('clearRecent');
    if (clearRecentBtn) {
      clearRecentBtn.addEventListener('click', clearRecentPlayers);
    }

    // Load leaderboard cache for autocomplete
    loadLeaderboardCache();

    // Setup player input
    const playerInput = document.getElementById('playerInput');
    let debounceTimer;

    if (playerInput) {
      playerInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          renderAutocomplete(e.target.value.trim());
        }, 100);
      });

      playerInput.addEventListener('focus', () => {
        const val = playerInput.value.trim();
        if (val) renderAutocomplete(val);
      });

      playerInput.addEventListener('keydown', (e) => {
        const dropdown = document.getElementById('autocompleteDropdown');
        if (!dropdown || !dropdown.classList.contains('active') || autocompleteItems.length === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, autocompleteItems.length - 1);
          updateSelectedItem();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          updateSelectedItem();
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          const item = autocompleteItems[selectedIndex];
          selectAutocompleteItem(item.id, item.name);
        } else if (e.key === 'Escape') {
          dropdown.classList.remove('active');
        }
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('autocompleteDropdown');
      const wrapper = document.querySelector('.search-wrapper');
      if (dropdown && wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    // Setup search form
    const form = document.getElementById('searchForm');
    const input = document.getElementById('playerInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('resultContainer');

    if (form && input && searchBtn) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (!query) return;

        // Handle island mode
        if (currentSearchMode === 'island') {
          searchBtn.disabled = true;
          searchBtn.innerHTML = '<span class="loading"></span>';
          
          try {
            const data = await searchIslands(query);
            if (data && data.success && data.islands && data.islands.length > 0) {
              // Navigate to first result
              const island = data.islands[0];
              window.location.href = `playlist.html?code=${island.code}&type=creative&title=${encodeURIComponent(island.title)}&creator=${encodeURIComponent(island.creator || '')}`;
            } else {
              if (resultContainer) {
                resultContainer.innerHTML = `
                  <div class="result error">
                    <h2>No Islands Found</h2>
                    <p>We couldn't find any islands matching <strong>${escapeHtml(query)}</strong>.</p>
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-tertiary);">
                      Try searching by island name, creator name, or island code.
                    </p>
                  </div>
                `;
              }
            }
          } catch (error) {
            displayError('Failed to search islands. Please try again.');
          } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search';
          }
          return;
        }

        // Player mode (existing logic)
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="loading"></span>';
        if (resultContainer) resultContainer.innerHTML = '';

        try {
          const accountResponse = await fetch(
            `https://fortnitesearch.gdb.gg/lookup?username=${encodeURIComponent(query)}`
          );

          if (!accountResponse.ok) {
            if (accountResponse.status === 404) {
              displayNoAccounts(query);
              return;
            }
            throw new Error('Player lookup failed');
          }

          const lookupData = await accountResponse.json();
          const account = lookupData?.account;

          if (!account?.id) throw new Error('Invalid response from user search');

          const displayName = account.displayName || query;

          saveRecentPlayer({
            id: account.id,
            name: displayName,
            wins: null
          });

          window.location.href = `profile.html?id=${encodeURIComponent((account.id || '').trim())}&name=${encodeURIComponent(displayName)}&platform=Epic`;

        } catch (error) {
          displayError(error.message);
        } finally {
          searchBtn.disabled = false;
          searchBtn.textContent = 'Search';
        }
      });
    }

    // Initialize search mode toggle
    initSearchModeToggle();

    // Load carousel and season widget
    loadLeaderboardCarousel();
    setInterval(rotateCarousel, 5000);

    loadSeasonWidget();
    setInterval(updateSeasonCountdown, 60000);

    // Load competitive events
    loadCompetitiveEvents();

    // Load live events banner
    loadLiveEventsBanner();
    setInterval(loadLiveEventsBanner, 60000); // Refresh every 60 seconds
  }

  // ==================== LIVE EVENTS BANNER ====================
  async function loadLiveEventsBanner() {
    const banner = document.getElementById('liveBanner');
    const scroll = document.getElementById('liveEventsScroll');
    const countEl = document.getElementById('liveBannerCount');
    
    if (!banner || !scroll) return;

    try {
      const response = await fetch('https://fortnite-events-api.dbrnk.workers.dev/v2/live');
      const data = await response.json();
      
      const liveWindows = data.grouped?.live || [];
      
      if (liveWindows.length === 0) {
        banner.classList.remove('visible');
        return;
      }

      // Show banner
      banner.classList.add('visible');
      
      // Update count
      if (countEl) {
        countEl.textContent = `${liveWindows.length} event${liveWindows.length > 1 ? 's' : ''} happening now`;
      }

      // Render live event items
      scroll.innerHTML = liveWindows.map(w => {
        const image = w.images?.poster || w.images?.background || '';
        const eventUrl = `/fortnite/event.html?id=${encodeURIComponent(w.eventId)}&window=${encodeURIComponent(w.windowId)}`;
        const participants = w.stats?.participants ? w.stats.participants.toLocaleString() : '';
        
        return `
          <a href="${eventUrl}" class="live-event-item">
            ${image ? `<img src="${image}" alt="${w.title}" class="live-event-image">` : '<div class="live-event-image"></div>'}
            <div class="live-event-info">
              <div class="live-event-name">${w.title || w.name}</div>
              <div class="live-event-meta">
                ${w.region ? `<span class="live-event-region">${w.region}</span>` : ''}
                <span>${w.name}</span>
                ${participants ? `<span class="live-event-players">👥 ${participants}</span>` : ''}
              </div>
            </div>
            <span class="live-event-arrow">→</span>
          </a>
        `;
      }).join('');

    } catch (error) {
      console.error('Failed to load live events:', error);
      banner.classList.remove('visible');
    }
  }

  // ==================== COMPETITIVE EVENTS ====================
  async function loadCompetitiveEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;

    try {
      const response = await fetch('https://fortniteevents.gdb.gg/events/upcoming');
      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-tertiary);">
            <div style="font-size: 0.85rem;">No upcoming events at this time</div>
          </div>
        `;
        return;
      }

      const now = new Date();
      
      // Filter for upcoming events
      const upcomingEvents = data.events.filter(event => {
        const beginTime = new Date(event.beginTime);
        return beginTime > now;
      });

      if (upcomingEvents.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-tertiary);">
            <div style="font-size: 0.85rem;">No upcoming events at this time</div>
          </div>
        `;
        return;
      }

      // Group events by eventGroup to avoid showing multiple sessions of the same event
      const grouped = groupEventsByEventGroup(upcomingEvents);
      
      // Sort by earliest start time and take first 5 groups
      const topFive = grouped
        .sort((a, b) => new Date(a.beginTime) - new Date(b.beginTime))
        .slice(0, 5);

      grid.innerHTML = topFive.map(event => renderEventCard(event)).join('');
    } catch (error) {
      console.error('Failed to load competitive events:', error);
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-tertiary);">
          <div style="font-size: 0.85rem;">Unable to load events</div>
        </div>
      `;
    }
  }

  function groupEventsByEventGroup(events) {
    const groups = new Map();
    
    events.forEach(event => {
      const groupKey = event.eventGroup || event.eventId;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          ...event,
          _sessionCount: 1,
          _allEvents: [event]
        });
      } else {
        const existing = groups.get(groupKey);
        existing._sessionCount++;
        existing._allEvents.push(event);
        // Keep the earliest start time
        if (new Date(event.beginTime) < new Date(existing.beginTime)) {
          existing.beginTime = event.beginTime;
        }
        // Keep the latest end time
        if (new Date(event.endTime) > new Date(existing.endTime)) {
          existing.endTime = event.endTime;
        }
      }
    });
    
    return Array.from(groups.values());
  }

  function renderEventCard(event) {
    const displayInfo = event.displayInfo || {};
    const images = displayInfo.images || {};
    const title = displayInfo.titleLine1 && displayInfo.titleLine2
      ? `${displayInfo.titleLine1} ${displayInfo.titleLine2}`.trim()
      : (displayInfo.title || event.eventId.split('_').slice(-2).join(' '));
    
    const thumbnail = images.squarePosterImage || images.tournamentViewBackgroundImage || '';
    const region = event.regions?.[0] || '';
    const beginTime = new Date(event.beginTime);
    const sessionCount = event._sessionCount || 1;
    
    // Determine platform badges
    const platforms = event.platforms || [];
    let platformBadge = '';
    if (event.inputRequirements?.includes('touch')) {
      platformBadge = '<span class="event-badge event-badge-mobile">📱 MOBILE ONLY</span>';
    }

    // Check for anti-cheat requirements
    let anticheatBadge = '';
    if (event.metadata?.requireSystemFeatures && event.metadata.requireSystemFeatures.length > 0) {
      anticheatBadge = '<span class="event-badge event-badge-anticheat">🔒 ANTI-CHEAT</span>';
    }

    // Format time
    const timeStr = formatEventTime(beginTime);

    return `
      <a href="/fortnite/event.html?id=${encodeURIComponent(event.eventId)}" class="event-card">
        <div class="event-thumbnail-wrapper">
          ${thumbnail ? `<img src="${thumbnail}" alt="${title}" class="event-thumbnail">` : '<div class="event-thumbnail" style="background: linear-gradient(135deg, #04101D, #1E3472);"></div>'}
          <div class="event-badges">
            ${region ? `<span class="event-badge event-badge-region">${region}</span>` : ''}
            ${platformBadge}
            ${anticheatBadge}
          </div>
          ${sessionCount > 1 ? `<div class="event-session-count">${sessionCount} sessions</div>` : ''}
        </div>
        <div class="event-content">
          <div class="event-title">${title}</div>
          <div class="event-time">${timeStr}</div>
        </div>
      </a>
    `;
  }

  function formatEventTime(date) {
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const dateString = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    if (days === 0) {
      if (hours === 0) {
        return `Today at ${timeString}`;
      }
      return `Today at ${timeString}`;
    } else if (days === 1) {
      return `Tomorrow at ${timeString}`;
    } else if (days < 7) {
      return `${dateString} at ${timeString}`;
    } else {
      return `${dateString} at ${timeString}`;
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
