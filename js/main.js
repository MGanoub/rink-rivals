import { resize } from "./canvas.js";
import { render } from "./render/renderer.js";
import { update } from "./game/physics.js";
import { initInput } from "./game/input.js";
import { faceoff } from "./game/rules.js";

resize();
window.addEventListener("resize", resize);
initInput();
faceoff(-1); // puck in the exact center, skaters in position

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
