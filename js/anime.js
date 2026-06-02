// AnimePage module
// Handles loading anime series and rendering them on the Anime page.
// Uses TMDB.search to fetch anime related titles.

const AnimePage = (() => {
  /** Initialize the anime page */
  async function init() {
    // Show loading indicator
    const gridWrapper = document.getElementById('anime-grid-wrapper');
    if (gridWrapper) gridWrapper.style.display = 'none';
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'anime-loading';
    loadingDiv.style.textAlign = 'center';
    loadingDiv.textContent = 'Loading anime...';
    document.getElementById('anime-page').appendChild(loadingDiv);

    try {
      const results = await TMDB.search('anime'); // simple keyword search
      renderAnime(results);
    } catch (e) {
      console.error('AnimePage: failed to load anime', e);
    } finally {
      const el = document.getElementById('anime-loading');
      if (el) el.remove();
    }
  }

  /** Render anime cards into the grid */
  function renderAnime(animeList) {
    const gridWrapper = document.getElementById('anime-grid-wrapper');
    const grid = document.getElementById('anime-grid');
    const noAnime = document.getElementById('no-anime');
    if (!gridWrapper || !grid) return;

    if (!animeList || animeList.length === 0) {
      gridWrapper.style.display = 'none';
      if (noAnime) noAnime.style.display = 'block';
      return;
    }

    grid.innerHTML = '';
    animeList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'anime-card';
      card.title = item.title || item.name || '';
      const img = document.createElement('img');
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src = TMDB.getPosterUrl(item.poster_path);
      card.appendChild(img);
      // Click to open detail page
      card.onclick = () => {
        Router.navigate('detail', { id: item.id });
      };
      grid.appendChild(card);
    });
    gridWrapper.style.display = 'block';
    if (noAnime) noAnime.style.display = 'none';
  }

  return { init };
})();

// Expose globally for router
window.AnimePage = AnimePage;
