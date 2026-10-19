export async function onRequest(c){
  const date = new URL(c.request.url).searchParams.get("date") || "2026-10-19";
  const key = c.env.FOOTBALL_API_KEY;
  try{
    const r = await fetch(`https://www.live-football-api.com/api/v1/matches?api_key=${key}&date=${date}&lang=en`);
    const j = await r.json();
    const m = (j.data||[]).map(x=>({
      home: x.home_team,
      away: x.away_team,
      time: x.time,
      score: x.score || `${x.home_score??0}-${x.away_score??0}`,
      league: x.league_name,
      status: x.status
    }));
    return new Response(JSON.stringify(m),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify([]),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }
}
