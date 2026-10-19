export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date");

  if (!dateStr) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = env.FOOTBALL_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API KEY NOT FOUND - Set FOOTBALL_API_KEY" }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }

  try {
    // YOUR LIVE-FOOTBALL-API
    const apiUrl = `https://api.live-football-api.com/matches?date=${dateStr}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "X-AUTH-TOKEN": apiKey
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const matchesList = data.data || data.matches || [];

    const formatted = matchesList.map(m => {
      const homeScore = m.home_score ?? m.score?.home ?? null;
      const awayScore = m.away_score ?? m.score?.away ?? null;
      
      let scoreText = "vs";
      if (homeScore !== null && awayScore !== null) {
        scoreText = `${homeScore} - ${awayScore}`;
      } else if (m.status === "live" || m.status === "in_progress") {
        scoreText = "LIVE";
      }

      // Real time from API
      let timeText = "15:00";
      if (m.date || m.kickoff) {
        timeText = new Date(m.date || m.kickoff).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      }

      return {
        id: m.id,
        home: m.home_team || m.homeTeam?.name,
        away: m.away_team || m.awayTeam?.name,
        time: timeText,
        score: scoreText,
        status: m.status || "NS",
        league: m.league?.name || m.competition || "League"
      };
    });

    return new Response(JSON.stringify(formatted), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
