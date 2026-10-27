/* Game detail page — game.html?id=<id> */
(function () {
  "use strict";
  var g = GV.game(GV.qs("id"));
  if (g && g.kids) document.body.setAttribute("data-kids", "");
  document.addEventListener("DOMContentLoaded", function () {
    var m = GV.$("#detail");
    if (!g) { m.innerHTML = '<div class="e404"><div class="big">?</div><h1>Game not found</h1><p class="muted">It may have moved. Try searching.</p><a class="btn" href="games.html">Browse all games</a></div>'; return; }
    document.title = g.title + " – " + (g.status === "playable" ? (g.premium ? "Premium" : "Play free online") : "Coming soon") + " | " + GV.cfg.siteName;
    var md = document.querySelector('meta[name="description"]'); if (md) md.content = g.title + ": " + g.tagline + " " + g.storyline.slice(0, 110) + "…";
    var playable = g.status === "playable", locked = g.premium && !GV.isPremium();
    var cats = g.categories.map(function (c) { var k = GV.cat(c); return '<a href="games.html?cat=' + c + '">' + k.icon + " " + k.name + '</a>'; }).join(" · ");
    var lite = g.liteVersion ? GV.game(g.liteVersion) : null;
    var playBtn = playable
      ? (locked ? '<a class="btn gold" href="pricing.html">★ Unlock with Premium</a><a class="btn ghost" href="play.html?id=' + g.id + '">Preview</a>' : '<a class="btn" href="play.html?id=' + g.id + '">▶ Play Online' + (g.premium ? "" : " – Free") + '</a>')
      : (lite ? '<a class="btn" href="play.html?id=' + lite.id + '">▶ Play ' + GV.esc(lite.title) + ' (free)</a>' : '<button class="btn" disabled>Coming soon</button>');
    var shots = playable
      ? (g.shots ? Array.apply(null, Array(Math.max(3, g.shots))).map(function (_, k) { var n = (k % g.shots) + 1; return '<figure><img src="assets/shots/' + g.id + '-' + n + '.jpg" alt="' + GV.esc(g.title) + ' screenshot ' + n + '" loading="lazy" width="800" height="450"></figure>'; }).slice(0, Math.min(3, Math.max(g.shots, 2))).join("") : [1, 2].map(function (n) { return '<figure><img src="assets/shots/' + g.id + '-' + n + '.png" alt="' + GV.esc(g.title) + ' gameplay screenshot ' + n + '" loading="lazy" width="640" height="360"></figure>'; }).join("") + '<figure>' + GVCover(g.id, 1, g.title + " artwork") + '</figure>')
      : '<figure>' + GVCover(g.id, 1, g.title + " concept art") + '</figure><figure>' + GVCover(g.id, 0, g.title + " key art") + '</figure>' + (lite ? '<figure><img src="assets/shots/' + lite.id + (lite.shots ? '-1.jpg' : '-1.png') + '" alt="' + GV.esc(lite.title) + ' screenshot" loading="lazy" width="640" height="360"></figure>' : '');
    var trailer = g.trailer
      ? '<div class="trailer"><iframe src="https://www.youtube-nocookie.com/embed/' + GV.esc(g.trailer) + '" title="' + GV.esc(g.title) + ' trailer" allow="encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe></div>'
      : '<div class="trailer">' + GVCover(g.id, 1, g.title + " trailer preview") + '<div class="tl">' + (playable ? '<a class="btn" href="play.html?id=' + g.id + '">▶ Watch it live — play now</a>' : 'Trailer coming soon') + '</div></div>';
    var items = (g.store || []).map(GV.item).filter(Boolean);
    m.innerHTML =
      '<nav class="small muted" aria-label="Breadcrumb" style="margin-top:20px"><a href="index.html">Home</a> › <a href="games.html">Games</a> › ' + GV.esc(g.title) + '</nav>' +
      '<section class="detail-hero"><div class="detail-cover">' + GVCover(g.id, 0, g.title + " cover art") + '</div><div class="detail-info"><div class="card-badges">' + GV.badges(g) + '</div><h1>' + GV.esc(g.title) + '</h1><p class="muted" style="font-size:1.1rem">' + GV.esc(g.tagline) + '</p>' +
      (g.note ? '<p class="notice warn small">' + GV.esc(g.note) + '</p>' : '') +
      '<dl class="meta"><div><dt>Difficulty</dt><dd>' + g.difficulty + '</dd></div><div><dt>Age</dt><dd>' + g.age + '</dd></div><div><dt>Price</dt><dd>' + (g.status !== "playable" ? "Coming soon" : g.premium ? "Premium" : "Free") + '</dd></div><div><dt>Category</dt><dd>' + cats + '</dd></div><div style="grid-column:1/-1"><dt>Platforms</dt><dd>' + g.platforms.join(" · ") + '</dd></div></dl>' +
      '<div class="actions">' + playBtn + '<span id="dl-android">' + GV.playBadge(g.id) + '</span></div>' +
      (g.kids ? '<p class="small muted" style="margin-top:12px">🧸 Kid-safe: no ads, no purchases, no personal data collected.</p>' : '') + '</div></section>' +
      '<div class="ad-slot" aria-label="Advertisement"></div>' +
      '<section class="section two"><div class="panel"><h2>Storyline</h2><p>' + GV.esc(g.storyline) + '</p><h2 style="margin-top:20px">How to play</h2><ol>' + g.instructions.map(function (i) { return "<li>" + GV.esc(i) + "</li>"; }).join("") + '</ol></div>' +
      '<div class="panel"><h2>Controls</h2><table class="keys"><tbody>' + g.controls.map(function (c) { return '<tr><td><kbd>' + GV.esc(c[0]) + '</kbd></td><td>' + GV.esc(c[1]) + '</td></tr>'; }).join("") + '</tbody></table>' +
      '<h2 style="margin-top:20px">Trailer</h2>' + trailer + '</div></section>' +
      '<section class="section"><div class="sec-head"><h2>Screenshots</h2></div><div class="shots">' + shots + '</div></section>' +
      (items.length ? '<section class="section"><div class="sec-head"><h2>Upgrades for this game</h2><a href="store.html">Visit store →</a></div><div class="store-grid" id="game-items"></div></section>' : '') +
      '<section class="section"><div class="sec-head"><h2>More games</h2><a href="games.html">See all →</a></div><div class="row" id="more"></div></section>';
    var more = GV_GAMES.filter(function (x) { return x.id !== g.id && x.categories.some(function (c) { return g.categories.indexOf(c) >= 0; }); });
    if (more.length < 4) more = more.concat(GV_GAMES.filter(function (x) { return x.id !== g.id && more.indexOf(x) < 0 && x.status === "playable"; }));
    GV.$("#more").innerHTML = more.slice(0, 8).map(GV.card).join("");
    if (items.length && window.GVStore) GVStore.render(GV.$("#game-items"), items);
    GV.refreshAds();
    // JSON-LD for SEO
    var ld = document.createElement("script"); ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "VideoGame", name: g.title, description: g.tagline, genre: g.categories, gamePlatform: g.platforms, applicationCategory: "Game", offers: { "@type": "Offer", price: g.premium ? GV.cfg.plans.monthly.price : 0, priceCurrency: "INR" }, publisher: { "@type": "Organization", name: GV.cfg.siteName } });
    document.head.appendChild(ld);
  });
})();
