/* ============================================================
   CineStream — UI Utilities
   Toast notifications, modals, ripple effects, shared components
   ============================================================ */

const UI = (() => {
  // ── Toast Notifications ──
  function toast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
    const colors = {
      success: '#32dc78',
      error: '#ff6b6b',
      info: 'var(--c-secondary-container)',
      warning: '#ffc832'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined icon-fill" style="color:${colors[type]};font-size:20px">${icons[type]}</span>
      <span style="font-size:14px;font-weight:500;flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:rgba(229,226,225,0.4);padding:0 4px">
        <span class="material-symbols-outlined" style="font-size:16px">close</span>
      </button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'none';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ── Modal ──
  function showModal({ title, content, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, dangerous = false }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button id="modal-close" style="position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:rgba(229,226,225,0.4);">
          <span class="material-symbols-outlined">close</span>
        </button>
        <h3 id="modal-title" class="text-headline-sm" style="margin-bottom:12px">${title}</h3>
        <div style="color:rgba(229,226,225,0.7);font-size:15px;line-height:1.6;margin-bottom:24px">${content}</div>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          ${cancelText ? `<button id="modal-cancel" class="btn btn-ghost btn-sm">${cancelText}</button>` : ''}
          <button id="modal-confirm" class="btn ${dangerous ? 'btn-danger' : 'btn-primary'} btn-sm" 
            style="${dangerous ? 'background:var(--c-error-container);color:var(--c-error)' : ''}">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const close = () => {
      backdrop.remove();
      document.body.style.overflow = '';
    };

    backdrop.querySelector('#modal-close')?.addEventListener('click', close);
    backdrop.querySelector('#modal-cancel')?.addEventListener('click', close);
    backdrop.querySelector('#modal-confirm')?.addEventListener('click', () => {
      onConfirm?.();
      close();
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    return { close };
  }

  // ── Loading Overlay ──
  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px"></span>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
  }

  // ── Ripple Effect ──
  function addRipple(element) {
    element.classList.add('ripple-container');
    element.addEventListener('click', function(e) {
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      element.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  }

  // ── Navbar HTML ──
  function renderNavbar(activeRoute) {
    return `
      <nav class="navbar" id="main-navbar">
        <div class="navbar-logo" onclick="Router.navigate('home')">CineStream</div>
        <ul class="navbar-nav">
          <li><a data-nav-link="home" class="${activeRoute==='home'?'active':''}" onclick="Router.navigate('home')">Home</a></li>
          <li><a data-nav-link="tvshows" class="${activeRoute==='tvshows'?'active':''}" onclick="Router.navigate('tvshows')">TV Shows</a></li>
          <li><a data-nav-link="movies" class="${activeRoute==='movies'?'active':''}" onclick="Router.navigate('movies')">Movies</a></li>
          <li><a data-nav-link="sports" class="${activeRoute==='sports'?'active':''}" onclick="Router.navigate('sports')">Sports</a></li>
          <li><a data-nav-link="subscribe" class="${activeRoute==='subscribe'?'active':''}" onclick="Router.navigate('subscribe')">Plans</a></li>
        </ul>
        <div class="navbar-actions">
          <div class="search-bar" style="position:relative;display:flex;align-items:center;gap:6px">
            <span class="material-symbols-outlined" style="font-size:18px;color:rgba(229,226,225,0.4)">search</span>
            <input type="text" id="navbar-search" placeholder="Search movies, shows…"
                   oninput="UI.handleSearch(this.value)"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); UI.submitSearch(this.value);} else if(event.key==='Escape'){this.value='';UI.closeSearch();}"
                   autocomplete="off">
            <span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:rgba(50,220,120,0.12);color:#32dc78;border:1px solid rgba(50,220,120,0.25);white-space:nowrap">AI</span>
          </div>
          <button class="btn-icon" id="notif-btn" title="Notifications" style="position:relative">
            <span class="material-symbols-outlined" style="font-size:20px">notifications</span>
            <span class="notif-dot" style="position:absolute;top:6px;right:6px"></span>
          </button>
          <div class="avatar-btn" id="avatar-btn" onclick="Router.navigate('account')" title="My Account">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=CS&backgroundColor=e50914&textColor=ffffff" alt="Avatar" id="user-avatar">
          </div>
        </div>
      </nav>
      <script>
        // Close AI search dropdown on outside click (run once after nav renders)
        if (!window._searchOutsideListenerAdded) {
          window._searchOutsideListenerAdded = true;
          document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('ai-search-dropdown');
            const input = document.getElementById('navbar-search');
            if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
              dropdown.remove();
            }
          });
        }
      <\/script>
    `;
  }


  // ── Mobile Bottom Nav HTML ──
  function renderMobileNav(activeRoute) {
    const items = [
      { route: 'home',     icon: 'home',         label: 'Home' },
      { route: 'movies',   icon: 'movie',        label: 'Movies' },
      { route: 'tvshows',  icon: 'tv',           label: 'Shows' },
      { route: 'sports',   icon: 'sports_soccer',label: 'Sports' },
      { route: 'search',   icon: 'search',       label: 'Search' },
      { route: 'account',  icon: 'person',       label: 'Profile' }
    ];
    return `
      <nav class="mobile-nav">
        ${items.map(item => `
          <div class="mobile-nav-item ${activeRoute===item.route?'active':''}" 
               data-route="${item.route}" onclick="${item.route==='search' ? 'UI.openMobileSearch()' : `Router.navigate('${item.route}')`}">
            <span class="material-symbols-outlined ${activeRoute===item.route?'icon-fill':''}">${item.icon}</span>
            <span>${item.label}</span>
          </div>
        `).join('')}
      </nav>
    `;
  }

  // ── Footer HTML ──
  function renderFooter() {
    return `
      <footer class="footer">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:40px;max-width:var(--space-container-max);margin:0 auto" class="footer-inner">
          <div style="max-width:300px">
            <div style="font-family:'Montserrat',sans-serif;font-size:26px;font-weight:900;color:var(--c-primary-container);margin-bottom:10px;letter-spacing:-0.03em">CineStream</div>
            <p style="color:rgba(229,226,225,0.5);font-size:14px;line-height:1.6">Premium cinema streaming for the true enthusiast. Authoritative storytelling, delivered globally.</p>
          </div>
          <div style="display:flex;gap:64px;flex-wrap:wrap" class="footer-links">
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(229,226,225,0.35);margin-bottom:16px">Platform</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <a href="#" onclick="Router.navigate('home')" style="font-size:14px;color:rgba(229,226,225,0.6);transition:color 0.2s" onmouseover="this.style.color='var(--c-secondary-container)'" onmouseout="this.style.color='rgba(229,226,225,0.6)'">Home</a>
                <a href="#" onclick="Router.navigate('movies')" style="font-size:14px;color:rgba(229,226,225,0.6);transition:color 0.2s" onmouseover="this.style.color='var(--c-secondary-container)'" onmouseout="this.style.color='rgba(229,226,225,0.6)'">Movies</a>
                <a href="#" onclick="Router.navigate('tvshows')" style="font-size:14px;color:rgba(229,226,225,0.6);transition:color 0.2s" onmouseover="this.style.color='var(--c-secondary-container)'" onmouseout="this.style.color='rgba(229,226,225,0.6)'">TV Shows</a>
                <a href="#" onclick="Router.navigate('subscribe')" style="font-size:14px;color:rgba(229,226,225,0.6);transition:color 0.2s" onmouseover="this.style.color='var(--c-secondary-container)'" onmouseout="this.style.color='rgba(229,226,225,0.6)'">Plans</a>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(229,226,225,0.35);margin-bottom:16px">Legal</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <a href="#" style="font-size:14px;color:rgba(229,226,225,0.6)">Privacy Policy</a>
                <a href="#" style="font-size:14px;color:rgba(229,226,225,0.6)">Terms of Service</a>
                <a href="#" style="font-size:14px;color:rgba(229,226,225,0.6)">Cookie Policy</a>
                <a href="#" style="font-size:14px;color:rgba(229,226,225,0.6)">Help Center</a>
              </div>
            </div>
          </div>
        </div>
        <div style="max-width:var(--space-container-max);margin:40px auto 0;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <p style="font-size:12px;color:rgba(229,226,225,0.3)">© 2025 CineStream. All rights reserved.</p>
          <div style="display:flex;gap:8px">
            <button class="btn-icon" title="Language"><span class="material-symbols-outlined" style="font-size:18px">language</span></button>
            <button class="btn-icon" title="Share"><span class="material-symbols-outlined" style="font-size:18px">share</span></button>
          </div>
        </div>
      </footer>
    `;
  }

  // ── AI-powered Search ──
  let _searchTimer = null;
  let _searchDropdown = null;

  function handleSearch(query) {
    // Close if empty
    if (!query || query.trim().length < 1) {
      _closeSearchDropdown();
      return;
    }

    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(async () => {
      const q = query.trim();

      // Show loading state in dropdown
      _showSearchDropdown(`
        <div style="padding:20px;text-align:center;color:rgba(229,226,225,0.5)">
          <span class="material-symbols-outlined" style="font-size:20px;vertical-align:middle;margin-right:6px;animation:spin 1s linear infinite">autorenew</span>
          Searching with AI…
        </div>`);

      try {
        // 1) Local fuzzy match on already-loaded content
        const local = (window.DEMO_CONTENT || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          const g = (item.genre || '').toLowerCase();
          const ql = q.toLowerCase();
          return t.includes(ql) || g.includes(ql) || (item.industry || '').toLowerCase().includes(ql);
        });

        // 2) Live TMDB search (runs in parallel)
        let tmdbResults = [];
        try {
          if (window.TMDB) tmdbResults = await TMDB.search(q);
        } catch(e) {}

        // 3) Prefer TMDB results because their search engine is much more powerful
        let merged = [];
        if (tmdbResults && tmdbResults.length > 0) {
          merged = tmdbResults;
          // Mix in any local exact matches if they are somehow missing
          const seen = new Set(merged.map(i => i.id));
          for (const l of local) {
            if (!seen.has(l.id) && (l.title || '').toLowerCase() === q.toLowerCase()) {
              merged.unshift(l);
              seen.add(l.id);
            }
          }
        } else {
          merged = local;
        }
        window.registerDemoContent(merged);

        // 4) Keep the AI UI look but preserve TMDB's accurate relevance ranking
        const scored = merged.slice(0, 15).map((item, index) => {
          let matchPct = Math.max(75, 99 - (index * 2));
          const titleLower = (item.title || '').toLowerCase();
          const ql = q.toLowerCase();
          if (titleLower === ql) matchPct = 99;
          else if (titleLower.startsWith(ql)) matchPct = Math.max(matchPct, 95);
          
          return { 
            ...item, 
            aiMatchScore: matchPct, 
            aiReason: matchPct >= 95 ? 'Top match' : (matchPct >= 85 ? 'Strong match' : 'Possible match') 
          };
        });

        if (scored.length === 0) {
          _showSearchDropdown(`
            <div style="padding:24px;text-align:center">
              <span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;color:rgba(229,226,225,0.2)">search_off</span>
              <p style="color:rgba(229,226,225,0.5);font-size:14px">No results for "<strong>${q}</strong>"</p>
            </div>`);
          return;
        }

        // 5) Render grouped dropdown
        const movies  = scored.filter(i => i.type !== 'series').slice(0, 6);
        const series  = scored.filter(i => i.type === 'series').slice(0, 4);

        let html = `<div style="padding:12px 16px 6px;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(229,226,225,.35)">
            <span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;margin-right:4px">psychology</span>
            AI Results for "${q}"
          </div>`;

        const renderRow = (item) => `
          <div onclick="Router.navigate('detail',{id:'${item.id}',type:'${item.type||'movie'}'}); UI.closeSearch();"
               style="display:flex;gap:12px;align-items:center;padding:10px 16px;cursor:pointer;transition:background .15s;border-radius:6px;margin:2px 8px"
               onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='transparent'">
            <img src="${getSecurePosterUrl(item.poster || '')}" alt="${item.title}" loading="lazy"
                 style="width:36px;height:52px;object-fit:cover;border-radius:4px;flex-shrink:0;background:#1a1a1a"
                 onerror="this.style.display='none'">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
              <div style="font-size:11px;color:rgba(229,226,225,.45);margin-top:2px">${item.year||''} ${item.genre ? '• '+item.genre : ''}</div>
            </div>
            <div style="flex-shrink:0;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:rgba(50,220,120,.12);color:#32dc78;border:1px solid rgba(50,220,120,.25)">✨${item.aiMatchScore}%</div>
          </div>`;

        if (movies.length) {
          html += `<div style="padding:6px 16px 4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(229,226,225,.3)">🎬 Movies</div>`;
          html += movies.map(renderRow).join('');
        }
        if (series.length) {
          html += `<div style="padding:10px 16px 4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(229,226,225,.3)">📺 TV Series</div>`;
          html += series.map(renderRow).join('');
        }

        html += `<div style="padding:10px 16px;border-top:1px solid rgba(255,255,255,.05);margin-top:4px">
          <button onclick="Router.navigate('movies'); UI.closeSearch();" style="width:100%;background:none;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:8px;font-size:12px;color:rgba(229,226,225,.6);cursor:pointer">
            View all results for "${q}" →
          </button>
        </div>`;

        _showSearchDropdown(html);

      } catch (err) {
        console.warn('Search error:', err);
        _closeSearchDropdown();
      }
    }, 280);
  }

  function _showSearchDropdown(innerHtml) {
    let dropdown = document.getElementById('ai-search-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'ai-search-dropdown';
      dropdown.style.cssText = `
        position:fixed;top:72px;left:50%;transform:translateX(-50%);
        width:min(580px,94vw);
        background:rgba(18,18,18,0.97);
        backdrop-filter:blur(24px);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:12px;
        box-shadow:0 24px 60px rgba(0,0,0,0.7);
        z-index:9999;
        max-height:80vh;
        overflow-y:auto;
        animation:fadeInDown .15s ease;
      `;
      document.body.appendChild(dropdown);
      _searchDropdown = dropdown;
    }
    dropdown.innerHTML = innerHtml;
    dropdown.style.display = 'block';
  }

  function _closeSearchDropdown() {
    const d = document.getElementById('ai-search-dropdown');
    if (d) d.remove();
    _searchDropdown = null;
  }

  function closeSearch() {
    _closeSearchDropdown();
    // Clear search inputs
    document.querySelectorAll('#global-search-input,#movie-search,#show-search').forEach(el => el && (el.value = ''));
  }

  // ── Open Mobile Search Modal ──
  function openMobileSearch() {
    UI.showModal({
      title: 'Search',
      content: `
        <input type="text" id="mobile-search-input" placeholder="Search movies, shows…" style="width:100%;padding:8px;border-radius:6px;border:none;background:rgba(255,255,255,0.1);color:#fff;outline:none;" 
               oninput="UI.handleSearch(this.value)" />
      `,
      confirmText: 'Close',
      cancelText: '',
      onConfirm: () => {},
    });
  }

  // ── Format duration ──
  function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  // ── Format date ──
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ── Secure Poster URL Helper ──
  function getSecurePosterUrl(rawUrl) {
    if (!rawUrl) return "";
    return String(rawUrl).replace("http://", "https://");
  }

  // ── Build a poster card ──
  function posterCard(item, options = {}) {
    const { showRank = false, rank = 0, size = '' } = options;
    const hasAiScore = item.aiMatchScore !== undefined;
    return `
      <div class="poster-card-item ${size}" style="flex-shrink:0">
        <div class="poster-card" onclick="Router.navigate('detail', {id:'${item.id}', type:'${item.type||'movie'}'})" 
             title="${item.title}">
          <img src="${getSecurePosterUrl(item.poster_url || item.poster)}" alt="${item.title}" loading="lazy"
               onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22170%22 height=%22255%22 viewBox=%220 0 170 255%22%3E%3Crect width=%22170%22 height=%22255%22 fill=%22%231a1a1a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2236%22 fill=%22%23333%22%3E🎬%3C/text%3E%3C/svg%3E'">
          <div class="card-overlay">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
              ${item.genre ? `<span class="badge badge-blue">${item.genre}</span>` : ''}
              ${item.imdb ? `<span class="badge badge-gold">⭐ ${item.imdb}</span>` : ''}
              ${hasAiScore ? `<span class="badge badge-green" style="background:rgba(50,220,120,0.15); border-color:#32dc78; color:#32dc78">✨ ${item.aiMatchScore}% Match</span>` : ''}
            </div>
            <p style="font-size:12px;font-weight:600;color:#fff;line-height:1.3">${item.title}</p>
            <p style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px">${item.year || ''} ${item.duration ? '• ' + formatDuration(item.duration) : ''}</p>
          </div>
          ${showRank ? `<div style="position:absolute;top:8px;left:8px;background:var(--c-primary-container);color:#fff;font-size:11px;font-weight:800;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center">${rank}</div>` : ''}
          ${hasAiScore ? `<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);border:1px solid rgba(20,209,255,0.3);color:var(--c-secondary-container);font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:4px;display:flex;align-items:center;gap:3px">✨ AI</div>` : ''}
        </div>
        <p style="margin-top:8px;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</p>
        <p style="font-size:11px;color:rgba(229,226,225,0.45);margin-top:2px">${item.year || ''} ${item.genre ? '• ' + item.genre : ''}</p>
        ${hasAiScore && item.aiReason ? `
          <p style="font-size:11px; color:var(--c-secondary-container); margin-top:3px; font-weight:600; display:flex; align-items:center; gap:4px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <span class="material-symbols-outlined" style="font-size:13px;">psychology</span>
            <span>${item.aiReason}</span>
          </p>
        ` : ''}
      </div>
    `;
  }

  // ── Video card (continue watching) ──
  function videoCard(item) {
    const progress = item.progress || 0;
    const duration = item.duration || 100;
    const pct = Math.min(100, Math.round((progress / duration) * 100));
    return `
      <div class="video-card-item" style="flex-shrink:0">
        <div class="video-card" onclick="Router.navigate('player', {id:'${item.id}'})" title="Continue: ${item.title}">
          <img src="${getSecurePosterUrl(item.thumbnail || item.poster)}" alt="${item.title}" loading="lazy"
               onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22158%22 viewBox=%220 0 280 158%22%3E%3Crect width=%22280%22 height=%22158%22 fill=%22%231a1a1a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2236%22 fill=%22%23333%22%3E🎬%3C/text%3E%3C/svg%3E'">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 60%);display:flex;flex-direction:column;justify-content:flex-end;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:12px;font-weight:600">${item.title}${item.episode ? ' • ' + item.episode : ''}</span>
              <span style="font-size:11px;color:rgba(229,226,225,0.5)">${item.timeLeft || ''}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s" class="play-hover">
            <div style="width:48px;height:48px;background:var(--c-primary-container);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(229,9,20,0.5)">
              <span class="material-symbols-outlined icon-fill" style="color:#fff">play_arrow</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Add hover play effect ──
  function initVideoCardHovers() {
    document.querySelectorAll('.video-card').forEach(card => {
      const hover = card.querySelector('.play-hover');
      if (!hover) return;
      card.addEventListener('mouseenter', () => hover.style.opacity = '1');
      card.addEventListener('mouseleave', () => hover.style.opacity = '0');
    });
  }

  // ── Init all ripple buttons ──
  function initRipples() {
    document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => addRipple(btn));
  }

  // ── Update user avatar in navbar ──
  async function updateNavbarUser() {
    const user = await window.Auth.getUser().catch(() => null);
    if (!user) return;
    const avatarEl = document.getElementById('user-avatar');
    if (!avatarEl) return;

    const profile = await window.Auth.getProfile(user.id).catch(() => null);
    const name = profile?.full_name || user.email || 'User';
    const avatarUrl = profile?.avatar_url
      || user.user_metadata?.avatar_url
      || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=e50914&textColor=ffffff`;
    avatarEl.src = avatarUrl;
    avatarEl.alt = name;
  }

  return {
    toast,
    showModal,
    setLoading,
    addRipple,
    renderNavbar,
    renderMobileNav,
    renderFooter,
    handleSearch,
    closeSearch,
    formatDuration,
    formatDate,
    getSecurePosterUrl,
    posterCard,
    videoCard,
    initVideoCardHovers,
    initRipples,
    updateNavbarUser
  };
})();

window.UI = UI;

window.registerDemoContent = function(items) {
  if (!items) return;
  const list = Array.isArray(items) ? items : [items];
  if (!list.length) return;
  const existing = window.DEMO_CONTENT || [];
  const combined = [...existing, ...list];
  window.DEMO_CONTENT = Object.values(Object.fromEntries(combined.map(item => [item.id, item])));
};
