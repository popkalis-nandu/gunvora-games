/* Neon Blocks — original GUNVORA premium falling-block puzzle. */
(function () {
  var W = 460, H = 680, C = 28, BW = 10, BH = 20, OX = 14, OY = 40, S;
  var SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  var COL = { I: "#00d4ff", O: "#ffd23f", T: "#b388ff", S: "#39ff88", Z: "#ff4d5e", J: "#4f7cff", L: "#ff8a3d" };
  function bag() { var b = Object.keys(SHAPES); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
  function init() {
    S = { grid: [], bag: bag(), cur: null, next: null, fall: 0, lines: 0, level: 1, das: 0, dasDir: 0, clearing: null, ct: 0, t: 0, dead: 0, lock: 0 };
    for (var y = 0; y < BH; y++) S.grid.push(new Array(BW).fill(null));
    S.next = take(); spawn();
  }
  function take() { if (!S.bag.length) S.bag = bag(); return S.bag.pop(); }
  function spawn() { var t = S.next; S.next = take(); S.cur = { t: t, cells: SHAPES[t].map(function (c) { return c.slice(); }), x: 3, y: 0 }; if (!fits(S.cur.cells, S.cur.x, S.cur.y)) S.dead = 1; }
  function fits(cells, x, y) { return cells.every(function (c) { var gx = c[0] + x, gy = c[1] + y; return gx >= 0 && gx < BW && gy < BH && (gy < 0 || !S.grid[gy][gx]); }); }
  function rotate(api) {
    var p = S.cur; if (p.t === "O") return;
    var size = p.t === "I" ? 4 : 3, r = p.cells.map(function (c) { return [size - 1 - c[1], c[0]]; });
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) if (fits(r, p.x + kicks[i], p.y)) { p.cells = r; p.x += kicks[i]; api.sfx("move"); S.lock = 0; return; }
    if (fits(r, p.x, p.y - 1)) { p.cells = r; p.y--; }
  }
  function move(dx) { if (fits(S.cur.cells, S.cur.x + dx, S.cur.y)) { S.cur.x += dx; S.lock = 0; return true; } return false; }
  function ghostY() { var y = S.cur.y; while (fits(S.cur.cells, S.cur.x, y + 1)) y++; return y; }
  function lockPiece(api) {
    S.cur.cells.forEach(function (c) { var gy = c[1] + S.cur.y; if (gy >= 0) S.grid[gy][c[0] + S.cur.x] = S.cur.t; else S.dead = 1; });
    var full = []; S.grid.forEach(function (row, y) { if (row.every(Boolean)) full.push(y); });
    if (full.length) { S.clearing = full; S.ct = .25; api.sfx(full.length >= 4 ? "win" : "coin"); api.setScore(api.score + [0, 100, 300, 500, 800][full.length] * S.level); }
    else api.sfx("move");
    S.cur = null;
  }
  function update(dt, api) {
    S.t += dt;
    if (S.dead) { api.over({ title: "Stack overflow!", detail: S.lines + " lines · level " + S.level }); return; }
    if (S.clearing) {
      S.ct -= dt; if (S.ct > 0) return;
      S.clearing.forEach(function (y) { S.grid.splice(y, 1); S.grid.unshift(new Array(BW).fill(null)); });
      S.lines += S.clearing.length; S.level = 1 + Math.floor(S.lines / 10); S.clearing = null;
    }
    if (!S.cur) { spawn(); if (S.dead) return; }
    var k = api.keys, p = api.pointer;
    if (api.hit("up") || api.hit("rot")) rotate(api);
    if (p.tapped && p.x < OX + BW * C && p.y > OY) rotate(api);
    if (p.swipe === "left") move(-1); if (p.swipe === "right") move(1);
    if (p.swipe === "down") { S.cur.y = ghostY(); lockPiece(api); return; }
    var dir = (k.left ? -1 : 0) + (k.right ? 1 : 0);
    if (api.hit("left")) { move(-1); S.das = .17; S.dasDir = -1; } else if (api.hit("right")) { move(1); S.das = .17; S.dasDir = 1; }
    else if (dir && dir === S.dasDir) { S.das -= dt; if (S.das <= 0) { move(dir); S.das = .05; } }
    if (api.hit("fire")) { var gy = ghostY(); api.setScore(api.score + (gy - S.cur.y) * 2); S.cur.y = gy; lockPiece(api); return; }
    var grav = Math.max(.07, .8 - (S.level - 1) * .07); if (k.down) grav = Math.min(grav, .045);
    S.fall += dt;
    if (S.fall >= grav) {
      S.fall = 0;
      if (fits(S.cur.cells, S.cur.x, S.cur.y + 1)) { S.cur.y++; if (k.down) api.setScore(api.score + 1); }
      else { S.lock += grav; if (S.lock >= .4 || k.down) lockPiece(api); }
    }
  }
  function cell(c, x, y, col, a) { c.globalAlpha = a == null ? 1 : a; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = a == null ? 10 : 0; c.fillRect(x + 1, y + 1, C - 2, C - 2); c.shadowBlur = 0; c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x + 3, y + 3, C - 6, 4); c.globalAlpha = 1; }
  function draw(c) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a0f2c"); g.addColorStop(1, "#1b0636"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(OX, OY, BW * C, BH * C);
    c.strokeStyle = "rgba(0,212,255,.08)"; for (var x = 0; x <= BW; x++) { c.beginPath(); c.moveTo(OX + x * C, OY); c.lineTo(OX + x * C, OY + BH * C); c.stroke(); } for (var y = 0; y <= BH; y++) { c.beginPath(); c.moveTo(OX, OY + y * C); c.lineTo(OX + BW * C, OY + y * C); c.stroke(); }
    c.strokeStyle = "#00d4ff"; c.lineWidth = 2; c.shadowColor = "#00d4ff"; c.shadowBlur = 12; c.strokeRect(OX - 1, OY - 1, BW * C + 2, BH * C + 2); c.shadowBlur = 0; c.lineWidth = 1;
    S.grid.forEach(function (row, y) { row.forEach(function (t, x) { if (t) cell(c, OX + x * C, OY + y * C, (S.clearing && S.clearing.indexOf(y) >= 0) ? "#ffffff" : COL[t]); }); });
    if (S.cur) {
      var gy = ghostY(); S.cur.cells.forEach(function (q) { if (q[1] + gy >= 0) cell(c, OX + (q[0] + S.cur.x) * C, OY + (q[1] + gy) * C, COL[S.cur.t], .22); });
      S.cur.cells.forEach(function (q) { if (q[1] + S.cur.y >= 0) cell(c, OX + (q[0] + S.cur.x) * C, OY + (q[1] + S.cur.y) * C, COL[S.cur.t]); });
    }
    var px = OX + BW * C + 18; c.fillStyle = "#9be7ff"; c.font = "bold 13px system-ui,sans-serif"; c.textAlign = "left";
    c.fillText("NEXT", px, OY + 14); c.fillStyle = "rgba(255,255,255,.05)"; c.fillRect(px, OY + 22, 130, 84);
    if (S.next) SHAPES[S.next].forEach(function (q) { cell(c, px + 10 + q[0] * C, OY + 36 + q[1] * C, COL[S.next]); });
    [["LINES", S.lines], ["LEVEL", S.level]].forEach(function (r, i) { c.fillStyle = "#9be7ff"; c.font = "bold 13px system-ui,sans-serif"; c.fillText(r[0], px, OY + 140 + i * 64); c.fillStyle = "#fff"; c.font = "900 28px system-ui,sans-serif"; c.fillText(r[1], px, OY + 172 + i * 64); });
    c.fillStyle = "rgba(155,231,255,.5)"; c.font = "12px system-ui,sans-serif"; ["← → move", "↑ / X rotate", "↓ soft drop", "Space hard drop", "Tap board: rotate", "Swipe: move/drop"].forEach(function (t, i) { c.fillText(t, px, OY + 300 + i * 20); });
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "← → move, ↑ rotate, ↓ soft drop, Space hard drop. Mobile: buttons, tap to rotate, swipe to move.", touch: { left: ["left", "right", "down"], right: ["rot", "fire"] } });
})();
