// GHOST HUNT – hospital level generator & builder
import * as THREE from 'three';
import { Builder, G } from './builder.js';
import { canvasTex, grime, seeded, clamp, normalFromTex } from './core.js';

export const ROOM = 8, WALL_H = 3.2, DOOR_W = 1.9, T = 0.3;

/* ---------- textures (built once) ---------- */
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const wall = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#b3ad98'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${90 + Math.random() * 40},${80 + Math.random() * 30},50,${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h * 0.6, Math.random() * 120, Math.random() * 120); }
    const gy = h * 0.655; x.fillStyle = '#35564d'; x.fillRect(0, gy, w, h - gy);
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; for (let yy = gy; yy < h; yy += 32) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); } for (let xx = 0; xx < w; xx += 32) { x.beginPath(); x.moveTo(xx, gy); x.lineTo(xx, h); x.stroke(); }
    x.fillStyle = '#1d2a26'; x.fillRect(0, gy - 10, w, 12); x.fillStyle = '#0d0d0d'; x.fillRect(0, h - 14, w, 14);
    // water drips & stains
    for (let i = 0; i < 26; i++) { const xx = Math.random() * w, len = Math.random() * h * 0.7; const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(60,45,20,.35)'); g.addColorStop(1, 'rgba(60,45,20,0)'); x.fillStyle = g; x.fillRect(xx, 0, 2 + Math.random() * 6, len); }
    grime(x, w, h, 500, 0.1);
    // cracks
    x.strokeStyle = 'rgba(20,15,10,.5)'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { let px = Math.random() * w, py = Math.random() * h * 0.6; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (Math.random() - .5) * 40; py += Math.random() * 25; x.lineTo(px, py); } x.stroke(); }
  }, null);
  wall.wrapS = wall.wrapT = THREE.RepeatWrapping;
  const floor = canvasTex(512, 512, (x, w, h) => {
    const n = 8, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = (i + j) % 2 ? [168, 166, 150] : [92, 104, 98]; const v = Math.random() * 18 - 9; x.fillStyle = `rgb(${c[0] + v},${c[1] + v},${c[2] + v})`; x.fillRect(i * s, j * s, s, s); }
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
    grime(x, w, h, 700, 0.14);
  }, null); floor.wrapS = floor.wrapT = THREE.RepeatWrapping;
  const ceil = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8d8a80'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a3833'; x.lineWidth = 4; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); }
    for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(80,60,20,${Math.random() * 0.3})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, Math.random() * 30, 0, 7); x.fill(); }
    x.fillStyle = '#111'; x.fillRect(64 * 2 + 4, 64 + 4, 56, 56);
  }, null); ceil.wrapS = ceil.wrapT = THREE.RepeatWrapping;
  const decal = canvasTex(1024, 512, (x) => {
    for (let k = 0; k < 4; k++) { const cx = k * 256 + 128, cy = 128; x.fillStyle = 'rgba(90,0,0,.92)';
      if (k === 3) { // handprints
        for (let hnd = 0; hnd < 2; hnd++) { const ox = cx - 50 + hnd * 90, oy = cy + (hnd ? -20 : 20); x.beginPath(); x.ellipse(ox, oy + 20, 26, 32, 0, 0, 7); x.fill(); for (let f = 0; f < 5; f++) { x.save(); x.translate(ox - 24 + f * 12, oy - 10); x.rotate((f - 2) * 0.18); x.fillRect(-5, -40 + (f === 0 ? 25 : 0), 10, 42); x.restore(); } }
      } else {
        x.beginPath(); x.arc(cx, cy, 40 + k * 10, 0, 7); x.fill();
        for (let i = 0; i < 26; i++) { const a = Math.random() * 7, r = 40 + Math.random() * 70; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.random() * 12 + 2, 0, 7); x.fill(); }
        if (k === 2) for (let i = 0; i < 8; i++) x.fillRect(cx - 60 + i * 16, cy, 5, 60 + Math.random() * 60);
      } }
    const words = ['GET OUT', 'HELP ME', 'HE WATCHES', 'NO ESCAPE'];
    x.font = 'bold 96px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let k = 0; k < 4; k++) { const cx = (k % 2) * 512 + 256, cy = 256 + 64 + Math.floor(k / 2) * 128; x.save(); x.translate(cx, cy); x.rotate((Math.random() - .5) * 0.1); x.fillStyle = 'rgba(110,0,0,.95)'; x.font = 'bold 80px Impact, Arial Black, sans-serif'; x.fillText(words[k], 0, 0);
      for (let i = 0; i < 14; i++) x.fillRect(-180 + Math.random() * 360, 10, 3, 20 + Math.random() * 40); x.restore(); }
  }, null);
  const exitSign = canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#100'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff2a1a'; x.font = 'bold 74px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EXIT', w / 2, h / 2 + 4); }, null);
  const coat = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#d8d6cf'; x.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(${100 + Math.random() * 60},0,0,${0.3 + Math.random() * 0.6})`; x.beginPath(); x.arc(Math.random() * w, h * 0.3 + Math.random() * h * 0.7, Math.random() * 16 + 2, 0, 7); x.fill(); } grime(x, w, h, 150, 0.1); }, null);
  TEX = { wall, floor, ceil, decal, exitSign, coat };
  return TEX;
}
export function getTex() { return textures(); }

/* ---------- level parameters ---------- */
export function levelParams(L) {
  const t = (L - 1) / 99, boss = L % 10 === 0;
  return {
    L, t, boss, final: L === 100,
    gw: boss ? 3 : clamp(3 + Math.floor(t * 4.2 + (L % 3 === 0 ? 1 : 0)), 3, 7),
    gh: boss ? 3 : clamp(3 + Math.floor(t * 3.4 + (L % 4 === 1 ? 1 : 0)), 3, 6),
    keys: boss ? 0 : Math.min(4, 1 + Math.floor(L / 22)),
    patients: boss || L < 3 ? 0 : Math.min(4, 1 + Math.floor(L / 26)),
    fuses: boss || L < 5 || L % 3 !== 2 ? 0 : Math.min(3, 2 + Math.floor(L / 60)),
    ghosts: boss ? (L === 100 ? 4 : 1 + Math.floor(L / 40)) : Math.min(14, 2 + Math.floor(L * 0.11)),
    ghostSpeed: 1.25 + t * 1.6, ghostDmg: 9 + t * 18, ghostHp: 40 + t * 120,
    scareEvery: 42 - t * 26, lightsOutChance: 0.25 + t * 0.5, doorLock: L < 2 ? 0 : 0.22 + t * 0.4,
    darkness: t, deadLights: 0.12 + t * 0.35,
    bossHp: L === 100 ? 4200 : 500 + L * 22,
  };
}

/* ---------- World ---------- */
export class World {
  constructor(scene, L, quality) {
    this.scene = scene; this.L = L; this.P = levelParams(L); this.q = quality;
    this.rng = seeded(L * 9973 + 17);
    this.group = new THREE.Group(); scene.add(this.group);
    this.colliders = []; this.doors = []; this.fixtures = []; this.items = []; this.decals = [];
    this.gen(); this.build();
  }
  r(a = 0, b = 1) { return a + this.rng() * (b - a); }
  ri(a, b) { return Math.floor(this.r(a, b + 1)); }
  gen() {
    const { gw, gh, boss } = this.P; this.gw = gw; this.gh = gh;
    const rooms = this.rooms = [];
    const types = ['ward', 'ward', 'office', 'morgue', 'surgery', 'storage', 'hall', 'ward'];
    for (let i = 0; i < gw; i++) { rooms[i] = []; for (let j = 0; j < gh; j++) rooms[i][j] = { i, j, cx: i * ROOM + ROOM / 2, cz: j * ROOM + ROOM / 2, type: types[this.ri(0, types.length - 1)], conn: { e: false, w: false, n: false, s: false }, visited: false, slots: [] }; }
    if (boss) { for (let i = 0; i < gw; i++) for (let j = 0; j < gh; j++) { const r = rooms[i][j]; r.conn.e = i < gw - 1; r.conn.w = i > 0; r.conn.s = j < gh - 1; r.conn.n = j > 0; r.type = 'arena'; } }
    else {
      const seen = new Set(), st = [[0, 0]]; seen.add('0,0');
      while (st.length) {
        const [i, j] = st[st.length - 1]; const nb = [];
        if (i > 0 && !seen.has(`${i - 1},${j}`)) nb.push([i - 1, j, 'w', 'e']); if (i < gw - 1 && !seen.has(`${i + 1},${j}`)) nb.push([i + 1, j, 'e', 'w']);
        if (j > 0 && !seen.has(`${i},${j - 1}`)) nb.push([i, j - 1, 'n', 's']); if (j < gh - 1 && !seen.has(`${i},${j + 1}`)) nb.push([i, j + 1, 's', 'n']);
        if (!nb.length) { st.pop(); continue; }
        const [a, b, d1, d2] = nb[this.ri(0, nb.length - 1)]; rooms[i][j].conn[d1] = true; rooms[a][b].conn[d2] = true; seen.add(`${a},${b}`); st.push([a, b]);
      }
      for (let i = 0; i < gw; i++) for (let j = 0; j < gh; j++) { if (i < gw - 1 && this.rng() < 0.22) { rooms[i][j].conn.e = true; rooms[i + 1][j].conn.w = true; } if (j < gh - 1 && this.rng() < 0.22) { rooms[i][j].conn.s = true; rooms[i][j + 1].conn.n = true; } }
    }
    this.start = rooms[0][0]; this.start.type = 'lobby';
    // BFS distances
    const dist = {}, q = [[0, 0]]; dist['0,0'] = 0;
    while (q.length) { const [i, j] = q.shift(); const r = rooms[i][j], d = dist[`${i},${j}`]; const go = (a, b) => { if (dist[`${a},${b}`] == null) { dist[`${a},${b}`] = d + 1; q.push([a, b]); } }; if (r.conn.e) go(i + 1, j); if (r.conn.w) go(i - 1, j); if (r.conn.s) go(i, j + 1); if (r.conn.n) go(i, j - 1); }
    let best = null, bd = -1;
    for (let i = 0; i < gw; i++) for (let j = 0; j < gh; j++) { const r = rooms[i][j]; r.dist = dist[`${i},${j}`]; const solid = ['e', 'w', 'n', 's'].filter(s => !r.conn[s]); if (r !== this.start && solid.length && r.dist > bd) { bd = r.dist; best = r; } }
    if (boss) best = rooms[gw - 1][gh - 1];
    this.exitRoom = best; this.exitSide = boss ? 'e' : ['e', 's', 'w', 'n'].find(s => !best.conn[s]);
    if (!boss && best.type !== 'lobby') best.type = 'hall';
    this.W = gw * ROOM; this.H = gh * ROOM;
  }
  allRooms() { return this.rooms.flat(); }
  roomAt(x, z) { const i = Math.floor(x / ROOM), j = Math.floor(z / ROOM); return this.rooms[i]?.[j] || null; }
  addCol(x0, x1, z0, z1, extra) { const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), on: true, ...extra }; this.colliders.push(c); return c; }

  build() {
    const B = this.B = new Builder(), tex = textures(), P = this.P, rng = () => this.rng();
    const { gw, gh } = this;
    const tint = (base, v = 0.08) => { const c = new THREE.Color(base); c.offsetHSL(0, 0, (this.rng() - 0.5) * v); return c.getHex(); };
    // floors & ceilings per room
    for (const r of this.allRooms()) {
      const ft = r.type === 'morgue' ? 0x9fb0b8 : r.type === 'surgery' ? 0xc0d0c8 : 0xffffff;
      B.add('floor', G.box, [r.cx, -0.05, r.cz], [0, 0, 0], [ROOM, 0.1, ROOM], ft, 4);
      B.add('ceil', G.box, [r.cx, WALL_H + 0.05, r.cz], [0, 0, 0], [ROOM, 0.1, ROOM], 0xffffff, 2.4);
    }
    const wallCol = () => tint(0xffffff, 0.12);
    const wallSeg = (x, z, along, len) => { // along: 'x' or 'z'
      if (len <= 0.01) return;
      if (along === 'x') { B.add('wall', G.box, [x, WALL_H / 2, z], [0, 0, 0], [len, WALL_H, T], wallCol(), 3.2); this.addCol(x - len / 2, x + len / 2, z - T / 2, z + T / 2); }
      else { B.add('wall', G.box, [x, WALL_H / 2, z], [0, 0, 0], [T, WALL_H, len], wallCol(), 3.2); this.addCol(x - T / 2, x + T / 2, z - len / 2, z + len / 2); }
    };
    const doorway = (x, z, along, a, b) => { // wall with door gap; a,b = rooms
      const half = ROOM / 2, side = (ROOM - DOOR_W) / 2;
      if (along === 'x') { wallSeg(x - half + side / 2, z, 'x', side); wallSeg(x + half - side / 2, z, 'x', side); B.add('wall', G.box, [x, 2.35 + (WALL_H - 2.35) / 2, z], [0, 0, 0], [DOOR_W, WALL_H - 2.35, T], wallCol(), 3.2); B.add('metal', G.box, [x, 2.32, z], [0, 0, 0], [DOOR_W + 0.1, 0.08, T + 0.06], 0x5a5f5c); }
      else { wallSeg(x, z - half + side / 2, 'z', side); wallSeg(x, z + half - side / 2, 'z', side); B.add('wall', G.box, [x, 2.35 + (WALL_H - 2.35) / 2, z], [0, 0, 0], [T, WALL_H - 2.35, DOOR_W], wallCol(), 3.2); B.add('metal', G.box, [x, 2.32, z], [0, 0, 0], [T + 0.06, 0.08, DOOR_W + 0.1], 0x5a5f5c); }
      if (!P.boss && this.rng() < 0.6) this.makeDoor(x, z, along);
    };
    // vertical walls (x = const)
    for (let i = 0; i <= gw; i++) for (let j = 0; j < gh; j++) {
      const x = i * ROOM, z = j * ROOM + ROOM / 2; const a = this.rooms[i - 1]?.[j], b = this.rooms[i]?.[j];
      if (P.boss && i > 0 && i < gw) continue;
      if (a && b && a.conn.e) doorway(x, z, 'z', a, b); else wallSeg(x, z, 'z', ROOM + T);
    }
    for (let j = 0; j <= gh; j++) for (let i = 0; i < gw; i++) {
      const z = j * ROOM, x = i * ROOM + ROOM / 2; const a = this.rooms[i]?.[j - 1], b = this.rooms[i]?.[j];
      if (P.boss && j > 0 && j < gh) continue;
      if (a && b && a.conn.s) doorway(x, z, 'x', a, b); else wallSeg(x, z, 'x', ROOM + T);
    }
    if (P.boss) for (let i = 1; i < gw; i++) for (let j = 1; j < gh; j++) { B.add('wall', G.box, [i * ROOM, WALL_H / 2, j * ROOM], [0, 0, 0], [0.9, WALL_H, 0.9], 0xcccccc, 3.2); this.addCol(i * ROOM - 0.45, i * ROOM + 0.45, j * ROOM - 0.45, j * ROOM + 0.45); }
    // baseboard pipes along some walls
    // props
    for (const r of this.allRooms()) this.furnish(r);
    // fixtures
    for (const r of this.allRooms()) {
      const n = P.boss ? 1 : 1; for (let k = 0; k < n; k++) {
        const dead = r !== this.start && this.rng() < P.deadLights, strobe = !dead && this.rng() < 0.25 + P.t * 0.3;
        this.fixtures.push({ x: r.cx, y: WALL_H - 0.06, z: r.cz, room: r, mode: dead ? 'dead' : strobe ? 'strobe' : 'steady', phase: this.rng() * 100, val: 1, color: r.type === 'morgue' ? 0x9fd0ff : r.type === 'surgery' ? 0xe8fff4 : 0xfff2d8 });
        B.add('metal', G.box, [r.cx, WALL_H - 0.02, r.cz], [0, 0, 0], [1.5, 0.06, 0.45], 0x3a3a3a);
      }
    }
    // decals
    const nDec = Math.floor(this.allRooms().length * (0.8 + P.t * 1.5));
    for (let k = 0; k < nDec; k++) { const r = this.allRooms()[this.ri(0, this.allRooms().length - 1)]; this.addDecalFloor(r.cx + this.r(-3, 3), r.cz + this.r(-3, 3), this.ri(0, 2), this.r(0.8, 2.2)); }
    for (let k = 0; k < 2 + Math.floor(P.t * 4); k++) this.addDecalWall(this.allRooms()[this.ri(0, this.allRooms().length - 1)], this.ri(0, 4));
    this.buildExit();
    // materials
    const M = this.mats = {
      floor: new THREE.MeshStandardMaterial({ map: tex.floor, roughness: 0.42, metalness: 0.05, vertexColors: true, normalMap: tex.floorN || (tex.floorN = normalFromTex(tex.floor, 3)), normalScale: new THREE.Vector2(0.6, 0.6) }),
      ceil: new THREE.MeshStandardMaterial({ map: tex.ceil, roughness: 1, vertexColors: true }),
      wall: new THREE.MeshStandardMaterial({ map: tex.wall, roughness: 0.85, vertexColors: true, normalMap: tex.wallN || (tex.wallN = normalFromTex(tex.wall, 4)), normalScale: new THREE.Vector2(0.8, 0.8) }),
      metal: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.55, vertexColors: true }),
      cloth: new THREE.MeshStandardMaterial({ roughness: 0.95, vertexColors: true }),
      wood: new THREE.MeshStandardMaterial({ roughness: 0.75, vertexColors: true }),
      dark: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2, vertexColors: true }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      coat: new THREE.MeshStandardMaterial({ map: tex.coat, roughness: 0.9, vertexColors: true }),
      decal: new THREE.MeshStandardMaterial({ map: tex.decal, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.25, metalness: 0.1 }),
    };
    this.meshes = B.build(M, this.group, { cast: { floor: false, ceil: false, decal: false, glow: false } });
    // fixture instanced panels
    const fg = new THREE.BoxGeometry(1.3, 0.04, 0.3);
    this.fixMesh = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ toneMapped: false }), this.fixtures.length);
    const m4 = new THREE.Matrix4(); this.fixtures.forEach((f, i) => { m4.makeTranslation(f.x, f.y - 0.04, f.z); this.fixMesh.setMatrixAt(i, m4); this.fixMesh.setColorAt(i, new THREE.Color(1, 1, 1)); });
    this.fixMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.fixMesh);
    // pooled point lights
    const nL = this.q === 'high' ? 5 : 3; this.pool = [];
    for (let i = 0; i < nL; i++) { const l = new THREE.PointLight(0xfff2d8, 0, 10, 1.8); this.group.add(l); this.pool.push(l); }
    this.exitLight = new THREE.PointLight(0xff2010, 6, 9, 1.8); this.exitLight.position.copy(this.exitPos).add(new THREE.Vector3(0, 2.6, 0)).addScaledVector(this.exitN, 0.6); this.group.add(this.exitLight);
    this.power = 1; this.powerTarget = 1; this.time = 0; this.poolTimer = 0;
  }
  addDecalFloor(x, z, cell, s) { const u0 = cell * 0.25, g = G.plane.clone(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.25, 0.5 + uv.getY(i) * 0.5); this.B.add('decal', g, [x, 0.012, z], [-Math.PI / 2, 0, this.r(0, 6.28)], [s, s, 1], 0xffffff); }
  addDecalWall(r, cell) {
    const sides = ['e', 'w', 'n', 's'].filter(s => !r.conn[s]); if (!sides.length) return; const sd = sides[this.ri(0, sides.length - 1)];
    const g = G.plane.clone(), uv = g.attributes.uv; let u0, v0, uw, vh, sx, sy;
    if (cell < 4) { u0 = (cell % 2) * 0.5; v0 = cell < 2 ? 0.25 : 0; uw = 0.5; vh = 0.25; sx = 3; sy = 0.75; } else { u0 = 0.75; v0 = 0.5; uw = 0.25; vh = 0.5; sx = 1.3; sy = 1.3; }
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * uw, v0 + uv.getY(i) * vh);
    const off = ROOM / 2 - T / 2 - 0.02, y = this.r(1.4, 2.1);
    const pos = { e: [r.cx + off, y, r.cz], w: [r.cx - off, y, r.cz], s: [r.cx, y, r.cz + off], n: [r.cx, y, r.cz - off] }[sd];
    const rot = { e: -Math.PI / 2, w: Math.PI / 2, s: Math.PI, n: 0 }[sd];
    this.B.add('decal', g, pos, [0, rot, 0], [sx, sy, 1], 0xffffff);
  }
  makeDoor(x, z, along) {
    const piv = new THREE.Group(); const w = DOOR_W - 0.06;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 2.25, 0.07), DOOR_MAT()); panel.position.set(w / 2, 1.13, 0); panel.castShadow = true; panel.receiveShadow = true;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.09), new THREE.MeshStandardMaterial({ color: 0x0a1014, roughness: 0.1, metalness: 0.6 })); win.position.set(w / 2, 1.55, 0);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 })); handle.position.set(w - 0.15, 1.0, 0);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 1.5, 0.3), toneMapped: false })); lamp.position.set(w - 0.15, 1.25, 0);
    piv.add(panel, win, handle, lamp);
    let closed, open;
    if (along === 'z') { piv.position.set(x, 0, z - DOOR_W / 2 + 0.03); closed = -Math.PI / 2; open = 0.05; }
    else { piv.position.set(x - DOOR_W / 2 + 0.03, 0, z); closed = 0; open = -Math.PI / 2 + 0.05; }
    piv.rotation.y = open; this.group.add(piv);
    const col = along === 'z' ? this.addCol(x - 0.12, x + 0.12, z - DOOR_W / 2, z + DOOR_W / 2, { door: true }) : this.addCol(x - DOOR_W / 2, x + DOOR_W / 2, z - 0.12, z + 0.12, { door: true });
    col.on = false;
    this.doors.push({ piv, lamp, x, z, along, closed, open, a: 1, target: 1, lock: 0, col, side: 0, cooldown: 3 });
  }
  furnish(r) {
    const B = this.B, x0 = r.cx, z0 = r.cz, rr = (a, b) => this.r(a, b);
    // slots: along each wall, two positions avoiding door center
    const slots = [];
    for (const sd of ['e', 'w', 'n', 's']) for (const o of [-2.5, 2.5]) {
      const inn = ROOM / 2 - 1.15; let p, rot;
      if (sd === 'e') { p = [x0 + inn, z0 + o]; rot = -Math.PI / 2; } if (sd === 'w') { p = [x0 - inn, z0 + o]; rot = Math.PI / 2; }
      if (sd === 's') { p = [x0 + o, z0 + inn]; rot = Math.PI; } if (sd === 'n') { p = [x0 + o, z0 - inn]; rot = 0; }
      slots.push({ x: p[0], z: p[1], rot, side: sd, used: false });
    }
    for (let i = slots.length - 1; i > 0; i--) { const j = this.ri(0, i); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    r.slots = slots;
    const take = () => slots.find(s => !s.used && (s.used = true));
    const type = r.type, n = type === 'lobby' ? 3 : type === 'arena' ? 2 : this.ri(2, 4);
    if (type === 'arena') { if (r.i === 1 && r.j === 1) this.opTable(x0, z0, 0); else if (this.rng() < 0.5) this.gurney(x0 + rr(-1, 1), z0 + rr(-1, 1), rr(0, 6)); return; }
    if (type === 'surgery') this.opTable(x0, z0, this.rng() < 0.5 ? 0 : Math.PI / 2);
    for (let k = 0; k < n; k++) {
      const s = take(); if (!s) break;
      const f = { ward: ['bed', 'bed', 'iv', 'cabinet'], office: ['desk', 'cabinet', 'chair'], morgue: ['drawers', 'gurney', 'drawers'], surgery: ['cabinet', 'iv', 'tray'], storage: ['shelf', 'shelf', 'wheelchair'], hall: ['bench', 'wheelchair', 'gurney'], lobby: ['bench', 'desk', 'wheelchair'] }[type] || ['cabinet'];
      const what = f[this.ri(0, f.length - 1)];
      this.prop(what, s);
    }
  }
  local(s, lx, lz) { const c = Math.cos(s.rot), sn = Math.sin(s.rot); return [s.x + lx * c + lz * sn, s.z - lx * sn + lz * c]; }
  prop(what, s) {
    const B = this.B, rot = s.rot, P = (lx, y, lz) => { const [x, z] = this.local(s, lx, lz); return [x, y, z]; };
    const colBox = (w, d, lz = 0, h = 0) => { const sw = Math.abs(Math.sin(rot)) > 0.5; const hw = (sw ? d : w) / 2, hd = (sw ? w : d) / 2; const [cx, cz] = this.local(s, 0, lz); this.addCol(cx - hw, cx + hw, cz - hd, cz + hd, h ? { h } : undefined); };
    if (what === 'bed') {
      // bed head at wall (local -z toward wall... slot rot faces into room, local +z = into room)
      const metal = 0x8a8f8c; const lz = -0.1;
      for (const lx of [-0.45, 0.45]) for (const zz of [-0.95, 0.95]) B.add('metal', G.cyl6, P(lx, 0.3, lz + zz), [0, 0, 0], [0.05, 0.6, 0.05], metal);
      B.add('metal', G.box, P(0, 0.5, lz), [0, rot, 0], [1.0, 0.08, 2.0], metal);
      B.add('metal', G.box, P(0, 0.85, lz - 1.0), [0, rot, 0], [1.0, 0.7, 0.05], metal);
      const sheet = this.rng() < 0.4 ? 0xb8a99a : 0xd9d6cc; B.add('cloth', G.box, P(0, 0.62, lz + 0.05), [0, rot, (this.rng() - .5) * 0.06], [0.95, 0.16, 1.85], sheet);
      B.add('cloth', G.box, P(0, 0.75, lz - 0.75), [0.2, rot, 0], [0.6, 0.12, 0.35], 0xe8e4da);
      if (this.rng() < 0.35) this.addDecalFloor(...P(0, 0, lz + 0.3).filter((_, i) => i !== 1), 0, 0.9);
      colBox(1.1, 2.1, -0.1, 0.9);
    } else if (what === 'iv') {
      B.add('metal', G.cyl6, P(0, 0.9, 0), [0, 0, 0], [0.03, 1.8, 0.03], 0x9a9a9a); B.add('metal', G.box, P(0, 0.03, 0), [0, rot, 0], [0.5, 0.04, 0.05], 0x666666); B.add('metal', G.box, P(0, 0.03, 0), [0, rot + 1.57, 0], [0.5, 0.04, 0.05], 0x666666);
      B.add('glow', G.box, P(0.12, 1.6, 0), [0, rot, 0], [0.12, 0.22, 0.05], this.rng() < 0.5 ? 0x4a0000 : 0x203018);
    } else if (what === 'cabinet') {
      B.add('metal', G.box, P(0, 0.8, -0.55), [0, rot, 0], [1.0, 1.6, 0.5], 0x7d8a86); B.add('dark', G.box, P(0, 0.8, -0.29), [0, rot, 0], [0.02, 1.5, 0.02], 0x222222);
      B.add('dark', G.box, P(0.22, 1.7, -0.6), [0, rot + 0.2, 0], [0.25, 0.2, 0.2], 0x553322); colBox(1.0, 0.5, -0.55);
    } else if (what === 'desk') {
      B.add('wood', G.box, P(0, 0.76, -0.3), [0, rot, 0], [1.6, 0.06, 0.8], 0x5a4030); for (const lx of [-0.75, 0.75]) B.add('wood', G.box, P(lx, 0.38, -0.3), [0, rot, 0], [0.06, 0.76, 0.75], 0x4a3020);
      B.add('dark', G.box, P(-0.3, 0.95, -0.4), [0, rot + 0.1, 0], [0.45, 0.32, 0.05], 0x111111); B.add('cloth', G.box, P(0.35, 0.8, -0.2), [0, rot + 0.4, 0], [0.3, 0.01, 0.4], 0xe8e2d0);
      this.prop('chair', { ...s, x: this.local(s, 0, 0.5)[0], z: this.local(s, 0, 0.5)[1], rot: rot + Math.PI + 0.4 }); colBox(1.6, 0.8, -0.3, 0.85);
    } else if (what === 'chair') {
      B.add('dark', G.box, P(0, 0.45, 0), [0, rot, 0], [0.45, 0.06, 0.45], 0x2a2a30); B.add('dark', G.box, P(0, 0.75, -0.21), [0, rot, 0], [0.45, 0.55, 0.05], 0x2a2a30); B.add('metal', G.cyl6, P(0, 0.22, 0), [0, 0, 0], [0.05, 0.45, 0.05], 0x666666);
    } else if (what === 'drawers') {
      B.add('metal', G.box, P(0, 1.1, -0.55), [0, rot, 0], [2.2, 2.2, 0.6], 0x9aa3a6);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { B.add('dark', G.box, P(-0.73 + a * 0.73, 0.4 + b * 0.7, -0.24), [0, rot, 0], [0.62, 0.6, 0.03], 0x6c7477); B.add('metal', G.box, P(-0.73 + a * 0.73, 0.55 + b * 0.7, -0.21), [0, rot, 0], [0.2, 0.04, 0.05], 0xcccccc); }
      if (this.rng() < 0.6) { B.add('metal', G.box, P(0, 1.1, 0.1), [0, rot, 0], [0.6, 0.05, 1.2], 0x9aa3a6); B.add('dark', G.box, P(0, 1.22, 0.15), [0, rot, 0], [0.45, 0.2, 1.05], 0x1a1a1c); }
      colBox(2.2, 0.8, -0.45);
    } else if (what === 'gurney') this.gurney(s.x, s.z, rot);
    else if (what === 'tray') { B.add('metal', G.box, P(0, 0.9, -0.2), [0, rot, 0], [0.7, 0.03, 0.45], 0xbbbbbb); B.add('metal', G.cyl6, P(0, 0.45, -0.2), [0, 0, 0], [0.04, 0.9, 0.04], 0x888888); for (let i = 0; i < 4; i++) B.add('metal', G.box, P(-0.2 + i * 0.12, 0.92, -0.2), [0, rot + 0.3 * i, 0], [0.02, 0.01, 0.2], 0xeeeeee); }
    else if (what === 'shelf') {
      for (let k = 0; k < 4; k++) B.add('metal', G.box, P(0, 0.2 + k * 0.55, -0.6), [0, rot, 0], [1.8, 0.04, 0.5], 0x777b78);
      for (const lx of [-0.88, 0.88]) B.add('metal', G.box, P(lx, 1.0, -0.6), [0, rot, 0], [0.04, 2.0, 0.5], 0x555855);
      for (let k = 0; k < 4; k++) for (let b = 0; b < 3; b++) if (this.rng() < 0.7) B.add('wood', G.box, P(-0.55 + b * 0.55, 0.36 + k * 0.55, -0.6), [0, rot + (this.rng() - .5) * 0.3, 0], [0.4, 0.28, 0.35], [0x8a6a44, 0x9c8a6a, 0x6b5a40][b]);
      colBox(1.8, 0.55, -0.6);
    } else if (what === 'wheelchair') {
      const r0 = rot + (this.rng() - .5); B.add('dark', G.cyl, P(-0.3, 0.32, 0), [0, r0, Math.PI / 2], [0.64, 0.03, 0.64], 0x222222); B.add('dark', G.cyl, P(0.3, 0.32, 0), [0, r0, Math.PI / 2], [0.64, 0.03, 0.64], 0x222222);
      B.add('cloth', G.box, P(0, 0.5, 0), [0, r0, 0], [0.5, 0.06, 0.45], 0x203040); B.add('cloth', G.box, P(0, 0.8, -0.22), [0, r0, 0], [0.5, 0.55, 0.05], 0x203040);
    } else if (what === 'bench') {
      B.add('wood', G.box, P(0, 0.45, -0.4), [0, rot, 0], [2.2, 0.08, 0.5], 0x4a3a2c); B.add('wood', G.box, P(0, 0.8, -0.62), [0, rot, 0], [2.2, 0.5, 0.06], 0x4a3a2c); for (const lx of [-1, 1]) B.add('metal', G.box, P(lx, 0.22, -0.4), [0, rot, 0], [0.06, 0.44, 0.45], 0x333333); colBox(2.2, 0.6, -0.45, 0.6);
    }
  }
  gurney(x, z, rot) { const B = this.B; B.add('metal', G.box, [x, 0.75, z], [0, rot, 0], [0.7, 0.05, 1.9], 0xa0a4a4); B.add('metal', G.box, [x, 0.4, z], [0, rot, 0], [0.6, 0.05, 1.7], 0x777777); const body = this.rng() < 0.6; if (body) { B.add('cloth', G.box, [x, 0.9, z], [0, rot, 0], [0.5, 0.22, 1.7], 0xcfcbc0); B.add('cloth', G.sph, [x - Math.sin(rot) * 0.75, 0.95, z - Math.cos(rot) * 0.75], [0, 0, 0], [0.3, 0.25, 0.3], 0xcfcbc0); } }
  opTable(x, z, rot) {
    const B = this.B; B.add('metal', G.box, [x, 0.9, z], [0, rot, 0], [0.9, 0.12, 2.1], 0x6d8a90); B.add('metal', G.cyl, [x, 0.45, z], [0, 0, 0], [0.3, 0.9, 0.3], 0x555b5d); B.add('metal', G.box, [x, 0.05, z], [0, rot, 0], [0.8, 0.1, 1.2], 0x444444);
    B.add('cloth', G.box, [x, 1.0, z], [0, rot, 0.03], [0.7, 0.08, 1.6], 0x7a1010);
    B.add('metal', G.cyl6, [x, 2.6, z], [0, 0, 0], [0.06, 1.2, 0.06], 0x777777); B.add('metal', G.cyl, [x, 2.0, z], [0, 0, 0], [1.0, 0.25, 1.0], 0xa0a0a0); B.add('glow', G.cyl, [x, 1.87, z], [0, 0, 0], [0.8, 0.02, 0.8], 0xe8fff0);
    this.addCol(x - 0.55, x + 0.55, z - 0.55, z + 0.55, { h: 1.1 }); this.addDecalFloor(x + 0.5, z + 0.3, 1, 2.5);
  }
  buildExit() {
    const r = this.exitRoom, sd = this.exitSide, off = ROOM / 2 - T / 2;
    const n = { e: [-1, 0], w: [1, 0], s: [0, -1], n: [0, 1] }[sd]; // inward normal
    const p = { e: [r.cx + off, r.cz], w: [r.cx - off, r.cz], s: [r.cx, r.cz + off], n: [r.cx, r.cz - off] }[sd];
    const rot = { e: -Math.PI / 2, w: Math.PI / 2, s: Math.PI, n: 0 }[sd];
    this.exitPos = new THREE.Vector3(p[0], 0, p[1]); this.exitN = new THREE.Vector3(n[0], 0, n[1]); this.exitRot = rot;
    const g = new THREE.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = rot; this.group.add(g);
    const metal = new THREE.MeshStandardMaterial({ color: 0x8e9496, metalness: 0.75, roughness: 0.3 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.7, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a3d3e, metalness: 0.5, roughness: 0.5 })); frame.position.set(0, 1.35, 0.06); g.add(frame);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.85, 0.42), toneMapped: false })); inner.position.set(0, 1.25, 0.125); g.add(inner);
    const dl = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.4, 0.06), metal), dr = dl.clone(); dl.position.set(-0.525, 1.25, 0.16); dr.position.set(0.525, 1.25, 0.16); dl.castShadow = dr.castShadow = true; g.add(dl, dr);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: getTex().exitSign, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false })); sign.position.set(0, 2.95, 0.14); g.add(sign);
    const ind = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.05), toneMapped: false })); ind.position.set(1.15, 1.3, 0.16); g.add(ind);
    this.exit = { g, dl, dr, ind, open: 0, unlocked: false, pos: this.exitPos.clone().addScaledVector(this.exitN, 0.9) };
  }
  unlockExit() { this.exit.unlocked = true; this.exit.ind.material.color.setRGB(0.1, 3, 0.3); this.exitLight.color.setHex(0x30ff60); }
  // free floor point in a room (avoid slots used & center objects)
  freeSpot(r) { const s = r.slots.find(s => !s.used); if (s) { s.used = true; const [x, z] = this.local(s, 0, 0.3); return new THREE.Vector3(x, 0, z); } return new THREE.Vector3(r.cx + this.r(-1.5, 1.5), 0, r.cz + this.r(-1.5, 1.5)); }
  wallSpot(r) { // returns spot on a solid wall side for fuse boxes
    const sides = ['e', 'w', 'n', 's'].filter(s => !r.conn[s] && !(r === this.exitRoom && s === this.exitSide)); if (!sides.length) return null;
    const sd = sides[this.ri(0, sides.length - 1)], off = ROOM / 2 - T / 2, o = this.r(-1.2, 1.2);
    const p = { e: [r.cx + off, r.cz + o], w: [r.cx - off, r.cz + o], s: [r.cx + o, r.cz + off], n: [r.cx + o, r.cz - off] }[sd];
    return { pos: new THREE.Vector3(p[0], 1.4, p[1]), rot: { e: -Math.PI / 2, w: Math.PI / 2, s: Math.PI, n: 0 }[sd] };
  }
  collide(p, rad) {
    for (const c of this.colliders) {
      if (!c.on) continue;
      const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1); let dx = p.x - nx, dz = p.z - nz; const d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) { if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += dx * k; p.z += dz * k; } else { // inside: push along smallest axis
        const l = p.x - c.x0, rgt = c.x1 - p.x, tp = p.z - c.z0, bt = c.z1 - p.z, m = Math.min(l, rgt, tp, bt); if (m === l) p.x = c.x0 - rad; else if (m === rgt) p.x = c.x1 + rad; else if (m === tp) p.z = c.z0 - rad; else p.z = c.z1 + rad; } }
    }
  }
  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    for (const c of this.colliders) {
      if (!c.on) continue; let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-9) { if (ax < c.x0 || ax > c.x1) continue; } else { let a = (c.x0 - ax) / dx, b = (c.x1 - ax) / dx; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-9) { if (az < c.z0 || az > c.z1) continue; } else { let a = (c.z0 - az) / dz, b = (c.z1 - az) / dz; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      return false;
    }
    return true;
  }
  flick(f, t) {
    if (f.mode === 'dead') return 0;
    if (f.mode === 'strobe') { const s = Math.sin(t * 23 + f.phase) + Math.sin(t * 7.3 + f.phase * 2) + Math.sin(t * 1.3 + f.phase); return s > 0.6 ? 1 : s > 0 ? 0.25 : 0.03; }
    const s = Math.sin(t * 0.9 + f.phase) + Math.sin(t * 2.7 + f.phase * 1.7); return s > 1.85 ? (Math.sin(t * 60) > 0 ? 0.15 : 1) : 1;
  }
  update(dt, player, events) {
    this.time += dt; const t = this.time;
    this.power += (this.powerTarget - this.power) * Math.min(1, dt * (this.powerTarget < this.power ? 20 : 2.5));
    const pw = this.power * (this.powerTarget > this.power + 0.05 ? (Math.random() < 0.5 ? 1 : 0.1) : 1);
    const col = new THREE.Color();
    for (let i = 0; i < this.fixtures.length; i++) { const f = this.fixtures[i]; f.val = this.flick(f, t) * pw; col.set(f.color).multiplyScalar(0.05 + f.val * 2.4); this.fixMesh.setColorAt(i, col); }
    this.fixMesh.instanceColor.needsUpdate = true;
    // light pool
    this.poolTimer -= dt;
    if (this.poolTimer <= 0) { this.poolTimer = 0.3; this.near = this.fixtures.filter(f => f.mode !== 'dead').map(f => ({ f, d: (f.x - player.x) ** 2 + (f.z - player.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, this.pool.length).map(o => o.f); }
    this.pool.forEach((l, i) => { const f = this.near?.[i]; if (!f) { l.intensity = 0; return; } l.position.set(f.x, f.y - 0.35, f.z); l.color.set(f.color); l.intensity = f.val * 4.5; });
    this.exitLight.intensity = (this.exit.unlocked ? 8 : 5) * (0.75 + 0.25 * Math.sin(t * 3));
    // doors
    for (const d of this.doors) {
      d.cooldown -= dt;
      if (d.lock > 0) { d.lock -= dt; if (d.lock <= 0) { d.target = 1; events.doorOpen?.(d); d.lamp.material.color.setRGB(0, 1.5, 0.3); } }
      const prev = d.a; d.a += (d.target - d.a) * Math.min(1, dt * (d.target < d.a ? 14 : 1.5)); d.piv.rotation.y = d.closed + (d.open - d.closed) * d.a;
      d.col.on = d.a < 0.35;
      // player crossing detection
      const rel = d.along === 'z' ? player.x - d.x : player.z - d.z, lat = d.along === 'z' ? player.z - d.z : player.x - d.x;
      const side = Math.sign(rel);
      if (Math.abs(lat) < 2.2 && d.side !== 0 && side !== d.side && Math.abs(rel) > 1.3) {
        d.side = side;
        if (d.lock <= 0 && d.cooldown <= 0 && Math.random() < this.P.doorLock) { d.target = 0; d.lock = 6 + Math.random() * 5 + this.P.t * 4; d.cooldown = 25; d.lamp.material.color.setRGB(3, 0.05, 0.02); events.doorSlam?.(d); }
      } else if (d.side === 0 || Math.abs(rel) > 1.3) d.side = side || d.side;
    }
    // exit doors
    const e = this.exit; if (e.unlocked) { const dd = player.distanceTo ? 0 : 0; const near = Math.hypot(player.x - e.pos.x, player.z - e.pos.z) < 4; e.open += ((near ? 1 : 0.15) - e.open) * Math.min(1, dt * 2); e.dl.position.x = -0.525 - e.open * 0.95; e.dr.position.x = 0.525 + e.open * 0.95; }
  }
  dispose() { this.scene.remove(this.group); this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
}
let _doorMat = null;
function DOOR_MAT() { if (_doorMat) return _doorMat; const t = canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#4e6b66'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a3a37'; x.lineWidth = 4; x.strokeRect(10, 14, w - 20, h - 28); grime(x, w, h, 120, 0.2); x.fillStyle = 'rgba(80,0,0,.6)'; for (let i = 0; i < 4; i++) x.fillRect(20 + Math.random() * 80, 120 + Math.random() * 60, 4, 40 + Math.random() * 50); }, null); _doorMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.3 }); return _doorMat; }
