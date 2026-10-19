export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date") || "2026-05-12";
  const apiKey = env.FOOTBALL_API_KEY?.trim();

  if (!apiKey) return new Response(JSON.stringify({error:"NO KEY"}), {headers:{"Content-Type":"application/json"}});

  const apiUrl = `https://www.live-football-api.com/api/v1/matches?api_key=${apiKey}&date=${dateStr}&lang=en`;
  
  try {
    const r = await fetch(apiUrl);
    const text = await r.text();
    
    // RETURN RAW RESPONSE FOR DEBUG
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    
    const list = data.data || data.matches || [];
    
    // If empty, return debug so you see why
    if (!list || list.length === 0) {
      return new Response(JSON.stringify({
        _DEBUG: "API RETURNED EMPTY FOR THIS DATE",
        requested_date: dateStr,
        api_url_called: apiUrl.replace(apiKey, "HIDDEN_KEY"),
        raw_api_response: data,
        credit_info: "1 credit used, check if date has games",
        SOLUTION: "Try date 2026-05-11, 2026-05-12, or use TODAY button with real date"
      }, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const formatted = list.map(m => ({
      home: m.home_team || m.localTeam?.name || m.homeTeam?.name || "Home",
      away: m.away_team || m.visitorTeam?.name || m.awayTeam?.name || "Away",
      time: m.time || (m.date ? new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "15:00"),
      score: m.score || (m.home_score != null ? `${m.home_score}-${m.away_score}` : "vs"),
      status: m.status || "NS",
      league: m.league_name || m.league?.name || "Football"
    }));

    return new Response(JSON.stringify(formatted), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
    
  } catch (e) {
    return new Response(JSON.stringify({error: e.message, date: dateStr}), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
