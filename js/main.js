import { resize } from "./canvas.js";
import { render } from "./render/renderer.js";
import { update, updateGuest } from "./game/physics.js";
import { initInput } from "./game/input.js";
import { initScreens } from "./ui/screens.js";
import { cpuThink } from "./game/ai.js";
import { game, playing } from "./game/state.js";
import {
  sendState,
  sendInput,
  applyRemotePlayer,
  applyRemoteState,
} from "./network/room.js";

resize();
window.addEventListener("resize", resize);
initInput();
initScreens();

let last = performance.now();

function loop(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;

  if (playing()) {
    if (game.role === "guest") {
      updateGuest(dt); // my skater, instantly
      applyRemoteState(dt); // puck + Red from the host, smoothed
      sendInput(); // tell the host where I am
    } else {
      if (game.role === "cpu" && game.mode === "play") cpuThink();
      if (game.role === "host") applyRemotePlayer();
      update(dt); // the real physics
    }
  }
  if (game.role === "host" && game.mode !== "wait") sendState(); // includes 'over'

  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
