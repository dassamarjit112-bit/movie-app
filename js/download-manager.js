/* CineStream — Download Manager
   Manages in-app downloads with IndexedDB storage,
   progress tracking, and offline playback support.
*/

const DownloadManager = (() => {
  const DB_NAME = 'CineStreamDownloads';
  const DB_VERSION = 1;
  const STORE_NAME = 'downloads';
  let db = null;

  // Download states
  const STATE = {
    PENDING: 'pending',
    DOWNLOADING: 'downloading',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed'
  };

  /**
   * Initialize IndexedDB
   */
  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Save download record to IndexedDB
   */
  async function saveDownload(download) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(download);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get download by ID
   */
  async function getDownload(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all downloads for a user
   */
  async function getUserDownloads(userId) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const results = request.result || [];
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete download record
   */
  async function deleteDownload(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate unique download ID
   */
  function generateId() {
    return `dl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start a new download
   */
  async function startDownload({ id, title, type, season, episode, poster, userId }) {
    try {
      // Initialize DB if needed
      if (!db) await initDB();

      const downloadId = generateId();
      const now = new Date().toISOString();

      const downloadRecord = {
        id: downloadId,
        contentId: id,
        title,
        type,
        season: season || 1,
        episode: episode || 1,
        poster,
        userId,
        status: STATE.PENDING,
        progress: 0,
        totalSize: 0,
        downloadedSize: 0,
        manifestUrl: null,
        localPath: null,
        fileName: `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${type === 'series' ? `S${season}_E${episode}` : 'movie'}.mp4`,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        error: null
      };

      await saveDownload(downloadRecord);

      // Start the actual download process
      processDownload(downloadId);

      return downloadId;
    } catch (error) {
      console.error('[DownloadManager] Failed to start download:', error);
      return null;
    }
  }

  /**
   * Process a pending download via native OS download manager (Mobile & Desktop friendly)
   */
  async function processDownload(downloadId) {
    try {
      const download = await getDownload(downloadId);
      if (!download) return;

      // Update status
      download.status = STATE.DOWNLOADING;
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);

      const contentType = download.type === 'series' ? 'series' : 'movie';
      const season = download.type === 'series' ? download.season : '';
      const episode = download.type === 'series' ? download.episode : '';

      // Construct the GET URL for the FFmpeg stream
      const streamUrl = `/api/media/download_stream?id=${encodeURIComponent(download.contentId)}&title=${encodeURIComponent(download.title)}&type=${encodeURIComponent(contentType)}&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;

      // Use a hidden anchor tag to trigger the browser's native OS download manager
      const a = document.createElement('a');
      a.href = streamUrl;
      a.download = download.fileName || `${download.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);

      // Since the OS download manager takes over the background downloading,
      // we can mark the UI process as completed and let the device handle it.
      download.status = STATE.COMPLETED;
      download.progress = 100;
      download.completedAt = new Date().toISOString();
      await saveDownload(download);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Download Started', {
          body: `${download.title} is downloading via your device's download manager.`,
          icon: download.poster || '/icons/icon-192.png'
        });
      }

      if (typeof swingWebViewPlugin !== 'undefined' && swingWebViewPlugin.app && swingWebViewPlugin.app.methods) {
        try {
          swingWebViewPlugin.app.methods.sendNotification(download.title, 'Download started!');
        } catch (e) {
          console.warn('Native notification failed:', e);
        }
      }

    } catch (error) {
      console.error(`[DownloadManager] Download ${downloadId} failed:`, error);
      const download = await getDownload(downloadId);
      if (download) {
        download.status = STATE.FAILED;
        download.error = error.message;
        download.updatedAt = new Date().toISOString();
        await saveDownload(download);
      }
    }
  }

  /**
   * Store blob in IndexedDB
   */
  async function storeBlob(downloadId, blob) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(downloadId);
      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          reject(new Error('Download record not found'));
          return;
        }
        record.blob = blob;
        record.localPath = `blob://${downloadId}`;
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve(record.localPath);
        putRequest.onerror = () => reject(putRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get blob for offline playback
   */
  async function getDownloadBlob(downloadId) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(downloadId);
      request.onsuccess = () => {
        const record = request.result;
        if (record && record.blob) {
          resolve(URL.createObjectURL(record.blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Pause a download
   */
  async function pauseDownload(downloadId) {
    const download = await getDownload(downloadId);
    if (download && download.status === STATE.DOWNLOADING) {
      download.status = STATE.PAUSED;
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);
    }
  }

  /**
   * Resume a paused download
   */
  async function resumeDownload(downloadId) {
    const download = await getDownload(downloadId);
    if (download && download.status === STATE.PAUSED) {
      await processDownload(downloadId);
    }
  }

  /**
   * Cancel and delete a download
   */
  async function cancelDownload(downloadId) {
    const download = await getDownload(downloadId);
    if (download) {
      download.status = STATE.FAILED;
      download.error = 'Cancelled by user';
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);
      await deleteDownload(downloadId);
    }
  }

  /**
   * Clear completed downloads
   */
  async function clearCompleted(userId) {
    const downloads = await getUserDownloads(userId);
    const completed = downloads.filter(d => d.status === STATE.COMPLETED);
    for (const d of completed) {
      await deleteDownload(d.id);
    }
  }

  /**
   * Get storage usage estimate
   */
  async function getStorageEstimate() {
    if (!db) await initDB();
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageMB: Math.round((estimate.usage || 0) / (1024 * 1024)),
        quotaMB: Math.round((estimate.quota || 0) / (1024 * 1024))
      };
    }
    return { usage: 0, quota: 0, usageMB: 0, quotaMB: 0 };
  }

  /**
   * Format bytes to human-readable size
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration
   */
  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Initialize DB on module load
  initDB().catch(console.error);

  return {
    STATE,
    init: initDB,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    getDownload,
    getUserDownloads,
    clearCompleted,
    getDownloadBlob,
    getStorageEstimate,
    formatBytes,
    formatDuration
  };
})();

window.DownloadManager = DownloadManager;