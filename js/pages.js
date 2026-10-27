/* Small page controllers: pricing status, redeem/account, contact form. */
(function () {
  "use strict";
  function fmt(ts) { return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }
  document.addEventListener("DOMContentLoaded", function () {
    /* pricing */
    var ps = GV.$("#plan-status");
    if (ps && GV.isPremium()) { ps.hidden = false; ps.innerHTML = "★ Your Premium is active until <strong>" + fmt(GV.premiumUntil()) + "</strong> on this browser. Paying again extends it."; }
    var pl = GV.$("#premium-list"); if (pl) pl.innerHTML = GV_GAMES.filter(function (g) { return g.premium; }).map(GV.card).join("");

    /* redeem / account */
    var form = GV.$("#redeem-form");
    if (form) {
      var out = GV.$("#redeem-out"), st = GV.$("#acct-status"), owned = GV.$("#owned-grid");
      if (GV.qs("paid")) { out.className = "notice ok"; out.hidden = false; out.textContent = "Thank you for your payment! Your unlock code will arrive by email (usually within minutes, at most 24 hours). Enter it below."; }
      var paint = function () {
        st.innerHTML = GV.isPremium() ? '<span class="badge prem">★ Premium</span> Active until <strong>' + fmt(GV.premiumUntil()) + '</strong> — ad-free play and all premium games unlocked.' : 'Plan: <strong>Free</strong>. <a href="pricing.html">Upgrade to Premium</a> for ad-free play and premium games.';
        var items = GV_STORE_ITEMS.filter(function (i) { return GV.owns(i.id) && !i.bundle; });
        if (items.length) GVStore.render(owned, items); else owned.innerHTML = '<div class="empty">No items yet. Visit the <a href="store.html">Store</a>.</div>';
      };
      paint();
      form.addEventListener("submit", function (e) {
        e.preventDefault(); var r = GV.redeem(GV.$("#code").value);
        out.hidden = false; out.className = "notice " + (r.ok ? "ok" : "err"); out.textContent = r.msg;
        if (r.ok) { GV.$("#code").value = ""; paint(); GV.refreshAds(); var cta = GV.$(".nav-cta"); if (cta && GV.isPremium()) cta.textContent = "★ Premium active"; }
      });
      GV.$("#reset-data").addEventListener("click", function () {
        if (!confirm("Erase all Gaming World of Jarvis data stored in this browser (premium status, items, high scores, cookie choice)?")) return;
        Object.keys(localStorage).filter(function (k) { return k.indexOf("gv_") === 0; }).forEach(function (k) { localStorage.removeItem(k); });
        location.reload();
      });
    }

    /* contact */
    var cf = GV.$("#contact-form");
    if (cf) cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = { name: cf.name.value, email: cf.email.value, topic: cf.topic.value, message: cf.message.value }, o = GV.$("#contact-out");
      var ep = GV.cfg.contactFormEndpoint;
      if (ep) {
        fetch(ep, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) })
          .then(function (r) { if (!r.ok) throw 0; o.hidden = false; o.className = "notice ok"; o.textContent = "Thanks! We've received your message and will reply within 48 hours."; cf.reset(); })
          .catch(function () { o.hidden = false; o.className = "notice err"; o.textContent = "Sorry, sending failed. Please email us directly at " + GV.cfg.contactEmail; });
      } else {
        location.href = "mailto:" + GV.cfg.contactEmail + "?subject=" + encodeURIComponent("[" + d.topic + "] from " + d.name) + "&body=" + encodeURIComponent(d.message + "\n\n— " + d.name + " <" + d.email + ">");
        o.hidden = false; o.className = "notice ok"; o.textContent = "Your email app should now open with your message. If it doesn't, email us at " + GV.cfg.contactEmail;
      }
    });
  });
})();
