let ac = null,
  lastClack = 0;

// browsers only allow audio after a user gesture, so call this on the first touch
export function ensureAudio() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
  } catch (e) {
    /* no audio available, game still works */
  }
}

// short "tock": louder and higher for harder hits
export function clack(strength) {
  if (!ac) return;
  const now = ac.currentTime;
  if (now - lastClack < 0.05) return; // don't stack sounds in the same instant
  lastClack = now;

  const o = ac.createOscillator(),
    g = ac.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(700 + Math.min(strength, 1500) * 0.4, now);
  o.frequency.exponentialRampToValueAtTime(180, now + 0.06); // pitch drops fast
  g.gain.setValueAtTime(Math.max(0.03, Math.min(0.3, strength / 2500)), now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.09); // fades out fast
  o.connect(g).connect(ac.destination);
  o.start(now);
  o.stop(now + 0.1);
}

// arena goal horn: two buzzy notes together
export function horn() {
  if (!ac) return;
  const now = ac.currentTime;
  [196, 247].forEach((f) => {
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.05);
    g.gain.setValueAtTime(0.09, now + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    o.connect(g).connect(ac.destination);
    o.start(now);
    o.stop(now + 1);
  });
}
