/* ONE MOVE – puzzle engine (pure logic, no DOM). Works in the browser and in node.
   Every level is checked by simulation: a move is applied to a copy of the level and the
   resulting position is tested (equation true / path open / ball reaches target / hero safe). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OMEngine = factory();
})(this, function () {
  'use strict';
  var DIRS = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
  function gridOf(rows) { return rows.map(function (r) { return r.split(''); }); }
  function cloneGrid(g) { return g.map(function (r) { return r.slice(); }); }

  /* ---------------- 1. MATCHSTICK ----------------
     Digit segments: 0=a top,1=b top-right,2=c bottom-right,3=d bottom,4=e bottom-left,5=f top-left,6=g middle.
     Operator slots: 0=h horizontal,1=v vertical,2=d1 "\" diagonal,3=d2 "/" diagonal. '=' is fixed. */
  var SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
  var DIGIT_MASK = {}, MASK_DIGIT = {};
  Object.keys(SEG).forEach(function (d) {
    var m = 0; SEG[d].split('').forEach(function (c) { m |= 1 << ('abcdefg'.indexOf(c)); });
    DIGIT_MASK[d] = m; MASK_DIGIT[m] = d;
  });
  var OP_MASK = { '-': 1, '+': 3, 'x': 12 }, MASK_OP = { 1: '-', 3: '+', 12: 'x' };
  function mParse(level) {
    var allowX = /x/.test(level.ops || '') || /x/.test(level.eq);
    var pos = level.eq.split('').map(function (ch) {
      if (DIGIT_MASK[ch] !== undefined) return { k: 'd', m: DIGIT_MASK[ch], n: 7 };
      if (OP_MASK[ch] !== undefined) return { k: 'o', m: OP_MASK[ch], n: allowX ? 4 : 2 };
      if (ch === '=') return { k: 'e', m: 3, n: 2 };
      throw new Error('bad eq char ' + ch);
    });
    return { t: 'm', pos: pos };
  }
  function mClone(s) { return { t: 'm', pos: s.pos.map(function (p) { return { k: p.k, m: p.m, n: p.n }; }) }; }
  function mMoves(s) {
    var from = [], to = [], out = [];
    s.pos.forEach(function (p, i) {
      if (p.k === 'e') return;
      for (var b = 0; b < p.n; b++) { if (p.m & (1 << b)) from.push([i, b]); else to.push([i, b]); }
    });
    from.forEach(function (f) { to.forEach(function (t) { out.push({ t: 'm', fp: f[0], fs: f[1], tp: t[0], ts: t[1] }); }); });
    return out;
  }
  function mApply(s, mv) {
    var n = mClone(s), a = n.pos[mv.fp], b = n.pos[mv.tp];
    if (!a || !b || a.k === 'e' || b.k === 'e') return null;
    if (!(a.m & (1 << mv.fs)) || (b.m & (1 << mv.ts))) return null;
    if (mv.fs >= a.n || mv.ts >= b.n) return null;
    a.m &= ~(1 << mv.fs); b.m |= 1 << mv.ts;
    return n;
  }
  function mText(s) { // null if any glyph is invalid
    var out = '';
    for (var i = 0; i < s.pos.length; i++) {
      var p = s.pos[i], c;
      if (p.k === 'd') c = MASK_DIGIT[p.m];
      else if (p.k === 'o') c = MASK_OP[p.m];
      else c = p.m === 3 ? '=' : undefined;
      if (c === undefined) return null;
      out += c;
    }
    return out;
  }
  function evalSide(str) { // numbers & + - x, x binds tighter; null if malformed
    var toks = str.match(/\d+|[+\-x]/g);
    if (!toks || toks.join('') !== str) return null;
    if (toks.length % 2 === 0) return null;
    for (var i = 0; i < toks.length; i++) {
      var isNum = /^\d+$/.test(toks[i]);
      if ((i % 2 === 0) !== isNum) return null;
      if (isNum && toks[i].length > 1 && toks[i][0] === '0') return null;
    }
    var terms = [], ops = [], cur = +toks[0];
    for (i = 1; i < toks.length; i += 2) {
      var op = toks[i], v = +toks[i + 1];
      if (op === 'x') cur *= v; else { terms.push(cur); ops.push(op); cur = v; }
    }
    terms.push(cur);
    var r = terms[0];
    for (i = 0; i < ops.length; i++) r = ops[i] === '+' ? r + terms[i + 1] : r - terms[i + 1];
    return r;
  }
  function mCheck(s) {
    var txt = mText(s);
    if (!txt) return { ok: false, why: 'shape', text: null };
    var parts = txt.split('=');
    if (parts.length !== 2) return { ok: false, why: 'shape', text: txt };
    var L = evalSide(parts[0]), R = evalSide(parts[1]);
    if (L === null || R === null) return { ok: false, why: 'shape', text: txt };
    return { ok: L === R, why: L === R ? 'true' : 'false', text: txt, L: L, R: R };
  }

  /* ---------------- 2. BLOCK PATH (slide) ----------------
     '#' wall, '.' floor, 'B' crate (slides until it hits something), 'S' hero, 'E' exit,
     '~' water (a crate that slides into water sinks and becomes a bridge '_'). */
  function bParse(level) { return { t: 'b', g: gridOf(level.g) }; }
  function bAt(g, x, y) { return (y < 0 || y >= g.length || x < 0 || x >= g[0].length) ? null : g[y][x]; }
  function bSlide(g, x, y, d) { // returns end cell + sink flag, or null when it can't move
    var dx = DIRS[d][0], dy = DIRS[d][1], cx = x, cy = y, steps = 0, sink = false;
    for (;;) {
      var c = bAt(g, cx + dx, cy + dy);
      if (c === '.' || c === '_') { cx += dx; cy += dy; steps++; continue; }
      if (c === '~') { cx += dx; cy += dy; steps++; sink = true; }
      break;
    }
    return steps ? { x: cx, y: cy, steps: steps, sink: sink } : null;
  }
  function bMoves(s) {
    var out = [];
    s.g.forEach(function (row, y) { row.forEach(function (c, x) {
      if (c !== 'B') return;
      ['u', 'r', 'd', 'l'].forEach(function (d) { if (bSlide(s.g, x, y, d)) out.push({ t: 'b', x: x, y: y, d: d }); });
    }); });
    return out;
  }
  function bApply(s, mv) {
    if (bAt(s.g, mv.x, mv.y) !== 'B' || !DIRS[mv.d]) return null;
    var e = bSlide(s.g, mv.x, mv.y, mv.d); if (!e) return null;
    var g = cloneGrid(s.g); g[mv.y][mv.x] = '.'; g[e.y][e.x] = e.sink ? '_' : 'B';
    return { t: 'b', g: g, slide: { x0: mv.x, y0: mv.y, x1: e.x, y1: e.y, sink: e.sink } };
  }
  function bFind(g, ch) { for (var y = 0; y < g.length; y++) for (var x = 0; x < g[y].length; x++) if (g[y][x] === ch) return { x: x, y: y }; return null; }
  function bCheck(s) {
    var S = bFind(s.g, 'S'), E = bFind(s.g, 'E'), H = s.g.length, W = s.g[0].length;
    var prev = {}, q = [S], k = S.x + ',' + S.y; prev[k] = null;
    while (q.length) {
      var c = q.shift();
      if (c.x === E.x && c.y === E.y) {
        var path = [], kk = c.x + ',' + c.y;
        while (kk) { var p = kk.split(','); path.unshift({ x: +p[0], y: +p[1] }); kk = prev[kk]; }
        return { ok: true, path: path };
      }
      for (var d in DIRS) {
        var nx = c.x + DIRS[d][0], ny = c.y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        var ch = s.g[ny][nx], nk = nx + ',' + ny;
        if (prev[nk] !== undefined) continue;
        if (ch === '.' || ch === '_' || ch === 'E') { prev[nk] = c.x + ',' + c.y; q.push({ x: nx, y: ny }); }
      }
    }
    return { ok: false, reach: Object.keys(prev).length };
  }

  /* ---------------- 3. BALL BOUNCE ----------------
     '>' '<' '^' 'v' launcher, 'T' target, '#' wall, '.' empty.
     Mirrors: 'a' '/' and 'b' '\' are free (tap to turn, or drag to an empty square);
     'c' '/' and 'd' '\' are on a pivot (turn only); 'e' '/' and 'f' '\' are bolted (no move). */
  var MIR = { a: ['/', 'free'], b: ['\\', 'free'], c: ['/', 'pivot'], d: ['\\', 'pivot'], e: ['/', 'fixed'], f: ['\\', 'fixed'] };
  var FLIP = { a: 'b', b: 'a', c: 'd', d: 'c' };
  var LDIR = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], 'v': [0, 1] };
  function rParse(level) { return { t: 'r', g: gridOf(level.g) }; }
  function rMoves(s) {
    var out = [], empties = [];
    s.g.forEach(function (row, y) { row.forEach(function (c, x) { if (c === '.') empties.push([x, y]); }); });
    s.g.forEach(function (row, y) { row.forEach(function (c, x) {
      if (!MIR[c] || MIR[c][1] === 'fixed') return;
      out.push({ t: 'r', x: x, y: y, op: 'turn' });
      if (MIR[c][1] === 'free') empties.forEach(function (e) { out.push({ t: 'r', x: x, y: y, op: 'move', tx: e[0], ty: e[1] }); });
    }); });
    return out;
  }
  function rApply(s, mv) {
    var c = s.g[mv.y] && s.g[mv.y][mv.x];
    if (!MIR[c] || MIR[c][1] === 'fixed') return null;
    var g = cloneGrid(s.g);
    if (mv.op === 'turn') g[mv.y][mv.x] = FLIP[c];
    else if (mv.op === 'move') {
      if (MIR[c][1] !== 'free' || !g[mv.ty] || g[mv.ty][mv.tx] !== '.') return null;
      g[mv.y][mv.x] = '.'; g[mv.ty][mv.tx] = c;
    } else return null;
    return { t: 'r', g: g };
  }
  function rCheck(s) {
    var g = s.g, H = g.length, W = g[0].length, L = null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (LDIR[g[y][x]]) L = { x: x, y: y, d: LDIR[g[y][x]] };
    var x0 = L.x, y0 = L.y, dx = L.d[0], dy = L.d[1], path = [{ x: x0, y: y0 }], seen = {};
    for (var i = 0; i < 400; i++) {
      var nx = x0 + dx, ny = y0 + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) { path.push({ x: nx, y: ny }); return { ok: false, why: 'out', path: path }; }
      var c = g[ny][nx];
      if (c === '#' || LDIR[c]) { path.push({ x: x0 + dx * 0.42, y: y0 + dy * 0.42, bump: true }); return { ok: false, why: 'wall', path: path }; }
      x0 = nx; y0 = ny;
      if (c === 'T') { path.push({ x: x0, y: y0 }); return { ok: true, path: path }; }
      if (MIR[c]) {
        var t = dx; if (MIR[c][0] === '/') { dx = -dy; dy = -t; } else { dx = dy; dy = t; }
        path.push({ x: x0, y: y0, m: true });
        var k = x0 + ',' + y0 + ',' + dx + ',' + dy; if (seen[k]) return { ok: false, why: 'loop', path: path }; seen[k] = 1;
      }
    }
    return { ok: false, why: 'loop', path: path };
  }

  /* ---------------- 4. RESCUE (remove one) ----------------
     Side view. '.' air, '#' rock, 'w' wooden plank (fixed in place; tap ONE to remove it),
     'o' boulder (drops straight down when nothing holds it), '^' spikes, 'M' monster,
     'G' home door, 'H' hero (walks in direction level.d, turns round at walls, drops when nothing is below).
     A boulder that lands on spikes fills the pit ('_', solid); one that lands on a monster squashes it (both vanish).
     The hero is lost on spikes, to a monster, falling out of the map, or under a falling boulder;
     walking back and forth for ever (a repeated state) is also a fail. He is safe at the door. */
  function sParse(level) {
    var g = gridOf(level.g), h = null;
    g.forEach(function (row, y) { row.forEach(function (c, x) { if (c === 'H') { h = { x: x, y: y }; row[x] = '.'; } }); });
    return { t: 's', g: g, hx: h.x, hy: h.y, d: level.d || 1 };
  }
  function sMoves(s) {
    var out = [];
    s.g.forEach(function (row, y) { row.forEach(function (c, x) { if (c === 'w') out.push({ t: 's', x: x, y: y }); }); });
    return out;
  }
  function sApply(s, mv) {
    if (!s.g[mv.y] || s.g[mv.y][mv.x] !== 'w') return null;
    var g = cloneGrid(s.g); g[mv.y][mv.x] = '.';
    return { t: 's', g: g, hx: s.hx, hy: s.hy, d: s.d, removed: { x: mv.x, y: mv.y } };
  }
  function sDrop(g, hx, hy) { // all unsupported boulders fall straight down (bottom-up); returns falls + crush flag
    var H = g.length, W = g[0].length, falls = [], crushed = false;
    for (var y = H - 1; y >= 0; y--) for (var x = 0; x < W; x++) {
      if (g[y][x] !== 'o') continue;
      var ny = y, end = null;
      for (;;) {
        if (ny + 1 >= H) { end = 'out'; ny++; break; }
        var b = g[ny + 1][x];
        if (x === hx && ny + 1 === hy) { end = 'crush'; ny++; break; }
        if (b === '.') { ny++; continue; }
        if (b === '^') { end = 'fill'; ny++; break; }
        if (b === 'M') { end = 'squash'; ny++; break; }
        break;
      }
      if (ny === y) continue;
      g[y][x] = '.';
      if (end === 'fill') g[ny][x] = '_'; // boulder wedged in the spike pit: solid ground now
      else if (end === 'crush' || !end) g[ny][x] = 'o';
      if (end === 'squash') g[ny][x] = '.';
      falls.push({ x: x, y0: y, y1: ny, end: end });
      if (end === 'crush') crushed = true;
    }
    return { falls: falls, crushed: crushed };
  }
  function sSim(s0, maxT) {
    var g = cloneGrid(s0.g), H = g.length, W = g[0].length, hx = s0.hx, hy = s0.hy, d = s0.d;
    var frames = [], seen = {};
    function snap(ev, falls) { frames.push({ g: cloneGrid(g), hx: hx, hy: hy, d: d, ev: ev || null, falls: falls || [] }); }
    snap();
    for (var t = 0; t < (maxT || 300); t++) {
      var ev = null, dr = sDrop(g, hx, hy);
      if (dr.crushed) { snap('crush', dr.falls); return { ok: false, why: 'crush', frames: frames }; }
      if (hy >= H - 1) { hy++; snap('fall', dr.falls); return { ok: false, why: 'fall', frames: frames }; }
      var below = g[hy + 1][hx];
      if (below === '.') { hy++; ev = 'drop'; }
      else if (below === '^' || below === 'M') { hy++; snap(below === '^' ? 'spike' : 'monster', dr.falls); return { ok: false, why: below === '^' ? 'spike' : 'monster', frames: frames }; }
      else {
        var nx = hx + d, ahead = (nx < 0 || nx >= W) ? '#' : g[hy][nx];
        if (ahead === 'G') { hx = nx; snap('home', dr.falls); return { ok: true, why: 'home', frames: frames }; }
        if (ahead === '^' || ahead === 'M') { hx = nx; snap(ahead === '^' ? 'spike' : 'monster', dr.falls); return { ok: false, why: ahead === '^' ? 'spike' : 'monster', frames: frames }; }
        if (ahead === '.') { hx = nx; ev = 'walk'; }
        else { d = -d; ev = 'turn'; }
      }
      snap(ev, dr.falls);
      var key = hx + ',' + hy + ',' + d + '|' + g.map(function (r) { return r.join(''); }).join('/');
      if (seen[key]) return { ok: false, why: 'stuck', frames: frames };
      seen[key] = 1;
    }
    return { ok: false, why: 'stuck', frames: frames };
  }
  function sCheck(s) { return sSim(s); }
  function sSettled(level) { var s = sParse(level), g = cloneGrid(s.g); return sDrop(g, s.hx, s.hy).falls.length === 0; }

  /* ---------------- generic API ---------------- */
  var T = {
    m: { parse: mParse, moves: mMoves, apply: mApply, check: mCheck },
    b: { parse: bParse, moves: bMoves, apply: bApply, check: bCheck },
    r: { parse: rParse, moves: rMoves, apply: rApply, check: rCheck },
    s: { parse: sParse, moves: sMoves, apply: sApply, check: sCheck }
  };
  function parse(level) { return T[level.t].parse(level); }
  function moves(state) { return T[state.t].moves(state); }
  function apply(state, mv) { if (!mv || mv.t !== state.t) return null; return T[state.t].apply(state, mv); }
  function check(state) { return T[state.t].check(state); }
  function key(mv) { return JSON.stringify(mv); }
  function solutions(level) {
    var s = parse(level), out = [];
    moves(s).forEach(function (mv) { var n = apply(s, mv); if (n && check(n).ok) out.push(mv); });
    return out;
  }
  function verify(level) {
    var s = parse(level), ms = moves(s), sol = [];
    ms.forEach(function (mv) { var n = apply(s, mv); if (n && check(n).ok) sol.push(mv); });
    return { solvedAtStart: check(s).ok, moves: ms.length, solutions: sol };
  }
  return { parse: parse, moves: moves, apply: apply, check: check, key: key, solutions: solutions, verify: verify,
    SEG: SEG, DIGIT_MASK: DIGIT_MASK, OP_MASK: OP_MASK, MIR: MIR, LDIR: LDIR, DIRS: DIRS, sSim: sSim, sSettled: sSettled, mText: mText, evalSide: evalSide };
});
