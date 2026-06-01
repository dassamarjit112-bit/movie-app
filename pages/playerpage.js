/* CineStream — Player Page Controller */

const PlayerPage = (() => {
  let progressInterval = null;
  let currentContentId = null;
  let videoElement = null;
  let availableStreams = [];
  let activeStreamIndex = 0;

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

    // Determine if the content is a Hollywood movie (English language)
    const isHollywood = item.language && item.language.toLowerCase() === 'en';
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = item.title;

    const subtitleEl = document.getElementById('player-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = params.ep ? `Streaming ${params.ep}` : `Streaming Movie • ${item.genre}`;
    }

    videoElement = document.getElementById('hls-video');

    // Working public HLS fallbacks — must match the pool in tmdb.js
    const FALLBACK_STREAMS = [
      'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
      'https://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8',
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    ];

    // Compute a deterministic hash from the content ID (handles alphanumeric IDs)
    const computeHash = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0; // Convert to 32bit integer
      }
      return Math.abs(h);
    };
    const hash = computeHash(String(contentId));
    // Prioritize regional streams for Indian languages
    const streamsToUseRaw = (item.streams && item.streams.length) ? TMDB.getRegionalStreams(item) : FALLBACK_STREAMS;

    // Helper to resolve a path or URL to a full HLS URL
    const resolveStream = (s) => {
      if (/^https?:\/\//i.test(s)) return s;
      const base = (typeof window !== 'undefined' && window.VITE_HLS_BASE_URL) ? window.VITE_HLS_BASE_URL : '';
      return base + s;
    };

    // Resolve and normalize ALL streams with encodeURI (Fix: was only done on primaryStream before)
    const streamsToUse = streamsToUseRaw
      .map(resolveStream)
      .map(s => { try { return encodeURI(decodeURI(s)); } catch(e) { return s; } });

    // Compute deterministic fallback index
    const fallbackIndex = hash % streamsToUse.length;

    // Determine primary stream
    let primaryStream;
    if (item.type === 'series' && params.ep) {
      // Expected format 'S{seasonNum} E{epNum}'
      const match = params.ep.match(/S(\d+)\s*E(\d+)/i);
      if (match) {
        const seasonNum = parseInt(match[1]);
        const epNum = parseInt(match[2]);
        const episodes = item.episodes && item.episodes[seasonNum] ? item.episodes[seasonNum] : [];
        const episode = episodes.find(e => e.epNum === epNum);
        if (episode && episode.stream) {
          try {
            primaryStream = encodeURI(decodeURI(resolveStream(episode.stream)));
          } catch(e) {
            primaryStream = resolveStream(episode.stream);
          }
        }
      }
    }
    if (!primaryStream) {
      primaryStream = streamsToUse[fallbackIndex];
    }

    // Determine if the stream is an iframe embed server
    const isIframeStream = primaryStream && (primaryStream.includes('vidsrc') || primaryStream.includes('vidlink') || primaryStream.includes('embed'));
    const iframeElement = document.getElementById('iframe-video');
    const controlsContainer = document.querySelector('.player-controls');

    // Ensure primary stream is first in the array (all already encoded above)
    availableStreams = [primaryStream, ...streamsToUse.filter(s => s !== primaryStream)];
    activeStreamIndex = 0;
    
    const switchBtn = document.getElementById('switch-server-btn');
    if (switchBtn) {
      switchBtn.style.display = availableStreams.length > 1 ? 'flex' : 'none';
    }

    if (isIframeStream) {
      // Hide native video and custom controls
      if (videoElement) videoElement.style.display = 'none';
      if (controlsContainer) controlsContainer.style.display = 'none';
      
      const spinner = document.getElementById('buffer-spinner');
      if (spinner) spinner.classList.add('hidden');
      
      // Show and load iframe
      if (iframeElement) {
        iframeElement.style.display = 'block';
        iframeElement.src = primaryStream;
      }
    } else {
      // Normal HLS video initialization
      if (iframeElement) iframeElement.style.display = 'none';
      if (videoElement) videoElement.style.display = 'block';
      if (controlsContainer) controlsContainer.style.display = 'flex';

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
      window.Player.init(videoElement, primaryStream, {
        autoplay: true,
        qualityMenuId: 'quality-menu',
        streams: availableStreams,
        withCredentials: true,
        requestHeaders: {
          'Accept': '*/*',
          'Origin': window.location.origin
        }
      });
      window.Player.setupControls('player-container');
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
          Subscriptions.saveProgress(session.user.id, contentId, Math.floor(videoElement.currentTime));
        }
      }, 6000);
    }

    // Overlay controls auto-hide setup (for the top back button)
    setupOverlayAutoHide();

    // Auto Fullscreen & Landscape for Mobile
    if (window.innerWidth <= 768) {
      const container = document.getElementById('player-container');
      if (container) {
        try {
          if (container.requestFullscreen) {
            container.requestFullscreen().catch(() => {});
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          }
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {
          console.warn('Auto fullscreen/landscape blocked by browser:', e);
        }
      }
    }
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

    // Route back to detail view
    Router.navigate('detail', { id: currentContentId });
  }

  function switchServer() {
    if (!availableStreams || availableStreams.length <= 1) {
      UI.toast('No alternative servers available.', 'info');
      return;
    }
    
    activeStreamIndex = (activeStreamIndex + 1) % availableStreams.length;
    const newStream = availableStreams[activeStreamIndex];
    
    UI.toast(`Switched to Server ${activeStreamIndex + 1}`, 'info');

    // Destroy native player if active
    if (window.Player && typeof window.Player.destroy === 'function') {
      window.Player.destroy();
    }
    
    const isIframeStream = newStream.includes('vidsrc') || newStream.includes('vidlink') || newStream.includes('embed');
    const iframeElement = document.getElementById('iframe-video');
    const controlsContainer = document.querySelector('.player-controls');
    
    if (isIframeStream) {
      if (videoElement) videoElement.style.display = 'none';
      if (controlsContainer) controlsContainer.style.display = 'none';
      if (iframeElement) {
        iframeElement.style.display = 'block';
        iframeElement.src = newStream;
      }
      const spinner = document.getElementById('buffer-spinner');
      if (spinner) spinner.classList.add('hidden');
    } else {
      if (iframeElement) {
        iframeElement.style.display = 'none';
        iframeElement.src = '';
      }
      if (videoElement) videoElement.style.display = 'block';
      if (controlsContainer) controlsContainer.style.display = 'flex';
      
      const orderedStreams = [newStream, ...availableStreams.filter(s => s !== newStream)];
      window.Player.init(videoElement, newStream, {
        autoplay: true,
        qualityMenuId: 'quality-menu',
        streams: orderedStreams,
        withCredentials: true,
        requestHeaders: { 'Accept': '*/*', 'Origin': window.location.origin }
      });
      window.Player.setupControls('player-container');
    }
  }

  return { init, goBack, switchServer };
})();

window.PlayerPage = PlayerPage;
