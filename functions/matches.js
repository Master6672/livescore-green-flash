export async function onRequest(c){
  const url = new URL(c.request.url);
  let date = url.searchParams.get("date");
  
  // TODAY = real today
  if(!date || date === "today"){
    date = new Date().toISOString().split('T')[0]; // 2026-05-13 today
  }

  const key = c.env.FOOTBALL_API_KEY;
  const api = `https://www.live-football-api.com/api/v1/matches?api_key=${key}&date=${date}&lang=en`;
  
  const res = await fetch(api);
  const json = await res.json();
  const data = json.data || [];

  const games = data.map(m=>({
    home: m.home_team,
    away: m.away_team,
    time: m.time,
    score: m.score || `${m.home_score??0}-${m.away_score??0}`,
    league: m.league_name,
    status: m.status
  }));

  return new Response(JSON.stringify(games),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
  });
}
