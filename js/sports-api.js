/* ============================================================
   CineStream — Sports API Real Service (Free Public APIs)
   Fetches live fixtures from ESPN Public endpoints (No Keys Needed)
   ============================================================ */

const SportsAPI = (() => {
  // Store previous matches to detect score changes for animations
  let previousMatches = {};

  async function getLiveMatches() {
    const matches = [];

    // 1. Fetch Football Matches (ESPN Public API - Multiple Leagues)
    const footballEndpoints = [
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
      'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
      'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
      'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/scoreboard'
    ];

    const footballPromises = footballEndpoints.map(url => 
      fetch(url)
        .then(res => res.json())
        .catch(err => { console.warn(`Failed to fetch football data:`, err); return null; })
    );

    // 2. Fetch Cricket Matches (ESPN Public API - International/IPL)
    const cricketEndpoints = [
      '8039', // Internationals
      '8048'  // IPL
    ];

    const cricketPromises = cricketEndpoints.map(league => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/cricket/${league}/scoreboard`)
        .then(res => res.json())
        .catch(err => { console.warn(`Failed to fetch cricket data for ${league}:`, err); return null; })
    );

    // Process all requests in parallel
    const allResults = await Promise.all([...footballPromises, ...cricketPromises]);

    // Parse Football results
    allResults.slice(0, footballEndpoints.length).forEach((data, index) => {
      if (data && data.events) {
        const tournamentName = footballEndpoints[index] === 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard' ? 'FIFA World Cup' :
                                 footballEndpoints[index] === 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard' ? 'Champions League' :
                                 footballEndpoints[index] === 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard' ? 'La Liga' :
                                 footballEndpoints[index] === 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/scoreboard' ? 'Euro 2024' :
                                 'Premier League';
        
        data.events.forEach(event => {
          if (!event.competitions || event.competitions.length === 0) return;
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
                  // Ensure poster fallback uses official posters if available
            const posterUrl = item.poster_path ? `${IMG}${item.poster_path}` : `https://via.placeholder.com/500x750?text=${encodeURIComponent(item.title)}`;
            matches.push({
              matchId: `fb-${event.id}`,
              sportType: 'football',
              tournament: tournamentName,
              homeTeam: homeTeam?.team?.name || 'Home',
              awayTeam: awayTeam?.team?.name || 'Away',
              homeLogo: homeTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${homeTeam?.team?.abbreviation}&backgroundColor=e50914`,
              awayLogo: awayTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${awayTeam?.team?.abbreviation}&backgroundColor=14d1ff`,
              score: `${homeTeam?.score ?? 0} - ${awayTeam?.score ?? 0}`,
              rawScoreHome: parseInt(homeTeam?.score ?? 0, 10),
              rawScoreAway: parseInt(awayTeam?.score ?? 0, 10),
              status: event.status.type.shortDetail,
              poster: posterUrl
            });
        });
      }
    });

    // Parse Cricket results
    allResults.slice(footballEndpoints.length).forEach((data) => {
      if (data && data.events) {
        data.events.forEach(event => {
          if (!event.competitions || event.competitions.length === 0) return;
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
          
          matches.push({
            matchId: `cr-${event.id}`,
            sportType: 'cricket',
            tournament: event.season?.slug || 'Cricket',
            homeTeam: homeTeam?.team?.name || 'Home',
            awayTeam: awayTeam?.team?.name || 'Away',
            homeLogo: homeTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${homeTeam?.team?.abbreviation}&backgroundColor=e50914`,
            awayLogo: awayTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${awayTeam?.team?.abbreviation}&backgroundColor=14d1ff`,
            score: `${homeTeam?.score || '0/0'} vs ${awayTeam?.score || '0/0'}`,
            rawScoreHome: parseInt((homeTeam?.score || '0').split('/')[0], 10),
            rawScoreAway: parseInt((awayTeam?.score || '0').split('/')[0], 10),
            status: event.status.type.shortDetail
          });
        });
      }
    });

    // 2.5 Fetch FanCode Matches from our new Backend Proxy
    // Fetch FanCode matches from our backend proxy and merge into matches array
    try {
      const response = await fetch('/api/sports/fancode');
      const data = await response.json();
      if (data.success && data.matches) {
        data.matches.forEach(fcMatch => {
          // Map FanCode match fields to our internal structure
          matches.push({
            matchId: `fc-${fcMatch.id}`,
            sportType: 'football',
            tournament: fcMatch.tournament || 'FanCode',
            homeTeam: fcMatch.homeTeam || 'Home',
            awayTeam: fcMatch.awayTeam || 'Away',
            homeLogo: fcMatch.homeLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${fcMatch.homeTeam?.substring(0,2)}`,
            awayLogo: fcMatch.awayLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${fcMatch.awayTeam?.substring(0,2)}`,
            score: fcMatch.score || '0 - 0',
            rawScoreHome: parseInt(fcMatch.rawScoreHome ?? '0', 10),
            rawScoreAway: parseInt(fcMatch.rawScoreAway ?? '0', 10),
            status: fcMatch.status || 'LIVE',
            poster: fcMatch.poster || `https://via.placeholder.com/500x750?text=${encodeURIComponent(fcMatch.tournament)}`
          });
        });
      }
    } catch (err) {
      console.error('Failed to fetch FanCode matches:', err);
    }
    function startHeroCarousel() {
      const container = document.getElementById('sp-hero-featured');
      if (!container) return;
      let index = 0;
      const matches = window.DEMO_CONTENT?.filter(m => m.sportType === 'football') || [];
      function render() {
        const match = matches[index % matches.length];
        if (!match) return;
        container.innerHTML = `
          <div class="sp-hero-match">
            <div class="sp-hero-match-top">
              <div class="sp-hero-match-tournament">${match.tournament || 'Live'} • ${match.status}</div>
              <div class="sp-hero-live-badge"><span class="material-symbols-outlined" style="font-size:14px">live_tv</span> LIVE</div>
            </div>
            <div class="sp-hero-teams">
              <div class="sp-hero-team">
                <img src="${match.homeLogo}" alt="${match.homeTeam}" class="sp-hero-team-logo"/>
                <div class="sp-hero-team-name">${match.homeTeam}</div>
              </div>
              <div class="sp-hero-vs"><div class="sp-hero-score">${match.score}</div><div class="sp-hero-vs-text">VS</div></div>
              <div class="sp-hero-team">
                <img src="${match.awayLogo}" alt="${match.awayTeam}" class="sp-hero-team-logo"/>
                <div class="sp-hero-team-name">${match.awayTeam}</div>
              </div>
            </div>
            <div class="sp-hero-match-footer">
              <button class="sp-hero-watch-btn" onclick="Router.navigate('player',{id:'${match.matchId}'})">
                <span class="material-symbols-outlined" style="font-size:16px">play_arrow</span> Watch Now
              </button>
              <div class="sp-hero-viewers"><span class="material-symbols-outlined" style="font-size:14px">people</span> ${match.viewerCount || '--'}</div>
            </div>
          </div>
        `;
      }
      render();
      setInterval(() => { index++; render(); }, 12000); // rotate every 12s
    }
    // Initialize carousel after content load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startHeroCarousel);
    } else {
      startHeroCarousel();
    }Changes for Animations
    // Adjust mobile navigation bar for proper sizing and glass‑morphism effect
    function renderMobileNav(activeRoute) {
      const items = [
        { route: 'home',     icon: 'home',         label: 'Home' },
        { route: 'movies',   icon: 'movie',        label: 'Movies' },
        { route: 'tvshows',  icon: 'tv',           label: 'Shows' },
        { route: 'sports',   icon: 'sports_soccer',label: 'Sports' },
        { route: 'search',   icon: 'search',       label: 'Search' },
        { route: 'account',  icon: 'person',       label: 'Profile' }
      ];
      return `
        <nav class="mobile-nav" style="backdrop-filter:blur(12px);background:rgba(10,12,18,0.85);border-top:1px solid rgba(255,255,255,0.07)">
          ${items.map(item => `
            <div class="mobile-nav-item ${activeRoute===item.route?'active':''}" data-route="${item.route}" onclick="${item.route==='search' ? 'UI.openMobileSearch()' : `Router.navigate('${item.route}')`}">
              <span class="material-symbols-outlined ${activeRoute===item.route?'icon-fill':''}">${item.icon}</span>
              <span class="mobile-nav-label" style="font-size:10px;color:${activeRoute===item.route?'var(--c-primary-container)':'rgba(229,226,225,0.6)'}">${item.label}</span>
            </div>
          `).join('')}
        </nav>
      `;
    }  // Save current state for next poll
      previousMatches[match.matchId] = {
        rawScoreHome: match.rawScoreHome,
        rawScoreAway: match.rawScoreAway
      };
    });

    return matches;
  }

  // --- Simulation Fallback logic ---
  let simFootballScore = 0;
  let simCricketRuns = 120;
  function getSimulationMatches() {
    // Increment scores periodically to trigger UI animations during testing
// Simulation matches placeholder – returns empty array for now
function getSimulationMatches() {
  return [];
}

  async function getMatchDetails(matchId) {
    const matches = await getLiveMatches();
    return matches.find(m => m.matchId === matchId) || null;
  }

  return { getLiveMatches, getMatchDetails };
})();

window.SportsAPI = SportsAPI;
