import { resize } from "./canvas.js";
import { render } from "./render/renderer.js";

resize();
render();

window.addEventListener("resize", () => {
  resize();
  render();
});
