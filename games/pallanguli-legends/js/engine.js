/* PALLANGULI LEGENDS - pure game engine (no DOM). Works in the browser (window.PallEngine) and in Node (require).
 * Board indices: 0..6 = A1..A7 (Player A, bottom row, left -> right)
 *                7..13 = B1..B7 (Player B, top row, right -> left as seen by A)
 * Sowing is anticlockwise: A1 -> A7 -> B1 -> B7 -> A1 ... i.e. index i -> i+1 (mod 14).
 * Each player's pits are numbered 1..7 from that player's own left.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PallEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var N = 14, ROW = 7;

  var DEFAULTS = {
    seedsPerPit: 5,        // 4, 5 or 6
    pasu: false,           // four-seed rule
    pasuBy: 'owner',       // 'owner' of the pit or the 'sower'
    captureOpposite: false,// also capture the pit opposite the captured pit
    skipOrigin: false,     // skip the pit you lifted from when a sowing laps the board
    multiRound: false,     // traditional multi-round with refill + inactive pits
    maxRounds: 15,         // safety cap for multi-round games
    maxDrops: 4000,        // safety cap per move (continuation chains)
    stallLimit: 40         // digital safety rule: round ends after this many moves in a row with no capture
  };

  var RULESETS = {
    classic: { pasu: false, seedsPerPit: 5, multiRound: false },
    pasu:    { pasu: true,  seedsPerPit: 5, multiRound: false },
    six:     { pasu: false, seedsPerPit: 6, multiRound: false },
    multi:   { pasu: false, seedsPerPit: 5, multiRound: true }
  };

  function makeConfig(rulesetId, overrides) {
    rulesetId = RULESETS[rulesetId] ? rulesetId : 'classic';
    var c = {}, k;
    for (k in DEFAULTS) c[k] = DEFAULTS[k];
    var b = RULESETS[rulesetId];
    for (k in b) c[k] = b[k];
    if (overrides) for (k in overrides) if (k in DEFAULTS && overrides[k] !== undefined) c[k] = overrides[k];
    c.seedsPerPit = [4, 5, 6].indexOf(+c.seedsPerPit) >= 0 ? +c.seedsPerPit : 5;
    c.pasuBy = c.pasuBy === 'sower' ? 'sower' : 'owner';
    c.pasu = !!c.pasu; c.captureOpposite = !!c.captureOpposite; c.skipOrigin = !!c.skipOrigin; c.multiRound = !!c.multiRound;
    c.ruleset = rulesetId;
    c.totalSeeds = N * c.seedsPerPit;
    return c;
  }

  function owner(i) { return i < ROW ? 0 : 1; }
  function opposite(i) { return 13 - i; }
  function label(i) { return i < ROW ? 'A' + (i + 1) : 'B' + (i - 6); }
  function pitsOf(p) { var r = [], b = p * ROW; for (var i = b; i < b + ROW; i++) r.push(i); return r; }

  function clone(s) {
    return {
      cfg: s.cfg, board: s.board.slice(), inactive: s.inactive.slice(), stores: s.stores.slice(),
      current: s.current, round: s.round, roundStarter: s.roundStarter, status: s.status,
      winner: s.winner, endReason: s.endReason, moveNo: s.moveNo, quiet: s.quiet, roundEndReason: s.roundEndReason,
      roundResults: s.roundResults.slice(), history: s.history ? s.history.slice() : null
    };
  }

  function totalSeeds(s) {
    var t = s.stores[0] + s.stores[1];
    for (var i = 0; i < N; i++) t += s.board[i];
    return t;
  }

  function initializeGame(cfg, startPlayer, opts) {
    cfg = cfg || makeConfig('classic');
    var sp = startPlayer === 1 ? 1 : 0;
    var board = [], inactive = [];
    for (var i = 0; i < N; i++) { board.push(cfg.seedsPerPit); inactive.push(false); }
    return {
      cfg: cfg, board: board, inactive: inactive, stores: [0, 0], current: sp, round: 1, roundStarter: sp,
      status: 'playing', winner: null, endReason: null, moveNo: 0, quiet: 0, roundEndReason: null, roundResults: [],
      history: (opts && opts.noHistory) ? null : []
    };
  }

  function nextPit(s, i) {
    for (var k = 1; k <= N; k++) { var j = (i + k) % N; if (!s.inactive[j]) return j; }
    return -1;
  }

  function getLegalMoves(s) {
    if (s.status !== 'playing') return [];
    var r = [], b = s.current * ROW;
    for (var i = b; i < b + ROW; i++) if (!s.inactive[i] && s.board[i] > 0) r.push(i);
    return r;
  }

  function validateMove(s, pit) {
    if (s.status !== 'playing') return { ok: false, reason: 'not_playing' };
    if (typeof pit !== 'number' || pit !== Math.floor(pit) || pit < 0 || pit >= N) return { ok: false, reason: 'bad_pit' };
    if (owner(pit) !== s.current) return { ok: false, reason: 'not_your_pit' };
    if (s.inactive[pit]) return { ok: false, reason: 'inactive_pit' };
    if (s.board[pit] === 0) return { ok: false, reason: 'empty_pit' };
    return { ok: true };
  }

  function emit(ctx, ev) {
    if (!ctx.record) return;
    ev.board = ctx.s.board.slice(); ev.stores = ctx.s.stores.slice(); ev.inactive = ctx.s.inactive.slice();
    ctx.events.push(ev);
  }

  /* Sow n seeds (already lifted) starting from the pit after `from`. Applies the four-seed rule per drop. Returns last pit. */
  function distributeSeeds(s, from, n, ctx) {
    var pos = from, active = 0, i;
    for (i = 0; i < N; i++) if (!s.inactive[i]) active++;
    while (n > 0) {
      pos = nextPit(s, pos);
      if (s.cfg.skipOrigin && pos === from && active > 1) continue;
      s.board[pos]++; n--; ctx.drops++;
      emit(ctx, { type: 'sow', pit: pos });
      if (s.cfg.pasu && s.board[pos] === 4) {
        var by = s.cfg.pasuBy === 'owner' ? owner(pos) : ctx.player;
        s.stores[by] += 4; s.board[pos] = 0; ctx.pasu.push({ pit: pos, by: by });
        emit(ctx, { type: 'pasu', pit: pos, n: 4, by: by });
      }
    }
    return pos;
  }

  /* Look at the pit after the last seed. Continue, capture, or stop. */
  function checkCapture(s, last, ctx) {
    var n1 = nextPit(s, last);
    if (s.board[n1] > 0) return { action: 'continue', pit: n1 };
    var n2 = nextPit(s, n1);
    if (s.board[n2] > 0) {
      var got = s.board[n2]; s.board[n2] = 0;
      var o = -1, got2 = 0;
      if (s.cfg.captureOpposite) {
        o = opposite(n2);
        if (o !== n2 && !s.inactive[o] && s.board[o] > 0) { got2 = s.board[o]; s.board[o] = 0; } else o = -1;
      }
      s.stores[ctx.player] += got + got2;
      return { action: 'capture', empty: n1, pit: n2, n: got, opp: o, oppN: got2 };
    }
    return { action: 'stop', empty: n1, empty2: n2 };
  }

  function checkTurnEnd(s, ctx) {
    s.current = 1 - s.current; s.moveNo++;
    emit(ctx, { type: 'turn', next: s.current });
  }

  /* Round ends when the player to move has no seeds in their active pits. */
  function checkRoundEnd(s) {
    if (s.status !== 'playing') return false;
    if (s.cfg.stallLimit && s.quiet >= s.cfg.stallLimit) { s.roundEndReason = 'stall'; return true; }
    s.roundEndReason = 'no_seeds';
    var b = s.current * ROW;
    for (var i = b; i < b + ROW; i++) if (!s.inactive[i] && s.board[i] > 0) return false;
    return true;
  }

  function checkWinner(s) {
    if (s.stores[0] > s.stores[1]) return 0;
    if (s.stores[1] > s.stores[0]) return 1;
    return 'draw';
  }

  /* Multi-round: refill pits from stores. Returns true if a new round starts, false if game over. */
  function refillPits(s, ctx) {
    var sp = s.cfg.seedsPerPit, p;
    for (p = 0; p < 2; p++) if (s.stores[p] < sp) {
      s.status = 'over'; s.winner = 1 - p; s.endReason = 'cannot_refill';
      emit(ctx, { type: 'gameOver', winner: s.winner, reason: s.endReason, loser: p });
      return false;
    }
    if (s.round >= s.cfg.maxRounds) {
      s.status = 'over'; s.winner = checkWinner(s); s.endReason = 'max_rounds';
      emit(ctx, { type: 'gameOver', winner: s.winner, reason: s.endReason });
      return false;
    }
    s.round++;
    for (p = 0; p < 2; p++) {
      var pits = pitsOf(p);
      for (var k = 0; k < ROW; k++) {
        var i = pits[k];
        if (s.stores[p] >= sp) { s.board[i] = sp; s.stores[p] -= sp; s.inactive[i] = false; }
        else { s.board[i] = 0; s.inactive[i] = true; }
      }
    }
    s.roundStarter = 1 - s.roundStarter; s.current = s.roundStarter;
    emit(ctx, { type: 'newRound', round: s.round, starter: s.current });
    return true;
  }

  function endRound(s, ctx) {
    for (var i = 0; i < N; i++) if (s.board[i] > 0) {
      var o = owner(i), n = s.board[i]; s.stores[o] += n; s.board[i] = 0;
      emit(ctx, { type: 'sweep', pit: i, n: n, to: o });
    }
    var res = { round: s.round, stores: s.stores.slice() };
    s.roundResults.push(res);
    emit(ctx, { type: 'roundEnd', round: s.round, stores: s.stores.slice(), stuck: s.current, reason: s.roundEndReason });
    s.quiet = 0;
    if (!s.cfg.multiRound) {
      s.status = 'over'; s.winner = checkWinner(s); s.endReason = 'round_over';
      emit(ctx, { type: 'gameOver', winner: s.winner, reason: s.endReason });
    } else {
      if (refillPits(s, ctx) && checkRoundEnd(s)) endRound(s, ctx); // defensive; cannot normally happen
    }
  }

  /* Execute a move. Returns { state, events, result }. Does not mutate the input state. */
  function executeMove(s0, pit, opts) {
    var v = validateMove(s0, pit);
    if (!v.ok) throw new Error('Illegal move ' + pit + ': ' + v.reason);
    var s = clone(s0);
    var ctx = { s: s, player: s.current, drops: 0, record: !(opts && opts.record === false), events: [], pasu: [], captures: [], continues: 0, capped: false };
    var before = s.stores.slice();
    var n = s.board[pit]; s.board[pit] = 0;
    emit(ctx, { type: 'pickup', pit: pit, n: n, first: true });
    var last = distributeSeeds(s, pit, n, ctx), r;
    for (;;) {
      r = checkCapture(s, last, ctx);
      if (r.action === 'continue') {
        if (ctx.drops >= s.cfg.maxDrops) { ctx.capped = true; emit(ctx, { type: 'cap' }); break; }
        n = s.board[r.pit]; s.board[r.pit] = 0; ctx.continues++;
        emit(ctx, { type: 'pickup', pit: r.pit, n: n, first: false });
        last = distributeSeeds(s, r.pit, n, ctx);
        continue;
      }
      if (r.action === 'capture') { ctx.captures.push(r); emit(ctx, { type: 'capture', empty: r.empty, pit: r.pit, n: r.n, opp: r.opp, oppN: r.oppN, by: ctx.player }); }
      else emit(ctx, { type: 'stop', empty: r.empty, empty2: r.empty2 });
      break;
    }
    var mover = ctx.player;
    var gained = [s.stores[0] - before[0], s.stores[1] - before[1]];
    s.quiet = (ctx.captures.length || ctx.pasu.length) ? 0 : (s.quiet || 0) + 1;
    checkTurnEnd(s, ctx);
    if (s.history) s.history.push({ player: mover, pit: pit, round: s.round });
    var roundEnded = false;
    if (checkRoundEnd(s)) { roundEnded = true; endRound(s, ctx); }
    return {
      state: s, events: ctx.events,
      result: { player: mover, pit: pit, lifted: s0.board[pit], continues: ctx.continues, captures: ctx.captures, pasu: ctx.pasu,
        gained: gained, drops: ctx.drops, capped: ctx.capped, roundEnded: roundEnded, gameOver: s.status === 'over' }
    };
  }

  return {
    N: N, ROW: ROW, DEFAULTS: DEFAULTS, RULESETS: RULESETS,
    makeConfig: makeConfig, owner: owner, opposite: opposite, label: label, pitsOf: pitsOf, clone: clone, totalSeeds: totalSeeds,
    nextPit: nextPit, initializeGame: initializeGame, getLegalMoves: getLegalMoves, validateMove: validateMove,
    distributeSeeds: distributeSeeds, checkCapture: checkCapture, checkTurnEnd: checkTurnEnd, checkRoundEnd: checkRoundEnd,
    endRound: endRound, refillPits: refillPits, checkWinner: checkWinner, executeMove: executeMove
  };
});
