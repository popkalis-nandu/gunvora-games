// Procedural WebAudio sound engine for Nightmare House
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.8; this.amb = null; this.heartT = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol;
    this.comp = this.ctx.createDynamicsCompressor();
    this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
    // simple feedback-delay "reverb" send
    this.rev = this.ctx.createGain(); this.rev.gain.value = 0.35;
    const d1 = this.ctx.createDelay(1), d2 = this.ctx.createDelay(1), fb = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
    d1.delayTime.value = 0.13; d2.delayTime.value = 0.29; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.rev.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(this.master);
    const len = this.ctx.sampleRate * 2; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  get t() { return this.ctx.currentTime; }
  noise(dur, { type = 'lowpass', f = 1000, f2 = null, q = 1, g = 0.5, att = 0.005, rel = null, rev = 0.2, delay = 0 } = {}) {
    if (!this.ctx) return; const t = this.t + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const gn = this.ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + att);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + (rel || dur));
    s.connect(fl); fl.connect(gn); gn.connect(this.master); if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; gn.connect(r); r.connect(this.rev); }
    s.start(t, Math.random() * 1.5); s.stop(t + (rel || dur) + 0.05);
  }
  tone(dur, { type = 'sine', f = 440, f2 = null, g = 0.3, att = 0.01, vib = 0, vibF = 6, rev = 0.3, delay = 0, filt = null, detune = 0 } = {}) {
    if (!this.ctx) return; const t = this.t + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    if (vib) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = vibF; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const gn = this.ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + att); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o; if (filt) { const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filt; fl.Q.value = 4; o.connect(fl); node = fl; }
    node.connect(gn); gn.connect(this.master); if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; gn.connect(r); r.connect(this.rev); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  shot() { this.noise(0.35, { f: 3500, f2: 300, g: 0.9, rel: 0.35, rev: 0.5 }); this.tone(0.25, { type: 'sine', f: 140, f2: 40, g: 0.8, rev: 0.2 }); }
  click() { this.noise(0.05, { type: 'highpass', f: 3000, g: 0.25, rev: 0 }); }
  reload() { this.noise(0.06, { type: 'bandpass', f: 2500, q: 6, g: 0.35 }); this.noise(0.06, { type: 'bandpass', f: 1800, q: 6, g: 0.35, delay: 0.35 }); this.noise(0.08, { type: 'bandpass', f: 3200, q: 4, g: 0.4, delay: 0.75 }); }
  step(run) { this.noise(0.09, { f: run ? 500 : 380, g: run ? 0.16 : 0.1, rev: 0.05 }); }
  groan(pan = 0) { const f = 70 + Math.random() * 50; this.tone(1.1, { type: 'sawtooth', f, f2: f * 0.7, g: 0.22, vib: 6, vibF: 5 + Math.random() * 4, filt: 420 + Math.random() * 300, att: 0.15, rev: 0.4 }); }
  zombieHit() { this.noise(0.18, { type: 'bandpass', f: 600, q: 2, g: 0.6, rev: 0.1 }); this.tone(0.3, { type: 'sawtooth', f: 160, f2: 60, g: 0.25, filt: 600 }); }
  zombieDie() { this.tone(1.3, { type: 'sawtooth', f: 120, f2: 35, g: 0.35, vib: 10, vibF: 9, filt: 500, rev: 0.5 }); this.noise(0.5, { f: 400, g: 0.4, delay: 0.5 }); }
  claw() { this.noise(0.2, { type: 'highpass', f: 1500, f2: 4000, g: 0.5 }); this.tone(0.25, { type: 'square', f: 90, f2: 50, g: 0.2, filt: 400 }); }
  wail() { const f = 500 + Math.random() * 300; this.tone(2.2, { f, f2: f * 0.55, g: 0.18, vib: 30, vibF: 4, att: 0.5, rev: 0.9 }); this.tone(2.2, { f: f * 1.5, f2: f * 0.8, g: 0.07, vib: 25, vibF: 5, att: 0.6, rev: 0.9 }); }
  whisper() { for (let i = 0; i < 5; i++) this.noise(0.25 + Math.random() * 0.3, { type: 'bandpass', f: 2000 + Math.random() * 3000, q: 8, g: 0.12, att: 0.08, delay: i * 0.22 + Math.random() * 0.1, rev: 0.8 }); }
  scream() {
    this.noise(1.2, { type: 'bandpass', f: 1800, f2: 900, q: 3, g: 0.9, att: 0.01, rev: 0.6 });
    for (let i = 0; i < 4; i++) this.tone(1.0, { type: 'sawtooth', f: 900 + i * 37, f2: 400, g: 0.16, vib: 60, vibF: 11 + i, rev: 0.6, filt: 3500 });
    this.tone(0.6, { type: 'sine', f: 60, f2: 30, g: 0.9 });
  }
  stinger() { [0, 1, 2].forEach(i => this.tone(1.6, { type: 'sawtooth', f: 220 * Math.pow(1.06, i * 1.1), g: 0.12, filt: 1200, rev: 0.7, att: 0.02 })); this.tone(1.2, { f: 45, f2: 30, g: 0.8 }); }
  pickup() { [0, 1, 2].forEach(i => this.tone(0.5, { type: 'triangle', f: [660, 880, 1320][i], g: 0.22, delay: i * 0.07, rev: 0.6 })); }
  coin() { this.tone(0.2, { type: 'square', f: 1300, g: 0.08, filt: 4000 }); this.tone(0.3, { type: 'square', f: 1950, g: 0.08, delay: 0.06, filt: 4000 }); }
  creak() { this.tone(1.0, { type: 'sawtooth', f: 90, f2: 160, g: 0.15, vib: 15, vibF: 23, filt: 900, rev: 0.6 }); }
  slam() { this.noise(0.6, { f: 800, f2: 100, g: 1.0, rev: 0.8 }); this.tone(0.4, { f: 70, f2: 35, g: 0.9 }); }
  lantern() { this.tone(1.0, { type: 'sine', f: 300, f2: 1600, g: 0.3, rev: 0.8 }); this.noise(0.8, { type: 'highpass', f: 2000, f2: 8000, g: 0.3, rev: 0.8 }); }
  banish() { this.tone(0.9, { type: 'triangle', f: 1200, f2: 200, g: 0.25, vib: 40, vibF: 15, rev: 0.9 }); }
  hurt() { this.tone(0.35, { type: 'sawtooth', f: 200, f2: 90, g: 0.3, filt: 800 }); this.noise(0.15, { f: 900, g: 0.4 }); }
  heartbeat(intensity) { this.tone(0.18, { f: 55, f2: 40, g: 0.35 * intensity, rev: 0 }); this.tone(0.18, { f: 50, f2: 38, g: 0.28 * intensity, delay: 0.22, rev: 0 }); }
  orb() { this.tone(0.8, { type: 'sine', f: 180, f2: 500, g: 0.2, vib: 40, vibF: 18, rev: 0.6 }); }
  boom() { this.noise(1.4, { f: 1200, f2: 60, g: 1.0, rev: 0.9 }); this.tone(1.0, { f: 50, f2: 25, g: 1.0 }); }
  bossRoar() { this.tone(2.0, { type: 'sawtooth', f: 80, f2: 45, g: 0.5, vib: 12, vibF: 7, filt: 700, att: 0.2, rev: 0.9 }); this.tone(2.0, { type: 'sawtooth', f: 121, f2: 60, g: 0.3, vib: 10, vibF: 6, filt: 900, att: 0.2, rev: 0.9 }); this.noise(1.8, { type: 'bandpass', f: 500, q: 1, g: 0.4, att: 0.3, rev: 0.9 }); }
  unlock() { this.tone(1.5, { type: 'triangle', f: 392, g: 0.2, rev: 0.8 }); this.tone(1.5, { type: 'triangle', f: 494, g: 0.18, delay: 0.15, rev: 0.8 }); this.tone(2.0, { type: 'triangle', f: 587, g: 0.18, delay: 0.3, rev: 0.8 }); this.creak(); }
  victory() { [523, 659, 784, 1046].forEach((f, i) => this.tone(1.6, { type: 'triangle', f, g: 0.18, delay: i * 0.12, rev: 0.8 })); }
  startAmbience() {
    if (!this.ctx || this.amb) return; const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0.0001; g.connect(this.master); g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 3);
    const oscs = [];
    [41.2, 41.7, 61.7, 82.6].forEach((f, i) => { const o = c.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'sine'; o.frequency.value = f; const og = c.createGain(); og.gain.value = i < 2 ? 0.05 : 0.08; const lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 220; o.connect(lf); lf.connect(og); og.connect(g); o.start(); oscs.push(o); });
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 0.7;
    const ng = c.createGain(); ng.gain.value = 0.12; n.connect(nf); nf.connect(ng); ng.connect(g); n.start();
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(nf.frequency); lfo.start();
    this.amb = { g, oscs, n, lfo };
  }
  ambienceLevel(v) { if (this.amb) this.amb.g.gain.setTargetAtTime(Math.max(0.0001, v), this.ctx.currentTime, 0.5); }
}
