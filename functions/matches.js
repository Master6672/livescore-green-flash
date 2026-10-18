export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

    let res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {headers:{'X-API-Key':key.trim()}});
    let json = await res.json();
    let list = json.data?.matches || json.data || json || [];

    function europeTime(ts, iso){
      try{
        const d = ts ? new Date(ts*1000) : new Date(iso);
        return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Berlin'}).format(d);
      }catch{return '-';}
    }
    function getPriority(name){
      const n=(name||'').toLowerCase();
      if(n.includes('champions league')) return 1;
      if(n.includes('europa league') && !n.includes('conference')) return 2;
      if(n.includes('conference league') || n.includes('europa conference')) return 3;
      if(n.includes('premier league')) return 4;
      if(n.includes('ligue 1')) return 5;
      if(n.includes('bundesliga')) return 6;
      if(n.includes('serie a') || n.includes('series a')) return 7;
      if(n.includes('la liga') || n.includes('laliga')) return 8;
      if(n.includes('eredivisie')) return 9;
      if(n.includes('primeira liga') || n.includes('liga portugal')) return 10;
      return 99;
    }

    let out=[];
    for(let m of list){
      const lname=m.league?.name||'Unknown League';
      const prio=getPriority(lname);
      const ts=m.fixture?.timestamp||0;
      const iso=m.fixture?.date||'';
      
      // CORRECT EUROPE TIME LIKE FLASHSCORE
      const time = europeTime(ts, iso);

      let fh = m.goals?.home ?? m.score?.fulltime?.home ?? m.home?.score ?? null;
      let fa = m.goals?.away ?? m.score?.fulltime?.away ?? m.away?.score ?? null;
      let hh = m.score?.halftime?.home ?? m.home?.halftime ?? null;
      let ha = m.score?.halftime?.away ?? m.away?.halftime ?? null;

      const short=(m.fixture?.status?.short||'').toUpperCase();
      const el=m.fixture?.status?.elapsed||0;
      let status='notstarted'; let live='';
      if(['1H','2H','HT','LIVE'].includes(short) || el){status='live'; live=el?el+"'":'LIVE';}
      else if(['FT','AET','PEN'].includes(short)){status='finished';}

      if(status=='notstarted'){fh=null;fa=null;}

      out.push({
        id:m.id||Math.random(),
        time:time, ts:ts||0, priority:prio,
        status:status, liveMinute:live,
        home:{name:m.home?.name||'Home'}, away:{name:m.away?.name||'Away'},
        ht_home:hh, ht_away:ha, ft_home:fh, ft_away:fa,
        league:{name:lname, country:m.league?.country||'', priority:prio}
      });
    }

    // TOP 10 FIRST, OTHER LEAGUES A-Z
    out.sort((a,b)=>{
      if(a.priority!==b.priority) return a.priority-b.priority;
      if(a.priority===99) return a.league.name.localeCompare(b.league.name);
      return a.ts-b.ts;
    });

    return new Response(JSON.stringify({data:{matches:out}}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
