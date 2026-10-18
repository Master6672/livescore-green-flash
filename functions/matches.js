export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];

  function toEuropeTime(d) {
    if (!d) return '21:00';
    try {
      return new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch(e) { return '21:00'; }
  }

  function getPriority(n,c) {
    n=(n||'').toLowerCase(); c=(c||'').toLowerCase();
    if(n.indexOf('champions league')>-1) return 1;
    if(n.indexOf('europa league')>-1 && n.indexOf('conference')==-1) return 2;
    if(n.indexOf('conference league')>-1) return 3;
    if(c.indexOf('england')>-1) return 4;
    if(c.indexOf('france')>-1) return 5;
    if(c.indexOf('germany')>-1) return 6;
    if(c.indexOf('italy')>-1) return 7;
    if(c.indexOf('spain')>-1) return 8;
    if(c.indexOf('netherlands')>-1) return 9;
    if(c.indexOf('portugal')>-1) return 10;
    return 99;
  }

  try {
    var key = context.env.FOOTBALL_API_KEY;
    if (key) {
      var apiRes = await fetch('https://live-football-api.com/api/v1/matches?date=' + date, {
        headers: { 'X-API-Key': key.trim() }
      });
      var data = await apiRes.json();
      var list = (data && data.data && data.data.matches) ? data.data.matches : (data.data || []);
      for (var i=0; i<list.length; i++) {
        var m = list[i];
        var h = m.home?.name || 'Home';
        var a = m.away?.name || 'Away';
        var c = m.league?.country || 'World';
        var ln = m.league?.name || 'League';
        var fdate = m.fixture?.date || null;
        var tv = toEuropeTime(fdate);
        var fh = m.home?.score ?? m.score?.fulltime?.home ?? null;
        var fa = m.away?.score ?? m.score?.fulltime?.away ?? null;
        var hh = m.score?.halftime?.home ?? 0;
        var ha = m.score?.halftime?.away ?? 0;
        if (fh === null) continue;
        var prio = getPriority(ln,c);
        out.push({ id: m.id || 1000+i, time: tv, ts: prio*1000000+i*60000, home:{name:h,score:fh}, away:{name:a,score:fa}, ht_home:hh, ht_away:ha, ft_home:fh, ft_away:fa, league:{country:c,name:ln} });
      }
    }
  } catch(e) {}

  out.sort(function(a,b){return a.ts-b.ts;});
  return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
}
