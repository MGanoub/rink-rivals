import { RW, RH, RED, BLUE } from "../config.js";

export const puck = { x: RW / 2, y: RH / 2, vx: 0, vy: 0 };

export const trail = [];

export const game = {
  role: "none", // 'none' | 'local' | 'cpu'
  mode: "menu", // 'play' | 'goal'
  score: [0, 0], // [red, blue]
  goalBy: -1, // who scored last
  goalT: 0, // seconds since the goal (for the animation)
  pauseT: 0, // seconds left before the faceoff
};

export const playing = () => game.mode === "play" || game.mode === "goal";

// tx, ty is where the player wants to go (their finger).
// ptr is the id of the finger controlling this skater, or null if no finger is down.
export const players = [
  {
    name: "Red",
    color: RED,
    x: RW / 2,
    y: RH - 110,
    vx: 0,
    vy: 0,
    tx: RW / 2,
    ty: RH - 110,
    ptr: null,
  },
  {
    name: "Blue",
    color: BLUE,
    x: RW / 2,
    y: 110,
    vx: 0,
    vy: 0,
    tx: RW / 2,
    ty: 110,
    ptr: null,
  },
];
