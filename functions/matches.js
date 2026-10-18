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
      if (src) {
        return new Date(src).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      }
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
        
        // DETECT REAL STATUS FROM API
        var short = (m.fixture?.status?.short || m.status || '').toUpperCase();
        var status = 'notstarted';
        var displayTime = europe;
        var isNotStarted = false;
        
        if(short=='NS' || short=='TBD' || short=='NOTSTARTED' || short=='SCHEDULED' || short=='' ) {
          status='notstarted';
          isNotStarted=true;
        } else if(short=='1H' || short=='2H' || short=='HT' || short=='LIVE' || short.indexOf("'")>-1) {
          status='live';
          if(m.fixture?.status?.elapsed) displayTime=m.fixture.status.elapsed+"'";
        } else if(short=='FT' || short=='AET' || short=='PEN' || short=='FINISHED') {
          status='finished';
        } else {
          // If API gives score, assume finished, else not started
          var hasScore = (m.home?.score != null && m.home?.score !== '') || (m.score?.fulltime?.home != null);
          if(hasScore) status='finished';
          else { status='notstarted'; isNotStarted=true; }
        }

        var fh = null, fa = null, hh = 0, ha = 0;
        if(!isNotStarted){
          fh = m.home?.score;
          if(fh==null) fh = m.score?.fulltime?.home;
          fa = m.away?.score;
          if(fa==null) fa = m.score?.fulltime?.away;
          hh = m.score?.halftime?.home ?? 0;
          ha = m.score?.halftime?.away ?? 0;
          // If still null but status finished, set to 0 only if API says so, else keep null for not started
          if(fh==null && status=='finished') fh=0;
          if(fa==null && status=='finished') fa=0;
        }

        var ts=m.fixture?.timestamp||(Date.now()/1000 + i);
        var prio=getPriority(m.league?.name||'',m.league?.country||'');
        
        out.push({
          id:m.id||i,
          time:displayTime,
          realTime:europe,
          ts:prio*100000000+ts,
          home:{name:m.home?.name||'Home',score:fh},
          away:{name:m.away?.name||'Away',score:fa},
          ht_home:hh,ht_away:ha,
          ft_home:fh,ft_away:fa,
          league:{country:m.league
