import * as THREE from 'three';
// Procedural canvas textures (no image assets needed)
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function tex(c, rep = true, aniso = 4) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; return t;
}
function grime(g, w, h, r, n, a) { for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rad = 4 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(0,0,0,${a * r()})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } }

// Wallpaper: u repeats every 2m, v spans full wall height (0..1 = floor..ceiling). Includes wainscot + skirting + crown.
export function wallpaper(hue = 0, seed = 1) {
  const W = 256, H = 512; const [c, g] = cv(W, H); const r = rnd(seed);
  const base = [`hsl(${hue},28%,17%)`, `hsl(${hue},30%,12%)`];
  const wy = H * (1 - 0.33); // wainscot top (canvas y grows downward => v=0 at bottom)
  g.fillStyle = base[0]; g.fillRect(0, 0, W, wy);
  // stripes + damask
  for (let x = 0; x < W; x += 32) { g.fillStyle = base[1]; g.fillRect(x, 0, 12, wy); }
  g.globalAlpha = 0.35; g.fillStyle = `hsl(${hue + 20},40%,35%)`;
  for (let y = 20; y < wy - 20; y += 48) for (let x = 0; x < W; x += 64) {
    const ox = ((y / 48) & 1) ? 32 : 0; const cx = x + ox + 22, cy = y;
    g.beginPath(); g.ellipse(cx, cy, 7, 14, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx - 10, cy + 4, 4, 8, 0.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(cx + 10, cy + 4, 4, 8, -0.6, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  // peeling / stains
  for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * wy, w = 4 + r() * 20, h = 20 + r() * 120; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(20,12,4,0.55)'); gr.addColorStop(1, 'rgba(20,12,4,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  grime(g, W, wy, r, 30, 0.5);
  // crown moulding
  g.fillStyle = '#1a0f08'; g.fillRect(0, 0, W, 10); g.fillStyle = '#3a2614'; g.fillRect(0, 10, W, 4);
  // wainscot wood panels
  g.fillStyle = '#2a170b'; g.fillRect(0, wy, W, H - wy);
  g.fillStyle = '#4a2c15'; g.fillRect(0, wy, W, 8);
  for (let x = 8; x < W; x += 128) { g.strokeStyle = '#140904'; g.lineWidth = 4; g.strokeRect(x + 6, wy + 22, 112, H - wy - 70); g.strokeStyle = '#4a2c15'; g.lineWidth = 2; g.strokeRect(x + 10, wy + 26, 104, H - wy - 78); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() > .5 ? 60 : 10},${r() > .5 ? 35 : 5},10,0.15)`; g.fillRect(r() * W, wy + r() * (H - wy), 1 + r() * 30, 1); }
  g.fillStyle = '#120804'; g.fillRect(0, H - 30, W, 30); g.fillStyle = '#3a2210'; g.fillRect(0, H - 30, W, 3);
  const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function woodFloor(seed = 2, tint = [70, 40, 20]) {
  const W = 512, H = 512; const [c, g] = cv(W, H); const r = rnd(seed);
  const pw = 64;
  for (let x = 0; x < W; x += pw) {
    let y = -r() * 200;
    while (y < H) {
      const len = 160 + r() * 200; const k = 0.7 + r() * 0.5;
      g.fillStyle = `rgb(${tint[0] * k | 0},${tint[1] * k | 0},${tint[2] * k | 0})`; g.fillRect(x, y, pw, len);
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const gx = x + r() * pw; g.moveTo(gx, y); g.bezierCurveTo(gx + r() * 8 - 4, y + len * .3, gx + r() * 8 - 4, y + len * .6, gx + r() * 6 - 3, y + len); g.stroke(); }
      g.fillStyle = '#0a0503'; g.fillRect(x, y, pw, 2); y += len;
    }
    g.fillStyle = '#080402'; g.fillRect(x, 0, 2, H);
  }
  grime(g, W, H, r, 60, 0.45);
  return tex(c);
}

export function checker(seed = 3) {
  const W = 512, H = 512; const [c, g] = cv(W, H); const r = rnd(seed); const n = 4, s = W / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dark = (x + y) & 1; g.fillStyle = dark ? '#151214' : '#9a9286'; g.fillRect(x * s, y * s, s, s);
    for (let i = 0; i < 6; i++) { g.strokeStyle = dark ? 'rgba(120,110,120,0.25)' : 'rgba(40,30,30,0.25)'; g.lineWidth = 1 + r() * 2; g.beginPath(); let px = x * s + r() * s, py = y * s + r() * s; g.moveTo(px, py); for (let k = 0; k < 5; k++) { px += r() * 40 - 20; py += r() * 40 - 20; g.lineTo(px, py); } g.stroke(); }
    g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(x * s, y * s, s, s);
  }
  grime(g, W, H, r, 70, 0.6);
  return tex(c);
}

export function carpet(seed = 4, hue = 350) {
  const W = 256, H = 256; const [c, g] = cv(W, H); const r = rnd(seed);
  g.fillStyle = `hsl(${hue},55%,16%)`; g.fillRect(0, 0, W, H);
  g.strokeStyle = `hsl(${hue + 30},50%,32%)`; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28); g.lineWidth = 2; g.strokeRect(26, 26, W - 52, H - 52);
  g.fillStyle = `hsl(${hue + 30},45%,28%)`;
  for (let i = 0; i < 4; i++) { g.save(); g.translate(W / 2, H / 2); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(0, -70); g.quadraticCurveTo(40, -40, 0, 0); g.quadraticCurveTo(-40, -40, 0, -70); g.fill(); g.restore(); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(r() * W, r() * H, 1, 1); }
  grime(g, W, H, r, 25, 0.5);
  return tex(c);
}

export function ceiling(seed = 5) {
  const W = 256, H = 256; const [c, g] = cv(W, H); const r = rnd(seed);
  g.fillStyle = '#2a2420'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#141010'; g.lineWidth = 6; for (let i = 0; i <= W; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
  for (let i = 0; i < 12; i++) { g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += r() * 30 - 15; y += r() * 30 - 15; g.lineTo(x, y); } g.stroke(); }
  grime(g, W, H, r, 40, 0.6);
  return tex(c);
}

export function woodGrain(seed = 6) {
  const W = 256, H = 256; const [c, g] = cv(W, H); const r = rnd(seed);
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, W, H); // greyish so vertex colors tint
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(0,0,0,${0.06 + r() * 0.18})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * H; g.moveTo(0, y); g.bezierCurveTo(W * .3, y + r() * 10 - 5, W * .6, y + r() * 10 - 5, W, y + r() * 6 - 3); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.06})`; g.fillRect(0, r() * H, W, 1 + r() * 2); }
  return tex(c);
}

export function stone(seed = 7) {
  const W = 256, H = 256; const [c, g] = cv(W, H); const r = rnd(seed);
  g.fillStyle = '#6a6460'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6000; i++) { const v = 60 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v - 5},${v - 8},0.35)`; g.fillRect(r() * W, r() * H, 2, 2); }
  for (let y = 0; y < H; y += 64) { g.fillStyle = '#2a2624'; g.fillRect(0, y, W, 3); const off = (y / 64 & 1) * 64; for (let x = off; x < W + 128; x += 128) g.fillRect(x % W, y, 3, 64); }
  grime(g, W, H, r, 40, 0.5);
  return tex(c);
}

export function books(seed = 8) {
  const W = 256, H = 256; const [c, g] = cv(W, H); const r = rnd(seed);
  g.fillStyle = '#1a0f08'; g.fillRect(0, 0, W, H);
  const shelves = 4, sh = H / shelves;
  for (let s = 0; s < shelves; s++) {
    let x = 4; const y0 = s * sh;
    while (x < W - 4) {
      const bw = 6 + r() * 12, bh = sh * (0.6 + r() * 0.32);
      if (r() < 0.08) { x += bw * 2; continue; }
      const h = [0, 20, 35, 120, 200, 280][r() * 6 | 0], l = 12 + r() * 22;
      g.fillStyle = `hsl(${h},${30 + r() * 40}%,${l}%)`; g.fillRect(x, y0 + sh - bh - 6, bw, bh);
      g.fillStyle = 'rgba(220,180,90,0.5)'; g.fillRect(x + 1, y0 + sh - bh + 6, bw - 2, 2); g.fillRect(x + 1, y0 + sh - 18, bw - 2, 2);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + bw - 2, y0 + sh - bh - 6, 2, bh);
      x += bw + 1;
    }
    g.fillStyle = '#3a2412'; g.fillRect(0, y0 + sh - 6, W, 6); g.fillStyle = '#0a0503'; g.fillRect(0, y0, W, 3);
  }
  grime(g, W, H, r, 20, 0.5);
  return tex(c);
}

export function painting(seed = 9) {
  const W = 128, H = 160; const [c, g] = cv(W, H); const r = rnd(seed);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a2018'); gr.addColorStop(1, '#0c0806'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // portrait silhouette
  g.fillStyle = `hsl(${r() * 40},30%,${18 + r() * 10}%)`; g.beginPath(); g.ellipse(W / 2, H * .42, 24, 30, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(W / 2 - 50, H); g.quadraticCurveTo(W / 2, H * .55, W / 2 + 50, H); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(W / 2 - 9, H * .4, 4, 3, 0, 0, 7); g.ellipse(W / 2 + 9, H * .4, 4, 3, 0, 0, 7); g.fill();
  grime(g, W, H, r, 30, 0.6);
  g.strokeStyle = '#6a4a18'; g.lineWidth = 10; g.strokeRect(0, 0, W, H); g.strokeStyle = '#2a1a08'; g.lineWidth = 2; g.strokeRect(8, 8, W - 16, H - 16);
  return tex(c, false);
}

export function parchment() {
  const W = 128, H = 128; const [c, g] = cv(W, H); const r = rnd(11);
  g.fillStyle = '#e8d6a8'; g.fillRect(0, 0, W, H); grime(g, W, H, r, 20, 0.3);
  g.strokeStyle = 'rgba(60,30,10,0.8)'; g.lineWidth = 2; for (let y = 24; y < H - 16; y += 12) { g.beginPath(); g.moveTo(16, y); for (let x = 16; x < W - 16; x += 8) g.lineTo(x, y + r() * 3 - 1.5); g.stroke(); }
  g.fillStyle = '#8a0a0a'; g.beginPath(); g.arc(W - 26, H - 24, 10, 0, 7); g.fill();
  return tex(c, false);
}

export function spark() {
  const [c, g] = cv(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}

export function ghostFace() {
  const W = 512, H = 512; const [c, g] = cv(W, H);
  // pale gaunt skull face
  const gr = g.createRadialGradient(256, 230, 20, 256, 256, 250); gr.addColorStop(0, 'rgba(214,214,200,1)'); gr.addColorStop(0.55, 'rgba(150,150,140,0.95)'); gr.addColorStop(0.85, 'rgba(60,62,66,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(256, 262, 190, 238, 0, 0, 7); g.fill();
  // grime and veins
  g.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${30 + Math.random() * 20},${30},${Math.random() * 0.12})`; const r = 2 + Math.random() * 14; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, r, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(90,20,30,0.55)'; g.lineWidth = 1.6;
  for (let k = 0; k < 26; k++) { let x = 256 + (Math.random() - .5) * 300, y = 120 + Math.random() * 300; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (Math.random() - .5) * 30; y += (Math.random() - .5) * 30; g.lineTo(x, y); } g.stroke(); }
  // cheek hollows
  for (const sx of [-1, 1]) { const h = g.createRadialGradient(256 + sx * 110, 330, 5, 256 + sx * 110, 330, 90); h.addColorStop(0, 'rgba(10,8,10,0.7)'); h.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = h; g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'source-over';
  // eye sockets
  for (const sx of [-1, 1]) {
    const ex = 256 + sx * 78, ey = 210; const h = g.createRadialGradient(ex, ey, 10, ex, ey, 80); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.6, 'rgba(0,0,0,0.95)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = h; g.beginPath(); g.ellipse(ex, ey, 70, 82, sx * 0.25, 0, 7); g.fill();
    const p = g.createRadialGradient(ex, ey + 6, 0, ex, ey + 6, 22); p.addColorStop(0, 'rgba(255,240,200,1)'); p.addColorStop(0.25, 'rgba(255,40,20,1)'); p.addColorStop(1, 'rgba(120,0,0,0)');
    g.fillStyle = p; g.beginPath(); g.arc(ex, ey + 6, 22, 0, 7); g.fill();
  }
  // nose cavity
  g.fillStyle = '#050304'; g.beginPath(); g.moveTo(256, 268); g.lineTo(236, 318); g.lineTo(276, 318); g.closePath(); g.fill();
  // screaming mouth with teeth
  g.fillStyle = '#030102'; g.beginPath(); g.ellipse(256, 410, 62, 70, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(70,0,0,0.9)'; g.beginPath(); g.ellipse(256, 430, 38, 40, 0, 0, 7); g.fill();
  g.fillStyle = '#c9c0a0';
  for (let k = 0; k < 7; k++) { const x = 206 + k * 15; g.beginPath(); g.moveTo(x, 348 + Math.abs(k - 3) * 4); g.lineTo(x + 13, 348 + Math.abs(k - 3) * 4); g.lineTo(x + 6, 376 + Math.random() * 8); g.closePath(); g.fill(); }
  for (let k = 0; k < 6; k++) { const x = 212 + k * 15; g.beginPath(); g.moveTo(x, 474 - Math.abs(k - 2.5) * 4); g.lineTo(x + 13, 474 - Math.abs(k - 2.5) * 4); g.lineTo(x + 6, 450 - Math.random() * 8); g.closePath(); g.fill(); }
  // cracks
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2.5;
  for (let k = 0; k < 5; k++) { let x = 150 + Math.random() * 210, y = 70 + Math.random() * 40; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Math.random() - .5) * 40; y += 15 + Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- creature textures ----------
function rotty(g, W, H, n, cols) { for (let k = 0; k < n; k++) { g.fillStyle = cols[Math.floor(Math.random() * cols.length)]; g.globalAlpha = 0.08 + Math.random() * 0.25; const r = 2 + Math.random() * W * 0.06; g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, r, r * (0.4 + Math.random()), Math.random() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; }
export function zombieSkin() {
  const W = 256, H = 256; const [c, g] = cv(W, H); g.fillStyle = '#b8bca8'; g.fillRect(0, 0, W, H);
  rotty(g, W, H, 500, ['#6a7a50', '#8a8a60', '#5a4a3a', '#a0a890', '#4a3028', '#7a2a20']);
  g.strokeStyle = 'rgba(70,20,40,0.45)'; g.lineWidth = 1.2; for (let k = 0; k < 40; k++) { let x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Math.random() - .5) * 22; y += (Math.random() - .5) * 22; g.lineTo(x, y); } g.stroke(); }
  for (let k = 0; k < 7; k++) { const x = Math.random() * W, y = Math.random() * H, r = 6 + Math.random() * 14; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,0,0,0.95)'); gr.addColorStop(0.6, 'rgba(120,10,10,0.7)'); gr.addColorStop(1, 'rgba(120,10,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function zombieCloth() {
  const W = 256, H = 256; const [c, g] = cv(W, H); g.fillStyle = '#c8c4bc'; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.25; for (let y = 0; y < H; y += 3) { g.fillStyle = y % 6 ? '#9a968e' : '#d8d4cc'; g.fillRect(0, y, W, 1); } for (let x = 0; x < W; x += 4) { g.fillStyle = '#a8a49c'; g.fillRect(x, 0, 1, H); } g.globalAlpha = 1;
  rotty(g, W, H, 220, ['#5a4a3a', '#3a2a20', '#6a6a5a', '#2a1a14']);
  for (let k = 0; k < 6; k++) { const x = Math.random() * W, y = Math.random() * H; g.fillStyle = 'rgba(90,8,8,0.85)'; g.beginPath(); g.ellipse(x, y, 8 + Math.random() * 18, 6 + Math.random() * 12, Math.random() * 3, 0, 7); g.fill(); for (let d = 0; d < 4; d++) { g.fillRect(x + (Math.random() - .5) * 20, y, 2 + Math.random() * 2, 10 + Math.random() * 30); } }
  g.fillStyle = '#1a1210'; for (let k = 0; k < 10; k++) { const x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 5; s++) g.lineTo(x + (Math.random() - .5) * 26, y + (Math.random() - .5) * 26); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function zombieHead() {
  const W = 512, H = 256; const [c, g] = cv(W, H); g.fillStyle = '#b8bca8'; g.fillRect(0, 0, W, H);
  rotty(g, W, H, 700, ['#6a7a50', '#8a8a60', '#5a4a3a', '#a0a890', '#4a3028']);
  // face centred at u=0.25 (x=128); v: top=0
  const fx = 128;
  for (const s of [-1, 1]) { const ex = fx + s * 26, ey = 112; const gr = g.createRadialGradient(ex, ey, 2, ex, ey, 24); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(20,0,0,0.9)'); gr.addColorStop(1, 'rgba(40,10,10,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(ex, ey, 22, 18, 0, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(20,0,0,0.9)'; g.beginPath(); g.moveTo(fx, 122); g.lineTo(fx - 7, 142); g.lineTo(fx + 7, 142); g.fill();
  g.fillStyle = '#140404'; g.beginPath(); g.ellipse(fx, 170, 30, 14, 0, 0, 7); g.fill();
  g.fillStyle = '#c8b890'; for (let k = 0; k < 8; k++) g.fillRect(fx - 26 + k * 6.5, 158, 4.5, 7 + Math.random() * 4);
  g.fillStyle = 'rgba(110,5,5,0.85)'; for (let d = 0; d < 6; d++) g.fillRect(fx - 24 + Math.random() * 48, 176, 3, 14 + Math.random() * 40);
  for (let k = 0; k < 5; k++) { const x = 220 + Math.random() * 260, y = 40 + Math.random() * 160, r = 8 + Math.random() * 16; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,0,0,0.95)'); gr.addColorStop(1, 'rgba(120,10,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(30,26,20,0.85)'; for (let k = 0; k < 60; k++) g.fillRect(Math.random() * W, Math.random() * 30, 2, 12 + Math.random() * 20);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
