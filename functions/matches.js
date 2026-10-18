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
    const raw = await apiRes.json();
    
    // Debug log - see what API returns
    const list = raw.data?.matches || raw.data || raw.matches || raw.result || [];
    
    function getTime(m){
      try{
        let ts = m.fixture?.timestamp || m.timestamp || m.time?.timestamp || 0;
        let iso = m.fixture?.date || m.date || m.time?.date || "";
        let d = ts ? new Date(Number(ts)*1000) : new Date(iso);
        if(isNaN(d.getTime())) return "15:00";
        // Flashscore uses local UK time - show like flashscore
        return new Intl.DateTimeFormat("en-GB",{
          hour:"2-digit",minute:"2-digit",hour12:false,
          timeZone:"Europe/London"
        }).format(d);
      }catch{ return "15:00"; }
    }

    function getScore(m){
      // Try EVERY possible score field from API
      let ftH = null, ftA = null, htH = null, htA = null;
      
      // FT
      if(m.goals?.home != null) ftH = m.goals.home;
      else if(m.score?.fulltime?.home != null) ftH = m.score.fulltime.home;
      else if(m.goals?.homeTeam != null) ftH = m.goals.homeTeam;
      else if(m.result?.home != null) ftH = m.result.home;
      else if(m.ft_home != null) ftH = m.ft_home;
      
      if(m.goals?.away != null) ftA = m.goals.away;
      else if(m.score?.fulltime?.away != null) ftA = m.score.fulltime.away;
      else if(m.goals?.awayTeam != null) ftA = m.goals.awayTeam;
      else if(m.result?.away != null) ftA = m.result.away;
      else if(m.ft_away != null) ftA = m.ft_away;
      
      // HT
      htH = m.score?.halftime?.home ?? m.ht_home ?? null;
      htA = m.score?.halftime?.away ?? m.ht_away ?? null;
      
      return {ftH, ftA, htH, htA};
    }

    let out = list.map(m=>{
      const f = m.fixture || {};
      const s = f.status || m.status || {};
      const short = String(s.short || m.status || "").toUpperCase();
      const el = s.elapsed || m.minute || 0;
      
      let status="notstarted", liveMinute="";
      if(["1H","2H","HT","LIVE","ET","BT","P","LIVE"].includes(short) || (el>0 && el<130)){ 
        status="live"; 
        liveMinute= short==="HT" ? "HT" : (el? el+"'" : "LIVE"); 
      }
      else if(["FT","AET","PEN","AWD","WO","FT_PEN"].includes(short) || m.ft_home!=null || m.goals?.home!=null) {
        status="finished";
      }

      const sc = getScore(m);
      
      return{
        id: f.id || m.id || Math.random(),
        time: getTime(m),
        date: date,
        status, liveMinute,
        home:{name: m.teams?.home?.name || m.home?.name || m.homeTeam?.name || "Home"},
        away:{name: m.teams?.away?.name || m.away?.name || m.awayTeam?.name || "Away"},
        ft_home: sc.ftH, ft_away: sc.ftA,
        ht_home: sc.htH, ht_away: sc.htA,
        league:{name: m.league?.name || m.competition || "League", country: m.league?.country || m.country?.name || "World"}
      };
    });

    return new Response(JSON.stringify({ data: { matches: out }, rawCount: list.length }), {
      headers: { "Content-Type": "application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" }
    });
  }catch(e){
    return new Response(JSON.stringify({ data:{matches:[]}, error:e.message }), {
      headers:{ "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }
}
