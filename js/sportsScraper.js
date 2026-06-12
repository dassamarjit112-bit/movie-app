/* ============================================================
   CineStream — Sports Stream Scraper / Server Resolver
   Priority chain: Fancode → VidSrc → DaddyLiveHD → Stream2Watch
   ============================================================ */

const SportsScraper = (() => {

  // ── Server Definitions ──
  const SERVERS = [
    {
      id: 'vidsrc',
      name: 'Server 1',
      icon: '🎯',
      description: 'VidSrc Sports',
      getUrl: (matchId) => `https://vidsrc.cc/v2/embed/sports/${matchId}`
    },
    {
      id: 'daddylive',
      name: 'Server 2',
      icon: '📡',
      description: 'DaddyLive HD',
      getUrl: (matchId) => `https://vidsrc.xyz/embed/sports/${matchId}` // DaddyLive mapped here via matrix path
    },
    {
      id: 'fancode',
      name: 'FanCode Server',
      icon: '🏏',
      description: 'Cricket Premium (1080p)',
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
