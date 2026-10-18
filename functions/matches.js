export async function onRequestGet(context) {
  try {
    // 1. Read API key
    const apikey = context.env.FOOTBALL_API_KEY;
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    // If no API key set in Cloudflare, return demo so site no crash
    if (!apikey) {
      throw new Error("FOOTBALL_API_KEY not set in Cloudflare");
    }

    // 2. Your Pro API - only your own API, no X-API-KEY
    const apiUrl = `https://www.live-football-api.com/api/v1/matches?api_key=${apikey}&date=${date}&lang=en`;
    const res = await fetch(apiUrl);
    const raw = await res.json();
    
    const list = raw.data || [];
    
    const parse = (s) => {
      if (!s) return [0,0];
      const p = String(s).split('-');
      return [parseInt(p[0].trim())||0, parseInt(p[1].trim())||0];
    };

    const matches = list.map((m,i)=>{
      const sc = m.scores || {};
      // live-football-api Pro gives "0 - 0" and "0 - 2"
      let [htH,htA] = parse(sc.ht_score || "");
      let [ftH,ftA] = parse(sc.ft_score || sc.score || "");
      
      if(ftH===0 && ftA===0){
        ftH = Number(m.home_score || 0);
        ftA = Number(m.away_score || 0);
      }

      return {
        id: m.id || i,
        kickoff: m.date || `${date}T15:00:00Z`,
        status: { status: "finished", display: "FT", short: "FT", is_live: false },
        score: {
          halftime: { home: htH, away: htA },
          fulltime: { home: ftH, away: ftA },
          ht: { home: htH, away: htA },
          ft: { home: ftH, away: ftA }
        },
        home: { name: m.home_team, score: ftH, ht_score: htH },
        away: { name: m.away_team, score: ftA, ht_score: htA },
        ht: { home: htH, away: htA },
        halftime: `${htH} - ${htA}`,
        League: { country: m.country || "England", name: m.league_name || "League" },
        league: { country: m.country || "England", name: m.league_name || "League" }
      };
    });

    return new Response(JSON.stringify({ data: { matches } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }
    });

  } catch (e) {
    // If API fail, return empty (not crash) - frontend will show No matches, not Error button
    return new Response(JSON.stringify({ 
      data: { matches: [] }, 
      error: e.message,
      hint: "Check FOOTBALL_API_KEY in Cloudflare Dashboard > Pages > Settings > Variables" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
