// ZOMBIE WAR: LAST CITY – procedural city arena (GUNVORA GAMES)
import * as THREE from 'three';
import { Builder, G } from './builder.js';
import { canvasTex, normalFromTex, grime, seeded, clamp, rand } from './core.js';

let T = null;
const speck = (x, w, h, n, a, c = '0,0,0') => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${c},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } };
const R1 = [1, 1];
function facadeTex(kind) {
  // 512px = 12m x 12m : 4 floors x 6 windows
  const lit = [];
  const map = canvasTex(512, 512, (x, w, h) => {
    if (kind === 'brick') {
      x.fillStyle = '#9a9088'; x.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) { const o = (y / 8) % 2 ? 0 : 9; for (let xx = -18 + o; xx < w; xx += 18) { const v = 140 + Math.random() * 40; x.fillStyle = `rgb(${v},${v * 0.93},${v * 0.88})`; x.fillRect(xx + 1, y + 1, 16, 6); } }
    } else {
      x.fillStyle = '#b4b0a6'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; for (let y = 0; y <= h; y += 128) { x.beginPath(); x.moveTo(0, y + 1); x.lineTo(w, y + 1); x.stroke(); } for (let xx = 0; xx <= w; xx += 170.6) { x.beginPath(); x.moveTo(xx + 1, 0); x.lineTo(xx + 1, h); x.stroke(); }
      speck(x, w, h, 4000, 0.15);
    }
    grime(x, w, h, 140, 0.18);
    // streaks
    for (let i = 0; i < 40; i++) { const sx = Math.random() * w, sy = Math.random() * h; const g = x.createLinearGradient(0, sy, 0, sy + 90); g.addColorStop(0, 'rgba(20,15,10,.25)'); g.addColorStop(1, 'rgba(20,15,10,0)'); x.fillStyle = g; x.fillRect(sx, sy, 3 + Math.random() * 6, 90); }
    for (let f = 0; f < 4; f++) for (let c = 0; c < 6; c++) {
      const wx = c * 85.33 + 20, wy = f * 128 + 34, ww = 46, wh = 66, r = Math.random();
      x.fillStyle = '#2b2622'; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
      x.fillStyle = '#d8d2c4'; x.fillRect(wx - 6, wy + wh + 3, ww + 12, 5);
      if (r < 0.12) { x.fillStyle = '#6a4a2a'; x.fillRect(wx, wy, ww, wh); x.fillStyle = '#4a321c'; for (let k = 0; k < 4; k++) { x.save(); x.translate(wx + ww / 2, wy + 10 + k * 16); x.rotate((Math.random() - .5) * 0.4); x.fillRect(-ww / 2 - 3, -5, ww + 6, 10); x.restore(); } }
      else if (r < 0.2) { x.fillStyle = '#050505'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(140,160,180,.5)'; x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + ww * 0.6, wy); x.lineTo(wx + ww * 0.2, wy + wh * 0.5); x.fill(); }
      else { const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, '#2a3440'); g.addColorStop(0.5, '#10151b'); g.addColorStop(1, '#1d2630'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh); x.fillStyle = '#2b2622'; x.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); x.fillRect(wx, wy + wh * 0.42, ww, 3); if (r > 0.62) lit.push([wx, wy, ww, wh, Math.random()]); }
    }
  }, R1);
  const emi = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (const [wx, wy, ww, wh, k] of lit) {
      const g = x.createLinearGradient(wx, wy, wx, wy + wh);
      if (k < 0.2) { g.addColorStop(0, '#4a6aa8'); g.addColorStop(1, '#203a70'); } else if (k < 0.3) { g.addColorStop(0, '#c03018'); g.addColorStop(1, '#601008'); } else { g.addColorStop(0, '#ffcf7a'); g.addColorStop(1, '#b0641c'); }
      x.fillStyle = g; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); x.fillRect(wx, wy + wh * 0.42, ww, 3);
      if (Math.random() < 0.5) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(wx, wy, ww * (0.2 + Math.random() * 0.3), wh); }
    }
  }, R1);
  return { map, emi, nrm: normalFromTex(map, 2.2) };
}
export function cityTextures() {
  if (T) return T; T = {};
  T.asphalt = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#3c3c3e'; x.fillRect(0, 0, w, h); speck(x, w, h, 12000, 0.28); speck(x, w, h, 5000, 0.12, '255,255,255');
    for (let i = 0; i < 7; i++) { x.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.1})`; x.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 140, 30 + Math.random() * 100); }
    x.strokeStyle = 'rgba(8,8,8,.75)'; for (let i = 0; i < 16; i++) { x.lineWidth = 1 + Math.random() * 1.6; x.beginPath(); let px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py); for (let k = 0; k < 9; k++) { px += (Math.random() - .5) * 46; py += (Math.random() - .5) * 46; x.lineTo(px, py); } x.stroke(); }
    grime(x, w, h, 70, 0.3);
  }, R1);
  T.asphaltN = normalFromTex(T.asphalt, 2.5);
  T.side = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8f8b84'; x.fillRect(0, 0, w, h); speck(x, w, h, 3000, 0.2); speck(x, w, h, 1500, 0.15, '255,255,255');
    x.fillStyle = 'rgba(30,25,20,.6)'; for (let i = 0; i <= 2; i++) { x.fillRect(0, i * 128 - 1, w, 3); x.fillRect(i * 128 - 1, 0, 3, h); }
    grime(x, w, h, 40, 0.2); for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(40,40,40,.4)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2, 0, 7); x.fill(); }
  }, R1);
  T.sideN = normalFromTex(T.side, 2);
  T.shutter = canvasTex(256, 256, (x, w, h) => {
    for (let y = 0; y < h; y += 8) { const g = x.createLinearGradient(0, y, 0, y + 8); g.addColorStop(0, '#9a9a96'); g.addColorStop(0.5, '#6c6c6a'); g.addColorStop(1, '#4a4a48'); x.fillStyle = g; x.fillRect(0, y, w, 8); }
    grime(x, w, h, 60, 0.25);
    const cols = ['#e83a3a', '#3ad0ff', '#ffd23a', '#7aff5a', '#ff5ad8', '#ffffff'];
    for (let i = 0; i < 5; i++) { x.strokeStyle = cols[i % cols.length]; x.lineWidth = 3 + Math.random() * 5; x.lineCap = 'round'; x.beginPath(); let px = Math.random() * w, py = 60 + Math.random() * 150; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (Math.random() - .3) * 40; py += (Math.random() - .5) * 50; x.quadraticCurveTo(px + 20, py - 30, px, py); } x.stroke(); }
    x.font = 'bold 34px Impact,sans-serif'; x.fillStyle = 'rgba(200,20,20,.85)'; x.save(); x.translate(30, 200); x.rotate(-0.08); x.fillText(['RUN', 'NO HOPE', 'DEAD ZONE', 'HELP US', 'THEY BITE'][Math.floor(Math.random() * 5)], 0, 0); x.restore();
  }, R1);
  T.brick = facadeTex('brick'); T.conc = facadeTex('conc');
  T.barrel = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#a3140e'; x.fillRect(0, 0, w, h); for (let y of [18, 108]) { x.fillStyle = '#5a0a06'; x.fillRect(0, y, w, 6); }
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#111' : '#f0c418'; x.beginPath(); x.moveTo(i * 16, 50); x.lineTo(i * 16 + 16, 50); x.lineTo(i * 16 + 8, 78); x.lineTo(i * 16 - 8, 78); x.fill(); }
    x.fillStyle = '#111'; x.font = 'bold 15px Arial'; x.fillText('FLAMMABLE', 70, 40); x.fillText('DANGER', 90, 100); grime(x, w, h, 50, 0.3);
  }, R1);
  T.crate = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#4e5a2e'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a4422'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 32, w, 2);
    x.strokeStyle = '#2a3216'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#e8e0b0'; x.font = 'bold 28px Impact,sans-serif'; x.fillText('AMMO', 30, 74); grime(x, w, h, 30, 0.25);
  });
  T.neon = ['PHARMACY', 'MOTEL', 'BAR', 'OPEN 24H', 'HOTEL', 'DINER', 'GUNS', 'CASINO'].map((s, i) => canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = '#060606'; x.fillRect(0, 0, w, h); const c = ['#ff2a5a', '#2af0ff', '#ff9a1a', '#6aff3a', '#ff3aff', '#ffee3a', '#ff3a3a', '#3a8aff'][i];
    x.font = 'bold 40px Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = c; x.shadowBlur = 16; x.fillStyle = c; x.fillText(s, w / 2, h / 2 + 2); x.shadowBlur = 0; x.fillStyle = '#fff'; x.globalAlpha = 0.7; x.fillText(s, w / 2, h / 2 + 2);
  }));
  return T;
}

const SKY = {
  dusk: { top: 0x1a1640, mid: 0x9a4a40, bot: 0x2a1a1a, sun: 0xff8a3a, fog: 0x5a3238, fogD: 0.017 },
  night: { top: 0x020310, mid: 0x0c1220, bot: 0x050608, sun: 0x9ab4ff, fog: 0x070b14, fogD: 0.03 },
};

export class City {
  constructor(scene, L, P, quality, fx, smoke) {
    this.scene = scene; this.P = P; this.fx = fx; this.smoke = smoke; this.L = L;
    const r = this.r = seeded(L * 7919 + 17); this.ri = (a, b) => Math.floor(a + r() * (b - a + 1)); this.rr = (a, b) => a + r() * (b - a);
    const H = this.H = P.H, M = this.M = 16; this.night = P.night;
    this.group = new THREE.Group(); scene.add(this.group);
    this.colliders = []; this.lamps = []; this.fires = []; this.exits = []; this.barrels = []; this.signs = []; this.plumes = [];
    const tx = cityTextures(); this.tex = tx;
    // grid
    this.N = 2 * (H + M); this.g0 = -H - M; this.occ = new Uint8Array(this.N * this.N);
    const B = this.b = new Builder();
    this.buildLayout();
    // materials
    const em = this.night ? 1.5 : 0.55;
    const mats = {
      asphalt: new THREE.MeshStandardMaterial({ map: tx.asphalt, normalMap: tx.asphaltN, normalScale: new THREE.Vector2(0.7, 0.7), roughness: this.night ? 0.62 : 0.9, metalness: 0.05, vertexColors: true }),
      side: new THREE.MeshStandardMaterial({ map: tx.side, normalMap: tx.sideN, roughness: 0.85, vertexColors: true }),
      brick: new THREE.MeshStandardMaterial({ map: tx.brick.map, normalMap: tx.brick.nrm, emissiveMap: tx.brick.emi, emissive: 0xffffff, emissiveIntensity: em, roughness: 0.85, vertexColors: true }),
      conc: new THREE.MeshStandardMaterial({ map: tx.conc.map, normalMap: tx.conc.nrm, emissiveMap: tx.conc.emi, emissive: 0xffffff, emissiveIntensity: em, roughness: 0.8, vertexColors: true }),
      shutter: new THREE.MeshStandardMaterial({ map: tx.shutter, roughness: 0.6, metalness: 0.4, vertexColors: true }),
      metal: new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.55, vertexColors: true }),
      glass: new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.12, metalness: 0.9, vertexColors: true }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92 }),
      matte: new THREE.MeshStandardMaterial({ roughness: 0.9, vertexColors: true }),
      leaf: new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: true, flatShading: true }),
      glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4, 2.6), vertexColors: true, toneMapped: false }),
      fire: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.4), vertexColors: true, toneMapped: false }),
      paint: new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 }),
    };
    this.mats = mats;
    this.meshes = B.build(mats, this.group, { cast: { asphalt: false, paint: false, glow: false, fire: false, side: false } });
    this.buildSky();
    this.buildLights(quality);
    this.buildFlow();
    this.flowT = 0; this.lampT = 0; this.nearLamps = []; this.nearFires = []; this.t = 0;
  }
  /* ---- grid helpers ---- */
  cell(x, z) { const i = Math.floor(x - this.g0), j = Math.floor(z - this.g0); if (i < 0 || j < 0 || i >= this.N || j >= this.N) return -1; return j * this.N + i; }
  mark(x0, z0, x1, z1, v = 1) { for (let z = Math.floor(z0); z < Math.ceil(z1); z++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) { const c = this.cell(x + 0.5, z + 0.5); if (c >= 0) this.occ[c] = Math.max(this.occ[c], v); } }
  free(x0, z0, x1, z1) { for (let z = Math.floor(z0); z < Math.ceil(z1); z++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) { const c = this.cell(x + 0.5, z + 0.5); if (c < 0 || this.occ[c]) return false; } return true; }
  col(x0, z0, x1, z1, h, kind = 'solid') { const c = { x0, z0, x1, z1, h, on: true, kind }; this.colliders.push(c); return c; }
  /* ---- layout ---- */
  buildLayout() {
    const H = this.H, B = this.b, r = this.r, ri = this.ri, rr = this.rr, M = this.M;
    const lay = this.P.layout; let blocks = [], exits = [];
    if (lay === 'cross') { const a = 6, b = H - 7; for (const sx of [-1, 1]) for (const sz of [-1, 1]) blocks.push(rect(sx, sz, a, b)); exits = [['n', 0, 12], ['s', 0, 12], ['e', 0, 12], ['w', 0, 12]]; this.start = { x: 0, z: 0 }; this.streets = [['x', 0, 12], ['z', 0, 12]]; }
    else if (lay === 'plaza') { const a = Math.round(H * 0.5), b = H - 7; for (const sx of [-1, 1]) for (const sz of [-1, 1]) blocks.push(rect(sx, sz, a, b)); exits = [['n', 0, 10], ['s', 0, 10], ['e', 0, 10], ['w', 0, 10]]; this.start = { x: 0, z: H * 0.35 }; this.streets = []; }
    else { for (const sx of [-1, 1]) { blocks.push({ x0: sx < 0 ? -(H - 7) : 6, x1: sx < 0 ? -6 : H - 7, z0: -(H - 7), z1: -2.5 }); blocks.push({ x0: sx < 0 ? -(H - 7) : 6, x1: sx < 0 ? -6 : H - 7, z0: 2.5, z1: H - 7 }); } exits = [['n', 0, 12], ['s', 0, 12], ['e', 0, 5], ['w', 0, 5]]; this.start = { x: 0, z: 0 }; this.streets = [['z', 0, 12]]; }
    function rect(sx, sz, a, b) { return { x0: sx < 0 ? -b : a, x1: sx < 0 ? -a : b, z0: sz < 0 ? -b : a, z1: sz < 0 ? -a : b }; }
    this.blocks = blocks;
    // ground
    const ext = H + M + 30;
    B.add('asphalt', G.box, [0, -0.5, 0], [0, 0, 0], [ext * 2, 1, ext * 2], 0xffffff, 8);
    // perimeter sidewalk strip
    const sw = 2.2;
    for (const [x, z, w, d] of [[0, -H + sw / 2, H * 2, sw], [0, H - sw / 2, H * 2, sw], [-H + sw / 2, 0, sw, H * 2 - sw * 2], [H - sw / 2, 0, sw, H * 2 - sw * 2]]) B.add('side', G.box, [x, 0.06, z], [0, 0, 0], [w, 0.12, d], 0xffffff, 3);
    // perimeter buildings with exit gaps
    const gaps = { n: [], s: [], e: [], w: [] }; for (const [s, c, w] of exits) gaps[s].push([c - w / 2, c + w / 2]);
    const D = 14;
    const side = (s) => {
      const along = s === 'n' || s === 's'; const lo = along ? -H - D : -H, hi = along ? H + D : H;
      let p = lo;
      while (p < hi - 0.5) {
        let w = Math.min(hi - p, rr(6, 13)); const g = gaps[s].find(([a, b]) => p + w > a && p < b);
        if (g) { if (p < g[0] - 0.5) w = g[0] - p; else { p = g[1]; continue; } }
        const hgt = rr(9, 30) * (this.P.boss ? 1.2 : 1);
        const c = p + w / 2;
        if (s === 'n') this.building(c - w / 2, -H - D, c + w / 2, -H, hgt, 's');
        if (s === 's') this.building(c - w / 2, H, c + w / 2, H + D, hgt, 'n');
        if (s === 'w') this.building(-H - D, c - w / 2, -H, c + w / 2, hgt, 'e');
        if (s === 'e') this.building(H, c - w / 2, H + D, c + w / 2, hgt, 'w');
        p += w;
      }
    };
    ['n', 's', 'e', 'w'].forEach(side);
    // exits: street stubs with barricades; zombies pour in through the gaps
    for (const [s, c, w] of exits) {
      const o = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[s]; const along = o[1] !== 0;
      const pt = (d, a) => along ? [c + a, o[1] * (H + d)] : [o[0] * (H + d), c + a];
      const [fx, fz] = pt(D - 0.5, 0); // far end fence
      if (along) this.wallBox(c - w / 2, fz - 0.5, c + w / 2, fz + 0.5, 3.2, 0x3a3a3a); else this.wallBox(fx - 0.5, c - w / 2, fx + 0.5, c + w / 2, 3.2, 0x3a3a3a);
      // fire glow at the far end
      const [gx, gz] = pt(D - 2.5, 0); this.fires.push({ x: gx, y: 0.5, z: gz, big: 1 });
      // barricade at the boundary leaving gaps at the sides
      if (w >= 9) { const [bx, bz] = pt(1.5, 0); this.car(bx, bz, along ? Math.PI / 2 : 0, r() < 0.5, w > 10 ? 'bus' : 'car'); }
      else { const [bx, bz] = pt(1.2, 0); this.barrier(bx, bz, along ? 0 : Math.PI / 2); }
      const sp = []; for (let k = -1; k <= 1; k++) sp.push(pt(D - 4, k * w * 0.3)); this.exits.push({ side: s, pts: sp });
      // asphalt marks the street stub
      for (let d = 2; d < D - 1; d += 4) { const [mx, mz] = pt(d, 0); B.add('paint', G.box, [mx, 0.012, mz], [0, along ? 0 : Math.PI / 2, 0], [0.18, 0.02, 2], 0xd8c860); }
    }
    // interior blocks
    const types = ['bld', 'bld', 'bld', 'park', 'lot']; const nb = blocks.length;
    blocks.forEach((b, i) => {
      const t = this.P.boss ? (i % 2 ? 'bld' : 'park') : types[ri(0, types.length - 1)];
      B.add('side', G.box, [(b.x0 + b.x1) / 2, 0.06, (b.z0 + b.z1) / 2], [0, 0, 0], [b.x1 - b.x0, 0.12, b.z1 - b.z0], 0xffffff, 3);
      // curb
      this.mark(b.x0, b.z0, b.x1, b.z1, 1);
      const ins = 1.8;
      if (t === 'bld') this.building(b.x0 + ins, b.z0 + ins, b.x1 - ins, b.z1 - ins, rr(8, 24), 'all');
      else if (t === 'park') this.park(b);
      else this.lot(b);
      // lamps at the corners
      for (const [cx, cz] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) { const dx = cx === b.x0 ? -1 : 1, dz = cz === b.z0 ? -1 : 1; this.lamp(cx - dx * 0.7, cz - dz * 0.7, Math.atan2(dx, dz)); }
    });
    // perimeter lamps
    for (let k = -1; k <= 1; k += 2) for (const s of [-1, 1]) { this.lamp(k * H * 0.55, s * (H - 1.2), s > 0 ? Math.PI : 0); this.lamp(s * (H - 1.2), k * H * 0.55, s > 0 ? -Math.PI / 2 : Math.PI / 2); }
    // plaza monument
    if (lay === 'plaza') this.monument(0, 0);
    // road markings
    for (const [ax, at, w] of this.streets) {
      for (let p = -H + 2; p < H - 2; p += 4) { if (Math.abs(p) < w / 2 + 2 && this.streets.length > 1) continue; ax === 'x' ? B.add('paint', G.box, [p, 0.012, at], [0, 0, 0], [2, 0.02, 0.16], 0xe0e0d0) : B.add('paint', G.box, [at, 0.012, p], [0, 0, 0], [0.16, 0.02, 2], 0xe0e0d0); }
      ax === 'x' ? [-1, 1].forEach(s => { B.add('paint', G.box, [-H + 1, 0.012, at + s * (w / 2 - 0.3)], [0, 0, 0], [0.01, 0.02, 0.01], 0xffffff); }) : 0;
    }
    if (this.streets.length > 1) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = -5; k <= 5; k++) { const along = dx !== 0; B.add('paint', G.box, along ? [dx * 7.5, 0.012, k * 1.0] : [k * 1.0, 0.012, dz * 7.5], [0, 0, 0], along ? [2.2, 0.02, 0.5] : [0.5, 0.02, 2.2], 0xe8e8e0); }
    // keep start area clear
    const s = this.start; this.mark(s.x - 3.5, s.z - 3.5, s.x + 3.5, s.z + 3.5, 2);
    // sandbag nest near start
    if (!this.P.boss) this.sandbags(s.x + (r() < 0.5 ? -4.5 : 4.5), s.z + rr(-2, 2));
    // props in streets
    const nCars = (this.P.boss ? 4 : 7) + ri(0, 4);
    for (let i = 0; i < nCars; i++) this.place(2.4, 4.8, (x, z, rot) => this.car(x, z, rot, r() < 0.35));
    for (let i = 0; i < 4 + ri(0, 3); i++) this.place(0.8, 3.2, (x, z, rot) => this.barrier(x, z, rot));
    for (let i = 0; i < 2 + ri(0, 2); i++) this.place(1.3, 2.0, (x, z, rot) => this.dumpster(x, z, rot));
    for (let i = 0; i < 2 + ri(0, 2); i++) this.place(1, 1, (x, z) => this.oilFire(x, z));
    const nBar = (this.P.boss ? 6 : 4) + ri(0, 4); for (let i = 0; i < nBar; i++) this.place(1, 1, (x, z) => this.barrels.push({ x, z, hp: 30, alive: true }));
    for (let i = 0; i < 26; i++) this.debris();
    for (const b of this.barrels) b.col = this.col(b.x - 0.34, b.z - 0.34, b.x + 0.34, b.z + 0.34, 1.0, 'barrel');
    // smoke plumes on the skyline
    for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2, d = H + rr(25, 55); this.plumes.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: rr(10, 25) }); }
  }
  place(w, d, fn, tries = 40) {
    const H = this.H; for (let k = 0; k < tries; k++) {
      const rot = this.r() < 0.5 ? 0 : Math.PI / 2; const ww = rot ? d : w, dd = rot ? w : d;
      const x = this.rr(-H + 3 + ww / 2, H - 3 - ww / 2), z = this.rr(-H + 3 + dd / 2, H - 3 - dd / 2);
      if (this.free(x - ww / 2 - 1.2, z - dd / 2 - 1.2, x + ww / 2 + 1.2, z + dd / 2 + 1.2)) { this.mark(x - ww / 2 - 0.6, z - dd / 2 - 0.6, x + ww / 2 + 0.6, z + dd / 2 + 0.6); fn(x, z, rot + this.rr(-0.12, 0.12)); return true; }
    } return false;
  }
  building(x0, z0, x1, z1, h, face) {
    const B = this.b, r = this.r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const key = r() < 0.5 ? 'brick' : 'conc';
    const tint = new THREE.Color().setHSL(this.rr(0.02, 0.12), this.rr(0.05, 0.35), this.rr(0.45, 0.8)).getHex();
    B.add(key, G.box, [cx, h / 2, cz], [0, 0, 0], [w, h, d], tint, 12);
    B.add('matte', G.box, [cx, h + 0.25, cz], [0, 0, 0], [w + 0.5, 0.5, d + 0.5], 0x4a4644);
    B.add('asphalt', G.box, [cx, h + 0.52, cz], [0, 0, 0], [w - 0.2, 0.06, d - 0.2], 0x555555, 8);
    // ground floor shutters/storefront band
    B.add('shutter', G.box, [cx, 1.75, cz], [0, 0, 0], [w + 0.08, 3.5, d + 0.08], 0xffffff, 4);
    B.add('matte', G.box, [cx, 3.6, cz], [0, 0, 0], [w + 0.4, 0.25, d + 0.4], 0x2a2624);
    // rooftop clutter
    for (let i = 0; i < 2; i++) if (w > 5 && d > 5) { const px = cx + this.rr(-w / 3, w / 3), pz = cz + this.rr(-d / 3, d / 3); if (r() < 0.5) { B.add('metal', G.cyl, [px, h + 1.6, pz], [0, 0, 0], [1.6, 2.2, 1.6], 0x6a5a4a); B.add('metal', G.cone, [px, h + 3, pz], [0, 0, 0], [1.8, 0.6, 1.8], 0x4a3a2a); } else B.add('metal', G.box, [px, h + 1, pz], [0, 0, 0], [1.6, 1, 1.2], 0x8a8a8a); }
    // neon sign
    if (r() < 0.55 && this.signs.length < 6) {
      const faces = face === 'all' ? ['n', 's', 'e', 'w'] : [face]; const f = faces[this.ri(0, faces.length - 1)];
      const sw = Math.min(5, (f === 'n' || f === 's' ? w : d) * 0.7);
      const p = { n: [cx, z0 - 0.12, Math.PI], s: [cx, z1 + 0.12, 0], e: [x1 + 0.12, cz, Math.PI / 2], w: [x0 - 0.12, cz, -Math.PI / 2] }[f];
      const tex = this.tex.neon[this.ri(0, this.tex.neon.length - 1)];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 4), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false }));
      const X = f === 'e' || f === 'w' ? p[0] : p[0], Z = f === 'e' || f === 'w' ? p[1] : p[1];
      m.position.set(f === 'e' || f === 'w' ? p[0] : p[0], 4.6, f === 'e' || f === 'w' ? p[1] : p[1]); m.rotation.y = p[2]; this.group.add(m); this.signs.push({ m, ph: r() * 10, flick: r() < 0.4 });
    }
    this.col(x0, z0, x1, z1, h + 1); this.mark(x0, z0, x1, z1, 1);
  }
  wallBox(x0, z0, x1, z1, h, color) { this.b.add('metal', G.box, [(x0 + x1) / 2, h / 2, (z0 + z1) / 2], [0, 0, 0], [x1 - x0, h, z1 - z0], color); this.col(x0, z0, x1, z1, h); this.mark(x0, z0, x1, z1, 1); }
  car(x, z, rot, burnt, kind = 'car') {
    const B = this.b, bus = kind === 'bus';
    const L = bus ? 10 : 4.3, W = bus ? 2.5 : 1.85, Hh = bus ? 2.9 : 0.75;
    const col = burnt ? 0x221a16 : bus ? 0xd8a020 : [0x8a1a14, 0x1a3a6a, 0xb0b0a8, 0x2a2a2a, 0x2a5a3a, 0x7a6a50][this.ri(0, 5)];
    const pos = (lx, ly, lz) => { const c = Math.cos(rot), s = Math.sin(rot); return [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
    B.add('metal', G.box, pos(0, 0.25 + Hh / 2, 0), [0, rot, 0], [W, Hh, L], col);
    if (!bus) { B.add('metal', G.box, pos(0, 1.28, -0.2), [0, rot, 0], [W * 0.9, 0.06, 2.0], col); B.add('glass', G.box, pos(0, 1.05, -0.2), [0, rot, 0], [W * 0.86, 0.5, 2.0], burnt ? 0x111111 : 0xffffff); B.add('glass', G.box, pos(0, 1.02, 0.95), [0.5, rot, 0], [W * 0.84, 0.5, 0.1], 0xffffff); }
    else { for (let k = -4; k <= 3.5; k += 1.6) B.add('glass', G.box, pos(0, 2.2, k), [0, rot, 0], [W + 0.04, 0.8, 1.3], 0xffffff); B.add('matte', G.box, pos(0, 1.0, 0), [0, rot, 0], [W + 0.03, 0.2, L], 0x2a2a2a); }
    for (const sx of [-1, 1]) for (const sz of (bus ? [-3.6, 3.4] : [-1.35, 1.35])) B.add('rubber', G.cyl, pos(sx * W * 0.47, 0.36, sz), [0, rot, Math.PI / 2], [0.72, 0.3, 0.72], 0x111111);
    // lights
    if (!burnt) { for (const sx of [-1, 1]) { B.add('glow', G.box, pos(sx * W * 0.35, 0.65, L / 2 + 0.01), [0, rot, 0], [0.32, 0.12, 0.03], 0x553b20); B.add('fire', G.box, pos(sx * W * 0.35, 0.65, -L / 2 - 0.01), [0, rot, 0], [0.3, 0.1, 0.03], 0x601010); } }
    const hw = (Math.abs(Math.cos(rot)) * W + Math.abs(Math.sin(rot)) * L) / 2 - 0.08, hd = (Math.abs(Math.sin(rot)) * W + Math.abs(Math.cos(rot)) * L) / 2 - 0.08;
    this.col(x - hw, z - hd, x + hw, z + hd, bus ? 3.2 : 1.35); this.mark(x - hw, z - hd, x + hw, z + hd);
    if (burnt) { this.fires.push({ x, y: bus ? 1.5 : 1.0, z, big: bus ? 1.4 : 1 }); B.add('fire', G.box, pos(0, Hh + 0.3, 0), [0, rot, 0], [W * 0.6, 0.05, 1.2], 0x803010); }
  }
  barrier(x, z, rot) {
    const B = this.b, pos = (lz) => [x + Math.sin(rot) * lz, 0, z + Math.cos(rot) * lz];
    for (const k of [-1.05, 1.05]) { const p = pos(k); B.add('side', G.box, [p[0], 0.2, p[2]], [0, rot, 0], [0.62, 0.4, 2], 0xd0ccc4, 2); B.add('side', G.box, [p[0], 0.62, p[2]], [0, rot, 0], [0.3, 0.5, 2], 0xd0ccc4, 2); B.add('paint', G.box, [p[0], 0.75, p[2]], [0, rot, 0], [0.31, 0.12, 0.6], 0xc02010); }
    const hw = Math.abs(Math.sin(rot)) * 2.1 + 0.32, hd = Math.abs(Math.cos(rot)) * 2.1 + 0.32;
    this.col(x - hw, z - hd, x + hw, z + hd, 0.9);
  }
  dumpster(x, z, rot) {
    const B = this.b; const w = rot > 0.7 ? 2 : 1.2, d = rot > 0.7 ? 1.2 : 2;
    B.add('metal', G.box, [x, 0.65, z], [0, rot, 0], [1.2, 1.1, 2], 0x2a4a2a); B.add('metal', G.box, [x, 1.24, z], [0.12, rot, 0], [1.28, 0.08, 2.05], 0x1a301a);
    this.col(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 1.3);
  }
  oilFire(x, z) { this.b.add('metal', G.cyl, [x, 0.45, z], [0, 0, 0], [0.62, 0.9, 0.62], 0x3a2a20); this.b.add('fire', G.cyl, [x, 0.9, z], [0, 0, 0], [0.55, 0.04, 0.55], 0xff8030); this.col(x - 0.33, z - 0.33, x + 0.33, z + 0.33, 1); this.fires.push({ x, y: 1.0, z, big: 0.55 }); }
  lamp(x, z, ang) {
    const B = this.b, broken = this.r() < 0.25; const ax = x + Math.sin(ang) * 1.4, az = z + Math.cos(ang) * 1.4;
    B.add('metal', G.cyl6, [x, 3, z], [0, 0, 0], [0.14, 6, 0.14], 0x2a2c2e); B.add('metal', G.box, [(x + ax) / 2, 6, (z + az) / 2], [0, ang, 0], [0.08, 0.08, 1.5], 0x2a2c2e);
    B.add('metal', G.box, [ax, 5.92, az], [0, ang, 0], [0.32, 0.12, 0.6], 0x3a3c3e); B.add('glow', G.box, [ax, 5.85, az], [0, ang, 0], [0.26, 0.03, 0.5], broken ? 0x080808 : 0xffffff);
    this.lamps.push({ x: ax, y: 5.7, z: az, broken, flick: !broken && this.r() < 0.2 });
    this.col(x - 0.1, z - 0.1, x + 0.1, z + 0.1, 6);
  }
  sandbags(x, z) { for (let i = -2; i <= 2; i++) { const a = i * 0.32; const px = x + Math.sin(a) * 1.2 * Math.sign(x || 1), pz = z + i * 0.6; for (let k = 0; k < 2; k++) this.b.add('matte', G.sph, [px, 0.18 + k * 0.3, pz], [0, 0, 0], [0.6, 0.32, 0.65], 0x8a7a5a); } this.col(x - 0.5, z - 1.6, x + 0.5, z + 1.6, 0.7); this.mark(x - 0.6, z - 1.7, x + 0.6, z + 1.7); }
  park(b) {
    const B = this.b; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    B.add('matte', G.box, [cx, 0.13, cz], [0, 0, 0], [b.x1 - b.x0 - 1.6, 0.04, b.z1 - b.z0 - 1.6], 0x2a3a1c);
    const n = 3 + this.ri(0, 3); for (let i = 0; i < n; i++) { const x = this.rr(b.x0 + 2.5, b.x1 - 2.5), z = this.rr(b.z0 + 2.5, b.z1 - 2.5); this.tree(x, z); }
    // low fence
    for (const [x0, z0, x1, z1] of [[b.x0 + 0.8, b.z0 + 0.8, b.x1 - 0.8, b.z0 + 0.9], [b.x0 + 0.8, b.z1 - 0.9, b.x1 - 0.8, b.z1 - 0.8]]) B.add('metal', G.box, [(x0 + x1) / 2, 0.5, (z0 + z1) / 2], [0, 0, 0], [x1 - x0, 0.06, 0.06], 0x1a1a1a);
    this.bench(cx, cz);
  }
  tree(x, z) {
    const B = this.b, h = this.rr(3, 5), dead = this.r() < 0.4;
    B.add('matte', G.cyl6, [x, h / 2, z], [0, 0, 0], [0.32, h, 0.32], 0x3a2a1c);
    if (dead) { for (let k = 0; k < 4; k++) { const a = this.r() * 6.28; B.add('matte', G.cyl6, [x + Math.cos(a) * 0.6, h * 0.8 + k * 0.2, z + Math.sin(a) * 0.6], [Math.sin(a) * 0.8, 0, Math.cos(a) * 0.8], [0.1, 1.6, 0.1], 0x2a1c12); } }
    else for (let k = 0; k < 3; k++) B.add('leaf', G.sph, [x + this.rr(-0.5, 0.5), h + this.rr(-0.2, 0.8), z + this.rr(-0.5, 0.5)], [this.r(), this.r(), 0], [this.rr(1.8, 2.8), this.rr(1.4, 2.2), this.rr(1.8, 2.8)], new THREE.Color().setHSL(this.rr(0.15, 0.28), 0.4, this.rr(0.12, 0.22)).getHex());
    this.col(x - 0.2, z - 0.2, x + 0.2, z + 0.2, h); this.mark(x - 0.4, z - 0.4, x + 0.4, z + 0.4);
  }
  bench(x, z) { this.b.add('matte', G.box, [x, 0.45, z], [0, 0, 0], [1.8, 0.08, 0.5], 0x5a3a20); this.b.add('metal', G.box, [x, 0.22, z], [0, 0, 0], [1.6, 0.44, 0.1], 0x1a1a1a); this.col(x - 0.9, z - 0.25, x + 0.9, z + 0.25, 0.6); }
  lot(b) {
    const B = this.b; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    B.add('asphalt', G.box, [cx, 0.125, cz], [0, 0, 0], [b.x1 - b.x0 - 1, 0.01, b.z1 - b.z0 - 1], 0x777777, 8);
    for (let x = b.x0 + 2; x < b.x1 - 2; x += 2.6) B.add('paint', G.box, [x, 0.14, cz], [0, 0, 0], [0.1, 0.01, 5], 0xd0d0c0);
    for (let i = 0; i < 3; i++) { const x = this.rr(b.x0 + 2.5, b.x1 - 2.5), z = this.rr(b.z0 + 3, b.z1 - 3); if (!this.colliders.some(c => x > c.x0 - 2.5 && x < c.x1 + 2.5 && z > c.z0 - 3 && z < c.z1 + 3)) this.car(x, z, this.rr(-0.2, 0.2), this.r() < 0.3); }
    // guard booth
    const gx = b.x0 + 1.8, gz = b.z0 + 1.8; B.add('conc', G.box, [gx, 1.2, gz], [0, 0, 0], [1.6, 2.4, 1.6], 0xaaaaaa, 12); this.col(gx - 0.8, gz - 0.8, gx + 0.8, gz + 0.8, 2.4);
  }
  monument(x, z) {
    const B = this.b;
    B.add('side', G.box, [x, 0.4, z], [0, 0, 0], [4, 0.8, 4], 0xb0aca0, 2); B.add('side', G.box, [x, 1.6, z], [0, 0, 0], [2, 1.6, 2], 0x9a968c, 2);
    B.add('metal', G.box, [x, 3.3, z], [0, 0, 0], [0.7, 1.8, 0.5], 0x3a5a4a); B.add('metal', G.sph, [x, 4.45, z], [0, 0, 0], [0.5, 0.55, 0.5], 0x3a5a4a); B.add('metal', G.box, [x + 0.5, 3.9, z], [0, 0, 0.9], [1.2, 0.2, 0.2], 0x3a5a4a); B.add('metal', G.box, [x + 1.05, 4.55, z], [0, 0, 0.1], [0.08, 1.6, 0.08], 0x3a5a4a);
    this.col(x - 2, z - 2, x + 2, z + 2, 2.4); this.mark(x - 2.5, z - 2.5, x + 2.5, z + 2.5);
  }
  debris() {
    const B = this.b, H = this.H; const x = this.rr(-H + 1, H - 1), z = this.rr(-H + 1, H - 1); const c = this.cell(x, z); if (c < 0 || this.occ[c] === 2) return; const k = this.r();
    if (k < 0.3) B.add('matte', G.sph, [x, 0.18, z], [0, this.r() * 3, 0], [0.55, 0.42, 0.5], 0x121212);
    else if (k < 0.5) B.add('rubber', G.cyl, [x, 0.12, z], [Math.PI / 2, 0, this.r()], [0.7, 0.24, 0.7]);
    else if (k < 0.75) B.add('paint', G.box, [x, 0.02, z], [0, this.r() * 3, 0], [0.3, 0.01, 0.4], 0xbab09a);
    else B.add('matte', G.box, [x, 0.15, z], [this.r() * 0.3, this.r() * 3, 0], [0.5, 0.3, 0.4], 0x6a5030);
  }
  /* ---- sky & lights ---- */
  buildSky() {
    const S = this.night ? SKY.night : SKY.dusk; this.sky = S;
    const sunDir = this.night ? new THREE.Vector3(-0.4, 0.45, -0.8).normalize() : new THREE.Vector3(0.75, 0.1, -0.65).normalize(); this.sunDir = sunDir;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(S.top) }, mid: { value: new THREE.Color(S.mid) }, bot: { value: new THREE.Color(S.bot) }, sunDir: { value: sunDir }, sunCol: { value: new THREE.Color(S.sun) }, night: { value: this.night ? 1 : 0 }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }`,
      fragmentShader: `uniform vec3 top,mid,bot,sunDir,sunCol; uniform float night,uTime; varying vec3 vD;
        float h3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); float a=h3(vec3(i,1.)),b=h3(vec3(i+vec2(1,0),1.)),c=h3(vec3(i+vec2(0,1),1.)),d=h3(vec3(i+vec2(1,1),1.)); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
        void main(){ vec3 d=normalize(vD); float h=d.y;
          vec3 c = h>0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0),0.55)) : mix(mid, bot, pow(clamp(-h*4.0,0.0,1.0),0.5));
          float s=max(dot(d,sunDir),0.0);
          c+= sunCol*(night>0.5 ? (smoothstep(0.9993,0.9996,s)*1.6+pow(s,40.0)*0.12) : (smoothstep(0.9985,0.999,s)*2.5+pow(s,6.0)*0.35+pow(s,60.0)*0.6));
          vec2 cu=d.xz/(h+0.15)*2.0+vec2(uTime*0.01,0.0); float cl=n2(cu)*0.6+n2(cu*2.3)*0.3+n2(cu*5.1)*0.1; cl=smoothstep(0.45,0.85,cl)*smoothstep(0.0,0.25,h);
          c=mix(c, night>0.5 ? vec3(0.012,0.016,0.03) : mix(vec3(0.08,0.03,0.05),sunCol*0.5,pow(s,3.0)), cl*0.85);
          if(night>0.5 && h>0.05){ vec3 p=floor(d*260.0); float r=h3(p); c+= vec3(step(0.9975,r))*0.7*(1.0-cl)*smoothstep(0.05,0.3,h); }
          gl_FragColor=vec4(c,1.0); }`
    });
    this.skyMat = mat; const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat); sky.frustumCulled = false; sky.renderOrder = -10; this.group.add(sky);
    this.scene.fog.color.set(S.fog); this.scene.fog.density = S.fogD * (this.P.boss ? 0.85 : 1); this.scene.background = new THREE.Color(S.fog);
    // distant skyline silhouettes
    const B = new Builder(); const r = this.r;
    for (let i = 0; i < 70; i++) { const a = (i / 70) * Math.PI * 2 + r() * 0.05, d = this.H + this.M + 8 + r() * 40, w = 6 + r() * 12, h = 15 + r() * 55; B.add('conc', G.box, [Math.cos(a) * d, h / 2, Math.sin(a) * d], [0, -a, 0], [w, h, w], 0x555555, 12); }
    const m = B.build({ conc: new THREE.MeshStandardMaterial({ map: this.tex.conc.map, emissiveMap: this.tex.conc.emi, emissive: 0xffffff, emissiveIntensity: this.night ? 1.1 : 0.4, color: 0x8a8a8a, vertexColors: true, roughness: 1 }) }, this.group, { cast: { conc: false } });
  }
  buildLights(quality) {
    const S = this.sky;
    this.hemi = new THREE.HemisphereLight(this.night ? 0x5a6ca8 : 0xc898a8, this.night ? 0x161210 : 0x4a3020, this.night ? 1.0 : 1.55); this.group.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(S.sun, this.night ? 0.8 : 2.7); sun.castShadow = quality === 'high';
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    this.group.add(sun, sun.target);
    this.lampLights = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffc27a, 0, 16, 1.5); this.group.add(l); this.lampLights.push(l); }
    this.fireLights = []; for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xff7a2a, 0, 14, 1.6); this.group.add(l); this.fireLights.push(l); }
  }
  /* ---- pathing ---- */
  buildFlow() {
    const N = this.N; this.blocked = new Uint8Array(N * N); this.dist = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = this.g0 + i + 0.5, z = this.g0 + j + 0.5; let b = 0;
      for (const c of this.colliders) { if (c.kind === 'barrel') continue; if (x > c.x0 - 0.45 && x < c.x1 + 0.45 && z > c.z0 - 0.45 && z < c.z1 + 0.45) { b = 1; break; } }
      this.blocked[j * N + i] = b;
    }
    this.queue = new Int32Array(N * N);
  }
  updateFlow(px, pz) {
    const N = this.N, D = this.dist, Bk = this.blocked, Q = this.queue; D.fill(1e9); let c0 = this.cell(px, pz); if (c0 < 0) return;
    if (Bk[c0]) { // find nearest open cell
      for (const o of [1, -1, N, -N, N + 1, N - 1, -N + 1, -N - 1]) if (!Bk[c0 + o]) { c0 += o; break; } }
    let h = 0, t = 0; Q[t++] = c0; D[c0] = 0;
    const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]];
    while (h < t) {
      const c = Q[h++], i = c % N, j = (c - i) / N, d = D[c];
      for (const [di, dj, w] of nb) {
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; const n = nj * N + ni; if (Bk[n]) continue;
        if (di && dj && (Bk[j * N + ni] || Bk[nj * N + i])) continue;
        if (D[n] > d + w) { if (D[n] >= 1e9) Q[t++] = n; D[n] = d + w; }
      }
    }
  }
  flowDir(x, z, out) {
    const N = this.N, c = this.cell(x, z); out.set(0, 0, 0); if (c < 0) return out;
    const i = c % N, j = (c - i) / N; let best = this.dist[c], bi = 0, bj = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; const n = nj * N + ni; if (this.blocked[n]) continue; if (di && dj && (this.blocked[j * N + ni] || this.blocked[nj * N + i])) continue; const d = this.dist[n]; if (d < best) { best = d; bi = di; bj = dj; } }
    if (bi || bj) { const tx = this.g0 + i + bi + 0.5, tz = this.g0 + j + bj + 0.5; out.set(tx - x, 0, tz - z).normalize(); }
    return out;
  }
  walkable(x, z) { const c = this.cell(x, z); return c >= 0 && !this.blocked[c] && this.dist[c] < 1e8; }
  inArena(x, z, m = 0) { return Math.abs(x) < this.H - m && Math.abs(z) < this.H - m; }
  randomSpot(minD, from, maxD = 1e9) {
    for (let k = 0; k < 200; k++) { const x = this.rr(-this.H + 2.5, this.H - 2.5), z = this.rr(-this.H + 2.5, this.H - 2.5); const c = this.cell(x, z); if (c < 0 || this.blocked[c] || this.occ[c] === 1) continue; const d = from ? Math.hypot(x - from.x, z - from.z) : 99; if (d < minD || d > maxD) continue; return new THREE.Vector3(x, 0, z); }
    return new THREE.Vector3(this.start.x + 2, 0, this.start.z + 2);
  }
  /* ---- physics queries ---- */
  collide(p, rad) {
    for (const c of this.colliders) {
      if (!c.on) continue;
      const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1); let dx = p.x - nx, dz = p.z - nz; const d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) { if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += dx * k; p.z += dz * k; } else {
        const l = p.x - c.x0, rgt = c.x1 - p.x, tp = p.z - c.z0, bt = c.z1 - p.z, m = Math.min(l, rgt, tp, bt); if (m === l) p.x = c.x0 - rad; else if (m === rgt) p.x = c.x1 + rad; else if (m === tp) p.z = c.z0 - rad; else p.z = c.z1 + rad; } }
    }
    const lim = this.H + this.M - 1; p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
  }
  los(ax, az, bx, bz, minH = 0) {
    const dx = bx - ax, dz = bz - az;
    for (const c of this.colliders) {
      if (!c.on || c.h < minH) continue; let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-9) { if (ax < c.x0 || ax > c.x1) continue; } else { let a = (c.x0 - ax) / dx, b = (c.x1 - ax) / dx; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-9) { if (az < c.z0 || az > c.z1) continue; } else { let a = (c.z0 - az) / dz, b = (c.z1 - az) / dz; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      return false;
    }
    return true;
  }
  // 3D ray vs collider boxes and ground. returns {t, n, c}
  ray(o, d, maxT) {
    let best = maxT, bn = null, bc = null;
    if (d.y < -1e-4) { const t = -o.y / d.y; if (t < best) { best = t; bn = [0, 1, 0]; } }
    for (const c of this.colliders) {
      if (!c.on) continue; let t0 = 0, t1 = best, ax = -1;
      const lo = [c.x0, 0, c.z0], hi = [c.x1, c.h, c.z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z]; let ok = true;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(dd[k]) < 1e-9) { if (oo[k] < lo[k] || oo[k] > hi[k]) { ok = false; break; } continue; }
        let a = (lo[k] - oo[k]) / dd[k], b = (hi[k] - oo[k]) / dd[k]; if (a > b) [a, b] = [b, a]; if (a > t0) { t0 = a; ax = k; } t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < best && ax >= 0) { best = t0; bn = [0, 0, 0]; bn[ax] = -Math.sign(dd[ax]); bc = c; }
    }
    return { t: best, n: bn, c: bc };
  }
  /* ---- per frame ---- */
  update(dt, player, tm) {
    this.t += dt; this.skyMat.uniforms.uTime.value = this.t;
    // shadows follow player
    const s = this.sun; s.target.position.set(player.x, 0, player.z); s.position.set(player.x + this.sunDir.x * 60, Math.max(25, this.sunDir.y * 80), player.z + this.sunDir.z * 60);
    // assign nearest lights
    this.lampT -= dt; if (this.lampT <= 0) {
      this.lampT = 0.4; const d = (o) => (o.x - player.x) ** 2 + (o.z - player.z) ** 2;
      this.nearLamps = this.lamps.filter(l => !l.broken).sort((a, b) => d(a) - d(b)).slice(0, this.lampLights.length);
      this.nearFires = this.fires.slice().sort((a, b) => d(a) - d(b)).slice(0, this.fireLights.length);
    }
    const li = this.night ? 22 : 7;
    this.lampLights.forEach((l, i) => { const o = this.nearLamps[i]; if (!o) { l.intensity = 0; return; } l.position.set(o.x, o.y, o.z); l.intensity = li * (o.flick ? (Math.sin(this.t * 23 + i) > 0.6 || Math.random() < 0.1 ? 0.15 : 1) : 1); });
    this.fireLights.forEach((l, i) => { const o = this.nearFires[i]; if (!o) { l.intensity = 0; return; } l.position.set(o.x, o.y + 1.1, o.z); l.intensity = (this.night ? 26 : 14) * o.big * (0.75 + Math.sin(this.t * 17 + i * 3) * 0.12 + Math.random() * 0.18); });
    for (const sg of this.signs) if (sg.flick) sg.m.material.color.setScalar(Math.sin(this.t * 7 + sg.ph) > 0.85 && Math.random() < 0.5 ? 0.3 : 2.2);
    // fire + smoke emitters
    for (const f of this.fires) {
      const dd = (f.x - player.x) ** 2 + (f.z - player.z) ** 2; if (dd > 45 * 45) continue;
      if (Math.random() < 0.9) this.fx.emit({ x: f.x, y: f.y, z: f.z }, { count: f.big > 1 ? 3 : 2, color: 0xff7a1a, color2: 0xffd060, speed: 0.8, up: 2.2 * f.big, life: 0.7, size: 0.55 * f.big, jitter: 0.7 * f.big, drag: 1, gravity: -1.5 });
      if (Math.random() < 0.35) this.smoke.emit({ x: f.x, y: f.y + 1.2, z: f.z }, { count: 1, color: 0x1a1614, color2: 0x2e2a28, speed: 0.5, up: 2.2, life: 3.5, size: 1.1 * f.big, grow: 2.5, jitter: 0.5, drag: 0.4 });
    }
    for (const p of this.plumes) if (Math.random() < 0.3) this.smoke.emit({ x: p.x, y: p.y, z: p.z }, { count: 1, color: this.night ? 0x0a0a0c : 0x2a2224, color2: this.night ? 0x141416 : 0x3a3032, speed: 1, up: 4, life: 6, size: 6, grow: 3, jitter: 3, drag: 0.2 });
  }
  dispose() {
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
    this.scene.remove(this.group);
  }
}
