/* Dino Dash — original Gaming World of Jarvis kids game (no ads, no purchases). */
(function () {
  var W = 800, H = 400, GY = 320, S;
  function init() { S = { y: GY, vy: 0, duck: false, t: 0, speed: 280, obs: [], stars: [], spawn: 1.2, hearts: 3, inv: 0, dist: 0, bonus: 0, clouds: [], hills: 0, leg: 0, pops: [] }; for (var i = 0; i < 5; i++) S.clouds.push({ x: i * 180 + Math.random() * 60, y: 40 + Math.random() * 80, s: .6 + Math.random() * .6 }); }
  function onGround() { return S.y >= GY - .5; }
  function update(dt, api) {
    S.t += dt; S.speed = Math.min(560, 280 + S.t * 4); S.dist += S.speed * dt;
    var k = api.keys, jumpHit = api.hit("up") || api.hit("fire") || api.pointer.tapped;
    S.duck = !!k.down && onGround();
    if (jumpHit && onGround()) { S.vy = -720; api.sfx("jump"); }
    if (!(k.up || k.fire || api.pointer.down) && S.vy < -300) S.vy = -300; // short hop when released
    S.vy += 2000 * dt; S.y = Math.min(GY, S.y + S.vy * dt); if (S.y >= GY) S.vy = 0;
    S.leg += dt * S.speed / 30;
    S.spawn -= dt;
    if (S.spawn <= 0) {
      var r = Math.random();
      if (r < .45) S.obs.push({ type: "cactus", x: W + 30, w: 24 + Math.floor(Math.random() * 2) * 22, h: 44 + Math.random() * 18 });
      else if (r < .75) S.obs.push({ type: "rock", x: W + 30, w: 46, h: 28 });
      else S.obs.push({ type: "bird", x: W + 30, w: 44, h: 26, yy: Math.random() < .5 ? GY - 70 : GY - 115, ph: 0 });
      if (Math.random() < .5) S.stars.push({ x: W + 160 + Math.random() * 100, y: GY - 120 - Math.random() * 60 });
      S.spawn = Math.max(.75, 1.6 - S.t / 70) * (.75 + Math.random() * .6);
    }
    S.obs.forEach(function (o) { o.x -= S.speed * dt * (o.type === "bird" ? 1.12 : 1); if (o.ph !== undefined) o.ph += dt * 10; });
    S.stars.forEach(function (s) { s.x -= S.speed * dt; });
    S.clouds.forEach(function (c) { c.x -= S.speed * .15 * c.s * dt; if (c.x < -100) { c.x = W + 50; c.y = 40 + Math.random() * 80; } });
    S.hills = (S.hills + S.speed * .3 * dt) % 400;
    var dh = S.duck ? 34 : 62, dx = 120, top = S.y - dh;
    S.obs.forEach(function (o) {
      if (o.hitDone) return;
      var oy = o.type === "bird" ? o.yy : GY - o.h, ob = o.type === "bird" ? o.yy + o.h : GY;
      if (o.x < dx + 26 && o.x + o.w > dx - 22 && top < ob - 6 && S.y > oy + 6) {
        o.hitDone = 1; if (S.inv > 0) return;
        S.hearts--; S.inv = 1.5; api.sfx("hit"); S.pops.push({ x: dx, y: top - 10, txt: "Oops!", t: 1 });
        if (S.hearts <= 0) api.over({ title: "Great running!", detail: "Rexi ran " + Math.round(S.dist / 20) + " m" });
      }
    });
    S.stars = S.stars.filter(function (s) { if (Math.abs(s.x - dx) < 36 && s.y > top - 30 && s.y < S.y + 10) { S.bonus += 20; api.sfx("coin"); S.pops.push({ x: s.x, y: s.y, txt: "+20 ⭐", t: 1 }); return false; } return s.x > -30; });
    S.obs = S.obs.filter(function (o) { return o.x > -80; });
    S.pops.forEach(function (p) { p.y -= 40 * dt; p.t -= dt; }); S.pops = S.pops.filter(function (p) { return p.t > 0; });
    S.inv = Math.max(0, S.inv - dt);
    api.setScore(Math.floor(S.dist / 20) + S.bonus);
  }
  function star(c, x, y, r) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function dino(c, x, y, duck, leg, blink) {
    c.save(); c.translate(x, y); if (blink) c.globalAlpha = .4;
    var body = "#3ddc84", dark = "#2fb36d";
    if (duck) { c.fillStyle = body; c.beginPath(); c.ellipse(0, -18, 40, 18, 0, 0, 7); c.fill(); c.beginPath(); c.arc(38, -22, 16, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(44, -26, 5, 0, 7); c.fill(); c.fillStyle = "#111"; c.beginPath(); c.arc(45, -26, 2.5, 0, 7); c.fill(); }
    else {
      c.fillStyle = body; c.beginPath(); c.moveTo(-24, -30); c.quadraticCurveTo(-52, -26, -58, -12); c.quadraticCurveTo(-36, -16, -20, -16); c.fill();
      c.beginPath(); c.ellipse(0, -30, 26, 22, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(16, -60, 20, 0, 7); c.fill();
      c.fillStyle = "#c8f7d8"; c.beginPath(); c.ellipse(2, -26, 14, 12, 0, 0, 7); c.fill();
      c.fillStyle = "#ffd23f"; [[-14, -50], [-4, -56], [-20, -40]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] - 6, p[1] - 9); c.lineTo(p[0] + 6, p[1] - 4); c.fill(); });
      c.fillStyle = "#fff"; c.beginPath(); c.arc(24, -66, 6, 0, 7); c.fill(); c.fillStyle = "#111"; c.beginPath(); c.arc(26, -66, 3, 0, 7); c.fill();
      c.strokeStyle = "#1b5e20"; c.lineWidth = 2.5; c.beginPath(); c.arc(24, -54, 7, .2, 2.4); c.stroke();
      c.fillStyle = "#ff8fb1"; c.beginPath(); c.arc(30, -56, 3, 0, 7); c.fill();
      c.fillStyle = dark; var a = Math.sin(leg) * 6; c.fillRect(-12 + a, -12, 10, 12); c.fillRect(6 - a, -12, 10, 12);
    }
    c.restore();
  }
  function draw(c) {
    var sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#7fdcff"); sky.addColorStop(1, "#fff3c4"); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(690, 70, 34, 0, 7); c.fill();
    c.fillStyle = "#fff"; S.clouds.forEach(function (k) { c.beginPath(); c.ellipse(k.x, k.y, 40 * k.s, 16 * k.s, 0, 0, 7); c.ellipse(k.x + 26 * k.s, k.y - 8 * k.s, 26 * k.s, 16 * k.s, 0, 0, 7); c.fill(); });
    c.fillStyle = "#a5e36b"; c.beginPath(); c.moveTo(0, GY); for (var x = -S.hills; x <= W + 400; x += 20) c.lineTo(x, GY - 60 - Math.sin((x + S.hills) * .0157) * 30); c.lineTo(W, GY); c.fill();
    c.fillStyle = "#8bd650"; c.fillRect(0, GY, W, H - GY); c.fillStyle = "#5cb338"; c.fillRect(0, GY, W, 8);
    c.fillStyle = "#4a9b2d"; for (var gx = -(S.dist % 60); gx < W; gx += 60) c.fillRect(gx, GY + 28, 18, 4);
    S.stars.forEach(function (s) { c.fillStyle = "#ffb300"; star(c, s.x, s.y, 15); c.fillStyle = "#ffe066"; star(c, s.x, s.y, 9); });
    S.obs.forEach(function (o) {
      if (o.type === "cactus") { c.fillStyle = "#2e7d32"; for (var i = 0; i < o.w; i += 22) { c.beginPath(); c.roundRect ? c.roundRect(o.x + i + 4, GY - o.h, 14, o.h, 7) : c.rect(o.x + i + 4, GY - o.h, 14, o.h); c.fill(); c.fillRect(o.x + i, GY - o.h * .65, 6, 14); c.fillRect(o.x + i + 16, GY - o.h * .8, 6, 14); } c.fillStyle = "#ff8fb1"; c.beginPath(); c.arc(o.x + 11, GY - o.h, 4, 0, 7); c.fill(); }
      else if (o.type === "rock") { c.fillStyle = "#9e8b7a"; c.beginPath(); c.ellipse(o.x + 23, GY - 12, 24, 16, 0, Math.PI, 0); c.fill(); c.fillRect(o.x - 1, GY - 12, 48, 12); c.fillStyle = "#c2b2a3"; c.beginPath(); c.arc(o.x + 16, GY - 18, 5, 0, 7); c.fill(); }
      else { var f = Math.sin(o.ph) * 10; c.fillStyle = "#ff8a3d"; c.beginPath(); c.ellipse(o.x + 22, o.yy + 13, 18, 10, 0, 0, 7); c.fill(); c.fillStyle = "#ffb74d"; c.beginPath(); c.moveTo(o.x + 14, o.yy + 10); c.lineTo(o.x + 30, o.yy + 10); c.lineTo(o.x + 22, o.yy - 6 + f); c.fill(); c.fillStyle = "#ffd23f"; c.beginPath(); c.moveTo(o.x + 4, o.yy + 13); c.lineTo(o.x - 8, o.yy + 10); c.lineTo(o.x + 4, o.yy + 18); c.fill(); c.fillStyle = "#111"; c.beginPath(); c.arc(o.x + 10, o.yy + 10, 2.4, 0, 7); c.fill(); }
    });
    dino(c, 120, S.y, S.duck, S.leg, S.inv > 0 && Math.floor(S.t * 10) % 2);
    c.font = "bold 20px system-ui,sans-serif"; c.textAlign = "center"; S.pops.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = "#ff2bd6"; c.fillText(p.txt, p.x, p.y); }); c.globalAlpha = 1;
    c.textAlign = "left"; c.font = "26px system-ui,sans-serif"; for (var h = 0; h < 3; h++) { c.fillStyle = h < S.hearts ? "#ff4d6d" : "rgba(0,0,0,.15)"; c.fillText("♥", 16 + h * 30, H - 22); }
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Tap or press Space to jump. Hold for a bigger jump! Press ↓ to duck under birds.", touch: { right: ["down"] } });
})();
