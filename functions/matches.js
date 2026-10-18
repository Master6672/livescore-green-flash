export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];
  function toEuropeTime(m) {
    try {
      if (m.fixture?.timestamp) {
        var d = new Date(m.fixture.timestamp * 1000);
        return d.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      }
      var src = m.fixture?.date || m.date || null;
      if (src) return new Date(src).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      return '00:00';
    } catch(e) { return '00:00'; }
  }
  function getPriority(n,c){
    n=(n||'').toLowerCase();c=(c||'').toLowerCase();
    if(n.indexOf('champions league')>-1)return 1;
    if(n.indexOf('europa league')>-1&&n.indexOf('conference')==-1)return 2;
    if(n.indexOf('conference league')>-1)return 3;
    if(c.indexOf('england')>-1)return 4;
    if(c.indexOf('france')>-1)return 5;
    if(c.indexOf('germany')>-1)return 6;
    if(c.indexOf('italy')>-1)return 7;
    if(c.indexOf('spain')>-1)return 8;
    if(c.indexOf('netherlands')>-1)return 9;
    if(c.indexOf('portugal')>-1)return 10;
    return 99;
  }
  try{
    var key=context.env.FOOTBALL_API_KEY;
    if(key){
      var res=await fetch('https://live-football-api.com/api/v1/matches?date='+date,{headers:{'X-API-Key':key.trim()}});
      var json=await res.json();
      var list=(json.data&&json.data.matches)?json.data.matches:(json.data||[]);
      for(var i=0;i<list.length;i++){
        var m=list[i];
        var europe=toEuropeTime(m);
        var short=(m.fixture?.status?.short||m.status||'').toUpperCase();
        var status='notstarted';var displayTime=europe;var isNS=true;
        if(short=='1H'||short=='2H'||short=='HT'||short=='LIVE'||(m.fixture?.status?.elapsed)){
          status='live';isNS=false;
          if(m.fixture?.status?.elapsed) displayTime=m.fixture.status.elapsed+"'";
        } else if(short=='FT'||short=='AET'||short=='PEN'||short=='FT_PEN'){
          status='finished';isNS=false;
        } else if(short=='NS'||short=='TBD'||short=='SCHEDULED'||short==''){
          status='notstarted';isNS=true;
          var hasScore=(m.home?.score!=null)||(m.score?.fulltime?.home!=null);
          if(hasScore){status='finished';isNS=false;}
        }
        var fh=null,fa=null,hh=0,ha=0;
        if(!isNS){
          fh=m.home?.score; if(fh==null) fh=m.score?.fulltime?.home;
          fa=m.away?.score; if(fa==null) fa=m.score?.fulltime?.away;
          hh=m.score?.halftime?.home??0; ha=m.score?.halftime?.away??0;
        }
        var ts=m.fixture?.timestamp||(Date.now()/1000+i);
        var prio=getPriority(m.league?.name||'',m.league?.country||'');
        out.push({id:m.id||i,time:displayTime,realTime:europe,ts:prio*100000000+ts,home:{name:m.home?.name||'Home',score:fh},away:{name:m.away?.name||'Away',score:fa},ht_home:hh,ht_away:ha,ft_home:fh,ft_away:fa,league:{country:m.league?.country||'World',name:m.league?.name||'League'},status:status});
      }
    }
  }catch(e){}
  out.sort((a,b)=>a.ts-b.ts);
  return new Response(JSON.stringify({data:{matches:out}}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
}
