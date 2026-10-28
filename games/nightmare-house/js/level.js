import * as THREE from 'three';
import * as TX from './textures.js';

export const S = 9;          // tiles per room period (8 interior + 1 wall)
export let WALL_H = 3.2;
export const TOTAL_LEVELS = 300;

export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function levelParams(L) {
  const d = (L - 1) / (TOTAL_LEVELS - 1);       // 0..1
  const boss = L % 10 === 0;
  const r = mulberry(L * 7919 + 13);
  let nx = Math.min(5, 2 + Math.floor(d * 3.2 + r() * 1.3)), ny = Math.min(5, 2 + Math.floor(d * 3.2 + r() * 1.3));
  if (L <= 2) { nx = 2; ny = 2; } else if (L <= 6) { nx = Math.min(nx, 3); ny = Math.min(ny, 2); }
  const rooms = nx * ny;
  const clues = Math.min(8, 3 + Math.floor(d * 5 + (rooms > 9 ? 1 : 0)));
  const zombies = Math.round(2 + d * 14 + rooms * 0.5 + (L % 10) * 0.2);
  const ghosts = L < 3 ? 0 : Math.min(7, 1 + Math.floor(d * 6 + r() * 1.2));
  const zSpeed = 1.15 + d * 1.6, zHp = 40 + d * 160 + L * 0.2, zDmg = 10 + d * 18;
  const gSpeed = 1.1 + d * 1.4, gDmg = 14 + d * 20;
  const time = Math.round((80 + rooms * 26 + clues * 12) * (1.05 - d * 0.28));
  return { L, d, boss, final: L === TOTAL_LEVELS, nx: boss ? 3 : nx, ny: boss ? 3 : ny, clues: boss ? 0 : clues, zombies: boss ? 0 : zombies, ghosts: boss ? Math.min(4, Math.floor(d * 5)) : ghosts, zSpeed, zHp, zDmg, gSpeed, gDmg, time: boss ? 300 : time,
    bossHp: 1400 + d * 5200 + (L === TOTAL_LEVELS ? 3000 : 0), urns: boss ? Math.min(6, 3 + Math.floor(d * 3.5)) : 0 };
}

const ROOM_TYPES = ['library', 'dining', 'bedroom', 'parlor', 'chapel', 'gallery', 'nursery'];
const ROOM_NAMES = { library: 'Library', dining: 'Dining Room', bedroom: 'Bedroom', parlor: 'Parlor', chapel: 'Chapel', gallery: 'Gallery', nursery: 'Nursery', hall: 'Grand Hall' };

export function generate(L) {
  WALL_H = (L % 10 === 0) ? 5.6 : 3.2;
  const P = levelParams(L); const rng = mulberry(L * 104729 + 31);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1)); const pick = a => a[Math.floor(rng() * a.length)];
  const { nx, ny } = P; const W = nx * S + 1, H = ny * S + 1;
  const grid = new Uint8Array(W * H); const id = (i, j) => j * W + i;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (i % S === 0 || j % S === 0) grid[id(i, j)] = 1;
  const rooms = []; for (let ry = 0; ry < ny; ry++) for (let rx = 0; rx < nx; rx++) rooms.push({ rx, ry, idx: rooms.length, sides: { N: 'outer', S: 'outer', W: 'outer', E: 'outer' }, adj: [] });
  const R = (rx, ry) => rooms[ry * nx + rx];
  const out = { P, W, H, grid, rooms, furn: [], lights: [], clues: [], zSpawns: [], gSpawns: [], medkits: [], coins: [], secrets: [], windows: [], paintings: [], webs: [], start: null, exit: null, urns: [], pillars: [] };

  const doorTiles = (a, b) => { // tiles of the opening between rooms a and b
    if (a.rx !== b.rx) { const gi = Math.max(a.rx, b.rx) * S; return [[gi, a.ry * S + 4], [gi, a.ry * S + 5]]; }
    const gj = Math.max(a.ry, b.ry) * S; return [[a.rx * S + 4, gj], [a.rx * S + 5, gj]];
  };
  const sideOf = (a, b) => b.rx > a.rx ? 'E' : b.rx < a.rx ? 'W' : b.ry > a.ry ? 'S' : 'N';
  const opp = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const connect = (a, b, kind = 'door') => { a.sides[sideOf(a, b)] = kind; b.sides[sideOf(b, a)] = kind; if (kind === 'door') { a.adj.push(b); b.adj.push(a); } for (const [i, j] of doorTiles(a, b)) grid[id(i, j)] = kind === 'door' ? 0 : 3; };
  for (const r of rooms) { r.sides = { N: r.ry === 0 ? 'outer' : 'wall', S: r.ry === ny - 1 ? 'outer' : 'wall', W: r.rx === 0 ? 'outer' : 'wall', E: r.rx === nx - 1 ? 'outer' : 'wall' }; }

  if (P.boss) {
    // one big hall: clear interior walls
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) grid[id(i, j)] = 0;
    const cx = W / 2, cz = H / 2;
    out.hall = true;
    for (const [px, pz] of [[7, 7], [W - 8, 7], [7, H - 8], [W - 8, H - 8], [7, cz | 0], [W - 8, cz | 0]]) { grid[id(px, pz)] = 2; out.pillars.push({ x: px + 0.5, z: pz + 0.5 }); }
    out.start = { x: cx, z: H - 3, yaw: 0 };
    out.bossPos = { x: cx, z: 5 };
    const ex = Math.floor(W / 2) + 4; grid[id(ex, 0)] = 4; grid[id(ex + 1, 0)] = 4; out.exit = { tiles: [[ex, 0], [ex + 1, 0]], x: ex + 1, z: 0.5, side: 'N' };
    const n = P.urns; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + 0.4; out.urns.push({ x: cx + Math.cos(a) * 9.5, z: cz + Math.sin(a) * 9.5 }); }
    // lights: big chandeliers + braziers
    for (const [x, z] of [[cx, cz], [cx, 6], [cx, H - 6]]) out.lights.push({ x, y: WALL_H - 0.9, z, c: 0xffa860, I: 7, D: 16, kind: 'chandelier' });
    for (const u of out.urns) out.lights.push({ x: u.x, y: 1.6, z: u.z, c: 0xff3020, I: 3, D: 7, kind: 'urn' });
    for (const p of out.pillars) out.furn.push({ kind: 'pillar', x: p.x, z: p.z, rot: 0 });
    out.furn.push({ kind: 'throne', x: cx, z: 2.2, rot: 0 });
    for (let j = 1; j <= 3; j++) for (let i = Math.floor(cx) - 2; i <= Math.floor(cx) + 1; i++) grid[id(i, j)] = 2; // throne is solid
    out.furn.push({ kind: 'carpet', x: cx, z: cz, rot: 0, w: 3, d: H - 4 });
    for (let k = 0; k < 6; k++) { out.windows.push({ x: 4 + k * 4 + 1.5, z: H - 1, side: 'S' }); }
    for (let k = 0; k < 5; k++) { out.windows.push({ x: 1, z: 4 + k * 5, side: 'W' }); out.windows.push({ x: W - 1, z: 4 + k * 5, side: 'E' }); }
    for (let k = 0; k < P.ghosts; k++) out.gSpawns.push({ x: 3 + rng() * (W - 6), z: 3 + rng() * 8 });
    for (const m of [[4, H - 4], [W - 4, H - 4]]) out.medkits.push({ x: m[0] + 0.5, z: m[1] + 0.5 });
    for (const r of rooms) r.type = 'hall';
    return finalize(out, rng);
  }

  // --- maze over rooms (randomized DFS) ---
  const startRoom = R(pick([0, nx - 1]), pick([0, ny - 1]));
  const seen = new Set([startRoom]); const stack = [startRoom];
  while (stack.length) {
    const a = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (a.rx + dx >= 0 && a.rx + dx < nx && a.ry + dy >= 0 && a.ry + dy < ny) ? R(a.rx + dx, a.ry + dy) : null).filter(b => b && !seen.has(b));
    if (!nb.length) { stack.pop(); continue; }
    const b = pick(nb); seen.add(b); connect(a, b); stack.push(b);
  }
  // extra loops
  for (const a of rooms) for (const [dx, dy] of [[1, 0], [0, 1]]) { if (a.rx + dx >= nx || a.ry + dy >= ny) continue; const b = R(a.rx + dx, a.ry + dy); if (!a.adj.includes(b) && rng() < 0.3) connect(a, b); }
  // BFS distances between rooms
  const rdist = (from, excl) => { const d = new Map([[from, 0]]); const q = [from]; while (q.length) { const a = q.shift(); for (const b of a.adj) if (!d.has(b) && b !== excl) { d.set(b, d.get(a) + 1); q.push(b); } } return d; };
  // secret room: a leaf (degree 1) that is not start; seal it with a secret bookshelf door
  let secretRoom = null;
  if (L >= 3 && rooms.length >= 4) {
    const leaves = rooms.filter(r => r !== startRoom && r.adj.length === 1);
    if (leaves.length) {
      secretRoom = pick(leaves); const b = secretRoom.adj[0];
      for (const [i, j] of doorTiles(secretRoom, b)) grid[id(i, j)] = 3;
      secretRoom.sides[sideOf(secretRoom, b)] = 'secret'; b.sides[sideOf(b, secretRoom)] = 'secret';
      b.adj = b.adj.filter(x => x !== secretRoom); secretRoom.adj = [];
      secretRoom.secret = true;
      const t = doorTiles(secretRoom, b); out.secrets.push({ tiles: t, axis: secretRoom.rx !== b.rx ? 'z' : 'x', room: secretRoom.idx });
    }
  }
  const dist = rdist(startRoom);
  // exit: farthest boundary room
  let exitRoom = null, best = -1;
  for (const r of rooms) { if (r.secret || !dist.has(r)) continue; const outers = Object.keys(r.sides).filter(s => r.sides[s] === 'outer'); if (!outers.length || r === startRoom && rooms.length > 1) continue; const dd = dist.get(r) + rng() * 0.5; if (dd > best) { best = dd; exitRoom = r; } }
  if (!exitRoom) exitRoom = startRoom;
  { const outers = Object.keys(exitRoom.sides).filter(s => exitRoom.sides[s] === 'outer'); const side = pick(outers); exitRoom.sides[side] = 'exit';
    let tiles; if (side === 'N' || side === 'S') { const gj = side === 'N' ? exitRoom.ry * S : (exitRoom.ry + 1) * S; tiles = [[exitRoom.rx * S + 4, gj], [exitRoom.rx * S + 5, gj]]; }
    else { const gi = side === 'W' ? exitRoom.rx * S : (exitRoom.rx + 1) * S; tiles = [[gi, exitRoom.ry * S + 4], [gi, exitRoom.ry * S + 5]]; }
    for (const [i, j] of tiles) grid[id(i, j)] = 4;
    const cx = (tiles[0][0] + tiles[1][0]) / 2 + 0.5, cz = (tiles[0][1] + tiles[1][1]) / 2 + 0.5;
    out.exit = { tiles, x: cx, z: cz, side }; exitRoom.exit = true; }

  // assign room types
  const types = ROOM_TYPES.slice(); for (const r of rooms) r.type = pick(types);
  startRoom.type = pick(['parlor', 'gallery', 'library']);
  if (secretRoom) secretRoom.type = 'treasure';

  // per-room furniture
  for (const r of rooms) furnishRoom(r, out, rng, id, grid);
  // start position
  out.start = { x: startRoom.rx * S + 4.5 + 0.5, z: startRoom.ry * S + 4.5 + 0.5, yaw: 0 };
  // ensure start tile free
  const sx = Math.floor(out.start.x), sz = Math.floor(out.start.z); for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (grid[id(sx + di, sz + dj)] === 2) grid[id(sx + di, sz + dj)] = 0;
  out.furn = out.furn.filter(f => !f.tiles || f.tiles.every(([i, j]) => grid[id(i, j)] === 2));
  // face toward map centre
  out.start.yaw = Math.atan2(-((nx * S) / 2 - out.start.x), -((ny * S) / 2 - out.start.z));
  out.startRoom = startRoom.idx; out.secretRoom = secretRoom ? secretRoom.idx : -1;

  // reachability from start (secret tiles closed)
  const reach = new Uint8Array(W * H); { const q = [id(sx, sz)]; reach[q[0]] = 1; while (q.length) { const k = q.pop(); const i = k % W, j = (k / W) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = id(i + di, j + dj); if (i + di < 0 || j + dj < 0 || i + di >= W || j + dj >= H) continue; if (!reach[n] && grid[n] === 0) { reach[n] = 1; q.push(n); } } } }
  out.reach = reach;
  const freeIn = (r, margin = 1) => { const c = []; for (let j = 1 + margin; j <= 8 - margin; j++) for (let i = 1 + margin; i <= 8 - margin; i++) { const gi = r.rx * S + i, gj = r.ry * S + j; if (grid[id(gi, gj)] === 0) c.push([gi, gj]); } return c; };
  const used = new Set(); const take = (cands) => { const c = cands.filter(([i, j]) => !used.has(id(i, j))); if (!c.length) return null; const t = pick(c); used.add(id(t[0], t[1])); return t; };
  // clues: spread across rooms (not start if possible), far rooms first
  const normal = rooms.filter(r => !r.secret).sort((a, b) => (dist.get(b) || 0) - (dist.get(a) || 0));
  const clueRooms = []; let k = 0; while (clueRooms.length < P.clues) { const pool = normal.filter(r => r !== startRoom || normal.length < 2); clueRooms.push(pool[k % pool.length]); k++; }
  for (const r of clueRooms) { const t = take(freeIn(r, 1).filter(([i, j]) => reach[id(i, j)])); if (t) out.clues.push({ x: t[0] + 0.5, z: t[1] + 0.5 }); }
  // zombies away from start room
  const zRooms = normal.filter(r => r !== startRoom); for (let n = 0; n < P.zombies; n++) { const r = zRooms.length ? zRooms[n % zRooms.length] : startRoom; const t = take(freeIn(r, 1).filter(([i, j]) => reach[id(i, j)])); if (t) out.zSpawns.push({ x: t[0] + 0.5, z: t[1] + 0.5 }); }
  for (let n = 0; n < P.ghosts; n++) { const r = pick(zRooms.length ? zRooms : rooms); out.gSpawns.push({ x: r.rx * S + 2 + rng() * 6, z: r.ry * S + 2 + rng() * 6 }); }
  const mk = Math.max(1, Math.round(rooms.length / 6)); for (let n = 0; n < mk; n++) { const t = take(freeIn(pick(normal)).filter(([i, j]) => reach[id(i, j)])); if (t) out.medkits.push({ x: t[0] + 0.5, z: t[1] + 0.5 }); }
  for (let n = 0; n < rooms.length * 2; n++) { const t = take(freeIn(pick(normal), 1).filter(([i, j]) => reach[id(i, j)])); if (t) out.coins.push({ x: t[0] + 0.5, z: t[1] + 0.5, v: 1 }); }
  if (secretRoom) { for (let n = 0; n < 8; n++) { const t = take(freeIn(secretRoom, 1)); if (t) out.coins.push({ x: t[0] + 0.5, z: t[1] + 0.5, v: 5 }); } out.chest = { x: secretRoom.rx * S + 4.5 + 0.5, z: secretRoom.ry * S + 4.5 + 0.5 }; }
  return finalize(out, rng);
}

function finalize(out, rng) { out.seed = rng; return out; }

// Map (side, along p, depth q) in 1..8 to local room cell (i,j); rotation so that object's +z faces into room
function L2C(side, p, q) { switch (side) { case 'N': return [p, q]; case 'S': return [9 - p, 9 - q]; case 'W': return [q, 9 - p]; case 'E': return [9 - q, p]; } }
const ROT = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 };

function furnishRoom(r, out, rng, id, grid) {
  const pick = a => a[Math.floor(rng() * a.length)];
  const occ = new Set();
  const gx = i => r.rx * S + i, gz = j => r.ry * S + j;
  const isOpen = s => r.sides[s] === 'door' || r.sides[s] === 'secret' || r.sides[s] === 'exit';
  const free = (i, j) => i >= 1 && i <= 8 && j >= 1 && j <= 8 && !occ.has(i + ',' + j) && grid[id(gx(i), gz(j))] === 0;
  // keep clear in front of openings
  for (const s of ['N', 'S', 'W', 'E']) if (isOpen(s)) for (let p = 3; p <= 6; p++) for (let q = 1; q <= 2; q++) { const [i, j] = L2C(s, p, q); occ.add(i + ',' + j); }
  const reserved = new Set(occ);
  const place = (kind, side, p, q, w, d, solid = true, extra = {}) => {
    const cells = []; for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) { const [i, j] = L2C(side, p + a, q + b); if (!free(i, j)) return null; cells.push([i, j]); }
    let sx = 0, sz = 0; for (const [i, j] of cells) { occ.add(i + ',' + j); sx += gx(i) + 0.5; sz += gz(j) + 0.5; if (solid) grid[id(gx(i), gz(j))] = 2; }
    const f = Object.assign({ kind, x: sx / cells.length, z: sz / cells.length, rot: ROT[side], w, d, tiles: solid ? cells.map(([i, j]) => [gx(i), gz(j)]) : null }, extra);
    out.furn.push(f); return f;
  };
  const walls = ['N', 'S', 'W', 'E'];
  const solidWalls = walls.filter(s => !isOpen(s));
  const cx = r.rx * S + 5, cz = r.ry * S + 5; // room centre (world)
  const t = r.type;
  const light = (x, y, z, c, I, D, kind) => out.lights.push({ x, y, z, c, I, D, kind });
  const wallItems = (kinds, n) => { for (let k = 0; k < n; k++) { const s = pick(walls); const kd = pick(kinds); const w = kd.w || 1; const p = 1 + Math.floor(rng() * (9 - w)); place(kd.k, s, p, 1, w, 1, kd.solid !== false); } };
  const chandelier = rng() < 0.75 || t === 'hall';
  if (chandelier) { out.furn.push({ kind: 'chandelier', x: cx, z: cz, rot: 0 }); light(cx, WALL_H - 1.0, cz, 0xffb070, 4.2, 11, 'chandelier'); }
  if (t === 'library') {
    for (const s of walls) for (const p of [1, 3, 5, 7]) place('bookshelf', s, p, 1, 2, 1);
    const tb = place('table', 'N', 4, 4, 2, 2); if (tb) { out.furn.push({ kind: 'candelabra', x: tb.x, z: tb.z, y: 0.8 }); light(tb.x, 1.35, tb.z, 0xff9a40, 2.2, 7, 'candle'); }
  } else if (t === 'dining') {
    const s = pick(['N', 'W']); const tb = place('longtable', s, 4, 3, 2, 4); if (tb) { for (const o of [-1, 1]) { const ox = s === 'N' ? 0 : o * 1.1, oz = s === 'N' ? o * 1.1 : 0; out.furn.push({ kind: 'candelabra', x: tb.x + ox, z: tb.z + oz, y: 0.8 }); } light(tb.x, 1.4, tb.z, 0xff9a40, 2.6, 8, 'candle'); }
    wallItems([{ k: 'sideboard', w: 2 }, { k: 'clock' }, { k: 'cabinet' }], 4);
  } else if (t === 'bedroom') {
    const sw = solidWalls.length ? pick(solidWalls) : pick(walls); const b = place('bed', sw, pick([2, 6]), 1, 2, 3) || place('bed', sw, 1, 1, 2, 3) || place('bed', sw, 7, 1, 2, 3);
    if (b) { const ns = place('nightstand', sw, 0, 1, 1, 1); }
    wallItems([{ k: 'wardrobe' }, { k: 'mirror', solid: false }, { k: 'cabinet' }, { k: 'crate' }], 4);
    out.furn.push({ kind: 'floorcandles', x: cx + (rng() - .5) * 3, z: cz + (rng() - .5) * 3 }); light(cx, 0.6, cz, 0xff8a30, 1.6, 6, 'candle');
  } else if (t === 'parlor') {
    const sw = solidWalls.length ? pick(solidWalls) : null;
    if (sw) { const fp = place('fireplace', sw, 4, 1, 2, 1); if (fp) { const dx = Math.sin(fp.rot) * 0.5, dz = Math.cos(fp.rot) * 0.5; light(fp.x + dx, 0.7, fp.z + dz, 0xff6a20, 3.5, 9, 'fire'); place('sofa', sw, 4, 4, 2, 1); } }
    place('piano', pick(walls), 7, 1, 2, 2) || place('piano', pick(walls), 1, 1, 2, 2);
    wallItems([{ k: 'clock' }, { k: 'armchair' }, { k: 'cabinet' }, { k: 'statue' }], 4);
  } else if (t === 'chapel') {
    const sw = solidWalls.length ? pick(solidWalls) : null;
    if (sw) {
      const al = place('altar', sw, 4, 1, 2, 1); if (al) { out.furn.push({ kind: 'floorcandles', x: al.x + Math.sin(al.rot) * 1.2, z: al.z + Math.cos(al.rot) * 1.2 }); light(al.x + Math.sin(al.rot), 1.2, al.z + Math.cos(al.rot), 0xff7a2a, 2.8, 8, 'candle'); }
      for (const q of [3, 5, 7]) for (const p of [2, 6]) place('pew', sw, p, q, 2, 1);
    } else wallItems([{ k: 'statue' }, { k: 'coffin', w: 2 }], 4);
  } else if (t === 'gallery' || t === 'hall') {
    for (const [i, j] of [[3, 3], [6, 3], [3, 6], [6, 6]]) if (free(i, j)) { occ.add(i + ',' + j); grid[id(gx(i), gz(j))] = 2; out.furn.push({ kind: 'pillar', x: gx(i) + .5, z: gz(j) + .5, rot: 0, tiles: [[gx(i), gz(j)]] }); }
    wallItems([{ k: 'armor' }, { k: 'statue' }, { k: 'armor' }, { k: 'coffin', w: 2 }], 5);
    out.furn.push({ kind: 'carpet', x: cx, z: cz, rot: rng() < .5 ? 0 : Math.PI / 2, w: 2, d: 7 });
  } else if (t === 'nursery') {
    const c = place('crib', pick(walls), pick([1, 7]), 1, 2, 1); place('rocker', 'N', 5, 5, 1, 1, false) ; wallItems([{ k: 'crate' }, { k: 'doll', solid: false }, { k: 'wardrobe' }, { k: 'doll', solid: false }], 5);
    out.furn.push({ kind: 'floorcandles', x: cx, z: cz + 1 }); light(cx, 0.6, cz + 1, 0xff8a30, 1.6, 6, 'candle');
  } else if (t === 'treasure') {
    out.furn.push({ kind: 'floorcandles', x: cx - 1.5, z: cz }); out.furn.push({ kind: 'floorcandles', x: cx + 1.5, z: cz });
    light(cx, 1.0, cz, 0xffd070, 3.2, 8, 'candle');
    for (const s of walls) place('bookshelf', s, 1, 1, 2, 1), place('bookshelf', s, 7, 1, 2, 1);
  }
  if (!chandelier && !out.lights.some(l => Math.abs(l.x - cx) < 4.5 && Math.abs(l.z - cz) < 4.5)) { out.furn.push({ kind: 'floorcandles', x: cx, z: cz }); light(cx, 0.6, cz, 0xff8a30, 1.6, 6, 'candle'); }
  // wall decor: paintings on solid interior walls, windows on outer walls
  for (const s of walls) {
    const sd = r.sides[s];
    if (sd === 'outer') { out.windows.push({ room: r.idx, side: s, ...wallPoint(r, s, 4.5 + 0.5) }); }
    else if (sd === 'wall' && rng() < 0.6) out.paintings.push({ side: s, ...wallPoint(r, s, pick([2.5, 6.5]) + 0.5), tex: Math.floor(rng() * 4) });
  }
  for (let k = 0; k < 2; k++) out.webs.push({ x: r.rx * S + (rng() < .5 ? 1 : 8), z: r.ry * S + (rng() < .5 ? 1 : 8), sx: 0, sz: 0 });
}
// point on the inner face of a room wall; t is along-coordinate 1..9 measured from room origin
function wallPoint(r, side, t) {
  const x0 = r.rx * S, z0 = r.ry * S;
  switch (side) { case 'N': return { x: x0 + t, z: z0 + 1 }; case 'S': return { x: x0 + t, z: z0 + S }; case 'W': return { x: x0 + 1, z: z0 + t }; case 'E': return { x: x0 + S, z: z0 + t }; }
}

// ---------------- geometry builder with vertex colours & transforms ----------------
export class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.idx = []; this.m = new THREE.Matrix4(); this.nm = new THREE.Matrix3(); this.col = new THREE.Color(1, 1, 1); }
  set(x, y, z, rotY = 0, sx = 1) { this.m.makeRotationY(rotY); this.m.setPosition(x, y, z); if (sx !== 1) this.m.multiply(new THREE.Matrix4().makeScale(sx, sx, sx)); this.nm.getNormalMatrix(this.m); return this; }
  color(c) { this.col.set(c); return this; }
  _v(x, y, z, nx, ny, nz, u, v) {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(this.m), n = new THREE.Vector3(nx, ny, nz).applyMatrix3(this.nm).normalize();
    this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v); this.c.push(this.col.r, this.col.g, this.col.b);
  }
  quad(a, b, c, d, n, uvs) { const s = this.p.length / 3; this._v(...a, ...n, ...uvs[0]); this._v(...b, ...n, ...uvs[1]); this._v(...c, ...n, ...uvs[2]); this._v(...d, ...n, ...uvs[3]); this.idx.push(s, s + 1, s + 2, s, s + 2, s + 3); }
  // box from local min to max; uv: 'world' (scale us), 'wall' (v = y/WALL_H, u/2), 'unit'
  box(x0, y0, z0, x1, y1, z1, { uv = 'world', us = 1, skip = '' } = {}) {
    const U = (a, b) => uv === 'unit' ? null : null;
    const f = (u0, u1, v0, v1) => uv === 'unit' ? [[0, 0], [1, 0], [1, 1], [0, 1]] : uv === 'wall' ? [[u0 / 2, v0 / WALL_H], [u1 / 2, v0 / WALL_H], [u1 / 2, v1 / WALL_H], [u0 / 2, v1 / WALL_H]] : [[u0 / us, v0 / us], [u1 / us, v0 / us], [u1 / us, v1 / us], [u0 / us, v1 / us]];
    if (!skip.includes('px')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], f(-z1, -z0, y0, y1));
    if (!skip.includes('nx')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], f(z0, z1, y0, y1));
    if (!skip.includes('py')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], uv === 'wall' ? [[0, 1], [0, 1], [0, 1], [0, 1]] : f(x0, x1, -z1, -z0));
    if (!skip.includes('ny')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], f(x0, x1, z0, z1));
    if (!skip.includes('pz')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], f(x0, x1, y0, y1));
    if (!skip.includes('nz')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], f(-x1, -x0, y0, y1));
    return this;
  }
  cbox(cx, cy, cz, w, h, d, o) { return this.box(cx - w / 2, cy, cz - d / 2, cx + w / 2, cy + h, cz + d / 2, o); }
  cyl(cx, y0, cz, r0, r1, h, seg = 10, caps = true) {
    const s = this.p.length / 3;
    for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); const sl = (r0 - r1) / h; const nl = Math.hypot(1, sl);
      this._v(cx + ca * r0, y0, cz + sa * r0, ca / nl, sl / nl, sa / nl, k / seg * 2, 0); this._v(cx + ca * r1, y0 + h, cz + sa * r1, ca / nl, sl / nl, sa / nl, k / seg * 2, h); }
    for (let k = 0; k < seg; k++) { const a = s + k * 2; this.idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    if (caps && r1 > 0) { const c = this.p.length / 3; this._v(cx, y0 + h, cz, 0, 1, 0, .5, .5); for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; this._v(cx + Math.cos(a) * r1, y0 + h, cz + Math.sin(a) * r1, 0, 1, 0, .5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5); } for (let k = 0; k < seg; k++) this.idx.push(c, c + k + 2, c + k + 1); }
    return this;
  }
  sphere(cx, cy, cz, r, seg = 8) { // low poly sphere via stacked rings
    const s = this.p.length / 3, rings = seg;
    for (let a = 0; a <= rings; a++) { const th = a / rings * Math.PI; for (let b = 0; b <= seg; b++) { const ph = b / seg * Math.PI * 2; const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph); this._v(cx + nx * r, cy + ny * r, cz + nz * r, nx, ny, nz, b / seg, a / rings); } }
    for (let a = 0; a < rings; a++) for (let b = 0; b < seg; b++) { const i0 = s + a * (seg + 1) + b, i1 = i0 + seg + 1; this.idx.push(i0, i0 + 1, i1, i0 + 1, i1 + 1, i1); }
    return this;
  }
  get empty() { return this.idx.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1)); g.computeBoundingSphere(); return g;
  }
}

// ---------------- shared materials (created once) ----------------
let MAT = null;
export function materials() {
  if (MAT) return MAT;
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.85, metalness: 0 }, o));
  const wood = TX.woodGrain();
  MAT = {
    walls: [0, 20, 200, 120, 280].map((h, i) => { const t = TX.wallpaper(h, i + 1); return std({ map: t, bumpMap: t, bumpScale: 0.6, roughness: 0.9 }); }),
    floorWood: std({ map: TX.woodFloor(2), roughness: 0.55, metalness: 0.05 }),
    floorDark: std({ map: TX.woodFloor(5, [45, 28, 18]), roughness: 0.6 }),
    floorMarble: std({ map: TX.checker(3), roughness: 0.25, metalness: 0.1 }),
    carpet: std({ map: TX.carpet(4), roughness: 1 }),
    ceiling: std({ map: TX.ceiling(5), roughness: 1 }),
    wood: std({ map: wood, roughness: 0.6 }),
    fabric: std({ roughness: 1 }),
    stone: std({ map: TX.stone(7), roughness: 0.9 }),
    metal: std({ roughness: 0.35, metalness: 0.85 }),
    books: std({ map: TX.books(8), roughness: 0.9 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    flame: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    web: new THREE.MeshLambertMaterial({ color: 0x9a9890, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    paintings: [0, 1, 2, 3].map(i => new THREE.MeshStandardMaterial({ map: TX.painting(20 + i * 7), roughness: 0.6 })),
    parchment: TX.parchment(), spark: TX.spark(), ghostFace: TX.ghostFace(),
  };
  return MAT;
}

// ---------------- build Three.js scene objects for a generated level ----------------
export function buildLevel(G) {
  WALL_H = G.hall ? 5.6 : 3.2;
  const M = materials(); const group = new THREE.Group(); const { W, H, grid } = G; const id = (i, j) => j * W + i;
  const B = {}; const b = k => (B[k] || (B[k] = new GeoBuilder()));
  const wallMat = M.walls[G.P.L % M.walls.length];
  // walls (greedy merge rows then columns)
  const used = new Uint8Array(W * H); const isW = (i, j) => i >= 0 && j >= 0 && i < W && j < H && grid[id(i, j)] === 1;
  const wb = b('wall'); wb.set(0, 0, 0);
  for (let j = 0; j < H; j++) { let i = 0; while (i < W) { if (isW(i, j)) { let e = i; while (isW(e + 1, j)) e++; if (e > i) { wb.box(i, 0, j, e + 1, WALL_H, j + 1, { uv: 'wall' }); for (let k = i; k <= e; k++) used[id(k, j)] = 1; } i = e + 1; } else i++; } }
  for (let i = 0; i < W; i++) { let j = 0; while (j < H) { if (isW(i, j) && !used[id(i, j)]) { let e = j; while (isW(i, e + 1) && !used[id(i, e + 1)]) e++; wb.box(i, 0, j, i + 1, WALL_H, e + 1, { uv: 'wall' }); j = e + 1; } else j++; } }
  // door lintels & frames for every opening (value 0 in a wall line, 3 secret, 4 exit)
  const trim = b('wood').color(0x5a3418); trim.set(0, 0, 0);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const v = grid[id(i, j)]; if ((i % S && j % S) || v === 1 || (v !== 0 && v !== 3 && v !== 4 && v !== 2)) continue; if (v === 2 && !(i % S === 0 || j % S === 0)) continue;
    if (G.hall && !(i === 0 || j === 0 || i === W - 1 || j === H - 1)) continue;
    if (!(i % S === 0 || j % S === 0)) continue;
    const vert = i % S === 0 && j % S !== 0; // wall runs along z => opening in x-direction
    const top = v === 4 ? 2.7 : 2.5;
    wb.box(i, top, j, i + 1, WALL_H, j + 1, { uv: 'wall' });
    trim.box(vert ? i - 0.03 : i, top - 0.12, vert ? j : j - 0.03, vert ? i + 1.03 : i + 1, top, vert ? j + 1 : j + 1.03);
    // posts at ends of opening
    const prevOpen = vert ? grid[id(i, j - 1)] !== 1 : grid[id(i - 1, j)] !== 1, nextOpen = vert ? grid[id(i, j + 1)] !== 1 : grid[id(i + 1, j)] !== 1;
    if (!prevOpen) trim.box(vert ? i - 0.05 : i, 0, vert ? j : j - 0.05, vert ? i + 1.05 : i + 0.12, top, vert ? j + 0.12 : j + 1.05);
    if (!nextOpen) trim.box(vert ? i - 0.05 : i + 0.88, 0, vert ? j + 0.88 : j - 0.05, vert ? i + 1.05 : i + 1, top, vert ? j + 1 : j + 1.05);
  }
  // floors per room
  const fl = { library: 'floorWood', dining: 'floorMarble', bedroom: 'floorDark', parlor: 'floorWood', chapel: 'floorMarble', gallery: 'floorMarble', nursery: 'floorDark', hall: 'floorMarble', treasure: 'floorDark' };
  for (const r of G.rooms) { const k = fl[r.type] || 'floorWood'; const fb = b(k); fb.set(0, 0, 0).color(0xffffff); const x0 = G.hall ? 0 : r.rx * S, z0 = G.hall ? 0 : r.ry * S, x1 = G.hall ? W : x0 + S + 1, z1 = G.hall ? H : z0 + S + 1; if (G.hall && r.idx) continue; fb.box(x0, -0.2, z0, x1, 0, z1, { us: 4, skip: 'nxpxnzpzny' }); }
  b('ceiling').set(0, 0, 0).box(0, WALL_H, 0, W, WALL_H + 0.2, H, { us: 4, skip: 'nxpxnzpzpy' });
  // ceiling beams
  const beam = b('wood').color(0x2a1a0e); beam.set(0, 0, 0); for (let i = S; i < W - 1; i += S) beam.box(i + 0.2, WALL_H - 0.25, 0, i + 0.8, WALL_H, H);
  if (G.hall) for (let i = 4.5; i < W; i += 4.5) beam.box(i, WALL_H - 0.3, 0, i + 0.4, WALL_H, H);
  // furniture
  const lightMeshes = [];
  for (const f of G.furn) buildFurniture(f, b, G);
  // windows
  for (const w of G.windows) {
    const wg = b('glow'), fr = b('wood'); const rot = ROT[w.side]; const along = (w.side === 'N' || w.side === 'S') ? 'x' : 'z';
    const off = 0.02; let x = w.x, z = w.z; if (w.side === 'N') z += off; if (w.side === 'S') z -= off; if (w.side === 'W') x += off; if (w.side === 'E') x -= off;
    wg.set(x, 0, z, rot).color(new THREE.Color(0.07, 0.1, 0.24)); wg.box(-0.7, 1.0, -0.01, 0.7, 2.6, 0.0);
    fr.set(x, 0, z, rot).color(0x1a0e06); fr.box(-0.8, 0.9, 0, 0.8, 1.0, 0.12); fr.box(-0.8, 2.6, 0, 0.8, 2.72, 0.12); fr.box(-0.8, 0.9, 0, -0.7, 2.72, 0.1); fr.box(0.7, 0.9, 0, 0.8, 2.72, 0.1);
    fr.box(-0.03, 1.0, 0, 0.03, 2.6, 0.06); fr.box(-0.7, 1.75, 0, 0.7, 1.81, 0.06);
    // curtains
    const cu = b('fabric').set(x, 0, z, rot).color(0x4a0a10); cu.box(-1.15, 0.2, 0.02, -0.72, 2.95, 0.2); cu.box(0.72, 0.2, 0.02, 1.15, 2.95, 0.2);
  }
  // paintings
  for (const p of G.paintings) { const pb = b('paint' + p.tex); let x = p.x, z = p.z; const o = 0.03; if (p.side === 'N') z += o; if (p.side === 'S') z -= o; if (p.side === 'W') x += o; if (p.side === 'E') x -= o; pb.set(x, 0, z, ROT[p.side]); pb.box(-0.55, 1.3, 0, 0.55, 2.7, 0.06, { uv: 'unit', skip: 'nxpxpynynz' }); b('wood').set(x, 0, z, ROT[p.side]).color(0x6a4a18).box(-0.62, 1.22, -0.01, 0.62, 2.78, 0.04); }
  // cobwebs
  for (const w of G.webs) { const wb2 = b('web'); const sx = w.x % S === 1 ? 1 : -1, sz = w.z % S === 1 ? 1 : -1; const x = w.x + (sx < 0 ? 1 : 0), z = w.z + (sz < 0 ? 1 : 0); const s = wb2.p.length / 3; wb2.set(0, 0, 0); wb2._v(x, WALL_H, z, 0, -1, 0, 0, 0); wb2._v(x + sx * 1.3, WALL_H, z, 0, -1, 0, 1, 0); wb2._v(x, WALL_H, z + sz * 1.3, 0, -1, 0, 0, 1); wb2._v(x, WALL_H - 1.1, z, 0, -1, 0, 1, 1); wb2.idx.push(s, s + 1, s + 3, s, s + 2, s + 3, s + 1, s + 2, s + 3); }

  const matFor = k => k === 'wall' ? wallMat : k.startsWith('paint') ? M.paintings[+k.slice(5)] : M[k];
  const meshes = [];
  for (const k in B) { if (B[k].empty) continue; const m = new THREE.Mesh(B[k].geometry(), matFor(k)); m.name = k; const shadow = !['glow', 'flame', 'web', 'ceiling'].includes(k) && !k.startsWith('floor') && k !== 'carpet'; m.castShadow = shadow && k !== 'wall'; m.receiveShadow = !['glow', 'flame', 'web'].includes(k); m.matrixAutoUpdate = false; m.updateMatrix(); group.add(m); meshes.push(m); if (k === 'flame') group.userData.flame = m; }
  group.userData.meshes = meshes;
  return group;
}

function buildFurniture(f, b, G) {
  const { x, z, rot } = f; const y = f.y || 0;
  const W = b('wood'), F = b('fabric'), St = b('stone'), Me = b('metal'), Gl = b('glow'), Fl = b('flame');
  for (const k of [W, F, St, Me, Gl, Fl]) k.set(x, y, z, rot);
  const wc = 0x6a3e1e, dk = 0x3a2010;
  const candle = (bx, by, bz, h = 0.18) => { b('fabric').set(x, y, z, rot).color(0xe8dcc0).cyl(bx, by, bz, 0.025, 0.025, h, 6); Fl.color(new THREE.Color(1.8, 0.85, 0.3)).cyl(bx, by + h, bz, 0.022, 0, 0.09, 5, false); Fl.color(new THREE.Color(0.9, 0.35, 0.08)).sphere(bx, by + h + 0.03, bz, 0.04, 4); };
  switch (f.kind) {
    case 'bookshelf': { W.color(dk).box(-0.98, 0, -0.5, 0.98, 2.6, -0.05); W.color(wc).box(-1, 0, -0.5, -0.92, 2.7, 0.0).box(0.92, 0, -0.5, 1, 2.7, 0.0).box(-1.02, 2.6, -0.52, 1.02, 2.75, 0.04);
      b('books').set(x, y, z, rot).color(0xffffff).box(-0.92, 0.12, -0.46, 0.92, 2.55, -0.08, { uv: 'unit', skip: 'nxpxpynynz' }); for (let k = 0; k < 4; k++) W.color(wc).box(-0.92, 0.08 + k * 0.62, -0.48, 0.92, 0.12 + k * 0.62, 0.0); break; }
    case 'table': { W.color(wc).box(-0.9, 0.72, -0.9, 0.9, 0.8, 0.9); for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.box(a * 0.78 - 0.05, 0, c * 0.78 - 0.05, a * 0.78 + 0.05, 0.72, c * 0.78 + 0.05); F.color(0x5a0a10).box(-0.95, 0.8, -0.3, 0.95, 0.81, 0.3);
      // books & skull
      F.color(0x2a3a5a).box(0.3, 0.81, 0.4, 0.62, 0.9, 0.62); F.color(0x958b78).sphere(-0.5, 0.92, 0.45, 0.1, 6); break; }
    case 'longtable': { W.color(wc).box(-0.85, 0.72, -1.9, 0.85, 0.8, 1.9); for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.box(a * 0.7 - 0.06, 0, c * 1.75 - 0.06, a * 0.7 + 0.06, 0.72, c * 1.75 + 0.06);
      F.color(0x7e7466).box(-0.9, 0.8, -1.95, 0.9, 0.81, 1.95);
      for (let k = -1.4; k <= 1.41; k += 0.7) { for (const s of [-1, 1]) { const cx = s * 1.15; W.color(dk).box(cx - 0.22, 0.42, k - 0.22, cx + 0.22, 0.48, k + 0.22); W.box(cx + s * 0.18 - 0.04, 0.48, k - 0.22, cx + s * 0.18 + 0.04, 1.25, k + 0.22); for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.box(cx + a * 0.18 - 0.03, 0, k + c * 0.18 - 0.03, cx + a * 0.18 + 0.03, 0.42, k + c * 0.18 + 0.03); }
        Me.color(0xb8b0a0).cyl(0, 0.81, k, 0.16, 0.16, 0.015, 10); } break; }
    case 'candelabra': { Me.color(0xc8a050).cyl(0, 0, 0, 0.1, 0.03, 0.06, 8).cyl(0, 0.06, 0, 0.025, 0.025, 0.36, 6).box(-0.22, 0.38, -0.02, 0.22, 0.42, 0.02); for (const o of [-0.2, 0, 0.2]) { Me.cyl(o, 0.42, 0, 0.035, 0.035, 0.04, 6); candle(o, 0.46, 0, 0.14); } break; }
    case 'floorcandles': { const r = mulberry(Math.floor(x * 31 + z * 17)); for (let k = 0; k < 7; k++) { const a = r() * 6.28, d = 0.15 + r() * 0.45; candle(Math.cos(a) * d, 0, Math.sin(a) * d, 0.08 + r() * 0.25); } Gl.color(new THREE.Color(0.35, 0.02, 0.02)).cyl(0, 0.005, 0, 0.75, 0.75, 0.003, 20); break; }
    case 'chandelier': { Me.set(x, 0, z, 0).color(0x8a7040); Me.cyl(0, WALL_H - 0.9, 0, 0.02, 0.02, 0.9, 5).cyl(0, WALL_H - 1.15, 0, 0.12, 0.05, 0.25, 8);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, cx = Math.cos(a) * 0.6, cz = Math.sin(a) * 0.6; Me.cyl(cx * 0.5, WALL_H - 1.05, cz * 0.5, 0.015, 0.015, 0.02, 4); Me.box(Math.min(0, cx) - 0.015, WALL_H - 1.06, Math.min(0, cz) - 0.015, Math.max(0, cx) + 0.015, WALL_H - 1.03, Math.max(0, cz) + 0.015); Me.cyl(cx, WALL_H - 1.06, cz, 0.04, 0.04, 0.04, 6); Fl.set(x, 0, z, 0); candle(cx, WALL_H - 1.02, cz, 0.12); }
      Me.cyl(0, WALL_H - 1.06, 0, 0.62, 0.62, 0.02, 16, false); break; }
    case 'sideboard': { W.color(dk).box(-0.95, 0, -0.5, 0.95, 0.95, 0.0); W.color(wc).box(-1, 0.95, -0.52, 1, 1.02, 0.03); for (const o of [-0.48, 0.48]) W.color(0x4a2a14).box(o - 0.4, 0.15, -0.0, o + 0.4, 0.85, 0.02); Me.color(0xc8a050).cyl(-0.5, 1.02, -0.25, 0.08, 0.05, 0.25, 8); candle(0.5, 1.02, -0.25, 0.2); break; }
    case 'cabinet': { W.color(dk).box(-0.45, 0, -0.5, 0.45, 1.9, -0.05); W.color(wc).box(-0.48, 1.9, -0.52, 0.48, 2.0, 0.0); Gl.color(new THREE.Color(0.05, 0.07, 0.08)).box(-0.38, 0.9, -0.06, 0.38, 1.8, -0.04); break; }
    case 'clock': { W.color(dk).box(-0.3, 0, -0.45, 0.3, 2.2, -0.1); W.color(wc).box(-0.35, 2.2, -0.47, 0.35, 2.5, -0.05); Me.color(0xd8c890).cyl(0, 2.0, -0.1, 0.18, 0.18, 0.02, 12); Me.color(0xc8a050).cyl(0, 0.6, -0.12, 0.08, 0.08, 0.02, 8); break; }
    case 'wardrobe': { W.color(dk).box(-0.48, 0, -0.5, 0.48, 2.4, 0.0); W.color(wc).box(-0.5, 2.4, -0.52, 0.5, 2.55, 0.02).box(-0.01, 0.1, 0, 0.01, 2.3, 0.02); Me.color(0xc8a050).box(-0.08, 1.2, 0, -0.04, 1.35, 0.05).box(0.04, 1.2, 0, 0.08, 1.35, 0.05); break; }
    case 'mirror': { W.color(0x6a4a18).box(-0.45, 0.6, -0.5, 0.45, 2.4, -0.44); Me.color(0x404850).box(-0.38, 0.68, -0.44, 0.38, 2.32, -0.43); break; }
    case 'crate': { W.color(0x5a4028).box(-0.4, 0, -0.45, 0.4, 0.8, 0.3); W.color(0x3a2a18).box(-0.42, 0.75, -0.47, 0.42, 0.82, 0.32); break; }
    case 'bed': { W.color(dk).box(-0.95, 0, -1.45, 0.95, 0.45, 1.45); F.color(0xcfc6b0).box(-0.9, 0.45, -1.4, 0.9, 0.62, 1.4); F.color(0x5a0a14).box(-0.92, 0.5, -0.4, 0.92, 0.66, 1.42); F.color(0xe0d8c8).box(-0.7, 0.62, -1.35, 0.7, 0.78, -0.95);
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.color(wc).cyl(a * 0.92, 0, c * 1.42, 0.06, 0.05, 2.5, 6); F.color(0x3a0610).box(-0.95, 2.45, -1.45, 0.95, 2.55, 1.45); F.box(-0.97, 1.2, -1.47, -0.93, 2.5, 1.47).box(0.93, 1.2, -1.47, 0.97, 2.5, 1.47); W.color(dk).box(-0.95, 0.4, -1.5, 0.95, 1.5, -1.42); break; }
    case 'nightstand': { W.color(dk).box(-0.3, 0, -0.45, 0.3, 0.6, 0.0); candle(0, 0.6, -0.2, 0.15); break; }
    case 'fireplace': { St.color(0x8a8070).box(-1.0, 0, -0.5, 1.0, 1.5, 0.05); St.color(0x6a6058).box(-1.1, 1.5, -0.52, 1.1, 1.62, 0.12); St.color(0x0a0605).box(-0.6, 0, -0.35, 0.6, 1.0, 0.06); St.color(0x5a5048).box(-0.8, 1.62, -0.5, 0.8, WALL_H, -0.15);
      Fl.color(new THREE.Color(2.2, 0.7, 0.1)); for (let k = 0; k < 5; k++) Fl.cyl(-0.35 + k * 0.17, 0.05, -0.12, 0.09, 0, 0.35 + (k % 2) * 0.2, 5, false); W.color(0x2a1408).box(-0.4, 0.02, -0.2, 0.4, 0.1, -0.05);
      b('paint' + (Math.abs(Math.floor(x * 7 + z)) % 4)).set(x, y, z, rot).box(-0.45, 1.85, -0.15, 0.45, 2.85, -0.14, { uv: 'unit', skip: 'nxpxpynynz' }); break; }
    case 'sofa': { F.color(0x4a0a18).box(-0.95, 0.2, -0.4, 0.95, 0.5, 0.4).box(-0.95, 0.5, 0.2, 0.95, 1.05, 0.42).box(-1.0, 0.2, -0.4, -0.82, 0.75, 0.42).box(0.82, 0.2, -0.4, 1.0, 0.75, 0.42); W.color(dk).box(-0.9, 0, -0.35, 0.9, 0.2, 0.38); break; }
    case 'armchair': { F.color(0x2a3a1a).box(-0.4, 0.2, -0.45, 0.4, 0.5, 0.0).box(-0.4, 0.5, -0.5, 0.4, 1.1, -0.36).box(-0.45, 0.2, -0.5, -0.35, 0.72, 0.0).box(0.35, 0.2, -0.5, 0.45, 0.72, 0.0); break; }
    case 'piano': { W.color(0x0a0808).box(-0.9, 0.7, -0.9, 0.9, 1.0, 0.6).box(-0.9, 1.0, -0.9, 0.9, 1.05, -0.2); for (const [a, c] of [[-.8, -.8], [.8, -.8], [0, .5]]) W.cyl(a, 0, c, 0.06, 0.05, 0.7, 6); F.color(0xeeeeee).box(-0.8, 0.95, 0.6, 0.8, 1.0, 0.8); W.color(0x0a0808).box(-0.8, 0.98, 0.65, 0.8, 1.01, 0.68); W.color(0x0a0808).box(-0.6, 0.7, -0.85, 0.85, 0.72, 0.5); break; }
    case 'statue': { St.color(0x9a948a).box(-0.35, 0, -0.45, 0.35, 0.9, -0.05).cyl(0, 0.9, -0.25, 0.18, 0.15, 0.9, 8).sphere(0, 2.0, -0.25, 0.17, 8).box(-0.35, 1.45, -0.32, 0.35, 1.6, -0.18); St.cyl(0.22, 1.0, -0.25, 0.05, 0.05, 0.55, 5).cyl(-0.22, 1.0, -0.25, 0.05, 0.05, 0.55, 5); break; }
    case 'armor': { St.color(0x3a3430).box(-0.3, 0, -0.45, 0.3, 0.15, 0.0); Me.color(0x9098a0).cyl(-0.1, 0.15, -0.22, 0.07, 0.08, 0.8, 6).cyl(0.1, 0.15, -0.22, 0.07, 0.08, 0.8, 6).cyl(0, 0.95, -0.22, 0.2, 0.25, 0.6, 8).sphere(0, 1.75, -0.22, 0.16, 8).cyl(-0.3, 1.0, -0.22, 0.06, 0.07, 0.55, 6).cyl(0.3, 1.0, -0.22, 0.06, 0.07, 0.55, 6); Me.color(0x6a6a70).box(0.36, 0.2, -0.24, 0.39, 2.1, -0.2).box(0.3, 2.0, -0.26, 0.45, 2.3, -0.18); Gl.color(new THREE.Color(1.6, 0.05, 0.02)).box(-0.07, 1.76, -0.07, 0.07, 1.79, -0.06); break; }
    case 'coffin': { W.color(0x2a1408).box(-0.95, 0, -0.5, 0.95, 0.55, 0.1); W.color(0x3a1c0a).box(-0.98, 0.55, -0.52, 0.98, 0.62, 0.12); Me.color(0xb09050).box(-0.05, 0.62, -0.35, 0.05, 0.63, 0.0).box(-0.18, 0.62, -0.22, 0.18, 0.63, -0.14); break; }
    case 'pillar': { St.set(x, 0, z, 0).color(0xa8a090).box(-0.5, 0, -0.5, 0.5, 0.3, 0.5).cyl(0, 0.3, 0, 0.36, 0.32, WALL_H - 0.6, 12).box(-0.5, WALL_H - 0.3, -0.5, 0.5, WALL_H, 0.5); break; }
    case 'carpet': { b('carpet').set(x, 0, z, rot).color(0xffffff).box(-f.w / 2, 0.002, -f.d / 2, f.w / 2, 0.012, f.d / 2, { us: 2 }); break; }
    case 'altar': { St.color(0x6a6058).box(-0.95, 0, -0.5, 0.95, 1.0, 0.1); F.color(0x5a0a10).box(-0.97, 1.0, -0.52, 0.97, 1.03, 0.12).box(-0.3, 0.3, 0.1, 0.3, 1.0, 0.13); Me.color(0xc8a050).box(-0.03, 1.03, -0.3, 0.03, 1.8, -0.24).box(-0.25, 1.5, -0.3, 0.25, 1.56, -0.24); candle(-0.7, 1.03, -0.2, 0.3); candle(0.7, 1.03, -0.2, 0.3); candle(-0.5, 1.03, -0.1, 0.2); candle(0.5, 1.03, -0.1, 0.2); break; }
    case 'pew': { W.color(0x4a2a14).box(-0.95, 0.42, -0.3, 0.95, 0.5, 0.15).box(-0.95, 0.5, 0.12, 0.95, 1.1, 0.2).box(-0.97, 0, -0.3, -0.9, 1.0, 0.2).box(0.9, 0, -0.3, 0.97, 1.0, 0.2); break; }
    case 'crib': { W.color(0xd8d0c0); W.box(-0.9, 0.3, -0.5, 0.9, 0.38, 0.1); for (let k = -0.85; k <= 0.86; k += 0.17) { W.box(k - 0.02, 0.38, 0.06, k + 0.02, 1.0, 0.1); W.box(k - 0.02, 0.38, -0.5, k + 0.02, 1.0, -0.46); } W.box(-0.9, 1.0, -0.5, 0.9, 1.05, 0.1); for (const a of [-0.88, 0.88]) W.box(a - 0.03, 0, -0.5, a + 0.03, 1.1, 0.1); break; }
    case 'rocker': { W.color(0x4a2a14).box(-0.3, 0.4, -0.3, 0.3, 0.46, 0.3).box(-0.3, 0.46, 0.22, 0.3, 1.2, 0.28); for (const a of [-0.28, 0.28]) W.box(a - 0.03, 0, -0.4, a + 0.03, 0.06, 0.4).box(a - 0.03, 0.06, -0.25, a + 0.03, 0.4, -0.2).box(a - 0.03, 0.06, 0.2, a + 0.03, 0.4, 0.25); F.color(0xd8c8b0).sphere(0, 0.62, 0, 0.12, 6); F.color(0x7a1a2a).cyl(0, 0.46, 0, 0.12, 0.08, 0.18, 6); break; }
    case 'doll': { F.color(0xe8d0c0).sphere(0, 0.18, -0.3, 0.11, 6); F.color(0x7a1a2a).cyl(0, 0, -0.3, 0.12, 0.06, 0.12, 6); Gl.color(new THREE.Color(1.5, 0, 0)).box(-0.05, 0.2, -0.2, -0.02, 0.22, -0.19).box(0.02, 0.2, -0.2, 0.05, 0.22, -0.19); break; }
    case 'throne': { St.set(x, 0, z, 0).color(0x2a2428).box(-1.6, 0, -1.2, 1.6, 0.4, 1.2); F.set(x, 0, z, 0).color(0x5a0a10).box(-0.7, 0.4, -0.6, 0.7, 1.0, 0.6).box(-0.7, 1.0, -0.6, 0.7, 3.0, -0.4); Me.set(x, 0, z, 0).color(0xb08a3a).box(-0.9, 0.4, -0.7, -0.7, 1.5, 0.6).box(0.7, 0.4, -0.7, 0.9, 1.5, 0.6).box(-0.9, 3.0, -0.7, 0.9, 3.1, -0.3); break; }
  }
}
export { ROOM_NAMES };
