// Static geometry batcher: merges many primitive parts per material into a single mesh (few draw calls on mobile)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  sph: new THREE.SphereGeometry(0.5, 12, 8),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  plane: new THREE.PlaneGeometry(1, 1),
};
export function worldUV(g, tile = 1, offY = 0) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + offY, z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, x / tile, z / tile); else if (ax > 0.5) uv.setXY(i, z / tile, y / tile); else uv.setXY(i, x / tile, y / tile);
  }
  uv.needsUpdate = true; return g;
}
export class Builder {
  constructor() { this.parts = {}; }
  add(key, geo, pos, rot = [0, 0, 0], scl = [1, 1, 1], color = 0xffffff, uvTile = 0, uvOffY = 0) {
    let g = geo.index ? geo.clone() : geo.clone();
    _e.set(rot[0], rot[1], rot[2]); _q.setFromEuler(_e); _p.set(pos[0], pos[1], pos[2]); _s.set(scl[0], scl[1], scl[2]);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m);
    if (uvTile) worldUV(g, uvTile, uvOffY);
    const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.index) { const idx = []; for (let i = 0; i < n; i++) idx.push(i); g.setIndex(idx); }
    (this.parts[key] ||= []).push(g);
    return g;
  }
  build(mats, scene, opts = {}) {
    const meshes = {};
    for (const k in this.parts) {
      const geos = this.parts[k]; if (!geos.length) continue;
      const merged = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
      const m = new THREE.Mesh(merged, mats[k]); m.castShadow = opts.cast?.[k] ?? true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
      scene.add(m); meshes[k] = m;
    }
    this.parts = {}; return meshes;
  }
}
