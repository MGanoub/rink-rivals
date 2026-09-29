import { RW, RH } from "../config.js";
import { puck, trail, game, players } from "./state.js";
import { horn } from "../audio.js";

export const hooks = { onGameOver: null };

export function faceoff(conceder) {
  const [red, blue] = players;
  red.x = RW / 2;
  red.y = RH - 110;
  blue.x = RW / 2;
  blue.y = 110;
  players.forEach((p) => {
    p.vx = p.vy = 0;
    p.tx = p.x;
    p.ty = p.y;
  });

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
  horn();
  try {
    navigator.vibrate?.(120);
  } catch (e) {}
}

export function startLocal(role) {
  game.role = role;
  players[1].name = role === "cpu" ? "Computer" : "Blue";
  game.score = [0, 0];
  game.goalBy = -1;
  faceoff(-1);
  game.mode = "play";
}

export function tickGoal(dt) {
  game.goalT += dt;
  game.pauseT -= dt;
  if (game.pauseT <= 0) {
    if (game.score[game.goalBy] >= game.target) {
      game.mode = "over";
      hooks.onGameOver?.(); // tell the UI; rules don't know HTML exists
    } else {
      faceoff(1 - game.goalBy);
      game.mode = "play";
    }
  }
}
