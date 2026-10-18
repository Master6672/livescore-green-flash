export async function onRequestGet(context){
  const key = context.env.FOOTBALL_API_KEY || context.env.LIVE_API_KEY;
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  if(!key) return new Response(JSON.stringify({data:{matches:[]}}),{headers:{"Content-Type":"application/json"}});

  try{
    // live-football-api.com - use Europe/Paris for France time + keep time
    const apiUrl = `https://live-football-api.com/api/v1/matches?date=${date}&language=en&timezone=Europe/Paris`;
    
    const r = await fetch(apiUrl, {
      headers: {
        "X-API-Key": key,
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json"
      }
    });
    
    const json = await r.json();
    
    // live-football-api.com returns { data: { matches: [...] } } or { data: [...] }
    let list = json?.data?.matches || json?.data?.data || json?.data || json?.matches || json?.response || [];
    if(!Array.isArray(list)) list = Object.values(list);
    if(list.length && typeof list[0] === 'object' && list[0].matches) list = list[0].matches;

    const matches = list.map((e,i)=>{
      // FIX TIME - keep full ISO
      // This API returns: e.time, e.date, e.kickoff, or e.fixture.date
      let timeVal = e.time || e.kickoff || e.kickoff_time || e.start || e.fixture?.date || e.date || "";
      
      // If API returns separate date "2025-10-18" and time "19:00", combine to ISO
      if(e.date && e.time && e.time.includes(":") && e.date.includes("-")){
        if(!e.time.includes("T")){
          timeVal = `${e.date}T${e.time}:00+02:00`; // Europe/Paris offset
        }
      }
      // If only time like "19:00", make ISO with date
      if(timeVal && /^\d{2}:\d{2}$/.test(timeVal)){
        timeVal = `${date}T${timeVal}:00+02:00`;
      }
      // If timestamp
      if(e.timestamp) timeVal = e.timestamp;
      if(e.fixture?.timestamp) timeVal = e.fixture.timestamp;
      if(e.fixture?.date) timeVal = e.fixture.date;

      return {
        id: e.id || i,
        // TIME IS NOW FULL ISO - FRANCE TIME WILL SHOW
        time: timeVal,
        timestamp: e.timestamp || e.fixture?.timestamp || null,
        home: {
          name: e.home?.name || e.home_team || e.teams?.home?.name || "Home",
          score: e.home?.score ?? e.home_score ?? e.score?.home ?? e.goals?.home ?? null
        },
        away: {
          name: e.away?.name || e.away_team || e.teams?.away?.name || "Away",
          score: e.away?.score ?? e.away_score ?? e.score?.away ?? e.goals?.away ?? null
        },
        league: {
          // FIX COUNTRY - NOT "World" AGAIN
          country: e.league?.country || e.country || e.competition?.country || e.league_country || "Other",
          name: e.league?.name || e.league_name || e.competition?.name || e.competition || "League"
        },
        status: (e.status==="finished" || e.status==="FT" || e.fixture?.status?.short==="FT") ? "finished" : (e.status==="live" ? "live" : "scheduled"),
        isLive: e.status==="live" || e.isLive || ["1H","2H","HT"].includes(e.fixture?.status?.short),
        ht: e.halftime ? { home: e.halftime.home, away: e.halftime.away } : (e.score?.halftime ? { home: e.score.halftime.home, away: e.score.halftime.away } : (e.ht ? { home: e.ht.home, away: e.ht.away } : null))
      };
    });

    return new Response(JSON.stringify({data:{matches}}),{
      headers:{
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"no-cache"
      }
    });

  }catch(err){
    return new Response(JSON.stringify({data:{matches:[]}, error: err.message}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }
}
