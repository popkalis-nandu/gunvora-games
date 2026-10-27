// Procedural WebAudio sound engine (no audio files) - GUNVORA GAMES
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.8; this.loops = []; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol;
    const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    // reverb send
    this.verb = this.ctx.createConvolver(); this.verb.buffer = this._impulse(2.6, 2.2);
    this.verbGain = this.ctx.createGain(); this.verbGain.gain.value = 0.35;
    this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
    const len = this.ctx.sampleRate * 2; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  _impulse(sec, decay) {
    const r = this.ctx.sampleRate, len = r * sec, b = this.ctx.createBuffer(2, len, r);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  get ok() { return !!this.ctx && this.ctx.state !== 'closed'; }
  _out(node, wet = 0.2) { node.connect(this.master); if (wet > 0) { const g = this.ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(this.verb); } }
  tone(f, dur, { type = 'sine', vol = 0.3, to = null, delay = 0, attack = 0.005, wet = 0.2, pan = 0 } = {}) {
    if (!this.ok) return; const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = g; if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); n = p; }
    o.connect(g); this._out(n, wet); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { vol = 0.3, type = 'lowpass', f = 1000, to = null, q = 1, delay = 0, attack = 0.002, wet = 0.2 } = {}) {
    if (!this.ok) return; const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (to) fl.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); this._out(g, wet); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  shot(kind = 'pistol') {
    if (kind === 'shotgun') { this.noise(0.5, { vol: 0.9, f: 2500, to: 200 }); this.tone(70, 0.3, { vol: 0.7, to: 35 }); }
    else if (kind === 'rifle') { this.noise(0.18, { vol: 0.6, f: 4000, to: 600 }); this.tone(110, 0.12, { vol: 0.5, to: 50 }); }
    else if (kind === 'holy') { this.tone(880, 0.35, { type: 'triangle', vol: 0.18, to: 1320, wet: 0.5 }); this.tone(440, 0.4, { type: 'sine', vol: 0.15, to: 660, wet: 0.5 }); this.noise(0.15, { vol: 0.12, type: 'highpass', f: 3000 }); }
    else { this.noise(0.25, { vol: 0.7, f: 3000, to: 400 }); this.tone(90, 0.15, { vol: 0.55, to: 40 }); }
  }
  click() { this.tone(1800, 0.03, { type: 'square', vol: 0.08, wet: 0 }); }
  reload() { this.tone(600, 0.05, { type: 'square', vol: 0.1, wet: 0 }); this.tone(400, 0.06, { type: 'square', vol: 0.1, delay: 0.25, wet: 0 }); this.noise(0.08, { vol: 0.2, type: 'bandpass', f: 2000, delay: 0.5 }); }
  hit() { this.noise(0.12, { vol: 0.35, type: 'bandpass', f: 600, q: 2 }); this.tone(150, 0.1, { type: 'sawtooth', vol: 0.15, to: 60 }); }
  hurt() { this.tone(220, 0.25, { type: 'sawtooth', vol: 0.25, to: 120 }); this.noise(0.2, { vol: 0.2, f: 800 }); }
  growl(pan = 0) {
    if (!this.ok) return; const t = this.ctx.currentTime, d = 0.6 + Math.random() * 0.6;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; const f0 = 60 + Math.random() * 50; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 0.7, t + d);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 18 + Math.random() * 14; const lg = this.ctx.createGain(); lg.gain.value = 0.5;
    const am = this.ctx.createGain(); am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 700; fl.Q.value = 6;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let n = g; if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); n = p; }
    o.connect(am); am.connect(fl); fl.connect(g); this._out(n, 0.3); o.start(t); lfo.start(t); o.stop(t + d + 0.1); lfo.stop(t + d + 0.1);
  }
  scream(big = 1) {
    if (!this.ok) return; const t = this.ctx.currentTime, d = 1.2 * big;
    for (let i = 0; i < 4; i++) {
      const o = this.ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'square'; const f = 500 + i * 37 + Math.random() * 40;
      o.frequency.setValueAtTime(f * 0.6, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.15); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + d);
      const v = this.ctx.createOscillator(); v.frequency.value = 7 + i; const vg = this.ctx.createGain(); vg.gain.value = 30; v.connect(vg); vg.connect(o.frequency);
      const fl = this.ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1400; fl.Q.value = 1.5;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(fl); fl.connect(g); this._out(g, 0.5); o.start(t); v.start(t); o.stop(t + d + 0.1); v.stop(t + d + 0.1);
    }
    this.noise(d, { vol: 0.25, type: 'bandpass', f: 2500, q: 0.8, wet: 0.5 });
  }
  sting() { [55, 58.3, 82.4, 116.5, 123.5].forEach((f, i) => this.tone(f * 2, 2.5, { type: 'sawtooth', vol: 0.12, attack: 0.01, wet: 0.6, to: f * 1.9 })); this.noise(0.6, { vol: 0.5, f: 300 }); }
  whisper(pan = 0) { for (let i = 0; i < 5; i++) this.noise(0.25 + Math.random() * 0.3, { vol: 0.07, type: 'bandpass', f: 2500 + Math.random() * 3000, q: 4, delay: i * 0.18 + Math.random() * 0.1, attack: 0.06, wet: 0.7 }); }
  heartbeat(vol = 0.5) { this.tone(55, 0.18, { vol, to: 35, wet: 0 }); this.tone(50, 0.2, { vol: vol * 0.8, to: 30, delay: 0.22, wet: 0 }); }
  bell() { [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(330 * m, 3 / (i + 1), { vol: 0.15 / (i + 1), wet: 0.7 })); }
  pickup() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.15, delay: i * 0.07, wet: 0.3 })); }
  coin() { this.tone(1200, 0.1, { type: 'square', vol: 0.06, wet: 0.1 }); this.tone(1800, 0.2, { type: 'square', vol: 0.06, delay: 0.07, wet: 0.1 }); }
  glass() { this.noise(0.5, { vol: 0.5, type: 'highpass', f: 3000, wet: 0.3 }); for (let i = 0; i < 8; i++) this.tone(2500 + Math.random() * 4000, 0.15 + Math.random() * 0.3, { vol: 0.05, delay: Math.random() * 0.3, wet: 0.3 }); }
  explosion() { this.noise(1.6, { vol: 1, f: 1500, to: 60, wet: 0.5 }); this.tone(55, 1.2, { vol: 0.8, to: 25 }); }
  thunder() { this.noise(3, { vol: 0.6, f: 500, to: 80, attack: 0.05, wet: 0.6 }); }
  powerdown() { this.tone(240, 1.2, { type: 'sawtooth', vol: 0.15, to: 30 }); this.noise(0.3, { vol: 0.3, type: 'bandpass', f: 1000, q: 3 }); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.18, delay: i * 0.13, wet: 0.5 })); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.6, { type: 'sawtooth', vol: 0.1, delay: i * 0.2, wet: 0.5 })); }
  // ambient loops; returns handle with stop()
  ambient(kind = 'night') {
    if (!this.ok) return null; const ctx = this.ctx, t = ctx.currentTime, nodes = [], out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(1, t + 2); this._out(out, 0.4);
    const osc = (f, type, v) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(out); o.start(); nodes.push(o); return { o, g }; };
    const noise = (type, f, v, q = 1) => { const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(out); s.start(); nodes.push(s); return { s, fl, g }; };
    const lfo = (target, rate, depth) => { const l = ctx.createOscillator(); l.frequency.value = rate; const g = ctx.createGain(); g.gain.value = depth; l.connect(g); g.connect(target); l.start(); nodes.push(l); };
    let timer = null;
    if (kind === 'night') {
      osc(55, 'sine', 0.12); osc(55.7, 'sine', 0.1); const d = osc(82.4, 'triangle', 0.03); lfo(d.g.gain, 0.07, 0.03);
      const w = noise('bandpass', 400, 0.12, 0.7); lfo(w.fl.frequency, 0.1, 250); lfo(w.g.gain, 0.13, 0.08);
      timer = setInterval(() => { const r = Math.random(); if (r < 0.25) this.whisper(Math.random() * 2 - 1); else if (r < 0.4) this.bell(); else if (r < 0.5) this.tone(1800 + Math.random() * 400, 0.08, { vol: 0.03, delay: 0 }); }, 4000);
    } else if (kind === 'train') {
      const r = noise('lowpass', 140, 0.5, 0.8); lfo(r.g.gain, 0.4, 0.12); noise('bandpass', 900, 0.05, 0.5); osc(41, 'sawtooth', 0.04);
      const clack = () => { this.noise(0.08, { vol: 0.25, type: 'bandpass', f: 300, q: 2, wet: 0.05 }); this.noise(0.08, { vol: 0.2, type: 'bandpass', f: 260, q: 2, delay: 0.14, wet: 0.05 }); };
      timer = setInterval(() => { clack(); setTimeout(clack, 520); }, 1600);
    }
    return { stop: () => { const n = ctx.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0.0001, n + 0.6); clearInterval(timer); setTimeout(() => nodes.forEach(x => { try { x.stop(); } catch (e) {} }), 800); } };
  }
}
