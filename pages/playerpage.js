/* CineStream — Player Page Controller
   Enhanced with auto-fallback, server health monitoring,
   and advanced server switching UI */
   
const PlayerPage = (() => {
  let progressInterval = null;
  let currentContentId = null;
  let videoElement = null;
  let availableStreams = [];
  let activeStreamIndex = 0;
  let serverHealthCache = [];
  let autoFallbackTimer = null;
  let failCount = 0;
  const MAX_FAILS_BEFORE_FALLBACK = 2;

  async function init(params) {
    const contentId = params.id;
    const contentType = params.type || 'movie'; // 'movie' or 'series'
    currentContentId = contentId;
    window._playerContentType = contentType;

    if (!contentId) {
      UI.toast('No content specified.', 'error');
      Router.navigate('home');
      return;
    }
    
    // Check if user is subscribed
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

    // Fetch fresh details from TMDB
    let item = null;
    try {
      if (window.TMDB) {
        const tmdbType = contentType === 'series' ? 'tv' : 'movie';
        item = await TMDB.getDetails(contentId, tmdbType);
      }
    } catch (err) {
      console.warn('Failed to fetch details from TMDB for player:', err);
    }
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

    // Show server health status indicator
    showServerStatusBar();

    // Fetch embed streams
    let embedStreams = [];
    try {
      if (contentType === 'series') {
        embedStreams = await TMDB.getRegionalStreams(item, season, episode);
      } else {
        embedStreams = await TMDB.getRegionalStreams(item, null, null);
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
    const isIframeStream = true;
    const iframeElement = document.getElementById('iframe-video');
    const controlsContainer = document.querySelector('.player-controls');

    availableStreams = embedStreams;
    activeStreamIndex = 0;
    failCount = 0;

    // Render server selector buttons with health indicators
    renderServerButtons();

    // Set initial server name on switch button
    const switchBtn = document.getElementById('switch-server-btn');
    if (switchBtn) {
      switchBtn.style.display = availableStreams.length > 1 ? 'flex' : 'none';
    }

    // Use iframe for embed servers
    if (videoElement) videoElement.style.display = 'none';
    if (controlsContainer) controlsContainer.style.display = 'none';

    // Show and load iframe
    if (iframeElement) {
      iframeElement.style.display = 'block';
      iframeElement.style.width = '100%';
      iframeElement.style.height = '100%';
      iframeElement.style.position = 'absolute';
      iframeElement.style.inset = '0';
      iframeElement.src = primaryStream;
    }

    // Auto fullscreen + landscape for all devices
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
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      } else if (screen.lockOrientation) {
        screen.lockOrientation('landscape');
      }
    };
    setTimeout(tryFullscreen, 400);

    // Listen for iframe load errors to auto-switch server
    iframeElement.addEventListener('error', () => {
      failCount++;
      if (failCount >= MAX_FAILS_BEFORE_FALLBACK) {
        UI.toast(`Server ${getServerName(activeStreamIndex)} failed. Auto-switching...`, 'warning');
        autoSwitchToNextServer();
      }
    });

    // Also detect if iframe fails to load content (timeout-based detection)
    let loadTimer = setTimeout(() => {
      // If after 15 seconds the iframe still hasn't loaded content, try next server
      if (failCount < MAX_FAILS_BEFORE_FALLBACK) {
        failCount++;
        if (failCount >= MAX_FAILS_BEFORE_FALLBACK) {
          UI.toast(`Server ${getServerName(activeStreamIndex)} is slow. Auto-switching...`, 'warning');
          autoSwitchToNextServer();
        }
      }
    }, 15000);

    iframeElement.addEventListener('load', () => {
      clearTimeout(loadTimer);
      failCount = 0; // Reset fail count on successful load
      // Hide loading spinner
      const spinner = document.getElementById('buffer-spinner');
      if (spinner) spinner.style.display = 'none';
    });

    // Auto-fallback timer removed per user request
    activeStreamIndex = 0;
    if (switchBtn) {
      switchBtn.style.display = availableStreams.length > 1 ? 'flex' : 'none';
    }

    // Update server status
    updateServerHealthStatus();

    // Show spinner initially
    const spinner = document.getElementById('buffer-spinner');
    let loadingTimer = null;
    if (spinner) {
      spinner.style.display = 'flex';
      loadingTimer = setTimeout(() => {
        spinner.style.display = 'none';
      }, 5000);
    }

    // Clear loading timer once playback starts
    const onPlayClear = () => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
      }
      if (videoElement) {
        videoElement.removeEventListener('play', onPlayClear);
      }
    };
    if (videoElement) {
      videoElement.addEventListener('play', onPlayClear);
    }

    // Handle ads
    const handleAds = (url) => {
      if (!url) return;
      if (/ad|ads|adservice|doubleclick/i.test(url)) {
        const adWin = window.open(url, '_blank');
        setTimeout(() => {
          if (adWin && !adWin.closed) adWin.close();
          if (videoElement) {
            videoElement.muted = false;
            videoElement.volume = 1.0;
            videoElement.play().catch(() => {});
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
    handleAds(primaryStream);

    // Fullscreen helpers
    function enforceFullScreenLandscape() {
      const container = document.getElementById('player-container');
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      }
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
      if (videoElement) {
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'contain';
      }
      const iframe = document.getElementById('iframe-video');
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
      }
    }

    window.addEventListener('pageshow', (event) => {
      if (sessionStorage.getItem('playerFullScreen') === 'true') {
        enforceFullScreenLandscape();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && sessionStorage.getItem('playerFullScreen') === 'true') {
        enforceFullScreenLandscape();
      }
    });

    function setFullScreenFlag() {
      sessionStorage.setItem('playerFullScreen', 'true');
    }

    function onPlayerReady() {
      enforceFullScreenLandscape();
      setFullScreenFlag();
    }

    if (sessionStorage.getItem('playerFullScreen') === 'true') {
      enforceFullScreenLandscape();
    }

    if (!isIframeStream) {
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
      }); 
      window.Player.setupControls('player-container');
    } else {
      enforceFullScreenLandscape();
      setFullScreenFlag();
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }

    // Retrieve previous progress
    let pastRecord = null;
    try {
      const history = await Subscriptions.getWatchHistory(session.user.id);
      pastRecord = history.find(h => h.content_id === contentId);
      if (pastRecord && pastRecord.progress_seconds > 5 && !isIframeStream) {
        const onMetadata = () => {
          videoElement.currentTime = pastRecord.progress_seconds;
          UI.toast(`Resumed from ${window.Player.formatTime(pastRecord.progress_seconds)}`, 'info');
          videoElement.removeEventListener('loadedmetadata', onMetadata);
        };
        videoElement.addEventListener('loadedmetadata', onMetadata);
      }
    } catch (err) {
      console.log('No watch history found:', err);
    }

    if (progressInterval) clearInterval(progressInterval);
    let currentProgress = pastRecord ? pastRecord.progress_seconds : 0;
    if (currentProgress < 10) currentProgress = 10;
    Subscriptions.saveProgress(session.user.id, contentId, currentProgress, contentType);

    progressInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        currentProgress += 6;
        Subscriptions.saveProgress(session.user.id, contentId, currentProgress, contentType);
      }
    }, 6000);

    setupOverlayAutoHide();
  }

  function getServerName(index) {
    const names = [
      'VidSrc', 'VidSrc.ME', '2Embed', 'Embed.su', 'VidLink',
      'AutoEmbed', 'Multi', 'MoviesAPI', 'VidSrc ICU', 'Super',
      'StreamIMDb', 'DBgo'
    ];
    return names[index] || `Server ${index + 1}`;
  }

  function autoSwitchToNextServer() {
    if (!availableStreams || availableStreams.length === 0) return;
    const nextIdx = (activeStreamIndex + 1) % availableStreams.length;
    if (nextIdx === 0) {
      // We've tried all servers, go back to first
      UI.toast('All servers tried. Reverting to Server 1.', 'info');
    }
    switchServer(nextIdx);
    failCount = 0;
  }

  function showServerStatusBar() {
    // Add server status indicator bar
    let statusBar = document.getElementById('server-status-bar');
    if (!statusBar) {
      statusBar = document.createElement('div');
      statusBar.id = 'server-status-bar';
      statusBar.style.cssText = `
        position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%);
        z-index: 35; display: flex; align-items: center; gap: 8px;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
        padding: 4px 12px; font-size: 11px; color: rgba(255,255,255,0.6);
        transition: opacity 0.3s; pointer-events: none;
      `;
      statusBar.innerHTML = `
        <span class="status-dot" style="width:6px;height:6px;border-radius:50%;display:inline-block;"></span>
        <span class="status-text">Checking servers...</span>
      `;
      document.getElementById('player-container')?.appendChild(statusBar);
      
      // Auto-hide status bar after 10 seconds
      setTimeout(() => {
        if (statusBar) {
          statusBar.style.opacity = '0';
          setTimeout(() => { if (statusBar) statusBar.style.display = 'none'; }, 500);
        }
      }, 10000);
    }
  }

  function updateServerHealthStatus() {
    const statusBar = document.getElementById('server-status-bar');
    if (!statusBar) return;
    
    const dot = statusBar.querySelector('.status-dot');
    const text = statusBar.querySelector('.status-text');
    
    if (availableStreams.length > 0) {
      const serverName = getServerName(activeStreamIndex);
      const onlineCount = availableStreams.length - activeStreamIndex;
      if (dot) dot.style.background = '#00d084';
      if (text) text.textContent = `${serverName} • ${availableStreams.length} servers available`;
    }
  }

  function setupOverlayAutoHide() {
    const container = document.getElementById('player-container');
    const topBar = container?.querySelector('.player-top-bar');
    const controls = container?.querySelector('.player-controls');
    let timer = null;

    const hide = () => {
      if (videoElement && !videoElement.paused) {
        topBar?.classList.add('hidden');
        controls?.classList.add('hidden');
        if (container) container.style.cursor = 'none';
      }
    };

    const resetTimer = () => {
      topBar?.classList.remove('hidden');
      controls?.classList.remove('hidden');
      if (container) container.style.cursor = 'default';
      clearTimeout(timer);
      timer = setTimeout(hide, 3000);
    };

    if (container) {
      container.addEventListener('mousemove', resetTimer);
      container.addEventListener('touchstart', resetTimer);
    }
    if (videoElement) {
      videoElement.addEventListener('pause', resetTimer);
      videoElement.addEventListener('play', resetTimer);
    }
    resetTimer();
  }

  function goBack() {
    if (window.Player && typeof window.Player.destroy === 'function') {
      window.Player.destroy();
    }
    const iframeElement = document.getElementById('iframe-video');
    if (iframeElement) iframeElement.src = '';
    
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
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
    UI.toast(`Switched to ${getServerName(activeStreamIndex)}`, 'info');

    const iframeElement = document.getElementById('iframe-video');
    if (iframeElement) {
      iframeElement.src = newStream;
    }

    // Update active server button highlight
    renderServerButtons();
    updateServerHealthStatus();
  }

  function renderServerButtons() {
    const container = document.getElementById('server-buttons');
    if (!container || !availableStreams || availableStreams.length === 0) return;

    const serverNames = [
      'VidSrc', 'VidSrc.ME', '2Embed', 'Embed.su', 'VidLink',
      'AutoEmbed', 'Multi', 'MoviesAPI', 'VidSrc ICU', 'Super',
      'StreamIMDb', 'DBgo',
    ];

    const count = Math.min(availableStreams.length, serverNames.length);
    container.innerHTML = '';
    
    for (let idx = 0; idx < count; idx++) {
      const isActive = idx === activeStreamIndex;
      const name = serverNames[idx] || `Server ${idx + 1}`;
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.title = `Switch to ${name}`;
      btn.onclick = () => {
        PlayerPage.switchServer(idx);
        // Reset fail count when user manually switches
        failCount = 0;
      };
      
      // Different colors for active vs inactive
      const bgColor = isActive ? 'rgba(0,208,132,0.2)' : 'rgba(255,255,255,0.06)';
      const borderColor = isActive ? 'rgba(0,208,132,0.7)' : 'rgba(255,255,255,0.18)';
      const textColor = isActive ? '#00d084' : 'rgba(255,255,255,0.7)';
      const shadow = isActive ? '0 0 12px rgba(0,208,132,0.3)' : 'none';
      
      btn.style.cssText = `
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        border: 1.5px solid ${borderColor};
        background: ${bgColor};
        color: ${textColor};
        transition: all 0.2s ease;
        white-space: nowrap;
        box-shadow: ${shadow};
        font-family: 'Inter', sans-serif;
      `;
      btn.onmouseenter = () => {
        if (!isActive) {
          btn.style.transform = 'translateY(-1px)';
          btn.style.filter = 'brightness(1.15)';
        }
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'none';
        btn.style.filter = 'none';
      };
      
      // Add health indicator dot
      const dot = document.createElement('span');
      dot.className = 'server-health-dot';
      dot.style.cssText = `
        display: inline-block; width: 5px; height: 5px; 
        border-radius: 50%; margin-right: 4px; 
        vertical-align: middle; background: ${isActive ? '#00d084' : 'rgba(255,255,255,0.3)'};
        animation: ${isActive ? 'pulse 1.5s infinite' : 'none'};
      `;
      btn.prepend(dot);
      
      container.appendChild(btn);
    }
  }

  return { init, goBack, switchServer, renderServerButtons };
})();

window.PlayerPage = PlayerPage;