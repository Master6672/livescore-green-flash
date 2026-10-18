export async function onRequestGet(context){
  try{
    var key=context.env.FOOTBALL_API_KEY;
    if(!key) return new Response("No FOOTBALL_API_KEY set",{status:500});
    var date=new Date().toISOString().split('T')[0];
    var u=new URL(context.request.url);
    var d=u.searchParams.get('date')||date;
    var r=await fetch('https://live-football-api.com/api/v1/matches?date='+d,{headers:{'X-API-Key':key.trim()}});
    var j=await r.json();
    var list=(j.data&&j.data.matches)?j.data.matches:(j.data||[]);
    var out="DATE: "+d+"\nTOTAL: "+list.length+"\n\n";
    for(var i=0;i<Math.min(list.length,20);i++){
      var m=list[i];
      out+="MATCH "+(i+1)+": "+(m.home&&m.home.name)+" - "+(m.away&&m.away.name)+"\n";
      out+="  fixture.date: "+(m.fixture&&m.fixture.date)+"\n";
      out+="  fixture.timestamp: "+(m.fixture&&m.fixture.timestamp)+"\n";
      out+="  Status: "+((m.fixture&&m.fixture.status&&m.fixture.status.short)||m.status)+"\n\n";
    }
    return new Response(out,{headers:{'Content-Type':'text/plain'}});
  }catch(e){return new Response("Error: "+e.message,{status:500});}
}
