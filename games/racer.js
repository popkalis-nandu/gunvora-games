/* Turbo Racing: Rush — original Gaming World of Jarvis game. */
(function () {
  var W = 400, H = 640, L = 50, R = 350, LANES = 4, LW = (R - L) / LANES, S;
  var COLS = ["#ff8a3d", "#39ff88", "#b388ff", "#ffd23f", "#ff4d5e", "#7fe8ff"];
  function init() { S = { x: W / 2, speed: 260, t: 0, dist: 0, cars: [], fuel: [], spawn: .8, line: 0, boost: 0, tilt: 0, dead: 0, fx: [], scen: [], bonus: 0 }; for (var i = 0; i < 10; i++) S.scen.push({ y: i * 70, side: i % 2, k: Math.random() }); }
  function car(c, x, y, col, tilt, me) {
    c.save(); c.translate(x, y); c.rotate(tilt || 0);
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-20, -34, 44, 74);
    c.fillStyle = "#0b0b12"; c.fillRect(-24, -26, 8, 16); c.fillRect(16, -26, 8, 16); c.fillRect(-24, 14, 8, 16); c.fillRect(16, 14, 8, 16);
    var g = c.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, col); g.addColorStop(.5, "#ffffff"); g.addColorStop(.56, col); g.addColorStop(1, col);
    c.fillStyle = col === "#d9e4f5" ? g : col; roundRect(c, -19, -36, 38, 72, 10); c.fill();
    c.fillStyle = "#14142a"; roundRect(c, -14, -18, 28, 16, 4); c.fill(); roundRect(c, -14, 12, 28, 12, 4); c.fill();
    if (me) { c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(-3, -36, 6, 70); c.fillStyle = "#fff6c2"; c.fillRect(-16, -38, 8, 4); c.fillRect(8, -38, 8, 4); }
    else { c.fillStyle = "#ff3b3b"; c.fillRect(-16, 33, 8, 4); c.fillRect(8, 33, 8, 4); }
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function update(dt, api) {
    if (S.dead) { S.dead -= dt; S.fx.forEach(function (f) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }); if (S.dead <= 0) api.over({ title: "Crashed!", detail: Math.round(S.dist / 10) + " m · top speed " + Math.round(S.speed / 2.6) + " km/h" }); return; }
    S.t += dt; var k = api.keys, p = api.pointer;
    var base = Math.min(620, 260 + S.t * 6); S.boost = (k.up || k.fire) ? Math.min(1, S.boost + dt * 3) : Math.max(0, S.boost - dt * 2);
    S.speed = base * (1 + S.boost * .35);
    var steer = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    if (!steer && p.down) { var d = p.x - S.x; if (Math.abs(d) > 6) steer = Math.max(-1, Math.min(1, d / 40)); }
    S.x += steer * (240 + S.speed * .25) * dt; S.x = Math.max(L + 20, Math.min(R - 20, S.x)); S.tilt += (steer * .18 - S.tilt) * Math.min(1, dt * 10);
    S.dist += S.speed * dt; S.line = (S.line + S.speed * dt) % 60;
    S.scen.forEach(function (s) { s.y += S.speed * dt; if (s.y > H + 40) { s.y -= 700; s.k = Math.random(); } });
    S.spawn -= dt;
    if (S.spawn <= 0) {
      var lane = Math.floor(Math.random() * LANES), busy = S.cars.some(function (c) { return c.lane === lane && c.y < 120; });
      if (!busy) S.cars.push({ lane: lane, x: L + LW * (lane + .5), y: -60, v: 120 + Math.random() * 120, col: COLS[Math.floor(Math.random() * COLS.length)] });
      if (Math.random() < .18) S.fuel.push({ x: L + LW * (Math.floor(Math.random() * LANES) + .5), y: -40 });
      S.spawn = Math.max(.32, .95 - S.t / 80) * (.7 + Math.random() * .6);
    }
    S.cars.forEach(function (c) { c.y += (S.speed - c.v) * dt; });
    S.fuel.forEach(function (f) { f.y += S.speed * dt; });
    S.cars = S.cars.filter(function (c) { return c.y < H + 80; }); 
    var py = H - 110;
    S.fuel = S.fuel.filter(function (f) { if (Math.abs(f.x - S.x) < 30 && Math.abs(f.y - py) < 44) { S.bonus += 25; api.sfx("coin"); return false; } return f.y < H + 40; });
    for (var i = 0; i < S.cars.length; i++) { var c = S.cars[i]; if (Math.abs(c.x - S.x) < 34 && Math.abs(c.y - py) < 64) { S.dead = 1.1; api.sfx("boom"); for (var j = 0; j < 30; j++) { var a = Math.random() * 7, sp = 60 + Math.random() * 220; S.fx.push({ x: S.x, y: py - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 1, c: j % 2 ? "#ffd23f" : "#ff5a1f" }); } return; } }
    api.setScore(Math.floor(S.dist / 10) + S.bonus);
  }
  function draw(c, api) {
    c.fillStyle = "#0d0221"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#12062e"; c.fillRect(0, 0, L, H); c.fillRect(R, 0, W - R, H);
    S.scen.forEach(function (s) { var x = s.side ? R + 25 : L - 25; c.fillStyle = s.k > .5 ? "#ff2bd6" : "#00d4ff"; c.shadowColor = c.fillStyle; c.shadowBlur = 12; c.fillRect(x - 2, s.y, 4, 30); c.shadowBlur = 0; });
    c.fillStyle = "#1b1036"; c.fillRect(L, 0, R - L, H);
    c.fillStyle = "#00d4ff"; c.shadowColor = "#00d4ff"; c.shadowBlur = 10; c.fillRect(L - 3, 0, 4, H); c.fillRect(R - 1, 0, 4, H); c.shadowBlur = 0;
    c.fillStyle = "rgba(255,255,255,.55)"; for (var ln = 1; ln < LANES; ln++) for (var y = -60 + S.line; y < H; y += 60) c.fillRect(L + LW * ln - 2, y, 4, 30);
    S.fuel.forEach(function (f) { c.fillStyle = "#00d4ff"; c.shadowColor = "#00d4ff"; c.shadowBlur = 14; c.beginPath(); c.moveTo(f.x, f.y - 16); c.lineTo(f.x + 12, f.y); c.lineTo(f.x, f.y + 16); c.lineTo(f.x - 12, f.y); c.fill(); c.shadowBlur = 0; c.fillStyle = "#001018"; c.font = "bold 12px sans-serif"; c.textAlign = "center"; c.fillText("⚡", f.x, f.y + 4); });
    S.cars.forEach(function (k) { car(c, k.x, k.y, k.col); });
    if (S.boost > .05) { c.fillStyle = "rgba(0,212,255," + S.boost * .6 + ")"; c.beginPath(); c.moveTo(S.x - 10, H - 72); c.lineTo(S.x + 10, H - 72); c.lineTo(S.x, H - 72 + 30 + Math.random() * 20); c.fill(); }
    if (!S.dead || S.dead > .9) car(c, S.x, H - 110, api.skin("car") || "#00d4ff", S.tilt, true);
    S.fx.forEach(function (f) { c.globalAlpha = Math.max(0, f.t); c.fillStyle = f.c; c.fillRect(f.x - 3, f.y - 3, 6, 6); }); c.globalAlpha = 1;
    if (S.boost > .1) { c.strokeStyle = "rgba(255,255,255,.25)"; for (var i = 0; i < 8; i++) { var x = Math.random() * W; c.beginPath(); c.moveTo(x, Math.random() * H); c.lineTo(x, Math.random() * H); c.stroke(); } }
    c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(10, 44, 120, 30); c.fillStyle = "#fff"; c.font = "bold 16px system-ui,sans-serif"; c.textAlign = "left"; c.fillText(Math.round(S.speed / 2.6) + " km/h", 20, 65);
    c.fillStyle = "#9be7ff"; c.font = "bold 14px system-ui,sans-serif"; c.textAlign = "right"; c.fillText(Math.round(S.dist / 10) + " m", W - 14, 65);
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "← → (or A/D) to steer, hold ↑ for nitro. On mobile: touch and hold where you want to steer, or use the buttons.", touch: { left: ["left", "right"], right: ["up"] } });
})();
