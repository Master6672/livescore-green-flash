export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date");

  const apiKey = env.FOOTBALL_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "FOOTBALL_API_KEY not set" }), {
      headers: { "Content-Type": "application/json" }, status: 500
    });
  }

  try {
    const apiUrl = `https://api.live-football-api.com/matches?date=${dateStr}`;
    
    const res = await fetch(apiUrl, {
      headers: { "X-AUTH-TOKEN": apiKey }
    });

    const text = await res.text();
    
    // For debug - if API fails, return the error so you can see
    if (!res.ok) {
      return new Response(JSON.stringify({ 
        debug: "API FAILED",
        status: res.status,
        response: text,
        date_requested: dateStr
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = JSON.parse(text);
    const list = data.data || data.matches || data.result || [];

    // If list empty, return debug info
    if (!list || list.length === 0) {
      return new Response(JSON.stringify({ 
        debug: "API RETURNED EMPTY",
        date_requested: dateStr,
        raw_response: data,
        message: "No matches for this date in your plan"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const formatted = list.map(m => ({
      home: m.home_team || m.homeTeam?.name,
      away: m.away_team || m.awayTeam?.name,
      time: m.date ? new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "15:00",
      score: (m.home_score != null && m.away_score != null) ? `${m.home_score} - ${m.away_score}` : "vs",
      status: m.status || "NS",
      league: m.league?.name || "League"
    }));

    return new Response(JSON.stringify(formatted), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, date: dateStr }), {
      headers: { "Content-Type": "application/json" }, status: 500
    });
  }
}
