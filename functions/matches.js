export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];

  // REAL TIME from ISO string - not fake 15:00
  function getRealTime(m) {
    try {
      var iso = (m.fixture && m.fixture.date) || m.date || '';
      if (!iso) {
        // Try timestamp
        if (m.fixture && m.fixture.timestamp) {
          var d = new Date(m.fixture.timestamp * 1000);
          var h = d.getUTCHours() + 2; // CEST Europe
          if (h >= 24) h -= 24;
          var mm = d.getUTCMinutes();
          return (h<10?'0'+h:h)+':'+(mm<10?'0'+mm:mm);
        }
        return '15:00';
      }
      // ISO like 2026-10-18T14:30:00+00:00 -> extract 14:30 +2 = 16:30
      var match = iso.match(/T(\d+):(\d+)/);
      if (match) {
        var h = parseInt(match[1],10) + 2; // Europe CET +2
        if (h >= 24) h -= 24;
        var hh = h < 10 ? '0'+h : ''+h;
        return hh+':'+match[2];
      }
      return '15:00';
    } catch(e) { return '15:00'; }
  }

  var todayEurope = new Date().toISOString().split('T')[0];
  var isFuture = date > todayEurope;
  var isPast = date < todayEurope;

  try {
    var key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    
    var res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {headers:{'X-API-Key':key.trim()}});
    var json = await res.json();
    var list = (json.data && json.data.matches) ? json.data.matches : (json.data || []);
    if (!list || list.length==0) {
      var res2 = await fetch('https://live-football-api.com/api/v1/matches', {headers:{'X-API-Key':key.trim()}});
      var json2 = await res2.json();
      list = (json2.data && json2.data.matches) ? json2.data.matches : (json2.data || []);
    }

    for (var i=0;i<list.length;i++) {
      var m=list[i];
      var kickoff=getRealTime(m); // REAL TIME NOW
      var short=((m.fixture&&m.fixture.status&&m.fixture.status.short)||m.status||'').toString().toUpperCase();
      var elapsed=(m.fixture&&m.fixture.status&&m.fixture.status.elapsed)||null;
      
      var fh=null,fa=null,hh=null,ha=null;
      if (m.home && m.home.score!=null && m.home.score!=='') fh=Number(m.home.score);
      else if (m.score && m.score.fulltime && m.score.fulltime.home!=null) fh=m.score.fulltime.home;
      else if (m.goals && m.goals.home!=null) fh=m.goals.home;
      
      if (m.away && m.away.score!=null && m.away.score!=='') fa=Number(m.away.score);
      else if (m.score && m.score.fulltime && m.score.fulltime.away!=null) fa=m.score.fulltime.away;
      else if (m.goals && m.goals.away!=null) fa=m.goals.away;
      
      if (m.score && m.score.halftime) {hh=m.score.halftime.home; ha=m.score.halftime.away;}
      else if (m.home && m.home.halftime!=null) {hh=m.home.halftime; ha=m.away.halftime;}

      var status='notstarted'; var liveMin='';
      if (
