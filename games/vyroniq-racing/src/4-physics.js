// ---------------------------------------------------------------- vehicle physics (arcade-sim, shared by player and AI: no AI cheats)
const ARC = 1.45, WHEELBASE = 3.4, GEAR_R = [0.3, 0.42, 0.53, 0.63, 0.73, 0.82, 0.91, 1.0], CAR_R = 1.0;
const _tp = { x: 0, y: 0, z: 0, h: 0 };
function makeCar(o) {
  return Object.assign({ x: 0, y: 0, z: 0, h: 0, vx: 0, vz: 0, speed: 0, launchT: 0, launchK: 1, vLong: 0, vLat: 0, yaw: 0, steer: 0, throttle: 0, brake: 0, gear: 1, rpm: 4000, shiftT: 0,
    energy: 100, boostT: 0, boostCd: 0, boosts: 0, i: 0, lat: 0, prog: 0, lap: 0, lapStart: 0, lapTimes: [], secStart: 0, sectors: [], lastSectors: [], curSec: 0,
    finished: false, finishTime: 0, off: false, kerb: false, lock: false, spin: false, slip: false, wear: 0, tyre: 'medium', pit: { req: false, state: 0, t: 0, count: 0, nextTyre: null },
    launch: 0, launchMsg: '', cleanLap: true, cleanLaps: 0, contacts: 0, pos: 0, grid: 0, input: { steer: 0, throttle: 0, brake: 0, boost: false, up: false, down: false } }, o);
}
function carMu(c, env) {
  const ty = TYRES[c.tyre] || TYRES.medium;
  let mu = env.rain ? ty.wet : ty.grip; mu *= 1 - 0.2 * Math.pow(c.wear, 1.6);
  if (env.rain && c.tyre === 'wet') mu *= 1; else if (!env.rain && c.tyre === 'wet') mu *= 0.97;
  return mu;
}
function stepCar(c, dt, env) {
  const s = c.stats, inp = c.input, auto = c.isPlayer ? settings : { tc: true, abs: true, steerAssist: true, autoGear: true };
  // ---- pit lane: automated drive at the speed limit
  if (c.pit.state) { stepPit(c, dt, env); return; }
  const f0 = Math.sin(c.h), f1 = Math.cos(c.h), r0 = -Math.cos(c.h), r1 = Math.sin(c.h);
  let vLong = c.vx * f0 + c.vz * f1, vLat = c.vx * r0 + c.vz * r1; const v = Math.hypot(vLong, vLat);
  // surface
  c.i = nearestIdx(c.x, c.z, c.i); const loc = trackLocal(c.i, c.x, c.z); c.lat = loc.lat;
  const al = Math.abs(c.lat); c.kerb = al > T.hw - 0.2 && al <= T.hw + KERB_W && T.KERB[c.i] === 1; c.off = al > T.hw + (T.KERB[c.i] ? KERB_W : 0.4);
  let mu = carMu(c, env); if (c.off) mu *= 0.55 + (1 - s.offPen) * 0.4;
  const dfG = s.grip + s.df * (v / 60) ** 2, latMax = G * mu * dfG;
  // ---- energy boost: 100 units, up to 3 s, then cooldown before it recharges
  if (inp.boost && c.energy > 8 && c.boostCd <= 0 && c.boostT <= 0 && c.launch >= 0 && env.racing) { c.boostT = 3; c.boosts++; if (c.isPlayer) onPlayerBoost(); }
  if (c.boostT > 0) { c.boostT -= dt; c.energy -= 33.4 * dt; if (c.boostT <= 0 || c.energy <= 0) { c.boostT = 0; c.energy = Math.max(0, c.energy); c.boostCd = 4; } }
  else if (c.boostCd > 0) c.boostCd -= dt;
  else c.energy = Math.min(100, c.energy + (1.6 + c.brake * 9 * clamp(v / 30, 0, 1)) * s.recharge * dt);
  const boosting = c.boostT > 0, bf = boosting ? 1 + 0.35 * s.boost : 1;
  let top = s.top / 3.6 * (boosting ? 1 + 0.06 * s.boost : 1) * (c.slip ? 1.045 : 1);
  if (c.launchT > 0) { c.launchT -= dt; }
  // ---- gears (auto or manual), rpm
  const gTop = g => top * GEAR_R[g - 1];
  if (c.shiftT > 0) c.shiftT -= dt;
  if (auto.autoGear || !c.isPlayer) { if (c.gear < 8 && vLong > gTop(c.gear) * 0.97) { c.gear++; c.shiftT = 0.1 * s.shift; } else if (c.gear > 1 && vLong < gTop(c.gear - 1) * 0.86) { c.gear--; c.shiftT = 0.06 * s.shift; } }
  else { if (inp.up && c.gear < 8) { c.gear++; c.shiftT = 0.1 * s.shift; } if (inp.down && c.gear > 1 && vLong < gTop(c.gear - 1) * 1.02) { c.gear--; c.shiftT = 0.06 * s.shift; } inp.up = inp.down = false; }
  const lo = c.gear > 1 ? gTop(c.gear - 1) * 0.72 : 0, hi = gTop(c.gear);
  c.rpm = clamp(4200 + 8300 * (Math.max(0, vLong) - lo) / Math.max(1, hi - lo), 3800, 12500);
  // ---- longitudinal
  let thr = env.racing ? inp.throttle : 0;
  let aDrive = thr * s.a0 * bf * Math.max(0, 1 - (Math.max(0, vLong) / top) ** 3);
  if (c.launchT > 0) aDrive *= c.launchK;
  if (vLong > hi * 1.0 && !(auto.autoGear || !c.isPlayer)) aDrive = 0; // rev limiter in manual
  if (c.shiftT > 0) aDrive *= 0.35;
  const traction = G * mu * (s.grip * 0.95 + s.df * (v / 60) ** 2);
  c.spin = false;
  if (aDrive > traction) { if (auto.tc) aDrive = traction; else { aDrive = traction * 0.8; c.spin = true; if (v > 3) vLat += (c.steer || 0.3) * -1.2 * dt * 6; } }
  let aBrake = 0; c.lock = false;
  if (inp.brake > 0.02) {
    const lim = G * mu * (s.grip + s.df * (v / 60) ** 2) * 1.05, req = inp.brake * s.brake;
    if (req > lim && !auto.abs && inp.brake > 0.8 && v > 8) { aBrake = lim * 0.78; c.lock = true; c.wear = Math.min(1, c.wear + 0.0006 * dt * 60); } else aBrake = Math.min(req, lim * 0.97);
  }
  const aDrag = 0.0002 * vLong * Math.abs(vLong) * (c.slip ? 0.7 : 1) + (c.off ? 2.5 + 0.06 * v * (1 - (1 - s.offPen) * 0.5) : 0) + 0.2;
  const aGrav = -G * (T.SL[c.i] || 0) * 0.9;
  if (vLong > 0.3) vLong += (aDrive - aBrake - aDrag + aGrav) * dt;
  else if (inp.brake > 0.3 && thr < 0.1 && env.racing) vLong = Math.max(-6, vLong - 4 * dt); // reverse to recover
  else vLong += (aDrive - (vLong < 0 ? -aBrake : aBrake) * 0 + aGrav * 0.2) * dt;
  if (vLong < 0 && inp.brake < 0.3 && thr > 0) vLong += 6 * dt;
  // ---- steering / lateral (arcade grip, speed-sensitive lock, optional drift)
  const sens = c.isPlayer ? settings.sens : 1;
  let st = clamp(inp.steer * sens, -1, 1); c.steer = lerp(c.steer, st, clamp(dt * 16, 0, 1));
  const vA = Math.abs(vLong), latA = latMax * ARC;
  // geometric yaw at full lock (fades with speed) vs the grip-limited yaw: steering input scales the smaller of the two,
  // so a partial input gives a partial turn at any speed and full lock always uses all the available grip
  const geomYaw = vA * Math.tan(0.46 / (1 + vA / 26) * s.turn) / WHEELBASE, gripYaw = latA * (auto.steerAssist ? 1.08 : 1) / Math.max(vA, 1);
  let yaw, req; c.yawMax = Math.min(geomYaw, gripYaw);
  // drift: brake tap (or the drift key) while turning hard at speed breaks the rear loose
  const brkOn = (inp.brkRaw ?? inp.brake) > 0.4, tapped = !brkOn && c.brkHold > 0.02 && c.brkHold < 0.35; c.brkHold = brkOn ? (c.brkHold || 0) + dt : 0;
  if (c.isPlayer && inp.human && !c.drift && env.racing && v > 16 && Math.abs(c.steer) > 0.7 && !c.off && (inp.drift || (settings.driftTap !== false && tapped))) {
    c.drift = 1; c.driftDir = Math.sign(c.steer); c.driftB = Math.min(0.12, Math.abs(Math.atan2(vLat, Math.max(1, vLong)))); c.driftT = 0; c.driftLow = 0; if (typeof onDrift === 'function') onDrift(c, 1);
  }
  if (c.drift) {
    const dir = c.driftDir, along = c.steer * dir;
    c.driftT += dt;
    if (c.drift === 1) { c.driftLow = along < 0.25 ? c.driftLow + dt : 0; if (c.driftLow > 0.16 || v < 9 || c.off) c.drift = 2; }
    const bT = c.drift === 1 ? 0.28 + 0.24 * clamp(along, 0, 1) + (thr > 0.5 ? 0.05 : 0) : 0;
    c.driftB += (bT - c.driftB) * clamp(dt * (c.drift === 1 ? 4.5 : 8), 0, 1);
    // the velocity vector turns on (slightly more than) the grip limit; the slide scrubs speed
    const turnK = c.drift === 1 ? 0.85 + 0.6 * clamp(along, 0, 1) : 1.05, vNow = Math.hypot(vLong, vLat);
    const om = c.drift === 1 ? -dir * latA * turnK / Math.max(vNow, 6) : -c.steer * Math.min(geomYaw, gripYaw); // recovering: normal steering control
    const psi = Math.atan2(c.vx, c.vz) + om * dt;
    const vNew = Math.max(0, vNow - (1.5 + 7 * c.driftB) * dt - 0.3 * Math.max(0, aDrive) * dt);
    const h0 = c.h; c.h = psi - dir * c.driftB;
    yaw = Math.atan2(Math.sin(c.h - h0), Math.cos(c.h - h0)) / dt; req = latA * turnK;
    c.vx = Math.sin(psi) * vNew; c.vz = Math.cos(psi) * vNew;
    const f0b = Math.sin(c.h), f1b = Math.cos(c.h); vLong = c.vx * f0b + c.vz * f1b; vLat = c.vx * -f1b + c.vz * f0b;
    if (c.drift === 2 && c.driftB < 0.02) { c.drift = 0; if (typeof onDrift === 'function') onDrift(c, 0); }
    c.yaw = yaw;
  } else {
    if (auto.steerAssist) { yaw = -c.steer * Math.min(geomYaw, gripYaw) * Math.sign(vLong); req = Math.abs(yaw * vLong); }
    else {
      yaw = -c.steer * geomYaw * Math.sign(vLong); req = Math.abs(yaw * vLong);
      if (req > latA * 1.04) { const ex = req - latA * 1.04; yaw *= latA * 1.04 / req; vLong -= Math.min(ex, 25) * 0.05 * dt; vLat += -Math.sign(c.steer) * Math.min(ex, 25) * 0.12 * dt; req = latA * 1.04; } // understeer: scrubs speed and pushes wide
    }
    if (c.lock) yaw *= 0.3;
    const relax = (auto.steerAssist ? 9 : 5.5) * mu * (c.off ? 0.5 : 1);
    vLat *= Math.exp(-relax * dt);
    if (c.kerb && v > 20) vLat += (Math.random() - 0.5) * 0.6 * s.offPen;
    c.yaw = yaw; c.h += yaw * dt;
    const nf0 = Math.sin(c.h), nf1 = Math.cos(c.h), nr0 = -Math.cos(c.h), nr1 = Math.sin(c.h);
    c.vx = nf0 * vLong + nr0 * vLat; c.vz = nf1 * vLong + nr1 * vLat;
  }
  c.vLong = vLong; c.vLat = vLat;
  c.aLong = lerp(c.aLong || 0, (vLong - (c.pvLong ?? vLong)) / dt, clamp(dt * 8, 0, 1)); c.pvLong = vLong;
  c.x += c.vx * dt; c.z += c.vz * dt;
  // ---- barriers: slide along the wall, lose some speed, never stop dead
  const wall = T.wall, latNow = trackLocal(c.i, c.x, c.z).lat;
  if (Math.abs(latNow) > wall) {
    const h = T.H[c.i], R0 = -Math.cos(h), R1 = Math.sin(h), sg = Math.sign(latNow), push = Math.abs(latNow) - wall;
    c.x -= R0 * sg * push; c.z -= R1 * sg * push;
    const vr = (c.vx * R0 + c.vz * R1) * sg;
    if (vr > 0) {
      const tx = c.vx - R0 * sg * vr, tz = c.vz - R1 * sg * vr, keep = clamp(1 - vr * 0.022, 0.62, 0.99);
      c.vx = tx * keep - R0 * sg * vr * 0.15; c.vz = tz * keep - R1 * sg * vr * 0.15;
      if (c.drift) c.drift = 2;
      if (c.isPlayer) { c.wallHits = (c.wallHits || 0) + (vr > 3 ? 1 : 0); if (vr > 3) onPlayerHit('BARRIER', vr); }
    } else { c.vx *= 1 - 0.25 * dt; c.vz *= 1 - 0.25 * dt; }
    // nose turned into the wall: rotate it back parallel to the barrier
    const fwdT = Math.sin(c.h) * Math.sin(h) + Math.cos(c.h) * Math.cos(h) >= 0 ? h : h + Math.PI, into = (Math.sin(c.h) * R0 + Math.cos(c.h) * R1) * sg;
    if (into > 0) c.h += Math.atan2(Math.sin(fwdT - c.h), Math.cos(fwdT - c.h)) * clamp(dt * 9, 0, 0.2);
    c.lat = sg * wall;
  }
  // ---- tyres wear (more when sliding / pushing)
  const load = clamp(req / Math.max(1, latMax), 0, 1.4) * 0.6 + thr * 0.25 + inp.brake * 0.25;
  c.wear = Math.min(1, c.wear + dt * v * 1.2e-5 * (TYRES[c.tyre] || TYRES.medium).wear * s.wear * (0.4 + load) * (env.rain && c.tyre !== 'wet' ? 0.6 : 1) * (!env.rain && c.tyre === 'wet' ? 2.2 : 1) * env.wearK);
  // height from the track (terrain follows track laterally)
  const f = clamp(loc.fwd / DS, -1, 1), j = f >= 0 ? mod(c.i + 1, T.n) : mod(c.i - 1, T.n);
  c.y = lerp(T.Y[c.i], T.Y[j], Math.abs(f));
  c.speed = Math.hypot(c.vx, c.vz);
}
// pit lane: 0 none, 1 entering lane, 2 stopped in box, 3 leaving
function stepPit(c, dt, env) {
  const p = T.pit, n = T.n; const st = c.pit;
  const target = 80 / 3.6;
  if (st.state === 2) { st.t -= dt; c.vx = c.vz = 0; c.vLong = 0; c.speed = 0; if (st.t <= 0) { st.state = 3; c.tyre = st.nextTyre || c.tyre; c.wear = 0; c.energy = 100; if (c.isPlayer) onPitDone(); } return; }
  const sp = st.state === 1 && mod(st.idx - p.box, n) > n / 2 && mod(p.box - st.idx, n) < 12 ? Math.max(4, target * mod(p.box - st.idx, n) / 12) : target;
  st.idx = mod(st.idx + sp * dt / DS, n);
  const ii = Math.floor(st.idx); const near = (a, b) => mod(b - a, n);
  // lateral position: blend from racing surface into the pit lane and back
  let off = p.off; const dIn = near(p.entry, ii), dOut = near(ii, p.exit);
  if (dIn < 40) off = lerp(c.pitLat0 || T.hw - 2, p.off, smooth(dIn / 40)); if (dOut < 40) off = lerp(T.hw - 3, p.off, smooth(dOut / 40));
  trackPoint(ii, off, _tp); const h2 = T.H[mod(ii + 1, n)];
  c.x = _tp.x; c.z = _tp.z; c.y = _tp.y; c.h = h2; c.i = ii; c.lat = off;
  c.vx = Math.sin(c.h) * sp; c.vz = Math.cos(c.h) * sp; c.vLong = sp; c.speed = sp; c.gear = 2; c.rpm = 6000; c.steer = 0; c.off = false;
  if (st.state === 1 && near(ii, p.box) === 0) { st.state = 2; st.t = 2.8 + (c.isPlayer ? 0 : Math.random() * 0.8); if (c.isPlayer) onPitStop(); }
  if (st.state === 3 && near(ii, p.exit) <= 1) { st.state = 0; st.req = false; st.count++; }
}
function tryEnterPit(c, prevI) {
  const p = T.pit; if (!c.pit.req || c.pit.state) return;
  const n = T.n, crossed = mod(c.i - prevI, n) < n / 2 && mod(p.entry - prevI, n) <= mod(c.i - prevI, n) && mod(p.entry - prevI, n) < 30;
  if (crossed) { c.pit.state = 1; c.pit.idx = c.i; c.pitLat0 = c.lat; c.boostT = 0; }
}
// car-to-car contact: two circles per car
function collideCars(cars) {
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const A = cars[a], B = cars[b]; if (A.pit.state || B.pit.state) continue;
    const dx0 = B.x - A.x, dz0 = B.z - A.z; if (dx0 * dx0 + dz0 * dz0 > 49) continue;
    for (const ea of [-1.25, 1.25]) for (const eb of [-1.25, 1.25]) {
      const ax = A.x + Math.sin(A.h) * ea, az = A.z + Math.cos(A.h) * ea, bx = B.x + Math.sin(B.h) * eb, bz = B.z + Math.cos(B.h) * eb;
      const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), min = CAR_R * 2;
      if (d >= min || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, ov = (min - d) / 2, ma = A.stats.w, mb = B.stats.w, wa = mb / (ma + mb), wb = ma / (ma + mb);
      A.x -= nx * ov * 2 * wa; A.z -= nz * ov * 2 * wa; B.x += nx * ov * 2 * wb; B.z += nz * ov * 2 * wb;
      const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
      if (rv < 0) { const j = -(1.3) * rv; A.vx -= nx * j * wa; A.vz -= nz * j * wa; B.vx += nx * j * wb; B.vz += nz * j * wb; if (-rv > 0.8) { A.contacts++; B.contacts++; } if ((A.isPlayer || B.isPlayer) && -rv > 2) onPlayerHit('CONTACT', -rv); }
    }
  }
}
// slipstream: close behind another car on a straight
function slipstreams(cars) {
  for (const c of cars) {
    c.slip = false; if (c.speed < 28 || c.pit.state) continue;
    for (const o of cars) { if (o === c || o.pit.state) continue; const d = mod(o.prog - c.prog, T.len); if (d < 3 || d > 32) continue; if (Math.abs(o.lat - c.lat) < 2.4 && Math.abs(T.K[c.i]) < 0.003) { c.slip = true; break; } }
  }
}

// ---------------------------------------------------------------- AI driver (outputs the same inputs a human would)
function aiDrive(c, cars, dt, env, diff) {
  const ai = c.ai, s = c.stats, n = T.n, v = c.speed || 0;
  if (!ai.profile) ai.profile = speedProfile(s, carMu(c, env) * (env.rain ? 0.98 : 1), 0.82);
  if ((ai.profT = (ai.profT || 0) - dt) <= 0) { ai.profT = 2; ai.profile = speedProfile(s, Math.round(carMu(c, env) * 50) / 50, 0.82); }
  // mistakes: occasionally brake late into a corner and run wide
  if (ai.mistakeT > 0) ai.mistakeT -= dt;
  else if (Math.abs(T.K[mod(c.i + 60, n)]) > 0.006 && Math.abs(T.K[c.i]) < 0.002 && ai.lastMistakeIdx !== Math.floor(c.i / 120) && Math.random() < diff.mistake * (1.3 - c.skill) * 2) { ai.lastMistakeIdx = Math.floor(c.i / 120); ai.mistakeT = 2.2; }
  // overtaking / defending / avoiding
  ai.offT = (ai.offT || 0) - dt; let wantOff = ai.offT > 0 ? ai.off : 0, ahead = null, aheadD = 1e9;
  for (const o of cars) { if (o === c || o.pit.state || o.finished && !c.finished) continue; const d = mod(o.prog - c.prog, T.len); if (d > 0.5 && d < 25 && Math.abs(o.lat - (c.lat)) < 3.2 && d < aheadD) { ahead = o; aheadD = d; } }
  if (ahead && ai.offT <= 0) {
    const mySpeed = ai.profile[mod(c.i + 20, n)] * c.pace, faster = mySpeed > ahead.speed * 1.01 || c.speed > ahead.speed + 1;
    if (faster && Math.random() < 0.6 + c.aggr * 0.4) { const room = T.hw - 1.4; const side = ahead.lat > 0 ? -1 : 1; ai.off = clamp(ahead.lat + side * 3.2, -room, room) - T.RL[mod(c.i + 15, n)]; ai.offT = 3; wantOff = ai.off; }
  }
  // defend: move toward the inside if someone is right behind, before a corner
  if (!ahead && ai.offT <= 0 && c.aggr > 0.6) for (const o of cars) { if (o === c) continue; const d = mod(c.prog - o.prog, T.len); if (d > 1 && d < 12) { const kn = T.K[mod(c.i + 40, n)]; if (Math.abs(kn) > 0.004) { ai.off = -Math.sign(kn) * 2 - T.RL[mod(c.i + 15, n)] * 0.5; ai.offT = 1.5; wantOff = ai.off; } break; } }
  // steering: pure pursuit toward the racing line ahead
  const look = 7 + v * 0.42, j = mod(c.i + Math.round(look / DS), n);
  let tlat = clamp(T.RL[j] + wantOff + (ai.mistakeT > 0 ? Math.sign(T.K[j]) * 2.5 : 0), -T.hw + 1, T.hw - 1);
  // side-by-side awareness: leave a car's width to anyone alongside
  let side = null;
  for (const o of cars) { if (o === c || o.pit.state) continue; const d = mod(o.prog - c.prog + T.len / 2, T.len) - T.len / 2, dl = o.lat - c.lat; if (Math.abs(d) < 6 && Math.abs(dl) < 3.4) { side = o; const push = (3.4 - Math.abs(dl)) * (dl > 0 ? -1 : 1); tlat = clamp(c.lat + push * 1.2 + (tlat - c.lat) * 0.3, -T.hw + 0.8, T.hw - 0.8); break; } }
  if (c.lat > T.hw + 1) tlat = Math.min(tlat, T.hw - 2); if (c.lat < -T.hw - 1) tlat = Math.max(tlat, -T.hw + 2);
  trackPoint(j, tlat, _tp);
  const dx = _tp.x - c.x, dz = _tp.z - c.z, fw = dx * Math.sin(c.h) + dz * Math.cos(c.h), rt = dx * -Math.cos(c.h) + dz * Math.sin(c.h);
  const ang = Math.atan2(rt, Math.max(0.5, fw));
  const Ld = Math.max(3, Math.hypot(dx, dz)), wDes = 2 * Math.max(v, 2) * Math.sin(ang) / Ld;
  c.input.human = false;
  c.input.steer = clamp(wDes / Math.max(0.05, c.yawMax || 1) * 1.05 + ang * 0.6, -1, 1);
  // speed control from the braking/cornering profile
  const k = mod(c.i + Math.round((3 + v * 0.18) / DS), n);
  let vt = ai.profile[k] * c.pace * (ai.mistakeT > 0 ? 1.1 : 1);
  if (ahead && Math.abs(ahead.lat - c.lat) < 2.4 && aheadD < 14) vt = Math.min(vt, ahead.speed - (14 - aheadD) * 0.35);
  if (side && Math.abs(T.K[mod(c.i + 25, n)]) > 0.006 && mod(side.prog - c.prog, T.len) < T.len / 2 && c.aggr < 0.8) vt = Math.min(vt, side.speed - 0.5); // concede the corner
  if (c.off) vt *= 0.8;
  const e = vt - v;
  if (e > 0) { c.input.throttle = clamp(0.55 + e * 0.35, 0, 1); c.input.brake = 0; } else { c.input.throttle = e > -1.2 ? 0.25 : 0; c.input.brake = clamp(-e * 0.22, 0, 1); }
  // energy boost on straights
  const straight = Math.abs(T.K[mod(c.i + 40, n)]) < 0.0015 && Math.abs(T.K[mod(c.i + 90, n)]) < 0.0015;
  c.input.boost = straight && c.energy > 70 && v > 35 && Math.random() < 0.02 + c.aggr * 0.02;
  // pit for tyres in long races
  if (!c.pit.req && !c.pit.count && env.laps >= 5 && c.wear > 0.45 + c.skill * 0.1 && c.lap < env.laps - 1) { c.pit.req = true; c.pit.nextTyre = env.rain ? 'wet' : 'medium'; }
}
