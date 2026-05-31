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

    // Find stream in Demo Content (allow numeric/string ID match)
    let item = window.DEMO_CONTENT.find(c => c.id == contentId || c.id == parseInt(contentId));
    if (!item) {
      try {
        if (window.TMDB) {
          // Determine type from params or try movie first then tv
          const type = params.type || (params.ep ? 'tv' : 'movie');
          item = await TMDB.getDetails(contentId, type).catch(() => null) ||
                 await TMDB.getDetails(contentId, type === 'movie' ? 'tv' : 'movie').catch(() => null);
          if (item) {
            window.registerDemoContent(item);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch details directly from TMDB for player:', err);
      }
    }
    if (!item) {
      item = window.DEMO_CONTENT[0];
    }

    // Set page header info
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = item.title;

    const subtitleEl = document.getElementById('player-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = params.ep ? `Streaming ${params.ep}` : `Streaming Movie • ${item.genre}`;
    }

    videoElement = document.getElementById('hls-video');

    // Working public HLS fallbacks so playback always works in demo
    const FALLBACK_STREAMS = [
      'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
      'https://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8',
    ];
    // Determine which streams list to use for the player (fallback if none provided)
    const streamsToUse = (item.streams && item.streams.length) ? item.streams : FALLBACK_STREAMS;
    // Compute a deterministic hash from the content ID (handles alphanumeric IDs)
    const computeHash = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h &= h; // Convert to 32bit integer
      }
      return Math.abs(h);
    };
    const hash = computeHash(contentId);
    const fallbackIndex = hash % FALLBACK_STREAMS.length;
    // Choose primary stream: prefer explicit item.stream, else fallback based on hash
    const primaryStream = item.stream || streamsToUse[fallbackIndex];
    // Initialize the player engine with the selected streams list
    window.Player.init(videoElement, primaryStream, {
      autoplay:      true,
      qualityMenuId: 'quality-menu',
      streams:       streamsToUse
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
