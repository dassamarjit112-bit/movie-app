/* ============================================================
   CineStream — Sports Stream Player Controller
   Manages server selection, live score overlay polling,
   and embed iframe injection via SportsScraper.
   ============================================================ */

const SportsStreamPage = (() => {
  let pollInterval = null;
  let currentMatchId = null;
  let activeServerId = 'vidsrc';
  let videojsPlayer = null;

  async function init(params) {
    const matchId = params && params.id;
    if (!matchId) {
      Router.navigate('sports');
      return;
    }
    currentMatchId = matchId;

    // Load match details for the header overlay and check if it's a FanCode match
    let isFancodeMatch = false;
    if (window.SportsAPI) {
      const matchDetails = await window.SportsAPI.getMatchDetails(matchId);
      if (matchDetails) {
        updateHeader(matchDetails);
        if (matchDetails.isFancode && matchDetails.streamUrl) {
          isFancodeMatch = true;
          activeServerId = 'fancode';
        }
      }
    }

    // Build server selector buttons
    renderServerButtons();

    // Load stream with default or matched server
    loadStream(activeServerId);

    // Poll to keep score updated every 15s
    pollInterval = setInterval(async () => {
      if (!window.SportsAPI) return;
      const matches = await window.SportsAPI.getLiveMatches();
      const updated = matches.find(m => m.matchId === currentMatchId);
      if (updated) updateHeader(updated);
    }, 15000);
  }

  function renderServerButtons() {
    const container = document.getElementById('server-selector-buttons');
    if (!container || !window.SportsScraper) return;

    const servers = window.SportsScraper.getServers();
    container.innerHTML = servers.map(server => `
      <button
        class="server-btn ${server.id === activeServerId ? 'active' : ''}"
        id="server-btn-${server.id}"
        onclick="SportsStreamPage.switchServer('${server.id}')">
        <span>${server.icon}</span>
        <span>${server.name}</span>
        <span class="server-badge">${server.description}</span>
      </button>
    `).join('');
  }

  function switchServer(serverId) {
    activeServerId = serverId;
    // Update button states
    document.querySelectorAll('.server-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`server-btn-${serverId}`);
    if (activeBtn) activeBtn.classList.add('active');
    // Reload stream with new server
    loadStream(serverId);
  }

  async function loadStream(serverId) {
    const iframe = document.getElementById('live-embed-frame');
    const nativeContainer = document.getElementById('native-video-container');
    const loadingEl = document.getElementById('stream-loading');

    if (!iframe || !nativeContainer || !window.SportsScraper) return;

    // Show loading spinner
    if (loadingEl) loadingEl.style.display = 'flex';

    let streamType = 'iframe';
    let streamUrl = '';

    if (serverId === 'fancode') {
      streamType = 'native_hls';
      const matchDetails = window.SportsAPI ? await window.SportsAPI.getMatchDetails(currentMatchId) : null;
      if (matchDetails && matchDetails.streamUrl) {
        streamUrl = matchDetails.streamUrl;
      } else {
        // Fallback if no valid Fancode URL
        streamType = 'iframe';
        streamUrl = window.SportsScraper.getStreamUrl(currentMatchId, 'vidsrc');
      }
    } else {
      streamType = 'iframe';
      streamUrl = window.SportsScraper.getStreamUrl(currentMatchId, serverId);
    }

    setTimeout(() => {
      if (streamType === 'iframe') {
        // Switch to iframe
        nativeContainer.style.display = 'none';
        if (videojsPlayer) {
          videojsPlayer.pause();
        }
        
        iframe.style.display = 'block';
        iframe.src = streamUrl;
      } else {
        // Switch to native HLS with video.js
        iframe.style.display = 'none';
        iframe.src = '';
        nativeContainer.style.display = 'block';
        
        if (window.videojs) {
          if (!videojsPlayer) {
            videojsPlayer = window.videojs('native-video-player', {
              controls: true,
              autoplay: true,
              fluid: true,
              preload: 'auto',
              html5: { vhs: { overrideNative: true } }
            });
          }
          videojsPlayer.src({ src: streamUrl, type: 'application/x-mpegURL' });
          videojsPlayer.play().catch(e => console.warn('Video.js play error:', e));
        } else {
          console.error("Video.js is not loaded.");
        }
      }

      // Hide loading overlay after giving player time to start loading
      setTimeout(() => {
        if (loadingEl) loadingEl.style.display = 'none';
      }, 2500);
    }, 300);
  }

  function updateHeader(match) {
    const el = (id) => document.getElementById(id);
    if (el('stream-tournament')) el('stream-tournament').textContent = match.tournament;
    if (el('stream-status'))     el('stream-status').textContent = match.status;
    if (el('stream-home-team'))  el('stream-home-team').textContent = match.homeTeam;
    if (el('stream-home-logo'))  el('stream-home-logo').src = match.homeLogo;
    if (el('stream-away-team'))  el('stream-away-team').textContent = match.awayTeam;
    if (el('stream-away-logo'))  el('stream-away-logo').src = match.awayLogo;
    if (el('stream-score'))      el('stream-score').textContent = match.score;
  }

  function cleanup() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    const iframe = document.getElementById('live-embed-frame');
    if (iframe) iframe.src = '';
  }

  return { init, cleanup, switchServer };
})();

window.SportsStreamPage = SportsStreamPage;
