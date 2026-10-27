// ---------------------------------------------------------------- fullscreen + landscape on Android
async function goFullscreen() {
  if (!isTouchDev()) return; const el = document.documentElement;
  try { if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { }
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { }
}
// ---------------------------------------------------------------- main loop
let lastT = performance.now(), fpsAvg = 60, fpsLowT = 0, fpsHiT = 0, fpsN = 0, fpsAcc = 0, fpsLast = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const real = Math.max(0, (now - lastT) / 1000), dt = Math.min(0.05, real); lastT = now;
  pollGamepad();
  if (!renderer) return;
  const inRace = R && ['hud', 'pause', 'results'].includes(screenId);
  if (inRace) { if (screenId === 'hud' && !paused) updateRace(dt); renderRace(screenId === 'hud' && !paused ? dt : 0); if (screenId === 'hud') hud(); Sound.update(R.player, screenId === 'hud' && !paused && R.phase !== 'done', R.rain && screenId === 'hud'); }
  else if (screenId !== 'loading') { renderShowroom(dt, VIEW[screenId] || VIEW.home); Sound.update(null, false); }
  // adaptive quality: drop a level if the real frame rate stays low in a race
  fpsN++; fpsAcc += real; if (now - fpsLast > 1000) { fpsAvg = fpsN / Math.max(0.001, fpsAcc); fpsN = 0; fpsAcc = 0; fpsLast = now; if (window.__vqFps) window.__vqFps(fpsAvg); }
  // auto quality: first trim the render resolution a little, then drop a tier; resolution comes back when frames are smooth again
  if (inRace && screenId === 'hud' && settings.gfx === 'auto') {
    if (fpsAvg < 46) { fpsLowT += real; fpsHiT = 0;
      if (fpsLowT > 2.5) { fpsLowT = 0; if (prScale > 0.7) { prScale = Math.max(0.65, prScale - 0.12); resize3D(); } else if (autoQ !== 'low' && fpsAvg < 36) { autoQ = autoQ === 'high' ? 'medium' : 'low'; applyGfx(false); prScale = 0.85; resize3D(); toast(`Graphics lowered to ${autoQ} for a smoother frame rate`); } } }
    else if (fpsAvg > 57) { fpsLowT = 0; fpsHiT += real; if (fpsHiT > 6 && prScale < 1) { fpsHiT = 0; prScale = Math.min(1, prScale + 0.1); resize3D(); } }
    else { fpsLowT = 0; fpsHiT = 0; }
  } else fpsLowT = 0;
}
// ---------------------------------------------------------------- wiring
function wire() {
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { Sound.click(); const to = g.dataset.go; if (to === 'setup' || to === 'tt') { setupMode = to === 'tt' ? 'tt' : 'quick'; show('setup'); } else show(to); } });
  $('btnStart').addEventListener('click', () => { Sound.init(); goFullscreen(); const b = dailyLogin(); show('home'); if (b) setTimeout(() => toast(`Daily login bonus +◆ ${fmtCoins(b)}`, 'good'), 300); });
  $('scr-garage').addEventListener('click', onGarageClick);
  $('scr-showroom').addEventListener('click', e => { const c = e.target.closest('[data-show]'); if (c) { showCar = c.dataset.show; Sound.click(); renderShowroom2(); return; } const b = e.target.closest('#buyCar'); if (b) { const c2 = CAR(showCar); confirmBox(`Buy the ${c2.name} for ◆ ${fmtCoins(c2.price)}? You have ◆ ${fmtCoins(profile.coins)}.`, () => { buyCar(showCar); renderShowroom2(); renderCoins(); }, 'Buy'); } });
  $('scr-showroom').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.show) { e.preventDefault(); e.target.click(); } });
  $('scr-workshop').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.ws) { wsCar = b.dataset.ws; Sound.click(); renderWorkshop(); } if (b.dataset.up) { if (buyUpgrade(wsCar, b.dataset.up)) { renderWorkshop(); renderCoins(); } } });
  $('scr-setup').addEventListener('click', onSetupClick); $('setupGo').addEventListener('click', () => { Sound.init(); goFullscreen(); launchFromSetup(); });
  $('scr-career').addEventListener('click', e => { const c = e.target.closest('[data-champ]'); if (c) { careerSel = c.dataset.champ; Sound.click(); renderCareer(); return; } const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'champGo') { Sound.init(); goFullscreen(); startCareerRound(); } if (b.id === 'champReset') confirmBox('Restart this championship? Points and results for the season are cleared.', () => { delete profile.career[careerSel]; saveProfile(); renderCareer(); }, 'Restart'); });
  $('scr-settings').addEventListener('change', onSettingsInput); $('scr-settings').addEventListener('input', e => { if (e.target.type === 'range') onSettingsInput(e); }); $('scr-settings').addEventListener('click', onSettingsClick);
  $('pResume').onclick = () => togglePause(); $('pRestart').onclick = () => { paused = false; beginRace(lastCfg); }; $('pQuit').onclick = () => { paused = false; endRace3D(); R = null; show('home'); };
  $('pEnd').onclick = () => { paused = false; show('hud'); endTimeTrial(); }; $('pCal').onclick = () => { tiltCal = null; toast('Tilt centre reset'); };
  $('pCam').onclick = () => cycleCamera(); $('pLine').onclick = () => { settings.line = !settings.line; saveSettings(); updateLineVis(); toast(`Racing line ${settings.line ? 'on' : 'off'}`); };
  $('resNext').onclick = () => { const res = R && R.results; if (res && res.champ) { careerSel = res.champ.C.id; endRace3D(); R = null; show('career'); } else beginRace(lastCfg); };
  $('resHome').onclick = () => { endRace3D(); R = null; show('home'); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && screenId === 'hud' && R && R.phase !== 'done') togglePause(); });
  bindTouch();
}
function boot() {
  loadProfile(); applyBodyClasses(); wire();
  if (!init3D()) { $('noGL').hidden = false; return; }
  setShowroomCar(profile.car, liveryOf(profile.car));
  for (const c of CIRCUITS) trackFor(c.id);
  show('splash'); requestAnimationFrame(loop);
  // test / debug hooks (headless checks)
  window.__vq = {
    get R() { return R; }, profile: () => profile, settings, startRace: cfg => beginRace(cfg), show, buyCar, buyUpgrade,
    autopilot: on => { autopilot = on; }, sim: (sec) => { if (!R) return; const steps = Math.round(sec / H_STEP); for (let k = 0; k < steps && R && R.phase !== 'done'; k++) stepRace(H_STEP); },
    state: () => R && { phase: R.phase, t: R.t, lap: R.player.lap, pos: R.player.pos, speed: R.player.speed, prog: R.player.prog, laps: R.laps, off: R.player.off, results: R.results ? { pos: R.results.pos, total: R.results.total, lines: R.results.lines } : null },
    endTT: () => { if (R && R.tt) { show('hud'); endTimeTrial(); } }, quality: () => ({ q: qName, gpu: gpuName, soft: softGPU, pr: renderer.getPixelRatio(), prScale, aa: renderer.getContext().getContextAttributes().antialias }), fps: () => fpsAvg,
    get T() { return T; }, simFx: (sec, until) => { if (!R) return false; for (let k = 0; k < Math.round(sec / H_STEP); k++) { stepRace(H_STEP); if (!R || R.phase === 'done') return false; for (const c of R.cars) { placeCar3D(c.obj, c, H_STEP); carEffects(c, H_STEP); } updateParticles(H_STEP); updateCamera(R.player, H_STEP, settings.camera); if (until && until(R.player)) return true; } return false; }, bot: fn => { dbgBot = fn; }, touch: touchBtn, profileFor: (c, k) => k === "A" ? assistProfile(c.stats, Math.round(carMu(c, R.env) * 50) / 50) : speedProfile(c.stats, carMu(c, R.env), k || 0.82), cam: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z, fov: camera.fov, pr: renderer.getPixelRatio() }), teleport: (f, lat) => { if (!R) return; const P = R.player, i = mod(Math.floor(f * T.n), T.n), p = trackPoint(i, lat || 0, { x: 0, y: 0, z: 0 }); Object.assign(P, { x: p.x, z: p.z, y: p.y, h: T.H[i], i, vx: 0, vz: 0 }); cam.init = false; }
  };
}
boot();
})();
