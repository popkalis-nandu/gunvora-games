// ---------------------------------------------------------------- WebAudio engine synthesis (no samples)
const Sound = {
  ac: null, on: true,
  init() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } this.build(); }
    if (this.ac.state !== 'running') this.ac.resume().catch(() => {});
  },
  build() {
    const ac = this.ac; this.master = ac.createGain(); this.master.gain.value = settings.sound ? settings.volume : 0; this.master.connect(ac.destination);
    // engine: two detuned saws + a sub square through a waveshaper and a lowpass
    this.eng = ac.createGain(); this.eng.gain.value = 0; this.lp = ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 900; this.lp.Q.value = 3;
    const shaper = ac.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.4); } shaper.curve = curve;
    this.o1 = ac.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = ac.createOscillator(); this.o2.type = 'sawtooth'; this.o3 = ac.createOscillator(); this.o3.type = 'square';
    const g3 = ac.createGain(); g3.gain.value = 0.5;
    this.o1.connect(shaper); this.o2.connect(shaper); this.o3.connect(g3); g3.connect(shaper); shaper.connect(this.lp); this.lp.connect(this.eng); this.eng.connect(this.master);
    [this.o1, this.o2, this.o3].forEach(o => { o.frequency.value = 100; o.start(); });
    // noise for wind, tyre squeal and rain
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const mkNoise = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(); return g; };
    this.wind = mkNoise('lowpass', 700, 0.5); this.squeal = mkNoise('bandpass', 2400, 8); this.rain = mkNoise('highpass', 3000, 0.3);
  },
  enable(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? settings.volume : 0, this.ac.currentTime, 0.05); },
  update(car, active, rainOn) {
    if (!this.ac || this.ac.state !== 'running') return;
    const t = this.ac.currentTime, k = 0.04;
    if (!active || !car) { this.eng.gain.setTargetAtTime(0, t, 0.1); this.wind.gain.setTargetAtTime(0, t, 0.1); this.squeal.gain.setTargetAtTime(0, t, 0.05); this.rain.gain.setTargetAtTime(0, t, 0.2); return; }
    const f = car.rpm / 60 * 3;
    this.o1.frequency.setTargetAtTime(f, t, k); this.o2.frequency.setTargetAtTime(f * 1.007, t, k); this.o3.frequency.setTargetAtTime(f / 2, t, k);
    this.lp.frequency.setTargetAtTime(700 + car.input.throttle * 2600 + (car.boostT > 0 ? 1200 : 0), t, k);
    this.eng.gain.setTargetAtTime(0.05 + car.input.throttle * 0.09, t, k);
    this.wind.gain.setTargetAtTime(clamp((car.speed || 0) / 90, 0, 1) * 0.12, t, 0.2);
    const sq = (car.lock ? 0.8 : 0) + (car.spin ? 0.6 : 0) + clamp((Math.abs(car.vLat) - 1.2) / 4, 0, 0.7);
    this.squeal.gain.setTargetAtTime(car.off ? 0 : sq * 0.06, t, 0.05); this.rain.gain.setTargetAtTime(rainOn ? 0.035 : 0, t, 0.3);
  },
  tone(f, d, type = 'sine', g = 0.2, f2) { if (!this.ac || !this.on) return; const t = this.ac.currentTime, o = this.ac.createOscillator(), gn = this.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t + d + 0.05); },
  beep(hi) { this.tone(hi ? 1180 : 620, hi ? 0.5 : 0.18, 'square', 0.12); },
  boost() { this.tone(220, 0.6, 'sawtooth', 0.12, 880); },
  hit(s) { this.tone(90, 0.25, 'triangle', clamp(s / 10, 0.1, 0.5), 40); },
  pit() { this.tone(880, 0.12, 'sine', 0.15); setTimeout(() => this.tone(1320, 0.12, 'sine', 0.15), 140); },
  coin() { this.tone(1320, 0.12, 'triangle', 0.15); setTimeout(() => this.tone(1760, 0.2, 'triangle', 0.15), 110); },
  click() { this.tone(660, 0.05, 'sine', 0.05); }
};
