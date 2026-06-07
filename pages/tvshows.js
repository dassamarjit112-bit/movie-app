/* ============================================================
   CineStream — TV Shows Page Controller v2 (TMDB Categories)
   ============================================================ */
const TVShowsPage = (() => {
  let allShows = [];
  let query = '';

  const SECTIONS = [
    { id: 'trending_tv',  label: '🔥 Trending Series',     icon: 'local_fire_department', fn: async () => { const r = await TMDB.fetchTrending(); return r.filter(i => i.type === 'series'); }},
    { id: 'hindi_series', label: '🇮🇳 Hindi Web Series',    icon: 'movie', fn: () => TMDB.fetchTVSeries().then(r => r.filter(i => i.language === 'Hindi')) },
    { id: 'eng_series',   label: '🌍 International Hits',   icon: 'public', fn: () => TMDB.fetchTVSeries().then(r => r.filter(i => i.language === 'English')) },
    { id: 'crime',        label: '🔍 Crime & Thriller',     icon: 'gavel', fn: () => TMDB.fetchTVSeries().then(r => r.filter(i => i.genre === 'Crime' || i.genre === 'Thriller')) },
    { id: 'drama',        label: '🎭 Drama Series',         icon: 'theater_comedy', fn: () => TMDB.fetchTVSeries().then(r => r.filter(i => i.genre === 'Drama')) },
    { id: 'scifi',        label: '🚀 Sci-Fi & Fantasy',     icon: 'rocket', fn: () => TMDB.fetchTVSeries().then(r => r.filter(i => i.genre === 'Sci-Fi' || i.genre === 'Fantasy')) },
  ];

  async function init() {
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('tvshows');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('tvshows');
    UI.updateNavbarUser();

    // Wire search
    const searchInput = document.getElementById('show-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (q.length > 0) { UI.handleSearch(q); showSearchMode(q); }
        else { UI.closeSearch(); showCategoryMode(); }
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { searchInput.value = ''; UI.closeSearch(); showCategoryMode(); }
      });
    }

    document.getElementById('shows-loading').style.display = 'block';
    document.getElementById('shows-categories').style.display = 'none';

    try {
      const results = await Promise.all(SECTIONS.map(s => s.fn().catch(() => [])));
      SECTIONS.forEach((s, i) => { s.data = results[i]; });
      const all = results.flat();
      const unique = Object.values(Object.fromEntries(all.filter(m => m.poster).map(m => [m.id, m])));
      allShows = unique;
      window.DEMO_CONTENT = [...(window.DEMO_CONTENT || []), ...unique].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
    } catch(e) {
      allShows = (window.DEMO_CONTENT || []).filter(c => c.type === 'series');
    }

    document.getElementById('shows-loading').style.display = 'none';
    showCategoryMode();
  }

  function showCategoryMode() {
    document.getElementById('shows-categories').style.display = 'block';
    document.getElementById('shows-grid-wrapper').style.display = 'none';

    const container = document.getElementById('shows-categories');

    container.innerHTML = SECTIONS.map(section => {
      const items = (section.data || []).filter(i => i.type === 'series').slice(0, 20);
      if (!items.length) return '';
      return `
        <div class="category-section" style="margin-bottom:40px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 var(--space-margin-desktop)">
            <h2 class="section-title" style="display:flex;align-items:center;gap:8px;font-size:20px">
              <span class="material-symbols-outlined" style="font-size:22px;color:var(--c-secondary-container)">${section.icon}</span>
              ${section.label}
            </h2>
            <button onclick="TVShowsPage.seeAll('${section.id}')" class="btn btn-ghost" style="font-size:12px;padding:6px 14px;border-radius:6px">
              See All <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle">chevron_right</span>
            </button>
          </div>
          <div class="scroll-row" style="padding:0 var(--space-margin-desktop) 12px;gap:14px">
            ${items.map((item, idx) => UI.posterCard(item, {})).join('')}
          </div>
        </div>`;
    }).join('');

    if (!container.innerHTML.trim()) {
      container.innerHTML = `<div style="text-align:center;padding:80px 0;color:rgba(229,226,225,0.4)">
        <span class="material-symbols-outlined" style="font-size:64px;display:block;margin-bottom:16px">tv_off</span>
        <p>No shows found. Check back soon.</p></div>`;
    }
  }

  function seeAll(sectionId) {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    const items = (section.data || []).filter(i => i.type === 'series');

    document.getElementById('shows-categories').style.display = 'none';
    document.getElementById('shows-grid-wrapper').style.display = 'block';

    const grid = document.getElementById('shows-grid');
    const count = document.getElementById('show-count');
    const heading = document.getElementById('shows-grid-heading');
    if (heading) heading.textContent = section.label;
    if (count) count.textContent = `${items.length} shows`;
    grid.innerHTML = items.map(item => UI.posterCard(item, {})).join('');
    grid.style.display = 'grid';
    document.getElementById('shows-no-results').style.display = 'none';

    const backBtn = document.getElementById('back-to-shows');
    if (backBtn) backBtn.style.display = 'inline-flex';
  }

  function showSearchMode(q) {
    const genre = document.getElementById('show-genre')?.value || '';
    let results = allShows.filter(s => {
      const t = (s.title || '').toLowerCase();
      const ql = q.toLowerCase();
      const matchQ = t.includes(ql) || (s.genre || '').toLowerCase().includes(ql);
      const matchG = !genre || s.genre === genre;
      return matchQ && matchG;
    });

    document.getElementById('shows-categories').style.display = 'none';
    document.getElementById('shows-grid-wrapper').style.display = 'block';

    const grid      = document.getElementById('shows-grid');
    const noResults = document.getElementById('shows-no-results');
    const count     = document.getElementById('show-count');
    const heading   = document.getElementById('shows-grid-heading');
    if (heading) heading.textContent = `Results for "${q}"`;

    if (results.length === 0) {
      grid.style.display = 'none';
      if (noResults) noResults.style.display = 'block';
    } else {
      if (noResults) noResults.style.display = 'none';
      grid.style.display = 'grid';
      grid.innerHTML = results.map(item => UI.posterCard(item, {})).join('');
    }
    if (count) count.textContent = `${results.length} show${results.length !== 1 ? 's' : ''}`;

    const backBtn = document.getElementById('back-to-shows');
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

  function clearSearch() {
    query = '';
    const searchInput = document.getElementById('show-search');
    if (searchInput) searchInput.value = '';
    const genreSelect = document.getElementById('show-genre');
    if (genreSelect) genreSelect.value = '';
    const sortSelect = document.getElementById('show-sort');
    if (sortSelect) sortSelect.value = 'trending';
    UI.closeSearch();
    showCategoryMode();
    const backBtn = document.getElementById('back-to-shows');
    if (backBtn) backBtn.style.display = 'none';
  }

  return { init, search, filter, seeAll, clearSearch };
})();

window.TVShowsPage = TVShowsPage;
