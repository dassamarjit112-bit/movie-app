/* ============================================================
   CineStream — Sports API Real Service (Free Public APIs)
   Fetches live fixtures from ESPN Public endpoints (No Keys Needed)
   ============================================================ */

const SportsAPI = (() => {
  // Store previous matches to detect score changes for animations
  let previousMatches = {};

  async function getLiveMatches() {
    const matches = [];

    // Format today's date as YYYYMMDD for ESPN API
    const today = new Date();
    const yyyymmdd = today.toISOString().split('T')[0].replace(/-/g, '');

    // 1. Fetch Football Matches (ESPN Public API - Multiple Leagues)
    const footballEndpoints = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${yyyymmdd}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${yyyymmdd}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${yyyymmdd}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${yyyymmdd}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/scoreboard?dates=${yyyymmdd}`
    ];

    const footballPromises = footballEndpoints.map(url => 
      fetch(url)
        .then(res => res.json())
        .catch(err => { console.warn(`Failed to fetch football data:`, err); return null; })
    );

    // 2. Fetch Cricket Matches (ESPN Public API - International/IPL)
    const cricketEndpoints = [
      '8039', // ODI
      '8041', // T20I
      '8040', // Test Matches
      '8048'  // IPL
    ];

    const cricketPromises = cricketEndpoints.map(league => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/cricket/${league}/scoreboard?dates=${yyyymmdd}`)
        .then(res => res.json())
        .catch(err => { console.warn(`Failed to fetch cricket data for ${league}:`, err); return null; })
    );

    // Process all requests in parallel
    const allResults = await Promise.all([...footballPromises, ...cricketPromises]);

    // Parse Football results
    allResults.slice(0, footballEndpoints.length).forEach((data, index) => {
      if (data && data.events) {
        const urlObj = new URL(footballEndpoints[index]);
        const path = urlObj.pathname;
        const tournamentName = path.includes('fifa.world') ? 'FIFA World Cup 2026' :
                               path.includes('uefa.champions') ? 'UEFA Champions League' :
                               path.includes('esp.1') ? 'La Liga' :
                               path.includes('uefa.euro') ? 'Euro 2024' :
                               'Premier League';
        
        data.events.forEach(event => {
          if (!event.competitions || event.competitions.length === 0) return;
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
          const homeName = homeTeam?.team?.name || 'Home';
          const awayName = awayTeam?.team?.name || 'Away';
          const matchTitle = `${homeName} vs ${awayName}`;
          
          matches.push({
            matchId: `fb-${event.id}`,
            sportType: 'football',
            tournament: tournamentName,
            homeTeam: homeName,
            awayTeam: awayName,
            homeLogo: homeTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${homeTeam?.team?.abbreviation}&backgroundColor=e50914`,
            awayLogo: awayTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${awayTeam?.team?.abbreviation}&backgroundColor=14d1ff`,
            score: `${homeTeam?.score ?? 0} - ${awayTeam?.score ?? 0}`,
            rawScoreHome: parseInt(homeTeam?.score ?? 0, 10),
            rawScoreAway: parseInt(awayTeam?.score ?? 0, 10),
            status: event.status.type.shortDetail,
            poster: `https://via.placeholder.com/500x750/0f1420/00d084?text=${encodeURIComponent(matchTitle)}`
          });
        });
      }
    });

    // Parse Cricket results
    allResults.slice(footballEndpoints.length).forEach((data, index) => {
      if (data && data.events) {
        const leagueId = cricketEndpoints[index];
        const tournamentName = leagueId === '8039' ? 'ODI International' :
                               leagueId === '8041' ? 'T20 International' :
                               leagueId === '8040' ? 'Test Match' :
                               leagueId === '8048' ? 'IPL 2026' : 'Cricket Match';

        data.events.forEach(event => {
          if (!event.competitions || event.competitions.length === 0) return;
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
          
          matches.push({
            matchId: `cr-${event.id}`,
            sportType: 'cricket',
            tournament: tournamentName,
            homeTeam: homeTeam?.team?.name || 'Home',
            awayTeam: awayTeam?.team?.name || 'Away',
            homeLogo: homeTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${homeTeam?.team?.abbreviation}&backgroundColor=e50914`,
            awayLogo: awayTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${awayTeam?.team?.abbreviation}&backgroundColor=14d1ff`,
            score: `${homeTeam?.score || '0/0'} vs ${awayTeam?.score || '0/0'}`,
            rawScoreHome: parseInt((homeTeam?.score || '0').split('/')[0], 10),
            rawScoreAway: parseInt((awayTeam?.score || '0').split('/')[0], 10),
            status: event.status.type.shortDetail
          });
        });
      }
    });

    // 2.5 Fetch FanCode Matches from our new Backend Proxy
    // Fetch FanCode matches from our backend proxy and merge into matches array
    try {
      const response = await fetch('/api/sports/fancode');
      const data = await response.json();
      if (data.success && data.matches) {
        data.matches.forEach(fcMatch => {
          // Map FanCode match fields to our internal structure
          matches.push({
            matchId: `fc-${fcMatch.id}`,
            sportType: 'football',
            tournament: fcMatch.tournament || 'FanCode',
            homeTeam: fcMatch.homeTeam || 'Home',
            awayTeam: fcMatch.awayTeam || 'Away',
            homeLogo: fcMatch.homeLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${fcMatch.homeTeam?.substring(0,2)}`,
            awayLogo: fcMatch.awayLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${fcMatch.awayTeam?.substring(0,2)}`,
            score: fcMatch.score || '0 - 0',
            rawScoreHome: parseInt(fcMatch.rawScoreHome ?? '0', 10),
            rawScoreAway: parseInt(fcMatch.rawScoreAway ?? '0', 10),
            status: fcMatch.status || 'LIVE',
            poster: fcMatch.poster || `https://via.placeholder.com/500x750?text=${encodeURIComponent(fcMatch.tournament)}`
          });
        });
      }
    } catch (err) {
      console.error('Failed to fetch FanCode matches:', err);
    }
    // Check for score changes for animations
    matches.forEach(match => {
      if (previousMatches[match.matchId]) {
        if (match.rawScoreHome > previousMatches[match.matchId].rawScoreHome ||
            match.rawScoreAway > previousMatches[match.matchId].rawScoreAway) {
          match.scoreChanged = true;
        }
      }
      // Save current state for next poll
      previousMatches[match.matchId] = {
        rawScoreHome: match.rawScoreHome,
        rawScoreAway: match.rawScoreAway
      };
    });

    return matches;
  }

  // --- Simulation Fallback logic ---
  function getSimulationMatches() {
    return [];
  }

  async function getMatchDetails(matchId) {
    const matches = await getLiveMatches();
    return matches.find(m => m.matchId === matchId) || null;
  }

  return { getLiveMatches, getMatchDetails };
})();

window.SportsAPI = SportsAPI;
