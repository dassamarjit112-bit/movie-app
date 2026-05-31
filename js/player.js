/* ============================================================
   CineStream — HLS Video Player Module
   Uses hls.js for adaptive bitrate streaming
   ============================================================ */

const Player = (() => {
  let hlsInstance = null;
  let controlsTimer = null;
  let isSeeking = false;

  // ── Initialize player with fallback stream support ──
  function init(videoEl, src, options = {}) {
    if (!videoEl) return;
    destroy(); // Clean previous instance

    const streams = options.streams || [src];
    let streamIndex = 0;

    // Sanitize and validate a stream URL before loading
    // Fixes: 400 errors from malformed tokens, and catching placeholder/bait URLs
    function sanitizeStreamUrl(url) {
      if (!url || typeof url !== 'string') return null;
      // Trim whitespace
      url = url.trim();
      // Must start with http or https
      if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
      // Apply encodeURI to preserve query-string tokens (auth tokens, HMAC, etc.)
      // encodeURI does NOT double-encode already-encoded sequences
      try {
        const safeUrl = encodeURI(decodeURI(url));
        new URL(safeUrl); // will throw if structurally invalid
        return safeUrl;
      } catch (e) {
        console.warn('Player: Rejected malformed stream URL:', url);
        return null;
      }
    }

    function tryLoad(rawStreamSrc) {
      const streamSrc = sanitizeStreamUrl(rawStreamSrc);
      if (!streamSrc) {
        console.warn('Player: Invalid stream URL skipped, trying next.');
        tryNextStream();
        return;
      }
      // Clear previous error message and hide it
      const errEl = document.getElementById('player-error-msg');
      if (errEl) errEl.style.display = 'none';

      // Show loading spinner when video starts loading
      const loadStartHandler = () => {
        const spinner = document.getElementById('buffer-spinner');
        if (spinner) spinner.classList.remove('hidden');
      };
      videoEl.addEventListener('loadstart', loadStartHandler);

      // Hide spinner when video can play
      const canPlayHandler = () => {
        const spinner = document.getElementById('buffer-spinner');
        if (spinner) spinner.classList.add('hidden');
      };
      videoEl.addEventListener('canplay', canPlayHandler);

      if (Hls.isSupported()) {
        if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
        hlsInstance = new Hls({
          enableWorker:       true,
          lowLatencyMode:     false,
          backBufferLength:   90,
          maxBufferLength:    30,
          maxMaxBufferLength: 600
        });
        hlsInstance.loadSource(streamSrc);
        hlsInstance.attachMedia(videoEl);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          const spinner = document.getElementById('buffer-spinner');
          if (spinner) spinner.classList.add('hidden');
          
          videoEl.muted = false;
          videoEl.volume = 1.0;
          const volumeSlider = document.getElementById('volume-slider');
          if (volumeSlider) volumeSlider.value = 100;
          const muteBtn = document.getElementById('mute-btn');
          const icon = muteBtn?.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = 'volume_up';

          if (options.autoplay) {
            videoEl.play().catch(e => console.log('Autoplay blocked without mute:', e));
          }
          populateQualityMenu(hlsInstance, options.qualityMenuId);
        });

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          // Log detailed error info so you can see the exact failing URL + HTTP status
          if (data.fatal) {
            const failedUrl   = data.url || streamSrc;
            const statusCode  = data.response?.code || data.networkDetails?.status || 'unknown';
            console.error(
              `[Player] Fatal HLS error — type: ${data.type}, ` +
              `details: ${data.details}, HTTP: ${statusCode}, ` +
              `URL: ${failedUrl}`
            );

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Try to recover once; if still fatal after 1.5s, switch stream
                hlsInstance.startLoad();
                setTimeout(() => {
                  if (data.fatal) {
                    console.warn('[Player] Network recovery failed, switching to fallback stream.');
                    tryNextStream();
                  }
                }, 1500);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hlsInstance.recoverMediaError();
                break;
              default:
                tryNextStream();
                break;
            }
          } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
            // Non-fatal fragment error — log the URL so you can identify bait/ad segments
            console.warn('[Player] Fragment load error (non-fatal):', data.url || streamSrc, 'HTTP:', data.response?.code);
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        videoEl.src = streamSrc;
        videoEl.muted = false;
        videoEl.volume = 1.0;
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) volumeSlider.value = 100;
        const muteBtn = document.getElementById('mute-btn');
        const icon = muteBtn?.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'volume_up';
        
        const nativeErrorHandler = (e) => {
          console.warn('Native HLS error — trying next stream', e);
          videoEl.removeEventListener('error', nativeErrorHandler);
          tryNextStream();
        };
        videoEl.addEventListener('error', nativeErrorHandler);
        
        if (options.autoplay) {
          videoEl.play().catch(e => console.log('Autoplay blocked without mute:', e));
        }
      } else {
        showPlayerError('Your browser does not support HLS video playback.');
      }
    }

    function tryNextStream() {
      streamIndex++;
      if (streamIndex < streams.length) {
        console.log(`Switching to fallback stream ${streamIndex}:`, streams[streamIndex]);
        if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
        tryLoad(streams[streamIndex]);
      } else {
        showPlayerError('Unable to play this video. The stream may be unavailable.');
      }
    }

    function showPlayerError(msg) {
      const spinner = document.getElementById('buffer-spinner');
      if (spinner) spinner.classList.add('hidden');
      const errEl = document.getElementById('player-error-msg');
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
      UI.toast(msg, 'error');
    }

    tryLoad(streams[0]);
    return hlsInstance;
  }

  // ── Destroy player ──
  function destroy() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
  }

  // ── Setup custom controls ──
  function setupControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const video = container.querySelector('video');
    const controls = container.querySelector('.player-controls');
    const playBtn = container.querySelector('#play-btn');
    const muteBtn = container.querySelector('#mute-btn');
    const volumeSlider = container.querySelector('#volume-slider');
    const seekBar = container.querySelector('#seek-bar');
    const currentTimeEl = container.querySelector('#current-time');
    const durationEl = container.querySelector('#duration');
    const fullscreenBtn = container.querySelector('#fullscreen-btn');
    const pipBtn = container.querySelector('#pip-btn');
    const speedBtn = container.querySelector('#speed-btn');
    const speedMenu = container.querySelector('#speed-menu');
    const qualityBtn = container.querySelector('#quality-btn');
    const qualityMenu = container.querySelector('#quality-menu');

    if (!video) return;

    // ─ Auto-hide controls ─
    function showControls() {
      controls?.classList.remove('hidden');
      clearTimeout(controlsTimer);
      if (!video.paused) {
        controlsTimer = setTimeout(() => controls?.classList.add('hidden'), 3000);
      }
    }

    container.addEventListener('mousemove', showControls);
    container.addEventListener('touchstart', showControls);
    video.addEventListener('click', () => {
      togglePlay(video, playBtn);
    });

    // ─ Play/Pause ─
    playBtn?.addEventListener('click', () => togglePlay(video, playBtn));
    video.addEventListener('play', () => updatePlayBtn(playBtn, false));
    video.addEventListener('pause', () => updatePlayBtn(playBtn, true));
    video.addEventListener('ended', () => updatePlayBtn(playBtn, true));

    // ─ Volume ─
    muteBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      updateMuteBtn(muteBtn, video.muted);
      if (volumeSlider) volumeSlider.value = video.muted ? 0 : video.volume * 100;
    });

    volumeSlider?.addEventListener('input', () => {
      video.volume = volumeSlider.value / 100;
      video.muted = video.volume === 0;
      updateMuteBtn(muteBtn, video.muted);
    });

    // ─ Progress / Seek ─
    video.addEventListener('timeupdate', () => {
      if (isSeeking) return;
      const pct = (video.currentTime / video.duration) * 100;
      if (seekBar) seekBar.value = pct || 0;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(video.currentTime);
    });

    video.addEventListener('loadedmetadata', () => {
      if (durationEl) durationEl.textContent = formatTime(video.duration);
    });

    seekBar?.addEventListener('mousedown', () => { isSeeking = true; });
    seekBar?.addEventListener('input', () => {
      if (currentTimeEl) currentTimeEl.textContent = formatTime((seekBar.value / 100) * video.duration);
    });
    seekBar?.addEventListener('change', () => {
      video.currentTime = (seekBar.value / 100) * video.duration;
      isSeeking = false;
    });

    // ─ Keyboard shortcuts ─
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay(video, playBtn);
          break;
        case 'ArrowRight':
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowUp':
          video.volume = Math.min(1, video.volume + 0.1);
          if (volumeSlider) volumeSlider.value = video.volume * 100;
          break;
        case 'ArrowDown':
          video.volume = Math.max(0, video.volume - 0.1);
          if (volumeSlider) volumeSlider.value = video.volume * 100;
          break;
        case 'f':
          toggleFullscreen(container, fullscreenBtn);
          break;
        case 'm':
          video.muted = !video.muted;
          updateMuteBtn(muteBtn, video.muted);
          break;
      }
    });

    // ─ Fullscreen ─
    fullscreenBtn?.addEventListener('click', () => toggleFullscreen(container, fullscreenBtn));
    document.addEventListener('fullscreenchange', () => {
      const icon = fullscreenBtn?.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
    });

    // ─ Picture in Picture ─
    pipBtn?.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (e) {
        console.log('PiP not supported');
      }
    });

    // ─ Playback Speed ─
    const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
    speedBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      speedMenu?.classList.toggle('hidden');
      qualityMenu?.classList.add('hidden');
    });

    speedMenu?.querySelectorAll('[data-speed]').forEach(item => {
      item.addEventListener('click', () => {
        const speed = parseFloat(item.dataset.speed);
        video.playbackRate = speed;
        if (speedBtn) speedBtn.textContent = speed + 'x';
        speedMenu.classList.add('hidden');
      });
    });

    // ─ Quality ─
    qualityBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      qualityMenu?.classList.toggle('hidden');
      speedMenu?.classList.add('hidden');
    });

    document.addEventListener('click', () => {
      speedMenu?.classList.add('hidden');
      qualityMenu?.classList.add('hidden');
    });

    // ─ Buffering indicator ─
    video.addEventListener('waiting', () => {
      container.querySelector('#buffer-spinner')?.classList.remove('hidden');
    });
    video.addEventListener('playing', () => {
      container.querySelector('#buffer-spinner')?.classList.add('hidden');
    });
    video.addEventListener('timeupdate', () => {
      if (!video.paused && video.currentTime > 0) {
        container.querySelector('#buffer-spinner')?.classList.add('hidden');
      }
    });
  }

  // ── Populate quality levels ──
  function populateQualityMenu(hlsInst, menuId) {
    const menu = document.getElementById(menuId);
    if (!menu || !hlsInst) return;

    menu.innerHTML = '<div data-level="-1" class="quality-item">Auto</div>';
    hlsInst.levels.forEach((level, index) => {
      const label = level.height ? `${level.height}p` : `Level ${index}`;
      const item = document.createElement('div');
      item.dataset.level = index;
      item.className = 'quality-item';
      item.textContent = label;
      item.addEventListener('click', () => {
        hlsInst.currentLevel = index;
        const btn = document.getElementById('quality-btn');
        if (btn) btn.textContent = label;
        menu.classList.add('hidden');
      });
      menu.appendChild(item);
    });
  }

  // ── Toggle play/pause ──
  function togglePlay(video, btn) {
    if (video.paused) { video.play(); }
    else { video.pause(); }
  }

  function updatePlayBtn(btn, isPaused) {
    if (!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = isPaused ? 'play_arrow' : 'pause';
  }

  function updateMuteBtn(btn, isMuted) {
    if (!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = isMuted ? 'volume_off' : 'volume_up';
  }

  // ── Toggle fullscreen ──
  function toggleFullscreen(el, btn) {
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  // ── Format time ──
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  return {
    init,
    destroy,
    setupControls,
    formatTime
  };
})();

window.Player = Player;
