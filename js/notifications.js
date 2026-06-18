/* ============================================================
   CineStream — Notification Engine
   Beautiful in-app + Android Web Push notifications
   ============================================================ */

const NotificationSystem = (() => {

  // ── Simulated Data (FIFA World Cup Scores + New Releases) ──
  const FIFA_MATCHES = [
    { id: 'fifa1', homeTeam: 'Brazil', awayTeam: 'France', homeScore: 2, awayScore: 1, minute: 67, status: 'LIVE', flag1: '🇧🇷', flag2: '🇫🇷', tournament: 'FIFA World Cup 2026' },
    { id: 'fifa2', homeTeam: 'Argentina', awayTeam: 'England', homeScore: 1, awayScore: 1, minute: 88, status: 'LIVE', flag1: '🇦🇷', flag2: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tournament: 'FIFA World Cup 2026' },
    { id: 'fifa3', homeTeam: 'Germany', awayTeam: 'Spain', homeScore: 0, awayScore: 0, minute: 23, status: 'LIVE', flag1: '🇩🇪', flag2: '🇪🇸', tournament: 'FIFA World Cup 2026' },
    { id: 'fifa4', homeTeam: 'Portugal', awayTeam: 'Morocco', homeScore: 3, awayScore: 1, minute: 90, status: 'FT', flag1: '🇵🇹', flag2: '🇲🇦', tournament: 'FIFA World Cup 2026' },
  ];

  const NEW_RELEASES = [
    { id: 'nr1', title: 'Kalki 2898 AD', type: 'movie', genre: 'Sci-Fi', rating: '9.1', year: '2026', poster: 'https://image.tmdb.org/t/p/w500/fqv8v6AycXKsivp1T5yKtLbGXce.jpg', desc: 'Now Streaming on CineStream' },
    { id: 'nr2', title: 'Pushpa: The Rule', type: 'movie', genre: 'Action', rating: '8.8', year: '2026', poster: 'https://image.tmdb.org/t/p/w500/oaGvjB0DvdhXhteX223ik352fLl.jpg', desc: 'Part 2 — Now Available' },
    { id: 'nr3', title: 'The Night Agent S2', type: 'series', genre: 'Thriller', rating: '8.5', year: '2026', poster: 'https://image.tmdb.org/t/p/w500/sRtWWNgLQqb7HX6LJDGy8FIXmT3.jpg', desc: 'Season 2 All Episodes Dropped' },
    { id: 'nr4', title: 'Stranger Things S5', type: 'series', genre: 'Sci-Fi', rating: '9.3', year: '2026', poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', desc: 'Final Season — Streaming Now' },
    { id: 'nr5', title: 'Dune: Messiah', type: 'movie', genre: 'Sci-Fi', rating: '8.9', year: '2026', poster: 'https://image.tmdb.org/t/p/w500/d5NXSklpcuveillkZpVoXtRK2YH.jpg', desc: 'The saga continues' },
  ];

  const APP_UPDATES = [
    { id: 'upd1', title: '🎉 New Feature: Dolby Atmos', body: 'Experience movies in Dolby Atmos spatial audio — now live!', type: 'update', icon: '🎵' },
    { id: 'upd2', title: '🔔 Your Watchlist Updated', body: 'Pushpa 2 is now available to watch. You added it 3 days ago!', type: 'watchlist', icon: '📋' },
    { id: 'upd3', title: '⭐ Recommended For You', body: 'Based on what you watched: Animal (2023) — 9.1 Rating', type: 'recommendation', icon: '✨' },
    { id: 'upd4', title: '🏆 Trending Right Now', body: 'Jawan is trending in your region. Watch before everyone talks about it!', type: 'trending', icon: '🔥' },
  ];

  // ── State ──
  let _swRegistration = null;
  let _notifPermission = 'default';
  let _panelOpen = false;
  let _notifications = [];
  let _unreadCount = 0;
  let _scoreIntervals = {};

  // ── Init ──
  async function init() {
    await _registerServiceWorker();
    await _checkPermission();
    _loadStoredNotifications();
    _injectPanel();
    _bindBellButton();
    _scheduleDaily();

    // Start live score polling
    setTimeout(() => _pollLiveScores(), 3000);
  }

  // ── Service Worker ──
  async function _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      _swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[Notif] SW registered');

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE' && event.data.url) {
          window.location.hash = event.data.url;
        }
      });
    } catch (e) {
      console.warn('[Notif] SW registration failed:', e);
    }
  }

  // ── Permission ──
  async function _checkPermission() {
    if (!('Notification' in window)) return;
    _notifPermission = Notification.permission;
    if (_notifPermission === 'default') {
      // Show in-app prompt after 5 seconds
      setTimeout(() => _showPermissionPrompt(), 5000);
    }
  }

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    _notifPermission = result;
    if (result === 'granted') {
      _showAndroidNotification({
        title: '🎬 CineStream Notifications ON',
        body: "You'll now get live FIFA scores, new releases & more!",
        type: 'update',
      });
      _addToPanel({
        id: 'perm-granted',
        title: '✅ Notifications Enabled',
        body: "You'll get live scores, new releases & app updates.",
        type: 'update',
        time: Date.now(),
        read: false,
        icon: '🔔',
      });
    }
    return result === 'granted';
  }

  // ── Android-style Web Push Notification ──
  function _showAndroidNotification({ title, body, type, image, url, tag }) {
    if (_notifPermission !== 'granted') return;

    if (_swRegistration) {
      _swRegistration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: tag || `cinestream-${Date.now()}`,
        renotify: true,
        vibrate: [150, 80, 150],
        data: { url: url || '/', type },
        image: image || undefined,
        actions: type === 'score'
          ? [{ action: 'watch', title: '⚽ Watch Live' }]
          : [{ action: 'open', title: '▶ Watch Now' }],
        requireInteraction: type === 'score',
      });
    } else {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    }
  }

  // ── Add to in-app panel ──
  function _addToPanel(notif) {
    _notifications.unshift(notif);
    if (_notifications.length > 50) _notifications = _notifications.slice(0, 50);
    if (!notif.read) _unreadCount++;
    _saveNotifications();
    _renderPanel();
    _updateBadge();
  }

  // ── Persistence ──
  function _saveNotifications() {
    try { localStorage.setItem('cs_notifs', JSON.stringify(_notifications)); } catch(e) {}
  }

  function _loadStoredNotifications() {
    try {
      const stored = JSON.parse(localStorage.getItem('cs_notifs') || '[]');
      _notifications = stored;
      _unreadCount = stored.filter(n => !n.read).length;
    } catch(e) { _notifications = []; }
  }

  // ── Permission prompt (beautiful in-app UI) ──
  function _showPermissionPrompt() {
    if (_notifPermission !== 'default') return;
    const el = document.createElement('div');
    el.id = 'notif-permission-prompt';
    el.innerHTML = `
      <div style="
        position:fixed;bottom:100px;right:20px;
        background:linear-gradient(135deg,#1a1a1a,#1e1414);
        border:1px solid rgba(229,9,20,0.3);
        border-radius:20px;padding:20px;max-width:320px;width:calc(100vw - 40px);
        box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 0 1px rgba(229,9,20,0.1);
        z-index:10000;animation:notif-slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1);
        backdrop-filter:blur(20px)
      ">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:rgba(229,9,20,0.15);border:1px solid rgba(229,9,20,0.3);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🔔</div>
          <div>
            <div style="font-family:'Montserrat',sans-serif;font-size:15px;font-weight:800;color:#fff">Stay in the Loop!</div>
            <div style="font-size:12px;color:rgba(229,226,225,0.6);margin-top:2px">Get live scores & new releases</div>
          </div>
          <button onclick="this.closest('#notif-permission-prompt').remove()" style="margin-left:auto;background:none;border:none;color:rgba(229,226,225,0.4);cursor:pointer;font-size:20px;flex-shrink:0;padding:0">×</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(229,226,225,0.7)"><span style="font-size:16px">⚽</span> FIFA World Cup live scores</div>
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(229,226,225,0.7)"><span style="font-size:16px">🎬</span> New movies & series alerts</div>
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(229,226,225,0.7)"><span style="font-size:16px">⭐</span> Personalized recommendations</div>
        </div>
        <div style="display:flex;gap:10px">
          <button onclick="window.NotificationSystem.requestPermission();this.closest('#notif-permission-prompt').remove()" style="flex:1;padding:12px;background:linear-gradient(135deg,#e50914,#c0000c);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">
            Allow Notifications
          </button>
          <button onclick="this.closest('#notif-permission-prompt').remove()" style="padding:12px 16px;background:rgba(255,255,255,0.06);color:rgba(229,226,225,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif">
            Not Now
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  // ── Live Score Polling ──
  function _pollLiveScores() {
    const liveMatches = FIFA_MATCHES.filter(m => m.status === 'LIVE');
    if (!liveMatches.length) return;

    liveMatches.forEach(match => {
      if (_scoreIntervals[match.id]) return;

      // Immediately show initial score notification
      _sendScoreNotification(match);

      // Update score every 3 minutes (simulated)
      _scoreIntervals[match.id] = setInterval(() => {
        // Simulate score change
        const rand = Math.random();
        if (rand > 0.7) {
          const scorer = Math.random() > 0.5 ? 'home' : 'away';
          if (scorer === 'home') match.homeScore++;
          else match.awayScore++;
          match.minute = Math.min(match.minute + 3, 90);
          _sendScoreNotification(match, true); // true = goal event
        } else {
          match.minute = Math.min(match.minute + 3, 90);
        }
      }, 3 * 60 * 1000);
    });
  }

  function _sendScoreNotification(match, isGoal = false) {
    const title = isGoal
      ? `⚽ GOAL! ${match.flag1} ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam} ${match.flag2}`
      : `🏟️ ${match.flag1} ${match.homeTeam} vs ${match.awayTeam} ${match.flag2}`;

    const body = isGoal
      ? `${match.minute}' — GOAL! Score updated! Watch the replay on CineStream Sports.`
      : `${match.minute}' | ${match.homeScore}-${match.awayScore} | ${match.tournament}`;

    _showAndroidNotification({ title, body, type: 'score', tag: `score-${match.id}`, url: '/#sports' });
    _addToPanel({
      id: `score-${match.id}-${Date.now()}`,
      title, body,
      type: 'score',
      time: Date.now(),
      read: false,
      icon: '⚽',
      meta: match,
      isGoal,
    });
  }

  // ── New Releases Scheduler ──
  function _scheduleDaily() {
    const lastShown = parseInt(localStorage.getItem('cs_notif_last_release') || '0');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (now - lastShown > oneDayMs) {
      setTimeout(() => _sendNewReleaseNotification(), 10000);
      localStorage.setItem('cs_notif_last_release', String(now));
    }

    // Schedule for next day
    setTimeout(() => _scheduleDaily(), oneDayMs);
  }

  function _sendNewReleaseNotification() {
    const release = NEW_RELEASES[Math.floor(Math.random() * NEW_RELEASES.length)];
    const title = `🎬 New ${release.type === 'series' ? 'Series' : 'Movie'}: ${release.title}`;
    const body = `${release.desc} • ⭐ ${release.rating} • ${release.genre}`;

    _showAndroidNotification({
      title, body, type: 'movie',
      image: release.poster,
      url: `/#home`,
      tag: `release-${release.id}`,
    });

    _addToPanel({
      id: `release-${release.id}-${Date.now()}`,
      title, body,
      type: 'movie',
      time: Date.now(),
      read: false,
      icon: '🎬',
      meta: release,
    });
  }

  // ── Manual send (for demo / testing) ──
  function sendMovieNotification(release) {
    release = release || NEW_RELEASES[Math.floor(Math.random() * NEW_RELEASES.length)];
    _sendNewReleaseNotification();
  }

  function sendScoreUpdate(matchId) {
    const match = FIFA_MATCHES.find(m => m.id === matchId) || FIFA_MATCHES[0];
    _sendScoreNotification(match, Math.random() > 0.5);
  }

  function sendAppUpdate() {
    const upd = APP_UPDATES[Math.floor(Math.random() * APP_UPDATES.length)];
    _showAndroidNotification({ title: upd.title, body: upd.body, type: 'update' });
    _addToPanel({ id: `upd-${Date.now()}`, ...upd, time: Date.now(), read: false });
  }

  // ── Notification Panel UI ──
  function _injectPanel() {
    if (document.getElementById('notif-panel-container')) return;

    const container = document.createElement('div');
    container.id = 'notif-panel-container';
    container.innerHTML = `
      <style>
        @keyframes notif-slide-up {
          from { opacity:0; transform:translateY(20px) scale(0.95); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes notif-slide-in {
          from { opacity:0; transform:translateX(20px); }
          to { opacity:1; transform:translateX(0); }
        }
        @keyframes score-pulse {
          0%,100% { box-shadow:0 0 0 0 rgba(0,208,132,0.4); }
          50% { box-shadow:0 0 0 8px rgba(0,208,132,0); }
        }
        @keyframes goal-flash {
          0%,100% { background:rgba(255,200,0,0.1); }
          50% { background:rgba(255,200,0,0.3); }
        }

        #notif-overlay {
          position:fixed;inset:0;z-index:9998;display:none;
        }
        #notif-overlay.open { display:block; }

        #notif-panel {
          position:fixed;top:80px;right:20px;
          width:380px;max-width:calc(100vw - 24px);
          max-height:calc(100vh - 100px);
          background:linear-gradient(180deg,#1a1a1a 0%,#141414 100%);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:24px;
          box-shadow:0 32px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.04);
          z-index:9999;
          display:none;
          flex-direction:column;
          overflow:hidden;
          animation:notif-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        #notif-panel.open { display:flex; }

        .np-header {
          display:flex;align-items:center;justify-content:space-between;
          padding:20px 20px 0;flex-shrink:0;
        }
        .np-title {
          font-family:'Montserrat',sans-serif;font-size:18px;font-weight:800;color:#fff;
          display:flex;align-items:center;gap:10px;
        }
        .np-badge {
          background:#e50914;color:#fff;font-size:10px;font-weight:800;
          padding:2px 7px;border-radius:99px;min-width:18px;text-align:center;
        }
        .np-actions { display:flex;gap:8px; }
        .np-action-btn {
          background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
          color:rgba(229,226,225,0.6);border-radius:10px;padding:6px 12px;
          font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s;
          font-family:'Inter',sans-serif;
        }
        .np-action-btn:hover { background:rgba(255,255,255,0.12);color:#fff; }

        .np-tabs {
          display:flex;gap:0;padding:16px 20px 0;flex-shrink:0;
          border-bottom:1px solid rgba(255,255,255,0.06);
        }
        .np-tab {
          padding:8px 16px;font-size:12px;font-weight:700;letter-spacing:0.04em;
          color:rgba(229,226,225,0.4);border-bottom:2px solid transparent;
          cursor:pointer;transition:all 0.2s;text-transform:uppercase;
          display:flex;align-items:center;gap:6px;
        }
        .np-tab.active { color:#e50914;border-bottom-color:#e50914; }
        .np-tab-dot {
          width:6px;height:6px;border-radius:50%;background:#e50914;
          animation:score-pulse 1.5s infinite;
        }

        .np-body {
          overflow-y:auto;flex:1;padding:12px 16px 16px;
          scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.1) transparent;
        }
        .np-body::-webkit-scrollbar { width:4px; }
        .np-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:2px; }

        .np-empty {
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:48px 20px;gap:12px;
        }
        .np-empty-icon { font-size:48px; }
        .np-empty-text { font-size:14px;color:rgba(229,226,225,0.35);text-align:center; }

        /* ── Notification Card ── */
        .nc {
          display:flex;gap:12px;align-items:flex-start;
          padding:14px;border-radius:16px;margin-bottom:8px;
          cursor:pointer;transition:all 0.2s;position:relative;
          border:1px solid transparent;
          animation:notif-slide-in 0.3s ease;
        }
        .nc:hover { background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.07); }
        .nc.unread { background:rgba(229,9,20,0.05);border-color:rgba(229,9,20,0.12); }
        .nc.unread::before {
          content:'';position:absolute;top:50%;left:4px;transform:translateY(-50%);
          width:4px;height:60%;border-radius:2px;background:#e50914;
        }

        /* ── Score card variant ── */
        .nc.score {
          background:linear-gradient(135deg,rgba(0,208,132,0.08),rgba(20,209,255,0.04));
          border-color:rgba(0,208,132,0.2);
        }
        .nc.score.goal { animation:goal-flash 0.8s ease 3; }
        .nc.score:hover { border-color:rgba(0,208,132,0.4); }

        .nc-icon {
          width:44px;height:44px;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;flex-shrink:0;
        }
        .nc-icon.movie { background:rgba(229,9,20,0.15);border:1px solid rgba(229,9,20,0.2); }
        .nc-icon.score { background:rgba(0,208,132,0.12);border:1px solid rgba(0,208,132,0.2); }
        .nc-icon.update { background:rgba(20,209,255,0.12);border:1px solid rgba(20,209,255,0.2); }
        .nc-icon.series { background:rgba(255,200,0,0.12);border:1px solid rgba(255,200,0,0.2); }

        .nc-content { flex:1;min-width:0; }
        .nc-title {
          font-size:13px;font-weight:700;color:#fff;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;
        }
        .nc-body {
          font-size:12px;color:rgba(229,226,225,0.55);line-height:1.5;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
        }
        .nc-time { font-size:10px;color:rgba(229,226,225,0.3);margin-top:6px; }
        .nc-dismiss {
          background:none;border:none;color:rgba(229,226,225,0.25);
          font-size:16px;cursor:pointer;padding:0;flex-shrink:0;
          transition:color 0.2s;align-self:center;
        }
        .nc-dismiss:hover { color:rgba(229,226,225,0.7); }

        /* ── Score display inside card ── */
        .nc-score-box {
          display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;
          background:rgba(0,0,0,0.3);border-radius:10px;
        }
        .nc-score-team { font-size:11px;font-weight:700;color:rgba(229,226,225,0.8); }
        .nc-score-num {
          font-family:'Montserrat',sans-serif;font-size:16px;font-weight:900;
          color:#fff;padding:2px 10px;background:rgba(0,208,132,0.12);
          border-radius:6px;border:1px solid rgba(0,208,132,0.2);
        }
        .nc-score-live {
          font-size:9px;font-weight:900;letter-spacing:0.08em;
          background:rgba(255,58,58,0.12);border:1px solid rgba(255,58,58,0.3);
          color:#ff5555;border-radius:99px;padding:2px 7px;text-transform:uppercase;
          margin-left:auto;
        }

        /* ── Footer CTA ── */
        .np-footer {
          padding:12px 16px;border-top:1px solid rgba(255,255,255,0.05);
          flex-shrink:0;display:flex;gap:10px;
        }
        .np-cta-btn {
          flex:1;padding:10px;background:linear-gradient(135deg,#e50914,#c0000c);
          color:#fff;border:none;border-radius:12px;font-size:12px;font-weight:700;
          cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;
        }
        .np-cta-btn:hover { filter:brightness(1.1); }
        .np-cta-btn.secondary {
          background:rgba(0,208,132,0.12);border:1px solid rgba(0,208,132,0.25);
          color:#00d084;
        }
        .np-cta-btn.secondary:hover { background:rgba(0,208,132,0.2); }
      </style>

      <div id="notif-overlay" onclick="window.NotificationSystem.closePanel()"></div>

      <div id="notif-panel">
        <div class="np-header">
          <div class="np-title">
            <span>🔔</span> Notifications
            <span class="np-badge" id="np-badge-count" style="display:none">0</span>
          </div>
          <div class="np-actions">
            <button class="np-action-btn" onclick="window.NotificationSystem.markAllRead()">Mark all read</button>
            <button class="np-action-btn" onclick="window.NotificationSystem.clearAll()">Clear all</button>
            <button onclick="window.NotificationSystem.closePanel()" style="background:none;border:none;color:rgba(229,226,225,0.4);cursor:pointer;font-size:22px;padding:0 0 0 4px">×</button>
          </div>
        </div>

        <div class="np-tabs">
          <div class="np-tab active" data-tab="all" onclick="window.NotificationSystem.switchTab('all')">All</div>
          <div class="np-tab" data-tab="score" onclick="window.NotificationSystem.switchTab('score')">
            <span class="np-tab-dot"></span> Live Scores
          </div>
          <div class="np-tab" data-tab="movie" onclick="window.NotificationSystem.switchTab('movie')">🎬 Releases</div>
          <div class="np-tab" data-tab="update" onclick="window.NotificationSystem.switchTab('update')">Updates</div>
        </div>

        <div class="np-body" id="np-body"></div>

        <div class="np-footer">
          <button class="np-cta-btn" onclick="window.NotificationSystem.requestPermission()">
            🔔 Enable Push Alerts
          </button>
          <button class="np-cta-btn secondary" onclick="Router.navigate('sports');window.NotificationSystem.closePanel()">
            ⚽ Live Sports
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // Show initial demo notifications
    setTimeout(() => _loadDemoNotifications(), 1500);
  }

  function _loadDemoNotifications() {
    // Add FIFA scores
    FIFA_MATCHES.filter(m => m.status === 'LIVE').forEach(match => {
      _addToPanel({
        id: `score-${match.id}`,
        title: `⚽ ${match.flag1} ${match.homeTeam} vs ${match.awayTeam} ${match.flag2}`,
        body: `${match.minute}' LIVE — ${match.tournament}`,
        type: 'score',
        time: Date.now() - Math.random() * 600000,
        read: false,
        icon: '⚽',
        meta: match,
      });
    });

    // Add 2 new releases
    NEW_RELEASES.slice(0, 3).forEach((r, i) => {
      setTimeout(() => {
        _addToPanel({
          id: `release-${r.id}`,
          title: `🎬 New: ${r.title}`,
          body: `${r.desc} • ⭐ ${r.rating}`,
          type: r.type === 'series' ? 'series' : 'movie',
          time: Date.now() - (i + 1) * 3600000,
          read: i > 0,
          icon: r.type === 'series' ? '📺' : '🎬',
          meta: r,
        });
      }, i * 200);
    });

    // Add app update
    _addToPanel({
      id: 'upd-demo',
      title: '✨ Recommended For You',
      body: 'Animal (2023) is trending in your region — 9.1 Rating',
      type: 'update',
      time: Date.now() - 7200000,
      read: true,
      icon: '⭐',
    });
  }

  let _activeTab = 'all';
  function switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.np-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    _renderPanel();
  }

  function _renderPanel() {
    const body = document.getElementById('np-body');
    if (!body) return;

    const filtered = _activeTab === 'all'
      ? _notifications
      : _notifications.filter(n => n.type === _activeTab || (n.type === 'series' && _activeTab === 'movie'));

    if (!filtered.length) {
      body.innerHTML = `
        <div class="np-empty">
          <div class="np-empty-icon">${_activeTab === 'score' ? '⚽' : _activeTab === 'movie' ? '🎬' : '🔔'}</div>
          <div class="np-empty-text">No notifications yet.<br>Check back soon for live updates!</div>
        </div>`;
      return;
    }

    body.innerHTML = filtered.map(n => _renderCard(n)).join('');
  }

  function _renderCard(n) {
    const isScore = n.type === 'score';
    const match = isScore && n.meta ? n.meta : null;
    const timeAgo = _timeAgo(n.time);
    const iconType = isScore ? 'score' : (n.type === 'update' ? 'update' : (n.type === 'series' ? 'series' : 'movie'));

    const scoreBlock = match ? `
      <div class="nc-score-box">
        <span class="nc-score-team">${match.flag1} ${match.homeTeam}</span>
        <span class="nc-score-num">${match.homeScore} - ${match.awayScore}</span>
        <span class="nc-score-team">${match.awayTeam} ${match.flag2}</span>
        ${match.status === 'LIVE' ? `<span class="nc-score-live">🔴 LIVE ${match.minute}'</span>` : `<span class="nc-score-live" style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1);color:rgba(229,226,225,0.4)">FT</span>`}
      </div>` : '';

    return `
      <div class="nc ${isScore ? 'score' : ''} ${n.isGoal ? 'goal' : ''} ${!n.read ? 'unread' : ''}"
           onclick="window.NotificationSystem.markRead('${n.id}')">
        <div class="nc-icon ${iconType}">${n.icon || '🔔'}</div>
        <div class="nc-content">
          <div class="nc-title">${n.title}</div>
          <div class="nc-body">${n.body}</div>
          ${scoreBlock}
          <div class="nc-time">${timeAgo}</div>
        </div>
        <button class="nc-dismiss" onclick="event.stopPropagation();window.NotificationSystem.dismiss('${n.id}')">×</button>
      </div>`;
  }

  function _timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  // ── Bell button integration ──
  function _bindBellButton() {
    const bell = document.getElementById('notif-btn');
    if (!bell) {
      // Retry after DOM loads
      setTimeout(_bindBellButton, 1000);
      return;
    }
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    _updateBadge();
  }

  function _updateBadge() {
    const badge = document.getElementById('np-badge-count');
    const dot = document.querySelector('.notif-dot');

    if (badge) {
      badge.textContent = _unreadCount > 9 ? '9+' : _unreadCount;
      badge.style.display = _unreadCount > 0 ? 'inline-block' : 'none';
    }
    if (dot) {
      dot.style.background = _unreadCount > 0 ? '#e50914' : 'transparent';
      dot.style.width = _unreadCount > 0 ? '8px' : '0';
      dot.style.height = _unreadCount > 0 ? '8px' : '0';
    }
  }

  // ── Panel open/close ──
  function togglePanel() {
    _panelOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    _panelOpen = true;
    document.getElementById('notif-panel')?.classList.add('open');
    document.getElementById('notif-overlay')?.classList.add('open');
    _renderPanel();
  }

  function closePanel() {
    _panelOpen = false;
    document.getElementById('notif-panel')?.classList.remove('open');
    document.getElementById('notif-overlay')?.classList.remove('open');
  }

  function markRead(id) {
    const n = _notifications.find(n => n.id === id);
    if (n && !n.read) {
      n.read = true;
      _unreadCount = Math.max(0, _unreadCount - 1);
      _saveNotifications();
      _renderPanel();
      _updateBadge();
    }
  }

  function markAllRead() {
    _notifications.forEach(n => n.read = true);
    _unreadCount = 0;
    _saveNotifications();
    _renderPanel();
    _updateBadge();
  }

  function dismiss(id) {
    const n = _notifications.find(n => n.id === id);
    if (n && !n.read) _unreadCount = Math.max(0, _unreadCount - 1);
    _notifications = _notifications.filter(n => n.id !== id);
    _saveNotifications();
    _renderPanel();
    _updateBadge();
  }

  function clearAll() {
    _notifications = [];
    _unreadCount = 0;
    _saveNotifications();
    _renderPanel();
    _updateBadge();
  }

  return {
    init,
    requestPermission,
    sendMovieNotification,
    sendScoreUpdate,
    sendAppUpdate,
    openPanel,
    closePanel,
    togglePanel,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
    switchTab,
    get unreadCount() { return _unreadCount; },
  };

})();

window.NotificationSystem = NotificationSystem;

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotificationSystem.init());
} else {
  NotificationSystem.init();
}
