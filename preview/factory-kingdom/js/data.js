/* Factory Kingdom 250 — game data (levels 1–10 prototype). Tune numbers here. */
var FK_DATA = {
  saveKey: "gunvora_factorykingdom3d_v1",
  oldSaveKey: "gunvora_factorykingdom_v1",   // 2D prototype save, migrated on first load
  raws: {
    wood:  { name: "Wood",        icon: "🪵", cost: 3, pack: [5, 10, 20] },
    steel: { name: "Steel sheet", icon: "🔩", cost: 7, pack: [5, 10, 20] }
  },
  products: {
    toy:    { name: "Toy Car",      icon: "🚗", raw: "wood",  rawQty: 1, time: 4.0, value: 14, color: "#ef4444", unlock: 1 },
    chair:  { name: "Wooden Chair", icon: "🪑", raw: "wood",  rawQty: 2, time: 6.0, value: 32, color: "#b45309", unlock: 4 },
    bucket: { name: "Steel Bucket", icon: "🪣", raw: "steel", rawQty: 1, time: 5.0, value: 30, color: "#64748b", unlock: 9 }
  },
  // machine tiers: speed multiplier (lower time), quality = chance a unit is good, wear per cycle (% condition)
  tiers: [
    { name: "Basic Press",      short: "T1", speed: 1.00, quality: 0.85, wear: 3.0, color: "#64748b", upCost: 0,   unlock: 1 },
    { name: "Improved Press",   short: "T2", speed: 0.78, quality: 0.90, wear: 2.4, color: "#2563eb", upCost: 150, unlock: 3 },
    { name: "Automated Line",   short: "T3", speed: 0.58, quality: 0.95, wear: 1.8, color: "#7c3aed", upCost: 420, unlock: 7 },
    { name: "Robotic Arm Cell", short: "T4", speed: 0.42, quality: 0.98, wear: 1.2, color: "#f97316", upCost: 950, unlock: 9 }
  ],
  spaces: [
    { name: "Rented Shed",   slots: 2, workers: 3, raw: 24, goods: 16, cost: 0,    unlock: 1 },
    { name: "Workshop",      slots: 4, workers: 5, raw: 45, goods: 30, cost: 350,  unlock: 4 },
    { name: "Small Factory", slots: 6, workers: 8, raw: 90, goods: 60, cost: 1100, unlock: 9 }
  ],
  vehicles: [
    { name: "Hand cart",      trips: 1, time: 12, bonus: 0.00, cost: 0,   unlock: 1 },
    { name: "Delivery truck", trips: 1, time: 6,  bonus: 0.20, cost: 450, unlock: 6 },
    { name: "Big truck",      trips: 2, time: 6,  bonus: 0.30, cost: 1000, unlock: 9 }
  ],
  conveyor: { cost: 300, unlock: 5 },
  machineCost: [0, 120, 200, 300, 420, 560],   // cost of machine #n (index = machines already owned)
  hireCost: function (n) { return 50 + 35 * Math.max(0, n - 2); },  // n = workers already hired
  serviceCost: 8, repairCost: 25, repairTime: 4,
  workerNames: ["Ravi", "Priya", "Arjun", "Meena", "Kiran", "Asha", "Vikram", "Divya", "Sanjay", "Lakshmi"],
  shirts: ["#2563eb", "#f97316", "#059669", "#db2777", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#4338ca", "#16a34a"],
  // goal types: produce {product?,n} · orders {n} · earn {n} · machines {n} · workers {n} · tier {n} · space {n} · conveyor · vehicle {n}
  levels: [
    { n: 1,  title: "Rented Shed",         maxOrders: 2, orderEvery: 10, reward: 60,
      goals: [{ t: "produce", p: "toy", n: 5 }, { t: "orders", n: 2 }],
      unlocks: ["Toy Car production", "Wood supply"] },
    { n: 2,  title: "First Customers",     maxOrders: 2, orderEvery: 10, reward: 80,
      goals: [{ t: "orders", n: 3 }, { t: "earn", n: 120 }],
      unlocks: ["Hire workers", "Machine servicing"] },
    { n: 3,  title: "Second Machine",      maxOrders: 3, orderEvery: 10, reward: 100,
      goals: [{ t: "machines", n: 2 }, { t: "workers", n: 3 }, { t: "orders", n: 3 }],
      unlocks: ["Buy machines", "Improved Press (T2)"] },
    { n: 4,  title: "Wooden Chairs",       maxOrders: 3, orderEvery: 11, reward: 120,
      goals: [{ t: "produce", p: "chair", n: 6 }, { t: "tier", n: 2 }],
      unlocks: ["Wooden Chair product line", "Workshop expansion"] },
    { n: 5,  title: "Workshop Expansion",  maxOrders: 3, orderEvery: 10, reward: 150,
      goals: [{ t: "space", n: 2 }, { t: "orders", n: 5 }],
      unlocks: ["Conveyor belts"] },
    { n: 6,  title: "Conveyor Line",       maxOrders: 4, orderEvery: 9, reward: 180,
      goals: [{ t: "conveyor" }, { t: "machines", n: 3 }, { t: "earn", n: 450 }],
      unlocks: ["Delivery truck"] },
    { n: 7,  title: "On the Road",         maxOrders: 4, orderEvery: 9, reward: 220,
      goals: [{ t: "vehicle", n: 2 }, { t: "workers", n: 5 }, { t: "orders", n: 6 }],
      unlocks: ["Automated Line (T3)"] },
    { n: 8,  title: "Quality First",       maxOrders: 4, orderEvery: 8, reward: 260,
      goals: [{ t: "tier", n: 3 }, { t: "produce", n: 30 }],
      unlocks: [] },
    { n: 9,  title: "Steel Works",         maxOrders: 4, orderEvery: 8, reward: 320,
      goals: [{ t: "produce", p: "bucket", n: 10 }, { t: "machines", n: 4 }],
      unlocks: ["Steel Bucket product line", "Robotic Arm Cell (T4)", "Small Factory", "Big truck"] },
    { n: 10, title: "Small Factory",       maxOrders: 5, orderEvery: 7, reward: 500,
      goals: [{ t: "space", n: 3 }, { t: "orders", n: 8 }, { t: "earn", n: 1500 }],
      unlocks: [] }
  ],
  // teaser for the full game (not playable in this prototype)
  roadmap: [
    ["1–25", "Small workshop, basic production"],
    ["26–50", "Multiple machines and first factory"],
    ["51–100", "Printing, packaging and automated lines"],
    ["101–150", "Multiple factories and export orders"],
    ["151–200", "Robotics and smart manufacturing"],
    ["201–250", "Global industrial empire"]
  ]
};
