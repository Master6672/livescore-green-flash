
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    
    let res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {headers:{'X-API-Key':key.trim()}});
    let json = await res.json();
    let list = json.data?.matches || json.data || [];

    // EUROPE TIME CONVERTER - Like Flashscore CET/CEST
    function toEuropeTime(ts, iso){
      try{
        if(ts){
          const d=new Date(ts*1000);
          // Europe/Paris = CET/CEST same as Flashscore
          return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Paris'}).format(d);
        }
        if(iso){
          const d=new Date(iso);
          return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Paris'}).format(d);
        }
      }catch(e){}
      return '-';
    }

    function getPriority(name){
      const n=(name||'').toLowerCase();
      if(n.includes('champions league') && !n.includes('qualification')) return 1;
      if(n.includes('europa league') && !n.includes('conference')) return 2;
      if(n.includes('conference league') || n.includes('europa conference')) return 3;
      if(n.includes('premier league') || n.includes('epl') ) return 4;
      if(n.includes('ligue 1') || n.includes('france ligue')) return 5;
      if(n.includes('bundesliga')) return 6;
      if(n.includes('serie a') || n.includes('series a')) return 7;
      if(n.includes('la liga') || n.includes('laliga') || n.includes('primera division')) return 8;
      if(n.includes('eredivisie')) return 9;
      if(n.includes('primeira liga') || n.includes('liga portugal')) return 10;
      return 99; // other leagues go down
    }

    let out=[];
    for(let m of list){
      const lname=m.league?.name||'';
      const prio=getPriority(lname);
      // ONLY TOP 10 LEAGUES - NO OTHER LEAGUE FIRST
      if(prio>10) continue; 

      const ts=m.fixture?.timestamp||0;
      const iso=m.fixture?.date||'';
      const time=toEuropeTime(ts, iso);

      let fh=m.goals?.home ?? m.score?.fulltime?.home ?? m.home?.score ?? null;
      let fa=m.goals?.away ?? m.score?.fulltime?.away ?? m.away?.score ?? null;
      let hh=m.score?.halftime?.home ?? m.home?.halftime ?? null;
      let ha=m.score?.halftime?.away ?? m.away?.halftime ?? null;

      const short=(m.fixture?.status?.short||'').toUpperCase();
      const elapsed=m.fixture?.status?.elapsed||0;
      let status='notstarted'; let live='';
      if(['1H','2H','HT','LIVE'].includes(short) || elapsed){status='live'; live=elapsed?elapsed+"'":'LIVE';}
      else if(['FT','AET','PEN','FT_PEN'].includes(short) || (fh!=null && date<=new Date().toISOString().split('T')[0])){status='finished';}
      
      if(status=='notstarted'){fh=null;fa=null;hh=null;ha=null;}

      out.push({
        id:m.id, time:time, ts:ts, priority:prio,
        liveMinute:live, status:status,
        home:{name:m.home?.name||'Home'}, away:{name:m.away?.name||'Away'},
        ht_home:hh, ht_away:ha, ft_home:fh, ft_away:fa,
        league:{country:m.league?.country||'Europe', name:lname, priority:prio}
      });
    }

    // SORT BY MY TOP 10 ORDER FIRST, THEN BY TIME
    out.sort((a,b)=>{
      if(a.priority!==b.priority) return a.priority-b.priority;
      return a.ts-b.ts;
    });

    return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
