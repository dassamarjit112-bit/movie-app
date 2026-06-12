/* ============================================================
   CineStream — Sports API Real Service (Free Public APIs)
   Fetches live fixtures from ESPN Public endpoints (No Keys Needed)
   ============================================================ */

const SportsAPI = (() => {
  // Store previous matches to detect score changes for animations
  let previousMatches = {};

  async function getLiveMatches() {
    const matches = [];

    // 1. Fetch Football Matches (ESPN Public API - Multiple Leagues)
    const footballEndpoints = [
      'eng.1', // Premier League
      'esp.1', // La Liga
      'uefa.champions', // Champions League
      'fifa.world' // FIFA World Cup
    ];

    const footballPromises = footballEndpoints.map(league => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`)
        .then(res => res.json())
        .catch(err => { console.warn(`Failed to fetch football data for ${league}:`, err); return null; })
    );

    // 2. Fetch Cricket Matches (ESPN Public API - International/IPL)
    const cricketEndpoints = [
      '8039', // Internationals
      '8048'  // IPL
    ];

    const cricketPromises = cricketEndpoints.map(league => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/cricket/${league}/scoreboard`)
        .then(res => res.json())
        .catch(err => { console.warn(`Failed to fetch cricket data for ${league}:`, err); return null; })
    );

    // Process all requests in parallel
    const allResults = await Promise.all([...footballPromises, ...cricketPromises]);

    // Parse Football results
    allResults.slice(0, footballEndpoints.length).forEach((data, index) => {
      if (data && data.events) {
        const tournamentName = footballEndpoints[index] === 'fifa.world' ? 'FIFA World Cup' :
                               footballEndpoints[index] === 'uefa.champions' ? 'Champions League' :
                               footballEndpoints[index] === 'esp.1' ? 'La Liga' : 'Premier League';
        
        data.events.forEach(event => {
          if (!event.competitions || event.competitions.length === 0) return;
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
          
          matches.push({
            matchId: `fb-${event.id}`,
            sportType: 'football',
            tournament: tournamentName,
            homeTeam: homeTeam?.team?.name || 'Home',
            awayTeam: awayTeam?.team?.name || 'Away',
            homeLogo: homeTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${homeTeam?.team?.abbreviation}&backgroundColor=e50914`,
            awayLogo: awayTeam?.team?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${awayTeam?.team?.abbreviation}&backgroundColor=14d1ff`,
            score: `${homeTeam?.score ?? 0} - ${awayTeam?.score ?? 0}`,
            rawScoreHome: parseInt(homeTeam?.score ?? 0, 10),
            rawScoreAway: parseInt(awayTeam?.score ?? 0, 10),
            status: event.status.type.shortDetail
          });
        });
      }
    });

    // Parse Cricket results
    allResults.slice(footballEndpoints.length).forEach((data) => {
      if (data && data.events) {
        data.events.forEach(event => {
          if (!event.competitions || event.competitions.length === 0) return;
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
          
          matches.push({
            matchId: `cr-${event.id}`,
            sportType: 'cricket',
            tournament: event.season?.slug || 'Cricket',
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
    try {
      const response = await fetch('/api/sports/fancode');
      const data = await response.json();
      if (data.success && data.matches) {
        // Merge FanCode matches
        data.matches.forEach(fcMatch => {
          matches.push({
            ...fcMatch,
            // Fallbacks for score tracking
            rawScoreHome: 0,
            rawScoreAway: 0
          });
        });
      }
    } catch (err) {
      console.error("Failed to fetch FanCode data:", err);
    }

    // 3. Fallback / Simulation (If there are no live matches, provide a simulated match so the UI can be tested)
    if (matches.length === 0) {
      matches.push(...getSimulationMatches());
    }

    // Detect Score Changes for Animations
    matches.forEach(match => {
      match.animationTrigger = null; // 'goal', 'four', 'six'
      
      const prev = previousMatches[match.matchId];
      if (prev) {
        if (match.sportType === 'football') {
          if (match.rawScoreHome > prev.rawScoreHome || match.rawScoreAway > prev.rawScoreAway) {
            match.animationTrigger = 'goal';
          }
        } else if (match.sportType === 'cricket') {
          const runDiff = Math.max(match.rawScoreHome - prev.rawScoreHome, match.rawScoreAway - prev.rawScoreAway);
          if (runDiff >= 6) {
            match.animationTrigger = 'six';
          } else if (runDiff >= 4) {
            match.animationTrigger = 'four';
          }
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
  let simFootballScore = 0;
  let simCricketRuns = 120;
  function getSimulationMatches() {
    // Increment scores periodically to trigger UI animations during testing
    if (Math.random() > 0.7) simFootballScore++;
    if (Math.random() > 0.4) {
      const boundary = Math.random() > 0.5 ? 4 : 6;
      simCricketRuns += boundary;
    }
    
    return [
      {
        matchId: 'sim-fb-1',
        sportType: 'football',
        tournament: 'Simulated Premier League',
        homeTeam: 'Arsenal (SIM)',
        awayTeam: 'Chelsea (SIM)',
        homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
        awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png',
        score: `${simFootballScore} - 0`,
        rawScoreHome: simFootballScore,
        rawScoreAway: 0,
        status: 'LIVE'
      },
      {
        matchId: 'sim-cr-1',
        sportType: 'cricket',
        tournament: 'Simulated IPL',
        homeTeam: 'CSK (SIM)',
        awayTeam: 'MI (SIM)',
        homeLogo: 'https://a.espncdn.com/i/teamlogos/cricket/500/335974.png',
        awayLogo: 'https://a.espncdn.com/i/teamlogos/cricket/500/335978.png',
        score: `${simCricketRuns}/3 (14.2) vs 0/0`,
        rawScoreHome: simCricketRuns,
        rawScoreAway: 0,
        status: 'LIVE'
      }
    ];
  }

  async function getMatchDetails(matchId) {
    const matches = await getLiveMatches();
    return matches.find(m => m.matchId === matchId) || null;
  }

  return { getLiveMatches, getMatchDetails };
})();

window.SportsAPI = SportsAPI;
