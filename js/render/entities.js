import { ctx } from "../canvas.js";
import { PR } from "../config.js";
import { puck, trail } from "../game/state.js";

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
