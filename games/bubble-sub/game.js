/* Bubble Sub: Ocean Quest
 * Self-contained HTML5 Canvas game. No network calls, no ads, no tracking, no analytics.
 * All art is drawn procedurally; all sound is synthesised with WebAudio.
 */
'use strict';
(function () {
  // ---------------------------------------------------------------- canvas / scaling
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  let W = 960, H = 540, SCALE = 1, DPR = 1;
  const MIN_W = 760, MIN_H = 540;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth, ch = window.innerHeight;
    cvs.width = Math.max(1, Math.round(cw * DPR));
    cvs.height = Math.max(1, Math.round(ch * DPR));
    cvs.style.width = cw + 'px';
    cvs.style.height = ch + 'px';
    SCALE = Math.min(cw / MIN_W, ch / MIN_H);
    W = cw / SCALE; H = ch / SCALE;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------------------------------------------------------------- utils
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  const FONT = '"Trebuchet MS", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

  // ---------------------------------------------------------------- save data (localStorage only, never sent anywhere)
  const SAVE_KEY = 'bubbleSub.save.v1';
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
  const save = Object.assign({ high: 0, unlocked: false, sub: 0, diff: 1, muted: false, progress: [1, 1, 1, 1], best: [0, 0, 0, 0] }, loadSave());
  if (!Array.isArray(save.progress) || save.progress.length !== 4) save.progress = [1, 1, 1, 1];
  if (!Array.isArray(save.best) || save.best.length !== 4) save.best = [0, 0, 0, 0];
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: play on without saving */ } }

  // ---------------------------------------------------------------- audio (WebAudio synth)
  let actx = null, master = null;
  function ensureAudio() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        master = actx.createGain();
        master.gain.value = 0.35;
        master.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (save.muted || !actx) return;
    const t = actx.currentTime + (delay || 0);
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, vol, freq) {
    if (save.muted || !actx) return;
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = actx.currentTime;
    const s = actx.createBufferSource(); s.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol || 0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }
  const sfx = {
    click: () => tone(660, 0.07, 'triangle', 0.25),
    shoot: () => { tone(420, 0.16, 'sine', 0.3, 1100); noise(0.12, 0.08, 2500); },
    pearl: () => { tone(988, 0.07, 'triangle', 0.25); tone(1480, 0.12, 'triangle', 0.25, null, 0.05); },
    coin: () => { tone(1175, 0.06, 'square', 0.12); tone(1568, 0.14, 'square', 0.12, null, 0.06); },
    chest: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.25, null, i * 0.06)),
    stun: () => { tone(300, 0.28, 'square', 0.1, 900); tone(600, 0.2, 'sine', 0.15, 300, 0.1); },
    pop: () => tone(700, 0.08, 'sine', 0.2, 300),
    hit: () => { noise(0.3, 0.45, 450); tone(170, 0.3, 'sawtooth', 0.15, 60); },
    oxygen: () => { tone(400, 0.22, 'sine', 0.3, 900); tone(600, 0.22, 'sine', 0.2, 1200, 0.08); },
    repair: () => [392, 523, 659].forEach((f, i) => tone(f, 0.14, 'triangle', 0.25, null, i * 0.07)),
    win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.28, null, i * 0.12)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.25, null, i * 0.18)),
    warn: () => tone(880, 0.09, 'square', 0.08),
    unlock: () => [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.25, 'sine', 0.3, null, i * 0.1)),
  };
  function toggleMute() { save.muted = !save.muted; persist(); if (!save.muted) { ensureAudio(); sfx.click(); } }

  // ---------------------------------------------------------------- content definitions
  const DIFF = [
    { name: 'Easy', speed: 115, dmg: 12, o2: 1.3, spawn: 0.65, inv: 2.2, color: '#52c46b', desc: 'Relaxed pace and gentle bumps. Great for young divers.' },
    { name: 'Normal', speed: 150, dmg: 20, o2: 2.0, spawn: 1.0, inv: 1.6, color: '#ffb703', desc: 'A balanced dive for everyone.' },
    { name: 'Hard', speed: 185, dmg: 30, o2: 2.8, spawn: 1.4, inv: 1.2, color: '#ef476f', desc: 'Fast currents and more hazards. For experts!' },
  ];
  const WORLDS = [
    { name: 'Coral Reef', free: true, top: '#47d1e8', bot: '#0a5f93', far: '#2b97be', mid: '#1f7fa8', sand: '#f4dc93', sand2: '#e2c06d', rays: true, dark: 0,
      hazards: [['jelly', 3], ['puffer', 3], ['mine', 2], ['rock', 2]], desc: 'Sunny reefs, jellyfish and puffers' },
    { name: 'Arctic Ice', free: false, top: '#c6efff', bot: '#2a6aa0', far: '#9ccbe8', mid: '#7fb6db', sand: '#f2f8ff', sand2: '#cfe3f5', rays: true, dark: 0, ceiling: true,
      hazards: [['iceberg', 3], ['icicle', 3], ['floe', 2], ['icejelly', 2], ['mine', 1]], desc: 'Icebergs, falling icicles, drifting floes' },
    { name: 'Deep Trench', free: false, top: '#1d2f66', bot: '#03040c', far: '#152251', mid: '#0f1a3d', sand: '#2b2f4a', sand2: '#1c1f33', rays: false, dark: 0.9,
      hazards: [['angler', 3], ['vent', 2], ['mine', 2], ['rock', 2], ['jelly', 1]], desc: 'Pitch dark! Anglerfish and hot vents' },
    { name: 'Sunken City', free: false, top: '#3cc4ad', bot: '#0b3946', far: '#2a9b8c', mid: '#217e74', sand: '#d9cfa6', sand2: '#b9ad82', rays: true, dark: 0,
      hazards: [['pillar', 3], ['eel', 3], ['statue', 2], ['mine', 1]], desc: 'Ancient ruins, eels and guardian statues' },
  ];
  const LEVELS_PER_WORLD = 3;
  const SUBS = [
    { name: 'Sunny', style: 'classic', body: '#ffd23f', dark: '#e0a400', accent: '#ff6b35', free: true },
    { name: 'Lagoon', style: 'round', body: '#2ec4b6', dark: '#1a8f85', accent: '#ffbf69', free: true },
    { name: 'Coral Dart', style: 'sleek', body: '#ff7aa8', dark: '#d94f80', accent: '#fff3b0', free: false },
    { name: 'Polar', style: 'classic', body: '#f4fbff', dark: '#a9cde6', accent: '#3a86ff', free: false, stripes: true },
    { name: 'Neon Glow', style: 'sleek', body: '#7dff6a', dark: '#2fbf3a', accent: '#00f5d4', free: false, glow: true },
    { name: 'Royal', style: 'round', body: '#8e5bd8', dark: '#5f35a3', accent: '#ffd23f', free: false },
  ];
  const worldAvailable = (w) => WORLDS[w].free || save.unlocked;
  const subAvailable = (s) => SUBS[s].free || save.unlocked;
  if (!subAvailable(save.sub)) save.sub = 0;

  // ---------------------------------------------------------------- drawing helpers
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(str, x, y, size, color, align, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    if (opts.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = opts.strokeW || size * 0.18; ctx.strokeStyle = opts.stroke; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color || '#fff';
    ctx.fillText(str, x, y);
  }
  function wrap(str, x, y, maxW, size, color, lineH, align) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    const words = str.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      ctx.font = 'bold ' + size + 'px ' + FONT;
      if (ctx.measureText(test).width > maxW && line) { text(line, x, yy, size, color, align); line = w; yy += lineH; }
      else line = test;
    }
    if (line) text(line, x, yy, size, color, align);
    return yy + lineH;
  }
  function drawLock(x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = color || '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -4, 7, Math.PI, 0); ctx.lineTo(7, 2); ctx.moveTo(-7, -4); ctx.lineTo(-7, 2); ctx.stroke();
    ctx.fillStyle = color || '#fff'; rr(-10, 0, 20, 15, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(0, 6, 2.5, 0, 7); ctx.fill(); ctx.fillRect(-1.2, 6, 2.4, 5);
    ctx.restore();
  }
  function drawStar(x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill();
  }

  // ---------------------------------------------------------------- UI buttons (rebuilt every frame)
  let buttons = [];
  const mouse = { x: -999, y: -999 };
  let isTouch = false;
  function btn(x, y, w, h, label, onClick, o) {
    o = o || {};
    const hover = !isTouch && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    const col = o.disabled ? '#7a8a99' : (o.color || '#ffb703');
    const r = o.radius != null ? o.radius : Math.min(18, h * 0.35);
    ctx.save();
    const lift = hover && !o.disabled && onClick ? -2 : 0;
    ctx.fillStyle = 'rgba(0,20,40,0.35)'; rr(x, y + 4, w, h, r); ctx.fill();
    ctx.fillStyle = col; rr(x, y + lift, w, h, r); ctx.fill();
    const g = ctx.createLinearGradient(0, y + lift, 0, y + lift + h);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.5, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g; rr(x, y + lift, w, h, r); ctx.fill();
    if (o.selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(x - 3, y + lift - 3, w + 6, h + 6, r + 3); ctx.stroke(); }
    ctx.restore();
    if (label) {
      const size = o.size || Math.min(26, h * 0.45);
      let lx = x + w / 2;
      if (o.lock) { drawLock(x + 22, y + lift + h / 2 - 2, 0.85, '#fff'); lx += 12; }
      text(label, lx, y + lift + h / 2 + 1, size, o.textColor || '#fff', 'center', { stroke: 'rgba(0,0,0,0.35)', strokeW: size * 0.16 });
    }
    if (onClick) buttons.push({ x, y, w, h, onClick, disabled: o.disabled });
  }
  function iconBtn(x, y, s, kind, onClick) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,30,60,0.45)'; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    if (kind === 'pause') { ctx.fillRect(x - s * 0.32, y - s * 0.38, s * 0.22, s * 0.76); ctx.fillRect(x + s * 0.1, y - s * 0.38, s * 0.22, s * 0.76); }
    else {
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.18); ctx.lineTo(x - s * 0.25, y - s * 0.18); ctx.lineTo(x + s * 0.05, y - s * 0.45);
      ctx.lineTo(x + s * 0.05, y + s * 0.45); ctx.lineTo(x - s * 0.25, y + s * 0.18); ctx.lineTo(x - s * 0.5, y + s * 0.18); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      if (kind === 'sound') { ctx.beginPath(); ctx.arc(x + s * 0.1, y, s * 0.3, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x + s * 0.1, y, s * 0.52, -0.8, 0.8); ctx.stroke(); }
      else { ctx.strokeStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(x + s * 0.2, y - s * 0.25); ctx.lineTo(x + s * 0.6, y + s * 0.25); ctx.moveTo(x + s * 0.6, y - s * 0.25); ctx.lineTo(x + s * 0.2, y + s * 0.25); ctx.stroke(); }
    }
    ctx.restore();
    buttons.push({ x: x - s, y: y - s, w: s * 2, h: s * 2, onClick });
  }
  function panel(x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,15,35,0.35)'; rr(x, y + 6, w, h, 24); ctx.fill();
    ctx.fillStyle = color || 'rgba(10,60,100,0.92)'; rr(x, y, w, h, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; rr(x, y, w, h, 24); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- submarine art
  function porthole(x, y, r, sub, face) {
    ctx.fillStyle = sub.dark; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, '#e9fdff'); g.addColorStop(1, '#5cc8e8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (face) { // friendly pilot
      ctx.fillStyle = '#ffd9b3'; ctx.beginPath(); ctx.arc(x + 1, y + 2, r * 0.55, 0, 7); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x - 1.5, y + 1, 1.3, 0, 7); ctx.arc(x + 4, y + 1, 1.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + 1.2, y + 3.5, 2.5, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = sub.accent; ctx.beginPath(); ctx.arc(x + 1, y - 1, r * 0.58, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, 7); ctx.fill();
  }
  function drawSub(x, y, s, sub, tilt, t, alpha) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt || 0); ctx.scale(s, s);
    if (alpha != null) ctx.globalAlpha = alpha;
    if (sub.glow) { ctx.shadowColor = sub.accent; ctx.shadowBlur = 18; }
    const prop = Math.sin(t * 30);
    const px = sub.style === 'sleek' ? -46 : sub.style === 'round' ? -34 : -40;
    ctx.fillStyle = sub.dark; ctx.fillRect(px, -3, 8, 6);
    ctx.fillStyle = sub.accent;
    ctx.beginPath(); ctx.ellipse(px - 2, -7 * prop, 3.5, 8 * Math.abs(prop) + 1, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px - 2, 7 * prop, 3.5, 8 * Math.abs(prop) + 1, 0, 0, 7); ctx.fill();
    const body = ctx.createLinearGradient(0, -24, 0, 24);
    body.addColorStop(0, sub.body); body.addColorStop(1, sub.dark);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    if (sub.style === 'classic') {
      ctx.fillStyle = sub.accent;
      ctx.beginPath(); ctx.moveTo(-28, -6); ctx.lineTo(-40, -18); ctx.lineTo(-34, -4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-28, 6); ctx.lineTo(-40, 18); ctx.lineTo(-34, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; rr(-10, -31, 22, 18, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = sub.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -31); ctx.lineTo(4, -40); ctx.lineTo(11, -40); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 37, 18, 0, 0, 7); ctx.fill(); ctx.stroke();
      if (sub.stripes) { ctx.fillStyle = sub.accent; ctx.fillRect(-22, -16, 6, 32); ctx.fillRect(-12, -17.5, 4, 35); }
      for (let i = 0; i < 3; i++) porthole(-2 + i * 13, -1, 5.2, sub);
    } else if (sub.style === 'round') {
      ctx.fillStyle = sub.accent;
      ctx.beginPath(); ctx.moveTo(-22, -10); ctx.lineTo(-34, -20); ctx.lineTo(-30, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-22, 10); ctx.lineTo(-34, 20); ctx.lineTo(-30, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; rr(-6, -30, 14, 10, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 23, 0, 0, 7); ctx.fill(); ctx.stroke();
      porthole(6, -2, 12, sub, true);
      ctx.fillStyle = sub.accent; ctx.beginPath(); ctx.arc(-14, 10, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-5, 16, 2.5, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = sub.accent;
      ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-24, -26); ctx.lineTo(8, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-34, 4); ctx.lineTo(-44, 16); ctx.lineTo(-26, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(-42, 0); ctx.bezierCurveTo(-42, -16, 10, -17, 30, -9); ctx.quadraticCurveTo(48, 0, 30, 9);
      ctx.bezierCurveTo(10, 17, -42, 16, -42, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(160,240,255,0.95)'; rr(2, -9, 26, 9, 4.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; rr(6, -8, 8, 3, 1.5); ctx.fill();
      ctx.fillStyle = sub.accent; ctx.fillRect(-30, 2, 40, 3);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-6, -11, 16, 4, -0.1, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- world terrain
  function groundY(wx, w) {
    const base = w === 2 ? 70 : 58;
    return H - base - 18 * Math.sin(wx * 0.0042 + w) - 11 * Math.sin(wx * 0.011 + 1.3 * w);
  }
  function ceilY(wx, w) {
    if (w === 1) return 46 + 9 * Math.sin(wx * 0.017) + 6 * Math.sin(wx * 0.041);
    return 62;
  }

  // ---------------------------------------------------------------- background rendering
  const ambient = [];
  for (let i = 0; i < 60; i++) ambient.push({ x: Math.random(), y: Math.random(), s: rand(1, 3.2), sp: rand(8, 30), ph: rand(0, 6) });
  const pick2 = (i, arr) => arr[Math.floor(hash(i * 1.91) * arr.length)];

  function drawBG(w, camX, t) {
    const wd = WORLDS[w];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, wd.top); g.addColorStop(1, wd.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (wd.rays) {
      ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const span = W + 300;
        const bx = (((i * 230 - camX * 0.1) % span) + span) % span - 150 + Math.sin(t * 0.5 + i) * 20;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 60, 0); ctx.lineTo(bx + 200, H); ctx.lineTo(bx + 90, H); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    const fx = camX * 0.25;
    ctx.fillStyle = wd.far; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, H - 150 - 45 * Math.sin((x + fx) * 0.005 + w) - 25 * Math.sin((x + fx) * 0.013));
    ctx.lineTo(W + 20, H); ctx.closePath(); ctx.fill();
    const mx = camX * 0.5;
    if (w === 3) {
      const seg = 140, i0 = Math.floor(mx / seg) - 1, i1 = Math.floor((mx + W) / seg) + 1;
      for (let i = i0; i <= i1; i++) {
        const h = hash(i * 3.7), bx = i * seg - mx, bh = 90 + h * 150, bw = 70 + hash(i) * 50;
        ctx.fillStyle = wd.mid;
        ctx.fillRect(bx, H - 60 - bh, bw, bh + 60);
        if (h > 0.5) { ctx.beginPath(); ctx.moveTo(bx - 6, H - 60 - bh); ctx.lineTo(bx + bw / 2, H - 100 - bh); ctx.lineTo(bx + bw + 6, H - 60 - bh); ctx.fill(); }
        ctx.fillStyle = 'rgba(0,40,40,0.35)';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const wy = H - 40 - bh + 25 + r * 34; if (wy < H - 90) { rr(bx + 14 + c * (bw - 42), wy, 14, 20, 7); ctx.fill(); } }
      }
    } else if (w === 2) {
      ctx.fillStyle = wd.mid;
      const seg = 110, i0 = Math.floor(mx / seg) - 1, i1 = Math.floor((mx + W) / seg) + 1;
      for (let i = i0; i <= i1; i++) {
        const h = hash(i * 1.3), bx = i * seg - mx;
        ctx.beginPath(); ctx.moveTo(bx - 40, H); ctx.lineTo(bx, H - 140 - h * 200); ctx.lineTo(bx + 30, H); ctx.fill();
      }
    } else if (w === 1) {
      ctx.fillStyle = 'rgba(230,248,255,0.45)';
      const seg = 260, i0 = Math.floor(mx / seg) - 1, i1 = Math.floor((mx + W) / seg) + 1;
      for (let i = i0; i <= i1; i++) {
        const h = hash(i * 2.1), bx = i * seg - mx;
        ctx.beginPath(); ctx.moveTo(bx - 60, 40); ctx.lineTo(bx + 90, 40); ctx.lineTo(bx + 30 + h * 30, 120 + h * 140); ctx.lineTo(bx - 10, 100 + h * 60); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = wd.mid;
      const seg = 180, i0 = Math.floor(mx / seg) - 1, i1 = Math.floor((mx + W) / seg) + 1;
      for (let i = i0; i <= i1; i++) {
        const h = hash(i * 5.3), bx = i * seg - mx;
        ctx.beginPath(); ctx.ellipse(bx, H - 80, 60 + h * 40, 50 + h * 50, 0, Math.PI, 0); ctx.fill();
      }
    }
    ctx.fillStyle = w === 2 ? 'rgba(160,200,255,0.5)' : 'rgba(255,255,255,0.45)';
    for (const p of ambient) {
      const px = (((p.x * W - camX * 0.7 * (p.s / 3)) % W) + W) % W;
      const py = (((p.y * H - t * p.sp) % H) + H) % H;
      ctx.beginPath(); ctx.arc(px + Math.sin(t + p.ph) * 4, py, p.s, 0, 7); ctx.fill();
    }
    drawDecor(w, camX, t);
    const sg = ctx.createLinearGradient(0, H - 100, 0, H);
    sg.addColorStop(0, wd.sand); sg.addColorStop(1, wd.sand2);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, groundY(camX + x, w));
    ctx.lineTo(W + 16, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = Math.floor(camX / 40); i < (camX + W) / 40 + 1; i++) {
      const x = i * 40 - camX + hash(i) * 20, y = groundY(i * 40, w) + 12 + hash(i + 9) * 25;
      ctx.beginPath(); ctx.ellipse(x, y, 6 + hash(i + 3) * 8, 2.5, 0, 0, 7); ctx.fill();
    }
    if (wd.ceiling) {
      ctx.fillStyle = '#eaf8ff'; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, ceilY(camX + x, w));
      ctx.lineTo(W + 12, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#9fd3f0'; ctx.lineWidth = 3; ctx.beginPath();
      for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, ceilY(camX + x, w));
      ctx.stroke();
    }
  }
  function drawDecor(w, camX, t) {
    const seg = 70, i0 = Math.floor(camX / seg) - 1, i1 = Math.floor((camX + W) / seg) + 1;
    for (let i = i0; i <= i1; i++) {
      const h = hash(i * 7.77 + w * 100), wx = i * seg + h * 40, x = wx - camX, gy = groundY(wx, w) + 6;
      const k = hash(i * 3.3 + w);
      if (w === 0) {
        if (k < 0.4) seaweed(x, gy, 40 + h * 50, '#3dbb5c', t, i);
        else if (k < 0.7) coral(x, gy, 26 + h * 26, pick2(i, ['#ff6f91', '#ff9671', '#ffc75f', '#d65db1']));
        else if (k < 0.85) starfish(x, gy - 4, '#ff8c42', i);
        else shell(x, gy - 3);
      } else if (w === 1) {
        if (k < 0.45) crystal(x, gy, 18 + h * 26);
        else if (k < 0.7) seaweed(x, gy, 30 + h * 30, '#4fa58a', t, i);
        else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, gy, 26 + h * 14, 10, 0, Math.PI, 0); ctx.fill(); }
      } else if (w === 2) {
        if (k < 0.4) {
          for (let j = 0; j < 3; j++) {
            const tx = x + j * 7 - 7, th = 18 + hash(i + j) * 26;
            ctx.strokeStyle = '#d9d9e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, gy); ctx.lineTo(tx + Math.sin(t + j) * 2, gy - th); ctx.stroke();
            ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(tx + Math.sin(t + j) * 2, gy - th, 4, 0, 7); ctx.fill();
          }
        } else if (k < 0.65) { ctx.fillStyle = '#3a3f62'; ctx.beginPath(); ctx.moveTo(x - 18, gy); ctx.lineTo(x - 4, gy - 30 - h * 30); ctx.lineTo(x + 14, gy); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(120,255,220,0.8)'; ctx.beginPath(); ctx.arc(x, gy - 4, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 9, gy - 2, 2, 0, 7); ctx.fill(); }
      } else {
        if (k < 0.35) seaweed(x, gy, 40 + h * 40, '#2f9e6e', t, i);
        else if (k < 0.6) {
          ctx.fillStyle = '#cfc3a0'; rr(x - 22, gy - 14, 44, 16, 4); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + j * 12, gy - 13); ctx.lineTo(x + j * 12, gy + 1); ctx.stroke(); }
        } else if (k < 0.75) { ctx.fillStyle = '#e8c547'; ctx.beginPath(); ctx.ellipse(x, gy - 3, 7, 4, 0, 0, 7); ctx.fill(); }
        else coral(x, gy, 22 + h * 16, '#ff9671');
      }
    }
  }
  function seaweed(x, y, h, color, t, i) {
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let s = 0; s < 2; s++) {
      ctx.beginPath(); ctx.moveTo(x + s * 8, y);
      for (let k = 1; k <= 5; k++) ctx.lineTo(x + s * 8 + Math.sin(t * 1.5 + k * 0.8 + i + s) * k * 2.2, y - (h * k) / 5);
      ctx.stroke();
    }
  }
  function coral(x, y, h, color) {
    ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h);
    ctx.moveTo(x, y - h * 0.4); ctx.lineTo(x - h * 0.4, y - h * 0.8);
    ctx.moveTo(x, y - h * 0.55); ctx.lineTo(x + h * 0.45, y - h * 0.95); ctx.stroke();
    ctx.fillStyle = color;
    [[0, -h], [-h * 0.4, -h * 0.8], [h * 0.45, -h * 0.95]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, 7); ctx.fill(); });
  }
  function starfish(x, y, color, i) { ctx.save(); ctx.translate(x, y); ctx.rotate(hash(i) * 2); drawStar(0, 0, 11, color); ctx.restore(); }
  function shell(x, y) {
    ctx.fillStyle = '#ffe1e8'; ctx.beginPath(); ctx.arc(x, y, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f4a6b8'; ctx.lineWidth = 1.5;
    for (let a = 0; a < 5; a++) { const an = Math.PI + (a + 0.5) * Math.PI / 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * 9, y + Math.sin(an) * 9); ctx.stroke(); }
  }
  function crystal(x, y, h) {
    ctx.fillStyle = 'rgba(200,240,255,0.9)'; ctx.strokeStyle = '#7cc3ea'; ctx.lineWidth = 2;
    [[-8, 0.7], [0, 1], [8, 0.6]].forEach(([dx, k]) => {
      ctx.beginPath(); ctx.moveTo(x + dx - 5, y); ctx.lineTo(x + dx, y - h * k); ctx.lineTo(x + dx + 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }
  function drawFish(x, y, color, t) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, 18, 11, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 28, y - 9 + Math.sin(t * 8) * 2); ctx.lineTo(x + 28, y + 9 + Math.sin(t * 8) * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 8, y - 2, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - 9, y - 2, 2, 0, 7); ctx.fill();
  }
  function glowDot(x, y, r, color) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }

  // ---------------------------------------------------------------- game session
  let state = 'title';   // title | worlds | levels | hangar | parents | play | pause | levelDone | gameOver
  let overlay = null;    // { type: 'gate' | 'demo' | 'msg', ... }
  let G = null;
  let selWorld = 0;
  const keys = {};
  let fireRequested = false;
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const fireTouches = new Set();
  let menuT = 0;

  function startLevel(world, level, keepScore) {
    const D = DIFF[save.diff];
    const carried = keepScore && G ? G.score : 0;
    G = {
      world, level, score: carried,
      hull: 100, o2: 100, dist: 0,
      len: 4200 + 800 * (level - 1),
      speed: D.speed * (1 + 0.06 * (level - 1)),
      ents: [], shots: [], parts: [], texts: [],
      player: { x: 150, y: H * 0.45, vx: 0, vy: 0, inv: 1.2, cool: 0, tilt: 0, bub: 0 },
      timers: { haz: 1.6, tre: 0.8, oxy: 5 },
      shake: 0, time: 0, warnT: 0, pearls: 0, stuns: 0, bonus: 0, stars: 0, newHigh: false,
    };
    joy.id = null; fireTouches.clear();
    state = 'play';
  }

  function spawnHazard() {
    const w = G.world, list = WORLDS[w].hazards;
    let total = 0; list.forEach((h) => (total += h[1]));
    let r = Math.random() * total, type = list[0][0];
    for (const h of list) { r -= h[1]; if (r <= 0) { type = h[0]; break; } }
    const x = W + 80, wx = G.dist + x;
    const top = ceilY(wx, w) + 30, bot = groundY(wx, w) - 30;
    const e = { type, x, y: rand(top + 20, bot - 20), t: rand(0, 6), r: 20, harm: true, stun: true, stunned: false, st: 0, vx: 0, vy: 0 };
    switch (type) {
      case 'jelly': case 'icejelly': e.r = 20; e.by = clamp(e.y, top + 40, bot - 40); e.vx = type === 'icejelly' ? -25 : -10; break;
      case 'puffer': e.r = 19; e.by = e.y; e.vx = -55; break;
      case 'mine': e.r = 17; e.y = rand(top + 40, bot - 10); break;
      case 'rock': e.stun = false; e.r = rand(28, 46); e.y = groundY(wx, w) - e.r * 0.35; if (Math.random() < 0.25) e.y = ceilY(wx, w) - 10 + e.r * 0.4; break;
      case 'iceberg': e.stun = false; e.rect = true; e.w = rand(60, 100); e.h = rand(110, Math.max(120, (bot - top) * 0.55)); e.y = ceilY(wx, w) - 10; break;
      case 'icicle': e.r = 11; e.y = ceilY(wx, w) + 14; e.falling = false; break;
      case 'floe': e.stun = false; e.r = 28; e.by = (top + bot) / 2; e.amp = (bot - top) * 0.38; e.y = e.by; break;
      case 'angler': e.r = 23; e.vx = -35; break;
      case 'vent': e.stun = false; e.r = 22; e.y = groundY(wx, w) - 10; break;
      case 'eel': e.r = 16; e.amp = rand(40, 80); e.by = clamp(e.y, top + e.amp, bot - e.amp); e.vx = -45; break;
      case 'statue': e.r = 26; e.y = groundY(wx, w) - 34; e.cd = 1.0; break;
      case 'pillar':
        e.stun = false; e.rect = true; e.w = 52; e.h = rand(120, Math.max(130, (bot - top) * 0.6));
        e.fromTop = Math.random() < 0.35; e.y = e.fromTop ? ceilY(wx, w) - 10 : groundY(wx, w) + 10 - e.h;
        break;
    }
    G.ents.push(e);
  }
  function addPickup(kind, x, y) {
    const r = { pearl: 10, coin: 12, chest: 18, oxy: 17, repair: 15 }[kind];
    G.ents.push({ type: kind, pickup: true, x, y, by: y, r, t: rand(0, 6) });
  }
  function spawnTreasure() {
    const x = W + 60, wx = G.dist + x;
    const top = ceilY(wx, G.world) + 50, bot = groundY(wx, G.world) - 45;
    const y = rand(top, bot), roll = Math.random();
    if (roll < 0.55) { const n = randi(3, 5), arc = rand(-1, 1); for (let i = 0; i < n; i++) addPickup('pearl', x + i * 34, clamp(y + Math.sin((i / (n - 1)) * Math.PI) * 40 * arc, top, bot)); }
    else if (roll < 0.85) addPickup('coin', x, y);
    else if (roll < 0.93) addPickup('chest', x, y);
    else addPickup(G.hull < 100 ? 'repair' : 'coin', x, y);
  }

  function fire() {
    const P = G.player;
    G.shots.push({ x: P.x + 40, y: P.y + Math.sin(P.tilt) * 30, vx: 520, life: 1.4, r: 9 });
    sfx.shoot();
  }
  function burst(x, y, n, color, kind) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 160);
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), max: 0.9, color, size: rand(2, 5), kind: kind || 'dot' });
    }
  }
  function floatText(str, x, y, color) { G.texts.push({ str, x, y, life: 1.1, color: color || '#fff' }); }
  function circleHit(a, b, pad) { const dx = a.x - b.x, dy = a.y - b.y, r = a.r + b.r - (pad || 0); return dx * dx + dy * dy < r * r; }
  function rectHit(e, c, r) {
    const rx = e.x - e.w * 0.32, rw = e.w * 0.64;
    const nx = clamp(c.x, rx, rx + rw), ny = clamp(c.y, e.y, e.y + e.h);
    const dx = c.x - nx, dy = c.y - ny; return dx * dx + dy * dy < r * r;
  }

  function stunEnemy(e) {
    e.stunned = true; e.st = 0;
    const pts = e.type === 'mine' ? 20 : 15;
    G.score += pts; G.stuns++;
    const word = e.type === 'mine' ? 'Defused' : e.type === 'icicle' ? 'Shattered' : 'Stunned';
    floatText(word + ' +' + pts, e.x, e.y - 24, '#bdf7ff');
    burst(e.x, e.y, 10, '#ffffff', 'star');
    sfx.stun();
    if (e.type === 'icicle') e.dead = true;
  }
  function hurt(e) {
    const P = G.player, D = DIFF[save.diff];
    let dmg = D.dmg;
    if (e && (e.type === 'orb' || e.type === 'icicle')) { dmg *= 0.6; e.dead = true; }
    G.hull -= dmg; P.inv = D.inv; G.shake = 0.35;
    sfx.hit(); burst(P.x, P.y, 14, '#ffe08a');
    floatText(pick(['Bonk!', 'Oops!', 'Bump!']), P.x, P.y - 30, '#ffd166');
    if (e) { const dx = P.x - e.x, dy = P.y - e.y, m = Math.hypot(dx, dy) || 1; P.vx += (dx / m) * 220; P.vy += (dy / m) * 220; }
  }
  function collect(e) {
    e.dead = true;
    switch (e.type) {
      case 'pearl': G.score += 10; G.pearls++; sfx.pearl(); floatText('+10', e.x, e.y - 14, '#fff'); burst(e.x, e.y, 6, '#ffffff'); break;
      case 'coin': G.score += 25; sfx.coin(); floatText('+25', e.x, e.y - 14, '#ffe066'); burst(e.x, e.y, 8, '#ffd23f'); break;
      case 'chest': G.score += 100; sfx.chest(); floatText('Treasure! +100', e.x, e.y - 20, '#ffe066'); burst(e.x, e.y, 18, '#ffd23f', 'star'); break;
      case 'oxy': G.o2 = Math.min(100, G.o2 + 32); sfx.oxygen(); floatText('Air +32', e.x, e.y - 18, '#9ff3ff'); burst(e.x, e.y, 10, '#c8f8ff'); break;
      case 'repair': G.hull = Math.min(100, G.hull + 25); sfx.repair(); floatText('Repair +25', e.x, e.y - 18, '#9dff9d'); burst(e.x, e.y, 10, '#9dff9d'); break;
    }
  }

  function updateGame(dt) {
    const D = DIFF[save.diff], P = G.player, w = G.world;
    G.time += dt;
    G.dist += G.speed * dt;
    let ix = 0, iy = 0;
    if (keys.arrowleft || keys.a) ix -= 1;
    if (keys.arrowright || keys.d) ix += 1;
    if (keys.arrowup || keys.w) iy -= 1;
    if (keys.arrowdown || keys.s) iy += 1;
    if (joy.id !== null) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy), R = 55;
      if (m > 6) { ix = dx / Math.max(m, R); iy = dy / Math.max(m, R); }
    }
    const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    const MS = 270, k = Math.min(1, dt * 6);
    P.vx += (ix * MS - P.vx) * k; P.vy += (iy * MS - P.vy) * k;
    P.x += P.vx * dt; P.y += P.vy * dt;
    const wxp = G.dist + P.x;
    P.x = clamp(P.x, 50, W * 0.62);
    P.y = clamp(P.y, ceilY(wxp, w) + 24, groundY(wxp, w) - 20);
    P.tilt += ((P.vy / MS) * 0.35 - P.tilt) * Math.min(1, dt * 8);
    P.inv -= dt;
    P.cool -= dt;
    if ((keys[' '] || fireTouches.size > 0 || fireRequested) && P.cool <= 0) { fire(); P.cool = 0.3; }
    fireRequested = false;
    P.bub -= dt;
    if (P.bub <= 0) { P.bub = 0.08; G.parts.push({ x: P.x - 44, y: P.y + rand(-4, 4), vx: rand(-60, -20), vy: rand(-30, -10), life: 0.8, max: 0.8, color: 'rgba(255,255,255,0.7)', size: rand(1.5, 3.5), kind: 'bubble' }); }
    G.o2 -= D.o2 * (1 + 0.08 * (G.level - 1)) * dt;
    if (G.o2 <= 0) { G.o2 = 0; G.hull -= 7 * dt; }
    if (G.o2 < 25) { G.warnT -= dt; if (G.warnT <= 0) { sfx.warn(); G.warnT = 1.2; } }
    const remaining = G.len - G.dist;
    G.timers.haz -= dt;
    if (G.timers.haz <= 0 && remaining > 500) { spawnHazard(); G.timers.haz = rand(1.0, 1.9) / (D.spawn * (1 + 0.15 * (G.level - 1))); }
    G.timers.tre -= dt;
    if (G.timers.tre <= 0 && remaining > 300) { spawnTreasure(); G.timers.tre = rand(1.1, 2.0); }
    G.timers.oxy -= dt;
    if (G.timers.oxy <= 0 && remaining > 300) {
      addPickup('oxy', W + 60, rand(ceilY(G.dist + W, w) + 60, groundY(G.dist + W, w) - 60));
      G.timers.oxy = rand(6, 8) * (save.diff === 0 ? 0.85 : save.diff === 2 ? 1.15 : 1);
    }
    const newEnts = [];
    for (const e of G.ents) {
      e.t += dt;
      e.x -= G.speed * dt;
      if (e.pickup) {
        e.y = e.by + Math.sin(e.t * 2.5) * 5;
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 70) { e.x += (dx / d) * 120 * dt; e.by += (dy / d) * 120 * dt; } // gentle magnet: easier for small fingers
        if (circleHit(e, { x: P.x, y: P.y, r: 22 })) collect(e);
        continue;
      }
      if (e.stunned) {
        e.st += dt;
        if (e.type === 'mine') e.y += 30 * dt; else { e.y -= 40 * dt; e.x += 20 * dt; }
        if (e.st > 3) e.dead = true;
        continue;
      }
      switch (e.type) {
        case 'jelly': case 'icejelly': e.x += e.vx * dt; e.y = e.by + Math.sin(e.t * 1.6) * 35; break;
        case 'puffer': e.x += e.vx * dt; e.y = e.by + Math.sin(e.t * 3) * 10; e.puff = Math.abs(e.x - P.x) < 140 && Math.abs(e.y - P.y) < 120; break;
        case 'floe': e.y = e.by + Math.sin(e.t * 1.1) * e.amp; break;
        case 'angler': e.x += e.vx * dt; if (e.x > P.x + 30) e.y += clamp(P.y - e.y, -1, 1) * 45 * dt; break;
        case 'eel': e.x += e.vx * dt; e.y = e.by + Math.sin(e.t * 2.4) * e.amp; break;
        case 'icicle':
          if (!e.falling && e.x - P.x < 170 && e.x > P.x - 40) e.falling = true;
          if (e.falling) { e.vy += 520 * dt; e.y += e.vy * dt; if (e.y > groundY(G.dist + e.x, w) - 5) { e.dead = true; burst(e.x, e.y, 8, '#e6f7ff'); } }
          break;
        case 'vent':
          if (Math.random() < dt * 25) G.parts.push({ x: e.x + rand(-8, 8), y: e.y - 20, vx: rand(-10, 10), vy: rand(-140, -90), life: rand(1, 2), max: 2, color: 'rgba(255,200,150,0.6)', size: rand(2, 5), kind: 'bubble' });
          if (Math.abs(P.x - e.x) < 34 && P.y < e.y) P.y = Math.max(ceilY(wxp, w) + 24, P.y - 95 * dt); // warm current pushes you up (no damage)
          break;
        case 'statue':
          e.cd -= dt;
          if (e.cd <= 0 && e.x < W - 30 && e.x > P.x + 80) {
            e.cd = 2.6 / D.spawn;
            const dy = P.y - (e.y - 10), dx = P.x - e.x, m = Math.hypot(dx, dy) || 1;
            newEnts.push({ type: 'orb', x: e.x - 20, y: e.y - 10, r: 9, harm: true, stun: true, vx: (dx / m) * 140, vy: (dy / m) * 140, t: 0 });
          }
          break;
        case 'orb': e.x += e.vx * dt; e.y += e.vy * dt; break;
      }
      if (e.harm && P.inv <= 0 && !e.dead) {
        const hit = e.rect ? rectHit(e, P, 20) : circleHit(e, { x: P.x, y: P.y, r: 18 }, 4);
        if (hit) hurt(e);
      }
    }
    for (const n of newEnts) G.ents.push(n);
    for (const s of G.shots) {
      s.x += s.vx * dt; s.life -= dt;
      if (s.x > W + 30) s.life = 0;
      for (const e of G.ents) {
        if (e.pickup || e.dead || e.stunned || s.life <= 0) continue;
        const hit = e.rect ? rectHit(e, s, s.r) : circleHit(e, s);
        if (!hit) continue;
        s.life = 0;
        if (e.type === 'orb') { e.dead = true; G.score += 5; burst(e.x, e.y, 6, '#e0b3ff'); sfx.pop(); }
        else if (e.stun) stunEnemy(e);
        else { burst(s.x, s.y, 5, '#ffffff'); sfx.pop(); }
      }
    }
    G.shots = G.shots.filter((s) => s.life > 0);
    G.ents = G.ents.filter((e) => !e.dead && e.x > -200 && e.y < H + 100 && e.y > -400);
    for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.kind !== 'bubble') { p.vx *= 0.95; p.vy *= 0.95; } }
    G.parts = G.parts.filter((p) => p.life > 0);
    for (const tx of G.texts) { tx.y -= 40 * dt; tx.life -= dt; }
    G.texts = G.texts.filter((tx) => tx.life > 0);
    G.shake = Math.max(0, G.shake - dt);
    if (G.hull <= 0) { G.hull = 0; endGame(); }
    else if (G.dist >= G.len) levelComplete();
  }

  function levelComplete() {
    G.bonus = Math.round(G.hull * 1.5 + G.o2 * 1.5);
    G.score += G.bonus;
    G.newHigh = G.score > save.high;
    save.high = Math.max(save.high, G.score);
    save.best[G.world] = Math.max(save.best[G.world], G.score);
    save.progress[G.world] = Math.min(LEVELS_PER_WORLD, Math.max(save.progress[G.world], G.level + 1));
    G.stars = 1 + (G.hull >= 50 ? 1 : 0) + (G.hull >= 85 ? 1 : 0);
    persist();
    sfx.win();
    state = 'levelDone';
  }
  function endGame() {
    G.newHigh = G.score > save.high;
    save.high = Math.max(save.high, G.score);
    save.best[G.world] = Math.max(save.best[G.world], G.score);
    persist();
    sfx.lose();
    state = 'gameOver';
  }
  function pauseGame() { if (state === 'play') { state = 'pause'; joy.id = null; fireTouches.clear(); } }
  function resumeGame() { if (state === 'pause') state = 'play'; }

  // ---------------------------------------------------------------- entity art
  function face(x, y, stunned, s) {
    s = s || 1;
    if (stunned) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.8;
      [-6, 6].forEach((dx) => { ctx.beginPath(); ctx.moveTo(x + dx * s - 3, y - 3); ctx.lineTo(x + dx * s + 3, y + 3); ctx.moveTo(x + dx * s + 3, y - 3); ctx.lineTo(x + dx * s - 3, y + 3); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(x, y + 7 * s, 3 * s, 0, 7); ctx.stroke();
      return;
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 6 * s, y, 4.5 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 6 * s, y, 4.5 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - 7 * s, y + 0.5, 2.3 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 5 * s, y + 0.5, 2.3 * s, 0, 7); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y + 5 * s, 3 * s, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  function drawEntity(e) {
    const x = e.x, y = e.y;
    ctx.save();
    if (e.stunned) ctx.globalAlpha = Math.max(0, 1 - e.st / 3);
    switch (e.type) {
      case 'pearl': {
        const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, e.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f3e9ff'); g.addColorStop(1, '#c9b6e4');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, e.r, 0, 7); ctx.fill();
        if (Math.sin(e.t * 4) > 0.6) drawStar(x + 6, y - 6, 4, '#fff');
        break;
      }
      case 'coin': {
        const sx = Math.abs(Math.cos(e.t * 3)) * 0.8 + 0.2;
        ctx.translate(x, y); ctx.scale(sx, 1);
        ctx.fillStyle = '#e0a400'; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, e.r - 3, 0, 7); ctx.fill();
        drawStar(0, 0, 6, '#fff3b0');
        break;
      }
      case 'chest': {
        ctx.translate(x, y);
        ctx.fillStyle = '#8b5a2b'; rr(-18, -8, 36, 22, 4); ctx.fill();
        ctx.fillStyle = '#a86b32'; ctx.beginPath(); ctx.moveTo(-18, -6); ctx.quadraticCurveTo(0, -24, 18, -6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(-18, -7, 36, 4); ctx.fillRect(-3, -9, 6, 12);
        ctx.fillRect(-14, -8, 3, 22); ctx.fillRect(11, -8, 3, 22);
        if (Math.sin(e.t * 3) > 0.3) drawStar(10, -16, 5, '#fff');
        break;
      }
      case 'oxy': {
        const r = e.r + Math.sin(e.t * 3) * 1.5;
        ctx.fillStyle = 'rgba(180,245,255,0.35)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - 6, y - 6, 3.5, 0, 7); ctx.fill();
        text('O2', x + 1, y + 2, 13, '#0b4f7a');
        break;
      }
      case 'repair': {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, e.r, 0, 7); ctx.fill();
        ctx.strokeStyle = '#52c46b'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#52c46b'; ctx.fillRect(x - 3.5, y - 9, 7, 18); ctx.fillRect(x - 9, y - 3.5, 18, 7);
        break;
      }
      case 'jelly': case 'icejelly': {
        const ice = e.type === 'icejelly';
        const c1 = ice ? '#e6fbff' : '#ff9ad5', c2 = ice ? '#7fd3ff' : '#b05cf0';
        ctx.strokeStyle = ice ? 'rgba(170,230,255,0.9)' : 'rgba(240,150,230,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(x + i * 6, y + 4);
          for (let k = 1; k <= 4; k++) ctx.lineTo(x + i * 6 + Math.sin(e.t * 4 + k + i) * 3, y + 4 + k * 7);
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(x - 5, y - 10, 2, x, y - 4, 24);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        const sq = 1 + Math.sin(e.t * 3.2) * 0.08;
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 4, 21 * sq, 22 / sq, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        face(x, y - 4, e.stunned);
        break;
      }
      case 'puffer': {
        const r = e.puff ? 23 : 17;
        ctx.fillStyle = '#e8a33b';
        for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a - 0.15) * r, y + Math.sin(a - 0.15) * r); ctx.lineTo(x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7)); ctx.lineTo(x + Math.cos(a + 0.15) * r, y + Math.sin(a + 0.15) * r); ctx.fill(); }
        const g = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, r);
        g.addColorStop(0, '#fff2a8'); g.addColorStop(1, '#f2b134');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#f7c948'; ctx.beginPath(); ctx.moveTo(x + r - 2, y); ctx.lineTo(x + r + 10, y - 8); ctx.lineTo(x + r + 10, y + 8); ctx.fill();
        face(x - 4, y - 2, e.stunned);
        break;
      }
      case 'mine': {
        if (!e.stunned) { ctx.strokeStyle = 'rgba(60,60,70,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, y + e.r); ctx.lineTo(x, groundY(G.dist + x, G.world)); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = '#3d4a5c';
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (e.r + 3), y + Math.sin(a) * (e.r + 3), 4, 0, 7); ctx.fill(); }
        const g = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, e.r);
        g.addColorStop(0, '#7d8ea6'); g.addColorStop(1, '#2f3a4a');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, e.r, 0, 7); ctx.fill();
        const on = Math.sin(e.t * 6) > 0;
        ctx.fillStyle = e.stunned ? '#5dff8a' : on ? '#ff4d4d' : '#7a2020';
        ctx.beginPath(); ctx.arc(x, y - 4, 4, 0, 7); ctx.fill();
        break;
      }
      case 'rock': {
        ctx.fillStyle = G.world === 2 ? '#41466b' : G.world === 1 ? '#9fb3c4' : '#7f8c99';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5, rad = e.r * (0.85 + hash(i + Math.floor(e.r)) * 0.3); ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.85); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(x - e.r * 0.3, y - e.r * 0.35, e.r * 0.35, e.r * 0.18, -0.3, 0, 7); ctx.fill();
        if (G.world === 0) { ctx.fillStyle = '#5dbb63'; ctx.beginPath(); ctx.ellipse(x + e.r * 0.2, y - e.r * 0.7, e.r * 0.4, 5, 0, 0, 7); ctx.fill(); }
        break;
      }
      case 'iceberg': {
        const top = e.y, w = e.w, h = e.h;
        const g = ctx.createLinearGradient(0, top, 0, top + h);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8fd0f2');
        ctx.fillStyle = g; ctx.strokeStyle = '#6bb8e3'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w * 0.35, top + h * 0.6); ctx.lineTo(x + w * 0.08, top + h); ctx.lineTo(x - w * 0.25, top + h * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(x - w * 0.2, top + 10); ctx.lineTo(x - w * 0.05, top + 10); ctx.lineTo(x - w * 0.12, top + h * 0.5); ctx.fill();
        break;
      }
      case 'icicle': {
        ctx.fillStyle = '#e6f7ff'; ctx.strokeStyle = '#7cc3ea'; ctx.lineWidth = 2;
        const sh = !e.falling && e.x - G.player.x < 260 ? Math.sin(e.t * 40) * 1.5 : 0;
        ctx.beginPath(); ctx.moveTo(x - 10 + sh, y - 18); ctx.lineTo(x + 10 + sh, y - 18); ctx.lineTo(x + sh, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'floe': {
        ctx.translate(x, y); ctx.rotate(Math.sin(e.t) * 0.2);
        ctx.fillStyle = '#d9f3ff'; ctx.strokeStyle = '#7cc3ea'; ctx.lineWidth = 2.5;
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + 0.3; ctx.lineTo(Math.cos(a) * e.r * 1.1, Math.sin(a) * e.r * 0.9); } ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-12, -10, 10, 4);
        break;
      }
      case 'angler': {
        ctx.translate(x, y);
        ctx.fillStyle = '#7a55b8';
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(34, -12); ctx.lineTo(32, 12); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, 24, 19, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#2b1d45'; ctx.beginPath(); ctx.moveTo(-24, 2); ctx.quadraticCurveTo(-12, 14, 2, 8); ctx.lineTo(-22, 8); ctx.fill();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 5, 4); ctx.lineTo(-18 + i * 5, 8); ctx.lineTo(-16 + i * 5, 4); ctx.fill(); }
        ctx.beginPath(); ctx.arc(-8, -7, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-9, -7, e.stunned ? 1 : 3, 0, 7); ctx.fill();
        ctx.strokeStyle = '#7a55b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -18); ctx.quadraticCurveTo(-18, -38, -30, -24); ctx.stroke();
        e.lure = { x: x - 30, y: y - 24 };
        break;
      }
      case 'vent': {
        ctx.fillStyle = 'rgba(255,190,140,0.1)'; ctx.fillRect(x - 30, 0, 60, y - 20);
        ctx.fillStyle = '#4a4363'; ctx.beginPath(); ctx.moveTo(x - 26, y + 14); ctx.lineTo(x - 10, y - 20); ctx.lineTo(x + 10, y - 20); ctx.lineTo(x + 26, y + 14); ctx.closePath(); ctx.fill();
        const g = ctx.createRadialGradient(x, y - 20, 1, x, y - 20, 22);
        g.addColorStop(0, 'rgba(255,160,60,0.9)'); g.addColorStop(1, 'rgba(255,90,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 20, 22, 0, 7); ctx.fill();
        break;
      }
      case 'eel': {
        ctx.strokeStyle = '#4fbf5a'; ctx.lineCap = 'round';
        for (let i = 6; i >= 0; i--) {
          const sx = x + i * 9, sy = y + Math.sin(e.t * 6 - i * 0.7) * 6;
          ctx.lineWidth = 16 - i * 1.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 9, y + Math.sin(e.t * 6 - (i + 1) * 0.7) * 6); ctx.stroke();
        }
        face(x, y - 1, e.stunned, 0.8);
        break;
      }
      case 'statue': {
        ctx.translate(x, y);
        ctx.fillStyle = '#9c9479'; rr(-22, 10, 44, 26, 3); ctx.fill();
        ctx.fillStyle = '#b8af90'; rr(-18, -30, 36, 42, 8); ctx.fill();
        ctx.fillStyle = '#8c8468'; ctx.fillRect(-18, -34, 36, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-6, -6, 12, 3);
        const glow = e.stunned ? '#666' : e.cd < 0.5 ? '#ff7bd5' : '#c78bff';
        ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = e.stunned ? 0 : 10;
        ctx.beginPath(); ctx.arc(-8, -18, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(8, -18, 4, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2f9e6e'; ctx.beginPath(); ctx.ellipse(-12, -34, 10, 4, 0, 0, 7); ctx.fill();
        break;
      }
      case 'orb': {
        ctx.fillStyle = 'rgba(200,140,255,0.55)'; ctx.strokeStyle = '#f0d9ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, e.r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - 3, y - 3, 2.5, 0, 7); ctx.fill();
        break;
      }
      case 'pillar': {
        const top = e.y, w = e.w, h = e.h;
        ctx.fillStyle = '#d9cfae'; ctx.fillRect(x - w / 2, top, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 1; i < 4; i++) ctx.fillRect(x - w / 2 + i * (w / 4) - 2, top, 4, h);
        ctx.fillStyle = '#c4b893';
        if (e.fromTop) { ctx.fillRect(x - w / 2 - 6, top, w + 12, 14); ctx.beginPath(); ctx.moveTo(x - w / 2, top + h); ctx.lineTo(x - 8, top + h + 10); ctx.lineTo(x + 6, top + h - 4); ctx.lineTo(x + w / 2, top + h + 8); ctx.lineTo(x + w / 2, top + h); ctx.fill(); }
        else { ctx.fillRect(x - w / 2 - 6, top + h - 14, w + 12, 14); ctx.fillStyle = '#d9cfae'; ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - 10, top - 10); ctx.lineTo(x + 4, top + 4); ctx.lineTo(x + w / 2, top - 6); ctx.lineTo(x + w / 2, top); ctx.fill(); }
        ctx.fillStyle = '#2f9e6e'; ctx.beginPath(); ctx.ellipse(x - 8, e.fromTop ? top + h - 6 : top + 10, 10, 4, 0.3, 0, 7); ctx.fill();
        break;
      }
    }
    ctx.restore();
    if (e.stunned && e.type !== 'mine') {
      for (let i = 0; i < 3; i++) { const a = menuT * 5 + i * 2.1; drawStar(x + Math.cos(a) * 16, y - 26 + Math.sin(a) * 5, 5, '#fff36b'); }
    }
  }

  // ---------------------------------------------------------------- game rendering
  function renderGame(t) {
    const P = G.player, w = G.world;
    ctx.save();
    if (G.shake > 0) ctx.translate(rand(-4, 4) * G.shake * 2, rand(-4, 4) * G.shake * 2);
    drawBG(w, G.dist, t);
    const fx = G.len - G.dist + P.x + 120;
    if (fx < W + 60) {
      const gy = groundY(G.dist + fx, w);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, gy - 200); ctx.stroke();
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#222' : '#fff'; ctx.fillRect(fx + j * 14, gy - 200 + i * 10, 14, 10); }
    }
    for (const e of G.ents) drawEntity(e);
    for (const s of G.shots) {
      ctx.fillStyle = 'rgba(190,245,255,0.45)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x - 3, s.y - 3, 2.5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(s.x - 14, s.y, s.r * 0.6, 0, 7); ctx.stroke();
    }
    const blink = P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0;
    if (state !== 'gameOver') drawSub(P.x, P.y, 1, SUBS[save.sub], P.tilt, t, blink ? 0.35 : 1);
    if (P.cool > 0.2) { ctx.strokeStyle = 'rgba(255,255,255,' + (P.cool - 0.2) * 6 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x + 40, P.y, (0.3 - P.cool) * 200 + 6, -0.8, 0.8); ctx.stroke(); }
    for (const p of G.parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      if (p.kind === 'star') drawStar(p.x, p.y, p.size + 1, p.color);
      else if (p.kind === 'bubble') { ctx.strokeStyle = p.color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.stroke(); }
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (WORLDS[w].dark) {
      const lx = P.x + 50, ly = P.y;
      const g = ctx.createRadialGradient(lx, ly, 40, lx, ly, 270);
      g.addColorStop(0, 'rgba(0,0,10,0)'); g.addColorStop(0.6, 'rgba(0,0,15,0.5)'); g.addColorStop(1, 'rgba(0,0,15,' + WORLDS[w].dark + ')');
      ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
      for (const e of G.ents) {
        if (e.type === 'angler' && e.lure && !e.stunned) glowDot(e.lure.x, e.lure.y, 7, '#fff59d');
        else if (e.pickup) glowDot(e.x, e.y, 3, 'rgba(255,255,255,0.85)');
        else if (e.type === 'mine' && !e.stunned && Math.sin(e.t * 6) > 0) glowDot(e.x, e.y - 4, 4, '#ff4d4d');
        else if (e.type === 'jelly' && !e.stunned) glowDot(e.x, e.y, 6, 'rgba(255,140,230,0.7)');
        else if (e.type === 'vent') glowDot(e.x, e.y - 20, 8, 'rgba(255,150,60,0.8)');
      }
    }
    for (const tx of G.texts) { ctx.globalAlpha = clamp(tx.life, 0, 1); text(tx.str, tx.x, tx.y, 18, tx.color, 'center', { stroke: 'rgba(0,30,60,0.6)' }); }
    ctx.globalAlpha = 1;
    ctx.restore();
    drawHUD(t);
  }
  function bar(x, y, w, h, frac, color, label) {
    ctx.fillStyle = 'rgba(0,25,50,0.55)'; rr(x, y, w, h, h / 2); ctx.fill();
    if (frac > 0) { ctx.fillStyle = color; rr(x + 2, y + 2, Math.max(h - 4, (w - 4) * frac), h - 4, (h - 4) / 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; rr(x, y, w, h, h / 2); ctx.stroke();
    text(label, x + 10, y + h / 2 + 1, 13, '#fff', 'left', { stroke: 'rgba(0,0,0,0.5)', strokeW: 3 });
  }
  function drawHUD(t) {
    const bw = Math.min(200, W * 0.2);
    bar(14, 12, bw, 22, G.hull / 100, G.hull > 50 ? '#52c46b' : G.hull > 25 ? '#ffb703' : '#ef476f', 'HULL');
    const low = G.o2 < 25 && Math.sin(t * 10) > 0;
    bar(14, 40, bw, 22, G.o2 / 100, low ? '#ef476f' : '#4cc9f0', 'OXYGEN');
    const pw = Math.min(260, W * 0.28), px = W / 2 - pw / 2;
    text(WORLDS[G.world].name + ' - Level ' + G.level, W / 2, 18, 16, '#fff', 'center', { stroke: '#0b3d66', strokeW: 4 });
    ctx.fillStyle = 'rgba(0,25,50,0.5)'; rr(px, 34, pw, 10, 5); ctx.fill();
    const f = clamp(G.dist / G.len, 0, 1);
    ctx.fillStyle = '#ffd23f'; rr(px, 34, Math.max(10, pw * f), 10, 5); ctx.fill();
    drawSub(px + pw * f, 39, 0.28, SUBS[save.sub], 0, t);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { ctx.fillStyle = (i + j) % 2 ? '#222' : '#fff'; ctx.fillRect(px + pw + 6 + i * 5, 32 + j * 7, 5, 7); }
    text('Score ' + G.score, W - 118, 24, 22, '#fff', 'right', { stroke: '#0b3d66', strokeW: 5 });
    text('Best ' + Math.max(save.high, G.score), W - 118, 48, 13, '#ffffff', 'right', { stroke: '#0b3d66', strokeW: 3.5 });
    if (state === 'play') {
      iconBtn(W - 32, 32, 22, 'pause', pauseGame);
      iconBtn(W - 82, 32, 22, save.muted ? 'muted' : 'sound', toggleMute);
    }
    if (isTouch && state === 'play') {
      if (joy.id !== null) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 55, 0, 7); ctx.fill(); ctx.stroke();
        const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy), kk = m > 55 ? 55 / m : 1;
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(joy.ox + dx * kk, joy.oy + dy * kk, 24, 0, 7); ctx.fill();
      } else {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(110, H - 110, 55, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(110, H - 110, 24, 0, 7); ctx.fill();
        text('Drag to steer', 110, H - 36, 14, '#fff');
        ctx.globalAlpha = 1;
      }
      const fxp = W - 100, fyp = H - 100, pressed = fireTouches.size > 0;
      ctx.fillStyle = pressed ? 'rgba(255,183,3,0.85)' : 'rgba(255,183,3,0.55)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fxp, fyp, pressed ? 50 : 54, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(fxp, fyp - 6, 14, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fxp - 4, fyp - 10, 3, 0, 7); ctx.fill();
      text('BUBBLE', fxp, fyp + 24, 13, '#fff', 'center', { stroke: 'rgba(0,0,0,0.4)', strokeW: 3 });
    }
    if (G.time < 4 && state === 'play') {
      ctx.globalAlpha = clamp(4 - G.time, 0, 1);
      const msg = isTouch ? 'Left side: drag to steer   -   Right side: bubble shot' : 'Arrows / WASD to steer   -   SPACE for bubble shot   -   P to pause';
      text(msg, W / 2, H - 30, 17, '#fff', 'center', { stroke: 'rgba(0,30,60,0.7)' });
      text('Collect pearls, grab O2 bubbles, stun hazards with bubbles!', W / 2, H - 56, 17, '#fff36b', 'center', { stroke: 'rgba(0,30,60,0.7)' });
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- screens
  function title(str, y, size) { size = size || 40; text(str, W / 2, y, size, '#fff', 'center', { stroke: '#0b3d66', strokeW: size * 0.22 }); }
  function backBtn(to) { btn(20, H - 70, 130, 50, 'Back', () => { state = to; }, { color: '#5c7a99' }); }
  function cornerIcons() { iconBtn(W - 32, 32, 22, save.muted ? 'muted' : 'sound', toggleMute); }

  function screenTitle(t) {
    drawBG(0, t * 40, t);
    const by = H * 0.17;
    ctx.save(); ctx.translate(W / 2, by); ctx.rotate(Math.sin(t) * 0.02);
    text('Bubble Sub', 0, 0, 74, '#ffd23f', 'center', { stroke: '#0b3d66', strokeW: 14 });
    text('OCEAN QUEST', 0, 52, 28, '#ffffff', 'center', { stroke: '#0b3d66', strokeW: 7 });
    ctx.restore();
    const sy = H * 0.42 + Math.sin(t * 1.5) * 8;
    drawSub(W / 2, sy, 1.7, SUBS[save.sub], Math.sin(t * 1.2) * 0.06, t);
    for (let i = 0; i < 5; i++) { const yy = sy - ((t * 50 + i * 40) % 160); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2 - 90 + Math.sin(t * 2 + i) * 6, yy, 3 + (i % 3), 0, 7); ctx.stroke(); }
    const bw = 250, bh = 60, cx = W / 2 - bw / 2, y0 = Math.max(sy + 60, H * 0.56);
    btn(cx, y0, bw, bh, 'PLAY', () => { state = 'worlds'; }, { color: '#ff8c42', size: 30 });
    const dw = 116, dx0 = W / 2 - (dw * 3 + 20) / 2;
    DIFF.forEach((d, i) => btn(dx0 + i * (dw + 10), y0 + 74, dw, 42, d.name, () => { save.diff = i; persist(); }, { color: d.color, selected: save.diff === i, size: 19 }));
    text(DIFF[save.diff].desc, W / 2, y0 + 134, 15, '#e8fbff', 'center', { stroke: 'rgba(0,30,60,0.5)', strokeW: 3 });
    btn(W / 2 - 135, y0 + 154, 130, 44, 'Submarines', () => { state = 'hangar'; }, { color: '#3a86ff', size: 17 });
    btn(W / 2 + 5, y0 + 154, 130, 44, 'Grown-ups', () => { state = 'parents'; }, { color: '#8e5bd8', size: 17 });
    text('High score: ' + save.high, 18, H - 20, 16, '#fff', 'left', { stroke: 'rgba(0,30,60,0.6)' });
    text('No ads - No tracking - Plays offline', W - 18, H - 20, 14, '#e8fbff', 'right', { stroke: 'rgba(0,30,60,0.6)', strokeW: 3 });
    if (window.innerHeight > window.innerWidth) text('Tip: turn your device sideways for a wider view', W / 2, H - 48, 15, '#fff36b', 'center', { stroke: 'rgba(0,30,60,0.6)' });
    cornerIcons();
  }

  function worldCardLayout() {
    const cols = W >= 1050 ? 4 : 2, rows = 4 / cols;
    const gap = 18, availW = Math.min(W - 60, cols === 4 ? 1100 : 660), cw = (availW - gap * (cols - 1)) / cols;
    const availH = H - 210, ch = Math.min(cols === 4 ? 300 : 190, (availH - gap * (rows - 1)) / rows);
    return { cols, cw, ch, gap, x0: W / 2 - availW / 2, y0: 95 };
  }
  function worldIcon(i, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (i === 0) { coral(-34, 40, 40, '#ff6f91'); coral(30, 40, 32, '#ffc75f'); seaweed(0, 40, 50, '#3dbb5c', t, 1); drawFish(-4, -12, '#ff9671', t); }
    else if (i === 1) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-50, -40); ctx.lineTo(40, -40); ctx.lineTo(10, 30); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill(); crystal(34, 42, 30); }
    else if (i === 2) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(0, 0, 55, 0, 7); ctx.fill(); glowDot(-30, -22, 6, '#fff59d'); ctx.strokeStyle = '#7a55b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -16); ctx.quadraticCurveTo(-18, -36, -30, -22); ctx.stroke(); ctx.fillStyle = '#7a55b8'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, -6, 5, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#d9cfae'; ctx.fillRect(-46, -20, 18, 62); ctx.fillRect(28, -36, 18, 78); ctx.fillRect(-52, -26, 30, 8); ctx.fillStyle = '#b8af90'; rr(-14, 0, 28, 40, 6); ctx.fill(); ctx.fillStyle = '#c78bff'; ctx.beginPath(); ctx.arc(-6, 12, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(6, 12, 3, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function screenWorlds(t) {
    drawBG(0, t * 25, t);
    ctx.fillStyle = 'rgba(0,30,60,0.25)'; ctx.fillRect(0, 0, W, H);
    title('Choose a World', 48);
    const L = worldCardLayout();
    WORLDS.forEach((wd, i) => {
      const x = L.x0 + (i % L.cols) * (L.cw + L.gap), y = L.y0 + Math.floor(i / L.cols) * (L.ch + L.gap);
      const avail = worldAvailable(i);
      ctx.save();
      rr(x, y, L.cw, L.ch, 18); ctx.clip();
      const g = ctx.createLinearGradient(0, y, 0, y + L.ch); g.addColorStop(0, wd.top); g.addColorStop(1, wd.bot);
      ctx.fillStyle = g; ctx.fillRect(x, y, L.cw, L.ch);
      ctx.fillStyle = wd.sand; ctx.beginPath(); ctx.moveTo(x, y + L.ch);
      for (let k = 0; k <= 10; k++) ctx.lineTo(x + (k * L.cw) / 10, y + L.ch - 30 - Math.sin(k + i) * 6);
      ctx.lineTo(x + L.cw, y + L.ch); ctx.fill();
      worldIcon(i, x + L.cw / 2, y + 62 + (L.ch - 92) / 2, Math.min(1.1, (L.ch - 70) / 130), t);
      if (!avail) { ctx.fillStyle = 'rgba(10,20,40,0.45)'; ctx.fillRect(x, y, L.cw, L.ch); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; rr(x, y, L.cw, L.ch, 18); ctx.stroke();
      text((i + 1) + '. ' + wd.name, x + L.cw / 2, y + 22, 21, '#fff', 'center', { stroke: 'rgba(0,30,60,0.7)' });
      const tag = wd.free ? 'FREE' : save.unlocked ? 'UNLOCKED' : 'FULL GAME';
      ctx.fillStyle = wd.free || save.unlocked ? '#52c46b' : '#8e5bd8'; rr(x + L.cw / 2 - 52, y + 38, 104, 22, 11); ctx.fill();
      text(tag, x + L.cw / 2, y + 50, 13, '#fff');
      if (!avail) {
        drawLock(x + L.cw / 2, y + 62 + (L.ch - 92) / 2, Math.min(2, L.ch / 110), '#fff');
        text(wd.desc, x + L.cw / 2, y + L.ch - 16, 12, '#fff', 'center', { stroke: 'rgba(0,30,60,0.7)', strokeW: 3 });
      } else {
        for (let lv = 1; lv <= 3; lv++) drawStar(x + L.cw / 2 + (lv - 2) * 22, y + L.ch - 16, 8, lv <= save.progress[i] ? '#ffd23f' : 'rgba(255,255,255,0.35)');
      }
      buttons.push({ x, y, w: L.cw, h: L.ch, onClick: () => { if (avail) { selWorld = i; state = 'levels'; } else openInfo(); } });
    });
    const by = H - 70;
    backBtn('title');
    btn(165, by, 150, 50, 'Submarines', () => { state = 'hangar'; }, { color: '#3a86ff', size: 18 });
    if (!save.unlocked) btn(W - 250, by, 230, 50, 'Unlock Full Game', () => requestGate(openDemoPurchase), { color: '#8e5bd8', lock: true, size: 19 });
    else text('Full game unlocked (demo)', W - 30, by + 25, 16, '#c6ffc6', 'right', { stroke: 'rgba(0,30,60,0.6)' });
    cornerIcons();
  }

  function screenLevels(t) {
    drawBG(selWorld, t * 30, t);
    ctx.fillStyle = 'rgba(0,30,60,0.25)'; ctx.fillRect(0, 0, W, H);
    title(WORLDS[selWorld].name, 60);
    text(WORLDS[selWorld].desc, W / 2, 105, 18, '#fff', 'center', { stroke: 'rgba(0,30,60,0.6)' });
    const bw = 170, bh = 150, gap = 26, x0 = W / 2 - (bw * 3 + gap * 2) / 2, y = H / 2 - bh / 2;
    for (let lv = 1; lv <= LEVELS_PER_WORLD; lv++) {
      const open = lv <= save.progress[selWorld];
      const x = x0 + (lv - 1) * (bw + gap);
      btn(x, y, bw, bh, '', open ? () => startLevel(selWorld, lv, false) : null, { color: open ? '#ff8c42' : '#7a8a99', radius: 22 });
      text('Level', x + bw / 2, y + 36, 22, '#fff', 'center', { stroke: 'rgba(0,0,0,0.3)' });
      text(String(lv), x + bw / 2, y + 86, 54, '#fff', 'center', { stroke: 'rgba(0,0,0,0.3)' });
      if (!open) drawLock(x + bw / 2, y + 126, 1.1, '#fff');
      else text(lv === 1 ? 'Start here' : 'Ready!', x + bw / 2, y + 128, 14, '#fff');
    }
    text('Difficulty: ' + DIFF[save.diff].name + '   -   Best: ' + save.best[selWorld], W / 2, y + bh + 40, 17, '#fff', 'center', { stroke: 'rgba(0,30,60,0.6)' });
    backBtn('worlds');
    cornerIcons();
  }

  function screenHangar(t) {
    drawBG(0, t * 20, t);
    ctx.fillStyle = 'rgba(0,30,60,0.3)'; ctx.fillRect(0, 0, W, H);
    title('Choose Your Submarine', 48);
    const cols = 3, gap = 18, cw = Math.min(230, (W - 80 - gap * 2) / 3), ch = Math.min(170, (H - 220) / 2);
    const x0 = W / 2 - (cw * cols + gap * (cols - 1)) / 2, y0 = 92;
    SUBS.forEach((s, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      const avail = subAvailable(i), sel = save.sub === i;
      panel(x, y, cw, ch, sel ? 'rgba(255,210,63,0.35)' : 'rgba(10,60,100,0.8)');
      drawSub(x + cw / 2, y + ch * 0.48, Math.min(1.5, ch / 115), s, Math.sin(t * 2 + i) * 0.05, t, avail ? 1 : 0.5);
      text(s.name, x + cw / 2, y + ch - 20, 19, '#fff', 'center', { stroke: 'rgba(0,30,60,0.6)' });
      if (!avail) { drawLock(x + cw - 24, y + 24, 1, '#fff'); text('FULL GAME', x + 52, y + 22, 13, '#e0ccff', 'center'); }
      else if (sel) text('SELECTED', x + 48, y + 22, 13, '#ffd23f', 'center');
      else if (s.free) text('FREE', x + 34, y + 22, 13, '#9dff9d', 'center');
      if (sel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; rr(x - 3, y - 3, cw + 6, ch + 6, 26); ctx.stroke(); }
      buttons.push({ x, y, w: cw, h: ch, onClick: () => { if (avail) { save.sub = i; persist(); } else openInfo(); } });
    });
    text('Cosmetic only - every submarine handles the same.', W / 2, y0 + ch * 2 + gap + 22, 15, '#e8fbff', 'center', { stroke: 'rgba(0,30,60,0.6)', strokeW: 3 });
    backBtn('title');
    btn(165, H - 70, 130, 50, 'Play', () => { state = 'worlds'; }, { color: '#ff8c42' });
    if (!save.unlocked) btn(W - 250, H - 70, 230, 50, 'Unlock Full Game', () => requestGate(openDemoPurchase), { color: '#8e5bd8', lock: true, size: 19 });
    cornerIcons();
  }

  function screenParents(t) {
    drawBG(0, t * 15, t);
    ctx.fillStyle = 'rgba(0,30,60,0.45)'; ctx.fillRect(0, 0, W, H);
    const pw = Math.min(740, W - 40), ph = H - 110, px = W / 2 - pw / 2, py = 24;
    panel(px, py, pw, ph);
    text('For Grown-ups', W / 2, py + 34, 30, '#ffd23f', 'center', { stroke: '#0b3d66' });
    let y = py + 76;
    const lines = [
      'FREE: the Coral Reef world (3 levels), 2 submarines and all difficulty settings. No time limit and no trial.',
      'FULL GAME (one-time unlock, not a subscription): Arctic Ice, Deep Trench and Sunken City (3 levels each) plus 4 extra cosmetic submarines. Cosmetics give no gameplay advantage.',
      'No ads. No tracking. No analytics. No accounts or chat. Progress is saved only on this device. Purchases sit behind a grown-up check.',
      'This build is a DEMO: no real payment is ever taken. "Unlock" only turns on a flag stored on this device.',
    ];
    for (const l of lines) y = wrap(l, px + 28, y, pw - 56, 16, '#ffffff', 22, 'left') + 8;
    const by = py + ph - 70, bw = (pw - 80) / 3;
    if (!save.unlocked) btn(px + 20, by, bw, 50, 'Unlock (Demo)', () => requestGate(openDemoPurchase), { color: '#8e5bd8', lock: true, size: 17 });
    else btn(px + 20, by, bw, 50, 'Unlocked', null, { disabled: true, size: 17 });
    btn(px + 40 + bw, by, bw, 50, 'Restore Purchases', () => requestGate(restorePurchases), { color: '#3a86ff', size: 16 });
    btn(px + 60 + bw * 2, by, bw, 50, 'Reset Demo', () => requestGate(resetDemo), { color: '#5c7a99', size: 17 });
    backBtn('title');
    cornerIcons();
  }

  function screenPanelOverGame(t, kind) {
    renderGame(t);
    ctx.fillStyle = 'rgba(0,20,45,0.55)'; ctx.fillRect(0, 0, W, H);
    const pw = Math.min(520, W - 40), ph = 360, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    panel(px, py, pw, ph);
    const bw = pw - 120, bx = W / 2 - bw / 2;
    if (kind === 'pause') {
      text('Paused', W / 2, py + 50, 40, '#fff', 'center', { stroke: '#0b3d66' });
      btn(bx, py + 100, bw, 56, 'Resume', resumeGame, { color: '#52c46b' });
      btn(bx, py + 170, bw, 50, 'Restart Level', () => startLevel(G.world, G.level, false), { color: '#ffb703' });
      btn(bx, py + 232, bw, 50, 'Quit to Worlds', () => { state = 'worlds'; }, { color: '#5c7a99' });
      btn(W / 2 - 90, py + 298, 180, 40, 'Sound: ' + (save.muted ? 'Off' : 'On'), toggleMute, { color: '#3a86ff', size: 17 });
    } else if (kind === 'levelDone') {
      const last = G.level >= LEVELS_PER_WORLD;
      text(last ? 'World Complete!' : 'Level Complete!', W / 2, py + 46, 36, '#ffd23f', 'center', { stroke: '#0b3d66' });
      for (let i = 0; i < 3; i++) drawStar(W / 2 + (i - 1) * 50, py + 100, 20, i < G.stars ? '#ffd23f' : 'rgba(255,255,255,0.25)');
      text('Pearls ' + G.pearls + '   -   Stunned ' + G.stuns + '   -   Bonus +' + G.bonus, W / 2, py + 146, 17, '#fff');
      text('Score ' + G.score, W / 2, py + 182, 28, '#fff', 'center', { stroke: '#0b3d66' });
      if (G.newHigh) text('New high score!', W / 2, py + 214, 18, '#9dff9d');
      if (!last) btn(bx, py + 236, bw, 54, 'Next Level', () => startLevel(G.world, G.level + 1, true), { color: '#52c46b' });
      else btn(bx, py + 236, bw, 54, 'Choose a World', () => { state = 'worlds'; }, { color: '#52c46b' });
      btn(bx, py + 300, bw, 42, 'Menu', () => { state = 'title'; }, { color: '#5c7a99', size: 19 });
    } else {
      text('Game Over', W / 2, py + 50, 40, '#ff8fa3', 'center', { stroke: '#0b3d66' });
      text(G.o2 <= 0 ? 'Ran out of air - grab the O2 bubbles!' : 'Too many bumps - try bubbling hazards first!', W / 2, py + 100, 17, '#fff');
      text('Score ' + G.score, W / 2, py + 146, 30, '#fff', 'center', { stroke: '#0b3d66' });
      text(G.newHigh ? 'New high score!' : 'Best ' + save.high, W / 2, py + 182, 17, G.newHigh ? '#9dff9d' : '#cdeffd');
      btn(bx, py + 220, bw, 56, 'Try Again', () => startLevel(G.world, G.level, false), { color: '#52c46b' });
      btn(bx, py + 288, bw, 46, 'Worlds', () => { state = 'worlds'; }, { color: '#5c7a99', size: 19 });
    }
  }

  // ---------------------------------------------------------------- monetisation (DEMO ONLY) + grown-up gate
  function speak(str) {
    try {
      if (!save.muted && 'speechSynthesis' in window && window.SpeechSynthesisUtterance) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(str));
      }
    } catch (e) { /* optional nicety for pre-readers */ }
  }
  function newGateQuestion(o) { const a = randi(6, 12), b = randi(3, 9); o.a = a; o.b = b; o.answer = a * b; o.input = ''; }
  function requestGate(onPass) {
    overlay = { type: 'gate', onPass, err: '' };
    newGateQuestion(overlay);
    speak('Please ask a grown-up to help.');
  }
  function gateKey(k) {
    const o = overlay; if (!o || o.type !== 'gate') return;
    if (k === 'del') o.input = o.input.slice(0, -1);
    else if (k === 'ok') {
      if (o.input && parseInt(o.input, 10) === o.answer) { const cb = o.onPass; overlay = null; cb(); }
      else { newGateQuestion(o); o.err = 'Not quite - here is a new question.'; }
    } else if (o.input.length < 3) o.input += k;
  }
  function openDemoPurchase() { overlay = { type: 'demo' }; }
  function confirmDemoUnlock() {
    /* ------------------------------------------------------------------
     * REAL STORE INTEGRATION GOES HERE (this demo never contacts a store).
     * Android - Google Play Billing: launchBillingFlow() for a one-time
     *   (INAPP, non-consumable) product such as "full_game_unlock"; verify
     *   the purchase token server-side, then acknowledgePurchase().
     * iOS - StoreKit 2 / Apple In-App Purchase: Product.purchase() on a
     *   NON-CONSUMABLE product; verify the transaction, then finish() it.
     * Only grant the entitlement after the store confirms the purchase.
     * ------------------------------------------------------------------ */
    save.unlocked = true; persist();
    sfx.unlock();
    overlay = { type: 'msg', title: 'Full game unlocked!', body: 'DEMO unlock - no payment was taken. All 4 worlds and 6 submarines are now available on this device.' };
  }
  function restorePurchases() {
    /* REAL STORE INTEGRATION GOES HERE.
     * Android: BillingClient.queryPurchasesAsync(INAPP) and re-grant "full_game_unlock".
     * iOS: iterate Transaction.currentEntitlements (or AppStore.sync()) and re-grant.
     * Demo stub: no store to contact, so just report the locally stored flag. */
    overlay = { type: 'msg', title: 'Restore Purchases (Demo)', body: 'No app store is connected in this demo build. Unlock status on this device: ' + (save.unlocked ? 'UNLOCKED.' : 'not unlocked.') };
  }
  function resetDemo() {
    save.unlocked = false; if (!subAvailable(save.sub)) save.sub = 0; persist();
    overlay = { type: 'msg', title: 'Demo reset', body: 'The demo unlock was removed from this device. The free Coral Reef world stays fully playable.' };
  }
  function openInfo() {
    overlay = { type: 'msg', title: 'Part of the Full Game', body: 'This is included in the one-time Full Game unlock, which a grown-up can turn on from the Grown-ups menu. Coral Reef is free to play forever.' };
  }
  function drawOverlay() {
    ctx.fillStyle = 'rgba(0,15,35,0.7)'; ctx.fillRect(0, 0, W, H);
    const o = overlay;
    if (o.type === 'gate') {
      const pw = 440, ph = Math.min(H - 20, 500), px = W / 2 - pw / 2, py = H / 2 - ph / 2;
      panel(px, py, pw, ph, 'rgba(60,40,110,0.96)');
      text('Grown-up Check', W / 2, py + 34, 28, '#ffd23f', 'center', { stroke: '#2a1a50' });
      text('Ask a grown-up to answer:', W / 2, py + 70, 16, '#fff');
      text(o.a + ' x ' + o.b + ' = ?', W / 2, py + 106, 34, '#fff', 'center', { stroke: '#2a1a50' });
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; rr(W / 2 - 80, py + 130, 160, 44, 10); ctx.fill();
      text(o.input || '', W / 2, py + 153, 28, '#2a1a50');
      if (o.err) text(o.err, W / 2, py + 190, 14, '#ffb3c1');
      const kw = 80, kh = Math.max(34, Math.min(50, (ph - 290) / 4 - 6)), kx = W / 2 - (kw * 3 + 16) / 2, ky = py + 206;
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach((k, i) => {
        const x = kx + (i % 3) * (kw + 8), y = ky + Math.floor(i / 3) * (kh + 6);
        btn(x, y, kw, kh, k === 'del' ? 'Del' : k === 'ok' ? 'OK' : k, () => gateKey(k), { color: k === 'ok' ? '#52c46b' : k === 'del' ? '#ef476f' : '#7b5fc7', size: 22 });
      });
      btn(W / 2 - 80, py + ph - 54, 160, 40, 'Cancel', () => { overlay = null; }, { color: '#5c7a99', size: 18 });
    } else if (o.type === 'demo') {
      const pw = Math.min(560, W - 40), ph = 370, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
      panel(px, py, pw, ph, 'rgba(60,40,110,0.96)');
      ctx.fillStyle = '#ef476f'; rr(W / 2 - 70, py + 16, 140, 26, 13); ctx.fill();
      text('DEMO MODE', W / 2, py + 30, 15, '#fff');
      text('Unlock Full Game', W / 2, py + 70, 30, '#ffd23f', 'center', { stroke: '#2a1a50' });
      let y = py + 110;
      y = wrap('One-time unlock - not a subscription. Adds Arctic Ice, Deep Trench and Sunken City (9 more levels) plus 4 cosmetic submarines.', W / 2, y, pw - 60, 16, '#fff', 22, 'center') + 8;
      wrap('This is a demo build: NO real payment will be taken. In the store version, Google Play or the App Store would show its own purchase screen and price here.', W / 2, y, pw - 60, 15, '#ffd6e0', 21, 'center');
      btn(W / 2 - 200, py + ph - 74, 190, 54, 'Unlock (Demo)', confirmDemoUnlock, { color: '#52c46b', size: 19 });
      btn(W / 2 + 10, py + ph - 74, 190, 54, 'Cancel', () => { overlay = null; }, { color: '#5c7a99', size: 19 });
    } else {
      const pw = Math.min(520, W - 40), ph = 270, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
      panel(px, py, pw, ph);
      text(o.title, W / 2, py + 44, 26, '#ffd23f', 'center', { stroke: '#0b3d66' });
      wrap(o.body, W / 2, py + 92, pw - 60, 16, '#fff', 22, 'center');
      btn(W / 2 - 80, py + ph - 70, 160, 50, 'OK', () => { overlay = null; }, { color: '#52c46b' });
    }
  }

  // ---------------------------------------------------------------- input
  function toV(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; }
  const hitB = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  cvs.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') isTouch = true;
    else if (e.pointerType === 'mouse') isTouch = false;
    const p = toV(e); mouse.x = p.x; mouse.y = p.y;
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (!b.disabled && hitB(b, p)) { sfx.click(); b.onClick(); return; }
    }
    if (state === 'play' && !overlay) {
      if (e.pointerType === 'mouse') { fireRequested = true; return; }
      try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (p.x < W * 0.5 && joy.id === null) { joy.id = e.pointerId; joy.ox = joy.x = p.x; joy.oy = joy.y = p.y; }
      else fireTouches.add(e.pointerId);
    }
  }, { passive: false });
  cvs.addEventListener('pointermove', (e) => {
    const p = toV(e); mouse.x = p.x; mouse.y = p.y;
    if (e.pointerId === joy.id) { joy.x = p.x; joy.y = p.y; }
  });
  function releasePointer(e) { if (e.pointerId === joy.id) joy.id = null; fireTouches.delete(e.pointerId); }
  cvs.addEventListener('pointerup', releasePointer);
  cvs.addEventListener('pointercancel', releasePointer);
  cvs.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  window.addEventListener('keydown', (e) => {
    ensureAudio();
    const k = e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(k)) e.preventDefault();
    keys[k.toLowerCase()] = true;
    if (e.repeat) return;
    if (overlay) {
      if (overlay.type === 'gate') {
        if (/^[0-9]$/.test(k)) gateKey(k);
        else if (k === 'Backspace') gateKey('del');
        else if (k === 'Enter') gateKey('ok');
        else if (k === 'Escape') overlay = null;
      } else if (overlay.type === 'demo') { if (k === 'Escape') overlay = null; }
      else if (k === 'Escape' || k === 'Enter' || k === ' ') overlay = null;
      return;
    }
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (state === 'play') { if (k === 'p' || k === 'P' || k === 'Escape') pauseGame(); }
    else if (state === 'pause') { if (k === 'p' || k === 'P' || k === 'Escape' || k === 'Enter') resumeGame(); }
    else if (state === 'title') { if (k === 'Enter' || k === ' ') state = 'worlds'; }
    else if (state === 'levels') { if (k >= '1' && k <= '3' && +k <= save.progress[selWorld]) startLevel(selWorld, +k, false); else if (k === 'Escape') state = 'worlds'; }
    else if (state === 'worlds') { if (k >= '1' && k <= '4' && worldAvailable(+k - 1)) { selWorld = +k - 1; state = 'levels'; } else if (k === 'Escape') state = 'title'; }
    else if (state === 'hangar' || state === 'parents') { if (k === 'Escape') state = 'title'; }
    else if (state === 'levelDone') { if (k === 'Enter') { if (G.level < LEVELS_PER_WORLD) startLevel(G.world, G.level + 1, true); else state = 'worlds'; } }
    else if (state === 'gameOver') { if (k === 'Enter') startLevel(G.world, G.level, false); }
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

  // ---------------------------------------------------------------- main loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now; menuT += dt;
    if (state === 'play' && !overlay) updateGame(dt);
    ctx.setTransform(SCALE * DPR, 0, 0, SCALE * DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    buttons = [];
    switch (state) {
      case 'title': screenTitle(menuT); break;
      case 'worlds': screenWorlds(menuT); break;
      case 'levels': screenLevels(menuT); break;
      case 'hangar': screenHangar(menuT); break;
      case 'parents': screenParents(menuT); break;
      case 'play': renderGame(menuT); break;
      default: screenPanelOverGame(menuT, state); break;
    }
    if (overlay) { buttons = []; drawOverlay(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Read-only hook for automated tests (local only; nothing is sent anywhere).
  window.__bubbleSub = {
    get state() { return state; },
    get overlay() { return overlay && overlay.type; },
    get game() { return G && { world: G.world, level: G.level, score: G.score, hull: G.hull, o2: G.o2, dist: G.dist, len: G.len, ents: G.ents.length }; },
    get save() { return JSON.parse(JSON.stringify(save)); },
    gateAnswer() { return overlay && overlay.type === 'gate' ? overlay.answer : null; },
  };
})();
