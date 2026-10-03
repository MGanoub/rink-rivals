import { RW, RH, PR, SR, GL, GR, CR } from "../config.js";
import { puck, trail, game, players, net } from "./state.js";
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

const HAND = 4; // hand the puck over slightly past the center line, so it doesn't flip back and forth

// ---------- rounded corners ----------
const CORNERS = [
  [CR, CR],
  [RW - CR, CR],
  [CR, RH - CR],
  [RW - CR, RH - CR],
];

// if a circle is out past a corner arc, pull it back onto the arc; returns the normal or null
function cornerClamp(o, radius) {
  const limit = CR - radius;
  for (const [cx, cy] of CORNERS) {
    const inX = cx < RW / 2 ? o.x < cx : o.x > cx;
    const inY = cy < RH / 2 ? o.y < cy : o.y > cy;
    if (!inX || !inY) continue;
    const dx = o.x - cx,
      dy = o.y - cy,
      d = Math.hypot(dx, dy);
    if (d <= limit) continue;
    const nx = dx / d,
      ny = dy / d;
    o.x = cx + nx * limit;
    o.y = cy + ny * limit;
    return [nx, ny];
  }
  return null;
}

// keep a point inside a player's own half (Red = bottom, Blue = top)
export function clampHalf(i, x, y) {
  x = Math.max(SR, Math.min(RW - SR, x));
  y =
    i === 0
      ? Math.max(RH / 2 + SR, Math.min(RH - SR, y))
      : Math.max(SR, Math.min(RH / 2 - SR, y));
  const p = { x, y };
  cornerClamp(p, SR);
  return [p.x, p.y];
}

// ---------- skaters ----------
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

// ---------- puck ----------
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

  // curved corners: bounce off the arc
  const n = cornerClamp(puck, PR);
  if (n) {
    const vn = puck.vx * n[0] + puck.vy * n[1];
    if (vn > 0) {
      clack(vn * 0.6);
      puck.vx -= (1 + BOUNCE) * vn * n[0];
      puck.vy -= (1 + BOUNCE) * vn * n[1];
    }
  }
}

function skaterHits() {
  players.forEach((p) => bounceCircle(p.x, p.y, SR, p.vx, p.vy, 0.9));
}

// pinned between a skater and the boards → squirt the puck out sideways, toward the middle
function unpin() {
  players.forEach((p) => {
    const dx = puck.x - p.x,
      dy = puck.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d >= SR + PR - 0.5) return;

    let tx = -dy,
      ty = dx;
    if (tx * (RW / 2 - puck.x) + ty * (RH / 2 - puck.y) < 0) {
      tx = -tx;
      ty = -ty;
    }
    let len = Math.hypot(tx, ty);
    if (len < 0.01) {
      tx = RW / 2 - puck.x;
      ty = RH / 2 - puck.y;
      len = Math.hypot(tx, ty) || 1;
    }
    puck.vx = (tx / len) * 500;
    puck.vy = (ty / len) * 500;
  });
}

function checkGoal() {
  if (puck.y < -PR)
    scored(0); // top net → Red scores
  else if (puck.y > RH + PR) scored(1); // bottom net → Blue scores
}

// one full physics substep for the puck (used by whoever owns it)
function simPuck(h) {
  stepPuck(h);
  walls();
  skaterHits();
  walls();
  unpin();
}

// ---------- online: puck ownership by half ----------
// place the puck from the guest's message, guessing ahead by the message's age
function setPuckFrom(a) {
  const age = Math.min(0.1, (performance.now() - net.remoteT) / 1000);
  puck.x = Math.max(PR, Math.min(RW - PR, a[0] + a[2] * age));
  puck.y = a[1] + a[3] * age;
  puck.vx = a[2];
  puck.vy = a[3];
}

function hostPuckStep(h) {
  const r = net.remote;
  const fresh = r && r.f === game.faceoffN; // message belongs to the current faceoff

  if (fresh && r.goal === game.faceoffN) {
    scored(0);
    return;
  } // guest reports: Red scored

  // guest handed the puck back to me
  if (game.puckK % 2 === 1 && fresh && r.p && r.k === game.puckK + 1) {
    game.puckK = r.k;
    setPuckFrom(r.p);
  }

  if (game.puckK % 2 === 0) {
    // I own it: full physics, instant hits for me
    simPuck(h);
    checkGoal();
    if (game.mode === "play" && puck.y < RH / 2 - HAND) game.puckK++; // crossed into her half → hers
  } else if (fresh && r.k === game.puckK && r.p) {
    setPuckFrom(r.p); // she owns it: show her puck
  } else {
    stepPuck(h);
    walls(); // handoff in progress: keep it moving until she takes over
  }
}

function guestPuckStep(h) {
  if (net.goalSent) return; // waiting for the host to announce the goal

  if (net.guestK % 2 === 1) {
    // I own it: full physics, instant hits for me
    simPuck(h);
    if (puck.y < -PR) {
      net.goalSent = true;
      return;
    } // Red scored in my net → report it
    if (puck.y > RH / 2 + HAND) net.guestK++; // crossed into his half → his
  } else {
    stepPuck(h);
    walls(); // his puck: predict between his updates
  }
}

// ---------- per-frame updates ----------
// same phone, vs computer, and online host
export function update(dt) {
  const h = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    players.forEach((p, i) => {
      if (!(game.role === "host" && i === 1)) stepPlayer(p, i, h); // host: Blue comes from the network
    });
    if (game.mode === "play") {
      if (game.role === "host") hostPuckStep(h);
      else {
        simPuck(h);
        checkGoal();
      }
    }
    if (game.mode !== "play") break;
  }

  if (game.mode === "goal") tickGoal(dt);

  if (game.mode === "play") {
    trail.push({ x: puck.x, y: puck.y });
    if (trail.length > 14) trail.shift();
  }
}

// online guest: my skater, plus the puck when it's in my half
export function updateGuest(dt) {
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    stepPlayer(players[1], 1, h);
    if (game.mode === "play") guestPuckStep(h);
  }
  if (game.mode === "goal") game.goalT += dt;
  if (game.mode === "play") {
    trail.push({ x: puck.x, y: puck.y });
    if (trail.length > 14) trail.shift();
  }
}
