export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const key = context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || "";

  if (!key) {
    return new Response(JSON.stringify({ data: { matches: [] } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const apiRes = await fetch(`https://live-football-api.com/api/v1/matches?date=${date}`, {
      headers: { "X-API-Key": key.trim() }
    });
    const json = await apiRes.json();
    const list = json.data?.matches || json.data || json.matches || [];

    function getTime(m){
      try{
        let ts = m.fixture?.timestamp || m.timestamp || 0;
        let iso = m.fixture?.date || m.date || "";
        let d = ts ? new Date(Number(ts)*1000) : new Date(iso);
        if(isNaN(d.getTime())) return "";
        // Use same time as Flashscore - show local league time in CET + Lagos fallback
        // Flashscore time is Europe time, so we show Europe/Berlin which matches flashscore
        return new Intl.DateTimeFormat("en-GB",{
          hour:"2-digit",minute:"2-digit",hour12:false,
          timeZone:"Europe/London"
        }).format(d);
      }catch{ return ""; }
    }

    let out = list.map(m=>{
      const f = m.fixture || {};
      const s = f.status || m.status || {};
      const short = String(s.short || "").toUpperCase();
      const el = s.elapsed || 0;
      let status="notstarted", liveMinute="";
      if(["1H","2H","HT","LIVE","ET","BT","P"].includes(short) || (el>0 && el<130)){ status="live"; liveMinute= el? el+"'" : short; if(short==="HT") liveMinute="HT"; }
      else if(["FT","AET","PEN","AWD","WO"].includes(short)) status="finished";

      // FIX RESULTS - check all possible fields
      let ftH = m.goals?.home ?? m.score?.fulltime?.home ?? m.goals?.homeTeam ?? null;
      let ftA = m.goals?.away ?? m.score?.fulltime?.away ?? m.goals?.awayTeam ?? null;
      let htH = m.score?.halftime?.home ?? null;
      let htA = m.score?.halftime?.away ?? null;

      // If API returns 0 as valid, keep it
      if(ftH===undefined) ftH=null;
      if(ftA===undefined) ftA=null;

      return{
        id: f.id || m.id,
        time: getTime(m),
        date: date,
        status, liveMinute,
        home:{name: m.teams?.home?.name || m.home?.name || "Home"},
        away:{name: m.teams?.away?.name || m.away?.name || "Away"},
        ft_home: ftH, ft_away: ftA,
        ht_home: htH, ht_away: htA,
        league:{name: m.league?.name || "League", country: m.league?.country || "World", flag: m.league?.flag || ""}
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
