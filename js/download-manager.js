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
   * Process a pending download
   */
  async function processDownload(downloadId) {
    try {
      const download = await getDownload(downloadId);
      if (!download) return;

      // Update status to downloading
      download.status = STATE.DOWNLOADING;
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);

      // Fetch download URL from API
      const contentType = download.type === 'series' ? 'series' : 'movie';
      const season = download.type === 'series' ? download.season : '';
      const episode = download.type === 'series' ? download.episode : '';

      const apiUrl = `/api/media/download?id=${download.contentId}&title=${encodeURIComponent(download.title)}&type=${contentType}&season=${season}&episode=${episode}`;

      const response = await fetch(apiUrl, { method: 'GET' });
      const data = await response.json();

      if (data.success && data.downloadUrl) {
        // Store manifest URL
        download.manifestUrl = data.downloadUrl;
        download.status = STATE.DOWNLOADING;
        await saveDownload(download);

        // Attempt to download the file
        await downloadFile(download);
      } else {
        throw new Error(data.error || 'Could not resolve download URL');
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
   * Download file using fetch + streams
   */
  async function downloadFile(download) {
    try {
      const response = await fetch(download.manifestUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalSize = contentLength ? parseInt(contentLength) : 0;
      download.totalSize = totalSize;
      await saveDownload(download);

      // Use streams to track progress
      const reader = response.body.getReader();
      let receivedSize = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedSize += value.length;
        download.downloadedSize = receivedSize;

        if (totalSize > 0) {
          download.progress = Math.round((receivedSize / totalSize) * 100);
        }

        download.updatedAt = new Date().toISOString();
        await saveDownload(download);
      }

      // Combine chunks into a single blob
      const blob = new Blob(chunks, { type: 'video/mp4' });

      // Store blob in IndexedDB
      download.localPath = await storeBlob(download.id, blob);
      download.status = STATE.COMPLETED;
      download.progress = 100;
      download.completedAt = new Date().toISOString();
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);

      // Trigger notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Download Complete', {
          body: `${download.title} is ready to watch offline.`,
          icon: download.poster || '/icons/icon-192.png'
        });
      }

      // Also call Swing2App native notification if available
      if (typeof swingWebViewPlugin !== 'undefined' && swingWebViewPlugin.app && swingWebViewPlugin.app.methods) {
        try {
          swingWebViewPlugin.app.methods.sendNotification(download.title, 'Download complete! Ready to watch offline.');
        } catch (e) {
          console.warn('Native notification failed:', e);
        }
      }

      return download;
    } catch (error) {
      download.status = STATE.FAILED;
      download.error = error.message;
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);
      throw error;
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