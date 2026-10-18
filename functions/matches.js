export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const key = context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || "";

  if (!key) {
    return new Response(JSON.stringify({ data: { matches: [] }, error: "NO_KEY" }), {
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
        let iso = m.fixture?.date || m.date || "";
        let ts = m.fixture?.timestamp || m.timestamp || 0;
        let d = ts ? new Date(Number(ts)*1000) : new Date(iso);
        if(isNaN(d.getTime())) return "15:00";
        // Lagos time = your Nigeria time
        return new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Africa/Lagos"}).format(d);
      }catch{ return "15:00"; }
    }

    let out = list.map(m=>{
      const short = String(m.fixture?.status?.short || m.status?.short || "").toUpperCase();
      const el = m.fixture?.status?.elapsed || 0;
      let status="notstarted", live="";
      if(["1H","2H","HT","LIVE"].includes(short) || el>0){ status="live"; live=el?el+"'":"LIVE"; }
      else if(["FT","AET","PEN","FT_PEN","AWD"].includes(short)) status="finished";
      
      let fh = m.goals?.home ?? m.score?.fulltime?.home ?? null;
      let fa = m.goals?.away ?? m.score?.fulltime?.away ?? null;

      return{
        id: m.fixture?.id || m.id,
        time: getTime(m),
        date: date,
        status, liveMinute: live,
        home:{name: m.teams?.home?.name || m.home?.name || "Home"},
        away:{name: m.teams?.away?.name || m.away?.name || "Away"},
        ft_home: fh, ft_away: fa,
        ht_home: m.score?.halftime?.home ?? null,
        ht_away: m.score?.halftime?.away ?? null,
        league:{name: m.league?.name || "League", country: m.league?.country || "World"}
      };
    });

    out.sort((a,b)=> (a.time||"").localeCompare(b.time||""));

    return new Response(JSON.stringify({ data: { matches: out } }), {
      headers: { "Content-Type": "application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" }
    });
  }catch(e){
    return new Response(JSON.stringify({ data:{matches:[]}, error:e.message }), {
      headers:{ "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }
}
