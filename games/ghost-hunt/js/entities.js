// GHOST HUNT – ghosts, boss doctor, patients, pickups
import * as THREE from 'three';
import { rand, clamp } from './core.js';
import { getTex } from './world.js';

const ghostVS = `uniform float uTime; uniform float uWave; varying vec3 vN; varying vec3 vV; varying float vY; varying float vDepth;
void main(){ vec3 p=position; float w=(1.0-clamp(p.y/1.4,0.0,1.0)); p.x+=sin(uTime*3.0+p.y*5.0+p.z*3.0)*0.07*w*uWave; p.z+=cos(uTime*2.6+p.y*4.0+p.x*3.0)*0.07*w*uWave;
 vY=position.y; vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`;
const ghostFS = `uniform float uTime,uAlpha,uHit,uFog,uSolid; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying float vY; varying float vDepth;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ float fr=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0); float fl=n2(vec2(vY*6.0-uTime*1.5, atan(vN.x,vN.z)*3.0+uTime*0.3));
 vec3 col=uColor*(0.1+fr*1.25+fl*0.22); col=mix(col,vec3(3.0,2.4,3.4),uHit);
 float a=uAlpha*(uSolid+(0.1+fr*0.65+fl*0.15))*smoothstep(-0.05,0.45,vY); a*=exp(-vDepth*uFog);
 gl_FragColor=vec4(col,clamp(a,0.0,1.0)); }`;
export function ghostMat(color, solid = 0) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uAlpha: { value: 1 }, uHit: { value: 0 }, uFog: { value: 0.045 }, uWave: { value: 1 }, uSolid: { value: solid } }, vertexShader: ghostVS, fragmentShader: ghostFS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}
const robeGeo = (() => { const pts = []; const prof = [[0.5, 0], [0.47, 0.25], [0.4, 0.6], [0.3, 1.0], [0.24, 1.3], [0.16, 1.42], [0.08, 1.48], [0.0, 1.5]]; prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y))); const g = new THREE.LatheGeometry(pts, 20); return g; })();
const headGeo = new THREE.SphereGeometry(0.17, 18, 14);
const eyeGeo = new THREE.SphereGeometry(0.035, 8, 6);
const sockGeo = new THREE.SphereGeometry(0.05, 8, 6);
const mouthGeo = new THREE.SphereGeometry(0.05, 10, 8);
const armGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.62, 6); armGeo.translate(0, -0.31, 0);
const handGeo = new THREE.SphereGeometry(0.06, 8, 6);
const hairGeo = new THREE.PlaneGeometry(0.06, 0.7); hairGeo.translate(0, -0.35, 0);
const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const hairMat = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });

export const GTYPES = {
  wraith: { color: 0x9fd8ff, eye: [3, 3.2, 3.5], hp: 1, speed: 1, dmg: 1, scale: 1 },
  screamer: { color: 0xffb0b0, eye: [4, 0.2, 0.1], hp: 0.8, speed: 1.45, dmg: 1.2, scale: 0.95 },
  nurse: { color: 0xb8ffd8, eye: [0.3, 3.5, 1.2], hp: 1.6, speed: 0.85, dmg: 1.5, scale: 1.08 },
};
export class Ghost {
  constructor(scene, type, pos, P) {
    const T = GTYPES[type]; this.type = type; this.T = T;
    this.g = new THREE.Group(); this.g.position.copy(pos); this.g.scale.setScalar(T.scale);
    this.mat = ghostMat(T.color); this.headMat = ghostMat(0xdfe8ee, 0.55);
    const robe = new THREE.Mesh(robeGeo, this.mat); robe.renderOrder = 5;
    const head = this.head = new THREE.Group(); head.position.set(0, 1.62, 0);
    const hm = new THREE.Mesh(headGeo, this.headMat); hm.scale.set(0.9, 1.15, 0.95); hm.renderOrder = 6; head.add(hm);
    for (const s of [-1, 1]) { const so = new THREE.Mesh(sockGeo, blackMat); so.position.set(0.06 * s, 0.03, 0.13); so.scale.set(1, 1.2, 0.6); head.add(so); const e = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...T.eye), toneMapped: false })); e.position.set(0.06 * s, 0.03, 0.16); e.scale.setScalar(0.55); head.add(e); }
    const mouth = this.mouth = new THREE.Mesh(mouthGeo, blackMat); mouth.position.set(0, -0.08, 0.14); mouth.scale.set(0.8, 1.3, 0.5); head.add(mouth);
    for (let i = 0; i < 14; i++) { const hr = new THREE.Mesh(hairGeo, hairMat); const a = 0.75 + (i / 13) * (Math.PI * 2 - 1.5); hr.position.set(Math.sin(a) * 0.165, 0.12, Math.cos(a) * 0.16); hr.rotation.y = a; hr.rotation.x = 0.08; hr.scale.set(0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.7, 1); head.add(hr); }
    for (const s of [-1, 1]) { const fr = new THREE.Mesh(hairGeo, hairMat); fr.position.set(0.1 * s, 0.13, 0.11); fr.rotation.set(-0.15, 0.6 * s, 0); fr.scale.set(1.2, 1.1, 1); head.add(fr); }
    this.arms = [];
    for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(0.22 * s, 1.36, 0.02); const am = new THREE.Mesh(armGeo, this.mat); const hd = new THREE.Mesh(handGeo, this.headMat); hd.position.y = -0.64; hd.scale.set(0.8, 1.4, 0.6); arm.add(am, hd); this.g.add(arm); this.arms.push(arm); }
    this.g.add(robe, head); scene.add(this.g); this.scene = scene;
    this.hp = this.maxHp = P.ghostHp * T.hp; this.speed = P.ghostSpeed * T.speed; this.dmg = P.ghostDmg * T.dmg;
    this.state = 'wander'; this.t = Math.random() * 10; this.atkCd = 1; this.alpha = 0; this.targetAlpha = 1; this.wp = pos.clone(); this.wpT = 0; this.hit = 0; this.baseY = 0.15; this.stun = 0; this.dead = false; this.scare = false; this.vel = new THREE.Vector3();
  }
  update(dt, ctx) {
    const { player, world } = ctx; this.t += dt; const g = this.g;
    this.mat.uniforms.uTime.value = this.headMat.uniforms.uTime.value = this.t;
    this.hit = Math.max(0, this.hit - dt * 4); this.mat.uniforms.uHit.value = this.headMat.uniforms.uHit.value = this.hit;
    this.alpha += (this.targetAlpha - this.alpha) * Math.min(1, dt * 3);
    this.mat.uniforms.uAlpha.value = this.alpha; this.headMat.uniforms.uAlpha.value = this.alpha;
    if (this.state === 'dying') { this.dieT += dt; g.position.y += dt * 0.8; g.scale.y *= 1 + dt * 0.8; g.rotation.y += dt * 6; this.targetAlpha = 0; if (this.dieT > 1.2) { this.dead = true; this.scene.remove(g); } return; }
    const dx = player.x - g.position.x, dz = player.z - g.position.z, dist = Math.hypot(dx, dz);
    const see = dist < 16 && world.los(g.position.x, g.position.z, player.x, player.z);
    this.atkCd -= dt; this.stun = Math.max(0, this.stun - dt);
    const spd = this.speed * (this.stun > 0 ? 0.25 : 1) * (ctx.lightsOut ? 1.35 : 1);
    if (this.state === 'retreat') { this.retreatT -= dt; this.targetAlpha = 0.0; if (this.retreatT <= 0) { // reappear elsewhere
        const r = world.allRooms()[Math.floor(Math.random() * world.allRooms().length)]; g.position.set(r.cx + rand(-2, 2), 0, r.cz + rand(-2, 2)); this.state = 'wander'; this.targetAlpha = 1; } }
    else if ((see && dist < 11) || dist < 4 || this.state === 'chase' && dist < 18) { this.state = 'chase'; }
    else this.state = 'wander';
    let tx, tz, sp;
    if (this.state === 'chase') { tx = player.x; tz = player.z; sp = spd * (dist < 5 ? 1.25 : 1); }
    else if (this.state === 'wander') { this.wpT -= dt; if (this.wpT <= 0 || g.position.distanceTo(this.wp) < 0.5) { const r = world.roomAt(g.position.x, g.position.z) || world.start; this.wp.set(r.cx + rand(-3, 3), 0, r.cz + rand(-3, 3)); if (Math.random() < 0.3) { const rr = world.allRooms()[Math.floor(Math.random() * world.allRooms().length)]; this.wp.set(rr.cx, 0, rr.cz); } this.wpT = rand(4, 9); } tx = this.wp.x; tz = this.wp.z; sp = spd * 0.45; }
    else { tx = g.position.x; tz = g.position.z; sp = 0; }
    const mx = tx - g.position.x, mz = tz - g.position.z, ml = Math.hypot(mx, mz);
    if (ml > 0.05) { this.vel.x += (mx / ml * sp - this.vel.x) * Math.min(1, dt * 2.5); this.vel.z += (mz / ml * sp - this.vel.z) * Math.min(1, dt * 2.5); }
    g.position.x += this.vel.x * dt; g.position.z += this.vel.z * dt;
    g.position.y = this.baseY + Math.sin(this.t * 2.1) * 0.12;
    // face movement / player
    const fy = this.state === 'chase' ? Math.atan2(dx, dz) : Math.atan2(this.vel.x, this.vel.z);
    let dy = fy - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 4);
    // arms
    const reach = this.state === 'chase' ? (dist < 3 ? 1 : 0.6) : 0.1;
    this.arms.forEach((a, i) => { a.rotation.x = -reach * 1.3 + Math.sin(this.t * 3 + i * 2) * 0.15; a.rotation.z = (i ? -1 : 1) * (0.15 + Math.sin(this.t * 2 + i) * 0.08); });
    this.head.rotation.z = Math.sin(this.t * 0.7) * 0.25 + (this.state === 'chase' ? Math.sin(this.t * 17) * 0.05 : 0);
    this.mouth.scale.y = 1.3 + (this.state === 'chase' ? 0.9 + Math.sin(this.t * 9) * 0.3 : 0);
    // occasional phase flicker
    if (this.state === 'wander' && Math.random() < dt * 0.15) this.alpha *= 0.2;
    // attack
    if (this.state === 'chase' && dist < 1.15 && this.atkCd <= 0 && this.alpha > 0.5) { this.atkCd = 1.6; ctx.ghostAttack(this); this.state = 'retreat'; this.retreatT = rand(3, 6); this.vel.set(-dx, 0, -dz).setLength(3); }
  }
  damage(d, ctx) { if (this.state === 'dying' || this.state === 'retreat') return; this.hp -= d; this.hit = 1; this.stun = 0.3; if (this.hp <= 0) { this.state = 'dying'; this.dieT = 0; ctx.ghostDie(this); } }
  remove() { this.scene.remove(this.g); }
}

/* -------- Boss: The Possessed Head Doctor -------- */
export class Doctor {
  constructor(scene, pos, P) {
    this.scene = scene; const g = this.g = new THREE.Group(); g.position.copy(pos);
    const tex = getTex();
    const skin = new THREE.MeshStandardMaterial({ color: 0x8d9a8c, roughness: 0.7 });
    const coat = new THREE.MeshStandardMaterial({ map: tex.coat, color: 0x9a968c, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.8 });
    const mask = new THREE.MeshStandardMaterial({ color: 0x5d8f86, roughness: 0.9 });
    this.mats = [skin, coat, dark, mask];
    const S = 1.35; g.scale.setScalar(S);
    const body = new THREE.Group(); body.position.y = 1.0; g.add(body); this.body = body;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.75, 12), coat); torso.position.y = 0.42; body.add(torso);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.42, 0.65, 14, 1, true), coat); skirt.position.y = -0.2; skirt.material.side = THREE.DoubleSide; body.add(skirt);
    const head = this.head = new THREE.Group(); head.position.y = 0.98; body.add(head);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), skin); hm.scale.set(0.95, 1.15, 1); head.add(hm);
    const mk = new THREE.Mesh(new THREE.SphereGeometry(0.185, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.32), mask); mk.rotation.x = -0.2; mk.position.z = 0.01; head.add(mk);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mask); cap.position.y = 0.04; head.add(cap);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.1), toneMapped: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), this.eyeMat); e.position.set(0.065 * s, 0.04, 0.165); head.add(e); }
    const glasses = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 14), dark); glasses.position.set(0.065, 0.04, 0.17); head.add(glasses); const g2 = glasses.clone(); g2.position.x = -0.065; head.add(g2);
    this.arms = []; this.legs = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(0.36 * s, 0.75, 0); body.add(sh);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.5, 8), coat); up.position.y = -0.25; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.5; sh.add(el);
      const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8), skin); lo.position.y = -0.25; el.add(lo);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.05), skin); hand.position.y = -0.55; el.add(hand);
      if (s === 1) { // bone saw
        const saw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.16), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.25 })); saw.position.set(0, -0.95, 0.12); saw.rotation.x = 0.3; el.add(saw);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.85, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.1), toneMapped: false })); edge.position.set(0, -0.95, 0.21); edge.rotation.x = 0.3; el.add(edge); this.saw = saw;
      } else { for (let k = 0; k < 3; k++) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.2, 0.03), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.2 })); sc.position.set(-0.03 + k * 0.03, -0.68, 0.03); sc.rotation.z = (k - 1) * 0.3; el.add(sc); } }
      this.arms.push({ sh, el });
      const hip = new THREE.Group(); hip.position.set(0.14 * s, 0.98 - 1.0 + 0.0, 0); g.add(hip); hip.position.y = 0.98;
      const th = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.5, 8), dark); th.position.y = -0.25; hip.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.5; hip.add(kn);
      const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.46, 8), dark); sn.position.y = -0.23; kn.add(sn);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.26), dark); ft.position.set(0, -0.47, 0.06); kn.add(ft);
      this.legs.push({ hip, kn });
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    this.aura = new THREE.PointLight(0xff2a10, 3, 6, 2); this.aura.position.set(0, 2.2, 0.4); g.add(this.aura);
    scene.add(g);
    this.hp = this.maxHp = P.bossHp; this.t = 0; this.state = 'intro'; this.stT = 2.5; this.atkCd = 2; this.throwCd = 4; this.tpCd = 8; this.hit = 0; this.dead = false; this.walkPh = 0; this.final = P.final; this.speed = 1.6 + P.t * 1.2; this.dmg = 18 + P.t * 22; this.summoned = 0;
  }
  update(dt, ctx) {
    const { player, world } = ctx, g = this.g; this.t += dt; this.stT -= dt; this.atkCd -= dt; this.throwCd -= dt; this.tpCd -= dt;
    this.hit = Math.max(0, this.hit - dt * 5);
    this.mats[1].emissive.setRGB(this.hit * 0.8, 0, 0); this.mats[0].emissive.setRGB(this.hit * 0.8, 0, 0);
    this.eyeMat.color.setRGB(5 + Math.sin(this.t * 10) * 2, 0.3, 0.1); this.aura.intensity = 3 + Math.sin(this.t * 7) * 1.5;
    if (Math.random() < dt * 8) ctx.fx.emit(new THREE.Vector3(g.position.x + rand(-0.4, 0.4), 1 + Math.random() * 2, g.position.z + rand(-0.4, 0.4)), { count: 1, color: 0xff2a10, color2: 0x400000, speed: 0.4, up: 1, life: 1.2, size: 0.25 });
    const dx = player.x - g.position.x, dz = player.z - g.position.z, dist = Math.hypot(dx, dz);
    const face = Math.atan2(dx, dz); let dy = face - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * (this.state === 'swing' ? 1 : 5));
    if (this.state === 'dying') { this.dieT += dt; g.rotation.x = Math.min(1.5, this.dieT * 1.2); g.position.y = -this.dieT * 0.3; if (Math.random() < 0.6) ctx.fx.emit(new THREE.Vector3(g.position.x, 1.5, g.position.z), { count: 4, color: 0xff3010, color2: 0xffd0a0, speed: 4, life: 1, size: 0.3 }); if (this.dieT > 3) { this.dead = true; this.scene.remove(g); } return; }
    if (this.state === 'intro') { this.anim(dt, 0); this.arms[0].sh.rotation.x = -2.6 + Math.sin(this.t * 3) * 0.2; this.arms[1].sh.rotation.x = -2.6; if (this.stT <= 0) this.state = 'walk'; return; }
    if (this.state === 'vanish') { this.alpha -= dt * 2; g.visible = Math.random() < this.alpha; if (this.stT <= 0) { // reappear behind player
        const yaw = player.yaw; const bx = player.x + Math.sin(yaw) * 2.6, bz = player.z + Math.cos(yaw) * 2.6; const p = new THREE.Vector3(bx, 0, bz); world.collide(p, 0.6); g.position.copy(p); g.visible = true; this.state = 'walk'; ctx.bossAppear(this); } return; }
    if (this.state === 'swing') { const k = 1 - this.stT / 0.7; this.arms[1].sh.rotation.x = k < 0.5 ? -2.8 * (k * 2) : -2.8 + (k - 0.5) * 2 * 3.6; this.arms[1].sh.rotation.z = -0.4; if (!this.struck && k > 0.6) { this.struck = true; if (dist < 2.8) ctx.bossHit(this.dmg); } if (this.stT <= 0) this.state = 'walk'; this.anim(dt, 0); return; }
    if (this.state === 'throw') { this.arms[0].sh.rotation.x = -1.6 - Math.sin((1 - this.stT / 0.6) * Math.PI) * 1; if (!this.thrown && this.stT < 0.3) { this.thrown = true; const n = this.final ? 5 : 3; for (let i = 0; i < n; i++) ctx.throwScalpel(g.position.clone().setY(2.0), (i - (n - 1) / 2) * 0.16); } if (this.stT <= 0) this.state = 'walk'; this.anim(dt, 0); return; }
    // walk
    const enraged = this.hp < this.maxHp * 0.4, spd = this.speed * (enraged ? 1.35 : 1);
    if (dist > 1.8) { g.position.x += dx / dist * spd * dt; g.position.z += dz / dist * spd * dt; const p = g.position; world.collide(p, 0.55); }
    this.anim(dt, dist > 1.8 ? spd : 0);
    if (dist < 2.6 && this.atkCd <= 0) { this.state = 'swing'; this.stT = 0.7; this.struck = false; this.atkCd = enraged ? 1.2 : 1.8; ctx.sfx.groan(0.7, 0.6); }
    else if (dist > 4 && this.throwCd <= 0) { this.state = 'throw'; this.stT = 0.6; this.thrown = false; this.throwCd = enraged ? 2.8 : 4.5; }
    else if (this.tpCd <= 0 && this.hp < this.maxHp * 0.75) { this.state = 'vanish'; this.alpha = 1; this.stT = 1.6; this.tpCd = enraged ? 9 : 14; ctx.bossVanish(this); }
    if (this.hp < this.maxHp * (0.66 - this.summoned * 0.3) && this.summoned < 2) { this.summoned++; ctx.bossSummon(this); }
  }
  anim(dt, spd) {
    this.walkPh += dt * spd * 3.2; const s = Math.sin(this.walkPh), k = spd > 0 ? 1 : 0;
    this.legs[0].hip.rotation.x = s * 0.5 * k; this.legs[1].hip.rotation.x = -s * 0.5 * k; this.legs[0].kn.rotation.x = Math.max(0, -s) * 0.7 * k; this.legs[1].kn.rotation.x = Math.max(0, s) * 0.7 * k;
    if (this.state === 'walk') { this.arms[0].sh.rotation.x = -0.3 - s * 0.3 * k; this.arms[1].sh.rotation.x = -0.5 + s * 0.3 * k; this.arms[0].el.rotation.x = -0.6; this.arms[1].el.rotation.x = -0.7; this.arms[1].sh.rotation.z = 0; }
    this.body.position.y = 1.0 + Math.abs(s) * 0.04 * k; this.body.rotation.z = Math.sin(this.t * 1.3) * 0.06; this.head.rotation.z = Math.sin(this.t * 2.1) * 0.2 + (Math.random() < 0.02 ? 0.5 : 0); this.head.rotation.x = 0.15;
  }
  damage(d, ctx) { if (this.state === 'dying' || this.state === 'intro' || this.state === 'vanish') return; this.hp -= d; this.hit = 1; if (this.hp <= 0) { this.hp = 0; this.state = 'dying'; this.dieT = 0; ctx.bossDie(this); } }
  center() { return new THREE.Vector3(this.g.position.x, 1.8, this.g.position.z); }
  remove() { this.scene.remove(this.g); }
}

/* -------- Patients -------- */
export class Patient {
  constructor(scene, pos, rot) {
    this.scene = scene; const g = this.g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rot;
    const gown = new THREE.MeshStandardMaterial({ color: 0x7fa6b8, roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: 0xc9a48a, roughness: 0.7 }), hair = new THREE.MeshStandardMaterial({ color: 0x2a1c14 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.7, 10), gown); body.position.y = 0.75; g.add(body);
    const head = this.head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin); head.position.y = 1.22; g.add(head);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hr.position.y = 1.24; hr.rotation.x = -0.3; g.add(hr);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 6), skin); leg.position.set(0.09 * s, 0.22, 0.15); leg.rotation.x = 1.3; g.add(leg); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.5, 6), skin); arm.position.set(0.24 * s, 0.85, 0.12); arm.rotation.x = -0.9; arm.rotation.z = s * 0.3; g.add(arm); }
    // shackle chain & glowing marker
    const ring = this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 2.2), transparent: true, opacity: 0.6, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    g.traverse(o => { if (o.isMesh && o !== ring) o.castShadow = true; });
    scene.add(g); this.t = Math.random() * 5; this.progress = 0; this.saved = false; this.pos = pos.clone();
  }
  update(dt) { this.t += dt; this.head.rotation.z = Math.sin(this.t * 7) * 0.08; this.head.rotation.x = 0.4 + Math.sin(this.t * 1.5) * 0.1; this.ring.material.opacity = 0.35 + Math.sin(this.t * 4) * 0.25; this.ring.scale.setScalar(1 + Math.sin(this.t * 4) * 0.06); if (this.saved) { this.fade -= dt; this.g.position.y += dt * 1.5; this.g.scale.setScalar(Math.max(0.01, this.fade)); if (this.fade <= 0) this.scene.remove(this.g); } }
  rescue() { this.saved = true; this.fade = 1; }
  remove() { this.scene.remove(this.g); }
}

/* -------- Pickups -------- */
const keyGroup = () => {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 1, roughness: 0.25, emissive: 0x6a4500 });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 18), m); bow.position.y = 0.14; const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), m); shaft.position.y = -0.06;
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.02), m); t1.position.set(0.04, -0.17, 0); const t2 = t1.clone(); t2.position.y = -0.11; g.add(bow, shaft, t1, t2); return g;
};
const glowTex = (() => { let t = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
export function glowSprite(color, s = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); sp.scale.setScalar(s); return sp; }
export class Pickup {
  constructor(scene, kind, pos) {
    this.scene = scene; this.kind = kind; const g = this.g = new THREE.Group(); g.position.copy(pos); this.t = Math.random() * 6; this.taken = false;
    let inner, glow;
    if (kind === 'key') { inner = keyGroup(); glow = glowSprite(0xffb020, 1.2); }
    else if (kind === 'battery') { inner = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.3 })); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.08, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.3, 2.5), toneMapped: false })); inner.add(b, band); glow = glowSprite(0x9a4aff, 0.8); }
    else if (kind === 'medkit') { inner = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.14), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 })); const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.1, 0.1), toneMapped: false })); const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.15), c1.material); inner.add(b, c1, c2); glow = glowSprite(0xff3030, 0.8); }
    else if (kind === 'coin') { inner = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16), new THREE.MeshStandardMaterial({ color: 0xffd24a, metalness: 1, roughness: 0.3, emissive: 0x553300 })); inner.rotation.x = Math.PI / 2; glow = glowSprite(0xffc020, 0.6); }
    else if (kind === 'note') { inner = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.32), new THREE.MeshStandardMaterial({ color: 0xe9e0c8, side: THREE.DoubleSide, roughness: 1 })); glow = glowSprite(0xffffff, 0.5); }
    this.inner = inner; inner.position.y = kind === 'note' ? 0.02 : 0.75; if (kind === 'note') { inner.rotation.x = -Math.PI / 2; inner.rotation.z = Math.random() * 6; }
    glow.position.y = inner.position.y; this.glow = glow; g.add(inner, glow); scene.add(g);
  }
  update(dt) { this.t += dt; if (this.kind !== 'note') { this.inner.rotation.y += dt * 1.8; this.inner.position.y = 0.75 + Math.sin(this.t * 2.5) * 0.08; } this.glow.material.opacity = 0.6 + Math.sin(this.t * 5) * 0.3; }
  remove() { this.scene.remove(this.g); }
}
export class Fuse {
  constructor(scene, spot) {
    this.scene = scene; const g = this.g = new THREE.Group(); g.position.copy(spot.pos); g.rotation.y = spot.rot; this.on = false; this.progress = 0;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x55595a, metalness: 0.6, roughness: 0.4 })); box.position.z = 0.1; box.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.21), new THREE.MeshStandardMaterial({ color: 0xffb000 })); stripe.position.set(0, 0.32, 0.1);
    this.lever = new THREE.Group(); this.lever.position.set(0, 0, 0.22); const lv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), new THREE.MeshStandardMaterial({ color: 0x222222 })); lv.position.y = 0.14; const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xcc1111 })); knob.position.y = 0.3; this.lever.add(lv, knob); this.lever.rotation.x = 2.4;
    this.lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.05), toneMapped: false }); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), this.lampMat); lamp.position.set(0.2, 0.28, 0.22);
    this.glow = glowSprite(0xff4020, 0.7); this.glow.position.set(0.2, 0.28, 0.3);
    g.add(box, stripe, this.lever, lamp, this.glow); scene.add(g); this.t = 0;
    this.pos = spot.pos.clone();
  }
  update(dt) { this.t += dt; this.glow.material.opacity = this.on ? 0.8 : 0.4 + Math.sin(this.t * 6) * 0.4; this.lever.rotation.x += ((this.on ? 0.6 : 2.4) - this.lever.rotation.x) * Math.min(1, dt * 8); }
  activate() { this.on = true; this.lampMat.color.setRGB(0.1, 3, 0.3); this.glow.material.color.setRGB(0.2, 1, 0.3); }
  remove() { this.scene.remove(this.g); }
}
export class Scalpel {
  constructor(scene, from, dir) { this.scene = scene; const m = this.m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.6, 0.4), toneMapped: false })); m.position.copy(from); m.lookAt(from.clone().add(dir)); this.v = dir.clone().multiplyScalar(11); scene.add(m); this.life = 3; this.dead = false; }
  update(dt) { this.m.position.addScaledVector(this.v, dt); this.life -= dt; if (this.life <= 0) this.kill(); }
  kill() { this.dead = true; this.scene.remove(this.m); }
}
