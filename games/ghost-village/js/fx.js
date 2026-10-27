import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- GPU point particle system (pooled) ----------
export class Particles {
  constructor(scene, max = 1500, additive = true) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.siz = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.size0 = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.a0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uScale: { value: 400 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float uScale;
        void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*uScale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,.0,d); a*=a; if(a<0.01) discard; gl_FragColor=vec4(vC.rgb*(1.0+a), vC.a*a);
        #include <colorspace_fragment>
      }`
    });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 10; scene.add(this.points); this.geo = g;
  }
  spawn(x, y, z, vx, vy, vz, r, g, b, a, size, life, grav = 0, drag = 0, grow = 0) {
    let i = this.n; if (i >= this.max) { i = (Math.random() * this.max) | 0; } else this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 4] = r; this.col[i * 4 + 1] = g; this.col[i * 4 + 2] = b; this.col[i * 4 + 3] = a; this.siz[i] = size; this.size0[i] = size;
    this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav; this.drag[i] = drag; this.grow[i] = grow; this.a0[i] = a;
  }
  burst(p, count, { color = [1, 1, 1], spread = 3, up = 1, size = 0.15, life = 0.8, grav = -6, drag = 1, alpha = 1, grow = 0, jitter = 0.1, dir = null } = {}) {
    for (let k = 0; k < count; k++) {
      let vx = (Math.random() - 0.5) * spread, vy = (Math.random() - 0.3) * spread * up, vz = (Math.random() - 0.5) * spread;
      if (dir) { vx += dir.x; vy += dir.y; vz += dir.z; }
      const l = life * (0.5 + Math.random() * 0.7), s = size * (0.5 + Math.random());
      const c = color[0] instanceof Array ? color[(Math.random() * color.length) | 0] : color;
      this.spawn(p.x + (Math.random() - .5) * jitter, p.y + (Math.random() - .5) * jitter, p.z + (Math.random() - .5) * jitter, vx, vy, vz, c[0], c[1], c[2], alpha, s, l, grav, drag, grow);
    }
  }
  update(dt) {
    const P = this.pos, V = this.vel, C = this.col;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { // swap remove
        const j = --this.n; if (i !== j) {
          for (let k = 0; k < 3; k++) { P[i * 3 + k] = P[j * 3 + k]; V[i * 3 + k] = V[j * 3 + k]; }
          for (let k = 0; k < 4; k++) C[i * 4 + k] = C[j * 4 + k];
          this.siz[i] = this.siz[j]; this.size0[i] = this.size0[j]; this.life[i] = this.life[j]; this.maxLife[i] = this.maxLife[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.grow[i] = this.grow[j]; this.a0[i] = this.a0[j];
        }
        i--; continue;
      }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      V[i * 3] *= d; V[i * 3 + 1] = V[i * 3 + 1] * d + this.grav[i] * dt; V[i * 3 + 2] *= d;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.siz[i] = this.size0[i] * (this.grow[i] ? (1 + (1 - t) * this.grow[i]) : (0.3 + 0.7 * t));
      if (P[i * 3 + 1] < this.floor) { P[i * 3 + 1] = this.floor; V[i * 3 + 1] *= -0.2; V[i * 3] *= 0.5; V[i * 3 + 2] *= 0.5; }
      C[i * 4 + 3] = Math.min(1, t * 2.5) * this.a0[i];
    }
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.attributes.size.needsUpdate = true;
  }
}
Particles.prototype.floor = -1e9;

// ---------- Post processing (bloom + vignette/grain/aberration) ----------
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.85 }, uGrain: { value: 0.035 }, uAb: { value: 0.0015 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uDesat: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uVig,uGrain,uAb,uDesat; uniform vec3 uTint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c=vUv-.5; float r=dot(c,c); vec2 off=c*uAb*(1.+r*8.);
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      float l=dot(col,vec3(.299,.587,.114)); col=mix(col,vec3(l),uDesat); col*=uTint;
      col*=1.-smoothstep(.15,.75,r*uVig);
      col+= (h(vUv*vec2(1920.,1080.)+fract(uTime)*91.)-.5)*uGrain;
      gl_FragColor=vec4(col,1.); }`
};
export function makePost(renderer, scene, camera, high) {
  const post = { high, grade: null };
  if (high) {
    const comp = new EffectComposer(renderer);
    comp.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.75, 0.5, 0.8); comp.addPass(bloom);
    comp.addPass(new OutputPass());
    const grade = new ShaderPass(GradeShader); comp.addPass(grade);
    post.comp = comp; post.bloom = bloom; post.grade = grade.uniforms;
  }
  post.render = (t) => { if (post.comp) { post.grade.uTime.value = t; post.comp.render(); } else renderer.render(scene, camera); };
  post.setSize = (w, h) => { if (post.comp) { post.comp.setPixelRatio(renderer.getPixelRatio()); post.comp.setSize(w, h); } };
  post.dispose = () => { if (post.comp) post.comp.dispose(); };
  return post;
}

// ---------- Camera shake ----------
export class Shake {
  constructor() { this.t = 0; this.amp = 0; this.off = new THREE.Vector3(); this.roll = 0; }
  add(a) { this.amp = Math.min(1.2, this.amp + a); }
  update(dt) { this.t += dt; this.amp = Math.max(0, this.amp - dt * 1.8); const a = this.amp * this.amp * 0.25;
    this.off.set(Math.sin(this.t * 61) * a, Math.sin(this.t * 53 + 1) * a, 0); this.roll = Math.sin(this.t * 47) * a * 0.3; }
}

// ---------- Canvas textures ----------
export function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function noiseFill(g, w, h, base, vari, n = 4000, sz = 3) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * vari; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; const s = Math.random() * sz + 1; g.fillRect(Math.random() * w, Math.random() * h, s, s); }
}
export function glowTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.3, inner.replace(/[\d.]+\)$/, '0.5)')); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
}
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
