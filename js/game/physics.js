import { puck, trail } from "./state.js";

const FRICTION = 0.62;

function stepPuck(dt) {
  const f = Math.pow(FRICTION, dt);
  puck.vx *= f;
  puck.vy *= f;

  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
}

export function update(dt) {
  stepPuck(dt);

  trail.push({ x: puck.x, y: puck.y });

  // keep the last 14 positions
  if (trail.length > 14) trail.shift();
}
