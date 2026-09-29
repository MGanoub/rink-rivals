import { ctx } from "../canvas.js";
import { RW, RH, GOAL, GL, GR, RED } from "../config.js";

export function drawRink() {
  const g = ctx.createLinearGradient(0, 0, RW, RH);
  g.addColorStop(0, "#f5fafd");
  g.addColorStop(1, "#e3eef7");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, RW, RH);

  drawCenterLines();
  drawCenterCircle();
  drawSideCircles();
  drawGoalLines();
}

function drawCenterLines() {
  ctx.fillStyle = "rgba(29,95,209,.55)";
  ctx.fillRect(0, RH / 2 - 128, RW, 6);
  ctx.fillRect(0, RH / 2 + 122, RW, 6);
  ctx.fillStyle = "rgba(215,38,61,.7)";
  ctx.fillRect(0, RH / 2 - 3, RW, 6);
}

function drawCenterCircle() {
  ctx.strokeStyle = "rgba(29,95,209,.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(RW / 2, RH / 2, 52, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSideCircles() {
  ctx.strokeStyle = "rgba(215,38,61,.45)";
  ctx.lineWidth = 2.5;
  [
    [90, 150],
    [270, 150],
    [90, RH - 150],
    [270, RH - 150],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawGoalLines() {
  [
    [0, 1],
    [RH, -1],
  ].forEach(([y, dir]) => {
    // crease: half circle in front of the goal
    ctx.fillStyle = "rgba(80,150,230,.22)";
    ctx.strokeStyle = "rgba(215,38,61,.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      RW / 2,
      y,
      58,
      dir > 0 ? 0 : Math.PI,
      dir > 0 ? Math.PI : Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();

    // net area and red posts
    ctx.fillStyle = "rgba(20,35,58,.12)";
    ctx.fillRect(GL, dir > 0 ? 0 : RH - 10, GOAL, 10);
    ctx.fillStyle = RED;
    ctx.fillRect(GL - 4, dir > 0 ? 0 : RH - 12, 6, 12);
    ctx.fillRect(GR - 2, dir > 0 ? 0 : RH - 12, 6, 12);
  });
}
