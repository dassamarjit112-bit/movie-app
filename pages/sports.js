/* ============================================================
   CineStream — Sports Dashboard (Premium OTT Style)
   Today's live & upcoming matches — auto date-aware
   ============================================================ */

const SportsPage = (() => {
  let pollingInterval = null;
  let carouselInterval = null;
  let countdownInterval = null;
  let currentSport = 'all';
  let searchQuery = '';
  let allMatches = [];

  // ── Sport metadata ──
  const sportMeta = {
    football:          { emoji: '⚽', label: 'Football',     color: '#00d084', bg: '#0a1a10' },
    cricket:           { emoji: '🏏', label: 'Cricket',      color: '#14d1ff', bg: '#0a1020' },
    basketball:        { emoji: '🏀', label: 'Basketball',   color: '#ff7a00', bg: '#1a0e00' },
    tennis:            { emoji: '🎾', label: 'Tennis',       color: '#ffd700', bg: '#1a1700' },
    hockey:            { emoji: '🏒', label: 'Hockey',       color: '#a855f7', bg: '#12091a' },
    baseball:          { emoji: '⚾', label: 'Baseball',     color: '#ff6b6b', bg: '#1a0909' },
    'american-football':{ emoji: '🏈', label: 'NFL',        color: '#00b4d8', bg: '#091318' },
    rugby:             { emoji: '🏉', label: 'Rugby',        color: '#06d6a0', bg: '#091512' },
    mma:               { emoji: '🥊', label: 'UFC / MMA',   color: '#e63946', bg: '#1a0805' },
    golf:              { emoji: '⛳', label: 'Golf',         color: '#90e0ef', bg: '#09141a' },
    f1:                { emoji: '🏎️', label: 'Motorsport', color: '#e10600', bg: '#1a0000' },
  };

  // ── Tab definitions ──
  const SPORT_TABS = [
    { id: 'all',              label: 'All' },
    { id: 'football',         label: '⚽ Football' },
    { id: 'cricket',          label: '🏏 Cricket' },
    { id: 'basketball',       label: '🏀 Basketball' },
    { id: 'f1',               label: '🏎️ Motorsport' },
    { id: 'tennis',           label: '🎾 Tennis' },
    { id: 'hockey',           label: '🏒 Hockey' },
    { id: 'baseball',         label: '⚾ Baseball' },
    { id: 'american-football',label: '🏈 NFL' },
    { id: 'rugby',            label: '🏉 Rugby' },
    { id: 'mma',              label: '🥊 UFC' },
    { id: 'golf',             label: '⛳ Golf' },
  ];

  function init() {
    document.getElementById('navbar-mount').innerHTML = window.UI.renderNavbar('sports');
    document.getElementById('footer-mount').innerHTML = window.UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = window.UI.renderMobileNav('sports');
    window.UI.updateNavbarUser();
    renderDateHeader();
    buildTabs();
    setupSearch();
    showSkeletons();
    fetchAndRender();
    fetchAndRenderNews();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchAndRender, 30000); // refresh every 30s
  }

  function cleanup() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (carouselInterval) clearInterval(carouselInterval);
  }



  // ── Render today's date in header ──
  function renderDateHeader() {
    const el = document.getElementById('sp-date-display');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // ── Build category tabs dynamically ──
  function buildTabs() {
    const container = document.getElementById('sp-sport-tabs');
    const allBtn = document.getElementById('sp-tab-all-btn');
    if (!container) return;
    
    // Build scrolling tabs (excluding 'all')
    const categoryTabs = SPORT_TABS.filter(t => t.id !== 'all');
    container.innerHTML = categoryTabs.map(tab => `
      <button class="sp-tab" data-sport="${tab.id}">
        ${tab.label}
      </button>
    `).join('');

    const allTabs = [allBtn, ...container.querySelectorAll('.sp-tab')].filter(Boolean);
    
    allTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        allTabs.forEach(b => {
          b.classList.remove('active');
          // If it's the separate All button, we might need to toggle its specific class
          if(b.id === 'sp-tab-all-btn') b.classList.remove('active');
        });
        btn.classList.add('active');
        currentSport = btn.dataset.sport;
        renderMatchesBySport(allMatches);
      });
    });
  }

  function setupSearch() {
    const el = document.getElementById('sp-search-input');
    if (!el) return;
    el.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderMatchesBySport(allMatches);
    });
  }

  function showSkeletons() {
    const container = document.getElementById('sp-matches-root');
    if (!container) return;
    container.innerHTML = `
      <div class="sp-skeleton-grid">
        ${Array(6).fill('<div class="sp-match-skeleton"></div>').join('')}
      </div>
    `;
  }

  async function fetchAndRender() {
    if (!window.SportsAPI) return;
    try {
      const matches = await window.SportsAPI.getLiveMatches();
      allMatches = matches || [];
      updateHeaderStats();
      renderHeroCarousel();
      renderAISuggestions();
      renderMatchesBySport(allMatches);
    } catch (e) {
      console.warn('Sports fetch error:', e);
    }
  }

  // ── Fetch & Render News ──
  async function fetchAndRenderNews() {
    if (!window.SportsAPI || !window.SportsAPI.getNewsHeadlines) return;
    const grid = document.getElementById('sp-news-grid');
    const dateEl = document.getElementById('sp-news-date');
    if (dateEl) {
      dateEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
    }
    try {
      const articles = await window.SportsAPI.getNewsHeadlines();
      if (!articles || articles.length === 0) {
        document.getElementById('sp-news-section').style.display = 'none';
        return;
      }
      grid.innerHTML = articles.map(article => `
        <a href="${article.link}" target="_blank" class="sp-news-card">
          <img src="${article.image || 'https://placehold.co/400x200/111/fff?text=Sports+News'}" alt="News" class="sp-news-img" onerror="this.src='https://placehold.co/400x200/111/fff?text=Sports+News'">
          <div class="sp-news-body">
            <div class="sp-news-sport">${article.sport || 'Sports'}</div>
            <div class="sp-news-title">${article.headline}</div>
            <div class="sp-news-desc">${article.description}</div>
            <div class="sp-news-meta">
              <span>Read Full Story →</span>
              <span>${new Date(article.published).toLocaleDateString('en-IN', {month:'short', day:'numeric'})}</span>
            </div>
          </div>
        </a>
      `).join('');
    } catch (e) {
      console.warn('News fetch error:', e);
    }
  }

  function updateHeaderStats() {
    const liveCount = allMatches.filter(m => m.isLive).length;
    const todayCount = allMatches.length;
    const liveEl = document.getElementById('sp-live-count');
    const todayEl = document.getElementById('sp-today-count');
    if (liveEl) liveEl.textContent = liveCount;
    if (todayEl) todayEl.textContent = todayCount;
  }

  // ── Hero Carousel — show top 3 live matches ──
  function renderHeroCarousel() {
    const container = document.getElementById('sp-hero-featured');
    if (!container) return;
    const featured = allMatches.filter(m => m.isLive).slice(0, 3);
    if (featured.length === 0) {
      // show next upcoming if no live
      const upcoming = allMatches.filter(m => m.isScheduled).slice(0, 1);
      if (upcoming.length) renderHeroCard(container, upcoming[0]);
      else container.innerHTML = '';
      return;
    }
    renderHeroCard(container, featured[0]);
    if (featured.length > 1) {
      let idx = 0;
      if (carouselInterval) clearInterval(carouselInterval);
      carouselInterval = setInterval(() => {
        idx = (idx + 1) % featured.length;
        renderHeroCard(container, featured[idx]);
      }, 5000);
    }
  }

  function renderHeroCard(container, match) {
    const meta = sportMeta[match.sportType] || { emoji: '🏆', color: '#00d084' };
    container.innerHTML = `
      <div class="sp-hero-match" style="border-color: ${meta.color}22;">
        <div class="sp-hero-match-top">
          <span style="font-size:11px; font-weight:800; color:${meta.color}; text-transform:uppercase; letter-spacing:0.1em;">
            ${match.tournamentIcon || meta.emoji} ${match.tournament}
          </span>
          ${match.isLive
            ? `<span class="sp-live-badge"><span class="sp-live-dot"></span>LIVE</span>`
            : `<div style="display:flex; flex-direction:column; align-items:flex-end;">
                 <span class="sp-time-badge">${match.matchTime}</span>
                 ${match.rawDate ? `<span class="sp-countdown" data-time="${match.rawDate}" style="font-size:11px; color:#14d1ff; font-weight:700; margin-top:4px;"></span>` : ''}
               </div>`}
        </div>
        <div class="sp-hero-teams">
          <div class="sp-hero-team">
            <img src="${match.homeLogo}" alt="${match.homeTeam}" class="sp-hero-logo"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.homeAbbr)}&background=1a1a2e&color=ffffff&size=80&bold=true'">
            <span class="sp-hero-team-name">${match.homeTeam}</span>
          </div>
          <div class="sp-hero-score-wrap">
            <div class="sp-hero-score">${match.score}</div>
            <div class="sp-hero-status">${match.status}</div>
          </div>
          <div class="sp-hero-team">
            <img src="${match.awayLogo}" alt="${match.awayTeam}" class="sp-hero-logo"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.awayAbbr)}&background=1a1a2e&color=ffffff&size=80&bold=true'">
            <span class="sp-hero-team-name">${match.awayTeam}</span>
          </div>
        </div>
        <div class="sp-hero-match-footer">
          ${match.venue ? `<span class="sp-venue">📍 ${match.venue}</span>` : ''}
          <button class="sp-watch-btn" onclick="UI._requireAuthNav('sports-stream', {id: '${match.matchId}'})">
            <span class="material-symbols-outlined icon-fill" style="font-size:16px;">play_circle</span>
            Watch Live
          </button>
        </div>
      </div>
    `;
  }

  // ── AI Suggestions ──
  function renderAISuggestions() {
    const container = document.getElementById('ai-suggestions-grid');
    if (!container) return;
    const priorityLeagues = ['FIFA World Cup 2026', 'IPL 2026', 'T20 International', 'Champions League', 'NBA 2026', 'NHL Playoffs', 'ATP Tour'];
    let suggestions = allMatches.filter(m => priorityLeagues.some(l => m.tournament.includes(l)));
    if (suggestions.length === 0) suggestions = allMatches.slice(0, 5);
    else suggestions = suggestions.slice(0, 5);

    if (!suggestions.length) { container.parentElement?.style && (container.parentElement.style.display = 'none'); return; }

    container.innerHTML = suggestions.map(match => {
      const meta = sportMeta[match.sportType] || { emoji: '🏆', color: '#14d1ff' };
      return `
        <div class="sp-suggest-card" onclick="UI._requireAuthNav('sports-stream', {id: '${match.matchId}'})">
          <div class="sp-suggest-top">
            <span class="sp-suggest-league">${match.tournamentIcon || meta.emoji} ${match.tournament}</span>
            ${match.isLive
              ? `<span class="sp-live-badge-sm"><span class="sp-live-dot" style="width:5px;height:5px;"></span>LIVE</span>`
              : `<div style="display:flex; flex-direction:column; align-items:flex-end;">
                   <span class="sp-suggest-time">${match.matchTime}</span>
                   ${match.rawDate ? `<span class="sp-countdown" data-time="${match.rawDate}" style="font-size:10px; color:#14d1ff; font-weight:700; margin-top:2px;"></span>` : ''}
                 </div>`}
          </div>
          <div class="sp-suggest-teams">
            <div class="sp-suggest-team">
              <img src="${match.homeLogo}" alt="${match.homeAbbr}"
                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.homeAbbr)}&background=111&color=fff&size=64'">
              <span>${match.homeAbbr}</span>
            </div>
            <div class="sp-suggest-score">${match.isScheduled ? 'vs' : match.score}</div>
            <div class="sp-suggest-team">
              <img src="${match.awayLogo}" alt="${match.awayAbbr}"
                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.awayAbbr)}&background=111&color=fff&size=64'">
              <span>${match.awayAbbr}</span>
            </div>
          </div>
          <div class="sp-suggest-footer">Watch Now →</div>
        </div>
      `;
    }).join('');
  }

  // ── Main Match Grid — grouped by tournament ──
  function renderMatchesBySport(matches) {
    const root = document.getElementById('sp-matches-root');
    if (!root) return;

    let filtered = currentSport === 'all'
      ? matches
      : matches.filter(m => m.sportType === currentSport);

    if (searchQuery) {
      filtered = filtered.filter(m =>
        [m.homeTeam, m.awayTeam, m.tournament].some(s => s?.toLowerCase().includes(searchQuery))
      );
    }

    if (!filtered.length) {
      root.innerHTML = `
        <div class="sp-empty">
          <div style="font-size:48px;">📡</div>
          <h3>No matches today</h3>
          <p>Check back soon. All scores update automatically.</p>
        </div>
      `;
      return;
    }

    // Group by tournament
    const groups = {};
    filtered.forEach(m => {
      const key = m.tournament;
      if (!groups[key]) groups[key] = { icon: m.tournamentIcon || sportMeta[m.sportType]?.emoji || '🏆', sport: m.sportType, matches: [] };
      groups[key].matches.push(m);
    });

    // Priority sort order
    const priority = ['FIFA World Cup 2026', 'IPL 2026', 'T20 International', 'Test Match', 'ODI International', 'UEFA Champions League', 'Premier League', 'NBA 2026', 'NHL Playoffs'];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ia = priority.indexOf(a), ib = priority.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1; if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    root.innerHTML = sortedKeys.map(tournament => {
      const grp = groups[tournament];
      const meta = sportMeta[grp.sport] || { color: '#00d084', bg: '#0a1a10' };
      const liveCount = grp.matches.filter(m => m.isLive).length;
      return `
        <div class="sp-tournament-section">
          <div class="sp-tournament-header">
            <div class="sp-tournament-title">
              <span class="sp-tournament-icon">${grp.icon}</span>
              <span>${tournament}</span>
              ${liveCount > 0 ? `<span class="sp-live-badge-sm"><span class="sp-live-dot" style="width:5px;height:5px;"></span>${liveCount} LIVE</span>` : ''}
            </div>
          </div>
          <div class="sp-cards-grid">
            ${grp.matches.map(m => buildMatchCard(m, meta)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Build premium match card ──
  function buildMatchCard(match, meta) {
    const isLive = match.isLive;
    const isFinished = match.isFinished;
    const viewers = isLive ? (Math.floor(Math.random() * 90 + 10) + 'K') : '';

    return `
      <div class="sp-match-card ${isLive ? 'sp-card-live' : ''}" 
           onclick="UI._requireAuthNav('sports-stream', {id: '${match.matchId}'})">
        <!-- Card Header -->
        <div class="sp-card-header">
          <div class="sp-card-tournament">${match.tournamentIcon || ''} ${match.tournament}</div>
          ${isLive
            ? `<span class="sp-live-badge"><span class="sp-live-dot"></span>LIVE</span>`
            : isFinished
              ? `<span class="sp-ft-badge">FT</span>`
              : `<span class="sp-time-badge">${match.matchTime}</span>`}
        </div>

        <!-- Teams + Scores -->
        <div class="sp-card-body">
          <!-- Home Team -->
          <div class="sp-card-team">
            <img src="${match.homeLogo}" alt="${match.homeTeam}"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.homeAbbr)}&background=1a1a2e&color=fff&size=80&bold=true'">
            <span class="sp-card-team-name">${match.homeTeam}</span>
          </div>

          <!-- Score Center -->
          <div class="sp-card-score-col">
            <div class="sp-card-score ${isLive ? 'sp-score-live' : ''}">${match.score}</div>
            <div class="sp-card-status">${match.status}</div>
            ${match.venue ? `<div class="sp-card-venue">📍 ${match.venue}</div>` : ''}
            ${isLive && viewers ? `<div class="sp-card-viewers">👁 ${viewers} watching</div>` : ''}
          </div>

          <!-- Away Team -->
          <div class="sp-card-team">
            <img src="${match.awayLogo}" alt="${match.awayTeam}"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.awayAbbr)}&background=1a1a2e&color=fff&size=80&bold=true'">
            <span class="sp-card-team-name">${match.awayTeam}</span>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="sp-card-footer">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span class="sp-card-date">${match.matchDate} · ${match.matchTime}</span>
            ${!isLive && !isFinished && match.rawDate ? `<span class="sp-countdown" data-time="${match.rawDate}" style="font-size:11px; color:#14d1ff; font-weight:700;"></span>` : ''}
          </div>
          <button class="sp-card-watch-btn">
            <span class="material-symbols-outlined icon-fill" style="font-size:13px;">play_arrow</span>
            ${isLive ? 'Watch Live' : 'Preview'}
          </button>
        </div>
      </div>
    `;
  }

  function startCountdownTimer() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      document.querySelectorAll('.sp-countdown').forEach(el => {
        const timeStr = el.getAttribute('data-time');
        if (!timeStr) return;
        const target = new Date(timeStr).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) {
          el.textContent = "Starting Soon...";
          return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        if (d > 0) {
          el.textContent = `Starts in ${d}d ${h}h`;
        } else {
          el.textContent = `Starts in ${h}h ${m}m ${s}s`;
        }
      });
    }, 1000);
  }

  function cleanup() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (carouselInterval) clearInterval(carouselInterval);
    if (countdownInterval) clearInterval(countdownInterval);
  }

  return { init, cleanup };
})();

window.SportsPage = SportsPage;
