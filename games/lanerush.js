/* Turbo Lane Rush — 3-lane endless runner. Swipe or use arrow keys to switch lanes, jump and slide.
   Original game for Gaming World of Jarvis. 8 unlockable runners, 30 missions, power-ups, daily challenge. */
(function () {
  "use strict";
  var W = 480, H = 720, PY = 590, LANEW = 128, M = 40, S, API; // M = pixels per metre
  var KEY = "gv_lanerush", AGAIN = null;
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
  function lx(l) { return W / 2 + (l - 1) * LANEW; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function dayNum() { var d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); }

  /* ---------- runners ---------- */
  var CHARS = [
    { n: "Dash", cost: 0, c1: "#00d4ff", c2: "#0062ff", perk: "All-rounder", id: "none" },
    { n: "Nova", cost: 300, c1: "#ff2bd6", c2: "#8a0f9e", perk: "Magnet lasts 50% longer", id: "magnet" },
    { n: "Bolt", cost: 600, c1: "#ffd23f", c2: "#ff8a00", perk: "+1 coin on every 10th coin", id: "coin" },
    { n: "Blaze", cost: 1000, c1: "#ff5a3c", c2: "#a3150b", perk: "Starts every run with a Shield", id: "shield" },
    { n: "Pixel", cost: 1500, c1: "#39ff88", c2: "#0f9c4c", perk: "Power-ups appear more often", id: "luck" },
    { n: "Frost", cost: 2200, c1: "#b8f3ff", c2: "#3aa0d8", perk: "Speed rises 15% slower", id: "calm" },
    { n: "Rex", cost: 3000, c1: "#a77bff", c2: "#4b1fb0", perk: "2× Score lasts twice as long", id: "double" },
    { n: "Comet", cost: 5000, c1: "#ffffff", c2: "#ff9ff3", perk: "Survives one crash per run", id: "revive" }
  ];
  /* ---------- 30 missions (3 active at a time, in order) ---------- */
  var MT = {
    coins: "Collect {g} coins in one run", dist: "Run {g} m in one run", jumps: "Jump {g} times in one run", slides: "Slide {g} times in one run",
    power: "Grab {g} power-ups in one run", tcoins: "Collect {g} coins in total", runs: "Play {g} runs", nocoin: "Run {g} m without a coin",
    lanes: "Switch lanes {g} times in one run", score: "Score {g} points in one run"
  };
  var MISSIONS = [
    ["coins", 30], ["dist", 300], ["jumps", 5], ["slides", 5], ["power", 1], ["runs", 3], ["lanes", 25], ["score", 1000], ["tcoins", 250], ["dist", 600],
    ["coins", 80], ["nocoin", 250], ["jumps", 12], ["power", 3], ["score", 2500], ["slides", 12], ["runs", 10], ["dist", 1000], ["lanes", 70], ["tcoins", 1000],
    ["coins", 150], ["score", 5000], ["nocoin", 500], ["power", 5], ["jumps", 25], ["dist", 1600], ["slides", 25], ["runs", 25], ["coins", 250], ["dist", 2500]
  ].map(function (m, i) { return { t: m[0], g: m[1], r: 50 + i * 15, text: MT[m[0]].replace("{g}", m[1]) }; });

  var save = LS(KEY, { coins: 0, best: 0, own: [0], ch: 0, mdone: 0, tcoins: 0, runs: 0, daily: { day: "", best: 0, claimed: false } });
  if (!save.daily) save.daily = { day: "", best: 0, claimed: false };
  if (save.daily.day !== today()) save.daily = { day: today(), best: 0, claimed: false };
  function persist() { SV(KEY, save); }
  function dailyGoal() { return 700 + (dayNum() % 7) * 150; }
  function active() { var a = []; for (var i = save.mdone; i < MISSIONS.length && a.length < 3; i++) a.push(i); return a; }
  /* mission progress: done missions are always a prefix (completed in order of the list, any of the 3 active can finish) */
  if (!save.mset) save.mset = {};
  function missionDone(i) { return !!save.mset[i] || i < save.mdone; }
  function activeList() { var a = []; for (var i = 0; i < MISSIONS.length && a.length < 3; i++) if (!missionDone(i)) a.push(i); return a; }
  function mprog(m) {
    var r = S.run || {};
    switch (m.t) {
      case "coins": return r.coins || 0; case "dist": return Math.floor(r.dist || 0); case "jumps": return r.jumps || 0; case "slides": return r.slides || 0;
      case "power": return r.power || 0; case "tcoins": return save.tcoins + (r.coins || 0); case "runs": return save.runs; case "nocoin": return Math.floor(r.nocoin || 0);
      case "lanes": return r.lanes || 0; case "score": return r.score || 0;
    } return 0;
  }

  function init(api) {
    API = api;
    S = { scr: "menu", ui: UI(1), t: 0, objs: [], parts: [], pops: [], toasts: [], scroll: 0, run: null };
    if (AGAIN !== null) { var a = AGAIN; AGAIN = null; startRun(a); } else menu();
  }
  function menu() {
    S.scr = "menu"; S.run = null; var ui = S.ui = UI(1);
    button(ui, 90, 300, 300, 64, "▶  Run", function () { startRun(false); }, { size: 24 });
    button(ui, 90, 378, 300, 56, "📅  Daily Challenge", function () { startRun(true); }, { col: "#ffd23f", col2: "#ff9f1c" });
    button(ui, 90, 448, 300, 56, "🏃  Runners", shop, { col: "#ff2bd6", col2: "#a0179a", tc: "#fff" });
    button(ui, 90, 518, 300, 56, "🎯  Missions", missions, { col: "#39ff88", col2: "#14a85a" });
  }
  function shop() {
    S.scr = "shop"; var ui = S.ui = UI(2);
    CHARS.forEach(function (ch, i) {
      var own = save.own.indexOf(i) >= 0;
      button(ui, 30 + (i % 2) * 215, 120 + Math.floor(i / 2) * 118, 205, 108, ch.n, function () {
        if (own) { save.ch = i; persist(); API.sfx("coin"); shop(); S.ui.focus = i; return; }
        if (save.coins >= ch.cost) { save.coins -= ch.cost; save.own.push(i); save.ch = i; persist(); API.sfx("win"); shop(); S.ui.focus = i; }
        else { API.sfx("hit"); toast("Need " + (ch.cost - save.coins) + " more coins"); }
      }, { ghost: true, col: save.ch === i ? "#39ff88" : own ? "#00d4ff" : "#777", r: 16, draw: function (c, b) {
        drawRunner(c, b.x + 40, b.y + 62, ch, 0, .8, S.t);
        T(c, ch.n, b.x + 125, b.y + 24, 20, "#fff");
        T(c, own ? (save.ch === i ? "✔ Selected" : "Tap to use") : "🪙 " + ch.cost, b.x + 125, b.y + 50, 15, own ? "#39ff88" : save.coins >= ch.cost ? "#ffd23f" : "#ff7a7a");
        wrapT(c, ch.perk, b.x + 125, b.y + 76, 112, 12, "#b8c7e0");
      } });
    });
    button(ui, 140, 600, 200, 52, "◀  Back", menu, { ghost: true });
  }
  function wrapT(c, s, x, y, w, size, col) {
    c.font = "600 " + size + "px system-ui,sans-serif"; var words = s.split(" "), line = "", lines = [];
    words.forEach(function (wd) { var t = line ? line + " " + wd : wd; if (c.measureText(t).width > w && line) { lines.push(line); line = wd; } else line = t; }); lines.push(line);
    lines.forEach(function (l, i) { T(c, l, x, y + i * (size + 3), size, col, "center", "600"); });
  }
  function missions() { S.scr = "miss"; var ui = S.ui = UI(1); button(ui, 140, 610, 200, 52, "◀  Back", menu, { ghost: true }); }
  function toast(s, col) { S.toasts.push({ s: s, t: 2.4, col: col || "#ffd23f" }); }

  /* ---------- run ---------- */
  function startRun(daily) {
    var ch = CHARS[save.ch] || CHARS[0];
    S.scr = "play"; S.ui = UI(1); S.objs = []; S.parts = []; S.pops = []; S.toasts = [];
    S.daily = !!daily; S.rand = daily ? rng(dayNum() * 2654435761) : Math.random;
    S.ch = ch; S.lane = 1; S.px = lx(1); S.jump = 0; S.slide = 0; S.speed = 360; S.pos = 0; S.dist = 0; S.next = 300; S.dead = false; S.deadT = 0;
    S.pw = { magnet: 0, x2: 0, shield: ch.id === "shield" ? 1 : 0 }; S.revive = ch.id === "revive" ? 1 : 0; S.inv = 0; S.lastPow = 0;
    S.run = { coins: 0, dist: 0, jumps: 0, slides: 0, power: 0, nocoin: 0, lanes: 0, score: 0, ncount: 0 };
    S.sw = null; S.startAct = activeList();
    button(S.ui, 10, H - 54, 44, 40, "≡", function () { endRun(true); }, { ghost: true, size: 22, r: 10 });
    API.setScore(0); API.sfx("move");
  }
  function R() { return S.rand(); }
  function spawnRow() {
    var d = S.pos + 900, gapK = Math.max(.62, 1 - S.dist / 2500);
    var r = R(), lanes = [0, 1, 2];
    // choose 1 or 2 blockers; always keep at least one lane open (free, jumpable or slideable)
    var kinds = [];
    for (var l = 0; l < 3; l++) kinds.push(null);
    var nb = r < .45 ? 1 : 2;
    lanes.sort(function () { return R() - .5; });
    for (var i = 0; i < nb; i++) { var k = R(); kinds[lanes[i]] = k < .5 ? "car" : k < .75 ? "low" : "high"; }
    if (nb === 2 && R() < .35) kinds[lanes[2]] = R() < .5 ? "low" : "high"; // 3 lanes busy, but one is passable
    var cars = 0; kinds.forEach(function (k) { if (k === "car") cars++; }); if (cars === 3) kinds[lanes[2]] = "low";
    kinds.forEach(function (k, l) { if (k) S.objs.push({ k: k, l: l, d: d, len: k === "car" ? 120 + (R() < .3 ? 120 : 0) : 26, col: R() }); });
    // coins: a line in an open lane or an arc over a low barrier
    var free = []; kinds.forEach(function (k, l) { if (!k) free.push(l); });
    if (R() < .8) {
      var cl = free.length ? free[Math.floor(R() * free.length)] : lanes[2], n = 5 + Math.floor(R() * 4);
      for (i = 0; i < n; i++) S.objs.push({ k: "coin", l: cl, d: d - 60 - i * 46, air: kinds[cl] === "low" ? 1 : 0 });
    }
    var pc = S.ch.id === "luck" ? .14 : .08;
    if (S.pos - S.lastPow > 2600 && R() < pc * 2 && free.length) {
      S.lastPow = S.pos; var pk = ["magnet", "x2", "shield"][Math.floor(R() * 3)];
      S.objs.push({ k: "pow", p: pk, l: free[Math.floor(R() * free.length)], d: d + 140 });
    }
    S.next = S.pos + (300 + R() * 160) * gapK + S.speed * .35;
  }
  function act(dir) {
    if (S.dead) return;
    if (dir === "left" && S.lane > 0) { S.lane--; S.run.lanes++; API.sfx("move"); }
    else if (dir === "right" && S.lane < 2) { S.lane++; S.run.lanes++; API.sfx("move"); }
    else if (dir === "up" && S.jump <= 0) { S.jump = .62; S.slide = 0; S.run.jumps++; API.sfx("jump"); }
    else if (dir === "down" && S.slide <= 0) { S.slide = .62; S.jump = 0; S.run.slides++; API.sfx("flip"); }
  }
  function crash(o) {
    if (S.inv > 0) return;
    if (S.pw.shield > 0) { S.pw.shield = 0; S.inv = 1.2; burst(S.px, PY, "#00d4ff", 22); API.sfx("hit"); toast("Shield saved you!", "#00d4ff"); if (o) o.gone = 1; return; }
    if (S.revive > 0) { S.revive = 0; S.inv = 1.6; burst(S.px, PY, "#fff", 26); API.sfx("hit"); toast("Comet's second chance!", "#fff"); if (o) o.gone = 1; return; }
    S.dead = true; S.deadT = 1.1; burst(S.px, PY, "#ff5a3c", 40); API.sfx("boom");
  }
  function burst(x, y, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 60 + Math.random() * 260; S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: .5 + Math.random() * .5, col: col }); } }
  function scoreNow() { return Math.floor(S.dist + (S.run.bonus || 0)) + S.run.coins * 10; }
  function checkMissions() {
    activeList().forEach(function (i) {
      var m = MISSIONS[i]; if (m.t === "runs") return;
      if (mprog(m) >= m.g) { save.mset[i] = 1; save.coins += m.r; toast("Mission done! +" + m.r + " 🪙", "#39ff88"); API.sfx("win"); persist(); }
    });
  }
  function endRun(quit) {
    var r = S.run; r.score = scoreNow(); r.dist = S.dist;
    save.tcoins += r.coins; save.coins += r.coins; save.runs++;
    var bonus = "";
    activeList().forEach(function (i) { var m = MISSIONS[i]; if (mprog(m) >= m.g) { save.mset[i] = 1; save.coins += m.r; bonus += " · Mission +" + m.r; } });
    while (missionDone(save.mdone) && save.mdone < MISSIONS.length) save.mdone++;
    if (S.daily) {
      save.daily.best = Math.max(save.daily.best, Math.floor(S.dist));
      if (!save.daily.claimed && S.dist >= dailyGoal()) { save.daily.claimed = true; save.coins += 250; bonus += " · Daily +250"; }
    }
    if (r.score > save.best) save.best = r.score;
    persist();
    if (quit) { API.setScore(0); menu(); return; }
    AGAIN = S.daily; API.setScore(r.score);
    API.over({ title: S.daily ? "Daily run over" : "Crashed!", detail: Math.floor(S.dist) + " m · " + r.coins + " coins" + bonus + (S.daily ? " · Goal " + dailyGoal() + " m" : "") + " · Bank 🪙 " + save.coins, win: false });
  }

  function update(dt, api) {
    S.t += dt;
    S.toasts.forEach(function (t) { t.t -= dt; }); S.toasts = S.toasts.filter(function (t) { return t.t > 0; });
    S.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.t -= dt; }); S.parts = S.parts.filter(function (p) { return p.t > 0; });
    S.pops.forEach(function (p) { p.y -= 50 * dt; p.t -= dt; }); S.pops = S.pops.filter(function (p) { return p.t > 0; });
    if (S.scr !== "play") { S.scroll += 160 * dt; uiInput(S.ui, api); return; }
    var p = api.pointer;
    if (p.tapped && inB(p, S.ui.btns[0])) { S.ui.btns[0].fn(); return; }
    // swipe detection while finger is still down (snappier than waiting for release)
    if (p.tapped) S.sw = { x: p.x, y: p.y, armed: true };
    var dir = null;
    if (S.sw && S.sw.armed && p.down) { var dx = p.x - S.sw.x, dy = p.y - S.sw.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 26) { dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); S.sw.armed = false; } }
    if (!dir && p.swipe && (!S.sw || S.sw.armed)) dir = p.swipe;
    if (!p.down && S.sw) S.sw.armed = false;
    if (api.hit("left")) dir = "left"; if (api.hit("right")) dir = "right"; if (api.hit("up") || api.hit("fire")) dir = "up"; if (api.hit("down")) dir = "down";
    if (dir) act(dir);

    if (S.dead) {
      S.deadT -= dt; S.speed *= Math.pow(.05, dt);
      if (S.deadT <= 0) endRun(false);
      return;
    }
    var acc = S.ch.id === "calm" ? 5.1 : 6;
    S.speed = Math.min(980, S.speed + acc * dt);
    var mv = S.speed * dt; S.pos += mv; S.dist = S.pos / M;
    S.run.dist = S.dist; S.run.nocoin += mv / M; if (S.pw.x2 > 0) S.run.bonus = (S.run.bonus || 0) + mv / M;
    S.scroll += mv;
    S.px += (lx(S.lane) - S.px) * Math.min(1, dt * 18);
    if (S.jump > 0) S.jump -= dt; if (S.slide > 0) S.slide -= dt; if (S.inv > 0) S.inv -= dt;
    ["magnet", "x2"].forEach(function (k) { if (S.pw[k] > 0) S.pw[k] = Math.max(0, S.pw[k] - dt); });
    if (S.pos >= S.next) spawnRow();
    var curLane = Math.round((S.px - lx(0)) / LANEW);
    S.objs.forEach(function (o) { o.y = PY - (o.d - S.pos); });
    S.objs.forEach(function (o) {
      if (o.gone) return;
      var top = o.y - (o.len || 20), bot = o.y;
      if (o.k === "coin" || o.k === "pow") {
        var mag = S.pw.magnet > 0 && o.k === "coin" && o.y > PY - 330 && o.y < PY + 40;
        if (mag) { o.mx = (o.mx == null ? lx(o.l) : o.mx); o.mx += (S.px - o.mx) * Math.min(1, dt * 10); o.d -= (PY - o.y) * Math.min(1, dt * 8); }
        var ox = o.mx != null ? o.mx : lx(o.l);
        if (Math.abs(o.y - PY) < 34 && Math.abs(ox - S.px) < 50 && (!o.air || S.jump > 0 || mag)) {
          o.gone = 1;
          if (o.k === "coin") {
            var v = 1; S.run.ncount++; if (S.ch.id === "coin" && S.run.ncount % 10 === 0) v = 2;
            S.run.coins += v; S.run.nocoin = 0; S.run.bonus = (S.run.bonus || 0) + (S.pw.x2 > 0 ? 10 * v : 0); API.sfx("coin");
            S.pops.push({ x: ox, y: PY - 40, s: "+" + v, t: .5, col: "#ffd23f" });
          } else {
            S.run.power++; API.sfx("win");
            if (o.p === "magnet") S.pw.magnet = 9 * (S.ch.id === "magnet" ? 1.5 : 1);
            if (o.p === "x2") S.pw.x2 = 10 * (S.ch.id === "double" ? 2 : 1);
            if (o.p === "shield") S.pw.shield = 1;
            toast({ magnet: "🧲 Magnet!", x2: "✖2 Score!", shield: "🛡 Shield!" }[o.p], "#00d4ff");
          }
        }
        return;
      }
      if (o.l !== curLane) return;
      if (PY + 22 > top && PY - 22 < bot) {
        if (o.k === "low" && S.jump > 0) return;
        if (o.k === "high" && S.slide > 0) return;
        crash(o);
      }
    });
    S.objs = S.objs.filter(function (o) { return !o.gone && o.y < H + 300; });
    S.run.score = scoreNow(); api.setScore(S.run.score);
    if (Math.floor(S.t * 4) !== Math.floor((S.t - dt) * 4)) checkMissions();
  }

  /* ---------- drawing ---------- */
  function drawRunner(c, x, y, ch, pose, sc, t) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    var run = Math.sin(t * 16), sl = pose === 2;
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(0, 30, 26, 9, 0, 0, 6.29); c.fill();
    if (pose === 1) c.translate(0, -8);
    if (sl) { c.rotate(-1.2); c.translate(10, 10); }
    c.strokeStyle = ch.c2; c.lineWidth = 9; c.lineCap = "round";
    c.beginPath(); c.moveTo(-7, 8); c.lineTo(-9 + run * 7, 28); c.moveTo(7, 8); c.lineTo(9 - run * 7, 28); c.stroke();
    var g = c.createLinearGradient(0, -24, 0, 12); g.addColorStop(0, ch.c1); g.addColorStop(1, ch.c2);
    c.fillStyle = g; rr(c, -15, -18, 30, 30, 10); c.fill();
    c.strokeStyle = ch.c1; c.lineWidth = 7; c.beginPath(); c.moveTo(-15, -8); c.lineTo(-22, 4 - run * 6); c.moveTo(15, -8); c.lineTo(22, 4 + run * 6); c.stroke();
    c.fillStyle = "#ffe0bd"; c.beginPath(); c.arc(0, -28, 12, 0, 6.29); c.fill();
    c.fillStyle = ch.c1; c.beginPath(); c.arc(0, -31, 12.5, Math.PI, 0); c.fill(); c.fillRect(-12.5, -32, 25, 4);
    c.fillStyle = "#05070d"; c.fillRect(-7, -28, 4, 4); c.fillRect(3, -28, 4, 4);
    c.restore();
  }
  function drawRoad(c) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b0f2a"); g.addColorStop(1, "#1a0b2e"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // city side strips
    for (var side = 0; side < 2; side++) {
      var sx = side ? W - 40 : 0; c.fillStyle = "#121736"; c.fillRect(sx, 0, 40, H);
      for (var i = -1; i < 9; i++) { var y = ((i * 110 + S.scroll * .9) % 990 + 990) % 990 - 110; c.fillStyle = i % 2 ? "#ff2bd6" : "#00d4ff"; c.globalAlpha = .55; c.fillRect(sx + 8, y, 24, 70); c.globalAlpha = 1; c.fillStyle = "rgba(255,255,255,.25)"; for (var w = 0; w < 3; w++) c.fillRect(sx + 12, y + 8 + w * 20, 16, 8); }
    }
    c.fillStyle = "#1c2140"; c.fillRect(46, 0, W - 92, H);
    c.strokeStyle = "rgba(0,212,255,.65)"; c.lineWidth = 4; c.beginPath(); c.moveTo(48, 0); c.lineTo(48, H); c.moveTo(W - 48, 0); c.lineTo(W - 48, H); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 4; c.setLineDash([40, 40]); c.lineDashOffset = -S.scroll % 80;
    c.beginPath(); c.moveTo(W / 2 - LANEW / 2, 0); c.lineTo(W / 2 - LANEW / 2, H); c.moveTo(W / 2 + LANEW / 2, 0); c.lineTo(W / 2 + LANEW / 2, H); c.stroke(); c.setLineDash([]);
  }
  function drawObj(c, o) {
    var x = o.mx != null ? o.mx : lx(o.l), y = o.y;
    if (o.k === "coin") {
      var sq = Math.abs(Math.cos(S.t * 5 + o.d * .01)), yy = y - (o.air ? 34 : 0);
      c.fillStyle = "#ffb300"; c.beginPath(); c.ellipse(x, yy, 13 * sq + 2, 13, 0, 0, 6.29); c.fill();
      c.fillStyle = "#ffe066"; c.beginPath(); c.ellipse(x, yy, 9 * sq + 1, 9, 0, 0, 6.29); c.fill(); return;
    }
    if (o.k === "pow") {
      var col = { magnet: "#ff2bd6", x2: "#ffd23f", shield: "#00d4ff" }[o.p], b = Math.sin(S.t * 6) * 4;
      c.save(); c.shadowColor = col; c.shadowBlur = 18; c.fillStyle = col; c.beginPath(); c.arc(x, y - 10 + b, 22, 0, 6.29); c.fill(); c.restore();
      T(c, { magnet: "🧲", x2: "×2", shield: "🛡" }[o.p], x, y - 9 + b, 20, "#05070d"); return;
    }
    if (o.k === "car") {
      var hue = Math.floor(o.col * 360), top = y - o.len;
      c.fillStyle = "rgba(0,0,0,.35)"; rr(c, x - 44, top + 6, 92, o.len, 14); c.fill();
      c.fillStyle = "hsl(" + hue + ",75%,50%)"; rr(c, x - 46, top, 92, o.len, 14); c.fill();
      c.fillStyle = "hsl(" + hue + ",75%,32%)"; rr(c, x - 36, top + o.len - 46, 72, 30, 8); c.fill();
      c.fillStyle = "rgba(180,230,255,.75)"; rr(c, x - 36, top + 18, 72, 26, 8); c.fill();
      c.fillStyle = "#ff3b3b"; c.fillRect(x - 40, top + 2, 16, 6); c.fillRect(x + 24, top + 2, 16, 6);
      c.fillStyle = "#fff6b0"; c.fillRect(x - 40, y - 8, 16, 6); c.fillRect(x + 24, y - 8, 16, 6);
      if (o.len > 150) { c.fillStyle = "rgba(255,255,255,.18)"; for (var i = 0; i < 3; i++) c.fillRect(x - 40, top + 70 + i * 40, 80, 18); }
      return;
    }
    if (o.k === "low") { // jump over
      c.fillStyle = "#ff8a00"; rr(c, x - 54, y - 26, 108, 26, 6); c.fill();
      c.fillStyle = "#1c2140"; for (var j = 0; j < 4; j++) { c.beginPath(); c.moveTo(x - 50 + j * 28, y - 26); c.lineTo(x - 36 + j * 28, y - 26); c.lineTo(x - 50 + j * 28 + 6, y); c.lineTo(x - 50 + j * 28 - 8, y); c.fill(); }
      T(c, "⬆", x, y - 44, 16, "rgba(255,210,63,.8)"); return;
    }
    if (o.k === "high") { // slide under
      c.fillStyle = "#555c80"; c.fillRect(x - 56, y - 90, 8, 90); c.fillRect(x + 48, y - 90, 8, 90);
      c.fillStyle = "#ff2bd6"; rr(c, x - 58, y - 30, 116, 22, 6); c.fill();
      c.fillStyle = "#fff"; c.fillRect(x - 50, y - 22, 100, 4);
      T(c, "⬇", x, y + 14, 16, "rgba(255,43,214,.85)");
    }
  }
  function drawHUD(c) {
    var tg = c.createLinearGradient(0, 0, 0, 56); tg.addColorStop(0, "rgba(5,7,13,.92)"); tg.addColorStop(1, "rgba(5,7,13,0)"); c.fillStyle = tg; c.fillRect(0, 0, W, 56);
    panel(c, 60, 58, 360, 52, "rgba(0,212,255,.45)");
    T(c, Math.floor(S.dist) + " m", 120, 84, 22, "#fff");
    T(c, "🪙 " + S.run.coins, 240, 84, 20, "#ffd23f");
    T(c, (S.daily ? "Goal " + dailyGoal() : "Best " + save.best), 355, 84, 15, "#9fb3d1");
    var x = 70;
    [["magnet", "🧲", "#ff2bd6", 9], ["x2", "×2", "#ffd23f", 10]].forEach(function (k) { if (S.pw[k[0]] > 0) { c.fillStyle = "rgba(0,0,0,.5)"; rr(c, x, 118, 96, 26, 13); c.fill(); c.fillStyle = k[2]; rr(c, x, 118, 96 * Math.min(1, S.pw[k[0]] / (k[3] * (S.ch.id === "double" && k[0] === "x2" ? 2 : S.ch.id === "magnet" && k[0] === "magnet" ? 1.5 : 1))), 26, 13); c.fill(); T(c, k[1], x + 48, 131, 15, "#05070d"); x += 104; } });
    if (S.pw.shield) { c.fillStyle = "#00d4ff"; rr(c, x, 118, 60, 26, 13); c.fill(); T(c, "🛡", x + 30, 131, 15, "#05070d"); }
  }
  function draw(c, api) {
    drawRoad(c);
    if (S.scr === "play") {
      S.objs.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { if (o.y > -260 && o.y < H + 260) drawObj(c, o); });
      var pose = S.jump > 0 ? 1 : S.slide > 0 ? 2 : 0, jh = S.jump > 0 ? Math.sin((1 - S.jump / .62) * Math.PI) * 46 : 0;
      if (!(S.inv > 0 && Math.floor(S.t * 12) % 2)) {
        c.save(); if (jh) { c.translate(0, -jh); }
        drawRunner(c, S.px, PY - 6, S.ch, pose, 1.15, S.dead ? 0 : S.t);
        c.restore();
        if (S.pw.shield) { c.strokeStyle = "rgba(0,212,255,.7)"; c.lineWidth = 3; c.beginPath(); c.arc(S.px, PY - 14 - jh, 44, 0, 6.29); c.stroke(); }
      }
      S.parts.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillRect(p.x - 3, p.y - 3, 6, 6); }); c.globalAlpha = 1;
      S.pops.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 2); T(c, p.s, p.x, p.y, 18, p.col); }); c.globalAlpha = 1;
      drawHUD(c);
      if (S.dist < 15) { panel(c, 70, 300, 340, 100); T(c, "Swipe ← → to switch lanes", W / 2, 330, 17, "#fff"); T(c, "Swipe ↑ jump · ↓ slide (or arrow keys)", W / 2, 368, 15, "#9fb3d1"); }
      drawUI(c, S.ui);
    } else {
      c.fillStyle = "rgba(5,7,13,.55)"; c.fillRect(0, 0, W, H);
      if (S.scr === "menu") {
        T(c, "TURBO", W / 2, 120, 54, "#00d4ff", "center", "900"); T(c, "LANE RUSH", W / 2, 172, 42, "#ff2bd6", "center", "900");
        drawRunner(c, W / 2, 250, CHARS[save.ch] || CHARS[0], 0, 1, S.t);
        T(c, "🪙 " + save.coins + "   ·   Best " + save.best, W / 2, 600, 18, "#ffd23f");
        T(c, save.daily.claimed ? "Daily goal done ✔ (best " + save.daily.best + " m)" : "Daily goal: " + dailyGoal() + " m → +250 🪙", W / 2, 630, 15, save.daily.claimed ? "#39ff88" : "#9fb3d1");
        T(c, "Missions " + Object.keys(save.mset).length + "/30", W / 2, 656, 15, "#9fb3d1");
      } else if (S.scr === "shop") {
        T(c, "Runners", W / 2, 76, 34, "#fff"); T(c, "🪙 " + save.coins, W / 2, 106, 18, "#ffd23f");
      } else if (S.scr === "miss") {
        T(c, "Missions", W / 2, 80, 34, "#fff"); T(c, Object.keys(save.mset).length + " / 30 complete", W / 2, 112, 16, "#9fb3d1");
        S.run = null;
        activeList().forEach(function (i, n) {
          var m = MISSIONS[i], y = 150 + n * 110; panel(c, 40, y, 400, 96, "rgba(57,255,136,.5)");
          T(c, "#" + (i + 1), 76, y + 30, 18, "#39ff88"); T(c, m.text, 260, y + 30, 16, "#fff");
          var pr = m.t === "runs" ? save.runs : m.t === "tcoins" ? save.tcoins : null;
          T(c, pr == null ? "Do it in a single run" : "Progress " + Math.min(pr, m.g) + " / " + m.g, 260, y + 58, 14, "#9fb3d1");
          T(c, "Reward 🪙 " + m.r, 260, y + 80, 14, "#ffd23f");
        });
        if (!activeList().length) T(c, "All 30 missions complete! 🏆", W / 2, 260, 22, "#ffd23f");
      }
      drawUI(c, S.ui);
    }
    S.toasts.forEach(function (t, i) { c.globalAlpha = Math.min(1, t.t * 2); panel(c, 90, 160 + i * 50, 300, 40, t.col); T(c, t.s, W / 2, 180 + i * 50, 16, t.col); }); c.globalAlpha = 1;
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, touch: true, hint: "Swipe ← → to change lanes, ↑ to jump, ↓ to slide. Arrow keys work too." });
  window.GV6 = { S: function () { return S; }, save: function () { return save; }, act: act }; // debug hook used by automated tests
})();
