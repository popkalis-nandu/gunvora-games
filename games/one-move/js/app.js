/* ONE MOVE – app: screens, canvas rendering, input, animation, sound, progress (localStorage). */
(function () {
  'use strict';
  var E = window.OMEngine, D = window.OMLevels, LV = D.levels, WORLDS = D.worlds;
  var $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var HINT_COST = 20, DAILY = 40;

  /* ---------- progress ---------- */
  var KEY = 'onemove.v1', S;
  function load() {
    var o = null; try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { o = null; }
    o = o && typeof o === 'object' ? o : {};
    if (typeof o.coins !== 'number') o.coins = 60;
    o.lv = o.lv || {}; o.theme = o.theme || 'sunny'; o.owned = o.owned || ['sunny'];
    if (o.sound === undefined) o.sound = true; if (o.vib === undefined) o.vib = true;
    o.daily = o.daily || ''; o.solved = o.solved || 0; o.hints = o.hints || 0;
    return o;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  S = load();
  function starsOf(id) { return (S.lv[id] && S.lv[id].s) || 0; }
  function isDone(id) { return !!S.lv[id]; }
  function unlocked(id) { return id === 1 || isDone(id - 1) || isDone(id); }
  function nextLevel() { for (var i = 0; i < LV.length; i++) if (!isDone(LV[i].id)) return LV[i].id; return LV.length; }
  function totalStars() { var t = 0; for (var k in S.lv) t += S.lv[k].s || 0; return t; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  /* ---------- themes ---------- */
  var THEMES = {
    sunny: { name: 'Sunny', price: 0, css: { bg1: '#fff4d6', bg2: '#ffd9a8', card: '#ffffff', ink: '#2b2d42', mute: '#6b6f86', acc: '#ff6b35', acc2: '#17b8a6', line: 'rgba(43,45,66,.12)' },
      c: { board: '#fffdf7', tile: '#fff4e0', tile2: '#ffeccc', wall: '#5d6b8e', wallTop: '#8394bb', sky1: '#bfe8ff', sky2: '#f2fbff', rock: '#9a7550', rockTop: '#7cc36b', ghost: '#ff6b35' } },
    mint: { name: 'Mint', price: 120, css: { bg1: '#e3fbf1', bg2: '#a8ecd2', card: '#ffffff', ink: '#163a33', mute: '#4f7a70', acc: '#0f9d76', acc2: '#3b82f6', line: 'rgba(22,58,51,.13)' },
      c: { board: '#f9fffc', tile: '#e9faf2', tile2: '#d8f4e7', wall: '#2f6f62', wallTop: '#4f9a89', sky1: '#c6f1ff', sky2: '#effffa', rock: '#7b6a55', rockTop: '#5dbb8a', ghost: '#0f9d76' } },
    night: { name: 'Night', price: 200, css: { bg1: '#1d2140', bg2: '#0c0f24', card: '#2a2f57', ink: '#f2f4ff', mute: '#a9b0d6', acc: '#ffb020', acc2: '#7c6cff', line: 'rgba(0,0,0,.35)' },
      c: { board: '#262b52', tile: '#313768', tile2: '#2b305c', wall: '#11142c', wallTop: '#4a518a', sky1: '#141836', sky2: '#2d3570', rock: '#5a4a6e', rockTop: '#7c6cff', ghost: '#ffb020' } },
    candy: { name: 'Candy', price: 300, css: { bg1: '#ffe6f3', bg2: '#d9c9ff', card: '#ffffff', ink: '#3a1d4a', mute: '#7b5f8e', acc: '#ff4f9a', acc2: '#7b5cff', line: 'rgba(58,29,74,.13)' },
      c: { board: '#fffafd', tile: '#ffeef7', tile2: '#fde0f0', wall: '#8a5cc4', wallTop: '#b28df0', sky1: '#ffd6ec', sky2: '#fff5fb', rock: '#c2789e', rockTop: '#ff9ccc', ghost: '#ff4f9a' } }
  };
  var P; // active palette (css + canvas)
  function applyTheme() {
    var th = THEMES[S.theme] || THEMES.sunny, r = document.documentElement.style;
    for (var k in th.css) r.setProperty('--' + k, th.css[k]);
    P = {}; for (k in th.css) P[k] = th.css[k]; for (k in th.c) P[k] = th.c[k];
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th.css.bg2;
  }
  applyTheme();

  /* ---------- sound & haptics (WebAudio synth, no files) ---------- */
  var AC = null;
  function ac() { if (!S.sound) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function tone(f, d, type, vol, delay, slide) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  var SFX = {
    tap: function () { tone(660, 0.06, 'triangle', 0.12); },
    pick: function () { tone(520, 0.08, 'triangle', 0.15, 0, 780); },
    place: function () { tone(300, 0.09, 'square', 0.08); tone(900, 0.05, 'triangle', 0.08, 0.03); },
    slide: function () { tone(180, 0.22, 'sawtooth', 0.05, 0, 90); },
    bounce: function (i) { tone(700 + (i || 0) * 90, 0.07, 'sine', 0.16); },
    pop: function () { tone(900, 0.07, 'square', 0.07, 0, 300); },
    thud: function () { tone(110, 0.2, 'sine', 0.3, 0, 50); },
    step: function () { tone(240, 0.03, 'triangle', 0.05); },
    splash: function () { tone(400, 0.25, 'sine', 0.1, 0, 120); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, i * 0.09); }); tone(1568, 0.4, 'sine', 0.08, 0.36); },
    fail: function () { tone(330, 0.18, 'sawtooth', 0.08, 0, 250); tone(220, 0.3, 'sawtooth', 0.08, 0.16, 140); },
    coin: function () { tone(988, 0.07, 'square', 0.06); tone(1319, 0.16, 'square', 0.06, 0.07); },
    no: function () { tone(160, 0.12, 'square', 0.06); }
  };
  function sfx(n, a) { if (S.sound && SFX[n]) try { SFX[n](a); } catch (e) {} }
  function buzz(p) { if (S.vib && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

  /* ---------- UI helpers ---------- */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
  function refreshCoins(bump) { $$('.coinAmt').forEach(function (e) { e.textContent = S.coins; }); if (bump) $$('.coins').forEach(function (e) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }); }
  var screen = 'home';
  function show(name) {
    screen = name;
    ['Home', 'Map', 'Game'].forEach(function (n) { $('#scr' + n).classList.toggle('on', n.toLowerCase() === name); });
    if (name === 'home') renderHome();
    if (name === 'map') renderMap();
    if (name === 'game') resize();
    refreshCoins();
  }
  var TYPE = {
    m: { icon: '🔥', name: 'Matchsticks', prompt: 'Move ONE matchstick to make the equation true.' },
    b: { icon: '📦', name: 'Slide', prompt: 'Slide ONE crate to open a path to the exit.' },
    r: { icon: '🎯', name: 'Bounce', prompt: 'Turn or move ONE mirror so the ball hits the target.' },
    s: { icon: '🧗', name: 'Rescue', prompt: 'Remove ONE plank. Then the explorer walks (▶) – get him home safely.' }
  };

  /* ---------- home & map ---------- */
  function renderHome() {
    var n = nextLevel(), all = LV.every(function (l) { return isDone(l.id); });
    $('#lvTotal').textContent = LV.length;
    $('#contTitle').textContent = isDone(1) ? '▶ Continue' : '▶ Play';
    $('#contSub').textContent = all ? 'All ' + LV.length + ' solved – replay any level' : 'Level ' + n + ' · ' + TYPE[LV[n - 1].t].name;
    $('#starSum').textContent = totalStars() + ' / ' + LV.length * 3 + ' ★';
    var got = S.daily === today();
    $('#btnDaily').disabled = got; $('#dailySub').textContent = got ? 'Collected today – come back tomorrow' : '+' + DAILY + ' coins, once a day';
  }
  function renderMap() {
    var box = $('#mapList'), h = '', cur = nextLevel();
    WORLDS.forEach(function (w, wi) {
      var st = 0, done = 0, n = w.to - w.from + 1;
      for (var id = w.from; id <= w.to; id++) { st += starsOf(id); if (isDone(id)) done++; }
      h += '<div class="world"><div class="whead"><span class="wi">' + w.icon + '</span><div style="flex:1"><b>World ' + (wi + 1) + ' · ' + w.name + '</b><small>' + done + '/' + n + ' solved · ' + st + '/' + n * 3 + ' ★</small><div class="wbar"><i style="width:' + Math.round(done / n * 100) + '%"></i></div></div></div><div class="lgrid">';
      for (id = w.from; id <= w.to; id++) {
        var l = LV[id - 1], s = starsOf(id), un = unlocked(id), cls = 'lvl' + (isDone(id) ? ' done' : '') + (id === cur && !isDone(id) ? ' cur' : '') + (un ? '' : ' lock');
        h += '<button class="' + cls + '" data-lv="' + id + '" aria-label="Level ' + id + (un ? '' : ' locked') + '"><span class="ty">' + TYPE[l.t].icon + '</span>' + (un ? id : '🔒') +
          '<span class="st">' + (isDone(id) ? '<b>' + '★★★'.slice(0, s) + '</b>' + '★★★'.slice(s) : '') + '</span></button>';
      }
      h += '</div></div>';
    });
    box.innerHTML = h;
    var c = box.querySelector('.lvl.cur') || box.querySelector('[data-lv="' + Math.min(cur, LV.length) + '"]');
    if (c) setTimeout(function () { c.scrollIntoView({ block: 'center' }); }, 30);
  }
  $('#mapList').addEventListener('click', function (e) {
    var b = e.target.closest('.lvl'); if (!b) return;
    var id = +b.dataset.lv;
    if (!unlocked(id)) { sfx('no'); toast('Solve level ' + (id - 1) + ' to unlock this one'); return; }
    sfx('tap'); openLevel(id);
  });

  /* ---------- modals ---------- */
  function modal(html) { $('#mBody').innerHTML = html; $('#ovModal').hidden = false; }
  function closeModal() { $('#ovModal').hidden = true; }
  function howto() {
    modal('<h2>How to play</h2><p>Every level is a small puzzle and you get exactly <b>one move</b>. Make it count – if it does not work, tap Retry and think again.</p><div class="how">' +
      '<div><span class="e">🔥</span><span><b>Matchsticks</b><small>Tap a matchstick, then tap an empty dashed spot (or drag it there). The equation must be true. The = sign stays put.</small></span></div>' +
      '<div><span class="e">📦</span><span><b>Slide</b><small>Swipe a crate, or tap it and then an arrow. Crates slide until they hit something. A crate pushed into water sinks and makes a bridge.</small></span></div>' +
      '<div><span class="e">🎯</span><span><b>Bounce</b><small>Tap a mirror and press ⟳ to turn it. Mirrors with a grip (no pin) can also be dragged to an empty square. Grey bolted mirrors never move.</small></span></div>' +
      '<div><span class="e">🧗</span><span><b>Rescue</b><small>Tap one wooden plank and press Remove. Boulders drop when nothing holds them – they fill spike pits and squash monsters, but they must not land on the explorer.</small></span></div>' +
      '</div><p>⭐⭐⭐ first try, no hint · ⭐⭐ solved without a hint · ⭐ solved with a hint.</p><p>Hints cost ' + HINT_COST + ' coins. Earn coins by solving levels and from the daily bonus. Coins have no cash value.</p>');
  }
  function shop() {
    var h = '<h2>Themes</h2><p>Colour themes for the whole game, paid with coins you earn. Coins have no cash value – no real money here.</p><div class="themes">';
    for (var k in THEMES) {
      var t = THEMES[k], own = S.owned.indexOf(k) >= 0, on = S.theme === k;
      h += '<div class="th"><div class="sw" style="background:linear-gradient(135deg,' + t.css.bg1 + ',' + t.css.bg2 + ')"><i style="background:' + t.css.acc + '"></i><i style="background:' + t.css.acc2 + '"></i><i style="background:' + t.c.wall + '"></i></div><b>' + t.name + '</b>' +
        (on ? '<button disabled>✓ In use</button>' : own ? '<button class="use" data-theme="' + k + '">Use</button>' : '<button data-buy="' + k + '"><span class="coin"></span> ' + t.price + '</button>') + '</div>';
    }
    modal(h + '</div><p style="margin-top:12px">You have <b>' + S.coins + '</b> coins.</p>');
  }
  function settings() {
    modal('<h2>Settings</h2><div class="set">Sound<button class="tog' + (S.sound ? ' on' : '') + '" data-tog="sound" aria-label="Sound"></button></div>' +
      '<div class="set">Vibration<button class="tog' + (S.vib ? ' on' : '') + '" data-tog="vib" aria-label="Vibration"></button></div>' +
      '<p>Progress is saved on this phone only. No account, no ads, no tracking – nothing is sent anywhere.</p><p>Coins are game points with no cash value.</p><p>Presented by BALA HR.</p>' +
      '<button class="danger" data-act="reset">Reset all progress</button>');
  }
  $('#ovModal').addEventListener('click', function (e) {
    if (e.target.id === 'ovModal') return closeModal();
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tog) { S[b.dataset.tog] = !S[b.dataset.tog]; save(); b.classList.toggle('on', S[b.dataset.tog]); sfx('tap'); if (b.dataset.tog === 'vib') buzz(30); return; }
    if (b.dataset.theme) { S.theme = b.dataset.theme; save(); applyTheme(); sfx('tap'); shop(); return; }
    if (b.dataset.buy) {
      var t = THEMES[b.dataset.buy];
      if (S.coins < t.price) { sfx('no'); toast('Not enough coins yet – solve more levels!'); return; }
      S.coins -= t.price; S.owned.push(b.dataset.buy); S.theme = b.dataset.buy; save(); applyTheme(); refreshCoins(true); sfx('coin'); toast(t.name + ' theme unlocked!'); shop(); return;
    }
    if (b.dataset.act === 'reset') { modal('<h2>Reset progress?</h2><p>This clears every star, coin and theme on this phone. It cannot be undone.</p><div class="mbtns"><button data-act="closeModal">Cancel</button><button class="primary" data-act="reset2">Reset</button></div>'); return; }
    if (b.dataset.act === 'reset2') { try { localStorage.removeItem(KEY); } catch (er) {} S = load(); save(); applyTheme(); closeModal(); show('home'); toast('Progress reset'); return; }
    if (b.dataset.act === 'buyHint') { closeModal(); useHint(); return; }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.closest('#ovModal .mcard') && ['closeModal'].indexOf(b.dataset.act) < 0) return;
    var a = b.dataset.act;
    if (a === 'closeModal') { closeModal(); return; }
    sfx('tap');
    if (a === 'home') show('home');
    else if (a === 'map') { leaveGame(); show('map'); }
    else if (a === 'continue') openLevel(nextLevel());
    else if (a === 'shop') shop();
    else if (a === 'settings') settings();
    else if (a === 'howto') howto();
    else if (a === 'daily') {
      if (S.daily === today()) { toast('Already collected today'); return; }
      S.daily = today(); S.coins += DAILY; save(); refreshCoins(true); sfx('coin'); buzz(30); toast('+' + DAILY + ' coins! See you tomorrow.'); renderHome();
    }
  });

  /* ---------- game state ---------- */
  var cv = $('#cv'), cx = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
  var G = null, FAST = 1, fx = [];
  function now() { return performance.now(); }
  function openLevel(id) {
    id = Math.max(1, Math.min(LV.length, id));
    var lv = LV[id - 1];
    G = { id: id, lv: lv, t: lv.t, st0: E.parse(lv), attempts: 0, hint: 0, hintUsed: false, t0: now(), sols: E.solutions(lv) };
    resetBoard();
    $('#gTitle').textContent = 'Level ' + id;
    $('#gType').textContent = TYPE[lv.t].icon + ' ' + TYPE[lv.t].name;
    $('#gPrompt').textContent = TYPE[lv.t].prompt;
    var tip = $('#gTip'); tip.hidden = !lv.tip; tip.textContent = lv.tip || '';
    $('#ovResult').hidden = true;
    show('game'); updateHintBtn();
  }
  function resetBoard() {
    G.st = G.st0; G.mode = 'idle'; G.sel = null; G.drag = null; G.anim = null; G.res = null; G.moveDone = null; G.view = null; fx = [];
    setMsg('');
    layout();
  }
  function leaveGame() { if (G) G.mode = 'gone'; $('#ovResult').hidden = true; }
  function setMsg(t) { $('#gMsg').textContent = t || ''; }
  function updateHintBtn() { if (!G) return; var b = $('#bHint'); b.querySelector('span').textContent = G.hint >= 2 ? 'Hint shown' : G.hint === 1 ? 'Show move' : 'Hint'; b.disabled = G.hint >= 2; }

  /* ---------- canvas sizing & layout ---------- */
  function resize() {
    var r = $('#stage').getBoundingClientRect(); DPR = Math.min(window.devicePixelRatio || 1, 3);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    layout();
  }
  if (window.ResizeObserver) new ResizeObserver(function () { if (screen === 'game') resize(); }).observe($('#stage'));
  window.addEventListener('resize', function () { if (screen === 'game') resize(); });
  function layout() {
    if (!G) return;
    var L = {};
    if (G.t === 'm') {
      var pos = G.st.pos, units = 0, gap = 0.42;
      pos.forEach(function (p, i) { units += p.k === 'e' ? 0.9 : 1; if (i) units += gap; });
      var s = Math.min((W * 0.9) / (units + 0.4), (H * 0.62) / 2.3, 96);
      L.L = s; L.xs = []; var x = (W - units * s) / 2;
      pos.forEach(function (p, i) { if (i) x += gap * s; L.xs.push(x); x += (p.k === 'e' ? 0.9 : 1) * s; });
      L.y = (H - 2 * s) / 2 - s * 0.1;
    } else {
      var g = G.t === 's' ? G.st.g : G.st.g, gw = g[0].length, gh = g.length;
      var pad = G.t === 's' ? 0.3 : 0.9;
      L.cs = Math.min(W / (gw + pad), (H - 26) / (gh + pad), 92);
      L.gw = gw; L.gh = gh; L.ox = (W - gw * L.cs) / 2; L.oy = (H - 22 - gh * L.cs) / 2;
    }
    G.L = L;
  }
  function cellC(x, y) { return { x: G.L.ox + (x + 0.5) * G.L.cs, y: G.L.oy + (y + 0.5) * G.L.cs }; }
  function cellAt(px, py) { var L = G.L, x = Math.floor((px - L.ox) / L.cs), y = Math.floor((py - L.oy) / L.cs); return (x < 0 || y < 0 || x >= L.gw || y >= L.gh) ? null : { x: x, y: y }; }

  /* ---------- matchstick geometry ---------- */
  var DSEG = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 1, 2], [0, 2, 1, 2], [0, 1, 0, 2], [0, 0, 0, 1], [0, 1, 1, 1]];
  var OSEG = [[0.08, 1, 0.92, 1], [0.5, 0.58, 0.5, 1.42], [0.2, 0.62, 0.8, 1.38], [0.2, 1.38, 0.8, 0.62]];
  var ESEG = [[0.05, 0.76, 0.85, 0.76], [0.05, 1.24, 0.85, 1.24]];
  function segPts(pi, s) {
    var L = G.L, p = G.st.pos[pi], x0 = L.xs[pi], y0 = L.y, a;
    if (p.k === 'd') { a = DSEG[s].slice(); var ins = 0.09; if (a[0] === a[2]) { a[1] += ins; a[3] -= ins; } else { a[0] += ins; a[2] -= ins; } }
    else if (p.k === 'o') a = OSEG[s]; else a = ESEG[s];
    return { x1: x0 + a[0] * L.L, y1: y0 + a[1] * L.L, x2: x0 + a[2] * L.L, y2: y0 + a[3] * L.L };
  }
  function segMid(pi, s) { var q = segPts(pi, s); return { x: (q.x1 + q.x2) / 2, y: (q.y1 + q.y2) / 2 }; }
  function distSeg(px, py, q) {
    var dx = q.x2 - q.x1, dy = q.y2 - q.y1, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((px - q.x1) * dx + (py - q.y1) * dy) / l2)) : 0;
    var x = q.x1 + t * dx - px, y = q.y1 + t * dy - py; return Math.sqrt(x * x + y * y);
  }
  function mHit(px, py, filled) { // nearest stick (filled) or empty slot
    var best = null, bd = Math.max(G.L.L * 0.32, 16);
    G.st.pos.forEach(function (p, i) {
      if (p.k === 'e') return;
      for (var s = 0; s < p.n; s++) {
        var has = !!(p.m & (1 << s)); if (has !== filled) continue;
        var d = distSeg(px, py, segPts(i, s)); if (d < bd) { bd = d; best = { p: i, s: s }; }
      }
    });
    return best;
  }

  /* ---------- input ---------- */
  function ptr(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener('pointerdown', function (e) {
    if (!G || G.mode === 'anim' || G.mode === 'done') return;
    ac(); var p = ptr(e); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    G.drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, on: false, target: pressTarget(p) };
  });
  cv.addEventListener('pointermove', function (e) {
    if (!G || !G.drag) return; var p = ptr(e), d = G.drag; d.x = p.x; d.y = p.y;
    if (!d.on && Math.hypot(p.x - d.x0, p.y - d.y0) > 10 && d.target && d.target.drag) { d.on = true; if (G.t !== 'b') sfx('pick'); }
    if (d.on && G.t === 'b') { // swipe a crate
      var dx = p.x - d.x0, dy = p.y - d.y0;
      if (Math.hypot(dx, dy) > G.L.cs * 0.35) { var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); G.drag = null; tryMove({ t: 'b', x: d.target.x, y: d.target.y, d: dir }, true); }
    }
  });
  cv.addEventListener('pointerup', function (e) { if (!G || !G.drag) return; var d = G.drag; G.drag = null; var p = ptr(e); if (d.on) dropDrag(d, p); else tap(p); });
  cv.addEventListener('pointercancel', function () { if (G) G.drag = null; });
  function pressTarget(p) {
    if (G.t === 'm') { var h = mHit(p.x, p.y, true); return h ? { kind: 'stick', p: h.p, s: h.s, drag: true } : null; }
    var c = cellAt(p.x, p.y); if (!c) return null; var ch = G.st.g[c.y][c.x];
    if (G.t === 'b' && ch === 'B') return { kind: 'crate', x: c.x, y: c.y, drag: true };
    if (G.t === 'r' && E.MIR[ch] && E.MIR[ch][1] === 'free') return { kind: 'mirror', x: c.x, y: c.y, drag: true };
    return null;
  }
  function dropDrag(d, p) {
    var t = d.target;
    if (G.t === 'm') { var h = mHit(p.x, p.y, false); if (h) return tryMove({ t: 'm', fp: t.p, fs: t.s, tp: h.p, ts: h.s }); G.sel = { p: t.p, s: t.s }; return; }
    if (G.t === 'r') { var c = cellAt(p.x, p.y); if (c && G.st.g[c.y][c.x] === '.') return tryMove({ t: 'r', x: t.x, y: t.y, op: 'move', tx: c.x, ty: c.y }); sfx('no'); G.sel = null; }
  }
  // geometry of the "action" buttons shown for a selected piece (shared by drawing, hit tests & the test hook)
  function bubbleFor(sel) {
    var c = cellC(sel.x, sel.y), cs = G.L.cs;
    if (G.t === 'r') { var bx = c.x + cs * 0.5, by = c.y - cs * 0.5; if (sel.y === 0) by = c.y + cs * 0.5; if (sel.x === G.L.gw - 1) bx = c.x - cs * 0.5; return { x: bx, y: by, r: Math.max(cs * 0.3, 20) }; }
    if (G.t === 's') { var y = sel.y <= 1 ? c.y + cs * 0.85 : c.y - cs * 0.85; return { x: Math.max(cs * 0.9, Math.min(W - cs * 0.9, c.x)), y: y, w: Math.max(cs * 1.6, 96), h: Math.max(cs * 0.5, 36) }; }
    return null;
  }
  function arrowFor(sel, d) { var c = cellC(sel.x, sel.y), v = E.DIRS[d]; return { x: c.x + v[0] * G.L.cs * 0.98, y: c.y + v[1] * G.L.cs * 0.98, r: Math.max(G.L.cs * 0.36, 20) }; }
  function legal() { return E.moves(G.st); }
  function tap(p) {
    var t = G.t, sel = G.sel;
    if (t === 'm') {
      if (sel) { var em = mHit(p.x, p.y, false); if (em) return tryMove({ t: 'm', fp: sel.p, fs: sel.s, tp: em.p, ts: em.s }); }
      var h = mHit(p.x, p.y, true);
      if (h) { if (sel && sel.p === h.p && sel.s === h.s) { G.sel = null; sfx('tap'); } else { G.sel = h; sfx('pick'); buzz(12); } return; }
      if (G.st.pos.some(function (q, i) { return q.k === 'e' && Math.abs(p.x - (G.L.xs[i] + G.L.L * 0.45)) < G.L.L * 0.5; })) { setMsg('The = sign stays where it is.'); }
      G.sel = null; return;
    }
    if (t === 'b') {
      if (sel) { var ds = ['u', 'r', 'd', 'l']; for (var i = 0; i < ds.length; i++) { var a = arrowFor(sel, ds[i]); if (sel.dirs.indexOf(ds[i]) >= 0 && Math.hypot(p.x - a.x, p.y - a.y) < a.r) return tryMove({ t: 'b', x: sel.x, y: sel.y, d: ds[i] }); } }
      var c = cellAt(p.x, p.y);
      if (c && G.st.g[c.y][c.x] === 'B') {
        var dirs = legal().filter(function (m) { return m.x === c.x && m.y === c.y; }).map(function (m) { return m.d; });
        if (!dirs.length) { sfx('no'); setMsg('That crate is stuck – it can\'t slide anywhere.'); G.sel = null; return; }
        G.sel = { x: c.x, y: c.y, dirs: dirs }; sfx('pick'); buzz(12); return;
      }
      G.sel = null; return;
    }
    if (t === 'r') {
      if (sel) {
        var bb = bubbleFor(sel); if (Math.hypot(p.x - bb.x, p.y - bb.y) < bb.r * 1.15) return tryMove({ t: 'r', x: sel.x, y: sel.y, op: 'turn' });
        var c2 = cellAt(p.x, p.y);
        if (c2 && sel.free && G.st.g[c2.y][c2.x] === '.') return tryMove({ t: 'r', x: sel.x, y: sel.y, op: 'move', tx: c2.x, ty: c2.y });
      }
      var c3 = cellAt(p.x, p.y);
      if (c3) {
        var ch = G.st.g[c3.y][c3.x];
        if (E.MIR[ch]) {
          if (E.MIR[ch][1] === 'fixed') { sfx('no'); setMsg('Grey mirrors are bolted down.'); G.sel = null; return; }
          if (sel && sel.x === c3.x && sel.y === c3.y) { G.sel = null; return; }
          G.sel = { x: c3.x, y: c3.y, free: E.MIR[ch][1] === 'free' }; sfx('pick'); buzz(12);
          setMsg(G.sel.free ? 'Press ⟳ to turn it, or tap an empty square to move it.' : 'Press ⟳ to turn it. (Pinned – it can\'t move.)'); return;
        }
      }
      G.sel = null; setMsg(''); return;
    }
    if (t === 's') {
      if (sel) { var b = bubbleFor(sel); if (Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2 + 4) return tryMove({ t: 's', x: sel.x, y: sel.y }); }
      var c4 = cellAt(p.x, p.y);
      if (c4 && G.st.g[c4.y][c4.x] === 'w') { if (sel && sel.x === c4.x && sel.y === c4.y) return tryMove({ t: 's', x: c4.x, y: c4.y }); G.sel = { x: c4.x, y: c4.y }; sfx('pick'); buzz(12); setMsg('Press Remove (or tap the plank again).'); return; }
      G.sel = null; setMsg(''); return;
    }
  }

  /* ---------- the ONE move: validate with the engine, animate, then judge ---------- */
  function tryMove(mv, quiet) {
    if (!G || G.mode === 'anim' || G.mode === 'done') return false;
    var ok = legal().some(function (m) { return E.key(m) === E.key(mv); });
    if (!ok) { sfx('no'); if (!quiet || G.t === 'b') setMsg(G.t === 'b' ? 'That crate can\'t slide that way.' : 'That isn\'t a possible move.'); G.sel = null; return false; }
    var next = E.apply(G.st, mv); if (!next) return false;
    var res = E.check(next);
    G.mode = 'anim'; G.sel = null; G.attempts++; G.moveDone = mv; setMsg('');
    G.anim = { mv: mv, from: G.st, to: next, res: res, t0: now(), phase: 0 };
    G.res = res;
    startAnim();
    return true;
  }
  function dur(ms) { return ms * FAST; }
  // per-type animation timelines: returns total time; finish() is called after
  function startAnim() {
    var A = G.anim, t = G.t;
    A.steps = [];
    if (t === 'm') { sfx('pick'); A.steps.push({ d: 460, end: function () { G.st = A.to; sfx('place'); buzz(15); } }, { d: 260 }); }
    if (t === 'b') {
      var sl = A.to.slide, n = Math.abs(sl.x1 - sl.x0) + Math.abs(sl.y1 - sl.y0); sfx('slide');
      A.steps.push({ d: 90 + n * 85, end: function () { G.st = A.to; if (sl.sink) { sfx('splash'); burst(cellC(sl.x1, sl.y1), '#4cc9f0', 14); } else sfx('thud'); } });
      if (A.res.ok) A.steps.push({ d: 120 }, { d: A.res.path.length * 140, kind: 'walk' }); else A.steps.push({ d: 520, kind: 'shrug' });
    }
    if (t === 'r') {
      sfx('place');
      A.steps.push({ d: 260, end: function () { G.st = A.to; } });
      var len = 0, pth = A.res.path; for (var i = 1; i < pth.length; i++) len += Math.hypot(pth[i].x - pth[i - 1].x, pth[i].y - pth[i - 1].y);
      A.ballLen = len; A.steps.push({ d: 120 }, { d: Math.max(500, len * 105), kind: 'ball' }, { d: 380, kind: 'ballEnd' });
    }
    if (t === 's') {
      sfx('pop'); A.steps.push({ d: 300, end: function () { G.st = A.to; burst(cellC(A.mv.x, A.mv.y), '#c98a4b', 16); } });
      var fr = A.res.frames, per = Math.max(85, Math.min(240, 6500 / fr.length));
      for (var k = 1; k < fr.length; k++) A.steps.push({ d: fr[k].falls.length ? Math.max(per, 340) : fr[k].ev === 'drop' ? per * 0.7 : per, kind: 'tick', k: k });
      A.steps.push({ d: 420, kind: 'sEnd' });
    }
    A.i = 0; A.st0 = now();
  }
  function stepAnim() {
    var A = G.anim; if (!A || G.mode !== 'anim') return;
    var tnow = now();
    while (A.i < A.steps.length) {
      var s = A.steps[A.i], el = tnow - A.st0;
      if (el < dur(s.d)) { A.p = el / dur(s.d); return; }
      A.st0 += dur(s.d); if (s.end) s.end(); stepEvents(s); A.i++;
    }
    finish();
  }
  function stepEvents(s) { // sound/fx at the end of a timeline step
    var A = G.anim;
    if (s.kind === 'tick') { var f = A.res.frames[s.k]; if (f.falls.length) { sfx('thud'); buzz(25); f.falls.forEach(function (q) { if (q.end === 'squash' || q.end === 'fill') burst(cellC(q.x, Math.min(q.y1, G.L.gh - 1)), '#a0a0a0', 12); }); } else if (f.ev === 'walk') sfx('step'); }
  }
  function finish() {
    var A = G.anim; G.mode = 'done'; G.anim = null;
    if (G.t === 's') G.view = A.res.frames[A.res.frames.length - 1];
    if (G.t === 'b' && A.res.ok) G.heroAt = A.res.path[A.res.path.length - 1];
    var ok = A.res.ok;
    setTimeout(function () { if (G && G.mode === 'done') result(ok, A); }, dur(ok ? 380 : 280));
    if (ok) { sfx('win'); buzz([30, 40, 70]); confetti(); } else { sfx('fail'); buzz(90); }
  }
  function failText(A) {
    var r = A.res;
    if (G.t === 'm') { var tx = (r.text || '').replace(/x/g, '×').replace(/-/g, '−'); return r.why === 'shape' ? 'That makes a shape that isn\'t a proper equation.' : '<b>' + tx + '</b> isn\'t true.'; }
    if (G.t === 'b') return 'The path to the exit is still blocked.';
    if (G.t === 'r') return { out: 'The ball rolled off the board.', wall: 'The ball hit a wall.', loop: 'The ball is going round in circles.' }[r.why] || 'The ball missed the target.';
    return { crush: 'A boulder landed on the explorer!', spike: 'Ouch – spikes!', monster: 'The monster got him!', fall: 'He fell off the edge!', stuck: 'He\'s stuck walking back and forth.' }[r.why] || 'Not safe yet.';
  }
  function result(ok, A) {
    var card = $('#rCard'), id = G.id;
    card.classList.toggle('fail', !ok);
    var btns = '';
    if (ok) {
      var stars = G.hintUsed ? 1 : G.attempts === 1 ? 3 : 2, prev = S.lv[id], earned = 0, secs = Math.round((now() - G.t0) / 1000);
      if (!prev) { earned = 4 + stars * 2; S.solved++; } else if (stars > prev.s) earned = (stars - prev.s) * 3;
      S.lv[id] = { s: Math.max(stars, prev ? prev.s : 0), t: prev && prev.t ? Math.min(prev.t, secs) : secs };
      S.coins += earned; save(); refreshCoins(earned > 0);
      $('#rTitle').textContent = stars === 3 ? 'Brilliant!' : stars === 2 ? 'Solved!' : 'Got it!';
      var ii = $$('#rStars i'); ii.forEach(function (e) { e.classList.remove('on'); });
      ii.forEach(function (e, k) { if (k < stars) setTimeout(function () { e.classList.add('on'); sfx('bounce', k); }, 250 + k * 220 * FAST); });
      $('#rSub').innerHTML = 'Solved in <b>' + secs + ' s</b>' + (G.attempts > 1 ? ' · ' + G.attempts + ' tries' : ' · first try') + (G.hintUsed ? ' · hint used' : '') + (earned ? '<br><span class="coin"></span> <b>+' + earned + '</b> coins' : '');
      if (earned) setTimeout(function () { sfx('coin'); }, 900 * FAST);
      btns = (id < LV.length ? '<button class="rb primary" data-r="next">Next level ▶</button>' : '<button class="rb primary" data-r="map">🏆 All done – back to levels</button>') + '<button class="rb" data-r="retry">↺ Replay</button><button class="rb" data-r="map">🗺️ Levels</button>';
    } else {
      $('#rTitle').textContent = 'Not quite!';
      $('#rSub').innerHTML = failText(A) + '<br>You only get one move – try a different one.';
      btns = '<button class="rb primary" data-r="retry">↺ Retry</button>' + (G.hint < 2 ? '<button class="rb" data-r="hint">💡 Hint</button>' : '') + '<button class="rb" data-r="map">🗺️ Levels</button>';
    }
    $('#rBtns').innerHTML = btns;
    $('#ovResult').hidden = false;
  }
  $('#rBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]'); if (!b) return; var r = b.dataset.r; sfx('tap');
    $('#ovResult').hidden = true;
    if (r === 'retry') retry();
    else if (r === 'next') openLevel(G.id + 1);
    else if (r === 'map') { leaveGame(); show('map'); }
    else if (r === 'hint') { retry(); askHint(); }
  });
  function retry() { if (!G) return; var a = G.attempts, h = G.hint, hu = G.hintUsed; resetBoard(); G.attempts = a; G.hint = h; G.hintUsed = hu; if (isDone(G.id) && G.mode === 'idle' && a === 0) G.t0 = now(); updateHintBtn(); }
  $('#bRetry').addEventListener('click', function () { if (!G || G.mode === 'anim') return; sfx('tap'); $('#ovResult').hidden = true; if (G.mode === 'done' || G.sel) retry(); else setMsg('Nothing moved yet – take your one move!'); });
  $('#bHint').addEventListener('click', function () { if (!G || G.mode === 'anim') return; sfx('tap'); askHint(); });
  function askHint() {
    if (G.hint >= 2) return;
    if (G.mode === 'done') retry();
    if (S.coins < HINT_COST) { modal('<h2>Not enough coins</h2><p>A hint costs ' + HINT_COST + ' coins and you have ' + S.coins + '.</p><p>Earn coins by solving levels (up to 10 each) and collect the free daily bonus on the home screen. Coins have no cash value.</p><div class="mbtns"><button data-act="closeModal">OK</button></div>'); return; }
    modal('<h2>' + (G.hint ? 'Show the move?' : 'Use a hint?') + '</h2><p>' + (G.hint ? 'Shows exactly where it goes.' : 'Highlights the piece to move.') + '</p><p>Costs <b>' + HINT_COST + '</b> coins (you have ' + S.coins + '). A level solved with a hint earns 1 star.</p><div class="mbtns"><button data-act="closeModal">Cancel</button><button class="primary" data-act="buyHint">💡 Use hint</button></div>');
  }
  function useHint() {
    if (!G || S.coins < HINT_COST || G.hint >= 2) return;
    S.coins -= HINT_COST; S.hints++; G.hint++; G.hintUsed = true; save(); refreshCoins(true); sfx('coin'); updateHintBtn();
    setMsg(G.hint === 1 ? 'Hint: the glowing piece is the one to move.' : 'Hint: do exactly what the arrow shows.');
  }

  /* ---------- effects ---------- */
  function burst(c, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = 1.5 + Math.random() * 3.5; fx.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: 1, c: col, s: 2 + Math.random() * 4 }); } }
  function confetti() { var cols = [P.acc, P.acc2, '#ffd166', '#ef476f', '#06d6a0', '#118ab2']; for (var i = 0; i < 90; i++) fx.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45, vx: (Math.random() - 0.5) * 12, vy: -4 - Math.random() * 9, l: 1.6, c: cols[i % cols.length], s: 4 + Math.random() * 5, rot: Math.random() * 6, conf: 1 }); }
  function drawFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.vy += 0.32 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.l -= 0.018 * dt; if (f.conf) { f.vx *= 0.985; f.rot += 0.2 * dt; }
      if (f.l <= 0 || f.y > H + 20) { fx.splice(i, 1); continue; }
      cx.globalAlpha = Math.min(1, f.l); cx.fillStyle = f.c;
      if (f.conf) { cx.save(); cx.translate(f.x, f.y); cx.rotate(f.rot); cx.fillRect(-f.s / 2, -f.s / 4, f.s, f.s / 2); cx.restore(); }
      else { cx.beginPath(); cx.arc(f.x, f.y, f.s, 0, 6.283); cx.fill(); }
    }
    cx.globalAlpha = 1;
  }

  /* ---------- drawing helpers ---------- */
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function pulse() { return 0.5 + 0.5 * Math.sin(now() / 220); }
  function drawHero(x, y, s, dir, mood) { // round little explorer
    cx.save(); cx.translate(x, y);
    var bob = mood === 'walk' ? Math.sin(now() / 70) * s * 0.03 : 0;
    cx.translate(0, bob);
    if (mood === 'flat') cx.scale(1.35, 0.35);
    cx.fillStyle = 'rgba(0,0,0,.15)'; cx.beginPath(); cx.ellipse(0, s * 0.42, s * 0.3, s * 0.07, 0, 0, 6.283); cx.fill();
    cx.fillStyle = '#3a86ff'; rr(-s * 0.24, s * 0.02, s * 0.48, s * 0.36, s * 0.12); cx.fill();
    cx.fillStyle = '#ffd6a5'; cx.beginPath(); cx.arc(0, -s * 0.12, s * 0.24, 0, 6.283); cx.fill();
    cx.fillStyle = '#8d5524'; cx.beginPath(); cx.ellipse(0, -s * 0.3, s * 0.32, s * 0.07, 0, 0, 6.283); cx.fill(); rr(-s * 0.17, -s * 0.48, s * 0.34, s * 0.18, s * 0.06); cx.fill();
    cx.fillStyle = '#e63946'; cx.fillRect(-s * 0.17, -s * 0.36, s * 0.34, s * 0.05);
    var ex = (dir || 1) * s * 0.07;
    cx.fillStyle = '#222'; cx.beginPath(); cx.arc(ex - s * 0.07, -s * 0.12, s * 0.035, 0, 6.283); cx.arc(ex + s * 0.08, -s * 0.12, s * 0.035, 0, 6.283); cx.fill();
    cx.strokeStyle = '#222'; cx.lineWidth = Math.max(1, s * 0.025); cx.beginPath();
    if (mood === 'sad') cx.arc(ex, s * 0.0, s * 0.06, 3.6, 5.8); else cx.arc(ex, -s * 0.06, s * 0.07, 0.3, 2.8); cx.stroke();
    cx.restore();
  }

  /* ---------- MATCHSTICK draw ---------- */
  function drawStick(q, L, lift, col) {
    var w = Math.max(5, L * 0.15);
    cx.save(); cx.lineCap = 'round';
    if (lift) { cx.shadowColor = 'rgba(0,0,0,.28)'; cx.shadowBlur = 12; cx.shadowOffsetY = 6; }
    cx.strokeStyle = col || '#d9a95a'; cx.lineWidth = w; cx.beginPath(); cx.moveTo(q.x1, q.y1); cx.lineTo(q.x2, q.y2); cx.stroke();
    cx.shadowColor = 'transparent';
    cx.strokeStyle = 'rgba(255,255,255,.45)'; cx.lineWidth = w * 0.3; cx.beginPath(); cx.moveTo(q.x1 + (q.x2 - q.x1) * 0.08, q.y1 + (q.y2 - q.y1) * 0.08); cx.lineTo(q.x2 - (q.x2 - q.x1) * 0.2, q.y2 - (q.y2 - q.y1) * 0.2); cx.stroke();
    cx.fillStyle = '#e63946'; cx.beginPath(); cx.ellipse(q.x2, q.y2, w * 0.78, w * 0.78, 0, 0, 6.283); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.arc(q.x2 - w * 0.22, q.y2 - w * 0.25, w * 0.22, 0, 6.283); cx.fill();
    cx.restore();
  }
  function drawGhost(q, L, strong) {
    cx.save(); cx.lineCap = 'round'; cx.setLineDash([L * 0.09, L * 0.1]);
    cx.strokeStyle = P.ghost; cx.globalAlpha = strong ? 0.55 + 0.3 * pulse() : 0.13; cx.lineWidth = Math.max(3, L * (strong ? 0.12 : 0.08));
    cx.beginPath(); cx.moveTo(q.x1, q.y1); cx.lineTo(q.x2, q.y2); cx.stroke(); cx.restore();
  }
  function drawMatch() {
    var L = G.L, st = G.st, A = G.anim, moving = null;
    // board panel
    cx.fillStyle = P.tile; rr(L.xs[0] - L.L * 0.5, L.y - L.L * 0.5, L.xs[L.xs.length - 1] + L.L * 1.5 - L.xs[0], L.L * 3, L.L * 0.35); cx.fill();
    if (A && A.i === 0) moving = A.mv;
    var hs = hintSol(), sel = G.sel || (G.drag && G.drag.on ? { p: G.drag.target.p, s: G.drag.target.s } : null);
    st.pos.forEach(function (p, i) {
      for (var s = 0; s < p.n; s++) {
        var q = segPts(i, s), has = !!(p.m & (1 << s));
        if (moving && moving.fp === i && moving.fs === s) has = false;
        if (has) {
          var isSel = sel && sel.p === i && sel.s === s;
          if (isSel && G.drag && G.drag.on) continue;
          if (isSel) { var o = -L.L * 0.08; drawStick({ x1: q.x1, y1: q.y1 + o, x2: q.x2, y2: q.y2 + o }, L.L, true); }
          else drawStick(q, L.L, false);
          if (hs && hs.fp === i && hs.fs === s) ring(segMid(i, s), L.L * 0.55);
        } else if (p.k !== 'e') {
          var hintTo = G.hint >= 2 && hs && hs.tp === i && hs.ts === s;
          drawGhost(q, L.L, !!sel || hintTo);
          if (hintTo) ring(segMid(i, s), L.L * 0.5, P.acc2);
        }
      }
    });
    if (G.hint >= 2 && hs && !A) arrow(segMid(hs.fp, hs.fs), segMid(hs.tp, hs.ts));
    if (G.drag && G.drag.on) { var t = G.drag.target, q0 = segPts(t.p, t.s), dx = G.drag.x - (q0.x1 + q0.x2) / 2, dy = G.drag.y - (q0.y1 + q0.y2) / 2; drawStick({ x1: q0.x1 + dx, y1: q0.y1 + dy, x2: q0.x2 + dx, y2: q0.y2 + dy }, L.L, true); }
    if (moving) {
      var a = segPts(moving.fp, moving.fs), b = segPts(moving.tp, moving.ts), e = ease(A.p || 0), lift = Math.sin(Math.PI * e) * L.L * 0.7;
      drawStick({ x1: a.x1 + (b.x1 - a.x1) * e, y1: a.y1 + (b.y1 - a.y1) * e - lift, x2: a.x2 + (b.x2 - a.x2) * e, y2: a.y2 + (b.y2 - a.y2) * e - lift }, L.L, true);
    }
    if (G.mode === 'done' || (A && A.i >= 1)) {
      var ok = G.res && G.res.ok; cx.fillStyle = ok ? P.good || '#22c55e' : '#ef4444';
      cx.font = '900 ' + Math.round(L.L * 0.7) + 'px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(ok ? '✓' : '✗', W / 2, L.y + L.L * 2.75);
    }
  }
  function ring(c, r, col) { cx.save(); cx.strokeStyle = col || P.acc; cx.lineWidth = 4; cx.globalAlpha = 0.5 + 0.5 * pulse(); cx.beginPath(); cx.arc(c.x, c.y, r * (0.9 + 0.12 * pulse()), 0, 6.283); cx.stroke(); cx.restore(); }
  function arrow(a, b, col) {
    var mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 40; cx.save(); cx.strokeStyle = col || P.acc2; cx.fillStyle = col || P.acc2; cx.lineWidth = 4; cx.setLineDash([10, 7]); cx.lineDashOffset = -now() / 40;
    cx.beginPath(); cx.moveTo(a.x, a.y); cx.quadraticCurveTo(mx, my, b.x, b.y); cx.stroke(); cx.setLineDash([]);
    var an = Math.atan2(b.y - my, b.x - mx); cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(b.x - 14 * Math.cos(an - 0.45), b.y - 14 * Math.sin(an - 0.45)); cx.lineTo(b.x - 14 * Math.cos(an + 0.45), b.y - 14 * Math.sin(an + 0.45)); cx.closePath(); cx.fill(); cx.restore();
  }
  function hintSol() { return G.hint >= 1 && G.sols.length ? G.sols[0] : null; }

  /* ---------- GRID helpers (slide & bounce) ---------- */
  function tileBg(x, y, cs, alt) { var c = cellC(x, y); cx.fillStyle = (x + y) % 2 ? P.tile : P.tile2; rr(c.x - cs * 0.47, c.y - cs * 0.47, cs * 0.94, cs * 0.94, cs * 0.16); cx.fill(); }
  function wall(x, y, cs) { var c = cellC(x, y); cx.fillStyle = P.wall; rr(c.x - cs * 0.48, c.y - cs * 0.44, cs * 0.96, cs * 0.92, cs * 0.16); cx.fill(); cx.fillStyle = P.wallTop; rr(c.x - cs * 0.48, c.y - cs * 0.5, cs * 0.96, cs * 0.8, cs * 0.16); cx.fill(); }
  function crate(px, py, cs, sc, glow) {
    cx.save(); cx.translate(px, py); cx.scale(sc || 1, sc || 1);
    var s = cs * 0.84; if (glow) { cx.shadowColor = P.acc; cx.shadowBlur = 16; }
    cx.fillStyle = '#b5773b'; rr(-s / 2, -s / 2 + 3, s, s, s * 0.14); cx.fill(); cx.shadowBlur = 0;
    cx.fillStyle = '#d99a55'; rr(-s / 2, -s / 2, s, s, s * 0.14); cx.fill();
    cx.strokeStyle = '#a5672d'; cx.lineWidth = Math.max(2, s * 0.08); rr(-s / 2 + s * 0.1, -s / 2 + s * 0.1, s * 0.8, s * 0.8, s * 0.08); cx.stroke();
    cx.beginPath(); cx.moveTo(-s * 0.36, -s * 0.36); cx.lineTo(s * 0.36, s * 0.36); cx.moveTo(s * 0.36, -s * 0.36); cx.lineTo(-s * 0.36, s * 0.36); cx.stroke();
    cx.restore();
  }
  function water(x, y, cs) { var c = cellC(x, y), t = now() / 600; cx.fillStyle = '#4cc9f0'; cx.fillRect(c.x - cs / 2, c.y - cs / 2, cs, cs); cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = 2; for (var k = -1; k <= 1; k++) { cx.beginPath(); for (var i = 0; i <= 8; i++) { var xx = c.x - cs * 0.4 + i * cs * 0.1, yy = c.y + k * cs * 0.25 + Math.sin(t + i * 0.8 + x + k) * cs * 0.04; if (i) cx.lineTo(xx, yy); else cx.moveTo(xx, yy); } cx.stroke(); } }
  function bridge(x, y, cs) { var c = cellC(x, y); water(x, y, cs); cx.fillStyle = '#c68642'; for (var i = 0; i < 4; i++) { rr(c.x - cs * 0.48, c.y - cs * 0.45 + i * cs * 0.23, cs * 0.96, cs * 0.18, 3); cx.fill(); } }
  function exitDoor(x, y, cs) { var c = cellC(x, y), s = cs * 0.8; cx.fillStyle = '#06d6a0'; rr(c.x - s / 2, c.y - s / 2, s, s, s * 0.2); cx.fill(); cx.fillStyle = '#fff'; cx.font = '900 ' + Math.round(cs * 0.48) + 'px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('★', c.x, c.y + 2); cx.strokeStyle = 'rgba(6,214,160,' + (0.3 + 0.4 * pulse()) + ')'; cx.lineWidth = 3; rr(c.x - s / 2 - 4, c.y - s / 2 - 4, s + 8, s + 8, s * 0.26); cx.stroke(); }
  function arrowBtn(a, d) { var v = E.DIRS[d], ang = Math.atan2(v[1], v[0]); cx.save(); cx.translate(a.x, a.y); cx.fillStyle = P.acc; cx.globalAlpha = 0.85 + 0.15 * pulse(); cx.beginPath(); cx.arc(0, 0, a.r, 0, 6.283); cx.fill(); cx.rotate(ang); cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(a.r * 0.5, 0); cx.lineTo(-a.r * 0.3, -a.r * 0.42); cx.lineTo(-a.r * 0.3, a.r * 0.42); cx.closePath(); cx.fill(); cx.restore(); }

  /* ---------- SLIDE draw ---------- */
  function drawBlock() {
    var L = G.L, cs = L.cs, g = G.st.g, A = G.anim, slide = null, x, y;
    if (A && A.i === 0) slide = A.to.slide;
    cx.fillStyle = P.board; rr(L.ox - 6, L.oy - 6, L.gw * cs + 12, L.gh * cs + 12, cs * 0.25); cx.fill();
    var heroPos = null, exitPos = null;
    for (y = 0; y < L.gh; y++) for (x = 0; x < L.gw; x++) {
      var ch = g[y][x];
      if (ch === '~') water(x, y, cs); else if (ch === '_') bridge(x, y, cs); else tileBg(x, y, cs);
      if (ch === '#') wall(x, y, cs);
      if (ch === 'E') exitPos = { x: x, y: y };
      if (ch === 'S') heroPos = { x: x, y: y };
    }
    if (exitPos) exitDoor(exitPos.x, exitPos.y, cs);
    var hs = hintSol();
    for (y = 0; y < L.gh; y++) for (x = 0; x < L.gw; x++) if (g[y][x] === 'B') {
      if (slide && slide.x0 === x && slide.y0 === y) continue;
      var c = cellC(x, y), isSel = G.sel && G.sel.x === x && G.sel.y === y;
      crate(c.x, c.y - (isSel ? 3 : 0), cs, isSel ? 1.04 : 1, isSel);
      if (hs && hs.x === x && hs.y === y) ring(c, cs * 0.62);
    }
    if (slide) { var a = cellC(slide.x0, slide.y0), b = cellC(slide.x1, slide.y1), p = easeOut(A.p || 0), sc = slide.sink && p > 0.85 ? 1 - (p - 0.85) * 4 : 1; crate(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, cs, sc); }
    // hero
    var hp = heroPos, mood = G.mode === 'done' && G.res && !G.res.ok ? 'sad' : null, hc = hp ? cellC(hp.x, hp.y) : null;
    if (A && A.i >= 2 && A.steps[A.i] && A.steps[A.i].kind === 'walk') {
      var path = A.res.path, f = (A.p || 0) * (path.length - 1), k = Math.min(path.length - 2, Math.floor(f)), r = f - k, p0 = cellC(path[k].x, path[k].y), p1 = cellC(path[k + 1].x, path[k + 1].y);
      hc = { x: p0.x + (p1.x - p0.x) * r, y: p0.y + (p1.y - p0.y) * r }; mood = 'walk';
    } else if (G.mode === 'done' && G.res && G.res.ok) { var e = A ? null : G.heroAt; if (e) hc = cellC(e.x, e.y); }
    if (A && A.steps[A.i] && A.steps[A.i].kind === 'shrug') { hc = { x: hc.x + Math.sin((A.p || 0) * 25) * cs * 0.06, y: hc.y }; mood = 'sad'; }
    if (hc) drawHero(hc.x, hc.y + cs * 0.02, cs * 0.92, 1, mood);
    if (G.sel && G.mode === 'idle') G.sel.dirs.forEach(function (d) { arrowBtn(arrowFor(G.sel, d), d); });
    if (G.hint >= 2 && hs && G.mode === 'idle' && !G.sel) arrowBtn(arrowFor(hs, hs.d), hs.d);
  }

  /* ---------- BOUNCE draw ---------- */
  function mirror(px, py, cs, ch, glow, ang) {
    var m = E.MIR[ch], kind = m[1], s = cs * 0.36;
    cx.save(); cx.translate(px, py);
    var base = m[0] === '/' ? -Math.PI / 4 : Math.PI / 4; cx.rotate(ang !== undefined ? ang : base);
    cx.fillStyle = kind === 'fixed' ? 'rgba(120,120,140,.18)' : 'rgba(23,184,166,.12)';
    cx.beginPath(); cx.arc(0, 0, cs * 0.44, 0, 6.283); cx.fill();
    if (glow) { cx.shadowColor = P.acc; cx.shadowBlur = 18; }
    var col = kind === 'fixed' ? '#8a8fa3' : kind === 'pivot' ? P.acc : P.acc2;
    cx.fillStyle = col; rr(-s * 1.15, -cs * 0.075, s * 2.3, cs * 0.15, cs * 0.06); cx.fill(); cx.shadowBlur = 0;
    cx.fillStyle = 'rgba(255,255,255,.75)'; rr(-s * 1.05, -cs * 0.065, s * 2.1, cs * 0.05, cs * 0.03); cx.fill();
    if (kind === 'pivot') { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, cs * 0.09, 0, 6.283); cx.fill(); cx.fillStyle = '#333'; cx.beginPath(); cx.arc(0, 0, cs * 0.045, 0, 6.283); cx.fill(); }
    if (kind === 'fixed') { cx.fillStyle = '#555'; [-1, 1].forEach(function (k) { cx.beginPath(); cx.arc(k * s * 0.8, 0, cs * 0.04, 0, 6.283); cx.fill(); }); }
    if (kind === 'free') { cx.fillStyle = '#fff'; [-0.35, 0, 0.35].forEach(function (k) { cx.beginPath(); cx.arc(k * s, cs * 0.0, cs * 0.025, 0, 6.283); cx.fill(); }); }
    cx.restore();
  }
  function launcher(x, y, cs, ch) { var c = cellC(x, y), v = E.LDIR[ch], ang = Math.atan2(v[1], v[0]); cx.save(); cx.translate(c.x, c.y); cx.fillStyle = '#ef476f'; cx.beginPath(); cx.arc(0, 0, cs * 0.34, 0, 6.283); cx.fill(); cx.rotate(ang); cx.fillStyle = '#c9184a'; rr(0, -cs * 0.13, cs * 0.48, cs * 0.26, cs * 0.06); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, cs * 0.12, 0, 6.283); cx.fill(); cx.restore(); }
  function target(x, y, cs, hit) { var c = cellC(x, y), cols = ['#ef476f', '#fff', '#ef476f', '#fff', '#ffd166']; for (var i = 0; i < 5; i++) { cx.fillStyle = cols[i]; cx.beginPath(); cx.arc(c.x, c.y, cs * (0.4 - i * 0.075) * (hit ? 1 + 0.15 * pulse() : 1), 0, 6.283); cx.fill(); } }
  function drawBall() {
    var L = G.L, cs = L.cs, g = G.st.g, A = G.anim, x, y;
    cx.fillStyle = P.board; rr(L.ox - 6, L.oy - 6, L.gw * cs + 12, L.gh * cs + 12, cs * 0.25); cx.fill();
    var mv = A && A.i === 0 ? A.mv : null, hs = hintSol(), ballStep = A && A.steps[A.i] ? A.steps[A.i].kind : null;
    var showTrace = (ballStep === 'ball' || ballStep === 'ballEnd' || G.mode === 'done') && G.res;
    for (y = 0; y < L.gh; y++) for (x = 0; x < L.gw; x++) { var ch = g[y][x]; tileBg(x, y, cs); if (ch === '#') wall(x, y, cs); }
    // destination hints for a selected free mirror
    if (G.sel && G.sel.free && G.mode === 'idle') for (y = 0; y < L.gh; y++) for (x = 0; x < L.gw; x++) if (g[y][x] === '.') { var c0 = cellC(x, y); cx.strokeStyle = P.acc2; cx.globalAlpha = 0.35 + 0.25 * pulse(); cx.setLineDash([5, 5]); cx.lineWidth = 2; cx.beginPath(); cx.arc(c0.x, c0.y, cs * 0.22, 0, 6.283); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1; }
    // trajectory trail
    var ballPos = null;
    if (showTrace) {
      var path = G.res.path, total = 0, segs = []; for (var i = 1; i < path.length; i++) { var l = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); segs.push(l); total += l; }
      var prog = ballStep === 'ball' ? (A.p || 0) * total : total;
      cx.save(); cx.strokeStyle = G.mode === 'done' && !G.res.ok ? 'rgba(239,68,68,.55)' : 'rgba(255,183,3,.75)'; cx.lineWidth = cs * 0.12; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.beginPath();
      var p0 = cellC(path[0].x, path[0].y); cx.moveTo(p0.x, p0.y); var acc = 0;
      for (i = 1; i < path.length; i++) {
        var a = cellC(path[i - 1].x, path[i - 1].y), b = cellC(path[i].x, path[i].y);
        if (acc + segs[i - 1] >= prog) { var r = (prog - acc) / (segs[i - 1] || 1); ballPos = { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r }; cx.lineTo(ballPos.x, ballPos.y); break; }
        cx.lineTo(b.x, b.y); acc += segs[i - 1]; ballPos = b;
        if (A && ballStep === 'ball' && path[i].m && !path[i].done) { path[i].done = 1; sfx('bounce', i); }
      }
      cx.stroke(); cx.restore();
    }
    for (y = 0; y < L.gh; y++) for (x = 0; x < L.gw; x++) {
      var ch2 = g[y][x], c = cellC(x, y);
      if (E.LDIR[ch2]) launcher(x, y, cs, ch2);
      if (ch2 === 'T') target(x, y, cs, G.mode === 'done' && G.res && G.res.ok);
      if (E.MIR[ch2]) {
        if (mv && mv.x === x && mv.y === y) continue;
        if (G.drag && G.drag.on && G.drag.target.x === x && G.drag.target.y === y) { cx.globalAlpha = 0.3; mirror(c.x, c.y, cs, ch2); cx.globalAlpha = 1; continue; }
        var isSel = G.sel && G.sel.x === x && G.sel.y === y;
        mirror(c.x, c.y, cs, ch2, isSel);
        if (hs && hs.x === x && hs.y === y && G.mode === 'idle') ring(c, cs * 0.55);
      }
    }
    if (mv) { // animate the move itself
      var ch3 = G.anim.from.g[mv.y][mv.x], p = ease(A.p || 0), a0 = cellC(mv.x, mv.y);
      if (mv.op === 'turn') { var b0 = E.MIR[ch3][0] === '/' ? -Math.PI / 4 : Math.PI / 4, b1 = -b0; mirror(a0.x, a0.y, cs, ch3, true, b0 + (b1 > b0 ? 1 : -1) * Math.PI / 2 * p); }
      else { var t0 = cellC(mv.tx, mv.ty); mirror(a0.x + (t0.x - a0.x) * p, a0.y + (t0.y - a0.y) * p - Math.sin(Math.PI * p) * cs * 0.4, cs, ch3, true); }
    }
    if (G.drag && G.drag.on) mirror(G.drag.x, G.drag.y, cs, g[G.drag.target.y][G.drag.target.x], true);
    if (ballPos && G.res && !(G.mode === 'done' && G.res.ok)) { cx.fillStyle = '#ffb703'; cx.beginPath(); cx.arc(ballPos.x, ballPos.y, cs * 0.17, 0, 6.283); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.7)'; cx.beginPath(); cx.arc(ballPos.x - cs * 0.05, ballPos.y - cs * 0.05, cs * 0.05, 0, 6.283); cx.fill(); }
    if (G.sel && G.mode === 'idle') { var bb = bubbleFor(G.sel); cx.fillStyle = P.acc; cx.beginPath(); cx.arc(bb.x, bb.y, bb.r, 0, 6.283); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke(); cx.fillStyle = '#fff'; cx.font = '900 ' + Math.round(bb.r * 1.15) + 'px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⟳', bb.x, bb.y + 1); }
    if (G.hint >= 2 && hs && G.mode === 'idle') { var hc = cellC(hs.x, hs.y); if (hs.op === 'move') arrow(hc, cellC(hs.tx, hs.ty)); else { cx.fillStyle = P.acc2; cx.font = '900 ' + Math.round(cs * 0.5) + 'px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⟳', hc.x + cs * 0.42, hc.y - cs * 0.42); } }
  }

  /* ---------- RESCUE draw ---------- */
  function rock(x, y, cs, g) { var c = cellC(x, y); cx.fillStyle = P.rock; cx.fillRect(c.x - cs / 2, c.y - cs / 2, cs + 0.5, cs + 0.5); cx.fillStyle = 'rgba(0,0,0,.08)'; cx.beginPath(); cx.arc(c.x - cs * 0.15, c.y + cs * 0.1, cs * 0.12, 0, 6.283); cx.arc(c.x + cs * 0.2, c.y - cs * 0.05, cs * 0.08, 0, 6.283); cx.fill(); if (y === 0 || g[y - 1][x] === '.' || g[y - 1][x] === 'G') { cx.fillStyle = P.rockTop; cx.fillRect(c.x - cs / 2, c.y - cs / 2, cs + 0.5, cs * 0.2); } }
  function plank(x, y, cs, glow, a) { var c = cellC(x, y); cx.save(); cx.globalAlpha = a === undefined ? 1 : a; if (glow) { cx.shadowColor = P.acc; cx.shadowBlur = 18; } cx.fillStyle = '#c68642'; rr(c.x - cs * 0.49, c.y - cs * 0.3, cs * 0.98, cs * 0.6, cs * 0.1); cx.fill(); cx.shadowBlur = 0; cx.strokeStyle = '#8d5524'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(c.x - cs * 0.45, c.y); cx.lineTo(c.x + cs * 0.45, c.y); cx.stroke(); cx.fillStyle = '#555'; [-0.36, 0.36].forEach(function (k) { [-0.15, 0.15].forEach(function (j) { cx.beginPath(); cx.arc(c.x + k * cs, c.y + j * cs, cs * 0.035, 0, 6.283); cx.fill(); }); }); cx.restore(); }
  function boulder(px, py, cs) { cx.fillStyle = '#7d7f8c'; cx.beginPath(); cx.arc(px, py, cs * 0.44, 0, 6.283); cx.fill(); cx.fillStyle = '#9a9cab'; cx.beginPath(); cx.arc(px - cs * 0.1, py - cs * 0.1, cs * 0.28, 0, 6.283); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.35)'; cx.beginPath(); cx.arc(px - cs * 0.17, py - cs * 0.17, cs * 0.08, 0, 6.283); cx.fill(); }
  function spikes(x, y, cs) { var c = cellC(x, y); cx.fillStyle = P.rock; cx.fillRect(c.x - cs / 2, c.y - cs / 2, cs + 0.5, cs + 0.5); cx.fillStyle = '#d7dbe6'; for (var i = 0; i < 4; i++) { var bx = c.x - cs / 2 + i * cs / 4; cx.beginPath(); cx.moveTo(bx, c.y + cs / 2); cx.lineTo(bx + cs / 8, c.y - cs * 0.35); cx.lineTo(bx + cs / 4, c.y + cs / 2); cx.fill(); } cx.fillStyle = '#ef4444'; for (i = 0; i < 4; i++) { bx = c.x - cs / 2 + i * cs / 4; cx.beginPath(); cx.moveTo(bx + cs / 8 - cs * 0.03, c.y - cs * 0.25); cx.lineTo(bx + cs / 8, c.y - cs * 0.35); cx.lineTo(bx + cs / 8 + cs * 0.03, c.y - cs * 0.25); cx.fill(); } }
  function monster(x, y, cs) { var c = cellC(x, y), b = Math.sin(now() / 260 + x) * cs * 0.04; cx.fillStyle = '#7b2cbf'; cx.beginPath(); cx.ellipse(c.x, c.y + cs * 0.08 + b, cs * 0.4, cs * 0.38, 0, 0, 6.283); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(c.x - cs * 0.14, c.y - cs * 0.04 + b, cs * 0.11, 0, 6.283); cx.arc(c.x + cs * 0.14, c.y - cs * 0.04 + b, cs * 0.11, 0, 6.283); cx.fill(); cx.fillStyle = '#111'; cx.beginPath(); cx.arc(c.x - cs * 0.12, c.y - cs * 0.02 + b, cs * 0.05, 0, 6.283); cx.arc(c.x + cs * 0.12, c.y - cs * 0.02 + b, cs * 0.05, 0, 6.283); cx.fill(); cx.fillStyle = '#fff'; for (var i = -2; i <= 2; i++) { cx.beginPath(); cx.moveTo(c.x + i * cs * 0.07 - cs * 0.03, c.y + cs * 0.18 + b); cx.lineTo(c.x + i * cs * 0.07, c.y + cs * 0.27 + b); cx.lineTo(c.x + i * cs * 0.07 + cs * 0.03, c.y + cs * 0.18 + b); cx.fill(); } cx.fillStyle = '#7b2cbf'; cx.beginPath(); cx.moveTo(c.x - cs * 0.3, c.y - cs * 0.22 + b); cx.lineTo(c.x - cs * 0.22, c.y - cs * 0.48 + b); cx.lineTo(c.x - cs * 0.1, c.y - cs * 0.3 + b); cx.moveTo(c.x + cs * 0.3, c.y - cs * 0.22 + b); cx.lineTo(c.x + cs * 0.22, c.y - cs * 0.48 + b); cx.lineTo(c.x + cs * 0.1, c.y - cs * 0.3 + b); cx.fill(); }
  function door(x, y, cs, open) { var c = cellC(x, y); cx.fillStyle = '#06d6a0'; rr(c.x - cs * 0.36, c.y - cs * 0.48, cs * 0.72, cs * 0.98, cs * 0.34); cx.fill(); cx.fillStyle = open ? '#fff7c2' : '#05a77d'; rr(c.x - cs * 0.26, c.y - cs * 0.36, cs * 0.52, cs * 0.86, cs * 0.25); cx.fill(); cx.fillStyle = '#ffd166'; cx.beginPath(); cx.arc(c.x + cs * 0.14, c.y + cs * 0.1, cs * 0.05, 0, 6.283); cx.fill(); }
  function drawRescue() {
    var L = G.L, cs = L.cs, A = G.anim, x, y;
    var step = A && A.steps[A.i], k = step && step.kind === 'tick' ? step.k : null, fr = A && A.res.frames;
    var view = G.view || null, g, hx, hy, hd, prev = null, p = A ? (A.p || 0) : 0;
    if (k !== null) { prev = fr[k - 1]; view = fr[k]; g = prev.g; }
    else if (A && step && step.kind === 'sEnd') { view = fr[fr.length - 1]; g = view.g; }
    else if (view) g = view.g; else g = G.st.g;
    if (view && k === null) { hx = view.hx; hy = view.hy; hd = view.d; } else if (view) { hd = view.d; } else { hx = G.st.hx; hy = G.st.hy; hd = G.st.d; }
    // sky
    var sk = cx.createLinearGradient(0, L.oy, 0, L.oy + L.gh * cs); sk.addColorStop(0, P.sky1); sk.addColorStop(1, P.sky2); cx.fillStyle = sk; rr(L.ox, L.oy, L.gw * cs, L.gh * cs, cs * 0.2); cx.fill();
    var falling = {}; if (k !== null) view.falls.forEach(function (f) { falling[f.x + ',' + f.y0] = f; });
    var hs = hintSol();
    for (y = 0; y < L.gh; y++) for (x = 0; x < L.gw; x++) {
      var ch = g[y][x], c = cellC(x, y);
      if (ch === '#') rock(x, y, cs, g);
      else if (ch === '^') spikes(x, y, cs);
      else if (ch === '_') { spikes(x, y, cs); boulder(c.x, c.y + cs * 0.05, cs); }
      else if (ch === 'w') { if (A && A.i === 0 && A.mv.x === x && A.mv.y === y) plank(x, y - p * 0.4, cs, false, 1 - p); else { plank(x, y, cs, G.sel && G.sel.x === x && G.sel.y === y); if (hs && hs.x === x && hs.y === y && G.mode === 'idle') ring(c, cs * 0.6); } }
      else if (ch === 'o') { if (!falling[x + ',' + y]) boulder(c.x, c.y, cs); }
      else if (ch === 'M') monster(x, y, cs);
      else if (ch === 'G') door(x, y, cs, G.mode === 'done' && G.res && G.res.ok);
    }
    // falling boulders
    if (k !== null) view.falls.forEach(function (f) { var q = Math.min(1, p * p * 1.0 / 0.6), a = cellC(f.x, f.y0), b = cellC(f.x, f.y1); boulder(a.x, a.y + (b.y - a.y) * Math.min(1, q), cs); });
    // hero position
    var hpx, hpy, mood = null;
    if (k !== null) {
      var ev = view.ev, hp = ev === 'turn' ? 0 : (view.falls.length ? Math.max(0, (p - 0.45) / 0.55) : p);
      var X0 = prev.hx, Y0 = prev.hy, X1 = view.hx, Y1 = view.hy;
      if (ev === 'spike' || ev === 'monster' || ev === 'fall') { X1 = view.hx; Y1 = Math.min(view.hy, L.gh + 1); }
      var c0 = cellC(X0, Y0), c1 = cellC(X1, Y1);
      hpx = c0.x + (c1.x - c0.x) * hp; hpy = c0.y + (c1.y - c0.y) * hp; hd = ev === 'turn' && p > 0.5 ? view.d : prev.d;
      mood = ev === 'walk' ? 'walk' : null;
      if (ev === 'crush') { mood = p > 0.5 ? 'flat' : null; }
    } else { var cc = cellC(hx, hy); hpx = cc.x; hpy = cc.y; }
    var endWhy = G.mode === 'done' || (step && step.kind === 'sEnd') ? (G.res && G.res.why) : null;
    if (endWhy === 'crush') mood = 'flat'; else if (endWhy && endWhy !== 'home') mood = 'sad';
    if (!(endWhy === 'home')) { cx.save(); cx.beginPath(); cx.rect(L.ox, L.oy - cs, L.gw * cs, L.gh * cs + cs); cx.clip(); drawHero(hpx, hpy + (mood === 'flat' ? cs * 0.3 : 0), cs * 0.9, hd, mood); cx.restore(); }
    if (G.mode === 'idle' && !A) { // show which way the explorer will walk
      var ax = hpx + hd * cs * 0.5, ay = hpy - cs * 0.62, wob = Math.sin(now() / 200) * cs * 0.05;
      cx.save(); cx.fillStyle = P.acc; cx.globalAlpha = 0.9; cx.beginPath(); cx.moveTo(ax + hd * (cs * 0.16 + wob), ay); cx.lineTo(ax - hd * cs * 0.08 + hd * wob, ay - cs * 0.13); cx.lineTo(ax - hd * cs * 0.08 + hd * wob, ay + cs * 0.13); cx.closePath(); cx.fill(); cx.restore();
    }
    if (endWhy === 'stuck') { cx.fillStyle = P.acc; cx.font = '900 ' + Math.round(cs * 0.6) + 'px system-ui,sans-serif'; cx.textAlign = 'center'; cx.fillText('?', hpx, hpy - cs * 0.6); }
    if (endWhy === 'home') { var dc = cellC(view.hx, view.hy); cx.fillStyle = 'rgba(255,209,102,' + (0.4 + 0.4 * pulse()) + ')'; cx.beginPath(); cx.arc(dc.x, dc.y, cs * 0.6, 0, 6.283); cx.fill(); door(view.hx, view.hy, cs, true); }
    if (G.sel && G.mode === 'idle') { var b = bubbleFor(G.sel); cx.fillStyle = '#ef4444'; rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); cx.fill(); cx.fillStyle = '#fff'; cx.font = '800 ' + Math.round(b.h * 0.46) + 'px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('✕ Remove', b.x, b.y + 1); }
  }

  /* ---------- main loop ---------- */
  var lastT = now();
  function frame() {
    requestAnimationFrame(frame);
    var t = now(), dt = Math.min(3, (t - lastT) / 16.67); lastT = t;
    if (screen !== 'game' || !G || !G.L) return;
    stepAnim();
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, H);
    try { ({ m: drawMatch, b: drawBlock, r: drawBall, s: drawRescue })[G.t](); } catch (e) { if (window.console) console.error(e); }
    drawFx(dt);
  }
  requestAnimationFrame(frame);

  /* ---------- boot ---------- */
  refreshCoins(); renderHome();
  document.addEventListener('visibilitychange', function () { if (document.hidden && AC) AC.suspend && AC.suspend(); });

  /* ---------- debug / test hook (no effect on normal play) ---------- */
  window.__om = {
    E: E, levels: LV, open: openLevel, show: show,
    state: function () { return G && { id: G.id, t: G.t, mode: G.mode, attempts: G.attempts, ok: G.res ? G.res.ok : null, sel: G.sel, hint: G.hint }; },
    solutions: function () { return G ? G.sols : []; },
    commit: function (mv) { return tryMove(mv); },
    solveNow: function () { return G && G.sols.length ? tryMove(G.sols[0]) : false; },
    fast: function (f) { FAST = f ? 0.02 : 1; },
    save: function () { return JSON.parse(JSON.stringify(S)); },
    setCoins: function (n) { S.coins = n; save(); refreshCoins(); },
    // client (page) coordinates of the taps a player would make for a move
    tapsFor: function (mv) {
      var r = cv.getBoundingClientRect(), o = function (q) { return { x: Math.round(r.left + q.x), y: Math.round(r.top + q.y) }; };
      if (mv.t === 'm') return [o(segMid(mv.fp, mv.fs)), o(segMid(mv.tp, mv.ts))];
      if (mv.t === 'b') return [o(cellC(mv.x, mv.y)), o(arrowFor({ x: mv.x, y: mv.y }, mv.d))];
      if (mv.t === 'r') return [o(cellC(mv.x, mv.y)), mv.op === 'turn' ? o(bubbleFor({ x: mv.x, y: mv.y })) : o(cellC(mv.tx, mv.ty))];
      if (mv.t === 's') return [o(cellC(mv.x, mv.y)), o(bubbleFor({ x: mv.x, y: mv.y }))];
    }
  };
})();
