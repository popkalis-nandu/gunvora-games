// GUNVORA GAMES – shared horror engine core (Three.js r186, vendored)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

/* ---------------- Save ---------------- */
export const Save = {
  load(key, def) { try { const d = JSON.parse(localStorage.getItem(key)); return Object.assign(structuredClone(def), d || {}); } catch (e) { return structuredClone(def); } },
  save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { } }
};

/* ---------------- Renderer + Post ---------------- */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 1.1 }, uGrain: { value: 0.04 },
    uAberr: { value: 0.0015 }, uDamage: { value: 0 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uTint: { value: new THREE.Color(1, 1, 1) }, uDesat: { value: 0.15 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uVignette,uGrain,uAberr,uDamage,uFlash,uDesat; uniform vec3 uFlashColor,uTint; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){ vec2 c=vUv-0.5; float d=length(c); float ab=uAberr*(1.0+uDamage*4.0);
    vec3 col; col.r=texture2D(tDiffuse,vUv+c*ab*2.0).r; col.g=texture2D(tDiffuse,vUv).g; col.b=texture2D(tDiffuse,vUv-c*ab*2.0).b;
    float l=dot(col,vec3(0.299,0.587,0.114)); col=mix(col,vec3(l),uDesat); col*=uTint;
    col+= (h(vUv*vec2(1920.,1080.)+fract(uTime)*91.7)-0.5)*uGrain;
    float v=smoothstep(0.85,0.2,d*uVignette); col*=mix(0.25,1.0,v);
    col=mix(col,vec3(0.6,0.0,0.0)*(0.4+l),uDamage*(1.0-v*0.7)*0.85);
    col=mix(col,uFlashColor,clamp(uFlash,0.0,1.0));
    gl_FragColor=vec4(col,1.0);} `
};

export class Gfx {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.grade = new ShaderPass(GradeShader);
    this.quality = null;
    this.setQuality(quality);
    window.addEventListener('resize', () => this.resize());
  }
  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = q === 'high' ? Math.min(dpr, isTouch ? 1.5 : 1.75) : Math.min(dpr, 1) * (isTouch ? 0.7 : 0.85);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = q === 'high';
    this.renderer.shadowMap.needsUpdate = true;
    if (this.composer) { this.composer.dispose(); this.bloom?.dispose?.(); }
    this.composer = null;
    this.resize();
  }
  setup(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    if (this.quality === 'high') {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.45, 0.8);
      this.composer.addPass(this.bloom);
    } else this.bloom = null;
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(this.pixelRatio); this.composer.setSize(w, h); }
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  }
  render(t) {
    this.grade.uniforms.uTime.value = t;
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}

/* ---------------- Camera shake & screen fx ---------------- */
export class ScreenFX {
  constructor(gfx) { this.g = gfx.grade.uniforms; this.trauma = 0; this.flash = 0; this.damage = 0; this.ox = 0; this.oy = 0; this.t = 0; }
  shake(a) { this.trauma = Math.min(1.2, this.trauma + a); }
  doFlash(a, color = 0xffffff) { this.flash = Math.max(this.flash, a); this.g.uFlashColor.value.set(color); }
  hurt(a) { this.damage = Math.min(1, this.damage + a); }
  update(dt, camera) {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.damage = Math.max(0, this.damage - dt * 0.9);
    const s = this.trauma * this.trauma;
    const n = (k) => Math.sin(this.t * 61 * k) * 0.5 + Math.sin(this.t * 37 * k + 1.3) * 0.5;
    camera.rotation.z += n(1.1) * s * 0.06; camera.rotation.x += n(0.9) * s * 0.03; camera.rotation.y += n(1.3) * s * 0.03;
    this.g.uFlash.value = this.flash; this.g.uDamage.value = this.damage;
  }
}

/* ---------------- Particles ---------------- */
let _spriteTex = null;
function spriteTex() {
  if (_spriteTex) return _spriteTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _spriteTex = new THREE.CanvasTexture(c); return _spriteTex;
}
export class Particles {
  constructor(scene, max = 1500, additive = true) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.size0 = new Float32Array(max); this.grow = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: spriteTex() }, scale: { value: window.innerHeight / 2 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t=texture2D(map,gl_PointCoord); if(t.a*vA<0.01) discard; gl_FragColor=vec4(vC*${additive ? '1.0' : 't.a'},t.a*vA); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.mat = m;
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 10;
    scene.add(this.points);
    addEventListener('resize', () => m.uniforms.scale.value = window.innerHeight / 2);
  }
  emit(p, o = {}) {
    const n = o.count || 10, c = new THREE.Color(o.color ?? 0xffffff), c2 = o.color2 != null ? new THREE.Color(o.color2) : null;
    for (let k = 0; k < n; k++) {
      const i = this.i; this.i = (this.i + 1) % this.max;
      const sp = (o.speed ?? 3) * (0.3 + Math.random() * 0.7);
      let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      if (o.dir) { const s = o.spread ?? 0.4; dx = o.dir.x + dx * s; dy = o.dir.y + dy * s; dz = o.dir.z + dz * s; }
      dy += o.up ?? 0;
      this.pos[i * 3] = p.x + (Math.random() - .5) * (o.jitter || 0); this.pos[i * 3 + 1] = p.y + (Math.random() - .5) * (o.jitter || 0); this.pos[i * 3 + 2] = p.z + (Math.random() - .5) * (o.jitter || 0);
      this.vel[i * 3] = dx * sp; this.vel[i * 3 + 1] = dy * sp; this.vel[i * 3 + 2] = dz * sp;
      const cc = c2 ? c.clone().lerp(c2, Math.random()) : c;
      this.col[i * 3] = cc.r; this.col[i * 3 + 1] = cc.g; this.col[i * 3 + 2] = cc.b;
      this.maxLife[i] = this.life[i] = (o.life ?? 0.8) * (0.6 + Math.random() * 0.6);
      this.size0[i] = (o.size ?? 0.15) * (0.6 + Math.random() * 0.8); this.grow[i] = o.grow ?? 0;
      this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 1.5;
    }
  }
  update(dt) {
    const P = this.pos, V = this.vel;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      this.life[i] -= dt; const t = Math.max(0, this.life[i] / this.maxLife[i]);
      const d = Math.max(0, 1 - this.drag[i] * dt);
      V[i * 3] *= d; V[i * 3 + 1] = V[i * 3 + 1] * d - this.grav[i] * dt; V[i * 3 + 2] *= d;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.02 && this.grav[i] > 0) { P[i * 3 + 1] = 0.02; V[i * 3] *= 0.5; V[i * 3 + 1] = 0; V[i * 3 + 2] *= 0.5; }
      this.alpha[i] = Math.min(1, t * 2.5); this.size[i] = this.size0[i] * (1 + this.grow[i] * (1 - t));
    }
    const a = this.geo.attributes; a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
  }
  clear() { this.life.fill(0); }
}

/* ---------------- Audio (procedural WebAudio) ---------------- */
export class SFX {
  constructor() { this.ctx = null; this.vol = 0.8; this.loops = []; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(c.destination);
    // reverb
    const len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; this.verbIn = c.createGain(); this.verbIn.gain.value = 0.5;
    this.verbIn.connect(this.verb); this.verb.connect(this.master);
    const nl = c.sampleRate * 2; this.noise = c.createBuffer(1, nl, c.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  get t() { return this.ctx.currentTime; }
  out(g, wet = 0.2) { g.connect(this.master); if (wet > 0) { const s = this.ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(this.verbIn); } }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.playbackRate.value = 1; return s; }
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
  ok() { return this.ctx && this.ctx.state === 'running'; }
  gun(kind = 'rifle', vol = 1) {
    if (!this.ok()) return; const c = this.ctx, t = this.t;
    const cfg = { pistol: [2600, 0.18, 0.7], rifle: [3200, 0.16, 0.8], smg: [3600, 0.11, 0.6], shotgun: [1500, 0.38, 1.0], sniper: [2200, 0.5, 1.0], beam: [5000, 0.05, 0.2] }[kind] || [3000, 0.15, 0.8];
    const n = this.noiseSrc(); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cfg[0] * 2, t); f.frequency.exponentialRampToValueAtTime(300, t + cfg[1]);
    const g = c.createGain(); this.env(g, t, 0.002, cfg[2] * vol, cfg[1]); n.connect(f); f.connect(g); this.out(g, 0.25); n.start(t); n.stop(t + cfg[1] + 0.05);
    const o = this.osc('sine', 150); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); const g2 = c.createGain(); this.env(g2, t, 0.002, 0.9 * vol, 0.16); o.connect(g2); this.out(g2, 0); o.start(t); o.stop(t + 0.2);
  }
  explosion(vol = 1) {
    if (!this.ok()) return; const c = this.ctx, t = this.t;
    const n = this.noiseSrc(); n.playbackRate.value = 0.5; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(80, t + 1.4);
    const g = c.createGain(); this.env(g, t, 0.005, 1.2 * vol, 1.5); n.connect(f); f.connect(g); this.out(g, 0.4); n.start(t); n.stop(t + 1.6);
    const o = this.osc('sine', 80); o.frequency.exponentialRampToValueAtTime(25, t + 0.8); const g2 = c.createGain(); this.env(g2, t, 0.005, 1.3 * vol, 0.9); o.connect(g2); this.out(g2, 0); o.start(t); o.stop(t + 1);
  }
  scream(vol = 1, pitch = 1) {
    if (!this.ok()) return; const c = this.ctx, t = this.t, dur = 1.3;
    const g = c.createGain(); this.env(g, t, 0.03, 0.5 * vol, dur);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 * pitch; bp.Q.value = 2;
    const lfo = this.osc('sine', 9); const lg = c.createGain(); lg.gain.value = 40 * pitch; lfo.connect(lg);
    [1, 1.007, 1.5, 2.01].forEach((m, i) => { const o = this.osc(i % 2 ? 'sawtooth' : 'square', 620 * pitch * m); o.frequency.setValueAtTime(520 * pitch * m, t); o.frequency.linearRampToValueAtTime(900 * pitch * m, t + 0.25); o.frequency.exponentialRampToValueAtTime(300 * pitch * m, t + dur); lg.connect(o.frequency); const og = c.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(bp); o.start(t); o.stop(t + dur + 0.1); });
    const n = this.noiseSrc(); const ng = c.createGain(); ng.gain.value = 0.3; n.connect(ng); ng.connect(bp); n.start(t); n.stop(t + dur);
    lfo.start(t); lfo.stop(t + dur + 0.1); bp.connect(g); this.out(g, 0.6);
  }
  stinger(vol = 1) { // dissonant orchestra-like stab for jump scares
    if (!this.ok()) return; const c = this.ctx, t = this.t; const g = c.createGain(); this.env(g, t, 0.01, 0.6 * vol, 1.8);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 4000; f.connect(g);
    [110, 116.5, 155.6, 233, 246.9, 349, 370].forEach(fr => { const o = this.osc('sawtooth', fr); o.detune.value = rand(-15, 15); o.connect(f); o.start(t); o.stop(t + 2); });
    this.out(g, 0.7);
  }
  groan(vol = 0.5, pitch = 1) {
    if (!this.ok()) return; const c = this.ctx, t = this.t, dur = rand(0.8, 1.6);
    const o = this.osc('sawtooth', 85 * pitch); o.frequency.setValueAtTime(95 * pitch, t); o.frequency.linearRampToValueAtTime(65 * pitch, t + dur);
    const l = this.osc('sine', 6); const lg = c.createGain(); lg.gain.value = 8; l.connect(lg); lg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 3;
    const g = c.createGain(); this.env(g, t, 0.15, vol, dur); o.connect(f); f.connect(g); this.out(g, 0.3); o.start(t); l.start(t); o.stop(t + dur + 0.3); l.stop(t + dur + 0.3);
  }
  wail(vol = 0.4) {
    if (!this.ok()) return; const c = this.ctx, t = this.t, dur = 2.2;
    const o = this.osc('sine', 600); o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(820, t + 0.8); o.frequency.linearRampToValueAtTime(380, t + dur);
    const l = this.osc('sine', 5); const lg = c.createGain(); lg.gain.value = 18; l.connect(lg); lg.connect(o.frequency);
    const g = c.createGain(); this.env(g, t, 0.4, vol, dur); o.connect(g); this.out(g, 0.9); o.start(t); l.start(t); o.stop(t + dur + 0.5); l.stop(t + dur + 0.5);
  }
  whisper(vol = 0.3) {
    if (!this.ok()) return; const c = this.ctx, t = this.t; const n = this.noiseSrc(); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    for (let i = 0; i < 6; i++) f.frequency.setValueAtTime(rand(1500, 4500), t + i * 0.18);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); for (let i = 0; i < 6; i++) { g.gain.linearRampToValueAtTime(vol * rand(0.3, 1), t + i * 0.18 + 0.08); g.gain.linearRampToValueAtTime(0.02, t + i * 0.18 + 0.17); } g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
    const p = c.createStereoPanner ? c.createStereoPanner() : null; n.connect(f); if (p) { p.pan.value = rand(-1, 1); f.connect(p); p.connect(g); } else f.connect(g);
    this.out(g, 0.8); n.start(t); n.stop(t + 1.3);
  }
  thud(vol = 0.6, f0 = 90) { if (!this.ok()) return; const t = this.t; const o = this.osc('sine', f0); o.frequency.exponentialRampToValueAtTime(30, t + 0.25); const g = this.ctx.createGain(); this.env(g, t, 0.004, vol, 0.25); o.connect(g); this.out(g, 0.1); o.start(t); o.stop(t + 0.3); }
  heartbeat(vol = 0.6) { if (!this.ok()) return; this.thud(vol, 70); setTimeout(() => this.thud(vol * 0.7, 60), 180); }
  door(vol = 0.8) {
    if (!this.ok()) return; const c = this.ctx, t = this.t; this.thud(vol, 120);
    const n = this.noiseSrc(); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = c.createGain(); this.env(g, t, 0.003, vol * 0.8, 0.35); n.connect(f); f.connect(g); this.out(g, 0.6); n.start(t); n.stop(t + 0.4);
    const o = this.osc('square', 1800); const g2 = c.createGain(); this.env(g2, t + 0.05, 0.002, 0.08 * vol, 0.08); o.connect(g2); this.out(g2, 0.3); o.start(t); o.stop(t + 0.2);
  }
  click(f = 1200, vol = 0.25) { if (!this.ok()) return; const t = this.t; const o = this.osc('square', f); const g = this.ctx.createGain(); this.env(g, t, 0.001, vol, 0.04); o.connect(g); this.out(g, 0); o.start(t); o.stop(t + 0.06); }
  pickup(vol = 0.4) { if (!this.ok()) return; const t = this.t; [660, 880, 1320].forEach((f, i) => { const o = this.osc('triangle', f); const g = this.ctx.createGain(); this.env(g, t + i * 0.07, 0.005, vol, 0.18); o.connect(g); this.out(g, 0.3); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.25); }); }
  step(vol = 0.15) { if (!this.ok()) return; const c = this.ctx, t = this.t; const n = this.noiseSrc(); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = rand(300, 600); const g = c.createGain(); this.env(g, t, 0.003, vol, 0.09); n.connect(f); f.connect(g); this.out(g, 0.15); n.start(t); n.stop(t + 0.12); }
  hurt(vol = 0.5) { if (!this.ok()) return; const c = this.ctx, t = this.t; const o = this.osc('sawtooth', 180); o.frequency.exponentialRampToValueAtTime(90, t + 0.25); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 2; const g = c.createGain(); this.env(g, t, 0.01, vol, 0.25); o.connect(f); f.connect(g); this.out(g, 0.1); o.start(t); o.stop(t + 0.3); }
  splat(vol = 0.4) { if (!this.ok()) return; const c = this.ctx, t = this.t; const n = this.noiseSrc(); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.2); const g = c.createGain(); this.env(g, t, 0.002, vol, 0.2); n.connect(f); f.connect(g); this.out(g, 0.1); n.start(t); n.stop(t + 0.25); }
  zap(vol = 0.3) { if (!this.ok()) return; const t = this.t; const o = this.osc('sawtooth', 1200); o.frequency.exponentialRampToValueAtTime(200, t + 0.3); const g = this.ctx.createGain(); this.env(g, t, 0.003, vol, 0.3); o.connect(g); this.out(g, 0.4); o.start(t); o.stop(t + 0.35); }
  victory() { if (!this.ok()) return; const t = this.t; [523, 659, 784, 1046].forEach((f, i) => { const o = this.osc('triangle', f); const g = this.ctx.createGain(); this.env(g, t + i * 0.15, 0.01, 0.35, 0.6); o.connect(g); this.out(g, 0.5); o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.8); }); }
  defeat() { if (!this.ok()) return; const t = this.t; [392, 370, 349, 262].forEach((f, i) => { const o = this.osc('sawtooth', f / 2); const fl = this.ctx.createBiquadFilter(); fl.frequency.value = 900; const g = this.ctx.createGain(); this.env(g, t + i * 0.35, 0.02, 0.3, 0.7); o.connect(fl); fl.connect(g); this.out(g, 0.6); o.start(t + i * 0.35); o.stop(t + i * 0.35 + 0.9); }); }
  // looping ambience: returns handle with stop()
  drone(opts = {}) {
    if (!this.ctx) return null; const c = this.ctx, t = this.t; const nodes = [];
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.25, t + 3);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opts.cut ?? 420; lp.connect(g);
    const base = opts.base ?? 55;
    [1, 1.498, 2.02, 0.5].forEach((m, i) => { const o = this.osc(i === 3 ? 'sine' : 'sawtooth', base * m); o.detune.value = rand(-12, 12); const og = c.createGain(); og.gain.value = i === 3 ? 0.6 : 0.18; o.connect(og); og.connect(lp); o.start(); nodes.push(o); });
    const lfo = this.osc('sine', 0.07); const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); nodes.push(lfo);
    const n = this.noiseSrc(); n.playbackRate.value = 0.3; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = opts.wind ?? 400; nf.Q.value = 0.7; const ng = c.createGain(); ng.gain.value = opts.windVol ?? 0.35; n.connect(nf); nf.connect(ng); ng.connect(g); n.start(); nodes.push(n);
    this.out(g, 0.5);
    const h = { stop: () => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0.0001, c.currentTime, 0.4); setTimeout(() => nodes.forEach(o => { try { o.stop(); } catch (e) { } }), 1500); } catch (e) { } } };
    this.loops.push(h); return h;
  }
  stopAll() { this.loops.forEach(l => l.stop()); this.loops = []; }
}

/* ---------------- Input (keyboard/mouse + touch) ---------------- */
export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas; this.keys = {}; this.lookX = 0; this.lookY = 0; this.mx = 0; this.my = 0;
    this.btn = {}; this.pressed = {}; this.enabled = false; this.sens = 1; this.touchLook = 1;
    this.onPause = null; this.locked = false;
    addEventListener('keydown', e => { if (!this.keys[e.code]) this.pressed[e.code] = true; this.keys[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && this.enabled) e.preventDefault(); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.btn = {}; });
    canvas.addEventListener('mousedown', e => {
      if (isTouch && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (!this.enabled) return;
      if (!this.locked && !isTouch) { this.lock(); return; }
      if (e.button === 0) { this.btn.fire = true; this.pressed.fire = true; }
      if (e.button === 2) { this.btn.alt = true; this.pressed.alt = true; }
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.btn.fire = false; if (e.button === 2) this.btn.alt = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (this.locked && this.enabled) { this.lookX += e.movementX * 0.0022 * this.sens; this.lookY += e.movementY * 0.0022 * this.sens; } });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked && this.enabled && this.onPause && !isTouch) this.onPause();
    });
    this.buildTouch(ui);
  }
  lock() { if (isTouch) return; try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  buildTouch(ui) {
    const root = document.getElementById('touch'); if (!root) return; this.touchRoot = root;
    const stick = root.querySelector('.stick'), knob = root.querySelector('.knob'), look = root.querySelector('.lookzone');
    let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
    const R = 55;
    stick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; sid = t.identifier; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; move(t); }, { passive: false });
    const move = t => { let dx = t.clientX - sx, dy = t.clientY - sy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.mx = dx / R; this.my = dy / R; };
    root.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === sid) move(t);
        if (t.identifier === lid) { this.lookX += (t.clientX - lx) * 0.0065 * this.touchLook; this.lookY += (t.clientY - ly) * 0.0065 * this.touchLook; lx = t.clientX; ly = t.clientY; }
      } e.preventDefault();
    }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; this.mx = this.my = 0; knob.style.transform = ''; } if (t.identifier === lid) lid = null; } };
    root.addEventListener('touchend', end); root.addEventListener('touchcancel', end);
    look.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: false });
    root.querySelectorAll('[data-btn]').forEach(b => {
      const k = b.dataset.btn;
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.btn[k] = true; this.pressed[k] = true; b.classList.add('on');
        // fire button also acts as look drag
        if (b.dataset.look) { const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; } }, { passive: false });
      const up = e => { this.btn[k] = false; b.classList.remove('on'); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
    });
  }
  showTouch(v) { if (this.touchRoot) this.touchRoot.style.display = v && isTouch ? 'block' : 'none'; }
  moveVec() {
    let x = this.mx, y = this.my;
    if (this.keys.KeyW || this.keys.ArrowUp) y -= 1; if (this.keys.KeyS || this.keys.ArrowDown) y += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) x -= 1; if (this.keys.KeyD || this.keys.ArrowRight) x += 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
  }
  consumeLook() { const r = [this.lookX, this.lookY]; this.lookX = this.lookY = 0; return r; }
  was(k) { const v = !!this.pressed[k]; return v; }
  endFrame() { this.pressed = {}; }
  held(k) { return !!this.btn[k]; }
}

/* ---------------- Canvas textures ---------------- */
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// derive a tangent-space normal map from a canvas texture's luminance (safer than bumpMap, which can NaN on some GPUs)
export function normalFromTex(tex, strength = 2) {
  const src = tex.image, w = src.width, h = src.height; const sx = src.getContext('2d').getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = (sx[i * 4] * 0.3 + sx[i * 4 + 1] * 0.59 + sx[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const id = x.createImageData(w, h), d = id.data;
  const at = (i, j) => L[((j + h) % h) * w + ((i + w) % w)];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (at(i + 1, j) - at(i - 1, j)) * strength, dy = (at(i, j + 1) - at(i, j - 1)) * strength; const n = 1 / Math.hypot(dx, dy, 1); const k = (j * w + i) * 4; d[k] = (-dx * n * 0.5 + 0.5) * 255; d[k + 1] = (dy * n * 0.5 + 0.5) * 255; d[k + 2] = (n * 0.5 + 0.5) * 255; d[k + 3] = 255; }
  x.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.repeat.copy(tex.repeat); t.anisotropy = 4; return t;
}
export function grime(x, w, h, n = 400, a = 0.08) {
  for (let i = 0; i < n; i++) { const px = Math.random() * w, py = Math.random() * h, r = Math.random() * 40 + 6, al = Math.random() * a; const g = x.createRadialGradient(px, py, 0, px, py, r); const c = Math.random() < 0.2 ? '70,35,15' : '0,0,0'; g.addColorStop(0, `rgba(${c},${al})`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  for (let i = 0; i < n * 3; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * a * 1.5})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
}

/* ---------------- UI helpers ---------------- */
export const $ = s => document.querySelector(s);
export function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
export function hideScreens() { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); }
export function toast(msg, ms = 2200) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms); }
