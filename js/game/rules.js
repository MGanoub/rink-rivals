import { RW, RH } from "../config.js";
import { puck, trail, game } from "./state.js";

export function faceoff(conceder) {
  puck.x = RW / 2;
  puck.y = RH / 2 + (conceder === 0 ? 45 : conceder === 1 ? -45 : 0);
  puck.vx = 0;
  puck.vy = 0;
  trail.length = 0;
}

export function scored(by) {
  game.score[by] += 1;
  game.goalBy = by;
  game.goalT = 0;
  game.pauseT = 1.5;
  game.mode = "goal";
}

export function tickGoal(dt) {
  game.goalT += dt;
  game.pauseT -= dt;
  if (game.pauseT <= 0) {
    faceoff(1 - game.goalBy);
    game.mode = "play";
  }
}
