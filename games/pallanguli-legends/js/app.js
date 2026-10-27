/* PALLANGULI LEGENDS - UI, rendering, animation, progress. */
(function () {
  'use strict';
  var E = window.PallEngine, AI = window.PallAI, I = window.I18N, C = window.PallContent, t = I.t;
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- persistence ---------------- */
  var KEY = 'pallanguli.v1';
  var DEF = { coins: 0, lang: 'en', sound: true, speed: 'normal', fullscreen: true, labels: true, theme: 'teak', seed: 'tamarind',
    owned: { teak: 1, tamarind: 1 }, stats: { played: 0, won: 0, lost: 0, drawn: 0, bestCap: 0, dailies: 0, wl: {} }, ach: {}, tutorial: false,
    dailyDone: '', rewards: { day: '', n: 0 }, best: [], setup: null };
  var P = load();
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === 'object') { for (var k in DEF) if (!(k in o)) o[k] = JSON.parse(JSON.stringify(DEF[k])); return o; } } catch (e) {} return JSON.parse(JSON.stringify(DEF)); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addCoins(n) { P.coins += n; save(); $('#coinAmt').textContent = P.coins; }

  var THEMES = {
    teak: { price: 0, wood: ['#9c6533', '#b67a40', '#7a4a22', '#5e3718'], rim: '#d9b45a', pit: ['#1e0f06', '#4a2a14'], ink: '#f3e7c9', bg: '#2a170c' },
    rosewood: { price: 300, wood: ['#6a2a1e', '#84392a', '#4c1a12', '#36110b'], rim: '#e6c06a', pit: ['#170604', '#3a1810'], ink: '#f6e3c8', bg: '#24100b' },
    brass: { price: 500, wood: ['#b8892e', '#d9ae52', '#946a22', '#6f4e15'], rim: '#fff0b8', pit: ['#2a1a06', '#5a3e12'], ink: '#fff6dc', bg: '#2a1d0a' },
    night: { price: 400, wood: ['#1f2748', '#2c3765', '#161c36', '#0f1326'], rim: '#c9d3ea', pit: ['#05070f', '#1a2140'], ink: '#e8eeff', bg: '#0b0e1c' }
  };
  var SEEDS = { tamarind: { price: 0 }, cowrie: { price: 250 }, glass: { price: 350 } };
  var ACH = [
    ['learner', '📜', 'Finish the tutorial', 'பயிற்சியை முடி'], ['first_win', '🏆', 'Win a game against the computer', 'கணினியை ஒருமுறை வெல்'],
    ['big_haul', '🧺', 'Capture 12+ seeds in one move', 'ஒரே நகர்வில் 12+ விதைகள்'], ['pasu', '🐄', 'Win seeds with the pasu (four-seed) rule', 'பசு விதி மூலம் விதைகள் பெறு'],
    ['timed_win', '⏱️', 'Win a Timed Challenge', 'நேர சவாலை வெல்'], ['multi_win', '🔁', 'Win a multi-round game', 'பல சுற்று ஆட்டத்தை வெல்'],
    ['duo', '🤝', 'Finish a pass-and-play game', 'இருவர் ஆட்டத்தை முடி'], ['daily3', '📅', 'Complete 3 Daily Challenges', '3 தினசரி சவால்கள்'],
    ['level5', '👑', 'Beat the Level 5 computer', 'நிலை 5 கணினியை வெல்']
  ];
  var unlockedNow = [];
  function unlock(id) { if (P.ach[id]) return; P.ach[id] = today(); unlockedNow.push(id); addCoins(50); save(); var a = ACH.filter(function (x) { return x[0] === id; })[0]; toast('🏅 ' + (I.get() === 'ta' ? a[3] : a[2]) + ' · +50'); }

  /* ---------------- sound (WebAudio, synthesized) ---------------- */
  var AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function tone(f, dur, type, vol, when) {
    if (!P.sound) return; var a = ac(); if (!a) return; var t0 = a.currentTime + (when || 0);
    var o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var SND = {
    tok: function () { tone(520 + Math.random() * 120, 0.07, 'triangle', 0.12); tone(1500 + Math.random() * 300, 0.03, 'sine', 0.03); },
    lift: function () { tone(300, 0.12, 'triangle', 0.1); },
    cap: function () { [660, 880, 1320].forEach(function (f, i) { tone(f, 0.35, 'sine', 0.08, i * 0.07); }); },
    pasu: function () { tone(784, 0.6, 'sine', 0.1); tone(1176, 0.6, 'sine', 0.05, 0.02); },
    stop: function () { tone(220, 0.18, 'sine', 0.06); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.5, 'triangle', 0.08, i * 0.12); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.45, 'triangle', 0.07, i * 0.15); }); },
    tick: function () { tone(1000, 0.04, 'square', 0.03); }
  };

  /* ---------------- toast / modal ---------------- */
  var toastT;
  function toast(msg) { var el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2600); }
  function modal(html) { $('#modalCard').innerHTML = html; $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }

  /* ---------------- board renderer ---------------- */
  var cv = $('#board'), cx = cv.getContext('2d'), L = null, cache = null, cacheKey = '';
  var disp = { board: [], stores: [0, 0], inactive: [], hl: {}, fly: null, pulse: [] , preview: -1, hint: -1};
  function layout() {
    var r = cv.parentNode.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var W = Math.max(200, r.width), H = Math.max(100, r.height);
    var aspect = 7.3 / 3.05, bw = W, bh = W / aspect;
    if (bh > H) { bh = H; bw = H * aspect; }
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var x0 = (W - bw) / 2, y0 = (H - bh) / 2, pad = bw * 0.035, cell = (bw - 2 * pad) / 7;
    var pitR = Math.min(cell * 0.4, (bh - 2 * pad) / 2 * 0.36);
    L = { W: W, H: H, dpr: dpr, x0: x0, y0: y0, bw: bw, bh: bh, pad: pad, cell: cell, pitR: pitR, rowY: [y0 + bh * 0.31, y0 + bh * 0.69] };
    cacheKey = ''; draw();
  }
  function pitPos(i) { var col = i < 7 ? i : 13 - i, row = i < 7 ? 1 : 0; return { x: L.x0 + L.pad + L.cell * (col + 0.5), y: L.rowY[row], row: row }; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function rng(seed) { return AI.mulberry32(seed); }
  function buildCache() {
    var th = THEMES[P.theme] || THEMES.teak, key = P.theme + L.W + 'x' + L.H + L.dpr;
    if (key === cacheKey && cache) return; cacheKey = key;
    cache = document.createElement('canvas'); cache.width = cv.width; cache.height = cv.height;
    var c = cache.getContext('2d'); c.scale(L.dpr, L.dpr);
    var x = L.x0, y = L.y0, w = L.bw, h = L.bh, rad = h * 0.18;
    // shadow
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = h * 0.08; c.shadowOffsetY = h * 0.03; rr(c, x, y, w, h, rad); c.fillStyle = th.wood[3]; c.fill(); c.restore();
    // wood body + grain
    c.save(); rr(c, x, y, w, h, rad); c.clip();
    var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, th.wood[1]); g.addColorStop(0.5, th.wood[0]); g.addColorStop(1, th.wood[2]); c.fillStyle = g; c.fillRect(x, y, w, h);
    var R = rng(7); c.lineWidth = 1;
    for (var k = 0; k < 90; k++) {
      var yy = y + R() * h, amp = 2 + R() * h * 0.04, ph = R() * 6, fr = 2 + R() * 4;
      c.strokeStyle = 'rgba(' + (R() < 0.5 ? '40,20,5' : '255,230,190') + ',' + (0.04 + R() * 0.08) + ')'; c.lineWidth = 0.6 + R() * 1.6;
      c.beginPath(); for (var xx = 0; xx <= w; xx += 6) { var yv = yy + Math.sin(xx / w * fr * Math.PI + ph) * amp + Math.sin(xx / 23 + k) * 0.8; if (xx === 0) c.moveTo(x + xx, yv); else c.lineTo(x + xx, yv); } c.stroke();
    }
    for (k = 0; k < 3; k++) { var kx = x + R() * w, ky = y + R() * h, kr = h * (0.03 + R() * 0.04); var kg = c.createRadialGradient(kx, ky, 0, kx, ky, kr * 2.2); kg.addColorStop(0, 'rgba(40,18,4,.35)'); kg.addColorStop(1, 'rgba(40,18,4,0)'); c.fillStyle = kg; c.beginPath(); c.ellipse(kx, ky, kr * 3, kr * 1.3, 0, 0, 7); c.fill(); }
    var gl = c.createLinearGradient(x, y, x, y + h * 0.5); gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(x, y, w, h * 0.5);
    c.restore();
    // rims
    c.lineWidth = Math.max(1.5, h * 0.012); c.strokeStyle = th.rim; rr(c, x + 1, y + 1, w - 2, h - 2, rad); c.stroke();
    c.lineWidth = 1; c.globalAlpha = 0.6; var ins = L.pad * 0.62; rr(c, x + ins, y + ins, w - 2 * ins, h - 2 * ins, rad * 0.7); c.stroke(); c.globalAlpha = 1;
    // kolam-inspired border: dots with interlaced curves along top and bottom edges
    var by = [y + L.pad * 0.36, y + h - L.pad * 0.36], step = L.pad * 0.9, amp2 = L.pad * 0.2;
    c.save(); c.strokeStyle = th.rim; c.fillStyle = th.ink; c.globalAlpha = 0.85; c.lineWidth = Math.max(0.8, h * 0.005);
    by.forEach(function (yb) {
      var x1 = x + rad * 0.9, x2 = x + w - rad * 0.9, n = Math.floor((x2 - x1) / step); var sx = x1 + ((x2 - x1) - n * step) / 2;
      for (var s2 = 0; s2 < 2; s2++) { c.beginPath(); for (var q = 0; q <= n * 8; q++) { var px = sx + q * step / 8, py = yb + (s2 ? -1 : 1) * amp2 * Math.sin(q / 8 * Math.PI); if (q === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke(); }
      for (var d = 0; d <= n; d++) { c.beginPath(); c.arc(sx + d * step + step / 2, yb, Math.max(1, h * 0.008), 0, 7); if (d < n) c.fill(); }
    });
    // corner rosettes (lotus-like)
    [[x + rad * 0.55, y + rad * 0.55], [x + w - rad * 0.55, y + rad * 0.55], [x + rad * 0.55, y + h - rad * 0.55], [x + w - rad * 0.55, y + h - rad * 0.55]].forEach(function (p) {
      var pr = rad * 0.32; for (var a = 0; a < 8; a++) { c.beginPath(); c.ellipse(p[0] + Math.cos(a * Math.PI / 4) * pr * 0.6, p[1] + Math.sin(a * Math.PI / 4) * pr * 0.6, pr * 0.5, pr * 0.2, a * Math.PI / 4, 0, 7); c.stroke(); }
      c.beginPath(); c.arc(p[0], p[1], pr * 0.22, 0, 7); c.fill();
    });
    // centre divider line
    c.globalAlpha = 0.5; c.beginPath(); c.moveTo(x + L.pad * 1.2, y + h / 2); c.lineTo(x + w - L.pad * 1.2, y + h / 2); c.setLineDash([2, 5]); c.stroke(); c.setLineDash([]);
    c.restore();
    // pits
    for (var i = 0; i < 14; i++) {
      var p = pitPos(i), pr2 = L.pitR;
      var pg = c.createRadialGradient(p.x, p.y - pr2 * 0.35, pr2 * 0.1, p.x, p.y, pr2); pg.addColorStop(0, th.pit[0]); pg.addColorStop(0.75, th.pit[1]); pg.addColorStop(1, 'rgba(0,0,0,.5)');
      c.fillStyle = pg; c.beginPath(); c.ellipse(p.x, p.y, pr2, pr2 * 0.92, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,240,200,.25)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y + 1, pr2, pr2 * 0.92, 0, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(p.x, p.y - 1, pr2, pr2 * 0.92, 0, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
    }
  }
  var SEEDCOL = {
    tamarind: function (c, x, y, s, r) { var g = c.createRadialGradient(x - s * .3, y - s * .3, s * .1, x, y, s); g.addColorStop(0, '#a5683a'); g.addColorStop(0.5, '#5a2e14'); g.addColorStop(1, '#2a1206'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, s, s * 0.78, r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,230,200,.5)'; c.beginPath(); c.ellipse(x - s * .3, y - s * .3, s * .25, s * .12, r, 0, 7); c.fill(); },
    cowrie: function (c, x, y, s, r) { var g = c.createRadialGradient(x - s * .3, y - s * .4, s * .1, x, y, s * 1.1); g.addColorStop(0, '#fffaf0'); g.addColorStop(0.6, '#eadbb8'); g.addColorStop(1, '#a8916a'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, s * 1.05, s * 0.75, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(90,60,30,.7)'; c.lineWidth = Math.max(0.7, s * 0.14); c.beginPath(); c.moveTo(x - Math.cos(r) * s * .6, y - Math.sin(r) * s * .6); c.lineTo(x + Math.cos(r) * s * .6, y + Math.sin(r) * s * .6); c.stroke(); },
    glass: function (c, x, y, s, r, k) { var cols = ['#3fa7ff', '#ff5a7a', '#5ad17a', '#ffcf3f', '#b07aff', '#3fe0d0']; var col = cols[k % cols.length]; var g = c.createRadialGradient(x - s * .35, y - s * .35, s * .05, x, y, s); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s * 0.9, 0, 7); c.fill(); }
  };
  function drawSeeds(c, p, n, idx) {
    var shown = Math.min(n, 28), s = L.pitR * (n > 16 ? 0.15 : n > 9 ? 0.18 : 0.21), R = rng(idx * 131 + 7), draw = SEEDCOL[P.seed] || SEEDCOL.tamarind;
    for (var k = 0; k < shown; k++) {
      var rad = L.pitR * 0.66 * Math.sqrt((k + 0.6) / Math.max(shown, 7)), a = k * 2.39996 + idx;
      draw(c, p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad * 0.9, s, R() * 3.14, k + idx);
    }
  }
  var frameReq = 0, pulseOn = false;
  function draw() {
    if (!L) return; buildCache();
    var th = THEMES[P.theme] || THEMES.teak, c = cx, now = performance.now();
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(cache, 0, 0); c.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    if (!disp.board.length) return;
    var fs = Math.max(11, L.pitR * 0.42);
    for (var i = 0; i < 14; i++) {
      var p = pitPos(i), n = disp.board[i];
      if (disp.inactive[i]) { // closed "rubbish" pit
        c.fillStyle = 'rgba(10,5,2,.65)'; c.beginPath(); c.ellipse(p.x, p.y, L.pitR, L.pitR * 0.92, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(243,231,201,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - L.pitR * .4, p.y - L.pitR * .4); c.lineTo(p.x + L.pitR * .4, p.y + L.pitR * .4); c.moveTo(p.x + L.pitR * .4, p.y - L.pitR * .4); c.lineTo(p.x - L.pitR * .4, p.y + L.pitR * .4); c.stroke();
      } else drawSeeds(c, p, n, i);
      var h = disp.hl[i];
      var glow = null;
      if (h === 'lift') glow = '#ffffff'; else if (h === 'sow') glow = 'rgba(240,213,138,.6)'; else if (h === 'cap') glow = '#7be36a'; else if (h === 'empty') glow = 'rgba(160,160,160,.9)'; else if (h === 'pasu') glow = '#ff9a5a'; else if (h === 'sweep') glow = '#7ec8ff';
      if (!glow && disp.pulse.indexOf(i) >= 0) { var pa = 0.45 + 0.35 * Math.sin(now / 260); glow = 'rgba(240,213,138,' + pa.toFixed(2) + ')'; }
      if (disp.hint === i) glow = '#7ec8ff';
      if (disp.preview === i) glow = '#ffffff';
      if (glow) { c.save(); c.strokeStyle = glow; c.lineWidth = Math.max(2.5, L.pitR * 0.1); c.shadowColor = glow; c.shadowBlur = L.pitR * 0.4; c.beginPath(); c.ellipse(p.x, p.y, L.pitR * 1.04, L.pitR * 0.97, 0, 0, 7); c.stroke(); c.restore(); }
      // count badge
      var bx = p.x, byy = p.row === 1 ? p.y + L.pitR * 1.0 + fs * 0.62 : p.y - L.pitR * 1.0 - fs * 0.62;
      if (byy + fs * 0.6 > L.y0 + L.bh - 2) byy = L.y0 + L.bh - fs * 0.6 - 2; if (byy - fs * 0.6 < L.y0 + 2) byy = L.y0 + fs * 0.6 + 2;
      var txt = disp.inactive[i] ? '–' : String(n), bw2 = Math.max(fs * 1.5, c.measureText(txt).width + fs);
      c.fillStyle = 'rgba(20,10,4,.72)'; rr(c, bx - bw2 / 2, byy - fs * 0.6, bw2, fs * 1.2, fs * 0.6); c.fill();
      c.strokeStyle = th.rim; c.globalAlpha = .55; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
      c.fillStyle = th.ink; c.font = '700 ' + fs + 'px "PL Tamil",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, bx, byy + 1);
      if (P.labels) { c.font = '600 ' + Math.max(9, fs * 0.62) + 'px system-ui,sans-serif'; c.fillStyle = 'rgba(243,231,201,.6)'; c.fillText(E.label(i), bx + bw2 / 2 + fs * 0.85, byy + 1); }
    }
    if (disp.fly) { var f = disp.fly, q = Math.min(1, (now - f.t0) / f.d), a2 = pitPos(f.from), b2 = pitPos(f.to), e = q * q * (3 - 2 * q);
      var fx = a2.x + (b2.x - a2.x) * e, fy = a2.y + (b2.y - a2.y) * e - Math.sin(e * Math.PI) * L.pitR * 0.9;
      c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 6; c.shadowOffsetY = 4; (SEEDCOL[P.seed] || SEEDCOL.tamarind)(c, fx, fy, L.pitR * 0.22, e * 6, 3); c.restore(); }
  }
  function loop() { frameReq = 0; draw(); if (disp.fly || disp.pulse.length) frameReq = requestAnimationFrame(loop); }
  function kick() { if (!frameReq) frameReq = requestAnimationFrame(loop); }
  function hitPit(ev) {
    var r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, best = -1, bd = 1e9;
    for (var i = 0; i < 14; i++) { var p = pitPos(i), dx = x - p.x, dy = y - p.y, d = dx * dx + dy * dy; if (Math.abs(dx) < L.cell * 0.55 && Math.abs(dy) < L.bh * 0.3 && d < bd) { bd = d; best = i; } }
    return best;
  }

  /* ---------------- animation ---------------- */
  var SPEED = { slow: 260, normal: 150, fast: 70, instant: 0 }, SPEEDS = ['slow', 'normal', 'fast', 'instant'];
  var anim = { skip: false, running: false, wake: null };
  function wait(ms) { return new Promise(function (res) { if (anim.skip || ms <= 0) return res(); var to = setTimeout(done, ms); anim.wake = done; function done() { clearTimeout(to); anim.wake = null; res(); } }); }
  function snap(ev) { disp.board = ev.board.slice(); disp.stores = ev.stores.slice(); disp.inactive = ev.inactive.slice(); }
  function playEvents(events, onEv) {
    anim.running = true; anim.skip = (SPEED[P.speed] === 0); disp.pulse = []; disp.preview = -1; disp.hint = -1;
    var base = SPEED[P.speed] || 150, pos = -1, sows = 0, i = 0;
    function step() {
      if (i >= events.length || anim.skip) { if (events.length) snap(events[events.length - 1]); disp.hl = {}; disp.fly = null; anim.running = false; hud(); draw(); return Promise.resolve(); }
      var ev = events[i++], b = base * Math.max(0.35, Math.pow(0.97, Math.max(0, sows - 14)));
      if (onEv) onEv(ev);
      var p;
      switch (ev.type) {
        case 'pickup': disp.hl = {}; disp.hl[ev.pit] = 'lift'; snap(ev); pos = ev.pit; SND.lift(); hud(); draw(); p = wait(b * 2.2); break;
        case 'sow': sows++; disp.fly = { from: pos, to: ev.pit, t0: performance.now(), d: b * 0.9 }; kick();
          p = wait(b * 0.9).then(function () { disp.fly = null; snap(ev); if (disp.hl[ev.pit] !== 'lift') disp.hl[ev.pit] = 'sow'; SND.tok(); draw(); return wait(b * 0.15); }); pos = ev.pit; break;
        case 'pasu': snap(ev); disp.hl[ev.pit] = 'pasu'; SND.pasu(); hud(); draw(); toast(t('ex_pasu', { pit: E.label(ev.pit), who: who(ev.by) })); p = wait(Math.max(400, b * 5)); break;
        case 'capture': disp.hl = {}; disp.hl[ev.empty] = 'empty'; disp.hl[ev.pit] = 'cap'; if (ev.opp >= 0) disp.hl[ev.opp] = 'cap'; draw(); p = wait(Math.max(250, b * 3)).then(function () { snap(ev); SND.cap(); hud(); draw(); return wait(Math.max(350, b * 4)); }); break;
        case 'stop': disp.hl = {}; disp.hl[ev.empty] = 'empty'; disp.hl[ev.empty2] = 'empty'; SND.stop(); draw(); p = wait(Math.max(300, b * 4)); break;
        case 'sweep': disp.hl = {}; disp.hl[ev.pit] = 'sweep'; snap(ev); hud(); draw(); p = wait(Math.max(120, b * 1.5)); break;
        case 'roundEnd': case 'newRound': disp.hl = {}; snap(ev); hud(); draw(); p = wait(Math.max(700, b * 8)); break;
        default: snap(ev); draw(); p = wait(b * 0.3);
      }
      return p.then(step);
    }
    return step();
  }
  function skipAnim() { anim.skip = true; if (anim.wake) anim.wake(); }

  /* ---------------- game session ---------------- */
  var G = null;
  function who(p) { if (!G) return p ? 'B' : 'A'; if (G.mode === 'pass') return p ? t('playerB') : t('playerA'); return p === 0 ? t('youLabel') : t('computer'); }
  function isHuman(p) { return G && G.humans[p]; }

  function explain(events, res) {
    var out = [], first = events.filter(function (e) { return e.type === 'pickup' && e.first; })[0];
    if (first) out.push(t('ex_pick', { who: who(res.player), n: first.n, pit: E.label(first.pit) }));
    if (res.continues) out.push(t('ex_cont', { k: res.continues }));
    events.forEach(function (e) {
      if (e.type === 'pasu') out.push(t('ex_pasu', { pit: E.label(e.pit), who: who(e.by) }));
      if (e.type === 'capture') out.push(t('ex_cap', { e: E.label(e.empty), who: who(e.by), n: e.n, pit: E.label(e.pit) }) + (e.oppN ? t('ex_capOpp', { n: e.oppN, pit: E.label(e.opp) }) : ''));
      if (e.type === 'stop') out.push(t('ex_stop', { e: E.label(e.empty), e2: E.label(e.empty2) }));
      if (e.type === 'cap') out.push(t('ex_cap_limit'));
      if (e.type === 'roundEnd') out.push(e.reason === 'stall' ? t('ex_stall') : t('ex_round', { who: who(e.stuck) }));
      if (e.type === 'newRound') out.push(t('ex_newround', { r: e.round }));
      if (e.type === 'gameOver' && e.reason === 'cannot_refill') out.push(t('over_refill', { who: who(e.loser) }));
    });
    if (!res.gameOver && !res.roundEnded) out.push(t('ex_turn', { who: who(1 - res.player) }));
    return out.join(' ').replace(/\b1 seeds\b/g, '1 seed');
  }

  function dailyConfig(dateStr) {
    var h = 2166136261; for (var i = 0; i < dateStr.length; i++) { h ^= dateStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    var R = AI.mulberry32(h >>> 0), spp = [4, 5, 6][Math.floor(R() * 3)], pasu = R() < 0.4, type = R() < 0.5 ? 'win' : 'cap';
    var cfg = E.makeConfig('classic', { seedsPerPit: spp, pasu: pasu });
    return { cfg: cfg, type: type, level: 3, target: Math.ceil(cfg.totalSeeds * 0.55), starter: R() < 0.5 ? 0 : 1, seed: h >>> 0, date: dateStr };
  }

  function startMatch(o) {
    var cfg = E.makeConfig(o.ruleset, o.cfg);
    var starter = o.starter === 'random' || o.starter === undefined ? (Math.random() < 0.5 ? 0 : 1) : o.starter;
    G = { mode: o.mode, cfg: cfg, level: o.level || 3, humans: o.mode === 'pass' ? [true, true] : (o.aiVsAi ? [false, false] : [true, false]),
      levels: o.levels || [o.level || 3, o.level || 3], state: E.initializeGame(cfg, starter), undo: [], bestCap: 0, gotPasu: false,
      last: o, daily: o.daily || null, rng: o.daily ? AI.mulberry32(o.daily.seed) : Math.random, selected: -1, timer: null, deadline: 0, id: Math.random(), over: false, aiVsAi: !!o.aiVsAi, moves: 0 };
    snap(G.state); disp.hl = {}; disp.fly = null;
    show('game'); layout();
    $('#gExplain').textContent = o.mode === 'guided' ? t('guideTip') : (G.daily ? dailyText(G.daily) : C.rules(cfg, I.get())[1]);
    if (P.fullscreen && !o.aiVsAi && document.documentElement.requestFullscreen && !document.fullscreenElement) { try { var pr = document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    setTimeout(layout, 350);
    nextTurn();
    return G;
  }
  function dailyText(d) { return d.type === 'win' ? t('daily_win', { lv: d.level }) : t('daily_cap', { n: d.target, lv: d.level }); }

  function hud() {
    if (!G) return; var s = G.state;
    $('#plA .nm').textContent = G.mode === 'pass' ? t('playerA') : t('youLabel') + ' (A)';
    $('#plB .nm').textContent = G.mode === 'pass' ? t('playerB') : t('computer') + ' · L' + G.levels[1] + ' (B)';
    if (G.aiVsAi) { $('#plA .nm').textContent = 'AI L' + G.levels[0] + ' (A)'; }
    $('#plA .sc small').textContent = $('#plB .sc small').textContent = t('captured');
    $('#plA .sc b').textContent = disp.stores[0]; $('#plB .sc b').textContent = disp.stores[1];
    $('#plA').classList.toggle('turn', s.status === 'playing' && s.current === 0); $('#plB').classList.toggle('turn', s.status === 'playing' && s.current === 1);
    $('#gRound').textContent = (G.cfg.multiRound ? t('round') + ' ' + s.round + ' · ' : '') + t('rs_' + G.cfg.ruleset) + ' · ' + G.cfg.seedsPerPit + '×14' + (G.cfg.pasu && G.cfg.ruleset !== 'pasu' ? ' · pasu' : '');
    var canHint = (G.mode === 'guided' || G.mode === 'practice'), myTurn = s.status === 'playing' && isHuman(s.current) && !anim.running;
    $('#aHint').hidden = !canHint; $('#aHint').disabled = !myTurn; $('#aUndo').hidden = G.mode !== 'practice'; $('#aUndo').disabled = !G.undo.length || anim.running;
    $('#aHint span').textContent = t('hint'); $('#aUndo span').textContent = t('undo'); $('#aSpeed span').textContent = t(P.speed); $('#aSkip span').textContent = t('skip');
    $('#aSkip').disabled = !anim.running;
  }
  function setStatus(txt) { $('#gStatus').textContent = txt; }

  function nextTurn() {
    if (!G) return; var s = G.state, id = G.id; hud(); clearTimer();
    if (s.status === 'over') return finish();
    if (isHuman(s.current)) {
      disp.pulse = E.getLegalMoves(s); if (G.mode !== 'guided' && G.mode !== 'practice' && G.mode !== 'pass') disp.pulse = disp.pulse.slice(); kick();
      setStatus(G.mode === 'pass' ? t('turnOf', { p: who(s.current) }) + ' — ' + t('tap') : t('yourTurn'));
      if (G.mode === 'timed') startTimer(15);
    } else {
      disp.pulse = []; setStatus(t('aiThinking')); draw();
      setTimeout(function () {
        if (!G || G.id !== id) return;
        var lv = G.levels[s.current], m = AI.chooseMove(G.state, lv, { rng: G.rng, timeMs: G.aiVsAi ? 60 : 700 });
        doMove(m);
      }, G.aiVsAi && P.speed === 'instant' ? 0 : 380);
    }
  }
  function startTimer(sec) {
    G.deadline = Date.now() + sec * 1000; $('#gTimer').hidden = false; var id = G.id, lastS = -1;
    G.timer = setInterval(function () {
      if (!G || G.id !== id) return clearInterval(G && G.timer);
      var left = Math.max(0, G.deadline - Date.now()), sc = Math.ceil(left / 1000);
      $('#gTimer span').textContent = sc + 's'; $('#gTimer i').style.setProperty('--p', (left / (sec * 1000) * 100) + '%');
      if (sc !== lastS && sc <= 5 && sc > 0) SND.tick(); lastS = sc;
      if (left <= 0) { clearTimer(); var lm = E.getLegalMoves(G.state); toast(t('timeout')); doMove(lm[Math.floor(Math.random() * lm.length)]); }
    }, 200);
  }
  function clearTimer() { if (G && G.timer) { clearInterval(G.timer); G.timer = null; } $('#gTimer').hidden = !(G && G.mode === 'timed'); }

  function doMove(pit) {
    if (!G || anim.running) return; var s = G.state, v = E.validateMove(s, pit); if (!v.ok) return;
    clearTimer(); G.selected = -1;
    if (G.mode === 'practice' && isHuman(s.current)) G.undo.push(s);
    var r = E.executeMove(s, pit), mover = s.current; G.state = r.state; G.moves++;
    if (isHuman(mover)) { var gained = r.result.gained[mover]; var capN = r.result.captures.reduce(function (a, c) { return a + c.n + c.oppN; }, 0); if (capN > G.bestCap) G.bestCap = capN; if (r.result.pasu.some(function (q) { return q.by === mover; })) G.gotPasu = true; }
    var text = explain(r.events, r.result), id = G.id;
    setStatus(who(mover) + ': ' + E.label(pit)); $('#gExplain').textContent = '…';
    hud();
    playEvents(r.events).then(function () { if (!G || G.id !== id) return; $('#gExplain').textContent = text; nextTurn(); });
  }

  function onTap(ev) {
    if (!G || !L) return; ac();
    if (anim.running) return;
    var s = G.state, pit = hitPit(ev); if (pit < 0 || s.status !== 'playing' || !isHuman(s.current)) return;
    var v = E.validateMove(s, pit);
    if (!v.ok) { if (v.reason === 'not_your_pit') toast(t('yourTurn')); return; }
    if (G.mode === 'guided' && G.selected !== pit) {
      G.selected = pit; disp.preview = pit; disp.hint = -1;
      var r = E.executeMove(s, pit, { record: false }).result, capN = r.captures.reduce(function (a, c) { return a + c.n + c.oppN; }, 0);
      var pz = r.pasu.filter(function (q) { return q.by === s.current; }).length * 4;
      $('#gExplain').textContent = (capN ? t('preview', { pit: E.label(pit), n: capN, pasu: pz ? t('previewPasu', { n: pz }) : '' }) : (pz ? t('preview', { pit: E.label(pit), n: 0, pasu: t('previewPasu', { n: pz }) }) : t('previewNone', { pit: E.label(pit) }))) + ' ' + t('tapAgain', { pit: E.label(pit) });
      draw(); return;
    }
    doMove(pit);
  }
  cv.addEventListener('click', onTap);

  function finish() {
    if (!G || G.over) return; G.over = true; clearTimer(); disp.pulse = []; draw();
    var s = G.state, w = s.winner, st = P.stats, coins = 0, lines = [], title;
    unlockedNow = [];
    if (G.aiVsAi) { setStatus('Game over'); return; }
    st.played++;
    if (G.mode === 'pass') { title = w === 'draw' ? t('draw') : t('winsP', { p: who(w) }); unlock('duo'); SND.win(); }
    else {
      var lv = G.levels[1];
      if (w === 0) { st.won++; st.wl[lv] = (st.wl[lv] || 0) + 1; title = t('win'); SND.win(); } else if (w === 1) { st.lost++; title = t('lose'); SND.lose(); } else { st.drawn++; title = t('draw'); }
      if (G.bestCap > st.bestCap) st.bestCap = G.bestCap;
      if (G.bestCap >= 12) unlock('big_haul'); if (G.gotPasu) unlock('pasu');
      if (G.daily) {
        var ok = G.daily.type === 'win' ? w === 0 : s.stores[0] >= G.daily.target;
        if (ok && P.dailyDone !== G.daily.date) { P.dailyDone = G.daily.date; st.dailies++; coins += 25; lines.push(t('dailyDone')); if (st.dailies >= 3) unlock('daily3'); }
        else if (!ok) lines.push(t('dailyFail'));
      } else if (w === 0 && (G.mode === 'ai' || G.mode === 'timed') && lv >= 2) {
        var d = today(); if (P.rewards.day !== d) P.rewards = { day: d, n: 0 };
        if (P.rewards.n < 10) { P.rewards.n++; coins += 10; }
      }
      if (w === 0 && G.mode !== 'practice') {
        unlock('first_win'); if (lv >= 5) unlock('level5'); if (G.mode === 'timed') unlock('timed_win'); if (G.cfg.multiRound) unlock('multi_win');
        var margin = s.stores[0] - s.stores[1];
        P.best.push({ d: today(), lv: lv, rs: G.cfg.ruleset, m: margin, mode: G.mode }); P.best.sort(function (a, b) { return b.lv - a.lv || b.m - a.m; }); P.best = P.best.slice(0, 10);
      }
    }
    if (coins) addCoins(coins); save();
    var reason = s.endReason === 'cannot_refill' ? '<p class="note">' + esc(t('over_refill', { who: who(1 - w) })) + '</p>' : '';
    modal('<h2>' + esc(title) + '</h2><div class="big">' + s.stores[0] + ' – ' + s.stores[1] + '</div><p class="note">' + esc(who(0)) + ' – ' + esc(who(1)) + '</p>' + reason +
      lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + (coins ? '<p><span class="coin"></span> <b>' + esc(t('earned', { n: coins })) + '</b></p><p class="note">' + esc(t('coinsNote')) + '</p>' : '') +
      '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn gold" id="mAgain">' + esc(t('playAgain')) + '</button><button class="btn" id="mMenu">' + esc(t('menu')) + '</button></div>');
    $('#mAgain').onclick = function () { closeModal(); startMatch(G.last); };
    $('#mMenu').onclick = function () { closeModal(); quitGame(); };
  }
  function quitGame() { if (G) { G.id = -1; clearTimer(); } skipAnim(); G = null; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); show('menu'); }

  $('#aHint').onclick = function () { if (!G || anim.running) return; var m = AI.hint(G.state); disp.hint = m; disp.preview = -1; G.selected = -1; $('#gExplain').textContent = '💡 ' + E.label(m); draw(); };
  $('#aUndo').onclick = function () { if (!G || anim.running || !G.undo.length) return; G.state = G.undo.pop(); snap(G.state); disp.hl = {}; $('#gExplain').textContent = ''; nextTurn(); draw(); };
  $('#aSpeed').onclick = function () { P.speed = SPEEDS[(SPEEDS.indexOf(P.speed) + 1) % SPEEDS.length]; save(); hud(); };
  $('#aSkip').onclick = skipAnim;

  /* ---------------- screens ---------------- */
  var cur = 'menu', setup = null;
  function show(name, arg) {
    cur = name; var game = name === 'game';
    $('#game').hidden = !game; $('#view').hidden = game;
    $('#tbBack').hidden = name === 'menu';
    $('#tbTitle').textContent = game ? 'PALLANGULI' : (name === 'menu' ? 'PALLANGULI LEGENDS' : titleOf(name));
    $('#coinAmt').textContent = P.coins; $('#tbLang').textContent = I.get() === 'ta' ? 'EN' : 'தமிழ்'; $('#tbSound').textContent = P.sound ? '🔊' : '🔇';
    document.documentElement.lang = I.get() === 'ta' ? 'ta' : 'en';
    if (!game) { $('#view').innerHTML = '<div class="wrap">' + (SCREENS[name] || SCREENS.menu)(arg) + '</div>'; $('#view').scrollTop = 0; bind(name, arg); }
    else { hud(); }
  }
  function titleOf(n) { return { setup: t(setup ? setup.titleKey : 'playAI'), learn: t('learn'), rules: t('rules'), shop: t('shop'), stats: t('stats'), settings: t('settings'), soon: t('online') }[n] || ''; }
  function seg(name, opts, val) { return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '" class="' + (String(o[0]) === String(val) ? 'on' : '') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function field(label, html) { return '<div class="field"><label>' + esc(label) + '</label>' + html + '</div>'; }
  var SCREENS = {
    menu: function () {
      var d = dailyConfig(today()), done = P.dailyDone === today();
      var b = function (id, title, sub, cls) { return '<button class="mbtn ' + (cls || '') + '" data-go="' + id + '"><b>' + esc(title) + '</b><small>' + esc(sub || '') + '</small></button>'; };
      return '<h1>PALLANGULI<span class="ta">பல்லாங்குழி LEGENDS</span></h1><p class="sub">' + esc(t('subtitle')) + '</p><div class="kolam"></div>' +
        '<div class="grid">' + b('ai', t('playAI'), 'Level 1–5', 'primary') + b('pass', t('pass'), '📱 1 phone') + b('guided', t('guided'), '💡') + b('practice', t('practice'), '↶ ' + t('undo')) +
        b('timed', t('timed'), '⏱ 15 s') + b('daily', t('daily'), done ? '✓ ' + today() : dailyText(d)) + b('learn', t('learn'), P.tutorial ? '✓' : '+100') + b('rules', t('rules'), t('historyH')) +
        b('shop', t('shop'), P.coins + ' ' + t('coins')) + b('stats', t('stats'), '') + b('settings', t('settings'), '') + b('soon', t('online'), t('comingSoon'), 'soon') + '</div>' +
        '<p class="note" style="text-align:center;margin-top:16px">' + esc(t('privacy')) + '<br>' + esc(t('coinsNote')) + '<br>Presented by BALA HR</p>';
    },
    setup: function () {
      var s = setup, cfg = E.makeConfig(s.ruleset, s.cfg), daily = s.mode === 'daily', html = '';
      if (daily) {
        var d = dailyConfig(today()); html += '<div class="card"><h3>' + esc(t('daily')) + ' · ' + today() + '</h3><p><b>' + esc(dailyText(d)) + '</b></p>' + (P.dailyDone === today() ? '<p class="note">' + esc(t('dailyDone')) + '</p>' : '<p class="note">+25 ' + esc(t('coins')) + '</p>') + '</div>';
        cfg = d.cfg;
      } else {
        html += field(t('ruleset'), seg('ruleset', [['classic', t('rs_classic')], ['pasu', t('rs_pasu')], ['six', t('rs_six')], ['multi', t('rs_multi')]], s.ruleset));
        html += '<div class="two"><div>' + field(t('seedsPerPit'), seg('seedsPerPit', [[4, '4'], [5, '5'], [6, '6']], cfg.seedsPerPit)) +
          field(t('pasuRule'), seg('pasu', [[1, t('on')], [0, t('off')]], cfg.pasu ? 1 : 0)) + (cfg.pasu ? field(t('pasuBy'), seg('pasuBy', [['owner', t('pasuOwner')], ['sower', t('pasuSower')]], cfg.pasuBy)) : '') + '</div><div>' +
          field(t('captureOpp'), seg('captureOpposite', [[1, t('on')], [0, t('off')]], cfg.captureOpposite ? 1 : 0)) + field(t('skipOrigin'), seg('skipOrigin', [[1, t('on')], [0, t('off')]], cfg.skipOrigin ? 1 : 0)) + '</div></div>';
        if (s.mode !== 'pass') html += field(t('level'), seg('level', (s.mode === 'guided' ? [1, 2] : [1, 2, 3, 4, 5]).map(function (l) { return [l, 'L' + l]; }), s.level));
        html += field(t('whoStarts'), seg('starter', s.mode === 'pass' ? [[0, 'A'], [1, 'B'], ['random', t('random')]] : [[0, t('you')], [1, t('computer')], ['random', t('random')]], s.starter));
      }
      html += '<div class="card rules" style="margin-top:12px"><h3>' + esc(t('thisMatch')) + ' · ' + esc(t('rs_' + cfg.ruleset)) + '</h3><ol>' + C.rules(cfg, I.get()).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol><p class="note">' + esc(t('variantNote')) + '</p></div>';
      html += '<div class="sticky"><button class="btn gold" id="goStart" style="width:100%;min-height:52px;font-size:17px">▶ ' + esc(t('start')) + '</button></div>';
      return html;
    },
    learn: function (step) {
      step = step || 0; var c = C.tutorial[step], L2 = I.get() === 'ta' ? c.ta : c.en;
      var mini = function () { var top = '', bot = ''; for (var k = 13; k >= 7; k--) top += '<span class="' + (c.hl[k] || '') + '">' + c.board[k] + '<small>' + E.label(k) + '</small></span>'; for (k = 0; k < 7; k++) bot += '<span class="' + (c.hl[k] || '') + '">' + c.board[k] + '<small>' + E.label(k) + '</small></span>'; return '<div class="mini">' + top + bot + '</div>'; };
      return '<div class="card"><p class="note">' + (step + 1) + ' / ' + C.tutorial.length + '</p><h2>' + esc(L2[0]) + '</h2>' + mini() + '<p>' + esc(L2[1]) + '</p>' +
        '<div class="row" style="justify-content:space-between"><button class="btn" id="tPrev" ' + (step ? '' : 'disabled') + '>‹ ' + esc(t('prev')) + '</button>' +
        (step < C.tutorial.length - 1 ? '<button class="btn gold" id="tNext">' + esc(t('next')) + ' ›</button>' : '<button class="btn gold" id="tDone">' + esc(t('finishTut')) + (P.tutorial ? ' ✓' : ' +100') + '</button>') + '</div></div>' +
        '<p class="note" style="margin-top:12px">' + esc(t('variantNote')) + '</p><div class="row"><button class="btn" data-go="guided">💡 ' + esc(t('guided')) + '</button><button class="btn" data-go="rules">' + esc(t('rules')) + '</button></div>';
    },
    rules: function () {
      var lang = I.get(), order = 'A1 → A2 → … → A7 → B1 → B2 → … → B7 → A1';
      var sec = function (id) { var cfg = E.makeConfig(id); return '<div class="card rules"><h3>' + esc(t('rs_' + id)) + '</h3><ol>' + C.rules(cfg, lang).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol></div>'; };
      return '<div class="card"><h3>' + esc(t('pitOrder')) + '</h3><div class="mini">' + [13, 12, 11, 10, 9, 8, 7].map(function (k) { return '<span>' + E.label(k) + '</span>'; }).join('') + [0, 1, 2, 3, 4, 5, 6].map(function (k) { return '<span class="own">' + E.label(k) + '</span>'; }).join('') + '</div><p><b>' + order + '</b></p><p class="note">' + esc(t('variantNote')) + '</p></div>' +
        '<div class="two" style="margin-top:12px">' + sec('classic') + sec('pasu') + sec('six') + sec('multi') + '</div>' +
        '<div class="card" style="margin-top:12px"><h3>' + esc(t('historyH')) + '</h3>' + C.history[lang === 'ta' ? 'ta' : 'en'].map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
    },
    shop: function () {
      var item = function (kind, id, name, sw) {
        var pr = (kind === 'theme' ? THEMES : SEEDS)[id].price, own = P.owned[id], use = (kind === 'theme' ? P.theme : P.seed) === id;
        return '<div class="item"><div class="sw" style="' + sw + '"></div><b>' + esc(name) + '</b><button class="btn sm ' + (own ? '' : 'gold') + '" data-buy="' + kind + ':' + id + '" ' + (use ? 'disabled' : '') + '>' + (use ? esc(t('inUse')) : own ? esc(t('use')) : '<span class="coin"></span> ' + pr) + '</button></div>';
      };
      var tw = function (id) { var w = THEMES[id].wood; return 'background:linear-gradient(135deg,' + w[1] + ',' + w[0] + ' 50%,' + w[2] + ');border:2px solid ' + THEMES[id].rim; };
      return '<p><span class="coin"></span> <b>' + P.coins + '</b> ' + esc(t('coins')) + '</p><p class="note">' + esc(t('coinsNote')) + '</p><h2>' + esc(t('themes')) + '</h2><div class="shopgrid">' +
        ['teak', 'rosewood', 'brass', 'night'].map(function (id) { return item('theme', id, t('th_' + id), tw(id)); }).join('') + '</div><h2>' + esc(t('seedStyles')) + '</h2><div class="shopgrid">' +
        item('seed', 'tamarind', t('sd_tamarind'), 'background:radial-gradient(circle at 30% 40%,#5a2e14 12px,transparent 13px),radial-gradient(circle at 60% 55%,#6a3a18 12px,transparent 13px),#2a170c') +
        item('seed', 'cowrie', t('sd_cowrie'), 'background:radial-gradient(ellipse 14px 10px at 30% 45%,#f4ead2 90%,transparent),radial-gradient(ellipse 14px 10px at 62% 55%,#e9dbb8 90%,transparent),#2a170c') +
        item('seed', 'glass', t('sd_glass'), 'background:radial-gradient(circle at 28% 45%,#3fa7ff 10px,transparent 11px),radial-gradient(circle at 52% 55%,#ff5a7a 10px,transparent 11px),radial-gradient(circle at 75% 42%,#5ad17a 10px,transparent 11px),#2a170c') + '</div>';
    },
    stats: function () {
      var s = P.stats, lang = I.get(), row = function (a, b) { return '<div class="stat"><span>' + esc(a) + '</span><b>' + esc(b) + '</b></div>'; };
      var wl = [1, 2, 3, 4, 5].map(function (l) { return 'L' + l + ': ' + (s.wl[l] || 0); }).join(' · ');
      return '<div class="two"><div class="card">' + row(t('played'), s.played) + row(t('won'), s.won) + row(t('lost'), s.lost) + row(t('drawn'), s.drawn) + row(t('bestCap'), s.bestCap) + row(t('dailies'), s.dailies) + '<p class="note">' + esc(t('won')) + ' — ' + wl + '</p></div>' +
        '<div class="card"><h3>' + esc(t('achievements')) + ' (+50)</h3>' + ACH.map(function (a) { return '<div class="ach ' + (P.ach[a[0]] ? 'got' : '') + '"><span class="i">' + a[1] + '</span><span>' + esc(lang === 'ta' ? a[3] : a[2]) + (P.ach[a[0]] ? ' ✓' : '') + '</span></div>'; }).join('') + '</div></div>' +
        '<div class="card" style="margin-top:12px"><h3>' + esc(t('leaderboard')) + '</h3>' + (P.best.length ? P.best.map(function (b, i) { return row((i + 1) + '. L' + b.lv + ' · ' + t('rs_' + b.rs) + ' · ' + b.d, '+' + b.m); }).join('') : '<p class="note">' + esc(t('none')) + '</p>') + '</div>';
    },
    settings: function () {
      return '<div class="card">' + field(t('language'), seg('lang', [['en', 'English'], ['ta', 'தமிழ்']], I.get())) + field(t('sound'), seg('sound', [[1, t('on')], [0, t('off')]], P.sound ? 1 : 0)) +
        field(t('anim'), seg('speed', SPEEDS.map(function (s) { return [s, t(s)]; }), P.speed)) + field(t('fullscreen'), seg('fullscreen', [[1, t('on')], [0, t('off')]], P.fullscreen ? 1 : 0)) +
        field(t('labels'), seg('labels', [[1, t('on')], [0, t('off')]], P.labels ? 1 : 0)) + '</div><p class="note">' + esc(t('privacy')) + '</p><button class="btn" id="resetAll">' + esc(t('reset')) + '</button>';
    },
    soon: function () {
      return '<div class="card"><h3>' + esc(t('comingSoon')) + '</h3>' + ['cs_online', 'cs_ranked', 'cs_tourn', 'cs_friends', 'cs_accounts'].map(function (k) { return '<div class="stat"><span>' + esc(t(k)) + '</span><b>' + esc(t('comingSoon')) + '</b></div>'; }).join('') + '<p class="note">' + esc(t('needServer')) + '</p></div>';
    }
  };
  var MODE_TITLE = { ai: 'playAI', pass: 'pass', guided: 'guided', practice: 'practice', timed: 'timed', daily: 'daily' };
  function openSetup(mode) {
    var last = P.setup || {};
    setup = { mode: mode, titleKey: MODE_TITLE[mode], ruleset: last.ruleset || 'classic', cfg: last.cfg || {}, level: mode === 'guided' ? 1 : (last.level || 3), starter: mode === 'pass' ? 0 : (last.starter !== undefined ? last.starter : 0) };
    show('setup');
  }
  function bind(name, arg) {
    Array.prototype.forEach.call(document.querySelectorAll('#view [data-go]'), function (b) { b.onclick = function () { var g = b.getAttribute('data-go'); if (MODE_TITLE[g]) openSetup(g); else show(g); }; });
    Array.prototype.forEach.call(document.querySelectorAll('#view [data-seg] button'), function (b) {
      b.onclick = function () {
        var k = b.parentNode.getAttribute('data-seg'), v = b.getAttribute('data-v'), num = /^\d+$/.test(v) ? +v : v;
        if (name === 'setup') {
          if (k === 'ruleset') { setup.ruleset = v; setup.cfg = {}; }
          else if (k === 'level') setup.level = num; else if (k === 'starter') setup.starter = num;
          else if (k === 'pasuBy') setup.cfg.pasuBy = v; else if (k === 'seedsPerPit') setup.cfg.seedsPerPit = num; else setup.cfg[k] = !!num;
          var y = $('#view').scrollTop; show('setup'); $('#view').scrollTop = y;
        } else if (name === 'settings') {
          if (k === 'lang') { P.lang = v; I.set(v); } else if (k === 'speed') P.speed = v; else P[k] = !!num;
          save(); show('settings');
        }
      };
    });
    if (name === 'setup') $('#goStart').onclick = function () {
      ac();
      if (setup.mode === 'daily') { var d = dailyConfig(today()); G = startMatch({ mode: 'daily', ruleset: 'classic', cfg: { seedsPerPit: d.cfg.seedsPerPit, pasu: d.cfg.pasu }, level: d.level, starter: d.starter, daily: d }); }
      else { P.setup = { ruleset: setup.ruleset, cfg: setup.cfg, level: setup.mode === 'guided' ? (P.setup && P.setup.level) || 3 : setup.level, starter: setup.mode === 'pass' ? 0 : setup.starter }; save();
        G = startMatch({ mode: setup.mode, ruleset: setup.ruleset, cfg: setup.cfg, level: setup.mode === 'pass' ? 0 : setup.level, starter: setup.starter }); }
    };
    if (name === 'learn') {
      var st = arg || 0;
      if ($('#tPrev')) $('#tPrev').onclick = function () { show('learn', st - 1); };
      if ($('#tNext')) $('#tNext').onclick = function () { show('learn', st + 1); };
      if ($('#tDone')) $('#tDone').onclick = function () { if (!P.tutorial) { P.tutorial = true; addCoins(100); toast(t('tutDone') + ' · +100'); unlock('learner'); save(); } show('menu'); };
    }
    if (name === 'shop') Array.prototype.forEach.call(document.querySelectorAll('[data-buy]'), function (b) {
      b.onclick = function () { var p = b.getAttribute('data-buy').split(':'), kind = p[0], id = p[1], price = (kind === 'theme' ? THEMES : SEEDS)[id].price;
        if (!P.owned[id]) { if (P.coins < price) return toast(t('notEnough')); P.coins -= price; P.owned[id] = 1; }
        if (kind === 'theme') P.theme = id; else P.seed = id; cacheKey = ''; save(); show('shop'); };
    });
    if (name === 'settings') $('#resetAll').onclick = function () { if (confirm(t('resetQ'))) { var l = P.lang; P = JSON.parse(JSON.stringify(DEF)); P.lang = l; save(); show('settings'); } };
  }
  $('#tbBack').onclick = function () { if (cur === 'game') { if (G && !G.over && !confirm(I.get() === 'ta' ? 'ஆட்டத்தை விட்டு வெளியேறவா?' : 'Leave this match?')) return; quitGame(); } else if (cur === 'setup' || cur === 'learn' || cur === 'rules') show('menu'); else show('menu'); };
  $('#tbLang').onclick = function () { P.lang = I.get() === 'ta' ? 'en' : 'ta'; I.set(P.lang); save(); if (cur === 'game') { show('game'); } else show(cur); };
  $('#tbSound').onclick = function () { P.sound = !P.sound; save(); $('#tbSound').textContent = P.sound ? '🔊' : '🔇'; if (P.sound) SND.tok(); };
  $('#tbCoins').onclick = function () { if (cur !== 'game') show('shop'); };
  window.addEventListener('resize', function () { if (cur === 'game') layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { if (cur === 'game') layout(); }, 300); });

  I.set(P.lang); show('menu');

  /* ---------------- debug / test hook ---------------- */
  window.__pl = {
    state: function () { return G && G.state; }, game: function () { return G; }, show: show, start: function (o) { return !!startMatch(o); },
    move: function (p) { doMove(p); }, legal: function () { return G ? E.getLegalMoves(G.state) : []; }, busy: function () { return anim.running; },
    setSpeed: function (s) { P.speed = s; save(); },
    aiVsAi: function (o) {
      o = o || {}; var prev = P.speed; P.speed = o.speed || 'instant';
      startMatch({ mode: 'ai', ruleset: o.ruleset || 'classic', cfg: o.cfg || {}, levels: o.levels || [3, 3], level: (o.levels || [3, 3])[1], starter: 0, aiVsAi: true });
      return new Promise(function (res) { var id = G.id, iv = setInterval(function () { if (!G || G.id !== id) { clearInterval(iv); return res(null); } if (G.state.status === 'over' && !anim.running) { clearInterval(iv); P.speed = prev; res({ winner: G.state.winner, stores: G.state.stores, moves: G.moves, rounds: G.state.round, total: E.totalSeeds(G.state) }); } }, 100); });
    },
    _pit: function (i) { var p = pitPos(i); return { x: p.x, y: p.y }; },
    reset: function () { localStorage.removeItem(KEY); }
  };
})();
