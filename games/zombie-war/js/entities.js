// ZOMBIE WAR – zombies, boss, survivors, pickups, gibs (GUNVORA GAMES)
import * as THREE from 'three';
import { canvasTex, normalFromTex, grime, rand, randi, clamp } from './core.js';

export const ENT = { shadows: true };
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
let M = null;
function blob(x, px, py, r, c) { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
function mats() {
  if (M) return M; M = {};
  const skin = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#c4c2b2'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) blob(x, Math.random() * w, Math.random() * h, 6 + Math.random() * 26, ['rgba(90,110,70,.22)', 'rgba(110,70,90,.18)', 'rgba(70,60,40,.2)', 'rgba(255,255,230,.12)'][i % 4]);
    x.strokeStyle = 'rgba(60,30,70,.35)'; for (let i = 0; i < 26; i++) { x.lineWidth = 0.6 + Math.random(); x.beginPath(); let px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (Math.random() - .5) * 26; py += (Math.random() - .5) * 26; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 12; i++) { const px = Math.random() * w, py = Math.random() * h; blob(x, px, py, 10 + Math.random() * 12, 'rgba(110,8,8,.85)'); blob(x, px, py, 4 + Math.random() * 4, 'rgba(20,0,0,.9)'); }
    for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  }, [1, 1]);
  const skinN = normalFromTex(skin, 3.2);
  M.skin = {}; for (const [k, c] of Object.entries({ walker: 0x9aa58a, runner: 0xb09a8c, brute: 0x7f8c6c, exploder: 0xa6b46a, boss: 0x8c8a7a, human: 0xd8a888 })) M.skin[k] = new THREE.MeshStandardMaterial({ map: k === 'human' ? null : skin, normalMap: k === 'human' ? null : skinN, color: c, roughness: 0.72 });
  const cloth = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 128; i += 3) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, i, w, 1); x.fillRect(i, 0, 1, h); }
    grime(x, w, h, 50, 0.3); for (let i = 0; i < 7; i++) blob(x, Math.random() * w, Math.random() * h, 6 + Math.random() * 18, 'rgba(100,0,0,.8)');
    for (let i = 0; i < 4; i++) { x.fillStyle = '#1a0f0a'; x.beginPath(); const px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py); for (let k = 0; k < 5; k++) x.lineTo(px + (Math.random() - .5) * 18, py + (Math.random() - .5) * 18); x.fill(); }
  }, [1, 1]);
  const clothN = normalFromTex(cloth, 2);
  const cm = c => new THREE.MeshStandardMaterial({ map: cloth, normalMap: clothN, color: c, roughness: 0.92 });
  M.shirts = [0x6a7a8a, 0x8a3a2a, 0xc8c0a8, 0x3a4a6a, 0x4a5a3a, 0x7a6a8a, 0x2a2a2a, 0xa88a4a].map(cm);
  M.pants = [0x2a3448, 0x4a4030, 0x2a2a2a, 0x5a5a50].map(cm);
  M.military = cm(0x4a5232); M.vest = new THREE.MeshStandardMaterial({ color: 0x2c3220, roughness: 0.7, metalness: 0.2 });
  M.shoe = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.8 });
  M.hair = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 });
  M.gore = new THREE.MeshStandardMaterial({ color: 0x5a0606, roughness: 0.3, metalness: 0.1, emissive: 0x1a0000 });
  M.bone = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.6 });
  M.eye = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 2.6, 0.6), toneMapped: false });
  M.eyeRed = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.5, 0.2), toneMapped: false });
  M.eyeH = new THREE.MeshBasicMaterial({ color: 0x111111 });
  M.pus = new THREE.MeshStandardMaterial({ color: 0x9adf3a, emissive: 0x6aff1a, emissiveIntensity: 1.2, roughness: 0.3 });
  M.pusB = new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: 0.3 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0x3a3e34, roughness: 0.45, metalness: 0.7 });
  return M;
}
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(0.5, 14, 10), cyl: new THREE.CylinderGeometry(0.5, 0.42, 1, 9), cone: new THREE.ConeGeometry(0.5, 1, 7),
  torso: new THREE.CylinderGeometry(0.21, 0.16, 0.56, 10), half: new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};
function mesh(geo, mat, parent, p, s, r) { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); m.castShadow = ENT.shadows; parent.add(m); return m; }
function grp(parent, p) { const g = new THREE.Group(); if (p) g.position.set(...p); parent.add(g); return g; }

// generic humanoid rig (+z = forward)
function humanoid(o) {
  const m = mats(); const R = {};
  R.root = new THREE.Group(); R.body = grp(R.root); R.hips = grp(R.body, [0, 0.92, 0]);
  const skin = m.skin[o.skin], shirt = o.shirt, pants = o.pants;
  mesh(GEO.box, pants, R.hips, [0, 0, 0], [0.34, 0.2, 0.21]);
  R.torso = grp(R.hips, [0, 0.08, 0]);
  R.chest = mesh(GEO.torso, shirt, R.torso, [0, 0.28, 0], [o.wide || 1, 1, 0.66]);
  if (o.belly) { R.belly = mesh(GEO.sph, skin, R.torso, [0, 0.2, 0.08], [0.48, 0.5, 0.44]); for (let i = 0; i < 6; i++) { const a = rand(-1.2, 1.2), y = rand(0.05, 0.4); mesh(GEO.sph, o.pus || m.pus, R.torso, [Math.sin(a) * 0.23, y, Math.cos(a) * 0.22 + 0.08], [0.08, 0.08, 0.06].map(v => v * rand(0.7, 1.4))); } }
  if (o.ribs) mesh(GEO.box, m.gore, R.torso, [rand(-0.08, 0.08), 0.3, 0.13], [0.12, 0.14, 0.04]);
  R.neck = grp(R.torso, [0, 0.57, 0.02]); mesh(GEO.cyl, skin, R.neck, [0, 0.03, 0], [0.11, 0.1, 0.11]);
  R.stump = mesh(GEO.sph, m.gore, R.neck, [0, 0.07, 0], [0.12, 0.06, 0.12]); R.stump.visible = false;
  R.head = grp(R.neck, [0, 0.08, 0]);
  R.headM = mesh(GEO.sph, skin, R.head, [0, 0.12, 0.01], [0.24, 0.28, 0.26]);
  R.jaw = grp(R.head, [0, 0.05, 0.02]); mesh(GEO.box, skin, R.jaw, [0, -0.02, 0.06], [0.15, 0.05, 0.12]);
  mesh(GEO.box, m.gore, R.head, [0, 0.04, 0.1], [0.1, 0.03, 0.06]);
  for (const sx of [-1, 1]) mesh(GEO.sph, o.eye, R.head, [sx * 0.055, 0.15, 0.125], [0.042, 0.03, 0.02]);
  if (o.hair) mesh(GEO.half, m.hair, R.head, [0, 0.15, -0.005], [0.255, 0.22, 0.27]);
  R.arms = []; R.legs = [];
  for (const sx of [-1, 1]) {
    const sh = grp(R.torso, [sx * 0.25 * (o.wide || 1), 0.5, 0]);
    const up = mesh(GEO.cyl, o.sleeve || shirt, sh, [0, -0.15, 0], [0.12 * (o.arm || 1), 0.31, 0.12 * (o.arm || 1)]);
    const el = grp(sh, [0, -0.3, 0]); const fo = mesh(GEO.cyl, skin, el, [0, -0.14, 0], [0.095 * (o.arm || 1), 0.29, 0.095 * (o.arm || 1)]);
    const hand = mesh(GEO.box, skin, el, [0, -0.32, 0.01], [0.075 * (o.arm || 1), 0.11, 0.045 * (o.arm || 1)]);
    R.arms.push({ sh, el, up, fo, hand, side: sx, lost: false });
    const hp = grp(R.hips, [sx * 0.1, -0.03, 0]); mesh(GEO.cyl, pants, hp, [0, -0.22, 0], [0.155, 0.46, 0.155]);
    const kn = grp(hp, [0, -0.45, 0]); mesh(GEO.cyl, pants, kn, [0, -0.21, 0], [0.125, 0.43, 0.125]); mesh(GEO.box, m.shoe, kn, [0, -0.44, 0.05], [0.11, 0.07, 0.24]);
    R.legs.push({ hp, kn, side: sx });
  }
  return R;
}

export const ZT = {
  walker: { hp: 100, speed: 1.05, dmg: 10, scale: 1.0, reach: 1.35, atk: 1.0, coin: 2, groan: 1 },
  runner: { hp: 65, speed: 3.6, dmg: 8, scale: 0.95, reach: 1.25, atk: 0.62, coin: 3, groan: 1.25 },
  brute: { hp: 480, speed: 1.4, dmg: 26, scale: 1.5, reach: 2.0, atk: 1.25, coin: 10, groan: 0.6 },
  exploder: { hp: 80, speed: 1.75, dmg: 55, scale: 1.12, reach: 2.3, atk: 0.9, coin: 5, groan: 0.9 },
};

export class Zombie {
  constructor(scene, type, pos, P, opts = {}) {
    this.scene = scene; this.type = type; this.T = ZT[type]; this.P = P; const m = mats();
    const T = this.T; this.maxHp = this.hp = T.hp * P.hpMul; this.speed = T.speed * P.speedMul * rand(0.88, 1.12); this.dmg = T.dmg * P.dmgMul;
    const s = this.s = T.scale * rand(0.94, 1.06);
    this.pusMat = m.pus.clone();
    const R = this.R = humanoid({ pus: this.pusMat, skin: type, shirt: type === 'brute' ? m.military : m.shirts[randi(0, m.shirts.length - 1)], pants: m.pants[randi(0, m.pants.length - 1)], eye: m.eye, hair: Math.random() < 0.55, wide: type === 'brute' ? 1.3 : 1, arm: type === 'brute' ? 1.45 : 1, belly: type === 'exploder', ribs: Math.random() < 0.4, sleeve: type === 'runner' && Math.random() < 0.5 ? m.skin.runner : null });
    if (type === 'brute') { mesh(GEO.box, m.vest, R.torso, [0, 0.3, 0.02], [0.5, 0.42, 0.33]); for (const sx of [-1, 1]) mesh(GEO.cone, m.bone, R.torso, [sx * 0.2, 0.6, -0.08], [0.06, 0.18, 0.06], [-0.5, 0, sx * 0.4]); }
    this.g = R.root; this.g.position.copy(pos); R.body.scale.setScalar(s); scene.add(this.g);
    this.state = opts.rise === false ? 'move' : 'rise'; this.t = rand(0, 10); this.riseT = 0; this.ph = rand(0, 6); this.yaw = rand(-3, 3); this.g.rotation.y = this.yaw;
    this.vel = new THREE.Vector3(); this.kb = new THREE.Vector3(); this.flinch = 0; this.atkT = 0; this.atkCd = rand(0.2, 0.6); this.hitDone = false;
    this.limp = type === 'walker' && Math.random() < 0.35 ? randi(0, 1) : -1; this.tilt = rand(-0.35, 0.35);
    this.groanT = rand(1, 6); this.deadT = 0; this.gone = false; this.fuseT = 0; this.headless = false; this.flowV = new THREE.Vector3();
    if (this.state === 'rise') this.g.position.y = -1.9 * s;
  }
  get x() { return this.g.position.x; } get z() { return this.g.position.z; }
  alive() { return this.state !== 'dead'; }
  center(o = v1) { return this.R.chest.getWorldPosition(o); }
  // ray hit test: returns {t, part}
  rayHit(o, d, maxT, assist = 1) {
    if (this.state === 'dead' || this.gone) return null;
    const dx = this.g.position.x - o.x, dz = this.g.position.z - o.z; if (dx * dx + dz * dz > (maxT + 3) ** 2) return null;
    let best = null; const s = this.s;
    const test = (obj, r, part) => { obj.getWorldPosition(v2); v3.subVectors(v2, o); const b = v3.dot(d); if (b < 0) return; const c = v3.lengthSq() - b * b; const rr = r * r * assist * assist; if (c > rr) return; const t = b - Math.sqrt(rr - c); if (t < maxT && (!best || t < best.t)) best = { t, part }; };
    if (!this.headless) test(this.R.headM, 0.16 * s, 'head');
    test(this.R.chest, 0.29 * s * (this.type === 'exploder' ? 1.15 : 1), 'body'); test(this.R.hips, 0.22 * s, 'body');
    test(this.R.legs[0].kn, 0.16 * s, 'leg'); test(this.R.legs[1].kn, 0.16 * s, 'leg');
    return best;
  }
  damage(amt, part, dir, ctx, o = {}) {
    if (this.state === 'dead') return null;
    const mult = part === 'head' ? (o.headMul || 2.4) : part === 'leg' ? 0.75 : 1; const d = amt * mult; this.hp -= d;
    this.flinch = Math.min(1.2, this.flinch + (o.force || 0.4) * (this.type === 'brute' ? 0.4 : 1)); this.kb.addScaledVector(dir, (o.force || 0.3) * (this.type === 'brute' ? 0.6 : 2.2));
    if (this.state === 'rise') this.riseT = Math.max(this.riseT, 1.0);
    if (Math.random() < 0.18 && o.force > 0.9 && !this.R.arms.every(a => a.lost)) this.loseArm(ctx, dir);
    if (this.hp <= 0) { this.die(dir, part, ctx, o); return { killed: true, head: part === 'head', dmg: d }; }
    return { killed: false, head: part === 'head', dmg: d };
  }
  loseArm(ctx, dir) { const a = this.R.arms.find(a => !a.lost && Math.random() < 0.6) || this.R.arms.find(a => !a.lost); if (!a) return; a.lost = true; a.fo.getWorldPosition(v2); a.el.visible = false; ctx.gib(a.fo.geometry, a.fo.material, v2, dir, 0.1 * this.s, 0.29 * this.s); ctx.bloodBurst(v2, 20); }
  die(dir, part, ctx, o = {}) {
    this.state = 'dead'; this.deadT = 0; this.fallDir = Math.random() < 0.75 ? -1 : 1;
    // face away from the hit so the fall reads correctly
    const ay = Math.atan2(-dir.x, -dir.z); this.g.rotation.y = this.yaw = ay; this.fallDir = -1;
    if (Math.random() < 0.25) { this.g.rotation.y = this.yaw = ay + Math.PI; this.fallDir = 1; }
    if (part === 'head' || o.explosive && Math.random() < 0.5) this.popHead(ctx, dir);
    if (o.explosive) { this.fling = new THREE.Vector3(dir.x * 5, 5 + Math.random() * 3, dir.z * 5); this.spin = rand(-6, 6); for (const a of this.R.arms) if (Math.random() < 0.5) { a.lost = true; a.fo.getWorldPosition(v2); a.el.visible = false; ctx.gib(a.fo.geometry, a.fo.material, v2, dir, 0.1 * this.s, 0.29 * this.s); } }
    ctx.onKill(this, part, o);
    if (this.type === 'exploder') { this.boomT = 0.12; }
  }
  popHead(ctx, dir) { if (this.headless) return; this.headless = true; this.R.headM.getWorldPosition(v2); this.R.head.visible = false; this.R.stump.visible = true; ctx.gib(GEO.sph, this.R.headM.material, v2, dir, 0.24 * this.s, 0.28 * this.s, true); ctx.bloodBurst(v2, 40); this.fountain = 1.4; ctx.sfx.splat(0.7); }
  update(dt, ctx) {
    this.t += dt; const R = this.R, T = this.T, s = this.s, g = this.g; const pl = ctx.player;
    if (this.state === 'dead') return this.updateDead(dt, ctx);
    const dx = pl.x - g.position.x, dz = pl.z - g.position.z, dist = Math.hypot(dx, dz);
    this.flinch = Math.max(0, this.flinch - dt * 2.5);
    // groans
    this.groanT -= dt; if (this.groanT <= 0) { this.groanT = rand(3, 9); if (dist < 24) ctx.sfx.groan(clamp(0.45 - dist / 60, 0.05, 0.45), T.groan * rand(0.85, 1.15)); }
    if (this.state === 'rise') {
      this.riseT += dt; const k = clamp(this.riseT / 1.6, 0, 1), e = 1 - Math.pow(1 - k, 3); g.position.y = -1.9 * s * (1 - e);
      R.arms.forEach((a, i) => { a.sh.rotation.x = -2.6 + Math.sin(this.t * 5 + i) * 0.3; a.el.rotation.x = -0.3; }); R.torso.rotation.x = 0.3 * (1 - k); R.jaw.rotation.x = 0.4;
      if (Math.random() < 0.5 && k < 0.95) ctx.dirt(g.position);
      g.rotation.y = this.yaw = Math.atan2(dx, dz);
      if (k >= 1) { this.state = 'move'; g.position.y = 0; }
      return;
    }
    // exploder fuse
    if (this.state === 'fuse') {
      this.fuseT += dt; const k = this.fuseT / 0.95; R.body.scale.setScalar(s * (1 + k * 0.3 + Math.sin(this.fuseT * 40) * 0.04)); this.pusMat.emissiveIntensity = 1.2 + k * 4;
      if (Math.floor(this.fuseT * 8) !== Math.floor((this.fuseT - dt) * 8)) ctx.sfx.click(1800 + k * 1500, 0.25);
      if (this.fuseT > 0.95) { this.hp = 0; this.die(new THREE.Vector3(dx, 0, dz).normalize().negate(), 'body', ctx, { self: true }); this.boomT = 0; }
      return;
    }
    // steering
    const dir = v1; const direct = dist < 8 && ctx.world.los(g.position.x, g.position.z, pl.x, pl.z);
    if (direct || dist < 1.6) dir.set(dx / (dist || 1), 0, dz / (dist || 1)); else { ctx.world.flowDir(g.position.x, g.position.z, dir); if (dir.lengthSq() < 0.1) dir.set(dx / (dist || 1), 0, dz / (dist || 1)); }
    // separation
    for (const o of ctx.zombies) { if (o === this || o.state === 'dead' || o.state === 'rise') continue; const ox = g.position.x - o.g.position.x, oz = g.position.z - o.g.position.z, d2 = ox * ox + oz * oz, rr = (0.45 * (s + o.s)) ** 2; if (d2 < rr && d2 > 1e-6) { const d = Math.sqrt(d2), f = (Math.sqrt(rr) - d) / d * 0.5; g.position.x += ox * f; g.position.z += oz * f; } }
    let sp = this.speed * (1 - Math.min(0.85, this.flinch * 0.9));
    if (this.state === 'attack') sp *= this.type === 'runner' ? 0.6 : 0.15;
    if (dist < T.reach * s * 0.75) sp = 0;
    this.vel.set(dir.x * sp, 0, dir.z * sp);
    const ox = g.position.x, oz = g.position.z;
    g.position.x += (this.vel.x + this.kb.x) * dt; g.position.z += (this.vel.z + this.kb.z) * dt; this.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
    v2.copy(g.position); ctx.world.collide(v2, 0.3 * s); g.position.x = v2.x; g.position.z = v2.z;
    const moved = Math.hypot(g.position.x - ox, g.position.z - oz);
    // heading
    const want = dist < 3 ? Math.atan2(dx, dz) : (sp > 0.1 ? Math.atan2(dir.x, dir.z) : Math.atan2(dx, dz)); let dy = want - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.yaw += dy * Math.min(1, dt * (this.type === 'runner' ? 8 : 4)); g.rotation.y = this.yaw;
    // attack
    this.atkCd -= dt;
    if (this.state === 'move' && dist < T.reach * s && this.atkCd <= 0 && Math.abs(dy) < 0.8) {
      if (this.type === 'exploder') { this.state = 'fuse'; this.fuseT = 0; ctx.sfx.zap(0.3); ctx.sfx.groan(0.5, 1.6); return; }
      this.state = 'attack'; this.atkT = 0; this.hitDone = false; ctx.sfx.groan(0.5, T.groan * 1.2);
    }
    // animation
    this.ph += moved / s * (this.type === 'runner' ? 2.9 : 3.4);
    const ph = this.ph, sn = Math.sin(ph), cs = Math.cos(ph);
    const amp = this.type === 'runner' ? 0.95 : this.type === 'brute' ? 0.42 : 0.55;
    R.legs.forEach((l, i) => { const a = (i ? -sn : sn) * amp * (this.limp === i ? 0.3 : 1); l.hp.rotation.x = a; l.kn.rotation.x = Math.max(0, (i ? sn : -sn)) * amp * 1.3 + 0.08; });
    R.hips.position.y = 0.92 - Math.abs(cs) * 0.035 - (this.type === 'runner' ? 0.04 : 0) - (this.limp >= 0 ? Math.max(0, sn) * 0.05 : 0);
    const lean = { walker: 0.22, runner: 0.5, brute: 0.32, exploder: 0.05 }[this.type];
    R.torso.rotation.x = lean - this.flinch * 0.7; R.torso.rotation.z = sn * 0.08 + (this.limp >= 0 ? 0.1 * (this.limp ? 1 : -1) : 0); R.torso.rotation.y = sn * 0.12;
    R.head.rotation.z = this.tilt + Math.sin(this.t * 1.7) * 0.08 + this.flinch * rand(-0.3, 0.3); R.head.rotation.x = -lean * 0.6 + Math.sin(this.t * 1.3) * 0.08 - this.flinch * 0.3;
    R.jaw.rotation.x = 0.18 + Math.max(0, Math.sin(this.t * 3.3)) * 0.3;
    if (this.state === 'attack') {
      this.atkT += dt; const k = this.atkT / T.atk;
      const pose = k < 0.45 ? -1.4 - k / 0.45 * 1.4 : k < 0.62 ? -2.8 + (k - 0.45) / 0.17 * 2.3 : -0.5 - (k - 0.62) / 0.38 * 0.9;
      R.arms.forEach((a, i) => { a.sh.rotation.x = pose + (i ? 0.15 : 0); a.sh.rotation.z = -a.side * 0.15; a.el.rotation.x = -0.5; });
      R.torso.rotation.x = lean + (k < 0.45 ? -0.2 : 0.35); R.jaw.rotation.x = 0.7;
      if (this.type === 'runner' && k > 0.4 && k < 0.6) { g.position.x += dx / (dist || 1) * dt * 3; g.position.z += dz / (dist || 1) * dt * 3; }
      if (!this.hitDone && k >= 0.55) { this.hitDone = true; if (dist < T.reach * s + 0.55) ctx.hurtPlayer(this.dmg, g.position, this.type === 'brute' ? 0.9 : 0.35); else ctx.sfx.step(0.2); }
      if (k >= 1) { this.state = 'move'; this.atkCd = rand(0.2, 0.5); }
    } else if (this.type === 'runner') R.arms.forEach((a, i) => { a.sh.rotation.x = (i ? sn : -sn) * 0.9 - 0.35; a.sh.rotation.z = -a.side * 0.1; a.el.rotation.x = -1.3; });
    else if (this.type === 'brute') R.arms.forEach((a, i) => { a.sh.rotation.x = (i ? sn : -sn) * 0.35 - 0.25; a.sh.rotation.z = -a.side * 0.28; a.el.rotation.x = -0.35; });
    else if (this.type === 'exploder') R.arms.forEach((a, i) => { a.sh.rotation.x = -0.4 + (i ? sn : -sn) * 0.2; a.sh.rotation.z = -a.side * 0.75; a.el.rotation.x = -0.5; });
    else R.arms.forEach((a, i) => { a.sh.rotation.x = -1.35 + Math.sin(ph * 0.5 + i * 1.7) * 0.15 + (i ? 0.25 : 0); a.sh.rotation.z = -a.side * 0.05; a.el.rotation.x = -0.25 - Math.sin(this.t * 2 + i) * 0.1; });
  }
  updateDead(dt, ctx) {
    const R = this.R, g = this.g, s = this.s; this.deadT += dt;
    if (this.boomT != null) { this.boomT -= dt; if (this.boomT <= 0) { const p = this.center(new THREE.Vector3()); ctx.explode(p, 4.5, this.dmg, this); this.boomT = null; ctx.gib(GEO.sph, M.skin.exploder, p, v2.set(1, 0, 0), 0.3, 0.3); this.gone = true; return; } }
    if (this.fountain > 0) { this.fountain -= dt; R.neck.getWorldPosition(v2); ctx.blood.emit(v2, { count: 2, color: 0x7a0000, color2: 0x300000, speed: 2.5, dir: v3.set(0, 1, 0).applyQuaternion(R.neck.getWorldQuaternion(new THREE.Quaternion())), spread: 0.35, gravity: 9, life: 0.9, size: 0.06 }); }
    if (this.fling) { g.position.addScaledVector(this.fling, dt); this.fling.y -= 18 * dt; g.rotation.y += this.spin * dt; if (g.position.y <= 0) { g.position.y = 0; this.fling = null; ctx.sfx.thud(0.4, 80); ctx.bloodPool(g.position, 1.2); } v2.copy(g.position); ctx.world.collide(v2, 0.3); g.position.x = v2.x; g.position.z = v2.z; }
    const k = clamp(this.deadT / 0.6, 0, 1), e = k * k; const target = this.fallDir * Math.PI / 2;
    R.body.rotation.x = target * e + (k >= 1 ? Math.sin(Math.min(1, (this.deadT - 0.6) * 6) * Math.PI) * 0.05 * -this.fallDir : 0);
    R.body.position.y = 0.13 * s * e;
    R.legs.forEach((l, i) => { l.hp.rotation.x += ((i ? 0.25 : -0.1) - l.hp.rotation.x) * Math.min(1, dt * 6); l.kn.rotation.x += ((i ? 0.5 : 0.1) - l.kn.rotation.x) * Math.min(1, dt * 6); });
    R.arms.forEach((a, i) => { a.sh.rotation.x += ((this.fallDir < 0 ? -2.6 : -0.3) + i * 0.4 - a.sh.rotation.x) * Math.min(1, dt * 5); a.sh.rotation.z += (-a.side * 0.9 - a.sh.rotation.z) * Math.min(1, dt * 5); a.el.rotation.x *= 0.92; });
    R.torso.rotation.x *= 0.9; R.torso.rotation.z *= 0.9; R.head.rotation.z += (0.6 - R.head.rotation.z) * Math.min(1, dt * 3); R.jaw.rotation.x = 0.55;
    if (k >= 1 && !this.pooled) { this.pooled = true; if (!this.fling) { ctx.sfx.thud(0.25 * s, 70); ctx.bloodPool(g.position, 0.8 + s * 0.4); ctx.dust(g.position); } }
    const sinkAt = this.sinkAt ?? 7; if (this.deadT > sinkAt) { g.position.y -= dt * 0.35; if (this.deadT > sinkAt + 3) this.gone = true; }
  }
  remove() { this.scene.remove(this.g); }
}

/* ---------------- Boss: giant mutated zombie commander ---------------- */
export class Commander {
  constructor(scene, pos, P) {
    this.scene = scene; this.P = P; const m = mats(); this.type = 'boss';
    this.final = P.final; this.maxHp = this.hp = P.bossHp; this.s = this.final ? 3.0 : 2.5; const s = this.s;
    const R = this.R = humanoid({ skin: 'boss', shirt: m.military, pants: m.military, eye: m.eyeRed, wide: 1.35, arm: 1.3, ribs: true });
    // armour vest + webbing
    mesh(GEO.box, m.vest, R.torso, [0, 0.32, 0.01], [0.56, 0.44, 0.36]);
    for (let i = -1; i <= 1; i++) mesh(GEO.box, m.vest, R.torso, [i * 0.15, 0.16, 0.18], [0.11, 0.12, 0.08]);
    mesh(GEO.box, m.metal, R.torso, [0, 0.44, 0.195], [0.2, 0.08, 0.02]);
    // helmet + gas mask
    mesh(GEO.half, m.military, R.head, [0, 0.17, 0], [0.31, 0.26, 0.33]); mesh(GEO.box, m.military, R.head, [0, 0.17, 0], [0.33, 0.03, 0.35]);
    const mask = mesh(GEO.cyl, m.metal, R.head, [0, 0.06, 0.13], [0.09, 0.08, 0.09], [Math.PI / 2, 0, 0]);
    for (const sx of [-1, 1]) mesh(GEO.cyl, m.metal, R.head, [sx * 0.09, 0.04, 0.1], [0.07, 0.06, 0.07], [1.2, 0, sx * 0.6]);
    // epaulettes + bone spikes on back
    for (const sx of [-1, 1]) mesh(GEO.box, m.vest, R.torso, [sx * 0.3, 0.56, 0], [0.16, 0.05, 0.18]);
    for (let i = 0; i < 5; i++) mesh(GEO.cone, m.bone, R.torso, [rand(-0.15, 0.15), 0.25 + i * 0.07, -0.2], [0.05, 0.22, 0.05], [-1.0, 0, rand(-0.3, 0.3)]);
    // mutated right arm: huge, spiked, glowing pustules, claw
    const A = R.arms[1]; A.up.scale.set(0.24, 0.36, 0.24); A.up.material = m.skin.boss; A.fo.scale.set(0.22, 0.36, 0.22); A.el.position.y = -0.34; A.fo.position.y = -0.17; A.hand.visible = false;
    for (let i = 0; i < 5; i++) mesh(GEO.cone, m.bone, A.sh, [rand(-0.08, 0.08), -0.05 - i * 0.05, -0.1], [0.04, 0.16, 0.04], [-1.4, 0, rand(-0.4, 0.4)]);
    for (let i = 0; i < 6; i++) { const a = rand(0, 6.28); mesh(GEO.sph, m.pusB, A.el, [Math.cos(a) * 0.1, -0.06 - Math.random() * 0.22, Math.sin(a) * 0.1], [0.06, 0.06, 0.06].map(v => v * rand(0.7, 1.5))); }
    for (let i = -1; i <= 1; i++) mesh(GEO.cone, m.bone, A.el, [i * 0.05, -0.42, 0.04], [0.035, 0.22, 0.035], [Math.PI + 0.3, 0, i * 0.3]);
    this.g = R.root; this.g.position.copy(pos); R.body.scale.setScalar(s); scene.add(this.g);
    if (this.final) M.pusB.emissive.setHex(0xff2010);
    this.state = 'intro'; this.t = 0; this.ph = 0; this.yaw = 0; this.cool = { slam: 5, charge: 8, throw: 4, summon: 14 }; this.act = null; this.actT = 0; this.flinch = 0; this.rage = 0; this.headless = false;
    this.g.position.y = -2 * s; this.zombies = null; this.gone = false; this.deadT = 0;
  }
  get x() { return this.g.position.x; } get z() { return this.g.position.z; }
  alive() { return this.state !== 'dead'; }
  center(o = v1) { return this.R.chest.getWorldPosition(o); }
  rayHit(o, d, maxT, assist = 1) {
    if (this.state === 'dead' || this.state === 'intro') return null; let best = null; const s = this.s;
    const test = (obj, r, part) => { obj.getWorldPosition(v2); v3.subVectors(v2, o); const b = v3.dot(d); if (b < 0) return; const c = v3.lengthSq() - b * b; const rr = r * r * assist; if (c > rr) return; const t = b - Math.sqrt(rr - c); if (t < maxT && (!best || t < best.t)) best = { t, part }; };
    test(this.R.headM, 0.17 * s, 'head'); test(this.R.chest, 0.33 * s, 'body'); test(this.R.hips, 0.25 * s, 'body'); test(this.R.arms[1].el, 0.16 * s, 'body'); test(this.R.legs[0].kn, 0.17 * s, 'leg'); test(this.R.legs[1].kn, 0.17 * s, 'leg');
    return best;
  }
  damage(amt, part, dir, ctx, o = {}) {
    if (this.state === 'dead' || this.state === 'intro') return null; const d = amt * (part === 'head' ? 1.8 : part === 'leg' ? 0.8 : 1) * (this.act === 'stun' ? 1.6 : 1); this.hp -= d; this.flinch = Math.min(0.5, this.flinch + 0.05);
    if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.deadT = 0; ctx.bossDie(this); return { killed: true, head: part === 'head', dmg: d, boss: true }; }
    return { killed: false, head: part === 'head', dmg: d, boss: true };
  }
  update(dt, ctx) {
    this.t += dt; const R = this.R, g = this.g, s = this.s, pl = ctx.player;
    const dx = pl.x - g.position.x, dz = pl.z - g.position.z, dist = Math.hypot(dx, dz);
    if (this.state === 'dead') {
      this.deadT += dt; const k = clamp(this.deadT / 2.2, 0, 1);
      // drop to knees, then fall forward
      R.legs.forEach(l => { l.hp.rotation.x = -1.3 * Math.min(1, k * 2); l.kn.rotation.x = 1.9 * Math.min(1, k * 2); }); R.hips.position.y = 0.92 - 0.55 * Math.min(1, k * 2);
      R.body.rotation.x = k > 0.5 ? Math.pow((k - 0.5) * 2, 2) * 1.35 : 0; R.arms.forEach(a => { a.sh.rotation.x = -0.3; a.sh.rotation.z = -a.side * 0.3; });
      if (Math.random() < 0.5 && this.deadT < 2.5) { this.center(v2); ctx.blood.emit(v2, { count: 4, color: 0x7a0000, color2: 0x200000, speed: 4, gravity: 9, life: 1, size: 0.12, jitter: 1 }); }
      if (this.deadT > 2.2 && !this.boomed) { this.boomed = true; ctx.bossFinalBlast(this.center(new THREE.Vector3())); }
      if (this.deadT > 8) { g.position.y -= dt * 0.5; if (this.deadT > 12) this.gone = true; }
      return;
    }
    this.rage = this.hp / this.maxHp < (this.final ? 0.6 : 0.4) ? 1 : 0; const phase2 = this.final && this.hp / this.maxHp < 0.3;
    M.pusB.emissiveIntensity = 1.6 + Math.sin(this.t * (this.rage ? 9 : 3)) * 0.8 + this.rage;
    if (this.state === 'intro') {
      this.actT += dt; const k = clamp(this.actT / 2.6, 0, 1); g.position.y = -2 * s * (1 - (1 - Math.pow(1 - k, 3)));
      g.rotation.y = this.yaw = Math.atan2(dx, dz); R.arms.forEach(a => { a.sh.rotation.x = -2.7; a.sh.rotation.z = -a.side * 0.5; }); R.jaw.rotation.x = 0.6;
      if (Math.random() < 0.7) ctx.dirt(g.position, 2.5); if (Math.random() < 0.08) ctx.shake(0.15);
      if (k >= 1) { this.state = 'fight'; this.actT = 0; ctx.bossRoar(this); }
      return;
    }
    for (const k in this.cool) this.cool[k] -= dt * (this.rage ? 1.4 : 1);
    const T = this.P; let sp = (this.rage ? 2.3 : 1.6) * (this.final ? 1.1 : 1);
    const face = (rate) => { const want = Math.atan2(dx, dz); let dy = want - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.yaw += dy * Math.min(1, dt * rate); g.rotation.y = this.yaw; return dy; };
    let walk = true; const A = R.arms[1], Bm = R.arms[0];
    if (!this.act) {
      if (dist < 4.2 && (this.cool.swipe ?? 0) <= 0) { this.act = 'swipe'; this.actT = 0; this.hitDone = false; }
      else if (dist < 10 && this.cool.slam <= 0) { this.act = 'slam'; this.actT = 0; this.hitDone = false; ctx.sfx.groan(0.9, 0.45); }
      else if (dist > 9 && this.cool.charge <= 0 && ctx.world.los(g.position.x, g.position.z, pl.x, pl.z, 1)) { this.act = 'charge'; this.actT = 0; this.hitDone = false; this.cdir = new THREE.Vector3(dx, 0, dz).normalize(); ctx.bossRoar(this, 0.6); }
      else if (dist > 7 && this.cool.throw <= 0) { this.act = 'throw'; this.actT = 0; this.hitDone = false; }
      else if (this.cool.summon <= 0) { this.act = 'summon'; this.actT = 0; this.hitDone = false; ctx.bossRoar(this, 0.8); }
    }
    let armPose = null;
    if (this.act) {
      this.actT += dt; const t = this.actT; walk = false;
      if (this.act === 'swipe') { face(6); const k = t / 0.9; armPose = k < 0.45 ? [-1.0 - k * 3, 0.9] : [-2.4 + (k - 0.45) * 5, -0.5]; if (!this.hitDone && k > 0.55) { this.hitDone = true; if (dist < 4.6) ctx.hurtPlayer(22 * T.dmgMul, g.position, 0.7); ctx.sfx.thud(0.6, 60); } if (k >= 1) { this.act = null; this.cool.swipe = 1.2; } }
      else if (this.act === 'slam') { face(3); const k = t / 1.3; armPose = k < 0.6 ? [-3.0 * (k / 0.6), 0] : [-3.0 + (k - 0.6) * 7, 0]; R.torso.rotation.x = k < 0.6 ? -0.2 : 0.6; if (!this.hitDone && k > 0.7) { this.hitDone = true; A.hand.getWorldPosition(v2); v2.copy(g.position).add(v3.set(Math.sin(this.yaw) * 2.6, 0, Math.cos(this.yaw) * 2.6)); ctx.bossSlam(v2, 7, 28 * T.dmgMul); } if (k >= 1) { this.act = null; this.cool.slam = rand(6, 9); } }
      else if (this.act === 'charge') {
        if (t < 0.8) { face(8); this.cdir.set(dx, 0, dz).normalize(); armPose = [-0.5, 0]; R.torso.rotation.x = 0.6; R.jaw.rotation.x = 0.8; }
        else { walk = true; sp = 10; this.chargeMove = true; armPose = [-1.2, 0]; R.torso.rotation.x = 0.75; if (Math.random() < 0.5) ctx.dust(g.position); if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) { ctx.shake(0.12); ctx.sfx.thud(0.5, 50); }
          if (!this.hitDone && dist < 2.6) { this.hitDone = true; ctx.hurtPlayer(32 * T.dmgMul, g.position, 1, 9); }
          if (t > 2.2 || this.bump) { this.act = this.bump ? 'stun' : null; this.actT = 0; this.cool.charge = rand(8, 12); this.chargeMove = false; if (this.bump) { ctx.shake(0.6); ctx.sfx.thud(1, 40); ctx.dust(g.position, 3); } this.bump = false; } }
      }
      else if (this.act === 'stun') { armPose = [-0.2, 0]; R.torso.rotation.x = 0.9; R.head.rotation.z = Math.sin(t * 5) * 0.4; if (t > 2) this.act = null; }
      else if (this.act === 'throw') { face(6); const k = t / 1.1; armPose = k < 0.55 ? [-3.2 * k / 0.55, 0.2] : [-3.2 + (k - 0.55) * 7, -0.2]; if (!this.hitDone && k > 0.62) { this.hitDone = true; A.el.getWorldPosition(v2); v2.y += 0.5; ctx.bossThrow(v2.clone(), phase2 ? 3 : this.rage ? 2 : 1); } if (k >= 1) { this.act = null; this.cool.throw = rand(4, 7); } }
      else if (this.act === 'summon') { const k = t / 1.6; armPose = [-2.8, 0.6]; Bm.sh.rotation.x = -2.8; R.jaw.rotation.x = 0.9; R.torso.rotation.x = -0.3; if (!this.hitDone && k > 0.5) { this.hitDone = true; ctx.bossSummon(this, phase2 ? 6 : this.rage ? 4 : 3); } if (k >= 1) { this.act = null; this.cool.summon = rand(16, 22); } }
    }
    if (walk) {
      const dir = v1; if (this.chargeMove) dir.copy(this.cdir); else if (ctx.world.los(g.position.x, g.position.z, pl.x, pl.z)) dir.set(dx / dist, 0, dz / dist); else { ctx.world.flowDir(g.position.x, g.position.z, dir); if (dir.lengthSq() < 0.1) dir.set(dx / dist, 0, dz / dist); }
      if (dist < 3.2 && !this.chargeMove) sp = 0;
      const ox = g.position.x, oz = g.position.z; g.position.x += dir.x * sp * dt; g.position.z += dir.z * sp * dt;
      v2.copy(g.position); ctx.world.collide(v2, 0.55 * s); if (this.chargeMove && Math.hypot(v2.x - g.position.x, v2.z - g.position.z) > sp * dt * 0.5) this.bump = true; g.position.x = v2.x; g.position.z = v2.z;
      if (!this.chargeMove) face(3); const moved = Math.hypot(g.position.x - ox, g.position.z - oz); this.ph += moved / s * 3.2;
      if (moved > 0 && Math.floor(this.ph / Math.PI) !== Math.floor((this.ph - moved / s * 3.2) / Math.PI)) { ctx.sfx.thud(clamp(0.5 - dist / 60, 0.1, 0.5), 45); if (dist < 14) ctx.shake(0.06); }
    }
    const sn = Math.sin(this.ph);
    R.legs.forEach((l, i) => { l.hp.rotation.x = (i ? -sn : sn) * 0.45; l.kn.rotation.x = Math.max(0, i ? sn : -sn) * 0.6 + 0.1; });
    if (!this.act || this.act === 'charge') R.torso.rotation.x = this.act ? R.torso.rotation.x : 0.28; R.torso.rotation.z = sn * 0.06;
    R.head.rotation.x = -0.2 + Math.sin(this.t * 1.1) * 0.05; if (this.act !== 'stun') R.head.rotation.z = Math.sin(this.t * 0.7) * 0.1;
    if (!this.act || this.act === 'charge') R.jaw.rotation.x = 0.25 + Math.max(0, Math.sin(this.t * 2)) * 0.25;
    if (armPose) { A.sh.rotation.x = armPose[0]; A.sh.rotation.z = -0.2; A.el.rotation.x = armPose[1] - 0.3; if (this.act !== 'summon') { Bm.sh.rotation.x = -0.5 + sn * 0.2; Bm.sh.rotation.z = 0.3; } }
    else { A.sh.rotation.x = -sn * 0.3 - 0.15; A.sh.rotation.z = -0.35; A.el.rotation.x = -0.4; Bm.sh.rotation.x = sn * 0.3 - 0.2; Bm.sh.rotation.z = 0.2; Bm.el.rotation.x = -0.3; }
  }
  remove() { this.scene.remove(this.g); }
}

/* ---------------- Survivor (rescue missions) ---------------- */
export class Survivor {
  constructor(scene, pos) {
    const m = mats(); this.scene = scene;
    const R = this.R = humanoid({ skin: 'human', shirt: new THREE.MeshStandardMaterial({ color: [0x2a6aff, 0xffa020, 0xe03a8a, 0x30c0a0][randi(0, 3)], roughness: 0.8 }), pants: m.pants[randi(0, 3)], eye: m.eyeH, hair: true });
    this.g = R.root; this.g.position.copy(pos); this.g.rotation.y = rand(0, 6.28); scene.add(this.g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.9, 0.3), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 15; this.g.add(beam); this.beam = beam;
    this.state = 'wait'; this.t = rand(0, 5); this.prog = 0; this.gone = false; this.alpha = 1;
  }
  get x() { return this.g.position.x; } get z() { return this.g.position.z; }
  update(dt, ctx) {
    this.t += dt; const R = this.R;
    if (this.state === 'wait') {
      R.hips.position.y = 0.5; R.legs.forEach(l => { l.hp.rotation.x = -1.4; l.kn.rotation.x = 2.3; }); R.torso.rotation.x = 0.25 + Math.sin(this.t * 6) * 0.03;
      R.arms.forEach(a => { a.sh.rotation.x = -2.6; a.sh.rotation.z = -a.side * 0.9; a.el.rotation.x = -1.9; }); R.head.rotation.x = 0.3 + Math.sin(this.t * 2) * 0.1;
      this.beam.material.opacity = 0.12 + Math.sin(this.t * 3) * 0.05;
      if (Math.random() < dt * 0.25) ctx.sfx.scream(0.12, 1.5);
    } else {
      // run to evac
      const tg = this.target; const dx = tg.x - this.g.position.x, dz = tg.z - this.g.position.z, d = Math.hypot(dx, dz);
      const dir = v1; if (ctx.world.los(this.g.position.x, this.g.position.z, tg.x, tg.z)) dir.set(dx / d, 0, dz / d); else dir.set(dx / d, 0, dz / d);
      this.g.position.x += dir.x * 4.5 * dt; this.g.position.z += dir.z * 4.5 * dt; v2.copy(this.g.position); ctx.world.collide(v2, 0.3); this.g.position.x = v2.x; this.g.position.z = v2.z;
      this.g.rotation.y = Math.atan2(dir.x, dir.z); this.ph = (this.ph || 0) + dt * 11; const sn = Math.sin(this.ph);
      R.hips.position.y = 0.9; R.legs.forEach((l, i) => { l.hp.rotation.x = (i ? -sn : sn) * 0.9; l.kn.rotation.x = Math.max(0, i ? sn : -sn) * 1.2; }); R.arms.forEach((a, i) => { a.sh.rotation.x = (i ? sn : -sn) * 0.9; a.sh.rotation.z = -a.side * 0.1; a.el.rotation.x = -1.2; }); R.torso.rotation.x = 0.3;
      this.beam.visible = false; this.runT = (this.runT || 0) + dt;
      if (d < 1.5 || this.runT > 6) { this.alpha -= dt * 2; this.g.scale.setScalar(Math.max(0.01, this.alpha)); if (this.alpha <= 0) this.gone = true; }
    }
  }
  free(target) { this.state = 'run'; this.target = target; }
  remove() { this.scene.remove(this.g); }
}

/* ---------------- Pickups ---------------- */
let PG = null;
function pickupGeo() {
  if (PG) return PG; PG = {};
  const crate = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#4e5a2e'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a4422'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 32, w, 3); x.strokeStyle = '#2a3216'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8); x.fillStyle = '#f0e6b0'; x.font = 'bold 30px Impact,sans-serif'; x.textAlign = 'center'; x.fillText('AMMO', 64, 76); grime(x, w, h, 30, 0.25); });
  const med = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#e8e8e2'; x.fillRect(0, 0, w, h); x.fillStyle = '#d01818'; x.fillRect(48, 20, 32, 88); x.fillRect(20, 48, 88, 32); grime(x, w, h, 20, 0.2); });
  const nade = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#2a3a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd23a'; x.font = 'bold 24px Impact,sans-serif'; x.textAlign = 'center'; x.fillText('GRENADES', 64, 72); x.fillRect(10, 90, 108, 6); grime(x, w, h, 20, 0.2); });
  PG.ammo = new THREE.MeshStandardMaterial({ map: crate, roughness: 0.8 }); PG.med = new THREE.MeshStandardMaterial({ map: med, roughness: 0.5 }); PG.nade = new THREE.MeshStandardMaterial({ map: nade, roughness: 0.7 });
  PG.coin = new THREE.MeshStandardMaterial({ color: 0xffc830, metalness: 0.9, roughness: 0.25, emissive: 0x7a4a00, emissiveIntensity: 0.6 });
  PG.coinG = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 18);
  PG.ring = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 0.4), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  PG.ringMed = PG.ring.clone(); PG.ringMed.color.setRGB(1.8, 0.3, 0.3); PG.ringAmmo = PG.ring.clone(); PG.ringAmmo.color.setRGB(0.5, 1.6, 0.4);
  PG.ringG = new THREE.RingGeometry(0.45, 0.6, 28);
  return PG;
}
export class Pickup {
  constructor(scene, kind, pos) {
    const P = pickupGeo(); this.scene = scene; this.kind = kind; this.g = new THREE.Group(); this.g.position.copy(pos); this.g.position.y = 0; this.t = rand(0, 6); this.taken = false; this.vel = null;
    if (kind === 'coin') { const c = new THREE.Mesh(P.coinG, P.coin); c.rotation.x = Math.PI / 2; c.position.y = 0.45; this.m = c; this.g.add(c); }
    else {
      const mat = kind === 'med' ? P.med : kind === 'nade' ? P.nade : P.ammo; const sz = kind === 'drop' ? [0.4, 0.28, 0.3] : kind === 'med' ? [0.5, 0.32, 0.4] : [0.8, 0.45, 0.5];
      const b = new THREE.Mesh(GEO.box, mat); b.scale.set(...sz); b.position.y = sz[1] / 2 + 0.15; b.castShadow = ENT.shadows; this.m = b; this.g.add(b);
      const ring = new THREE.Mesh(P.ringG, kind === 'med' ? P.ringMed : kind === 'ammo' || kind === 'drop' ? P.ringAmmo : P.ring); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.scale.setScalar(kind === 'drop' ? 0.8 : 1.3); this.g.add(ring); this.ring = ring;
    }
    scene.add(this.g);
  }
  update(dt) {
    this.t += dt; if (this.m) { this.m.rotation.y = this.t * 1.6; if (this.kind === 'coin') { this.m.rotation.z = this.t * 3; this.m.position.y = 0.45 + Math.sin(this.t * 3) * 0.08; } else this.m.position.y = this.m.scale.y / 2 + 0.15 + Math.sin(this.t * 2.4) * 0.06; }
    if (this.ring) this.ring.scale.setScalar((this.kind === 'drop' ? 0.8 : 1.3) * (1 + Math.sin(this.t * 4) * 0.08));
    if (this.vel) { this.g.position.addScaledVector(this.vel, dt); this.vel.y -= 14 * dt; if (this.g.position.y < 0) { this.g.position.y = 0; this.vel = null; } }
  }
  remove() { this.scene.remove(this.g); }
}

/* ---------------- Gibs (flying heads / limbs) ---------------- */
export class Gib {
  constructor(scene, geo, mat, pos, dir, sx, sy, isHead) {
    this.scene = scene; this.m = new THREE.Mesh(geo, mat); this.m.scale.set(sx, sy, sx); this.m.position.copy(pos); this.m.castShadow = ENT.shadows; scene.add(this.m);
    this.vel = new THREE.Vector3(dir.x * rand(2, 4) + rand(-1, 1), rand(3, 5.5), dir.z * rand(2, 4) + rand(-1, 1)); this.spin = new THREE.Vector3(rand(-12, 12), rand(-12, 12), rand(-12, 12)); this.life = 5; this.bounces = 0; this.head = isHead;
    if (isHead) { const st = new THREE.Mesh(GEO.sph, mats().gore); st.scale.set(0.55, 0.25, 0.55); st.position.y = -0.45; this.m.add(st); }
  }
  update(dt, ctx) {
    this.life -= dt; const m = this.m; m.position.addScaledVector(this.vel, dt); this.vel.y -= 16 * dt; m.rotation.x += this.spin.x * dt; m.rotation.y += this.spin.y * dt; m.rotation.z += this.spin.z * dt;
    if (Math.random() < 0.6 && this.bounces < 2) ctx.blood.emit(m.position, { count: 1, color: 0x6a0000, speed: 0.4, gravity: 8, life: 0.6, size: 0.05 });
    const r = m.scale.y * 0.5; if (m.position.y < r) { m.position.y = r; if (this.vel.y < -1.5) { this.bounces++; if (this.bounces === 1) ctx.bloodPool(m.position, 0.5); ctx.sfx.thud(0.15, 120); } this.vel.y *= -0.35; this.vel.x *= 0.6; this.vel.z *= 0.6; this.spin.multiplyScalar(0.5); }
    if (this.life < 1) m.position.y -= dt * 0.3;
    return this.life > 0;
  }
  remove() { this.scene.remove(this.m); }
}
