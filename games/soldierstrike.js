/* Mini Soldier Strike — defend the base against waves of drones and robots.
   Original game for Gaming World of Jarvis. 40 missions, 10 weapons, 5 bosses, armour upgrades. */
(function () {
  "use strict";
  var W = 480, H = 720, WALLY = 592, TX = 240, TY = 648, S, API, uid = 1;
  var KEY = "gv_soldierstrike", NM = 40;
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
  var WEAPONS = [
    { n: "Pistol", dmg: 1.2, rate: 3.2, sp: 900, spread: .02, pel: 1, cost: 0, need: 0, col: "#ffd23f" },
    { n: "SMG", dmg: .8, rate: 9, sp: 950, spread: .07, pel: 1, cost: 150, need: 2, col: "#ffe680" },
    { n: "Shotgun", dmg: .9, rate: 1.5, sp: 850, spread: .32, pel: 6, cost: 300, need: 4, col: "#ff9f1c" },
    { n: "Battle Rifle", dmg: 2.6, rate: 4, sp: 1200, spread: .015, pel: 1, cost: 500, need: 6, col: "#fff" },
    { n: "Laser", dmg: 1.2, rate: 7, sp: 1500, spread: 0, pel: 1, pierce: 3, cost: 800, need: 9, col: "#ff2bd6", beam: 1 },
    { n: "Minigun", dmg: 1, rate: 15, sp: 1100, spread: .1, pel: 1, cost: 1100, need: 12, col: "#ffd23f" },
    { n: "Rocket Pod", dmg: 6, rate: 1.3, sp: 620, spread: .03, pel: 1, splash: 70, cost: 1500, need: 16, col: "#ff5a3c", rocket: 1 },
    { n: "Plasma", dmg: 3.6, rate: 4.2, sp: 800, spread: .04, pel: 1, splash: 34, cost: 2000, need: 20, col: "#39ff88", orb: 1 },
    { n: "Railgun", dmg: 11, rate: 1.1, sp: 2600, spread: 0, pel: 1, pierce: 99, cost: 2700, need: 25, col: "#00d4ff", beam: 1 },
    { n: "Tesla Coil", dmg: 2.8, rate: 3.2, sp: 0, spread: 0, pel: 1, chain: 4, cost: 3500, need: 30, col: "#b8f3ff" }
  ];
  var ETYPES = {
    drone: { hp: 2, v: 62, r: 16, dps: 6, coin: 3 }, dart: { hp: 1.2, v: 125, r: 12, dps: 5, coin: 3 },
    robot: { hp: 6, v: 34, r: 20, dps: 10, coin: 5 }, gunner: { hp: 7, v: 40, r: 19, dps: 8, coin: 7, shoots: 1 },
    heavy: { hp: 18, v: 22, r: 27, dps: 18, coin: 10 }
  };
  var BOSSES = [
    { n: "Hover Titan", hp: 120, col: "#ff2bd6", shots: 1, minion: "drone" }, { n: "Crusher Mech", hp: 230, col: "#ff9f1c", shots: 2, minion: "robot" },
    { n: "Swarm Mother", hp: 330, col: "#39ff88", shots: 1, minion: "dart", spawn: 1 }, { n: "Laser Walker", hp: 480, col: "#00d4ff", shots: 3, minion: "gunner" },
    { n: "Omega Core", hp: 700, col: "#ffd23f", shots: 4, minion: "heavy", spawn: 1 }
  ];
  var save = LS(KEY, { done: {}, coins: 0, own: [0], wpn: 0, arm: 0, rep: 0, dmg: 0 });
  function persist() { SV(KEY, save); }
  function doneCount() { return Object.keys(save.done).length; }
  function firstOpen() { for (var i = 1; i <= NM; i++) if (!save.done[i]) return i; return NM; }
  function maxHP() { return 100 + save.arm * 40; }
  function upCost(k) { return Math.round([120, 150, 140][k] * Math.pow(1.6, save[["arm", "rep", "dmg"][k]])); }

  function mission(m) {
    var boss = m % 8 === 0, waves = [], nw = boss ? 2 : 3 + Math.floor(m / 10), pool = ["drone"];
    if (m >= 2) pool.push("robot"); if (m >= 4) pool.push("dart"); if (m >= 7) pool.push("gunner"); if (m >= 10) pool.push("heavy");
    for (var w = 0; w < nw; w++) {
      var cnt = Math.round(5 + m * .45 + w * 2), list = [];
      for (var i = 0; i < cnt; i++) list.push(pool[(i * 7 + w * 3 + m) % pool.length]);
      waves.push({ list: list, gap: Math.max(.45, 1.5 - m * .022 - w * .05) });
    }
    if (boss) waves.push({ boss: BOSSES[m / 8 - 1] });
    return { m: m, waves: waves, scale: 1 + (m - 1) * .055, boss: boss };
  }

  function init(api) { API = api; S = { scr: "menu", ui: UI(1), t: 0, parts: [], pops: [], page: 0 }; menu(); }
  function menu() {
    S.scr = "menu"; var ui = S.ui = UI(1);
    button(ui, 90, 360, 300, 62, "▶  Mission " + firstOpen(), function () { start(firstOpen()); }, { size: 23 });
    button(ui, 90, 436, 300, 54, "🗺  Missions", function () { S.page = Math.floor((firstOpen() - 1) / 20); missions(); }, { col: "#ffd23f", col2: "#ff9f1c" });
    button(ui, 90, 504, 300, 54, "🛡  Armoury", function () { armoury(); }, { col: "#39ff88", col2: "#14a85a" });
  }
  function missions() {
    S.scr = "missions"; var ui = S.ui = UI(5), bw = 74, bh = 70, gx = (W - (5 * bw + 4 * 12)) / 2, base = S.page * 20;
    for (var k = 0; k < 20; k++) (function (n) {
      var open = n === 1 || save.done[n - 1] || save.done[n], boss = n % 8 === 0;
      button(ui, gx + (k % 5) * (bw + 12), 130 + Math.floor(k / 5) * (bh + 14), bw, bh, "", function () { start(n); }, { disabled: !open, col: save.done[n] ? "#39ff88" : boss ? "#ff5a3c" : "#00d4ff", col2: save.done[n] ? "#14a85a" : boss ? "#a3150b" : "#0077ff",
        draw: function (c, b) { T(c, open ? (boss ? "☠" + n : String(n)) : "🔒", b.x + b.w / 2, b.y + 26, 21, "#04121f"); if (save.done[n]) stars3(c, b.x + b.w / 2, b.y + 52, save.done[n], 7); } });
    })(base + k + 1);
    button(ui, 30, 500, 120, 50, "◀ Prev", function () { S.page = (S.page + 1) % 2; missions(); }, { ghost: true });
    button(ui, 330, 500, 120, 50, "Next ▶", function () { S.page = (S.page + 1) % 2; missions(); }, { ghost: true });
    button(ui, 165, 580, 150, 50, "Menu", menu, { ghost: true, col: "#ffd23f" });
  }
  function armoury() {
    S.scr = "armoury"; var ui = S.ui = UI(2);
    WEAPONS.forEach(function (wp, i) {
      var own = save.own.indexOf(i) >= 0, locked = doneCount() < wp.need;
      button(ui, 24 + (i % 2) * 220, 104 + Math.floor(i / 2) * 70, 212, 62, wp.n, function () {
        if (own) { save.wpn = i; persist(); armoury(); S.ui.focus = i; return; }
        if (locked) { pop(W / 2, 580, "Clear " + wp.need + " missions to unlock", "#ff7a7a", 16); API.sfx("hit"); return; }
        if (save.coins < wp.cost) { pop(W / 2, 580, "Need " + (wp.cost - save.coins) + " more coins", "#ff7a7a", 16); API.sfx("hit"); return; }
        save.coins -= wp.cost; save.own.push(i); save.wpn = i; persist(); API.sfx("win"); armoury(); S.ui.focus = i;
      }, { ghost: true, col: save.wpn === i ? "#39ff88" : own ? "#00d4ff" : "#6b7590", r: 12, draw: function (c, b) {
        drawGun(c, b.x + 34, b.y + 31, i, .7);
        T(c, wp.n, b.x + 130, b.y + 20, 16, "#fff");
        T(c, own ? (save.wpn === i ? "✔ Equipped" : "Tap to equip") : locked ? "🔒 " + wp.need + " missions" : "🪙 " + wp.cost, b.x + 130, b.y + 44, 13, own ? "#39ff88" : locked ? "#9fb3d1" : save.coins >= wp.cost ? "#ffd23f" : "#ff7a7a");
      } });
    });
    var ups = [["🛡 Armour", "arm", "+40 base HP"], ["🔧 Repair", "rep", "+0.8 HP/s"], ["💥 Damage", "dmg", "+12% damage"]];
    ups.forEach(function (u, k) {
      var lv = save[u[1]], max = lv >= 8, cost = upCost(k);
      button(ui, 24 + k * 148, 466, 136, 92, u[0], function () {
        if (max) return; if (save.coins < cost) { pop(W / 2, 580, "Need " + (cost - save.coins) + " more coins", "#ff7a7a", 16); API.sfx("hit"); return; }
        save.coins -= cost; save[u[1]]++; persist(); API.sfx("coin"); armoury(); S.ui.focus = 10 + k;
      }, { col: "#ffd23f", col2: "#ff9f1c", r: 12, draw: function (c, b) {
        T(c, u[0], b.x + b.w / 2, b.y + 20, 16, "#04121f"); T(c, "Lv " + lv + "/8 · " + u[2], b.x + b.w / 2, b.y + 46, 11, "#2a1500", "center", "700");
        T(c, max ? "MAX" : "🪙 " + cost, b.x + b.w / 2, b.y + 70, 15, "#04121f");
      } });
    });
    button(ui, 140, 600, 200, 52, "◀  Back", menu, { ghost: true });
  }
  function pop(x, y, s, col, size) { S.pops.push({ x: x, y: y, s: s, col: col || "#fff", t: 1.2, size: size || 18 }); }

  function start(m) {
    var M = mission(m);
    S.scr = "play"; S.M = M; S.wi = -1; S.queue = []; S.spawnT = 0; S.waveT = 1.2; S.en = []; S.bul = []; S.eb = []; S.parts = []; S.pops = []; S.zaps = [];
    S.hp = maxHP(); S.cool = 0; S.ang = -Math.PI / 2; S.hold = false; S.kills = 0; S.coins = 0; S.end = 0; S.res = null; S.flash = 0; S.shake = 0;
    S.wp = WEAPONS[save.wpn] || WEAPONS[0];
    S.ui = UI(1); button(S.ui, 10, H - 50, 44, 40, "≡", function () { S.page = Math.floor((m - 1) / 20); missions(); }, { ghost: true, size: 22, r: 10 });
    API.setScore(0); API.sfx("move"); nextWave();
  }
  function nextWave() {
    S.wi++; if (S.wi >= S.M.waves.length) { win(); return; }
    var w = S.M.waves[S.wi]; S.waveT = 1.6; S.banner = w.boss ? "⚠ BOSS: " + w.boss.n : "Wave " + (S.wi + 1) + " / " + S.M.waves.length;
    if (w.boss) { S.queue = []; spawnBoss(w.boss); } else { S.queue = w.list.slice(); S.gap = w.gap; S.spawnT = 0; }
  }
  function spawnEnemy(type, x, y) {
    var t = ETYPES[type], sc = S.M.scale;
    S.en.push({ id: uid++, stopY: 230 + Math.random() * 130, type: type, x: x != null ? x : 50 + Math.random() * (W - 100), y: y != null ? y : -30, hp: t.hp * sc, max: t.hp * sc, v: t.v * (1 + (S.M.m - 1) * .006), r: t.r, ph: Math.random() * 6, fire: 1.5 + Math.random() * 2, hit: 0 });
  }
  function spawnBoss(b) {
    var i = BOSSES.indexOf(b), hp = b.hp * (1 + i * .15);
    S.en.push({ id: uid++, type: "boss", b: b, bi: i, x: W / 2, y: -90, hp: hp, max: hp, v: 40, r: 58, ph: 0, fire: 2, spawnT: 3, hit: 0 });
  }
  function dmgMul() { return 1 + save.dmg * .12; }
  function fire() {
    var wp = S.wp; if (S.cool > 0 || S.end) return; S.cool = 1 / wp.rate;
    var tipx = TX + Math.cos(S.ang) * 46, tipy = TY + Math.sin(S.ang) * 46;
    if (wp.chain) { // tesla: zap nearest enemy in the aim cone, then chain
      var hitL = [], from = { x: tipx, y: tipy }, used = {};
      for (var k = 0; k <= wp.chain; k++) {
        var best = null, bd = 1e9;
        S.en.forEach(function (e, idx) { if (used[idx] || e.y < 40) return; var dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy);
          if (k === 0) { var a = Math.atan2(dy, dx), da = Math.abs(((a - S.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > .32) return; }
          else if (d > 150) return; if (d < bd) { bd = d; best = idx; } });
        if (best == null) break; used[best] = 1; var e = S.en[best]; S.zaps.push({ x1: from.x, y1: from.y, x2: e.x, y2: e.y, t: .14 }); damage(e, wp.dmg * dmgMul() * (k ? .75 : 1)); from = { x: e.x, y: e.y };
      }
      if (k === 0) S.zaps.push({ x1: tipx, y1: tipy, x2: tipx + Math.cos(S.ang) * 120, y2: tipy + Math.sin(S.ang) * 120, t: .08 });
      API.sfx("shoot"); return;
    }
    for (var i = 0; i < wp.pel; i++) {
      var a = S.ang + (Math.random() - .5) * 2 * wp.spread + (wp.pel > 1 ? (i - (wp.pel - 1) / 2) * wp.spread / wp.pel : 0);
      S.bul.push({ x: tipx, y: tipy, vx: Math.cos(a) * wp.sp, vy: Math.sin(a) * wp.sp, dmg: wp.dmg * dmgMul(), pierce: wp.pierce || 0, splash: wp.splash || 0, wp: wp, hitSet: {} });
    }
    S.recoil = .08; API.sfx(wp.rocket ? "jump" : "shoot");
  }
  function damage(e, d) {
    if (e.dead) return; e.hp -= d; e.hit = .08;
    if (e.hp <= 0) {
      e.dead = true; S.kills++; var coin = e.type === "boss" ? 150 + e.bi * 50 : ETYPES[e.type].coin; S.coins += coin;
      burst(e.x, e.y, e.type === "boss" ? e.b.col : "#ff9f1c", e.type === "boss" ? 80 : 16); pop(e.x, e.y - 20, "+" + coin + " 🪙", "#ffd23f", e.type === "boss" ? 24 : 15);
      API.sfx("boom"); if (e.type === "boss") { S.shake = .6; S.flash = .3; }
      API.setScore(score());
    }
  }
  function score() { return S.kills * 10 + S.coins * 5 + Math.round(S.hp); }
  function burst(x, y, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 50 + Math.random() * 260; S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: .4 + Math.random() * .5, col: col }); } }
  function win() {
    if (S.end) return; var m = S.M.m, frac = S.hp / maxHP(), st = frac >= .7 ? 3 : frac >= .35 ? 2 : 1, prev = save.done[m] || 0, bonus = 40 + m * 5;
    save.done[m] = Math.max(prev, st); S.coins += bonus; save.coins += S.coins; persist();
    S.end = 1; S.scr = "result"; S.res = { win: true, stars: st, bonus: bonus }; API.setScore(score()); API.sfx("win");
    var ui = S.ui = UI(1), y = 440; if (m < NM) { button(ui, 120, y, 240, 56, "Next mission ▶", function () { start(m + 1); }); y += 66; }
    button(ui, 120, y, 240, 50, "🛡 Armoury", armoury, { col: "#39ff88", col2: "#14a85a" }); button(ui, 120, y + 60, 240, 46, "Missions", function () { S.page = Math.floor((m - 1) / 20); missions(); }, { ghost: true });
  }
  function lose() {
    if (S.end) return; var m = S.M.m; save.coins += S.coins; persist();
    S.end = 1; S.scr = "result"; S.res = { win: false }; API.sfx("over");
    var ui = S.ui = UI(1); button(ui, 120, 440, 240, 56, "↻ Retry", function () { start(m); }, { col: "#ffd23f", col2: "#ff9f1c" });
    button(ui, 120, 506, 240, 50, "🛡 Armoury", armoury, { col: "#39ff88", col2: "#14a85a" }); button(ui, 120, 566, 240, 46, "Missions", function () { S.page = Math.floor((m - 1) / 20); missions(); }, { ghost: true });
  }

  function update(dt, api) {
    S.t += dt; var p = api.pointer;
    S.parts.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.t -= dt; }); S.parts = S.parts.filter(function (q) { return q.t > 0; });
    S.pops.forEach(function (q) { q.y -= 36 * dt; q.t -= dt; }); S.pops = S.pops.filter(function (q) { return q.t > 0; });
    if (S.scr !== "play") { uiInput(S.ui, api); return; }
    S.zaps.forEach(function (z) { z.t -= dt; }); S.zaps = S.zaps.filter(function (z) { return z.t > 0; });
    if (S.flash > 0) S.flash -= dt; if (S.shake > 0) S.shake -= dt; if (S.recoil > 0) S.recoil -= dt;
    // input: drag to aim, tap / hold to fire
    if (p.tapped) { if (inB(p, S.ui.btns[0])) { S.ui.btns[0].fn(); return; } if (p.y < WALLY + 20) { S.hold = true; aimAt(p.x, p.y); S.cool = Math.min(S.cool, 0); fire(); } }
    if (S.hold && p.down) { aimAt(p.x, p.y); fire(); } else S.hold = false;
    if (api.keys.left) S.ang -= 2.2 * dt; if (api.keys.right) S.ang += 2.2 * dt; S.ang = Math.max(-Math.PI + .12, Math.min(-.12, S.ang));
    if (api.keys.fire || api.keys.up) fire();
    S.cool -= dt;
    S.hp = Math.min(maxHP(), S.hp + save.rep * .8 * dt);
    // waves
    if (S.waveT > 0) S.waveT -= dt;
    else if (S.queue.length) { S.spawnT -= dt; if (S.spawnT <= 0) { spawnEnemy(S.queue.shift()); S.spawnT = S.gap; } }
    else if (!S.en.length) { nextWave(); if (S.end) return; }
    // enemies
    S.en.forEach(function (e) {
      if (e.hit > 0) e.hit -= dt; e.ph += dt;
      if (e.type === "boss") {
        var b = e.b; if (e.y < 150) e.y += 50 * dt; else e.x = W / 2 + Math.sin(e.ph * .6) * 150;
        e.fire -= dt; if (e.fire <= 0 && e.y >= 150) { e.fire = 2.7 - e.bi * .2; for (var i = 0; i < b.shots; i++) { var tx = 80 + Math.random() * 320, a = Math.atan2(WALLY - e.y, tx - e.x); S.eb.push({ x: e.x, y: e.y + 40, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: 4 + e.bi }); } API.sfx("shoot"); }
        e.spawnT -= dt; if (e.spawnT <= 0 && e.y >= 150) { e.spawnT = b.spawn ? 2.2 : 4.5; spawnEnemy(b.minion, e.x + (Math.random() - .5) * 80, e.y + 40); }
        return;
      }
      var t = ETYPES[e.type];
      if (t.shoots && e.y > e.stopY) { e.fire -= dt; if (e.fire <= 0) { e.fire = 2.4; S.eb.push({ x: e.x, y: e.y + 14, vx: 0, vy: 240, dmg: 5 }); API.sfx("shoot"); } return; }
      if (e.y < WALLY - e.r) { e.y += e.v * dt; if (e.type === "drone" || e.type === "dart") e.x += Math.sin(e.ph * 2.5) * (e.type === "dart" ? 140 : 60) * dt; e.x = Math.max(24, Math.min(W - 24, e.x)); }
      else { S.hp -= t.dps * .75 * dt; e.atk = (e.atk || 0) + dt; if (e.atk > .4) { e.atk = 0; burst(e.x, WALLY, "#ffd23f", 3); S.shake = .12; } }
    });
    // player bullets
    S.bul.forEach(function (b) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (var i = 0; i < S.en.length && !b.gone; i++) {
        var e = S.en[i]; if (e.dead || b.hitSet[e.id]) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 5) {
          b.hitSet[e.id] = 1;
          if (b.splash) { boom(b.x, b.y, b.splash, b.dmg, b.wp.col); b.gone = 1; }
          else { damage(e, b.dmg); burst(b.x, b.y, b.wp.col, 3); if (b.pierce-- <= 0) b.gone = 1; }
        }
      }
      if (b.x < -20 || b.x > W + 20 || b.y < -40) b.gone = 1;
    });
    S.bul = S.bul.filter(function (b) { return !b.gone; });
    // enemy bullets
    S.eb.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= WALLY) { b.gone = 1; S.hp -= b.dmg; burst(b.x, WALLY, "#ff5a3c", 8); S.shake = .15; API.sfx("hit"); } });
    S.eb = S.eb.filter(function (b) { return !b.gone; });
    S.en = S.en.filter(function (e) { return !e.dead; });
    if (S.hp <= 0) { S.hp = 0; burst(TX, TY, "#ff5a3c", 60); API.sfx("boom"); lose(); }
  }
  function boom(x, y, rad, dmg, col) { S.en.forEach(function (e) { var d = Math.hypot(e.x - x, e.y - y); if (d < rad + e.r) damage(e, dmg * (d < rad * .5 ? 1 : .6)); }); burst(x, y, col, 22); S.parts.push({ x: x, y: y, vx: 0, vy: 0, t: .3, col: col, ring: rad }); API.sfx("boom"); }
  function aimAt(x, y) { S.ang = Math.atan2(Math.min(y, TY - 30) - TY, x - TX); S.ang = Math.max(-Math.PI + .12, Math.min(-.12, S.ang)); }

  /* ---------- drawing ---------- */
  function drawGun(c, x, y, i, sc) {
    var wp = WEAPONS[i]; c.save(); c.translate(x, y); c.scale(sc, sc);
    c.fillStyle = "#2b3350"; rr(c, -26, -8, 40, 16, 4); c.fill(); c.fillStyle = wp.col; rr(c, -6, -5, 34 + (i % 3) * 6, 10, 3); c.fill();
    c.fillStyle = "#1a1f33"; c.fillRect(-20, 6, 9, 14); if (wp.rocket) { c.fillStyle = "#ff5a3c"; c.beginPath(); c.arc(30, 0, 7, 0, 6.29); c.fill(); }
    if (wp.chain) { c.strokeStyle = "#b8f3ff"; c.lineWidth = 2; c.beginPath(); c.moveTo(28, -8); c.lineTo(34, 0); c.lineTo(28, 8); c.stroke(); }
    c.restore();
  }
  function drawEnemy(c, e) {
    c.save(); c.translate(e.x, e.y);
    if (e.hit > 0) c.globalAlpha = .6;
    if (e.type === "drone" || e.type === "dart") {
      var col = e.type === "drone" ? "#ff2bd6" : "#00d4ff";
      c.strokeStyle = "#9fb3d1"; c.lineWidth = 3; c.beginPath(); c.moveTo(-e.r - 6, -4); c.lineTo(e.r + 6, -4); c.stroke();
      c.fillStyle = "rgba(255,255,255,.6)"; [-e.r - 6, e.r + 6].forEach(function (x) { c.beginPath(); c.ellipse(x, -6, 9 * Math.abs(Math.sin(S.t * 30)) + 2, 2, 0, 0, 6.29); c.fill(); });
      c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, e.r, e.r * .7, 0, 0, 6.29); c.fill();
      c.fillStyle = "#05070d"; c.beginPath(); c.arc(0, 2, e.r * .35, 0, 6.29); c.fill(); c.fillStyle = "#ff3b3b"; c.beginPath(); c.arc(0, 2, e.r * .16, 0, 6.29); c.fill();
    } else if (e.type === "boss") {
      var b = e.b, r = e.r;
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(0, r + 14, r, 10, 0, 0, 6.29); c.fill();
      c.fillStyle = "#2b3350"; rr(c, -r, -r * .7, r * 2, r * 1.4, 20); c.fill(); c.strokeStyle = b.col; c.lineWidth = 4; c.stroke();
      c.fillStyle = b.col; c.beginPath(); c.arc(0, -4, r * .38, 0, 6.29); c.fill(); c.fillStyle = "#05070d"; c.beginPath(); c.arc(Math.sin(S.t * 2) * 8, -4, r * .16, 0, 6.29); c.fill();
      c.fillStyle = "#1a1f33"; c.fillRect(-r - 14, -10, 18, 40); c.fillRect(r - 4, -10, 18, 40); c.fillStyle = b.col; c.fillRect(-r - 12, 26, 14, 8); c.fillRect(r - 2, 26, 14, 8);
      for (var i = 0; i < 4; i++) { c.fillStyle = i % 2 ? b.col : "#fff"; c.fillRect(-r + 12 + i * 22, r * .45, 12, 6); }
    } else {
      var rc = e.type === "robot" ? "#9fb3d1" : e.type === "gunner" ? "#ffd23f" : "#ff9f1c", s = e.r, step = Math.sin(e.ph * 8) * 4;
      c.fillStyle = "#1a1f33"; c.fillRect(-s * .6, s * .5 + step, s * .4, s * .7); c.fillRect(s * .2, s * .5 - step, s * .4, s * .7);
      c.fillStyle = rc; rr(c, -s * .8, -s * .3, s * 1.6, s * .95, 6); c.fill();
      c.fillStyle = "#2b3350"; rr(c, -s * .55, -s * .95, s * 1.1, s * .7, 6); c.fill();
      c.fillStyle = "#ff3b3b"; c.fillRect(-s * .35, -s * .7, s * .7, s * .18);
      if (e.type === "gunner") { c.fillStyle = "#1a1f33"; c.fillRect(-4, s * .5, 8, s * .8); }
      if (e.type === "heavy") { c.fillStyle = "#5a3a1a"; c.fillRect(-s * .9, -s * .2, s * .25, s * .7); c.fillRect(s * .65, -s * .2, s * .25, s * .7); }
    }
    c.restore();
    if (e.type !== "boss" && e.hp < e.max) { c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(e.x - 18, e.y - e.r - 12, 36, 5); c.fillStyle = "#39ff88"; c.fillRect(e.x - 18, e.y - e.r - 12, 36 * Math.max(0, e.hp / e.max), 5); }
  }
  function drawBase(c) {
    c.fillStyle = "#2a2f45"; c.fillRect(0, WALLY, W, H - WALLY);
    for (var i = 0; i < 12; i++) { c.fillStyle = i % 2 ? "#3a4160" : "#333a57"; c.fillRect(i * 40, WALLY, 40, 22); }
    c.fillStyle = "#ffd23f"; for (i = 0; i < 24; i++) if (i % 2) c.fillRect(i * 20, WALLY - 4, 20, 4);
    // sandbags
    c.fillStyle = "#8a7350"; for (i = 0; i < 6; i++) { c.beginPath(); c.ellipse(TX - 75 + i * 30, TY + 30, 17, 10, 0, 0, 6.29); c.fill(); }
    // soldier + gun
    c.save(); c.translate(TX, TY); c.rotate(S.ang); c.translate(-(S.recoil > 0 ? 5 : 0), 0);
    var wi = WEAPONS.indexOf(S.wp); c.fillStyle = "#1a1f33"; rr(c, 0, -7, 46, 14, 4); c.fill(); c.fillStyle = S.wp.col; rr(c, 14, -4, 34, 8, 3); c.fill();
    if (S.recoil > 0 && !S.wp.chain) { c.fillStyle = "rgba(255,210,63,.9)"; c.beginPath(); c.arc(52, 0, 9, 0, 6.29); c.fill(); }
    c.restore();
    c.fillStyle = "#3d6b3a"; c.beginPath(); c.arc(TX, TY + 4, 18, 0, 6.29); c.fill(); c.fillStyle = "#2c4f2a"; c.beginPath(); c.arc(TX, TY - 2, 13, Math.PI, 0); c.fill(); c.fillRect(TX - 15, TY - 3, 30, 4);
    void wi;
  }
  function draw(c, api) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1430"); g.addColorStop(1, "#1b2a1f"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // ground grid
    c.strokeStyle = "rgba(57,255,136,.07)"; c.lineWidth = 1; for (var i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, 120 + i * 42); c.lineTo(W, 120 + i * 42); c.stroke(); }
    for (i = 0; i < 9; i++) { c.beginPath(); c.moveTo(i * 60, 100); c.lineTo(i * 60, WALLY); c.stroke(); }
    if (S.scr === "play" || S.scr === "result") {
      c.save(); if (S.shake > 0) c.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
      S.en.forEach(function (e) { drawEnemy(c, e); });
      S.bul.forEach(function (b) { c.fillStyle = b.wp.col; if (b.wp.beam) { c.strokeStyle = b.wp.col; c.lineWidth = b.wp.n === "Railgun" ? 5 : 3; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * .03, b.y - b.vy * .03); c.stroke(); } else { c.beginPath(); c.arc(b.x, b.y, b.wp.rocket ? 6 : b.wp.orb ? 7 : 3.5, 0, 6.29); c.fill(); } });
      S.eb.forEach(function (b) { c.fillStyle = "#ff5a3c"; c.beginPath(); c.arc(b.x, b.y, 6, 0, 6.29); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(b.x, b.y, 2.5, 0, 6.29); c.fill(); });
      S.zaps.forEach(function (z) { c.strokeStyle = "#b8f3ff"; c.lineWidth = 3; c.beginPath(); c.moveTo(z.x1, z.y1); for (var k = 1; k < 6; k++) c.lineTo(z.x1 + (z.x2 - z.x1) * k / 6 + (Math.random() - .5) * 14, z.y1 + (z.y2 - z.y1) * k / 6 + (Math.random() - .5) * 14); c.lineTo(z.x2, z.y2); c.stroke(); });
      drawBase(c);
      S.parts.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 2.5); if (q.ring) { c.strokeStyle = q.col; c.lineWidth = 5; c.beginPath(); c.arc(q.x, q.y, q.ring * (1.2 - q.t * 2), 0, 6.29); c.stroke(); } else { c.fillStyle = q.col; c.fillRect(q.x - 2.5, q.y - 2.5, 5, 5); } }); c.globalAlpha = 1;
      c.restore();
      if (S.flash > 0) { c.fillStyle = "rgba(255,255,255," + S.flash + ")"; c.fillRect(0, 0, W, H); }
      // HUD
      // HUD lives in the base strip at the bottom so the battlefield stays clear
      T(c, "Mission " + S.M.m, 108, H - 44, 14, "#fff"); T(c, S.wi >= 0 && S.wi < S.M.waves.length ? (S.M.waves[S.wi].boss ? "BOSS" : "Wave " + (S.wi + 1) + "/" + S.M.waves.length) : "", 108, H - 24, 12, "#9fb3d1");
      c.fillStyle = "rgba(0,0,0,.55)"; rr(c, 160, H - 26, 160, 18, 9); c.fill(); var hf = S.hp / maxHP(); c.fillStyle = hf > .5 ? "#39ff88" : hf > .25 ? "#ffd23f" : "#ff5a3c"; rr(c, 160, H - 26, Math.max(10, 160 * hf), 18, 9); c.fill();
      T(c, "🛡 " + Math.ceil(S.hp) + " / " + maxHP(), 240, H - 16, 12, "#04121f");
      T(c, "🪙 " + S.coins, 410, H - 44, 15, "#ffd23f");
      var boss = S.en.filter(function (e) { return e.type === "boss"; })[0];
      if (boss) { T(c, boss.b.n, W / 2, 60, 14, boss.b.col); c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(60, 70, 360, 10); c.fillStyle = boss.b.col; c.fillRect(60, 70, 360 * Math.max(0, boss.hp / boss.max), 10); }
      T(c, S.wp.n, 410, H - 22, 13, S.wp.col);
      if (S.waveT > 0 && S.banner && S.scr === "play") { c.globalAlpha = Math.min(1, S.waveT * 2); T(c, S.banner, W / 2, 300, 32, S.banner.indexOf("BOSS") >= 0 ? "#ff5a3c" : "#fff"); c.globalAlpha = 1; if (S.wi === 0 && S.M.m <= 2) T(c, "Drag to aim · hold or tap to fire", W / 2, 345, 16, "#9fb3d1"); }
      S.pops.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 2); T(c, q.s, q.x, q.y, q.size, q.col); }); c.globalAlpha = 1;
      if (S.scr === "result") {
        c.fillStyle = "rgba(5,7,13,.6)"; c.fillRect(0, 0, W, H); panel(c, 60, 180, 360, 450, S.res.win ? "#39ff88" : "#ff5a5f");
        if (S.res.win) { T(c, "Mission " + S.M.m + " complete!", W / 2, 226, 26, "#fff"); stars3(c, W / 2, 290, S.res.stars, 26); T(c, "Coins earned 🪙 " + S.coins + " (bonus " + S.res.bonus + ")", W / 2, 350, 16, "#ffd23f"); T(c, "Kills " + S.kills + " · Base " + Math.ceil(S.hp) + " HP", W / 2, 384, 15, "#9fb3d1"); }
        else { T(c, "Base destroyed!", W / 2, 236, 30, "#ff7a7a"); T(c, "Coins kept 🪙 " + S.coins, W / 2, 300, 17, "#ffd23f"); T(c, "Upgrade armour or weapons in the Armoury", W / 2, 340, 14, "#9fb3d1"); }
      }
      drawUI(c, S.ui);
    } else {
      if (S.scr === "menu") {
        T(c, "MINI SOLDIER", W / 2, 140, 46, "#39ff88", "center", "900"); T(c, "STRIKE", W / 2, 196, 52, "#ffd23f", "center", "900");
        drawEnemy(c, { type: "drone", x: 120 + Math.sin(S.t) * 30, y: 270, r: 16, ph: S.t, hp: 1, max: 1 }); drawEnemy(c, { type: "robot", x: 360, y: 275, r: 20, ph: S.t, hp: 1, max: 1 });
        T(c, "🪙 " + save.coins + "  ·  Missions " + doneCount() + "/40  ·  " + (WEAPONS[save.wpn] || WEAPONS[0]).n, W / 2, 600, 15, "#9fb3d1");
      } else if (S.scr === "missions") { T(c, "Missions", W / 2, 72, 30, "#fff"); T(c, "☠ = boss mission", W / 2, 106, 14, "#ff7a7a"); }
      else if (S.scr === "armoury") { T(c, "Armoury", W / 2, 70, 28, "#fff"); T(c, "🪙 " + save.coins, W / 2, 94, 15, "#ffd23f"); }
      S.pops.forEach(function (q) { c.globalAlpha = Math.min(1, q.t * 2); T(c, q.s, q.x, q.y, q.size, q.col); }); c.globalAlpha = 1;
      drawUI(c, S.ui);
    }
  }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, touch: true, hint: "Drag to aim, tap or hold to fire. ← → aim and Space fires on keyboard." });
  window.GV6 = { S: function () { return S; }, start: function (n) { start(n); }, save: function () { return save; }, mission: mission }; // debug hook used by automated tests
})();
