/* Factory Kingdom 250 — game data. Levels 1–10 are hand-made; 11–250 are generated from the era tables below.
   Tune numbers here. Everything the sim, UI and 3D renderer need is data-driven. */
var FK_DATA = (function () {
  var D = {
    saveKey: "gunvora_factorykingdom3d_v1",
    oldSaveKey: "gunvora_factorykingdom_v1",   // 2D prototype save, migrated on first load
    maxLevel: 250, freeLevels: 50,
    raws: {
      wood:  { name: "Wood",        icon: "🪵", cost: 3,  pack: [5, 10, 20], unlock: 1,   color: "#a16207" },
      steel: { name: "Steel sheet", icon: "🔩", cost: 7,  pack: [5, 10, 20], unlock: 9,   color: "#64748b" },
      plastic: { name: "Plastic pellets", icon: "🧴", cost: 6, pack: [10, 20, 40], unlock: 26, color: "#0ea5e9" },
      paper: { name: "Paper rolls", icon: "📜", cost: 5, pack: [10, 20, 40], unlock: 51, color: "#e7e5e4" },
      electronics: { name: "Electronics kits", icon: "🔌", cost: 22, pack: [10, 20, 40], unlock: 101, color: "#16a34a" },
      composites: { name: "Composite panels", icon: "🧱", cost: 60, pack: [10, 20, 40], unlock: 201, color: "#334155" }
    },
    // products: raw + qty, base cycle time (s), base value. needs: facility required to make it. size: carton size class (s/m/l/xl)
    products: {
      toy:     { name: "Toy Car",        icon: "🚗", raw: "wood",  rawQty: 1, time: 4.0,  value: 14,    unlock: 1,   size: "s" },
      chair:   { name: "Wooden Chair",   icon: "🪑", raw: "wood",  rawQty: 2, time: 6.0,  value: 32,    unlock: 4,   size: "m" },
      bucket:  { name: "Steel Bucket",   icon: "🪣", raw: "steel", rawQty: 1, time: 5.0,  value: 30,    unlock: 9,   size: "m" },
      table:   { name: "Wooden Table",   icon: "🛋️", raw: "wood",  rawQty: 3, time: 7.0,  value: 58,    unlock: 11,  size: "l" },
      toolbox: { name: "Steel Toolbox",  icon: "🧰", raw: "steel", rawQty: 2, time: 6.5,  value: 72,    unlock: 21,  size: "m" },
      crate:   { name: "Plastic Crate",  icon: "🧺", raw: "plastic", rawQty: 2, time: 5.0, value: 90,   unlock: 26,  size: "m" },
      shelf:   { name: "Steel Shelf",    icon: "🗄️", raw: "steel", rawQty: 3, time: 7.5,  value: 150,   unlock: 36,  size: "l" },
      desk:    { name: "Office Desk",    icon: "🖥️", raw: "wood",  rawQty: 4, time: 8.0,  value: 190,   unlock: 41,  size: "l" },
      bicycle: { name: "Kids Bicycle",   icon: "🚲", raw: "steel", rawQty: 3, time: 8.5,  value: 260,   unlock: 46,  size: "l" },
      carton:  { name: "Printed Carton", icon: "📦", raw: "paper", rawQty: 2, time: 4.0,  value: 300,   unlock: 51,  size: "m", needs: "printLine" },
      gift:    { name: "Gift Pack",      icon: "🎁", raw: "paper", rawQty: 3, time: 5.0,  value: 420,   unlock: 66,  size: "m", needs: "printLine" },
      lamp:    { name: "Desk Lamp",      icon: "💡", raw: "plastic", rawQty: 3, time: 6.0, value: 520,  unlock: 71,  size: "m" },
      kettle:  { name: "Electric Kettle",icon: "🫖", raw: "steel", rawQty: 3, time: 6.5,  value: 640,   unlock: 81,  size: "m" },
      book:    { name: "Picture Book",   icon: "📚", raw: "paper", rawQty: 3, time: 5.0,  value: 760,   unlock: 91,  size: "s", needs: "printLine" },
      fan:     { name: "Electric Fan",   icon: "🌀", raw: "electronics", rawQty: 1, time: 7.0, value: 1100, unlock: 101, size: "l" },
      washer:  { name: "Washing Machine",icon: "🧺", raw: "electronics", rawQty: 2, time: 10,  value: 1900, unlock: 111, size: "xl" },
      tv:      { name: "LED Television", icon: "📺", raw: "electronics", rawQty: 2, time: 9.0, value: 2300, unlock: 131, size: "l" },
      scooter: { name: "Motor Scooter",  icon: "🛵", raw: "steel", rawQty: 6, time: 11,   value: 3000,  unlock: 141, size: "xl" },
      drone:   { name: "Camera Drone",   icon: "🛸", raw: "electronics", rawQty: 2, time: 8.0, value: 3600, unlock: 151, size: "m" },
      vacuum:  { name: "Robot Vacuum",   icon: "🤖", raw: "electronics", rawQty: 2, time: 7.0, value: 4000, unlock: 161, size: "m" },
      escooter:{ name: "E-Scooter",      icon: "🛴", raw: "electronics", rawQty: 3, time: 10,  value: 5600, unlock: 171, size: "l" },
      cobot:   { name: "Cobot Arm",      icon: "🦾", raw: "electronics", rawQty: 4, time: 12,  value: 8000, unlock: 191, size: "l" },
      solar:   { name: "Solar Panel",    icon: "🔆", raw: "composites", rawQty: 1, time: 6.0,  value: 9000, unlock: 201, size: "l" },
      ev:      { name: "Electric Car",   icon: "🚙", raw: "composites", rawQty: 3, time: 14,   value: 30000, unlock: 221, size: "xl" },
      blade:   { name: "Turbine Blade",  icon: "🌬️", raw: "composites", rawQty: 4, time: 15,   value: 38000, unlock: 231, size: "xl" },
      sat:     { name: "Mini Satellite", icon: "🛰️", raw: "composites", rawQty: 4, time: 16,   value: 52000, unlock: 241, size: "l" }
    },
    // machine tiers: speed multiplier (lower time), quality = chance a unit is good, wear per cycle (% condition)
    tiers: [
      { name: "Basic Press",      short: "T1", speed: 1.00, quality: 0.85, wear: 3.0, color: "#64748b", upCost: 0,     unlock: 1 },
      { name: "Improved Press",   short: "T2", speed: 0.78, quality: 0.90, wear: 2.4, color: "#2563eb", upCost: 150,   unlock: 3 },
      { name: "Automated Line",   short: "T3", speed: 0.58, quality: 0.95, wear: 1.8, color: "#7c3aed", upCost: 420,   unlock: 7 },
      { name: "Robotic Arm Cell", short: "T4", speed: 0.42, quality: 0.98, wear: 1.2, color: "#f97316", upCost: 950,   unlock: 9 },
      { name: "Smart Robot Cell", short: "T5", speed: 0.32, quality: 0.99, wear: 0.9, color: "#0d9488", upCost: 1500000, unlock: 151 },
      { name: "AI Gigaline",      short: "T6", speed: 0.25, quality: 0.995, wear: 0.6, color: "#db2777", upCost: 6000000, unlock: 191 }
    ],
    // sites: index >= 2 all use the six-slot factory floor; later ones are bigger, better equipped buildings
    spaces: [
      { name: "Rented Shed",        slots: 2, workers: 3,  raw: 24,  goods: 16,  cost: 0,       unlock: 1 },
      { name: "Workshop",           slots: 4, workers: 5,  raw: 45,  goods: 30,  cost: 350,     unlock: 4 },
      { name: "Small Factory",      slots: 6, workers: 8,  raw: 90,  goods: 60,  cost: 1100,    unlock: 9 },
      { name: "Large Factory",      slots: 6, workers: 10, raw: 160, goods: 100, cost: 12000,    unlock: 31 },
      { name: "Print & Pack Plant", slots: 6, workers: 11, raw: 240, goods: 150, cost: 250000,   unlock: 61 },
      { name: "Export Plant",       slots: 6, workers: 12, raw: 320, goods: 200, cost: 1500000,  unlock: 106 },
      { name: "Smart Factory",      slots: 6, workers: 13, raw: 420, goods: 260, cost: 12000000,  unlock: 156 },
      { name: "Global Gigafactory", slots: 6, workers: 14, raw: 600, goods: 360, cost: 40000000, unlock: 206 }
    ],
    vehicles: [
      { name: "Hand cart",      trips: 1, time: 12, bonus: 0.00, cost: 0,      unlock: 1 },
      { name: "Delivery truck", trips: 1, time: 6,  bonus: 0.20, cost: 450,    unlock: 6 },
      { name: "Big truck",      trips: 2, time: 6,  bonus: 0.30, cost: 1000,   unlock: 9 },
      { name: "Semi-trailer",   trips: 3, time: 6,  bonus: 0.40, cost: 120000,  unlock: 56 },
      { name: "Electric truck fleet", trips: 4, time: 5, bonus: 0.50, cost: 20000000, unlock: 186 }
    ],
    // export fleet (index 0 = none): ships export orders abroad
    fleet: [
      { name: "No export fleet", trips: 0, time: 0, bonus: 0, cost: 0, unlock: 1 },
      { name: "Freight train",   trips: 1, time: 14, bonus: 0.0, cost: 700000,  unlock: 106 },
      { name: "Cargo ship",      trips: 2, time: 16, bonus: 0.25, cost: 3000000, unlock: 121 },
      { name: "Cargo plane",     trips: 3, time: 10, bonus: 0.40, cost: 25000000, unlock: 181 }
    ],
    conveyor: { cost: 300, unlock: 5 },
    // one-off facilities (conveyor is kept separately for old saves)
    facilities: {
      printLine: { name: "Printing & Packaging Line", cost: 90000,  unlock: 51,  desc: "Prints and packs cartons, gift packs and books. +15% value on every order." },
      autoDock:  { name: "Automated Loading Dock",   cost: 400000, unlock: 76,  desc: "Robotic loaders: every delivery round trip is 25% faster." },
      agv:       { name: "AGV Logistics",            cost: 8000000, unlock: 161, desc: "Self-driving AGVs move goods; workers walk 70% faster." },
      smart:     { name: "Smart Sensors & IoT",      cost: 15000000, unlock: 171, desc: "Predictive maintenance: machines wear 50% slower." },
      solarRoof: { name: "Solar Roof & Batteries",   cost: 60000000, unlock: 211, desc: "Clean power: earns passive coins every second." }
    },
    plants: { unlock: 101, max: 4, cost: function (n) { return Math.round(1200000 * Math.pow(1.6, n)); }, every: 7,
      names: ["Pune Plant", "Chennai Plant", "Kolkata Plant", "Ahmedabad Plant"] },
    hubs: { unlock: 201, max: 5, cost: function (n) { return Math.round(15000000 * Math.pow(1.5, n)); },
      names: ["Dubai Hub", "Singapore Hub", "Rotterdam Hub", "São Paulo Hub", "Los Angeles Hub"] },
    machineCost: [0, 120, 200, 300, 420, 560],   // cost of machine #n (index = machines already owned)
    hireCost: function (n) { return 50 + 35 * Math.max(0, n - 2); },  // n = workers already hired
    serviceCost: 8, repairCost: 25, repairTime: 4,
    sellRate: 0.3,   // wholesale price for surplus stock (fraction of value)
    workerNames: ["Ravi", "Priya", "Arjun", "Meena", "Kiran", "Asha", "Vikram", "Divya", "Sanjay", "Lakshmi", "Farhan", "Neha", "Joseph", "Anita", "Rahul", "Sneha"],
    shirts: ["#2563eb", "#f97316", "#059669", "#db2777", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#4338ca", "#16a34a", "#0f766e", "#9333ea", "#b45309", "#be123c", "#1d4ed8", "#15803d"],
    eras: [
      { n: 1, from: 1,   to: 25,  name: "Small Workshop",          desc: "Small workshop, basic production" },
      { n: 2, from: 26,  to: 50,  name: "First Factory",           desc: "Multiple machines and first factory" },
      { n: 3, from: 51,  to: 100, name: "Print, Pack & Automate",  desc: "Printing, packaging and automated lines" },
      { n: 4, from: 101, to: 150, name: "Factories & Export",      desc: "Multiple factories and export orders" },
      { n: 5, from: 151, to: 200, name: "Robotics & Smart Mfg",    desc: "Robotics and smart manufacturing" },
      { n: 6, from: 201, to: 250, name: "Global Industrial Empire", desc: "Global industrial empire" }
    ],
    // goal types: produce {p?,n} · orders {n} · earn {n} · machines {n} · workers {n} · tier {n} · space {n} · conveyor ·
    //             vehicle {n} · fleet {n} · facility {f} · plants {n} · hubs {n} · export {n}
    levels: [
      { n: 1,  title: "Rented Shed",         maxOrders: 2, orderEvery: 10, reward: 60,
        goals: [{ t: "produce", p: "toy", n: 5 }, { t: "orders", n: 2 }] },
      { n: 2,  title: "First Customers",     maxOrders: 2, orderEvery: 10, reward: 80,
        goals: [{ t: "orders", n: 3 }, { t: "earn", n: 120 }], extraUnlocks: ["Hire workers", "Machine servicing"] },
      { n: 3,  title: "Second Machine",      maxOrders: 3, orderEvery: 10, reward: 100,
        goals: [{ t: "machines", n: 2 }, { t: "workers", n: 3 }, { t: "orders", n: 3 }], extraUnlocks: ["Buy machines"] },
      { n: 4,  title: "Wooden Chairs",       maxOrders: 3, orderEvery: 11, reward: 120,
        goals: [{ t: "produce", p: "chair", n: 6 }, { t: "tier", n: 2 }] },
      { n: 5,  title: "Workshop Expansion",  maxOrders: 3, orderEvery: 10, reward: 150,
        goals: [{ t: "space", n: 2 }, { t: "orders", n: 5 }] },
      { n: 6,  title: "Conveyor Line",       maxOrders: 4, orderEvery: 9, reward: 180,
        goals: [{ t: "conveyor" }, { t: "machines", n: 3 }, { t: "earn", n: 450 }] },
      { n: 7,  title: "On the Road",         maxOrders: 4, orderEvery: 9, reward: 220,
        goals: [{ t: "vehicle", n: 2 }, { t: "workers", n: 5 }, { t: "orders", n: 6 }] },
      { n: 8,  title: "Quality First",       maxOrders: 4, orderEvery: 8, reward: 260,
        goals: [{ t: "tier", n: 3 }, { t: "produce", n: 30 }] },
      { n: 9,  title: "Steel Works",         maxOrders: 4, orderEvery: 8, reward: 320,
        goals: [{ t: "produce", p: "bucket", n: 10 }, { t: "machines", n: 4 }] },
      { n: 10, title: "Small Factory",       maxOrders: 5, orderEvery: 7, reward: 500,
        goals: [{ t: "space", n: 3 }, { t: "orders", n: 8 }, { t: "earn", n: 1500 }] }
    ],
    roadmap: [
      ["1–25", "Small workshop, basic production"],
      ["26–50", "Multiple machines and first factory"],
      ["51–100", "Printing, packaging and automated lines"],
      ["101–150", "Multiple factories and export orders"],
      ["151–200", "Robotics and smart manufacturing"],
      ["201–250", "Global industrial empire"]
    ]
  };

  /* ---------- order maths shared by the sim and the level generator ---------- */
  D.levelMult = function (n) { return n <= 10 ? 1 + 0.05 * (n - 1) : 1.45 + 0.012 * (n - 10); };
  D.orderQtyMax = function (n) { return n <= 10 ? 3 + Math.floor(n / 3) : Math.min(12, 6 + Math.floor(n / 30)); };
  D.eraOf = function (n) { for (var i = 0; i < D.eras.length; i++) if (n <= D.eras[i].to) return D.eras[i]; return D.eras[D.eras.length - 1]; };
  D.productsAt = function (n) { return Object.keys(D.products).filter(function (k) { return D.products[k].unlock <= n; }); };
  // the products customers ask for at level n: the newest few lines
  D.demandAt = function (n) { var p = D.productsAt(n); return p.slice(Math.max(0, p.length - 4)); };
  D.estReward = function (n) {
    var dm = D.demandAt(n), v = 0; dm.forEach(function (p) { v += D.products[p].value; }); v /= dm.length;
    var q = (2 + D.orderQtyMax(n)) / 2; return q * v * D.levelMult(n);
  };

  /* ---------- level generator for 11–250 ---------- */
  var T1 = {
    1: ["Busy Bench", "Steady Hands", "Market Day", "Sawdust & Sweat", "Local Favourite", "Weekend Rush", "Fresh Varnish", "Tight Deadlines", "Repeat Customers", "Small but Mighty", "Craft Fair", "Night Shift", "Workshop Pride", "Word of Mouth", "Full Order Book"],
    2: ["Factory Floor", "Shift Change", "Line Balancing", "Bulk Buyers", "Quality Audit", "Rush Season", "City Contracts", "Lean Week", "Steel & Plastic", "Retail Chains", "Team Leaders", "Overtime", "Catalogue Launch", "Warehouse Club", "Peak Demand"],
    3: ["Ink & Paper", "Die-Cut Day", "Brand Partners", "Shrink Wrap", "Festival Packs", "Label Run", "Barcode Week", "Retail Ready", "Automation Push", "Smart Packaging", "Seasonal Gifts", "Line Speed", "Print Proofs", "Pallet Wrap", "Store Launch"],
    4: ["Border Crossing", "Customs Clear", "Port Day", "Rail Freight", "Container Load", "Trade Fair", "Overseas Buyers", "Twin Plants", "Supply Chain", "Bulk Export", "Global Catalogue", "Letter of Credit", "Night Freight", "Export Awards", "Group Network"],
    5: ["Robot Week", "Digital Twin", "Sensor Mesh", "Lights-Out Shift", "Vision Inspection", "Predictive Care", "AGV Highways", "Cobots Assemble", "Zero Defects", "Data Driven", "Smart Scheduling", "Edge Computing", "Machine Learning", "Self-Healing Line", "Industry 4.0"],
    6: ["Global Markets", "Hub Expansion", "Green Energy", "Mega Contracts", "Continental Supply", "Gigafactory Rush", "World Expo", "Solar Fields", "Clean Fleet", "Sky Freight", "Trade Empire", "Board Meeting", "Stock Listing", "Global Brand", "Industrial Titan"]
  };
  var MILE = { 20: "Workshop Master", 30: "Factory Ready", 40: "Line Leader", 50: "Factory Founder", 60: "Print Pioneer", 70: "Pack Champion", 80: "Automation Ace", 90: "Brand Builder", 100: "Centurion Plant",
    110: "Export Starter", 120: "Freight Boss", 130: "Twin Factory", 140: "Trade Baron", 150: "Export Titan", 160: "Robot Wrangler", 170: "Smart Operator", 180: "Data Master",
    190: "Future Factory", 200: "Smart Empire", 210: "Global Hub", 220: "Green Giant", 230: "World Supplier", 240: "Mega Corp", 250: "Industrial Emperor" };

  function unlocksAt(n) {
    var u = [];
    Object.keys(D.raws).forEach(function (k) { if (D.raws[k].unlock === n && n > 1) u.push({ k: "raw", id: k, label: D.raws[k].name + " supply" }); });
    Object.keys(D.products).forEach(function (k) { if (D.products[k].unlock === n) u.push({ k: "product", id: k, label: D.products[k].name + " product line" }); });
    D.tiers.forEach(function (t, i) { if (t.unlock === n && i) u.push({ k: "tier", id: i, label: t.name + " (" + t.short + ")" }); });
    D.spaces.forEach(function (s, i) { if (s.unlock === n && i) u.push({ k: "space", id: i, label: s.name }); });
    D.vehicles.forEach(function (v, i) { if (v.unlock === n && i) u.push({ k: "vehicle", id: i, label: v.name }); });
    D.fleet.forEach(function (v, i) { if (v.unlock === n && i) u.push({ k: "fleet", id: i, label: v.name + " (export)" }); });
    Object.keys(D.facilities).forEach(function (k) { if (D.facilities[k].unlock === n) u.push({ k: "facility", id: k, label: D.facilities[k].name }); });
    if (D.conveyor.unlock === n) u.push({ k: "conveyor", label: "Conveyor belts" });
    if (D.plants.unlock === n) u.push({ k: "plants", label: "Satellite factories" });
    if (D.hubs.unlock === n) u.push({ k: "hubs", label: "Global trade hubs" });
    return u;
  }
  D.unlocksAt = unlocksAt;
  // extra growth goals so the bigger mechanics keep being used
  var GROW = { 126: { t: "plants", n: 2 }, 146: { t: "plants", n: 3 }, 176: { t: "plants", n: 4 }, 216: { t: "hubs", n: 2 }, 226: { t: "hubs", n: 3 }, 236: { t: "hubs", n: 4 }, 246: { t: "hubs", n: 5 },
    13: { t: "workers", n: 6 }, 17: { t: "machines", n: 5 }, 24: { t: "machines", n: 6 }, 28: { t: "workers", n: 8 }, 34: { t: "workers", n: 10 } };

  for (var n = 11; n <= D.maxLevel; n++) {
    var era = D.eraOf(n), mile = n % 10 === 0, goals = [], est = D.estReward(n);
    unlocksAt(n).forEach(function (u) {
      if (u.k === "product") goals.push({ t: "produce", p: u.id, n: Math.min(24, 4 + Math.floor(n / 14)) });
      else if (u.k === "tier") goals.push({ t: "tier", n: u.id + 1 });
      else if (u.k === "space") goals.push({ t: "space", n: u.id + 1 });
      else if (u.k === "vehicle") goals.push({ t: "vehicle", n: u.id + 1 });
      else if (u.k === "fleet") goals.push({ t: "fleet", n: u.id });
      else if (u.k === "facility") goals.push({ t: "facility", f: u.id });
      else if (u.k === "plants") goals.push({ t: "plants", n: 1 });
      else if (u.k === "hubs") goals.push({ t: "hubs", n: 1 });
    });
    if (GROW[n]) goals.push(GROW[n]);
    var ordersN = Math.min(12, 3 + Math.floor(n / 22)), fill = [];
    var hasFleet = n >= D.fleet[1].unlock + 1;
    var k = n % 4;
    if (k === 0) fill = [{ t: "orders", n: ordersN }, { t: "earn", n: Math.round(est * ordersN * 0.55 / 10) * 10 }];
    else if (k === 1) fill = [{ t: "produce", n: Math.min(80, 12 + Math.floor(n / 4)) }, { t: "orders", n: ordersN }];
    else if (k === 2) fill = hasFleet ? [{ t: "export", n: Math.min(5, 1 + Math.floor((n - 100) / 40)) }, { t: "orders", n: Math.max(2, ordersN - 2) }] : [{ t: "earn", n: Math.round(est * ordersN * 0.6 / 10) * 10 }, { t: "orders", n: ordersN }];
    else fill = [{ t: "produce", p: D.demandAt(n)[D.demandAt(n).length - 1 - (n % 2)] || D.demandAt(n)[0], n: Math.min(30, 6 + Math.floor(n / 12)) }, { t: "earn", n: Math.round(est * ordersN * 0.5 / 10) * 10 }];
    while (goals.length < 3 && fill.length) goals.push(fill.shift());
    if (mile && goals.length < 3) goals.push(goals.some(function (g) { return g.t === "orders"; }) ? { t: "produce", n: Math.min(90, 20 + Math.floor(n / 4)) } : { t: "orders", n: ordersN + 2 });
    var titles = T1[era.n], title = MILE[n] || titles[(n * 7) % titles.length];
    D.levels.push({ n: n, title: title, era: era.n, mile: mile, maxOrders: Math.min(7, 4 + Math.floor(n / 40)), orderEvery: Math.max(5, 8 - n / 50),
      reward: Math.round(est * (mile ? 4 : 1.4) / 10) * 10, goals: goals.slice(0, 3) });
  }
  D.levels.forEach(function (l) {
    l.era = l.era || D.eraOf(l.n).n; l.mile = l.mile || l.n % 10 === 0;
    l.unlocks = (l.extraUnlocks || []).concat(unlocksAt(l.n + 1).map(function (u) { return u.label; }));
    if (l.mile) l.badge = MILE[l.n] || "Milestone " + l.n;
  });
  return D;
})();
