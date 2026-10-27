// ---------------------------------------------------------------- procedural models (vertex-coloured, merged)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
function colorLin(c) { return Array.isArray(c) ? new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace) : (c instanceof THREE.Color ? c.clone() : new THREE.Color(c)); }
class Parts {
  constructor() { this.L = []; }
  push(g, col, mul = 1) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); const c = colorLin(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r * mul; a[i * 3 + 1] = c.g * mul; a[i * 3 + 2] = c.b * mul; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); this.L.push(g); return this; }
  add(geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, mul = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _m4.compose(_v1.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _v2.set(sx, sy, sz)); g.applyMatrix4(_m4); return this.push(g, col, mul);
  }
  tube(a, b, r, col, seg = 6) { const d = _v3.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-4) return this; const g = new THREE.CylinderGeometry(r, r, len, seg).toNonIndexed(); _q.setFromUnitVectors(_v2.set(0, 1, 0), d.normalize()); _m4.compose(_v1.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _v2.set(1, 1, 1)); g.applyMatrix4(_m4); return this.push(g, col); }
  // tapered box from z0 to z1 (widths, heights and centre heights at each end)
  taper(z0, z1, w0, w1, h0, h1, y0, y1, col, x = 0) {
    const p = [[-w0 / 2, y0 - h0 / 2, z0], [w0 / 2, y0 - h0 / 2, z0], [w0 / 2, y0 + h0 / 2, z0], [-w0 / 2, y0 + h0 / 2, z0], [-w1 / 2, y1 - h1 / 2, z1], [w1 / 2, y1 - h1 / 2, z1], [w1 / 2, y1 + h1 / 2, z1], [-w1 / 2, y1 + h1 / 2, z1]].map(q => [q[0] + x, q[1], q[2]]);
    const f = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]], pos = [];
    for (const [a, b, c, d] of f) pos.push(...p[a], ...p[c], ...p[b], ...p[a], ...p[d], ...p[c]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return this.push(g, col);
  }
  merge() { if (!this.L.length) return null; const g = mergeGeometries(this.L); this.L.forEach(x => x.dispose()); this.L = []; g.computeBoundingSphere(); return g; }
}
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 16, 12), sphLo: new THREE.SphereGeometry(1, 8, 6), cyl: new THREE.CylinderGeometry(1, 1, 1, 16), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), cone: new THREE.ConeGeometry(1, 1, 8), ico: new THREE.IcosahedronGeometry(1, 1) };
const BX = (p, col, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, mul = 1) => p.add(GEO.box, col, x, y, z, rx, ry, rz, sx, sy, sz, mul);
const CARBON = '#17181c', DARKG = '#2a2d33', SILVER = '#aeb4bd';

// ---------------------------------------------------------------- open-wheel car (faces +Z, origin at ground centre)
const CAR_SHAPE = { // small per-class differences in proportions
  D: { nose: 0.36, pod: 0.42, rw: 0.95, fw: 1.8, fin: 0, len: 1 }, C: { nose: 0.33, pod: 0.44, rw: 1.0, fw: 1.85, fin: 0.25, len: 1.02 },
  B: { nose: 0.3, pod: 0.46, rw: 1.02, fw: 1.9, fin: 0.35, len: 1.04 }, A: { nose: 0.27, pod: 0.48, rw: 1.05, fw: 1.95, fin: 0.45, len: 1.06 }, S: { nose: 0.24, pod: 0.5, rw: 1.08, fw: 2.0, fin: 0.55, len: 1.08 }
};
const MAT = {};
function initMaterials(low) {
  for (const k in MAT) MAT[k].dispose();
  const P = (o) => low ? new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, shininess: o.sh || 40, specular: o.spec || 0x333333 }, o.x || {})) : new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: o.r, metalness: o.m }, o.x || {}));
  MAT.paint = P({ r: 0.3, m: 0.35, sh: 90, spec: 0x666666 }); MAT.carbon = P({ r: 0.45, m: 0.3 }); MAT.tyre = P({ r: 0.8, m: 0.05, sh: 10, spec: 0x111111 });
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  MAT.matte = low ? new THREE.MeshLambertMaterial({ vertexColors: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  MAT.flat = low ? new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
  MAT.ghost = new THREE.MeshBasicMaterial({ color: 0x5fd7ff, transparent: true, opacity: 0.32, depthWrite: false });
}
function buildCarGeos(cls, liv, helmet) {
  const S = CAR_SHAPE[cls] || CAR_SHAPE.D, P = liv.p, S2 = liv.s, A = liv.a, pat = liv.pat, body = new Parts(), carbon = new Parts(), lights = new Parts();
  const L = S.len, zf = 1.75 * L, zr = -1.65 * L;
  // floor + diffuser + plank
  BX(carbon, CARBON, 0, 0.09, -0.2, 1.45, 0.05, 3.3 * L); BX(carbon, CARBON, 0, 0.2, zr - 0.5, 1.0, 0.16, 0.45, -0.25);
  // monocoque + nose
  const noseC = pat === 'arrow' ? S2 : P;
  body.taper(-0.7, 1.05 * L, 0.78, 0.52, 0.52, 0.36, 0.45, 0.42, P);
  body.taper(1.05 * L, 2.5 * L, 0.5, S.nose * 0.55, 0.34, 0.16, 0.42, 0.26, noseC);
  if (pat === 'arrow') body.taper(1.6 * L, 2.52 * L, 0.3, 0.06, 0.02, 0.02, 0.36, 0.35, A);
  if (pat === 'stripe') { body.taper(-0.7, 2.45 * L, 0.14, 0.06, 0.02, 0.02, 0.71, 0.35, A); }
  // cockpit rim + driver
  BX(body, CARBON, 0, 0.7, -0.2, 0.56, 0.06, 0.8); body.add(GEO.sph, helmet, 0, 0.86, -0.32, 0, 0, 0, 0.17, 0.16, 0.19); BX(body, '#0d1622', 0, 0.88, -0.17, 0.24, 0.07, 0.1, 0.1);
  body.add(GEO.sph, A, 0, 0.92, -0.33, 0, 0, 0, 0.09, 0.06, 0.15);
  // sidepods
  const podC = pat === 'split' ? S2 : P;
  for (const sx of [-1, 1]) { body.taper(-1.0, 0.7, S.pod, S.pod * 0.9, 0.3, 0.42, 0.3, 0.4, podC, sx * 0.62); BX(carbon, CARBON, sx * 0.62, 0.52, 0.72, S.pod * 0.85, 0.22, 0.04); if (pat === 'split' || pat === 'solid') body.taper(-0.9, 0.6, 0.02, 0.02, 0.06, 0.06, 0.38, 0.45, A, sx * (0.62 + S.pod / 2)); }
  // engine cover, airbox, fin
  const ecC = pat === 'halo' || pat === 'split' ? S2 : P;
  body.taper(-2.0 * L, -0.55, 0.32, 0.62, 0.32, 0.62, 0.5, 0.62, ecC);
  BX(body, ecC, 0, 1.06, -0.62, 0.28, 0.3, 0.42); BX(carbon, CARBON, 0, 1.12, -0.42, 0.2, 0.16, 0.04);
  if (S.fin) BX(body, A, 0, 0.95, -1.35 * L, 0.025, 0.34, 1.2 * S.fin + 0.4);
  // halo
  const halo = new THREE.TorusGeometry(0.4, 0.035, 6, 18, Math.PI); body.add(halo, pat === "halo" ? A : CARBON, 0, 0.98, -0.18, Math.PI / 2, 0, 0, 1, 1.15, 1);
  body.tube([0, 0.98, 0.28], [0, 0.72, 0.42], 0.035, pat === 'halo' ? A : CARBON);
  // front wing
  const fw = S.fw; BX(body, S2, 0, 0.13, 2.4 * L, fw, 0.035, 0.42); BX(body, S2, 0, 0.2, 2.28 * L, fw * 0.92, 0.03, 0.22, -0.35); BX(carbon, CARBON, 0, 0.26, 2.2 * L, fw * 0.85, 0.025, 0.12, -0.6);
  for (const sx of [-1, 1]) BX(body, A, sx * fw / 2, 0.2, 2.35 * L, 0.025, 0.22, 0.5);
  // rear wing
  const rw = S.rw; BX(body, S2, 0, 0.98, zr - 0.62, rw, 0.05, 0.4, 0.12); BX(body, A, 0, 1.08, zr - 0.72, rw, 0.035, 0.2, 0.35);
  for (const sx of [-1, 1]) BX(body, S2, sx * rw / 2, 0.86, zr - 0.6, 0.03, 0.55, 0.62);
  carbon.tube([0, 0.5, zr - 0.2], [0, 0.96, zr - 0.6], 0.03, CARBON);
  // suspension wishbones + mirrors
  for (const sx of [-1, 1]) {
    carbon.tube([sx * 0.3, 0.42, 1.1 * L], [sx * 0.86, 0.34, zf], 0.022, CARBON); carbon.tube([sx * 0.3, 0.3, 1.5 * L], [sx * 0.86, 0.3, zf], 0.022, CARBON);
    carbon.tube([sx * 0.45, 0.5, -1.4], [sx * 0.86, 0.38, zr], 0.022, CARBON); carbon.tube([sx * 0.45, 0.28, -1.0], [sx * 0.86, 0.3, zr], 0.022, CARBON);
    BX(body, P, sx * 0.48, 0.78, 0.2, 0.12, 0.06, 0.05); carbon.tube([sx * 0.33, 0.7, 0.25], [sx * 0.46, 0.76, 0.2], 0.012, CARBON);
  }
  // rain light + T-cam
  lights.add(GEO.box, [255, 40, 40], 0, 0.42, zr - 0.72, 0, 0, 0, 0.16, 0.08, 0.03, 2.5);
  BX(body, A, 0, 1.24, -0.62, 0.16, 0.04, 0.08);
  return { body: body.merge(), carbon: carbon.merge(), lights: lights.merge(), zf, zr };
}
const wheelGeoCache = {};
function wheelGeo(r, w) {
  const k = r + '|' + w; if (wheelGeoCache[k]) return wheelGeoCache[k];
  const p = new Parts(); p.add(GEO.cyl, '#121214', 0, 0, 0, 0, 0, Math.PI / 2, r, w, r);
  p.add(GEO.cyl, '#26282c', 0, 0, 0, 0, 0, Math.PI / 2, r * 0.68, w + 0.01, r * 0.68);
  for (let k2 = 0; k2 < 5; k2++) p.add(GEO.box, SILVER, 0, 0, 0, k2 * Math.PI / 5, 0, 0, w + 0.02, r * 1.2, 0.035);
  p.add(GEO.cyl, SILVER, 0, 0, 0, 0, 0, Math.PI / 2, 0.06, w + 0.03, 0.06);
  return (wheelGeoCache[k] = p.merge());
}
const ringGeoCache = {};
function ringGeo(r, w) { const k = r + '|' + w; if (!ringGeoCache[k]) { const g = new THREE.TorusGeometry(r * 0.8, 0.018, 4, 24); const g2 = g.clone(); g.rotateY(Math.PI / 2); g.translate(w / 2 + 0.006, 0, 0); g2.rotateY(Math.PI / 2); g2.translate(-w / 2 - 0.006, 0, 0); ringGeoCache[k] = mergeGeometries([g, g2]); } return ringGeoCache[k]; }
function makeCar3D(carId, liv, helmet, ghost) {
  const c = CAR(carId), g = buildCarGeos(c.cls, liv, helmet || '#ffffff'), root = new THREE.Group(), chassis = new THREE.Group(); root.add(chassis);
  const mats = ghost ? [MAT.ghost, MAT.ghost, MAT.ghost] : [MAT.paint, MAT.carbon, MAT.glow];
  const body = new THREE.Mesh(g.body, mats[0]), carb = new THREE.Mesh(g.carbon, mats[1]), lt = new THREE.Mesh(g.lights, mats[2]);
  chassis.add(body, carb, lt); body.castShadow = carb.castShadow = !ghost;
  const wheels = [], rings = [], ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const W = [[0.86, 0.33, g.zf, 0.3, true], [-0.86, 0.33, g.zf, 0.3, true], [0.84, 0.36, g.zr, 0.4, false], [-0.84, 0.36, g.zr, 0.4, false]];
  for (const [x, r, z, w, front] of W) {
    const steerG = new THREE.Group(); steerG.position.set(x, r, z); root.add(steerG); // wheels stay planted while the body rolls and pitches
    const m = new THREE.Mesh(wheelGeo(r, w), ghost ? MAT.ghost : MAT.tyre); m.castShadow = !ghost; steerG.add(m);
    if (!ghost) { const rg = new THREE.Mesh(ringGeo(r, w), ringMat); m.add(rg); rings.push(rg); }
    wheels.push({ g: steerG, m, r, front });
  }
  root.userData = { chassis, wheels, ringMat, lights: lt, zr: g.zr, geos: [g.body, g.carbon, g.lights] };
  root.rotation.order = 'YXZ';
  return root;
}
function disposeCar3D(o) { (o.userData.geos || []).forEach(g => g && g.dispose()); if (o.userData.ringMat) o.userData.ringMat.dispose(); }

// ---------------------------------------------------------------- scenery models
function sceneryModels() {
  const M = {};
  { const p = new Parts(); p.add(GEO.cyl8, '#6b4a2b', 0, 1.5, 0, 0, 0, 0, 0.25, 3, 0.25); p.add(GEO.ico, '#3f8f3a', 0, 4.4, 0, 0, 0, 0, 2.4, 2.2, 2.4); p.add(GEO.ico, '#4fa645', 0.8, 5.4, 0.4, 0, 0.5, 0, 1.6, 1.5, 1.6); p.add(GEO.ico, '#357d33', -1, 4.8, -0.6, 0, 1, 0, 1.5, 1.4, 1.5); M.tree = p.merge(); }
  { const p = new Parts(); p.add(GEO.cyl8, '#5a3d24', 0, 1, 0, 0, 0, 0, 0.22, 2, 0.22); for (let k = 0; k < 4; k++) p.add(GEO.cone, k % 2 ? '#1f6b3a' : '#26794a', 0, 3 + k * 2.1, 0, 0, k, 0, 2.6 - k * 0.5, 3.4, 2.6 - k * 0.5); M.pine = p.merge(); }
  { const p = new Parts(); p.add(new THREE.DodecahedronGeometry(1, 0), '#8a8580', 0, 0.8, 0, 0.3, 0.5, 0.1, 2.4, 1.6, 2); p.add(new THREE.DodecahedronGeometry(1, 0), '#9d978f', 1.4, 0.5, 0.6, 0.8, 0.2, 0.4, 1.2, 1, 1.1); M.rock = p.merge(); }
  // tyre wall segment (4 m) + armco
  { const p = new Parts(); for (let k = 0; k < 6; k++) for (let l = 0; l < 2; l++) p.add(GEO.cyl8, l ? '#1a1a1a' : (k % 2 ? '#e8e8e8' : '#d22')  , 0, 0.17 + l * 0.34, -1.67 + k * 0.67, 0, 0, 0, 0.32, 0.33, 0.32); M.tyrewall = p.merge(); }
  { const p = new Parts(); BX(p, '#c9ced6', 0, 0.62, 0, 0.08, 0.32, 4.02); BX(p, '#c9ced6', 0, 0.3, 0, 0.06, 0.12, 4.02); p.add(GEO.cyl8, '#7c838c', 0.08, 0.4, 0, 0, 0, 0, 0.05, 0.8, 0.05); M.armco = p.merge(); }
  { const p = new Parts(); BX(p, '#b8bcc4', 0, 0.55, 0, 0.5, 1.1, 4.02); BX(p, '#6c7078', 0, 1.12, 0, 0.56, 0.06, 4.02); M.concrete = p.merge(); }
  // light tower for night
  { const p = new Parts(); p.add(GEO.cyl8, '#5b616b', 0, 9, 0, 0, 0, 0, 0.18, 18, 0.18); BX(p, '#3a3e45', 0, 18.2, 0, 2.6, 0.6, 0.5); M.tower = p.merge(); }
  { const p = new Parts(); BX(p, [255, 245, 220], 0, 18.2, 0.27, 2.4, 0.45, 0.04); M.towerHead = p.merge(); }
  // grandstand (20 m section) with crowd
  { const p = new Parts(), R = mulberry32(3), cc = ['#e33', '#fd3', '#39f', '#fff', '#3c6', '#f80', '#c3f', '#222'];
    for (let r = 0; r < 8; r++) { BX(p, '#8d939c', 0, 0.5 + r * 0.6, r * 0.9, 20, 0.6 + r * 0.0, 0.9); for (let k = 0; k < 26; k++) BX(p, cc[(R() * cc.length) | 0], -9.6 + k * 0.76, 1.05 + r * 0.6, r * 0.9 - 0.1, 0.42, 0.5, 0.3); }
    BX(p, '#5d636c', 0, 3, 7.4, 20, 6, 0.4); BX(p, '#e8eaee', 0, 7.6, 3.2, 21, 0.3, 9, -0.12); for (const x of [-9.8, 0, 9.8]) p.add(GEO.cyl8, '#5d636c', x, 3.8, 7.2, 0, 0, 0, 0.15, 7.6, 0.15); M.stand = p.merge(); }
  // container + crane for the harbour
  { const p = new Parts(); BX(p, '#ffffff', 0, 1.3, 0, 2.45, 2.6, 12); for (let k = 0; k < 12; k++) BX(p, '#000000', 1.23, 1.3, -5.6 + k, 0.02, 2.4, 0.08, 0, 0, 0, 0.15); M.container = p.merge(); }
  { const p = new Parts(), c = '#d9a21b'; for (const x of [-6, 6]) for (const z of [-5, 5]) p.add(GEO.box, c, x, 14, z, 0, 0, 0, 0.8, 28, 0.8); BX(p, c, 0, 28, 0, 14, 1.4, 11); BX(p, c, 0, 30, 10, 2, 2, 60); BX(p, '#333', 0, 31.5, -12, 4, 3, 4); M.crane = p.merge(); }
  return M;
}
