/* ============================================================
   CineStream — Sports API (Multi-Sport, Always Today's Date)
   ESPN Public API — No API Key Required
   ============================================================ */

const SportsAPI = (() => {
  let previousMatches = {};

  // ── Helper: Get today's date as YYYYMMDD (local time) ──
  function todayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  // ── Helper: Format match start time to local time string ──
  function formatMatchTime(dateStr) {
    if (!dateStr) return 'TBD';
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return 'TBD'; }
  }

  // ── Helper: Format date label ──
  function formatDateLabel(dateStr) {
    if (!dateStr) return 'Today';
    try {
      const dt = new Date(dateStr);
      const today = new Date();
      const diff = Math.round((dt - today) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return 'Today'; }
  }

  // ── Helper: Safe ESPN fetch with timeout ──
  async function espnFetch(url) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  // ── Helper: Parse ESPN event into our standard match object ──
  function parseESPNEvent(event, sportType, tournament, tournamentIcon) {
    if (!event.competitions || event.competitions.length === 0) return null;
    const comp = event.competitions[0];
    const home = comp.competitors?.find(c => c.homeAway === 'home') || comp.competitors?.[0];
    const away = comp.competitors?.find(c => c.homeAway === 'away') || comp.competitors?.[1];
    if (!home || !away) return null;

    const homeName = home.team?.displayName || home.team?.name || 'Home';
    const awayName = away.team?.displayName || away.team?.name || 'Away';
    const homeLogo = home.team?.logo || home.team?.logos?.[0]?.href || `https://ui-avatars.com/api/?name=${encodeURIComponent(homeName)}&background=1a1a2e&color=e50914&size=80&bold=true`;
    const awayLogo = away.team?.logo || away.team?.logos?.[0]?.href || `https://ui-avatars.com/api/?name=${encodeURIComponent(awayName)}&background=1a1a2e&color=14d1ff&size=80&bold=true`;

    const statusDetail = event.status?.type?.shortDetail || event.status?.type?.detail || 'Scheduled';
    const isLive = event.status?.type?.state === 'in' || statusDetail.toUpperCase().includes('LIVE') || event.status?.type?.id === '2';
    const isFinished = event.status?.type?.state === 'post' || event.status?.type?.completed === true;
    const isScheduled = event.status?.type?.state === 'pre';

    let statusLabel = statusDetail;
    if (isLive) statusLabel = event.status?.displayClock ? `LIVE · ${event.status.displayClock}` : 'LIVE';
    else if (isFinished) statusLabel = 'FT';
    else if (isScheduled) statusLabel = formatMatchTime(event.date);

    const homeScore = home.score ?? (isScheduled ? '-' : '0');
    const awayScore = away.score ?? (isScheduled ? '-' : '0');

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
      score: isScheduled ? 'vs' : `${homeScore} - ${awayScore}`,
      homeScore: String(homeScore),
      awayScore: String(awayScore),
      rawScoreHome: parseInt(homeScore) || 0,
      rawScoreAway: parseInt(awayScore) || 0,
      status: statusLabel,
      isLive,
      isFinished,
      isScheduled,
      matchTime: formatMatchTime(event.date),
      matchDate: formatDateLabel(event.date),
      venue: comp.venue?.fullName || comp.venue?.address?.city || '',
      rawDate: event.date || new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════
  // MAIN FETCH FUNCTION — fetches ALL sports for TODAY
  // ══════════════════════════════════════════════
  async function getLiveMatches() {
    const yyyymmdd = todayDateStr();
    const matches = [];

    // Define all sports endpoints
    const endpoints = [
      // ── Football ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'FIFA World Cup 2026', icon: '🌍' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'Premier League', icon: '⚽' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'La Liga', icon: '⚽' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'Bundesliga', icon: '⚽' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'Serie A', icon: '⚽' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'Ligue 1', icon: '⚽' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${yyyymmdd}`, sport: 'football', tournament: 'Champions League', icon: '⭐' },
      // ── Cricket ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard?dates=${yyyymmdd}`, sport: 'cricket', tournament: 'ODI International', icon: '🏏' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8041/scoreboard?dates=${yyyymmdd}`, sport: 'cricket', tournament: 'T20 International', icon: '🏏' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8040/scoreboard?dates=${yyyymmdd}`, sport: 'cricket', tournament: 'Test Match', icon: '🏏' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/cricket/8048/scoreboard?dates=${yyyymmdd}`, sport: 'cricket', tournament: 'IPL 2026', icon: '🏆' },
      // ── Basketball ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${yyyymmdd}`, sport: 'basketball', tournament: 'NBA 2026', icon: '🏀' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${yyyymmdd}`, sport: 'basketball', tournament: 'WNBA', icon: '🏀' },
      // ── Tennis ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${yyyymmdd}`, sport: 'tennis', tournament: 'ATP Tour', icon: '🎾' },
      { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=${yyyymmdd}`, sport: 'tennis', tournament: 'WTA Tour', icon: '🎾' },
      // ── American Football ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${yyyymmdd}`, sport: 'american-football', tournament: 'NFL 2026', icon: '🏈' },
      // ── Baseball ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${yyyymmdd}`, sport: 'baseball', tournament: 'MLB 2026', icon: '⚾' },
      // ── Hockey ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${yyyymmdd}`, sport: 'hockey', tournament: 'NHL Playoffs', icon: '🏒' },
      // ── Rugby ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/rugby/scoreboard?dates=${yyyymmdd}`, sport: 'rugby', tournament: 'Rugby Union', icon: '🏉' },
      // ── Golf ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?dates=${yyyymmdd}`, sport: 'golf', tournament: 'PGA Tour', icon: '⛳' },
      // ── MMA / Boxing ──
      { url: `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates=${yyyymmdd}`, sport: 'mma', tournament: 'UFC', icon: '🥊' },
    ];

    // Fetch all in parallel
    const results = await Promise.all(endpoints.map(ep => espnFetch(ep.url)));

    results.forEach((data, i) => {
      if (!data || !data.events) return;
      const ep = endpoints[i];
      data.events.forEach(event => {
        const match = parseESPNEvent(event, ep.sport, ep.tournament, ep.icon);
        if (match) matches.push(match);
      });
    });

    // Detect score changes for animations
    matches.forEach(match => {
      if (previousMatches[match.matchId]) {
        if (match.rawScoreHome > previousMatches[match.matchId].rawScoreHome ||
            match.rawScoreAway > previousMatches[match.matchId].rawScoreAway) {
          match.scoreChanged = true;
        }
      }
      previousMatches[match.matchId] = {
        rawScoreHome: match.rawScoreHome,
        rawScoreAway: match.rawScoreAway
      };
    });

    // Sort: LIVE first, then scheduled by time, then finished
    matches.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isScheduled && b.isFinished) return -1;
      if (a.isFinished && b.isScheduled) return 1;
      return new Date(a.rawDate) - new Date(b.rawDate);
    });

    return matches;
  }

  async function getMatchDetails(matchId) {
    const matches = await getLiveMatches();
    return matches.find(m => m.matchId === matchId) || null;
  }

  return { getLiveMatches, getMatchDetails, todayDateStr };
})();

window.SportsAPI = SportsAPI;
