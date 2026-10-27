(() => {
// ---------------------------------------------------------------- helpers
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const smooth = t => t * t * (3 - 2 * t);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmtLap = s => { if (!isFinite(s) || s <= 0) return '--:--.---'; const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(3)}`; };
const fmtDelta = d => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(3);
const fmtCoins = n => Math.round(n).toLocaleString('en-US');
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isTouchDev = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }

// ---------------------------------------------------------------- settings (device-local)
const prefersRM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SET_KEY = 'vyroniq-settings-v1';
const defaults = {
  gfx: 'auto', sound: true, volume: 0.8, music: false,
  hc: false, cb: false, rm: prefersRM, announce: true, sens: 1, tilt: false, btnSize: 'm', leftHanded: false, touch: 'auto',
  tc: true, abs: true, line: true, autoGear: true, steerAssist: true, driftTap: true, autoLaunch: false, camera: 'chase', units: 'kmh'
};
let settings = Object.assign({}, defaults);
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { }
const saveSettings = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { } };
