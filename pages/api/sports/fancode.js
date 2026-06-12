const axios = require('axios');

const FANCODE_MIRROR_JSON = "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const response = await axios.get(FANCODE_MIRROR_JSON, { timeout: 10000 });
    const liveMatches = response.data.matches || response.data || [];
    
    if (!Array.isArray(liveMatches)) {
      throw new Error("Invalid response format from FanCode mirror");
    }

    // Format data cleanly to sync with existing UI architecture
    const formattedFixtures = liveMatches.map((match, i) => ({
      matchId: match.match_id || `fc-${i}`,
      title: match.match_name || 'FanCode Event',
      tournament: match.event_name || 'Premium Sports',
      sportType: (match.event_category || 'cricket').toLowerCase(),
      homeTeam: match.team_1_name || 'Team 1',
      awayTeam: match.team_2_name || 'Team 2',
      homeLogo: match.team_1_flag || '',
      awayLogo: match.team_2_flag || '',
      banner: match.banner || '',
      streamUrl: match.stream_link || '',
      status: 'LIVE',
      score: 'LIVE',
      isFancode: true
    }));

    return res.status(200).json({ success: true, matches: formattedFixtures });
  } catch (error) {
    console.error("FanCode Vercel Node failure:", error.message);
    return res.status(500).json({ error: "FanCode server cluster unreachable" });
  }
}
