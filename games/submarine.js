/* Deep Sea Strike: Patrol — original GUNVORA game. */
(function () {
  var W = 800, H = 450, S;
  function init() {
    S = { x: 120, y: H / 2, hp: 3, inv: 0, cd: 0, t: 0, speed: 140, torps: [], foes: [], shots: [], fx: [], bubbles: [], spawn: 1, rocks: [], kills: 0, dist: 0 };
    for (var i = 0; i < 14; i++) S.rocks.push({ x: i * 70, h: 20 + Math.random() * 50 });
    for (var j = 0; j < 40; j++) S.bubbles.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 3 + 1, v: 20 + Math.random() * 40 });
  }
  function boom(x, y, c, n) { for (var i = 0; i < (n || 16); i++) { var a = Math.random() * 7, s = 40 + Math.random() * 160; S.fx.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .6 + Math.random() * .4, c: c }); } }
  function update(dt, api) {
    S.t += dt; S.speed = 140 + S.t * 3.2; S.dist += S.speed * dt;
    var k = api.keys, p = api.pointer, v = 230;
    var mx = (k.right ? 1 : 0) - (k.left ? 1 : 0), my = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (p.down && !mx && !my) { var dx = p.x - S.x, dy = p.y - S.y, d = Math.hypot(dx, dy); if (d > 8) { mx = dx / d; my = dy / d; } }
    S.x = Math.max(50, Math.min(W * .6, S.x + mx * v * dt)); S.y = Math.max(40, Math.min(H - 60, S.y + my * v * dt));
    S.cd -= dt;
    if ((k.fire || p.down) && S.cd <= 0) { S.torps.push({ x: S.x + 46, y: S.y + 6 }); S.cd = .38; api.sfx("shoot"); }
    S.torps.forEach(function (t) { t.x += 520 * dt; }); S.torps = S.torps.filter(function (t) { return t.x < W + 20 && !t.dead; });
    S.spawn -= dt;
    if (S.spawn <= 0) {
      var r = Math.random(), y = 50 + Math.random() * (H - 130);
      if (r < .5) S.foes.push({ type: "mine", x: W + 30, y: y, r: 16, ph: Math.random() * 6, hp: 1 });
      else if (r < .9) S.foes.push({ type: "sub", x: W + 60, y: y, hp: 2, cd: 1 + Math.random(), vy: (Math.random() - .5) * 40 });
      else S.foes.push({ type: "air", x: W + 20, y: y, r: 12 });
      S.spawn = Math.max(.35, 1.2 - S.t / 90) * (.6 + Math.random() * .8);
    }
    S.foes.forEach(function (f) {
      if (f.type === "mine") { f.x -= S.speed * dt; f.ph += dt * 2; f.yy = f.y + Math.sin(f.ph) * 10; }
      else if (f.type === "sub") { f.x -= (S.speed + 60) * dt; f.y += f.vy * dt; if (f.y < 40 || f.y > H - 80) f.vy *= -1; f.yy = f.y; f.cd -= dt; if (f.cd <= 0 && f.x < W - 40) { S.shots.push({ x: f.x - 40, y: f.y + 4 }); f.cd = 1.8 + Math.random(); } }
      else { f.x -= S.speed * .8 * dt; f.yy = f.y + Math.sin(S.t * 3 + f.x * .01) * 8; }
    });
    S.shots.forEach(function (s) { s.x -= (S.speed + 220) * dt; });
    // torpedo hits
    S.torps.forEach(function (t) {
      S.foes.forEach(function (f) {
        if (f.dead || f.type === "air" || t.dead) return;
        var hit = f.type === "mine" ? Math.hypot(t.x - f.x, t.y - f.yy) < f.r + 6 : Math.abs(t.x - f.x) < 42 && Math.abs(t.y - f.yy) < 16;
        if (hit) { t.dead = 1; f.hp--; if (f.hp <= 0) { f.dead = 1; S.kills++; api.setScore(api.score + (f.type === "sub" ? 50 : 20)); boom(f.x, f.yy, "#ffb300"); api.sfx("boom"); } else { boom(t.x, t.y, "#fff", 6); api.sfx("hit"); } }
      });
    });
    // player collisions
    function hurt() { if (S.inv > 0) return; S.hp--; S.inv = 1.4; boom(S.x, S.y, "#ff4d5e", 20); api.sfx("hit"); if (S.hp <= 0) api.over({ title: "Hull breached!", detail: S.kills + " kills · " + Math.round(S.dist / 100) + "m" }); }
    S.foes.forEach(function (f) {
      if (f.dead) return;
      var d = f.type === "sub" ? (Math.abs(f.x - S.x) < 70 && Math.abs(f.yy - S.y) < 26) : Math.hypot(f.x - S.x, f.yy - S.y) < (f.r || 12) + 22;
      if (!d) return;
      if (f.type === "air") { f.dead = 1; S.hp = Math.min(3, S.hp + 1); api.setScore(api.score + 10); api.sfx("coin"); }
      else { f.dead = 1; boom(f.x, f.yy, "#ffb300"); hurt(); }
    });
    S.shots.forEach(function (s) { if (!s.dead && Math.abs(s.x - S.x) < 40 && Math.abs(s.y - S.y) < 18) { s.dead = 1; hurt(); } });
    S.foes = S.foes.filter(function (f) { return !f.dead && f.x > -80; }); S.shots = S.shots.filter(function (s) { return !s.dead && s.x > -40; });
    S.inv = Math.max(0, S.inv - dt);
    if (Math.floor(S.dist / 100) > Math.floor((S.dist - S.speed * dt) / 100)) api.setScore(api.score + 1);
    S.fx.forEach(function (f) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vy *= .96; f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; });
    S.bubbles.forEach(function (b) { b.y -= b.v * dt; b.x -= S.speed * .3 * dt; if (b.y < -5 || b.x < -5) { b.y = H + 5; b.x = Math.random() * W * 1.2; } });
    S.rocks.forEach(function (r) { r.x -= S.speed * .9 * dt; if (r.x < -70) { r.x += 14 * 70; r.h = 20 + Math.random() * 50; } });
  }
  function sub(c, x, y, col, flip) {
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 46, 15, 0, 0, 7); c.fill();
    c.fillRect(-14, -26, 26, 16); c.fillRect(-2, -38, 4, 14);
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(0, 6, 44, 8, 0, 0, Math.PI); c.fill();
    c.fillStyle = "#7fe8ff"; [-22, -6, 10].forEach(function (px) { c.beginPath(); c.arc(px, -2, 4.5, 0, 7); c.fill(); });
    c.fillStyle = col; c.beginPath(); c.moveTo(-44, 0); c.lineTo(-58, -12); c.lineTo(-58, 12); c.fill();
    c.restore();
  }
  function draw(c, api) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a6fa8"); g.addColorStop(.5, "#063a6e"); g.addColorStop(1, "#020a1f"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(155,231,255,.07)"; for (var i = 0; i < 4; i++) { var ox = ((i * 260 - S.t * 20) % (W + 300) + W + 300) % (W + 300) - 150; c.beginPath(); c.moveTo(ox, 0); c.lineTo(ox + 60, 0); c.lineTo(ox - 60, H); c.lineTo(ox - 140, H); c.fill(); }
    c.strokeStyle = "rgba(155,231,255,.45)"; S.bubbles.forEach(function (b) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.stroke(); });
    c.fillStyle = "#01050f"; c.beginPath(); c.moveTo(0, H); S.rocks.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (r) { c.lineTo(r.x, H - r.h); c.lineTo(r.x + 35, H - r.h * .6); }); c.lineTo(W + 70, H); c.fill();
    S.foes.forEach(function (f) {
      if (f.type === "mine") { c.strokeStyle = "#333"; c.lineWidth = 4; for (var a = 0; a < 8; a++) { c.beginPath(); c.moveTo(f.x, f.yy); c.lineTo(f.x + Math.cos(a * .785) * 24, f.yy + Math.sin(a * .785) * 24); c.stroke(); } c.fillStyle = "#2a2a2a"; c.beginPath(); c.arc(f.x, f.yy, f.r, 0, 7); c.fill(); c.fillStyle = Math.sin(S.t * 8) > 0 ? "#ff2b2b" : "#600"; c.beginPath(); c.arc(f.x, f.yy, 4, 0, 7); c.fill(); c.lineWidth = 1; }
      else if (f.type === "sub") sub(c, f.x, f.yy, f.hp > 1 ? "#a33" : "#d55", true);
      else { c.fillStyle = "rgba(255,210,63,.3)"; c.beginPath(); c.arc(f.x, f.yy, 16, 0, 7); c.fill(); c.strokeStyle = "#ffd23f"; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.yy, 12, 0, 7); c.stroke(); c.fillStyle = "#ffd23f"; c.font = "bold 14px sans-serif"; c.textAlign = "center"; c.fillText("+", f.x, f.yy + 5); c.lineWidth = 1; }
    });
    c.fillStyle = "#e6f1ff"; S.torps.forEach(function (t) { c.fillRect(t.x - 14, t.y - 2.5, 22, 5); c.fillStyle = "#ff5a1f"; c.fillRect(t.x + 8, t.y - 2.5, 5, 5); c.fillStyle = "#e6f1ff"; });
    c.fillStyle = "#ff4d5e"; S.shots.forEach(function (s) { c.fillRect(s.x - 10, s.y - 2.5, 20, 5); });
    if (!(S.inv > 0 && Math.floor(S.t * 12) % 2)) sub(c, S.x, S.y, api.skin("sub") || "#ffb300");
    S.fx.forEach(function (f) { c.globalAlpha = Math.min(1, f.t * 1.6); c.fillStyle = f.c; c.beginPath(); c.arc(f.x, f.y, 3, 0, 7); c.fill(); }); c.globalAlpha = 1;
    c.textAlign = "left"; c.font = "bold 16px system-ui,sans-serif"; c.fillStyle = "#fff"; c.fillText("HULL", 14, H - 18);
    for (var h = 0; h < 3; h++) { c.fillStyle = h < S.hp ? "#39ff88" : "rgba(255,255,255,.2)"; c.fillRect(64 + h * 26, H - 32, 20, 16); }
    c.fillStyle = "#9be7ff"; c.fillText(Math.round(S.dist / 100) + " m", 160, H - 18);
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Arrows/WASD to move, Space to fire torpedoes. On mobile: drag to steer (auto-fire while touching) or use the buttons.", touch: { left: ["up", "down"], right: ["fire"] } });
})();
