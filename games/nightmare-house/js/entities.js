import * as THREE from 'three';
import { materials } from './level.js';
import { zombieSkin, zombieCloth, zombieHead } from './textures.js';
let ZT = null; const ztex = () => ZT || (ZT = { skin: zombieSkin(), cloth: zombieCloth(), head: zombieHead() });

// ---------- particles (single Points system, additive) ----------
export class Particles {
  constructor(scene, max = 1500) {
    this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.baseCol = new Float32Array(max * 3); this.baseSize = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: materials().spark }, scale: { value: 400 } },
      vertexShader: `attribute float size; varying vec3 vC; uniform float scale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC*t.a,t.a); }`,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; scene.add(this.points); this.g = g;
  }
  emit(x, y, z, { n = 10, speed = 2, up = 0, color = [1, 0.6, 0.2], size = 0.15, life = 0.8, grav = -4, spread = 1 } = {}) {
    for (let k = 0; k < n; k++) {
      let i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI * spread, s = speed * (0.3 + Math.random() * 0.7);
      this.vel[i * 3] = Math.cos(a) * Math.cos(b) * s; this.vel[i * 3 + 1] = Math.sin(b) * s + up; this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * s;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6); this.grav[i] = grav;
      this.baseCol[i * 3] = color[0]; this.baseCol[i * 3 + 1] = color[1]; this.baseCol[i * 3 + 2] = color[2]; this.baseSize[i] = size * (0.6 + Math.random() * 0.8);
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt; const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vel[i * 3 + 1] += this.grav[i] * dt; const drag = Math.exp(-dt * 1.5);
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; }
      for (let c = 0; c < 3; c++) this.col[i * 3 + c] = this.baseCol[i * 3 + c] * t; this.size[i] = this.baseSize[i] * (0.4 + 0.6 * t);
    }
    // compact dead tail
    while (this.n > 0 && this.life[this.n - 1] <= 0) this.n--;
    this.g.attributes.position.needsUpdate = true; this.g.attributes.color.needsUpdate = true; this.g.attributes.size.needsUpdate = true; this.g.setDrawRange(0, this.n);
  }
  clear() { this.n = 0; this.g.setDrawRange(0, 0); }
}

// ---------- shared enemy geometry ----------
const box = (w, h, d, y = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y, 0); return g; };
let ZG = null;
function zgeo() {
  if (ZG) return ZG;
  ZG = {
    torso: box(0.46, 0.62, 0.26, 0.31), pelvis: box(0.42, 0.2, 0.24, -0.08), head: new THREE.SphereGeometry(0.17, 12, 10), jaw: box(0.16, 0.06, 0.12, -0.03),
    upper: box(0.13, 0.36, 0.13, -0.18), lower: box(0.11, 0.34, 0.11, -0.17), hand: box(0.1, 0.12, 0.06, -0.06),
    thigh: box(0.16, 0.42, 0.16, -0.21), shin: box(0.13, 0.42, 0.13, -0.21), foot: box(0.14, 0.08, 0.26, -0.04),
    eye: new THREE.SphereGeometry(0.03, 6, 6), rib: box(0.4, 0.03, 0.02)
  };
  ZG.head.scale(1, 1.12, 1.05); ZG.foot.translate(0, 0, 0.06);
  return ZG;
}
function limb(parent, geoA, geoB, mat, x, y, z, lenA) {
  const a = new THREE.Group(); a.position.set(x, y, z); parent.add(a); const ma = new THREE.Mesh(geoA, mat); ma.castShadow = true; a.add(ma);
  const b = new THREE.Group(); b.position.y = -lenA; a.add(b); const mb = new THREE.Mesh(geoB, mat); mb.castShadow = true; b.add(mb); return [a, b];
}

export class Zombie {
  constructor(scene, x, z, P, rng, variant = 0) {
    const G = zgeo();
    const skinHue = [0.2, 0.26, 0.08, 0.55][variant % 4]; const T = ztex();
    this.skin = new THREE.MeshStandardMaterial({ map: T.skin, color: new THREE.Color().setHSL(skinHue, 0.22, 0.5 + rng() * 0.12), roughness: 0.75, emissive: 0x000000 });
    this.headMat = new THREE.MeshStandardMaterial({ map: T.head, color: this.skin.color, roughness: 0.75, emissive: 0x000000 });
    const clothCols = [[0.08, 0.25], [0.6, 0.2], [0.02, 0.3], [0.33, 0.12], [0.1, 0.05]]; const cc = clothCols[Math.floor(rng() * clothCols.length)];
    this.cloth = new THREE.MeshStandardMaterial({ map: T.cloth, color: new THREE.Color().setHSL(cc[0], cc[1], 0.22 + rng() * 0.12), roughness: 1, emissive: 0x000000 });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.25, 0.05), toneMapped: false });
    const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root); this.root = root;
    const body = new THREE.Group(); body.position.y = 0.95; root.add(body); this.body = body;
    const pel = new THREE.Mesh(G.pelvis, this.cloth); body.add(pel);
    const spine = new THREE.Group(); body.add(spine); this.spine = spine;
    const torso = new THREE.Mesh(G.torso, this.cloth); torso.castShadow = true; spine.add(torso);
    for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(G.rib, this.skin); r.position.set(0, 0.2 + k * 0.08, 0.135); spine.add(r); }
    const neck = new THREE.Group(); neck.position.y = 0.66; spine.add(neck); this.neck = neck;
    const head = new THREE.Mesh(G.head, this.headMat); head.position.y = 0.14; head.castShadow = true; neck.add(head);
    const jaw = new THREE.Mesh(G.jaw, this.skin); jaw.position.set(0, 0.02, 0.1); neck.add(jaw); this.jaw = jaw;
    for (const s of [-1, 1]) { const e = new THREE.Mesh(G.eye, this.eyeMat); e.position.set(s * 0.065, 0.17, 0.15); neck.add(e); }
    [this.armL, this.foreL] = limb(spine, G.upper, G.lower, this.skin, -0.3, 0.58, 0, 0.36);
    [this.armR, this.foreR] = limb(spine, G.upper, G.lower, this.skin, 0.3, 0.58, 0, 0.36);
    for (const f of [this.foreL, this.foreR]) { const h = new THREE.Mesh(G.hand, this.skin); h.position.y = -0.34; f.add(h); }
    [this.legL, this.shinL] = limb(body, G.thigh, G.shin, this.cloth, -0.12, -0.1, 0, 0.42);
    [this.legR, this.shinR] = limb(body, G.thigh, G.shin, this.cloth, 0.12, -0.1, 0, 0.42);
    for (const s of [this.shinL, this.shinR]) { const f = new THREE.Mesh(G.foot, this.cloth); f.position.y = -0.42; s.add(f); }
    const sc = 0.92 + rng() * 0.2; root.scale.setScalar(sc); this.scale = sc;
    this.hp = this.maxHp = P.zHp * (variant === 3 ? 2.2 : 1); this.speed = P.zSpeed * (0.85 + rng() * 0.3) * (variant === 3 ? 0.75 : 1); this.dmg = P.zDmg * (variant === 3 ? 1.6 : 1);
    if (variant === 3) { root.scale.setScalar(sc * 1.3); this.scale = sc * 1.3; }
    this.phase = rng() * 10; this.state = 'idle'; this.atkT = 0; this.deadT = 0; this.flash = 0; this.aggro = false; this.groanT = 2 + rng() * 6; this.yaw = rng() * 6.28; this.radius = 0.35 * this.scale;
    this.armL.rotation.x = this.armR.rotation.x = -1.2;
    head.userData.head = jaw.userData.head = true; neck.children.forEach(o => { if (o.isMesh) o.userData.head = true; });
    this.hitMeshes = []; root.traverse(o => { if (o.isMesh) this.hitMeshes.push(o); });
  }
  get x() { return this.root.position.x; } get z() { return this.root.position.z; }
  hit(dmg, head) {
    if (this.state === 'dead') return false; this.hp -= dmg * (head ? 2.2 : 1); this.flash = 0.12; this.aggro = true; this.stagger = 0.25;
    if (this.hp <= 0) { this.state = 'dead'; this.deadT = 0; this.fallDir = Math.random() < 0.5 ? -1 : 1; return true; } return false;
  }
  update(dt, t, game) {
    const s = this.skin, c = this.cloth; const f = this.flash > 0 ? 1 : 0; this.flash -= dt;
    s.emissive.setRGB(f * 0.8, f * 0.1, 0); this.headMat.emissive.setRGB(f * 0.8, f * 0.1, 0); c.emissive.setRGB(f * 0.5, 0, 0);
    if (this.state === 'dead') { // death animation: crumple + sink
      this.deadT += dt; const k = Math.min(1, this.deadT / 0.9);
      this.body.rotation.x = -k * 1.45 * this.fallDir; this.body.position.y = 0.95 - k * 0.7; this.armL.rotation.x = this.armR.rotation.x = -1.2 + k * 1.0; this.legL.rotation.x = k * 0.5; this.legR.rotation.x = -k * 0.2;
      if (this.deadT > 2.5) this.root.position.y = -(this.deadT - 2.5) * 0.5;
      return this.deadT > 4.5; // remove
    }
    const p = game.player; const dx = p.x - this.x, dz = p.z - this.z; const dist = Math.hypot(dx, dz);
    if (!this.aggro) { const fd = game.flowDist(this.x, this.z); if (fd < (game.flashOn ? 11 : 8) || dist < 3) { this.aggro = true; game.sfx.groan(); } }
    this.groanT -= dt; if (this.groanT < 0 && dist < 14) { this.groanT = 4 + Math.random() * 7; if (this.aggro) game.sfx.groan(); }
    let moving = false; this.stagger = Math.max(0, (this.stagger || 0) - dt);
    if (this.aggro && this.state !== 'attack') {
      let tx, tz; if (dist < 1.6 || game.los(this.x, this.z, p.x, p.z)) { tx = dx; tz = dz; } else { const d = game.flowDir(this.x, this.z); tx = d[0]; tz = d[1]; }
      const want = Math.atan2(tx, tz); let dy = want - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.yaw += dy * Math.min(1, dt * 6);
      if (dist > 1.05 * this.scale) { const sp = this.speed * (this.stagger > 0 ? 0.2 : 1) * dt; const nx = this.x + Math.sin(this.yaw) * sp, nz = this.z + Math.cos(this.yaw) * sp; const r = game.collide(nx, nz, this.radius); this.root.position.x = r[0]; this.root.position.z = r[1]; moving = true; }
      if (dist < 1.25 * this.scale && this.atkT <= 0) { this.state = 'attack'; this.atkT = 0; this.didHit = false; }
    }
    // separation from other zombies
    for (const o of game.zombies) if (o !== this && o.state !== 'dead') { const ox = this.x - o.x, oz = this.z - o.z, d = Math.hypot(ox, oz); if (d < 0.7 && d > 0.001) { this.root.position.x += ox / d * (0.7 - d) * 0.5; this.root.position.z += oz / d * (0.7 - d) * 0.5; } }
    this.root.rotation.y = this.yaw;
    const ph = t * this.speed * 3.2 + this.phase;
    if (this.state === 'attack') {
      this.atkT += dt; const k = this.atkT / 0.75;
      const swing = k < 0.45 ? -1.2 - k * 2.5 : k < 0.6 ? -2.3 + (k - 0.45) * 14 : -0.2 - (k - 0.6) * 2.5;
      this.armL.rotation.x = this.armR.rotation.x = swing; this.spine.rotation.x = k < 0.5 ? -0.25 : 0.35; this.jaw.rotation.x = 0.5;
      if (k > 0.5 && !this.didHit) { this.didHit = true; if (dist < 1.5 * this.scale) game.damagePlayer(this.dmg, this); }
      if (k >= 1) { this.state = 'chase'; this.atkT = 0.5; this.spine.rotation.x = 0.15; }
    } else {
      this.atkT -= dt; const a = moving ? 1 : 0.15;
      this.legL.rotation.x = Math.sin(ph) * 0.55 * a; this.legR.rotation.x = -Math.sin(ph) * 0.55 * a;
      this.shinL.rotation.x = Math.max(0, -Math.sin(ph + 1)) * 0.8 * a; this.shinR.rotation.x = Math.max(0, Math.sin(ph + 1)) * 0.8 * a;
      this.armL.rotation.x = -1.25 + Math.sin(ph * 0.5 + 1) * 0.15; this.armR.rotation.x = -1.15 + Math.sin(ph * 0.5) * 0.15;
      this.armL.rotation.z = 0.1 + Math.sin(t * 1.3 + this.phase) * 0.06; this.armR.rotation.z = -0.1;
      this.spine.rotation.x = 0.18 + Math.sin(ph * 2) * 0.04; this.spine.rotation.z = Math.sin(ph) * 0.12 * a;
      this.body.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.05 * a; this.neck.rotation.z = Math.sin(t * 0.7 + this.phase) * 0.35; this.neck.rotation.x = 0.15;
      this.jaw.rotation.x = 0.2 + Math.sin(t * 5 + this.phase) * 0.15;
    }
    return false;
  }
  // hit-test spheres in world space
  spheres() { const sc = this.scale, x = this.x, z = this.z; return [{ x, y: (0.95 + 0.85) * sc, z, r: 0.2 * sc, head: true }, { x, y: 1.2 * sc, z, r: 0.33 * sc }, { x, y: 0.55 * sc, z, r: 0.28 * sc }]; }
  dispose(scene) { scene.remove(this.root); this.skin.dispose(); this.cloth.dispose(); }
}

// ---------- ghost ----------
let GG = null;
function ggeo() {
  if (GG) return GG;
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI * 0.9) * 0.42 * (1 - t * 0.35), 2.0 - t * 2.0)); }
  const body = new THREE.LatheGeometry(pts, 20, 0, Math.PI * 2);
  GG = { body, head: new THREE.SphereGeometry(0.24, 16, 12), eye: new THREE.SphereGeometry(0.05, 8, 6), arm: new THREE.CylinderGeometry(0.04, 0.09, 0.7, 6), mouth: new THREE.SphereGeometry(0.07, 8, 6) };
  GG.arm.translate(0, -0.35, 0); GG.mouth.scale(1, 1.8, 0.4); return GG;
}
export class Ghost {
  constructor(scene, x, z, P, rng) {
    const G = ggeo();
    this.mat = new THREE.MeshStandardMaterial({ color: 0x8fb4e8, emissive: 0x2a5a98, emissiveIntensity: 0.75, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    this.mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = this.uTime = { value: 0 }; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n float k = clamp(1.4 - position.y, 0.0, 1.4); transformed.x += sin(uTime*3.0 + position.y*5.0 + position.z*3.0)*0.09*k; transformed.z += cos(uTime*2.6 + position.y*4.0 + position.x*3.0)*0.09*k;`); };
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.4, 3.0), toneMapped: false, transparent: true });
    const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root); this.root = root;
    const b = new THREE.Mesh(G.body, this.mat); b.position.y = 0.15; root.add(b); this.bodyM = b;
    const h = new THREE.Mesh(G.head, this.mat); h.position.y = 2.05; root.add(h);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(G.eye, this.eyeMat); e.position.set(s * 0.09, 2.08, 0.2); root.add(e); }
    const m = new THREE.Mesh(G.mouth, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 })); m.position.set(0, 1.94, 0.21); root.add(m); this.mouth = m;
    this.arms = []; for (const s of [-1, 1]) { const a = new THREE.Mesh(G.arm, this.mat); a.position.set(s * 0.32, 1.75, 0.05); a.rotation.x = -1.1; root.add(a); this.arms.push(a); }
    this.speed = P.gSpeed * (0.85 + rng() * 0.3); this.dmg = P.gDmg; this.phase = rng() * 10; this.state = 'drift'; this.cool = 0; this.wander = [x, z]; this.wT = 0; this.fade = 0; this.banishT = 0; this.home = [x, z];
  }
  get x() { return this.root.position.x; } get z() { return this.root.position.z; }
  banish() { if (this.state === 'banished') return false; this.state = 'banished'; this.banishT = 0; return true; }
  update(dt, t, game) {
    if (this.uTime) this.uTime.value = t + this.phase;
    const p = game.player; const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    if (this.state === 'banished') { this.banishT += dt; const k = this.banishT / 1.2; this.root.scale.set(1 + k * 1.5, 1 - k * 0.8, 1 + k * 1.5); this.root.position.y += dt * 1.5; this.mat.opacity = Math.max(0, 0.6 * (1 - k)); this.eyeMat.opacity = 1 - k; return k >= 1; }
    this.cool -= dt;
    const sense = game.flashOn ? 9 : 5.5;
    if (this.state === 'drift') {
      this.wT -= dt; if (this.wT < 0) { this.wT = 3 + Math.random() * 4; this.wander = [this.home[0] + (Math.random() - .5) * 10, this.home[1] + (Math.random() - .5) * 10]; }
      const wx = this.wander[0] - this.x, wz = this.wander[1] - this.z, wd = Math.hypot(wx, wz) || 1; this.root.position.x += wx / wd * dt * 0.6; this.root.position.z += wz / wd * dt * 0.6;
      this.root.rotation.y = Math.atan2(wx, wz);
      if (dist < sense && this.cool <= 0) { this.state = 'hunt'; game.sfx.wail(); }
    } else if (this.state === 'hunt') {
      const sp = this.speed * (dist < 4 ? 1.35 : 1); this.root.position.x += dx / dist * sp * dt; this.root.position.z += dz / dist * sp * dt; this.root.rotation.y = Math.atan2(dx, dz);
      if (dist > sense * 2.2) this.state = 'drift';
      if (dist < 0.9) { game.ghostAttack(this); this.state = 'drift'; this.cool = 6; // vanish and reappear elsewhere
        const a = Math.random() * 6.28; this.root.position.x = Math.max(2, Math.min(game.G.W - 2, p.x + Math.cos(a) * 14)); this.root.position.z = Math.max(2, Math.min(game.G.H - 2, p.z + Math.sin(a) * 14)); this.home = [this.x, this.z]; }
    }
    this.root.position.y = 0.25 + Math.sin(t * 1.7 + this.phase) * 0.18;
    // flicker / visibility: more visible when close or in flashlight
    const vis = Math.min(1, Math.max(0.12, 1.4 - dist / 10)) * (0.75 + 0.25 * Math.sin(t * 13 + this.phase) * Math.sin(t * 7.1));
    this.mat.opacity = 0.42 * vis; this.eyeMat.opacity = Math.min(1, vis * 1.4);
    for (let i = 0; i < 2; i++) this.arms[i].rotation.x = (this.state === 'hunt' ? -1.5 : -0.6) + Math.sin(t * 2.3 + i) * 0.2;
    this.mouth.scale.y = this.state === 'hunt' ? 1.6 + Math.sin(t * 20) * 0.3 : 1;
    return false;
  }
  dispose(scene) { scene.remove(this.root); this.mat.dispose(); }
}

// ---------- boss: the Immortal Master of the House ----------
export class Boss {
  constructor(scene, x, z, P) {
    const coat = new THREE.MeshStandardMaterial({ color: 0x14080c, roughness: 0.7, emissive: 0x000000 });
    const vest = new THREE.MeshStandardMaterial({ color: 0x5a0a10, roughness: 0.6, emissive: 0x000000 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x9a968a, roughness: 0.6, emissive: 0x000000 }); const faceMat = new THREE.MeshStandardMaterial({ map: ztex().head, color: 0xc8c4b4, roughness: 0.6, emissive: 0x000000 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 0.9 });
    this.mats = [coat, vest, skin, faceMat];
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.2, 0.05), toneMapped: false });
    const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root); this.root = root;
    const body = new THREE.Group(); body.position.y = 1.7; root.add(body); this.body = body;
    const M = (g, m, px, py, pz, p = body) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; p.add(o); return o; };
    // long coat (cone-ish), torso, head, top hat
    const coatG = new THREE.CylinderGeometry(0.42, 0.85, 1.9, 14, 1, true); M(coatG, coat, 0, -0.75, 0).material.side = THREE.DoubleSide;
    M(new THREE.BoxGeometry(0.85, 1.0, 0.5), coat, 0, 0.6, 0); M(new THREE.BoxGeometry(0.4, 0.8, 0.52), vest, 0, 0.55, 0.01);
    M(new THREE.BoxGeometry(1.2, 0.12, 0.55), coat, 0, 1.07, 0);
    const neck = new THREE.Group(); neck.position.y = 1.15; body.add(neck); this.neck = neck;
    const head = M(new THREE.SphereGeometry(0.27, 16, 12), faceMat, 0, 0.3, 0, neck); head.scale.set(0.9, 1.2, 1);
    M(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 18), coat, 0, 0.58, 0, neck); M(new THREE.CylinderGeometry(0.25, 0.27, 0.55, 16), coat, 0, 0.86, 0, neck); M(new THREE.CylinderGeometry(0.275, 0.275, 0.08, 16), vest, 0, 0.64, 0, neck);
    for (const s of [-1, 1]) M(new THREE.SphereGeometry(0.055, 8, 6), this.eyeMat, s * 0.1, 0.34, 0.22, neck);
    M(new THREE.BoxGeometry(0.2, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0.17, 0.24, neck);
    this.arms = [];
    for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.6, 1.0, 0); body.add(a); M(new THREE.BoxGeometry(0.22, 0.9, 0.22), coat, 0, -0.45, 0, a); const f = new THREE.Group(); f.position.y = -0.9; a.add(f); M(new THREE.BoxGeometry(0.19, 0.8, 0.19), coat, 0, -0.4, 0, f); M(new THREE.BoxGeometry(0.16, 0.25, 0.08), skin, 0, -0.9, 0, f); for (let k = 0; k < 4; k++) M(new THREE.BoxGeometry(0.025, 0.28, 0.025), skin, -0.06 + k * 0.04, -1.12, 0, f); this.arms.push([a, f]); }
    // cane
    const cane = M(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), gold, 0, -0.75, 0.05, this.arms[1][1]); cane.rotation.x = 0.0; M(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.1), toneMapped: false }), 0, 0, 0.05, this.arms[1][1]).position.y = -0.95;
    // shield
    this.shieldMat = new THREE.ShaderMaterial({ uniforms: { op: { value: 0.2 }, t: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vP=position; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform float op,t; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f=pow(1.-abs(dot(vN,vV)),3.0); float hex=0.5+0.5*sin(vP.y*14.+t*3.)*sin(atan(vP.z,vP.x)*12.); vec3 c=vec3(1.6,0.18,0.06)*(f*1.4+hex*0.08); gl_FragColor=vec4(c*(op*2.2),1.); }' });
    this.shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 2), this.shieldMat); this.shield.position.y = 1.9; root.add(this.shield);
    head.userData.head = true; neck.children.forEach(o => { if (o.isMesh && o.geometry.type !== 'CylinderGeometry') o.userData.head = true; });
    this.hitMeshes = []; body.traverse(o => { if (o.isMesh) this.hitMeshes.push(o); });
    this.light = new THREE.PointLight(0xff2010, 4, 9, 2); this.light.position.y = 2.5; root.add(this.light);
    root.scale.setScalar(1.15);
    this.hp = this.maxHp = P.bossHp; this.final = P.final; this.speed = 1.1 + P.d * 1.4; this.phase2 = false; this.state = 'intro'; this.t = 0; this.orbT = 3; this.sumT = 10; this.tpT = 14; this.atkT = 0; this.flash = 0; this.yaw = 0; this.deadT = 0; this.P = P;
  }
  get x() { return this.root.position.x; } get z() { return this.root.position.z; }
  get shielded() { return this.urnsAlive > 0; }
  hit(dmg, head) {
    if (this.state === 'dead' || this.state === 'intro') return 'none';
    if (this.shielded) { this.shieldHit = 0.2; return 'shield'; }
    this.hp -= dmg * (head ? 1.8 : 1); this.flash = 0.1;
    if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.deadT = 0; return 'kill'; }
    return 'hit';
  }
  spheres() { const s = 1.15, x = this.x, z = this.z; return [{ x, y: 3.35 * s, z, r: 0.3 * s, head: true }, { x, y: 2.4 * s, z, r: 0.55 * s }, { x, y: 1.2 * s, z, r: 0.75 * s }]; }
  update(dt, t, game) {
    this.t += dt; this.flash -= dt; this.shieldHit = Math.max(0, (this.shieldHit || 0) - dt);
    const f = this.flash > 0 ? 1 : 0; for (const m of this.mats) m.emissive.setRGB(f, f * 0.2, 0);
    this.shield.visible = this.shielded && this.state !== 'dead'; this.shieldMat.uniforms.op.value = 0.14 + Math.sin(t * 6) * 0.04 + this.shieldHit * 1.5; this.shieldMat.uniforms.t.value = t; this.shield.rotation.y += dt * 0.6; this.shield.rotation.x += dt * 0.3;
    this.light.intensity = 3 + Math.sin(t * 9) * 1.2;
    const p = game.player, dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    if (this.state === 'dead') { this.deadT += dt; const k = Math.min(1, this.deadT / 3); this.body.rotation.z = Math.sin(this.deadT * 30) * 0.05 * (1 - k); this.root.position.y = -k * 3.8; this.light.intensity = 8 * (1 - k); if (Math.random() < 0.6) game.particles.emit(this.x + (Math.random() - .5) * 1.5, 1 + Math.random() * 3, this.z + (Math.random() - .5) * 1.5, { n: 3, color: [2, 0.3, 0.1], up: 2, grav: 1, size: 0.3, life: 1.2 }); return this.deadT > 3.2; }
    if (this.state === 'intro') { this.neck.rotation.x = Math.sin(this.t * 2) * 0.1; if (this.t > 2.5) this.state = 'fight'; const k = Math.min(1, this.t); this.arms[0][0].rotation.z = -k * 1.3; this.arms[1][0].rotation.z = k * 1.3; this.arms[0][1].rotation.z = -k * 0.5; this.arms[1][1].rotation.z = k * 0.5; if (Math.random() < 0.5) game.particles.emit(this.x + (Math.random() - .5) * 1.2, 0.2, this.z + (Math.random() - .5) * 1.2, { n: 2, color: [2, 0.25, 0.08], up: 2.5, grav: 0, size: 0.18, life: 1.2 }); return false; }
    this.arms[0][1].rotation.z = this.arms[1][1].rotation.z = 0;
    if (Math.random() < dt * 8) game.particles.emit(this.x + (Math.random() - .5) * 1.4, 0.3, this.z + (Math.random() - .5) * 1.4, { n: 1, color: [1.8, 0.2, 0.06], up: 1.6, grav: 0, size: 0.16, life: 1.1 });
    const want = Math.atan2(dx, dz); let dy = want - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.yaw += dy * Math.min(1, dt * 3); this.root.rotation.y = this.yaw;
    const spd = this.speed * (this.phase2 ? 1.4 : 1);
    if (this.state === 'fight') {
      if (dist > 2.2) { const r = game.collide(this.x + Math.sin(this.yaw) * spd * dt, this.z + Math.cos(this.yaw) * spd * dt, 0.8); this.root.position.x = r[0]; this.root.position.z = r[1]; }
      const ph = this.t * spd * 2.5; this.body.position.y = 1.7 + Math.abs(Math.sin(ph)) * 0.06; this.body.rotation.z = Math.sin(ph) * 0.05;
      this.arms[0][0].rotation.x = Math.sin(ph) * 0.3; this.arms[1][0].rotation.x = -Math.sin(ph) * 0.3; this.arms[0][0].rotation.z = 0.1; this.arms[1][0].rotation.z = -0.1;
      this.orbT -= dt; this.sumT -= dt; this.tpT -= dt;
      if (dist < 2.8 && this.atkT <= 0) { this.state = 'swipe'; this.st = 0; this.didHit = false; }
      else if (this.orbT <= 0) { this.state = 'cast'; this.st = 0; this.orbT = (this.phase2 ? 1.6 : 2.6) - this.P.d * 0.8; }
      else if (this.sumT <= 0) { this.sumT = 13 - this.P.d * 4; game.bossSummon(this); game.sfx.bossRoar(); }
      else if ((this.final || this.phase2) && this.tpT <= 0) { this.tpT = 9; game.bossTeleport(this); }
      this.atkT -= dt;
    } else if (this.state === 'swipe') {
      this.st += dt; const k = this.st / 0.9; this.arms[0][0].rotation.x = this.arms[1][0].rotation.x = k < 0.5 ? -k * 5 : -2.5 + (k - 0.5) * 7; this.body.rotation.x = k < 0.5 ? -0.15 : 0.25;
      if (k > 0.55 && !this.didHit) { this.didHit = true; if (dist < 3.4) game.damagePlayer(28 + this.P.d * 25, this); game.shake(0.5); }
      if (k >= 1) { this.state = 'fight'; this.atkT = 1.2; this.body.rotation.x = 0; }
    } else if (this.state === 'cast') {
      this.st += dt; this.arms[0][0].rotation.x = this.arms[1][0].rotation.x = -2.2; this.arms[0][0].rotation.z = 0.5; this.arms[1][0].rotation.z = -0.5;
      if (this.st > 0.6 && !this.cast) { this.cast = true; const n = this.phase2 ? 5 : 3; for (let i = 0; i < n; i++) game.spawnOrb(this.x, 3.0, this.z, this.yaw + (i - (n - 1) / 2) * 0.28); }
      if (this.st > 1.0) { this.state = 'fight'; this.cast = false; }
    }
    return false;
  }
  dispose(scene) { scene.remove(this.root); }
}
