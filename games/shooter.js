/* Star Vanguard — original Gaming World of Jarvis premium game. */
(function () {
  var W = 480, H = 680, S;
  function init() {
    S = { x: W / 2, y: H - 90, shield: 3, inv: 0, cd: 0, lvl: 1, wave: 0, t: 0, bullets: [], foes: [], eb: [], pw: [], fx: [], stars: [], next: 1.2, boss: null, banner: 0 };
    for (var i = 0; i < 90; i++) S.stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 3 + .5 });
  }
  function boom(x, y, c, n) { for (var i = 0; i < (n || 14); i++) { var a = Math.random() * 7, s = 40 + Math.random() * 200; S.fx.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .5 + Math.random() * .4, c: c }); } }
  function newWave() {
    S.wave++; S.banner = 1.6;
    if (S.wave % 5 === 0) { S.boss = { x: W / 2, y: -80, hp: 60 + S.wave * 12, max: 60 + S.wave * 12, cd: 1, ph: 0 }; return; }
    var n = 6 + Math.min(S.wave, 10), kinds = ["drone", "drone", "diver", "tank"];
    for (var i = 0; i < n; i++) {
      var k = kinds[Math.floor(Math.random() * Math.min(4, 1 + S.wave))];
      S.foes.push({ k: k, x: 40 + (i % 6) * 80, y: -40 - Math.floor(i / 6) * 60 - Math.random() * 30, hp: k === "tank" ? 4 : 1, ph: Math.random() * 6, cd: 1 + Math.random() * 2, dive: 0 });
    }
  }
  function update(dt, api) {
    S.t += dt; var k = api.keys, p = api.pointer, sp = 320;
    var mx = (k.right ? 1 : 0) - (k.left ? 1 : 0), my = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (p.down && !mx && !my) { var tx = p.x, ty = p.y - (p.type === "touch" ? 70 : 0), dx = tx - S.x, dy = ty - S.y, d = Math.hypot(dx, dy); if (d > 4) { var m = Math.min(1, d / 30); mx = dx / d * m * 1.6; my = dy / d * m * 1.6; } }
    S.x = Math.max(20, Math.min(W - 20, S.x + mx * sp * dt)); S.y = Math.max(H * .35, Math.min(H - 30, S.y + my * sp * dt));
    S.cd -= dt;
    if (S.cd <= 0) {
      var L = S.lvl; S.cd = .16; api.sfx("shoot");
      S.bullets.push({ x: S.x, y: S.y - 24, vx: 0 });
      if (L >= 2) { S.bullets.push({ x: S.x - 12, y: S.y - 14, vx: -40 }); S.bullets.push({ x: S.x + 12, y: S.y - 14, vx: 40 }); }
      if (L >= 3) { S.bullets.push({ x: S.x - 18, y: S.y - 6, vx: -140 }); S.bullets.push({ x: S.x + 18, y: S.y - 6, vx: 140 }); }
    }
    S.bullets.forEach(function (b) { b.y -= 640 * dt; b.x += b.vx * dt; }); S.bullets = S.bullets.filter(function (b) { return b.y > -10 && !b.dead; });
    if (!S.foes.length && !S.boss) { S.next -= dt; if (S.next <= 0) { newWave(); S.next = 1.2; } }
    S.foes.forEach(function (f) {
      f.ph += dt;
      if (f.k === "drone") { f.y += 70 * dt; f.x += Math.sin(f.ph * 2) * 90 * dt; }
      else if (f.k === "tank") { f.y += 45 * dt; }
      else { if (f.y < 140 || f.dive === 0) { f.y += 90 * dt; if (f.y > 140) f.dive = Math.sign(S.x - f.x) || 1; } else { f.y += 260 * dt; f.x += f.dive * 120 * dt; } }
      f.cd -= dt; if (f.cd <= 0 && f.y > 0 && f.y < H * .7) { var a = Math.atan2(S.y - f.y, S.x - f.x); S.eb.push({ x: f.x, y: f.y + 10, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 }); f.cd = 1.6 + Math.random() * 2 - Math.min(S.wave, 8) * .1; }
      if (f.y > H + 40) { f.y = -40; f.x = 40 + Math.random() * (W - 80); f.dive = 0; }
    });
    if (S.boss) {
      var B = S.boss; B.ph += dt; B.y = Math.min(110, B.y + 60 * dt); B.x = W / 2 + Math.sin(B.ph * .7) * (W / 2 - 90); B.cd -= dt;
      if (B.cd <= 0 && B.y >= 100) { var n = 10 + S.wave; for (var i = 0; i < n; i++) { var aa = B.ph + i * Math.PI * 2 / n; S.eb.push({ x: B.x, y: B.y + 20, vx: Math.cos(aa) * 150, vy: Math.sin(aa) * 150 + 40 }); } B.cd = 1.4; }
    }
    S.eb.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; }); S.eb = S.eb.filter(function (b) { return b.y < H + 10 && b.y > -20 && b.x > -20 && b.x < W + 20 && !b.dead; });
    // hits
    S.bullets.forEach(function (b) {
      S.foes.forEach(function (f) { if (!b.dead && !f.dead && Math.abs(b.x - f.x) < 18 && Math.abs(b.y - f.y) < 16) { b.dead = 1; f.hp--; if (f.hp <= 0) { f.dead = 1; api.setScore(api.score + (f.k === "tank" ? 40 : f.k === "diver" ? 25 : 15)); boom(f.x, f.y, f.k === "tank" ? "#ffd23f" : "#ff2bd6"); api.sfx("boom"); if (Math.random() < .12) S.pw.push({ x: f.x, y: f.y, t: Math.random() < .6 ? "gun" : "shield" }); } } });
      if (S.boss && !b.dead && Math.abs(b.x - S.boss.x) < 70 && Math.abs(b.y - S.boss.y) < 34) { b.dead = 1; S.boss.hp--; if (S.boss.hp <= 0) { boom(S.boss.x, S.boss.y, "#ffd23f", 60); api.sfx("boom"); api.setScore(api.score + 500); S.pw.push({ x: S.boss.x, y: S.boss.y, t: "gun" }, { x: S.boss.x + 30, y: S.boss.y, t: "shield" }); S.boss = null; } }
    });
    S.foes = S.foes.filter(function (f) { return !f.dead; });
    function hurt() { if (S.inv > 0) return; S.shield--; S.inv = 1.5; S.lvl = Math.max(1, S.lvl - 1); boom(S.x, S.y, "#00d4ff", 20); api.sfx("hit"); if (S.shield <= 0) api.over({ title: "Ship destroyed", detail: "Reached wave " + S.wave }); }
    S.eb.forEach(function (b) { if (Math.abs(b.x - S.x) < 12 && Math.abs(b.y - S.y) < 16) { b.dead = 1; hurt(); } });
    S.foes.forEach(function (f) { if (Math.abs(f.x - S.x) < 26 && Math.abs(f.y - S.y) < 24) { f.dead = 1; boom(f.x, f.y, "#ff2bd6"); hurt(); } });
    S.pw = S.pw.filter(function (q) { q.y += 110 * dt; if (Math.abs(q.x - S.x) < 26 && Math.abs(q.y - S.y) < 26) { if (q.t === "gun") S.lvl = Math.min(3, S.lvl + 1); else S.shield = Math.min(5, S.shield + 1); api.setScore(api.score + 20); api.sfx("coin"); return false; } return q.y < H + 20; });
    S.inv = Math.max(0, S.inv - dt); S.banner = Math.max(0, S.banner - dt);
    S.fx.forEach(function (f) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; });
    S.stars.forEach(function (s) { s.y += s.z * 60 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
  }
  function ship(c, x, y, col) {
    c.save(); c.translate(x, y);
    c.fillStyle = "rgba(0,212,255,.6)"; c.beginPath(); c.moveTo(-7, 18); c.lineTo(7, 18); c.lineTo(0, 30 + Math.random() * 10); c.fill();
    c.fillStyle = col; c.beginPath(); c.moveTo(0, -26); c.lineTo(10, -4); c.lineTo(24, 12); c.lineTo(24, 20); c.lineTo(6, 14); c.lineTo(0, 20); c.lineTo(-6, 14); c.lineTo(-24, 20); c.lineTo(-24, 12); c.lineTo(-10, -4); c.closePath(); c.fill();
    c.fillStyle = "#00d4ff"; c.beginPath(); c.moveTo(0, -16); c.lineTo(5, 0); c.lineTo(-5, 0); c.fill();
    c.restore();
  }
  function draw(c, api) {
    var g = c.createRadialGradient(W * .3, H * .2, 20, W * .5, H * .5, H); g.addColorStop(0, "#2a0a6e"); g.addColorStop(.5, "#0c0024"); g.addColorStop(1, "#000"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    S.stars.forEach(function (s) { c.fillStyle = "rgba(255,255,255," + s.z / 3.5 + ")"; c.fillRect(s.x, s.y, s.z * .8, s.z * .8 + (s.z > 2.5 ? 3 : 0)); });
    c.fillStyle = "#7fe8ff"; c.shadowColor = "#00d4ff"; c.shadowBlur = 8; S.bullets.forEach(function (b) { c.fillRect(b.x - 2, b.y - 8, 4, 14); }); c.shadowBlur = 0;
    S.foes.forEach(function (f) {
      c.save(); c.translate(f.x, f.y);
      if (f.k === "tank") { c.fillStyle = f.hp > 2 ? "#ffd23f" : "#ff8a3d"; c.beginPath(); c.moveTo(-20, -12); c.lineTo(20, -12); c.lineTo(14, 14); c.lineTo(-14, 14); c.fill(); c.fillStyle = "#3a0ca3"; c.fillRect(-6, -4, 12, 10); }
      else if (f.k === "diver") { c.fillStyle = "#ff4d5e"; c.beginPath(); c.moveTo(0, 16); c.lineTo(16, -12); c.lineTo(0, -4); c.lineTo(-16, -12); c.fill(); }
      else { c.fillStyle = "#ff2bd6"; c.beginPath(); c.moveTo(-16, -6); c.lineTo(0, -14); c.lineTo(16, -6); c.lineTo(10, 10); c.lineTo(-10, 10); c.fill(); c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill(); }
      c.restore();
    });
    if (S.boss) { var B = S.boss; c.save(); c.translate(B.x, B.y); c.fillStyle = "#7209b7"; c.beginPath(); c.ellipse(0, 0, 76, 30, 0, 0, 7); c.fill(); c.fillStyle = "#f72585"; c.beginPath(); c.ellipse(0, -10, 34, 18, 0, 0, 7); c.fill(); c.fillStyle = "#ffd23f"; for (var i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 26, 14, 5, 0, 7); c.fill(); } c.restore(); c.fillStyle = "rgba(255,255,255,.2)"; c.fillRect(40, 44, W - 80, 8); c.fillStyle = "#f72585"; c.fillRect(40, 44, (W - 80) * B.hp / B.max, 8); }
    c.fillStyle = "#ff4d5e"; S.eb.forEach(function (b) { c.beginPath(); c.arc(b.x, b.y, 4.5, 0, 7); c.fill(); });
    S.pw.forEach(function (q) { c.fillStyle = q.t === "gun" ? "#39ff88" : "#ff2bd6"; c.shadowColor = c.fillStyle; c.shadowBlur = 14; c.beginPath(); c.arc(q.x, q.y, 11, 0, 7); c.fill(); c.shadowBlur = 0; c.fillStyle = "#000"; c.font = "bold 12px sans-serif"; c.textAlign = "center"; c.fillText(q.t === "gun" ? "P" : "S", q.x, q.y + 4); });
    if (!(S.inv > 0 && Math.floor(S.t * 12) % 2)) ship(c, S.x, S.y, api.skin("ship") || "#e6f1ff");
    S.fx.forEach(function (f) { c.globalAlpha = Math.min(1, f.t * 2); c.fillStyle = f.c; c.fillRect(f.x - 2, f.y - 2, 4, 4); }); c.globalAlpha = 1;
    c.textAlign = "left"; c.font = "bold 15px system-ui,sans-serif"; c.fillStyle = "#fff"; c.fillText("WAVE " + S.wave + "   GUN Lv" + S.lvl, 12, H - 16);
    for (var s = 0; s < S.shield; s++) { c.fillStyle = "#00d4ff"; c.fillRect(W - 24 - s * 18, H - 30, 12, 14); }
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); c.textAlign = "center"; c.font = "900 34px system-ui,sans-serif"; c.fillStyle = S.wave % 5 === 0 ? "#f72585" : "#00d4ff"; c.fillText(S.wave % 5 === 0 ? "⚠ MOTHERSHIP ⚠" : "WAVE " + S.wave, W / 2, H / 2); c.globalAlpha = 1; }
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Arrows/WASD to fly — guns fire automatically. On mobile, drag anywhere to fly. Grab P to power up, S for shields.", touch: {} });
})();
