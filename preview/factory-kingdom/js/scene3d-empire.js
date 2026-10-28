/* Factory Kingdom 250 · later-era world (lazy-loaded by scene3d.js the first time it is needed):
   printing & packing line, automated dock, AGVs, smart-factory sensors, solar roof, freight rail,
   container port + ship, cargo airport + plane, satellite plants, global hubs and plant shuttles. */
export function createEmpire(C) {
  const { THREE, scene, mesh, bx, cy, boxW, std, MAT, signboard, canvasTex, staticBatch, blobShadow, pallet, cardBox, spark, smoke, makeRobot, robotPose, wx, wz, I, rnd, lerp, clamp, ease, FONT } = C;
  const root = new THREE.Group(); root.name = 'empire'; scene.add(root);
  const parts = {};          // key -> { g, upd, inside }
  let initial = true;
  const grow = [];           // build-in animations
  const D = I.D;

  /* ---------- shared bits ---------- */
  const paper = std(0xf3efe4, 0.85, 0), teal = std(0x0f766e, 0.4, 0.3), glowCyan = std(0x000000, 0.3, 0, { emissive: 0x22d3ee, emissiveIntensity: 1.6 });
  const webTex = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h); for (let x = 8; x < w; x += 64) { g.fillStyle = '#e56f17'; g.fillRect(x, 10, 40, 18); g.fillStyle = '#1e1b4b'; g.fillRect(x, 34, 40, 6); g.fillRect(x, 44, 28, 6); } });
  webTex.wrapS = THREE.RepeatWrapping;
  const panelTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#0d1b3d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7f95b8'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  const panelMat = std(0x1a2a55, 0.12, 0.6, { map: panelTex });
  function solarPanel(g, x, y, z, w, d, tilt) { const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.x = -tilt; g.add(p); mesh(bx(w, 0.05, d), MAT.galv, 0, 0, 0, p); const s = mesh(new THREE.PlaneGeometry(w - 0.06, d - 0.06), panelMat, 0, 0.027, 0, p, false, true); s.rotation.x = -Math.PI / 2; return p; }
  function contMat(c) { return std(c, 0.55, 0.45); }
  const contGeo = new THREE.BoxGeometry(6.06, 2.59, 2.44);

  /* ---------- interior facilities ---------- */
  const DEF = {};
  DEF.printLine = (B) => {
    const g = new THREE.Group(), z = B.z0 + 1.35, x0 = -7.4, x1 = 1.6, A = { rollers: [] }; g.position.x = -0.8;
    mesh(boxW(x1 - x0, 0.12, 1.3, 1), MAT.paintDark, (x0 + x1) / 2, 0.06, z, g);
    // unwind stand + paper reel
    [-0.55, 0.55].forEach((dz) => { const a = mesh(bx(0.12, 1.3, 0.12), MAT.paintGrey, x0 + 0.6, 0.65, z + dz, g); void a; });
    A.reel = mesh(cy(0.5, 0.5, 0.95, 28), paper, x0 + 0.6, 0.95, z, g); A.reel.rotation.x = Math.PI / 2;
    mesh(cy(0.1, 0.1, 0.97, 12), MAT.darkSteel, x0 + 0.6, 0.95, z, g).rotation.x = Math.PI / 2;
    // three print units (cyan / magenta / yellow / key)
    [0x06b6d4, 0xdb2777, 0xeab308].forEach((ink, i) => {
      const x = -5.6 + i * 1.45, u = new THREE.Group(); u.position.set(x, 0, z); g.add(u);
      mesh(bx(1.05, 1.5, 1.25, 0.03), teal, 0, 0.87, 0, u); mesh(bx(1.07, 0.12, 1.27), MAT.paintDark, 0, 1.68, 0, u);
      mesh(bx(0.6, 0.18, 0.02), std(ink, 0.4, 0.1), 0, 1.35, 0.64, u);
      const r = mesh(cy(0.13, 0.13, 1.1, 18), MAT.chrome, 0, 1.08, 0, u); r.rotation.x = Math.PI / 2; A.rollers.push(r);
      const r2 = mesh(cy(0.09, 0.09, 1.1, 14), std(ink, 0.3, 0.2), 0.0, 1.32, 0, u); r2.rotation.x = Math.PI / 2; A.rollers.push(r2);
      mesh(new THREE.PlaneGeometry(0.3, 0.2), MAT.screen, 0.3, 1.2, 0.635, u, false, false);
    });
    // paper web running through the units
    A.web = new THREE.MeshStandardMaterial({ map: webTex.clone(), roughness: 0.8 }); A.web.map.wrapS = THREE.RepeatWrapping; A.web.map.repeat.set(5, 1); A.web.map.needsUpdate = true;
    const web = mesh(new THREE.PlaneGeometry(6.0, 0.85), A.web, -4.0, 1.2, z, g, false, true); web.rotation.x = -Math.PI / 2;
    // die-cutter / folder-gluer
    const fd = new THREE.Group(); fd.position.set(-0.75, 0, z); g.add(fd);
    mesh(bx(1.2, 1.45, 1.3, 0.03), MAT.cabinet, 0, 0.8, 0, fd); mesh(bx(0.8, 0.5, 0.02), MAT.glass, 0, 1.0, 0.66, fd, false, false); mesh(bx(1.22, 0.14, 1.32), MAT.paintOrange, 0, 1.55, 0, fd);
    A.die = mesh(bx(0.7, 0.1, 0.9), MAT.steel, 0, 1.1, 0, fd);
    // outfeed belt with cartons
    const ob = mesh(new THREE.PlaneGeometry(1.4, 0.6), MAT.belt, 0.75, 0.72, z, g, false, true); ob.rotation.x = -Math.PI / 2;
    mesh(bx(1.4, 0.1, 0.66), MAT.galv, 0.75, 0.66, z, g);
    A.boxes = []; for (let i = 0; i < 3; i++) { const b = cardBox('carton'); b.scale.multiplyScalar(0.8); b.position.set(0.1 + i * 0.5, 0.86, z); g.add(b); A.boxes.push(b); }
    A.stack = []; const pl = pallet(); pl.position.set(x1 + 0.9, 0, z); pl.scale.set(0.9, 1, 0.9); g.add(pl);
    for (let i = 0; i < 8; i++) { const b = cardBox('carton'); b.scale.multiplyScalar(0.8); b.position.set(x1 + 0.65 + (i % 2) * 0.48, 0.3 + Math.floor(i / 4) * 0.28, z - 0.2 + (Math.floor(i / 2) % 2) * 0.4); g.add(b); A.stack.push(b); }
    const sg = signboard('PRINT & PACK LINE', 'PRINTING · DIE-CUTTING · PACKING', 3.0, 0.6, { s1: 88, s2: 40, bg: '#134e4a', c2: '#facc15' }); sg.position.set(-4.0, 2.55, z - 0.5); g.add(sg);
    let ph = 0;
    return { g, upd: (S, dt, t) => {
      const on = S.machines.some((m) => m.cyc); const sp = on ? 1 : 0.06; ph += dt * sp;
      A.rollers.forEach((r, i) => { r.rotation.y += dt * sp * (i % 2 ? -9 : 6); });
      A.reel.rotation.y -= dt * sp * 1.6; A.web.map.offset.x = (A.web.map.offset.x - dt * sp * 0.6) % 1;
      A.die.position.y = 1.1 - (on ? Math.max(0, Math.sin(ph * 9)) * 0.12 : 0);
      A.boxes.forEach((b, i) => { b.position.x = 0.1 + ((ph * 0.45 + i / 3) % 1) * 1.35; });
      const n = on ? 1 + Math.floor((ph * 0.4) % 8) : 8; A.stack.forEach((b, i) => { b.visible = i < n; });
    } };
  };
  DEF.autoDock = (B) => {
    const g = new THREE.Group(), z = Math.min(B.z1 - 0.95, 4.35), x = 10.25;
    const R = makeRobot(g, MAT.paintOrange, x, z, 1.15); R.base.rotation.y = Math.PI / 2;
    // staging roller conveyor from the rack to the dock
    const cx0 = 6.4, cx1 = 9.5, cz = z;
    mesh(bx(cx1 - cx0, 0.12, 0.7), MAT.galv, (cx0 + cx1) / 2, 0.7, cz, g);
    const n = Math.floor((cx1 - cx0) / 0.3); for (let i = 0; i < n; i++) mesh(cy(0.035, 0.035, 0.62, 8), MAT.steel, cx0 + 0.15 + i * 0.3, 0.78, cz, g).rotation.x = Math.PI / 2;
    for (let xx = cx0 + 0.2; xx < cx1; xx += 1.2) [-0.3, 0.3].forEach((dz) => mesh(bx(0.05, 0.66, 0.05), MAT.darkSteel, xx, 0.33, cz + dz, g));
    const boxes = []; for (let i = 0; i < 3; i++) { const b = cardBox('carton'); b.scale.multiplyScalar(0.8); b.position.set(cx1 - i * 0.9, 0.95, cz); g.add(b); boxes.push(b); }
    // dock light + bumpers
    const pl = new THREE.Group(); pl.position.set(B.x1 - 0.25, 0, B.z1 + 0.35); g.add(pl); mesh(bx(0.08, 2.2, 0.08), MAT.galv, 0, 1.1, 0, pl);
    const red = std(0x330000, 0.3, 0, { emissive: 0xff2222, emissiveIntensity: 0.1 }), grn = std(0x003300, 0.3, 0, { emissive: 0x22ff55, emissiveIntensity: 2 });
    mesh(new THREE.SphereGeometry(0.1, 12, 8), red, 0, 2.3, 0.05, pl, false, false); mesh(new THREE.SphereGeometry(0.1, 12, 8), grn, 0, 2.05, 0.05, pl, false, false);
    [4.9, 6.3, 7.7, 9.1].forEach((bx0) => mesh(bx(0.3, 0.35, 0.18, 0.04), MAT.rubber, bx0, 0.55, B.z1 + 0.12, g));
    const sg = signboard('AUTO DOCK', 'ROBOTIC LOADING', 1.6, 0.42, { s1: 90, s2: 44, bg: '#7c2d12', c2: '#fde68a' }); sg.position.set(8.0, 2.0, cz - 0.4); g.add(sg);
    let ph = 0;
    return { g, upd: (S, dt) => {
      const loading = S.deliveries.some((d) => !d.ex && d.t / d.dur < 0.16);
      if (loading) ph += dt * 1.6; else ph = ph % 1 > 0.02 ? ph + dt * 1.6 : Math.floor(ph);
      robotPose(R, ph % 1, 1); red.emissiveIntensity = loading ? 2 : 0.1; grn.emissiveIntensity = loading ? 0.1 : 2;
      boxes.forEach((b, i) => { b.position.x = cx1 - ((i * 0.33 + (loading ? ph * 0.5 : 0)) % 1) * (cx1 - cx0 - 0.3); });
    } };
  };
  DEF.agv = (B) => {
    // bidirectional AGVs shuttle along the two cross aisles (no turning needed)
    const g = new THREE.Group(), lanes = [[0.12, -6.4, 7.0], [0.12, -6.4, 7.0], [Math.min(4.45, B.z1 - 0.8), -6.4, 5.4]];
    const agvs = lanes.map((ln, i) => {
      const a = new THREE.Group(); g.add(a);
      mesh(bx(0.9, 0.22, 0.62, 0.05), MAT.paintYellow, 0, 0.16, 0, a); mesh(bx(0.86, 0.03, 0.58), MAT.paintDark, 0, 0.285, 0, a);
      mesh(bx(0.92, 0.03, 0.02), glowCyan, 0, 0.14, 0.315, a, false, false); mesh(bx(0.92, 0.03, 0.02), glowCyan, 0, 0.14, -0.315, a, false, false);
      mesh(cy(0.06, 0.06, 0.06, 14), MAT.black, 0.36, 0.33, 0, a); mesh(cy(0.06, 0.06, 0.06, 14), MAT.black, -0.36, 0.33, 0, a);
      const b = cardBox(['tv', 'washer', 'drone'][i]); b.scale.multiplyScalar(0.85); b.position.y = 0.3; a.add(b);
      blobShadow(a, 1.2, 0.9, 0, 0, 0.5); a.position.z = ln[0];
      return { a, ln, ph: i * 0.37 + (i === 1 ? 0.5 : 0) };
    });
    lanes.forEach((ln, i) => { if (i === 1) return; const l = mesh(new THREE.PlaneGeometry(ln[2] - ln[1] + 1, 0.06), glowCyan, (ln[1] + ln[2]) / 2, 0.009, ln[0] + 0.36, g, false, false); l.rotation.x = -Math.PI / 2; const l2 = l.clone(); l2.position.z = ln[0] - 0.36; g.add(l2); });
    return { g, upd: (S, dt, t) => {
      agvs.forEach((v) => {
        const L = v.ln[2] - v.ln[1], per = L / 1.3 * 2 + 3, u = ((t + v.ph * per) % per) / per;
        let f = u < 0.5 ? u * 2 : 2 - u * 2; f = clamp(f * 1.08 - 0.04, 0, 1);
        v.a.position.x = v.ln[1] + ease(f) * L;
      });
    } };
  };
  DEF.smart = (B) => {
    const g = new THREE.Group();
    const tex = canvasTex(512, 200, () => {}); const scr = mesh(new THREE.PlaneGeometry(4.2, 1.64), std(0x000000, 0.3, 0, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1 }), -0.6, 3.5, B.z0 + 0.36, g, false, false); void scr;
    mesh(bx(4.4, 1.8, 0.08), MAT.black, -0.6, 3.5, B.z0 + 0.31, g); [-2.4, 1.2].forEach((x) => mesh(bx(0.05, 1.4, 0.05), MAT.darkSteel, x, 5.1, B.z0 + 0.31, g));
    const rings = I.SLOTS.map((s) => { const r = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.72, 48), std(0x000000, 0.4, 0, { emissive: 0x22d3ee, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 })); r.rotation.x = -Math.PI / 2; r.position.set(wx(s.x), 0.011, wz(s.y)); r.scale.set(1, 0.75, 1); g.add(r); return r; });
    const srv = new THREE.Group(); srv.position.set(6.0, 0, B.z0 + 0.45); g.add(srv); mesh(bx(0.6, 2.0, 0.8, 0.02), MAT.black, 0, 1.0, 0, srv);
    const leds = []; for (let i = 0; i < 10; i++) leds.push(mesh(bx(0.04, 0.02, 0.01), std(0x000000, 0.3, 0, { emissive: [0x22c55e, 0x38bdf8][i % 2], emissiveIntensity: 1.5 }), -0.2 + (i % 5) * 0.1, 0.5 + Math.floor(i / 5) * 0.9, 0.41, srv, false, false));
    let tt = 0;
    const draw = (S) => {
      const c = tex.userData.ctx, w = 512, h = 200; c.fillStyle = '#04121c'; c.fillRect(0, 0, w, h);
      const run = S.machines.filter((m) => m.cyc).length, oee = S.machines.length ? Math.round(run / S.machines.length * 100) : 0;
      c.fillStyle = '#5ee0ff'; c.font = '700 22px ' + FONT; c.fillText('SMART FACTORY · LIVE', 16, 30);
      c.fillStyle = '#fff'; c.font = '800 46px ' + FONT; c.fillText('OEE ' + oee + '%', 16, 86);
      c.fillStyle = '#9ca3af'; c.font = '600 20px ' + FONT; c.fillText('Machines ' + run + '/' + S.machines.length + '  ·  Orders ' + S.orders.length, 16, 122);
      c.fillText('Predictive maintenance: ON', 16, 150);
      S.machines.forEach((m, i) => { const x = 300 + i * 34, hh = m.cond * 1.4; c.fillStyle = m.broken ? '#ef4444' : m.cond < 50 ? '#f59e0b' : '#22c55e'; c.fillRect(x, 180 - hh, 24, hh); });
      tex.needsUpdate = true;
    };
    return { g, upd: (S, dt, t) => {
      tt -= dt; if (tt <= 0) { tt = 1; draw(S); }
      rings.forEach((r, i) => { const m = S.machines[i]; r.visible = !!m; if (m) { r.material.emissive.setHex(m.broken ? 0xef4444 : m.cond < 50 ? 0xf59e0b : 0x22d3ee); r.material.emissiveIntensity = 0.6 + Math.sin(t * 3 + i) * 0.3; } });
      leds.forEach((l, i) => { l.visible = Math.sin(t * (3 + i) + i * 1.7) > -0.3; });
    } };
  };
  DEF.solarRoof = (B) => {
    const g = new THREE.Group();
    for (let x = B.x0 + 1.2; x < B.x1 - 1; x += 2.1) solarPanel(g, x, B.h + 0.75, B.z0 + 0.8, 2.0, 1.5, 0.3);
    // carport over the left yard
    const cp = new THREE.Group(); cp.position.set(-17.5, 0, 1.2); g.add(cp);
    [[-2.8, -3.2], [2.8, -3.2], [-2.8, 3.2], [2.8, 3.2], [-2.8, 0], [2.8, 0]].forEach(([x, z]) => mesh(bx(0.16, 2.9, 0.16), MAT.galv, x, 1.45, z, cp));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) solarPanel(cp, -2.25 + j * 2.25, 3.0, -2.7 + i * 1.8, 2.2, 1.7, 0.12);
    const inv = new THREE.Group(); inv.position.set(-20.6, 0, -1.5); g.add(inv); mesh(bx(0.9, 1.6, 2.4, 0.03), MAT.white, 0, 0.8, 0, inv); mesh(bx(0.92, 0.12, 2.42), std(0x16a34a, 0.4, 0.2), 0, 1.3, 0, inv);
    const sg = signboard('SOLAR + BATTERY', 'CLEAN POWER · PASSIVE INCOME', 1.8, 0.42, { s1: 86, s2: 40, bg: '#14532d', c2: '#bbf7d0' }); sg.position.set(-20.1, 1.95, -1.5); sg.rotation.y = Math.PI / 2; g.add(sg);
    return { g, upd: null };
  };

  /* ---------- outside: export fleet, plants, hubs ---------- */
  const RAIL_Z = -19, RUNWAY_Z = -27, QUAY_Z = -33, SHIP_Z = -41.5;
  DEF.rail = () => {
    const g = new THREE.Group();
    mesh(bx(300, 0.18, 3.4), std(0x6f6a64, 0.95, 0), 0, 0.06, RAIL_Z, g, false, true);
    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.14, 2.6), std(0x4a3d32, 0.9, 0), 460), m4 = new THREE.Matrix4();
    for (let i = 0; i < 460; i++) { m4.makeTranslation(-150 + i * 0.65, 0.2, RAIL_Z); sl.setMatrixAt(i, m4); } sl.receiveShadow = true; g.add(sl);
    [-0.72, 0.72].forEach((dz) => mesh(bx(300, 0.14, 0.08), MAT.steel, 0, 0.32, RAIL_Z + dz, g, false, true));
    // freight station: platform, gantry and sign
    mesh(boxW(26, 0.9, 3.2, 3), MAT.concrete, 4, 0.45, RAIL_Z + 3.4, g, false, true);
    const st = signboard('GUNVORA FREIGHT', 'RAIL EXPORT TERMINAL', 4.6, 1.0, { s1: 96, s2: 44, bg: '#1e3a8a', c2: '#fbbf24' }); st.position.set(4, 3.6, RAIL_Z + 4.9); g.add(st);
    [-1.6, 9.6].forEach((x) => mesh(bx(0.18, 3.6, 0.18), MAT.galv, x - 3.6 + 4, 1.8, RAIL_Z + 4.9, g));
    staticBatch(g);
    // the train (locomotive + container wagons)
    const tr = new THREE.Group(); g.add(tr); const A = { wheels: [] };
    const loco = new THREE.Group(); loco.position.x = 22; tr.add(loco);
    mesh(bx(17, 0.5, 3.0), MAT.darkSteel, 0, 1.2, 0, loco); mesh(bx(14, 3.0, 2.9, 0.18), std(0xe56f17, 0.35, 0.3), -1, 2.95, 0, loco); mesh(bx(3.2, 3.6, 3.0, 0.25), std(0x1e3a8a, 0.35, 0.3), 6.6, 3.2, 0, loco);
    mesh(bx(0.05, 1.0, 2.4), MAT.winGlass, 8.22, 3.9, 0, loco, false, false); mesh(bx(14.1, 0.25, 2.95), MAT.white, -1, 2.2, 0, loco);
    for (let i = 0; i < 6; i++) { const w = new THREE.Group(); w.position.x = 22 - 18 - i * 13.6; tr.add(w); mesh(bx(13, 0.45, 2.7), MAT.darkSteel, 0, 1.15, 0, w); [-3.1, 3.1].forEach((x) => { const c = new THREE.Mesh(contGeo, contMat([0x8f2b22, 0x2c5d86, 0x4f6b3a, 0xb45309, 0x1e3a8a, 0x6b21a8][(i * 2 + (x > 0 ? 1 : 0)) % 6])); c.position.set(x, 2.7, 0); c.castShadow = true; w.add(c); }); [-5, 5].forEach((x) => [-0.72, 0.72].forEach((z) => { const wh = mesh(cy(0.45, 0.45, 0.14, 14), MAT.darkSteel, x, 0.65, z, w); wh.rotation.x = Math.PI / 2; A.wheels.push(wh); })); }
    [-6, 6].forEach((x) => [-0.72, 0.72].forEach((z) => { const wh = mesh(cy(0.5, 0.5, 0.14, 14), MAT.darkSteel, x, 0.7, z, loco); wh.rotation.x = Math.PI / 2; A.wheels.push(wh); }));
    tr.position.set(0, 0, RAIL_Z); let lx = 0;
    return { g, upd: (S, dt) => {
      const d = S.deliveries.filter((q) => q.ex && q.kind === 1)[0]; let x = 0;
      if (d) { const f = d.t / d.dur; x = f < 0.5 ? Math.pow(f / 0.5, 1.8) * 180 : -180 + (1 - Math.pow(1 - (f - 0.5) / 0.5, 2)) * 180; }
      const dx = x - lx; lx = x; tr.position.x = x; A.wheels.forEach((w) => { w.rotation.y += dx / 0.45; });
      if (d && Math.abs(dx) > 0.001 && Math.random() < 0.4) smoke(x + 26, 4.8, RAIL_Z, { c: [0.6, 0.6, 0.62], a: 0.3, size: 0.6, grow: 1.2, life: 1.6, vy: 1.2, wind: -1 });
    } };
  };
  DEF.port = () => {
    const g = new THREE.Group();
    const water = mesh(new THREE.PlaneGeometry(420, 160), std(0x22506d, 0.08, 0.35, { envMapIntensity: 1.3 }), 0, 0.04, QUAY_Z - 80, g, false, true); water.rotation.x = -Math.PI / 2;
    mesh(boxW(420, 1.2, 3.0, 3), MAT.concrete, 0, -0.3, QUAY_Z + 1.5, g, false, true);
    for (let x = -60; x <= 60; x += 6) mesh(cy(0.18, 0.22, 0.4, 10), MAT.black, x, 0.5, QUAY_Z + 0.4, g);
    // ship-to-shore cranes
    [-6, 18].forEach((cx) => { const c = new THREE.Group(); c.position.set(cx, 0, QUAY_Z + 1.5); g.add(c); const red = std(0xb91c1c, 0.45, 0.4);
      [[-4, 1.2], [4, 1.2], [-4, -1.2], [4, -1.2]].forEach(([x, z]) => mesh(bx(0.7, 18, 0.7), red, x, 9, z * 1.4, c));
      mesh(bx(9, 1.2, 1.2), red, 0, 17.6, 1.7, c); mesh(bx(9, 1.2, 1.2), red, 0, 17.6, -1.7, c);
      mesh(bx(1.4, 1.4, 34), MAT.paintGrey, 0, 19, -9, c); mesh(bx(3, 2.4, 3), MAT.white, 0, 17.2, -4, c); });
    staticBatch(g);
    // container ship
    const ship = new THREE.Group(); g.add(ship);
    const sh = new THREE.Shape(); sh.moveTo(-22, -4); sh.lineTo(16, -4); sh.quadraticCurveTo(23, -2.5, 24, 0); sh.quadraticCurveTo(23, 2.5, 16, 4); sh.lineTo(-22, 4); sh.lineTo(-22, -4);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false }); hg.rotateX(-Math.PI / 2); hg.translate(0, -2.2, 0);
    mesh(hg, std(0x1e3a5f, 0.5, 0.3), 0, 0, 0, ship);
    const red = hg.clone(); red.scale(1.002, 0.3, 1.002); mesh(red, std(0x8b1d1d, 0.6, 0.2), 0, -0.6, 0, ship);
    mesh(bx(6, 7, 7.4, 0.1), MAT.white, -17, 6.3, 0, ship); mesh(bx(6.2, 0.2, 9.4), MAT.white, -17, 9.2, 0, ship); mesh(bx(0.05, 1.0, 7.0), MAT.winGlass, -13.97, 8.5, 0, ship, false, false);
    mesh(cy(0.9, 1.1, 3.4, 14), std(0x1e293b, 0.5, 0.3), -20, 10, 0, ship);
    const ci = new THREE.InstancedMesh(contGeo, std(0xffffff, 0.55, 0.45), 60), cols = [0x8f2b22, 0x2c5d86, 0x4f6b3a, 0xb45309, 0x1e3a8a, 0xd1d5db, 0x6b21a8, 0x0f766e], m4 = new THREE.Matrix4(), col = new THREE.Color(); let n = 0;
    for (let b = 0; b < 5; b++) for (let r = 0; r < 3; r++) for (let tier = 0; tier < 3 + (b + r) % 2; tier++) { if (n >= 60) break; m4.makeTranslation(-9.5 + b * 6.3, 4.1 + tier * 2.6, -2.6 + r * 2.6); ci.setMatrixAt(n, m4); ci.setColorAt(n, col.setHex(cols[(b * 7 + r * 3 + tier) % 8])); n++; }
    ci.count = n; ci.castShadow = true; ship.add(ci);
    ship.position.set(8, 0, SHIP_Z);
    const sg = signboard('GUNVORA PORT', 'CONTAINER EXPORT TERMINAL', 6, 1.3, { s1: 100, s2: 44, bg: '#0c4a6e', c2: '#fbbf24', glow: true }); sg.position.set(-22, 3.4, QUAY_Z + 3.2); g.add(sg);
    mesh(bx(0.2, 3.0, 0.2), MAT.galv, -24.5, 1.5, QUAY_Z + 3.1, g); mesh(bx(0.2, 3.0, 0.2), MAT.galv, -19.5, 1.5, QUAY_Z + 3.1, g);
    let lx = 8;
    return { g, upd: (S, dt, t) => {
      const d = S.deliveries.filter((q) => q.ex && q.kind === 2)[0]; let x = 8;
      if (d) { const f = d.t / d.dur; x = f < 0.5 ? 8 + Math.pow(f / 0.5, 1.6) * 200 : -190 + (1 - Math.pow(1 - (f - 0.5) / 0.5, 2)) * 198; }
      const dx = x - lx; lx = x; ship.position.x = x; ship.position.y = Math.sin(t * 0.8) * 0.08; ship.rotation.x = Math.sin(t * 0.6) * 0.006;
      if (d && Math.abs(dx) > 0.002 && Math.random() < 0.6) smoke(x - 22, 0.3, SHIP_Z + rnd(-3, 3), { c: [0.95, 0.97, 1], a: 0.4, size: 1.0, grow: 1.6, life: 2.2, vy: 0.05, wind: 0 });
    } };
  };
  DEF.airport = () => {
    const g = new THREE.Group();
    mesh(bx(120, 0.05, 7), std(0x2b2d31, 0.85, 0), 88, 0.02, RUNWAY_Z, g, false, true);
    const dm = std(0xf3f1e8, 0.6, 0); for (let x = 32; x < 146; x += 6) { const l = mesh(new THREE.PlaneGeometry(3, 0.25), dm, x, 0.05, RUNWAY_Z, g, false, false); l.rotation.x = -Math.PI / 2; }
    const hg = new THREE.Group(); hg.position.set(38, 0, RUNWAY_Z + 3.0); g.add(hg);
    const arch = new THREE.CylinderGeometry(5, 5, 14, 24, 1, false, 0, Math.PI); arch.rotateZ(Math.PI / 2); arch.rotateX(Math.PI / 2);
    mesh(bx(14, 0.2, 2.4), MAT.concrete, 0, 0.1, 0, hg); const sg = signboard('GUNVORA AIR CARGO', 'EXPRESS EXPORT', 4.6, 1.0, { s1: 92, s2: 44, bg: '#312e81', c2: '#fbbf24' }); sg.position.set(0, 2.4, 1.3); hg.add(sg);
    [-6.8, 6.8].forEach((x) => mesh(bx(0.2, 2.4, 0.2), MAT.galv, x * 0.4, 1.2, 1.25, hg));
    // windsock + tower
    const tw = new THREE.Group(); tw.position.set(30, 0, RUNWAY_Z + 5); g.add(tw); mesh(cy(0.8, 1.0, 9, 12), MAT.white, 0, 4.5, 0, tw); mesh(cy(1.6, 1.6, 1.6, 12), MAT.winGlass, 0, 9.6, 0, tw); mesh(cy(1.8, 1.8, 0.2, 12), MAT.paintDark, 0, 10.5, 0, tw);
    staticBatch(g);
    // cargo plane
    const pl = new THREE.Group(); g.add(pl); const wh = std(0xf4f5f6, 0.3, 0.2), blue = std(0x312e81, 0.35, 0.3);
    mesh(cy(1.5, 1.5, 22, 20), wh, 0, 0, 0, pl).rotation.z = Math.PI / 2;
    const nose = mesh(new THREE.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), wh, 11, 0, 0, pl); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.8, 1);
    const tail = mesh(new THREE.CylinderGeometry(1.5, 0.4, 5, 20), wh, -13.5, 0.5, 0, pl); tail.rotation.z = Math.PI / 2 + 0.12;
    const wing = new THREE.Shape(); wing.moveTo(2.5, 0); wing.lineTo(-1.5, 15); wing.lineTo(-4, 15); wing.lineTo(-3, 0); wing.lineTo(2.5, 0);
    const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.3, bevelEnabled: false }); wg.rotateX(Math.PI / 2);
    const w1 = mesh(wg, wh, 0, 0.6, 0, pl); void w1; const w2 = mesh(wg, wh, 0, 0.9, 0, pl); w2.scale.z = -1;
    mesh(bx(3, 4.5, 0.3), blue, -14.5, 3, 0, pl); mesh(bx(2.6, 0.25, 9), wh, -14.5, 1.0, 0, pl);
    [-5.5, -10.5, 5.5, 10.5].forEach((z) => mesh(cy(0.7, 0.6, 3.2, 14), MAT.paintGrey, 0.6, -0.4, z * (Math.abs(z) > 6 ? 0.92 : 0.95), pl).rotation.z = Math.PI / 2);
    mesh(bx(16, 0.3, 3.04), blue, 0, -0.4, 0, pl);
    const gear = new THREE.Group(); pl.add(gear); [[6, 0], [-2, 1.4], [-2, -1.4]].forEach(([x, z]) => { mesh(bx(0.2, 1.4, 0.2), MAT.darkSteel, x, -2.0, z, gear); mesh(cy(0.45, 0.45, 0.4, 12), MAT.rubber, x, -2.6, z, gear).rotation.x = Math.PI / 2; });
    const HOME = 44, GY = 3.05; pl.position.set(HOME, GY, RUNWAY_Z);
    return { g, upd: (S, dt) => {
      const d = S.deliveries.filter((q) => q.ex && q.kind === 3)[0]; let x = HOME, y = GY, pitch = 0;
      if (d) {
        const f = d.t / d.dur;
        if (f < 0.5) { const s = f / 0.5; if (s < 0.3) x = HOME + 80 * Math.pow(s / 0.3, 2); else { const e = (s - 0.3) / 0.7; x = HOME + 80 + e * 320; y = GY + Math.pow(e, 1.25) * 70; pitch = 0.16 * (1 - e * 0.6); } }
        else { const e = (f - 0.5) / 0.5; if (e < 0.75) { const k = e / 0.75; x = -320 + k * 342; y = GY + (1 - k) * 60; pitch = -0.05; } else { const k = (e - 0.75) / 0.25; x = 22 + (1 - Math.pow(1 - k, 2)) * (HOME - 22); } }
      }
      pl.position.set(x, y, RUNWAY_Z); pl.rotation.z = pitch; gear.visible = y < GY + 18;
    } };
  };
  const PLANT_X = [-44, -30, -16, -2];
  const PLANT_COL = [0xdfe3e6, 0xd6c7b0, 0xc9d6df, 0xe2dccd];
  function plantDef(i) {
    return () => {
      const g = new THREE.Group(), x = PLANT_X[i], z = -27; g.position.set(x, 0, z);
      const wall = std(PLANT_COL[i], 0.6, 0.3);
      mesh(bx(11, 4.6, 7, 0.05), wall, 0, 2.3, 0, g);
      for (let k = 0; k < 4; k++) { const r = mesh(bx(2.75, 0.18, 3.0), MAT.paintGrey, -4.1 + k * 2.75, 5.15, -1.2, g); r.rotation.x = -0.45; const gl = mesh(bx(2.75, 1.2, 0.08), MAT.winGlass, -4.1 + k * 2.75, 5.0, 0.2, g, false, false); void gl; mesh(bx(2.75, 0.18, 2.6), MAT.paintGrey, -4.1 + k * 2.75, 5.0, 1.9, g).rotation.x = 0.3; }
      mesh(bx(3.2, 3.0, 0.1), std(0xa8b0b8, 0.4, 0.6), 2.5, 1.5, 3.51, g);
      mesh(cy(0.4, 0.5, 10, 14), MAT.galv, -4.6, 5, -2.6, g);
      const sg = signboard(D.plants.names[i].toUpperCase() + ' PLANT', 'GUNVORA SATELLITE FACTORY', 4.4, 0.95, { s1: 96, s2: 42, bg: '#1e1b4b', c2: '#f97316' }); sg.position.set(-1.8, 3.6, 3.52); g.add(sg);
      mesh(boxW(3.2, 0.05, 8, 3), MAT.concrete, 2.5, 0.01, 7.5, g, false, true);
      g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
      staticBatch(g); let acc = 0;
      return { g, upd: (S, dt) => { acc += dt * 1.6; while (acc > 1) { acc -= 1; smoke(x - 4.6, 10.2, z - 2.6, { c: [0.8, 0.8, 0.82], a: 0.3, size: 1.1, grow: 1.5, life: 3.5, vy: 1.1, wind: 0.6 }); } } };
    };
  }
  const HUB_X = [-58, -24, 12, 48, 84];
  function hubDef(i) {
    return () => {
      const g = new THREE.Group(), x = HUB_X[i], z = -84; g.position.set(x, 0, z);
      const glass = std(0x7fa3c9, 0.08, 0.85, { envMapIntensity: 1.4 }), bands = std(0x2b3036, 0.5, 0.5);
      const hs = [[0, 0, 7, 46], [-9, 3, 6, 30], [8, 4, 6, 36], [-3, -8, 5, 24]];
      hs.forEach(([dx, dz, w, h], k) => { mesh(bx(w, h, w, 0.2), glass, dx, h / 2, dz, g); for (let y = 4; y < h; y += 4) mesh(bx(w + 0.06, 0.25, w + 0.06), bands, dx, y, dz, g); if (k === 0) { mesh(cy(0.15, 0.15, 8, 6), MAT.galv, dx, h + 4, dz, g); } });
      const globe = mesh(new THREE.SphereGeometry(3.2, 24, 16), std(0x0ea5e9, 0.3, 0.2, { emissive: 0x0ea5e9, emissiveIntensity: 0.5, wireframe: true }), 0, 50, 0, g, false, false);
      const sg = signboard(D.hubs.names[i].toUpperCase(), 'GUNVORA GLOBAL HUB', 12, 2.6, { s1: 120, s2: 46, bg: '#0b1220', c2: '#38bdf8', glow: true }); sg.position.set(0, 8, 5.2); g.add(sg);
      g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
      return { g, upd: (S, dt) => { globe.rotation.y += dt * 0.5; } };
    };
  }
  for (let i = 0; i < 4; i++) DEF['plant' + i] = plantDef(i);
  for (let i = 0; i < 5; i++) DEF['hub' + i] = hubDef(i);
  const INSIDE = { printLine: 1, autoDock: 1, agv: 1, smart: 1, solarRoof: 1 };

  /* ---------- plant shuttle vans (behind the fence) ---------- */
  const vans = []; let vanGap = 0;
  function buildVan(i) {
    const g = new THREE.Group(), wh = std(0xf4f5f6, 0.3, 0.2);
    mesh(bx(4.6, 1.9, 1.9, 0.12), wh, 0, 1.35, 0, g); mesh(bx(1.0, 1.2, 1.88, 0.12), std(0x1e3a8a, 0.35, 0.3), 2.5, 1.05, 0, g); mesh(bx(0.05, 0.6, 1.6), MAT.winGlass, 3.0, 1.45, 0, g, false, false);
    mesh(bx(4.62, 0.3, 1.92), std(0xf97316, 0.4, 0.2), 0, 1.4, 0, g);
    [[-1.4, 0.85], [1.9, 0.85], [-1.4, -0.85], [1.9, -0.85]].forEach(([x, z]) => mesh(cy(0.36, 0.36, 0.26, 14), MAT.rubber, x, 0.36, z, g).rotation.x = Math.PI / 2);
    blobShadow(g, 5.4, 2.4, 0, 0, 0.6); g.userData.name = D.plants.names[i % 4]; return g;
  }
  function spawnVan(S) {
    if (vans.length >= 2 || vanGap > 0 || !S.plants) return; vanGap = 6;
    const i = Math.floor(Math.random() * S.plants), px = PLANT_X[i];
    const g = buildVan(i); root.add(g);
    vans.push({ g, pts: [[px + 2.5, -22], [px + 2.5, -15.2], [-12.6, -15.2], [-12.6, -10.5]], seg: 0, s: 0 });
  }
  function stepVans(dt) {
    vanGap -= dt;
    for (let k = vans.length - 1; k >= 0; k--) {
      const v = vans[k], a = v.pts[v.seg], b = v.pts[v.seg + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      v.s += dt * 7; if (v.s >= L) { v.s -= L; v.seg++; if (v.seg >= v.pts.length - 1) { root.remove(v.g); vans.splice(k, 1); continue; } }
      const a2 = v.pts[v.seg], b2 = v.pts[v.seg + 1], L2 = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), f = clamp(v.s / L2, 0, 1);
      v.g.position.set(lerp(a2[0], b2[0], f), 0, lerp(a2[1], b2[1], f));
      const yaw = Math.atan2(-(b2[1] - a2[1]), b2[0] - a2[0]); let d = yaw - v.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.g.rotation.y += d * Math.min(1, dt * 6);
    }
  }

  /* ---------- sync ---------- */
  let lastSp = -1;
  function wanted(S) {
    const w = [];
    Object.keys(INSIDE).forEach((k) => { if (S.fac[k]) w.push(k); });
    if (S.fleet >= 1) w.push('rail'); if (S.fleet >= 2) w.push('port'); if (S.fleet >= 3) w.push('airport');
    for (let i = 0; i < Math.min(4, S.plants); i++) w.push('plant' + i);
    for (let i = 0; i < Math.min(5, S.hubs); i++) w.push('hub' + i);
    return w;
  }
  function focusOf(k, B) {
    if (k === 'printLine') return [-3.8, 1.2, B.z0 + 1.35]; if (k === 'autoDock') return [8, 1, B.z1 - 1]; if (k === 'agv') return [0, 0.5, 2];
    if (k === 'smart') return [-0.6, 3.5, B.z0 + 0.5]; if (k === 'solarRoof') return [-17.5, 3, 1.2];
    if (k === 'rail') return [4, 2, RAIL_Z]; if (k === 'port') return [8, 4, SHIP_Z]; if (k === 'airport') return [44, 3, RUNWAY_Z];
    if (k.startsWith('plant')) return [PLANT_X[+k[5]], 3, -27]; if (k.startsWith('hub')) return [HUB_X[+k[3]], 10, -84];
    return [0, 1, 0];
  }
  function sync(S, dt, t, B, sp) {
    if (sp !== lastSp) { Object.keys(parts).forEach((k) => { if (parts[k].inside) { root.remove(parts[k].g); delete parts[k]; } }); const was = lastSp; lastSp = sp; if (was >= 0) initial = initial || false; }
    const w = wanted(S);
    w.forEach((k) => {
      if (parts[k]) return;
      const p = DEF[k](B); p.inside = !!INSIDE[k]; parts[k] = p; root.add(p.g);
      if (!initial && !p.fresh) { p.g.scale.setScalar(0.001); grow.push({ g: p.g, t: 0, f: focusOf(k, B) }); }
    });
    Object.keys(parts).forEach((k) => { if (w.indexOf(k) < 0) { root.remove(parts[k].g); delete parts[k]; } });
    initial = false;
    for (let i = grow.length - 1; i >= 0; i--) {
      const a = grow[i]; a.t += dt; const f = clamp(a.t / 1.4, 0, 1), e = 1 - Math.pow(1 - f, 3);
      a.g.scale.set(1, Math.max(0.001, e), 1); if (a.t < 1.2 && Math.random() < 0.7) { smoke(a.f[0] + rnd(-2, 2), 0.3, a.f[2] + rnd(-1.5, 1.5), { c: [0.72, 0.68, 0.6], a: 0.45, size: rnd(0.8, 1.4), grow: 1.5, life: 1.6, vy: 0.6, wind: 0.2 }); if (Math.random() < 0.4) spark(a.f[0] + rnd(-1, 1), a.f[1] + 0.5, a.f[2], 6, [1, 0.8, 0.4]); }
      if (f >= 1) { a.g.scale.set(1, 1, 1); grow.splice(i, 1); }
    }
    Object.keys(parts).forEach((k) => { const p = parts[k]; if (p.upd) p.upd(S, dt, t); });
    stepVans(dt);
  }
  function fx(kind, d, S) { if (kind === 'plant') spawnVan(S); }
  function has(k) { return !!parts[k]; }
  return { sync, fx, has, root, RAIL_Z, QUAY_Z };
}
