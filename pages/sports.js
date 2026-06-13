/* ============================================================
   CineStream — Sports Dashboard Controller (FanCode Style)
   ============================================================ */

const SportsPage = (() => {
  let pollingInterval = null;
  let carouselInterval = null;
  let currentSport = 'all';
  let searchQuery = '';
  let allMatches = [];
  let currentHeroIndex = 0;

  // ── Sport type emoji / label mapping ──
  const sportMeta = {
    football: { emoji: '⚽', label: 'Football', color: '#00d084' },
    cricket:  { emoji: '🏏', label: 'Cricket',  color: '#14d1ff' },
    basketball:{ emoji: '🏀', label: 'Basketball', color: '#ff7a00' },
    tennis:   { emoji: '🎾', label: 'Tennis',   color: '#ffd700' },
    kabaddi:  { emoji: '🤼', label: 'Kabaddi',  color: '#a855f7' },
  };

  // ── Upcoming match simulation data ──
  const UPCOMING = [
    { sport:'football', teams:'USA vs England',         tournament:'FIFA World Cup 2026', time:'Today, 8:00 PM' },
    { sport:'cricket',  teams:'India vs Sri Lanka',     tournament:'ICC T20 World Cup 2026', time:'Today, 7:30 PM' },
    { sport:'football', teams:'Real Madrid vs Man City',tournament:'Champions League Final', time:'Tomorrow, 9:00 PM' },
    { sport:'cricket',  teams:'CSK vs MI',              tournament:'IPL 2026', time:'Tomorrow, 7:30 PM' },
    { sport:'basketball', teams:'Lakers vs Celtics',    tournament:'NBA Finals 2026', time:'Thu, 7:00 AM' },
    { sport:'tennis',   teams:'Alcaraz vs Sinner',      tournament:'Wimbledon 2026', time:'Sun, 6:30 PM' },
  ];

  function init() {
    document.getElementById('navbar-mount').innerHTML = window.UI.renderNavbar('sports');
    document.getElementById('footer-mount').innerHTML = window.UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = window.UI.renderMobileNav('sports');
    window.UI.updateNavbarUser();

    // Set up sport filter tabs
    setupTabs();
    
    // Set up search bar
    setupSearch();

    // Populate upcoming matches
    renderUpcoming();

    // Fetch initial matches
    fetchAndRenderMatches();

    // Rapid polling every 15 seconds
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchAndRenderMatches, 15000);
  }

  // ── Set up sport filter tab clicks ──
  function setupTabs() {
    document.querySelectorAll('.sp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSport = tab.dataset.sport;
        renderMatchGrid(allMatches);
      });
    });
  }

  // ── Set up search bar ──
  function setupSearch() {
    const searchInput = document.getElementById('sp-search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderMatchGrid(allMatches);
    });
  }

  // ── Render Upcoming list ──
  function renderUpcoming() {
    const list = document.getElementById('sp-upcoming-list');
    if (!list) return;
    list.innerHTML = UPCOMING.map(u => {
      const meta = sportMeta[u.sport] || { emoji: '🏆', label: u.sport };
      return `
        <div class="sp-upcoming-item" onclick="Router.navigate('sports')">
          <span class="sp-upcoming-sport">${meta.emoji}</span>
          <div class="sp-upcoming-info">
            <div class="sp-upcoming-teams">${u.teams}</div>
            <div class="sp-upcoming-sub">
              <span>${meta.label}</span>
              <span class="sp-upcoming-dot"></span>
              <span>${u.tournament}</span>
            </div>
          </div>
          <span class="sp-upcoming-time">${u.time}</span>
          <button class="sp-upcoming-remind" onclick="event.stopPropagation(); this.textContent='✓ Set'; this.style.color='#00d084'; this.style.borderColor='rgba(0,208,132,0.4)';">🔔 Remind</button>
        </div>
      `;
    }).join('');
  }

  // ── Animation overlay trigger ──
  function triggerAnimation(type, match) {
    const container = document.getElementById('sports-anim-container');
    if (!container) return;

    let emoji = '', text = '', color = '';
    if (type === 'goal') { emoji = '⚽'; text = 'GOAL!'; color = '#00d084'; }
    else if (type === 'six') { emoji = '🏏'; text = 'SIX!'; color = '#14d1ff'; }
    else if (type === 'four') { emoji = '🏏'; text = 'FOUR!'; color = '#ffd700'; }
    else return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column;
      align-items:center; justify-content:center; pointer-events:none;
      background: radial-gradient(circle, rgba(0,0,0,0.5), transparent 70%);
      animation: sp-anim-fade 3.5s ease both;
    `;
    overlay.innerHTML = `
      <style>
        @keyframes sp-anim-fade { 0%{opacity:0;transform:scale(0.5)} 15%{opacity:1;transform:scale(1.1)} 25%{transform:scale(1)} 75%{opacity:1} 100%{opacity:0} }
        @keyframes sp-bounce-in { 0%{transform:translateY(40px);opacity:0} 50%{transform:translateY(-10px)} 100%{transform:translateY(0);opacity:1} }
      </style>
      <div style="font-size:80px; animation: sp-bounce-in 0.5s ease both;">${emoji}</div>
      <div style="font-family:'Montserrat',sans-serif; font-size:52px; font-weight:900; color:${color};
                  text-shadow:0 0 40px ${color}; letter-spacing:-0.02em; animation: sp-bounce-in 0.5s 0.1s ease both;">${text}</div>
      <div style="color:rgba(255,255,255,0.7); font-size:18px; font-weight:700; margin-top:12px; animation: sp-bounce-in 0.5s 0.2s ease both;">
        ${match.homeTeam} vs ${match.awayTeam}
      </div>
    `;
    container.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3500);
  }

  // ── Fetch & render ──
  async function fetchAndRenderMatches() {
    if (!window.SportsAPI) {
      console.error("SportsAPI is not loaded.");
      return;
    }

    const matches = await window.SportsAPI.getLiveMatches();
    allMatches = matches || [];

    // Update stats
    const liveMatches = allMatches.filter(m => m.status && m.status.toUpperCase().includes('LIVE'));
    const liveCountEl = document.getElementById('sp-live-count');
    const todayCountEl = document.getElementById('sp-today-count');
    if (liveCountEl) liveCountEl.textContent = liveMatches.length;
    if (todayCountEl) todayCountEl.textContent = allMatches.length + UPCOMING.length;

    // Update hero featured match
    const featuredPool = liveMatches.length > 0 ? liveMatches.slice(0, 5) : allMatches.slice(0, 5);
    if (carouselInterval) clearInterval(carouselInterval);
    if (featuredPool.length > 0) {
      currentHeroIndex = 0;
      renderHeroFeatured(featuredPool[currentHeroIndex]);
      carouselInterval = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % featuredPool.length;
        renderHeroFeatured(featuredPool[currentHeroIndex]);
      }, 5000);
    } else {
      renderHeroFeatured(null);
    }

    // Trigger animations
    allMatches.forEach(match => {
      if (match.animationTrigger) {
        triggerAnimation(match.animationTrigger, match);
      }
    });

    renderAISuggestions(allMatches);
    renderMatchGrid(allMatches);
  }

  // ── Render AI Suggestions ──
  function renderAISuggestions(matches) {
    const container = document.getElementById('ai-suggestions-grid');
    if (!container) return;
    
    // Pick top 4 popular matches
    const popularLeagues = ['FIFA World Cup 2026', 'IPL 2026', 'Champions League', 'Premier League', 'T20 International'];
    let suggestions = matches.filter(m => popularLeagues.some(l => m.tournament.includes(l)));
    if (suggestions.length === 0) suggestions = matches.slice(0, 4);
    else suggestions = suggestions.slice(0, 4);

    if (suggestions.length === 0) {
      container.parentElement.style.display = 'none';
      return;
    }

    container.parentElement.style.display = 'block';
    container.innerHTML = suggestions.map(match => {
      const isLive = match.status && (match.status.toUpperCase().includes('LIVE') || match.status === 'LIVE');
      return `
        <div class="sp-ai-card" style="min-width:280px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; cursor:pointer; transition:transform 0.2s;" onclick="Router.navigate('sports-stream', {id: '${match.matchId}'})" onmouseover="this.style.transform='scale(1.02)'; this.style.borderColor='var(--c-secondary-container)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='rgba(255,255,255,0.08)';">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:10px; font-weight:800; color:var(--c-secondary-container); text-transform:uppercase; letter-spacing:0.1em;">${match.tournament}</span>
            ${isLive ? `<span class="sp-live-dot"></span>` : `<span style="font-size:10px; color:rgba(255,255,255,0.4);">${match.status}</span>`}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
              <img src="${match.homeLogo}" alt="${match.homeTeam}" style="width:40px; height:40px; border-radius:50%; object-fit:contain; background:rgba(0,0,0,0.5);">
              <span style="font-size:12px; font-weight:600; text-align:center;">${match.homeTeam.substring(0,10)}</span>
            </div>
            <div style="font-size:16px; font-weight:800; color:#fff;">${match.score || 'vs'}</div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
              <img src="${match.awayLogo}" alt="${match.awayTeam}" style="width:40px; height:40px; border-radius:50%; object-fit:contain; background:rgba(0,0,0,0.5);">
              <span style="font-size:12px; font-weight:600; text-align:center;">${match.awayTeam.substring(0,10)}</span>
            </div>
          </div>
          <div style="margin-top:16px; text-align:center;">
            <button style="width:100%; padding:8px; border-radius:6px; background:rgba(20,209,255,0.1); color:var(--c-secondary-container); font-weight:700; border:1px solid rgba(20,209,255,0.2);">Watch Now</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Render hero featured match ──
  function renderHeroFeatured(match) {
    const container = document.getElementById('sp-hero-featured');
    if (!container) return;
    if (!match) {
      container.innerHTML = '';
      return;
    }

    const meta = sportMeta[match.sportType] || { emoji: '🏆', color: '#00d084' };
    const isLive = match.status && (match.status.toUpperCase().includes('LIVE') || match.status === 'LIVE');
    const viewers = Math.floor(Math.random() * 90 + 10) + 'K';

    const homeLogoHtml = match.homeLogo
      ? `<img src="${match.homeLogo}" alt="${match.homeTeam}" class="sp-hero-team-logo" onerror="this.style.display='none'; this.nextSibling.style.display='flex';">
         <div class="sp-team-abbr" style="display:none">${(match.homeTeam || '?').substring(0,3).toUpperCase()}</div>`
      : `<div class="sp-team-abbr">${(match.homeTeam || '?').substring(0,3).toUpperCase()}</div>`;

    const awayLogoHtml = match.awayLogo
      ? `<img src="${match.awayLogo}" alt="${match.awayTeam}" class="sp-hero-team-logo" onerror="this.style.display='none'; this.nextSibling.style.display='flex';">
         <div class="sp-team-abbr" style="display:none">${(match.awayTeam || '?').substring(0,3).toUpperCase()}</div>`
      : `<div class="sp-team-abbr">${(match.awayTeam || '?').substring(0,3).toUpperCase()}</div>`;

    container.innerHTML = `
      <div class="sp-hero-match">
        <div class="sp-hero-match-top">
          <span class="sp-hero-match-tournament">${meta.emoji} ${match.tournament}</span>
          ${isLive
            ? `<span class="sp-hero-live-badge"><span class="sp-live-dot" style="width:7px;height:7px;"></span> LIVE</span>`
            : `<span style="font-size:11px;color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.05);border-radius:999px;padding:4px 12px;font-weight:700;">${match.status}</span>`
          }
        </div>
        <div class="sp-hero-teams">
          <div class="sp-hero-team">
            <div class="sp-team-logo-wrap" style="width:64px;height:64px">${homeLogoHtml}</div>
            <div class="sp-hero-team-name">${match.homeTeam}</div>
          </div>
          <div class="sp-hero-vs">
            <div class="sp-hero-score">${match.score}</div>
            <div class="sp-hero-vs-text">vs</div>
          </div>
          <div class="sp-hero-team">
            <div class="sp-team-logo-wrap" style="width:64px;height:64px">${awayLogoHtml}</div>
            <div class="sp-hero-team-name">${match.awayTeam}</div>
          </div>
        </div>
        <div class="sp-hero-match-footer">
          <div class="sp-hero-viewers">
            <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
            <span>${viewers} watching</span>
          </div>
          <button class="sp-hero-watch-btn" onclick="Router.navigate('sports-stream', {id: '${match.matchId}'})">
            <span class="material-symbols-outlined icon-fill" style="font-size:18px;">play_circle</span>
            Watch Live
          </button>
        </div>
      </div>
    `;
  }

  // ── Render match grid (with filtering & grouping) ──
  function renderMatchGrid(matches) {
    const container = document.getElementById('live-matches-container');
    if (!container) return;

    let filtered = currentSport === 'all'
      ? matches
      : matches.filter(m => m.sportType === currentSport || m.tournament.toLowerCase().includes(currentSport));

    if (searchQuery) {
      filtered = filtered.filter(m => 
        (m.homeTeam && m.homeTeam.toLowerCase().includes(searchQuery)) ||
        (m.awayTeam && m.awayTeam.toLowerCase().includes(searchQuery)) ||
        (m.tournament && m.tournament.toLowerCase().includes(searchQuery))
      );
    }

    if (!filtered || filtered.length === 0) {
      container.innerHTML = `
        <div class="sp-no-matches">
          <div class="sp-no-matches-icon">📡</div>
          <div class="sp-no-matches-text">No matches found</div>
          <div class="sp-no-matches-sub">Check back later for live coverage</div>
        </div>
      `;
      return;
    }

    // Group by tournament
    const groups = {};
    filtered.forEach(m => {
      const t = m.tournament || 'Other';
      if (!groups[t]) groups[t] = [];
      groups[t].push(m);
    });

    // Priority order for rendering groups
    const priority = ['FIFA World Cup 2026', 'IPL 2026', 'T20 International', 'UEFA Champions League', 'Premier League', 'ODI International'];
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    container.innerHTML = sortedGroups.map(tournament => `
      <div style="margin-bottom: 32px;">
        <h3 class="text-headline-sm" style="margin-bottom: 16px; border-left: 4px solid var(--c-primary-container); padding-left: 12px;">${tournament}</h3>
        <div class="sp-live-grid">
          ${groups[tournament].map(match => buildMatchCard(match)).join('')}
        </div>
      </div>
    `).join('');
  }

  // ── Build a single match card HTML ──
  function buildMatchCard(match) {
    const meta = sportMeta[match.sportType] || { emoji: '🏆', color: '#00d084' };
    const isLive = match.status && (match.status.toUpperCase().includes('LIVE') || match.status === 'LIVE');
    const viewers = Math.floor(Math.random() * 90 + 10) + 'K';

    const homeLogoHtml = match.homeLogo
      ? `<img src="${match.homeLogo}" alt="${match.homeTeam}" class="sp-team-logo" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\'sp-team-abbr\'>${(match.homeTeam||'?').substring(0,3).toUpperCase()}</div>'">`
      : `<div class="sp-team-abbr">${(match.homeTeam || '?').substring(0,3).toUpperCase()}</div>`;

    const awayLogoHtml = match.awayLogo
      ? `<img src="${match.awayLogo}" alt="${match.awayTeam}" class="sp-team-logo" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\'sp-team-abbr\'>${(match.awayTeam||'?').substring(0,3).toUpperCase()}</div>'">`
      : `<div class="sp-team-abbr">${(match.awayTeam || '?').substring(0,3).toUpperCase()}</div>`;

    return `
      <div class="sp-match-card" onclick="Router.navigate('sports-stream', {id: '${match.matchId}'})">
        <div class="sp-match-card-inner">
          <div class="sp-match-header">
            <div class="sp-match-tournament">
              <span class="sp-match-sport-badge">${meta.emoji}</span>
              <span>${match.tournament}</span>
            </div>
            ${isLive
              ? `<div class="sp-status-live"><span class="sp-live-dot"></span>LIVE</div>`
              : `<div class="sp-status-ft">${match.status}</div>`
            }
          </div>

          <div class="sp-match-teams">
            <div class="sp-team">
              <div class="sp-team-logo-wrap">${homeLogoHtml}</div>
              <div class="sp-team-name">${match.homeTeam}</div>
            </div>
            <div class="sp-score-center">
              <div class="sp-score">${match.score}</div>
              <div class="sp-score-label">${isLive ? '● LIVE' : 'Final'}</div>
            </div>
            <div class="sp-team">
              <div class="sp-team-logo-wrap">${awayLogoHtml}</div>
              <div class="sp-team-name">${match.awayTeam}</div>
            </div>
          </div>

          <div class="sp-match-footer">
            <div class="sp-match-viewers">
              <span class="material-symbols-outlined" style="font-size:14px;">visibility</span>
              ${viewers} watching
            </div>
            <button class="sp-match-watch-btn">
              <span class="material-symbols-outlined icon-fill" style="font-size:14px;">play_arrow</span>
              Watch
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function cleanup() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (carouselInterval) clearInterval(carouselInterval);
  }

  return { init, cleanup };
})();

window.SportsPage = SportsPage;
