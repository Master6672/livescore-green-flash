export async function onRequestGet(context) {
  try {
    var url = new URL(context.request.url);
    var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    var key = context.env.FOOTBALL_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    var apiUrl = 'https://live-football-api.com/api/v1/matches?date='+date;
    var res = await fetch(apiUrl, {headers:{'X-API-Key': key.trim()}});
    var json = await res.json();
    var list = (json.data && json.data.matches) ? json.data.matches : (json.data || []);
    if (!list || list.length==0) {
      var res2 = await fetch('https://live-football-api.com/api/v1/matches', {headers:{'X-API-Key': key.trim()}});
      var json2 = await res2.json();
      list = (json2.data && json2.data.matches) ? json2.data.matches : (json2.data || []);
    }
    var out = [];
    for (var i=0;i<list.length;i++) {
      var m = list[i];
      var iso = (m.fixture && m.fixture.date) || '';
      var time = '15:00';
      if (iso && iso.indexOf('T')>-1) {
        var parts = iso.split('T')[1].split(':');
        var h = parseInt(parts[0],10)+2;
        if (h>=24) h-=24;
        time = (h<10?'0'+h:h)+':'+parts[1];
      } else if (m.fixture && m.fixture.timestamp) {
        var d = new Date(m.fixture.timestamp*1000);
        var h2 = d.getUTCHours()+2;
        if (h2>=24) h2-=24;
        var mm = d.getUTCMinutes();
        time = (h2<10?'0'+h2:h2)+':'+(mm<10?'0'+mm:mm);
      }
      var fh = null, fa = null, hh = null, ha = null;
      if (m.home && m.home.score!=null) fh=m.home.score;
      else if (m.score && m.score.fulltime) fh=m.score.fulltime.home;
      if (m.away && m.away.score!=null) fa=m.away.score;
      else if (m.score && m.score.fulltime) fa=m.score.fulltime.away;
      if (m.score && m.score.halftime) {hh=m.score.halftime.home; ha=m.score.halftime.away;}
      var short = ((m.fixture&&m.fixture.status&&m.fixture.status.short)||'').toUpperCase();
      var elapsed = (m.fixture&&m.fixture.status&&m.fixture.status.elapsed)||'';
      var status = 'notstarted';
      var liveMin = '';
      if (short=='1H'||short=='2H'||short=='HT'||short=='LIVE'||elapsed) {status='live'; liveMin=elapsed?elapsed+"'":'LIVE';}
      else if (short=='FT'||short=='AET'||short=='PEN'||(fh!=null&&fa!=null)) {status='finished';}
      else {status='notstarted'; fh=null; fa=null; hh=null; ha=null;}
      // For tomorrow, hide scores
      var today = new Date().toISOString().split('T')[0];
      if (date>today) {status='notstarted'; fh=null; fa=null; hh=null; ha=null;}
      out.push({id:m.id||i,time:time,liveMinute:liveMin,ts:m.fixture&&m.fixture.timestamp||Date.now()/1000+i,home:{name:(m.home&&m.home.name)||'Home'},away:{name:(m.away&&m.away.name)||'Away'},ht_home:hh,ht_away:ha,ft_home:fh,ft_away:fa,league:{country:(m.league&&m.league.country)||'World',name:(m.league&&m.league.name)||'League'},status:status});
    }
    out.sort(function(a,b){return a.ts-b.ts;});
    return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
  } catch(e) {
    return new Response(JSON.stringify({data:{matches:[],error:e.message}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
