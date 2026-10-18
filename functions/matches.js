
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    
    let res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {headers:{'X-API-Key':key.trim()}});
    let json = await res.json();
    let list = json.data?.matches || json.data || [];
    
    if (!list.length) {
      let r2 = await fetch('https://live-football-api.com/api/v1/matches', {headers:{'X-API-Key':key.trim()}});
      let j2 = await r2.json();
      list = j2.data?.matches || j2.data || [];
    }

    const today = new Date().toISOString().split('T')[0];
    const out = [];

    for (let i=0;i<list.length;i++){
      const m=list[i];
      const iso=m.fixture?.date||'';
      const ts=m.fixture?.timestamp||0;
      
      // CORRECT REAL TIME - NOT 15:00!
      let time='-';
      if(ts){
        const d=new Date(ts*1000);
        let h=d.getUTCHours()+1; if(h>=24)h-=24; if(h<0)h+=24;
        let mm=d.getUTCMinutes();
        time=(h<10?'0'+h:h)+':'+(mm<10?'0'+mm:mm);
      } else if(iso.includes('T')){
        const ma=iso.match(/T(\d+):(\d+)/);
        if(ma){let hh=parseInt(ma[1],10)+1; if(hh>=24)hh-=24; time=(hh<10?'0'+hh:hh)+':'+ma[2];}
      }

      let fh=null,fa=null,hh=null,ha=null;
      if(m.goals?.home!=null){fh=m.goals.home;fa=m.goals.away;}
      else if(m.score?.fulltime){fh=m.score.fulltime.home;fa=m.score.fulltime.away;}
      else if(m.home?.score!=null){fh=m.home.score;fa=m.away.score;}

      if(m.score?.halftime){hh=m.score.halftime.home;ha=m.score.halftime.away;}
      else if(m.home?.halftime!=null){hh=m.home.halftime;ha=m.away.halftime;}

      const short=(m.fixture?.status?.short||'').toUpperCase();
      const elapsed=m.fixture?.status?.elapsed||'';
      let status='notstarted';let liveMin='';
      
      if(date>today){status='notstarted';}
      else if(short=='1H'||short=='2H'||short=='LIVE'||short=='HT'||elapsed){status='live';liveMin=elapsed?elapsed+"'":'LIVE';}
      else if(short=='FT'||short=='AET'||short=='PEN'||fh!=null){status='finished';}
      else {status='notstarted';}

      if(status=='notstarted'){fh=null;fa=null;hh=null;ha=null;}

      out.push({
        id:m.id||i,
        time:time,
        liveMinute:liveMin,
        ts:ts||i,
        home:{name:m.home?.name||'Home'},
        away:{name:m.away?.name||'Away'},
        ht_home:hh,ht_away:ha,
        ft_home:fh,ft_away:fa,
        league:{country:m.league?.country||'World',name:m.league?.name||'League'},
        status:status
      });
    }
    out.sort((a,b)=>a.ts-b.ts);
    return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
  } catch(e){
    return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
