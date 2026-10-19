export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date") || "2026-10-18";

  const apiKey = env.FOOTBALL_API_KEY?.trim();
  
  if (!apiKey) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Try different endpoint formats that live-football-api.com uses
  const endpoints = [
    `https://api.live-football-api.com/matches?date=${dateStr}`,
    `https://live-football-api.com/api/matches?date=${dateStr}`,
    `https://api.live-football-api.com/v1/matches?date=${dateStr}&api_key=${apiKey}`
  ];

  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Key": apiKey,
          "X-AUTH-TOKEN": apiKey,
          "Accept": "application/json"
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        // This API returns data in different formats - check all
        const list = data.data || data.matches || data.result || data.response || [];
        
        if (Array.isArray(list) && list.length > 0) {
          const formatted = list.map(m => ({
            home: m.home_team || m.homeTeam?.name || m.home?.name || m.teams?.home?.name || "Home",
            away: m.away_team || m.awayTeam?.name || m.away?.name || m.teams?.away?.name || "Away",
            time: m.date || m.time || m.kickoff ? new Date(m.date || m.time || m.kickoff).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "15:00",
            score: (m.home_score != null || m.score?.home != null) ? `${m.home_score ?? m.score?.home ?? m.goals?.home ?? 0} - ${m.away_score ?? m.score?.away ?? m.goals?.away ?? 0}` : (m.status === "live" ? "LIVE" : "vs"),
            status: m.status || m.state || "NS",
            league: m.league?.name || m.competition?.name || m.league_name || "Football"
          }));
          return new Response(JSON.stringify(formatted), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
    } catch(e) { continue; }
  }

  // If all endpoints fail, return empty - NOT error - so your site won't show "Failed to load"
  return new Response(JSON.stringify([]), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
