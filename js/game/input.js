import { cvs, view } from "../canvas.js";
import { RH } from "../config.js";
import { players, game, playing } from "./state.js";
import { clampHalf } from "./physics.js";
import { ensureAudio } from "../audio.js";

function toWorld(e) {
  const r = cvs.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / view.scale,
    y: (e.clientY - r.top) / view.scale,
  };
}

// target = finger position, shifted so the skater sits in front of your finger
function aim(i, w) {
  // Red's finger is below, Blue's is "below" from their side
  const offset = i === 0 ? -30 : 30;
  [players[i].tx, players[i].ty] = clampHalf(i, w.x, w.y + offset);
}

function onDown(e) {
  if (!playing()) return;
  e.preventDefault();
  ensureAudio();
  const w = toWorld(e);
  const i = game.role === "cpu" ? 0 : w.y > RH / 2 ? 0 : 1;
  const p = players[i];
  if (p.ptr !== null && p.ptr !== e.pointerId) return; // that player already has a finger down

  p.ptr = e.pointerId;
  aim(i, w);
  cvs.setPointerCapture(e.pointerId); // keep getting this finger's events even off-canvas
}

function onMove(e) {
  const i = players.findIndex((p) => p.ptr === e.pointerId);
  if (i >= 0) aim(i, toWorld(e)); // follow the finger that owns this skater
}

function onUp(e) {
  players.forEach((p) => {
    if (p.ptr === e.pointerId) p.ptr = null;
  });
}

export function initInput() {
  cvs.addEventListener("pointerdown", onDown);
  cvs.addEventListener("pointermove", onMove);
  cvs.addEventListener("pointerup", onUp);
  cvs.addEventListener("pointercancel", onUp); // e.g. a phone call interrupts the touch
}
