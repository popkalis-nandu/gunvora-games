// ---------------------------------------------------------------- UI: screens
let screenId = 'splash', paused = false, setupMode = 'quick', setupCfg = null, careerSel = 'rookie';
const SCREENS = ['splash', 'home', 'garage', 'showroom', 'workshop', 'setup', 'career', 'loading', 'hud', 'pause', 'results', 'profile', 'settings'];
function show(id) {
  screenId = id; SCREENS.forEach(s => { const el = $('scr-' + s); if (el) { const on = s === id || (s === 'hud' && (id === 'pause')); el.hidden = !on; el.setAttribute('aria-hidden', on ? 'false' : 'true'); } });
  document.body.dataset.screen = id; $('coinbar').hidden = ['splash', 'hud', 'pause', 'loading'].includes(id); renderCoins();
  const f = $('scr-' + id) && $('scr-' + id).querySelector('h1,h2'); if (f && id !== 'hud') { f.setAttribute('tabindex', '-1'); try { f.focus({ preventScroll: true }); } catch (e) { } }
  if (id === 'home') renderHome(); if (id === 'garage') renderGarage(); if (id === 'showroom') renderShowroom2(); if (id === 'workshop') renderWorkshop(); if (id === 'setup') renderSetup();
  if (id === 'career') renderCareer(); if (id === 'profile') renderProfile(); if (id === 'settings') renderSettings();
}
const VIEW = { home: { ox: 2.2 }, garage: { ox: 1.9, dist: 8 }, showroom: { ox: 2.5, dist: 8.6 }, workshop: { ox: 2.3, dist: 8.4 }, setup: { ox: 2.4 }, career: { ox: 2.6 }, profile: { ox: 2.6 }, settings: { ox: 3 }, splash: { ox: 0, dist: 9 } };
function renderCoins() { $('coinAmt').textContent = fmtCoins(profile.coins); }
function toast(msg, kind) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (kind || ''); clearTimeout(t._t); t._t = setTimeout(() => t.className = '', 2600); announce(msg); }
let srT = 0; function announce(msg) { if (!settings.announce) return; const el = $('sr'); el.textContent = ''; clearTimeout(srT); srT = setTimeout(() => el.textContent = msg, 60); }
function confirmBox(text, yes, yesLabel) {
  const m = $('modal'); m.hidden = false; m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="mTitle"><p id="mTitle">${text}</p><div class="row"><button class="btn ghost" id="mNo">Cancel</button><button class="btn primary" id="mYes">${yesLabel || 'Confirm'}</button></div></div>`;
  $('mNo').onclick = () => { m.hidden = true; }; $('mYes').onclick = () => { m.hidden = true; yes(); }; $('mYes').focus();
}
const bars = s => Object.entries(ratings(s)).map(([k, v]) => `<div class="stat"><span>${k}</span><i><b style="width:${v.toFixed(0)}%"></b></i><em>${v.toFixed(0)}</em></div>`).join('');
const clsTag = c => `<span class="cls cls-${c.cls}">${c.cls}</span>`;
const spd = kmh => settings.units === 'mph' ? Math.round(kmh * 0.621) : Math.round(kmh);
const spdU = () => settings.units === 'mph' ? 'mph' : 'km/h';
// ---------------------------------------------------------------- home
function renderHome() {
  const ch = dailyChallenge(), done = profile.daily.chDate === todayKey() && profile.daily.chDone, car = CAR(profile.car);
  $('homeCar').innerHTML = `${clsTag(car)} <b>${car.name}</b>`;
  $('dailyBox').innerHTML = `<h3>Daily challenge <span class="pill ${done ? 'ok' : ''}">${done ? 'Completed' : '+' + DAILY_CHALLENGE_REWARD}</span></h3><p>${ch.text}</p><p class="dim">Login streak: day ${profile.daily.streak || 1} of 7 · tomorrow's bonus ${fmtCoins(400 + Math.min(7, (profile.daily.streak || 0) + 1) * 100)}</p>`;
}
// ---------------------------------------------------------------- garage (livery + car select)
let garageCar = null;
function renderGarage() {
  if (!garageCar || !profile.owned.includes(garageCar)) garageCar = profile.car;
  const c = CAR(garageCar), liv = liveryOf(c.id), s = carStats(c.id, upgOf(c.id));
  $('garageList').innerHTML = profile.owned.map(id => { const k = CAR(id); return `<button class="chip ${id === garageCar ? 'on' : ''}" data-car="${id}" aria-pressed="${id === garageCar}">${clsTag(k)} ${k.name}${id === profile.car ? ' ✓' : ''}</button>`; }).join('');
  const sw = (key) => LIVERY_COLORS.map(col => `<button class="sw ${liv[key] === col ? 'on' : ''}" style="background:${col}" data-k="${key}" data-col="${col}" aria-label="${key === 'p' ? 'Primary' : key === 's' ? 'Secondary' : 'Accent'} colour ${col}" aria-pressed="${liv[key] === col}"></button>`).join('');
  $('garageBody').innerHTML = `<h2>${c.name} ${clsTag(c)}</h2><p class="dim">${c.desc}</p>
    <div class="stats">${bars(s)}</div>
    <div class="liv"><label>Primary</label><div class="sws">${sw('p')}</div><label>Secondary</label><div class="sws">${sw('s')}</div><label>Accent</label><div class="sws">${sw('a')}</div>
    <label>Pattern</label><div class="chips">${PATTERNS.map(([k, n]) => `<button class="chip ${liv.pat === k ? 'on' : ''}" data-pat="${k}" aria-pressed="${liv.pat === k}">${n}</button>`).join('')}</div></div>
    <div class="row"><button class="btn primary" id="gSelect" ${profile.car === c.id ? 'disabled' : ''}>${profile.car === c.id ? 'Selected for racing' : 'Race with this car'}</button><button class="btn" id="gReset">Default livery</button><button class="btn" data-go="workshop">Upgrade workshop</button></div>`;
  setShowroomCar(c.id, liv);
}
function onGarageClick(e) {
  const b = e.target.closest('button'); if (!b) return; Sound.click();
  if (b.dataset.car) { garageCar = b.dataset.car; renderGarage(); return; }
  const liv = liveryOf(garageCar);
  if (b.dataset.k) { liv[b.dataset.k] = b.dataset.col; profile.liveries[garageCar] = liv; saveProfile(); renderGarage(); return; }
  if (b.dataset.pat) { liv.pat = b.dataset.pat; profile.liveries[garageCar] = liv; saveProfile(); renderGarage(); return; }
  if (b.id === 'gSelect') { profile.car = garageCar; saveProfile(); toast(`${CAR(garageCar).name} selected`); renderGarage(); }
  if (b.id === 'gReset') { delete profile.liveries[garageCar]; saveProfile(); renderGarage(); }
}
// ---------------------------------------------------------------- showroom (buy cars)
let showCar = 'kestrel';
function renderShowroom2() {
  $('showList').innerHTML = CARS.map(c => { const own = profile.owned.includes(c.id), can = profile.coins >= c.price;
    return `<div class="card ${c.id === showCar ? 'on' : ''}" data-show="${c.id}" role="button" tabindex="0" aria-label="${c.name}, class ${c.cls}, ${own ? 'owned' : fmtCoins(c.price) + ' V-Coins'}"><div class="ct">${clsTag(c)} <b>${c.name}</b></div>
      <div class="price">${own ? '<span class="pill ok">Owned</span>' : `<span class="coin">◆</span> ${fmtCoins(c.price)}`}</div>
      <div class="mini">${c.top} km/h · ${c.df.toFixed(2)} DF · ${c.w} kg</div>${!own && !can ? `<div class="dim small">Need ${fmtCoins(c.price - profile.coins)} more</div>` : ''}</div>`; }).join('');
  const c = CAR(showCar), own = profile.owned.includes(c.id);
  $('showBody').innerHTML = `<h2>${c.name} ${clsTag(c)}</h2><p class="dim">${c.desc}</p><div class="stats">${bars(carStats(c.id, {}))}</div>
    <div class="row">${own ? `<button class="btn" data-go="garage">In your garage</button>` : `<button class="btn primary" id="buyCar" ${profile.coins >= c.price ? '' : 'disabled'}>Buy for ◆ ${fmtCoins(c.price)}</button>`}</div>`;
  setShowroomCar(c.id, liveryOf(c.id));
}
function buyCar(id) {
  const c = CAR(id); if (profile.owned.includes(id)) return false;
  if (profile.coins < c.price) { toast('Not enough V-Coins', 'bad'); return false; }
  if (!spendCoins(c.price, `Bought ${c.name}`)) return false;
  profile.owned.push(id); profile.car = id; saveProfile(); Sound.coin(); toast(`${c.name} added to your garage`, 'good'); return true;
}
// ---------------------------------------------------------------- workshop (upgrades with preview)
let wsCar = null;
const STAT_LABEL = { top: ['Top speed', v => `${v.toFixed(1)} km/h`], a0: ['Acceleration', v => `${v.toFixed(2)} m/s²`], grip: ['Mechanical grip', v => v.toFixed(3)], turn: ['Turn-in', v => v.toFixed(3)], df: ['Downforce', v => v.toFixed(3)], brake: ['Braking', v => `${v.toFixed(1)} m/s²`], wear: ['Tyre wear rate', v => `${(v * 100).toFixed(0)}%`], offPen: ['Off-track penalty', v => `${(v * 100).toFixed(0)}%`], shift: ['Shift time', v => `${(v * 100).toFixed(0)} ms`], boost: ['Boost power', v => `${(v * 100).toFixed(0)}%`], recharge: ['Energy recharge', v => `${(v * 100).toFixed(0)}%`] };
function upgradePreview(carId, upId) {
  const u = Object.assign({}, upgOf(carId)), L = u[upId] || 0; if (L >= 10) return null; const a = carStats(carId, u); u[upId] = L + 1; const b = carStats(carId, u);
  return Object.keys(UPGRADES.find(x => x.id === upId).fx).map(k => ({ k, label: STAT_LABEL[k][0], from: STAT_LABEL[k][1](a[k]), to: STAT_LABEL[k][1](b[k]), better: ['wear', 'offPen', 'shift'].includes(k) ? b[k] < a[k] : b[k] > a[k] }));
}
function renderWorkshop() {
  if (!wsCar || !profile.owned.includes(wsCar)) wsCar = profile.car;
  const up = upgOf(wsCar), c = CAR(wsCar);
  $('wsCars').innerHTML = profile.owned.map(id => `<button class="chip ${id === wsCar ? 'on' : ''}" data-ws="${id}" aria-pressed="${id === wsCar}">${clsTag(CAR(id))} ${CAR(id).name}</button>`).join('');
  $('wsList').innerHTML = UPGRADES.map(U => { const L = up[U.id] || 0, cost = UPG_COST[L], pv = upgradePreview(wsCar, U.id), can = L < 10 && profile.coins >= cost;
    return `<div class="up"><div class="uh"><b>${U.name}</b><span class="lv" aria-label="Level ${L} of 10">${Array.from({ length: 10 }, (_, k) => `<i class="${k < L ? 'on' : ''}"></i>`).join('')}</span><span class="dim">Lv ${L}/10</span></div>
      <div class="dim small">${U.desc}</div>
      ${pv ? `<div class="pv">${pv.map(p => `<span>${p.label}: ${p.from} → <b class="${p.better ? 'good' : 'bad'}">${p.to}</b></span>`).join('')}</div>` : '<div class="pv"><span class="good">Fully upgraded</span></div>'}
      <button class="btn ${can ? 'primary' : ''} sm" data-up="${U.id}" ${can ? '' : 'disabled'}>${L >= 10 ? 'MAX' : `Upgrade · ◆ ${fmtCoins(cost)}`}</button></div>`; }).join('');
  $('wsStats').innerHTML = `<h2>${c.name} ${clsTag(c)}</h2><div class="stats">${bars(carStats(wsCar, up))}</div><p class="dim small">Upgrades are per car. Costs: ${UPG_COST.map(fmtCoins).join(' · ')}.</p>`;
  setShowroomCar(wsCar, liveryOf(wsCar));
}
function buyUpgrade(carId, upId) {
  const up = upgOf(carId), L = up[upId] || 0; if (L >= 10) { toast('Already at max level'); return false; }
  const cost = UPG_COST[L]; if (profile.coins < cost) { toast('Not enough V-Coins', 'bad'); return false; }
  const U = UPGRADES.find(u => u.id === upId); if (!spendCoins(cost, `${CAR(carId).name}: ${U.name} level ${L + 1}`)) return false;
  up[upId] = L + 1; profile.upg[carId] = up; saveProfile(); Sound.coin(); toast(`${U.name} upgraded to level ${L + 1}`, 'good'); return true;
}
// ---------------------------------------------------------------- race setup
function trackThumb(id, w, h) {
  const t0 = T, tr = trackFor(id); T = t0 || tr; const c = mk(w, h, g => { const sx = (w - 16) / (tr.maxX - tr.minX), sz = (h - 16) / (tr.maxZ - tr.minZ), s = Math.min(sx, sz), ox = (w - (tr.maxX - tr.minX) * s) / 2, oz = (h - (tr.maxZ - tr.minZ) * s) / 2;
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); for (let i = 0; i <= tr.n; i += 3) { const k = i % tr.n, x = ox + (tr.maxX - tr.X[k]) * s, y = oz + (tr.maxZ - tr.Z[k]) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
    g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(ox + (tr.maxX - tr.X[0]) * s, oz + (tr.maxZ - tr.Z[0]) * s, 5, 0, 7); g.fill(); });
  return c.toDataURL();
}
const thumbs = {};
function renderSetup() {
  const tt = setupMode === 'tt'; if (!setupCfg) setupCfg = { circuit: 'vgp', laps: 3, weather: 'dry', diff: 'medium', tyre: 'medium', carId: profile.car };
  const S = setupCfg; if (!profile.owned.includes(S.carId)) S.carId = profile.car;
  $('setupTitle').textContent = tt ? 'Time Trial' : 'Quick Race';
  const opt = (name, val, label, cur) => `<button class="chip ${cur === val ? 'on' : ''}" data-set="${name}" data-val="${val}" aria-pressed="${cur === val}">${label}</button>`;
  $('setupBody').innerHTML = `
    <div class="field"><label>Circuit</label><div class="tracks">${CIRCUITS.map(c => { thumbs[c.id] = thumbs[c.id] || trackThumb(c.id, 160, 100); const rec = profile.records[c.id];
      return `<button class="trk ${S.circuit === c.id ? 'on' : ''}" data-set="circuit" data-val="${c.id}" aria-pressed="${S.circuit === c.id}"><img src="${thumbs[c.id]}" alt=""><b>${c.name}</b><span class="dim small">${(TRACKS.get(c.id).len / 1000).toFixed(2)} km · ${c.night ? 'Night' : 'Day'}</span><span class="small">PB ${rec && rec.best ? fmtLap(rec.best) : '—'}</span></button>`; }).join('')}</div><p class="dim small">${CIRCUIT(S.circuit).desc}</p></div>
    <div class="field"><label>Car</label><div class="chips">${profile.owned.map(id => opt('carId', id, `${CAR(id).cls} · ${CAR(id).name}`, S.carId)).join('')}</div></div>
    ${tt ? '' : `<div class="field"><label>Laps</label><div class="chips">${[3, 5, 10].map(l => opt('laps', l, l, S.laps)).join('')}<label class="custom">Custom <input id="lapsCustom" type="number" min="1" max="30" value="${[3, 5, 10].includes(S.laps) ? '' : S.laps}" aria-label="Custom lap count"></label></div></div>
    <div class="field"><label>AI difficulty</label><div class="chips">${opt('diff', 'easy', 'Easy', S.diff)}${opt('diff', 'medium', 'Medium', S.diff)}${opt('diff', 'hard', 'Hard', S.diff)}</div></div>`}
    <div class="field"><label>Weather</label><div class="chips">${opt('weather', 'dry', '☀ Dry', S.weather)}${opt('weather', 'rain', '🌧 Rain', S.weather)}</div></div>
    <div class="field"><label>Starting tyres</label><div class="chips">${Object.entries(TYRES).map(([k, t]) => `<button class="chip tyre ${S.tyre === k ? 'on' : ''}" data-set="tyre" data-val="${k}" aria-pressed="${S.tyre === k}"><i style="background:${t.col}"></i>${t.name}</button>`).join('')}</div>
      <p class="dim small">Soft: most grip, fastest wear. Hard: least grip, lasts longest. Wet: only good in the rain.${S.weather === 'rain' && S.tyre !== 'wet' ? ' <b class="bad">Slicks in the rain will be slippery!</b>' : ''}</p></div>`;
  setShowroomCar(S.carId, liveryOf(S.carId));
}
function onSetupClick(e) {
  const b = e.target.closest('[data-set]'); if (!b) return; Sound.click(); const k = b.dataset.set; let v = b.dataset.val; if (k === 'laps') v = +v;
  setupCfg[k] = v; if (k === 'weather') setupCfg.tyre = v === 'rain' ? 'wet' : (setupCfg.tyre === 'wet' ? 'medium' : setupCfg.tyre); renderSetup();
}
function launchFromSetup() {
  const S = setupCfg, c = $('lapsCustom'); if (c && c.value) S.laps = clamp(Math.round(+c.value) || 3, 1, 30);
  beginRace(Object.assign({ mode: setupMode === 'tt' ? 'tt' : 'quick' }, S));
}
// ---------------------------------------------------------------- career
function renderCareer() {
  $('champList').innerHTML = CHAMPIONSHIPS.map(C => { const lock = profile.earned < C.req, cs = profile.career[C.id];
    return `<button class="card ${careerSel === C.id ? 'on' : ''} ${lock ? 'locked' : ''}" data-champ="${C.id}" aria-pressed="${careerSel === C.id}"><div class="ct"><b>${C.name}</b></div><div class="small dim">${C.rounds.length} rounds · ${C.diff} AI</div>
      <div class="small">${lock ? `🔒 Earn ${fmtCoins(C.req)} V-Coins (${fmtCoins(profile.earned)} so far)` : cs ? (cs.done ? `Finished ${ordinal(cs.final)}` : `Round ${cs.round + 1} of ${C.rounds.length}`) : 'Not started'}</div></button>`; }).join('');
  const C = CHAMPIONSHIPS.find(c => c.id === careerSel), lock = profile.earned < C.req, cs = careerState(C.id), table = standings(C.id);
  const next = C.rounds[cs.round];
  $('champBody').innerHTML = `<h2>${C.name}</h2><p class="dim">${C.desc} Points: ${POINTS.join('-')}. Champion bonus ◆ ${fmtCoins(CHAMPION_BONUS)}.</p>
    <div class="cols"><div><h3>Calendar</h3><ol class="rounds">${C.rounds.map((r, k) => { const res = cs.results.find(x => x.round === k); return `<li class="${k === cs.round && !cs.done ? 'next' : ''}"><b>${CIRCUIT(r.c).name}</b> · ${r.laps} laps · ${r.weather === 'rain' ? '🌧 rain' : '☀ dry'} · class ${C.classes[k % C.classes.length]}+ field ${res ? `<span class="pill">${ordinal(res.pos)} · ${res.pts} pts</span>` : ''}</li>`; }).join('')}</ol></div>
    <div><h3>Standings</h3><table class="tbl"><thead><tr><th>#</th><th>Driver</th><th>Team</th><th>Pts</th></tr></thead><tbody>${table.map((r, k) => `<tr class="${r.id === 'you' ? 'me' : ''}"><td>${k + 1}</td><td><i class="dot" style="background:${r.col}"></i>${esc(r.name)}</td><td class="dim">${esc(r.team)}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div></div>
    <div class="row">${lock ? `<button class="btn" disabled>Locked</button>` : cs.done ? `<button class="btn primary" id="champReset">Start a new season</button>` : `<label class="dim small">Car <select id="champCar">${profile.owned.map(id => `<option value="${id}" ${id === profile.car ? 'selected' : ''}>${CAR(id).cls} · ${CAR(id).name}</option>`).join('')}</select></label><button class="btn primary" id="champGo">Race round ${cs.round + 1}: ${CIRCUIT(next.c).name}</button>${cs.round > 0 ? '<button class="btn ghost" id="champReset">Restart season</button>' : ''}`}</div>`;
}
function startCareerRound() {
  const C = CHAMPIONSHIPS.find(c => c.id === careerSel), cs = careerState(C.id); if (profile.earned < C.req || cs.done) return;
  const r = C.rounds[cs.round], sel = $('champCar'); const carId = sel ? sel.value : profile.car;
  beginRace({ mode: 'career', champ: C.id, round: cs.round, circuit: r.c, laps: r.laps, weather: r.weather, diff: C.diff, carId, aiClass: C.classes[cs.round % C.classes.length], tyre: r.weather === 'rain' ? 'wet' : 'medium', gridSlot: cs.round === 0 ? 7 : null });
}
// ---------------------------------------------------------------- profile
function renderProfile() {
  const s = profile.stats;
  $('profBody').innerHTML = `<div class="grid4">${[['Races', s.races], ['Wins', s.wins], ['Podiums', s.podiums], ['Laps', s.laps], ['Distance', s.km.toFixed(1) + ' km'], ['Best finish', s.best ? ordinal(s.best) : '—'], ['Championships', s.champs], ['Time-trial laps', s.ttLaps], ['Total earned', '◆ ' + fmtCoins(profile.earned)], ['Total spent', '◆ ' + fmtCoins(profile.spent)], ['Cars owned', profile.owned.length + ' / ' + CARS.length], ['Balance', '◆ ' + fmtCoins(profile.coins)]].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
    <h3>Personal lap records</h3><table class="tbl"><tbody>${CIRCUITS.map(c => { const r = profile.records[c.id]; return `<tr><td>${c.name}</td><td><b>${r && r.best ? fmtLap(r.best) : '—'}</b></td><td class="dim">${r && r.car ? CAR(r.car).name : ''}</td><td class="dim">${r && r.ghost ? 'ghost saved' : ''}</td></tr>`; }).join('')}</tbody></table>
    <h3>V-Coin transactions</h3><table class="tbl tx"><thead><tr><th>When</th><th>What</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${profile.tx.slice(0, 60).map(t => `<tr><td class="dim">${new Date(t.t).toLocaleString()}</td><td>${esc(t.why)}</td><td class="${t.amt > 0 ? 'good' : 'bad'}">${t.amt > 0 ? '+' : '−'}${fmtCoins(Math.abs(t.amt))}</td><td>${fmtCoins(t.bal)}</td></tr>`).join('')}</tbody></table>`;
}
// ---------------------------------------------------------------- settings
function renderSettings() {
  const tog = (k, label, hint) => `<label class="tog"><input type="checkbox" data-setk="${k}" ${settings[k] ? 'checked' : ''}><span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  const ch = (k, opts) => `<div class="chips" role="group">${opts.map(([v, l]) => `<button class="chip ${settings[k] === v ? 'on' : ''}" data-setc="${k}" data-val="${v}" aria-pressed="${settings[k] === v}">${l}</button>`).join('')}</div>`;
  $('setBody').innerHTML = `
  <section><h3>Graphics</h3>${ch('gfx', [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}<p class="dim small" id="gfxInfo"></p>
    <h3>Camera</h3>${ch('camera', [['chase', 'Chase'], ['far', 'Far chase'], ['tcam', 'T-cam'], ['cockpit', 'Cockpit']])}
    <h3>Units</h3>${ch('units', [['kmh', 'km/h'], ['mph', 'mph']])}</section>
  <section><h3>Sound</h3>${tog('sound', 'Sound effects and engine')}<label class="sl">Volume <input type="range" min="0" max="1" step="0.05" value="${settings.volume}" data-setr="volume"></label></section>
  <section><h3>Driving assists</h3>${tog('tc', 'Traction control', 'Stops wheelspin on throttle')}${tog('abs', 'ABS', 'Stops wheels locking under braking')}${tog('line', 'Racing line', 'Green = go, red = brake')}${tog('autoGear', 'Automatic gears', 'Off: E / Q or the gear buttons')}${tog('steerAssist', 'Steering assist', 'Helps you round corners and away from the barriers')}${tog('driftTap', 'Brake-tap drift', 'Tap BRAKE while steering hard at speed to slide the car')}${tog('autoLaunch', 'Assisted launch', 'Automatic good start from the lights')}</section>
  <section><h3>Controls</h3>${ch('touch', [['auto', 'Touch: auto'], ['on', 'Touch: on'], ['off', 'Touch: off']])}<label class="dim small">Button size</label>${ch('btnSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra large']])}
    ${tog('leftHanded', 'Left-handed layout', 'Pedals on the left, steering on the right')}${tog('tilt', 'Tilt steering', 'Steer by tilting the phone (asks for motion permission)')}${tog('tiltInvert', 'Invert tilt direction')}
    <label class="sl">Steering sensitivity <input type="range" min="0.5" max="1.6" step="0.05" value="${settings.sens}" data-setr="sens"><output>${(+settings.sens).toFixed(2)}</output></label>
    <p class="dim small">Keyboard: arrows / WASD drive, X drift, Space boost, E/Q gears, P pit, T pit tyre, C camera, Esc pause. Gamepad: stick steer, RT/LT throttle/brake, A boost, X pit, Y camera, bumpers gears, Start pause.</p></section>
  <section><h3>Accessibility</h3>${tog('hc', 'High-contrast HUD')}${tog('cb', 'Colour-blind friendly colours', 'Blue/orange instead of green/red')}${tog('rm', 'Reduced motion', 'No camera shake, speed zoom or menu spin')}${tog('announce', 'Screen-reader announcements', 'Positions, laps and events read out')}</section>
  <section><h3>Data</h3><p class="dim small">Progress is saved in this browser only (no account or cloud save in V1).</p><button class="btn ghost" id="resetAll">Reset all progress</button></section>`;
  applyGfx(false);
}
function applyBodyClasses() { const b = document.body.classList; b.toggle('hc', settings.hc); b.toggle('cb', settings.cb); b.toggle('rm', settings.rm); b.toggle('lefty', settings.leftHanded); document.body.dataset.btn = settings.btnSize; b.toggle('tilt', settings.tilt); b.toggle('manual', !settings.autoGear); const touch = settings.touch === 'on' || (settings.touch === 'auto' && isTouchDev()); b.toggle('touchui', touch); }
async function enableTilt(on) {
  if (on && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { try { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') { settings.tilt = false; saveSettings(); toast('Motion permission denied, tilt steering is off', 'bad'); renderSettings(); applyBodyClasses(); return; } } catch (e) { settings.tilt = false; saveSettings(); renderSettings(); return; } }
  if (on && typeof DeviceOrientationEvent === 'undefined') { toast('Tilt steering is not supported on this device'); }
  tiltCal = null; applyBodyClasses();
}
function onSettingsInput(e) {
  const t = e.target;
  if (t.dataset.setk) { settings[t.dataset.setk] = t.checked; saveSettings(); if (t.dataset.setk === 'sound') Sound.enable(t.checked); if (t.dataset.setk === 'tilt') enableTilt(t.checked); if (t.dataset.setk === 'line') updateLineVis(); applyBodyClasses(); }
  if (t.dataset.setr) { settings[t.dataset.setr] = +t.value; saveSettings(); if (t.dataset.setr === 'volume') Sound.enable(settings.sound); const o = t.parentNode.querySelector('output'); if (o) o.textContent = (+t.value).toFixed(2); }
}
function onSettingsClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.setc) { Sound.click(); settings[b.dataset.setc] = b.dataset.val; saveSettings(); if (b.dataset.setc === 'gfx') applyGfx(false); applyBodyClasses(); renderSettings(); }
  if (b.id === 'resetAll') confirmBox('Reset all progress? This deletes your V-Coins, cars, upgrades, records and career in this browser.', () => { localStorage.removeItem(PROF_KEY); profile = newProfile(); loadProfile(); dailyLogin(); saveProfile(); toast('Progress reset'); show('home'); }, 'Reset');
}
// ---------------------------------------------------------------- loading + results
function beginRace(cfg) {
  show('loading'); $('loadInfo').textContent = `${CIRCUIT(cfg.circuit).name} · ${cfg.mode === 'tt' ? 'Time trial' : cfg.laps + ' laps'} · ${cfg.weather === 'rain' ? 'Rain' : 'Dry'}`;
  $('loadTip').textContent = ['Drift: hold a direction at speed and tap BRAKE. Keep holding to slide round, let go to straighten up. Long drifts top up your energy.', 'Tap the throttle the moment the five red lights go out for a perfect launch.', 'Brake in a straight line, then turn in: the racing line shows red where to brake.', 'Sit close behind a car on a straight to catch its slipstream.', 'The energy boost recharges fastest while braking.', 'Going beyond the kerbs invalidates the lap and slows you on grass or gravel.', 'Worn tyres lose grip: in longer races, request a pit stop with P or the PIT button.'][(Math.random() * 6) | 0];
  Sound.init(); lastCfg = cfg;
  setTimeout(() => { try { startRace(cfg); buildMinimap(); buildRacingLineMesh(); paused = false; tiltCal = null; show('hud'); hudSetup(); } catch (e) { console.error(e); toast('Could not start the race: ' + e.message, 'bad'); show('home'); } }, 60);
}
let lastCfg = null;
function showResults(res) {
  const R0 = R; show('results'); const P = R0.player;
  let html = '';
  if (res.tt) html = `<h2>Time trial · ${R0.def.name}</h2><p>Session best <b>${fmtLap(res.best)}</b> · Personal best <b>${fmtLap(res.pb)}</b></p><table class="tbl"><tbody>${res.laps.map((l, k) => `<tr><td>Lap ${k + 1}</td><td><b>${fmtLap(l.t)}</b></td><td class="dim">${l.sec.map(fmtLap).join(' · ')}</td><td>${l.clean ? '' : '<span class="bad">invalid</span>'}</td></tr>`).join('') || '<tr><td>No complete laps</td></tr>'}</tbody></table>`;
  else { const w = res.order[0];
    html = `<h2>${ordinal(res.pos)} place · ${R0.def.name}</h2><table class="tbl res"><thead><tr><th>#</th><th>Driver</th><th>Team</th><th>Best lap</th><th>Gap</th></tr></thead><tbody>${res.order.map(o => `<tr class="${o.isPlayer ? 'me' : ''}"><td>${o.pos}</td><td><i class="dot" style="background:${o.col}"></i>${esc(o.name)}</td><td class="dim">${esc(o.team)}</td><td>${fmtLap(o.best)}</td><td>${o.pos === 1 ? fmtLap(o.time) : o.time ? '+' + (o.time - w.time).toFixed(3) : o.laps < R0.laps - 1 ? `+${R0.laps - o.laps} laps` : 'running'}</td></tr>`).join('')}</tbody></table>`; }
  html += `<div class="rewards"><h3>Rewards</h3>${res.lines.length ? res.lines.map(([w, a]) => `<div class="rw"><span>${esc(w)}</span><b>${a ? '+◆ ' + fmtCoins(a) : ''}</b></div>`).join('') : '<p class="dim">No rewards this time.</p>'}<div class="rw total"><span>Total earned</span><b>+◆ ${fmtCoins(res.total)}</b></div><div class="rw"><span>New balance</span><b>◆ ${fmtCoins(profile.coins)}</b></div></div>`;
  const champ = res.champ; if (champ) { const tb = standings(champ.C.id); html += `<p>${champ.C.name}: you are <b>${ordinal(tb.findIndex(x => x.id === 'you') + 1)}</b> with ${champ.cs.points.you || 0} pts after round ${champ.cs.round} of ${champ.C.rounds.length}.${champ.cs.done ? ' <b>Season complete!</b>' : ''}</p>`; }
  $('resBody').innerHTML = html; $('resNext').textContent = champ ? 'Championship standings' : 'Race again';
  announce(res.tt ? 'Session over.' : `You finished ${ordinal(res.pos)}. Earned ${fmtCoins(res.total)} V-Coins.`);
  void P;
}
