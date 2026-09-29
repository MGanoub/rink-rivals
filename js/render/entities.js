import { ctx } from "../canvas.js";
import { PR, SR } from "../config.js";
import { puck, trail, players } from "../game/state.js";

export function drawPuck() {
  trail.forEach((t, i) => {
    const k = i / trail.length;
    ctx.fillStyle = `rgba(20,35,58,${k * 0.18})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, PR * (0.4 + 0.6 * k), 0, Math.PI * 2);
    ctx.fill();
  });

  // puck
  ctx.fillStyle = "#0f1826";
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, PR, 0, Math.PI * 2);
  ctx.fill();

  // small highlight ring so it looks like a real puck
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, PR - 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSkater(p) {
  // shadow, offset down-right
  ctx.fillStyle = "rgba(20,35,58,.18)";
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 5, SR, SR * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, SR, 0, Math.PI * 2);
  ctx.fill();

  // white ring
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, SR - 7, 0, Math.PI * 2);
  ctx.stroke();

  // shine
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath();
  ctx.arc(p.x - 7, p.y - 8, 6, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSkaters() {
  players.forEach(drawSkater);
}
