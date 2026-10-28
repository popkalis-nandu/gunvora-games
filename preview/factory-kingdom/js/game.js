/* Factory Kingdom 250 · GUNVORA GAMES — 250 levels across six eras (1–50 free, 51–250 premium preview).
   Simulation + HUD in plain JS. The 3D renderer (js/scene3d.js, three.js) attaches through window.FK_INT;
   if WebGL is unavailable the original 2D canvas renderer is used as a fallback. */
(function () {
  "use strict";
  var D = FK_DATA;
  var $ = function (id) { return document.getElementById(id); };
  var Q = new URLSearchParams(location.search);
  var SPEED = Math.max(0.1, +Q.get("speed") || 1);
  var W = 400, H = 380;                       // logical scene size
  var ROWS = [150, 240], COLS = [105, 195, 285];
  var SLOTS = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [2, 1]].map(function (s) { return { x: COLS[s[0]], y: ROWS[s[1]] }; });
  var SHELF_X = 332, DOCK_X = 345, ROAD_Y = 344;
  var EXPORTERS = ["Dubai Retail LLC", "Tokyo Mart", "Berlin Haus GmbH", "Lagos Traders", "Sydney Supply Co.", "Toronto Goods", "Paris Maison", "Singapore Hub Pte", "Nairobi Wholesale", "Seoul Living", "Riyadh Markets", "Chicago Depot"];
  var CUSTOMERS = ["Sharma Toys", "City Mart", "Kids Corner", "Green Home", "Metro Stores", "Bharat Traders", "Sunrise Retail", "Happy Kids Co.", "Lotus Furnishing", "Royal Bazaar", "Star Hardware", "Ganga Supplies"];
  var AVATAR = ["#f97316", "#4f46e5", "#059669", "#db2777", "#0891b2", "#ca8a04"];

  var S, T = 0, tab = "orders", uiDirty = true, lastPanel = "", pointerDown = false, modalOpen = false;
  var floats = [], parts = [], belt = [], fxParts = [];
  var R3 = null, frameDt = 0.016;
  function fire(kind, d) { if (R3) try { R3.fx(kind, d); } catch (e) {} }

  /* ---------------- state ---------------- */
  function newMachine(id) { return { id: id, tier: 0, product: "toy", on: false, cyc: false, manual: false, prog: 0, cond: 100, broken: false, repair: 0, out: [], claim: null, fixer: null, shake: 0 }; }
  function newWorker(i) {
    return { id: i, name: D.workerNames[i % D.workerNames.length], shirt: D.shirts[i % D.shirts.length], job: "carrier",
      x: 300 + (i % 3) * 10, y: ROWS[0] + 40, tx: null, ty: null, st: "idle", carry: null, tgt: null, walk: 0 };
  }
  function fresh() {
    var s = { v: 1, level: 1, coins: 100, raw: { wood: 12 }, goods: {},
      machines: [newMachine(0)], workers: [newWorker(0), newWorker(1)], space: 0, conveyor: false, vehicle: 0,
      orders: [], nextOrder: 3, seq: 1, deliveries: [], lv: freshLv(),
      stats: { produced: 0, wasted: 0, orders: 0, missed: 0, earned: 0, breakdowns: 0 },
      tut: 0, allDone: false, sound: true, pendingLevelUp: false, time: 0 };
    s.workers[0].job = 0;
    return normalize(s);
  }
  // fills fields added after the first release so old saves keep working
  function normalize(s) {
    Object.keys(D.raws).forEach(function (k) { if (typeof s.raw[k] !== "number") s.raw[k] = 0; });
    Object.keys(D.products).forEach(function (k) { if (typeof s.goods[k] !== "number") s.goods[k] = 0; });
    if (s.fleet == null) s.fleet = 0;
    if (!s.fac) s.fac = {};
    if (s.plants == null) s.plants = 0;
    if (s.hubs == null) s.hubs = 0;
    if (s.plantT == null) s.plantT = 0;
    if (s.premium == null) { try { s.premium = localStorage.getItem("gunvora_fk_tester_premium") === "1"; } catch (e) { s.premium = false; } }
    if (s.gate == null) s.gate = false;
    if (s.lv && s.lv.exports == null) s.lv.exports = 0;
    if (s.stats && s.stats.exports == null) s.stats.exports = 0;
    if (s.allDone && s.level < D.maxLevel && s.level >= 10 && !s.done250) { s.allDone = false; s.pendingLevelUp = true; }  // prototype "all done" at 10 → continue
    (s.deliveries || []).forEach(function (d) { if (d.ex == null) d.ex = false; });
    return s;
  }
  function freshLv() { return { orders: 0, earned: 0, produced: {}, total: 0, exports: 0 }; }
  function load() {
    try {
      var raw = localStorage.getItem(D.saveKey), migrated = false;
      if (!raw && D.oldSaveKey) { raw = localStorage.getItem(D.oldSaveKey); migrated = !!raw; }   // carry progress over from the 2D prototype
      var s = JSON.parse(raw || "null");
      if (s && s.v === 1) {
        // migrate transient items (carried / on belt) back to the shelf
        s.workers.forEach(function (w) { if (w.carry) { s.goods[w.carry]++; w.carry = null; } w.st = "idle"; w.tgt = null; w.tx = null; });
        (s.belt || []).forEach(function (b) { s.goods[b.p]++; }); delete s.belt;
        s.machines.forEach(function (m) { m.claim = null; m.fixer = null; });
        s.workers.forEach(function (w) { w.path = null; w.pk = null; w.shY = null; });
        normalize(s);
        if (migrated) { try { localStorage.setItem(D.saveKey, JSON.stringify(s)); } catch (e) {} }
        return s;
      }
    } catch (e) {}
    return null;
  }
  function save() { try { var c = JSON.parse(JSON.stringify(S)); c.belt = belt.map(function (b) { return { p: b.p }; }); localStorage.setItem(D.saveKey, JSON.stringify(c)); } catch (e) {} }

  /* ---------------- helpers ---------------- */
  function L() { return D.levels[Math.min(S.level, D.maxLevel) - 1]; }
  function fleetV() { return D.fleet[S.fleet]; }
  function has(f) { return f === "conveyor" ? S.conveyor : !!S.fac[f]; }
  function vehTime(v) { return v.time * (S.fac.autoDock ? 0.75 : 1); }
  function passiveRate() { return (S.fac.solarRoof ? D.estReward(S.level) * 0.004 : 0) + S.hubs * D.estReward(S.level) * 0.003; }
  function space() { return D.spaces[S.space]; }
  function veh() { return D.vehicles[S.vehicle]; }
  function tierOf(m) { return D.tiers[m.tier]; }
  function staffed(m) { for (var i = 0; i < S.workers.length; i++) if (S.workers[i].job === m.id) return S.workers[i]; return null; }
  function unlockedProducts() { return Object.keys(D.products).filter(function (k) { return D.products[k].unlock <= S.level; }); }
  function unlockedRaws() { var r = {}; unlockedProducts().forEach(function (p) { r[D.products[p].raw] = 1; }); return Object.keys(r); }
  function cycleTime(m) { return D.products[m.product].time * tierOf(m).speed * (staffed(m) ? 1 : 1.3); }
  function sumObj(o) { var t = 0; for (var k in o) t += o[k]; return t; }
  function rawTotal() { return sumObj(S.raw); }
  function goodsTotal() { return sumObj(S.goods); }
  function pending() {
    var n = belt.length;
    S.machines.forEach(function (m) { n += m.out.length + (m.cyc ? 1 : 0); });
    S.workers.forEach(function (w) { if (w.carry) n++; });
    return n;
  }
  function fmt(n) { return Math.floor(n).toLocaleString("en-IN"); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function machineCost() { return D.machineCost[S.machines.length] || 99999; }
  function hireCost() { return D.hireCost(S.workers.length); }

  /* ---------------- sound ---------------- */
  var AC = null, userGestured = false;
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { userGestured = true; if (AC && AC.state === "suspended") AC.resume(); }, { capture: true, passive: true });
  });
  function beep(f, d, type, vol, slide) {
    if (!S || !S.sound || !userGestured) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
    } catch (e) {}
  }
  var sfx = {
    tap: function () { beep(520, 0.06, "square", 0.04); },
    coin: function () { beep(880, 0.08, "square", 0.05); setTimeout(function () { beep(1320, 0.12, "square", 0.05); }, 70); },
    made: function () { beep(660, 0.05, "triangle", 0.05); },
    bad: function () { beep(200, 0.25, "sawtooth", 0.05, 90); },
    buy: function () { beep(440, 0.08, "triangle", 0.07); setTimeout(function () { beep(660, 0.1, "triangle", 0.07); }, 80); },
    level: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { beep(f, 0.22, "triangle", 0.08); }, i * 120); }); }
  };

  /* ---------------- toasts & floats ---------------- */
  function toast(msg, cls) {
    var t = document.createElement("div"); t.className = "toast " + (cls || ""); t.textContent = msg;
    var box = $("toasts"); box.appendChild(t);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }
  function float(text, x, y, color) { floats.push({ t: text, x: x, y: y, y0: y, life: 1.2, c: color || "#fff" }); }
  function bumpCoins() { var b = $("sCoins"); b.classList.add("bump"); setTimeout(function () { b.classList.remove("bump"); }, 180); }

  /* ---------------- actions (used by UI and tests) ---------------- */
  var A = {
    buyRaw: function (r, n) {
      var c = D.raws[r].cost * n;
      if (S.coins < c) return toast("Not enough coins", "bad");
      if (rawTotal() + n > space().raw) return toast("Raw storage full (" + space().raw + ")", "bad");
      S.coins -= c; S.raw[r] += n; sfx.buy(); float("+" + n + " " + D.raws[r].name.toLowerCase(), 40, 140, "#fde68a"); fire("buyRaw", { r: r, n: n }); uiDirty = true; return true;
    },
    toggle: function (id) { var m = S.machines[id]; m.on = !m.on; sfx.tap(); uiDirty = true; return true; },
    setProduct: function (id, p) { var m = S.machines[id]; if (m.cyc) return toast("Wait for the current item to finish", "bad"); m.product = p; uiDirty = true; return true; },
    service: function (id) {
      var m = S.machines[id]; if (m.broken) return A.repair(id);
      if (S.coins < D.serviceCost) return toast("Not enough coins", "bad");
      S.coins -= D.serviceCost; m.cond = 100; sfx.buy(); float("🔧 100%", SLOTS[id].x, SLOTS[id].y - 40, "#bbf7d0"); uiDirty = true; return true;
    },
    repair: function (id) {
      var m = S.machines[id]; if (!m.broken || m.repair > 0) return false;
      if (S.coins < D.repairCost) return toast("Need " + D.repairCost + " coins to repair", "bad");
      S.coins -= D.repairCost; m.repair = D.repairTime; sfx.buy(); uiDirty = true; return true;
    },
    upgradeMachine: function (id) {
      var m = S.machines[id], nt = D.tiers[m.tier + 1]; if (!nt) return false;
      if (nt.unlock > S.level) return toast(nt.short + " unlocks at Level " + nt.unlock, "bad");
      if (S.coins < nt.upCost) return toast("Not enough coins", "bad");
      S.coins -= nt.upCost; m.tier++; m.cond = 100; sfx.level(); burst(SLOTS[id].x, SLOTS[id].y, 24);
      toast("M" + (id + 1) + " upgraded to " + nt.name + "!", "good"); uiDirty = true; return true;
    },
    buyMachine: function () {
      if (S.level < 3) return toast("Buying machines unlocks at Level 3", "bad");
      if (S.machines.length >= space().slots) return toast("No room! Expand your factory space", "bad");
      var c = machineCost(); if (S.coins < c) return toast("Not enough coins", "bad");
      S.coins -= c; var m = newMachine(S.machines.length); var up = unlockedProducts(); m.product = up[up.length - 1]; m.on = true; S.machines.push(m);
      var carriers = S.workers.filter(function (w) { return w.job === "carrier"; });
      if (carriers.length > (S.conveyor ? 0 : 1)) { var cw = carriers[carriers.length - 1]; dropCarry(cw); cw.job = m.id; cw.st = "idle"; }
      sfx.level(); burst(SLOTS[m.id].x, SLOTS[m.id].y, 30); toast("New machine M" + (m.id + 1) + " installed!", "good"); uiDirty = true; return true;
    },
    hire: function () {
      if (S.level < 2) return toast("Hiring unlocks at Level 2", "bad");
      if (S.workers.length >= space().workers) return toast("No room for more workers. Expand space", "bad");
      var c = hireCost(); if (S.coins < c) return toast("Not enough coins", "bad");
      S.coins -= c; var w = newWorker(S.workers.length); w.x = 20; w.y = ROWS[0] + 40;
      var free = S.machines.filter(function (m) { return !staffed(m); })[0];
      w.job = free ? free.id : "carrier"; S.workers.push(w);
      sfx.buy(); toast(w.name + " joined as " + (free ? "operator on M" + (free.id + 1) : "carrier"), "good"); uiDirty = true; return true;
    },
    assign: function (wid, job) {
      var w = S.workers[wid]; job = job === "carrier" ? "carrier" : +job;
      if (job !== "carrier") S.workers.forEach(function (o) { if (o !== w && o.job === job) { o.job = w.job; o.st = "idle"; } }); // swap
      dropCarry(w); w.job = job; w.st = "idle"; w.tgt = null; uiDirty = true; return true;
    },
    expand: function () {
      var n = D.spaces[S.space + 1]; if (!n) return false;
      if (n.unlock > S.level) return toast(n.name + " unlocks at Level " + n.unlock, "bad");
      if (S.coins < n.cost) return toast("Not enough coins", "bad");
      S.coins -= n.cost; S.space++; sfx.level(); confetti(80); toast("Expanded to " + n.name + "!", "good"); uiDirty = true; return true;
    },
    conveyor: function () {
      if (S.conveyor) return false;
      if (D.conveyor.unlock > S.level) return toast("Conveyor belts unlock at Level " + D.conveyor.unlock, "bad");
      if (S.coins < D.conveyor.cost) return toast("Not enough coins", "bad");
      S.coins -= D.conveyor.cost; S.conveyor = true;
      S.machines.forEach(function (m) { m.out.forEach(function (p) { belt.push({ p: p, x: SLOTS[m.id].x + 30, y: SLOTS[m.id].y + 28 }); }); m.out = []; m.claim = null; });
      sfx.level(); confetti(50); toast("Conveyor belts installed! Spare workers now do maintenance", "good"); uiDirty = true; return true;
    },
    vehicle: function () {
      var n = D.vehicles[S.vehicle + 1]; if (!n) return false;
      if (n.unlock > S.level) return toast(n.name + " unlocks at Level " + n.unlock, "bad");
      if (S.coins < n.cost) return toast("Not enough coins", "bad");
      S.coins -= n.cost; S.vehicle++; sfx.level(); confetti(50); toast(n.name + " ready at the dock!", "good"); uiDirty = true; return true;
    },
    ship: function (oid) {
      var o = S.orders.filter(function (x) { return x.id === oid; })[0]; if (!o) return false;
      if (S.goods[o.p] < o.q) return toast("Need " + (o.q - S.goods[o.p]) + " more " + D.products[o.p].name + "s", "bad");
      var v = o.ex ? fleetV() : veh(), busy = S.deliveries.filter(function (d) { return d.ex === !!o.ex; });
      if (o.ex && !S.fleet) return toast("Buy an export fleet first", "bad");
      if (busy.length >= v.trips) return toast((o.ex ? "Export fleet" : "Vehicle") + " is out on a delivery", "bad");
      S.goods[o.p] -= o.q; S.orders.splice(S.orders.indexOf(o), 1);
      var rew = Math.round(o.reward * (1 + v.bonus) * (S.fac.printLine ? 1.15 : 1)), used = busy.map(function (d) { return d.slot; }), slot = 0;
      while (used.indexOf(slot) >= 0) slot++;
      S.deliveries.push({ id: o.id, cust: o.cust, p: o.p, q: o.q, reward: rew, t: 0, dur: vehTime(v), slot: slot, ex: !!o.ex, kind: o.ex ? S.fleet : S.vehicle });
      sfx.tap(); toast((o.ex ? "Exported to " : "Shipped to ") + o.cust + (o.ex ? [" 🚆", " 🚆", " 🚢", " ✈️"][S.fleet] : " 🚚"), "good"); fire("ship", { ex: !!o.ex }); uiDirty = true; return true;
    },
    sell: function (p, n) {   // clear surplus stock to a wholesaler at a discount
      n = Math.min(n || S.goods[p], S.goods[p]); if (n <= 0) return false;
      var c = Math.round(n * D.products[p].value * D.sellRate);
      S.goods[p] -= n; S.coins += c; S.stats.earned += c; sfx.coin(); bumpCoins(); toast("Sold " + n + "× " + D.products[p].name + " wholesale · +" + fmt(c), "good"); fire("coins", { x: SHELF_X, y: 200, n: 5 }); uiDirty = true; return true;
    },
    fleet: function () {
      var n = D.fleet[S.fleet + 1]; if (!n) return false;
      if (n.unlock > S.level) return toast(n.name + " unlocks at Level " + n.unlock, "bad");
      if (S.coins < n.cost) return toast("Not enough coins", "bad");
      S.coins -= n.cost; S.fleet++; sfx.level(); fire("celebrate", { k: "fleet" }); toast(n.name + " ready for export orders!", "good"); uiDirty = true; return true;
    },
    facility: function (k) {
      var f = D.facilities[k]; if (!f || S.fac[k]) return false;
      if (f.unlock > S.level) return toast(f.name + " unlocks at Level " + f.unlock, "bad");
      if (S.coins < f.cost) return toast("Not enough coins", "bad");
      S.coins -= f.cost; S.fac[k] = true; sfx.level(); fire("build", { k: k }); toast(f.name + " built!", "good"); uiDirty = true; return true;
    },
    plant: function () {
      if (D.plants.unlock > S.level) return toast("Satellite factories unlock at Level " + D.plants.unlock, "bad");
      if (S.plants >= D.plants.max) return false;
      var c = D.plants.cost(S.plants); if (S.coins < c) return toast("Not enough coins", "bad");
      S.coins -= c; S.plants++; sfx.level(); fire("build", { k: "plant" }); toast(D.plants.names[S.plants - 1] + " opened!", "good"); uiDirty = true; return true;
    },
    hub: function () {
      if (D.hubs.unlock > S.level) return toast("Global hubs unlock at Level " + D.hubs.unlock, "bad");
      if (S.hubs >= D.hubs.max) return false;
      var c = D.hubs.cost(S.hubs); if (S.coins < c) return toast("Not enough coins", "bad");
      S.coins -= c; S.hubs++; sfx.level(); fire("build", { k: "hub" }); toast(D.hubs.names[S.hubs - 1] + " opened!", "good"); uiDirty = true; return true;
    },
    premium: function (on) {
      S.premium = !!on; try { localStorage.setItem("gunvora_fk_tester_premium", on ? "1" : "0"); } catch (e) {}
      if (on && S.gate) { S.gate = false; S.level++; S.lv = freshLv(); S.nextOrder = Math.min(S.nextOrder, 3); toast("Premium unlocked (tester) · Level " + S.level, "good"); }
      uiDirty = true; save(); return true;
    }
  };
  function dropCarry(w) {
    if (w.carry) { S.goods[w.carry]++; w.carry = null; }
    if (w.tgt != null && S.machines[w.tgt]) { if (S.machines[w.tgt].claim === w.id) S.machines[w.tgt].claim = null; if (S.machines[w.tgt].fixer === w.id) S.machines[w.tgt].fixer = null; }
  }

  /* ---------------- simulation ---------------- */
  function genOrder() {
    var n = S.level, ps = n <= 10 ? unlockedProducts() : D.demandAt(n);
    var p = ps.length > 1 && Math.random() < 0.45 ? ps[ps.length - 1] : ps[ri(0, ps.length - 1)];
    var P = D.products[p];
    var q = ri(2, D.orderQtyMax(n)); if (P.time >= 5.5) q = Math.max(2, q - 1);
    var ex = S.fleet > 0 && S.orders.filter(function (o) { return o.ex; }).length < 2 && Math.random() < 0.4;
    if (ex) q = Math.round(q * 1.6);
    var spd = 0; S.machines.forEach(function (m) { spd += 1 / D.tiers[m.tier].speed; });
    var est = q * P.time / Math.max(1, spd * 0.6);
    var dl = Math.round(est * 2.2 + 40) * (ex ? 1.8 : 1);
    var rew = q * P.value * D.levelMult(n) * (ex ? 2.2 * (1 + 0.1 * S.hubs) : 1);
    S.orders.push({ id: S.seq++, cust: ex ? EXPORTERS[ri(0, EXPORTERS.length - 1)] : CUSTOMERS[ri(0, CUSTOMERS.length - 1)], av: ri(0, AVATAR.length - 1), p: p, q: q,
      reward: Math.round(rew), dl: Math.round(dl), dl0: Math.round(dl), ex: ex });
    uiDirty = true;
  }

  function step(dt) {
    S.time += dt;
    S.nextOrder -= dt;
    if (S.nextOrder <= 0) { if (S.orders.length < L().maxOrders) { genOrder(); if (S.time > 5) beep(990, 0.07, "sine", 0.04); } S.nextOrder = L().orderEvery * rnd(0.8, 1.2); }
    for (var i = S.orders.length - 1; i >= 0; i--) {
      var o = S.orders[i]; o.dl -= dt;
      if (o.dl <= 0) { S.orders.splice(i, 1); S.stats.missed++; toast("⏰ Order from " + o.cust + " expired", "bad"); sfx.bad(); uiDirty = true; }
    }
    for (i = S.deliveries.length - 1; i >= 0; i--) {
      var d = S.deliveries[i]; d.t += dt;
      if (d.t >= d.dur) {
        S.deliveries.splice(i, 1); S.coins += d.reward; S.lv.earned += d.reward; S.lv.orders++; S.stats.orders++; S.stats.earned += d.reward;
        if (d.ex) { S.lv.exports++; S.stats.exports++; }
        float("+" + fmt(d.reward), DOCK_X, ROAD_Y - 30, "#fde68a"); if (R3) fire("coins", { x: DOCK_X, y: ROAD_Y - 10, n: 10, ex: d.ex }); else coinFly(DOCK_X, ROAD_Y - 10, 8); sfx.coin(); bumpCoins();
        toast("💰 " + d.cust + " paid " + d.reward + " coins", "good"); uiDirty = true;
      }
    }
    if (S.plants) {   // satellite factories send finished goods by shuttle
      S.plantT += dt * S.plants;
      while (S.plantT >= D.plants.every) {
        S.plantT -= D.plants.every;
        var dm = D.demandAt(S.level), pp = dm[ri(0, dm.length - 1)];
        if (goodsTotal() + pending() < space().goods) { S.goods[pp]++; S.lv.produced[pp] = (S.lv.produced[pp] || 0) + 1; S.lv.total++; S.stats.produced++; fire("plant", { p: pp }); uiDirty = true; }
      }
    }
    var pr = passiveRate(); if (pr) { S.coins += pr * dt; }
    S.machines.forEach(function (m) {
      var tr = tierOf(m), P = D.products[m.product], op = staffed(m);
      if (m.shake > 0) m.shake -= dt;
      if (m.broken) {
        if (m.repair > 0) { m.repair -= dt; if (m.repair <= 0) fixed(m); }
        if (Math.random() < dt * 4) parts.push({ x: SLOTS[m.id].x + rnd(-10, 10), y: SLOTS[m.id].y - 30, vx: rnd(-6, 6), vy: -rnd(15, 30), life: 1.6, k: "smoke", r: rnd(4, 8) });
        return;
      }
      if (m.cyc) {
        m.prog += dt / cycleTime(m);
        if (Math.random() < dt * 3 && m.tier >= 2) parts.push({ x: SLOTS[m.id].x + rnd(-12, 12), y: SLOTS[m.id].y - 6, vx: rnd(-30, 30), vy: -rnd(20, 50), life: 0.4, k: "spark" });
        if (m.prog >= 1) finish(m, tr, P);
      } else if (op && m.on && op.st === "op") {
        if (canStart(m)) start(m);
      }
    });
    for (i = belt.length - 1; i >= 0; i--) {
      var b = belt[i]; b.x += 55 * dt;
      if (b.x >= SHELF_X - 8) { belt.splice(i, 1); S.goods[b.p]++; uiDirty = true; }
    }
    S.workers.forEach(function (w) { workerStep(w, dt); });
    floats.forEach(function (f) { f.life -= dt; f.y -= 22 * dt; }); floats = floats.filter(function (f) { return f.life > 0; });
    parts.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === "spark") p.vy += 160 * dt; }); parts = parts.filter(function (p) { return p.life > 0; });
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    checkLevel();
  }
  function canStart(m) {
    var P = D.products[m.product];
    if (P.needs && !has(P.needs)) return false;
    if (S.raw[P.raw] < P.rawQty) return false;
    if (!S.conveyor && m.out.length >= 3) return false;
    if (goodsTotal() + pending() >= space().goods) return false;
    return true;
  }
  function blockReason(m) {
    var P = D.products[m.product];
    if (m.broken) return m.repair > 0 ? "Repairing…" : "Broken! Tap to repair";
    if (m.cyc) return "Making " + P.name;
    if (P.needs && !has(P.needs)) return "Needs the " + D.facilities[P.needs].name;
    if (S.raw[P.raw] < P.rawQty) return "No " + D.raws[P.raw].name.toLowerCase() + "! Buy in Inventory";
    if (!S.conveyor && m.out.length >= 3) return "Output tray full, needs a carrier";
    if (goodsTotal() + pending() >= space().goods) return "Shelf full, ship some orders";
    if (!staffed(m)) return "No operator · tap to run once";
    if (!m.on) return "Switched off · tap to start";
    return "Operator on the way";
  }
  function start(m, manual) {
    var P = D.products[m.product]; S.raw[P.raw] -= P.rawQty; m.cyc = true; m.manual = !!manual; m.prog = 0; uiDirty = true;
  }
  function finish(m, tr, P) {
    m.cyc = false; m.prog = 0;
    var x = SLOTS[m.id].x, y = SLOTS[m.id].y;
    var q = tr.quality * (0.75 + 0.25 * Math.min(1, m.cond / 60));   // worn machines make more scrap
    if (Math.random() < q) {
      if (S.conveyor) belt.push({ p: m.product, x: x + 30, y: y + 28 }); else m.out.push(m.product);
      S.lv.produced[m.product] = (S.lv.produced[m.product] || 0) + 1; S.lv.total++; S.stats.produced++;
      if (!R3 || S.machines.length <= 3) float("+1 " + P.name, x, y - 40, "#fff"); else if (Math.random() < 0.25) float("+1 " + P.icon, x, y - 40, "#fff"); sfx.made(); fire("finish", { id: m.id, ok: true });
    } else {
      S.stats.wasted++; float("✖ scrap", x, y - 40, "#fca5a5"); fire("finish", { id: m.id, ok: false });
      for (var i = 0; i < 6; i++) parts.push({ x: x, y: y - 10, vx: rnd(-40, 40), vy: -rnd(30, 70), life: 0.6, k: "scrap" });
    }
    m.cond = Math.max(0, m.cond - tr.wear * rnd(0.8, 1.2) * (S.fac.smart ? 0.5 : 1));
    if (m.cond < 45 && Math.random() < (45 - m.cond) / 45 * 0.5 || m.cond <= 0) {
      m.broken = true; m.shake = 0.6; S.stats.breakdowns++; sfx.bad(); fire("break", { id: m.id });
      toast("💥 M" + (m.id + 1) + " broke down! Tap it to repair", "bad");
    }
    uiDirty = true;
  }
  function fixed(m) { m.broken = false; m.repair = 0; m.cond = 100; if (m.fixer != null && S.workers[m.fixer]) S.workers[m.fixer].st = "idle"; m.fixer = null; sfx.buy(); float("✔ Fixed", SLOTS[m.id].x, SLOTS[m.id].y - 40, "#bbf7d0"); fire("fixed", { id: m.id }); uiDirty = true; }

  // Workers walk along aisles so they never pass through machines (3D needs this).
  var WALK = 62;
  function blocked(x0, y0, x1, y1) {
    for (var i = 0; i < S.machines.length; i++) {
      var s = SLOTS[i], rx0 = s.x - 31, rx1 = s.x + 31, ry0 = s.y - 24, ry1 = s.y + 21;
      // segment vs rectangle (Liang-Barsky)
      var t0 = 0, t1 = 1, dx = x1 - x0, dy = y1 - y0, p = [-dx, dx, -dy, dy], q = [x0 - rx0, rx1 - x0, y0 - ry0, ry1 - y0], ok = true;
      for (var k = 0; k < 4; k++) {
        if (p[k] === 0) { if (q[k] < 0) { ok = false; break; } }
        else { var r = q[k] / p[k]; if (p[k] < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } }
      }
      if (ok && t1 - t0 > 1e-3) return true;
    }
    return false;
  }
  function plan(x0, y0, x1, y1) {
    if (!blocked(x0, y0, x1, y1)) return [[x1, y1]];
    var cys = S.space ? [106, 198, 282] : [106, 194], cxs = [60, 150, 240, 322], best = null, bl = 1e9;
    function tryPath(pts) {
      var px = x0, py = y0, L = 0;
      for (var i = 0; i < pts.length; i++) { if (blocked(px, py, pts[i][0], pts[i][1])) return; L += Math.abs(pts[i][0] - px) + Math.abs(pts[i][1] - py); px = pts[i][0]; py = pts[i][1]; }
      if (L < bl) { bl = L; best = pts; }
    }
    cys.forEach(function (cy) { tryPath([[x0, cy], [x1, cy], [x1, y1]]); });
    cxs.forEach(function (cx) { tryPath([[cx, y0], [cx, y1], [x1, y1]]); });
    cxs.forEach(function (cx) { cys.forEach(function (cy) { tryPath([[cx, y0], [cx, cy], [x1, cy], [x1, y1]]); tryPath([[x0, cy], [cx, cy], [cx, y1], [x1, y1]]); }); });
    return best || [[x1, y1]];
  }
  function walkTo(w, x, y, dt) {
    var key = x + "," + y + "," + S.machines.length;
    if (w.pk !== key || !w.path) { w.path = plan(w.x, w.y, x, y); w.pk = key; }
    var sp = WALK * dt * (S.fac.agv ? 1.7 : 1);
    while (w.path.length) {
      var t = w.path[0], dx = t[0] - w.x, dy = t[1] - w.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= sp) { w.x = t[0]; w.y = t[1]; sp -= d; w.path.shift(); if (d > 0) w.moving = true; continue; }
      w.x += dx / d * sp; w.y += dy / d * sp; w.walk += dt * 10; w.moving = true; return false;
    }
    w.path = null; w.pk = null; return true;
  }
  function workerStep(w, dt) {
    w.moving = false;
    if (w.job !== "carrier") {
      var m = S.machines[w.job]; if (!m) { w.job = "carrier"; return; }
      w.st = walkTo(w, SLOTS[m.id].x - 4, SLOTS[m.id].y - 36, dt) ? "op" : "away";
      return;
    }
    var restY = ROWS[S.space ? 1 : 0] + 40, restX = SHELF_X - 22 - (w.id % 3) * 12;
    switch (w.st) {
      case "op": case "away": w.st = "idle"; break;
      case "idle":
        var job = null;
        if (!S.conveyor) S.machines.forEach(function (m) { if (!job && m.out.length && m.claim == null) job = m; });
        if (job) { job.claim = w.id; w.tgt = job.id; w.st = "toM"; break; }
        S.machines.forEach(function (m) { if (!job && m.broken && m.fixer == null) job = m; });
        if (!job) { var worst = null; S.machines.forEach(function (m) { if (!m.broken && m.cond < 70 && m.fixer == null && (!worst || m.cond < worst.cond)) worst = m; }); job = worst; }
        if (job) { job.fixer = w.id; w.tgt = job.id; w.st = "toFix"; break; }
        walkTo(w, restX, restY, dt);
        break;
      case "toM":
        var m1 = S.machines[w.tgt];
        if (walkTo(w, SLOTS[m1.id].x + 36, SLOTS[m1.id].y + 30, dt)) {
          if (m1.out.length) { w.carry = m1.out.shift(); w.st = "toShelf"; } else w.st = "idle";
          m1.claim = null; uiDirty = true;
        }
        break;
      case "toShelf":
        if (w.shY == null) w.shY = Math.min(Math.max(w.y, ROWS[0] - 10), ROWS[S.space ? 1 : 0] + 30);
        if (walkTo(w, SHELF_X - 10, w.shY, dt)) {
          S.goods[w.carry]++; w.carry = null; w.st = "idle"; w.shY = null; uiDirty = true;
        }
        break;
      case "toFix":
        var m2 = S.machines[w.tgt];
        if (m2.fixer !== w.id) { w.st = "idle"; break; }
        if (walkTo(w, SLOTS[m2.id].x + 38, SLOTS[m2.id].y - 4, dt)) w.st = "fix";
        break;
      case "fix":
        var m3 = S.machines[w.tgt];
        if (m3.fixer !== w.id) { w.st = "idle"; break; }
        w.x = SLOTS[m3.id].x + 38; w.y = SLOTS[m3.id].y - 4;
        if (m3.broken) { if (m3.repair <= 0) m3.repair = D.repairTime * 2; }   // free repair, slower than paid
        else { m3.cond = Math.min(100, m3.cond + 9 * dt); if (m3.cond >= 100) { m3.fixer = null; w.st = "idle"; uiDirty = true; } }
        if (!R3 && Math.random() < dt * 4) parts.push({ x: w.x + 6, y: w.y - 14, vx: rnd(-30, 30), vy: -rnd(20, 50), life: 0.35, k: "spark" });
        if (!S.conveyor && !m3.broken && S.machines.some(function (m) { return m.out.length >= 2 && m.claim == null; })) { m3.fixer = null; w.st = "idle"; }
        break;
    }
  }

  /* ---------------- levels ---------------- */
  function goalProg(g) {
    switch (g.t) {
      case "produce": return [g.p ? (S.lv.produced[g.p] || 0) : S.lv.total, g.n];
      case "orders": return [S.lv.orders, g.n];
      case "earn": return [S.lv.earned, g.n];
      case "machines": return [S.machines.length, g.n];
      case "workers": return [S.workers.length, g.n];
      case "tier": return [S.machines.some(function (m) { return m.tier + 1 >= g.n; }) ? 1 : 0, 1];
      case "space": return [S.space + 1 >= g.n ? 1 : 0, 1];
      case "conveyor": return [S.conveyor ? 1 : 0, 1];
      case "vehicle": return [S.vehicle + 1 >= g.n ? 1 : 0, 1];
      case "fleet": return [S.fleet >= g.n ? 1 : 0, 1];
      case "facility": return [S.fac[g.f] ? 1 : 0, 1];
      case "plants": return [Math.min(S.plants, g.n), g.n];
      case "hubs": return [Math.min(S.hubs, g.n), g.n];
      case "export": return [S.lv.exports, g.n];
    }
    return [0, 1];
  }
  function goalLabel(g) {
    var p = goalProg(g), c = Math.min(p[0], p[1]);
    switch (g.t) {
      case "produce": return (g.p ? D.products[g.p].icon + " Make " + D.products[g.p].name + "s " : "🏭 Produce goods ") + fmt(c) + "/" + g.n;
      case "orders": return "📋 Deliver orders " + c + "/" + g.n;
      case "earn": return "🪙 Earn " + fmt(c) + "/" + fmt(g.n);
      case "machines": return "⚙️ Own " + g.n + " machines (" + c + ")";
      case "workers": return "👷 Have " + g.n + " workers (" + c + ")";
      case "tier": return "⬆️ Upgrade a machine to T" + g.n;
      case "space": return "🏗️ Expand to " + D.spaces[g.n - 1].name;
      case "conveyor": return "➡️ Build conveyor belts";
      case "vehicle": return "🚚 Buy the " + D.vehicles[g.n - 1].name;
      case "fleet": return ["", "🚆", "🚢", "✈️"][g.n] + " Get a " + D.fleet[g.n].name;
      case "facility": return "🏗️ Build " + D.facilities[g.f].name;
      case "plants": return "🏭 Open " + g.n + " satellite factor" + (g.n > 1 ? "ies" : "y") + " (" + c + ")";
      case "hubs": return "🌍 Open " + g.n + " global hub" + (g.n > 1 ? "s" : "") + " (" + c + ")";
      case "export": return "🌐 Export orders " + c + "/" + g.n;
    }
  }
  function levelPct() {
    if (S.allDone) return 1;
    var g = L().goals, s = 0; g.forEach(function (x) { var p = goalProg(x); s += Math.min(1, p[0] / p[1]); });
    return s / g.length;
  }
  function checkLevel() {
    if (S.allDone || S.gate || S.pendingLevelUp || (S.tut >= 0 && S.tut < 2)) return;
    if (levelPct() >= 1) {
      S.pendingLevelUp = true; S.coins += L().reward; uiDirty = true;
      if (!window.FK || !window.FK.headless) setTimeout(showLevelUp, 300);
    }
  }
  function advanceLevel() {
    if (!S.pendingLevelUp) return;
    S.pendingLevelUp = false;
    if (S.level >= D.maxLevel) { S.allDone = true; S.done250 = true; save(); uiDirty = true; return; }
    if (S.level === D.freeLevels && !S.premium) { S.gate = true; save(); uiDirty = true; return; }
    S.level++; S.lv = freshLv(); S.nextOrder = Math.min(S.nextOrder, 3); uiDirty = true; save();
    var nl = L(); toast("Level " + nl.n + " · " + nl.title, "good");
  }

  /* ---------------- rendering: scene ---------------- */
  var cv = $("scene"), cx = cv.getContext("2d"), scale = 1, ox = 0, oy = 0, dpr = 1;
  var fxc = $("fx"), fx = fxc.getContext("2d");
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    scale = Math.min(r.width / W, r.height / H); ox = (r.width - W * scale) / 2; oy = (r.height - H * scale) / 2;
    var a = $("app").getBoundingClientRect(); fxc.width = Math.round(a.width * dpr); fxc.height = Math.round(a.height * dpr);
    var ds = document.documentElement.style; ds.setProperty("--barH", $("bar").offsetHeight + "px"); ds.setProperty("--hudH", $("hud").offsetHeight + "px");
    uiDirty = true;
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function fillRR(x, y, w, h, r, c) { if (w <= 0) return; rr(x, y, w, h, Math.min(r, w / 2, h / 2)); cx.fillStyle = c; cx.fill(); }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }
  function bottomY() { return S.space ? ROWS[1] + 48 : ROWS[0] + 52; }
  function txt(s, x, y, size, color, align) { cx.font = "bold " + size + "px system-ui,-apple-system,Segoe UI,Roboto,sans-serif"; cx.fillStyle = color; cx.textAlign = align || "center"; cx.fillText(s, x, y); }

  function drawProduct(p, x, y, s) {
    cx.save(); cx.translate(x, y); cx.scale(s, s);
    if (p === "toy") {
      fillRR(-9, -5, 18, 7, 3, "#ef4444"); fillRR(-5, -9, 10, 5, 2, "#f87171"); fillRR(-3, -8, 6, 3, 1, "#bfdbfe");
      cx.fillStyle = "#111827"; cx.beginPath(); cx.arc(-5, 3, 3, 0, 7); cx.arc(5, 3, 3, 0, 7); cx.fill();
    } else if (p === "chair") {
      cx.fillStyle = "#92400e"; cx.fillRect(-6, -11, 3, 18); cx.fillRect(4, -2, 3, 9); cx.fillRect(-6, 4, 2, 4);
      fillRR(-7, -2, 15, 4, 1, "#b45309"); fillRR(-7, -12, 4, 10, 1, "#d97706");
    } else if (p === "bucket") {
      cx.fillStyle = "#94a3b8"; cx.beginPath(); cx.moveTo(-8, -6); cx.lineTo(8, -6); cx.lineTo(6, 7); cx.lineTo(-6, 7); cx.closePath(); cx.fill();
      cx.fillStyle = "#cbd5e1"; cx.fillRect(-8, -7, 16, 3); cx.strokeStyle = "#475569"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(0, -6, 7, Math.PI, 0); cx.stroke();
    } else { var PI_ = D.products[p]; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.font = "14px system-ui,'Segoe UI Emoji','Noto Color Emoji',sans-serif"; cx.fillText(PI_ ? PI_.icon : "📦", 0, 0); }
    cx.restore();
  }
  function drawBox(x, y, c) { fillRR(x - 6, y - 6, 12, 10, 2, c || "#d4a373"); cx.fillStyle = "rgba(0,0,0,.18)"; cx.fillRect(x - 6, y - 3, 12, 2); }

  function drawBuilding() {
    var sp = S.space, by = bottomY(), i, px, py;
    cx.fillStyle = "#86c76a"; cx.fillRect(-300, -300, W + 600, H + 600);
    cx.fillStyle = "#74b357"; for (i = 0; i < 50; i++) cx.fillRect((i * 97) % W, (i * 53) % H, 3, 2);
    [[-6, 40], [404, 64], [-12, 300], [412, 250], [-14, 170]].forEach(function (t) { cx.fillStyle = "#166534"; cx.beginPath(); cx.arc(t[0], t[1], 22, 0, 7); cx.fill(); cx.fillStyle = "#22c55e"; cx.beginPath(); cx.arc(t[0] - 5, t[1] - 5, 14, 0, 7); cx.fill(); });
    // road
    cx.fillStyle = "#475569"; cx.fillRect(-300, ROAD_Y - 22, W + 600, 46); cx.fillStyle = "#94a3b8"; cx.fillRect(-300, ROAD_Y - 24, W + 600, 3);
    cx.fillStyle = "#f8fafc"; for (i = -8; i < 20; i++) cx.fillRect(i * 34, ROAD_Y, 18, 3);
    // dock pad
    cx.fillStyle = "#cbd5e1"; cx.fillRect(296, by, 96, ROAD_Y - 24 - by);
    cx.save(); cx.beginPath(); cx.rect(296, by, 96, 6); cx.clip(); cx.fillStyle = "#facc15"; for (i = 0; i < 6; i++) cx.fillRect(296 + i * 18, by, 9, 6); cx.restore();
    txt("DOCK", 344, by + 18, 8, "#64748b");
    if (sp === 0) {
      cx.setLineDash([5, 4]); cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = 2;
      rr(14, by + 8, 272, ROAD_Y - 34 - by - 8, 10); cx.stroke(); cx.setLineDash([]);
      txt("🔒 Workshop expansion · Level " + D.spaces[1].unlock, 150, by + (ROAD_Y - 34 - by) / 2 + 8, 11, "rgba(255,255,255,.95)");
    }
    var wall = ["#a16207", "#b45309", "#475569", "#7f1d1d", "#1e3a5f", "#334155", "#1f2937", "#111827"][Math.min(sp, 7)];
    var floor = sp === 0 ? "#e7c89b" : sp === 1 ? "#d6dbe3" : "#e2e8f0";
    fillRR(10, 56, 382, by - 56 + 4, 8, shade(wall, -0.35));
    cx.fillStyle = floor; cx.fillRect(18, 96, 366, by - 96 - 2);
    cx.strokeStyle = sp === 0 ? "rgba(146,64,14,.18)" : "rgba(71,85,105,.14)"; cx.lineWidth = 1;
    if (sp === 0) { for (py = 104; py < by; py += 12) { cx.beginPath(); cx.moveTo(18, py); cx.lineTo(384, py); cx.stroke(); } }
    else { for (px = 18; px < 384; px += 30) { cx.beginPath(); cx.moveTo(px, 96); cx.lineTo(px, by - 2); cx.stroke(); } for (py = 96; py < by; py += 30) { cx.beginPath(); cx.moveTo(18, py); cx.lineTo(384, py); cx.stroke(); } }
    if (sp >= 2) { cx.fillStyle = "#facc15"; cx.fillRect(66, ROWS[0] + 44, 252, 2); cx.fillRect(66, ROWS[1] + 44, 252, 2); }
    cx.fillStyle = wall; cx.fillRect(18, 62, 366, 34);
    if (sp === 0) { cx.strokeStyle = "rgba(0,0,0,.18)"; for (px = 18; px < 384; px += 14) { cx.beginPath(); cx.moveTo(px, 62); cx.lineTo(px, 96); cx.stroke(); } }
    if (sp === 1) { cx.fillStyle = "rgba(255,255,255,.14)"; for (py = 62; py < 96; py += 8) for (px = 18 + ((py / 8) % 2 ? 10 : 0); px < 380; px += 20) cx.fillRect(px, py, 18, 6); }
    if (sp >= 2) { cx.fillStyle = "rgba(255,255,255,.08)"; for (px = 18; px < 384; px += 24) cx.fillRect(px, 62, 2, 34); }
    var wins = sp === 0 ? [50, 300] : sp === 1 ? [40, 110, 260, 330] : [30, 90, 270, 330];
    wins.forEach(function (wx) { fillRR(wx, 68, 34, 20, 3, "#1e3a8a"); fillRR(wx + 2, 70, 30, 16, 2, "#93c5fd"); cx.fillStyle = "rgba(255,255,255,.55)"; cx.beginPath(); cx.moveTo(wx + 6, 86); cx.lineTo(wx + 14, 70); cx.lineTo(wx + 19, 70); cx.lineTo(wx + 11, 86); cx.fill(); });
    var sw = sp >= 2 ? 130 : 110; fillRR(200 - sw / 2, 64, sw, 27, 6, sp >= 2 ? "#4338ca" : "#1f2937");
    txt(sp >= 2 ? space().name.toUpperCase() : space().name.toUpperCase(), 200, 76, 9, sp >= 2 ? "#fff" : "#fde68a");
    txt(sp >= 2 ? "GUNVORA GAMES" : "LEVEL " + S.level + " · " + L().title.toUpperCase(), 200, 86, 6.5, "#fdba74");
    fillRR(6, 50, 390, 12, 5, shade(wall, -0.5));
    if (sp >= 2) for (i = 0; i < 4; i++) fillRR(40 + i * 90, 46, 50, 8, 3, "#93c5fd");
    if (sp >= 1) { // chimney with smoke
      fillRR(360, 26, 16, 30, 2, "#7f1d1d"); if (Math.random() < 0.08) parts.push({ x: 368, y: 24, vx: rnd(4, 10), vy: -rnd(10, 18), life: 2, k: "smoke", r: rnd(3, 5) });
    }
    cx.fillStyle = shade(wall, -0.2); cx.fillRect(318, by - 6, 60, 8);
    drawRaw();
    for (i = 0; i < 6; i++) {
      var s = SLOTS[i]; if (i < S.machines.length) continue;
      if (s.y === ROWS[1] && sp === 0) continue;
      var open = i < space().slots;
      cx.setLineDash([4, 4]); cx.strokeStyle = open ? "rgba(67,56,202,.55)" : "rgba(100,116,139,.45)"; cx.lineWidth = 2; rr(s.x - 30, s.y - 30, 60, 50, 8); cx.stroke(); cx.setLineDash([]);
      if (open) { txt("+", s.x, s.y + 2, 20, "rgba(67,56,202,.75)"); txt(S.level < 3 ? "Level 3" : machineCost() + " coins", s.x, s.y + 14, 7.5, "rgba(67,56,202,.85)"); }
      else { txt("🔒", s.x, s.y - 2, 12, "#64748b"); txt(D.spaces[i < 4 ? 1 : 2].name, s.x, s.y + 12, 7, "#64748b"); }
    }
  }
  function drawRaw() {
    var x = 22, y = 104, i, n = Math.min(10, Math.ceil(S.raw.wood / 3)), h = S.space ? 80 : 86;
    fillRR(x, y, 40, h, 6, "rgba(0,0,0,.08)");
    for (i = 0; i < n; i++) { var bx = x + 4 + (i % 2) * 17, byy = y + h - 16 - Math.floor(i / 2) * 13; fillRR(bx, byy, 15, 12, 2, "#b45309"); cx.fillStyle = "#d97706"; cx.fillRect(bx + 1, byy + 2, 13, 2); cx.fillRect(bx + 1, byy + 7, 13, 2); }
    txt("🪵 " + S.raw.wood, x + 20, y + 9, 8, "#1f2937");
    if (S.space && (S.level >= D.products.bucket.unlock || S.raw.steel > 0)) {
      var sy = 192; fillRR(x, sy, 40, 92, 6, "rgba(0,0,0,.08)");
      var k = Math.min(14, Math.ceil(S.raw.steel / 2));
      for (i = 0; i < k; i++) fillRR(x + 4, sy + 82 - i * 5, 32, 4, 1, i % 2 ? "#94a3b8" : "#cbd5e1");
      txt("🔩 " + S.raw.steel, x + 20, sy + 9, 8, "#1f2937");
    }
  }
  function drawShelf() {
    var top = 104, bot = bottomY() - 8, x = SHELF_X, w = 52, i, k;
    fillRR(x - 2, top, w + 4, bot - top, 4, "#334155");
    cx.fillStyle = "#64748b"; var rows = Math.floor((bot - top - 12) / 22);
    for (var r = 0; r <= rows; r++) cx.fillRect(x, top + 10 + r * 22, w, 3);
    var items = []; for (k in S.goods) for (i = 0; i < S.goods[k]; i++) items.push(k);
    var per = 4, cap = rows * per;
    for (i = 0; i < Math.min(items.length, cap); i++) drawProduct(items[i], x + 8 + (i % per) * 12, top + 10 + (rows - Math.floor(i / per)) * 22 - 6, 0.55);
    fillRR(x + 1, top - 13, w - 2, 13, 4, goodsTotal() >= space().goods ? "#dc2626" : "#1e293b");
    txt("📦 " + goodsTotal() + "/" + space().goods, x + w / 2, top - 4, 8, "#fff");
  }
  function drawBelts() {
    if (!S.conveyor) return;
    (S.space ? ROWS : [ROWS[0]]).forEach(function (ry) {
      var y = ry + 22, x0 = 70, x1 = SHELF_X;
      fillRR(x0, y, x1 - x0, 12, 4, "#1f2937");
      cx.save(); rr(x0 + 2, y + 2, x1 - x0 - 4, 8, 3); cx.clip();
      cx.fillStyle = "#374151"; cx.fillRect(x0, y + 2, x1 - x0, 8);
      cx.strokeStyle = "#6b7280"; cx.lineWidth = 2; var off = (T * 55) % 12;
      for (var px = x0 - 12 + off; px < x1; px += 12) { cx.beginPath(); cx.moveTo(px, y + 3); cx.lineTo(px + 4, y + 6); cx.lineTo(px, y + 9); cx.stroke(); }
      cx.restore();
      cx.fillStyle = "#facc15"; for (px = x0; px < x1; px += 10) cx.fillRect(px, y + 11, 5, 2);
    });
  }
  function drawBeltItems() { belt.forEach(function (b) { drawBox(b.x, b.y - 1, "#d4a373"); drawProduct(b.p, b.x, b.y - 9, 0.5); }); }
  function drawMachine(m) {
    var s = SLOTS[m.id], tr = tierOf(m), x = s.x, y = s.y, run = m.cyc && !m.broken, op = staffed(m);
    var jx = m.shake > 0 ? Math.sin(T * 80) * 2 : run ? Math.sin(T * 40) * 0.6 : 0;
    cx.save(); cx.translate(x + jx, y);
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(0, 20, 34, 7, 0, 0, 7); cx.fill();
    fillRR(-30, -22, 60, 42, 8, shade(tr.color, -0.3));
    fillRR(-28, -26, 56, 40, 8, tr.color);
    fillRR(-24, -22, 48, 10, 4, shade(tr.color, 0.25));
    cx.fillStyle = shade(tr.color, -0.15); cx.beginPath(); cx.moveTo(-26, -26); cx.lineTo(-12, -26); cx.lineTo(-15, -36); cx.lineTo(-29, -36); cx.closePath(); cx.fill();
    var pp = run ? (Math.sin(T * (8 + m.tier * 3)) + 1) / 2 : 0.2;
    cx.fillStyle = "#cbd5e1"; cx.fillRect(-2, -42 + pp * 4, 6, 16);
    fillRR(-9, -46 + pp * 6, 20, 8, 3, "#e2e8f0");
    cx.save(); cx.translate(14, -4); cx.rotate(run ? T * (3 + m.tier) : 0);
    cx.fillStyle = "#facc15"; for (var g = 0; g < 8; g++) { cx.rotate(Math.PI / 4); cx.fillRect(-2, -10, 4, 5); }
    cx.beginPath(); cx.arc(0, 0, 7, 0, 7); cx.fill(); cx.fillStyle = shade(tr.color, -0.3); cx.beginPath(); cx.arc(0, 0, 2.5, 0, 7); cx.fill();
    cx.restore();
    fillRR(-22, -8, 22, 14, 3, "#0f172a");
    txt(m.broken ? "ERR" : run ? Math.round(m.prog * 100) + "%" : tr.short, -11, 2, 7, m.broken ? "#ef4444" : run ? "#22c55e" : "#facc15");
    if (m.tier >= 3) {
      var a = run ? Math.sin(T * 6) * 0.7 : 0;
      cx.save(); cx.translate(22, -24); cx.rotate(-0.6 + a);
      fillRR(-3, -18, 6, 20, 3, "#f97316"); cx.translate(0, -18); cx.rotate(1.2 - a);
      fillRR(-2.5, -14, 5, 15, 2, "#fb923c"); cx.fillStyle = "#334155"; cx.fillRect(-4, -17, 8, 4); cx.restore();
    }
    var lc = m.broken ? (Math.sin(T * 12) > 0 ? "#ef4444" : "#7f1d1d") : run ? "#22c55e" : m.on && op ? "#facc15" : "#94a3b8";
    cx.fillStyle = lc; cx.beginPath(); cx.arc(22, -30, 4, 0, 7); cx.fill();
    if (run || m.broken) { cx.globalAlpha = 0.3; cx.beginPath(); cx.arc(22, -30, 8, 0, 7); cx.fill(); cx.globalAlpha = 1; }
    fillRR(26, 4, 16, 12, 3, "#475569");
    for (var i = 0; i < m.out.length; i++) drawProduct(m.out[i], 34, 2 - i * 6, 0.5);
    fillRR(-26, 22, 52, 5, 2, "rgba(15,23,42,.35)");
    if (m.cyc) fillRR(-26, 22, 52 * Math.min(1, m.prog), 5, 2, "#22c55e");
    fillRR(-26, 28, 52, 3, 1.5, "rgba(15,23,42,.25)");
    fillRR(-26, 28, 52 * m.cond / 100, 3, 1.5, m.cond > 60 ? "#38bdf8" : m.cond > 35 ? "#f59e0b" : "#ef4444");
    txt("M" + (m.id + 1), -17, -14, 7, "#fff");
    drawProduct(m.product, 2, -15, 0.45);
    var P = D.products[m.product];
    if (m.broken) {
      fillRR(-14, -68, 28, 18, 8, m.repair > 0 ? "#2563eb" : "#dc2626");
      txt(m.repair > 0 ? "🔧" : "!", 0, -55, 11, "#fff");
    } else if (!m.cyc && (!op || !m.on) && canStart(m)) {
      var b = 1 + Math.sin(T * 6) * 0.08; cx.save(); cx.translate(0, -58); cx.scale(b, b);
      fillRR(-18, -8, 36, 15, 7, "#f97316"); txt("TAP", 0, 3, 8, "#fff"); cx.restore();
    } else if (!m.cyc && S.raw[P.raw] < P.rawQty) {
      fillRR(-22, -66, 44, 15, 7, "#dc2626"); txt("NO " + D.raws[P.raw].icon, 0, -55.5, 8, "#fff");
    } else if (!m.cyc && !S.conveyor && m.out.length >= 3) {
      fillRR(-22, -66, 44, 15, 7, "#f59e0b"); txt("FULL", 0, -55.5, 8, "#fff");
    }
    cx.restore();
  }
  function drawWorker(w) {
    var walking = w.moving, sw = walking ? Math.sin(w.walk) * 3 : 0;
    var m = w.job !== "carrier" ? S.machines[w.job] : null, working = (m && m.cyc && w.st === "op") || w.st === "fix";
    cx.save(); cx.translate(w.x, w.y + (walking ? -Math.abs(Math.sin(w.walk)) * 1.5 : 0));
    cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(0, 10, 7, 2.5, 0, 0, 7); cx.fill();
    cx.fillStyle = "#1e3a8a"; cx.fillRect(-4, 2, 3, 8 + sw); cx.fillRect(1, 2, 3, 8 - sw);
    fillRR(-6, -9, 12, 13, 4, w.shirt);
    cx.fillStyle = "rgba(255,255,255,.5)"; cx.fillRect(-6, -3, 12, 1.5);
    cx.strokeStyle = w.shirt; cx.lineWidth = 3; cx.lineCap = "round";
    var arm = working ? Math.sin(T * 14) * 4 : walking ? sw : 0;
    cx.beginPath(); cx.moveTo(-5, -6); cx.lineTo(w.carry ? -5 : -8, w.carry ? -14 : 2 + arm); cx.moveTo(5, -6); cx.lineTo(w.carry ? 5 : 8, w.carry ? -14 : 2 - arm); cx.stroke();
    cx.fillStyle = "#e0ac69"; cx.beginPath(); cx.arc(0, -14, 5, 0, 7); cx.fill();
    cx.fillStyle = "#facc15"; cx.beginPath(); cx.arc(0, -16, 5.5, Math.PI, 0); cx.fill(); cx.fillRect(-7, -16.5, 14, 2);
    if (w.carry) { drawBox(0, -22, "#d4a373"); drawProduct(w.carry, 0, -30, 0.45); }
    if (w.st === "fix") { cx.save(); cx.translate(9, -4); cx.rotate(Math.sin(T * 12)); cx.fillStyle = "#64748b"; cx.fillRect(-1, -7, 2.5, 9); cx.fillRect(-3, -9, 6, 3); cx.restore(); }
    cx.restore();
  }
  function drawVehicles() {
    var v = veh();
    for (var k = 0; k < v.trips; k++) {
      var d = S.deliveries.filter(function (q) { return q.slot === k; })[0], home = DOCK_X - k * 74, vx = home, loaded = false, moving = false;
      if (d) {
        var f = d.t / d.dur; moving = true;
        if (f < 0.5) { vx = home + Math.pow(f / 0.5, 1.7) * 300; loaded = true; }
        else { var e = (f - 0.5) / 0.5; vx = -120 + (1 - Math.pow(1 - e, 2)) * (home + 120); }
      }
      if (S.vehicle === 0) drawCart(vx, ROAD_Y, loaded, moving); else drawTruck(vx, ROAD_Y, loaded, S.vehicle === 2, moving);
    }
  }
  function drawCart(x, y, loaded, moving) {
    cx.save(); cx.translate(x, y);
    cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(-6, 12, 26, 4, 0, 0, 7); cx.fill();
    fillRR(-16, -6, 30, 12, 3, "#92400e"); cx.fillStyle = "#b45309"; cx.fillRect(-14, -4, 26, 3);
    if (loaded) { drawBox(-7, -10, "#d4a373"); drawBox(5, -10, "#d4a373"); drawBox(-1, -18, "#e0b88a"); }
    cx.fillStyle = "#111827"; cx.beginPath(); cx.arc(-8, 8, 4.5, 0, 7); cx.arc(8, 8, 4.5, 0, 7); cx.fill();
    cx.strokeStyle = "#78350f"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-16, -4); cx.lineTo(-24, -10); cx.stroke();
    var sw = moving ? Math.sin(T * 12) * 3 : 0;
    cx.translate(-28, -2); cx.fillStyle = "#1e3a8a"; cx.fillRect(-3, 0, 3, 9 + sw); cx.fillRect(1, 0, 3, 9 - sw);
    fillRR(-5, -11, 10, 12, 4, "#059669"); cx.fillStyle = "#e0ac69"; cx.beginPath(); cx.arc(0, -15, 4.5, 0, 7); cx.fill();
    cx.fillStyle = "#facc15"; cx.beginPath(); cx.arc(0, -17, 5, Math.PI, 0); cx.fill();
    cx.restore();
  }
  function drawTruck(x, y, loaded, big, moving) {
    var len = big ? 70 : 54;
    cx.save(); cx.translate(x, y + (moving ? Math.sin(T * 30) * 0.5 : 0));
    cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(0, 14, len / 2 + 14, 5, 0, 0, 7); cx.fill();
    fillRR(-len / 2 - 10, -26, len, 34, 4, "#4338ca"); fillRR(-len / 2 - 8, -24, len - 4, 6, 3, "#6366f1");
    txt("GUNVORA", -10, -5, 9, "#fff"); txt("FACTORY KINGDOM", -10, 3, 5.5, "#fdba74");
    fillRR(len / 2 - 8, -16, 22, 24, 5, "#f97316"); fillRR(len / 2 + 2, -13, 10, 9, 2, "#bfdbfe");
    cx.fillStyle = "#fde68a"; cx.fillRect(len / 2 + 12, 2, 3, 3);
    var rot = moving ? T * 14 : 0;
    [-len / 2, len / 2 - 22, len / 2 + 6].forEach(function (wx) {
      cx.save(); cx.translate(wx, 9); cx.rotate(rot); cx.fillStyle = "#111827"; cx.beginPath(); cx.arc(0, 0, 6, 0, 7); cx.fill();
      cx.fillStyle = "#94a3b8"; cx.fillRect(-1, -4, 2, 8); cx.restore();
    });
    if (loaded) { cx.fillStyle = "rgba(255,255,255,.9)"; fillRR(-len / 2 - 6, -36, 22, 10, 3, "#22c55e"); txt("📦", -len / 2 + 5, -28, 7, "#fff"); }
    cx.restore();
    if (moving && Math.random() < 0.3) parts.push({ x: x - len / 2 - 12, y: y + 4, vx: -rnd(10, 30), vy: -rnd(5, 15), life: 0.7, k: "smoke", r: rnd(3, 5) });
  }
  function drawParticles() {
    parts.forEach(function (p) {
      if (p.k === "smoke") { cx.fillStyle = "rgba(100,116,139," + Math.min(0.5, p.life / 2) + ")"; cx.beginPath(); cx.arc(p.x, p.y, p.r * (2 - p.life / 1.6), 0, 7); cx.fill(); }
      else if (p.k === "spark") { cx.fillStyle = "#fde047"; cx.fillRect(p.x, p.y, 2, 2); }
      else if (p.k === "scrap") { cx.fillStyle = "#57534e"; cx.fillRect(p.x, p.y, 3, 3); }
      else if (p.k === "star") { cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.life * 2); cx.beginPath(); cx.arc(p.x, p.y, 3, 0, 7); cx.fill(); cx.globalAlpha = 1; }
    });
    floats.forEach(function (f) {
      cx.globalAlpha = Math.min(1, f.life * 2); cx.font = "bold 12px system-ui,sans-serif"; cx.textAlign = "center";
      cx.lineWidth = 3; cx.strokeStyle = "rgba(15,23,42,.7)"; cx.strokeText(f.t, f.x, f.y); cx.fillStyle = f.c; cx.fillText(f.t, f.x, f.y); cx.globalAlpha = 1;
    });
  }
  function burst(x, y, n) { for (var i = 0; i < n; i++) { var a = rnd(0, 6.28), v = rnd(30, 90); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.5, 1), k: "star", c: ["#facc15", "#f97316", "#818cf8", "#34d399"][i % 4] }); } }

  function render() {
    if (R3) { R3.render(frameDt, T); renderFx(); return; }
    var r = cv.getBoundingClientRect();
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, r.width, r.height);
    cx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    drawBuilding(); drawShelf(); drawBelts();
    var list = [];
    S.machines.forEach(function (m) { list.push({ y: SLOTS[m.id].y, f: function () { drawMachine(m); } }); });
    S.workers.forEach(function (w) { list.push({ y: w.y + 1, f: function () { drawWorker(w); } }); });
    belt.forEach(function (b) { list.push({ y: b.y, f: function () { drawBox(b.x, b.y - 1, "#d4a373"); drawProduct(b.p, b.x, b.y - 9, 0.5); } }); });
    list.sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { o.f(); });
    drawVehicles(); drawParticles();
    renderFx();
  }

  /* ---------------- fx overlay: coins & confetti ---------------- */
  function sceneToApp(x, y) {
    if (R3) return R3.toApp(x, y, 1.6);
    var a = $("app").getBoundingClientRect(), r = cv.getBoundingClientRect();
    return { x: r.left - a.left + ox + x * scale, y: r.top - a.top + oy + y * scale };
  }
  function coinFly(x, y, n) {
    if (R3) { fire("coins", { x: x, y: y, n: n }); setTimeout(bumpCoins, 700); return; }
    var p = sceneToApp(x, y), a = $("app").getBoundingClientRect(), t = $("sCoins").getBoundingClientRect();
    for (var i = 0; i < n; i++) fxParts.push({ k: "coin", sx: p.x + rnd(-12, 12), sy: p.y + rnd(-8, 8), tx: t.left - a.left + 10, ty: t.top - a.top + 10, t: -i * 0.06, d: 0.75 });
  }
  function confetti(n) {
    if (R3) { fire("celebrate", { n: n }); return; }
    var a = $("app").getBoundingClientRect();
    for (var i = 0; i < n; i++) fxParts.push({ k: "conf", x: rnd(0, a.width), y: rnd(-80, -10), vx: rnd(-40, 40), vy: rnd(80, 200), r: rnd(0, 6), vr: rnd(-6, 6), c: ["#f97316", "#4f46e5", "#facc15", "#10b981", "#ec4899", "#38bdf8"][i % 6], life: rnd(2.5, 4) });
  }
  var lastFx = 0, lastFloats = false;
  function drawFloats3D() {
    if (!R3) return false;
    var any = false;
    floats.forEach(function (f) {
      var p = R3.toApp(f.x, f.y0 + 40, 2.6 + (1.2 - f.life) * 0.9); any = true;
      fx.globalAlpha = Math.min(1, f.life * 2); fx.font = "600 12px Inter,system-ui,sans-serif"; fx.textAlign = "center";
      fx.lineWidth = 3; fx.strokeStyle = "rgba(10,12,16,.75)"; fx.strokeText(f.t, p.x, p.y); fx.fillStyle = f.c; fx.fillText(f.t, p.x, p.y); fx.globalAlpha = 1;
    });
    return any;
  }
  function renderFx() {
    if (R3 && (floats.length || lastFloats)) {
      fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, fxc.width / dpr, fxc.height / dpr); lastFloats = drawFloats3D();
      if (!fxParts.length) { lastFx = 0; return; }
    } else if (R3 && fxParts.length) { fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, fxc.width / dpr, fxc.height / dpr); }
    if (!fxParts.length) { if (lastFx) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); lastFx = 0; } return; }
    if (!R3) { fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, fxc.width / dpr, fxc.height / dpr); }
    var now = performance.now(), dt = lastFx ? Math.min(0.05, (now - lastFx) / 1000) : 0.016; lastFx = now;
    fxParts = fxParts.filter(function (p) {
      if (p.k === "coin") {
        p.t += dt; if (p.t < 0) return true; var f = Math.min(1, p.t / p.d), e = f * f;
        var x = p.sx + (p.tx - p.sx) * e, y = p.sy + (p.ty - p.sy) * e - Math.sin(f * Math.PI) * 60;
        var g = fx.createRadialGradient(x - 2, y - 2, 1, x, y, 7); g.addColorStop(0, "#fff6b0"); g.addColorStop(0.5, "#fbbf24"); g.addColorStop(1, "#d97706");
        fx.fillStyle = g; fx.beginPath(); fx.arc(x, y, 7, 0, 7); fx.fill();
        if (f >= 1) bumpCoins(); return f < 1;
      }
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      fx.save(); fx.translate(p.x, p.y); fx.rotate(p.r); fx.fillStyle = p.c; fx.fillRect(-4, -2.5, 8, 5); fx.restore();
      return p.life > 0;
    });
  }

  /* ---------------- input on scene ---------------- */
  cv.addEventListener("pointerdown", function (e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left - ox) / scale, y = (e.clientY - r.top - oy) / scale, i, s;
    for (i = 0; i < S.machines.length; i++) {
      s = SLOTS[i]; if (Math.abs(x - s.x) < 38 && y > s.y - 72 && y < s.y + 34) { tapMachine(S.machines[i]); return; }
    }
    for (i = S.machines.length; i < 6; i++) { s = SLOTS[i]; if (Math.abs(x - s.x) < 32 && Math.abs(y - s.y + 5) < 28) { closePop(); setTab(i < space().slots ? "machines" : "upgrade", true); return; } }
    if (x > SHELF_X - 6 && y > 88 && y < bottomY()) { closePop(); setTab("orders", true); return; }
    if (x < 66 && y > 96 && y < bottomY()) { closePop(); setTab("inventory", true); return; }
    if (y > ROAD_Y - 40) { closePop(); setTab("delivery", true); return; }
    if (S.space === 0 && y > bottomY()) setTab("upgrade", true); else closePop();
  });
  function tap3d(h) {
    if (!h) { closePop(); return; }
    if (h.k === "machine" && S.machines[h.id]) { userGestured = true; tapMachine(S.machines[h.id]); return; }
    if (h.k === "slot") { setTab(h.i < space().slots ? "machines" : "upgrade"); return; }
    if (h.k === "shelf") { closePop(); setTab("orders", true); return; }
    if (h.k === "raw") { closePop(); setTab("inventory", true); return; }
    if (h.k === "road") { closePop(); setTab("delivery", true); return; }
    if (h.k === "yard") { closePop(); setTab("upgrade", true); return; }
  }
  function tapMachine(m, fromPop) {
    if (!fromPop) { tapMachineAct(m); if (!(S.tut >= 0 && S.tut < 2 && S.level === 1)) openPop(m.id); return; }
    tapMachineAct(m);
  }
  function tapMachineAct(m) {
    var s = SLOTS[m.id], i;
    if (m.broken) { if (m.repair <= 0) A.repair(m.id); else toast("Repair in progress…"); return; }
    if (m.cyc) {
      m.prog = Math.min(0.999, m.prog + 0.12); sfx.tap(); fire("tap", { id: m.id });
      for (i = 0; i < 5; i++) parts.push({ x: s.x + rnd(-15, 15), y: s.y - 20, vx: rnd(-40, 40), vy: -rnd(30, 70), life: 0.4, k: "spark" });
      float("+12% boost", s.x + rnd(-10, 10), s.y - 34, "#fde047"); return;
    }
    if (!staffed(m)) {
      if (canStart(m)) { start(m, true); sfx.tap(); float("Manual run", s.x, s.y - 40, "#fff"); }
      else toast(blockReason(m), "bad");
      return;
    }
    if (!m.on) { m.on = true; sfx.buy(); float("ON!", s.x, s.y - 40, "#86efac"); uiDirty = true; tutCheck(); return; }
    if (popId !== m.id) toast("M" + (m.id + 1) + ": " + blockReason(m), "bad");
  }

  /* ---------------- HUD, status line, goals ---------------- */
  var goalsOpen = false, goalsAuto = 0, lastStatus = "";
  function hud() {
    var l = L(), prem = l.n > D.freeLevels;
    $("lvlNum").textContent = l.n; $("lvlNum").classList.toggle("prem", prem);
    var nm = l.title + (S.allDone ? " ✓" : "");
    if ($("lvlName").textContent !== nm) $("lvlName").textContent = nm;
    $("sCoins").textContent = fmtShort(S.coins);
    $("sWorkers").textContent = S.workers.length + "/" + space().workers;
    $("sOrders").textContent = S.orders.length + "/" + l.maxOrders;
    var pct = Math.round(levelPct() * 100); $("sPct").textContent = pct + "%"; $("sBar").style.width = pct + "%";
    var done = 0; l.goals.forEach(function (g) { var p = goalProg(g); if (p[0] >= p[1]) done++; });
    var sum = S.allDone ? "All 250 levels complete!" : S.gate ? "Free levels complete" : done + "/" + l.goals.length + " goals";
    if ($("goalsSum").textContent !== sum) $("goalsSum").textContent = sum;
    var gh = S.allDone ? '<span class="goal done">🏆 Industrial Emperor! Keep growing your empire</span>' :
      S.gate ? '<span class="goal done">👑 Levels 1–50 complete · Premium continues at 51</span>' :
      l.goals.map(function (g) { var p = goalProg(g); return '<span class="goal' + (p[0] >= p[1] ? " done" : "") + '">' + (p[0] >= p[1] ? "✅ " : "") + goalLabel(g) + "</span>"; }).join("");
    if ($("goals").innerHTML !== gh) $("goals").innerHTML = gh;
    $("goalsBox").classList.toggle("open", goalsOpen || goalsAuto > T);
    var ready = S.orders.filter(function (o) { return S.goods[o.p] >= o.q; }).length;
    $("ordBadge").textContent = S.orders.length ? (ready ? "✓" + ready : S.orders.length) : "";
    document.querySelector('#tabs [data-tab="orders"]').classList.toggle("pulse", ready > 0 && !(sheetOpen && tab === "orders") && S.deliveries.filter(function (d) { return !d.ex; }).length < veh().trips);
    status();
    renderPop();
  }
  function fmtShort(n) {
    n = Math.floor(n);
    if (n < 100000) return n.toLocaleString("en-IN");
    var u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < u.length; i++) if (n >= u[i][0]) { var v = n / u[i][0]; return (v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")) + u[i][1]; }
    return String(n);
  }
  // one-line status: the most useful thing to know right now (tap it to jump to the right tab)
  function status() {
    var st = null, i;
    for (i = 0; i < S.machines.length && !st; i++) { var m = S.machines[i]; if (m.broken) st = ["bad", "💥 M" + (m.id + 1) + (m.repair > 0 ? " repairing…" : " broke down · tap it to repair"), "machines"]; }
    if (!st && S.gate) st = ["warn", "👑 Levels 51–250 are Premium · open Menu → Tester unlock", "menu"];
    var ready = S.orders.filter(function (o) { return S.goods[o.p] >= o.q; });
    if (!st && ready.length) st = ["", "✅ " + ready.length + " order" + (ready.length > 1 ? "s" : "") + " ready to ship · tap to open Orders", "orders"];
    if (!st) for (i = 0; i < S.machines.length && !st; i++) { var mm = S.machines[i], P = D.products[mm.product]; if (!mm.cyc && S.raw[P.raw] < P.rawQty) st = ["warn", "🪵 Out of " + D.raws[P.raw].name.toLowerCase() + " · buy more in Inventory", "inventory"]; }
    if (!st && goodsTotal() + pending() >= space().goods) st = ["warn", "📦 Shelf full · ship orders or sell surplus", "inventory"];
    if (!st && S.deliveries.length) { var d = S.deliveries[0]; st = ["", (d.ex ? "🌐 Exporting to " : "🚚 Delivering to ") + d.cust + " · " + Math.round(d.t / d.dur * 100) + "%", "delivery"]; }
    if (!st) { var run = S.machines.filter(function (m) { return m.cyc; }).length; st = ["", "⚙️ " + run + "/" + S.machines.length + " machines running · " + S.orders.length + " open order" + (S.orders.length === 1 ? "" : "s"), "machines"]; }
    var k = st.join("|"); if (k === lastStatus) return; lastStatus = k;
    $("status").className = "status " + st[0]; $("statusTxt").textContent = st[1]; $("status").dataset.go = st[2];
  }
  $("status").addEventListener("click", function () { var g = $("status").dataset.go; if (g === "menu") menu(); else if (g) setTab(g); });
  $("goalsTgl").addEventListener("click", function () { goalsOpen = !(goalsOpen || goalsAuto > T); goalsAuto = 0; sfx.tap(); hud(); });

  function btn(act, label, cls, dis, arg) { return '<button class="btn ' + (cls || "") + '" data-act="' + act + '"' + (arg != null ? ' data-arg="' + arg + '"' : "") + (dis ? " disabled" : "") + ">" + label + "</button>"; }
  function coinTxt(n) { return fmtShort(n) + " 🪙"; }
  function locked(lv) { return '<span class="chip warn">🔒 Lv ' + lv + (lv > D.freeLevels ? " 👑" : "") + "</span>"; }
  function card(icon, title, sub, right, cls) { return '<div class="card' + (cls ? " " + cls : "") + '"><div class="row"><div class="icon">' + icon + '</div><div class="grow"><div class="ttl">' + title + '</div><div class="sub">' + sub + "</div></div>" + (right || "") + "</div></div>"; }
  var OWNED = '<span class="chip ok">OWNED</span>';

  var PANELS = {
    machines: function () {
      var h = '<div class="ph"><h3>Machines</h3><small>' + S.machines.length + " / " + space().slots + " slots · " + space().name + "</small></div>";
      S.machines.forEach(function (m) {
        var tr = tierOf(m), op = staffed(m), nt = D.tiers[m.tier + 1];
        var st = blockReason(m), stc = m.broken ? "bad" : m.cyc ? "ok" : "warn";
        h += '<div class="card"><div class="row"><div class="icon" style="background:' + tr.color + ';color:#fff">⚙️</div><div class="grow"><div class="ttl">M' + (m.id + 1) + " · " + tr.name + ' <span class="chip">' + tr.short + '</span></div><div class="sub">' + (op ? "Operator: " + op.name : "No operator (tap machine to run once)") + "</div></div>" +
          prodSelect(m) + "</div>" +
          '<div class="chips"><span class="chip ' + stc + '">' + st + '</span><span class="chip">⏱ ' + cycleTime(m).toFixed(1) + 's/unit</span><span class="chip">✨ ' + (tr.quality * 100).toFixed(tr.quality > 0.99 ? 1 : 0) + '%</span><span class="chip ' + (m.cond < 40 ? "bad" : m.cond < 70 ? "warn" : "ok") + '">🔧 ' + Math.round(m.cond) + "%</span></div>" +
          '<div class="mini-bar"><i style="width:' + m.cond + "%;background:" + (m.cond > 60 ? "#38bdf8" : m.cond > 35 ? "#f59e0b" : "#ef4444") + '"></i></div><div class="btns">' +
          (m.broken ? btn("repair", m.repair > 0 ? "Repairing… " + Math.ceil(m.repair) + "s" : "🔧 Repair · " + coinTxt(D.repairCost), "red", m.repair > 0, m.id) :
            btn("toggle", m.on ? "⏸ Stop" : "▶ Start", m.on ? "ghost" : "grn", false, m.id) + btn("service", "🛠 Service · " + coinTxt(D.serviceCost), "ghost", m.cond >= 99, m.id)) +
          (nt ? (nt.unlock > S.level ? '<span class="chip warn" style="align-self:center">🔒 ' + nt.short + " at Level " + nt.unlock + "</span>" : btn("upMachine", "⬆ " + nt.short + " · " + coinTxt(nt.upCost), "acc", S.coins < nt.upCost, m.id)) : '<span class="chip ok" style="align-self:center">MAX TIER</span>') + "</div></div>";
      });
      var full = S.machines.length >= space().slots;
      h += card("➕", "Buy a new machine", S.level < 3 ? "Unlocks at Level 3" : full ? "All slots used. Expand your site in Upgrade" : "Basic Press (T1) · gets a spare worker if you have one",
        S.level < 3 ? locked(3) : btn("buyMachine", coinTxt(machineCost()), "acc", full || S.coins < machineCost()), S.level < 3 ? "lock" : "");
      h += '<p class="sub" style="padding:0 4px">Tip: tap a machine in the factory for quick actions. Tapping a running machine speeds it up ⚡.</p>';
      return h;
    },
    workers: function () {
      var h = '<div class="ph"><h3>Workers</h3><small>' + S.workers.length + " / " + space().workers + " · " + space().name + "</small></div>";
      S.workers.forEach(function (w) {
        var role = w.job === "carrier" ? (S.conveyor ? "Helper (maintenance)" : "Carrier") : "Operator · M" + (w.job + 1);
        var act = w.carry ? "Carrying " + D.products[w.carry].icon : w.st === "fix" ? "Maintaining a machine 🔧" : w.st === "op" ? "At machine" : w.st === "toM" ? "Fetching goods" : w.st === "toFix" ? "Going to fix" : w.st === "away" ? "Walking" : "Waiting";
        h += '<div class="card"><div class="row"><div class="icon" style="background:' + w.shirt + ';color:#fff">👷</div><div class="grow"><div class="ttl">' + w.name + '</div><div class="sub">' + role + " · " + act + "</div></div>" +
          '<select class="sel" data-act="assign" data-arg="' + w.id + '"><option value="carrier"' + (w.job === "carrier" ? " selected" : "") + ">" + (S.conveyor ? "🔧 Helper" : "📦 Carrier") + "</option>" +
          S.machines.map(function (m) { return '<option value="' + m.id + '"' + (w.job === m.id ? " selected" : "") + ">⚙️ Operate M" + (m.id + 1) + "</option>"; }).join("") + "</select></div></div>";
      });
      var full = S.workers.length >= space().workers;
      h += card("🧑‍🏭", "Hire a worker", S.level < 2 ? "Unlocks at Level 2" : full ? "No room. Expand your site" : "Joins an idle machine, or carries goods",
        S.level < 2 ? locked(2) : btn("hire", coinTxt(hireCost()), "acc", full || S.coins < hireCost()), S.level < 2 ? "lock" : "");
      h += '<p class="sub" style="padding:0 4px">Operators run machines non-stop. ' + (S.conveyor ? "With conveyors, spare workers are helpers who service and repair machines for free." : "Carriers move finished goods from machine trays to the shelf and service worn machines when free.") + (S.fac.agv ? " AGVs speed up every walk by 70%." : "") + "</p>";
      return h;
    },
    delivery: function () {
      var v = veh(), nv = D.vehicles[S.vehicle + 1], fv = fleetV(), nf = D.fleet[S.fleet + 1];
      var h = '<div class="ph"><h3>Delivery</h3><small>' + fmt(S.stats.orders) + " delivered · " + fmt(S.stats.exports || 0) + " exported · " + S.stats.missed + " missed</small></div>";
      h += card(S.vehicle ? "🚚" : "🛒", v.name, v.trips + " trip" + (v.trips > 1 ? "s" : "") + " at a time · " + vehTime(v).toFixed(1).replace(/\.0$/, "") + "s round trip" + (v.bonus ? " · +" + Math.round(v.bonus * 100) + "% express bonus" : ""));
      if (S.fleet) h += card(["", "🚆", "🚢", "✈️"][S.fleet], fv.name + " · export", fv.trips + " shipment" + (fv.trips > 1 ? "s" : "") + " at a time · " + vehTime(fv).toFixed(1).replace(/\.0$/, "") + "s · +" + Math.round(fv.bonus * 100) + "% bonus");
      if (S.deliveries.length) S.deliveries.forEach(function (d) {
        h += '<div class="card"><div class="row"><div class="icon">' + (d.ex ? "🌐" : D.products[d.p].icon) + '</div><div class="grow"><div class="ttl">' + d.q + "× " + D.products[d.p].name + " → " + d.cust + '</div><div class="sub">Pays ' + coinTxt(d.reward) + ' on arrival</div><div class="mini-bar"><i style="width:' + Math.round(d.t / d.dur * 100) + "%;background:" + (d.ex ? "#0ea5e9" : "#f97316") + '"></i></div></div></div></div>';
      }); else h += '<div class="empty">Vehicles parked at the dock. Ship orders from the Orders tab.</div>';
      if (nv) h += card("⬆️", "Upgrade to " + nv.name, nv.time + "s trips · " + nv.trips + " at a time · +" + Math.round(nv.bonus * 100) + "% bonus", nv.unlock > S.level ? locked(nv.unlock) : btn("vehicle", coinTxt(nv.cost), "acc", S.coins < nv.cost));
      if (nf) h += card(["", "🚆", "🚢", "✈️"][S.fleet + 1], (S.fleet ? "Upgrade to " : "Export fleet: ") + nf.name, "Ships export orders abroad · " + nf.trips + " at a time · export orders pay 2.2×", nf.unlock > S.level ? locked(nf.unlock) : btn("fleet", coinTxt(nf.cost), "acc", S.coins < nf.cost));
      return h;
    },
    upgrade: function () {
      var h = '<div class="ph"><h3>Upgrades</h3><small>' + space().name + "</small></div>", ns = D.spaces[S.space + 1];
      h += card("🏗️", ns ? "Expand to " + ns.name : space().name, ns ? ns.slots + " machine slots · " + ns.workers + " workers · shelf " + ns.goods + " · raw store " + ns.raw : "Your biggest site. Grow with plants and hubs.",
        ns ? (ns.unlock > S.level ? locked(ns.unlock) : btn("expand", coinTxt(ns.cost), "acc", S.coins < ns.cost)) : OWNED);
      h += card("➡️", "Conveyor belts", "Goods ride straight to the shelf; spare workers maintain machines", S.conveyor ? OWNED : D.conveyor.unlock > S.level ? locked(D.conveyor.unlock) : btn("conveyor", coinTxt(D.conveyor.cost), "acc", S.coins < D.conveyor.cost));
      Object.keys(D.facilities).forEach(function (k) {
        var f = D.facilities[k]; if (f.unlock > S.level + 30 && !S.fac[k]) return;
        h += card(FAC_ICON[k] || "🏗️", f.name, f.desc, S.fac[k] ? OWNED : f.unlock > S.level ? locked(f.unlock) : btn("facility", coinTxt(f.cost), "acc", S.coins < f.cost, k));
      });
      if (S.level + 30 >= D.plants.unlock) h += card("🏭", "Satellite factories · " + S.plants + "/" + D.plants.max, S.plants ? S.plants + " plant" + (S.plants > 1 ? "s" : "") + " ship a finished unit every " + (D.plants.every / S.plants).toFixed(1) + "s" : "Extra plants make goods for you and send them by shuttle truck",
        S.plants >= D.plants.max ? OWNED : D.plants.unlock > S.level ? locked(D.plants.unlock) : btn("plant", coinTxt(D.plants.cost(S.plants)), "acc", S.coins < D.plants.cost(S.plants)));
      if (S.level + 30 >= D.hubs.unlock) h += card("🌍", "Global trade hubs · " + S.hubs + "/" + D.hubs.max, (S.hubs ? D.hubs.names.slice(0, S.hubs).join(", ") + ". " : "") + "Each hub adds +10% to export rewards and earns passive coins",
        S.hubs >= D.hubs.max ? OWNED : D.hubs.unlock > S.level ? locked(D.hubs.unlock) : btn("hub", coinTxt(D.hubs.cost(S.hubs)), "acc", S.coins < D.hubs.cost(S.hubs)));
      h += '<div class="card"><div class="ttl">Machine tiers</div><div class="chips">' + D.tiers.map(function (t) { return '<span class="chip ' + (t.unlock <= S.level ? "ok" : "warn") + '">' + t.short + " " + t.name + (t.unlock > S.level ? " · Lv " + t.unlock : "") + "</span>"; }).join("") + '</div><div class="sub" style="margin-top:5px">Upgrade each machine from the Machines tab or by tapping it.</div></div>';
      return h + teaser();
    },
    inventory: function () {
      var h = '<div class="ph"><h3>Inventory</h3><small>Raw ' + fmt(rawTotal()) + "/" + space().raw + " · Shelf " + fmt(goodsTotal()) + "/" + space().goods + "</small></div>";
      unlockedRaws().forEach(function (r) {
        var R = D.raws[r];
        h += '<div class="card"><div class="row"><div class="icon">' + R.icon + '</div><div class="grow"><div class="ttl">' + R.name + ": " + S.raw[r] + '</div><div class="sub">' + R.cost + " coins each · for " + Object.keys(D.products).filter(function (p) { return D.products[p].raw === r && D.products[p].unlock <= S.level; }).map(function (p) { return D.products[p].name + (D.products[p].rawQty > 1 ? " (×" + D.products[p].rawQty + ")" : ""); }).join(", ") + '</div></div></div><div class="btns">' +
          R.pack.map(function (n) { return btn("buyRaw", "+" + n + " · " + coinTxt(n * R.cost), "", S.coins < n * R.cost || rawTotal() + n > space().raw, r + ":" + n); }).join("") + "</div></div>";
      });
      var dm = D.demandAt(S.level);
      h += '<div class="card"><div class="ttl">Finished goods</div><div class="sub">Customers now mostly order: ' + dm.map(function (p) { return D.products[p].icon; }).join(" ") + ". Sell surplus to a wholesaler at " + Math.round(D.sellRate * 100) + "% of value.</div>" +
        unlockedProducts().filter(function (p) { return S.goods[p] > 0 || dm.indexOf(p) >= 0; }).map(function (p) {
          var P = D.products[p];
          return '<div class="row" style="margin-top:6px"><div class="grow"><b>' + P.icon + " " + P.name + "</b> · " + S.goods[p] + '<div class="sub">sells ~' + fmtShort(P.value * D.levelMult(S.level)) + " per unit in orders</div></div>" + btn("sell", "Sell all · " + coinTxt(S.goods[p] * P.value * D.sellRate), "ghost sm", !S.goods[p], p) + "</div>";
        }).join("") + "</div>";
      var tot = S.stats.produced + S.stats.wasted;
      h += '<div class="card"><div class="ttl">Factory report</div><div class="chips"><span class="chip ok">Produced ' + fmt(S.stats.produced) + '</span><span class="chip bad">Scrap ' + fmt(S.stats.wasted) + (tot ? " (" + Math.round(S.stats.wasted / tot * 100) + "%)" : "") + '</span><span class="chip warn">Breakdowns ' + S.stats.breakdowns + '</span><span class="chip">Earned ' + coinTxt(S.stats.earned) + "</span>" + (S.plants ? '<span class="chip">🏭 Plants ' + S.plants + "</span>" : "") + (S.hubs ? '<span class="chip">🌍 Hubs ' + S.hubs + "</span>" : "") + "</div></div>";
      return h;
    },
    orders: function () {
      var h = '<div class="ph"><h3>Customer orders</h3><small>' + (S.orders.length < L().maxOrders ? "Next order in " + Math.max(0, Math.ceil(S.nextOrder)) + "s" : "Order board full") + "</small></div>";
      if (!S.orders.length) h += '<div class="empty">No orders right now. New customers are on their way…</div>';
      S.orders.forEach(function (o) {
        var P = D.products[o.p], have = S.goods[o.p], ok = have >= o.q, v = o.ex ? fleetV() : veh(), busy = S.deliveries.filter(function (d) { return d.ex === !!o.ex; }).length >= v.trips, f = o.dl / o.dl0;
        h += '<div class="card' + (o.ex ? " export" : "") + '"><div class="row"><div class="icon" style="background:' + (o.ex ? "#0369a1" : AVATAR[o.av]) + ';color:#fff;font-weight:800;font-size:15px">' + (o.ex ? "🌐" : o.cust[0]) + '</div><div class="grow"><div class="ttl">' + o.cust + (o.ex ? ' <span class="chip">EXPORT</span>' : "") + '</div><div class="sub">' + P.icon + " " + o.q + "× " + P.name + " · have " + have + "/" + o.q + "</div></div>" +
          btn("ship", ok ? (busy ? (o.ex ? "Fleet out" : "Vehicle out") : o.ex ? ["", "🚆", "🚢", "✈️"][S.fleet] + " Export" : "🚚 Ship") : "Need " + (o.q - have), ok && !busy ? "grn" : "", !ok || busy, o.id) + "</div>" +
          '<div class="chips"><span class="chip">💰 ' + coinTxt(Math.round(o.reward * (1 + v.bonus) * (S.fac.printLine ? 1.15 : 1))) + '</span><span class="chip timer ' + (f < 0.25 ? "bad" : f < 0.5 ? "warn" : "") + '">⏰ ' + Math.ceil(o.dl) + "s left</span></div>" +
          '<div class="mini-bar"><i style="width:' + Math.round(f * 100) + "%;background:" + (f < 0.25 ? "#ef4444" : f < 0.5 ? "#f59e0b" : "#22c55e") + '"></i></div></div>';
      });
      return h;
    }
  };
  var FAC_ICON = { printLine: "🖨️", autoDock: "🦾", agv: "🛻", smart: "📡", solarRoof: "🔆" };
  var TAB_TITLE = { machines: "Machines", workers: "Workers", delivery: "Delivery", upgrade: "Upgrades", inventory: "Inventory", orders: "Orders" };
  function prodSelect(m) {
    return '<select class="sel" data-act="product" data-arg="' + m.id + '">' + unlockedProducts().map(function (p) { var P = D.products[p], na = P.needs && !has(P.needs); return '<option value="' + p + '"' + (p === m.product ? " selected" : "") + (na ? " disabled" : "") + ">" + P.icon + " " + P.name + (na ? " (needs line)" : "") + "</option>"; }).join("") + "</select>";
  }
  function teaser() {
    if (S.level > D.freeLevels || S.premium) return '<div class="card prem"><div class="row"><div class="icon" style="background:rgba(255,255,255,.18);border:0">👑</div><div class="grow"><div class="ttl">Premium levels unlocked' + (S.premium ? " (tester)" : "") + '</div><div class="sub">Era ' + D.eraOf(S.level).n + " of 6 · " + D.eraOf(S.level).name + ". " + (D.maxLevel - S.level) + " levels to the Industrial Emperor finale.</div></div></div></div>";
    return '<div class="card prem"><div class="row"><div class="icon" style="background:rgba(255,255,255,.18);border:0">👑</div><div class="grow"><div class="ttl">Premium Levels 51–250</div><div class="sub">Printing &amp; packaging lines, export orders by train, ship and plane, robotics, smart factories and a global empire. Levels 1–50 are free. No payments in this preview: testers can unlock premium from the Menu.</div></div></div></div>';
  }

  /* ---------------- bottom sheet / side panel ---------------- */
  var sheetOpen = false;
  function renderPanel(force) {
    if (!sheetOpen && !force) return;
    if (pointerDown && !force) return;
    var ae = document.activeElement; if (!force && ae && ae.tagName === "SELECT" && $("panel").contains(ae)) return;
    var h = PANELS[tab]();
    if (h !== lastPanel || force) { var pb = $("panelBody"), sc = pb.scrollTop; pb.innerHTML = h; pb.scrollTop = sc; lastPanel = h; }
  }
  function openSheet() { sheetOpen = true; $("panel").classList.add("open"); $("panel").setAttribute("aria-hidden", "false"); closePop(); }
  function closeSheet() {
    if (!sheetOpen) return; sheetOpen = false; $("panel").classList.remove("open"); $("panel").setAttribute("aria-hidden", "true");
    document.querySelectorAll("#tabs button").forEach(function (b) { b.classList.remove("on"); }); tutCheck();
  }
  function setTab(t, keep) {
    if (sheetOpen && tab === t && !keep) { closeSheet(); sfx.tap(); return; }
    tab = t; document.querySelectorAll("#tabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === t); });
    $("sheetTitle").textContent = TAB_TITLE[t]; openSheet(); $("panelBody").scrollTop = 0; renderPanel(true); hud(); sfx.tap(); tutCheck();
  }
  document.querySelectorAll("#tabs button").forEach(function (b) { b.addEventListener("click", function () { setTab(b.dataset.tab); }); });
  $("sheetClose").addEventListener("click", function () { closeSheet(); sfx.tap(); });
  // swipe the sheet down (portrait) or right (landscape) to close it
  (function () {
    var g = $("sheetGrab"), p = $("panel"), sx = 0, sy = 0, on = false, land = false, d = 0;
    g.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) return; on = true; sx = e.clientX; sy = e.clientY; d = 0; land = matchMedia("(orientation:landscape) and (max-height:600px)").matches; p.classList.add("drag"); try { g.setPointerCapture(e.pointerId); } catch (x) {} });
    g.addEventListener("pointermove", function (e) { if (!on) return; d = Math.max(0, land ? e.clientX - sx : e.clientY - sy); p.style.transform = land ? "translateX(" + d + "px)" : "translateY(" + d + "px)"; });
    function end() { if (!on) return; on = false; p.classList.remove("drag"); p.style.transform = ""; if (d > 60) closeSheet(); }
    g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
  })();
  // tapping the factory while the sheet is open just closes it
  $("scene-wrap").addEventListener("pointerdown", function (e) {
    if (e.target.closest("#pop") || e.target.closest("#goalsBox") || e.target.closest("#btnCam")) return;
    if (sheetOpen && !(S.tut >= 0 && S.tut < TUT.length && S.level === 1)) { closeSheet(); e.stopPropagation(); e.preventDefault(); }
  }, true);
  $("panel").addEventListener("pointerdown", function () { pointerDown = true; });
  window.addEventListener("pointerup", function () { setTimeout(function () { pointerDown = false; }, 60); });
  window.addEventListener("pointercancel", function () { pointerDown = false; });
  function doAct(a, g) {
    if (a === "buyRaw") { var p = g.split(":"); A.buyRaw(p[0], +p[1]); }
    else if (a === "toggle") A.toggle(+g);
    else if (a === "service") A.service(+g);
    else if (a === "repair") A.repair(+g);
    else if (a === "upMachine") A.upgradeMachine(+g);
    else if (a === "buyMachine") A.buyMachine();
    else if (a === "hire") A.hire();
    else if (a === "expand") A.expand();
    else if (a === "conveyor") A.conveyor();
    else if (a === "vehicle") A.vehicle();
    else if (a === "fleet") A.fleet();
    else if (a === "facility") A.facility(g);
    else if (a === "plant") A.plant();
    else if (a === "hub") A.hub();
    else if (a === "sell") A.sell(g);
    else if (a === "ship") A.ship(+g);
    else if (a === "boost") tapMachine(S.machines[+g], true);
  }
  $("panelBody").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]"); if (!b || b.disabled) return;
    doAct(b.dataset.act, b.dataset.arg);
    pointerDown = false; renderPanel(true); hud(); tutCheck(); save();
  });
  $("panelBody").addEventListener("change", function (e) {
    var s = e.target; if (!s.dataset.act) return;
    if (s.dataset.act === "product") A.setProduct(+s.dataset.arg, s.value);
    if (s.dataset.act === "assign") A.assign(+s.dataset.arg, s.value);
    s.blur(); pointerDown = false; renderPanel(true); save();
  });

  /* ---------------- machine popover (tap a machine) ---------------- */
  var popId = -1, popHtml = "";
  function openPop(id) { popId = id; popHtml = ""; renderPop(); placePop(); }
  function closePop() { popId = -1; $("pop").classList.add("hidden"); }
  function renderPop() {
    if (popId < 0) return;
    var m = S.machines[popId]; if (!m) return closePop();
    var tr = tierOf(m), nt = D.tiers[m.tier + 1], st = blockReason(m), op = staffed(m);
    var h = '<div class="ph2"><b>M' + (m.id + 1) + " · " + tr.name + '</b><span class="chip">' + tr.short + '</span><button class="x" data-pact="close" aria-label="Close">✕</button></div>' +
      '<div class="st ' + (m.broken ? "bad" : m.cyc ? "ok" : "") + '">' + st + "</div>" +
      '<div class="sub">' + (op ? "👷 " + op.name : "No operator") + " · ⏱ " + cycleTime(m).toFixed(1) + "s · 🔧 " + Math.round(m.cond) + "%</div>" +
      '<div class="mini-bar"><i style="width:' + (m.cyc ? Math.round(m.prog * 100) : m.cond) + "%;background:" + (m.cyc ? "#22c55e" : m.cond > 60 ? "#38bdf8" : m.cond > 35 ? "#f59e0b" : "#ef4444") + '"></i></div>' +
      prodSelect(m).replace('class="sel"', 'class="sel" data-pact="product"') + '<div class="pbtns">' +
      (m.broken ? pb("repair", "🔧 Repair", m.repair > 0 ? Math.ceil(m.repair) + "s" : fmtShort(D.repairCost) + " 🪙", "red", m.repair > 0) :
        (m.cyc ? pb("boost", "⚡ Boost", "+12%", "grn", false) : pb("toggle", m.on ? "⏸ Stop" : "▶ Start", m.on ? "running" : "off", m.on ? "ghost" : "grn", false))) +
      pb("service", "🛠 Service", fmtShort(D.serviceCost) + " 🪙", "ghost", m.broken || m.cond >= 99) +
      (nt ? (nt.unlock > S.level ? pb("", "⬆ " + nt.short, "Lv " + nt.unlock, "", true) : pb("upMachine", "⬆ " + nt.short, fmtShort(nt.upCost) + " 🪙", "acc", S.coins < nt.upCost)) : pb("", "MAX", "tier", "", true)) + "</div>";
    if (h !== popHtml) { var ae = document.activeElement; if (ae && ae.tagName === "SELECT" && $("pop").contains(ae)) return; $("pop").innerHTML = h; popHtml = h; }
    $("pop").classList.remove("hidden");
  }
  function pb(act, label, small, cls, dis) { return '<button class="btn ' + cls + '" data-pact="' + act + '"' + (dis ? " disabled" : "") + ">" + label + "<small>" + small + "</small></button>"; }
  function placePop() {
    if (popId < 0 || !S.machines[popId]) return;
    var s = SLOTS[popId], a = $("scene-wrap").getBoundingClientRect(), ap = $("app").getBoundingClientRect(), p = R3 ? R3.toApp(s.x, s.y - 10, 2.2) : sceneToApp(s.x, s.y - 50);
    var x = p.x - (a.left - ap.left), y = p.y - (a.top - ap.top), el = $("pop"), ph = el.offsetHeight || 150;
    var below = y - ph - 10 < 4; if (below) y = (R3 ? R3.toApp(s.x, s.y + 20, 0).y - (a.top - ap.top) : y + 60) + 10;
    x = Math.max(110, Math.min(a.width - 110, x)); y = Math.max(4, Math.min(a.height - (below ? ph + 4 : 4), y));
    el.classList.toggle("below", below); el.style.left = x + "px"; el.style.top = (below ? y : y - 6) + "px";
  }
  $("pop").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pact]"); if (!b || b.disabled || b.tagName === "SELECT") return;
    var a = b.dataset.pact;
    if (a === "close") { closePop(); sfx.tap(); return; }
    if (a) doAct(a, popId);
    popHtml = ""; renderPop(); hud(); tutCheck(); save();
  });
  $("pop").addEventListener("change", function (e) { var s = e.target; if (s.dataset.pact === "product") { A.setProduct(popId, s.value); s.blur(); popHtml = ""; renderPop(); save(); } });
  ["pointerdown", "touchstart", "wheel"].forEach(function (ev) { $("pop").addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });

  /* ---------------- modals ---------------- */
  function modal(html) { $("modal").innerHTML = '<div class="mbox">' + html + "</div>"; $("modal").classList.remove("hidden"); modalOpen = true; }
  function closeModal() { $("modal").classList.add("hidden"); modalOpen = false; }
  $("modal").addEventListener("click", function (e) {
    var b = e.target.closest("[data-m]"); if (!b) { if (e.target.id === "modal" && !S.pendingLevelUp) closeModal(); return; }
    var a = b.dataset.m; sfx.tap();
    if (a === "close") closeModal();
    if (a === "next") { closeModal(); advanceLevel(); if (S.gate) premiumGate(); else { goalsAuto = T + 5; fire("levelStart", { n: S.level }); } }
    if (a === "map") levelMap();
    if (a === "sound") { S.sound = !S.sound; save(); menu(); }
    if (a === "gfx" && R3) { var qs = ["high", "medium", "low"], qi = qs.indexOf(R3.quality()); R3.setQuality(qs[(qi + 1) % 3]); menu(); }
    if (a === "prem") { A.premium(!S.premium); if (b.dataset.from === "gate") { closeModal(); goalsAuto = T + 5; } else menu(); }
    if (a === "tut") { closeModal(); S.tut = 0; if (S.level !== 1) toast("The tutorial runs on Level 1. Tips are in each tab."); tutShow(); }
    if (a === "reset") { if (confirm("Erase all Factory Kingdom progress on this device?")) { localStorage.removeItem(D.saveKey); if (D.oldSaveKey) localStorage.removeItem(D.oldSaveKey); S = fresh(); belt = []; closeModal(); closeSheet(); closePop(); tutShow(); } }
    if (a === "era") { var el = document.getElementById("era" + b.dataset.e); if (el) el.scrollIntoView({ block: "start" }); }
  });
  function showLevelUp() {
    var l = L(), nl = D.levels[l.n], era = D.eraOf(l.n), nera = nl && D.eraOf(nl.n);
    sfx.level(); confetti(l.mile ? 220 : 120); coinFly(200, 200, 12);
    if (l.n >= D.maxLevel) {
      modal('<div class="big">👑</div><h2>Industrial Emperor!</h2><p>From one wooden press in a rented shed to a global industrial empire. You finished all <b>250 levels</b> of Factory Kingdom.</p>' +
        '<div class="rewards"><div>💰 Finale reward: +' + fmt(l.reward) + " coins</div><div>🏭 Produced " + fmt(S.stats.produced) + " units · " + fmt(S.stats.orders) + " orders · " + fmt(S.stats.exports || 0) + " exports</div><div>🌍 " + S.hubs + " global hubs · " + S.plants + " satellite plants</div><div>🏅 Badge: " + l.badge + "</div></div>" +
        '<button class="btn acc" data-m="next">Keep running the empire ▶</button>');
      return;
    }
    var newEra = nera && nera.n !== era.n;
    modal('<div class="big">' + (newEra ? "🌟" : l.mile ? "🏅" : "🏆") + "</div><h2>Level " + l.n + " complete!</h2><p><b>" + l.title + "</b> done." + (l.mile ? " Milestone reached!" : "") + "</p>" +
      '<div class="rewards"><div>💰 Reward: +' + fmt(l.reward) + " coins</div>" + (l.badge ? "<div>🏅 Badge: " + l.badge + "</div>" : "") + (l.unlocks || []).map(function (u) { return "<div>🔓 " + u + "</div>"; }).join("") + "</div>" +
      (newEra ? '<div class="card teaser"><div class="ttl">New era: ' + nera.name + '</div><div class="sub">Levels ' + nera.from + "–" + nera.to + " · " + nera.desc + "</div></div>" : "") +
      (l.n === D.freeLevels && !S.premium ? teaser() : "") +
      '<p class="sub">Next up: <b>Level ' + nl.n + " · " + nl.title + "</b>" + (nl.n > D.freeLevels ? " 👑" : "") + "</p>" + '<button class="btn acc" data-m="next">Continue ▶</button>');
  }
  function premiumGate() {
    modal('<div class="big">👑</div><h2>Free levels complete!</h2><p>You built a <b>' + space().name + "</b> and finished levels 1–50.</p>" + teaser() +
      '<p class="sub">This is a preview build. There are no payments here.</p><button class="btn acc" data-m="prem" data-from="gate">🧪 Tester: unlock premium</button><button class="btn ghost" data-m="close">Keep playing level 50</button>');
  }
  function levelMap() {
    var h = '<h2>Level map</h2><p class="sub">Factory Kingdom 250 · Level ' + S.level + " · " + (S.premium ? "Premium unlocked (tester)" : "Levels 1–50 free") + '</p><div class="eratabs">' +
      D.eras.map(function (e) { return '<button class="chip' + (D.eraOf(S.level).n === e.n ? " ok" : "") + '" data-m="era" data-e="' + e.n + '">' + e.from + "–" + e.to + "</button>"; }).join("") + "</div>";
    D.eras.forEach(function (e) {
      h += '<div class="erahd" id="era' + e.n + '"><b>Era ' + e.n + " · " + e.name + "</b><small>" + e.desc + (e.from > D.freeLevels ? " · 👑 Premium" : " · Free") + "</small></div><div class=\"lvlist\">";
      for (var i = e.from; i <= e.to; i++) {
        var dn = i < S.level || S.allDone, l = D.levels[i - 1], lk = i > D.freeLevels && !S.premium;
        h += '<div class="lv ' + (dn ? "done" : i === S.level ? "cur" : lk ? "lk" : "") + (l.mile ? " mile" : "") + '" title="' + i + ". " + l.title + '">' + (dn ? "✓" : lk && i !== S.level ? "🔒" : i) + "</div>";
      }
      h += "</div>";
    });
    var cl = L();
    h += '<div class="card"><div class="ttl">Now: ' + cl.n + ". " + cl.title + '</div><div class="sub">' + cl.goals.map(goalLabel).join(" · ") + "</div></div>";
    modal(h + '<button class="btn" data-m="close">Back to factory</button>');
    setTimeout(function () { var el = document.querySelector("#modal .lv.cur"); if (el) el.scrollIntoView({ block: "center" }); }, 30);
  }
  function menu() {
    modal('<h2>Menu</h2><p class="sub">Factory Kingdom 250 · GUNVORA GAMES<br>Preview build · Levels 1–50 free · 51–250 premium</p>' +
      '<button class="btn" data-m="map">🗺️ Level map</button><button class="btn ghost" data-m="sound">' + (S.sound ? "🔊 Sound: on" : "🔈 Sound: off") + '</button>' +
      (R3 ? '<button class="btn ghost" data-m="gfx">Graphics: ' + R3.qualities[R3.quality()].label + '</button>' : "") +
      '<button class="btn ghost tester" data-m="prem">🧪 Tester: unlock premium · ' + (S.premium ? "ON" : "OFF") + '</button>' +
      '<p class="sub" style="font-size:11px">Testing only. No real payments exist in this build.</p>' +
      '<button class="btn ghost" data-m="tut">🎓 Replay tutorial</button><button class="btn ghost" data-m="reset">🗑 Reset progress</button><button class="btn acc" data-m="close">Resume</button>' +
      '<p class="sub" style="margin-top:10px">Progress saves automatically on this device.</p>');
  }
  $("btnMenu").addEventListener("click", function () { sfx.tap(); menu(); });
  $("lvlTitle").addEventListener("click", function () { sfx.tap(); levelMap(); });

  /* ---------------- tutorial (level 1) ---------------- */
  var TUT = [
    { txt: "<b>Welcome to Factory Kingdom!</b> You rent a small shed with <b>1 Basic Press</b> and <b>2 workers</b>. Let's make toy cars and build an empire.", target: "scene", next: "Let's go" },
    { txt: "<b>Tap the machine</b> to switch it on. Ravi will run it and turn wood into toy cars.", target: "m0", wait: function () { return S.machines[0].on; } },
    { txt: "Great! Priya <b>carries finished toys</b> to the shelf. Tap a machine any time for quick actions, or tap a running one to speed it up ⚡", target: "shelf", next: "Next" },
    { txt: "Customers send orders with a <b>deadline</b>. Open the <b>Orders</b> tab below.", target: "tab:orders", wait: function () { return sheetOpen && tab === "orders"; } },
    { txt: "When you have enough toys, tap <b>🚚 Ship</b>. Swipe the panel down or tap the factory to close it. Buy wood in <b>Inventory</b>.", target: "panel", next: "Got it" },
    { txt: "Finish the <b>goals</b> (top left) to complete Level 1. Good luck, boss!", target: "goalsBox", next: "Start building" }
  ];
  function tutRect(t) {
    var a = $("app").getBoundingClientRect(), r, p, q;
    if (R3 && (t === "m0" || t === "shelf")) { var rr3 = R3.rect(t); if (rr3) return rr3; }
    if (t === "m0") { p = sceneToApp(SLOTS[0].x - 40, SLOTS[0].y - 72); q = sceneToApp(SLOTS[0].x + 44, SLOTS[0].y + 36); return { x: p.x, y: p.y, w: q.x - p.x, h: q.y - p.y }; }
    if (t === "shelf") { p = sceneToApp(SHELF_X - 8, 86); q = sceneToApp(SHELF_X + 58, bottomY()); return { x: p.x, y: p.y, w: q.x - p.x, h: q.y - p.y }; }
    if (t === "scene") r = $("scene-wrap").getBoundingClientRect();
    else if (t.indexOf("tab:") === 0) r = document.querySelector('#tabs [data-tab="' + t.slice(4) + '"]').getBoundingClientRect();
    else r = $(t).getBoundingClientRect();
    return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
  }
  function tutShow() {
    if (S.tut < 0 || S.tut >= TUT.length || S.level !== 1) { $("tut").classList.add("hidden"); if (S.tut >= TUT.length) S.tut = -1; return; }
    var st = TUT[S.tut], r = tutRect(st.target), ring = $("tutRing"), box = $("tutBox"), a = $("app").getBoundingClientRect(), sw = $("scene-wrap").getBoundingClientRect();
    $("tut").classList.remove("hidden");
    if (st.target === "scene") ring.style.display = "none"; else ring.style.display = "";
    ring.style.left = r.x - 4 + "px"; ring.style.top = r.y - 4 + "px"; ring.style.width = r.w + 8 + "px"; ring.style.height = r.h + 8 + "px";
    var html = st.txt + '<div class="tn"><small>' + (S.tut + 1) + " / " + TUT.length + ' · <a href="#" data-skip style="color:inherit">skip</a></small>' + (st.next ? '<button class="btn acc sm" data-tnext>' + st.next + "</button>" : "<small>👆 " + (st.target === "m0" ? "Tap the machine" : "Tap the highlight") + "</small>") + "</div>";
    if (box.innerHTML !== html) box.innerHTML = html;
    // keep the bubble in a free strip of the scene: never on top of the highlighted thing
    var bh = box.offsetHeight || 90, top = sw.top - a.top, bot = sw.bottom - a.top, y;
    if (st.target === "panel") { var pr = $("panel").getBoundingClientRect(); y = pr.top - a.top - bh - 10; }
    else if (st.target === "scene" || st.target.indexOf("tab:") === 0) y = bot - bh - 10;
    else if (st.target === "goalsBox") y = r.y + r.h + 12;
    else y = (r.y + r.h / 2 < (top + bot) / 2) ? r.y + r.h + 12 : r.y - bh - 12;
    box.style.top = Math.max(top + 4, Math.min(bot - bh - 4, y)) + "px";
  }
  function tutCheck() {
    if (S.tut < 0) return; var st = TUT[S.tut];
    if (st && st.wait && st.wait()) { S.tut++; save(); }
    tutShow();
  }
  $("tutBox").addEventListener("click", function (e) {
    if (e.target.closest("[data-tnext]")) { S.tut++; if (S.tut >= TUT.length) S.tut = -1; sfx.tap(); save(); tutShow(); }
    if (e.target.closest("[data-skip]")) { e.preventDefault(); S.tut = -1; save(); tutShow(); }
  });

  /* ---------------- loop ---------------- */
  var last = performance.now(), uiT = 0, saveT = 0;
  function frame(now) {
    var dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; T += dt; frameDt = dt;
    var simDt = (S.pendingLevelUp || window.FK_3D_PENDING) ? 0 : dt * SPEED, n = Math.ceil(simDt / 0.05);
    for (var i = 0; i < n; i++) step(simDt / n);
    if (S.pendingLevelUp) { floats.forEach(function (f) { f.life -= dt; }); }
    render(); if (popId >= 0) placePop();
    uiT += dt; if (uiT > 0.25 || uiDirty) { uiT = 0; uiDirty = false; hud(); renderPanel(); if (S.tut >= 0) tutCheck(); }
    saveT += dt; if (saveT > 3) { saveT = 0; save(); }
    requestAnimationFrame(frame);
  }

  S = load() || fresh();
  window.addEventListener("resize", function () { resize(); if (R3) R3.resize(); tutShow(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  resize(); hud(); renderPanel(true);
  if (S.pendingLevelUp) setTimeout(showLevelUp, 300); else if (S.gate) setTimeout(premiumGate, 300); else goalsAuto = 5;
  setTimeout(tutShow, 80);
  requestAnimationFrame(frame);

  // bridge for the 3D renderer (js/scene3d.js)
  window.FK_INT = {
    get S() { return S; }, belt: function () { return belt; }, D: D, SLOTS: SLOTS, ROWS: ROWS, COLS: COLS, SHELF_X: SHELF_X, DOCK_X: DOCK_X, ROAD_Y: ROAD_Y,
    space: space, veh: veh, staffed: staffed, tierOf: tierOf, goodsTotal: goodsTotal, machineCost: machineCost, blockReason: blockReason,
    tap: tap3d, simRate: function () { return (S.pendingLevelUp || window.FK_3D_PENDING) ? 0 : SPEED; },
    attach: function (api) {
      window.FK_3D_PENDING = false; R3 = api || null;
      document.documentElement.classList.toggle("r3", !!R3); document.documentElement.classList.remove("r3-loading");
      cv.style.display = R3 ? "none" : ""; resize(); if (R3) R3.resize(); uiDirty = true; setTimeout(tutShow, 60);
    }
  };
  if ($("btnCam")) $("btnCam").addEventListener("click", function () { if (R3) R3.recenter(); });

  // test / debug hooks (used by the automated play-test; harmless for players)
  window.FK = {
    state: function () { return S; }, actions: A, data: D, belt: function () { return belt; },
    sim: function (sec) { var n = Math.ceil(sec / 0.05); for (var i = 0; i < n; i++) { if (S.pendingLevelUp) return true; step(0.05); } return S.pendingLevelUp; },
    levelPct: levelPct, advance: function () { closeModal(); advanceLevel(); }, setTab: setTab, tapMachine: function (i) { tapMachine(S.machines[i]); },
    setSpeed: function (s) { SPEED = s; }, save: save, headless: false,
    openPop: openPop, closePop: closePop, closeSheet: closeSheet, isSheetOpen: function () { return sheetOpen; }, menu: menu, levelMap: levelMap, premiumGate: premiumGate, showLevelUp: showLevelUp
  };
})();
