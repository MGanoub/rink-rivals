import { beginWorld } from "../canvas.js";
import { drawRink } from "./rink.js";
import { drawPuck } from "./entities.js";

export function render() {
  beginWorld();
  drawRink();
  drawPuck();
}
