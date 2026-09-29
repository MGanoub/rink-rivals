import { RW, RH, PR, SR, GL, GR } from "../config.js";
import { puck, trail, game, players } from "./state.js";
import { scored, tickGoal } from "./rules.js";
import { clack } from "../audio.js";

const FRICTION = 0.62;
const BOUNCE = 0.88;
const MAX_SPEED = 1500;
const SUBSTEPS = 5;

const SKATE_PULL = 13;
const MAX_SKATE = 1150;
const GRIP = 11;
const GLIDE = 3;

// keep a point inside a player's own half (Red = bottom, Blue = top)
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
  const maxV = isCpu ? 560 : MAX_SKATE;
  let dvx = 0,
    dvy = 0;

  if (active) {
    dvx = (p.tx - p.x) * SKATE_PULL;
    dvy = (p.ty - p.y) * SKATE_PULL;
    const m = Math.hypot(dvx, dvy);
    if (m > maxV) {
      dvx *= maxV / m;
      dvy *= maxV / m;
    }
  }

  const k = Math.min(1, (active ? GRIP : GLIDE) * dt);
  p.vx += (dvx - p.vx) * k;
  p.vy += (dvy - p.vy) * k;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

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

function stepPuck(dt) {
  const f = Math.pow(FRICTION, dt);
  puck.vx *= f;
  puck.vy *= f;

  const sp = Math.hypot(puck.vx, puck.vy);
  if (sp > MAX_SPEED) {
    puck.vx *= MAX_SPEED / sp;
    puck.vy *= MAX_SPEED / sp;
  }

  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
}

export function bounceCircle(cx, cy, r, vx, vy, e) {
  const dx = puck.x - cx,
    dy = puck.y - cy;
  const d = Math.hypot(dx, dy),
    min = r + PR;
  if (d >= min || d === 0) return false;

  const nx = dx / d,
    ny = dy / d;
  puck.x = cx + nx * min;
  puck.y = cy + ny * min;

  const rvx = puck.vx - vx,
    rvy = puck.vy - vy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    puck.vx -= (1 + e) * vn * nx;
    puck.vy -= (1 + e) * vn * ny;
    clack(-vn);
  }
  return true;
}

function walls() {
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

  bounceCircle(GL, 0, 3, 0, 0, BOUNCE);
  bounceCircle(GR, 0, 3, 0, 0, BOUNCE);
  bounceCircle(GL, RH, 3, 0, 0, BOUNCE);
  bounceCircle(GR, RH, 3, 0, 0, BOUNCE);

  if (puck.y < 0 || puck.y > RH)
    puck.x = Math.max(GL + PR, Math.min(GR - PR, puck.x));
}

function skaterHits() {
  players.forEach((p) => bounceCircle(p.x, p.y, SR, p.vx, p.vy, 0.9));
}

function checkGoal() {
  if (puck.y < -PR) scored(0);
  else if (puck.y > RH + PR) scored(1);
}

// full simulation: same phone, vs computer, and the online host
export function update(dt) {
  const h = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    players.forEach((p, i) => {
      if (!(game.role === "host" && i === 1)) stepPlayer(p, i, h); // host: Blue comes from the network
    });
    if (game.mode === "play") {
      stepPuck(h);
      walls();
      skaterHits();
      checkGoal();
    }
    if (game.mode !== "play") break;
  }

  if (game.mode === "goal") tickGoal(dt);

  if (game.mode === "play") {
    trail.push({ x: puck.x, y: puck.y });
    if (trail.length > 14) trail.shift();
  }
}

// online guest: only simulate my own skater, everything else comes from the host
export function updateGuest(dt) {
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) stepPlayer(players[1], 1, h);
  if (game.mode === "goal") game.goalT += dt;
  if (game.mode === "play") {
    trail.push({ x: puck.x, y: puck.y });
    if (trail.length > 14) trail.shift();
  }
}
