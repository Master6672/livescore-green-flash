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
        let d;
        if (ts && ts > 1000000) d = new Date(ts * 1000);
        else if (ts && ts > 100000000000) d = new Date(ts);
        else if (iso) d = new Date(iso);
        else return "-";
        if (isNaN(d.getTime())) return "-";
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

    function getPrioAndFilter(m) {
      const n = (m.league?.name || "").toLowerCase();
      const country = (m.league?.country || "").toLowerCase();
      
      // BLOCK AFRICA LEAGUES FROM EUROPE TOP 10
      if (n.includes("caf") || n.includes("african") || country.includes("caf")) {
        return 99;
      }

      // ONLY UEFA CHAMPIONS LEAGUE, NOT CAF
      if (n.includes("champions league")) {
        if (n.includes("uefa") || n.includes("europe") || country === "europe" || country === "") return 1;
        return 99;
      }
      if (n.includes("europa league") && !n.includes("conference")) {
        if (n.includes("uefa") || country === "europe" || country === "") return 2;
        return 99;
      }
      if (n.includes("conference league")) return 3;
      if (n.includes("premier league") && (country.includes("england") || n.includes("english"))) return 4;
      if (n.includes("premier league")) return 99; // block Mongolia premier league like Ulaanbaatar
      if (n.includes("ligue 1")) return 5;
      if (n.includes("bundesliga")) return 6;
      if (n.includes("serie a") || n.includes("series a")) return 7;
      if (n.includes("la liga") || n.includes("laliga") || n.includes("primera division")) return 8;
      if (n.includes("eredivisie")) return 9;
      if (n.includes("primeira liga") || n.includes("liga portugal")) return 10;
      return 99;
    }

    let out = [];
    for (let m of list) {
      const p = getPrioAndFilter(m);
      if (p > 10) continue; // ONLY SHOW TOP 10 EUROPE NOW - NO OTHER LEAGUE

      const ts = m.fixture?.timestamp || m.timestamp || 0;
      const iso = m.fixture?.date || m.date || "";
      let time = europeTime(ts, iso);
      
      // If time still "-" try get time from iso string directly like "2026-10-18T19:45:00"
      if (time === "-" && iso && iso.includes("T")) {
        try {
          const tPart = iso.split("T")[1].substring(0,5);
          const d = new Date(iso);
          time = new Intl.DateTimeFormat("en-GB",{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Berlin'}).format(d) || tPart;
        } catch {}
      }

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

      // Don't null scores for finished/live - keep them!
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
        home: { name: m.home?.name || m.homeTeam?.name || "Home" },
        away: { name: m.away?.name || m.awayTeam?.name || "Away" },
        ht_home: hh,
        ht_away: ha,
        ft_home: fh,
        ft_away: fa,
        league: { name: m.league?.name || "", country: m.league?.country || "", priority: p }
      });
    }

    out.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
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
