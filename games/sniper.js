/* Shadow Front: Sniper Range — original Gaming World of Jarvis game. */
(function () {
  var W = 800, H = 450, ROWS = [{ y: 235, s: .55 }, { y: 300, s: .75 }, { y: 390, s: 1 }];
  var S;
  function init(api) {
    S = { time: 60, ammo: 5, reload: 0, targets: [], spawn: .4, cx: W / 2, cy: H / 2, t: 0, fx: [], pops: [], shots: 0, hits: 0, flash: 0, recoil: 0, combo: 0 };
    api.state = S;
  }
  function spawn() {
    var row = Math.floor(Math.random() * 3), r = ROWS[row], kind = Math.random();
    var type = kind < .42 ? "plate" : kind < .85 ? "trooper" : "civ";
    var dir = Math.random() < .5 ? -1 : 1, moving = Math.random() < .55;
    S.targets.push({ row: row, type: type, x: 60 + Math.random() * (W - 120), vx: moving ? dir * (40 + Math.random() * 70) * r.s : 0, up: 0, life: 2.2 + Math.random() * 1.6, dead: 0 });
  }
  function shoot(api) {
    if (S.reload > 0) return;
    if (S.ammo <= 0) { S.reload = 1.1; return; }
    S.ammo--; S.shots++; S.flash = .08; S.recoil = 1; api.sfx("shoot");
    var ax = S.cx + sway().x, ay = S.cy + sway().y, hit = null;
    var order = S.targets.slice().sort(function (a, b) { return b.row - a.row; });
    for (var i = 0; i < order.length && !hit; i++) {
      var t = order[i]; if (t.dead || t.up < .6) continue;
      var r = ROWS[t.row], s = r.s, by = r.y;
      if (t.type === "plate") {
        var cy = by - 60 * s, d = Math.hypot(ax - t.x, ay - cy);
        if (d < 26 * s) hit = { t: t, pts: d < 8 * s ? 30 : 10, label: d < 8 * s ? "BULLSEYE" : "" };
      } else {
        var hy = by - 98 * s;
        if (Math.hypot(ax - t.x, ay - hy) < 11 * s) hit = { t: t, pts: 30, label: "HEADSHOT", head: 1 };
        else if (Math.abs(ax - t.x) < 17 * s && ay > by - 86 * s && ay < by - 20 * s) hit = { t: t, pts: 10, label: "" };
      }
    }
    if (hit) {
      var civ = hit.t.type === "civ";
      hit.t.dead = 1; S.hits++;
      S.combo = civ ? 0 : S.combo + 1;
      var pts = civ ? -25 : hit.pts + Math.min(S.combo - 1, 5) * 2;
      api.setScore(api.score + pts); api.sfx(civ ? "hit" : "coin");
      S.pops.push({ x: ax, y: ay - 10, txt: (pts > 0 ? "+" : "") + pts + (civ ? " CIVILIAN!" : hit.label ? " " + hit.label : ""), t: 1, c: civ ? "#ff4d5e" : hit.label ? "#ffd23f" : "#fff" });
    } else { S.combo = 0; }
    for (var k = 0; k < 8; k++) S.fx.push({ x: ax, y: ay, vx: (Math.random() - .5) * 160, vy: (Math.random() - .8) * 160, t: .5, c: hit ? (hit.t.type === "civ" ? "#7fb4ff" : "#ffd23f") : "#c9a35a" });
    if (S.ammo === 0) S.reload = 1.1;
  }
  function sway() { return { x: Math.sin(S.t * 1.3) * 3 + Math.sin(S.t * 3.1) * 1.2, y: Math.cos(S.t * 1.7) * 2.5 }; }
  function update(dt, api) {
    S.t += dt; S.time -= dt;
    if (S.time <= 0) { S.time = 0; api.over({ title: "Range complete", detail: "Accuracy " + (S.shots ? Math.round(S.hits / S.shots * 100) : 0) + "% · " + S.hits + " hits" }); return; }
    var p = api.pointer, k = api.keys;
    if (p.moved && p.type === "mouse") { S.cx = p.x; S.cy = p.y; p.moved = false; }
    if (p.tapped) { S.cx = p.x; S.cy = p.y; shoot(api); }
    var sp = 420 * dt; if (k.left) S.cx -= sp; if (k.right) S.cx += sp; if (k.up) S.cy -= sp; if (k.down) S.cy += sp;
    S.cx = Math.max(0, Math.min(W, S.cx)); S.cy = Math.max(0, Math.min(H, S.cy));
    if (api.hit("fire")) shoot(api);
    if (api.hit("r") && S.ammo < 5 && S.reload <= 0) S.reload = 1.1;
    if (S.reload > 0) { S.reload -= dt; if (S.reload <= 0) { S.ammo = 5; S.reload = 0; api.sfx("move"); } }
    S.spawn -= dt; var alive = S.targets.filter(function (t) { return !t.dead; }).length;
    if (S.spawn <= 0 && alive < 5) { spawn(); S.spawn = .45 + Math.random() * .7 - (60 - S.time) / 200; }
    S.targets.forEach(function (t) {
      if (t.dead) { t.up -= dt * 4; return; }
      t.life -= dt; t.up = t.life > 0 ? Math.min(1, t.up + dt * 4) : t.up - dt * 4; t.x += t.vx * dt;
      if (t.x < 30 || t.x > W - 30) t.vx *= -1;
    });
    S.targets = S.targets.filter(function (t) { return t.up > -0.05 || (!t.dead && t.life > 0); });
    S.fx.forEach(function (f) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 400 * dt; f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; });
    S.pops.forEach(function (f) { f.y -= 40 * dt; f.t -= dt; }); S.pops = S.pops.filter(function (f) { return f.t > 0; });
    S.flash = Math.max(0, S.flash - dt); S.recoil = Math.max(0, S.recoil - dt * 5);
  }
  function drawTarget(c, t) {
    var r = ROWS[t.row], s = r.s, up = Math.max(0, Math.min(1, t.up));
    c.save(); c.translate(t.x, r.y); c.scale(s, s * up); 
    c.fillStyle = "#4a3520"; c.fillRect(-3, -20, 6, 20);
    if (t.type === "plate") {
      c.translate(0, -60); [[26, "#f5f5f5"], [19, "#e53935"], [12, "#f5f5f5"], [6, "#e53935"]].forEach(function (a) { c.fillStyle = a[1]; c.beginPath(); c.arc(0, 0, a[0], 0, 7); c.fill(); });
    } else {
      var civ = t.type === "civ"; c.fillStyle = civ ? "#4d8dff" : "#2b2b2b"; c.strokeStyle = civ ? "#cfe0ff" : "#c9a35a"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-18, -20); c.lineTo(-16, -78); c.quadraticCurveTo(0, -90, 16, -78); c.lineTo(18, -20); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -98, 12, 0, 7); c.fill(); c.stroke();
      if (!civ) { c.strokeStyle = "#ff4d5e"; c.beginPath(); c.arc(0, -55, 9, 0, 7); c.stroke(); }
      else { c.fillStyle = "#fff"; c.font = "bold 11px sans-serif"; c.textAlign = "center"; c.fillText("CIV", 0, -48); }
    }
    c.restore();
  }
  function draw(c, api) {
    var sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#1d3b4f"); sky.addColorStop(.45, "#e0915a"); sky.addColorStop(.6, "#c9a35a"); sky.addColorStop(1, "#6b4f2a");
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(255,220,150,.8)"; c.beginPath(); c.arc(620, 150, 34, 0, 7); c.fill();
    c.fillStyle = "#3d3a4a"; c.beginPath(); c.moveTo(0, 210); for (var x = 0; x <= W; x += 40) c.lineTo(x, 175 + Math.sin(x * .013) * 22 + Math.sin(x * .05) * 6); c.lineTo(W, 230); c.lineTo(0, 230); c.fill();
    var berm = ["#9c7a42", "#8a6a37", "#7a5c2e"];
    for (var r = 0; r < 3; r++) {
      S.targets.forEach(function (t) { if (t.row === r) drawTarget(c, t); });
      c.fillStyle = berm[r]; var y = ROWS[r].y - 4; c.beginPath(); c.moveTo(0, y); for (var xx = 0; xx <= W; xx += 50) c.lineTo(xx, y + Math.sin(xx * .02 + r) * 4); c.lineTo(W, r === 2 ? H : ROWS[r + 1].y); c.lineTo(0, r === 2 ? H : ROWS[r + 1].y); c.fill();
      c.fillStyle = "rgba(0,0,0,.12)"; for (var sb = 0; sb < 8; sb++) c.fillRect(sb * 110 + r * 30, y + 2, 60, 6 * ROWS[r].s);
    }
    S.fx.forEach(function (f) { c.globalAlpha = f.t * 2; c.fillStyle = f.c; c.fillRect(f.x - 2, f.y - 2, 4, 4); }); c.globalAlpha = 1;
    // scope
    var sw = sway(), ax = S.cx + sw.x, ay = S.cy + sw.y - S.recoil * 10, R = 95, col = api.skin("scope") || "#39ff88";
    var vg = c.createRadialGradient(ax, ay, R - 2, ax, ay, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#111"; c.lineWidth = 10; c.beginPath(); c.arc(ax, ay, R, 0, 7); c.stroke();
    c.shadowColor = col; c.shadowBlur = 8; c.strokeStyle = col; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(ax - R, ay); c.lineTo(ax - 12, ay); c.moveTo(ax + 12, ay); c.lineTo(ax + R, ay); c.moveTo(ax, ay - R); c.lineTo(ax, ay - 12); c.moveTo(ax, ay + 12); c.lineTo(ax, ay + R); c.stroke();
    for (var m = 1; m <= 3; m++) { c.beginPath(); c.moveTo(ax - 5, ay + m * 18); c.lineTo(ax + 5, ay + m * 18); c.stroke(); }
    c.beginPath(); c.arc(ax, ay, 30, 0, 7); c.stroke(); c.shadowBlur = 0;
    c.fillStyle = "#ff2b2b"; c.beginPath(); c.arc(ax, ay, 2.2, 0, 7); c.fill();
    // rifle barrel
    var rc = api.skin("rifle"); c.save(); c.translate(W - 60, H + 20 + S.recoil * 14); c.rotate(-.5);
    c.fillStyle = rc || "#1c1f26"; c.fillRect(-20, -150, 40, 190); c.fillStyle = "#0b0c10"; c.fillRect(-8, -210, 16, 70);
    if (rc) { c.fillStyle = "rgba(255,210,63,.6)"; for (var d = 0; d < 6; d++) { c.beginPath(); c.arc(0, -130 + d * 30, 9, 0, Math.PI); c.fill(); } }
    if (S.flash > 0) { c.fillStyle = "rgba(255,220,120,.9)"; c.beginPath(); c.arc(0, -225, 26, 0, 7); c.fill(); }
    c.restore();
    S.pops.forEach(function (f) { c.globalAlpha = Math.min(1, f.t * 2); c.fillStyle = f.c; c.font = "bold 18px system-ui,sans-serif"; c.textAlign = "center"; c.fillText(f.txt, f.x, f.y); }); c.globalAlpha = 1;
    // HUD
    c.textAlign = "left"; c.font = "bold 16px system-ui,sans-serif"; c.fillStyle = "#fff";
    c.fillText("⏱ " + Math.ceil(S.time) + "s", 14, H - 18);
    for (var a = 0; a < 5; a++) { c.fillStyle = a < S.ammo ? "#ffd23f" : "rgba(255,255,255,.2)"; c.fillRect(100 + a * 14, H - 34, 8, 20); }
    if (S.reload > 0) { c.fillStyle = "#ff4d5e"; c.fillText("RELOADING…", 180, H - 18); }
    else if (S.ammo === 0) { c.fillStyle = "#ff4d5e"; c.fillText("PRESS R", 180, H - 18); }
    if (S.combo > 1) { c.fillStyle = "#00d4ff"; c.fillText("COMBO x" + S.combo, 290, H - 18); }
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Aim with mouse/arrows (or tap where you want to shoot). Click / Space to fire. 60 seconds — avoid blue civilians!", touch: { right: ["r"] } });
})();
