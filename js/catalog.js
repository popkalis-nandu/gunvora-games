/* Homepage + All Games page: rows, categories, client-side search & filters. */
(function () {
  "use strict";
  var G = window.GV_GAMES, $ = GV.$;
  function fill(el, list) { if (el) el.innerHTML = list.length ? list.map(GV.card).join("") : '<div class="empty">No games found. Try another search or category.</div>'; }
  var playable = G.filter(function (g) { return g.status === "playable"; });

  document.addEventListener("DOMContentLoaded", function () {
    /* homepage rows */
    var hero = $("#hero-art"); if (hero) hero.innerHTML = GVCover("shadow-front", 0, "GUNVORA: Shadow Front key art");
    var heroPlay = $("#hero-play"); if (heroPlay) heroPlay.innerHTML = GV.playBadge("shadow-front");
    fill($("#row-trending"), playable.slice().sort(function (a, b) { return a.trending - b.trending; }).slice(0, 8));
    fill($("#row-new"), G.slice().sort(function (a, b) { return b.added < a.added ? -1 : 1; }).slice(0, 8));
    fill($("#grid-online"), playable);
    var and = $("#android-list");
    if (and) and.innerHTML = Object.keys(GV.cfg.androidLinks || {}).map(function (id) { var g = GV.game(id); if (!g) return ""; return '<div class="android-item"><a class="thumb" href="game.html?id=' + id + '" aria-label="' + GV.esc(g.title) + '">' + GVCover(id, 0, g.title) + '</a><div class="grow"><h3><a href="game.html?id=' + id + '">' + GV.esc(g.title) + '</a></h3><span class="small muted">' + GV.esc(g.tagline) + '</span></div>' + GV.playBadge(id) + '</div>'; }).join("");

    /* browse grid with search + filters (homepage & games.html) */
    var grid = $("#browse-grid"); if (!grid) return;
    var input = $("#browse-q"), chips = $("#chips"), cats = $("#cats");
    var state = { q: GV.qs("q") || "", filter: GV.qs("filter") || "all", cat: GV.qs("cat") || "" };
    if (input) input.value = state.q;
    var FILTERS = [["all", "All"], ["free", "Free"], ["premium", "★ Premium"], ["online", "Play online"], ["soon", "Coming soon"]];
    if (chips) chips.innerHTML = FILTERS.map(function (f) { return '<button class="chip" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join("") +
      GV_CATEGORIES.map(function (c) { return '<button class="chip" data-cat="' + c.id + '">' + c.icon + ' ' + c.name + '</button>'; }).join("");
    if (cats) cats.innerHTML = GV_CATEGORIES.map(function (c) { var n = G.filter(function (g) { return g.categories.indexOf(c.id) >= 0; }).length; return '<button class="cat" data-cat="' + c.id + '"><span aria-hidden="true">' + c.icon + '</span>' + c.name + '<small>' + n + ' game' + (n === 1 ? "" : "s") + '</small></button>'; }).join("");

    function apply() {
      var q = state.q.trim().toLowerCase();
      var list = G.filter(function (g) {
        if (state.cat && g.categories.indexOf(state.cat) < 0) return false;
        if (state.filter === "free" && (g.premium || g.status !== "playable")) return false;
        if (state.filter === "premium" && !g.premium) return false;
        if (state.filter === "online" && g.status !== "playable") return false;
        if (state.filter === "soon" && g.status !== "coming-soon") return false;
        if (!q) return true;
        var hay = [g.title, g.tagline, g.storyline, g.categories.map(function (c) { return (GV.cat(c) || {}).name; }).join(" "), g.premium ? "premium" : "free", g.kids ? "kids children" : "", g.status].join(" ").toLowerCase();
        return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
      });
      // playable first, then coming soon
      list.sort(function (a, b) { return (a.status === "playable" ? 0 : 1) - (b.status === "playable" ? 0 : 1); });
      fill(grid, list);
      GV.$$(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.f ? String(c.dataset.f === state.filter) : String(c.dataset.cat === state.cat)); });
      GV.$$(".cat").forEach(function (c) { c.classList.toggle("active", c.dataset.cat === state.cat); });
      var cnt = $("#browse-count"); if (cnt) cnt.textContent = list.length + " game" + (list.length === 1 ? "" : "s") + (state.cat ? " in " + GV.cat(state.cat).name : "") + (q ? ' matching "' + state.q + '"' : "");
      var u = new URLSearchParams(); if (state.q) u.set("q", state.q); if (state.filter !== "all") u.set("filter", state.filter); if (state.cat) u.set("cat", state.cat);
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : "") + location.hash);
    }
    if (input) input.addEventListener("input", function () { state.q = input.value; apply(); });
    var hdr = $("#hdr-q");
    if (hdr && input) { hdr.form.addEventListener("submit", function (e) { e.preventDefault(); state.q = input.value = hdr.value; apply(); grid.scrollIntoView({ behavior: "smooth", block: "start" }); }); }
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-f],[data-cat]"); if (!t || !t.matches(".chip,.cat")) return;
      if (t.dataset.f) { state.filter = t.dataset.f; if (t.dataset.f === "all") state.cat = ""; }
      else state.cat = state.cat === t.dataset.cat ? "" : t.dataset.cat;
      apply();
      if (t.classList.contains("cat")) $("#browse").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    apply();
  });
})();
