import { RW, RH } from "../config.js";

export const puck = { x: RW / 2, y: RH / 2, vx: 0, vy: 0 };

export const trail = [];

export const game = {
  mode: "play", // 'play' | 'goal'
  score: [0, 0], // [red, blue]
  goalBy: -1, // who scored last
  goalT: 0, // seconds since the goal (for the animation)
  pauseT: 0, // seconds left before the faceoff
};
