/* ============================================================
   CineStream — Sports Stream Scraper / Server Resolver
   Priority chain: Fancode → VidSrc → DaddyLiveHD → Stream2Watch
   ============================================================ */

const SportsScraper = (() => {

  // ── Server Definitions ──
  const SERVERS = [
    {
      id: 'streamed',
      name: 'Streamed.su Proxy',
      icon: '⚽',
      description: 'FIFA WC 2026 Live (4K)',
      getUrl: (matchId) => `https://streamed.su/watch/${matchId}`
    },
    {
      id: 'sportsurge',
      name: 'SportSurge V2',
      icon: '🔥',
      description: 'Global Sports (HD)',
      getUrl: (matchId) => `https://v2.sportsurge.net/watch/${matchId}`
    },
    {
      id: 'livetv',
      name: 'LiveTV Embed',
      icon: '📺',
      description: 'Multi-League Streams',
      getUrl: (matchId) => `https://livetv.sx/enx/eventinfo/${matchId}/`
    },
    {
      id: 'fancode',
      name: 'Premium HLS Server',
      icon: '🏏',
      description: 'Cricket Native Player (1080p)',
      getUrl: (matchId) => 'native_hls'
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
