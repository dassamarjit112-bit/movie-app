/* TV Shows Page Controller */
const TVShowsPage = (() => {
  let allShows = [];
  let query = '';

  function init() {
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('tvshows');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('tvshows');
    UI.updateNavbarUser();

    allShows = window.DEMO_CONTENT.filter(c => c.type === 'series');
    // Add more shows for variety
    allShows = [
      ...allShows,
      { id:'s3', title:'Echoes of the North', type:'series', genre:'Drama', year:2023, duration:48, imdb:'8.3',
        poster:'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80&auto=format', seasons:1 },
      { id:'s4', title:'Pixels to Polygons', type:'series', genre:'Documentary', year:2022, duration:30, imdb:'8.6',
        poster:'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80&auto=format', seasons:1 },
      { id:'s5', title:'The Midnight Horizon', type:'series', genre:'Thriller', year:2024, duration:55, imdb:'8.8',
        poster:'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&q=80&auto=format', seasons:2 },
      { id:'s6', title:'Deep Frequency', type:'series', genre:'Sci-Fi', year:2024, duration:50, imdb:'8.1',
        poster:'https://images.unsplash.com/photo-1614851099511-773084f6911d?w=400&q=80&auto=format', seasons:1 },
    ];
    renderGrid(allShows);
  }

  function search(q) {
    query = q.toLowerCase();
    filter();
  }

  function filter() {
    const genre = document.getElementById('show-genre')?.value || '';
    const sort = document.getElementById('show-sort')?.value || 'trending';

    let results = allShows.filter(s => {
      const matchQ = !query || s.title.toLowerCase().includes(query);
      const matchG = !genre || s.genre === genre;
      return matchQ && matchG;
    });

    switch (sort) {
      case 'rating': results.sort((a, b) => parseFloat(b.imdb || 0) - parseFloat(a.imdb || 0)); break;
      case 'newest': results.sort((a, b) => b.year - a.year); break;
    }

    renderGrid(results);
  }

  function renderGrid(items) {
    const grid = document.getElementById('shows-grid');
    const noResults = document.getElementById('shows-no-results');
    const count = document.getElementById('show-count');

    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = '';
      if (noResults) noResults.style.display = 'block';
    } else {
      if (noResults) noResults.style.display = 'none';
      grid.innerHTML = items.map(item => {
        const card = UI.posterCard(item, {});
        return card.replace('</div>', `
          <div style="position:absolute;bottom:8px;left:8px;display:flex;gap:4px;opacity:0;transition:opacity 0.3s" class="show-meta">
            ${item.seasons ? `<span class="badge badge-blue">${item.seasons} Season${item.seasons>1?'s':''}</span>` : ''}
          </div>
        </div>`);
      }).join('');
    }

    if (count) count.textContent = `${items.length} show${items.length !== 1 ? 's' : ''}`;
  }

  return { init, search, filter };
})();

window.TVShowsPage = TVShowsPage;
