import { RW, RH, RED, BLUE } from "../config.js";

export const puck = { x: RW / 2, y: RH / 2, vx: 0, vy: 0 };
export const trail = [];

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

export const game = {
  role: "none", // 'none' | 'local' | 'cpu' | 'host' | 'guest'
  mode: "menu", // 'menu' | 'wait' | 'play' | 'goal' | 'over'
  target: 5,
  score: [0, 0], // [red, blue]
  goalBy: -1,
  goalT: 0,
  pauseT: 0,
  faceoffN: 0, // counts faceoffs, so the guest knows when to reset
  puckK: 0, // puck ownership token: even = host simulates it, odd = guest does
};

// shared networking data (room.js writes it, physics.js reads it)
export const net = {
  remote: null, // host: latest message from the guest
  remoteT: 0, // host: when it arrived
  guestK: 0, // guest: my copy of the ownership token
  goalSent: false, // guest: Red scored in my net, and I reported it
};

export const playing = () => game.mode === "play" || game.mode === "goal";
export const myIndex = () => (game.role === "guest" ? 1 : 0);
export const flipped = () => game.role === "guest";
