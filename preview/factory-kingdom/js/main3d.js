/* Boots the three.js renderer and hands it to the game. Falls back to 2D on any failure. */
import { boot } from './scene3d.js';
const bar = document.getElementById('ldBar'), pct = document.getElementById('ldPct');
const I = window.FK_INT;
let settled = false;
function fallback(err) {
  if (settled) return; settled = true;
  console.warn('3D renderer unavailable, using 2D view:', err && err.message ? err.message : err);
  I.attach(null); const l = document.getElementById('loader'); if (l) l.remove();
}
const guard = setTimeout(() => fallback(new Error('load timeout')), 60000);
boot(I, (p) => { const v = Math.round(p * 100); if (bar) bar.style.width = v + '%'; if (pct) pct.textContent = v + '%'; })
  .then((api) => {
    if (settled) return; settled = true; clearTimeout(guard);
    window.FK_R3 = api; I.attach(api);
    const l = document.getElementById('loader'); if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 450); }
  })
  .catch((err) => { clearTimeout(guard); fallback(err); });
