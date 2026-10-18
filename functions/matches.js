export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const key = (context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || "").trim();

  if (!key) {
    return new Response(JSON.stringify({ data: { matches: [] }, error:"NO_KEY" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const apiRes = await fetch(`https://live-football-api.com/api/v1/matches?date=${date}`, {
      headers: { "X-API-Key": key }
    });
    const raw = await apiRes.json();
    const list = raw.data?.matches || raw.data || raw.matches || [];

    function parseTime(m){
      try{
        // Your API returns "2025-10-17 15:00:00" or "15:00:00" - fix it!
        let t = m.time || m.fixture?.time || "";
        let d = m.date || m.fixture?.date || "";
        let ts = m.fixture?.timestamp || m.timestamp || 0;
        
        if(ts && Number(ts) > 1000){
          let dt = new Date(Number(ts)*1000);
          return dt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false});
        }
        // If time field already like "15:00" or "15:00:00"
        if(t && t.includes(":")){
          return t.substring(0,5); // "15:00:00" -> "15:00"
        }
        // If date field like "2025-10-17 15:00:00"
        if(d && d.includes(" ") && d.includes(":")){
          let parts = d.split(" ");
          if(parts[1]) return parts[1].substring(0,5);
        }
        // If ISO like "2025-10-17T15:00:00Z"
        if(d && d.includes("T")){
          let dt = new Date(d);
          if(!isNaN(dt.getTime())){
            return dt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false});
          }
        }
        return "15:00";
      }catch{ return "15:00"; }
    }

    let out = list.map((m,i)=>{
      // SCORE - check every possible field your API uses
      let ftH = m.goals?.home ?? m.score?.fulltime?.home ?? m.ft_home ?? m.home_goals ?? m.homeScore ?? null;
      let ftA = m.goals?.away ?? m.score?.fulltime?.away ?? m.ft_away ?? m.away_goals ?? m.awayScore ?? null;
      let htH = m.score?.halftime?.home ?? m.ht_home ?? null;
      let htA = m.score?.halftime?.away ?? m.ht_away ?? null;

      // Status
      let st = String(m.status || m.fixture?.status?.short || "").toLowerCase();
      let status = "notstarted";
      if(st.includes("live") || st.includes("1h") || st.includes("2h") || st==="ht") status="live";
      else if(st.includes("ft") || ftH!=null) status="finished";

      return{
        id: m.id || m.fixture?.id || i,
        time: parseTime(m),
        date: date,
        status: status,
        liveMinute: m.minute || m.fixture?.status?.elapsed ? (m.minute||m.fixture?.status?.elapsed)+"'" : "",
        home:{name: m.home?.name || m.teams?.home?.name || m.homeTeam?.name || "Home"},
        away:{name: m.away?.name || m.teams?.away?.name || m.awayTeam?.name || "Away"},
        ft_home: ftH, ft_away: ftA,
        ht_home: htH, ht_away: htA,
        league:{name: m.league?.name || m.league || "League", country: m.league?.country || m.country || "World"}
      };
    });

    return new Response(JSON.stringify({ data: { matches: out } }), {
      headers: { "Content-Type": "application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" }
    });
  }catch(e){
    return new Response(JSON.stringify({ data:{matches:[]}, error:e.message }), {
      headers:{ "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }
}
