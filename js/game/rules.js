import { RW, RH } from "../config.js";
import { puck, trail, game, players } from "./state.js";
import { horn } from "../audio.js";

export const hooks = { onGameOver: null };

export function faceoff(conceder) {
  game.faceoffN++;
  game.puckK += game.puckK % 2 === 0 ? 2 : 1; // next even number: host owns the puck at faceoff

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
  puck.vx = puck.vy = 0;
  trail.length = 0;
}

export function startMatch() {
  game.score = [0, 0];
  game.goalBy = -1;
  faceoff(-1);
  game.mode = "play";
}

export function startLocal(role) {
  game.role = role;
  players[1].name = role === "cpu" ? "Computer" : "Blue";
  startMatch();
}

export function scored(by) {
  game.score[by]++;
  game.goalBy = by;
  game.goalT = 0;
  game.pauseT = 1.5;
  game.mode = "goal";
  horn();
  try {
    navigator.vibrate?.(120);
  } catch (e) {}
}

export function tickGoal(dt) {
  game.goalT += dt;
  game.pauseT -= dt;
  if (game.pauseT <= 0) {
    if (game.score[game.goalBy] >= game.target) {
      game.mode = "over";
      hooks.onGameOver?.();
    } else {
      faceoff(1 - game.goalBy);
      game.mode = "play";
    }
  }
}
