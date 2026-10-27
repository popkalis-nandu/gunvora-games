// ---------------------------------------------------------------- track geometry (closed centripetal Catmull-Rom spline, sampled every ~2 m)
const DS = 2, KERB_W = 1.2, G = 9.81;
let T = null; // current track
function buildTrack(def) {
  const pts = def.pts.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1]));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const len = curve.getLength(), n = Math.round(len / DS), sp = curve.getSpacedPoints(n); sp.pop();
  const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), H = new Float32Array(n), K = new Float32Array(n);
  for (let i = 0; i < n; i++) { X[i] = sp[i].x; Z[i] = sp[i].z; Y[i] = sp[i].y; }
  // smooth elevation
  for (let pass = 0; pass < 3; pass++) { const y2 = Y.slice(); for (let i = 0; i < n; i++) { let s = 0; for (let k = -10; k <= 10; k++) s += y2[mod(i + k, n)]; Y[i] = s / 21; } }
  for (let i = 0; i < n; i++) { const a = mod(i - 1, n), b = mod(i + 1, n); H[i] = Math.atan2(X[b] - X[a], Z[b] - Z[a]); }
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  for (let i = 0; i < n; i++) K[i] = wrapA(H[mod(i + 2, n)] - H[mod(i - 2, n)]) / (4 * DS);
  const Ks = gauss(K, 8), w = def.width, hw = w / 2;
  // racing line: outside -> apex (inside) -> outside
  const RL = new Float32Array(n), m = 28;
  for (let i = 0; i < n; i++) RL[i] = (hw - 1.6) * clamp((-Ks[i] * 1.0 + 0.55 * (Ks[mod(i + m, n)] + Ks[mod(i - m, n)])) / 0.006, -1, 1);
  const RLs = gauss(RL, 10);
  // racing line path curvature (used for the AI speed profile)
  const RX = new Float32Array(n), RZ = new Float32Array(n);
  for (let i = 0; i < n; i++) { const rx = -Math.cos(H[i]), rz = Math.sin(H[i]); RX[i] = X[i] + rx * RLs[i]; RZ[i] = Z[i] + rz * RLs[i]; }
  const RH = new Float32Array(n), RK = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = mod(i - 2, n), b = mod(i + 2, n); RH[i] = Math.atan2(RX[b] - RX[a], RZ[b] - RZ[a]); }
  for (let i = 0; i < n; i++) { const a = mod(i - 3, n), b = mod(i + 3, n), d = Math.hypot(RX[b] - RX[a], RZ[b] - RZ[a]) || 1; RK[i] = wrapA(RH[b] - RH[a]) / d; }
  const RKs = gauss(RK, 4);
  // slope (rise per metre) for gravity
  const SL = new Float32Array(n); for (let i = 0; i < n; i++) SL[i] = (Y[mod(i + 1, n)] - Y[mod(i - 1, n)]) / (2 * DS);
  // kerbs where the corner is tight enough
  const KERB = new Uint8Array(n); for (let i = 0; i < n; i++) if (Math.abs(Ks[i]) > 0.0045) for (let k = -12; k <= 12; k++) KERB[mod(i + k, n)] = 1;
  const pit = { entry: n - (def.id === 'vgp' ? 70 : def.id === 'am' ? 80 : 45), box: def.id === 'nh' ? 70 : 90, exit: def.id === 'vgp' ? 200 : def.id === 'nh' ? 150 : 170, off: hw + def.runoff + 5 };
  // spatial hash for nearest-sample queries
  const cell = 40, grid = new Map(); let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < n; i++) { const k = Math.floor(X[i] / cell) + ',' + Math.floor(Z[i] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); minX = Math.min(minX, X[i]); maxX = Math.max(maxX, X[i]); minZ = Math.min(minZ, Z[i]); maxZ = Math.max(maxZ, Z[i]); }
  T = { def, n, len: n * DS, X, Y, Z, H, K: Ks, RL: RLs, RK: RKs, SL, KERB, w, hw, wall: hw + def.runoff, pit, grid, cell, minX, maxX, minZ, maxZ, sector: [Math.floor(n / 3), Math.floor(2 * n / 3)], profiles: new Map() };
  return T;
}
function gauss(A, r) { const n = A.length, o = new Float32Array(n), wts = []; let ws = 0; for (let k = -r * 2; k <= r * 2; k++) { const v = Math.exp(-(k * k) / (2 * r * r)); wts.push(v); ws += v; } for (let i = 0; i < n; i++) { let s = 0; for (let k = -r * 2; k <= r * 2; k++) s += A[mod(i + k, n)] * wts[k + r * 2]; o[i] = s / ws; } return o; }
// nearest sample to (x,z): local search from a hint, else spatial hash
function nearestIdx(x, z, hint) {
  const n = T.n; let best = -1, bd = 1e18;
  if (hint >= 0) { for (let k = -40; k <= 40; k++) { const i = mod(hint + k, n), dx = X_(i) - x, dz = Z_(i) - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } if (bd < (T.wall + 30) ** 2) return best; }
  const cx = Math.floor(x / T.cell), cz = Math.floor(z / T.cell); bd = 1e18;
  for (let r = 1; r <= 4 && best < 0 || r <= 1; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const L = T.grid.get((cx + a) + ',' + (cz + b)); if (L) for (const i of L) { const dx = X_(i) - x, dz = Z_(i) - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } }
  if (best < 0) for (let i = 0; i < n; i += 2) { const dx = X_(i) - x, dz = Z_(i) - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
  return best;
}
const X_ = i => T.X[i], Z_ = i => T.Z[i];
// lateral offset (+ = right of travel direction) and fractional advance of a point relative to sample i
function trackLocal(i, x, z) { const h = T.H[i], dx = x - T.X[i], dz = z - T.Z[i]; return { lat: dx * -Math.cos(h) + dz * Math.sin(h), fwd: dx * Math.sin(h) + dz * Math.cos(h) }; }
function trackPoint(i, lat, out) { i = mod(i, T.n); const h = T.H[i]; out.x = T.X[i] - Math.cos(h) * lat; out.z = T.Z[i] + Math.sin(h) * lat; out.y = T.Y[i]; out.h = h; return out; }
// per-car-setup cornering speed profile (with braking zones), cached
function speedProfile(stats, mu, decelK) {
  const key = [stats.top, stats.grip, stats.df, stats.brake, mu, decelK].map(v => v.toFixed(3)).join('|');
  if (T.profiles.has(key)) return T.profiles.get(key);
  const n = T.n, V = new Float32Array(n), top = stats.top / 3.6;
  for (let i = 0; i < n; i++) { const k = Math.abs(T.RK[i]) + 1e-6, den = k - G * mu * ARC * stats.df / 3600; V[i] = den <= 0 ? top : Math.min(top, Math.sqrt(G * mu * ARC * stats.grip / den)); }
  for (let pass = 0; pass < 2; pass++) for (let j = n - 1; j >= 0; j--) { const i = j, nx = V[mod(i + 1, n)], dec = Math.min(stats.brake, G * mu * (stats.grip + stats.df * (nx / 60) ** 2)) * decelK; V[i] = Math.min(V[i], Math.sqrt(nx * nx + 2 * dec * DS)); }
  T.profiles.set(key, V); return V;
}
// cornering profile on the centre line (used by the player's steering assist: casual lines are tighter than the racing line)
function assistProfile(stats, mu) {
  const key = 'A|' + [stats.top, stats.grip, stats.df, stats.brake, mu].map(v => v.toFixed(3)).join('|');
  if (T.profiles.has(key)) return T.profiles.get(key);
  const n = T.n, V = new Float32Array(n), top = stats.top / 3.6;
  for (let i = 0; i < n; i++) { let k = 0; for (let d = -4; d <= 4; d++) k = Math.max(k, Math.abs(T.K[mod(i + d, n)])); k = lerp(Math.abs(T.RK[i]), k, 0.8) + 1e-6; const den = k - G * mu * ARC * stats.df / 3600; V[i] = den <= 0 ? top : Math.min(top, Math.sqrt(G * mu * ARC * stats.grip / den)); }
  for (let pass = 0; pass < 2; pass++) for (let j = n - 1; j >= 0; j--) { const nx = V[mod(j + 1, n)], dec = Math.min(stats.brake, G * mu * (stats.grip + stats.df * (nx / 60) ** 2)) * 0.75; V[j] = Math.min(V[j], Math.sqrt(nx * nx + 2 * dec * DS)); }
  T.profiles.set(key, V); return V;
}

