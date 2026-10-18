export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];

  // MANUAL EUROPE TIME - Cloudflare no support toLocaleString timeZone
  function toEuropeTime(m) {
    try {
      var ts = null;
      if (m.fixture && m.fixture.timestamp) ts = m.fixture.timestamp;
      else if (m.fixture && m.fixture.date) ts = Math.floor(new Date(m.fixture.date).getTime()/1000);
      else if (m.date) ts = Math.floor(new Date(m.date).getTime()/1000);
      
      if (!ts) return '15:00';
      
      var d = new Date(ts * 1000);
      // Europe CET is UTC+1, CEST (summer) UTC+2 - October is CEST = +2
      var utcHour = d.getUTCHours();
      var utcMin = d.getUTCMinutes();
      var europeHour = (utcHour + 2) % 24; // +2 for CEST
      var hh = europeHour < 10 ? '0'+europeHour : ''+europeHour;
      var mm = utcMin < 10 ? '0'+utcMin : ''+utcMin;
      return hh+':'+mm;
    } catch(e) { return '15:00'; }
  }

  var todayEurope = new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' });
  // Use UTC date for comparison (simple)
  var y = new Date(); y.setDate(y.getDate()-1);
  var yesterdayStr = y.toISOString().split('T')[0];
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  var tomorrowStr = tomorrow.toISOString().split('T')[0];
  
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
      var lname = (m.league && m.league.name || '').toLowerCase();
      if (lname.indexOf('second amateur')>-1 || lname.indexOf('goiano 3')>-1 || lname.indexOf('paulista u20')>-1 || lname.indexOf('3. hnl')>-1) continue;

      var kickoff=toEuropeTime(m);
      var short=((m.fixture&&m.fixture.status&&m.fixture.status.short)||m.status||'').toString().toUpperCase();
      var elapsed=(m.fixture&&m.fixture.status&&m.fixture.status.elapsed)||null;
      
      // Get scores - try all possible fields
      var fh=null,fa=null,hh=null,ha=null;
      if (m.home && m.home.score!=null && m.home.score!=='') fh = Number(m.home.score);
      else if (m.score && m.score.fulltime && m.score.fulltime.home!=null) fh = m.score.fulltime.home;
      else if (m.goals && m.goals.home!=null) fh = m.goals.home;
      
      if (m.away && m.away.score!=null && m.away.score!=='') fa = Number(m.away.score);
      else if (m.score && m.score.fulltime && m.score.fulltime.away!=null) fa = m.score.fulltime.away;
      else if (m.goals && m.goals.away!=null) fa = m.goals.away;
      
      if (m.score && m.score.halftime) {hh=m.score.halftime.home; ha=m.score.halftime.away;}

      var status='notstarted'; var liveMin='';

      if (isFuture) {
        // TOMORROW - always not started
        status='notstarted'; fh=null; fa=null; hh=null; ha=null;
      } else if (isPast) {
        // YESTERDAY - always FINISHED if we have score, else show as finished with -
        if (fh!=null && fa!=null) status='finished';
        else status='finished'; // yesterday is finished even if no score, but try show score
        // If still no score, keep null but status finished so user sees it was played
      } else {
        // TODAY
        if (elapsed || short=='1H' || short=='2H' || short=='HT' || short=='LIVE') { 
          status='live'; liveMin=elapsed?elapsed+"'":'LIVE';
        } else if (short=='FT' || short=='AET' || short=='PEN' || short=='FT_PEN' || short=='FINISHED') { 
          status='finished';
        } else {
          // If score exists today, it's finished, else notstarted
          if (fh!=null && fa!=null) status='finished';
          else status='notstarted';
        }
        if (status=='notstarted') {fh=null; fa=null; hh=null; ha=null;}
      }
      
      var ts=(m.fixture&&m.fixture.timestamp)||(Date.now()/1000+i);
      out.push({id:m.id||i,time:kickoff,liveMinute:liveMin,ts:ts,home:{name:(m.home&&m.home.name)||'Home'},away:{name:(m.away&&m.away.name)||'Away'},ht_home:hh,ht_away:ha,ft_home:fh,ft_away:fa,league:{country:(m.league&&m.league.country)||'World',name:(m.league&&m.league.name)||'League'},status:status});
    }
  } catch(e) {}
  out.sort((a,b)=>a.ts-b.ts);
  return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
}
