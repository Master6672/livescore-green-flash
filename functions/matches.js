export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ data: { matches: [] } }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const res = await fetch("https://live-football-api.com/api/v1/matches?date=" + date, {
      headers: { "X-API-Key": key.trim() }
    });
    const json = await res.json();
    const list = json.data?.matches || json.data || [];

    function europeTime(ts, iso) {
      try {
        let d = null;
        if (ts && Number(ts) > 10000) {
          d = new Date(Number(ts) * 1000);
        } else if (iso) {
          d = new Date(iso);
        }
        if (!d || isNaN(d.getTime())) {
          // try extract time like 19:45 from iso string
          if (iso && iso.includes("T")) return iso.split("T")[1].substring(0,5);
          return "-";
        }
        return new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Berlin"
        }).format(d);
      } catch {
        return "-";
      }
    }

    function getPrio(m) {
      const name = (m.league?.name || "").toLowerCase();
      const country = (m.league?.country || "").toLowerCase();

      // CAF / Africa Champions League = NOT Europe - put for Other A-Z
      if (name.includes("caf") || name.includes("african")) return 99;

      if (name.includes("champions league")) {
        if (name.includes("caf")) return 99;
        return 1; // UEFA Champions League for up
      }
      if (name.includes("europa league") && !name.includes("conference")) return 2;
      if (name.includes("conference league")) return 3;
      
      if (name.includes("premier league")) {
        // Only England Premier League for Top 4, Mongolia etc go Other A-Z
        if (country.includes("england") || name.includes("english")) return 4;
        return 99;
      }
      if (name.includes("ligue 1")) return 5;
      if (name.includes("bundesliga")) return 6;
      if (name.includes("serie a") || name.includes("series a")) return 7;
      if (name.includes("la liga") || name.includes("laliga")) return 8;
      if (name.includes("eredivisie")) return 9;
      if (name.includes("primeira liga") || name.includes("liga portugal")) return 10;
      return 99;
    }

    let out = [];
    for (let m of list) {
      const p = getPrio(m);
      const ts = m.fixture?.timestamp || m.timestamp || 0;
      const iso = m.fixture?.date || m.date || "";
      let time = europeTime(ts, iso);

      let fh = m.goals?.home ?? m.score?.fulltime?.home ?? m.home?.score ?? null;
      let fa = m.goals?.away ?? m.score?.fulltime?.away ?? null;
      let hh = m.score?.halftime?.home ?? null;
      let ha = m.score?.halftime?.away ?? null;

      const short = (m.fixture?.status?.short || m.status || "NS").toUpperCase();
      const el = m.fixture?.status?.elapsed || 0;
      let status = "notstarted";
      let live = "";
      if (["1H", "2H", "HT", "LIVE"].includes(short) || el) {
        status = "live";
        live = el ? el + "'" : "LIVE";
      } else if (["FT", "AET", "PEN", "FT_PEN"].includes(short)) {
        status = "finished";
      }

      if (status === "notstarted") {
        fh = null;
        fa = null;
      }

      out.push({
        id: m.id,
        time: time,
        ts: ts,
        priority: p,
        status: status,
        liveMinute: live,
        home: { name: m.home?.name || "Home" },
        away: { name: m.away?.name || "Away" },
        ht_home: hh,
        ht_away: ha,
        ft_home: fh,
        ft_away: fa,
        league: { name: m.league?.name || "Other", country: m.league?.country || "", priority: p }
      });
    }

    // TOP 10 FIRST, THEN OTHER A-Z
    out.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.priority === 99) return a.league.name.localeCompare(b.league.name);
      return a.ts - b.ts;
    });

    return new Response(JSON.stringify({ data: { matches: out } }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ data: { matches: [] } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
