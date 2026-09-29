import { resize } from "./canvas.js";
import { render } from "./render/renderer.js";
import { update } from "./game/physics.js";
import { initInput } from "./game/input.js";
import { initScreens } from "./ui/screens.js";
import { cpuThink } from "./game/ai.js";
import { game, playing } from "./game/state.js";

resize();
window.addEventListener("resize", resize);
initInput();
initScreens();

let last = performance.now();
function loop(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;

  if (playing()) {
    if (game.role === "cpu" && game.mode === "play") cpuThink();
    update(dt);
  }
  render(); // always draw, so the rink shows behind menus
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
