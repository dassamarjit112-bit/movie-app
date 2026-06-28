/* CineStream — Downloads Page Controller */

const DownloadsPage = (() => {
  let activeOfflineUrl = null;

  async function init() {
    // Render nav and footer
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('downloads');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('downloads');
    UI.updateNavbarUser();

    await loadDownloads();

    const closeBtn = document.getElementById('close-offline-player-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        const videoEl = document.getElementById('offline-video-element');
        if (videoEl) {
          videoEl.pause();
          videoEl.src = '';
        }
        if (activeOfflineUrl) {
          URL.revokeObjectURL(activeOfflineUrl);
          activeOfflineUrl = null;
        }
        document.getElementById('offline-player-wrapper').style.display = 'none';
      };
    }
  }

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  async function loadDownloads() {
    const moviesGrid = document.getElementById('movies-grid');
    const seriesGrid = document.getElementById('series-grid');
    const moviesHeading = document.getElementById('movies-heading');
    const seriesHeading = document.getElementById('series-heading');
    const emptyState = document.getElementById('downloads-empty');
    
    if (!window.OfflineStorage) {
      moviesGrid.innerHTML = '';
      seriesGrid.innerHTML = '';
      emptyState.style.display = 'block';
      emptyState.querySelector('p').textContent = 'OfflineStorage is not available. Please clear cache and reload.';
      return;
    }

    try {
      const items = await window.OfflineStorage.getAllDownloadedMovies();
      
      if (items.length === 0) {
        moviesGrid.innerHTML = '';
        seriesGrid.innerHTML = '';
        moviesHeading.style.display = 'none';
        seriesHeading.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';

      const movies = items.filter(item => item.type !== 'series');
      const series = items.filter(item => item.type === 'series');

      if (movies.length > 0) {
        moviesHeading.style.display = 'block';
        moviesGrid.innerHTML = renderItems(movies);
      } else {
        moviesHeading.style.display = 'none';
        moviesGrid.innerHTML = '';
      }

      if (series.length > 0) {
        seriesHeading.style.display = 'block';
        seriesGrid.innerHTML = renderItems(series);
      } else {
        seriesHeading.style.display = 'none';
        seriesGrid.innerHTML = '';
      }

    } catch (err) {
      console.error('Failed to load downloads', err);
      UI.toast('Failed to load offline library', 'error');
    }
  }

  function renderItems(items) {
    return items.map(movie => `
      <div class="poster-card-item" style="position:relative;">
        <div class="poster-card" style="aspect-ratio: 2/3; position:relative; overflow:hidden; border-radius:12px; cursor:pointer;" onclick="DownloadsPage.playMovie('${movie.movieId}')">
          <img src="${movie.poster || 'https://placehold.co/300x450'}" alt="${movie.title}" style="width:100%; height:100%; object-fit:cover;" />
          <div class="card-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">
            <span class="material-symbols-outlined" style="font-size: 48px; color: #14d1ff;">play_circle</span>
          </div>
          <!-- Delete Button -->
          <button onclick="event.stopPropagation(); DownloadsPage.deleteMovie('${movie.movieId}')" class="btn btn-icon-circle" style="position:absolute; top:8px; right:8px; width:32px; height:32px; background:rgba(0,0,0,0.6); color:#ff4d4d; border:none; z-index:10;">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
        <h3 style="margin-top:12px; font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${movie.title}</h3>
        <p style="font-size:12px; color:rgba(255,255,255,0.4);">${formatBytes(movie.sizeBytes)}</p>
      </div>
    `).join('');
  }

  async function playMovie(movieId) {
    if (!window.OfflineStorage) return;
    try {
      const record = await window.OfflineStorage.getMovie(movieId);
      if (!record || !record.blob) {
        UI.toast('Movie data corrupted or not found.', 'error');
        return;
      }

      // Cleanup previous object url if exists
      if (activeOfflineUrl) {
        URL.revokeObjectURL(activeOfflineUrl);
      }

      activeOfflineUrl = URL.createObjectURL(record.blob);
      
      const titleEl = document.getElementById('offline-player-title');
      if (titleEl) titleEl.textContent = record.title;

      const videoEl = document.getElementById('offline-video-element');
      const wrapper = document.getElementById('offline-player-wrapper');
      
      if (videoEl && wrapper) {
        wrapper.style.display = 'block';
        videoEl.src = activeOfflineUrl;
        videoEl.play().catch(e => console.warn('Autoplay prevented', e));
        
        // Scroll to player
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

    } catch (err) {
      console.error('Failed to play movie', err);
      UI.toast('Error playing downloaded file.', 'error');
    }
  }

  async function deleteMovie(movieId) {
    if (!confirm('Are you sure you want to delete this downloaded movie?')) return;
    
    if (!window.OfflineStorage) return;
    try {
      await window.OfflineStorage.deleteMovie(movieId);
      UI.toast('Movie deleted from device.', 'success');
      loadDownloads(); // refresh grid
    } catch (err) {
      console.error('Failed to delete', err);
      UI.toast('Error deleting movie.', 'error');
    }
  }

  return { init, playMovie, deleteMovie };
})();

window.DownloadsPage = DownloadsPage;
