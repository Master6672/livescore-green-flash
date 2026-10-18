export async function onRequestGet(context){
  try{
    const url=new URL(context.request.url);
    const date=url.searchParams.get('date')||new Date().toISOString().split('T')[0];
    const key=context.env.FOOTBALL_API_KEY;
    let list=[];
    if(key){
      try{
        const r=await fetch('https://live-football-api.com/api/v1/matches?date='+date,{headers:{'X-API-Key':key.trim()}});
        const j=await r.json();
        list=j.data?.matches||j.data||[];
      }catch(e){}
    }
    function europeTime(ts,iso){
      try{
        const d=ts?new Date(ts*1000):new Date(iso);
        return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Berlin'}).format(d);
      }catch{return '20:45';}
    }
    function prio(n){
      const s=(n||'').toLowerCase();
      if(s.includes('champions league'))return 1;
      if(s.includes('europa league')&&!s.includes('conference'))return 2;
      if(s.includes('conference'))return 3;
      if(s.includes('premier league'))return 4;
      if(s.includes('ligue 1'))return 5;
      if(s.includes('bundesliga'))return 6;
      if(s.includes('serie a')||s.includes('series a'))return 7;
      if(s.includes('la liga')||s.includes('laliga'))return 8;
      if(s.includes('eredivisie'))return 9;
      if(s.includes('primeira')||s.includes('liga portugal'))return 10;
      return 99;
    }
    let out=[];
    for(let m of list){
      const lname=m.league?.name||'Other League';
      const p=prio(lname);
      const ts=m.fixture?.timestamp||0;
      const iso=m.fixture?.date||'';
      const time=europeTime(ts,iso);
      let fh=m.goals?.home??m.score?.fulltime?.home??null;
      let fa=m.goals?.away??m.score?.fulltime?.away??null;
      let hh=m.score?.halftime?.home??null;
      let ha=m.score?.halftime?.away??null;
      const short=(m.fixture?.status?.short||'').toUpperCase();
      const el=m.fixture?.status?.elapsed||0;
      let status='notstarted';let live='';
      if(['1H','2H','HT','LIVE'].includes(short)||el){status='live';live=el?el+"'":'LIVE';}
      else if(['FT','AET','PEN'].includes(short)){status='finished';}
      if(status=='notstarted'){fh=null;fa=null;}
      out.push({id:m.id||Math.random(),time:time,ts:ts,priority:p,status:status,liveMinute:live,home:{name:m.home?.name||'Home'},away:{name:m.away?.name||'Away'},ht_home:hh,ht_away:ha,ft_home:fh,ft_away:fa,league:{name:lname,country:m.league?.country||'',priority:p}});
    }
    out.sort((a,b)=>{
      if(a.priority!==b.priority)return a.priority-b.priority;
      if(a.priority===99)return a.league.name.localeCompare(b.league.name);
      return a.ts-b.ts;
    });
    return new Response(JSON.stringify({data:{matches:out}}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({data:{matches:[]}}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
