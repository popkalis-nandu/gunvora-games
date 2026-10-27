/* Bubble Kingdom — bubble shooter. Drag to aim, release to shoot, match 3 to pop and rescue the trapped stars.
   Original game for Gaming World of Jarvis. 100 levels, special bubbles, boosters, 3-star scoring. */
(function () {
  "use strict";
  var W = 480, H = 720, R = 20, D = 40, RH = 34.64, TOP = 96, COLS = 11, LW = 10, RWALL = 470, SX = 240, SY = 640, LOSE_ROW = 14, S, API;
  var KEY = "gv_bubblekingdom", NL = 100;
  /* ---- tiny canvas UI kit (same pattern in each mini game) ---- */
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function inB(p, b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
  function T(c, s, x, y, size, col, align, weight) { c.font = (weight || "bold") + " " + size + "px system-ui,-apple-system,Segoe UI,sans-serif"; c.fillStyle = col || "#fff"; c.textAlign = align || "center"; c.textBaseline = "middle"; c.fillText(s, x, y); }
  function LS(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function SV(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function UI(cols) { return { btns: [], focus: 0, cols: cols || 1, kb: false }; }
  function button(ui, x, y, w, h, label, fn, o) { ui.btns.push({ x: x, y: y, w: w, h: h, label: label, fn: fn, o: o || {} }); }
  function uiInput(ui, api) {
    var p = api.pointer, n = ui.btns.length, i, b;
    if (p.tapped) { for (i = n - 1; i >= 0; i--) { b = ui.btns[i]; if (inB(p, b)) { ui.kb = false; if (b.o.disabled) { api.sfx("hit"); return true; } ui.focus = i; api.sfx("move"); b.fn(); return true; } } }
    if (!n) return false;
    var f = ui.focus;
    if (api.hit("left")) f = (f + n - 1) % n; if (api.hit("right")) f = (f + 1) % n;
    if (api.hit("up")) f = (f + n - ui.cols) % n; if (api.hit("down")) f = (f + ui.cols) % n;
    if (f !== ui.focus) { ui.focus = f; ui.kb = true; api.sfx("move"); }
    if (api.hit("fire") || api.hit("enter")) { b = ui.btns[ui.focus]; if (b) { if (b.o.disabled) { api.sfx("hit"); return true; } api.sfx("move"); b.fn(); return true; } }
    return false;
  }
  function drawBtn(c, b, focused) {
    var o = b.o, col = o.col || "#00d4ff", col2 = o.col2 || "#0077ff";
    c.save(); c.globalAlpha = o.disabled ? .45 : 1;
    c.fillStyle = "rgba(0,0,0,.35)"; rr(c, b.x + 2, b.y + 4, b.w, b.h, o.r || 14); c.fill();
    var g = c.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, col); g.addColorStop(1, col2); c.fillStyle = o.ghost ? "rgba(255,255,255,.08)" : g; rr(c, b.x, b.y, b.w, b.h, o.r || 14); c.fill();
    c.lineWidth = 2; c.strokeStyle = o.ghost ? col : "rgba(255,255,255,.35)"; c.stroke();
    if (focused) { c.lineWidth = 3; c.strokeStyle = "#fff"; c.setLineDash([6, 4]); rr(c, b.x - 4, b.y - 4, b.w + 8, b.h + 8, (o.r || 14) + 3); c.stroke(); c.setLineDash([]); }
    if (o.draw) o.draw(c, b); else T(c, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, o.size || 20, o.ghost ? col : (o.tc || "#04121f"));
    c.restore();
  }
  function drawUI(c, ui) { for (var i = 0; i < ui.btns.length; i++) drawBtn(c, ui.btns[i], ui.kb && i === ui.focus); }
  function panel(c, x, y, w, h, col) { c.fillStyle = "rgba(4,10,24,.86)"; rr(c, x, y, w, h, 20); c.fill(); c.lineWidth = 2; c.strokeStyle = col || "rgba(0,212,255,.6)"; c.stroke(); }
  function starShape(c, x, y, r, fill) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); c.fillStyle = fill; c.fill(); }
  function stars3(c, x, y, n, r) { for (var i = 0; i < 3; i++) starShape(c, x + (i - 1) * r * 2.3, y - (i === 1 ? r * .3 : 0), r, i < n ? "#ffd23f" : "rgba(255,255,255,.18)"); }
  var COL = [["#ff4d6d", "#b0103a"], ["#3fa9ff", "#0b4fb3"], ["#39ff88", "#0f9c4c"], ["#ffd23f", "#d98e00"], ["#b06bff", "#5a19b8"], ["#ff8a3d", "#c24e00"]];
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  var save = LS(KEY, { done: {}, fire: 2, rain: 2, aim: 2 });
  function persist() { SV(KEY, save); }
  function firstOpen() { for (var i = 1; i <= NL; i++) if (!save.done[i]) return i; return NL; }

  /* ---------- level generator (100 levels) ---------- */
  function levelDef(n) {
    var r = rng(n * 2654435761 + 7), rows = Math.min(11, 5 + Math.floor(n / 9)), ncol = Math.min(6, 3 + Math.floor((n + 4) / 16));
    var pat = (n - 1) % 6, g = [], stars = Math.min(6, 1 + Math.floor(n / 14)), cells = [];
    for (var y = 0; y < rows; y++) {
      g.push([]);
      for (var x = 0; x < COLS; x++) {
        var on = true;
        if (pat === 1) on = Math.abs(x - 5) <= rows - y + 1;                     // inverted pyramid
        if (pat === 2) on = !(y > 1 && (x === 3 || x === 7) && y % 3 !== 0);       // pillars with gaps
        if (pat === 3) on = y < 2 || (x + y) % 4 !== 1;                          // lattice
        if (pat === 4) on = y < 3 || x < 3 || x > 7;                             // two towers
        if (pat === 5) on = y < 2 || Math.abs(x - 5) >= (y % 4);                  // zig-zag
        g[y].push(on ? { k: Math.floor(r() * ncol) } : null);
      }
    }
    // colour runs: make neighbouring bubbles share colours a bit so boards feel natural
    for (y = 0; y < rows; y++) for (x = 1; x < COLS; x++) if (g[y][x] && g[y][x - 1] && r() < .45) g[y][x].k = g[y][x - 1].k;
    for (y = 0; y < rows; y++) for (x = 0; x < COLS; x++) if (g[y][x]) cells.push([y, x]);
    function pick(maxRow) { for (var t = 0; t < 400; t++) { var q = cells[Math.floor(r() * cells.length)]; if (q[0] <= maxRow && !g[q[0]][q[1]].sp) return g[q[0]][q[1]]; } return null; }
    for (var i = 0; i < stars; i++) { var b = pick(Math.min(rows - 1, 1 + Math.floor(i * rows / stars))); if (b) b.sp = "star"; }
    if (n >= 5) for (i = 0; i < Math.min(4, 1 + Math.floor(n / 25)); i++) { b = pick(rows - 1); if (b) { b.sp = "rain"; } }
    if (n >= 8) for (i = 0; i < Math.min(4, Math.floor(n / 18) + 1); i++) { b = pick(rows - 1); if (b) b.sp = "bomb"; }
    if (n >= 15) for (i = 0; i < Math.min(10, Math.floor((n - 10) / 9)); i++) { b = pick(rows - 2); if (b) b.sp = "stone"; }
    var count = cells.length;
    return { n: n, g: g, ncol: ncol, shots: Math.max(14, Math.round(count * .42) + 6 - Math.floor(n / 25)), stars: stars };
  }

  /* ---------- grid helpers ---------- */
  function bx(r, c) { return LW + R + c * D + (r % 2 ? R : 0); }
  function by(r) { return TOP + R + r * RH; }
  function valid(r, c) { return r >= 0 && c >= 0 && c < COLS && !(r % 2 && c === COLS - 1 && false); }
  function get(r, c) { return valid(r, c) && S.g[r] ? S.g[r][c] : null; }
  function nb(r, c) {
    var o = r % 2 ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]] : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
    return o.map(function (d) { return [r + d[0], c + d[1]]; }).filter(function (q) { return q[0] >= 0 && q[1] >= 0 && q[1] < COLS && !(q[0] % 2 && q[1] > COLS - 1); });
  }
  function ensureRow(r) { while (S.g.length <= r) { var row = []; for (var i = 0; i < COLS; i++) row.push(null); S.g.push(row); } }
  function maxCol(r) { return COLS - 1; }
  function colorsLeft() { var s = {}; S.g.forEach(function (row) { row.forEach(function (b) { if (b && b.k >= 0 && b.sp !== "stone") s[b.k] = 1; }); }); var a = Object.keys(s).map(Number); return a.length ? a : [0]; }
  function nextColor() { var a = colorsLeft(); return a[Math.floor(Math.random() * a.length)]; }

  function init(api) {
    API = api; S = { scr: "menu", ui: UI(1), t: 0, parts: [], pops: [], fall: [], fly: [], page: 0 };
    menu();
  }
  function menu() {
    S.scr = "menu"; var ui = S.ui = UI(1);
    button(ui, 90, 380, 300, 62, "▶  Play level " + firstOpen(), function () { start(firstOpen()); }, { size: 23 });
    button(ui, 90, 456, 300, 54, "🗺  Levels", function () { S.page = Math.floor((firstOpen() - 1) / 20); levels(); }, { col: "#ffd23f", col2: "#ff9f1c" });
  }
  function levels() {
    S.scr = "levels"; var ui = S.ui = UI(5), bw = 74, bh = 70, gx = (W - (5 * bw + 4 * 12)) / 2, base = S.page * 20;
    for (var k = 0; k < 20; k++) (function (n) {
      var open = n === 1 || save.done[n - 1] || save.done[n];
      button(ui, gx + (k % 5) * (bw + 12), 130 + Math.floor(k / 5) * (bh + 14), bw, bh, "", function () { start(n); }, { disabled: !open, col: save.done[n] ? "#39ff88" : "#00d4ff", col2: save.done[n] ? "#14a85a" : "#0077ff",
        draw: function (c, b) { T(c, open ? String(n) : "🔒", b.x + b.w / 2, b.y + 26, 22, "#04121f"); if (save.done[n]) stars3(c, b.x + b.w / 2, b.y + 52, save.done[n], 7); } });
    })(base + k + 1);
    button(ui, 30, 500, 120, 50, "◀ Prev", function () { S.page = (S.page + 4) % 5; levels(); }, { ghost: true });
    button(ui, 330, 500, 120, 50, "Next ▶", function () { S.page = (S.page + 1) % 5; levels(); }, { ghost: true });
    button(ui, 165, 580, 150, 50, "Menu", menu, { ghost: true, col: "#ffd23f" });
  }
  function start(n) {
    var L = levelDef(n);
    S.scr = "play"; S.L = L; S.g = L.g.map(function (row) { return row.map(function (b) { return b ? { k: b.sp === "stone" ? -1 : b.sp === "rain" ? -2 : b.k, sp: b.sp || "", star: b.sp === "star" } : null; }); });
    S.shots = L.shots; S.score = 0; S.saved = 0; S.starsTotal = 0; S.g.forEach(function (row) { row.forEach(function (b) { if (b && b.star) S.starsTotal++; }); });
    S.ang = -Math.PI / 2; S.ball = null; S.cur = nextColor(); S.spare = nextColor(); S.boost = null; S.aimLeft = 0; S.aiming = false; S.end = 0; S.res = null;
    S.parts = []; S.pops = []; S.fall = []; S.fly = []; S.intro = .6;
    var ui = S.ui = UI(4), y = 668;
    button(ui, 8, y, 60, 44, "≡", function () { S.page = Math.floor((n - 1) / 20); levels(); }, { ghost: true, size: 20, r: 12 });
    [["fire", "🔥", "#ff5a3c", "#a3150b"], ["rain", "🌈", "#ff2bd6", "#7a19b8"], ["aim", "🎯", "#39ff88", "#0f9c4c"]].forEach(function (bt, i) {
      button(ui, 290 + i * 62, y, 56, 44, bt[1], function () { useBoost(bt[0]); }, { col: bt[2], col2: bt[3], r: 12, draw: function (c, b) {
        T(c, bt[1], b.x + 20, b.y + b.h / 2, 18); T(c, String(save[bt[0]]), b.x + 44, b.y + b.h / 2 + 1, 14, "#fff");
        if (S.boost === bt[0] || (bt[0] === "aim" && S.aimLeft > 0)) { c.strokeStyle = "#fff"; c.lineWidth = 3; rr(c, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 14); c.stroke(); }
      } });
    });
    API.setScore(0); API.sfx("move");
  }
  function useBoost(k) {
    if (S.ball || S.end) return;
    if (S.boost === k) { S.boost = null; save[k]++; persist(); return; } // cancel refunds
    if (save[k] <= 0) { pop(W / 2, 560, "No boosters left — earn them with 3 stars", "#ff7a7a", 14); API.sfx("hit"); return; }
    if (k === "aim") { if (S.aimLeft > 0) return; save.aim--; S.aimLeft = 3; persist(); API.sfx("coin"); return; }
    if (S.boost) { save[S.boost]++; }
    S.boost = k; save[k]--; persist(); API.sfx("coin");
  }
  function pop(x, y, s, col, size) { S.pops.push({ x: x, y: y, s: s, col: col || "#fff", t: 1.2, size: size || 20 }); }
  function swapSpare() { if (S.ball || S.end || S.boost) return; var t = S.cur; S.cur = S.spare; S.spare = t; API.sfx("flip"); }
  function shoot() {
    if (S.ball || S.end || S.shots <= 0 || S.intro > 0) return;
    var sp = 960; S.ball = { x: SX, y: SY, vx: Math.cos(S.ang) * sp, vy: Math.sin(S.ang) * sp, k: S.cur, boost: S.boost };
    S.boost = null; S.shots--; if (S.aimLeft > 0) S.aimLeft--; API.sfx("shoot");
    S.cur = S.spare; S.spare = nextColor();
  }
  /* trace the path of a shot for the aim guide; returns the points */
  function trace(maxB) {
    var x = SX, y = SY, vx = Math.cos(S.ang), vy = Math.sin(S.ang), pts = [[x, y]], b = 0;
    for (var i = 0; i < 1400; i++) {
      x += vx * 4; y += vy * 4;
      if (x < LW + R) { x = LW + R; vx = -vx; pts.push([x, y]); if (++b > maxB) return pts; }
      if (x > RWALL - R) { x = RWALL - R; vx = -vx; pts.push([x, y]); if (++b > maxB) return pts; }
      if (y < TOP + R || hitAny(x, y)) { pts.push([x, y]); return pts; }
    }
    pts.push([x, y]); return pts;
  }
  function hitAny(x, y) {
    var rr0 = Math.max(0, Math.floor((y - TOP) / RH) - 1);
    for (var r = rr0; r < Math.min(S.g.length, rr0 + 3); r++) for (var c = 0; c < COLS; c++) { var b = S.g[r][c]; if (b && Math.hypot(bx(r, c) - x, by(r) - y) < D * .82) return [r, c]; }
    return null;
  }
  function snap(x, y) {
    var best = null, bd = 1e9, r0 = Math.max(0, Math.round((y - TOP - R) / RH) - 1);
    for (var r = r0; r <= r0 + 2; r++) for (var c = 0; c <= maxCol(r); c++) {
      ensureRow(r); if (S.g[r][c]) continue;
      var conn = r === 0 || nb(r, c).some(function (q) { return get(q[0], q[1]); }); if (!conn) continue;
      var d = Math.hypot(bx(r, c) - x, by(r) - y); if (d < bd) { bd = d; best = [r, c]; }
    }
    return best;
  }
  function land(ball, hit) {
    var cell = snap(ball.x, ball.y); if (!cell) { cell = hit || [0, 5]; }
    var r = cell[0], c = cell[1];
    if (ball.boost === "fire") { // fireball: blasts a radius around the impact instead of sticking
      var killed = []; S.g.forEach(function (row, rr0) { row.forEach(function (b, cc) { if (b && Math.hypot(bx(rr0, cc) - bx(r, c), by(rr0) - by(r)) < D * 2.3) killed.push([rr0, cc]); }); });
      boomFx(bx(r, c), by(r), "#ff5a3c"); API.sfx("boom"); popCells(killed, 15); dropFloating(); afterShot(); return;
    }
    var k = ball.k;
    if (ball.boost === "rain") { var ns = nb(r, c).map(function (q) { return get(q[0], q[1]); }).filter(function (b) { return b && b.k >= 0; }); if (ns.length) k = ns[0].k; }
    ensureRow(r); S.g[r][c] = { k: k, sp: "", wob: .25 };
    if (r >= LOSE_ROW) { afterShot(true); return; }
    var grp = cluster(r, c);
    if (grp.length >= 3) { popCells(grp, 10); API.sfx("hit"); dropFloating(); }
    else { API.sfx("move"); nb(r, c).forEach(function (q) { var b = get(q[0], q[1]); if (b) b.wob = .2; }); }
    afterShot();
  }
  function cluster(r, c) {
    var k = S.g[r][c].k, seen = {}, out = [], st = [[r, c]];
    while (st.length) {
      var q = st.pop(), id = q[0] + "," + q[1]; if (seen[id]) continue; seen[id] = 1;
      var b = get(q[0], q[1]); if (!b) continue;
      if (!(b.k === k || b.k === -2)) continue; // rainbow bubbles match any colour
      out.push(q); nb(q[0], q[1]).forEach(function (n) { st.push(n); });
    }
    return out.filter(function (q) { return get(q[0], q[1]).k !== -2 || true; }).length >= 3 ? out : [];
  }
  function popCells(list, pts) {
    var seen = {}, queue = list.slice();
    while (queue.length) {
      var q = queue.shift(), id = q[0] + "," + q[1]; if (seen[id]) continue; seen[id] = 1;
      var b = get(q[0], q[1]); if (!b) continue;
      S.g[q[0]][q[1]] = null; S.score += pts; burst(bx(q[0], q[1]), by(q[0]), b.k >= 0 ? COL[b.k][0] : b.k === -2 ? "#fff" : "#8a93a8", 7);
      if (b.star) rescue(bx(q[0], q[1]), by(q[0]));
      if (b.sp === "bomb") { boomFx(bx(q[0], q[1]), by(q[0]), "#ffd23f"); API.sfx("boom"); S.g.forEach(function (row, r2) { row.forEach(function (o, c2) { if (o && Math.hypot(bx(r2, c2) - bx(q[0], q[1]), by(r2) - by(q[0])) < D * 1.9) queue.push([r2, c2]); }); }); }
    }
    // bombs next to a popped group explode too
    Object.keys(seen).forEach(function (id) { var p = id.split(",").map(Number); nb(p[0], p[1]).forEach(function (n) { var b = get(n[0], n[1]); if (b && b.sp === "bomb") popCells([n], pts); }); });
  }
  function dropFloating() {
    var seen = {}, st = [];
    for (var c = 0; c < COLS; c++) if (get(0, c)) st.push([0, c]);
    while (st.length) { var q = st.pop(), id = q[0] + "," + q[1]; if (seen[id] || !get(q[0], q[1])) continue; seen[id] = 1; nb(q[0], q[1]).forEach(function (n) { st.push(n); }); }
    var n = 0;
    S.g.forEach(function (row, r) { row.forEach(function (b, c) { if (b && !seen[r + "," + c]) { S.fall.push({ x: bx(r, c), y: by(r), vx: (Math.random() - .5) * 120, vy: -60 - Math.random() * 120, b: b }); S.g[r][c] = null; n++; S.score += 20; if (b.star) rescue(bx(r, c), by(r)); } }); });
    if (n) { pop(W / 2, 470, n + " dropped! +" + n * 20, "#00d4ff", 18); API.sfx("coin"); }
  }
  function rescue(x, y) { S.saved++; S.score += 500; S.fly.push({ x: x, y: y, t: 0, sx: x, sy: y }); pop(x, y - 20, "★ +500", "#ffd23f", 18); API.sfx("win"); }
  function burst(x, y, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 60 + Math.random() * 200; S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: .4 + Math.random() * .4, col: col }); } }
  function boomFx(x, y, col) { S.parts.push({ ring: 1, x: x, y: y, t: .45, col: col }); burst(x, y, col, 24); }
  function afterShot(tooLow) {
    // trim empty rows at the bottom
    while (S.g.length && S.g[S.g.length - 1].every(function (b) { return !b; })) S.g.pop();
    API.setScore(S.score);
    if (S.saved >= S.starsTotal) { S.endT = 1.1; S.end = "win"; return; }
    if (tooLow || S.g.length > LOSE_ROW) { S.endT = .9; S.end = "low"; return; }
    if (S.shots <= 0) { S.endT = .9; S.end = "shots"; return; }
    var cl = colorsLeft(); if (cl.indexOf(S.cur) < 0) S.cur = nextColor(); if (cl.indexOf(S.spare) < 0) S.spare = nextColor();
  }
  function finish() {
    var n = S.L.n;
    if (S.end === "win") {
      var frac = S.shots / S.L.shots, st = frac >= .4 ? 3 : frac >= .15 ? 2 : 1, prev = save.done[n] || 0, gift = "";
      S.score += S.shots * 100; API.setScore(S.score);
      save.done[n] = Math.max(prev, st);
      if (st === 3 && prev < 3) { var k = ["fire", "rain", "aim"][n % 3]; save[k]++; gift = "+1 " + { fire: "🔥 Fireball", rain: "🌈 Rainbow", aim: "🎯 Long aim" }[k]; }
      persist(); API.sfx("win");
      S.scr = "result"; S.res = { win: true, stars: st, gift: gift };
      var ui = S.ui = UI(1), y = 430; if (n < NL) { button(ui, 120, y, 240, 56, "Next level ▶", function () { start(n + 1); }); y += 66; }
      button(ui, 120, y, 240, 52, "↻ Replay", function () { start(n); }, { col: "#ffd23f", col2: "#ff9f1c" });
      button(ui, 120, y + 62, 240, 48, "Levels", function () { S.page = Math.floor((n - 1) / 20); levels(); }, { ghost: true });
    } else {
      S.scr = "result"; S.res = { win: false, why: S.end === "low" ? "The bubbles reached the bottom" : "Out of shots" }; API.sfx("over");
      var u2 = S.ui = UI(1); button(u2, 120, 430, 240, 56, "↻ Try again", function () { start(n); }, { col: "#ffd23f", col2: "#ff9f1c" });
      button(u2, 120, 496, 240, 48, "Levels", function () { S.page = Math.floor((n - 1) / 20); levels(); }, { ghost: true });
    }
  }

  function update(dt, api) {
    S.t += dt; var p = api.pointer;
    S.parts.forEach(function (q) { if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; } q.t -= dt; }); S.parts = S.parts.filter(function (q) { return q.t > 0; });
    S.pops.forEach(function (q) { q.y -= 34 * dt; q.t -= dt; }); S.pops = S.pops.filter(function (q) { return q.t > 0; });
    S.fall.forEach(function (f) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 1400 * dt; }); S.fall = S.fall.filter(function (f) { return f.y < H + 40; });
    S.fly.forEach(function (f) { f.t += dt * 1.4; }); S.fly = S.fly.filter(function (f) { return f.t < 1; });
    if (S.scr !== "play") { uiInput(S.ui, api); return; }
    if (S.intro > 0) S.intro -= dt;
    S.g.forEach(function (row) { row.forEach(function (b) { if (b && b.wob > 0) b.wob -= dt; }); });
    if (S.end) { S.endT -= dt; if (S.endT <= 0 && !S.fall.length) finish(); return; }
    // buttons
    if (p.tapped) {
      for (var i = 0; i < S.ui.btns.length; i++) if (inB(p, S.ui.btns[i])) { S.ui.btns[i].fn(); api.sfx("move"); S.aiming = false; return; }
      if (Math.hypot(p.x - (SX - 92), p.y - (SY + 18)) < 30) { swapSpare(); S.aiming = false; return; }
      if (p.y < SY + 10) S.aiming = true;
    }
    if (S.aiming && p.down) setAim(p.x, p.y);
    if (S.aiming && !p.down) { S.aiming = false; if (p.y < SY + 10) { setAim(p.x, p.y); shoot(); } }
    if (api.keys.left) S.ang -= 1.6 * dt; if (api.keys.right) S.ang += 1.6 * dt; clampAng();
    if (api.hit("fire") || api.hit("up") || api.hit("enter")) shoot();
    if (api.hit("down")) swapSpare();
    // projectile
    var b = S.ball;
    if (b) {
      var steps = 6;
      for (var s = 0; s < steps && S.ball; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        if (b.x < LW + R) { b.x = LW + R; b.vx = -b.vx; }
        if (b.x > RWALL - R) { b.x = RWALL - R; b.vx = -b.vx; }
        var hit = hitAny(b.x, b.y);
        if (b.y <= TOP + R || hit) { S.ball = null; land(b, hit); }
      }
    }
  }
  function setAim(x, y) { S.ang = Math.atan2(Math.min(y, SY - 20) - SY, x - SX); clampAng(); }
  function clampAng() { var lo = -Math.PI + .14, hi = -.14; if (S.ang > Math.PI / 2) S.ang = lo; S.ang = Math.max(lo, Math.min(hi, S.ang)); }

  /* ---------- drawing ---------- */
  function drawBubble(c, x, y, b, rad) {
    rad = rad || R - 1;
    if (b.k === -1) { // stone
      var gs = c.createRadialGradient(x - 6, y - 7, 3, x, y, rad); gs.addColorStop(0, "#b9c0cf"); gs.addColorStop(1, "#4a5266"); c.fillStyle = gs;
      c.beginPath(); c.arc(x, y, rad, 0, 6.29); c.fill(); c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y - 4); c.lineTo(x, y + 2); c.lineTo(x + 7, y - 6); c.moveTo(x, y + 2); c.lineTo(x + 2, y + 10); c.stroke(); return;
    }
    if (b.k === -2) { // rainbow
      for (var i = 0; i < 6; i++) { c.fillStyle = COL[i][0]; c.beginPath(); c.moveTo(x, y); c.arc(x, y, rad, i * 1.047 + S.t, (i + 1) * 1.047 + S.t); c.fill(); }
      c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(x, y, rad * .45, 0, 6.29); c.fill();
    } else {
      var col = COL[b.k], g = c.createRadialGradient(x - rad * .35, y - rad * .4, rad * .15, x, y, rad); g.addColorStop(0, "#fff"); g.addColorStop(.25, col[0]); g.addColorStop(1, col[1]);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 6.29); c.fill();
    }
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(x - rad * .35, y - rad * .45, rad * .28, rad * .16, -.6, 0, 6.29); c.fill();
    if (b.sp === "bomb") { c.fillStyle = "#1b1b24"; c.beginPath(); c.arc(x, y + 2, rad * .5, 0, 6.29); c.fill(); c.strokeStyle = "#ffd23f"; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y - 6); c.quadraticCurveTo(x + 9, y - 13, x + 5, y - 15); c.stroke(); c.fillStyle = Math.sin(S.t * 14) > 0 ? "#ffd23f" : "#ff5a3c"; c.beginPath(); c.arc(x + 5, y - 15, 2.5, 0, 6.29); c.fill(); }
    if (b.star) { c.save(); c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, rad - 3, 0, 6.29); c.stroke(); c.restore(); starShape(c, x, y + 1, rad * .55, "#fff8c4"); }
  }
  function draw(c, api) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1b0f3b"); g.addColorStop(.6, "#0a1a3d"); g.addColorStop(1, "#05070d"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // castle silhouette
    c.fillStyle = "rgba(255,255,255,.05)";
    for (var i = 0; i < 6; i++) { var tx = 20 + i * 86, th = 120 + (i % 3) * 50; c.fillRect(tx, H - th, 50, th); for (var j = 0; j < 3; j++) c.fillRect(tx + j * 18, H - th - 12, 12, 12); }
    if (S.scr === "play" || S.scr === "result") {
      c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(LW, TOP, RWALL - LW, by(LOSE_ROW) - TOP);
      c.strokeStyle = "rgba(0,212,255,.5)"; c.lineWidth = 3; c.beginPath(); c.moveTo(LW, TOP); c.lineTo(RWALL, TOP); c.stroke();
      c.strokeStyle = "rgba(255,90,95,.35)"; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(LW, by(LOSE_ROW) - R); c.lineTo(RWALL, by(LOSE_ROW) - R); c.stroke(); c.setLineDash([]);
      var drop = S.intro > 0 ? -S.intro * 500 : 0;
      S.g.forEach(function (row, r) { row.forEach(function (b, cc) { if (b) { var w = b.wob > 0 ? Math.sin(b.wob * 50) * 2 : 0; drawBubble(c, bx(r, cc) + w, by(r) + drop, b); } }); });
      S.fall.forEach(function (f) { drawBubble(c, f.x, f.y, f.b); });
      // top bar
      panel(c, 10, 52, 460, 40, "rgba(255,210,63,.45)");
      T(c, "Lv " + S.L.n, 50, 72, 16, "#fff");
      starShape(c, 160, 72, 11, "#ffd23f"); T(c, S.saved + " / " + S.starsTotal, 205, 72, 17, "#ffd23f");
      T(c, "Shots " + S.shots, 330, 72, 16, S.shots <= 3 ? "#ff7a7a" : "#fff"); T(c, String(S.score), 430, 72, 15, "#9fb3d1");
      if (S.scr === "play" && !S.end) {
        var pts = trace(S.aimLeft > 0 ? 3 : 0), lim = S.aimLeft > 0 ? 1e9 : 260, used = 0;
        c.fillStyle = S.aimLeft > 0 ? "rgba(57,255,136,.9)" : "rgba(255,255,255,.7)";
        for (i = 1; i < pts.length && used < lim; i++) { var a = pts[i - 1], bq = pts[i], L = Math.hypot(bq[0] - a[0], bq[1] - a[1]); for (var d = 0; d < L && used < lim; d += 16, used += 16) { var u = d / L; c.beginPath(); c.arc(a[0] + (bq[0] - a[0]) * u, a[1] + (bq[1] - a[1]) * u, 3, 0, 6.29); c.fill(); } }
      }
      // cannon
      c.save(); c.translate(SX, SY); c.rotate(S.ang + Math.PI / 2);
      c.fillStyle = "#3b2a6b"; rr(c, -14, -52, 28, 52, 8); c.fill(); c.strokeStyle = "#ffd23f"; c.lineWidth = 2; c.stroke(); c.restore();
      c.fillStyle = "#24164a"; c.beginPath(); c.arc(SX, SY + 12, 34, Math.PI, 0); c.fill(); c.strokeStyle = "#ffd23f"; c.lineWidth = 3; c.stroke();
      var cur = S.boost === "fire" ? null : S.boost === "rain" ? { k: -2, sp: "" } : { k: S.cur, sp: "" };
      if (S.boost === "fire") { c.save(); c.shadowColor = "#ff5a3c"; c.shadowBlur = 20; c.fillStyle = "#ff8a3d"; c.beginPath(); c.arc(SX, SY, R - 1, 0, 6.29); c.fill(); c.restore(); T(c, "🔥", SX, SY + 1, 20); }
      else drawBubble(c, SX, SY, cur);
      drawBubble(c, SX - 92, SY + 18, { k: S.spare, sp: "" }, 15); T(c, "swap", SX - 92, SY + 46, 11, "#9fb3d1");
      if (S.ball) { if (S.ball.boost === "fire") { c.fillStyle = "#ff8a3d"; c.beginPath(); c.arc(S.ball.x, S.ball.y, R, 0, 6.29); c.fill(); } else drawBubble(c, S.ball.x, S.ball.y, { k: S.ball.boost === "rain" ? -2 : S.ball.k, sp: "" }); }
      S.parts.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 2.5); if (q.ring) { c.strokeStyle = q.col; c.lineWidth = 6; c.beginPath(); c.arc(q.x, q.y, (0.45 - q.t) * 260 + 10, 0, 6.29); c.stroke(); } else { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, 3.5, 0, 6.29); c.fill(); } }); c.globalAlpha = 1;
      S.fly.forEach(function (f) { var e = f.t * f.t, x = f.sx + (160 - f.sx) * e, y = f.sy + (72 - f.sy) * e; starShape(c, x, y, 14 - f.t * 4, "#ffd23f"); });
      S.pops.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 2); T(c, q.s, q.x, q.y, q.size, q.col); }); c.globalAlpha = 1;
      if (S.intro > 0) { T(c, "Rescue " + S.starsTotal + " star" + (S.starsTotal > 1 ? "s" : "") + "!", W / 2, 520, 26, "#ffd23f"); }
      if (S.scr === "result") {
        c.fillStyle = "rgba(5,7,13,.6)"; c.fillRect(0, 0, W, H); panel(c, 60, 190, 360, S.res.win ? 400 : 340, S.res.win ? "#39ff88" : "#ff5a5f");
        if (S.res.win) { T(c, "Level " + S.L.n + " cleared!", W / 2, 236, 28, "#fff"); stars3(c, W / 2, 300, S.res.stars, 26); T(c, "Score " + S.score, W / 2, 360, 20, "#ffd23f"); if (S.res.gift) T(c, "Reward: " + S.res.gift, W / 2, 396, 15, "#39ff88"); }
        else { T(c, "Level failed", W / 2, 240, 30, "#ff7a7a"); T(c, S.res.why, W / 2, 290, 17, "#fff"); T(c, "Stars rescued " + S.saved + " / " + S.starsTotal, W / 2, 330, 16, "#ffd23f"); }
      }
      drawUI(c, S.ui);
    } else {
      if (S.scr === "menu") {
        for (i = 0; i < 14; i++) drawBubble(c, 40 + (i * 67) % 420, 130 + Math.sin(S.t * 1.5 + i) * 10 + (i % 3) * 40, { k: i % 6, sp: i % 5 === 0 ? "" : "", star: i % 4 === 0 }, 18);
        T(c, "BUBBLE", W / 2, 270, 56, "#ff2bd6", "center", "900"); T(c, "KINGDOM", W / 2, 325, 44, "#ffd23f", "center", "900");
        var tot = 0; Object.keys(save.done).forEach(function (k) { tot += save.done[k]; });
        T(c, "★ " + tot + " / 300   ·   🔥" + save.fire + "  🌈" + save.rain + "  🎯" + save.aim, W / 2, 560, 17, "#9fb3d1");
      } else if (S.scr === "levels") { T(c, "Choose a level", W / 2, 60 + 10, 30, "#fff"); T(c, "Levels " + (S.page * 20 + 1) + "–" + (S.page * 20 + 20), W / 2, 104, 15, "#9fb3d1"); }
      drawUI(c, S.ui);
    }
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, touch: true, hint: "Drag to aim, release to shoot. Match 3 to pop. Tap the small bubble (or ↓) to swap. ← → aim, Space shoots." });
  window.GV6 = { S: function () { return S; }, start: function (n) { start(n); }, levelDef: levelDef, trace: function () { return trace(3); }, cluster: function (r, c) { return cluster(r, c); }, nb: nb, bx: bx, by: by }; // debug hook used by automated tests
})();
