import { ctx } from "../canvas.js";
import { RW, RH, RED, BLUE } from "../config.js";
import { game } from "../game/state.js";

const FONT = 'Bungee, Impact, "Arial Black", sans-serif';

export function drawScore() {
  ctx.font = `44px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.35;

  // Red reads it normally from the bottom
  ctx.fillStyle = RED;
  ctx.fillText(game.score[0], RW - 16, RH / 2 + 34);

  // Blue sits on the other side of the phone, so rotate 180°
  ctx.save();
  if (game.role === "local") {
    // Blue is across the table → upside down
    ctx.save();
    ctx.translate(RW - 16, RH / 2 - 34);
    ctx.rotate(Math.PI);
    ctx.textAlign = "left";
    ctx.fillText(game.score[1], 0, 0);
    ctx.restore();
  } else {
    // one person holding the phone → upright
    ctx.fillText(game.score[1], RW - 16, RH / 2 - 30);
  }

  ctx.globalAlpha = 1;
}

export function drawGoal() {
  if (game.mode !== "goal") return;
  const s = 1 + Math.max(0, 0.4 - game.goalT) * 1.5; // starts big, settles in 0.4s
  const color = game.goalBy === 0 ? RED : BLUE;

  const draw = (y, rot) => {
    ctx.save();
    ctx.translate(RW / 2, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.font = `54px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#fff";
    ctx.strokeText("GOAL!", 0, 0); // white outline first
    ctx.fillStyle = color;
    ctx.fillText("GOAL!", 0, 0);
    ctx.restore();
  };
  draw(RH * 0.72, 0); // for the bottom player
  if (game.role === "local") draw(RH * 0.28, Math.PI);
}
