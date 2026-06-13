/* ============================================================
   CineStream — Sports Stream Player Controller
   Manages app intent redirect and download for CricZ TV.
   ============================================================ */

const SportsStreamPage = (() => {
  let pollInterval = null;
  let currentMatchId = null;

  async function init(params) {
    const matchId = params && params.id;
    if (!matchId) {
      Router.navigate('sports');
      return;
    }
    currentMatchId = matchId;

    // Load match details for the header overlay
    if (window.SportsAPI) {
      const matchDetails = await window.SportsAPI.getMatchDetails(matchId);
      if (matchDetails) {
        updateHeader(matchDetails);
      }
    }

    // Setup redirect logic
    const watchBtn = document.getElementById('btn-watch-app');
    const websiteBtn = document.getElementById('btn-website-download');
    
    const intentUrl = `intent://match/${currentMatchId}#Intent;scheme=cricztv;package=com.cricztv.app;end`;
    
    // Fallback URL explicitly forces the external Android browser to open the download website
    // Using Intent to view the URL in an external browser avoids WebView restrictions.
    const websiteUrl = `https://sdcinestream.qzz.io`;
    const externalBrowserIntent = `intent://${websiteUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;

    const triggerExternalDownload = () => {
      const downloadAnim = document.getElementById('download-animation');
      const btnGroup = document.getElementById('btn-group');
      if (btnGroup) btnGroup.style.display = 'none';
      if (downloadAnim) downloadAnim.style.display = 'flex';
      
      // Attempt to open the external browser so the Android system package installer can take over smoothly
      window.location.href = externalBrowserIntent;
      
      // Fallback: If external intent fails, try a direct web link
      setTimeout(() => {
        window.location.href = websiteUrl;
      }, 1000);

      // Bring back buttons after some time
      setTimeout(() => {
        if (btnGroup) btnGroup.style.display = 'flex';
        if (downloadAnim) downloadAnim.style.display = 'none';
      }, 5000);
    };

    const attemptIntent = () => {
      // Check if browser went to background (meaning app opened)
      let hidden = false;
      const onHide = () => { hidden = true; };
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('blur', onHide);

      window.location.href = intentUrl;
      
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('blur', onHide);
        // If still visible, app did not open, fallback to website download
        if (!hidden && document.visibilityState === 'visible') {
           triggerExternalDownload();
        }
      }, 2000);
    };

    // Auto attempt to open the app directly on page load if on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setTimeout(() => attemptIntent(), 500); // brief delay before redirect
    }

    if (watchBtn) watchBtn.onclick = () => attemptIntent();
    if (websiteBtn) websiteBtn.onclick = () => triggerExternalDownload();

    // Poll to keep score updated every 15s
    pollInterval = setInterval(async () => {
      if (!window.SportsAPI) return;
      const matches = await window.SportsAPI.getLiveMatches();
      const updated = matches.find(m => m.matchId === currentMatchId);
      if (updated) updateHeader(updated);
    }, 15000);
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
  }

  return { init, cleanup };
})();

window.SportsStreamPage = SportsStreamPage;
