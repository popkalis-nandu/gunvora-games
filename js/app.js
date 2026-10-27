/* Gaming World of Jarvis — shared site logic: layout, entitlements, payments, ads, cookies. */
(function () {
  "use strict";
  var C = window.GV_CONFIG || {};
  var GV = window.GV = {};
  GV.cfg = C;

  /* ---------- helpers ---------- */
  GV.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  GV.qs = function (k) { return new URLSearchParams(location.search).get(k); };
  GV.$ = function (s, el) { return (el || document).querySelector(s); };
  GV.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  GV.game = function (id) { return (window.GV_GAMES || []).filter(function (g) { return g.id === id; })[0]; };
  GV.item = function (id) { return (window.GV_STORE_ITEMS || []).filter(function (i) { return i.id === id; })[0]; };
  GV.cat = function (id) { return (window.GV_CATEGORIES || []).filter(function (c) { return c.id === id; })[0]; };
  GV.price = function (n) { return (C.currency || "₹") + n; };
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  GV.store = store;

  /* ---------- entitlements (client-side only; see README) ---------- */
  function ent() { var e = store("gv_ent") || {}; e.items = e.items || []; e.equipped = e.equipped || {}; e.premiumUntil = e.premiumUntil || 0; return e; }
  GV.ent = ent;
  GV.isPremium = function () { return ent().premiumUntil > Date.now(); };
  GV.premiumUntil = function () { return ent().premiumUntil; };
  GV.owns = function (id) { return ent().items.indexOf(id) >= 0; };
  GV.grant = function (list) {
    var e = ent(), out = [];
    list.forEach(function (x) {
      var m = /^premium:(\d+)$/.exec(x);
      if (m) { var base = Math.max(Date.now(), e.premiumUntil); e.premiumUntil = base + (+m[1]) * 864e5; out.push("Premium +" + m[1] + " day" + (m[1] === "1" ? "" : "s")); return; }
      var it = GV.item(x); if (!it) return;
      (it.bundle || [x]).concat(it.bundle ? [x] : []).forEach(function (id) { if (e.items.indexOf(id) < 0) e.items.push(id); });
      out.push(it.name);
    });
    store("gv_ent", e); return out;
  };
  GV.redeem = function (code) {
    code = String(code || "").trim().toUpperCase();
    var codes = C.unlockCodes || {}, key = Object.keys(codes).filter(function (k) { return k.toUpperCase() === code; })[0];
    if (!key) return { ok: false, msg: "That code is not valid. Check for typos or contact support." };
    var used = store("gv_used") || [];
    if (used.indexOf(key) >= 0) return { ok: false, msg: "This code has already been redeemed in this browser." };
    var got = GV.grant(codes[key]); used.push(key); store("gv_used", used);
    return { ok: true, msg: "Unlocked: " + got.join(", ") };
  };
  GV.equip = function (slot, id) { var e = ent(); if (id) e.equipped[slot] = id; else delete e.equipped[slot]; store("gv_ent", e); };
  /** value of the equipped cosmetic for a slot (colour etc.), or null for default */
  GV.skin = function (slot) { var e = ent(), id = e.equipped[slot]; if (!id || e.items.indexOf(id) < 0) return null; var it = GV.item(id); return it ? it.value : null; };

  /* ---------- payments ---------- */
  GV.linkFor = function (key) {
    var p = C.paymentLinks || {};
    return p[key] || (p.items || {})[key] || "";
  };
  GV.pay = function (key, label) {
    var url = GV.linkFor(key);
    if (!url || /REPLACE_ME/i.test(url)) {
      GV.modal("<h2>Payments opening soon</h2><p>Online payment for <strong>" + GV.esc(label || key) + "</strong> isn't switched on yet.</p><p class='muted small'>Site owner: paste your Razorpay / Stripe Payment Link for <code>" + GV.esc(key) + "</code> into <code>js/config.js → paymentLinks</code>.</p><p>Questions? Email <a href='mailto:" + GV.esc(C.contactEmail) + "'>" + GV.esc(C.contactEmail) + "</a>.</p>");
      return false;
    }
    window.open(url, "_blank", "noopener");
    GV.modal("<h2>Complete your payment</h2><p>The secure payment page has opened in a new tab.</p><p>After a successful payment you'll receive an <strong>unlock code</strong> by email (usually within a few minutes, max 24 hours). Enter it on the <a href='redeem.html'>Redeem page</a> to activate <strong>" + GV.esc(label || "") + "</strong>.</p><p class='muted small'>By paying you agree to our <a href='terms.html'>Terms</a> and <a href='refund.html'>Refund Policy</a>.</p>");
    return true;
  };

  /* ---------- modal ---------- */
  GV.modal = function (html) {
    var m = GV.$("#gv-modal");
    if (!m) {
      m = document.createElement("div"); m.id = "gv-modal"; m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
      m.innerHTML = '<div class="modal-box"><button class="modal-x" aria-label="Close">×</button><div class="modal-body"></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", function (e) { if (e.target === m || e.target.classList.contains("modal-x")) GV.closeModal(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") GV.closeModal(); });
    }
    GV.$(".modal-body", m).innerHTML = html; m.classList.add("open"); GV.$(".modal-x", m).focus();
  };
  GV.closeModal = function () { var m = GV.$("#gv-modal"); if (m) m.classList.remove("open"); };

  /* ---------- logo ---------- */
  GV.logo = function (size) {
    size = size || 34;
    var u = "lg" + Math.random().toString(36).slice(2, 7);
    return '<svg class="brand-mark" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset=".55" stop-color="#4338ca"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#' + u + ')"/>' +
      '<path d="M22 19 H44 M36 19 V38 A9.5 9.5 0 0 1 17 38" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="47" cy="45" r="4.5" fill="#f97316" stroke="#fff" stroke-width="2"/></svg>';
  };

  /* ---------- cards ---------- */
  GV.badges = function (g) {
    var b = "";
    if (g.status === "coming-soon") b += '<span class="badge soon">Coming soon</span>';
    else if (g.premium) b += '<span class="badge prem">★ Premium</span>';
    else b += '<span class="badge free">Free</span>';
    if (g.isNew) b += '<span class="badge new">New</span>';
    if (g.kids) b += '<span class="badge kids">Kids</span>';
    return b;
  };
  GV.card = function (g) {
    var cats = g.categories.map(function (c) { var k = GV.cat(c); return k ? k.name : c; }).join(" · ");
    return '<a class="card" href="game.html?id=' + g.id + '" data-id="' + g.id + '">' +
      '<div class="card-art">' + GVCover(g.id, 0, g.title + " cover art") + '<div class="card-badges">' + GV.badges(g) + '</div>' +
      (g.status === "playable" ? '<span class="card-play" aria-hidden="true">▶</span>' : '') + '</div>' +
      '<div class="card-body"><h3>' + GV.esc(g.title) + '</h3><p>' + GV.esc(cats) + '</p></div></a>';
  };

  /* ---------- Google Play badge (placeholder until link is set in config) ---------- */
  GV.playBadge = function (id) {
    var url = (C.androidLinks || {})[id];
    var icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#22d3ee" d="M3.6 1.8 13.4 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1z"/><path fill="#39ff88" d="m16.8 8.6-3.4 3.4-9.8-10.2c.2-.1.6-.1.9.1l12.3 6.7z"/><path fill="#ffd23f" d="m20.4 10.6c.8.5.8 1.8 0 2.3l-3.6 2-3.4-2.9 3.4-3.4 3.6 2z"/><path fill="#ff4d5e" d="M13.4 12l3.4 3.4-12.3 6.7c-.3.2-.6.2-.9.1L13.4 12z"/></svg>';
    var inner = icon + '<span class="pb-t"><small>' + (url ? "Get it on" : "Soon on") + '</small><strong>Google Play</strong></span>';
    if (url) return '<a class="play-badge" href="' + GV.esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>';
    return '<span class="play-badge soon" role="img" aria-label="Google Play – coming soon" title="Android version coming soon">' + inner + '</span>';
  };

  /* ---------- header / footer ---------- */
  var NAV = [["index.html", "Home"], ["games.html", "All Games"], ["games.html?cat=kids", "Kids"], ["store.html", "Store"], ["pricing.html", "Premium"]];
  function header() {
    var h = GV.$("#site-header"); if (!h) return;
    var here = location.pathname.split("/").pop() || "index.html";
    h.className = "site-header";
    h.innerHTML = '<a class="skip" href="#main">Skip to content</a><div class="topbar"><div class="wrap"><span>🎮 ' + (window.GV_GAMES ? GV_GAMES.filter(function (g) { return g.status === "playable"; }).length + " games to play" : "Browser games") + ' · 75%+ free forever</span><span>🔒 Secure payments</span><span>🇮🇳 Made in India</span><a href="pricing.html">Go ad-free with Premium →</a></div></div><div class="wrap nav-row">' +
      '<a class="brand" href="index.html" aria-label="' + GV.esc(C.siteName) + ' home">' + GV.logo(36) + '<span class="brand-name"><span class="bn-top">Gaming World of</span><span class="bn-main">JARV<b>I</b>S</span></span></a>' +
      '<form class="search" role="search" action="games.html"><label class="sr-only" for="hdr-q">Search games</label><input id="hdr-q" name="q" type="search" placeholder="Search games…" autocomplete="off"><button aria-label="Search">⌕</button></form>' +
      '<button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="main-nav">☰</button>' +
      '<nav id="main-nav" class="main-nav" aria-label="Main">' + NAV.map(function (n) { return '<a href="' + n[0] + '"' + (n[0] === here ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join("") +
      '<a class="nav-cta" href="' + (GV.isPremium() ? "redeem.html" : "pricing.html") + '">' + (GV.isPremium() ? "★ Premium active" : "Go Premium") + '</a></nav></div>';
    var t = GV.$(".nav-toggle", h), nav = GV.$("#main-nav", h);
    t.addEventListener("click", function () { var o = nav.classList.toggle("open"); t.setAttribute("aria-expanded", o); });
    var q = GV.qs("q"); if (q) GV.$("#hdr-q").value = q;
  }
  function footer() {
    var f = GV.$("#site-footer"); if (!f) return;
    f.className = "site-footer";
    var cols = [
      ["Play", [["games.html", "All games"], ["games.html?filter=free", "Free games"], ["games.html?filter=premium", "Premium games"], ["games.html?cat=kids", "Kids games"], ["games.html?filter=soon", "Coming soon"]]],
      ["Account", [["pricing.html", "Premium plans"], ["store.html", "In-game store"], ["redeem.html", "Redeem code / My items"]]],
      ["Company", [["about.html", "About us"], ["contact.html", "Contact us"], ["grievance.html", "Grievance officer"]]],
      ["Legal", [["privacy.html", "Privacy policy"], ["terms.html", "Terms & conditions"], ["refund.html", "Refund & cancellation"], ["shipping.html", "Shipping & delivery"], ["cookies.html", "Cookie policy"], ["disclaimer.html", "Disclaimer"]]]
    ];
    var trust = [["🔒", "Secure payments", "UPI, cards & net-banking via trusted gateways"], ["👨‍👩‍👧", "Family-friendly", "Kids games: no ads, no purchases"], ["🇮🇳", "Made in India", "Original games, built with care"], ["⚡", "No download", "Play instantly in your browser"]];
    f.innerHTML = '<div class="wrap"><div class="foot-trust">' + trust.map(function (t) { return '<div><span aria-hidden="true">' + t[0] + '</span><div>' + t[1] + '<small>' + t[2] + '</small></div></div>'; }).join("") + '</div><div class="foot-grid"><div class="foot-brand"><a class="brand" href="index.html">' + GV.logo(40) + '<span class="brand-name"><span class="bn-top">Gaming World of</span><span class="bn-main">JARV<b>I</b>S</span></span></a><p>' + GV.esc(C.tagline) + '</p><p class="small muted">' + GV.esc(C.businessName) + '<br>' + GV.esc(C.address) + (C.gstin ? '<br>GSTIN: ' + GV.esc(C.gstin) : '') + '<br><a href="mailto:' + GV.esc(C.contactEmail) + '">' + GV.esc(C.contactEmail) + '</a></p><div class="pay-logos" aria-label="Accepted payment methods"><span>UPI</span><span>VISA</span><span>Mastercard</span><span>RuPay</span><span>Net-banking</span></div></div>' +
      cols.map(function (c) { return '<div><h4>' + c[0] + '</h4><ul>' + c[1].map(function (l) { return '<li><a href="' + l[0] + '">' + l[1] + '</a></li>'; }).join("") + '</ul></div>'; }).join("") +
      '</div><div class="foot-bottom"><span>© ' + new Date().getFullYear() + ' ' + GV.esc(C.businessName) + '. All game titles, logos and artwork are original works of ' + GV.esc(C.siteName) + '.</span><button class="linkish" id="cookie-settings">Cookie settings</button></div></div>';
    GV.$("#cookie-settings").addEventListener("click", function () { store("gv_consent", null); cookieBanner(true); });
  }

  /* ---------- config placeholders in static HTML ---------- */
  function fillCfg() {
    GV.$$("[data-cfg]").forEach(function (el) {
      var v = el.getAttribute("data-cfg").split(".").reduce(function (o, k) { return o ? o[k] : ""; }, C);
      el.textContent = v == null ? "" : v;
    });
    GV.$$("[data-cfg-mail]").forEach(function (el) {
      var v = el.getAttribute("data-cfg-mail").split(".").reduce(function (o, k) { return o ? o[k] : ""; }, C);
      el.href = "mailto:" + v; el.textContent = v;
    });
    GV.$$("[data-cfg-price]").forEach(function (el) { var p = (C.plans || {})[el.getAttribute("data-cfg-price")]; if (p) el.textContent = GV.price(p.price); });
  }

  /* ---------- cookie consent ---------- */
  GV.consent = function () { return store("gv_consent"); };
  function cookieBanner(force) {
    if (GV.consent() && !force) return;
    var old = GV.$("#cookie-banner"); if (old) old.remove();
    var b = document.createElement("div"); b.id = "cookie-banner"; b.className = "cookie-banner"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Cookie consent");
    b.innerHTML = '<p>🍪 We use essential storage to remember your settings, premium status and high scores. With your permission we also use advertising & analytics cookies. See our <a href="cookies.html">Cookie Policy</a>.</p><div class="cookie-actions"><button class="btn ghost" data-c="essential">Essential only</button><button class="btn" data-c="all">Accept all</button></div>';
    document.body.appendChild(b);
    b.addEventListener("click", function (e) { var c = e.target.getAttribute("data-c"); if (!c) return; store("gv_consent", { level: c, at: Date.now() }); b.remove(); ads(); });
  }

  /* ---------- ads ---------- */
  var adsLoaded = false;
  function ads() {
    var kidsPage = document.body.hasAttribute("data-kids");
    var hide = !C.ads || !C.ads.enabled || GV.isPremium() || kidsPage;
    GV.$$(".ad-slot").forEach(function (s) {
      if (hide) { s.hidden = true; return; }
      s.hidden = false;
      var c = GV.consent();
      if (C.ads.adsenseClient && c && c.level === "all") {
        if (!s.dataset.filled) {
          s.dataset.filled = 1;
          s.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + GV.esc(C.ads.adsenseClient) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
          if (!adsLoaded) { adsLoaded = true; var sc = document.createElement("script"); sc.async = true; sc.crossOrigin = "anonymous"; sc.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(C.ads.adsenseClient); document.head.appendChild(sc); }
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
        }
      } else if (!s.dataset.filled) {
        s.innerHTML = '<span>Advertisement</span><small><a href="pricing.html">Go Premium for ad-free play</a></small>';
      }
    });
  }
  GV.refreshAds = ads;

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    header(); footer(); fillCfg(); ads(); cookieBanner(false);
    GV.$$("[data-pay]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); GV.pay(b.getAttribute("data-pay"), b.getAttribute("data-label")); }); });
    var yr = GV.$("#yr"); if (yr) yr.textContent = new Date().getFullYear();
  });
})();
