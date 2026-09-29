import { ctx } from "../canvas.js";
import { RW, RH, RED, BLUE } from "../config.js";
import { game, players, myIndex } from "../game/state.js";

const FONT = 'Bungee, Impact, "Arial Black", sans-serif';

export function drawScore() {
  if (game.role === "none") return;
  ctx.font = `44px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.35;

  if (game.role === "local") {
    ctx.fillStyle = RED;
    ctx.fillText(game.score[0], RW - 16, RH / 2 + 34);
    ctx.save();
    ctx.fillStyle = BLUE;
    ctx.translate(RW - 16, RH / 2 - 34);
    ctx.rotate(Math.PI);
    ctx.textAlign = "left";
    ctx.fillText(game.score[1], 0, 0);
    ctx.restore();
  } else {
    // vs computer or online: my score below the line, opponent's above
    const me = myIndex(),
      op = 1 - me;
    ctx.fillStyle = players[me].color;
    ctx.fillText(game.score[me], RW - 16, RH / 2 + 34);
    ctx.fillStyle = players[op].color;
    ctx.fillText(game.score[op], RW - 16, RH / 2 - 30);
  }
  ctx.globalAlpha = 1;
}

export function drawGoal() {
  if (game.mode !== "goal" || game.goalBy < 0) return;
  const s = 1 + Math.max(0, 0.4 - game.goalT) * 1.5;
  const color = players[game.goalBy].color;

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
    ctx.strokeText("GOAL!", 0, 0);
    ctx.fillStyle = color;
    ctx.fillText("GOAL!", 0, 0);
    ctx.restore();
  };
  draw(RH * 0.72, 0);
  if (game.role === "local") draw(RH * 0.28, Math.PI);
}
