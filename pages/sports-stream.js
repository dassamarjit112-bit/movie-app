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
    const directDownloadBtn = document.getElementById('btn-direct-download');
    const websiteBtn = document.getElementById('btn-website-download');
    
    const intentUrl = `intent://match/${currentMatchId}#Intent;scheme=cricztv;package=com.cricztv.app;end`;
    
    const websiteUrl = `https://sdcinestream.qzz.io`;
    const externalBrowserIntent = `intent://${websiteUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;

    const showLoading = () => {
      const downloadAnim = document.getElementById('download-animation');
      const btnGroup = document.getElementById('btn-group');
      if (btnGroup) btnGroup.style.display = 'none';
      if (downloadAnim) downloadAnim.style.display = 'flex';
      
      // Bring back buttons after some time
      setTimeout(() => {
        if (btnGroup) btnGroup.style.display = 'flex';
        if (downloadAnim) downloadAnim.style.display = 'none';
      }, 5000);
    };

    const triggerExternalDownload = () => {
      showLoading();
      window.location.href = externalBrowserIntent;
      setTimeout(() => {
        window.location.href = websiteUrl;
      }, 1000);
    };

    const triggerDirectDownload = () => {
      showLoading();
      // Directly download the APK to phone storage
      const a = document.createElement('a');
      a.href = "/CricZ TV.apk";
      a.download = "CricZ TV.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Fallback intent direct download
      setTimeout(() => {
        const directApkUrl = window.location.origin + "/CricZ%20TV.apk";
        const externalApkIntent = `intent://${directApkUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
        window.location.href = externalApkIntent;
      }, 1500);
    };

    const attemptIntent = () => {
      let hidden = false;
      const onHide = () => { hidden = true; };
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('blur', onHide);

      window.location.href = intentUrl;
      
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('blur', onHide);
      }, 2000);
    };

    // No auto-redirect on page load as requested.
    
    if (watchBtn) watchBtn.onclick = () => attemptIntent();
    if (directDownloadBtn) directDownloadBtn.onclick = () => triggerDirectDownload();
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
