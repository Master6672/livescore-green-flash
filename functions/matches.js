export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({data:{matches:[]}}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    
    let res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {headers:{'X-API-Key':key.trim()}});
    let json = await res.json();
    let list = (json.data && json.data.matches) ? json.data.matches : (json.data || []);
    if (!list || list.length==0) {
      const res2 = await fetch('https://live-football-api.com/api/v1/matches', {headers:{'X-API-Key':key.trim()}});
      const json2 = await res2.json();
      list = (json2.data && json2.data.matches) ? json2.data.matches : (json2.data || []);
    }

    const out = [];
    const today = new Date().toISOString().split('T')[0];
    const isFuture = date > today;

    for (let i=0;i<list.length;i++) {
      const m=list[i];
      const iso=(m.fixture&&m.fixture.date)||'';
      const ts=m.fixture&&m.fixture.timestamp||0;
      
      // REAL TIME from timestamp (Lagos WAT = UTC+1)
      let time='15:00';
      if(ts){
        const d=new Date(ts*1000);
        let h=d.getUTCHours()+1; if(h>=24
