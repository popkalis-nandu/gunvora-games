/* Color Blast 3 — match-3 puzzle. Original game for Gaming World of Jarvis.
   8x8 board · swap / match / gravity / refill · 4 special balls (Rocket ↔, Rocket ↕, Bomb, Rainbow) + Hammer & Shuffle boosters
   50 levels with goals (score, colours, crystals, crates) and move limits · 60-second challenge mode. */
(function () {
  "use strict";
  var W = 480, H = 720, N = 8, CS = 54, BX = (W - N * CS) / 2, BY = 160, S, API;
  var KEY = "gv_colorblast", AGAIN = null, uid = 1;
  var COLS = [["#ff4d5e", "#a3122a"], ["#ffd23f", "#c27c00"], ["#39d98a", "#0f7a45"], ["#3fa9ff", "#0b4fa8"], ["#b06bff", "#5a1fa6"], ["#ff8a3d", "#b34700"]];
  var NAMES = ["red", "yellow", "green", "blue", "purple", "orange"];
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
  var save = LS(KEY, { done: {}, hammer: 3, shuffle: 3 });
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  /* ---------- 50 levels, generated from a seed per level ---------- */
  function levelDef(n) { // n = 1..50
    var r = rng(n * 7919 + 13), types = ["crates", "score", "collect", "crystal"], type = n === 1 ? "score" : types[n % 4];
    var d = { n: n, colors: n <= 30 ? 5 : 6, type: type, crystals: [], crates: [], moves: 0 };
    if (type === "score") { d.target = 1200 + n * 90; d.moves = 23 - Math.floor(n / 15); }
    if (type === "collect") { d.color = Math.floor(r() * d.colors); d.target = 15 + Math.floor(n * .5); d.moves = 25 - Math.floor(n / 20); }
    if (type === "crystal") {
      var pats = [function (rr0, c) { return rr0 >= 3 && rr0 <= 4; }, function (rr0, c) { return c >= 2 && c <= 5 && rr0 >= 2 && rr0 <= 5; }, function (rr0, c) { return rr0 === c || rr0 === 7 - c; }, function (rr0, c) { return rr0 >= 5; }, function (rr0, c) { return (rr0 + c) % 2 === 0 && rr0 > 1 && rr0 < 6; }, function (rr0, c) { return c === 0 || c === 7 || rr0 === 7; }];
      var pf = pats[Math.floor(n / 4) % pats.length];
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (pf(y, x)) d.crystals.push([y, x, n > 20 && r() < (n - 20) / 40 ? 2 : 1]);
      d.target = d.crystals.reduce(function (a, q) { return a + q[2]; }, 0); d.moves = 18 + Math.ceil(d.crystals.length / 3) - Math.floor(n / 14);
    }
    if (type === "crates") {
      var cnt = Math.min(18, 5 + Math.floor(n / 3)), placed = {};
      while (d.crates.length < cnt) { var cy = 3 + Math.floor(r() * 5), cx = Math.floor(r() * N), k = cy + "," + cx; if (placed[k]) continue; placed[k] = 1; d.crates.push([cy, cx, n > 25 && r() < .5 ? 2 : 1]); }
      d.target = d.crates.length; d.moves = 23 + Math.floor(cnt / 2) - Math.floor(n / 16);
    }
    return d;
  }
  /* ---------- board helpers ---------- */
  function ball(k, sp) { return { k: k, sp: sp || "", oy: 0, id: uid++ }; }
  function rndColor() { return Math.floor(Math.random() * S.ncol); }
  function at(r, c) { return r >= 0 && r < N && c >= 0 && c < N ? S.g[r][c] : null; }
  function matchable(a, b) { return a && b && a.k >= 0 && a.k === b.k; }
  function fillBoard(keep) {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (S.g[r][c] && S.g[r][c].k === -1) continue;
      if (keep && S.g[r][c] && (S.g[r][c].k < 0 || S.g[r][c].sp)) continue;
      var k, t = 0; do { k = rndColor(); t++; } while (t < 20 && ((c >= 2 && at(r, c - 1) && at(r, c - 2) && at(r, c - 1).k === k && at(r, c - 2).k === k) || (r >= 2 && at(r - 1, c) && at(r - 2, c) && at(r - 1, c).k === k && at(r - 2, c).k === k)));
      if (keep && S.g[r][c]) S.g[r][c].k = k; else S.g[r][c] = ball(k);
    }
  }
  function findRuns() {
    var runs = [], r, c, k;
    for (r = 0; r < N; r++) for (c = 0; c < N;) { var a = at(r, c), len = 1; while (c + len < N && matchable(a, at(r, c + len))) len++; if (len >= 3) { var cells = []; for (k = 0; k < len; k++) cells.push([r, c + k]); runs.push({ cells: cells, d: "h", k: a.k }); } c += len; }
    for (c = 0; c < N; c++) for (r = 0; r < N;) { var b = at(r, c), l2 = 1; while (r + l2 < N && matchable(b, at(r + l2, c))) l2++; if (l2 >= 3) { var cl = []; for (k = 0; k < l2; k++) cl.push([r + k, c]); runs.push({ cells: cl, d: "v", k: b.k }); } r += l2; }
    return runs;
  }
  function hasMove() {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var a = at(r, c); if (!a || a.k === -1) continue; if (a.sp === "r") return true;
      var nb = [[r, c + 1], [r + 1, c]];
      for (var i = 0; i < 2; i++) { var b = at(nb[i][0], nb[i][1]); if (!b || b.k === -1) continue; if (b.sp === "r") return true; S.g[r][c] = b; S.g[nb[i][0]][nb[i][1]] = a; var ok = findRuns().length > 0; S.g[r][c] = a; S.g[nb[i][0]][nb[i][1]] = b; if (ok) return true; }
    }
    return false;
  }
  function shuffleBoard() {
    var t = 0; do { var list = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var b = S.g[r][c]; if (b && b.k >= 0 && !b.sp) list.push(b.k); }
      for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; }
      var q = 0; for (r = 0; r < N; r++) for (c = 0; c < N; c++) { b = S.g[r][c]; if (b && b.k >= 0 && !b.sp) b.k = list[q++]; }
      if (t++ > 6) fillBoard(true); } while ((findRuns().length || !hasMove()) && t < 40);
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (S.g[r][c]) S.g[r][c].pop = .25;
  }
  /* ---------- game flow ---------- */
  function init(api) { API = api; S = { scr: "menu", ui: UI(1), t: 0, parts: [], fx: [], pops: [], page: 0 }; if (AGAIN !== null) { var a = AGAIN; AGAIN = null; start(a); } else menu(); }
  function firstOpen() { for (var i = 1; i <= 50; i++) if (!save.done[i]) return i; return 50; }
  function menu() {
    S.scr = "menu"; var ui = S.ui = UI(1);
    button(ui, 90, 360, 300, 62, "▶  Play level " + firstOpen(), function () { start(firstOpen()); }, { size: 23 });
    button(ui, 90, 436, 300, 54, "🗺  Levels", function () { S.page = Math.floor((firstOpen() - 1) / 20); levels(); }, { col: "#ffd23f", col2: "#ff9f1c" });
    button(ui, 90, 504, 300, 54, "⏱  60-second Challenge", function () { start(0); }, { col: "#ff2bd6", col2: "#a0179a", tc: "#fff" });
  }
  function levels() {
    S.scr = "levels"; var ui = S.ui = UI(5), bw = 74, bh = 70, gx = (W - (5 * bw + 4 * 12)) / 2, base = S.page * 20;
    for (var k = 0; k < 20; k++) (function (n) { if (n > 50) return; var open = n === 1 || save.done[n - 1] || save.done[n];
      button(ui, gx + (k % 5) * (bw + 12), 130 + Math.floor(k / 5) * (bh + 14), bw, bh, "", function () { start(n); }, { disabled: !open, col: save.done[n] ? "#39ff88" : "#00d4ff", col2: save.done[n] ? "#14a85a" : "#0077ff",
        draw: function (c, b) { T(c, open ? String(n) : "🔒", b.x + b.w / 2, b.y + 26, 22, "#04121f"); if (save.done[n]) stars3(c, b.x + b.w / 2, b.y + 52, save.done[n], 7); } });
    })(base + k + 1);
    button(ui, 30, 500, 120, 50, "◀ Prev", function () { S.page = (S.page + 2) % 3; levels(); }, { ghost: true });
    button(ui, 330, 500, 120, 50, "Next ▶", function () { S.page = (S.page + 1) % 3; levels(); }, { ghost: true });
    button(ui, 165, 580, 150, 50, "Menu", menu, { ghost: true, col: "#ffd23f" });
  }
  function start(n) {
    var d = n ? levelDef(n) : { n: 0, colors: 5, type: "time", crystals: [], crates: [], moves: 0 };
    S.scr = "play"; S.L = d; S.ncol = d.colors; S.score = 0; S.moves = d.moves; S.time = 60; S.prog = 0; S.combo = 0; S.ph = "idle"; S.sel = null; S.drag = null; S.cur = [3, 3]; S.grab = false; S.tool = null; S.end = 0; S.bonus = false;
    S.g = []; S.jel = []; for (var r = 0; r < N; r++) { S.g.push(new Array(N).fill(null)); S.jel.push(new Array(N).fill(0)); }
    d.crystals.forEach(function (q) { S.jel[q[0]][q[1]] = q[2]; });
    d.crates.forEach(function (q) { S.g[q[0]][q[1]] = { k: -1, hp: q[2], oy: 0, id: uid++, sp: "" }; });
    fillBoard(false); var t = 0; while (!hasMove() && t++ < 20) shuffleBoard();
    for (r = 0; r < N; r++) for (var c = 0; c < N; c++) S.g[r][c].oy = -(N - r) * CS - 40 - c * 6;
    S.ph = "fall"; S.parts = []; S.fx = []; S.pops = [];
    var ui = S.ui = UI(3), y = 618;
    button(ui, 24, y, 132, 54, "", function () { useTool("hammer"); }, { col: "#ffd23f", col2: "#ff9f1c", draw: function (c, b) { T(c, "🔨 Hammer ×" + save.hammer, b.x + b.w / 2, b.y + b.h / 2, 16, "#04121f"); if (S.tool === "hammer") { c.strokeStyle = "#fff"; c.lineWidth = 4; rr(c, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 16); c.stroke(); } } });
    button(ui, 174, y, 132, 54, "", function () { useTool("shuffle"); }, { col: "#00d4ff", col2: "#0077ff", draw: function (c, b) { T(c, "🔀 Shuffle ×" + save.shuffle, b.x + b.w / 2, b.y + b.h / 2, 16, "#04121f"); } });
    button(ui, 324, y, 132, 54, "≡ Menu", function () { if (S.L.n) { S.page = Math.floor((S.L.n - 1) / 20); levels(); } else menu(); }, { ghost: true, size: 17 });
    API.setScore(0); API.sfx("move");
  }
  function useTool(t) {
    if (S.ph !== "idle" || S.end) return;
    if (t === "hammer") { if (save.hammer <= 0) { pop(W / 2, 600, "No hammers left", "#ff5a5f"); API.sfx("hit"); return; } S.tool = S.tool === "hammer" ? null : "hammer"; return; }
    if (t === "shuffle") { if (save.shuffle <= 0) { pop(W / 2, 600, "No shuffles left", "#ff5a5f"); API.sfx("hit"); return; } save.shuffle--; SV(KEY, save); shuffleBoard(); API.sfx("flip"); }
  }
  function pop(x, y, s, col, size) { S.pops.push({ x: x, y: y, s: s, col: col || "#fff", t: 1.1, size: size || 22 }); }
  function cx(c) { return BX + c * CS + CS / 2; } function cy(r) { return BY + r * CS + CS / 2; }
  function trySwap(a, b) {
    if (S.ph !== "idle" || S.end) return;
    var A = at(a[0], a[1]), B = at(b[0], b[1]); if (!A || !B || A.k === -1 || B.k === -1) { API.sfx("hit"); return; }
    S.ph = "swap"; S.sw = { a: a, b: b, t: 0, back: false }; API.sfx("flip");
  }
  function finishSwap() {
    if (S.sw.back) { S.ph = "idle"; S.sw = null; return; }
    var a = S.sw.a, b = S.sw.b, A = at(a[0], a[1]), B = at(b[0], b[1]);
    S.g[a[0]][a[1]] = B; S.g[b[0]][b[1]] = A;
    var set = {}, extra = [];
    if (A.sp === "r" || B.sp === "r") { // rainbow combos
      var R = A.sp === "r" ? A : B, O = R === A ? B : A, rp = R === A ? b : a, op = R === A ? a : b;
      set[rp[0] + "," + rp[1]] = 1; R.used = true;
      if (O.sp === "r") { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) set[r + "," + c] = 1; fxFlash(); }
      else { var k = O.k; for (r = 0; r < N; r++) for (c = 0; c < N; c++) { var q = S.g[r][c]; if (q && q.k === k) { if (O.sp && !q.sp) q.sp = O.sp === "b" ? "b" : (Math.random() < .5 ? "h" : "v"); set[r + "," + c] = 1; S.fx.push({ type: "zap", x1: cx(rp[1]), y1: cy(rp[0]), x2: cx(c), y2: cy(r), t: .4, col: COLS[k][0] }); } } }
      useMove(); resolve(set, [], null); return;
    }
    if (A.sp && B.sp) { set[a[0] + "," + a[1]] = 1; set[b[0] + "," + b[1]] = 1; if (A.sp === "b" && B.sp === "b") B.big = true; useMove(); resolve(set, [], null); return; }
    var runs = findRuns();
    if (!runs.length) { S.ph = "swap"; S.sw = { a: a, b: b, t: 0, back: true }; S.g[a[0]][a[1]] = A; S.g[b[0]][b[1]] = B; S.ph = "swap"; API.sfx("hit"); return; }
    useMove(); S.combo = 0; resolve(null, runs, [a, b]);
  }
  function useMove() { if (S.L.n) S.moves--; }
  /* runs -> specials + clear set; then chain special triggers */
  function resolve(set, runs, pref) {
    set = set || {}; var spawn = [];
    if (runs.length) {
      // group runs that share cells
      var grp = runs.map(function (r0, i) { return i; }); function f(i) { while (grp[i] !== i) i = grp[i] = grp[grp[i]]; return i; }
      for (var i = 0; i < runs.length; i++) for (var j = i + 1; j < runs.length; j++) if (runs[i].k === runs[j].k && runs[i].cells.some(function (p) { return runs[j].cells.some(function (q) { return p[0] === q[0] && p[1] === q[1]; }); })) grp[f(j)] = f(i);
      var groups = {}; runs.forEach(function (r0, i) { (groups[f(i)] = groups[f(i)] || []).push(r0); });
      Object.keys(groups).forEach(function (g) {
        var rs = groups[g], cells = {}, maxL = 0, hasH = false, hasV = false, longest = rs[0];
        rs.forEach(function (r0) { r0.cells.forEach(function (p) { cells[p[0] + "," + p[1]] = p; }); if (r0.cells.length > maxL) { maxL = r0.cells.length; longest = r0; } if (r0.d === "h") hasH = true; else hasV = true; });
        var type = maxL >= 5 ? "r" : hasH && hasV ? "b" : maxL === 4 ? longest.d : "";
        var keys = Object.keys(cells), at0 = longest.cells[Math.floor(longest.cells.length / 2)];
        if (pref) pref.forEach(function (p) { if (cells[p[0] + "," + p[1]]) at0 = p; });
        if (!pref || !keys.some(function (k) { return pref.some(function (p) { return p[0] + "," + p[1] === k; }); })) { // cascade: prefer a cell that just fell
          keys.forEach(function (k) { var p = cells[k], b0 = at(p[0], p[1]); if (b0 && b0.fell) at0 = p; });
        }
        keys.forEach(function (k) { set[k] = 1; });
        if (type) spawn.push({ p: at0, sp: type, k: rs[0].k });
        // crates next to matched balls take a hit
        keys.forEach(function (k) { var p = cells[k];[[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var q = at(p[0] + d[0], p[1] + d[1]); if (q && q.k === -1) set[(p[0] + d[0]) + "," + (p[1] + d[1])] = 1; }); });
        S.score += keys.length * 20 * (1 + S.combo) + (type ? 60 : 0);
        if (keys.length) pop(cx(at0[1]), cy(at0[0]), "+" + keys.length * 20 * (1 + S.combo), COLS[rs[0].k][0], 18);
      });
    }
    // expand: specials inside the set trigger
    var queue = Object.keys(set), seen = {};
    while (queue.length) {
      var key = queue.shift(); if (seen[key]) continue; seen[key] = 1;
      var pr = key.split(",").map(Number), b = at(pr[0], pr[1]); if (!b) continue;
      if (!b.sp) continue;
      var add = [];
      if (b.sp === "h") { for (var c2 = 0; c2 < N; c2++) add.push([pr[0], c2]); S.fx.push({ type: "beam", d: "h", r: pr[0], c: pr[1], t: .35, col: b.k >= 0 ? COLS[b.k][0] : "#fff" }); API.sfx("shoot"); }
      if (b.sp === "v") { for (var r2 = 0; r2 < N; r2++) add.push([r2, pr[1]]); S.fx.push({ type: "beam", d: "v", r: pr[0], c: pr[1], t: .35, col: b.k >= 0 ? COLS[b.k][0] : "#fff" }); API.sfx("shoot"); }
      if (b.sp === "b") { var rad = b.big ? 3 : 2; for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) if (Math.abs(dx) + Math.abs(dy) <= rad + (b.big ? 1 : 0)) add.push([pr[0] + dy, pr[1] + dx]); S.fx.push({ type: "ring", x: cx(pr[1]), y: cy(pr[0]), t: .45, R: rad * CS + 20 }); API.sfx("boom"); }
      if (b.sp === "r" && !b.used) { var kk = Math.floor(Math.random() * S.ncol); for (var r3 = 0; r3 < N; r3++) for (var c3 = 0; c3 < N; c3++) { var q2 = S.g[r3][c3]; if (q2 && q2.k === kk) add.push([r3, c3]); } fxFlash(); }
      add.forEach(function (p) { if (p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N) { var kk2 = p[0] + "," + p[1]; set[kk2] = 1; if (!seen[kk2]) queue.push(kk2); } });
      S.score += 80;
    }
    // mark dying balls, apply crystal / crate / collect goals
    var killed = 0;
    Object.keys(set).forEach(function (key2) {
      var p = key2.split(",").map(Number), b = at(p[0], p[1]); if (!b) return;
      var sp = spawn.filter(function (s) { return s.p[0] === p[0] && s.p[1] === p[1]; })[0];
      if (S.jel[p[0]][p[1]] > 0 && b.k !== -1) { S.jel[p[0]][p[1]]--; burst(p, "#9be7ff", 6); if (S.L.type === "crystal") S.prog++; }
      if (b.k === -1) { b.hp--; b.shake = .3; burst(p, "#c08a4a", 8); if (b.hp <= 0) { b.dying = .001; if (S.L.type === "crates") S.prog++; S.score += 100; } return; }
      if (sp) { b.sp = sp.sp; b.k = sp.sp === "r" ? -2 : sp.k; b.pop = .3; b.big = false; return; }
      if (S.L.type === "collect" && b.k === S.L.color) S.prog++;
      b.dying = .001; killed++; burst(p, b.k >= 0 ? COLS[b.k][0] : "#fff", 5);
    });
    if (S.L.type === "score") S.prog = S.score;
    API.setScore(S.score); if (killed) API.sfx(S.combo > 1 ? "coin" : "move");
    if (S.combo >= 1 && runs.length) pop(W / 2, BY + N * CS / 2 + 10, ["", "Nice!", "Great!", "Awesome!", "Spectacular!"][Math.min(4, S.combo)] + " ×" + (S.combo + 1), "#ffd23f", 30);
    S.ph = "clear"; S.clearT = .22;
  }
  function fxFlash() { S.fx.push({ type: "flash", t: .3 }); API.sfx("boom"); }
  function burst(p, col, n) { for (var i = 0; i < n; i++) S.parts.push({ x: cx(p[1]), y: cy(p[0]), vx: (Math.random() - .5) * 320, vy: (Math.random() - .7) * 320, t: .6, col: col }); }
  function gravity() {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var b = S.g[r][c]; if (b && b.dying) S.g[r][c] = null; else if (b) b.fell = false; }
    for (c = 0; c < N; c++) {
      var wr = N - 1;
      for (r = N - 1; r >= 0; r--) { b = S.g[r][c]; if (b) { if (wr !== r) { S.g[wr][c] = b; S.g[r][c] = null; b.oy -= (wr - r) * CS; b.fell = true; } wr--; } }
      for (var k = wr; k >= 0; k--) { var nb = ball(rndColor()); nb.oy = -(wr + 1) * CS - 10; nb.fell = true; S.g[k][c] = nb; }
    }
    S.ph = "fall";
  }
  function settle() {
    var runs = findRuns();
    if (runs.length) { S.combo++; resolve(null, runs, null); return; }
    S.combo = 0;
    if (checkEnd()) return;
    if (!hasMove()) { pop(W / 2, BY + 4 * CS, "No moves — shuffling!", "#fff", 24); shuffleBoard(); }
    S.ph = "idle";
  }
  function goalMet() { var L = S.L; return L.type !== "time" && S.prog >= L.target; }
  function checkEnd() {
    var L = S.L;
    if (L.type === "time") { if (S.time <= 0) { S.end = 1; S.ph = "idle"; AGAIN = 0; setTimeout(function () { }, 0); API.over({ title: "Time's up!", detail: "60-second Challenge" }); return true; } return false; }
    if (goalMet() && !S.bonus) { S.bonus = true; S.starsWon = S.moves >= Math.ceil(L.moves * .3) ? 3 : S.moves >= Math.ceil(L.moves * .15) ? 2 : 1; pop(W / 2, BY + 3 * CS, "Goal complete!", "#39ff88", 30); API.sfx("win"); S.bonusT = .9; S.ph = "bonus"; return true; }
    if (S.bonus) { if (S.moves > 0) { S.ph = "bonus"; S.bonusT = .12; return true; } winLevel(); return true; }
    if (S.moves <= 0) { loseLevel(); return true; }
    return false;
  }
  function bonusStep() { // leftover moves become rockets that fire
    var list = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var b = S.g[r][c]; if (b && b.k >= 0 && !b.sp) list.push([r, c]); }
    if (!list.length || S.moves <= 0) { S.moves = 0; settle(); return; }
    var set = {}, n = Math.min(S.moves, 4, list.length);
    for (var i = 0; i < n; i++) { var j = Math.floor(Math.random() * list.length), p = list.splice(j, 1)[0]; S.g[p[0]][p[1]].sp = Math.random() < .5 ? "h" : "v"; S.moves--; S.score += 150; pop(cx(p[1]), cy(p[0]), "+150", "#ffd23f", 18); set[p[0] + "," + p[1]] = 1; }
    resolve(set, [], null);
  }
  function winLevel() {
    var n = S.L.n, st = S.starsWon, prev = save.done[n] || 0; save.done[n] = Math.max(prev, st); if (st === 3 && prev < 3) save.hammer++; if (!prev && n % 5 === 0) save.shuffle++; SV(KEY, save);
    S.scr = "result"; S.res = { win: true, stars: st, gift: (st === 3 && prev < 3 ? "+1 🔨 " : "") + (!prev && n % 5 === 0 ? "+1 🔀" : "") }; S.end = 1;
    var ui = S.ui = UI(1), y = 430; if (n < 50) { button(ui, 120, y, 240, 56, "Next level ▶", function () { start(n + 1); }); y += 66; }
    button(ui, 120, y, 240, 52, "↻ Replay", function () { start(n); }, { col: "#ffd23f", col2: "#ff9f1c" }); button(ui, 120, y + 62, 240, 48, "Levels", function () { S.page = Math.floor((n - 1) / 20); levels(); }, { ghost: true });
  }
  function loseLevel() {
    var n = S.L.n; S.scr = "result"; S.res = { win: false }; S.end = 1; API.sfx("over");
    var ui = S.ui = UI(1); button(ui, 120, 430, 240, 56, "↻ Try again", function () { start(n); }, { col: "#ffd23f", col2: "#ff9f1c" }); button(ui, 120, 496, 240, 48, "Levels", function () { S.page = Math.floor((n - 1) / 20); levels(); }, { ghost: true });
  }
  function cellAt(x, y) { var c = Math.floor((x - BX) / CS), r = Math.floor((y - BY) / CS); return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null; }
  function update(dt, api) {
    S.t += dt; var p = api.pointer, r, c, b;
    S.parts.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; q.t -= dt; }); S.parts = S.parts.filter(function (q) { return q.t > 0; });
    S.fx.forEach(function (f) { f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; });
    S.pops.forEach(function (q) { q.y -= 34 * dt; q.t -= dt; }); S.pops = S.pops.filter(function (q) { return q.t > 0; });
    if (S.scr !== "play" && S.scr !== "result") { uiInput(S.ui, api); return; }
    if (S.scr === "result") { uiInput(S.ui, api); return; }
    if (S.L.type === "time" && !S.end) S.time = Math.max(0, S.time - dt);
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) { b = S.g[r][c]; if (!b) continue; if (b.pop > 0) b.pop -= dt; if (b.shake > 0) b.shake -= dt; }
    // phases
    if (S.ph === "swap") { S.sw.t += dt / .16; if (S.sw.t >= 1) finishSwap(); }
    else if (S.ph === "clear") { S.clearT -= dt; for (r = 0; r < N; r++) for (c = 0; c < N; c++) { b = S.g[r][c]; if (b && b.dying) b.dying += dt; } if (S.clearT <= 0) gravity(); }
    else if (S.ph === "fall") { var moving = false; for (r = 0; r < N; r++) for (c = 0; c < N; c++) { b = S.g[r][c]; if (b && b.oy < 0) { b.vy = (b.vy || 0) + 2600 * dt; b.oy = Math.min(0, b.oy + b.vy * dt); if (b.oy < 0) moving = true; else { b.vy = 0; b.pop = .12; } } } if (!moving) { api.sfx("move"); settle(); } }
    else if (S.ph === "bonus") { S.bonusT -= dt; if (S.bonusT <= 0) bonusStep(); }
    else if (S.ph === "idle" && S.L.type === "time" && S.time <= 0 && !S.end) { checkEnd(); }
    if (S.end) return;
    // input
    if (p.tapped) { for (var i = 0; i < S.ui.btns.length; i++) if (inB(p, S.ui.btns[i])) { S.ui.btns[i].fn(); return; } }
    if (S.ph === "idle") {
      if (p.tapped) {
        var cell = cellAt(p.x, p.y); S.kb = false;
        if (cell && S.tool === "hammer") { save.hammer--; SV(KEY, save); S.tool = null; var set = {}; set[cell[0] + "," + cell[1]] = 1; api.sfx("boom"); resolve(set, [], null); return; }
        if (cell) { if (S.sel && Math.abs(S.sel[0] - cell[0]) + Math.abs(S.sel[1] - cell[1]) === 1) { trySwap(S.sel, cell); S.sel = null; S.drag = null; return; } S.sel = cell; S.cur = cell.slice(); S.drag = { cell: cell, x: p.x, y: p.y }; api.sfx("flip"); }
        else S.sel = null;
      }
      if (S.drag && p.down) { var dx = p.x - S.drag.x, dy = p.y - S.drag.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > CS * .42) { var d0 = S.drag.cell, tg = Math.abs(dx) > Math.abs(dy) ? [d0[0], d0[1] + (dx > 0 ? 1 : -1)] : [d0[0] + (dy > 0 ? 1 : -1), d0[1]]; S.drag = null; S.sel = null; if (at(tg[0], tg[1])) trySwap(d0, tg); } }
      if (!p.down) S.drag = null;
      // keyboard
      var mv = api.hit("left") ? [0, -1] : api.hit("right") ? [0, 1] : api.hit("up") ? [-1, 0] : api.hit("down") ? [1, 0] : null;
      if (mv) { var nr = Math.max(0, Math.min(N - 1, S.cur[0] + mv[0])), nc = Math.max(0, Math.min(N - 1, S.cur[1] + mv[1])); if (S.grab) { S.grab = false; if (nr !== S.cur[0] || nc !== S.cur[1]) trySwap(S.cur.slice(), [nr, nc]); } else { S.cur = [nr, nc]; S.kb = true; } }
      if (api.hit("fire") || api.hit("enter")) { if (S.tool === "hammer") { save.hammer--; SV(KEY, save); S.tool = null; var s2 = {}; s2[S.cur[0] + "," + S.cur[1]] = 1; resolve(s2, [], null); } else { S.grab = !S.grab; S.kb = true; } }
    }
  }
  /* ---------- drawing ---------- */
  var SHAPES = [function (c, s) { c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill(); }, function (c, s) { c.beginPath(); c.moveTo(0, -s * 1.2); c.lineTo(s * 1.1, s * .9); c.lineTo(-s * 1.1, s * .9); c.fill(); }, function (c, s) { c.beginPath(); c.moveTo(0, -s * 1.3); c.lineTo(s * 1.3, 0); c.lineTo(0, s * 1.3); c.lineTo(-s * 1.3, 0); c.fill(); }, function (c, s) { c.fillRect(-s, -s, s * 2, s * 2); }, function (c, s) { starShape(c, 0, 0, s * 1.4, c.fillStyle); }, function (c, s) { c.beginPath(); c.moveTo(0, s * 1.1); c.bezierCurveTo(-s * 2, -s * .2, -s * .6, -s * 1.6, 0, -s * .5); c.bezierCurveTo(s * .6, -s * 1.6, s * 2, -s * .2, 0, s * 1.1); c.fill(); }];
  function drawBall(c, b, x, y, sc) {
    var R = CS * .42 * sc;
    c.save(); c.translate(x, y);
    if (b.k === -1) { // crate
      var sh = b.shake > 0 ? Math.sin(S.t * 80) * 3 : 0; c.translate(sh, 0); var s = CS * .44 * sc;
      c.fillStyle = "#8a5a2b"; rr(c, -s, -s, s * 2, s * 2, 6); c.fill(); c.strokeStyle = "#5a3612"; c.lineWidth = 3; c.stroke();
      c.strokeStyle = "#b07a40"; c.lineWidth = 2; for (var i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-s + 4, i * s * .55); c.lineTo(s - 4, i * s * .55); c.stroke(); }
      c.strokeStyle = "#5a3612"; c.lineWidth = 3; c.beginPath(); c.moveTo(-s + 3, -s + 3); c.lineTo(s - 3, s - 3); c.stroke();
      if (b.hp > 1) { c.fillStyle = "#9aa7b8"; c.fillRect(-s, -s * .2, s * 2, s * .4); c.fillStyle = "#dfe7f2"; c.beginPath(); c.arc(-s * .6, 0, 3, 0, 7); c.arc(s * .6, 0, 3, 0, 7); c.fill(); }
      c.restore(); return;
    }
    if (b.sp === "r") { for (var k = 0; k < 6; k++) { c.fillStyle = COLS[k][0]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, k * Math.PI / 3 + S.t * 2, (k + 1) * Math.PI / 3 + S.t * 2); c.fill(); } c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(0, 0, R * .42, 0, 7); c.fill(); starShape(c, 0, 0, R * .32, "#ffd23f"); c.restore(); return; }
    var col = COLS[b.k];
    var g = c.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R); g.addColorStop(0, "#fff"); g.addColorStop(.25, col[0]); g.addColorStop(1, col[1]);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
    if (b.sp === "h" || b.sp === "v") { c.save(); c.beginPath(); c.arc(0, 0, R, 0, 7); c.clip(); c.fillStyle = "rgba(255,255,255,.75)"; for (var j = -2; j <= 2; j++) { if (b.sp === "h") c.fillRect(-R, j * R * .4 - 2, R * 2, 4); else c.fillRect(j * R * .4 - 2, -R, 4, R * 2); } c.restore(); c.fillStyle = "#fff"; c.beginPath(); if (b.sp === "h") { c.moveTo(R * .95, 0); c.lineTo(R * .55, -R * .3); c.lineTo(R * .55, R * .3); c.moveTo(-R * .95, 0); c.lineTo(-R * .55, -R * .3); c.lineTo(-R * .55, R * .3); } else { c.moveTo(0, R * .95); c.lineTo(-R * .3, R * .55); c.lineTo(R * .3, R * .55); c.moveTo(0, -R * .95); c.lineTo(-R * .3, -R * .55); c.lineTo(R * .3, -R * .55); } c.fill(); }
    else if (b.sp === "b") { c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R * .62, 0, 7); c.stroke(); c.fillStyle = "#1b1b2f"; c.beginPath(); c.arc(0, 0, R * .42, 0, 7); c.fill(); c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(R * .2, -R * .5, 3 + Math.sin(S.t * 12) * 1.5, 0, 7); c.fill(); }
    else { c.fillStyle = "rgba(255,255,255,.55)"; SHAPES[b.k](c, R * .22); }
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(-R * .35, -R * .45, R * .25, R * .14, -.6, 0, 7); c.fill();
    c.restore();
  }
  function bg(c) { var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a0b3a"); g.addColorStop(1, "#05070d"); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = "rgba(255,255,255,.05)"; for (var i = 0; i < 18; i++) { c.beginPath(); c.arc((i * 131) % W, (i * 97 + S.t * 8) % H, 20 + (i % 5) * 12, 0, 7); c.fill(); } }
  function goalText() { var L = S.L; if (L.type === "score") return "Score " + Math.min(S.score, L.target) + " / " + L.target; if (L.type === "collect") return "Collect " + NAMES[L.color] + ": " + Math.min(S.prog, L.target) + " / " + L.target; if (L.type === "crystal") return "Crack crystals: " + Math.min(S.prog, L.target) + " / " + L.target; if (L.type === "crates") return "Break crates: " + Math.min(S.prog, L.target) + " / " + L.target; return ""; }
  function draw(c) {
    bg(c);
    if (S.scr === "menu") {
      T(c, "COLOR", W / 2, 110, 56, "#fff"); T(c, "BLAST 3", W / 2, 168, 56, "#ffd23f");
      for (var i = 0; i < 6; i++) drawBall(c, { k: i, sp: i === 2 ? "b" : i === 4 ? "h" : "" }, 90 + i * 60, 240 + Math.sin(S.t * 3 + i) * 8, 1.1);
      var stars = 0; for (var k in save.done) stars += save.done[k];
      T(c, "Levels " + Object.keys(save.done).length + "/50  ·  ⭐ " + stars + "  ·  ⏱ best " + API.best(), W / 2, 310, 16, "#cfe8ff", "center", "600");
      T(c, "Match 4 = Rocket · L/T = Bomb · 5 = Rainbow", W / 2, 590, 15, "#cfe8ff", "center", "600");
      drawUI(c, S.ui); return;
    }
    if (S.scr === "levels") { T(c, "Choose a level", W / 2, 60, 32, "#fff"); T(c, "Levels " + (S.page * 20 + 1) + "–" + Math.min(50, S.page * 20 + 20), W / 2, 96, 15, "#cfe8ff", "center", "600"); drawUI(c, S.ui); return; }
    // HUD panel
    c.fillStyle = "rgba(255,255,255,.06)"; rr(c, 14, 56, W - 28, 88, 16); c.fill();
    if (S.L.type === "time") { T(c, "⏱ " + Math.ceil(S.time) + "s", 80, 100, 30, S.time < 10 ? "#ff5a5f" : "#fff"); T(c, "60-second Challenge", W / 2 + 40, 84, 16, "#ffd23f"); T(c, "Score " + S.score, W / 2 + 40, 114, 24, "#fff"); }
    else {
      T(c, String(Math.max(0, S.moves)), 60, 92, 34, S.moves <= 3 ? "#ff5a5f" : "#fff"); T(c, "moves", 60, 122, 13, "#cfe8ff", "center", "600");
      T(c, "Level " + S.L.n, W / 2 + 30, 76, 16, "#ffd23f"); T(c, goalText(), W / 2 + 30, 102, 17, "#fff");
      if (S.L.type === "collect") drawBall(c, { k: S.L.color }, W - 40, 102, .55);
      var pr = Math.min(1, S.prog / S.L.target); c.fillStyle = "rgba(255,255,255,.15)"; rr(c, 120, 122, W - 160, 9, 4); c.fill(); c.fillStyle = "#39ff88"; rr(c, 120, 122, (W - 160) * pr, 9, 4); c.fill();
    }
    // board
    c.fillStyle = "rgba(4,10,24,.75)"; rr(c, BX - 8, BY - 8, N * CS + 16, N * CS + 16, 16); c.fill(); c.strokeStyle = "rgba(0,212,255,.35)"; c.lineWidth = 2; c.stroke();
    for (var r = 0; r < N; r++) for (var cc = 0; cc < N; cc++) {
      c.fillStyle = (r + cc) % 2 ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)"; c.fillRect(BX + cc * CS, BY + r * CS, CS, CS);
      var j = S.jel[r][cc]; if (j) { c.fillStyle = j > 1 ? "rgba(80,190,255,.55)" : "rgba(150,230,255,.32)"; rr(c, BX + cc * CS + 2, BY + r * CS + 2, CS - 4, CS - 4, 8); c.fill(); c.strokeStyle = "rgba(220,250,255,.7)"; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.moveTo(BX + cc * CS + 8, BY + r * CS + 14); c.lineTo(BX + cc * CS + 18, BY + r * CS + 6); c.stroke(); }
    }
    c.save(); c.beginPath(); c.rect(BX - 8, BY - 8, N * CS + 16, N * CS + 16); c.clip();
    for (r = 0; r < N; r++) for (cc = 0; cc < N; cc++) {
      var b = S.g[r][cc]; if (!b) continue; var x = cx(cc), y = cy(r) + b.oy, sc = 1;
      if (S.ph === "swap" && S.sw) { var e = S.sw.t < 1 ? S.sw.t : 1; e = e * e * (3 - 2 * e); if (S.sw.back) e = 1 - e; var A = S.sw.a, Bq = S.sw.b;
        if (r === A[0] && cc === A[1]) { x += (Bq[1] - A[1]) * CS * e; y += (Bq[0] - A[0]) * CS * e; } else if (r === Bq[0] && cc === Bq[1]) { x += (A[1] - Bq[1]) * CS * e; y += (A[0] - Bq[0]) * CS * e; } }
      if (b.dying) sc = Math.max(0, 1 - b.dying / .22); if (b.pop > 0) sc *= 1 + b.pop * .8;
      drawBall(c, b, x, y, sc);
    }
    c.restore();
    if (S.sel) { c.strokeStyle = "#fff"; c.lineWidth = 3; rr(c, BX + S.sel[1] * CS + 2, BY + S.sel[0] * CS + 2, CS - 4, CS - 4, 10); c.stroke(); }
    if (S.kb) { c.strokeStyle = S.grab ? "#ffd23f" : "#00d4ff"; c.lineWidth = 3; c.setLineDash([6, 4]); rr(c, BX + S.cur[1] * CS + 1, BY + S.cur[0] * CS + 1, CS - 2, CS - 2, 10); c.stroke(); c.setLineDash([]); }
    S.fx.forEach(function (f) {
      if (f.type === "beam") { c.globalAlpha = f.t / .35; c.fillStyle = f.col; if (f.d === "h") c.fillRect(BX, cy(f.r) - 8 * f.t / .35, N * CS, 16 * f.t / .35); else c.fillRect(cx(f.c) - 8 * f.t / .35, BY, 16 * f.t / .35, N * CS); c.fillStyle = "#fff"; if (f.d === "h") c.fillRect(BX, cy(f.r) - 2, N * CS, 4); else c.fillRect(cx(f.c) - 2, BY, 4, N * CS); }
      if (f.type === "ring") { c.globalAlpha = f.t / .45; c.strokeStyle = "#ffd23f"; c.lineWidth = 8; c.beginPath(); c.arc(f.x, f.y, f.R * (1 - f.t / .45) + 10, 0, 7); c.stroke(); }
      if (f.type === "zap") { c.globalAlpha = f.t / .4; c.strokeStyle = f.col; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); }
      if (f.type === "flash") { c.globalAlpha = f.t; c.fillStyle = "#fff"; c.fillRect(BX, BY, N * CS, N * CS); }
      c.globalAlpha = 1;
    });
    S.parts.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 2); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, 3.5, 0, 7); c.fill(); }); c.globalAlpha = 1;
    S.pops.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 1.5); c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,.6)"; c.font = "bold " + q.size + "px system-ui,sans-serif"; c.textAlign = "center"; c.strokeText(q.s, q.x, q.y); T(c, q.s, q.x, q.y, q.size, q.col); }); c.globalAlpha = 1;
    if (S.tool === "hammer") T(c, "Tap a ball to smash it", W / 2, BY + N * CS + 22, 15, "#ffd23f");
    if (S.scr === "play") drawUI(c, S.ui);
    if (S.scr === "result") {
      c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(0, 0, W, H); panel(c, 50, 200, W - 100, S.ui.btns.length * 64 + 250, S.res.win ? "#39ff88" : "#ff5a5f");
      if (S.res.win) { T(c, "Level " + S.L.n + " complete!", W / 2, 248, 30, "#39ff88"); stars3(c, W / 2, 312, S.res.stars, 26); T(c, "Score " + S.score + (S.res.gift ? "   " + S.res.gift : ""), W / 2, 376, 18, "#fff"); }
      else { T(c, "Out of moves!", W / 2, 252, 32, "#ff5a5f"); T(c, goalText(), W / 2, 310, 18, "#fff", "center", "600"); T(c, "Tip: Rockets and Bombs clear crates fast.", W / 2, 350, 15, "#cfe8ff", "center", "600"); }
      drawUI(c, S.ui);
    }
  }
  window.GV6 = { S: function () { return S; }, start: function (n) { start(n); }, findRuns: function () { return findRuns(); }, hasMove: hasMove }; // debug hook used by automated tests
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Swipe (or tap two neighbours) to swap balls and match 3+. Match 4 for a Rocket, L/T for a Bomb, 5 for a Rainbow. Keys: arrows + Space.", touch: {} });
})();
