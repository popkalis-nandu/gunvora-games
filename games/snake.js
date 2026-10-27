/* Neon Snake — original GUNVORA game. */
(function () {
  var W = 480, H = 600, CS = 24, COLS = 20, ROWS = 20, OY = 40, S;
  function rndCell() { var c; do { c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; } while (S && S.body.some(function (b) { return b.x === c.x && b.y === c.y; })); return c; }
  function init() {
    S = null; S = { body: [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }], dir: { x: 1, y: 0 }, q: [], step: .12, acc: 0, eaten: 0, t: 0, bonus: null, fx: [], dead: 0 };
    S.food = rndCell();
  }
  var DIRS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
  function update(dt, api) {
    if (S.dead) { S.dead -= dt; if (S.dead <= 0) api.over({ title: "Game over", detail: "Length " + S.body.length }); return; }
    S.t += dt;
    ["left", "right", "up", "down"].forEach(function (d) { if (api.hit(d)) S.q.push(DIRS[d]); });
    if (api.pointer.swipe) S.q.push(DIRS[api.pointer.swipe]);
    if (S.q.length > 3) S.q = S.q.slice(-3);
    S.acc += dt;
    while (S.acc >= S.step) {
      S.acc -= S.step;
      while (S.q.length) { var n = S.q.shift(); var last = S.dir; if (n.x !== -last.x || n.y !== -last.y) { S.dir = n; break; } }
      var h = { x: S.body[0].x + S.dir.x, y: S.body[0].y + S.dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || S.body.slice(0, -1).some(function (b) { return b.x === h.x && b.y === h.y; })) { S.dead = .7; api.sfx("over"); return; }
      S.body.unshift(h);
      if (h.x === S.food.x && h.y === S.food.y) {
        S.eaten++; api.setScore(api.score + 10); api.sfx("coin"); burst(h, "#39ff88"); S.food = rndCell(); S.step = Math.max(.055, S.step - .0025);
        if (S.eaten % 6 === 0) S.bonus = { c: rndCell(), t: 6 };
      } else if (S.bonus && h.x === S.bonus.c.x && h.y === S.bonus.c.y) { api.setScore(api.score + 50); api.sfx("win"); burst(h, "#ff2bd6"); S.bonus = null; S.body.push(S.body[S.body.length - 1]); }
      else S.body.pop();
    }
    if (S.bonus) { S.bonus.t -= dt; if (S.bonus.t <= 0) S.bonus = null; }
    S.fx.forEach(function (f) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; });
  }
  function burst(c, col) { for (var i = 0; i < 12; i++) { var a = Math.random() * 7; S.fx.push({ x: c.x * CS + CS / 2, y: OY + c.y * CS + CS / 2, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, t: .5, c: col }); } }
  function draw(c, api) {
    c.fillStyle = "#04070f"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(0,212,255,.09)"; c.lineWidth = 1;
    for (var x = 0; x <= COLS; x++) { c.beginPath(); c.moveTo(x * CS, OY); c.lineTo(x * CS, OY + ROWS * CS); c.stroke(); }
    for (var y = 0; y <= ROWS; y++) { c.beginPath(); c.moveTo(0, OY + y * CS); c.lineTo(W, OY + y * CS); c.stroke(); }
    c.strokeStyle = "#00d4ff"; c.lineWidth = 2; c.shadowColor = "#00d4ff"; c.shadowBlur = 10; c.strokeRect(1, OY + 1, W - 2, ROWS * CS - 2); c.shadowBlur = 0;
    var pulse = 1 + Math.sin(S.t * 8) * .12;
    c.fillStyle = "#39ff88"; c.shadowColor = "#39ff88"; c.shadowBlur = 16; c.beginPath(); c.arc(S.food.x * CS + CS / 2, OY + S.food.y * CS + CS / 2, 7 * pulse, 0, 7); c.fill();
    if (S.bonus) { c.fillStyle = "#ff2bd6"; c.shadowColor = "#ff2bd6"; c.beginPath(); c.arc(S.bonus.c.x * CS + CS / 2, OY + S.bonus.c.y * CS + CS / 2, 9 * pulse, 0, 7); c.fill(); }
    var skin = api.skin("snake");
    S.body.forEach(function (b, i) {
      var col = skin === "rainbow" ? "hsl(" + ((i * 18 + S.t * 120) % 360) + ",100%,60%)" : (i === 0 ? "#7fffd4" : "hsl(" + (190 - Math.min(i, 30) * 2) + ",100%," + (60 - Math.min(i, 20)) + "%)");
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = i === 0 ? 18 : 8;
      var pad = i === 0 ? 1 : 3; c.fillRect(b.x * CS + pad, OY + b.y * CS + pad, CS - pad * 2, CS - pad * 2);
    });
    c.shadowBlur = 0;
    var hd = S.body[0]; c.fillStyle = "#001018"; c.fillRect(hd.x * CS + 7 + S.dir.x * 4, OY + hd.y * CS + 7 + S.dir.y * 4, 4, 4); c.fillRect(hd.x * CS + 13 + S.dir.x * 4, OY + hd.y * CS + 13 + S.dir.y * 4, 4, 4);
    S.fx.forEach(function (f) { c.globalAlpha = f.t * 2; c.fillStyle = f.c; c.fillRect(f.x - 2, f.y - 2, 4, 4); }); c.globalAlpha = 1;
    c.fillStyle = "#9be7ff"; c.font = "bold 15px system-ui,sans-serif"; c.textAlign = "center"; c.fillText("LENGTH " + S.body.length + (S.bonus ? "   ·   BONUS " + Math.ceil(S.bonus.t) + "s" : ""), W / 2, 26);
    c.fillStyle = "rgba(155,231,255,.45)"; c.font = "13px system-ui,sans-serif"; c.fillText("Eat green cores · pink bonus cores = +50", W / 2, OY + ROWS * CS + 30);
    if (S.dead) { c.fillStyle = "rgba(255,43,80," + S.dead * .5 + ")"; c.fillRect(0, OY, W, ROWS * CS); }
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Arrows / WASD to turn. On mobile: swipe on the grid or use the buttons. Don't hit the walls or yourself!", touch: { left: ["left", "right"], right: ["up", "down"] } });
})();
