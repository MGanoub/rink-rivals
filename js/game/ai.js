import { RW, RH, SR, PR } from "../config.js";
import { puck, players } from "./state.js";
import { clampHalf } from "./physics.js";

// the AI only chooses a target, exactly like a finger would
export function cpuThink() {
  const c = players[1];
  let tx, ty;

  if (puck.y < RH / 2 + 10) {
    // puck on my side → attack. Direction from the puck to Red's goal:
    let dx = RW / 2 - puck.x,
      dy = RH - puck.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;

    // the spot just "behind" the puck, lined up with the goal
    const bx = puck.x - dx * (SR + PR),
      by = puck.y - dy * (SR + PR);

    if (c.y > puck.y - 4) {
      // I'm on the wrong side of the puck → go around it, not through it
      tx = bx + (c.x < puck.x ? -SR * 1.4 : SR * 1.4);
      ty = by - 14;
    } else if (Math.hypot(c.x - bx, c.y - by) > 16) {
      tx = bx;
      ty = by; // get into shooting position
    } else {
      tx = puck.x + dx * 30;
      ty = puck.y + dy * 30; // in position → shoot through it
    }
  } else {
    // puck on Red's side → defend: shadow the puck in front of my goal
    tx = RW / 2 + (puck.x - RW / 2) * 0.55;
    ty = 85;
  }

  [c.tx, c.ty] = clampHalf(1, tx, ty);
}
