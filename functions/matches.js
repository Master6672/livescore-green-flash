export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];
  
  function toEuropeTime(m) {
    try {
      if (m.fixture && m.fixture.timestamp) {
        var d = new Date(m.fixture.timestamp * 1000);
        return d.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      }
      if (m.fixture && m.fixture.date) {
        return new Date(m.fixture.date).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return '15:00';
    } catch(e) { return '15:00'; }
  }

  try {
    var key = context.env.FOOTBALL_API_KEY;
    if (!key) {
      // NO KEY - return empty with error so we can see
      return new Response(JSON.stringify({data:{matches:[],error:"NO_API_KEY_SET"}}), {
        headers: {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}
      });
    }
    
    // Try fetch with date
    var res = await fetch('https://live-football-api.com/api/v1/matches?date='+date, {
      headers: {'X-API-Key': key.trim()}
    });
    var json = await res.json();
    var list = (json.data && json.data.matches) ? json.data.matches : (json.data || []);
    
    // If empty, try without date parameter
    if (!list || list.length == 0) {
      var res2 = await fetch('https://live-football-api.com/api/v1/matches', {
        headers: {'X-API-Key': key.trim()}
      });
      var json2 = await res2.json();
      list = (json2.data && json2.data.matches) ? json2.data.matches : (json2.data || []);
    }
    
    // If still empty, try yesterday (because your API may not have future date 10-18)
    if (!list || list.length == 0) {
      var y = new Date(); y.setDate(y.getDate()-1);
      var yDate = y.toISOString().split('T')[0];
      var res3 = await fetch('https://live-football-api.com/api/v1/matches?date='+yDate, {
        headers: {'X-API-Key': key.trim()}
      });
      var json3 = await res3.json();
      list = (json3.data && json3.data.matches) ? json3.data.matches : (json3.data || []);
    }

    for (var i=0; i<list.length; i++) {
      var m = list[i];
      var europe = toEuropeTime(m);
      var short = ((m.fixture && m.fixture.status && m.fixture.status.short) || m.status || '').toString().toUpperCase();
      var status = 'notstarted';
      var displayTime = europe;
      var isNS = true;
      
      if (short == '1H' || short == '2H' || short == 'HT' || short == 'LIVE') {
        status = 'live'; isNS = false;
        if (m.fixture && m.fixture.status && m.fixture.status.elapsed) displayTime = m.fixture.status.elapsed + "'";
      } else if (short == 'FT' || short == 'AET' || short == 'PEN') {
        status = 'finished'; isNS = false;
      } else {
        // FIX FT BUG: Check if score actually exists
        var hasScore = (m.home && m.home.score != null && m.home.score !== '') || (m.score && m.score.fulltime && m.score.fulltime.home != null);
        if (hasScore) { status = 'finished'; isNS = false; }
        else { status = 'notstarted'; isNS = true; }
      }
      
      var fh = null, fa = null;
      if (!isNS) {
        if (m.home && m.home.score != null) fh = m.home.score;
        else if (m.score && m.score.fulltime) fh = m.score.fulltime.home;
        if (m.away && m.away.score != null) fa = m.away.score;
        else if (m.score && m.score.fulltime) fa = m.score.fulltime.away;
        if (fh == null) fh = 0; if (fa == null) fa = 0;
      }
      
      var hh = (m.score && m.score.halftime) ? (m.score.halftime.home || 0) : 0;
      var ha = (m.score && m.score.halftime) ? (m.score.halftime.away || 0) : 0;
      var ts = (m.fixture && m.fixture.timestamp) ? m.fixture.timestamp : (Date.now()/1000 + i);
      var prio = 99;
      var ln = (m.league && m.league.name || '').toLowerCase();
      if (ln.indexOf('champions league') > -1) prio = 1;
      else if (ln.indexOf('england') > -1 || (m.league && m.league.country || '').toLowerCase().indexOf('england') > -1) prio = 4;
      
      out.push({
        id: m.id || i,
        time: displayTime,
        realTime: europe,
        ts: prio*100000000 + ts,
        home: {name: (m.home && m.home.name) || 'Home', score: fh},
        away: {name: (m.away && m.away.name) || 'Away', score: fa},
        ht_home: hh, ht_away: ha,
        ft_home: fh, ft_away: fa,
        league: {country: (m.league && m.league.country) || 'World', name: (m.league && m.league.name) || 'League'},
        status: status
      });
    }
  } catch(e) {
    // Return error in json so you can see it
    return new Response(JSON.stringify({data:{matches:out, error: e.message}}), {
      headers: {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}
    });
  }
  
  out.sort(function(a,b){return a.ts-b.ts;});
  return new Response(JSON.stringify({data:{matches:out}}), {
    headers: {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}
  });
}
