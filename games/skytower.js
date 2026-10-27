/* Sky Tower Stack — tap to drop moving blocks and build the tallest tower.
   Original game for Gaming World of Jarvis. Endless mode, 30 challenges, 6 tower themes, combo bonuses. */
(function () {
  "use strict";
  var W = 480, H = 720, BH = 30, GROUND = H - 70, BASEW = 230, S, API;
  var KEY = "gv_skytower", AGAIN = null;
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
  var THEMES = [
    { n: "Sky City", lo: "#bfe9ff", hi: "#4ab3ff", hue: 195, step: 9, sat: 80, lit: 58, deco: "cloud", need: 0 },
    { n: "Sunset", lo: "#ffd59e", hi: "#ff6f61", hue: 10, step: 7, sat: 85, lit: 60, deco: "cloud", need: 15 },
    { n: "Neon Night", lo: "#2b0a4f", hi: "#07021a", hue: 290, step: 13, sat: 100, lit: 60, deco: "star", need: 30, glow: true },
    { n: "Candy", lo: "#fff0f7", hi: "#ffb8dc", hue: 320, step: 23, sat: 75, lit: 74, deco: "sprinkle", need: 45 },
    { n: "Frozen Peak", lo: "#e8fbff", hi: "#7fd3ff", hue: 185, step: 5, sat: 60, lit: 72, deco: "snow", need: 60 },
    { n: "Deep Space", lo: "#10002b", hi: "#000000", hue: 250, step: 11, sat: 70, lit: 62, deco: "star", need: 80, glow: true }
  ];
  /* 30 challenges, generated from five types that get harder */
  var CH = [];
  (function () {
    var types = ["height", "perfect", "narrow", "speed", "combo"];
    for (var i = 0; i < 30; i++) {
      var t = types[i % 5], k = Math.floor(i / 5), c = { type: t, speed: 1, width: BASEW, limit: 0 };
      if (t === "height") { c.goal = 10 + k * 6; c.text = "Reach a height of " + c.goal; }
      if (t === "perfect") { c.goal = 3 + k * 2; c.limit = 12 + k * 4; c.text = "Land " + c.goal + " perfect drops within " + c.limit + " blocks"; }
      if (t === "narrow") { c.width = 130 - k * 14; c.goal = 8 + k * 3; c.text = "Narrow base: reach " + c.goal; }
      if (t === "speed") { c.speed = 1.45 + k * .12; c.goal = 8 + k * 3; c.text = "Turbo speed: reach " + c.goal; }
      if (t === "combo") { c.goal = 3 + k; c.text = "Get a perfect combo of " + c.goal; }
      c.name = ["Climb", "Precision", "Tightrope", "Turbo", "Streak"][i % 5] + " " + (k + 1);
      CH.push(c);
    }
  })();
  var save = LS(KEY, { best: 0, theme: 0, ch: {} });
  function unlocked(i) { var done = Object.keys(save.ch).length; return save.best >= THEMES[i].need || done >= i * 5; }

  function init(api) {
    API = api;
    S = { scr: "menu", ui: UI(1), t: 0, blocks: [], debris: [], parts: [], pops: [], cam: 0, camT: 0, clouds: [], flakes: [] };
    for (var i = 0; i < 7; i++) S.clouds.push({ x: Math.random() * W, y: Math.random() * H * 3, s: .6 + Math.random() * .8 });
    for (i = 0; i < 70; i++) S.flakes.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + .5, v: 10 + Math.random() * 30 });
    if (AGAIN !== null) { var a = AGAIN; AGAIN = null; startRun(a); } else menu();
  }
  function theme() { return THEMES[unlocked(save.theme) ? save.theme : 0]; }
  function menu() {
    S.scr = "menu"; var ui = S.ui = UI(1);
    button(ui, 90, 330, 300, 64, "▶  Endless", function () { startRun(-1); }, { size: 24 });
    button(ui, 90, 410, 300, 56, "🏆  Challenges", challenges, { col: "#ffd23f", col2: "#ff9f1c" });
    button(ui, 90, 482, 300, 56, "🎨  " + theme().n, function () { var n = save.theme; do { n = (n + 1) % THEMES.length; } while (!unlocked(n)); save.theme = n; SV(KEY, save); menu(); S.ui.focus = 2; }, { col: "#ff2bd6", col2: "#a0179a", tc: "#fff" });
    seedPreview();
  }
  function seedPreview() { S.blocks = []; var w = BASEW; for (var i = 0; i < 6; i++) { w -= i * 4; S.blocks.push({ x: (W - w) / 2 + Math.sin(i * 1.7) * 14, w: w, i: i }); } S.cam = S.camT = 0; S.mov = null; }
  function challenges() {
    S.scr = "chal"; var ui = S.ui = UI(5), bw = 78, bh = 66, gx = (W - (5 * bw + 4 * 10)) / 2;
    CH.forEach(function (c, i) {
      var open = i === 0 || save.ch[i - 1];
      button(ui, gx + (i % 5) * (bw + 10), 120 + Math.floor(i / 5) * (bh + 12), bw, bh, String(i + 1), function () { startRun(i); }, {
        disabled: !open, col: save.ch[i] ? "#39ff88" : "#00d4ff", col2: save.ch[i] ? "#14a85a" : "#0077ff",
        draw: function (c2, b) { T(c2, open ? String(i + 1) : "🔒", b.x + b.w / 2, b.y + 24, 22, "#04121f"); if (save.ch[i]) stars3(c2, b.x + b.w / 2, b.y + 50, save.ch[i], 7); }
      });
    });
    button(ui, 140, 610, 200, 52, "◀  Back", menu, { ghost: true });
  }
  function startRun(ci) {
    var c = ci >= 0 ? CH[ci] : null;
    S.scr = "play"; S.ci = ci; S.ch = c; S.ui = UI(1); S.blocks = []; S.debris = []; S.parts = []; S.pops = [];
    var w = c ? c.width : BASEW; S.blocks.push({ x: (W - w) / 2, w: w, i: 0 });
    S.n = 0; S.score = 0; S.combo = 0; S.bestCombo = 0; S.perfects = 0; S.dead = 0; S.cam = S.camT = 0; S.dir = 1;
    button(S.ui, 10, H - 54, 44, 40, "≡", menu, { ghost: true, size: 22, r: 10 });
    API.setScore(0); spawn(); API.sfx("move");
  }
  function speed() { return Math.min(430, 165 + S.n * 5.5) * (S.ch ? S.ch.speed : 1); }
  function spawn() {
    var top = S.blocks[S.blocks.length - 1]; S.dir = -S.dir;
    S.mov = { x: S.dir > 0 ? -top.w * .3 : W - top.w * .7, w: top.w, i: S.blocks.length, v: speed() * S.dir };
  }
  function topY(i) { return GROUND - (i + 1) * BH; }
  function drop() {
    var m = S.mov, top = S.blocks[S.blocks.length - 1]; if (!m) return;
    var d = m.x - top.x, tol = S.ch && S.ch.type === "perfect" ? 6 : 7;
    if (Math.abs(d) <= tol) {
      m.x = top.x; S.combo++; S.perfects++; S.bestCombo = Math.max(S.bestCombo, S.combo);
      var grow = S.combo >= 3 ? Math.min(12, BASEW - m.w) : 0; if (grow > 0) { m.w += grow; m.x -= grow / 2; }
      var pts = 2 + Math.min(S.combo, 8); S.score += pts;
      S.pops.push({ x: W / 2, y: topY(m.i) - 30, s: S.combo >= 2 ? "PERFECT ×" + S.combo + "  +" + pts : "PERFECT +" + pts, t: 1, col: "#ffd23f" });
      for (var k = 0; k < 22; k++) S.parts.push({ x: m.x + Math.random() * m.w, y: topY(m.i) + BH, vx: (Math.random() - .5) * 240, vy: -Math.random() * 200, t: .9, col: "#fff6a8" });
      S.ring = { x: m.x, w: m.w, i: m.i, t: .45 };
      API.sfx("coin");
    } else {
      var nx = Math.max(m.x, top.x), nr = Math.min(m.x + m.w, top.x + top.w), nw = nr - nx;
      S.combo = 0;
      if (nw <= 1) { S.debris.push({ x: m.x, w: m.w, y: topY(m.i), i: m.i, vy: 0, vx: d > 0 ? 60 : -60, r: 0, vr: d > 0 ? 1.5 : -1.5 }); S.mov = null; API.sfx("boom"); fail(); return; }
      var cutX = d > 0 ? nr : m.x, cutW = m.w - nw;
      S.debris.push({ x: cutX, w: cutW, y: topY(m.i), i: m.i, vy: 0, vx: d > 0 ? 50 : -50, r: 0, vr: d > 0 ? 1.8 : -1.8 });
      m.x = nx; m.w = nw; S.score += 1; API.sfx("flip");
    }
    S.blocks.push({ x: m.x, w: m.w, i: m.i }); S.n++; S.mov = null; API.setScore(S.score);
    var c = S.ch;
    if (c) {
      var done = (c.type === "perfect" ? S.perfects >= c.goal : c.type === "combo" ? S.bestCombo >= c.goal : S.n >= c.goal);
      if (done) return finish(true);
      if (c.limit && S.n >= c.limit) return finish(false, "Out of blocks");
    }
    spawn();
  }
  function fail() { S.dead = 1.1; S.failMsg = "The block missed the tower"; }
  function finish(win, why) {
    S.mov = null; var ci = S.ci, ratio = S.perfects / Math.max(1, S.n), st = ratio >= .5 ? 3 : ratio >= .25 ? 2 : 1;
    if (win) { save.ch[ci] = Math.max(save.ch[ci] || 0, st); SV(KEY, save); API.sfx("win"); } else API.sfx("over");
    S.scr = "result"; S.res = { win: win, stars: win ? st : 0, why: why || "" };
    var ui = S.ui = UI(1);
    if (win && ci < CH.length - 1) button(ui, 120, 420, 240, 56, "Next challenge ▶", function () { startRun(ci + 1); });
    button(ui, 120, win && ci < CH.length - 1 ? 488 : 420, 240, 52, "↻ Retry", function () { startRun(ci); }, { col: "#ffd23f", col2: "#ff9f1c" });
    button(ui, 120, win && ci < CH.length - 1 ? 552 : 484, 240, 48, "Challenges", challenges, { ghost: true });
  }
  function update(dt, api) {
    S.t += dt;
    S.flakes.forEach(function (f) { f.y += f.v * dt; f.x += Math.sin(S.t + f.y * .02) * 8 * dt; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } });
    S.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.t -= dt; }); S.parts = S.parts.filter(function (p) { return p.t > 0; });
    S.pops.forEach(function (p) { p.y -= 30 * dt; p.t -= dt * .8; }); S.pops = S.pops.filter(function (p) { return p.t > 0; });
    S.debris.forEach(function (d) { d.vy += 900 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.r += d.vr * dt; }); S.debris = S.debris.filter(function (d) { return d.y + S.cam < H + 200; });
    if (S.ring) { S.ring.t -= dt; if (S.ring.t <= 0) S.ring = null; }
    S.camT = Math.max(0, H * .5 - (GROUND - S.blocks.length * BH)); S.cam += (S.camT - S.cam) * Math.min(1, dt * 5);
    if (S.scr === "menu") { S.cam = 0; if (uiInput(S.ui, api)) return; return; }
    if (S.scr === "chal" || S.scr === "result") { uiInput(S.ui, api); return; }
    if (S.scr === "play") {
      if (S.dead > 0) {
        S.dead -= dt;
        if (S.dead <= 0) { if (S.ch) finish(false, S.failMsg); else { var h = S.n; if (h > save.best) { save.best = h; SV(KEY, save); } AGAIN = -1; api.over({ title: "Tower down! Height " + h, detail: "Best combo ×" + S.bestCombo + " · Best height " + save.best }); } }
        return;
      }
      if (api.pointer.tapped && inB(api.pointer, S.ui.btns[0])) { menu(); return; }
      var m = S.mov;
      if (m) { m.x += m.v * dt; var lo = -m.w * .35, hi = W - m.w * .65; if (m.x < lo) { m.x = lo; m.v = Math.abs(m.v); } if (m.x > hi) { m.x = hi; m.v = -Math.abs(m.v); } }
      if (api.pointer.tapped || api.hit("fire") || api.hit("enter") || api.hit("up") || api.hit("down")) drop();
    }
  }
  function blockColor(i, a) { var th = theme(); return "hsla(" + ((th.hue + i * th.step) % 360) + "," + th.sat + "%," + th.lit + "%," + (a == null ? 1 : a) + ")"; }
  function drawBlock(c, x, y, w, i, alpha) {
    var th = theme(), hue = (th.hue + i * th.step) % 360, D = 10;
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
    if (th.glow) { c.shadowColor = "hsl(" + hue + ",100%,60%)"; c.shadowBlur = 14; }
    var g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "hsl(" + hue + "," + th.sat + "%," + (th.lit - 8) + "%)"); g.addColorStop(1, "hsl(" + hue + "," + th.sat + "%," + (th.lit + 6) + "%)");
    c.fillStyle = g; c.fillRect(x, y, w, BH); c.shadowBlur = 0;
    c.fillStyle = "hsl(" + hue + "," + th.sat + "%," + Math.min(92, th.lit + 18) + "%)"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + D, y - D * .6); c.lineTo(x + w + D, y - D * .6); c.lineTo(x + w, y); c.fill();
    c.fillStyle = "hsl(" + hue + "," + th.sat + "%," + (th.lit - 20) + "%)"; c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + D, y - D * .6); c.lineTo(x + w + D, y + BH - D * .6); c.lineTo(x + w, y + BH); c.fill();
    if (th.deco === "cloud" && w > 24) { c.fillStyle = "rgba(255,255,255,.35)"; for (var wx = x + 8; wx < x + w - 10; wx += 18) c.fillRect(wx, y + 9, 8, 12); }
    if (th.deco === "sprinkle") { c.fillStyle = "rgba(255,255,255,.7)"; for (var k = 0; k < w / 22; k++) c.fillRect(x + 6 + k * 22 + (i * 7 % 9), y + 8 + (k * 5 + i) % 14, 6, 3); }
    c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(x, y + BH - 4, w, 4);
    c.restore();
  }
  function lerpC(a, b, t) { var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); var r = (pa >> 16) + ((pb >> 16) - (pa >> 16)) * t, g = (pa >> 8 & 255) + ((pb >> 8 & 255) - (pa >> 8 & 255)) * t, bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t; return "rgb(" + (r | 0) + "," + (g | 0) + "," + (bl | 0) + ")"; }
  function draw(c) {
    var th = theme(), alt = Math.min(1, S.cam / 2400);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, lerpC(th.hi, "#05010f", alt)); g.addColorStop(1, lerpC(th.lo, "#1a0b3a", alt * .8)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // stars appear as you climb (or always in night themes)
    var sa = th.deco === "star" ? 1 : alt; if (sa > 0) { c.fillStyle = "#fff"; for (var i = 0; i < 60; i++) { var sx = (i * 97) % W, sy = ((i * 173) % H + S.cam * .1) % H; c.globalAlpha = sa * (.3 + .7 * Math.abs(Math.sin(S.t * 1.3 + i))); c.fillRect(sx, sy, 2, 2); } c.globalAlpha = 1; }
    if (th.n === "Deep Space") { c.fillStyle = "#7b2ff7"; c.beginPath(); c.arc(380, 150 + S.cam * .05, 46, 0, 7); c.fill(); c.strokeStyle = "rgba(255,180,255,.6)"; c.lineWidth = 4; c.beginPath(); c.ellipse(380, 150 + S.cam * .05, 74, 12, -.3, 0, 7); c.stroke(); }
    if (th.n === "Sunset") { c.fillStyle = "rgba(255,240,180,.85)"; c.beginPath(); c.arc(W / 2, GROUND - 40 + S.cam * .3, 70, 0, 7); c.fill(); }
    if (th.deco === "cloud" || th.deco === "sprinkle") S.clouds.forEach(function (cl) { var y = (cl.y + S.cam * .35) % (H + 200) - 100, x = (cl.x + S.t * 12 * cl.s) % (W + 160) - 80; c.fillStyle = th.deco === "sprinkle" ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(x, y, 46 * cl.s, 16 * cl.s, 0, 0, 7); c.ellipse(x + 26 * cl.s, y - 8 * cl.s, 30 * cl.s, 18 * cl.s, 0, 0, 7); c.fill(); });
    if (th.deco === "snow") { c.fillStyle = "rgba(255,255,255,.85)"; S.flakes.forEach(function (f) { c.beginPath(); c.arc(f.x, f.y, f.r, 0, 7); c.fill(); }); }
    c.save(); c.translate(0, S.cam);
    // ground / city base
    c.fillStyle = th.glow ? "#120626" : "#2e4a3a"; c.fillRect(-20, GROUND, W + 40, 400);
    c.fillStyle = th.glow ? "rgba(255,43,214,.5)" : "rgba(255,255,255,.18)"; c.fillRect(-20, GROUND, W + 40, 3);
    for (i = 0; i < 9; i++) { var bx = i * 56 - 10, bh = 40 + (i * 37) % 60; c.fillStyle = th.glow ? "rgba(80,30,140,.6)" : "rgba(20,40,60,.25)"; c.fillRect(bx, GROUND - bh, 44, bh); }
    S.blocks.forEach(function (b) { drawBlock(c, b.x, topY(b.i), b.w, b.i); });
    if (S.ring) { c.strokeStyle = "rgba(255,255,255," + (S.ring.t * 2) + ")"; c.lineWidth = 3; var e = (0.45 - S.ring.t) * 40; c.strokeRect(S.ring.x - e, topY(S.ring.i) - e * .5, S.ring.w + e * 2, BH + e); }
    if (S.mov) { var m = S.mov; drawBlock(c, m.x, topY(m.i), m.w, m.i); var top = S.blocks[S.blocks.length - 1]; c.strokeStyle = "rgba(255,255,255,.25)"; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(top.x, topY(m.i) + BH); c.lineTo(top.x, topY(m.i) - 30); c.moveTo(top.x + top.w, topY(m.i) + BH); c.lineTo(top.x + top.w, topY(m.i) - 30); c.stroke(); c.setLineDash([]); }
    S.debris.forEach(function (d) { c.save(); c.translate(d.x + d.w / 2, d.y + BH / 2); c.rotate(d.r); drawBlock(c, -d.w / 2, -BH / 2, d.w, d.i, .9); c.restore(); });
    S.parts.forEach(function (p) { c.globalAlpha = Math.max(0, p.t); c.fillStyle = p.col; c.fillRect(p.x - 2, p.y - 2, 4, 4); }); c.globalAlpha = 1;
    S.pops.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 1.5); T(c, p.s, p.x, p.y, 22, p.col); c.strokeStyle = "rgba(0,0,0,.3)"; }); c.globalAlpha = 1;
    c.restore();
    if (S.scr === "menu") {
      c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, 0, W, H);
      T(c, "SKY TOWER", W / 2, 120, 54, "#fff"); T(c, "STACK", W / 2, 176, 46, "#ffd23f");
      T(c, "Tap to drop · Perfect drops build combos", W / 2, 222, 16, "rgba(255,255,255,.9)", "center", "600");
      T(c, "Best height: " + save.best + "   ·   Challenges: " + Object.keys(save.ch).length + "/30", W / 2, 268, 17, "#e8f6ff");
      var nextT = THEMES.filter(function (t, i) { return !unlocked(i); })[0];
      T(c, nextT ? "Next theme “" + nextT.n + "” at height " + nextT.need : "All themes unlocked!", W / 2, 572, 14, "rgba(255,255,255,.85)", "center", "600");
      drawUI(c, S.ui); return;
    }
    if (S.scr === "chal") { c.fillStyle = "rgba(2,6,20,.72)"; c.fillRect(0, 0, W, H); T(c, "Challenges", W / 2, 60, 34, "#ffd23f"); T(c, "Complete one to unlock the next", W / 2, 94, 15, "#cfe8ff", "center", "600"); drawUI(c, S.ui); return; }
    // HUD
    T(c, String(S.n), W / 2, 82, 52, "#fff"); c.globalAlpha = .9; T(c, "score " + S.score, W / 2, 118, 16, "#fff", "center", "600"); c.globalAlpha = 1;
    if (S.combo >= 2) T(c, "COMBO ×" + S.combo, W / 2, 146, 18, "#ffd23f");
    if (S.ch) { var c0 = S.ch, prog = c0.type === "perfect" ? S.perfects : c0.type === "combo" ? S.bestCombo : S.n; c.fillStyle = "rgba(0,0,0,.35)"; rr(c, 64, H - 48, W - 128, 34, 17); c.fill(); T(c, c0.name + ": " + Math.min(prog, c0.goal) + "/" + c0.goal + (c0.limit ? "  (" + (c0.limit - S.n) + " blocks left)" : ""), W / 2, H - 29, 15, "#fff"); }
    else if (S.n < 2) T(c, "Tap / Space to drop", W / 2, H - 30, 18, "#fff");
    if (S.scr === "result") {
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, W, H); panel(c, 50, 200, W - 100, S.ui.btns.length * 66 + 210);
      T(c, S.res.win ? "Challenge complete!" : "Challenge failed", W / 2, 248, 28, S.res.win ? "#39ff88" : "#ff5a5f");
      if (S.res.win) stars3(c, W / 2, 312, S.res.stars, 24); else T(c, S.res.why, W / 2, 300, 16, "#cfe8ff", "center", "600");
      T(c, "Height " + S.n + " · Perfects " + S.perfects, W / 2, 365, 16, "#fff", "center", "600");
    }
    drawUI(c, S.ui);
  }
  window.GV6 = { S: function () { return S; } }; // debug hook used by automated tests
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Tap, click or press Space to drop each block. Line it up perfectly for combos — misaligned edges get sliced off!", touch: {} });
})();
