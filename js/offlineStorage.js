/**
 * CineStream — Offline Storage Module
 * Wraps IndexedDB to save, retrieve, and delete large media Blobs.
 */

const DB_NAME = 'CineStreamOfflineCache';
const STORE_NAME = 'movies';
const DB_VERSION = 1;

const OfflineStorage = (() => {
  function getDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'movieId' });
        }
      };
      
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(request.error);
    });
  }

  async function saveMovie(movieId, title, poster, blobData, sizeBytes, metadata = {}) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Allow blobData to be null for link-based download tracking
      const record = {
        movieId: String(movieId),
        title: title,
        poster: poster,
        sizeBytes: sizeBytes || 0,
        downloadedAt: Date.now(),
        type: metadata.type || 'movie',
        season: metadata.season || null,
        episode: metadata.episode || null,
        // Only store blob if provided (avoids IndexedDB quota errors on large files)
        ...(blobData ? { blob: blobData } : {})
      };
      
      const request = store.put(record);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function getMovie(movieId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(String(movieId));
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllDownloadedMovies() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const list = request.result.map(item => ({
          movieId: item.movieId,
          title: item.title,
          poster: item.poster,
          sizeBytes: item.sizeBytes,
          downloadedAt: item.downloadedAt,
          type: item.type,
          season: item.season,
          episode: item.episode
        })).sort((a, b) => b.downloadedAt - a.downloadedAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteMovie(movieId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(String(movieId));
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  async function isDownloaded(movieId) {
    try {
      const item = await getMovie(movieId);
      return !!item;
    } catch {
      return false;
    }
  }

  return {
    saveMovie,
    getMovie,
    getAllDownloadedMovies,
    deleteMovie,
    isDownloaded
  };
})();

window.OfflineStorage = OfflineStorage;
