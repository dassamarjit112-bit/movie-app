/* CineStream — Player Page Controller */

const PlayerPage = (() => {
  let progressInterval = null;
  let currentContentId = null;
  let videoElement = null;
  let availableStreams = [];
  let activeStreamIndex = 0;

  async function init(params) {
    const contentId = params.id;
    const contentType = params.type || 'movie'; // 'movie' or 'series'
    currentContentId = contentId;
    window._playerContentType = contentType; // store for goBack()

    if (!contentId) {
      UI.toast('No content specified.', 'error');
      Router.navigate('home');
      return;
    }
    
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

    // Always fetch fresh details from TMDB — never rely on demo/cached content
    let item = null;
    try {
      if (window.TMDB) {
        const tmdbType = contentType === 'series' ? 'tv' : 'movie';
        item = await TMDB.getDetails(contentId, tmdbType);
      }
    } catch (err) {
      console.warn('Failed to fetch details from TMDB for player:', err);
    }
    // Try the other type if the first fails
    if (!item && window.TMDB) {
      try {
        const altType = contentType === 'series' ? 'movie' : 'tv';
        item = await TMDB.getDetails(contentId, altType);
      } catch (err) {}
    }
    if (!item) {
      UI.toast('Content not found. Please try again.', 'error');
      Router.navigate('home');
      return;
    }

    // Set title and subtitle
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = item.title || 'Loading...';

    const subtitleEl = document.getElementById('player-subtitle');

    videoElement = document.getElementById('hls-video');

    // Resolve episode info from params
    let season = 1, episode = 1;
    if (contentType === 'series') {
      if (params.ep) {
        // Format: 'S1 E2'
        const epMatch = params.ep.match(/S(\d+)\s*E(\d+)/i);
        if (epMatch) {
          season = parseInt(epMatch[1]);
          episode = parseInt(epMatch[2]);
        }
      } else {
        season = parseInt(params.season) || 1;
        episode = parseInt(params.episode) || 1;
      }
    }

    if (subtitleEl) {
      subtitleEl.textContent = contentType === 'series'
        ? `Season ${season} · Episode ${episode}`
        : `Movie · ${item.genre || ''}`;
    }

    // Fetch real embed streams via TMDB
    let embedStreams = [];
    try {
      if (contentType === 'series') {
        embedStreams = await TMDB.getRegionalStreams(contentId, season, episode);
      } else {
        embedStreams = await TMDB.getRegionalStreams(contentId, null, null);
      }
    } catch (e) {
      console.warn('Could not fetch embed streams:', e);
    }

    if (!embedStreams || embedStreams.length === 0) {
      UI.toast('No streams available for this title.', 'error');
      Router.navigate('home');
      return;
    }

    let primaryStream = embedStreams[0];

    // All streams are embed iframes (2embed, vidsrc, vidlink, vixsrc)
    const isIframeStream = true; // always use iframe for these embed servers
    const iframeElement = document.getElementById('iframe-video');
    const controlsContainer = document.querySelector('.player-controls');

    availableStreams = embedStreams;
    activeStreamIndex = 0;

    // Render server selector buttons
    renderServerButtons();

    // Set initial server name on switch button (legacy fallback)
    const switchBtn = document.getElementById('switch-server-btn');
    if (switchBtn) {
      switchBtn.style.display = 'none'; // replaced by server buttons
    }

    // Always use iframe for embed servers
    if (videoElement) videoElement.style.display = 'none';
    if (controlsContainer) controlsContainer.style.display = 'none';

    const spinner = document.getElementById('buffer-spinner');
    if (spinner) spinner.classList.add('hidden');

    // Show and load iframe — ensure it fills the entire screen
    if (iframeElement) {
      iframeElement.style.display = 'block';
      iframeElement.style.width = '100%';
      iframeElement.style.height = '100%';
      iframeElement.style.position = 'absolute';
      iframeElement.style.inset = '0';
      iframeElement.src = primaryStream;
    }

    // Auto fullscreen + landscape for all devices (series & movies)
    const playerContainer = document.getElementById('player-container');
    const tryFullscreen = () => {
      if (playerContainer) {
        if (playerContainer.requestFullscreen) {
          playerContainer.requestFullscreen().catch(() => {});
        } else if (playerContainer.webkitRequestFullscreen) {
          playerContainer.webkitRequestFullscreen();
        } else if (playerContainer.mozRequestFullScreen) {
          playerContainer.mozRequestFullScreen();
        }
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      // Lock landscape orientation (works on Android Chrome/WebApp)
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      } else if (screen.lockOrientation) {
        screen.lockOrientation('landscape');
      } else if (screen.mozLockOrientation) {
        screen.mozLockOrientation('landscape');
      }
    };
    // Delay slightly to allow iframe to initialize
    setTimeout(tryFullscreen, 400);

    // Dummy block close (keeps remaining code intact)
    {

      // Build the full stream list for this title
      availableStreams = [primaryStream, ...streamsToUse.filter(s => s !== primaryStream)];
        // If Hollywood, prioritize server #3 (index 2) and then servers #5 and #6 (indices 4 and 5)
        if (isHollywood) {
          const preferred = [];
          // server #3
          if (availableStreams[2]) preferred.push(availableStreams[2]);
          // servers #5 and #6
          if (availableStreams[4]) preferred.push(availableStreams[4]);
          if (availableStreams[5]) preferred.push(availableStreams[5]);
          const rest = availableStreams.filter((_, i) => i !== 2 && i !== 4 && i !== 5);
          availableStreams = [...preferred, ...rest];
        }
      activeStreamIndex = 0;

      const switchBtn = document.getElementById('switch-server-btn');
      if (switchBtn) {
        switchBtn.style.display = availableStreams.length > 1 ? 'flex' : 'none';
      }

      // Auto‑fallback timer – if video hasn't started playing within 3 s, try the next server
      let fallbackTimer = setTimeout(() => {
        if (videoElement && videoElement.paused && !videoElement.ended) {
          UI.toast('Stream is slow, switching server automatically…', 'info');
          switchServer();
        }
      }, 3000);

      // Show spinner initially (if exists)
      const spinner = document.getElementById('buffer-spinner');
      let loadingTimer = null;
      if (spinner) {
        spinner.classList.remove('hidden');
        loadingTimer = setTimeout(() => {
          spinner.classList.add('hidden');
        }, 5000);
      }

      // Clear loading timer once playback starts
      const onPlayClear = () => {
        if (loadingTimer) {
          clearTimeout(loadingTimer);
          loadingTimer = null;
        }
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        videoElement.removeEventListener('play', onPlayClear);
      };
      videoElement.addEventListener('play', onPlayClear);

        // Detect possible ad URLs and handle them with auto‑fullscreen, landscape, and audio unmute
        const handleAds = (url) => {
          if (!url) return;
          if (/ad|ads|adservice|doubleclick/i.test(url)) {
            // Open ad in a new tab, then close after short delay and resume playback
            const adWin = window.open(url, '_blank');
            setTimeout(() => {
              if (adWin && !adWin.closed) adWin.close();
              // Ensure video is unmuted and set to fullscreen/landscape before resuming
              if (videoElement) {
                videoElement.muted = false;
                videoElement.volume = 1.0;
                videoElement.play().catch(() => {});
                // Request fullscreen and lock landscape
                const container = document.getElementById('player-container');
                if (container && container.requestFullscreen) {
                  container.requestFullscreen().catch(() => {});
                }
                if (screen.orientation && screen.orientation.lock) {
                  screen.orientation.lock('landscape').catch(() => {});
                }
              }
            }, 5000);
          }
        };

      // Apply ad handling for the initial stream
      handleAds(primaryStream);

      // Initialize the player
      // Helper to enforce fullscreen and landscape orientation
function enforceFullScreenLandscape() {
  const container = document.getElementById('player-container');
  if (container && container.requestFullscreen) {
    container.requestFullscreen().catch(() => {});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
  // Ensure video fills the container
  if (videoElement) {
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'contain';
  }
}

// Restore fullscreen/landscape on page show (e.g., after navigation back)
window.addEventListener('pageshow', (event) => {
  // If we previously entered fullscreen, reapply
  if (sessionStorage.getItem('playerFullScreen') === 'true') {
    enforceFullScreenLandscape();
  }
});
// Also handle when the tab becomes visible again (e.g., user switches back)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && sessionStorage.getItem('playerFullScreen') === 'true') {
    enforceFullScreenLandscape();
  }
});

// When entering fullscreen, store the flag
function setFullScreenFlag() {
  sessionStorage.setItem('playerFullScreen', 'true');
}

// Hook into player init flow – after player is ready
function onPlayerReady() {
  enforceFullScreenLandscape();
  setFullScreenFlag();
}

      // If returning from another page, enforce fullscreen/landscape immediately
      if (sessionStorage.getItem('playerFullScreen') === 'true') {
        enforceFullScreenLandscape();
      }

      // Initialize the player with onReady callback
      window.Player.init(videoElement, primaryStream, {
        autoplay: true,
        qualityMenuId: 'quality-menu',
        streams: availableStreams,
        withCredentials: true,
        requestHeaders: {
          'Accept': '*/*',
          'Origin': window.location.origin
        },
        onReady: onPlayerReady
      }); window.Player.setupControls('player-container');
      // Force landscape orientation for immersive experience
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }


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
          Subscriptions.saveProgress(session.user.id, contentId, Math.floor(videoElement.currentTime), contentType);
        }
      }, 6000);
    }

    // Overlay controls auto-hide setup (for the top back button)
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
    // Save current progress before leaving
    if (videoElement && videoElement.currentTime > 5 && session && session.user) {
      Subscriptions.saveProgress(session.user.id, contentId, Math.floor(videoElement.currentTime));
    }
    // Destroy instance
    if (window.Player && typeof window.Player.destroy === 'function') {
      window.Player.destroy();
    }
    
    // Clear iframe to stop playback immediately
    const iframeElement = document.getElementById('iframe-video');
    if (iframeElement) iframeElement.src = '';
    
    // Clear interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    // Exit Fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Route back to detail view — must pass type so detail page reloads correctly
    Router.navigate('detail', { id: currentContentId, type: window._playerContentType || 'movie' });
  }

  function switchServer(idx) {
    if (!availableStreams || availableStreams.length === 0) {
      UI.toast('No alternative servers available.', 'info');
      return;
    }
    if (idx !== undefined) {
      activeStreamIndex = idx;
    } else {
      activeStreamIndex = (activeStreamIndex + 1) % availableStreams.length;
    }
    const newStream = availableStreams[activeStreamIndex];
    UI.toast(`Switched to Server ${activeStreamIndex + 1}`, 'info');

    const iframeElement = document.getElementById('iframe-video');
    if (iframeElement) {
      iframeElement.src = newStream;
    }

    // Update active server button highlight
    renderServerButtons();
  }

  function renderServerButtons() {
    // Show a single cycling button that displays the CURRENT server name.
    // Clicking it advances to the next server.
    const container = document.getElementById('server-buttons');
    if (!container || !availableStreams || availableStreams.length === 0) return;

    const serverNames = ['2Embed', 'VidLink'];
    const currentName = serverNames[activeStreamIndex] || `Server ${activeStreamIndex + 1}`;
    const nextIndex = (activeStreamIndex + 1) % availableStreams.length;
    const nextName  = serverNames[nextIndex] || `Server ${nextIndex + 1}`;

    container.innerHTML = `
      <button
        id="server-cycle-btn"
        onclick="PlayerPage.switchServer()"
        title="Switch to ${nextName}"
        style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid rgba(20,209,255,0.5);
          background: rgba(20,209,255,0.12);
          color: #14d1ff;
          transition: all 0.2s;
          white-space: nowrap;
        "
      >
        <span class="material-symbols-outlined" style="font-size:15px;">dns</span>
        Server: ${currentName}
        <span style="opacity:0.55; font-size:10px; margin-left:2px;">→ ${nextName}</span>
      </button>`;
  }

  return { init, goBack, switchServer, renderServerButtons };
})();

window.PlayerPage = PlayerPage;
