import { beginWorld, ctx } from "../canvas.js";
import { RW, RH } from "../config.js";
import { drawRink } from "./rink.js";
import { drawPuck, drawSkaters } from "./entities.js";
import { drawScore, drawGoal } from "./hud.js";
import { game, flipped } from "../game/state.js";

export function render() {
  beginWorld();

  ctx.save();
  if (flipped()) {
    // guest: rotate the world 180° around the rink center
    ctx.translate(RW, RH);
    ctx.rotate(Math.PI);
  }
  drawRink();
  if (game.mode !== "goal") drawPuck();
  drawSkaters();
  ctx.restore();

  drawScore(); // HUD after restore → text is never upside down
  drawGoal();
}
