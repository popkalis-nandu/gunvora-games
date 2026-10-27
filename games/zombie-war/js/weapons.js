// ZOMBIE WAR – weapons & first-person viewmodel (GUNVORA GAMES)
import * as THREE from 'three';
import { rand, clamp, canvasTex } from './core.js';

export const WEAPONS = {
  pistol: { name: 'M9 PISTOL', dmg: 34, rpm: 330, auto: false, mag: 12, reserve: Infinity, reload: 1.2, spread: 0.012, pellets: 1, recoil: 0.5, kick: 0.016, range: 80, snd: 'pistol', slot: 1 },
  smg: { name: 'MP5 SMG', dmg: 21, rpm: 800, auto: true, mag: 30, reserve: 150, reload: 1.6, spread: 0.032, pellets: 1, recoil: 0.32, kick: 0.007, range: 60, snd: 'smg', slot: 2 },
  shotgun: { name: 'M870 SHOTGUN', dmg: 17, rpm: 72, auto: false, mag: 6, reserve: 36, reload: 0.48, shell: true, spread: 0.075, pellets: 9, recoil: 1.5, kick: 0.05, range: 32, snd: 'shotgun', slot: 3, force: 1.2 },
  rifle: { name: 'M4 ASSAULT RIFLE', dmg: 40, rpm: 620, auto: true, mag: 30, reserve: 180, reload: 2.0, spread: 0.016, pellets: 1, recoil: 0.5, kick: 0.01, range: 120, snd: 'rifle', slot: 4 },
};
export const ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

const box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14), cyl8 = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
function part(g, geo, mat, p, s, r) { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); if (r) m.rotation.set(...r); g.add(m); return m; }

export class Viewmodel {
  constructor() {
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.01, 10);
    this.hemi = new THREE.HemisphereLight(0xbfc8ff, 0x302018, 1.1); this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffe0c0, 1.6); this.key.position.set(1, 2, 1); this.scene.add(this.key);
    this.flashL = new THREE.PointLight(0xffb060, 0, 3, 1.5); this.flashL.position.set(0.12, -0.08, -0.7); this.scene.add(this.flashL);
    addEventListener('resize', () => { this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); });
    const M = this.M = {
      steel: new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.85, roughness: 0.32 }),
      poly: new THREE.MeshStandardMaterial({ color: 0x17181a, metalness: 0.2, roughness: 0.6 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6a3a1c, roughness: 0.55 }),
      tan: new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.7 }),
      glove: new THREE.MeshStandardMaterial({ color: 0x232320, roughness: 0.85 }),
      sleeve: new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#4a5232'; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = ['#2e331e', '#6a6040', '#3a2e1e'][i % 3]; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 8, 3 + Math.random() * 5, Math.random() * 3, 0, 7); x.fill(); } }, [2, 2]), roughness: 0.9 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xc89a7a, roughness: 0.7 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.9, roughness: 0.3 }),
      red: new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.4, 0.2), toneMapped: false }),
      tritium: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 3, 0.8), toneMapped: false }),
    };
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.guns = {}; for (const k of ORDER) { this.guns[k] = this['build_' + k](); this.guns[k].visible = false; this.root.add(this.guns[k]); }
    // muzzle flash sprite
    const ft = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.2, 'rgba(255,200,90,.9)'); g.addColorStop(0.5, 'rgba(255,110,20,.35)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,220,140,.8)'; for (let i = 0; i < 7; i++) { x.save(); x.translate(64, 64); x.rotate(i / 7 * 6.28 + Math.random() * 0.3); x.beginPath(); x.moveTo(0, -5); x.lineTo(60, 0); x.lineTo(0, 5); x.fill(); x.restore(); } });
    const fm = new THREE.MeshBasicMaterial({ map: ft, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2.5, 2.2, 1.8), toneMapped: false, side: THREE.DoubleSide });
    this.flash = new THREE.Group(); const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), fm); const p2 = p1.clone(); p2.rotation.y = Math.PI / 2; p2.scale.set(1.8, 0.7, 1); const p3 = p1.clone(); p3.rotation.x = Math.PI / 2; p3.scale.set(0.7, 1.8, 1); this.flash.add(p1, p2, p3); this.flash.visible = false; this.scene.add(this.flash);
    // casings
    this.cas = []; const cg = new THREE.CylinderGeometry(0.006, 0.006, 0.022, 8); for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(cg, M.brass); m.visible = false; this.scene.add(m); this.cas.push({ m, v: new THREE.Vector3(), life: 0 }); } this.casI = 0;
    // hands for grenade throw
    this.nadeArm = new THREE.Group(); { const a = part(this.nadeArm, cyl8, M.sleeve, [0, 0, 0.18], [0.07, 0.36, 0.07], [Math.PI / 2, 0, 0]); part(this.nadeArm, box, M.glove, [0, 0, -0.02], [0.08, 0.06, 0.1]); const n = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.6 })); n.position.set(0, 0.04, -0.06); this.nadeArm.add(n); }
    this.nadeArm.visible = false; this.scene.add(this.nadeArm);
    this.cur = 'pistol'; this.guns.pistol.visible = true;
    this.recoil = 0; this.recoilR = 0; this.swayX = 0; this.swayY = 0; this.switchT = 0; this.reloadT = 0; this.reloadDur = 1; this.flashT = 0; this.ads = 0; this.sprint = 0; this.nadeT = 0; this.t = 0;
  }
  hands(g, gripZ, foreZ, foreY = -0.035, w = 0.042) {
    const M = this.M;
    // right hand on grip
    part(g, box, M.glove, [0, -0.07, gripZ], [w + 0.012, 0.07, 0.075]); part(g, cyl8, M.sleeve, [0.03, -0.12, gripZ + 0.2], [0.075, 0.38, 0.075], [1.15, 0, -0.2]);
    // left hand
    if (foreZ != null) { part(g, box, M.glove, [-0.012, foreY - 0.02, foreZ], [w + 0.02, 0.05, 0.1]); part(g, cyl8, M.sleeve, [-0.12, foreY - 0.09, foreZ + 0.2], [0.075, 0.42, 0.075], [1.2, 0, 0.55]); }
  }
  build_pistol() {
    const g = new THREE.Group(), M = this.M;
    part(g, box, M.steel, [0, 0.0, -0.06], [0.032, 0.036, 0.2]); part(g, box, M.poly, [0, -0.028, -0.04], [0.03, 0.026, 0.16]);
    part(g, box, M.poly, [0, -0.075, 0.02], [0.03, 0.1, 0.045], [-0.25, 0, 0]); part(g, cyl, M.steel, [0, 0.005, -0.165], [0.016, 0.02, 0.016], [Math.PI / 2, 0, 0]);
    part(g, box, M.steel, [0, 0.022, -0.15], [0.006, 0.01, 0.01]); part(g, box, M.tritium, [0, 0.024, -0.152], [0.003, 0.003, 0.003]);
    for (const x of [-0.008, 0.008]) part(g, box, M.tritium, [x, 0.024, 0.03], [0.003, 0.003, 0.003]);
    for (let i = 0; i < 6; i++) part(g, box, M.poly, [0, 0.018, 0.0 + i * 0.006], [0.034, 0.003, 0.002]);
    this.hands(g, 0.03, 0.03, -0.075, 0.036); g.userData = { muzzle: new THREE.Vector3(0, 0.005, -0.19), slide: g.children[0], base: [0.17, -0.17, -0.42], eject: new THREE.Vector3(0.02, 0.02, -0.05) };
    return g;
  }
  build_smg() {
    const g = new THREE.Group(), M = this.M;
    part(g, box, M.poly, [0, 0, -0.08], [0.045, 0.06, 0.3]); part(g, cyl, M.poly, [0, 0.0, -0.27], [0.042, 0.1, 0.042], [Math.PI / 2, 0, 0]); part(g, cyl, M.steel, [0, 0.0, -0.34], [0.018, 0.06, 0.018], [Math.PI / 2, 0, 0]);
    part(g, box, M.steel, [0, -0.085, -0.1], [0.025, 0.13, 0.04], [0.18, 0, 0]); part(g, box, M.poly, [0, -0.07, 0.04], [0.032, 0.1, 0.04], [-0.25, 0, 0]);
    part(g, box, M.steel, [0, 0.045, -0.06], [0.012, 0.03, 0.12]); part(g, box, M.steel, [0, 0.035, 0.12], [0.012, 0.012, 0.16]); part(g, box, M.poly, [0, 0.0, 0.2], [0.03, 0.06, 0.02]);
    this.hands(g, 0.04, -0.25, -0.03, 0.045); g.userData = { muzzle: new THREE.Vector3(0, 0, -0.38), base: [0.16, -0.17, -0.38], mag: g.children[3], eject: new THREE.Vector3(0.025, 0.02, -0.1) };
    return g;
  }
  build_shotgun() {
    const g = new THREE.Group(), M = this.M;
    part(g, cyl, M.steel, [0, 0.012, -0.32], [0.026, 0.52, 0.026], [Math.PI / 2, 0, 0]); part(g, cyl, M.steel, [0, -0.018, -0.28], [0.024, 0.42, 0.024], [Math.PI / 2, 0, 0]);
    const pump = part(g, cyl8, M.wood, [0, -0.02, -0.25], [0.048, 0.17, 0.042], [Math.PI / 2, 0, 0]);
    part(g, box, M.steel, [0, -0.002, -0.02], [0.05, 0.065, 0.2]); part(g, box, M.wood, [0, -0.05, 0.14], [0.044, 0.08, 0.2], [-0.2, 0, 0]); part(g, box, M.steel, [0, 0.042, -0.57], [0.006, 0.01, 0.006]);
    part(g, box, M.tritium, [0, 0.048, -0.57], [0.004, 0.004, 0.004]);
    this.hands(g, 0.07, -0.25, -0.03, 0.05); g.userData = { muzzle: new THREE.Vector3(0, 0.012, -0.6), base: [0.17, -0.19, -0.36], pump, eject: new THREE.Vector3(0.03, 0.02, -0.03) };
    return g;
  }
  build_rifle() {
    const g = new THREE.Group(), M = this.M;
    part(g, box, M.poly, [0, 0, -0.04], [0.048, 0.07, 0.24]); part(g, cyl8, M.poly, [0, 0.005, -0.27], [0.05, 0.24, 0.05], [Math.PI / 2, Math.PI / 8, 0]); part(g, cyl, M.steel, [0, 0.005, -0.44], [0.016, 0.16, 0.016], [Math.PI / 2, 0, 0]);
    part(g, box, M.steel, [0, 0.0, -0.53], [0.024, 0.024, 0.04]);
    const mag = part(g, box, M.tan, [0, -0.1, -0.07], [0.03, 0.14, 0.06], [0.22, 0, 0]);
    part(g, box, M.poly, [0, -0.07, 0.05], [0.032, 0.1, 0.04], [-0.3, 0, 0]); part(g, box, M.poly, [0, -0.01, 0.2], [0.04, 0.07, 0.16]);
    // red dot sight
    part(g, box, M.steel, [0, 0.048, -0.04], [0.04, 0.012, 0.1]); part(g, cyl, M.poly, [0, 0.075, -0.04], [0.04, 0.07, 0.04], [Math.PI / 2, 0, 0]); part(g, box, M.red, [0, 0.075, -0.06], [0.003, 0.003, 0.002]);
    this.hands(g, 0.06, -0.28, -0.03, 0.05); g.userData = { muzzle: new THREE.Vector3(0, 0.005, -0.56), base: [0.16, -0.17, -0.36], mag, eject: new THREE.Vector3(0.03, 0.02, -0.06) };
    return g;
  }
  show(k) { for (const n in this.guns) this.guns[n].visible = n === k; this.cur = k; }
  doSwitch(k) { this.next = k; this.switchT = 0.45; }
  fire(w) {
    this.recoil = Math.min(1.4, this.recoil + w.recoil * (this.ads ? 0.6 : 1)); this.recoilR = rand(-1, 1) * w.recoil; this.flashT = 0.05; this.flash.rotation.z = rand(0, 6.28); this.flash.scale.setScalar(rand(0.8, 1.25) * (w.pellets > 1 ? 1.5 : 1));
    if (this.cur !== 'shotgun') this.eject(); else this.pumpT = 0.5;
  }
  eject() { const g = this.guns[this.cur], c = this.cas[this.casI]; this.casI = (this.casI + 1) % this.cas.length; c.m.position.copy(g.userData.eject).applyMatrix4(g.matrixWorld); c.v.set(rand(0.9, 1.4), rand(0.9, 1.4), rand(-0.1, 0.3)); c.m.rotation.set(rand(0, 3), rand(0, 3), 0); c.m.visible = true; c.life = 0.7; }
  muzzleWorld(cam, out) { const g = this.guns[this.cur]; out.copy(g.userData.muzzle).applyMatrix4(g.matrixWorld); // vm cam space -> world approx
    out.applyMatrix4(cam.matrixWorld); return out; }
  update(dt, st) {
    this.t += dt; const g = this.guns[this.cur], u = g.userData;
    this.recoil = Math.max(0, this.recoil - dt * 7 * (0.6 + this.recoil)); this.recoilR *= Math.max(0, 1 - dt * 10);
    this.swayX += (clamp(-st.lookX * 3, -0.06, 0.06) - this.swayX) * Math.min(1, dt * 8); this.swayY += (clamp(st.lookY * 3, -0.06, 0.06) - this.swayY) * Math.min(1, dt * 8);
    this.ads += ((st.ads ? 1 : 0) - this.ads) * Math.min(1, dt * 12); this.sprint += ((st.sprint ? 1 : 0) - this.sprint) * Math.min(1, dt * 8);
    let sw = 0; if (this.switchT > 0) { this.switchT -= dt; if (this.switchT < 0.22 && this.next) { this.show(this.next); this.next = null; } sw = Math.sin(clamp(this.switchT / 0.45, 0, 1) * Math.PI); }
    let rl = 0, rlk = 0; if (this.reloadT > 0) { this.reloadT -= dt; rlk = 1 - this.reloadT / this.reloadDur; rl = Math.sin(clamp(rlk, 0, 1) * Math.PI); }
    let nd = 0; if (this.nadeT > 0) { this.nadeT -= dt; nd = Math.sin(clamp(1 - this.nadeT / 0.6, 0, 1) * Math.PI); }
    const b = u.base, bob = st.bob, mv = st.moving * (1 - this.ads * 0.8);
    const ax = b[0] * (1 - this.ads), ay = b[1] + this.ads * (this.cur === 'rifle' ? 0.098 : 0.075) * (this.cur === 'pistol' ? 1.25 : 1);
    this.root.position.set(ax + this.swayX + Math.cos(bob * 0.5) * 0.012 * mv + this.sprint * 0.05, ay + this.swayY - Math.abs(Math.sin(bob * 0.5)) * 0.012 * mv - sw * 0.3 - rl * 0.06 - nd * 0.25 - this.sprint * 0.04 + Math.sin(this.t * 1.6) * 0.002, b[2] + this.recoil * 0.06 + this.ads * 0.06);
    this.root.rotation.set(this.recoil * 0.12 + rl * 0.5 - this.sprint * 0.3 + sw * 0.5, this.recoilR * 0.04 + this.sprint * 0.7 + this.swayX * 1.2, this.recoilR * 0.05 - rl * 0.6 + this.sprint * 0.35);
    // reload details
    if (u.mag) { u.mag.position.y = (this.cur === 'rifle' ? -0.1 : -0.085) - (rlk > 0.2 && rlk < 0.65 ? 0.25 : 0); }
    if (u.slide) u.slide.position.z = -0.06 + Math.min(0.03, this.recoil * 0.05);
    if (u.pump) { this.pumpT = Math.max(0, (this.pumpT || 0) - dt); const pk = this.pumpT > 0 && this.pumpT < 0.35 ? Math.sin((0.35 - this.pumpT) / 0.35 * Math.PI) : 0; u.pump.position.z = -0.25 + pk * 0.07; if (this.pumpT > 0.12 && this.pumpT - dt <= 0.12) this.eject(); }
    // flash
    this.flashT -= dt; this.flash.visible = this.flashT > 0; this.flashL.intensity = this.flashT > 0 ? 6 : 0;
    if (this.flash.visible) { this.root.updateMatrixWorld(true); this.flash.position.copy(u.muzzle).applyMatrix4(g.matrixWorld); this.flashL.position.copy(this.flash.position); }
    // casings (in view space)
    for (const c of this.cas) if (c.life > 0) { c.life -= dt; c.v.y -= 6 * dt; c.m.position.addScaledVector(c.v, dt * 0.3); c.m.rotation.x += dt * 20; c.m.rotation.z += dt * 14; if (c.life <= 0) c.m.visible = false; }
    // grenade arm
    this.nadeArm.visible = this.nadeT > 0; if (this.nadeArm.visible) { const k = 1 - this.nadeT / 0.6; this.nadeArm.position.set(-0.15 + k * 0.1, -0.3 + Math.sin(k * Math.PI) * 0.25, -0.35 - k * 0.15); this.nadeArm.rotation.set(-0.5 + k * 1.6, 0, 0.3); }
  }
}
