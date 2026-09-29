import { cvs, view } from "../canvas.js";
import { RW, RH } from "../config.js";
import { players, game, playing, myIndex, flipped } from "./state.js";
import { clampHalf } from "./physics.js";
import { ensureAudio } from "../audio.js";

// screen pixels → view units (not yet flipped for the guest)
function toView(e) {
  const r = cvs.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / view.scale,
    y: (e.clientY - r.top) / view.scale,
  };
}

function aim(i, v) {
  let x = v.x,
    y = v.y;
  if (game.role === "local") {
    y += i === 0 ? -30 : 30; // Blue sits across the table
  } else {
    y -= 30; // "up" on my own screen
    if (flipped()) {
      x = RW - x;
      y = RH - y;
    } // guest: screen → world
  }
  [players[i].tx, players[i].ty] = clampHalf(i, x, y);
}

function onDown(e) {
  if (!playing()) return;
  e.preventDefault();
  ensureAudio();

  const v = toView(e);
  const i = game.role === "local" ? (v.y > RH / 2 ? 0 : 1) : myIndex();
  const p = players[i];
  if (p.ptr !== null && p.ptr !== e.pointerId) return;

  p.ptr = e.pointerId;
  aim(i, v);
  try {
    cvs.setPointerCapture(e.pointerId);
  } catch (err) {}
}

function onMove(e) {
  const i = players.findIndex((p) => p.ptr === e.pointerId);
  if (i >= 0) aim(i, toView(e));
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
  cvs.addEventListener("pointercancel", onUp);
}
