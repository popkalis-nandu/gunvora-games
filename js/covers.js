/* Gaming World of Jarvis — original procedural SVG cover art (no external images). */
(function () {
  var n = 0;
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function stars(r, count, w, h, maxY) { var o = ""; for (var i = 0; i < count; i++) o += '<circle cx="' + (r() * w).toFixed(1) + '" cy="' + (r() * (maxY || h)).toFixed(1) + '" r="' + (r() * 1.4 + .3).toFixed(2) + '" fill="#fff" opacity="' + (r() * .7 + .2).toFixed(2) + '"/>'; return o; }

  var ART = {
    soldier: function (u, r, v) {
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (v ? "#1a0b2e" : "#2b0a0a") + '"/><stop offset=".55" stop-color="' + (v ? "#ff2bd6" : "#ff5a1f") + '"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>' +
        '<radialGradient id="g' + u + '" cx=".7" cy=".55" r=".35"><stop offset="0" stop-color="#fff6c2"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/><circle cx="280" cy="125" r="70" fill="url(#g' + u + ')"/>' +
        '<path d="M0 170 L40 150 L60 160 L95 120 L120 140 L160 110 L200 150 L240 135 L280 160 L330 120 L370 150 L400 140 L400 225 L0 225Z" fill="#12060a" opacity=".85"/>' +
        '<rect x="70" y="95" width="14" height="75" fill="#0a0306"/><rect x="66" y="90" width="22" height="8" fill="#0a0306"/><rect x="300" y="80" width="18" height="90" fill="#0a0306"/>' +
        '<g fill="#050203"><circle cx="190" cy="112" r="11"/><path d="M178 124 h24 l6 40 h-10 l-2 40 h-8 l-2-30 l-2 30 h-8 l-2-40 h-8z"/><rect x="196" y="128" width="78" height="5" rx="2"/><rect x="230" y="122" width="18" height="6"/><rect x="186" y="104" width="10" height="4"/></g>' +
        '<g fill="none" stroke="#00d4ff" stroke-width="2" opacity=".9"><circle cx="300" cy="70" r="34"/><path d="M300 30v26M300 84v26M260 70h26M314 70h26"/><circle cx="300" cy="70" r="2" fill="#00d4ff"/></g>';
    },
    range: function (u, r, v) {
      var t = ""; for (var i = 0; i < 4; i++) { var x = 50 + i * 95 + r() * 10, y = 120 + r() * 40; t += '<g transform="translate(' + x + ' ' + y + ')"><rect x="-2" y="0" width="4" height="60" fill="#3a2a1a"/><circle r="22" fill="#fff"/><circle r="16" fill="#e53935"/><circle r="10" fill="#fff"/><circle r="5" fill="#e53935"/></g>'; }
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b3d3a"/><stop offset=".6" stop-color="#1f7a5a"/><stop offset="1" stop-color="#c9a35a"/></linearGradient><radialGradient id="m' + u + '"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity=".85"/></radialGradient></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/><path d="M0 150 Q100 130 200 150 T400 145 V225 H0Z" fill="#a8823f"/>' + t +
        '<rect width="400" height="225" fill="url(#m' + u + ')"/><g fill="none" stroke="' + (v ? "#ffd23f" : "#39ff88") + '" stroke-width="2"><circle cx="200" cy="112" r="70"/><path d="M200 42v56M200 126v56M130 112h56M214 112h56"/></g><circle cx="200" cy="112" r="3" fill="#ff2b2b"/>';
    },
    sub: function (u, r, v) {
      var b = ""; for (var i = 0; i < 26; i++) b += '<circle cx="' + (r() * 400).toFixed(0) + '" cy="' + (r() * 225).toFixed(0) + '" r="' + (r() * 4 + 1).toFixed(1) + '" fill="none" stroke="#9be7ff" opacity=".5"/>';
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a6fa8"/><stop offset=".5" stop-color="#062e5c"/><stop offset="1" stop-color="#020a1f"/></linearGradient><linearGradient id="h' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (v ? "#ffd23f" : "#ffb300") + '"/><stop offset="1" stop-color="#b35c00"/></linearGradient></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/><g opacity=".25" fill="#9be7ff"><path d="M60 0 L90 0 L40 225 L10 225Z"/><path d="M200 0 L230 0 L190 225 L160 225Z"/></g>' + b +
        '<path d="M0 205 Q60 185 120 200 T260 195 T400 205 V225 H0Z" fill="#01050f"/>' +
        '<g transform="translate(' + (v ? 150 : 120) + ' 100)"><ellipse cx="80" cy="30" rx="95" ry="26" fill="url(#h' + u + ')"/><rect x="55" y="-6" width="40" height="22" rx="6" fill="#d98a00"/><rect x="72" y="-24" width="4" height="20" fill="#d98a00"/><circle cx="35" cy="30" r="6" fill="#7fe8ff"/><circle cx="60" cy="30" r="6" fill="#7fe8ff"/><circle cx="85" cy="30" r="6" fill="#7fe8ff"/><path d="M-15 30 l-18 -14 v28z" fill="#b35c00"/></g>' +
        '<g transform="translate(330 60)"><circle r="12" fill="#2a2a2a"/><g stroke="#2a2a2a" stroke-width="3"><path d="M0-18v36M-18 0h36M-13-13l26 26M13-13l-26 26"/></g><circle r="4" fill="#ff2b2b"/></g>' +
        '<rect x="300" y="128" width="40" height="5" rx="2" fill="#e6f1ff"/><path d="M340 128 l8 2.5 -8 2.5z" fill="#ff5a1f"/>';
    },
    racer: function (u, r, v) {
      var lines = ""; for (var i = 0; i < 10; i++) { var y = 100 + i * i * 1.6; lines += '<rect x="' + (198 - i * 0.6) + '" y="' + y + '" width="' + (4 + i * 1.2) + '" height="' + (4 + i * 1.6) + '" fill="#ffe066"/>'; }
      var sl = ""; for (var j = 0; j < 14; j++) { var yy = r() * 225; sl += '<rect x="' + (r() * 400) + '" y="' + yy + '" width="' + (30 + r() * 60) + '" height="1.5" fill="#fff" opacity=".35"/>'; }
      var c = v ? "#ffd23f" : "#ff2bd6";
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14002e"/><stop offset=".45" stop-color="#7b1fa2"/><stop offset=".46" stop-color="#ff6ec7"/><stop offset="1" stop-color="#14002e"/></linearGradient></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/><circle cx="200" cy="100" r="46" fill="#ffb74d" opacity=".9"/><g fill="#14002e"><rect x="150" y="80" width="100" height="3"/><rect x="150" y="90" width="100" height="4"/></g>' +
        '<path d="M0 100 L400 100 L400 225 L0 225Z" fill="#0d0221"/><path d="M180 100 L220 100 L360 225 L40 225Z" fill="#26113f"/><path d="M180 100 L40 225 M220 100 L360 225" stroke="#00d4ff" stroke-width="3"/>' + lines + sl +
        '<g transform="translate(150 160)"><rect x="0" y="10" width="100" height="40" rx="12" fill="' + c + '"/><rect x="18" y="0" width="64" height="24" rx="8" fill="#1b1b2f"/><rect x="6" y="38" width="20" height="8" rx="3" fill="#ff3b3b"/><rect x="74" y="38" width="20" height="8" rx="3" fill="#ff3b3b"/><rect x="-4" y="44" width="18" height="16" rx="4" fill="#000"/><rect x="86" y="44" width="18" height="16" rx="4" fill="#000"/></g>';
    },
    dino: function (u, r, v) {
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (v ? "#ffb3d9" : "#7fdcff") + '"/><stop offset="1" stop-color="#fff3c4"/></linearGradient></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/><circle cx="330" cy="50" r="26" fill="#ffd23f"/><g fill="#fff" opacity=".9"><ellipse cx="80" cy="45" rx="30" ry="12"/><ellipse cx="105" cy="40" rx="22" ry="14"/><ellipse cx="240" cy="60" rx="26" ry="10"/></g>' +
        '<path d="M0 150 Q80 110 160 150 T320 140 T400 150 V225 H0Z" fill="#8bd650"/><path d="M0 180 Q100 160 200 180 T400 175 V225 H0Z" fill="#5cb338"/>' +
        '<g transform="translate(110 108)"><ellipse cx="40" cy="45" rx="38" ry="28" fill="#3ddc84"/><path d="M4 50 Q-30 40 -38 60 Q-10 62 10 62z" fill="#3ddc84"/><circle cx="72" cy="18" r="22" fill="#3ddc84"/><circle cx="80" cy="12" r="6" fill="#fff"/><circle cx="82" cy="12" r="3" fill="#111"/><path d="M78 28 q8 5 14 -2" stroke="#1b5e20" stroke-width="2.5" fill="none"/><ellipse cx="38" cy="50" rx="22" ry="14" fill="#c8f7d8"/><rect x="20" y="66" width="12" height="18" rx="5" fill="#2fb36d"/><rect x="48" y="66" width="12" height="18" rx="5" fill="#2fb36d"/><g fill="#ffd23f"><path d="M30 18 l6 -10 6 10z"/><path d="M45 14 l6 -10 6 10z"/></g></g>' +
        '<g transform="translate(270 135)" fill="#2e7d32"><rect x="12" y="0" width="14" height="50" rx="7"/><rect x="0" y="14" width="10" height="20" rx="5"/><rect x="28" y="8" width="10" height="20" rx="5"/></g>' +
        '<g fill="#ffd23f"><path d="M230 90 l4 9 10 1 -8 6 3 10 -9 -6 -9 6 3 -10 -8 -6 10 -1z"/></g>';
    },
    memory: function (u, r, v) {
      var cols = ["#ff5a5f", "#ffd23f", "#3ddc84", "#00d4ff", "#b388ff", "#ff8a3d", "#ff2bd6", "#7fe8ff"], cards = "";
      for (var i = 0; i < 8; i++) { var x = 40 + (i % 4) * 82, y = 30 + Math.floor(i / 4) * 92, open = (i + (v ? 1 : 0)) % 3 !== 0;
        cards += '<g transform="translate(' + x + ' ' + y + ') rotate(' + ((r() - .5) * 8).toFixed(1) + ' 32 40)"><rect width="64" height="80" rx="10" fill="' + (open ? "#fff" : "#1f8a4c") + '" stroke="#0b3d20" stroke-width="3"/>' + (open ? '<circle cx="32" cy="40" r="18" fill="' + cols[i] + '"/><circle cx="25" cy="35" r="3" fill="#111"/><circle cx="39" cy="35" r="3" fill="#111"/><path d="M24 46 q8 7 16 0" stroke="#111" stroke-width="2.5" fill="none"/>' : '<path d="M32 18 q18 20 0 44 q-18 -24 0 -44z" fill="#3ddc84"/>') + '</g>'; }
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f5132"/><stop offset="1" stop-color="#2fb36d"/></linearGradient></defs><rect width="400" height="225" fill="url(#s' + u + ')"/>' +
        '<g fill="#1b7a43" opacity=".6"><path d="M0 0 q60 40 20 100 q-40 -40 -20 -100z"/><path d="M400 225 q-60 -40 -20 -100 q40 40 20 100z"/></g>' + cards;
    },
    snake: function (u, r, v) {
      var grid = ""; for (var x = 0; x <= 400; x += 20) grid += '<path d="M' + x + ' 0V225" stroke="#00d4ff" stroke-opacity=".12"/>'; for (var y = 0; y <= 225; y += 20) grid += '<path d="M0 ' + y + 'H400" stroke="#00d4ff" stroke-opacity=".12"/>';
      return '<defs><filter id="f' + u + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="k' + u + '" x1="0" x2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="' + (v ? "#ffd23f" : "#39ff88") + '"/></linearGradient></defs>' +
        '<rect width="400" height="225" fill="#04070f"/>' + grid +
        '<g filter="url(#f' + u + ')"><path d="M40 180 H140 V60 H260 V140 H330" fill="none" stroke="url(#k' + u + ')" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="330" cy="140" r="11" fill="#39ff88"/><circle cx="334" cy="136" r="2.5" fill="#000"/><circle cx="370" cy="80" r="8" fill="#ff2bd6"/><circle cx="90" cy="60" r="6" fill="#ffd23f"/></g>';
    },
    space: function (u, r, v) {
      var en = ""; for (var i = 0; i < 6; i++) { var x = 40 + i * 62, y = 30 + (i % 2) * 26; en += '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0 L14 -6 L28 0 L22 14 L6 14Z" fill="#ff2bd6"/><circle cx="14" cy="4" r="3" fill="#ffd23f"/></g>'; }
      return '<defs><radialGradient id="s' + u + '" cx=".3" cy=".3" r="1"><stop offset="0" stop-color="#3a0ca3"/><stop offset=".5" stop-color="#10002b"/><stop offset="1" stop-color="#000"/></radialGradient><linearGradient id="t' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#00d4ff" stop-opacity="0"/></linearGradient></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/>' + stars(r, 70, 400, 225) + '<circle cx="330" cy="170" r="60" fill="#7209b7" opacity=".7"/><ellipse cx="330" cy="170" rx="90" ry="14" fill="none" stroke="#f72585" stroke-width="3" opacity=".7"/>' + en +
        '<g fill="#7fe8ff"><rect x="196" y="70" width="3" height="16"/><rect x="210" y="60" width="3" height="16"/><rect x="203" y="45" width="3" height="16"/></g>' +
        '<g transform="translate(180 125)"><path d="M25 0 L40 40 L50 50 L25 44 L0 50 L10 40Z" fill="#e6f1ff"/><path d="M25 8 L32 30 L18 30Z" fill="#00d4ff"/><rect x="16" y="50" width="18" height="40" fill="url(#t' + u + ')"/></g>';
    },
    blocks: function (u, r, v) {
      var cols = ["#00d4ff", "#ff2bd6", "#ffd23f", "#39ff88", "#ff5a1f", "#b388ff"], o = "", s = 22;
      for (var row = 0; row < 4; row++) for (var c = 0; c < 18; c++) { if (r() < .18 && row < 3) continue; o += '<rect x="' + (2 + c * s) + '" y="' + (225 - (row + 1) * s) + '" width="' + (s - 3) + '" height="' + (s - 3) + '" rx="4" fill="' + cols[Math.floor(r() * 6)] + '"/>'; }
      var T = '<g transform="translate(170 40) rotate(' + (v ? 90 : 0) + ' 33 22)">' + [[0, 0], [22, 0], [44, 0], [22, 22]].map(function (p) { return '<rect x="' + p[0] + '" y="' + p[1] + '" width="19" height="19" rx="4" fill="#b388ff"/>'; }).join("") + '</g>';
      var L = '<g transform="translate(60 70)">' + [[0, 0], [0, 22], [0, 44], [22, 44]].map(function (p) { return '<rect x="' + p[0] + '" y="' + p[1] + '" width="19" height="19" rx="4" fill="#ff5a1f"/>'; }).join("") + '</g>';
      var I = '<g transform="translate(300 30)">' + [0, 22, 44, 66].map(function (y) { return '<rect x="0" y="' + y + '" width="19" height="19" rx="4" fill="#00d4ff"/>'; }).join("") + '</g>';
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0f2c"/><stop offset="1" stop-color="#1b0636"/></linearGradient><filter id="f' + u + '"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/>' + stars(r, 30, 400, 120) + '<g filter="url(#f' + u + ')">' + T + L + I + o + '</g>';
    },
    /* --- new mini games (pack mini6) --- */
    match3: function (u, r, v) {
      var cols = ["#ff4d6d", "#3fa9ff", "#39ff88", "#ffd23f", "#b06bff"], o = "";
      for (var y = 0; y < 5; y++) for (var x = 0; x < 9; x++) { var k = Math.floor(r() * 5), cx = 30 + x * 43, cy = 25 + y * 43;
        o += '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="' + cols[k] + '"/><ellipse cx="' + (cx - 6) + '" cy="' + (cy - 7) + '" rx="6" ry="3.5" fill="#fff" opacity=".6"/>'; }
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b0636"/><stop offset="1" stop-color="' + (v ? "#0a3d62" : "#3a0ca3") + '"/></linearGradient><filter id="f' + u + '"><feGaussianBlur stdDeviation="4"/></filter></defs>' +
        '<rect width="400" height="225" fill="url(#s' + u + ')"/>' + o + '<circle cx="200" cy="112" r="40" fill="#fff" opacity=".35" filter="url(#f' + u + ')"/>' +
        '<g transform="translate(200 112)"><circle r="24" fill="#ffd23f" stroke="#fff" stroke-width="4"/><path d="M-12 0h24M0-12v24" stroke="#ff2bd6" stroke-width="5" stroke-linecap="round"/></g>';
    },
    lanes: function (u, r, v) {
      var d = ""; for (var i = 0; i < 6; i++) d += '<rect x="148" y="' + (i * 42 - 10) + '" width="5" height="24" fill="#fff" opacity=".4"/><rect x="247" y="' + (i * 42 + 6) + '" width="5" height="24" fill="#fff" opacity=".4"/>';
      var co = ""; for (var j = 0; j < 5; j++) co += '<circle cx="100" cy="' + (40 + j * 26) + '" r="8" fill="#ffd23f" stroke="#ffb300" stroke-width="2"/>';
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f2a"/><stop offset="1" stop-color="#1a0b2e"/></linearGradient></defs><rect width="400" height="225" fill="url(#s' + u + ')"/>' +
        '<rect x="0" y="0" width="45" height="225" fill="#121736"/><rect x="355" y="0" width="45" height="225" fill="#121736"/><g opacity=".6"><rect x="8" y="20" width="28" height="60" fill="#ff2bd6"/><rect x="8" y="120" width="28" height="60" fill="#00d4ff"/><rect x="364" y="60" width="28" height="60" fill="#00d4ff"/><rect x="364" y="160" width="28" height="50" fill="#ff2bd6"/></g>' +
        '<rect x="50" y="0" width="300" height="225" fill="#1c2140"/><path d="M52 0V225M348 0V225" stroke="#00d4ff" stroke-width="4"/>' + d + co +
        '<g transform="translate(270 10)"><rect width="70" height="100" rx="12" fill="' + (v ? "#39ff88" : "#ff5a3c") + '"/><rect x="8" y="14" width="54" height="22" rx="6" fill="#bfe9ff" opacity=".8"/></g>' +
        '<rect x="155" y="120" width="90" height="16" rx="5" fill="#ff8a00"/>' +
        '<g transform="translate(200 175)"><ellipse cx="0" cy="34" rx="22" ry="6" fill="#000" opacity=".4"/><path d="M-7 8 L-12 30 M7 8 L12 28" stroke="#0062ff" stroke-width="8" stroke-linecap="round"/><rect x="-14" y="-16" width="28" height="28" rx="9" fill="#00d4ff"/><circle cx="0" cy="-26" r="11" fill="#ffe0bd"/><path d="M-11-28 a11 11 0 0 1 22 0z" fill="#00d4ff"/></g>';
    },
    bubbles: function (u, r, v) {
      var cols = ["#ff4d6d", "#3fa9ff", "#39ff88", "#ffd23f", "#b06bff", "#ff8a3d"], o = "";
      for (var y = 0; y < 3; y++) for (var x = 0; x < 11; x++) { var cx = 22 + x * 36 + (y % 2 ? 18 : 0), cy = 22 + y * 31; if (cx > 390) continue;
        o += '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="' + cols[Math.floor(r() * 6)] + '"/><ellipse cx="' + (cx - 6) + '" cy="' + (cy - 7) + '" rx="6" ry="3.5" fill="#fff" opacity=".6"/>'; }
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b0f3b"/><stop offset="1" stop-color="' + (v ? "#06283d" : "#0a1a3d") + '"/></linearGradient></defs><rect width="400" height="225" fill="url(#s' + u + ')"/>' +
        '<g fill="#fff" opacity=".07"><rect x="20" y="130" width="50" height="95"/><rect x="110" y="110" width="50" height="115"/><rect x="250" y="120" width="50" height="105"/><rect x="330" y="140" width="50" height="85"/></g>' + o +
        '<g transform="translate(200 40)"><circle r="17" fill="#ffd23f"/><path d="M0-11 l3 7 8 .5 -6 5 2 8 -7-4 -7 4 2-8 -6-5 8-.5z" fill="#fff8c4"/></g>' +
        '<path d="M200 200 L150 120" stroke="#fff" stroke-width="3" stroke-dasharray="4 8" opacity=".7"/>' +
        '<g transform="translate(200 205)"><path d="M-36 20 a36 36 0 0 1 72 0z" fill="#24164a" stroke="#ffd23f" stroke-width="3"/><circle cy="-4" r="17" fill="#3fa9ff"/></g>';
    },
    defence: function (u, r, v) {
      var en = ""; for (var i = 0; i < 5; i++) { var x = 40 + i * 78 + r() * 20, y = 30 + r() * 70;
        en += i % 2 ? '<g transform="translate(' + x + ' ' + y + ')"><path d="M-22 -4H22" stroke="#9fb3d1" stroke-width="3"/><ellipse rx="14" ry="10" fill="#ff2bd6"/><circle r="4" fill="#ff3b3b"/></g>'
          : '<g transform="translate(' + x + ' ' + y + ')"><rect x="-16" y="-12" width="32" height="22" rx="5" fill="#9fb3d1"/><rect x="-11" y="-24" width="22" height="14" rx="4" fill="#2b3350"/><rect x="-7" y="-19" width="14" height="4" fill="#ff3b3b"/><rect x="-12" y="10" width="8" height="12" fill="#1a1f33"/><rect x="4" y="10" width="8" height="12" fill="#1a1f33"/></g>'; }
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1430"/><stop offset="1" stop-color="' + (v ? "#3a1a0a" : "#1b2a1f") + '"/></linearGradient></defs><rect width="400" height="225" fill="url(#s' + u + ')"/>' +
        '<g stroke="#39ff88" stroke-opacity=".1">' + [40, 80, 120, 160].map(function (y) { return '<path d="M0 ' + y + 'H400"/>'; }).join("") + '</g>' + en +
        '<path d="M200 185 L120 70" stroke="#ffd23f" stroke-width="3"/><path d="M200 185 L262 60" stroke="#ffd23f" stroke-width="3" opacity=".6"/>' +
        '<rect x="0" y="180" width="400" height="45" fill="#2a2f45"/><g fill="#ffd23f">' + [0, 40, 80, 120, 160, 200, 240, 280, 320, 360].map(function (x) { return '<rect x="' + (x + 20) + '" y="176" width="20" height="4"/>'; }).join("") + '</g>' +
        '<g transform="translate(200 195)"><rect x="0" y="-6" width="40" height="12" rx="3" fill="#1a1f33" transform="rotate(-125)"/><circle r="16" fill="#3d6b3a"/><path d="M-13 -2 a13 13 0 0 1 26 0z" fill="#2c4f2a"/></g>';
    },
    parking: function (u, r, v) {
      var cars = [[1, 2, 2, 1, "#ff3b3b"], [0, 0, 1, 3, "#ffd23f"], [3, 0, 3, 1, "#3fa9ff"], [4, 1, 1, 2, "#39ff88"], [5, 2, 1, 3, "#b06bff"], [2, 4, 2, 1, "#ff8a3d"], [0, 4, 1, 2, "#00d4ff"]], o = "", S = 34, X = 98, Y = 10;
      cars.forEach(function (c) { o += '<rect x="' + (X + c[0] * S + 3) + '" y="' + (Y + c[1] * S + 3) + '" width="' + (c[2] * S - 6) + '" height="' + (c[3] * S - 6) + '" rx="8" fill="' + c[4] + '"/><rect x="' + (X + c[0] * S + 9) + '" y="' + (Y + c[1] * S + 9) + '" width="' + (c[2] * S - 18) + '" height="' + (c[3] * S - 18) + '" rx="5" fill="#fff" opacity=".35"/>'; });
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + (v ? "#0a3d2a" : "#101a3a") + '"/><stop offset="1" stop-color="#05070d"/></linearGradient></defs><rect width="400" height="225" fill="url(#s' + u + ')"/>' +
        '<rect x="' + (X - 6) + '" y="' + (Y - 6) + '" width="' + (6 * S + 12) + '" height="' + (6 * S + 12) + '" rx="12" fill="#2a2f45" stroke="#00d4ff" stroke-width="3"/>' +
        '<rect x="' + (X + 6 * S + 2) + '" y="' + (Y + 2 * S) + '" width="14" height="' + S + '" fill="#2a2f45"/><path d="M' + (X + 6 * S + 24) + ' ' + (Y + 2.5 * S) + ' l14 0 m-6 -7 l7 7 -7 7" stroke="#39ff88" stroke-width="4" fill="none" stroke-linecap="round"/>' + o;
    },
    tower: function (u, r, v) {
      var o = "", w = 150, x = 125;
      for (var i = 0; i < 7; i++) { w -= 8 + r() * 10; x += (r() - .5) * 16 + 4; o += '<rect x="' + x.toFixed(1) + '" y="' + (195 - (i + 1) * 22) + '" width="' + w.toFixed(1) + '" height="20" rx="3" fill="hsl(' + ((v ? 290 : 195) + i * 11) + ',85%,58%)"/>'; }
      return '<defs><linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (v ? "#2b0a4f" : "#4ab3ff") + '"/><stop offset="1" stop-color="' + (v ? "#07021a" : "#bfe9ff") + '"/></linearGradient></defs><rect width="400" height="225" fill="url(#s' + u + ')"/>' +
        (v ? stars(r, 40, 400, 225) : '<g fill="#fff" opacity=".8"><ellipse cx="70" cy="50" rx="34" ry="12"/><ellipse cx="330" cy="80" rx="40" ry="13"/></g>') +
        '<rect x="0" y="195" width="400" height="30" fill="' + (v ? "#140a2e" : "#3b7a3a") + '"/>' + o +
        '<rect x="' + (x + 40) + '" y="20" width="' + (w - 10).toFixed(1) + '" height="20" rx="3" fill="#ffd23f"/><path d="M' + (x + 20) + ' 30 h-20 m' + (w + 60).toFixed(0) + ' 0 h20" stroke="#fff" stroke-width="3" stroke-dasharray="5 5"/>';
    }
  };
  var MAP = { "shadow-front": "soldier", "sniper-range": "range", "deep-sea-strike": "sub", "deep-sea-patrol": "sub", "turbo-racing": "racer", "turbo-rush": "racer", "dino-adventure": "dino", "dino-dash": "dino", "memory-jungle": "memory", "neon-snake": "snake", "star-vanguard": "space", "neon-blocks": "blocks", "color-blast-3": "match3", "turbo-lane-rush": "lanes", "bubble-kingdom": "bubbles", "mini-soldier-strike": "defence", "parking-escape": "parking", "sky-tower-stack": "tower" };

  /** Returns an inline SVG string for a game cover. variant 0/1 gives alternate art. */
  window.GVCover = function (id, variant, label) {
    var gm = window.GV && GV.game ? GV.game(id) : null;
    if (gm && gm.shots) {
      var n = Math.min(gm.shots, (variant || 0) + 1);
      return '<img class="cover-img" src="assets/shots/' + id + '-' + n + '.jpg" alt="' + (label || gm.title) + '" loading="lazy" decoding="async" width="800" height="450">';
    }
    var kind = MAP[id] || "space", u = "c" + (n++);
    var r = rng(hash(id) + (variant || 0) * 977);
    return '<svg class="cover-svg" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + (label || "Game cover art") + '" xmlns="http://www.w3.org/2000/svg">' + ART[kind](u, r, variant || 0) + '</svg>';
  };
})();
