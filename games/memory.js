/* Memory Jungle — original Gaming World of Jarvis kids game (no ads, no purchases). */
(function () {
  var W = 600, H = 640, N = 4, CW = 120, CH = 120, GAP = 12, OX = (W - (N * CW + (N - 1) * GAP)) / 2, OY = 100, S;
  var ANIMALS = [
    { n: "Lion", c: "#ffb300", ear: "mane" }, { n: "Frog", c: "#3ddc84", ear: "eyes" }, { n: "Panda", c: "#f5f5f5", ear: "panda" }, { n: "Piggy", c: "#ff8fb1", ear: "point" },
    { n: "Kitty", c: "#ff8a3d", ear: "point" }, { n: "Bear", c: "#a1795b", ear: "round" }, { n: "Bunny", c: "#d9d2ff", ear: "long" }, { n: "Koala", c: "#9aa5b1", ear: "big" }
  ];
  function init() {
    var deck = []; for (var i = 0; i < 8; i++) deck.push(i, i);
    for (var j = deck.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), t = deck[j]; deck[j] = deck[r]; deck[r] = t; }
    S = { cards: deck.map(function (a, i) { return { a: a, open: 0, target: 0, done: false, i: i }; }), sel: [], wait: 0, moves: 0, t: 0, cur: 0, pairs: 0, fin: 0, sparks: [] };
  }
  function face(c, a, x, y, s) {
    var A = ANIMALS[a]; c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = A.c;
    if (A.ear === "mane") { c.fillStyle = "#c77700"; for (var i = 0; i < 12; i++) { c.beginPath(); c.arc(Math.cos(i * .52) * 30, Math.sin(i * .52) * 30, 13, 0, 7); c.fill(); } c.fillStyle = A.c; }
    if (A.ear === "point") { c.beginPath(); c.moveTo(-28, -10); c.lineTo(-22, -40); c.lineTo(-6, -24); c.moveTo(28, -10); c.lineTo(22, -40); c.lineTo(6, -24); c.fill(); }
    if (A.ear === "round" || A.ear === "panda") { c.fillStyle = A.ear === "panda" ? "#222" : A.c; c.beginPath(); c.arc(-24, -24, 11, 0, 7); c.arc(24, -24, 11, 0, 7); c.fill(); c.fillStyle = A.c; }
    if (A.ear === "big") { c.fillStyle = "#7d8792"; c.beginPath(); c.arc(-30, -14, 16, 0, 7); c.arc(30, -14, 16, 0, 7); c.fill(); c.fillStyle = "#ffd1dc"; c.beginPath(); c.arc(-30, -14, 8, 0, 7); c.arc(30, -14, 8, 0, 7); c.fill(); c.fillStyle = A.c; }
    if (A.ear === "long") { c.beginPath(); c.ellipse(-12, -40, 8, 22, -.15, 0, 7); c.ellipse(12, -40, 8, 22, .15, 0, 7); c.fill(); c.fillStyle = "#ffd1dc"; c.beginPath(); c.ellipse(-12, -40, 4, 14, -.15, 0, 7); c.ellipse(12, -40, 4, 14, .15, 0, 7); c.fill(); c.fillStyle = A.c; }
    if (A.ear === "eyes") { c.beginPath(); c.arc(-14, -24, 12, 0, 7); c.arc(14, -24, 12, 0, 7); c.fill(); }
    c.beginPath(); c.ellipse(0, 0, 28, 25, 0, 0, 7); c.fill();
    if (A.ear === "panda") { c.fillStyle = "#222"; c.beginPath(); c.ellipse(-11, -4, 8, 10, .4, 0, 7); c.ellipse(11, -4, 8, 10, -.4, 0, 7); c.fill(); }
    c.fillStyle = "#fff"; var ey = A.ear === "eyes" ? -24 : -4; c.beginPath(); c.arc(-11, ey, 5.5, 0, 7); c.arc(11, ey, 5.5, 0, 7); c.fill();
    c.fillStyle = "#111"; c.beginPath(); c.arc(-10, ey + 1, 3, 0, 7); c.arc(12, ey + 1, 3, 0, 7); c.fill();
    if (A.n === "Piggy") { c.fillStyle = "#ff6f9a"; c.beginPath(); c.ellipse(0, 10, 10, 7, 0, 0, 7); c.fill(); c.fillStyle = "#a33"; c.beginPath(); c.arc(-3, 10, 2, 0, 7); c.arc(3, 10, 2, 0, 7); c.fill(); }
    else { c.fillStyle = A.n === "Koala" ? "#333" : "#4a2b1a"; c.beginPath(); c.ellipse(0, 7, A.n === "Koala" ? 7 : 4, A.n === "Koala" ? 8 : 3, 0, 0, 7); c.fill(); }
    c.strokeStyle = "#4a2b1a"; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 11, 8, .3, 2.84); c.stroke();
    if (A.n === "Kitty") { c.beginPath(); c.moveTo(-14, 8); c.lineTo(-32, 4); c.moveTo(-14, 12); c.lineTo(-32, 14); c.moveTo(14, 8); c.lineTo(32, 4); c.moveTo(14, 12); c.lineTo(32, 14); c.stroke(); }
    c.restore();
  }
  function cardAt(x, y) { for (var i = 0; i < 16; i++) { var cx = OX + (i % N) * (CW + GAP), cy = OY + Math.floor(i / N) * (CH + GAP); if (x >= cx && x <= cx + CW && y >= cy && y <= cy + CH) return i; } return -1; }
  function flip(i, api) {
    var k = S.cards[i]; if (S.wait > 0 || k.done || k.target || S.sel.length >= 2) return;
    k.target = 1; S.sel.push(i); api.sfx("flip");
    if (S.sel.length === 2) {
      S.moves++; var a = S.cards[S.sel[0]], b = S.cards[S.sel[1]];
      if (a.a === b.a) { a.done = b.done = true; S.sel = []; S.pairs++; api.sfx("coin"); for (var j = 0; j < 14; j++) S.sparks.push({ x: OX + (i % N) * (CW + GAP) + CW / 2, y: OY + Math.floor(i / N) * (CH + GAP) + CH / 2, vx: (Math.random() - .5) * 300, vy: (Math.random() - .5) * 300, t: .8 }); }
      else S.wait = .9;
    }
  }
  function update(dt, api) {
    S.t += dt; var p = api.pointer;
    if (p.tapped) { var i = cardAt(p.x, p.y); if (i >= 0) { S.cur = i; flip(i, api); } }
    if (api.hit("left")) S.cur = (S.cur + 15) % 16; if (api.hit("right")) S.cur = (S.cur + 1) % 16;
    if (api.hit("up")) S.cur = (S.cur + 12) % 16; if (api.hit("down")) S.cur = (S.cur + 4) % 16;
    if (api.hit("fire") || api.hit("enter")) flip(S.cur, api);
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) { S.sel.forEach(function (j) { S.cards[j].target = 0; }); S.sel = []; } }
    S.cards.forEach(function (k) { k.open += (k.target - k.open) * Math.min(1, dt * 12); if (k.done) k.target = 1; });
    S.sparks.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; }); S.sparks = S.sparks.filter(function (s) { return s.t > 0; });
    var sc = Math.max(0, S.pairs * 100 - Math.max(0, S.moves - S.pairs) * 10); api.setScore(sc);
    if (S.pairs === 8) { S.fin += dt; if (S.fin > .8) { var stars = S.moves <= 12 ? 3 : S.moves <= 18 ? 2 : 1; api.setScore(sc + Math.max(0, 300 - Math.floor(S.t) * 3)); api.over({ win: true, title: "You found them all! " + "⭐".repeat(stars), detail: S.moves + " moves · " + Math.floor(S.t) + "s" }); } }
  }
  function draw(c) {
    var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0f5132"); g.addColorStop(1, "#2fb36d"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(27,122,67,.6)"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(90, 60, 30, 160); c.quadraticCurveTo(-30, 80, 0, 0); c.fill(); c.beginPath(); c.moveTo(W, H); c.quadraticCurveTo(W - 90, H - 60, W - 30, H - 160); c.quadraticCurveTo(W + 30, H - 80, W, H); c.fill();
    c.fillStyle = "#fff"; c.font = "bold 26px system-ui,sans-serif"; c.textAlign = "center"; c.fillText("Memory Jungle", W / 2, 44);
    c.font = "bold 17px system-ui,sans-serif"; c.fillStyle = "#e8ffe9"; c.fillText("Pairs " + S.pairs + "/8   ·   Moves " + S.moves + "   ·   " + Math.floor(S.t) + "s", W / 2, 76);
    S.cards.forEach(function (k, i) {
      var x = OX + (i % N) * (CW + GAP), y = OY + Math.floor(i / N) * (CH + GAP), sx = Math.abs(Math.cos(k.open * Math.PI)), front = k.open > .5;
      c.save(); c.translate(x + CW / 2, y + CH / 2); c.scale(Math.max(.02, sx), 1);
      c.fillStyle = "rgba(0,0,0,.25)"; rr(c, -CW / 2 + 3, -CH / 2 + 5, CW, CH, 16); c.fill();
      c.fillStyle = front ? (k.done ? "#fffbe6" : "#ffffff") : "#1f8a4c"; rr(c, -CW / 2, -CH / 2, CW, CH, 16); c.fill();
      c.lineWidth = 4; c.strokeStyle = k.done ? "#ffd23f" : "#0b3d20"; c.stroke();
      if (front) { face(c, k.a, 0, -8, 1.25); c.fillStyle = "#0b3d20"; c.font = "bold 15px system-ui,sans-serif"; c.textAlign = "center"; c.fillText(ANIMALS[k.a].n, 0, CH / 2 - 12); }
      else { c.fillStyle = "#3ddc84"; c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(34, 0, 0, 36); c.quadraticCurveTo(-34, 0, 0, -36); c.fill(); c.strokeStyle = "#1f8a4c"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 30); c.stroke(); }
      c.restore();
      if (i === S.cur) { c.strokeStyle = "#00d4ff"; c.lineWidth = 3; c.setLineDash([8, 6]); rr(c, x - 5, y - 5, CW + 10, CH + 10, 20); c.stroke(); c.setLineDash([]); }
    });
    c.fillStyle = "#ffd23f"; S.sparks.forEach(function (s) { c.globalAlpha = s.t; c.fillRect(s.x - 3, s.y - 3, 6, 6); }); c.globalAlpha = 1;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Tap two cards to flip them. Find all 8 animal pairs! (Keyboard: arrows + Space)" });
})();
