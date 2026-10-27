/* In-game store + item rendering (used on store.html, game.html, redeem.html). */
(function () {
  "use strict";
  var ICON = { "Gun skin": "🎯", "Car upgrade": "🏎️", "Sub upgrade": "🛥️", "Cosmetic": "✨", "Outfit": "🧥", "Bundle": "🎁" };
  function value(it) { return it.bundle ? it.bundle.reduce(function (s, id) { return s + (GV.item(id) || {}).price; }, 0) : it.price; }
  function itemHTML(it) {
    var owned = GV.owns(it.id), eq = it.slot && (GV.ent().equipped[it.slot] === it.id), g = it.game ? GV.game(it.game) : null;
    var sw = it.value === "rainbow" ? ' rainbow' : '', st = it.value && it.value !== "rainbow" ? ' style="--sw:' + it.value + '"' : '';
    var action = owned
      ? (it.slot ? '<button class="btn sm ' + (eq ? "ghost" : "") + '" data-equip="' + it.id + '">' + (eq ? "✓ Equipped (unequip)" : "Equip") + '</button>' : '<span class="owned">✓ Owned</span>')
      : '<button class="btn sm gold" data-buy="' + it.id + '">Buy ' + GV.price(it.price) + '</button>';
    return '<article class="item"><div class="swatch' + sw + '"' + st + ' aria-hidden="true">' + (ICON[it.type] || "★") + '</div><span class="type">' + it.type + '</span><h3>' + GV.esc(it.name) + '</h3>' +
      '<p class="small muted grow">' + GV.esc(it.desc) + (g ? ' <a href="game.html?id=' + g.id + '">' + GV.esc(g.title) + '</a>' : '') + (it.bundle ? '<br><strong>Worth ' + GV.price(value(it)) + ' — save ' + GV.price(value(it) - it.price) + '</strong>' : '') + '</p>' +
      '<div class="actions" style="justify-content:space-between"><span class="price">' + GV.price(it.price) + '</span>' + action + '</div>' + (owned ? '' : '<p class="small muted" style="margin:0">Cosmetic only · no gameplay advantage</p>') + '</article>';
  }
  window.GVStore = {
    render: function (el, items) {
      function paint() { el.innerHTML = items.map(itemHTML).join(""); }
      paint();
      el.addEventListener("click", function (e) {
        var b = e.target.closest("[data-buy],[data-equip]"); if (!b) return;
        if (b.dataset.buy) { var it = GV.item(b.dataset.buy); GV.pay(it.id, it.name + " (" + GV.price(it.price) + ")"); }
        else { var x = GV.item(b.dataset.equip), cur = GV.ent().equipped[x.slot]; GV.equip(x.slot, cur === x.id ? null : x.id); paint(); }
      });
    }
  };
  document.addEventListener("DOMContentLoaded", function () {
    var el = GV.$("#store-grid"); if (el) GVStore.render(el, GV_STORE_ITEMS);
  });
})();
