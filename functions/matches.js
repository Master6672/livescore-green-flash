export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let dateStr = url.searchParams.get("date") || new Date().toISOString().split('T')[0];

  const apiKey = env.FOOTBALL_API_KEY?.trim();
  if (!apiKey) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // CORRECT URL FROM YOUR SCREENSHOT
    const apiUrl = `https://www.live-football-api.com/api/v1/matches?api_key=${apiKey}&date=${dateStr}&lang=en`;
    
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await res.json();
    // API returns { data: [...] } or { matches: [...] }
    const list = data.data || data.matches || data.result || [];

    if (!list || list.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const formatted = list.map(m => {
      // Real structure from this API
      const home = m.home_team || m.homeTeam?.name || m.localTeam?.name || "Home";
      const away = m.away_team || m.awayTeam?.name || m.visitorTeam?.name || "Away";
      
      let score = "vs";
      if (m.home_score != null && m.away_score != null) {
        score = `${m.home_score} - ${m.away_score}`;
      } else if (m.scores?.home != null) {
        score = `${m.scores.home} - ${m.scores.away}`;
      } else if (m.score) {
        score = m.score;
      }

      let time = "15:00";
      if (m.date || m.time || m.start_time) {
        try {
          time = new Date(m.date || m.time || m.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        } catch {}
      }

      return {
        home: typeof home === 'string' ? home : home.name,
        away: typeof away === 'string' ? away : away.name,
        time: time,
        score: score,
        status: m.status || m.state || "NS",
        league: m.league?.name || m.competition?.name || m.league_name || "Football"
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
