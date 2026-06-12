/* ============================================================
   CineStream — Sports Dashboard Controller
   ============================================================ */

const SportsPage = (() => {
  let pollingInterval = null;

  function init() {
    // Render static layout
    document.getElementById('navbar-mount').innerHTML = window.UI.renderNavbar('sports');
    document.getElementById('footer-mount').innerHTML = window.UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = window.UI.renderMobileNav('sports');
    window.UI.updateNavbarUser();

    // Fetch initial matches
    fetchAndRenderMatches();

    // Set up rapid polling every 15 seconds for instant live updates
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchAndRenderMatches, 15000);
  }

  function triggerAnimation(type, match) {
    const container = document.getElementById('sports-anim-container');
    if (!container) return;
    
    let emoji = '';
    let text = '';
    let animClass = '';
    
    if (type === 'goal') {
      emoji = '⚽';
      text = 'GOAL!';
      animClass = 'anim-ball-football';
    } else if (type === 'six') {
      emoji = '🏏';
      text = 'SIX!';
      animClass = 'anim-ball-cricket';
    } else if (type === 'four') {
      emoji = '🏏';
      text = 'FOUR!';
      animClass = 'anim-ball-cricket';
    } else {
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'anim-overlay active';
    overlay.innerHTML = `
      <div class="${animClass}">${emoji}</div>
      <div class="anim-text">${text}</div>
      <div style="color:#fff; font-size:24px; font-weight:700; margin-top:20px; text-shadow: 0 4px 10px rgba(0,0,0,0.8);">${match.homeTeam} vs ${match.awayTeam}</div>
    `;
    
    container.appendChild(overlay);
    
    // Play a sound if we had one, for now just show UI
    
    // Remove after animation finishes
    setTimeout(() => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    }, 3500);
  }

  async function fetchAndRenderMatches() {
    if (!window.SportsAPI) {
        console.error("SportsAPI is not loaded.");
        return;
    }
    
    const matches = await window.SportsAPI.getLiveMatches();
    const grid = document.getElementById('live-matches-grid');
    
    if (!grid) return;
    
    if (matches && matches.length > 0) {
      grid.innerHTML = matches.map(match => {
        // Trigger animations if detected
        if (match.animationTrigger) {
          triggerAnimation(match.animationTrigger, match);
        }

        return `
        <div class="match-card" onclick="Router.navigate('sports-stream', {id: '${match.matchId}'})">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
            <span style="font-size:11px; font-weight:700; color:rgba(229,226,225,0.5); text-transform:uppercase; letter-spacing:0.05em; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px;">
              ${match.tournament}
            </span>
            <span style="font-size:11px; font-weight:800; color:#e50914; letter-spacing:0.1em; animation:pulse-live 2s infinite">
              ● ${match.status}
            </span>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; flex-direction:column; align-items:center; flex:1; gap:8px;">
              <img src="${match.homeLogo}" alt="${match.homeTeam}" class="team-logo" />
              <span style="font-size:12px; font-weight:700; text-align:center; color:#fff">${match.homeTeam}</span>
            </div>
            
            <div style="flex:1; display:flex; justify-content:center;">
              <span class="score-display">${match.score}</span>
            </div>
            
            <div style="display:flex; flex-direction:column; align-items:center; flex:1; gap:8px;">
              <img src="${match.awayLogo}" alt="${match.awayTeam}" class="team-logo" />
              <span style="font-size:12px; font-weight:700; text-align:center; color:#fff">${match.awayTeam}</span>
            </div>
          </div>
        </div>
      `}).join('');
    } else {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:rgba(229,226,225,0.4);">No live matches found at the moment.</div>`;
    }
  }

  // Cleanup when leaving page
  function cleanup() {
      if(pollingInterval) clearInterval(pollingInterval);
  }

  return { init, cleanup };
})();

window.SportsPage = SportsPage;
