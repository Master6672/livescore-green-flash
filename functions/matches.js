export async function onRequestGet(context) {
  const apikey = context.env.FOOTBALL_API_KEY;
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!apikey) {
    return new Response(JSON.stringify({ success: false, error: "FOOTBALL_API_KEY NOT SET", data: { matches: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const apiUrl = `https://www.live-football-api.com/api/v1/matches?api_key=${apikey}&date=${date}&lang=en`;

  try {
    const res = await fetch(apiUrl);
    const text = await res.text();
    let raw;
    try { raw = JSON.parse(text); } catch { raw = { data: [] }; }

    const list = raw.data || raw.matches || [];
    const fixtures = Array.isArray(list) ? list : [];

    const parse = (s) => {
      if (!s) return [0,0];
      const p = String(s).split('-');
      return [parseInt(p[0].trim())||0, parseInt(p[1].trim())||0];
    };

    const matches = fixtures.map((m,i)=>{
      const sc = m.scores || {};
      // REAL HT + FT from your Pro API
      let [htH,htA] = parse(sc.ht_score || m.ht_score || "");
      let [ftH,ftA] = parse(sc.ft_score || sc.score || m.ft_score || "");

      if(ftH===0 && ftA===0){
        ftH = Number(m.home_score ?? 0);
        ftA = Number(m.away_score ?? 0);
      }

      return {
        id: m.id || i,
        kickoff: m.date || `${date}T15:00:00Z`,
        status: { status: "finished", display: "FT", short: "FT", is_live: false, elapsed: 90 },
        score: {
          halftime: { home: htH, away: htA },
          fulltime: { home: ftH, away: ftA },
          ht: { home: htH, away: htA },
          ft: { home: ftH, away: ftA }
        },
        home: { name: m.home_team, score: ftH, ht_score: htH, halftime: htH },
        away: { name: m.away_team, score: ftA, ht_score: htA, halftime: htA },
        ht: { home: htH, away: htA },
        halftime: `${htH} - ${htA}`,
        League: { country: m.country, name: m.league_name },
        league: { country: m.country, name: m.league_name }
      };
    });

    return new Response(JSON.stringify({ data: { matches } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message, data: { matches: [] } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
