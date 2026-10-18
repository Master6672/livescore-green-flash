export async function onRequestGet(c){
const key=c.env.FOOTBALL_API_KEY;
let date=new URL(c.request.url).searchParams.get('date')||"2026-10-17";
try{
let r=await fetch(`https://live-football-api.com/api/v1/matches?date=${date}&language=en`,{headers:{"X-API-Key":key}});
let j=await r.json();
let list=j.data?.matches||[];

let out=list.map((m,i)=>{
let isFinished=m.status?.status==="finished"||m.status?.state==="postGame"||m.status?.status==="FT";
let isLive=m.status?.is_live||false;

// SAME TIME AS FLASHSCORE - NO +02:00
let timeVal = m.time || "";
let country = m.league?.country || "Other";
let leagueName = m.league?.name || "League";
if(country==="World"){
  if(leagueName.includes("Premier")) country="England";
  else if(leagueName.includes("Ligue 1")) country="France";
  else if(leagueName.includes("Bundesliga")) country="Germany";
  else if(leagueName.includes("Serie A")) country="Italy";
  else if(leagueName.includes("LaLiga")||leagueName.includes("La Liga")) country="Spain";
  else if(leagueName.includes("Eredivisie")) country="Netherlands";
  else if(leagueName.includes("Primeira")||leagueName.includes("Liga Portugal")) country="Portugal";
  else if(leagueName.toLowerCase().includes("champions league")) country="Europe";
  else if(leagueName.toLowerCase().includes("europa")) country="Europe";
}

return{
id:m.id||i,
time: timeVal,
home:{name:m.home?.name||"Home",score:m.home?.score ?? null},
away:{name:m.away?.name||"Away",score:m.away?.score ?? null},
ht:(m.halftime&&m.halftime.home!==null)?{home:m.halftime.home,away:m.halftime.away}:null,
league:{country:country,name:leagueName},
status:isFinished?"finished":(isLive?"live":"scheduled"),
isLive:isLive
};
});
return new Response(JSON.stringify({data:{matches:out}}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
return new Response(JSON.stringify({data:{matches:[]},error:e.message}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}
}
