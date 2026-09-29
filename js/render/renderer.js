import { beginWorld } from "../canvas.js";
import { drawRink } from "./rink.js";

export function render() {
  beginWorld();
  drawRink();
}
