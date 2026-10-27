// Unified keyboard/mouse (pointer lock) + mobile touch input
export const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
const KEYMAP = { KeyR: 'reload', KeyE: 'action', KeyF: 'action', KeyQ: 'special', Escape: 'pause', KeyP: 'pause', Digit1: 'w1', Digit2: 'w2', Digit3: 'w3', Space: 'jump', KeyX: 'weapon' };
export class Input {
  constructor(canvas, touchRoot) {
    this.canvas = canvas; this.keys = new Set(); this.down = new Set(); this.pressed = new Set();
    this.lookX = 0; this.lookY = 0; this.joy = { x: 0, y: 0 }; this.sens = 1; this.enabled = false; this.locked = false; this.onUnlock = null; this.sprintToggle = false;
    addEventListener('keydown', e => {
      if (e.repeat) return; this.keys.add(e.code); const a = KEYMAP[e.code]; if (a) { this.pressed.add(a); this.down.add(a); }
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && this.enabled) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys.delete(e.code); const a = KEYMAP[e.code]; if (a) this.down.delete(a); });
    addEventListener('blur', () => { this.keys.clear(); this.down.clear(); });
    canvas.addEventListener('mousedown', e => {
      if (IS_TOUCH || !this.enabled) return;
      if (!this.locked && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) {} }
      if (e.button === 0) this.down.add('fire'); if (e.button === 2) this.pressed.add('special');
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.down.delete('fire'); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (this.locked && this.enabled) { this.lookX += e.movementX * 0.0022 * this.sens; this.lookY += e.movementY * 0.0022 * this.sens; } });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked; this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && this.onUnlock) this.onUnlock();
    });
    if (touchRoot) this._buildTouch(touchRoot);
  }
  _buildTouch(root) {
    root.innerHTML = `<div class="t-joyzone"><div class="t-joy"><div class="t-knob"></div></div></div><div class="t-lookzone"></div>
      <div class="t-btn t-fire" data-a="fire">🔥</div><div class="t-btn t-reload" data-a="reload">⟳</div><div class="t-btn t-action" data-a="action">✋</div>
      <div class="t-btn t-special" data-a="special">✦</div><div class="t-btn t-sprint" data-a="sprint">»</div><div class="t-btn t-weapon" data-a="weapon">⇄</div><div class="t-btn t-pause" data-a="pause">❚❚</div>`;
    this.touchRoot = root;
    const jz = root.querySelector('.t-joyzone'), joy = root.querySelector('.t-joy'), knob = root.querySelector('.t-knob'), lz = root.querySelector('.t-lookzone');
    let jid = null, jx = 0, jy = 0; const R = 55;
    jz.addEventListener('pointerdown', e => { e.preventDefault(); jid = e.pointerId; jz.setPointerCapture(jid); jx = e.clientX; jy = e.clientY; joy.style.left = (jx - 65) + 'px'; joy.style.top = (jy - 65) + 'px'; joy.classList.add('on'); });
    jz.addEventListener('pointermove', e => { if (e.pointerId !== jid) return; let dx = e.clientX - jx, dy = e.clientY - jy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy.x = dx / R; this.joy.y = dy / R; });
    const jend = e => { if (e.pointerId !== jid) return; jid = null; this.joy.x = this.joy.y = 0; knob.style.transform = ''; joy.classList.remove('on'); };
    jz.addEventListener('pointerup', jend); jz.addEventListener('pointercancel', jend);
    const looks = new Map();
    lz.addEventListener('pointerdown', e => { e.preventDefault(); lz.setPointerCapture(e.pointerId); looks.set(e.pointerId, [e.clientX, e.clientY]); });
    lz.addEventListener('pointermove', e => { const p = looks.get(e.pointerId); if (!p) return; this.lookX += (e.clientX - p[0]) * 0.006 * this.sens; this.lookY += (e.clientY - p[1]) * 0.006 * this.sens; p[0] = e.clientX; p[1] = e.clientY; });
    const lend = e => looks.delete(e.pointerId); lz.addEventListener('pointerup', lend); lz.addEventListener('pointercancel', lend);
    root.querySelectorAll('.t-btn').forEach(b => {
      const a = b.dataset.a; let bid = null, last = null;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); bid = e.pointerId; b.setPointerCapture(bid); b.classList.add('on'); last = [e.clientX, e.clientY];
        if (a === 'sprint') { this.sprintToggle = !this.sprintToggle; b.classList.toggle('lock', this.sprintToggle); } else { this.down.add(a); this.pressed.add(a); } });
      // fire button also allows looking while dragging
      b.addEventListener('pointermove', e => { if (e.pointerId !== bid || a !== 'fire' || !last) return; this.lookX += (e.clientX - last[0]) * 0.006 * this.sens; this.lookY += (e.clientY - last[1]) * 0.006 * this.sens; last = [e.clientX, e.clientY]; });
      const up = e => { if (e.pointerId !== bid) return; bid = null; b.classList.remove('on'); if (a !== 'sprint') this.down.delete(a); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
  }
  showTouch(v) { if (this.touchRoot) this.touchRoot.style.display = v && IS_TOUCH ? 'block' : 'none'; }
  move() {
    let x = this.joy.x, y = this.joy.y; const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1; if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1; if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
  }
  sprint() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.sprintToggle; }
  isDown(a) { return this.down.has(a); }
  wasPressed(a) { if (this.pressed.has(a)) { this.pressed.delete(a); return true; } return false; }
  consumeLook() { const r = [this.lookX, this.lookY]; this.lookX = this.lookY = 0; return r; }
  clear() { this.pressed.clear(); this.down.delete('fire'); this.lookX = this.lookY = 0; }
  unlock() { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }
}
