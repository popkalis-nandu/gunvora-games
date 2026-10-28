// Shared menu / HUD / save system for GUNVORA GAMES horror titles
import { IS_TOUCH } from './input.js';
export class Save {
  constructor(slug, upgrades) {
    this.key = 'gunvora_' + slug + '_v1';
    let d = null; try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) {}
    this.d = Object.assign({ unlocked: 1, coins: 0, upg: {}, stars: {}, settings: { quality: IS_TOUCH ? 'low' : 'high', sens: 1, vol: 0.8, fps: false } }, d || {});
    this.d.settings = Object.assign({ quality: IS_TOUCH ? 'low' : 'high', sens: 1, vol: 0.8, fps: false }, this.d.settings);
    upgrades.forEach(u => { if (this.d.upg[u.id] == null) this.d.upg[u.id] = 0; });
  }
  get s() { return this.d.settings; }
  lv(id) { return this.d.upg[id] || 0; }
  write() { try { localStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) {} }
}
const $ = (s, r = document) => r.querySelector(s);
export class UI {
  constructor(cfg) {
    this.cfg = cfg; this.save = new Save(cfg.slug, cfg.upgrades); this.page = 0;
    const root = document.getElementById('ui'); this.root = root;
    root.innerHTML = `
    <div id="hud" class="hidden">
      <div class="h-tl"><div class="h-level"></div><div class="h-obj"></div></div>
      <div class="h-tr"><div class="h-coins">🪙 <b>0</b></div><div class="h-fps"></div></div>
      <div class="h-bl"><div class="h-hp"><div class="h-hpbar"><i></i></div><span class="h-hptxt">100</span></div><div class="h-extra"></div></div>
      <div class="h-br"><div class="h-weapon"></div><div class="h-ammo"></div></div>
      <div class="h-boss hidden"><div class="h-bossname"></div><div class="h-bossbar"><i></i></div></div>
      <div class="h-cross"><i></i><i></i><i></i><i></i></div><div class="h-hit"></div>
      <div class="h-msg"></div><div class="h-sub"></div><div class="h-prompt"></div><div class="h-progress hidden"><i></i></div>
    </div>
    <div id="dmg"></div><div id="flash"></div><div id="scare"></div><div id="vig"></div>
    <div id="touch"></div>
    <div class="screen" id="s-title"><div class="t-wrap">
      <div class="brand">GUNVORA GAMES <span>presents</span></div>
      <h1 class="logo">${cfg.title}</h1><h2 class="logo2">${cfg.sub}</h2><div class="tagline">${cfg.tagline}</div>
      <div class="menu"><button data-go="play" class="big">▶ PLAY</button><button data-go="levels">LEVELS</button><button data-go="shop">SHOP</button><button data-go="settings">SETTINGS</button><button data-go="howto">HOW TO PLAY</button></div>
      <div class="t-stats"></div></div><div class="foot">© GUNVORA GAMES · ${cfg.levels} LEVELS · Free to play</div></div>
    <div class="screen hidden" id="s-levels"><div class="panel wide"><h3>SELECT LEVEL</h3><div class="lv-pages"></div><div class="lv-grid"></div><div class="row"><button data-go="title">◀ BACK</button></div></div></div>
    <div class="screen hidden" id="s-shop"><div class="panel"><h3>${cfg.shopName || 'SHOP'}</h3><div class="shop-coins"></div><div class="shop-list"></div><p class="note">In-game coins only — earn coins by playing levels.</p><div class="row"><button data-go="back">◀ BACK</button></div></div></div>
    <div class="screen hidden" id="s-settings"><div class="panel"><h3>SETTINGS</h3>
      <label>Graphics quality <select id="o-q"><option value="low">LOW (fast, mobile)</option><option value="high">HIGH (bloom, shadows)</option></select></label>
      <label>Look sensitivity <input id="o-sens" type="range" min="0.3" max="2.5" step="0.1"></label>
      <label>Volume <input id="o-vol" type="range" min="0" max="1" step="0.05"></label>
      <label>Show FPS <input id="o-fps" type="checkbox"></label>
      <div class="row"><button data-go="back">◀ BACK</button><button id="o-reset" class="danger">RESET PROGRESS</button></div></div></div>
    <div class="screen hidden" id="s-howto"><div class="panel"><h3>HOW TO PLAY</h3><div class="howto">${cfg.howto}</div><div class="row"><button data-go="title">◀ BACK</button></div></div></div>
    <div class="screen hidden dim" id="s-pause"><div class="panel"><h3>PAUSED</h3><div class="p-info"></div><div class="menu"><button data-go="resume" class="big">▶ RESUME</button><button data-go="restart">↻ RESTART LEVEL</button><button data-go="shop">SHOP</button><button data-go="settings">SETTINGS</button><button data-go="quit">✕ QUIT TO MENU</button></div></div></div>
    <div class="screen hidden dim" id="s-over"><div class="panel"><h3 class="bad">${cfg.loseTitle || 'YOU DIED'}</h3><div class="r-info"></div><div class="menu"><button data-go="restart" class="big">↻ TRY AGAIN</button><button data-go="shop">SHOP</button><button data-go="quit">MENU</button></div></div></div>
    <div class="screen hidden dim" id="s-win"><div class="panel"><h3 class="good">${cfg.winTitle || 'LEVEL CLEARED'}</h3><div class="stars"></div><div class="r-info"></div><div class="menu"><button data-go="next" class="big">NEXT LEVEL ▶</button><button data-go="shop">SHOP</button><button data-go="quit">MENU</button></div></div></div>
    <div class="screen hidden dim" id="s-final"><div class="panel"><h3 class="good">${cfg.finalTitle}</h3><div class="r-info">${cfg.finalText}</div><div class="menu"><button data-go="quit" class="big">MENU</button></div></div></div>
    <div class="screen hidden" id="s-load"><div class="loading"><div class="spin"></div><div class="l-txt">Loading…</div></div></div>`;
    this.hud = $('#hud'); this.stack = [];
    root.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; cfg.sound && cfg.sound.unlock(); cfg.sound && cfg.sound.click(); this.go(b.dataset.go); });
    const s = this.save.s; $('#o-q').value = s.quality; $('#o-sens').value = s.sens; $('#o-vol').value = s.vol; $('#o-fps').checked = s.fps;
    const upd = () => { s.quality = $('#o-q').value; s.sens = +$('#o-sens').value; s.vol = +$('#o-vol').value; s.fps = $('#o-fps').checked; this.save.write(); cfg.onSettings && cfg.onSettings(s); };
    ['#o-q', '#o-sens', '#o-vol', '#o-fps'].forEach(id => $(id).addEventListener('input', upd));
    $('#o-reset').addEventListener('click', () => { if (confirm('Reset all progress, coins and upgrades?')) { localStorage.removeItem(this.save.key); location.reload(); } });
    this.show('title');
  }
  show(id) { this.root.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== 's-' + id)); this.cur = id;
    if (id === 'title') this._title(); if (id === 'levels') { this.page = null; this._levels(); } if (id === 'shop') this._shop(); }
  go(a) {
    const c = this.cfg;
    if (a === 'play') return c.onStart(Math.min(this.save.d.unlocked, c.levels));
    if (a === 'back') { const p = this.stack.pop() || 'title'; return this.show(p); }
    if (a === 'shop' || a === 'settings') { this.stack.push(this.cur); return this.show(a); }
    if (a === 'resume') return c.onResume(); if (a === 'restart') return c.onStart(this.curLevel);
    if (a === 'next') return c.onStart(Math.min(this.curLevel + 1, c.levels));
    if (a === 'quit') { c.onQuit(); this.stack = []; return this.show('title'); }
    this.show(a);
  }
  _title() { const d = this.save.d; $('.t-stats', this.root).innerHTML = `Level <b>${Math.min(d.unlocked, this.cfg.levels)}</b> / ${this.cfg.levels} &nbsp;·&nbsp; 🪙 <b>${d.coins}</b>`; }
  _levels() {
    const N = this.cfg.levels, per = 50, pages = Math.ceil(N / per), d = this.save.d;
    if (this.page == null || this.page >= pages) this.page = Math.floor((Math.min(d.unlocked, N) - 1) / per);
    const pg = $('.lv-pages', this.root); pg.innerHTML = '';
    for (let p = 0; p < pages; p++) { const b = document.createElement('button'); b.textContent = `${p * per + 1}–${Math.min(N, (p + 1) * per)}`; b.className = p === this.page ? 'sel' : ''; b.onclick = () => { this.page = p; this._levels(); }; pg.appendChild(b); }
    const gr = $('.lv-grid', this.root); gr.innerHTML = '';
    for (let i = this.page * per + 1; i <= Math.min(N, (this.page + 1) * per); i++) {
      const b = document.createElement('button'); const locked = i > d.unlocked, boss = this.cfg.isBoss(i), st = d.stars[i] || 0;
      b.className = 'lv' + (locked ? ' locked' : '') + (boss ? ' boss' : '') + (i === d.unlocked ? ' cur' : '');
      b.innerHTML = `<span>${locked ? '🔒' : i}</span><small>${boss ? '💀' : '★'.repeat(st) || '·'}</small>`; b.title = this.cfg.levelName(i);
      if (!locked) b.onclick = () => { this.cfg.sound && this.cfg.sound.unlock(); this.cfg.onStart(i); };
      gr.appendChild(b);
    }
  }
  _shop() {
    const d = this.save.d; $('.shop-coins', this.root).innerHTML = `🪙 <b>${d.coins}</b> coins`;
    const L = $('.shop-list', this.root); L.innerHTML = '';
    this.cfg.upgrades.forEach(u => {
      const lv = this.save.lv(u.id), max = lv >= u.max, cost = u.cost(lv);
      const el = document.createElement('div'); el.className = 'shop-item';
      el.innerHTML = `<div class="si-ic">${u.icon}</div><div class="si-txt"><b>${u.name}</b><small>${u.desc}</small><div class="pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div></div>`;
      const b = document.createElement('button'); b.textContent = max ? 'MAX' : `🪙 ${cost}`; b.disabled = max || d.coins < cost;
      b.onclick = () => { if (d.coins >= cost && !max) { d.coins -= cost; d.upg[u.id] = lv + 1; this.save.write(); this.cfg.sound && this.cfg.sound.coin(); this._shop(); } };
      el.appendChild(b); L.appendChild(el);
    });
  }
  // ---- HUD helpers ----
  hudOn(v) { this.hud.classList.toggle('hidden', !v); }
  set(sel, html) { const e = $(sel, this.root); if (e && e._v !== html) { e._v = html; e.innerHTML = html; } }
  hp(f, val) { const e = $('.h-hpbar i', this.root); e.style.width = (Math.max(0, f) * 100) + '%'; e.style.background = f < 0.3 ? '#ff2a2a' : ''; this.set('.h-hptxt', Math.ceil(val)); }
  boss(name, f) { const b = $('.h-boss', this.root); if (name == null) { b.classList.add('hidden'); return; } b.classList.remove('hidden'); this.set('.h-bossname', name); $('.h-bossbar i', this.root).style.width = Math.max(0, f) * 100 + '%'; }
  progress(f) { const p = $('.h-progress', this.root); if (f == null) { p.classList.add('hidden'); return; } p.classList.remove('hidden'); p.firstChild.style.width = f * 100 + '%'; }
  msg(t, sub = '', dur = 2.5) { const m = $('.h-msg', this.root), s = $('.h-sub', this.root); m.innerHTML = t; s.innerHTML = sub; m.classList.remove('show'); s.classList.remove('show'); void m.offsetWidth; m.classList.add('show'); s.classList.add('show'); clearTimeout(this._mt); this._mt = setTimeout(() => { m.classList.remove('show'); s.classList.remove('show'); }, dur * 1000); }
  prompt(t) { this.set('.h-prompt', t || ''); }
  hitmark() { const h = $('.h-hit', this.root); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); }
  damage(a = 0.6) { const d = $('#dmg'); d.style.transition = 'none'; d.style.opacity = a; void d.offsetWidth; d.style.transition = 'opacity .6s'; d.style.opacity = 0; }
  flash(color = '#fff', a = 0.8, dur = 0.35) { const f = $('#flash'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = a; void f.offsetWidth; f.style.transition = `opacity ${dur}s`; f.style.opacity = 0; }
  scare(html, dur = 0.7) { const s = $('#scare'); s.innerHTML = html; s.classList.add('on'); clearTimeout(this._st); this._st = setTimeout(() => s.classList.remove('on'), dur * 1000); }
  lowHp(f) { $('#vig').style.opacity = f; }
  result(win, info, stars = 0) {
    const id = win ? 'win' : 'over'; this.show(id); $('#s-' + id + ' .r-info').innerHTML = info;
    if (win) $('#s-win .stars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('');
  }
}
