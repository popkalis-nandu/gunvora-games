/* PALLANGULI LEGENDS - AI opponents. Uses only the engine, so it always plays the selected ruleset. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PallAI = factory(root.PallEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  var WIN = 100000, TIMEOUT = { timeout: true };

  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(a, rng) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function evaluate(s, me) {
    if (s.status === 'over') {
      if (s.winner === 'draw') return 0;
      return (s.winner === me ? WIN : -WIN) + (s.stores[me] - s.stores[1 - me]);
    }
    var d = s.stores[me] - s.stores[1 - me], side = 0;
    for (var i = 0; i < E.N; i++) side += (E.owner(i) === me ? 1 : -1) * s.board[i];
    return d + 0.3 * side;
  }

  function play(s, m) { return E.executeMove(s, m, { record: false }).state; }

  function search(s, depth, alpha, beta, me, deadline, counter) {
    if (deadline && (++counter.n & 63) === 0 && Date.now() > deadline) throw TIMEOUT;
    if (depth === 0 || s.status === 'over') return evaluate(s, me);
    var moves = E.getLegalMoves(s);
    if (!moves.length) return evaluate(s, me);
    var maxi = s.current === me, best = maxi ? -Infinity : Infinity;
    for (var k = 0; k < moves.length; k++) {
      var v = search(play(s, moves[k]), depth - 1, alpha, beta, me, deadline, counter);
      if (maxi) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (beta <= alpha) break;
    }
    return best;
  }

  function rootSearch(s, depth, moves, deadline, counter) {
    var me = s.current, bestV = -Infinity, bestM = moves[0], scores = [];
    for (var k = 0; k < moves.length; k++) {
      var v = search(play(s, moves[k]), depth - 1, -Infinity, Infinity, me, deadline, counter);
      scores.push(v);
      if (v > bestV) { bestV = v; bestM = moves[k]; }
    }
    return { move: bestM, value: bestV, scores: scores };
  }

  /* level 1 random, 2 greedy, 3 one-ply + opponent reply, 4 minimax depth 4, 5 iterative deepening alpha-beta with time cap */
  function chooseMove(s, level, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var moves = shuffle(E.getLegalMoves(s), rng);
    if (!moves.length) return -1;
    if (moves.length === 1) return moves[0];
    level = Math.max(1, Math.min(5, level | 0));
    var me = s.current;
    if (level === 1) return moves[0];
    if (level === 2) {
      var bestM = moves[0], bestG = -Infinity;
      for (var k = 0; k < moves.length; k++) {
        var r = E.executeMove(s, moves[k], { record: false }), st = r.state;
        var g = (st.stores[me] - s.stores[me]) - (st.stores[1 - me] - s.stores[1 - me]);
        if (st.status === 'over') g += st.winner === me ? 1000 : (st.winner === 'draw' ? 0 : -1000);
        if (g > bestG) { bestG = g; bestM = moves[k]; }
      }
      return bestM;
    }
    if (level === 3) return rootSearch(s, 2, moves, 0, { n: 0 }).move;
    if (level === 4) return rootSearch(s, 4, moves, 0, { n: 0 }).move;
    var budget = opts.timeMs || 900, deadline = Date.now() + budget, best = rootSearch(s, 2, moves, 0, { n: 0 });
    for (var d = 3; d <= (opts.maxDepth || 14); d++) {
      try {
        // order moves by previous scores to improve pruning
        var order = moves.map(function (m, i) { return [m, best.scores[i]]; }).sort(function (a, b) { return b[1] - a[1]; });
        moves = order.map(function (x) { return x[0]; });
        var r5 = rootSearch(s, d, moves, deadline, { n: 0 });
        best = r5;
        if (Math.abs(best.value) >= WIN / 2) break;
      } catch (e) { if (e === TIMEOUT) break; throw e; }
    }
    return best.move;
  }

  function hint(s) { return chooseMove(s, 4, { rng: function () { return 0.5; } }); }

  return { chooseMove: chooseMove, hint: hint, evaluate: evaluate, mulberry32: mulberry32, shuffle: shuffle };
});
