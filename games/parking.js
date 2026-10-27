/* Parking Escape — rush-hour style sliding-car puzzle. Original game for Gaming World of Jarvis.
   100 levels; every level was generated and verified solvable with a breadth-first-search solver,
   which also runs in-game to power hints. Moves = one slide of one vehicle (any distance). */
(function () {
  "use strict";
  var W = 480, H = 720, N = 6, CELL = 66, BX = (W - N * CELL) / 2 - 6, BY = 168, EXITR = 2, S, API;
  var KEY = "gv_parking";
  var LEVELS = ["......III.E.F.AAE.F.GHH.BBGJCD.KKJCD","CCKJJHB.K.GHBAA.G.IIIEGDLLLE.DFFFE.D","FFCE.D..CEBDAA..BDIIIGG...HHH.JJJKK.",".GEEE..G..B...AABCDDDF.C...F........",".G.....G.FF.AA...CHHH.DCBB..DC.EEED.","....EE.F...B.FAA.B.F..GG..DDD.CCC...","...II.CF..KKCFAAH.C...H.GGB.EDJJB.ED","..IIHHFFEEECGAA..CGJJ.D..LLLDB..KK.B","II.GG....FD..AAFD.BBBJ.EHHCJ.E..C...","CCC.....E..BAAE..B..FFFD.....D......",".EE.DB..GCDBAAGC......IIHHFFF.......","..EFFF..EJJDAA...DIII...GGCCBB..HHH.","JJ.KCFGIIKCFG.AACFG.....EE..DDHH.BB.",".EEE.....F.CAA.FBC.DDDB..G.....G....","....CCFE....FEAAGBF...GB...DDD......","..DDD....FFE..AACE.GHHC..GBBB.......","..FF....BDG.AABDG..HHDGC..II.C.EE...","...H.....H.B.AA.CBD.E.C.D.E.C.DGGFF.",".JJDE....DE.AAC.I.KKC.IB..CGGB.HH.FF","......CCDDFFAAE..G..E..G.BBB........","MHHHDBMII.DB.AAG.BEJJGCCE..LL.FFFKK.","..FEEE..F.B.AAFGBC...G.C....D.....D.",".G.CHH.G.C.F..AAEF....EF...BDD...B..",".H.....H.IIIAA.DBE...DBE...D.FGGCC.F","H.ECCCHKE.JJHKAA.B.GG..B...IID...FFD","..EDD...E.C..HAACB.H...B...FGG...F..","....GGI..FFFIAADBC...DBC...EEH.....H","JJ.EECI...HCI.AAHB..FFHB...DGG...D..","..E.....EHC.AA.HCBD...CBD.....DGGFF.","H..E..H..E.C.AAE.C.IGGG..IDDB..FF.B.","...ECC.H.E.B.HAADB....D....FFG.....G","FF.CCC.....D..AAED..GGE....HBBII.H..","......CCDDFFAAE.....E..GBBB..G......","..KKG.IIIBG..AAB..HHHBFF.J.CCD.JEE.D",".JJDEE...DHC..AAHC..FFHBI..GGBI.....",".FFF.D..JJ.DAAE.....EIIIGGCCBB...HHH","..GCEE..GCD...AADBII...B.HHFFF......","..GGGBFF.HIBAAEHIB..ECCC..DDD.......","..DFF...DGEE.AAGB.....B..HHCCC.II...","CCC.BF....BFAAE...H.E...H.GGDDH.....","FF..G.....G..AADGC.HHD.C..BDII..BEE.",".....CH..EBCHAAEBC..DEGG..D.....FFF.",".DDD......CB..AACB..IHHB..IEFF...EGG","....G....EGDAA.EGDH..EBBHFFF....CC..",".....D...HFD.AAHFD..CC....EBBB..EGGG",".J..FF.J.GGGKAACBEK..CBEIHHHDDI.....","....EF.IIIEF.AA.CF..JJC...GBDD..GBHH",".....CFF..DC.AA.DCHHH.D..G..BB.GEEE.","...JJ...C.EBAACDEB..CDKK.GG.I.HHFFI.",".KK..C..JJBC..AABC..F.B.I.FEDDIHHEGG","G.IIHHGFFEEEAA..DCJJ..DC..LLLBKK...B","...JJFII..CFG.AACFG..KC.GEEKDD..HHBB",".JJGEE...GIIAAKGB...K.B..FFCCD.HHH.D","JJKKEG....EG.AA.E...D...IIDCBB.HHCFF","J.IIHHJ...GGAAK.B.DDK.B.EEFFFC.....C","HKK.IIHGGDBBAA.D.....DC.FFEEC....JJ.","GIIIFFGCCCHHAAKJDB..KJDB..LLDE.....E","KK.CEE...CLL.AAC.B.HJJ.BIH..DFIGG.DF",".H.JJ..HLLDDAAIB..K.IBC.K.EECFK..GGF","BHDDEEBH.JG.AA.JGC.M.LLCIM..FCIKKKF.","..C.F...C.FEAADI.EH.DIGJH.BBGJ......","JII.BBJ.DDFFAAE.....E..H.GGGCH....C.","KK..DD.IIIBE..AABE.H.FFE.H.CGG.JJC..","..CFFD..CEBD.AAEBD.IIIGG...HHH.JJJKK",".JFCC..JFHH.KJAABDK...BDK.G.EEIIG...",".CCC.HJJBBFH.AAEF....E....GDII..GDKK","...GBB.F.G.D.FAA.D.FIII..JJ.CE.HHHCE",".H..JJ.HLLDDAAI...K.I...KEEBCFKGGBCF","M.HHHBM.IIDB..AADBJJ.GCCE..GLLEFFFKK",".JJJDBKK.FDBAA.FD...HHH.I.GC..I.GCEE",".......IIHB..AAHBD.FJJBD.FGCCC..G.EE","DD..EBJ..CEBJAACE....G...HIGFF.HI...",".F..II.FKKH.AAB.HDC.B.EDCGG.E.C...JJ","CCFFFBH..IIBH.AAE.KKJJE...G.DD..G...",".GG...LD.BBILDAAEIKKHHEI...CJJ...CFF",".JIIDD.J..B..AA.BCGGFFFCK....CKHHEEE","BHDDEEBH.J.CIAAJGCIMLLGC.M..F.KKK.F.","LJJFD.LE.FDK.EAADK..II..H.CGGGH.C.BB","JJJB.C...B.CAA.BE..GD.E..GDFFHII.KKH","IIL.BC..LFBC.AAF.EMDDF.EM.GKK.JJGHH.",".LDEE.HLDKC.HAAKCFH..B.F..IBGGJJIB..",".IIGGE...F.E.AAFD.BBBJD...CJHH..C...","HH.C.....C..AA.B.....BEF.GDDEF.G...F","JJJBEC...BECAA.B.H.GD..H.GDFF.IIKK..",".HHHBD.JJ.BD.AA.ID.CGGI..C.E...C.EFF",".CCJJH..KEGHAAKEGDIIIEGDB.LLLDB.FFF.",".EEJJL.DD.HL.AA.H..CCCH.KKGBFF..GBII","...D.F...D.F.AAG...JJGCH.IEECH.IBBC.","JDDC.BJ..C.BAAIG...HIGE..HFFE.....E.","JJJF..KK.FD..AA.D.HHHCDBI.GC.BI.GEE.",".DDD....BCLLAABCEG.HFFEG.HIIIJ...KKJ","IKKK..IHH.CDI.AACDJJ.FCD..GFEEBBG...","..GB....GBJD.AAFJD.LLF...IKCCE.IKHHE","......IIIJEDAAGJEDHHG.C.F.BBC.F...KK","K..HH.KEE..LK.AAGLFFIDGJ.CIDGJ.CBBB.","JGGEE.J.KC..AAKCB.II..B..HFFFD.H...D",".JJFDKLE.FDKLEAAD.IIC...H.CGGGHBB...","IIL.B...L.BCAAGF.CM.GFDDMKKF.E.JJHHE","FF.J.....JCCIAA.HEIGGGHEKKB.HE..BDDD","B..EGGBLLEC.BAAHC.JJIHC...IKK..FFDD."];
  var OPT = [2,2,3,3,2,3,4,4,4,5,4,5,5,5,4,5,6,6,6,7,6,6,7,7,6,7,7,8,8,9,8,8,8,9,8,9,9,9,9,11,10,10,10,10,9,11,11,11,11,12,11,12,12,12,11,12,12,12,13,14,13,13,13,13,13,14,14,14,14,15,14,15,15,15,14,15,15,16,16,17,16,16,16,16,16,17,17,17,17,18,17,18,18,18,17,19,21,23,25,27];
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
  var PAL = ["#00a8ff", "#ffd23f", "#39d98a", "#b388ff", "#ff8a3d", "#00d4c8", "#ff7ac6", "#7fa8ff", "#c6e05a", "#ffb84d", "#5ad1ff", "#e0e0e0", "#9b7bff"];
  var save = LS(KEY, { done: {}, hints: 3, coins: 0 });
  function limitOf(i) { var o = OPT[i], slack = i < 20 ? Math.max(4, Math.round(o * .8)) : i < 60 ? Math.max(3, Math.round(o * .5)) : Math.max(3, Math.round(o * .35)); return o + slack; }
  function parse(s) {
    var v = {}, i; for (i = 0; i < 36; i++) { var ch = s[i]; if (ch === "." || ch === "x") continue; (v[ch] = v[ch] || []).push(i); }
    return Object.keys(v).sort().map(function (k, idx) { var c = v[k], r0 = Math.floor(c[0] / N), c0 = c[0] % N, h = c.length > 1 && Math.floor(c[1] / N) === r0;
      return { h: h, len: c.length, fixed: h ? r0 : c0, pos: h ? c0 : r0, vis: h ? c0 : r0, col: idx === 0 ? "#ff3b3b" : PAL[(idx * 5 + c.length) % PAL.length], truck: c.length === 3, target: idx === 0 }; });
  }
  function occ(vs, skip) { var o = new Uint8Array(36); vs.forEach(function (v, i) { if (i === skip) return; for (var j = 0; j < v.len; j++) o[v.h ? v.fixed * N + v.pos + j : (v.pos + j) * N + v.fixed] = 1; }); return o; }
  function range(vs, i) { var v = vs[i], o = occ(vs, i), lo = v.pos, hi = v.pos; var at = function (q) { return v.h ? v.fixed * N + q : q * N + v.fixed; };
    while (lo - 1 >= 0 && !o[at(lo - 1)]) lo--; while (hi + v.len < N && !o[at(hi + v.len)]) hi++; if (v.target && hi + v.len === N) hi += 3; return [lo, hi]; }
  /* BFS solver (also used for hints): returns list of [vehicle, pos] moves */
  function solve(vs) {
    var n = vs.length, start = vs.map(function (v) { return v.pos; }), key = function (p) { return String.fromCharCode.apply(null, p.map(function (x) { return 48 + x; })); };
    var seen = {}; seen[key(start)] = null; var fr = [start], o = new Uint8Array(36), guard = 0;
    while (fr.length && guard++ < 80) {
      var nx = [];
      for (var f = 0; f < fr.length; f++) {
        var p = fr[f];
        if (p[0] + vs[0].len === N) { var path = [], k = key(p); while (seen[k]) { path.unshift(seen[k].m); k = seen[k].prev; } return path; }
        o.fill(0); for (var i = 0; i < n; i++) for (var j = 0; j < vs[i].len; j++) o[vs[i].h ? vs[i].fixed * N + p[i] + j : (p[i] + j) * N + vs[i].fixed] = 1;
        for (i = 0; i < n; i++) { var v = vs[i]; for (var d = -1; d <= 1; d += 2) { var q = p[i]; while (true) { var nq = q + d, lead = d < 0 ? nq : nq + v.len - 1; if (lead < 0 || lead >= N || o[v.h ? v.fixed * N + lead : lead * N + v.fixed]) break; q = nq; var np = p.slice(); np[i] = q; var kk = key(np); if (!(kk in seen)) { seen[kk] = { prev: key(p), m: [i, q] }; nx.push(np); } } } }
      }
      fr = nx;
    }
    return null;
  }
  function init(api) { API = api; S = { scr: "menu", ui: UI(1), t: 0, page: 0, parts: [] }; menu(); }
  function firstOpen() { for (var i = 0; i < LEVELS.length; i++) if (!save.done[i]) return i; return LEVELS.length - 1; }
  function totalStars() { var t = 0; for (var k in save.done) t += save.done[k]; return t; }
  function menu() {
    S.scr = "menu"; var ui = S.ui = UI(1);
    button(ui, 90, 360, 300, 64, "▶  Play level " + (firstOpen() + 1), function () { startLevel(firstOpen()); }, { size: 24 });
    button(ui, 90, 440, 300, 56, "🗺  Choose level", function () { S.page = Math.floor(firstOpen() / 20); levels(); }, { col: "#ffd23f", col2: "#ff9f1c" });
  }
  function levels() {
    S.scr = "levels"; var ui = S.ui = UI(5), bw = 74, bh = 70, gx = (W - (5 * bw + 4 * 12)) / 2, base = S.page * 20;
    for (var k = 0; k < 20; k++) (function (i) {
      var open = i === 0 || save.done[i - 1] || save.done[i];
      button(ui, gx + (k % 5) * (bw + 12), 130 + Math.floor(k / 5) * (bh + 14), bw, bh, "", function () { startLevel(i); }, { disabled: !open, col: save.done[i] ? "#39ff88" : (i + 1) % 10 === 0 ? "#ff2bd6" : "#00d4ff", col2: save.done[i] ? "#14a85a" : (i + 1) % 10 === 0 ? "#a0179a" : "#0077ff",
        draw: function (c, b) { T(c, open ? String(i + 1) : "🔒", b.x + b.w / 2, b.y + 26, 22, "#04121f"); if (save.done[i]) stars3(c, b.x + b.w / 2, b.y + 52, save.done[i], 7); else if (open && (i + 1) % 10 === 0) T(c, "BONUS", b.x + b.w / 2, b.y + 52, 11, "#fff"); } });
    })(base + k);
    button(ui, 30, 500, 120, 50, "◀ Prev", function () { S.page = (S.page + 4) % 5; levels(); }, { ghost: true });
    button(ui, 330, 500, 120, 50, "Next ▶", function () { S.page = (S.page + 1) % 5; levels(); }, { ghost: true });
    button(ui, 165, 580, 150, 50, "Menu", menu, { ghost: true, col: "#ffd23f" });
  }
  function startLevel(i) {
    S.scr = "play"; S.li = i; S.vs = parse(LEVELS[i]); S.moves = 0; S.hist = []; S.sel = 0; S.drag = null; S.hint = null; S.exit = 0; S.parts = []; S.lastV = -1;
    S.limit = limitOf(i); S.ui = UI(4);
    var y = 610, w = 100, g = (W - 4 * w) / 5;
    button(S.ui, g, y, w, 52, "↶ Undo", undo, { ghost: true, size: 17 });
    button(S.ui, g * 2 + w, y, w, 52, "⟲ Reset", function () { startLevel(S.li); }, { ghost: true, size: 17 });
    button(S.ui, g * 3 + w * 2, y, w, 52, "💡 Hint", hint, { col: "#ffd23f", col2: "#ff9f1c", size: 17 });
    button(S.ui, g * 4 + w * 3, y, w, 52, "≡ Menu", function () { S.page = Math.floor(S.li / 20); levels(); }, { ghost: true, size: 17 });
    API.setScore(0); API.sfx("move");
  }
  function undo() { if (!S.hist.length || S.exit) return; var h = S.hist.pop(); S.vs[h[0]].pos = S.vs[h[0]].vis = h[1]; S.moves = Math.max(0, S.moves - 1); S.lastV = S.hist.length ? S.hist[S.hist.length - 1][0] : -1; S.hint = null; API.sfx("flip"); }
  function hint() {
    if (S.exit) return;
    if (save.hints <= 0) { if (save.coins >= 25) { save.coins -= 25; save.hints++; } else { S.toast = { s: "No hints left — earn them with 3-star wins", t: 2 }; API.sfx("hit"); return; } }
    var path = solve(S.vs); if (!path || !path.length) return;
    save.hints--; SV(KEY, save); S.hint = { v: path[0][0], to: path[0][1], t: 0 }; S.sel = path[0][0]; API.sfx("coin");
  }
  function commit(i, from) {
    var v = S.vs[i]; if (v.pos === from) return;
    if (S.lastV === i && S.hist.length) { /* consecutive slides of the same vehicle = one move */ if (S.hist[S.hist.length - 1][1] === v.pos) { S.hist.pop(); S.moves--; S.lastV = S.hist.length ? S.hist[S.hist.length - 1][0] : -1; } }
    else { S.hist.push([i, from]); S.moves++; S.lastV = i; }
    if (S.hint && S.hint.v === i && v.pos === S.hint.to) S.hint = null; else if (S.hint) S.hint = null;
    API.sfx("move");
    if (v.target && v.pos + v.len >= N) { v.pos = N - v.len; S.exit = 0.001; API.sfx("win"); return; }
    if (S.moves >= S.limit) { S.failT = .6; }
  }
  function win() {
    var i = S.li, o = OPT[i], slack = S.limit - o, st = S.moves <= o ? 3 : S.moves <= o + Math.ceil(slack / 2) ? 2 : 1;
    var first = !save.done[i], prev = save.done[i] || 0, coins = first ? (10 + st * 5) * ((i + 1) % 10 === 0 ? 2 : 1) : 0, bonus = st === 3 && prev < 3 ? 1 : 0;
    save.done[i] = Math.max(prev, st); save.coins += coins; save.hints += bonus; if (first && (i + 1) % 10 === 0) save.hints += 2; SV(KEY, save);
    API.setScore(st * 100 + Math.max(0, S.limit - S.moves) * 10);
    S.scr = "result"; S.res = { win: true, stars: st, coins: coins, hints: bonus + (first && (i + 1) % 10 === 0 ? 2 : 0) };
    resultButtons(true);
  }
  function resultButtons(won) {
    var ui = S.ui = UI(1), i = S.li, y = 430;
    if (won && i < LEVELS.length - 1) { button(ui, 120, y, 240, 56, "Next level ▶", function () { startLevel(i + 1); }); y += 66; }
    button(ui, 120, y, 240, 52, "↻ " + (won ? "Replay" : "Try again"), function () { startLevel(i); }, { col: "#ffd23f", col2: "#ff9f1c" }); y += 62;
    button(ui, 120, y, 240, 48, "Levels", function () { S.page = Math.floor(i / 20); levels(); }, { ghost: true });
  }
  function cellFromPt(x, y) { var c = Math.floor((x - BX) / CELL), r = Math.floor((y - BY) / CELL); return c >= 0 && c < N + 1 && r >= 0 && r < N ? [r, c] : null; }
  function vehicleAt(x, y) { var rc = cellFromPt(x, y); if (!rc) return -1; for (var i = 0; i < S.vs.length; i++) { var v = S.vs[i]; var r = v.h ? v.fixed : v.vis, c = v.h ? v.vis : v.fixed, w = v.h ? v.len : 1, hh = v.h ? 1 : v.len; var px = (x - BX) / CELL, py = (y - BY) / CELL; if (px >= c && px < c + w && py >= r && py < r + hh) return i; } return -1; }
  function update(dt, api) {
    S.t += dt; var p = api.pointer;
    S.parts.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.t -= dt; }); S.parts = S.parts.filter(function (q) { return q.t > 0; });
    if (S.toast) { S.toast.t -= dt; if (S.toast.t <= 0) S.toast = null; }
    if (S.scr !== "play") { uiInput(S.ui, api); return; }
    if (S.exit) {
      var tv = S.vs[0]; S.exit += dt; tv.vis += dt * (4 + S.exit * 14);
      if (Math.random() < .6) S.parts.push({ x: BX + tv.vis * CELL, y: BY + EXITR * CELL + CELL / 2 + (Math.random() - .5) * 20, vx: -80 - Math.random() * 60, vy: -20, t: .5 });
      if (tv.vis > N + 2) win(); return;
    }
    if (S.failT) { S.failT -= dt; if (S.failT <= 0) { S.failT = 0; S.scr = "result"; S.res = { win: false }; API.sfx("over"); resultButtons(false); } return; }
    if (S.hint) S.hint.t += dt;
    // buttons (tap only while dragging is idle)
    if (!S.drag && p.tapped) { for (var b = 0; b < S.ui.btns.length; b++) if (inB(p, S.ui.btns[b])) { S.ui.btns[b].fn(); return; } }
    if (p.tapped && !S.drag) { var i = vehicleAt(p.x, p.y); if (i >= 0) { var v = S.vs[i]; S.sel = i; S.drag = { i: i, from: v.pos, sx: p.x, sy: p.y, r: range(S.vs, i) }; api.sfx("flip"); } }
    if (S.drag) {
      var d = S.drag, vv = S.vs[d.i], delta = ((vv.h ? p.x - d.sx : p.y - d.sy) / CELL);
      vv.vis = Math.max(d.r[0], Math.min(d.r[1], d.from + delta));
      if (!p.down) { var np = Math.max(d.r[0], Math.min(d.r[1], Math.round(vv.vis))); vv.pos = Math.min(np, N - vv.len); vv.vis = vv.pos; S.drag = null; commit(d.i, d.from); }
      return;
    }
    // keyboard: Space/Enter cycles vehicle, arrows slide it one cell
    if (api.hit("fire") || api.hit("enter")) { S.sel = (S.sel + 1) % S.vs.length; api.sfx("flip"); }
    var sv = S.vs[S.sel], dir = 0;
    if (sv.h) { if (api.hit("left")) dir = -1; if (api.hit("right")) dir = 1; } else { if (api.hit("up")) dir = -1; if (api.hit("down")) dir = 1; }
    if (!dir && (api.hit("left") || api.hit("right") || api.hit("up") || api.hit("down"))) api.sfx("hit"); // wrong axis for this vehicle
    if (dir) { var rg = range(S.vs, S.sel), from = sv.pos, to = sv.pos + dir; if (to >= rg[0] && to <= Math.min(rg[1], N - sv.len)) { sv.pos = sv.vis = to; commit(S.sel, from); } else api.sfx("hit"); }
  }
  function drawCar(c, v, x, y, w, h, sel) {
    c.save(); c.translate(x + w / 2, y + h / 2); if (!v.h) c.rotate(Math.PI / 2);
    var L = v.h ? w : h, Wd = v.h ? h : w, bl = L - 10, bw = Wd - 14;
    c.fillStyle = "rgba(0,0,0,.35)"; rr(c, -bl / 2 + 3, -bw / 2 + 5, bl, bw, 12); c.fill();
    var g = c.createLinearGradient(0, -bw / 2, 0, bw / 2); g.addColorStop(0, v.col); g.addColorStop(.5, shade(v.col, 18)); g.addColorStop(1, shade(v.col, -25));
    c.fillStyle = g; rr(c, -bl / 2, -bw / 2, bl, bw, v.truck ? 8 : 14); c.fill();
    c.lineWidth = sel ? 4 : 2; c.strokeStyle = sel ? "#fff" : "rgba(0,0,0,.35)"; c.stroke();
    if (v.truck) {
      c.fillStyle = shade(v.col, -15); rr(c, -bl / 2 + 6, -bw / 2 + 5, bl * .62, bw - 10, 4); c.fill();
      c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2; for (var k = 1; k < 5; k++) { var xx = -bl / 2 + 6 + k * bl * .62 / 5; c.beginPath(); c.moveTo(xx, -bw / 2 + 7); c.lineTo(xx, bw / 2 - 7); c.stroke(); }
      c.fillStyle = "#1b2a3d"; rr(c, bl / 2 - bl * .2, -bw / 2 + 6, bl * .1, bw - 12, 3); c.fill();
    } else {
      c.fillStyle = "#1b2a3d"; rr(c, bl * .12, -bw / 2 + 6, bl * .16, bw - 12, 4); c.fill(); rr(c, -bl * .36, -bw / 2 + 7, bl * .12, bw - 14, 4); c.fill();
      c.fillStyle = shade(v.col, 30); rr(c, -bl * .22, -bw / 2 + 7, bl * .32, bw - 14, 6); c.fill();
      if (v.target) { c.fillStyle = "#fff"; c.beginPath(); c.arc(-bl * .06, 0, 7, 0, 7); c.fill(); c.fillStyle = "#ff3b3b"; T(c, "★", -bl * .06, 1, 11, "#ff3b3b"); }
    }
    c.fillStyle = "#fff6b0"; c.fillRect(bl / 2 - 4, -bw / 2 + 4, 4, 7); c.fillRect(bl / 2 - 4, bw / 2 - 11, 4, 7);
    c.fillStyle = "#ff4d4d"; c.fillRect(-bl / 2, -bw / 2 + 4, 3, 7); c.fillRect(-bl / 2, bw / 2 - 11, 3, 7);
    c.restore();
  }
  function shade(hex, a) { var n = parseInt(hex.slice(1), 16), r = Math.max(0, Math.min(255, (n >> 16) + a * 2.55)), g = Math.max(0, Math.min(255, (n >> 8 & 255) + a * 2.55)), b = Math.max(0, Math.min(255, (n & 255) + a * 2.55)); return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")"; }
  function drawBoard(c) {
    c.fillStyle = "#26303f"; rr(c, BX - 14, BY - 14, N * CELL + 28, N * CELL + 28, 18); c.fill();
    c.fillStyle = "#3a4558"; c.fillRect(BX, BY, N * CELL, N * CELL);
    c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 2; c.setLineDash([10, 8]);
    for (var i = 1; i < N; i++) { c.beginPath(); c.moveTo(BX + i * CELL, BY + 6); c.lineTo(BX + i * CELL, BY + N * CELL - 6); c.stroke(); c.beginPath(); c.moveTo(BX + 6, BY + i * CELL); c.lineTo(BX + N * CELL - 6, BY + i * CELL); c.stroke(); }
    c.setLineDash([]);
    // exit gate
    var ey = BY + EXITR * CELL; c.fillStyle = "#3a4558"; c.fillRect(BX + N * CELL, ey, 26, CELL);
    c.fillStyle = "#39ff88"; for (var k = 0; k < 3; k++) { var ax = BX + N * CELL + 4 + k * 7 + (S.t * 20 % 7); c.globalAlpha = .4 + .2 * k; c.beginPath(); c.moveTo(ax, ey + CELL / 2 - 10); c.lineTo(ax + 8, ey + CELL / 2); c.lineTo(ax, ey + CELL / 2 + 10); c.fill(); } c.globalAlpha = 1;
    T(c, "EXIT", BX + N * CELL + 13, ey - 12, 13, "#39ff88");
  }
  function draw(c) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a1630"); g.addColorStop(1, "#05070d"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 14; i++) { c.fillStyle = "rgba(0,212,255,.05)"; c.fillRect(0, i * 56, W, 2); }
    if (S.scr === "menu") {
      T(c, "PARKING", W / 2, 110, 54, "#fff"); T(c, "ESCAPE", W / 2, 166, 54, "#ff3b3b");
      drawCar(c, { h: true, len: 2, col: "#ff3b3b", target: true }, 120, 220, 132, 66, false);
      drawCar(c, { h: false, len: 3, col: "#ffd23f", truck: true }, 268, 196, 66, 120, false);
      T(c, "Levels " + Object.keys(save.done).length + "/" + LEVELS.length + "  ·  ⭐ " + totalStars() + "  ·  💡 " + save.hints + "  ·  🪙 " + save.coins, W / 2, 330, 16, "#cfe8ff", "center", "600");
      T(c, "Drag cars along their lane. Free the red car!", W / 2, 540, 16, "#cfe8ff", "center", "600");
      drawUI(c, S.ui); return;
    }
    if (S.scr === "levels") { T(c, "Choose a level", W / 2, 60, 32, "#fff"); T(c, "Levels " + (S.page * 20 + 1) + "–" + (S.page * 20 + 20) + "  ·  difficulty rises as you go", W / 2, 96, 15, "#cfe8ff", "center", "600"); drawUI(c, S.ui); return; }
    // play
    T(c, "Level " + (S.li + 1) + ((S.li + 1) % 10 === 0 ? "  ·  BONUS" : ""), W / 2, 40, 28, "#fff");
    var left = S.limit - S.moves;
    T(c, "Moves " + S.moves + " / " + S.limit, W / 2, 80, 20, left <= 2 ? "#ff5a5f" : "#ffd23f");
    T(c, "Best possible: " + OPT[S.li] + " moves   ·   💡 " + save.hints, W / 2, 112, 14, "#cfe8ff", "center", "600");
    c.fillStyle = "rgba(255,255,255,.12)"; rr(c, 60, 130, W - 120, 8, 4); c.fill(); c.fillStyle = left <= 2 ? "#ff5a5f" : "#39ff88"; rr(c, 60, 130, (W - 120) * Math.max(0, left / S.limit), 8, 4); c.fill();
    drawBoard(c);
    c.save(); c.beginPath(); c.rect(BX - 2, BY - 2, N * CELL + 200, N * CELL + 4); c.clip();
    S.vs.forEach(function (v, i) { var x = BX + (v.h ? v.vis : v.fixed) * CELL + 3, y = BY + (v.h ? v.fixed : v.vis) * CELL + 3, w = (v.h ? v.len : 1) * CELL - 6, h = (v.h ? 1 : v.len) * CELL - 6; drawCar(c, v, x, y, w, h, i === S.sel && S.scr === "play" && !S.exit); });
    c.restore();
    c.fillStyle = "rgba(200,220,255,.6)"; S.parts.forEach(function (q) { c.globalAlpha = q.t * 2; c.beginPath(); c.arc(q.x, q.y, 6, 0, 7); c.fill(); }); c.globalAlpha = 1;
    if (S.hint) { var hv = S.vs[S.hint.v], fx = BX + ((hv.h ? hv.pos : hv.fixed) + (hv.h ? hv.len : 1) / 2) * CELL, fy = BY + ((hv.h ? hv.fixed : hv.pos) + (hv.h ? 1 : hv.len) / 2) * CELL, tx = BX + ((hv.h ? S.hint.to : hv.fixed) + (hv.h ? hv.len : 1) / 2) * CELL, ty = BY + ((hv.h ? hv.fixed : S.hint.to) + (hv.h ? 1 : hv.len) / 2) * CELL;
      var a = .6 + .4 * Math.sin(S.hint.t * 6); c.strokeStyle = "rgba(255,210,63," + a + ")"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(fx, fy); c.lineTo(tx, ty); c.stroke(); var an = Math.atan2(ty - fy, tx - fx); c.fillStyle = "rgba(255,210,63," + a + ")"; c.beginPath(); c.moveTo(tx + Math.cos(an) * 12, ty + Math.sin(an) * 12); c.lineTo(tx + Math.cos(an + 2.4) * 16, ty + Math.sin(an + 2.4) * 16); c.lineTo(tx + Math.cos(an - 2.4) * 16, ty + Math.sin(an - 2.4) * 16); c.fill(); }
    if (S.toast) { c.fillStyle = "rgba(0,0,0,.7)"; rr(c, 40, 570, W - 80, 32, 16); c.fill(); T(c, S.toast.s, W / 2, 586, 14, "#fff", "center", "600"); }
    if (S.scr === "play") { drawUI(c, S.ui); T(c, "Drag cars · Keys: Space = next car, arrows = slide", W / 2, 690, 13, "rgba(207,232,255,.7)", "center", "600"); }
    if (S.scr === "result") {
      c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(0, 0, W, H); panel(c, 50, 210, W - 100, S.ui.btns.length * 64 + 240, S.res.win ? "#39ff88" : "#ff5a5f");
      if (S.res.win) { T(c, "Escaped!", W / 2, 256, 34, "#39ff88"); stars3(c, W / 2, 316, S.res.stars, 24); T(c, S.moves + " moves (best " + OPT[S.li] + ")" + (S.res.coins ? "  ·  +" + S.res.coins + " 🪙" : "") + (S.res.hints ? "  ·  +" + S.res.hints + " 💡" : ""), W / 2, 372, 15, "#fff", "center", "600"); }
      else { T(c, "Out of moves!", W / 2, 260, 32, "#ff5a5f"); T(c, "This level can be solved in " + OPT[S.li] + " moves.", W / 2, 310, 16, "#fff", "center", "600"); T(c, "Tip: use a 💡 hint if you're stuck.", W / 2, 345, 15, "#cfe8ff", "center", "600"); }
      drawUI(c, S.ui);
    }
  }
  window.GV6 = { S: function () { return S; }, solve: function () { return solve(S.vs); }, geo: { BX: BX, BY: BY, CELL: CELL } }; // debug hook used by automated tests
  GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw, hint: "Drag cars and trucks along their lanes to clear a path, then drive the red car out of the EXIT. (Keys: Space picks a car, arrows slide it.)", touch: {} });
})();
