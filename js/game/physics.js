import {
  RW,
  RH,
  PR,
  GL,
  GR,
  SR,
  SKATE_PULL,
  MAX_SKATE,
  GRIP,
  GLIDE,
  UPDATE_SUBSTEPS,
} from "../config.js";
import { puck, trail, game, players } from "./state.js";
import { scored, tickGoal } from "./rules.js";
import { clack } from "../audio.js";

const FRICTION = 0.62;
const BOUNCE = 0.88; // keep 88% of speed when hitting the boards
const MAX_SPEED = 1500;

function stepPuck(dt) {
  const f = Math.pow(FRICTION, dt);
  puck.vx *= f;
  puck.vy *= f;

  const sp = Math.hypot(puck.vx, puck.vy); // speed = length of velocity
  if (sp > MAX_SPEED) {
    puck.vx *= MAX_SPEED / sp;
    puck.vy *= MAX_SPEED / sp;
  }

  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
}

export function bouncePuck(cx, cy, r, vx, vy, bounceSpeed) {
  const dx = puck.x - cx;
  const dy = puck.y - cy;
  const d = Math.hypot(dx, dy);
  const min = r + PR;
  if (d >= min || d === 0) return false;

  const nx = dx / d;
  const ny = dy / d;

  // move the puck out of the circle
  puck.x = cx + nx * min;
  puck.y = cy + ny * min;

  const rvx = puck.vx - vx;
  const rvy = puck.vy - vy;
  const vn = rvx * nx + rvy * ny; // relative velocity along the normal

  if (vn < 0) {
    puck.vx -= (1 + bounceSpeed) * vn * nx;
    puck.vy -= (1 + bounceSpeed) * vn * ny;
    clack(-vn);
  }
  return true;
}

function walls() {
  // side boards
  if (puck.x < PR) {
    puck.x = PR;
    if (puck.vx < 0) clack(-puck.vx * 0.6);
    puck.vx = Math.abs(puck.vx) * BOUNCE;
  }
  if (puck.x > RW - PR) {
    puck.x = RW - PR;
    if (puck.vx > 0) clack(puck.vx * 0.6);
    puck.vx = -Math.abs(puck.vx) * BOUNCE;
  }

  const inMouth = puck.x > GL && puck.x < GR;
  if (!inMouth) {
    if (puck.y < PR) {
      puck.y = PR;
      if (puck.vy < 0) clack(-puck.vy * 0.6);
      puck.vy = Math.abs(puck.vy) * BOUNCE;
    }
    if (puck.y > RH - PR) {
      puck.y = RH - PR;
      if (puck.vy > 0) clack(puck.vy * 0.6);
      puck.vy = -Math.abs(puck.vy) * BOUNCE;
    }
  }

  // goal posts are tiny circles, so shots can ring off them
  bouncePuck(GL, 0, 3, 0, 0, BOUNCE);
  bouncePuck(GR, 0, 3, 0, 0, BOUNCE);
  bouncePuck(GL, RH, 3, 0, 0, BOUNCE);
  bouncePuck(GR, RH, 3, 0, 0, BOUNCE);

  // inside the net: keep it between the posts
  if (puck.y < 0 || puck.y > RH) {
    puck.x = Math.max(GL + PR, Math.min(GR - PR, puck.x));
  }
}

function skaterHits() {
  // skater velocity is passed in: a moving skater "shoots", a still one "blocks"
  players.forEach((p) => bouncePuck(p.x, p.y, SR, p.vx, p.vy, 0.9));
}

function checkGoal() {
  if (puck.y < -PR) {
    scored(0);
  } else if (puck.y > RH + PR) {
    scored(1);
  }
}

export function clampHalf(i, x, y) {
  x = Math.max(SR, Math.min(RW - SR, x));
  y =
    i === 0
      ? Math.max(RH / 2 + SR, Math.min(RH - SR, y))
      : Math.max(SR, Math.min(RH / 2 - SR, y));
  return [x, y];
}

function stepPlayer(p, i, dt) {
  const isCpu = game.role === "cpu" && i === 1;
  const active = p.ptr !== null || isCpu;
  const maxV = isCpu ? 560 : MAX_SKATE; // difficulty knob
  let dvx = 0,
    dvy = 0;

  if (active) {
    dvx = (p.tx - p.x) * SKATE_PULL; // further away → want to go faster
    dvy = (p.ty - p.y) * SKATE_PULL;
    const m = Math.hypot(dvx, dvy);
    if (m > maxV) {
      dvx *= maxV / m;
      dvy *= maxV / m;
    }
  }

  // move actual velocity part of the way toward desired velocity → icy drift
  const k = Math.min(1, (active ? GRIP : GLIDE) * dt);
  p.vx += (dvx - p.vx) * k;
  p.vy += (dvy - p.vy) * k;

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // stay in your half; kill velocity into the edge so you don't stick to it
  const [cx, cy] = clampHalf(i, p.x, p.y);
  if (cx !== p.x) {
    p.x = cx;
    p.vx = 0;
  }
  if (cy !== p.y) {
    p.y = cy;
    p.vy = 0;
  }
}

export function update(dt) {
  const h = dt / UPDATE_SUBSTEPS;
  for (let s = 0; s < UPDATE_SUBSTEPS; s++) {
    players.forEach((p, i) => stepPlayer(p, i, h));

    if (game.mode === "play") {
      stepPuck(h);
      walls();
      skaterHits();
      checkGoal();
    }
    if (game.mode !== "play") break; // goal scored mid-frame → stop simulating the puck
  }
  if (game.mode === "goal") tickGoal(dt);

  if (game.mode === "play") {
    trail.push({ x: puck.x, y: puck.y }); // once per frame, not per substep
    if (trail.length > 14) trail.shift();
  }
}
