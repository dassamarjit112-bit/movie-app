/* ============================================================
   CineStream — Movies Page Controller (v2 with TMDB Categories)
   ============================================================ */
const MoviesPage = (() => {
  let allMovies = [];
  let filteredMovies = [];
  let query = '';
  let currentIndustry = 'all';
  let page = 1;
  const PAGE_SIZE = 30;

  // Category definitions – each fetched from TMDB
  const SECTIONS = [
    { id: 'trending',   label: '🔥 Trending Now',        icon: 'local_fire_department', fn: () => TMDB.fetchTrending() },
    { id: 'bollywood',  label: '🇮🇳 Bollywood Latest',    icon: 'movie', fn: () => TMDB.fetchBollywood() },
    { id: 'hollywood',  label: '🌍 Hollywood Blockbusters',icon: 'theaters', fn: () => TMDB.fetchHollywood() },
    { id: 'tollywood',  label: '🎭 Tollywood Hits',       icon: 'star', fn: () => TMDB.fetchTollywood() },
    { id: 'south',      label: '🌴 South Indian Cinema',  icon: 'movie_filter', fn: () => TMDB.fetchSouthMovies() },
    { id: 'toprated',   label: '⭐ Top Rated All Time',   icon: 'grade', fn: () => TMDB.fetchTopRated() },
  ];

  async function init() {
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('movies');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('movies');
    UI.updateNavbarUser();

    // Wire up search input
    const searchInput = document.getElementById('movie-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (q.length > 0) {
          UI.handleSearch(q);
          showSearchMode(q);
        } else {
          UI.closeSearch();
          showCategoryMode();
        }
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { searchInput.value = ''; UI.closeSearch(); showCategoryMode(); }
      });
    }

    // Wire up genre / sort filters
    document.getElementById('genre-filter')?.addEventListener('change', () => filter());
    document.getElementById('sort-filter')?.addEventListener('change', () => filter());

    // Show skeleton immediately
    document.getElementById('movies-loading').style.display = 'block';
    document.getElementById('movies-categories').style.display = 'none';
    document.getElementById('movies-grid-wrapper').style.display = 'none';

    // Load all sections in parallel from TMDB
    try {
      const results = await Promise.all(SECTIONS.map(s => s.fn().catch(() => [])));
      SECTIONS.forEach((s, i) => { s.data = results[i]; });

      // Populate master list (movies only)
      const all = results.flat().filter(m => m.type !== 'series');
      const unique = Object.values(Object.fromEntries(all.filter(m => m.poster).map(m => [m.id, m])));
      allMovies = unique;
      window.DEMO_CONTENT = [...(window.DEMO_CONTENT || []), ...unique].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
    } catch(e) {
      console.warn('TMDB fetch failed:', e);
      allMovies = (window.DEMO_CONTENT || []).filter(c => c.type !== 'series');
    }

    document.getElementById('movies-loading').style.display = 'none';
    showCategoryMode();
  }

  /* ── Category Mode: horizontal scroll rows per section ── */
  function showCategoryMode() {
    document.getElementById('movies-categories').style.display = 'block';
    document.getElementById('movies-grid-wrapper').style.display = 'none';

    const container = document.getElementById('movies-categories');

    // Filter sections by industry tab if needed
    const sections = currentIndustry === 'all' ? SECTIONS : SECTIONS.filter(s => {
      if (currentIndustry === 'Bollywood') return s.id === 'bollywood';
      if (currentIndustry === 'Hollywood') return s.id === 'hollywood';
      if (currentIndustry === 'Tollywood' || currentIndustry === 'Tamil' || currentIndustry === 'Malayalam' || currentIndustry === 'Kannada') return s.id === 'south' || s.id === 'tollywood';
      if (currentIndustry === 'TV Serial' || currentIndustry === 'Web Series') return false;
      return true;
    });

    container.innerHTML = sections.map(section => {
      const items = (section.data || []).filter(m => m.type !== 'series').slice(0, 20);
      if (!items.length) return '';

      return `
        <div class="category-section" style="margin-bottom:40px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 var(--space-margin-desktop)">
            <h2 class="section-title" style="display:flex;align-items:center;gap:8px;font-size:20px">
              <span class="material-symbols-outlined" style="font-size:22px;color:var(--c-primary-container)">${section.icon}</span>
              ${section.label}
            </h2>
            <button onclick="MoviesPage.seeAll('${section.id}')" class="btn btn-ghost" style="font-size:12px;padding:6px 14px;border-radius:6px">
              See All <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle">chevron_right</span>
            </button>
          </div>
          <div class="scroll-row" style="padding:0 var(--space-margin-desktop) 12px;gap:14px">
            ${items.map((item, idx) => UI.posterCard(item, { showRank: section.id === 'toprated', rank: idx + 1 })).join('')}
          </div>
        </div>`;
    }).join('');

    if (!container.innerHTML.trim()) {
      container.innerHTML = `<div style="text-align:center;padding:80px 0;color:rgba(229,226,225,0.4)">
        <span class="material-symbols-outlined" style="font-size:64px;display:block;margin-bottom:16px">movie_off</span>
        <p>No content available. Check back soon.</p></div>`;
    }
  }

  /* ── See All for a specific section ── */
  function seeAll(sectionId) {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    const items = (section.data || []).filter(m => m.type !== 'series');

    document.getElementById('movies-categories').style.display = 'none';
    document.getElementById('movies-grid-wrapper').style.display = 'block';

    const grid = document.getElementById('movies-grid');
    const count = document.getElementById('movie-count');
    const heading = document.getElementById('grid-heading');
    if (heading) heading.textContent = section.label;
    if (count) count.textContent = `${items.length} titles`;

    grid.innerHTML = items.map(item => UI.posterCard(item, {})).join('');
    grid.style.display = 'grid';
    document.getElementById('no-results').style.display = 'none';

    // Show back button
    const backBtn = document.getElementById('back-to-categories');
    if (backBtn) backBtn.style.display = 'inline-flex';
  }

  /* ── Search mode: flat grid ── */
  function showSearchMode(q) {
    const genre  = document.getElementById('genre-filter')?.value || '';
    const sort   = document.getElementById('sort-filter')?.value || 'trending';

    let results = allMovies.filter(m => {
      const t = (m.title || '').toLowerCase();
      const ql = q.toLowerCase();
      const matchQ = t.includes(ql) || (m.genre || '').toLowerCase().includes(ql) || (m.industry || '').toLowerCase().includes(ql);
      const matchG = !genre || m.genre === genre;
      return matchQ && matchG;
    });

    switch (sort) {
      case 'rating': results.sort((a, b) => parseFloat(b.imdb) - parseFloat(a.imdb)); break;
      case 'newest': results.sort((a, b) => b.year - a.year); break;
      case 'az':     results.sort((a, b) => a.title.localeCompare(b.title)); break;
    }

    document.getElementById('movies-categories').style.display = 'none';
    document.getElementById('movies-grid-wrapper').style.display = 'block';

    const grid      = document.getElementById('movies-grid');
    const noResults = document.getElementById('no-results');
    const count     = document.getElementById('movie-count');
    const heading   = document.getElementById('grid-heading');
    if (heading) heading.textContent = `Results for "${q}"`;

    if (results.length === 0) {
      grid.style.display = 'none';
      if (noResults) noResults.style.display = 'block';
    } else {
      if (noResults) noResults.style.display = 'none';
      grid.style.display = 'grid';
      grid.innerHTML = results.map(item => UI.posterCard(item, {})).join('');
    }
    if (count) count.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

    const backBtn = document.getElementById('back-to-categories');
    if (backBtn) backBtn.style.display = 'inline-flex';
  }

  function search(q) {
    query = q;
    if (!q || q.trim().length === 0) { showCategoryMode(); return; }
    showSearchMode(q);
  }

  function filter() {
    if (query) showSearchMode(query);
    else showCategoryMode();
  }

  function setIndustry(ind) {
    currentIndustry = ind;
    document.querySelectorAll('.industry-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-industry="${ind}"]`)?.classList.add('active');

    // If it's TV, redirect
    if (ind === 'TV Serial' || ind === 'Web Series') {
      Router.navigate('tvshows');
      return;
    }
    showCategoryMode();
  }

  function clearSearch() {
    query = '';
    const searchInput = document.getElementById('movie-search');
    if (searchInput) searchInput.value = '';
    const genreSelect = document.getElementById('genre-filter');
    if (genreSelect) genreSelect.value = '';
    const sortSelect = document.getElementById('sort-filter');
    if (sortSelect) sortSelect.value = 'trending';
    currentIndustry = 'all';
    document.querySelectorAll('.industry-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-industry="all"]')?.classList.add('active');
    UI.closeSearch();
    showCategoryMode();
    const backBtn = document.getElementById('back-to-categories');
    if (backBtn) backBtn.style.display = 'none';
  }

  return { init, search, filter, setIndustry, loadMore, seeAll, clearSearch };
})();

window.MoviesPage = MoviesPage;
