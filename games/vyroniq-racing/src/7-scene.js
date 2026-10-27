// ---------------------------------------------------------------- 3D renderer (Three.js)
const QUALITY = {
  low: { pr: 1.25, shadows: false, bloom: false, scen: 0.45, map: 0, far: 1100, cell: 14, rain: 450, aniso: 4 },
  medium: { pr: 2, shadows: true, bloom: false, scen: 0.8, map: 1024, far: 1600, cell: 11, rain: 1000, aniso: 8 },
  high: { pr: 2, shadows: true, bloom: true, scen: 1, map: 2048, far: 2300, cell: 9, rain: 1800, aniso: 16 }
};
let renderer = null, scene = null, camera = null, composer = null, bloomPass = null, renderPass = null, canvas3d = null;
let prScale = 1, qName = '', Q = QUALITY.medium, autoQ = 'medium', softGPU = false, gpuName = '', r3ready = false;
let hemi, sun, skyMat, skyMesh, stars, pmrem, envRT = null, trackGroup = null, rainLines = null, parts = null, roadMat = null, gantryMats = [], sceneDef = null, sceneRain = false;
let smoke = null, skids = null, gScene, gCam, gCar = null, gKey = '', gT = 0, gEnv = null;
const sunDir = new THREE.Vector3(0, 1, 0), raceDispose = [], tr3 = o => (raceDispose.push(o), o);
function pickAutoQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (softGPU) return 'low';
  if (isTouchDev()) return (mem <= 2 || cores <= 4) ? 'low' : 'medium';
  return cores <= 2 ? 'medium' : 'high';
}
const effQuality = () => ['low', 'medium', 'high'].includes(settings.gfx) ? settings.gfx : autoQ;
function init3D() {
  canvas3d = $('gl');
  try { const probe = document.createElement('canvas'); if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, powerPreference: 'high-performance', stencil: false }); // MSAA on every tier: crisp edges on phones too
  } catch (e) { console.warn('WebGL unavailable', e); renderer = null; return false; }
  const gl = renderer.getContext();
  try { const ext = /firefox/i.test(navigator.userAgent) ? null : gl.getExtension('WEBGL_debug_renderer_info'); gpuName = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { }
  softGPU = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName); autoQ = pickAutoQuality();
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas3d.addEventListener('webglcontextlost', e => e.preventDefault(), false);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.15, 9000); camera.rotation.order = 'YXZ';
  pmrem = new THREE.PMREMGenerator(renderer);
  hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.2); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 2.4); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 500 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
  skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: sunDir }, sunSize: { value: 1 }, glow: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,0.)).xyz; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, bot, sunCol, sunDir; uniform float sunSize, glow; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, 0., 1.); vec3 c = mix(bot, top, pow(h, 0.55));
        float s = max(dot(d, normalize(sunDir)), 0.); c += sunCol * (smoothstep(0.9993, 0.9997, s) * 8. * sunSize + pow(s, 14.) * 0.45 * glow + pow(s, 3.) * 0.12 * glow);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, side: THREE.BackSide, depthWrite: false, fog: false });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat); skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; scene.add(skyMesh);
  { const n = 900, pos = new Float32Array(n * 3), R = mulberry32(5); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, e = Math.asin(0.08 + R() * 0.92); pos.set([Math.cos(a) * Math.cos(e) * 4500, Math.sin(e) * 4500, Math.sin(a) * Math.cos(e) * 4500], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8, depthWrite: false })); stars.frustumCulled = false; scene.add(stars); }
  // particles (spray, dust, sparks, boost)
  { const n = 600, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    parts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.7, map: radialTex(), vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    parts.frustumCulled = false; parts.userData = { n, i: 0, life: new Float32Array(n), max: new Float32Array(n), vel: new Float32Array(n * 3), col: new Float32Array(n * 3) }; scene.add(parts); }
  // tyre smoke (normal blending, per-particle alpha)
  { const n = 360, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
    smoke = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.6, map: radialTex(), vertexColors: true, transparent: true, depthWrite: false }));
    smoke.frustumCulled = false; smoke.userData = { n, i: 0, life: new Float32Array(n), max: new Float32Array(n), vel: new Float32Array(n * 3) }; scene.add(smoke); }
  // skid marks: ring buffer of dark quads laid on the asphalt
  { const n = 1400, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 18), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 24), 4).setUsage(THREE.DynamicDrawUsage));
    skids = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, toneMapped: false }));
    skids.frustumCulled = false; skids.renderOrder = 1; skids.userData = { n, i: 0 }; scene.add(skids); }
  // rain streaks around the camera
  { const n = 1800, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    rainLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0.45, depthWrite: false })); rainLines.frustumCulled = false; rainLines.visible = false;
    const R = mulberry32(9), off = new Float32Array(n * 3); for (let i = 0; i < n; i++) { off[i * 3] = (R() - 0.5) * 60; off[i * 3 + 1] = R() * 24; off[i * 3 + 2] = (R() - 0.5) * 60; } rainLines.userData = { n, off }; scene.add(rainLines); }
  initShowroom();
  addEventListener('resize', resize3D);
  r3ready = true; applyGfx(true); resize3D();
  return true;
}
function noiseTex(size, base, amp, seed, fn) {
  const c = mk(size, size, (g) => { const id = g.createImageData(size, size), R = mulberry32(seed); for (let i = 0; i < size * size; i++) { const v = base + (R() - 0.5) * amp; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } g.putImageData(id, 0, 0); if (fn) fn(g, size, R); });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(Q.aniso || 8, renderer.capabilities.getMaxAnisotropy()); return t;
}
let _radial = null;
function radialTex() { if (_radial) return _radial; const c = mk(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); _radial = new THREE.CanvasTexture(c); return _radial; }
function textTex(w, h, fn) { const t = new THREE.CanvasTexture(mk(w, h, fn)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return tr3(t); }
function applyGfx(force) {
  if (!renderer) return;
  const q = effQuality(); const info = $('gfxInfo');
  if (info) info.textContent = `Using ${q} quality${settings.gfx === 'auto' ? ' (picked automatically' + (softGPU ? ', software graphics detected' : '') + ')' : ''}. ${q === 'low' ? 'No shadows or glow, simpler materials.' : q === 'medium' ? 'Shadows on, glow off.' : 'Shadows, reflections and neon glow on.'}`;
  if (q === qName && !force) return;
  const prev = qName; qName = q; Q = QUALITY[q];
  renderer.shadowMap.enabled = Q.shadows; sun.castShadow = Q.shadows; renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; prScale = 1;
  if (Q.shadows) { sun.shadow.mapSize.set(Q.map, Q.map); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (Q.bloom && !composer) { composer = new EffectComposer(renderer); renderPass = new RenderPass(scene, camera); composer.addPass(renderPass); bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.6); composer.addPass(bloomPass); composer.addPass(new OutputPass()); }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  if ((prev === 'low') !== (q === 'low') || !MAT.paint) { initMaterials(q === 'low'); if (typeof onMaterialsChanged === 'function') onMaterialsChanged(); }
  resize3D();
}
function resize3D() {
  if (!renderer) return;
  const w = Math.max(320, innerWidth), h = Math.max(200, innerHeight), pr = Math.max(1, Math.min(window.devicePixelRatio || 1, Q.pr) * prScale); // device pixels up to the tier cap (2x), scaled down only by the auto frame-rate governor
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (gCam) { gCam.aspect = w / h; gCam.updateProjectionMatrix(); }
  if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); bloomPass.resolution.set(w * pr / 2, h * pr / 2); }
}
function updateEnv(night) {
  if (envRT) { envRT.dispose(); envRT = null; }
  const es = new THREE.Scene(), m = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), skyMat); es.add(m);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: colorLin(sceneDef.ground).multiplyScalar(0.6) })); g.position.y = -2; es.add(g);
  envRT = pmrem.fromScene(es, 0, 0.1, 300); scene.environment = envRT.texture; scene.environmentIntensity = night ? 0.45 : 0.8;
  m.geometry.dispose(); g.geometry.dispose(); g.material.dispose();
}

// ---------------------------------------------------------------- circuit construction
function clearCircuit3D() { if (skids) { skids.geometry.attributes.color.array.fill(0); skids.geometry.attributes.color.needsUpdate = true; skids.geometry.attributes.position.array.fill(0); skids.geometry.attributes.position.needsUpdate = true; skids.userData.i = 0; } if (smoke) smoke.userData.life.fill(0); if (trackGroup) { scene.remove(trackGroup); trackGroup = null; } raceDispose.forEach(o => o.dispose && o.dispose()); raceDispose.length = 0; }
// value noise for terrain
function vnoise(x, z, seed) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, h = (a, b) => hash(a * 157.3 + b * 311.7 + seed * 17.1); const u = smooth(xf), v = smooth(zf); return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v); }
const fbm = (x, z, s) => vnoise(x, z, s) * 0.55 + vnoise(x * 2.1, z * 2.1, s + 1) * 0.28 + vnoise(x * 4.3, z * 4.3, s + 2) * 0.17;
const gridPos = k => ({ i: mod(Math.round(-(12 + k * 8) / DS), T.n), lat: (k % 2 ? 1 : -1) * Math.min(3, T.hw * 0.4) });
function pitLaneLat(ii) { const p = T.pit, n = T.n, dIn = mod(ii - p.entry, n), dOut = mod(p.exit - ii, n); if (dIn < 40) return lerp(T.hw - 2, p.off, smooth(dIn / 40)); if (dOut < 40) return lerp(T.hw - 3, p.off, smooth(dOut / 40)); return p.off; }
const inPit = ii => mod(ii - T.pit.entry, T.n) <= mod(T.pit.exit - T.pit.entry, T.n);
function buildCircuit3D(def, rain) {
  clearCircuit3D(); sceneDef = def; sceneRain = rain; trackGroup = new THREE.Group(); scene.add(trackGroup);
  const night = def.night, n = T.n, low = qName === 'low', R = mulberry32(def.id.length * 977 + 13), theme = def.theme;
  // ---- sky, light, fog
  const st = colorLin(def.sky.top), sb = colorLin(def.sky.bot), sc = colorLin(def.sky.sun);
  if (rain) { const grey = new THREE.Color(night ? 0.02 : 0.32, night ? 0.02 : 0.35, night ? 0.04 : 0.4); st.lerp(grey, 0.75); sb.lerp(grey.clone().multiplyScalar(1.4), 0.7); sc.multiplyScalar(0.25); }
  skyMat.uniforms.top.value.copy(st); skyMat.uniforms.bot.value.copy(sb); skyMat.uniforms.sunCol.value.copy(sc); skyMat.uniforms.sunSize.value = night ? 0.35 : 1; skyMat.uniforms.glow.value = night ? 0.25 : 1;
  const e = def.sunEl * Math.PI / 180; sunDir.set(Math.sin(def.sunAz) * Math.cos(e), Math.sin(e), Math.cos(def.sunAz) * Math.cos(e)).normalize();
  stars.visible = night && !rain;
  hemi.color.set(night ? 0x8d9cff : 0xdfe9ff); hemi.groundColor.copy(colorLin(def.ground).multiplyScalar(0.6)); hemi.intensity = night ? 1.1 : rain ? 1.5 : 1.15;
  sun.color.copy(night ? new THREE.Color(0xdfe6ff) : colorLin(def.sky.sun)); sun.intensity = night ? 1.5 : rain ? 0.9 : 2.6;
  scene.fog = new THREE.Fog(sb.clone(), rain ? 60 : 250, rain ? Math.min(700, Q.far) : Q.far); scene.background = null;
  updateEnv(night);
  if (bloomPass) { bloomPass.threshold = night ? 1.0 : 1.6; bloomPass.strength = night ? 0.5 : 0.4; }
  // ---- distance field from the circuit (for terrain + scenery placement)
  const cs = Q.cell, M = 650, x0 = T.minX - M, z0 = T.minZ - M, NX = Math.ceil((T.maxX - T.minX + 2 * M) / cs) + 1, NZ = Math.ceil((T.maxZ - T.minZ + 2 * M) / cs) + 1;
  const D = new Float32Array(NX * NZ).fill(1e9), TY = new Float32Array(NX * NZ), wall = T.wall, rad = wall + 80, rc = Math.ceil(rad / cs);
  for (let i = 0; i < n; i++) { const gx = Math.round((T.X[i] - x0) / cs), gz = Math.round((T.Z[i] - z0) / cs);
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) { const X = gx + a, Z = gz + b; if (X < 0 || Z < 0 || X >= NX || Z >= NZ) continue; const k = Z * NX + X, dx = x0 + X * cs - T.X[i], dz = z0 + Z * cs - T.Z[i], d = Math.hypot(dx, dz); if (d < D[k]) { D[k] = d; TY[k] = T.Y[i]; } } }
  // coarse inverse-distance height for far cells
  const cp = []; for (let i = 0; i < n; i += 20) cp.push([T.X[i], T.Z[i], T.Y[i]]);
  const Hh = new Float32Array(NX * NZ), amp = theme === 'mountain' ? 1 : theme === 'modern' ? 0.12 : 0, water = theme === 'city';
  for (let Z = 0; Z < NZ; Z++) for (let X = 0; X < NX; X++) {
    const k = Z * NX + X, x = x0 + X * cs, z = z0 + Z * cs; let base;
    if (D[k] < 1e8) base = TY[k]; else { let sw = 0, sy = 0; for (const p of cp) { const d2 = (p[0] - x) ** 2 + (p[1] - z) ** 2 + 400, w = 1 / (d2 * d2); sw += w; sy += w * p[2]; } base = sy / sw; }
    Hh[k] = base - 0.35;
  }
  for (let pass = 0; pass < 8; pass++) { const H2 = Hh.slice(); for (let Z = 1; Z < NZ - 1; Z++) for (let X = 1; X < NX - 1; X++) { const k = Z * NX + X; if (D[k] < wall + 6) continue; Hh[k] = (H2[k] * 2 + H2[k - 1] + H2[k + 1] + H2[k - NX] + H2[k + NX]) / 6; } }
  const ctrX = (T.minX + T.maxX) / 2, ctrZ = (T.minZ + T.maxZ) / 2;
  const tPos = new Float32Array(NX * NZ * 3), tCol = new Float32Array(NX * NZ * 3), g1 = colorLin(def.ground), g2 = colorLin(def.ground2), rock = colorLin([118, 112, 104]), snow = colorLin([235, 240, 248]), cc = new THREE.Color();
  for (let Z = 0; Z < NZ; Z++) for (let X = 0; X < NX; X++) {
    const k = Z * NX + X, x = x0 + X * cs, z = z0 + Z * cs, d = D[k], w = smooth(clamp((d - wall - 4) / 140, 0, 1));
    let y = Hh[k] + w * amp * (fbm(x / 180, z / 180, 3) * 70 - 20 + (theme === 'mountain' ? smooth(clamp((d - 200) / 500, 0, 1)) * 160 * fbm(x / 400, z / 400, 7) : 0));
    if (water && z < -40 && d > wall + 3) y = -6;
    tPos[k * 3] = x; tPos[k * 3 + 1] = y; tPos[k * 3 + 2] = z;
    cc.copy(g1).lerp(g2, fbm(x / 60, z / 60, 11));
    if (theme === 'mountain') { const hgt = y - Hh[k]; if (hgt > 25) cc.lerp(rock, clamp((hgt - 25) / 40, 0, 1)); if (y > 190) cc.lerp(snow, clamp((y - 190) / 50, 0, 1)); }
    if (theme === 'city' && d < 1e8) cc.lerp(colorLin([62, 64, 74]), 0.5);
    tCol[k * 3] = cc.r; tCol[k * 3 + 1] = cc.g; tCol[k * 3 + 2] = cc.b;
  }
  const idx = []; for (let Z = 0; Z < NZ - 1; Z++) for (let X = 0; X < NX - 1; X++) { const a = Z * NX + X; idx.push(a, a + NX, a + 1, a + 1, a + NX, a + NX + 1); }
  const tg = tr3(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tCol, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, MAT.matte); terrain.receiveShadow = true; trackGroup.add(terrain);
  const sampleD = (x, z) => { const X = Math.round((x - x0) / cs), Z = Math.round((z - z0) / cs); if (X < 0 || Z < 0 || X >= NX || Z >= NZ) return { d: 1e9, y: 0 }; const k = Z * NX + X; return { d: D[k], y: tPos[k * 3 + 1] }; };
  if (water) { const wm = tr3(new THREE.MeshStandardMaterial({ color: 0x0a1830, roughness: 0.18, metalness: 0.6 })); const wg = tr3(new THREE.PlaneGeometry(6000, 3000).rotateX(-Math.PI / 2)); const wmesh = new THREE.Mesh(wg, low ? tr3(new THREE.MeshPhongMaterial({ color: 0x0a1830, shininess: 90 })) : wm); wmesh.position.set(ctrX, -1.4, -40 - 1500); trackGroup.add(wmesh); }
  // ---- road ribbon (textured asphalt with white edge lines)
  const asphalt = tr3(noiseTex(low ? 256 : 512, rain ? 74 : 92, 30, 4, (g, s, Rr) => { const u = s / 256; for (let i = 0; i < 900 * u; i++) { const v = Rr(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.08 + Rr() * 0.1})` : `rgba(255,255,255,${0.05 + Rr() * 0.07})`; g.fillRect(Rr() * s, Rr() * s, u * (1 + Rr() * 1.5), u * (1 + Rr() * 1.5)); } g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(2 * u, 0, 4 * u, s); g.fillRect(s - 6 * u, 0, 4 * u, s); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + Rr() * 0.05})`; g.fillRect(s * 0.25 + Rr() * s * 0.5 - 3 * u, 0, (3 + Rr() * 4) * u, s); } }));
  { const pos = [], uv = [], ind = []; const p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= n; i++) { const ii = i % n; for (const [lat, u] of [[-T.hw, 0], [T.hw, 1]]) { trackPoint(ii, lat, p); pos.push(p.x, T.Y[ii] + 0.03, p.z); uv.push(u, i * DS / 14); } if (i < n) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ind); g.computeVertexNormals();
    roadMat = tr3(low ? new THREE.MeshLambertMaterial({ map: asphalt, color: rain ? 0xb8bcc4 : 0xffffff }) : new THREE.MeshStandardMaterial({ map: asphalt, roughness: rain ? 0.32 : 0.9, metalness: rain ? 0.15 : 0, color: rain ? 0xaeb4bf : 0xffffff }));
    const road = new THREE.Mesh(g, roadMat); road.receiveShadow = true; trackGroup.add(road); }
  // ---- kerbs, run-off and skirts (vertex coloured quads)
  { const P = [], C = [], pa = { x: 0, z: 0, y: 0 }, pb = { x: 0, z: 0, y: 0 }, pc = { x: 0, z: 0, y: 0 }, pd = { x: 0, z: 0, y: 0 };
    const RED = colorLin([214, 30, 40]), WHT = colorLin([236, 236, 236]), r1 = colorLin(theme === 'modern' ? [104, 108, 118] : theme === 'city' ? [74, 76, 86] : [176, 160, 128]), r2 = theme === 'city' ? colorLin([118, 118, 126]) : g1.clone().multiplyScalar(0.92), grassEdge = colorLin([84, 120, 60]);
    const quad = (i, la, lb, ya, yb, ca, cb) => { const j = (i + 1) % n; trackPoint(i, la, pa); trackPoint(i, lb, pb); trackPoint(j, la, pc); trackPoint(j, lb, pd);
      const Ya = T.Y[i], Yb = T.Y[j]; P.push(pa.x, Ya + ya, pa.z, pc.x, Yb + ya, pc.z, pb.x, Ya + yb, pb.z, pb.x, Ya + yb, pb.z, pc.x, Yb + ya, pc.z, pd.x, Yb + yb, pd.z);
      for (const c of [ca, ca, cb, cb, ca, cb]) C.push(c.r, c.g, c.b); };
    const r1w = theme === 'modern' ? Math.min(10, T.def.runoff * 0.5) : theme === 'city' ? T.def.runoff - 1.5 : 5;
    for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
      const kerb = T.KERB[i], kc = kerb ? ((i >> 1) % 2 ? RED : WHT) : WHT, a = T.hw, b = T.hw + (kerb ? KERB_W : 0.35), c2 = Math.min(wall, b + r1w), d2 = wall + 4;
      const L = v => v * sg, f = (x, y) => sg > 0 ? [x, y] : [y, x];
      const q = (la, lb, ya, yb, ca, cb) => { if (sg > 0) quad(i, la, lb, ya, yb, ca, cb); else quad(i, -lb, -la, yb, ya, cb, ca); };
      q(a, b, 0.04, 0.06, kc, kc); q(b, c2, 0.02, 0.0, r1, r1); q(c2, d2, 0.0, -0.12, r2, theme === 'city' ? r2 : grassEdge); q(d2, d2 + 0.01, -0.12, -3, theme === 'city' ? r2 : grassEdge, grassEdge);
      void L; void f;
    }
    // pit lane surface
    const PL = colorLin([70, 72, 80]), LINE = colorLin([240, 240, 240]), YEL = colorLin([255, 210, 40]);
    for (let k = 0, i = T.pit.entry; k < n && mod(i - T.pit.entry, n) <= mod(T.pit.exit - T.pit.entry, n); k++, i = (i + 1) % n) {
      const lc = pitLaneLat(i), lc2 = pitLaneLat((i + 1) % n), j = (i + 1) % n; trackPoint(i, lc - 3.6, pa); trackPoint(i, lc + 3.6, pb); trackPoint(j, lc2 - 3.6, pc); trackPoint(j, lc2 + 3.6, pd);
      const y0 = T.Y[i] + 0.05, y1 = T.Y[j] + 0.05, box = Math.abs(mod(i - T.pit.box + 4, n)) < 8, cl = box ? YEL : PL;
      P.push(pa.x, y0, pa.z, pc.x, y1, pc.z, pb.x, y0, pb.z, pb.x, y0, pb.z, pc.x, y1, pc.z, pd.x, y1, pd.z); for (let m = 0; m < 6; m++) C.push(cl.r, cl.g, cl.b);
      if (i % 2 === 0) { trackPoint(i, lc - 3.6, pa); trackPoint(i, lc - 3.3, pb); trackPoint(j, lc2 - 3.6, pc); trackPoint(j, lc2 - 3.3, pd); P.push(pa.x, y0 + 0.01, pa.z, pc.x, y1 + 0.01, pc.z, pb.x, y0 + 0.01, pb.z, pb.x, y0 + 0.01, pb.z, pc.x, y1 + 0.01, pc.z, pd.x, y1 + 0.01, pd.z); for (let m = 0; m < 6; m++) C.push(LINE.r, LINE.g, LINE.b); }
    }
    // start line (checkered) + grid slots
    const CB = colorLin([12, 12, 12]);
    for (let k = 0; k < 14; k++) { const la = -T.hw + k * (2 * T.hw / 14), lb = la + 2 * T.hw / 14; for (let r = 0; r < 2; r++) { const i0 = r, cl = (k + r) % 2 ? CB : WHT; trackPoint(i0, la, pa); trackPoint(i0, lb, pb); trackPoint(i0 + 1, la, pc); trackPoint(i0 + 1, lb, pd); const y = T.Y[0] + 0.045; P.push(pa.x, y, pa.z, pc.x, y, pc.z, pb.x, y, pb.z, pb.x, y, pb.z, pc.x, y, pc.z, pd.x, y, pd.z); for (let m = 0; m < 6; m++) C.push(cl.r, cl.g, cl.b); } }
    for (let k = 0; k < 10; k++) { const gp = gridPos(k), i0 = mod(gp.i + 1, n); trackPoint(i0, gp.lat - 1.1, pa); trackPoint(i0, gp.lat + 1.1, pb); trackPoint(i0, gp.lat - 1.1, pc); trackPoint(mod(i0 + 1, n), gp.lat - 1.1, pc); trackPoint(mod(i0 + 1, n), gp.lat + 1.1, pd); const y = T.Y[i0] + 0.045; P.push(pa.x, y, pa.z, pc.x, y, pc.z, pb.x, y, pb.z, pb.x, y, pb.z, pc.x, y, pc.z, pd.x, y, pd.z); for (let m = 0; m < 6; m++) C.push(WHT.r, WHT.g, WHT.b); }
    // sector lines (subtle)
    for (let t = 0; t < P.length; t += 9) for (let q = 0; q < 3; q++) { const a = P[t + 3 + q]; P[t + 3 + q] = P[t + 6 + q]; P[t + 6 + q] = a; const b = C[t + 3 + q]; C[t + 3 + q] = C[t + 6 + q]; C[t + 6 + q] = b; } // upward-facing winding
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, MAT.matte); m.receiveShadow = true; trackGroup.add(m); }
  // ---- barriers (instanced)
  const SCN = sceneryModels(); for (const k in SCN) tr3(SCN[k]);
  const inst = {}; const put = (key, x, y, z, yaw, s = 1, sy = 1, tint) => { (inst[key] || (inst[key] = [])).push([x, y, z, yaw, s, sy, tint]); };
  { const p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i += 2) for (const sg of [-1, 1]) {
      const h = T.H[i], tight = Math.abs(T.K[i]) > 0.006 && Math.sign(T.K[i]) === -sg;
      if (sg > 0 && inPit(i)) { const dIn = mod(i - T.pit.entry, n), dOut = mod(T.pit.exit - i, n); if (dIn > 40 && dOut > 40) { trackPoint(i, wall + 0.6, p); put('concrete', p.x, T.Y[i], p.z, h); } trackPoint(i, T.pit.off + 5, p); put('concrete', p.x, T.Y[i], p.z, h); continue; }
      trackPoint(i, sg * (wall + 0.5), p);
      put(theme === 'city' ? 'concrete' : tight && theme === 'modern' ? 'tyrewall' : 'armco', p.x, T.Y[i], p.z, h);
    } }
  // ---- start gantry with five red lights
  { const p = new Parts(), w = T.hw + 2.5, i0 = 2, h = T.H[i0], pp = { x: 0, y: 0, z: 0 }; trackPoint(i0, 0, pp);
    BX(p, '#3a3f48', -w, 3.6, 0, 0.5, 7.2, 0.5); BX(p, '#3a3f48', w, 3.6, 0, 0.5, 7.2, 0.5); BX(p, '#23262c', 0, 6.9, 0, 2 * w + 0.6, 1.0, 0.6);
    for (let k = 0; k < 5; k++) BX(p, '#0b0b0d', -2.4 + k * 1.2, 6.0, 0.15, 0.8, 1.0, 0.35);
    const g = tr3(p.merge()), m = new THREE.Mesh(g, MAT.carbon); m.position.set(pp.x, T.Y[i0], pp.z); m.rotation.y = h; m.castShadow = true; trackGroup.add(m);
    gantryMats = [];
    for (let k = 0; k < 5; k++) for (let r = 0; r < 2; r++) { const mat = tr3(new THREE.MeshBasicMaterial({ color: 0x220000, toneMapped: false })); if (r === 0) gantryMats.push(mat); else gantryMats[k].userData.twin = mat;
      const l = new THREE.Mesh(tr3(new THREE.CircleGeometry(0.2, 14)), gantryMats[k]); l.position.set(-2.4 + k * 1.2, 6.2 - r * 0.42, -0.04); l.rotation.y = Math.PI; m.add(l); }
    const ban = textTex(512, 64, g2 => { g2.fillStyle = '#101218'; g2.fillRect(0, 0, 512, 64); g2.fillStyle = '#ff6a1a'; g2.fillRect(0, 56, 512, 8); g2.font = 'bold 40px system-ui,sans-serif'; g2.fillStyle = '#fff'; g2.textAlign = 'center'; g2.fillText('VYRONIQ RACING', 256, 44); });
    for (const side of [1, -1]) { const b = new THREE.Mesh(tr3(new THREE.PlaneGeometry(2 * w, 0.95)), tr3(new THREE.MeshBasicMaterial({ map: ban }))); b.position.set(0, 6.9, side * 0.31); if (side < 0) b.rotation.y = Math.PI; m.add(b); } }
  // ---- pit building + grandstands
  { const p = new Parts(), glass = new Parts(), pp = { x: 0, y: 0, z: 0 }, col = theme === 'city' ? '#2b2f3b' : '#d9dde4', roof = theme === 'city' ? '#141722' : '#5b6370';
    for (let k = -30; k < 70; k += 2) { const i = mod(T.pit.box + k, n); if (!inPit(i) || mod(i - T.pit.entry, n) < 42 || mod(T.pit.exit - i, n) < 42) continue; trackPoint(i, T.pit.off + 11, pp); const h = T.H[i];
      _m4.compose(_v1.set(pp.x, T.Y[i], pp.z), _q.setFromEuler(_e.set(0, h, 0)), _v2.set(1, 1, 1));
      const box = (gp, c, x, y, z, sx, sy, sz) => { const g = GEO.box.clone().toNonIndexed(); g.applyMatrix4(new THREE.Matrix4().compose(_v3.set(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz))); g.applyMatrix4(_m4); gp.push(g, c); };
      box(p, col, 0, 3.5, 0, 10, 7, 4.15); box(p, roof, 0, 7.3, 0, 11, 0.6, 4.3); if ((k >> 1) % 2 === 0) box(p, '#08090c', -5.02, 2, 0, 0.1, 4, 3.6); box(glass, night ? [120, 200, 255] : [90, 140, 190], -5.1, 5.6, 0, 0.1, 1.6, 4.1); }
    const g = tr3(p.merge()); if (g) { const m = new THREE.Mesh(g, MAT.matte); m.castShadow = m.receiveShadow = true; trackGroup.add(m); }
    const gg = tr3(glass.merge()); if (gg) trackGroup.add(new THREE.Mesh(gg, night ? MAT.glow : MAT.paint));
    const stands = theme === 'modern' ? [-60, -25, 10, 45, 80] : theme === 'city' ? [-30, 20] : [-20, 25];
    for (const k of stands) { const i = mod(k * 1, n), pt = trackPoint(i, -(wall + 4), { x: 0, y: 0, z: 0 }); put('stand', pt.x, T.Y[i] - 0.3, pt.z, T.H[i] - Math.PI / 2); }
    // extra stands on the outside of the biggest corners
    const corners = []; for (let i = 0; i < n; i += 4) if (Math.abs(T.K[i]) > 0.012 && !corners.some(c => Math.abs(c - i) < 120)) corners.push(i);
    for (const i of corners.slice(0, theme === 'modern' ? 6 : 3)) { const sg = -Math.sign(T.K[i]); if (sg > 0 && inPit(i)) continue; const pt = trackPoint(i, sg * (wall + 6), { x: 0, y: 0, z: 0 }); put('stand', pt.x, T.Y[i] - 0.3, pt.z, T.H[i] + (sg > 0 ? Math.PI / 2 : -Math.PI / 2)); }
  }
  // ---- braking boards and billboards before the heaviest braking zones
  { const prof = speedProfile(carStats('vanta', {}), 1, 0.82), signs = [];
    for (let i = 0; i < n; i++) { const a = prof[mod(i - 75, n)], b = prof[i]; if (a - b > 22 && Math.abs(T.K[mod(i + 10, n)]) > 0.004 && !signs.some(s => Math.abs(mod(s - i + n / 2, n) - n / 2) < 150)) signs.push(i); }
    const brdTex = [150, 100, 50].map(v => textTex(128, 128, g2 => { g2.fillStyle = '#fff'; g2.fillRect(0, 0, 128, 128); g2.fillStyle = '#c8102e'; g2.fillRect(6, 6, 116, 116); g2.fillStyle = '#fff'; g2.font = 'bold 56px system-ui,sans-serif'; g2.textAlign = 'center'; g2.fillText(String(v), 64, 84); }));
    const brdMat = brdTex.map(t => tr3(new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }))), bg = tr3(new THREE.PlaneGeometry(1.4, 1.4));
    const adWords = ['VYRONIQ', 'V-COINS', def.name.toUpperCase(), 'RACE CLEAN', 'APEX MODE'], adTex = adWords.map((w, k) => textTex(512, 128, g2 => { const cols = ['#ff6a1a', '#1e6bff', '#11b37a', '#7b2cff', '#c8102e']; g2.fillStyle = cols[k % 5]; g2.fillRect(0, 0, 512, 128); g2.fillStyle = '#fff'; g2.font = 'bold 72px system-ui,sans-serif'; g2.textAlign = 'center'; g2.fillText(w, 256, 90); }));
    const adMat = adTex.map(t => tr3(new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: !night }))), ag = tr3(new THREE.PlaneGeometry(10, 2.5));
    signs.forEach((si, k) => {
      const sg = (si & 1) ? 1 : -1, side = sg > 0 && inPit(si) ? -1 : sg;
      [150, 100, 50].forEach((dist, m) => { const i = mod(si - Math.round(dist / DS), n), pt = trackPoint(i, side * (T.hw + 2.6), { x: 0, y: 0, z: 0 }); const b = new THREE.Mesh(bg, brdMat[m]); b.position.set(pt.x, T.Y[i] + 1.2, pt.z); b.rotation.y = T.H[i] + Math.PI; trackGroup.add(b); });
      const i = mod(si + 20, n), sgo = -Math.sign(T.K[mod(si + 20, n)]) || 1; if (!(sgo > 0 && inPit(i))) { const pt = trackPoint(i, sgo * (wall + 2.5), { x: 0, y: 0, z: 0 }); const a = new THREE.Mesh(ag, adMat[k % adMat.length]); a.position.set(pt.x, T.Y[i] + 2.4, pt.z); a.lookAt(T.X[mod(i - 40, n)], T.Y[i] + 2.4, T.Z[mod(i - 40, n)]); trackGroup.add(a); }
    }); }
  // ---- scenery scatter by theme
  const scen = Q.scen, place = (count, dMin, dMax, fn) => { let tries = 0, k = 0; while (k < count && tries++ < count * 30) { const x = x0 + R() * (NX - 1) * cs, z = z0 + R() * (NZ - 1) * cs, s = sampleD(x, z); if (s.d < dMin || s.d > dMax) continue; if (water && z < -30) continue; fn(x, s.y, z); k++; } };
  if (theme === 'modern') { place(520 * scen, wall + 10, 700, (x, y, z) => put('tree', x, y, z, R() * 6, 0.8 + R() * 0.7)); place(40 * scen, wall + 14, 400, (x, y, z) => put('rock', x, y, z, R() * 6, 0.8 + R())); }
  if (theme === 'mountain') { place(1100 * scen, wall + 7, 900, (x, y, z) => put('pine', x, y - 0.3, z, R() * 6, 0.7 + R() * 0.8)); place(160 * scen, wall + 6, 600, (x, y, z) => put('rock', x, y, z, R() * 6, 0.6 + R() * 1.6)); }
  if (theme === 'city') {
    const facade = textTex(128, 128, g2 => { g2.fillStyle = '#1a1d27'; g2.fillRect(0, 0, 128, 128); for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) { g2.fillStyle = '#0c0e14'; g2.fillRect(a * 16 + 3, b * 16 + 4, 10, 9); } });
    const winT = textTex(128, 128, g2 => { const Rr = mulberry32(21); g2.fillStyle = '#000'; g2.fillRect(0, 0, 128, 128); for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) if (Rr() < 0.42) { g2.fillStyle = Rr() < 0.7 ? '#ffd9a0' : '#9fd8ff'; g2.fillRect(a * 16 + 3, b * 16 + 4, 10, 9); } });
    facade.wrapS = facade.wrapT = winT.wrapS = winT.wrapT = THREE.RepeatWrapping;
    const bmat = tr3(low ? new THREE.MeshLambertMaterial({ map: facade, emissiveMap: winT, emissive: 0xffffff, emissiveIntensity: 1.3, vertexColors: true }) : new THREE.MeshStandardMaterial({ map: facade, emissiveMap: winT, emissive: 0xffffff, emissiveIntensity: 1.15, roughness: 0.6, metalness: 0.3, vertexColors: true }));
    const bp = [], bu = [], bc = [], neon = new Parts(), NEON = [[255, 40, 200], [0, 230, 255], [255, 170, 40], [140, 80, 255]];
    const addB = (x, y, z, w, h, d, yaw, tint) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(), uv = g.attributes.uv, pos = g.attributes.position; g.applyMatrix4(new THREE.Matrix4().compose(_v1.set(x, y + h / 2, z), _q.setFromEuler(_e.set(0, yaw, 0)), _v2.set(1, 1, 1)));
      for (let f = 0; f < 6; f++) for (let v = 0; v < 6; v++) { const ii = f * 6 + v, fw = f < 2 ? d : w; if (f === 2 || f === 3) uv.setXY(ii, 0.02, 0.02); else uv.setXY(ii, uv.getX(ii) * fw / 16, uv.getY(ii) * h / 16); }
      bp.push(...pos.array); bu.push(...uv.array); for (let v = 0; v < pos.count; v++) bc.push(tint.r, tint.g, tint.b); g.dispose(); };
    const tints = ['#9aa4c0', '#c0b0a0', '#a0b8c8', '#b8b8c8'].map(colorLin);
    place(260 * scen, wall + 14, 650, (x, y, z) => { const w = 14 + R() * 26, d = 14 + R() * 26, h = 14 + R() * R() * 110, yaw = R() * Math.PI; addB(x, y - 0.5, z, w, h, d, yaw, tints[(R() * 4) | 0]); if (R() < 0.45) { const c = NEON[(R() * 4) | 0]; neon.add(GEO.box, c, x, y + h + 0.2, z, 0, yaw, 0, w + 0.3, 0.35, d + 0.3, 2.2); } });
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); g.computeVertexNormals();
    trackGroup.add(new THREE.Mesh(g, bmat)); const ng = tr3(neon.merge()); if (ng) trackGroup.add(new THREE.Mesh(ng, MAT.glow));
    // light towers along the circuit, harbour cranes and containers
    const pt = { x: 0, y: 0, z: 0 }; for (let i = 0; i < n; i += 26) { const sg = (i / 26) % 2 ? 1 : -1, off = sg > 0 && inPit(i) ? T.pit.off + 7 : wall + 3.5; trackPoint(i, sg * off, pt); put('tower', pt.x, T.Y[i], pt.z, T.H[i] + (sg > 0 ? -Math.PI / 2 : Math.PI / 2)); put('towerHead', pt.x, T.Y[i], pt.z, T.H[i] + (sg > 0 ? -Math.PI / 2 : Math.PI / 2)); }
    for (let k = 0; k < 6; k++) put('crane', -300 + k * 160, 0, -52, Math.PI / 2);
    const cc2 = ['#c0392b', '#2471a3', '#d4ac0d', '#1e8449', '#7d3c98', '#d35400'].map(colorLin);
    for (let k = 0; k < 40 * scen; k++) { const x = -420 + R() * 1100, z = -36 - R() * 0; if (x > -40 && x < 470) continue; put('container', x, -1 + ((k % 3) * 2.6) * 0, z - (k % 2) * 3, Math.PI / 2 * 0 + (R() < 0.5 ? 0 : Math.PI), 1, 1, cc2[k % 6]); }
  }
  if (theme === 'modern' || theme === 'mountain') { // a few floodlight-free light poles / marshal posts
    const pt = { x: 0, y: 0, z: 0 }; for (let i = 40; i < n; i += 160) { const sg = (i / 160) % 2 ? 1 : -1; if (sg > 0 && inPit(i)) continue; trackPoint(i, sg * (wall + 2.2), pt); put('tyrewall', pt.x, T.Y[i], pt.z, T.H[i]); }
  }
  // instanced meshes
  const _mx = new THREE.Matrix4(), _cl = new THREE.Color();
  for (const key in inst) {
    const L = inst[key], geo = SCN[key]; if (!geo) continue;
    const mat = key === 'towerHead' ? MAT.glow : key === 'tree' || key === 'pine' || key === 'rock' ? MAT.flat : MAT.matte;
    const im = new THREE.InstancedMesh(geo, mat, L.length);
    L.forEach((o, k) => { _mx.compose(_v1.set(o[0], o[1], o[2]), _q.setFromEuler(_e.set(0, o[3], 0)), _v2.set(o[4], o[4] * o[5], o[4])); im.setMatrixAt(k, _mx); if (o[6]) im.setColorAt(k, o[6]); else if (key === 'tree' || key === 'pine') im.setColorAt(k, _cl.setScalar(0.8 + hash(k) * 0.4)); });
    im.castShadow = key === 'stand' || key === 'tree' || key === 'pine' || key === 'crane'; im.receiveShadow = key !== 'towerHead'; im.computeBoundingSphere(); trackGroup.add(im);
  }
  // ---- distant backdrop. City: skyline blocks. Others: layered mountain / hill silhouettes on rings beyond the terrain.
  // (These used to be giant flat-shaded cones up to 1.7 km wide whose bases reached over the circuit: from the track
  // they showed up as a huge flat lavender slab filling the view. The rings below sit outside the terrain, take no fog,
  // and are pre-blended towards the horizon colour for aerial perspective, so they always read as far-away ridges.)
  const halfDiag = Math.hypot(T.maxX - T.minX, T.maxZ - T.minZ) / 2;
  if (theme === 'city') { const p = new Parts(), rr = halfDiag + 700, far = colorLin(def.far);
    for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2 + R() * 0.2, r = rr + R() * 500, x = ctrX + Math.cos(a) * r, z = ctrZ + Math.sin(a) * r; if (Math.sin(a) < -0.2) continue; const w = 40 + R() * 80, h = 60 + R() * 200; BX(p, far, x, h / 2 - 5, z, w, h, w, 0, a, 0, 0.7); }
    const g = tr3(p.merge()); if (g) trackGroup.add(new THREE.Mesh(g, tr3(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })))); }
  else {
    let ySum = 0; for (let i = 0; i < n; i += 10) ySum += T.Y[i]; const baseY = ySum / Math.ceil(n / 10) - 30;
    const hz = sb.clone(), farC = colorLin(def.far), snowC = colorLin([236, 240, 248]), rockC = farC.clone().multiplyScalar(0.8), green = colorLin(def.ground).multiplyScalar(0.7);
    const R0 = halfDiag + 650 + 450, layers = theme === 'mountain'
      ? [{ r: R0 + 1500, hMax: 820, hMin: 220, haze: 0.62, f: 5, seed: 31, snow: 0.62 }, { r: R0 + 700, hMax: 560, hMin: 120, haze: 0.42, f: 7, seed: 17, snow: 0.72 }, { r: R0, hMax: 260, hMin: 40, haze: 0.22, f: 11, seed: 5, snow: 2, tint: green }]
      : [{ r: R0 + 600, hMax: 170, hMin: 30, haze: 0.6, f: 6, seed: 13, snow: 2 }, { r: R0, hMax: 95, hMin: 15, haze: 0.38, f: 9, seed: 7, snow: 2, tint: green }];
    const pos = [], col = [], ind = []; let base = 0; const SEG = 360, ROWS = 6, sAz = def.sunAz, cl = new THREE.Color();
    for (const L of layers) {
      const hts = new Float32Array(SEG + 1);
      for (let k = 0; k <= SEG; k++) { const a = k / SEG * Math.PI * 2, nx = Math.cos(a) * L.f, nz = Math.sin(a) * L.f; const rdg = 1 - Math.abs(fbm(nx, nz, L.seed) * 2 - 1); hts[k] = L.hMin + (L.hMax - L.hMin) * Math.pow(rdg, 1.6) * (0.55 + 0.45 * fbm(nx * 0.37 + 9, nz * 0.37, L.seed + 3)); }
      for (let k = 0; k <= SEG; k++) {
        const a = k / SEG * Math.PI * 2, x = ctrX + Math.cos(a) * L.r, z = ctrZ + Math.sin(a) * L.r, h = hts[k];
        const slope = (hts[(k + 1) % SEG] - hts[(k + SEG - 1) % SEG]) / (2 * L.r * Math.PI * 2 / SEG), lit = clamp(0.92 + slope * 1.4 * Math.sin(a - sAz), 0.7, 1.12);
        for (let r = 0; r <= ROWS; r++) {
          const t = r / ROWS, y = baseY - 120 + (h + 120) * t; pos.push(x, y, z);
          cl.copy(L.tint || rockC).lerp(farC, L.tint ? 0.35 : 0.5); if (t > L.snow && h > L.hMax * 0.55) cl.lerp(snowC, smooth(clamp((t - L.snow) / (1 - L.snow) * 1.6, 0, 1)) * 0.85);
          cl.multiplyScalar(lit); cl.lerp(hz, clamp(L.haze + (1 - t) * 0.35, 0, 0.96)); col.push(cl.r, cl.g, cl.b);
        }
      }
      for (let k = 0; k < SEG; k++) for (let r = 0; r < ROWS; r++) { const i0 = base + k * (ROWS + 1) + r, i1 = i0 + ROWS + 1; ind.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
      base += (SEG + 1) * (ROWS + 1);
    }
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(ind);
    const bm = new THREE.Mesh(g, tr3(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }))); bm.renderOrder = -5; bm.frustumCulled = false; trackGroup.add(bm);
  }
  rainLines.visible = rain; rainLines.geometry.setDrawRange(0, Q.rain * 2);
}
function setGantry(nOn, green) { gantryMats.forEach((m, k) => { const c = green ? 0x0b2a0b : (k < nOn ? 0xff1a1a : 0x220000); m.color.setHex(c); if (m.userData.twin) m.userData.twin.color.setHex(c); }); }

// ---------------------------------------------------------------- car meshes in the race
function placeCar3D(o, c, dt) {
  o.position.set(c.x, c.y + 0.02, c.z); o.rotation.y = c.h;
  const sl = T.SL[c.i] || 0; o.rotation.x = lerp(o.rotation.x, -Math.atan(sl), clamp(dt * 8, 0, 1));
  const ud = o.userData, ch = ud.chassis; if (!ch) return;
  const latG = clamp((c.yaw || 0) * (c.vLong || 0) / G, -3, 3), k6 = clamp(dt * 7, 0, 1);
  ch.rotation.z = lerp(ch.rotation.z, clamp(latG * 0.022, -0.06, 0.06), k6); // body roll towards the outside of the turn
  ch.rotation.x = lerp(ch.rotation.x, clamp(-(c.aLong || 0) * 0.0032, -0.035, 0.035), k6); // nose dives under braking, squats on throttle
  ch.position.y = c.kerb && c.speed > 15 ? Math.random() * 0.03 : 0;
  const vis = c.drift === 1 ? -c.driftDir * 0.55 + c.steer * 0.2 : c.steer; ud.vSteer = lerp(ud.vSteer || 0, vis, clamp(dt * 14, 0, 1)); // counter-steer while drifting
  for (const w of ud.wheels) { w.m.rotation.x += (c.speed || 0) * Math.sign(c.vLong || 1) * dt / w.r * (c.spin && !w.front ? 1.5 : 1) * (c.lock ? 0 : 1); if (w.front) w.g.rotation.y = -ud.vSteer * 0.42; }
  if (ud.ringMat) { const tc = (TYRES[c.tyre] || TYRES.medium).col; if (ud.tyreCol !== tc) { ud.ringMat.color.set(tc); ud.tyreCol = tc; } }
  if (ud.lights) ud.lights.visible = sceneRain ? (performance.now() % 500 < 250) : c.boostT > 0 || (c.input.brake > 0.5 && c.speed > 5);
}
// ---------------------------------------------------------------- particles
function emit(x, y, z, vx, vy, vz, life, r, g, b) {
  const P = parts.userData, i = P.i; P.i = (P.i + 1) % P.n; parts.geometry.attributes.position.setXYZ(i, x, y, z);
  P.life[i] = P.max[i] = life; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz; P.col[i * 3] = r; P.col[i * 3 + 1] = g; P.col[i * 3 + 2] = b;
}
function updateParticles(dt) {
  if (smoke) updateSmoke(dt);
  const P = parts.userData, pos = parts.geometry.attributes.position, col = parts.geometry.attributes.color;
  for (let i = 0; i < P.n; i++) { if (P.life[i] <= 0) { if (col.getX(i) || col.getY(i) || col.getZ(i)) col.setXYZ(i, 0, 0, 0); continue; }
    P.life[i] -= dt; const t = clamp(P.life[i] / P.max[i], 0, 1); P.vel[i * 3 + 1] -= dt * 1.5;
    pos.setXYZ(i, pos.getX(i) + P.vel[i * 3] * dt, pos.getY(i) + P.vel[i * 3 + 1] * dt, pos.getZ(i) + P.vel[i * 3 + 2] * dt); col.setXYZ(i, P.col[i * 3] * t, P.col[i * 3 + 1] * t, P.col[i * 3 + 2] * t); }
  pos.needsUpdate = col.needsUpdate = true;
}
function carEffects(c, dt) {
  if (!c.speed || settings.rm && !sceneRain) return;
  const f0 = Math.sin(c.h), f1 = Math.cos(c.h), bx = c.x - f0 * 2.6, bz = c.z - f1 * 2.6;
  if (sceneRain && c.speed > 12 && Math.random() < c.speed / 50) emit(bx + (Math.random() - 0.5) * 1.8, c.y + 0.4, bz, -f0 * 3 + (Math.random() - 0.5) * 2, 0.8 + Math.random(), -f1 * 3 + (Math.random() - 0.5) * 2, 0.7, 0.35, 0.38, 0.42);
  if (c.off && c.speed > 8 && Math.random() < 0.6) { const dust = sceneDef.theme === 'city' ? [0.3, 0.3, 0.32] : [0.5, 0.42, 0.28]; emit(bx, c.y + 0.3, bz, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 0.9, ...dust); }
  if (c.boostT > 0 && Math.random() < 0.8) emit(c.x - f0 * 2.4, c.y + 0.45, c.z - f1 * 2.4, -f0 * 4 + (Math.random() - 0.5), 0.2, -f1 * 4 + (Math.random() - 0.5), 0.35, 0.2, 0.7, 1.4);
  // sliding tyres: smoke + skid marks (near the camera only)
  const slideAmt = c.drift ? 0.6 + c.driftB * 1.2 : c.lock ? 0.7 : c.spin && c.speed > 3 ? 0.6 : Math.abs(c.vLat || 0) > 2.4 && c.speed > 10 ? 0.4 : 0;
  const near = (c.x - camera.position.x) ** 2 + (c.z - camera.position.z) ** 2 < 150 * 150, ud = c.obj && c.obj.userData, zr = ud && ud.zr || -1.6;
  if (!c.skid) c.skid = [null, null];
  for (let s = 0; s < 2; s++) {
    const side = s ? 0.84 : -0.84, r0 = -f1, r1 = f0, wx = c.x + f0 * zr - r0 * side, wz = c.z + f1 * zr - r1 * side; // rear tyre contact patch (lat sign: +side is the car's left)
    if (slideAmt > 0 && near && !c.off && !sceneRain) {
      const prev = c.skid[s]; if (prev && (wx - prev[0]) ** 2 + (wz - prev[1]) ** 2 > 0.36) { skidQuad(prev[0], prev[1], wx, wz, c.y + 0.075, Math.min(0.75, 0.35 + slideAmt * 0.4)); c.skid[s] = [wx, wz]; } else if (!prev) c.skid[s] = [wx, wz];
      if (Math.random() < 0.35 + slideAmt * 0.5) emitSmoke(wx, c.y + 0.35, wz, c.vx * 0.15 + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.6, c.vz * 0.15 + (Math.random() - 0.5) * 1.5, 1.1 + Math.random() * 0.6, sceneDef.night ? 0.5 : 0.85, Math.min(0.55, 0.22 + slideAmt * 0.3));
    } else c.skid[s] = null;
  }
}
function skidQuad(x0, z0, x1, z1, y, a) {
  const U = skids.userData, i = U.i; U.i = (U.i + 1) % U.n; const P = skids.geometry.attributes.position, C = skids.geometry.attributes.color;
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L * 0.2, nz = dx / L * 0.2, v = [x0 - nx, z0 - nz, x0 + nx, z0 + nz, x1 - nx, z1 - nz, x1 + nx, z1 + nz];
  const o = i * 18, q = [0, 2, 1, 1, 2, 3]; for (let k = 0; k < 6; k++) { P.array[o + k * 3] = v[q[k] * 2]; P.array[o + k * 3 + 1] = y; P.array[o + k * 3 + 2] = v[q[k] * 2 + 1]; }
  for (let k = 0; k < 6; k++) C.array.set([0.03, 0.03, 0.035, a], i * 24 + k * 4);
  P.needsUpdate = C.needsUpdate = true;
}
function emitSmoke(x, y, z, vx, vy, vz, life, shade, a) {
  const S = smoke.userData, i = S.i; S.i = (S.i + 1) % S.n; smoke.geometry.attributes.position.setXYZ(i, x, y, z); S.life[i] = S.max[i] = life; S.vel[i * 3] = vx; S.vel[i * 3 + 1] = vy; S.vel[i * 3 + 2] = vz;
  smoke.geometry.attributes.color.setXYZW(i, shade, shade, shade * 1.02, a);
}
function updateSmoke(dt) {
  const S = smoke.userData, pos = smoke.geometry.attributes.position, col = smoke.geometry.attributes.color; let any = false;
  for (let i = 0; i < S.n; i++) { if (S.life[i] <= 0) { if (col.getW(i)) col.setW(i, 0); continue; } any = true; S.life[i] -= dt; const t = clamp(S.life[i] / S.max[i], 0, 1), d = Math.exp(-dt * 1.6);
    S.vel[i * 3] *= d; S.vel[i * 3 + 2] *= d; pos.setXYZ(i, pos.getX(i) + S.vel[i * 3] * dt, pos.getY(i) + S.vel[i * 3 + 1] * dt, pos.getZ(i) + S.vel[i * 3 + 2] * dt); col.setW(i, col.getW(i) * (t > 0.02 ? Math.pow(t, dt * 2.2) : 0)); }
  pos.needsUpdate = col.needsUpdate = true; void any;
}
function sparks(x, y, z, n) { for (let k = 0; k < n; k++) emit(x, y + 0.3, z, (Math.random() - 0.5) * 8, 1 + Math.random() * 3, (Math.random() - 0.5) * 8, 0.4 + Math.random() * 0.3, 1.6, 1.0, 0.3); }

// ---------------------------------------------------------------- cameras
const cam = { h: 0, y: 0, init: false, shake: 0, fov: 62, lx: 0, lz: 0, px: null, py: 0, pz: 0 };
function updateCamera(c, dt, mode, snap) {
  if (!c) return;
  const sp = c.speed || 0, vh = sp > 3 ? Math.atan2(c.vx, c.vz) : c.h, ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  // look between where the car points and where it is actually going (shows the drift angle, keeps the road ahead in view)
  const tgtH = c.h + ad(c.h, vh) * (c.drift ? 0.6 : 0.3);
  if (snap || !cam.init || Math.hypot(c.x - cam.lx, c.z - cam.lz) > 25) { cam.h = tgtH; cam.y = c.y; cam.init = true; cam.px = null; }
  cam.lx = c.x; cam.lz = c.z;
  cam.h += ad(cam.h, tgtH) * clamp(dt * (mode === 'far' ? 4 : 5.5), 0, 1); cam.y = lerp(cam.y, c.y, clamp(dt * 5, 0, 1));
  const f0 = Math.sin(cam.h), f1 = Math.cos(cam.h);
  let fov = 60 + (settings.rm ? 0 : clamp(sp / 90, 0, 1) * 11 + (c.boostT > 0 ? 5 : 0));
  if (mode === 'cockpit' || mode === 'tcam') {
    const lift = mode === 'cockpit' ? 1.12 : 1.4, back = mode === 'cockpit' ? -0.12 : -0.62, h = c.h, cf0 = Math.sin(h), cf1 = Math.cos(h);
    camera.position.set(c.x + cf0 * back, c.y + lift, c.z + cf1 * back); camera.rotation.set(-0.07 + Math.atan(T.SL[c.i] || 0) * 0.8, h + Math.PI, -clamp((c.yaw || 0) * 0.03, -0.04, 0.04) * (settings.rm ? 0 : 1)); fov += 6; cam.px = null;
  } else {
    const dist = (mode === 'far' ? 10.5 : 7.4) + clamp(sp / 90, 0, 1) * 0.6, up = mode === 'far' ? 3.6 : 2.5;
    const tx = c.x - f0 * dist, ty = cam.y + up + (c.y - cam.y) * 0.5, tz = c.z - f1 * dist;
    // critically damped follow: no jitter from the 100 Hz physics, small lag under acceleration
    if (cam.px == null) { cam.px = tx; cam.py = ty; cam.pz = tz; } else { const k = 1 - Math.exp(-dt * 14); cam.px += (tx - cam.px) * k; cam.py += (ty - cam.py) * k; cam.pz += (tz - cam.pz) * k; }
    camera.position.set(cam.px, cam.py, cam.pz);
    camera.lookAt(c.x + f0 * 5, c.y + 1.0, c.z + f1 * 5);
  }
  if (cam.shake > 0 && !settings.rm) { camera.position.x += (Math.random() - 0.5) * cam.shake; camera.position.y += (Math.random() - 0.5) * cam.shake; cam.shake = Math.max(0, cam.shake - dt * 2); }
  cam.fov = lerp(cam.fov, fov, clamp(dt * 3, 0, 1)); if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  skyMesh.position.copy(camera.position); stars.position.copy(camera.position);
  // shadow box follows the camera target
  sun.target.position.set(c.x + f0 * 18, c.y, c.z + f1 * 18); sun.position.copy(sun.target.position).addScaledVector(sunDir, 160); sun.target.updateMatrixWorld();
  if (rainLines.visible) { const U = rainLines.userData, pos = rainLines.geometry.attributes.position, t = performance.now() / 1000, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, cnt = Math.min(U.n, Q.rain);
    for (let i = 0; i < cnt; i++) { const ox = U.off[i * 3], oz = U.off[i * 3 + 2], y = mod(U.off[i * 3 + 1] - t * 22, 24) - 6; const x = cx + mod(ox - cx * 0, 60) - 30 + 0, z = cz + oz; pos.setXYZ(i * 2, x, cy + y, z); pos.setXYZ(i * 2 + 1, x - (c.vx || 0) * 0.02, cy + y + 0.7, z - (c.vz || 0) * 0.02); }
    pos.needsUpdate = true; }
}
function render3D() { if (composer && Q.bloom) { renderPass.scene = scene; renderPass.camera = camera; composer.render(); } else renderer.render(scene, camera); }

// ---------------------------------------------------------------- showroom scene (menus) rendered by the same renderer
function initShowroom() {
  gScene = new THREE.Scene(); gCam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
  gScene.background = new THREE.Color(0x07080c); gScene.fog = new THREE.Fog(0x07080c, 14, 40);
  gScene.add(new THREE.HemisphereLight(0xc8d6ff, 0x1a1f2c, 1.1));
  const d = new THREE.DirectionalLight(0xffffff, 2.8); d.position.set(4, 8, 5); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); gScene.add(d);
  const rim = new THREE.DirectionalLight(0xff8a3d, 1.6); rim.position.set(-5, 3, -5); gScene.add(rim); const rim2 = new THREE.DirectionalLight(0x3db8ff, 1.2); rim2.position.set(5, 2, -4); gScene.add(rim2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 0.35, metalness: 0.4 })); floor.receiveShadow = true; gScene.add(floor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x1a1e29, roughness: 0.4, metalness: 0.6 })); disc.position.y = 0.06; disc.receiveShadow = true; gScene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.66, 0.03, 6, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false })); ring.position.y = 0.12; gScene.add(ring);
  for (let k = 0; k < 7; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 14), new THREE.MeshBasicMaterial({ color: 0xdde6ff, toneMapped: false })); bar.position.set(-6 + k * 2, 9, 0); gScene.add(bar); }
  const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x404858, side: THREE.BackSide }))); for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); p.position.set(-4 + k * 4, 8, 0); p.rotation.x = Math.PI / 2; es.add(p); }
  gEnv = pmrem.fromScene(es, 0.02).texture; gScene.environment = gEnv; gScene.environmentIntensity = 0.9;
}
function setShowroomCar(carId, liv) {
  if (!renderer) return; const key = carId + JSON.stringify(liv) + qName;
  if (key === gKey && gCar) return; if (gCar) { gScene.remove(gCar); disposeCar3D(gCar); }
  gCar = makeCar3D(carId, liv, liv.a); gCar.traverse(m => { if (m.isMesh) m.castShadow = true; }); gCar.position.y = 0.12; gScene.add(gCar); gKey = key;
}
function renderShowroom(dt, view) {
  if (!renderer || !gCar) return; if (!settings.rm) gT += dt * 0.35;
  const a = (view && view.angle != null) ? view.angle : 0.8 + gT, d = view && view.dist || 8.6, ox = view && view.ox || 0;
  gCam.position.set(Math.sin(a) * d, 2.2, Math.cos(a) * d); gCam.lookAt(0, 0.55, 0);
  const r = new THREE.Vector3().setFromMatrixColumn(gCam.matrixWorld, 0); gCam.position.addScaledVector(r, -ox); // shift car sideways on screen
  for (const w of gCar.userData.wheels) if (w.front) w.g.rotation.y = settings.rm ? 0.2 : Math.sin(gT * 0.6) * 0.3;
  renderer.render(gScene, gCam);
}
