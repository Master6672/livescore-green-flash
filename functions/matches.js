export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Support BOTH names - LIVE_FOOTBALL_API_KEY or FOOTBALL_API_KEY
    const key = context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || "";

    if (!key) {
      return new Response(JSON.stringify({ data: { matches: [] }, error: "NO_KEY_FOUND" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const apiRes = await fetch(`https://live-football-api.com/api/v1/matches?date=${date}`, {
      headers: { "X-API-Key": key.trim() }
    });

    const text = await apiRes.text();
    let json; try{ json=JSON.parse(text); }catch{ json={data:[]}; }

    const list = json.data?.matches || json.data || [];

    function europeTime(ts, iso){
      try{
        let d = ts ? new Date(Number(ts)*1000) : new Date(iso);
        if(isNaN(d.getTime()) && iso?.includes("T")) return iso.split("T")[1].slice(0,5);
        return new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Europe/Berlin"}).format(d);
      }catch{ return "-"; }
    }

    let out = list.map(m=>{
      const ts = m.fixture?.timestamp || m.timestamp || 0;
      const iso = m.fixture?.date || m.date || "";
      const short = (m.fixture?.status?.short || "").toUpperCase();
      const el = m.fixture?.status?.elapsed || 0;
      let status="notstarted", live="";
      if(["1H","2H","HT","LIVE"].includes(short) || el){ status="live"; live= el? el+"'" : "LIVE"; }
      else if(["FT","AET","PEN"].includes(short)) status="finished";
      let fh=m.goals?.home ?? m.score?.fulltime?.home ?? null;
      let fa=m.goals?.away ?? m.score?.fulltime?.away ?? null;
      if(status==="notstarted"){ fh=null; fa=null; }
      return{
        id:m.id,
        time:europeTime(ts,iso),
        date:date,
        status, liveMinute:live,
        home:{name:m.home?.name || m.teams?.home?.name || "Home"},
        away:{name:m.away?.name || m.teams?.away?.name || "Away"},
        ht_home:m.score?.halftime?.home ?? null,
        ht_away:m.score?.halftime?.away ?? null,
        ft_home:fh, ft_away:fa,
        league:{name:m.league?.name || "League", country:m.league?.country || m.country?.name || "World"}
      };
    });

    out.sort((a,b)=>(a.league.country+a.league.name).localeCompare(b.league.country+b.league.name));

    return new Response(JSON.stringify({ data: { matches: out } }), {
      headers: { "Content-Type": "application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" }
    });

  }catch(e){
    return new Response(JSON.stringify({ data:{matches:[]}, error:e.message }), {
      headers:{ "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }
}
