/* ============================================================
   CineStream — Sports API (Multi-Sport + News + Today-Aware)
   ESPN Public API — No API Key Required
   Auto-detects today's date in local timezone
   ============================================================ */

const SportsAPI = (() => {
  let previousMatches = {};

  // ── Get today's and tomorrow's dates as YYYYMMDD in LOCAL timezone ──
  function todayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function tomorrowDateStr() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  // ── Format to local time string ──
  function toLocalTime(dateStr) {
    if (!dateStr) return 'TBD';
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return 'TBD'; }
  }

  // ── Date label relative to today ──
  function toDateLabel(dateStr) {
    if (!dateStr) return 'Today';
    try {
      const dt = new Date(dateStr);
      const now = new Date();
      const dtDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = Math.round((dtDay - nowDay) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return 'Today'; }
  }

  // ── Whether a match is "today" or "tomorrow" in local time ──
  function isTodayOrTomorrow(dateStr) {
    if (!dateStr) return true;
    try {
      const dt = new Date(dateStr);
      const now = new Date();
      const dtDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = Math.round((dtDay - nowDay) / 86400000);
      return diff >= -3 && diff <= 7; // Show recent and upcoming matches
    } catch { return true; }
  }

  // ── Safe fetch with 8s timeout ──
  async function espnFetch(url) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok ? res.json() : null;
    } catch { return null; }
  }

  // ── Parse ESPN event → standard match object ──
  function parseEvent(event, sportType, tournament, tournamentIcon) {
    if (!event.competitions?.length) return null;
    const comp = event.competitions[0];
    const home = comp.competitors?.find(c => c.homeAway === 'home') || comp.competitors?.[0];
    const away = comp.competitors?.find(c => c.homeAway === 'away') || comp.competitors?.[1];
    if (!home || !away) return null;

    const homeName = home.team?.displayName || home.team?.name || home.athlete?.displayName || home.athlete?.shortName || 'Player 1';
    const awayName = away.team?.displayName || away.team?.name || away.athlete?.displayName || away.athlete?.shortName || 'Player 2';

    // Best available logo
    const homeLogo = home.team?.logo || home.team?.logos?.[0]?.href || home.athlete?.headshot?.href || home.athlete?.flag?.href
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(home.team?.abbreviation || homeName.substring(0,2))}&background=1a1a2e&color=ffffff&size=128&bold=true&rounded=true`;
    const awayLogo = away.team?.logo || away.team?.logos?.[0]?.href || away.athlete?.headshot?.href || away.athlete?.flag?.href
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(away.team?.abbreviation || awayName.substring(0,2))}&background=0d1b2a&color=14d1ff&size=128&bold=true&rounded=true`;

    const state = event.status?.type?.state || 'pre';
    const isLive = state === 'in';
    const isDone = state === 'post';
    const isPre  = state === 'pre';

    // Live clock (e.g. "72'" for football, "18.3 overs" for cricket)
    const clock = event.status?.displayClock || '';
    const period = event.status?.period || '';

    let statusLabel;
    if (isLive) {
      statusLabel = clock ? `${clock}${period ? ` · ${period}` : ''}` : 'LIVE';
    } else if (isDone) {
      statusLabel = 'Full Time';
    } else {
      statusLabel = toLocalTime(event.date);
    }

    const getScoreStr = (competitor) => {
      if (!isLive && !isDone) return '-';
      if (competitor.score?.displayValue !== undefined) return competitor.score.displayValue;
      return competitor.score ?? '0';
    };

    const homeScore = getScoreStr(home);
    const awayScore = getScoreStr(away);

    // Score string
    let scoreStr;
    if (isPre) scoreStr = 'vs';
    else if (sportType === 'cricket') {
      scoreStr = `${homeScore} – ${awayScore}`;
    } else {
      scoreStr = `${homeScore} – ${awayScore}`;
    }

    return {
      matchId: `${sportType.substring(0,2)}-${event.id}`,
      sportType,
      tournament,
      tournamentIcon,
      homeTeam: homeName,
      awayTeam: awayName,
      homeLogo,
      awayLogo,
      homeAbbr: home.team?.abbreviation || homeName.substring(0, 3).toUpperCase(),
      awayAbbr: away.team?.abbreviation || awayName.substring(0, 3).toUpperCase(),
      score: scoreStr,
      homeScore: String(homeScore),
      awayScore: String(awayScore),
      rawScoreHome: parseFloat(homeScore) || 0,
      rawScoreAway: parseFloat(awayScore) || 0,
      status: statusLabel,
      isLive,
      isFinished: isDone,
      isScheduled: isPre,
      matchTime: toLocalTime(event.date),
      matchDate: toDateLabel(event.date),
      venue: comp.venue?.fullName || comp.venue?.address?.city || '',
      rawDate: event.date || new Date().toISOString(),
      scoreChanged: false,
    };
  }

  // ══════════════════════════════════════════════
  // FETCH TODAY & TOMORROW'S MATCHES — ALL SPORTS
  // ══════════════════════════════════════════════
  async function getLiveMatches() {
    const dateRange = `${todayDateStr()}-${tomorrowDateStr()}`;

    const endpoints = [
      // ── Football ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`,     sport: 'football',          t: 'FIFA World Cup 2026', i: '🌍' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard`,          sport: 'football',          t: 'Premier League',      i: '⚽' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard`,          sport: 'football',          t: 'La Liga',             i: '🇪🇸' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard`,          sport: 'football',          t: 'Bundesliga',          i: '🇩🇪' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard`,          sport: 'football',          t: 'Serie A',             i: '🇮🇹' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard`,          sport: 'football',          t: 'Ligue 1',             i: '🇫🇷' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard`, sport: 'football',          t: 'Champions League',    i: '⭐' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard`,          sport: 'football',          t: 'MLS',                 i: '🇺🇸' },
      // ── Cricket ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8048/scoreboard`,          sport: 'cricket',           t: 'IPL 2026',            i: '🏆' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8041/scoreboard`,          sport: 'cricket',           t: 'T20 International',   i: '🏏' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard`,          sport: 'cricket',           t: 'ODI International',   i: '🏏' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8040/scoreboard`,          sport: 'cricket',           t: 'Test Match',          i: '🏏' },
      // ── Basketball ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`,        sport: 'basketball',        t: 'NBA 2026',            i: '🏀' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard`,       sport: 'basketball',        t: 'WNBA',                i: '🏀' },
      // ── Tennis ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard`,            sport: 'tennis',            t: 'ATP Tour',            i: '🎾' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard`,            sport: 'tennis',            t: 'WTA Tour',            i: '🎾' },
      // ── Formula 1 ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard`,             sport: 'f1',                t: 'Formula 1 2026',      i: '🏎️' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/racing/indycar/scoreboard`,        sport: 'f1',                t: 'IndyCar Series',      i: '🏁' },
      // ── Hockey ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard`,            sport: 'hockey',            t: 'NHL Playoffs',        i: '🏒' },
      // ── Baseball ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard`,          sport: 'baseball',          t: 'MLB 2026',            i: '⚾' },
      // ── American Football ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`,          sport: 'american-football', t: 'NFL 2026',            i: '🏈' },
      // ── Rugby ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/rugby/scoreboard`,                 sport: 'rugby',             t: 'Rugby Union',         i: '🏉' },
      // ── MMA ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard`,               sport: 'mma',               t: 'UFC',                 i: '🥊' },
      // ── Golf ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard`,                 sport: 'golf',              t: 'PGA Tour',            i: '⛳' },
    ];

    const results = await Promise.all(endpoints.map(ep => espnFetch(ep.url)));
    const matches = [];

    results.forEach((data, i) => {
      if (!data?.events?.length) return;
      const ep = endpoints[i];
      data.events.forEach(evt => {
        // Only include today's or tomorrow's events
        if (!isTodayOrTomorrow(evt.date)) return;
        const m = parseEvent(evt, ep.sport, ep.t, ep.i);
        if (m) {
          // Detect score changes
          const prev = previousMatches[m.matchId];
          if (prev && (m.rawScoreHome > prev.rawScoreHome || m.rawScoreAway > prev.rawScoreAway)) {
            m.scoreChanged = true;
          }
          previousMatches[m.matchId] = { rawScoreHome: m.rawScoreHome, rawScoreAway: m.rawScoreAway };
          matches.push(m);
        }
      });
    });

    // Sort: LIVE first → Scheduled by time → Finished last
    matches.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isScheduled && b.isFinished) return -1;
      if (a.isFinished && b.isScheduled) return 1;
      return new Date(a.rawDate) - new Date(b.rawDate);
    });

    return matches;
  }

  // ══════════════════════════════════════════════
  // FETCH SPORTS NEWS (ESPN News API)
  // ══════════════════════════════════════════════
  async function getNewsHeadlines() {
    const newsEndpoints = [
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news',   label: '⚽ FIFA World Cup' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/cricket/8048/news',        label: '🏏 IPL 2026' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',      label: '🏀 NBA' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/news',           label: '🏎️ Formula 1' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news',        label: '⚽ Premier League' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/news',          label: '🎾 Tennis' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news',          label: '🏒 NHL' },
    ];

    const results = await Promise.all(newsEndpoints.map(e => espnFetch(e.url)));
    const articles = [];

    results.forEach((data, i) => {
      if (!data?.articles?.length) return;
      // Take top 2 per sport
      data.articles.slice(0, 2).forEach(a => {
        articles.push({
          id: a.id || Math.random(),
          headline: a.headline || a.title || 'Latest Update',
          description: a.description || a.summary || '',
          published: a.published || new Date().toISOString(),
          image: a.images?.[0]?.url || a.image || null,
          link: a.links?.web?.href || a.link || '#',
          sport: newsEndpoints[i].label,
        });
      });
    });

    // Sort by publish date descending
    articles.sort((a, b) => new Date(b.published) - new Date(a.published));
    return articles.slice(0, 12); // top 12 total
  }

  async function getMatchDetails(matchId) {
    const matches = await getLiveMatches();
    return matches.find(m => m.matchId === matchId) || null;
  }

  return { getLiveMatches, getNewsHeadlines, getMatchDetails, todayDateStr };
})();

window.SportsAPI = SportsAPI;
