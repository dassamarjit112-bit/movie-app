/* ============================================================
   CineStream — Sports API Real Service (Free Public APIs)
   Fetches live fixtures from ESPN Public endpoints (No Keys Needed)
   ============================================================ */

const SportsAPI = (() => {
  // Store previous matches to detect score changes for animations
  let previousMatches = {};

  async function getLiveMatches() {
    const matches = [];

    // 1. Fetch Football Matches (ESPN Public API - Premier League)
    try {
      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
      const data = await response.json();
      if (data.events) {
        data.events.forEach(event => {
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home');
          const awayTeam = match.competitors.find(c => c.homeAway === 'away');
          
          matches.push({
            matchId: `fb-${event.id}`,
            sportType: 'football',
            tournament: 'Premier League',
            homeTeam: homeTeam.team.name,
            awayTeam: awayTeam.team.name,
            homeLogo: homeTeam.team.logo,
            awayLogo: awayTeam.team.logo,
            score: `${homeTeam.score ?? 0} - ${awayTeam.score ?? 0}`,
            rawScoreHome: parseInt(homeTeam.score ?? 0, 10),
            rawScoreAway: parseInt(awayTeam.score ?? 0, 10),
            status: event.status.type.shortDetail // 'FT', 'HT', 'LIVE'
          });
        });
      }
    } catch (err) {
      console.error("Failed to fetch football data:", err);
    }

    // 2. Fetch Cricket Matches (ESPN Public API - International/IPL)
    try {
      // Endpoint for cricket (8039 is typically ICC/Intl)
      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard');
      const data = await response.json();
      if (data.events) {
        data.events.forEach(event => {
          const match = event.competitions[0];
          const homeTeam = match.competitors.find(c => c.homeAway === 'home') || match.competitors[0];
          const awayTeam = match.competitors.find(c => c.homeAway === 'away') || match.competitors[1];
          
          matches.push({
            matchId: `cr-${event.id}`,
            sportType: 'cricket',
            tournament: event.season?.slug || 'Cricket',
            homeTeam: homeTeam.team.name,
            awayTeam: awayTeam.team.name,
            homeLogo: homeTeam.team.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${homeTeam.team.abbreviation}&backgroundColor=e50914`,
            awayLogo: awayTeam.team.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${awayTeam.team.abbreviation}&backgroundColor=14d1ff`,
            score: `${homeTeam.score || '0/0'} vs ${awayTeam.score || '0/0'}`,
            rawScoreHome: parseInt((homeTeam.score || '0').split('/')[0], 10),
            rawScoreAway: parseInt((awayTeam.score || '0').split('/')[0], 10),
            status: event.status.type.shortDetail
          });
        });
      }
    } catch (err) {
      console.error("Failed to fetch cricket data:", err);
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
