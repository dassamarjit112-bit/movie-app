/* ============================================================
   CineStream — Sports Stream Scraper / Server Resolver
   Priority chain: Fancode → VidSrc → DaddyLiveHD → Stream2Watch
   ============================================================ */

const SportsScraper = (() => {

  // ── Server Definitions ──
  const SERVERS = [
    {
      id: 'vidsrc',
      name: 'VidSrc Sports',
      icon: '🎯',
      description: 'Primary CDN • Fast',
      getUrl: (matchId) => `https://vidsrc.cc/v2/embed/sports/${matchId}`
    },
    {
      id: 'vidsrc2',
      name: 'VidSrc Pro',
      icon: '⚡',
      description: 'High Quality',
      getUrl: (matchId) => `https://vidsrc.pro/embed/sports/${matchId}`
    },
    {
      id: 'daddylive',
      name: 'DaddyLive HD',
      icon: '📡',
      description: 'HD Stream',
      getUrl: (matchId) => `https://daddylive.lat/embed/stream-${matchId}.php`
    },
    {
      id: 'stream2watch',
      name: 'Stream2Watch',
      icon: '🌐',
      description: 'Global CDN',
      getUrl: (matchId) => `https://www.stream2watch.gs/livestreams/football/${matchId}`
    },
    {
      id: 'fancode',
      name: 'FanCode',
      icon: '🏏',
      description: 'Cricket & Sports (Premium)',
      // ARCHITECTURE PLACEHOLDER: To enable FanCode streaming:
      // 1. Set up a backend proxy at your BACKEND_API_URL
      // 2. Your backend should: authenticate with FanCode API,
      //    extract the m3u8 URL from their response, and return it.
      // 3. Replace the placeholder below with:
      //    getUrl: (matchId) => `${window.ENV.BACKEND_API_URL}/fancode/stream/${matchId}`
      getUrl: (matchId) => {
        const backendUrl = window.ENV?.BACKEND_API_URL;
        if (backendUrl && backendUrl !== 'http://localhost:4000') {
          return `${backendUrl}/api/fancode/stream/${matchId}`;
        }
        // Fallback if no backend configured
        return null;
      }
    }
  ];

  function getServers() {
    return SERVERS;
  }

  function getStreamUrl(matchId, serverId = 'vidsrc') {
    // Strip internal prefixes so only raw ID goes to embed URLs
    const rawId = (matchId || '').replace(/^(sim-)?(fb|cr)-/, '');
    const server = SERVERS.find(s => s.id === serverId) || SERVERS[0];
    const url = server.getUrl(rawId);

    // If the selected server returns null (e.g. FanCode without backend), cascade to next
    if (!url) {
      console.warn(`[SportsScraper] Server "${serverId}" is not configured. Falling back to VidSrc.`);
      return SERVERS[0].getUrl(rawId);
    }

    return url;
  }

  return { getServers, getStreamUrl };
})();

window.SportsScraper = SportsScraper;
