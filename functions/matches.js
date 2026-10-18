export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];
  function toEuropeTime(m) {
    try {
      if (m.fixture && m.fixture.timestamp) {
        var d = new Date(m.fixture.timestamp * 1000);
        return d.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      }
      var src = (m.fixture && m.fixture.date) || m.date;
      if (src) return new Date(src).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      return '15:00';
    } catch(e) { return '15:00'; }
  }
  var todayEurope = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
  var isFuture = date > todayEurope;

  try {
    var key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    
    // 1. Try requested date
    var res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {headers:{'X-API-Key':key.trim()}});
    var json = await res.json();
    var list = (json.data && json.data.matches) ? json.data.matches : (json.data || []);

    // 2. If empty, try without date (get all live/today from API)
    if (!list || list.length==0) {
      var res2 = await fetch('https://live-football-api.com/api/v1/matches', {headers:{'X-API-Key':key.trim()}});
      var json2 = await res2.json();
      list = (json2.data && json2.data.matches) ? json2.data.matches : (json2.data || []);
    }

    // 3. If still empty, try yesterday
    if (!list || list.length==0) {
      var y = new Date(); y.setDate(y.getDate()-1);
      var yDate = y.toISOString().split('T')[0];
      var res3 = await fetch('https://live-football-api.com/api/v1/matches?date='+yDate, {headers:{'X-API-Key':key.trim()}});
      var json3 = await res3.json();
      list = (json3.data && json3.data.matches) ? json3.data.matches : (json3.data || []);
    }
    
    for (var i=0;i<list.length;i++) {
      var m=list[i];
      var lname = (m.league && m.league.name || '').toLowerCase();
      if (lname.indexOf('second amateur')>-1 || lname.indexOf('goiano 3')>-1 || lname.indexOf('paulista u20')>-1 || lname.indexOf('3. hnl')>-1) continue;

      var kickoff=toEuropeTime(m);
      var short=((m.fixture&&m.fixture.status&&m.fixture.status.short)||m.status||'').toString().toUpperCase();
      var elapsed=(m.fixture&&m.fixture.status&&m.fixture.status.elapsed)||null;
      
      var status='notstarted'; var liveMin='';
      var fh=null,fa=null,hh=null,ha=null;

      if (isFuture) {
        status='notstarted';
      } else {
        if (elapsed || short=='1H' || short=='2H' || short=='HT' || short=='LIVE') { 
          status='live'; liveMin=elapsed?elapsed+"'":'LIVE';
          if (m.home&&m.home.score!=null) fh=m.home.score; else if (m.score&&m.score.fulltime) fh=m.score.fulltime.home;
          if (m.away&&m.away.score!=null) fa=m.away.score; else if (m.score&&m.score.fulltime) fa=m.score.fulltime.away;
        } else if (short=='FT' || short=='AET' || short=='PEN') { 
          status='finished';
          if (m.home&&m.home.score!=null) fh=m.home.score; else if (m.score&&m.score.fulltime) fh=m.score.fulltime.home;
          if (m.away&&m.away.score!=null) fa=m.away.score; else if (m.score&&m.score.fulltime) fa=m.score.fulltime.away;
        } else {
          status='notstarted';
        }
        if (m.score&&m.score.halftime) {hh=m.score.halftime.home; ha=m.score.halftime.away;}
        if (status=='notstarted') {fh=null; fa=null; hh=null; ha=null;}
      }
      
      var ts=(m.fixture&&m.fixture.timestamp)||(Date.now()/1000+i);
      out.push({id:m.id||i,time:kickoff,liveMinute:liveMin,ts:ts,home:{name:(m.home&&m.home.name)||'Home'},away:{name:(m.away&&m.away.name)||'Away'},ht_home:hh,ht_away:ha,ft_home:fh,ft_away:fa,league:{country:(m.league&&m.league.country)||'World',name:(m.league&&m.league.name)||'League'},status:status});
    }
  } catch(e) {}
  out.sort((a,b)=>a.ts-b.ts);
  return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
}
