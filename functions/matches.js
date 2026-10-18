export async function onRequestGet(context) {
  try {
    var url = new URL(context.request.url);
    var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    var key = context.env.FOOTBALL_API_KEY;
    var apiUrl = 'https://live-football-api.com/api/v1/matches?date='+date;
    var r = await fetch(apiUrl, {headers:{'X-API-Key':key}});
    var j = await r.json();
    var list = (j.data && j.data.matches) ? j.data.matches : (j.data || []);
    var out = [];
    var today = new Date().toISOString().split('T')[0];
    for (var i=0;i<list.length;i++){
      var m=list[i];
      var ts=m.fixture&&m.fixture.timestamp||0;
      var time='FT';
      if(date==today && ts){
        var d=new Date(ts*1000);
        var h=d.getUTCHours()+1; if(h>=24)h-=24;
        var mm=d.getUTCMinutes();
        time=(h<10?'0'+h:h)+':'+(mm<10?'0'+mm:mm);
      } else if(date==today){
        time='15:00';
      } else if(date>today){
        time='-';
      } else {
        time='FT';
      }
      var fh=null,fa=null,hh=null,ha=null;
      if(m.goals&&m.goals.home!=null){fh=m.goals.home;fa=m.goals.away;}
      else if(m.score&&m.score.fulltime){fh=m.score.fulltime.home;fa=m.score.fulltime.away;}
      if(m.score&&m.score.halftime){hh=m.score.halftime.home;ha=m.score.halftime.away;}
      var status='finished';
      if(date>today){status='notstarted'; fh=null; fa=null; hh=null; ha=null;}
      else if(date==today && fh==null){status='notstarted'; fh=null; fa=null;}
      
      out.push({
        id:m.id||i, time:time, ts:ts||i,
        home:{name:(m.home&&m.home.name)||'Home'},
        away:{name:(m.away&&m.away.name)||'Away'},
        ht_home:hh, ht_away:ha, ft_home:fh, ft_away:fa,
        league:{country:(m.league&&m.league.country)||'World',name:(m.league&&m.league.name)||'League'},
        status:status, liveMinute:''
      });
    }
    return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  } catch(e){
    return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
