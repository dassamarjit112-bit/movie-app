/* Movies Page Controller */
const MoviesPage = (() => {
  let allMovies = [];
  let query = '';

  function init() {
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('movies');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('movies');
    UI.updateNavbarUser();

    // Load only movies (type === 'movie')
    allMovies = window.DEMO_CONTENT.filter(c => c.type === 'movie');
    renderGrid(allMovies);
  }

  function search(q) {
    query = q.toLowerCase();
    filter();
  }

  function filter() {
    const genre = document.getElementById('genre-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'trending';

    let results = allMovies.filter(m => {
      const matchQ = !query || m.title.toLowerCase().includes(query) || m.genre.toLowerCase().includes(query);
      const matchG = !genre || m.genre === genre;
      return matchQ && matchG;
    });

    // Sort
    switch (sort) {
      case 'rating': results.sort((a, b) => parseFloat(b.imdb) - parseFloat(a.imdb)); break;
      case 'newest': results.sort((a, b) => b.year - a.year); break;
      case 'az': results.sort((a, b) => a.title.localeCompare(b.title)); break;
    }

    renderGrid(results);
  }

  function renderGrid(items) {
    const grid = document.getElementById('movies-grid');
    const noResults = document.getElementById('no-results');
    const count = document.getElementById('movie-count');

    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = '';
      noResults.style.display = 'block';
    } else {
      noResults.style.display = 'none';
      grid.innerHTML = items.map(item => UI.posterCard(item, {})).join('');
    }

    if (count) count.textContent = `${items.length} title${items.length !== 1 ? 's' : ''}`;
  }

  return { init, search, filter };
})();

window.MoviesPage = MoviesPage;
