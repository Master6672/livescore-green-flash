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
      return '15:00';
    } catch(e) { return '15:00'; }
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
      // TRY 1: With date
      var res1=await fetch('https://live-football-api.com/api/v1/matches?date='+date,{headers:{'X-API-Key':key.trim()}});
      var json1=await res1.json();
      var list1=(json1.data&&json1.data.matches)?json1.data.matches:(json1.data||[]);

      var list = list1;

      // TRY 2: If empty, try without date (get all live/today from API default)
      if(!list || list.length==0){
        var res2=await fetch('https://live-football-api.com/api/v1/matches',{headers:{'X-API-Key':key.trim()}});
        var json2=await res2.json();
        list=(json2.data&&json2.data.matches)?json2.data.matches:(json2.data||[]);
      }

      for(var i=0;i<list.length;i++){
        var m=list[i];
        var europe=toEuropeTime(m);
        var short=(m.fixture?.status?.short||m.status||'').toUpperCase();
        var status='notstarted';var displayTime=europe;var isNS=true;

        // CORRECT STATUS LOGIC - FIX FT BUG
        if(short=='1H'||short=='2H'||short=='HT'||short=='LIVE'||short=='ET'||short=='P'){
          status='live';isNS=false;
          if(m.fixture?.status?.elapsed) displayTime=m.fixture.status.elapsed+"'";
        } else if(short=='FT'||short=='AET'||short=='PEN'||short=='FT_PEN'||short=='AWD'||short=='WO'){
          status='finished';isNS=false;
        } else if(short=='NS'||short=='TBD'||short==''){
          // Check if score exists - if yes, it's finished, if no, not started
          var hasScore = (m.home?.score!=null && m.home?.score!=='') || (m.score?.fulltime?.home!=null);
          if(hasScore){status='finished';isNS=false;} 
          else {status='notstarted';isNS=true;}
        } else {
          status='notstarted';isNS=true;
        }

        var fh=null,fa=null,hh=0,ha=0;
        if(!isNS){
          fh=m.home?.score; if(fh==null) fh=m.score?.fulltime?.home;
          fa=m.away?.score; if(fa==null) fa=m.score?.fulltime?.away;
          hh=m.score?.halftime?.home??0; ha=m.score?.halftime?.away??0;
          if(fh==null) fh=0; if(fa==null) fa=0;
        }

        var ts=m.fixture?.timestamp||(Date.now()/1000+i);
        var prio=getPriority(m.league?.name||'',m.league?.country||'');
        out.push({id:m.id||i,time:displayTime,realTime:europe,ts:prio*100000000+ts,home:{name:m.home?.name||'Home',score:fh},away:{name:m.away?.name||'Away',score:fa},ht_home:hh,ht_away:ha,ft_home:fh,ft_away:fa,league:{country:m.league?.country||'World',name:m.league?.name||'League'},status:status});
      }
    }
  }catch(e){}

  out.sort((a,b)=>a.ts-b.ts);
  return new Response(JSON.stringify({data:{matches:out}}),[STRIPPED]
}
