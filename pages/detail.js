/* CineStream — Detail Page Controller */

const DetailPage = (() => {
  let currentContent = null;
  let inWatchlist = false;

  async function init(params) {
    // Check if params has id
    const contentId = params.id || '1';
    const contentType = params.type || 'movie';

    // Find the item in demo content
    let item = window.DEMO_CONTENT.find(c => c.id === contentId);
    if (!item) {
      try {
        if (window.TMDB) {
          item = await TMDB.getDetails(contentId, contentType === 'series' ? 'tv' : 'movie');
          if (item) {
            window.registerDemoContent(item);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch details directly from TMDB:', err);
      }
    }
    if (!item) {
      item = window.DEMO_CONTENT[0];
    }
    currentContent = item;

    // Render nav and footer
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('home');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('home');
    UI.updateNavbarUser();
    UI.initRipples();

    // Populate data
    const img = document.getElementById('detail-backdrop-img');
    if (img) {
      img.style.opacity = '0';
      img.src = item.thumbnail || item.poster;
      img.style.opacity = '0.35';
    }

    const titleEl = document.getElementById('detail-title');
    if (titleEl) titleEl.textContent = item.title;

    const descEl = document.getElementById('detail-description');
    if (descEl) descEl.textContent = item.description;

    const typeBadge = document.getElementById('detail-type-badge');
    if (typeBadge) {
      typeBadge.textContent = item.type === 'series' ? 'TV SERIES' : 'MOVIE';
      typeBadge.className = item.type === 'series' ? 'badge badge-gold' : 'badge badge-red';
    }

    const genreBadge = document.getElementById('detail-genre-badge');
    if (genreBadge) {
      genreBadge.textContent = item.genre || 'Drama';
    }

    const ratingBadge = document.getElementById('detail-rating-badge');
    if (ratingBadge) {
      ratingBadge.textContent = `⭐ ${item.imdb || '8.0'} IMDb`;
    }

    const yearEl = document.getElementById('detail-year');
    if (yearEl) yearEl.textContent = item.year || '2024';

    const durationEl = document.getElementById('detail-duration');
    if (durationEl) {
      durationEl.textContent = item.type === 'series'
        ? `${item.seasons || 1} Season${(item.seasons || 1) > 1 ? 's' : ''}`
        : UI.formatDuration(item.duration || 120);
    }

    // Play Button Setup
    const playBtn = document.getElementById('detail-play-btn');
    if (playBtn) {
      playBtn.onclick = () => {
        Router.navigate('player', { id: item.id, type: item.type });
      };
    }

    // Watchlist Management
    setupWatchlistButton(item.id);

    // Episodes Section (only for Series)
    const episodesSection = document.getElementById('episodes-section');
    if (episodesSection) {
      if (item.type === 'series') {
        episodesSection.style.display = 'block';
        setupEpisodes(item);
      } else {
        episodesSection.style.display = 'none';
      }
    }

    // More like this row
    populateRecommendations(item);
  }

  async function setupWatchlistButton(contentId) {
    const watchlistBtn = document.getElementById('detail-watchlist-btn');
    const iconEl = document.getElementById('watchlist-icon');
    const textEl = document.getElementById('watchlist-text');

    if (!watchlistBtn || !iconEl || !textEl) return;

    const session = await window.Auth.getSession();
    if (session) {
      const watchlist = await Subscriptions.getWatchlist(session.user.id);
      inWatchlist = watchlist.some(w => w.content_id === contentId);
      updateWatchlistUI(inWatchlist);
    }

    watchlistBtn.onclick = async () => {
      if (!session) {
        UI.toast('Please log in to manage your watchlist.', 'info');
        Router.navigate('login');
        return;
      }
      
      UI.setLoading(watchlistBtn, true);
      try {
        const added = await Subscriptions.toggleWatchlist(session.user.id, contentId);
        inWatchlist = added;
        updateWatchlistUI(inWatchlist);
        UI.toast(added ? 'Added to Watchlist' : 'Removed from Watchlist', 'success');
      } catch (err) {
        UI.toast('Failed to update watchlist.', 'error');
      } finally {
        UI.setLoading(watchlistBtn, false);
      }
    };
  }

  function updateWatchlistUI(added) {
    const iconEl = document.getElementById('watchlist-icon');
    const textEl = document.getElementById('watchlist-text');
    if (!iconEl || !textEl) return;

    if (added) {
      iconEl.textContent = 'bookmark_added';
      iconEl.classList.add('icon-fill');
      iconEl.style.color = 'var(--c-secondary-container)';
      textEl.textContent = 'In Watchlist';
    } else {
      iconEl.textContent = 'bookmark_add';
      iconEl.classList.remove('icon-fill');
      iconEl.style.color = '';
      textEl.textContent = 'Watchlist';
    }
  }

  function setupEpisodes(item) {
    const select = document.getElementById('season-selector');
    const list = document.getElementById('episodes-list');
    if (!select || !list) return;

    // Reset season options
    select.innerHTML = '';
    const seasonsCount = item.seasons || 1;
    for (let i = 1; i <= seasonsCount; i++) {
      select.innerHTML += `<option value="${i}">Season ${i}</option>`;
    }

    const renderEpisodesForSeason = (seasonNum) => {
      const episodesMock = [
        { epNum: 1, title: 'The Threshold', desc: 'An unexpected discovery forces an archivist to re-evaluate what is real and what is manufactured.', duration: 52, thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80&auto=format' },
        { epNum: 2, title: 'Echo Chamber', desc: 'As the neural link expands, hidden echoes from the previous century begin to infect the network.', duration: 48, thumb: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80&auto=format' },
        { epNum: 3, title: 'Midnight Protokol', desc: 'A race against time through the abandoned servers of Sector 7 reveals who controls the stream.', duration: 50, thumb: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80&auto=format' },
        { epNum: 4, title: 'System Reset', desc: 'The division gets closer to finding the source code, but the internal security forces strike back.', duration: 55, thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&auto=format' },
      ];

      list.innerHTML = episodesMock.map(ep => `
        <div class="glass-card" style="display:flex; gap:20px; padding:16px; border-radius:12px; align-items:center; cursor:pointer;" onclick="Router.navigate('player', {id:'${item.id}', type:'series', ep:'S${seasonNum} E${ep.epNum}'})">
          <div style="position:relative; width:160px; aspect-ratio:16/9; border-radius:6px; overflow:hidden; flex-shrink:0;">
            <img src="${ep.thumb}" alt="Episode Thumbnail" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
              <span class="material-symbols-outlined" style="font-size:32px; color:#fff;">play_circle</span>
            </div>
          </div>
          <div style="flex:1">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
              <span style="font-size:14px; font-weight:700; color:#fff;">Episode ${ep.epNum}: ${ep.title}</span>
              <span style="font-size:12px; color:rgba(229,226,225,0.45); font-weight:500;">${ep.duration}m</span>
            </div>
            <p style="font-size:12.5px; color:rgba(229,226,225,0.65); line-height:1.4">${ep.desc}</p>
          </div>
        </div>
      `).join('');
    };

    select.onchange = (e) => {
      renderEpisodesForSeason(e.target.value);
    };

    // Render Season 1 default
    renderEpisodesForSeason('1');
  }

  async function populateRecommendations(item) {
    const row = document.getElementById('detail-recommendations-row');
    if (!row) return;

    try {
      const session = await window.Auth.getSession();
      const userId = session ? session.user.id : null;
      const recommended = await AIRecommender.getMoreLikeThis(item.id, userId, 6);
      row.innerHTML = recommended.map(rec => UI.posterCard(rec, { size: 'poster-card-item' })).join('');
    } catch (err) {
      console.error('Error populating AI detail recommendations:', err);
      // Fallback
      let matches = window.DEMO_CONTENT.filter(c => c.id !== item.id && c.genre === item.genre);
      if (matches.length < 4) {
        matches = window.DEMO_CONTENT.filter(c => c.id !== item.id);
      }
      const recommended = matches.sort(() => Math.random() - 0.5).slice(0, 6);
      row.innerHTML = recommended.map(rec => UI.posterCard(rec, { size: 'poster-card-item' })).join('');
    }
  }

  return { init };
})();

window.DetailPage = DetailPage;
