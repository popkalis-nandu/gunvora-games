/* Gaming World of Jarvis — play page: loads a game script into a shared canvas engine.
   A game calls GVPlay.register({ width, height, touch, init, update, draw }). */
(function () {
  "use strict";
  var id = GV.qs("id"), g = GV.game(id);
  if (g && g.kids) document.body.setAttribute("data-kids", "");
  var KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "fire", KeyR: "r", KeyX: "rot", KeyZ: "rot", Enter: "enter" };
  var LABELS = { left: "◀", right: "▶", up: "▲", down: "▼", fire: "●", rot: "⟳", r: "R" };
  var def = null, api, cv, ctx, stage, state = "loading", last = 0, muted = GV.store("gv_muted") || false;
  var keys = {}, hits = {}, actx = null;

  window.GVPlay = { register: function (d) { def = d; boot(); } };

  function $(s) { return document.querySelector(s); }
  function show(el, on) { el.hidden = !on; }

  /* ---------- sound (tiny WebAudio blips, no files) ---------- */
  function sfx(type) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), v = actx.createGain(), t = actx.currentTime;
      var P = { shoot: [520, 120, .08, "square"], hit: [220, 60, .15, "sawtooth"], coin: [880, 1320, .12, "triangle"], boom: [120, 30, .35, "sawtooth"], jump: [300, 600, .12, "sine"], flip: [600, 700, .05, "triangle"], over: [300, 80, .6, "triangle"], win: [523, 1046, .4, "triangle"], move: [200, 220, .03, "square"] }[type] || [440, 440, .05, "sine"];
      o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(Math.max(20, P[1]), t + P[2]);
      v.gain.setValueAtTime(.08, t); v.gain.exponentialRampToValueAtTime(.0001, t + P[2]);
      o.connect(v); v.connect(actx.destination); o.start(t); o.stop(t + P[2] + .02);
    } catch (e) { }
  }

  /* ---------- page setup ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var main = $("#main");
    if (!g || g.status !== "playable") {
      main.innerHTML = '<div class="lock"><h1>Game not available</h1><p class="muted">' + (g ? GV.esc(g.title) + " is coming soon." : "We couldn't find that game.") + '</p><a class="btn" href="' + (g && g.liteVersion ? "play.html?id=" + g.liteVersion : "games.html") + '">' + (g && g.liteVersion ? "Play the free version" : "Browse games") + '</a></div>';
      return;
    }
    document.title = "Play " + g.title + " – " + GV.cfg.siteName;
    $("#play-title").textContent = g.title;
    $("#play-badges").innerHTML = GV.badges(g);
    $("#play-info").href = "game.html?id=" + g.id;
    if (g.premium && !GV.isPremium()) {
      main.querySelector(".play-wrap").innerHTML = '<div class="lock"><div class="detail-cover">' + GVCover(g.id, 0, g.title) + '</div><span class="badge prem">★ Premium game</span><h1 style="margin-top:12px">' + GV.esc(g.title) + '</h1><p class="muted">' + GV.esc(g.tagline) + ' This game is included with Jarvis Premium — ad-free play plus every premium game, from ' + GV.price(GV.cfg.plans.monthly.price) + '/month.</p><div class="actions" style="justify-content:center"><a class="btn gold" href="pricing.html">★ Get Premium</a><a class="btn ghost" href="redeem.html">I have an unlock code</a></div><p class="small muted" style="margin-top:18px"><a href="games.html?filter=free">Or play one of our free games →</a></p></div>';
      return;
    }
    if (g.embed) { embed(); return; }
    var s = document.createElement("script"); s.src = "games/" + g.script; s.onerror = function () { $("#ov-title").textContent = "Couldn't load the game. Please refresh."; }; document.body.appendChild(s);
  });

  /* ---------- full web games: run in a sandboxed-size iframe from games/<slug>/ ---------- */
  function embed() {
    var stage = $("#stage"), wrap = document.querySelector(".play-wrap");
    wrap.classList.add("embed-mode");
    stage.className = "stage embed " + (g.orientation === "portrait" ? "portrait" : "landscape");
    stage.innerHTML = '<iframe id="game-frame" src="' + GV.esc(g.embed) + '" title="' + GV.esc(g.title) + '" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope; screen-wake-lock; clipboard-write; web-share" allowfullscreen loading="eager"></iframe>' +
      '<div class="embed-loading" id="embed-loading"><div class="spinner" aria-hidden="true"></div><span>Loading ' + GV.esc(g.title) + '…</span></div>';
    var f = $("#game-frame");
    f.addEventListener("load", function () { var l = $("#embed-loading"); if (l) l.remove(); try { f.contentWindow.focus(); } catch (e) { } });
    var tools = document.createElement("div"); tools.className = "embed-tools";
    tools.innerHTML = '<button class="btn sm" id="embed-full" type="button">⛶ Fullscreen</button><a class="btn ghost sm" href="' + GV.esc(g.embed) + '" target="_blank" rel="noopener">Open in new tab ↗</a>' +
      '<span class="small muted">Tip: click inside the game to give it keyboard focus.' + (g.orientation === "landscape" ? " On phones, rotate to landscape." : "") + '</span>';
    stage.parentNode.insertBefore(tools, stage.nextSibling);
    $("#embed-full").addEventListener("click", function () {
      var el = stage;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      (el.requestFullscreen || el.webkitRequestFullscreen || function () { }).call(el);
    });
    var c = g.controls || [];
    if (c.length) {
      var how = document.createElement("section"); how.className = "panel embed-help";
      how.innerHTML = '<h2>Controls</h2><table class="keys"><tbody>' + c.map(function (k) { return '<tr><td><kbd>' + GV.esc(k[0]) + '</kbd></td><td>' + GV.esc(k[1]) + '</td></tr>'; }).join("") + '</tbody></table>';
      tools.parentNode.insertBefore(how, tools.nextSibling);
    }
  }

  /* ---------- engine ---------- */
  function boot() {
    stage = $("#stage"); cv = $("#game"); ctx = cv.getContext("2d");
    var bestKey = "gv_best_" + g.id;
    api = {
      W: def.width, H: def.height, ctx: ctx, keys: keys, score: 0, sfx: sfx,
      pointer: { x: def.width / 2, y: def.height / 2, down: false, tapped: false, moved: false, swipe: null, type: "mouse" },
      hit: function (k) { return !!hits[k]; },
      skin: function (slot) { return GV.skin(slot); },
      setScore: function (n) { api.score = Math.max(0, Math.round(n)); $("#hud-score").textContent = api.score; },
      over: function (info) { endGame(info || {}); },
      best: function () { return +(localStorage.getItem(bestKey) || 0); },
      rand: function (a, b) { return a + Math.random() * (b - a); }
    };
    function endGame(info) {
      if (state !== "play") return;
      state = "over"; sfx(info.win ? "win" : "over");
      var best = api.best(), nb = api.score > best; if (nb) { try { localStorage.setItem(bestKey, api.score); } catch (e) { } }
      $("#ov-title").textContent = info.title || "Game over";
      $("#ov-score").textContent = api.score; show($("#ov-score"), true);
      $("#ov-text").textContent = (info.detail ? info.detail + " · " : "") + (nb ? "🏆 New best!" : "Best: " + Math.max(best, api.score));
      $("#ov-start").textContent = "↻ Play again"; show($("#overlay"), true); $("#ov-start").focus();
      $("#hud-best").textContent = Math.max(best, api.score);
    }
    window.GVPlay.api = api;
    $("#hud-best").textContent = api.best();
    // touch buttons
    var tc = $("#touch"), t = def.touch || {};
    tc.innerHTML = ["left", "right"].map(function (side) { return '<div class="tg">' + (t[side] || []).map(function (k) { return '<button data-k="' + k + '" aria-label="' + k + '">' + (LABELS[k] || k) + '</button>'; }).join("") + '</div>'; }).join("");
    tc.addEventListener("pointerdown", function (e) { var b = e.target.closest("button"); if (!b) return; e.preventDefault(); e.stopPropagation(); b.setPointerCapture && b.setPointerCapture(e.pointerId); press(b.dataset.k, true); b.classList.add("on"); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { tc.addEventListener(ev, function (e) { var b = e.target.closest("button"); if (!b) return; press(b.dataset.k, false); b.classList.remove("on"); }); });
    if (window.matchMedia("(pointer:coarse)").matches || "ontouchstart" in window) stage.classList.add("has-touch");
    window.addEventListener("touchstart", function () { stage.classList.add("has-touch"); }, { once: true, passive: true });

    // keyboard
    window.addEventListener("keydown", function (e) {
      var k = KEYMAP[e.code]; if (e.code === "KeyP" || e.code === "Escape") { togglePause(); return; }
      if (!k) return;
      if (["left", "right", "up", "down", "fire"].indexOf(k) >= 0 && !e.target.closest("input,textarea")) e.preventDefault();
      if ((k === "fire" || k === "enter") && state !== "play" && !e.repeat && !$("#overlay").hidden) { start(); return; }
      if (!e.repeat) hits[k] = true; keys[k] = true;
    });
    window.addEventListener("keyup", function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
    window.addEventListener("blur", function () { for (var k in keys) keys[k] = false; if (state === "play") togglePause(); });

    // pointer on canvas
    var p = api.pointer, sx = 0, sy = 0;
    function pos(e) { var r = cv.getBoundingClientRect(); p.x = (e.clientX - r.left) / r.width * def.width; p.y = (e.clientY - r.top) / r.height * def.height; }
    cv.addEventListener("pointerdown", function (e) { e.preventDefault(); pos(e); p.down = true; p.tapped = true; p.type = e.pointerType; sx = p.x; sy = p.y; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); if (actx && actx.state === "suspended") actx.resume(); });
    cv.addEventListener("pointermove", function (e) { pos(e); p.moved = true; p.type = e.pointerType; });
    cv.addEventListener("pointerup", function (e) { pos(e); p.down = false; var dx = p.x - sx, dy = p.y - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) p.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); });
    cv.addEventListener("pointercancel", function () { p.down = false; });
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    // HUD buttons
    $("#btn-pause").addEventListener("click", togglePause);
    $("#btn-mute").textContent = muted ? "🔇" : "🔊";
    $("#btn-mute").addEventListener("click", function () { muted = !muted; GV.store("gv_muted", muted); this.textContent = muted ? "🔇" : "🔊"; });
    $("#btn-full").addEventListener("click", function () { var el = stage; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () { }); });
    $("#ov-start").addEventListener("click", start);
    document.addEventListener("fullscreenchange", resize);
    window.addEventListener("resize", resize);

    $("#ov-title").textContent = g.title;
    $("#ov-text").textContent = def.hint || g.instructions[0];
    show($("#ov-score"), false);
    $("#ov-start").textContent = "▶ Start"; $("#ov-start").disabled = false;
    resize();
    def.init(api); api.setScore(0); render();
    state = "ready";
    requestAnimationFrame(loop);
  }
  function press(k, on) { if (on && !keys[k]) hits[k] = true; keys[k] = on; if (on && state !== "play" && !$("#overlay").hidden && k === "fire") start(); }
  function start() {
    if (state === "play") return;
    if (state === "paused") { state = "play"; show($("#overlay"), false); last = performance.now(); return; }
    if (state === "over" || state === "ready") { def.init(api); api.setScore(0); }
    for (var k in keys) keys[k] = false;
    state = "play"; show($("#overlay"), false); last = performance.now(); cv.focus && cv.focus();
    try { var n = (GV.store("gv_plays") || {}); n[g.id] = (n[g.id] || 0) + 1; GV.store("gv_plays", n); } catch (e) { }
  }
  function togglePause() {
    if (state === "play") { state = "paused"; $("#ov-title").textContent = "Paused"; $("#ov-text").textContent = "Press P, Esc or tap Resume"; show($("#ov-score"), false); $("#ov-start").textContent = "▶ Resume"; show($("#overlay"), true); }
    else if (state === "paused") start();
  }
  function resize() {
    var fs = document.fullscreenElement === stage;
    var maxW = fs ? innerWidth : stage.parentElement.clientWidth;
    var maxH = fs ? innerHeight : Math.max(320, innerHeight - (innerWidth < 700 ? 150 : 190));
    var w = Math.min(maxW, maxH * def.width / def.height), h = w * def.height / def.width;
    stage.style.width = w + "px"; stage.style.height = h + "px";
    var dpr = Math.min(window.devicePixelRatio || 1, 2), k = w / def.width * dpr;
    cv.width = Math.round(def.width * k); cv.height = Math.round(def.height * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (state !== "loading" && state !== "play") render();
  }
  function render() { ctx.save(); def.draw(ctx, api); ctx.restore(); }
  function loop(t) {
    var dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    if (state === "play") { def.update(dt, api); render(); }
    hits = {}; api.pointer.tapped = false; api.pointer.swipe = null;
    requestAnimationFrame(loop);
  }
})();
