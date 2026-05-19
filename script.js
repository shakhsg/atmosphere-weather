/* ── Weather code map ──────────────────────────────────── */
const WX = {
  0:  {emoji:'☀️',  text:'Clear sky',           theme:'sunny'},
  1:  {emoji:'🌤️', text:'Mainly clear',         theme:'sunny'},
  2:  {emoji:'⛅',  text:'Partly cloudy',        theme:'cloudy'},
  3:  {emoji:'☁️',  text:'Overcast',             theme:'cloudy'},
  45: {emoji:'🌫️', text:'Foggy',                theme:'cloudy'},
  48: {emoji:'🌫️', text:'Rime fog',             theme:'cloudy'},
  51: {emoji:'🌦️', text:'Light drizzle',        theme:'rainy'},
  53: {emoji:'🌦️', text:'Drizzle',              theme:'rainy'},
  55: {emoji:'🌦️', text:'Heavy drizzle',        theme:'rainy'},
  61: {emoji:'🌧️', text:'Light rain',           theme:'rainy'},
  63: {emoji:'🌧️', text:'Rain',                 theme:'rainy'},
  65: {emoji:'🌧️', text:'Heavy rain',           theme:'rainy'},
  71: {emoji:'❄️',  text:'Light snow',           theme:'snowy'},
  73: {emoji:'❄️',  text:'Snow',                 theme:'snowy'},
  75: {emoji:'❄️',  text:'Heavy snow',           theme:'snowy'},
  77: {emoji:'🌨️', text:'Snow grains',          theme:'snowy'},
  80: {emoji:'🌦️', text:'Rain showers',         theme:'rainy'},
  81: {emoji:'🌧️', text:'Rain showers',         theme:'rainy'},
  82: {emoji:'⛈️',  text:'Violent showers',      theme:'thunderstorm'},
  85: {emoji:'🌨️', text:'Snow showers',         theme:'snowy'},
  86: {emoji:'🌨️', text:'Heavy snow showers',   theme:'snowy'},
  95: {emoji:'⛈️',  text:'Thunderstorm',         theme:'thunderstorm'},
  96: {emoji:'⛈️',  text:'Thunderstorm + hail',  theme:'thunderstorm'},
  99: {emoji:'⛈️',  text:'Severe thunderstorm',  theme:'thunderstorm'},
};
const wx = code => WX[code] ?? {emoji:'🌡️', text:'Unknown', theme:'default'};

/* ── Helpers ───────────────────────────────────────────── */
function windDir(deg) {
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8];
}
function uvText(v) {
  if (v <= 2) return 'Low';
  if (v <= 5) return 'Moderate';
  if (v <= 7) return 'High';
  if (v <= 10) return 'Very High';
  return 'Extreme';
}
// Parse local ISO time string WITHOUT Date constructor (avoids UTC shift)
function localTime12h(isoStr) {
  const h = parseInt(isoStr.slice(11, 13), 10);
  const m = isoStr.slice(14, 16);
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${p}`;
}
function localDateLong(isoStr) {
  const [y, mo, d] = isoStr.slice(0, 10).split('-').map(Number);
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dow    = new Date(y, mo - 1, d, 12).getDay();
  return `${days[dow]}, ${months[mo - 1]} ${d}`;
}
function fmtHourLabel(isoStr) {
  const h = parseInt(isoStr.slice(11, 13), 10);
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
function fmtDayShort(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return { day: days[new Date(y, mo-1, d, 12).getDay()], date: `${months[mo-1]} ${d}` };
}

/* ── Live clock ────────────────────────────────────────── */
const liveTimeEl = document.getElementById('live-time');
function tickClock() {
  liveTimeEl.textContent = new Date().toLocaleTimeString('en-US', {
    hour:'numeric', minute:'2-digit', hour12:true,
  });
}
tickClock();
setInterval(tickClock, 60000);

/* ── Sidebar nav ───────────────────────────────────────── */
document.querySelectorAll('.sb-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('is-active'));
    link.classList.add('is-active');
  });
});

/* ── Search ────────────────────────────────────────────── */
const cityInput  = document.getElementById('city-input');
const searchBtn  = document.getElementById('search-button');
const contentEl  = document.getElementById('content');

const showLoading = () => {
  contentEl.innerHTML = `<div class="status-state"><p class="status-msg loading-dots"><span>.</span><span>.</span><span>.</span></p></div>`;
};
const showError = msg => {
  document.body.dataset.theme = 'default';
  contentEl.innerHTML = `<div class="status-state"><p class="status-msg is-error">${msg}</p></div>`;
};

async function search() {
  const city = cityInput.value.trim();
  if (!city) return;
  showLoading();

  try {
    const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) { showError('City not found — try another name.'); return; }

    const {latitude, longitude, name, country} = geoData.results[0];

    const params = new URLSearchParams({
      latitude, longitude,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day,precipitation,surface_pressure,visibility,uv_index',
      hourly:  'temperature_2m,precipitation_probability,weather_code',
      daily:   'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset',
      timezone: 'auto',
      forecast_days: 7,
    });

    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    const data = await wRes.json();
    renderAll(data, name, country);
  } catch (e) {
    console.error(e);
    showError('Something went wrong — please try again.');
  }
}

searchBtn.addEventListener('click', search);
cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });

/* ── Render orchestrator ───────────────────────────────── */
function renderAll(data, name, country) {
  const c = data.current;
  const w = wx(c.weather_code);
  document.body.dataset.theme = c.is_day === 0 ? 'night' : w.theme;

  // Find current hour index in hourly array
  const nowHourStr = c.time.slice(0, 13) + ':00';
  const nowIdx     = Math.max(0, data.hourly.time.findIndex(t => t === nowHourStr));

  contentEl.innerHTML = [
    buildHero(data, name, country),
    secHead('Current Conditions'),
    buildConditions(data),
    secHead('Today at a Glance'),
    buildTodayParts(data, nowIdx),
    `<div id="section-hourly"></div>`,
    secHead('Hourly Forecast'),
    buildHourly(data, nowIdx),
    `<div id="section-daily"></div>`,
    secHead('Daily Forecast'),
    buildDaily(data),
  ].join('');
}

/* ── Hero ──────────────────────────────────────────────── */
function buildHero(data, name, country) {
  const c  = data.current;
  const d  = data.daily;
  const w  = wx(c.weather_code);
  const hi = Math.round(d.temperature_2m_max[0]);
  const lo = Math.round(d.temperature_2m_min[0]);

  return `
    <div id="section-today"></div>
    <div class="hero-card">
      <div class="hero-top">
        <div>
          <div class="hero-city">${name}</div>
          <div class="hero-country">${country}</div>
        </div>
        <div class="hero-timestamp">
          ${localDateLong(c.time)}<br>As of ${localTime12h(c.time)}
        </div>
      </div>
      <div class="hero-body">
        <div>
          <div><span class="hero-temp">${Math.round(c.temperature_2m)}</span><span class="hero-temp-unit">°C</span></div>
          <div class="hero-condition">${w.text}</div>
          <div class="hero-hilo">H: ${hi}° &nbsp;·&nbsp; L: ${lo}°</div>
        </div>
        <div class="hero-emoji-wrap">
          <span class="hero-emoji" aria-label="${w.text}">${w.emoji}</span>
        </div>
      </div>
      <div class="hero-strip">
        <div class="strip-item">
          <span class="strip-label">Feels Like</span>
          <span class="strip-value">${Math.round(c.apparent_temperature)}°</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Sunrise</span>
          <span class="strip-value">${localTime12h(d.sunrise[0])}</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Sunset</span>
          <span class="strip-value">${localTime12h(d.sunset[0])}</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Precipitation</span>
          <span class="strip-value">${c.precipitation} mm</span>
        </div>
      </div>
    </div>`;
}

/* ── Conditions grid ───────────────────────────────────── */
function buildConditions(data) {
  const c = data.current;
  const d = data.daily;
  const cc = (icon, label, val, sub) => `
    <div class="cond-card">
      <div class="cond-label"><span class="cond-icon">${icon}</span>${label}</div>
      <div class="cond-value">${val}</div>
      ${sub ? `<div class="cond-sub">${sub}</div>` : ''}
    </div>`;
  return `<div class="conditions-grid">
    ${cc('💨','Wind',`${Math.round(c.wind_speed_10m)} km/h`, windDir(c.wind_direction_10m))}
    ${cc('💧','Humidity',`${c.relative_humidity_2m}%`, `Dew point ${Math.round(c.dew_point_2m)}°`)}
    ${cc('⬆️','Pressure',`${Math.round(c.surface_pressure)}`,`hPa`)}
    ${cc('👁️','Visibility',`${(c.visibility/1000).toFixed(1)}`,`km`)}
    ${cc('☀️','UV Index',`${c.uv_index}`, uvText(c.uv_index))}
    ${cc('🌧️','Precip now',`${c.precipitation}`,`mm`)}
    ${cc('💨','Max Wind',`${Math.round(d.wind_speed_10m_max[0])}`,`km/h today`)}
    ${cc('🌞','Max UV',`${d.uv_index_max[0]}`, uvText(d.uv_index_max[0]) + ' today')}
  </div>`;
}

/* ── Today parts ───────────────────────────────────────── */
function buildTodayParts(data, nowIdx) {
  const today     = data.hourly.time[nowIdx].slice(0, 10);
  const nextDay = (() => { const d = new Date(today + 'T12:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); })();
  const idx = (date, hour) => data.hourly.time.findIndex(t => t === `${date}T${String(hour).padStart(2,'0')}:00`);

  const parts = [
    {label:'Morning',   i: idx(today, 9)},
    {label:'Afternoon', i: idx(today, 15)},
    {label:'Evening',   i: idx(today, 20)},
    {label:'Overnight', i: idx(nextDay, 3)},
  ];

  return `<div class="tod-grid">${parts.map(({label, i}) => {
    if (i < 0) return '';
    const w = wx(data.hourly.weather_code[i]);
    const t = Math.round(data.hourly.temperature_2m[i]);
    const p = data.hourly.precipitation_probability[i];
    return `<div class="tod-card">
      <div class="tod-period">${label}</div>
      <span class="tod-emoji">${w.emoji}</span>
      <div class="tod-temp">${t}°</div>
      <div class="tod-cond">${w.text}${p > 0 ? ` · ${p}%` : ''}</div>
    </div>`;
  }).join('')}</div>`;
}

/* ── Hourly ────────────────────────────────────────────── */
function buildHourly(data, nowIdx) {
  const items = [];
  for (let i = nowIdx; i < nowIdx + 24 && i < data.hourly.time.length; i++) {
    const w   = wx(data.hourly.weather_code[i]);
    const t   = Math.round(data.hourly.temperature_2m[i]);
    const p   = data.hourly.precipitation_probability[i];
    const now = i === nowIdx;
    items.push(`<div class="hour-item${now ? ' is-now' : ''}">
      <div class="hour-time">${now ? 'Now' : fmtHourLabel(data.hourly.time[i])}</div>
      <span class="hour-emoji">${w.emoji}</span>
      <div class="hour-temp">${t}°</div>
      <div class="hour-precip">${p}%</div>
    </div>`);
  }
  return `<div class="hourly-scroll">${items.join('')}</div>`;
}

/* ── Daily ─────────────────────────────────────────────── */
function buildDaily(data) {
  const d       = data.daily;
  const todayStr = data.current.time.slice(0, 10);
  return `<div class="daily-list">${d.time.map((dateStr, i) => {
    const {day, date} = fmtDayShort(dateStr);
    const w  = wx(d.weather_code[i]);
    const hi = Math.round(d.temperature_2m_max[i]);
    const lo = Math.round(d.temperature_2m_min[i]);
    const p  = d.precipitation_probability_max[i];
    const isToday = dateStr === todayStr;
    return `<div class="day-row">
      <div class="day-name">${isToday ? 'Today' : day}<small>${date}</small></div>
      <span class="day-emoji">${w.emoji}</span>
      <div class="day-cond">${w.text}</div>
      <div class="day-precip">${p > 0 ? p + '%' : '—'}</div>
      <div class="day-temps">
        <span class="day-hi">${hi}°</span>
        <span class="day-lo">/ ${lo}°</span>
      </div>
    </div>`;
  }).join('')}</div>`;
}

/* ── Section header helper ─────────────────────────────── */
function secHead(text) {
  return `<div class="sec-head"><span class="sec-head-text">${text}</span><span class="sec-head-line"></span></div>`;
}
