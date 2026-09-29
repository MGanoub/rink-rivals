import { beginWorld } from "../canvas.js";
import { drawRink } from "./rink.js";
import { drawPuck, drawSkaters } from "./entities.js";
import { drawScore, drawGoal } from "./hud.js";
import { game } from "../game/state.js";

export function render() {
  beginWorld();
  drawRink();
  drawScore();
  if (game.mode !== "goal") drawPuck();
  drawSkaters();
  drawGoal();
}
