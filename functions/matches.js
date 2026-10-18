export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = context.env.FOOTBALL_API_KEY;

    if (!key) {
      return new Response(JSON.stringify({ error: "NO_KEY", data: { matches: [] } }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const res = await fetch("https://live-football-api.com/api/v1/matches?date=" + date, {
      headers: { "X-API-Key": key.trim() }
    });
    
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    
    const list = json.data?.matches || json.data || [];

    // If API return 0, return the debug info so we see why
    if (!list.length) {
      return new Response(JSON.stringify({ debug: json, status: res.status, date: date, data: { matches: [] } }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    function europeTime(ts, iso) {
      try {
        let d = null;
        if (ts && Number(ts) > 10000) d = new Date(Number(ts) * 1000);
        else if (iso) d = new Date(iso);
        if (!d || isNaN(d.getTime())) {
          if (iso && iso.includes("T")) return iso.split("T")[1].substring(0,5);
          return "-";
        }
        return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Berlin" }).format(d);
      } catch { return "-"; }
    }

    let out = [];
    for (let m of list) {
      const ts = m.fixture?.timestamp || m.timestamp || 0;
      const iso = m.fixture?.date || m.date || "";
      out.push({
        id: m.id,
        time: europeTime(ts, iso),
        ts: ts,
        status: (m.fixture?.status?.short || "NS").toLowerCase().includes("ft") ? "finished" : "notstarted",
        liveMinute: "",
        home: { name: m.home?.name || "Home" },
        away: { name: m.away?.name || "Away" },
        ht_home: m.score?.halftime?.home || null,
        ht_away: m.score?.halftime?.away || null,
        ft_home: m.goals?.home ?? m.score?.fulltime?.home ?? null,
        ft_away: m.goals?.away ?? m.score?.fulltime?.away ?? null,
        league: { name: m.league?.name || "Other" }
      });
    }
    out.sort((a,b) => a.league.name.localeCompare(b.league.name));
    return new Response(JSON.stringify({ data: { matches: out } }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, data: { matches: [] } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
