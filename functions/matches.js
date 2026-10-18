export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  var out = [];
  
  // EUROPE TIME CONVERTER - Like Flashscore
  function toEuropeTime(fixtureDate) {
    if (!fixtureDate) return '21:00';
    try {
      var d = new Date(fixtureDate);
      return d.toLocaleString('en-GB', {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return fixtureDate.substring(11,16) || '21:00';
    }
  }

  function getPriority(name, country) {
    var n = (name || '').toLowerCase();
    var c = (country || '').toLowerCase();
    if (n.indexOf('champions league') > -1) return 1;
    if (n.indexOf('europa league') > -1 && n.indexOf('conference') == -1) return 2;
    if (n.indexOf('conference league') > -1) return 3;
    if (c.indexOf('england') > -1) return 4;
    if (c.indexOf('france') > -1) return 5;
    if (c.indexOf('germany') > -1) return 6;
    if (c.indexOf('italy') > -1) return 7;
    if (c.indexOf('spain') > -1) return 8;
    if (c.indexOf('netherlands') > -1) return 9;
    if (c.indexOf('portugal') > -1) return 10;
    return 99;
  }

  var apiData = null;
  try {
    var key = context.env.FOOTBALL_API_KEY;
    if (key) {
      // Try with your key - REAL ENDPOINT
      var apiUrl = 'https://live-football
