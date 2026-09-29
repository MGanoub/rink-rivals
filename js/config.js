export const RW = 360,
  RH = 640; // world size
export const GOAL = 120;
export const GL = (RW - GOAL) / 2;
export const GR = GL + GOAL;
export const RED = "#d7263d",
  BLUE = "#1d5fd1";

export const SR = 24; // skater radius
export const PR = 12; // puck radius

export const SKATE_PULL = 13; // how hard the skater is pulled toward the finger
export const MAX_SKATE = 1150; // top speed
export const GRIP = 11; // how fast velocity follows the desired velocity
export const GLIDE = 3; // the same, when no finger is down (lower = longer glide)
