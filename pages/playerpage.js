/* CineStream — Player Page Controller */

const PlayerPage = (() => {
  let progressInterval = null;
  let currentContentId = null;
  let videoElement = null;

  async function init(params) {
    const contentId = params.id || '1';
    currentContentId = contentId;
    
    // Check if user is subscribed first
    const session = await window.Auth.getSession();
    if (!session) {
      UI.toast('Please sign in to stream content.', 'info');
      Router.navigate('login');
      return;
    }

    const subscribed = await Subscriptions.isSubscribed(session.user.id);
    if (!subscribed) {
      UI.toast('Active subscription required to stream premium titles.', 'warning');
      Router.navigate('subscribe');
      return;
    }

    // Find stream in Demo Content
    const item = window.DEMO_CONTENT.find(c => c.id === contentId) || window.DEMO_CONTENT[0];

    // Set page header info
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = item.title;

    const subtitleEl = document.getElementById('player-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = params.ep ? `Streaming ${params.ep}` : `Streaming Movie • ${item.genre}`;
    }

    videoElement = document.getElementById('hls-video');
    
    // Initialize the player engine
    window.Player.init(videoElement, item.stream, {
      autoplay: true,
      qualityMenuId: 'quality-menu'
    });

    // Set up control overlay bindings
    window.Player.setupControls('player-container');

    // Retrieve previous progress from Supabase watch history if available
    try {
      const history = await Subscriptions.getWatchHistory(session.user.id);
      const pastRecord = history.find(h => h.content_id === contentId);
      if (pastRecord && pastRecord.progress_seconds > 5) {
        // Wait for metadata loaded, then seek
        const onMetadata = () => {
          videoElement.currentTime = pastRecord.progress_seconds;
          UI.toast(`Resumed from ${window.Player.formatTime(pastRecord.progress_seconds)}`, 'info');
          videoElement.removeEventListener('loadedmetadata', onMetadata);
        };
        videoElement.addEventListener('loadedmetadata', onMetadata);
      }
    } catch (err) {
      console.log('No watch history found or failed to load:', err);
    }

    // Periodically save watch progress
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (videoElement && !videoElement.paused && videoElement.currentTime > 2) {
        Subscriptions.saveProgress(session.user.id, contentId, Math.floor(videoElement.currentTime));
      }
    }, 6000);

    // Overlay controls auto-hide setup
    setupOverlayAutoHide();
  }

  function setupOverlayAutoHide() {
    const container = document.getElementById('player-container');
    const topBar = container.querySelector('.player-top-bar');
    const controls = container.querySelector('.player-controls');
    let timer = null;

    const hide = () => {
      if (videoElement && !videoElement.paused) {
        topBar?.classList.add('hidden');
        controls?.classList.add('hidden');
        container.style.cursor = 'none';
      }
    };

    const resetTimer = () => {
      topBar?.classList.remove('hidden');
      controls?.classList.remove('hidden');
      container.style.cursor = 'default';
      clearTimeout(timer);
      timer = setTimeout(hide, 3000);
    };

    container.addEventListener('mousemove', resetTimer);
    container.addEventListener('touchstart', resetTimer);
    videoElement.addEventListener('pause', resetTimer);
    videoElement.addEventListener('play', resetTimer);

    resetTimer();
  }

  function goBack() {
    // Destroy instance
    window.Player.destroy();
    
    // Clear interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    // Exit Fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Route back to detail view
    Router.navigate('detail', { id: currentContentId });
  }

  return { init, goBack };
})();

window.PlayerPage = PlayerPage;
