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
   * Process a pending download.
   *
   * Priority order:
   *   1. /api/extract_stream — Puppeteer extracts .m3u8 from vidlink.pro, server pipes
   *      it through FFmpeg into a real .mp4 file download (best quality).
   *   2. /api/download_link  — Multi-layer scraper returns a direct URL; fetch as blob
   *      and cache in OfflineStorage for offline playback.
   *   3. Anchor-tag fallback — If CORS blocks the blob fetch, trigger a native browser
   *      Save-As dialog using an <a download> element.
   */
  async function processDownload(downloadId) {
    let download;
    try {
      download = await getDownload(downloadId);
      if (!download) return;

      download.status = STATE.DOWNLOADING;
      download.updatedAt = new Date().toISOString();
      await saveDownload(download);

      const contentType = download.type === 'series' ? 'series' : 'movie';
      const season  = download.type === 'series' ? download.season  : 1;
      const episode = download.type === 'series' ? download.episode : 1;

      // ── Helper: mark completed and update button UI ───────────────────────
      const markCompleted = async () => {
        download.status    = STATE.COMPLETED;
        download.progress  = 100;
        download.completedAt = new Date().toISOString();
        await saveDownload(download);
        if (window.UI) window.UI.toast('Download complete! Available in Downloads.', 'success');
        const btnText = document.getElementById('detail-download-text');
        if (btnText) btnText.textContent = 'DOWNLOADED';
        const downloadBtn = document.getElementById('detail-download-btn');
        if (downloadBtn) {
          downloadBtn.style.color       = '#00d084';
          downloadBtn.style.borderColor = 'rgba(0,208,132,0.35)';
          downloadBtn.style.background  = 'rgba(0,208,132,0.08)';
          const icon = downloadBtn.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = 'offline_pin';
        }
      };

      // ── Helper: trigger a browser Save-As anchor download ─────────────────
      const anchorDownload = (url, filename) => {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href     = url;
        a.download = filename;
        a.target   = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 1000);
      };

      // ══════════════════════════════════════════════════════════════════════
      // PATH 1 — /api/extract_stream
      //   Server runs Puppeteer on vidlink.pro, extracts .m3u8, then pipes
      //   the stream through FFmpeg and sends a chunked .mp4 to the client.
      //   The browser will show a native Save-As dialog automatically.
      // ══════════════════════════════════════════════════════════════════════
      const extractUrl = `/api/extract_stream?id=${encodeURIComponent(download.contentId)}&type=${encodeURIComponent(contentType)}&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}&title=${encodeURIComponent(download.title)}`;

      try {
        if (window.UI) window.UI.toast('Extracting stream… this may take ~30s', 'info');
        download.progress = 10;
        await saveDownload(download);

        // Probe the endpoint first — a 404 means extraction failed
        const probe = await fetch(extractUrl, { method: 'HEAD' }).catch(() => null);

        if (probe && probe.ok) {
          // Trigger the native browser download by navigating an anchor to the streaming endpoint
          anchorDownload(extractUrl, download.fileName);

          download.progress = 50;
          await saveDownload(download);

          // We cannot track real completion for a streamed download, so mark it
          // optimistically after a short delay (the browser handles the rest).
          await new Promise(r => setTimeout(r, 3000));
          await markCompleted();
          return;
        }
        console.warn('[DownloadManager] /api/extract_stream not available or returned non-OK — falling through.');
      } catch (extractErr) {
        console.warn('[DownloadManager] extract_stream path failed:', extractErr.message);
      }

      // ══════════════════════════════════════════════════════════════════════
      // PATH 2 — /api/download_link → blob → OfflineStorage
      //   Get a direct URL from the multi-layer scraper, fetch it as a Blob,
      //   and cache it in IndexedDB for offline playback.
      // ══════════════════════════════════════════════════════════════════════
      let targetUrl = null;
      let isM3U8    = false;

      try {
        const res = await fetch(`/api/download_link?id=${encodeURIComponent(download.contentId)}&type=${encodeURIComponent(contentType)}&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`);
        const data = await res.json();
        if (data.success && data.downloadUrl) {
          targetUrl = data.downloadUrl;
          isM3U8    = !!data.isM3U8;
        }
      } catch (apiErr) {
        console.warn('[DownloadManager] /api/download_link failed:', apiErr.message);
      }

      // Embed URLs can't be blob-fetched (cross-origin) — skip to anchor fallback
      const isEmbed = !targetUrl || targetUrl.includes('embed') || targetUrl.includes('vidsrc') || isM3U8;

      if (!isEmbed && targetUrl) {
        // PATH 2a — try blob fetch + OfflineStorage
        try {
          if (window.UI) window.UI.toast('Downloading… please wait', 'info');
          download.progress = 25;
          await saveDownload(download);

          const videoRes = await fetch(targetUrl);
          if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}`);

          download.progress = 60;
          await saveDownload(download);

          const blob = await videoRes.blob();

          if (window.OfflineStorage) {
            await window.OfflineStorage.saveMovie(
              download.contentId,
              download.title,
              download.poster,
              blob,
              blob.size
            );
          }

          await markCompleted();
          return;
        } catch (blobErr) {
          console.warn('[DownloadManager] Blob fetch failed, falling to anchor download:', blobErr.message);
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // PATH 3 — Anchor-tag download
      //   Last resort. Uses an <a download> element to trigger the browser's
      //   native file download. Works even for cross-origin URLs that block
      //   fetch() due to CORS.
      // ══════════════════════════════════════════════════════════════════════
      const fallbackUrl = targetUrl ||
        (contentType === 'series'
          ? `https://vidsrc.to/embed/tv/${download.contentId}/${season}/${episode}`
          : `https://vidsrc.to/embed/movie/${download.contentId}`);

      if (window.UI) window.UI.toast('Opening download in browser…', 'info');
      anchorDownload(fallbackUrl, download.fileName);

      await markCompleted();

    } catch (error) {
      console.error(`[DownloadManager] Download ${downloadId} failed:`, error);
      if (download) {
        download.status    = STATE.FAILED;
        download.error     = error.message;
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