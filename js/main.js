import { resize, cvs, view } from "./canvas.js";
import { render } from "./render/renderer.js";
import { update } from "./game/physics.js";
import { puck } from "./game/state.js";

resize();
window.addEventListener("resize", resize);

let last = performance.now();

function loop(now) {
  // dt = seconds since the last frame; capped so a lag spike can't teleport things
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;

  update(dt);
  render();
  requestAnimationFrame(loop); // ask the browser to call us again next frame
}
requestAnimationFrame(loop);

// --- TEMPORARY TEST: tap anywhere and the puck slides there ---
cvs.addEventListener("pointerdown", (e) => {
  const r = cvs.getBoundingClientRect();
  const tx = (e.clientX - r.left) / view.scale; // screen pixels → world units
  const ty = (e.clientY - r.top) / view.scale;
  const k = -Math.log(0.62); // ≈ 0.478
  puck.vx = (tx - puck.x) * k;
  puck.vy = (ty - puck.y) * k;
});
