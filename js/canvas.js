import { RW, RH } from "./config.js";

export const cvs = document.getElementById("c");
export const ctx = cvs.getContext("2d");
const wrap = document.getElementById("wrap");

export const view = { scale: 1, dpr: 1 };

export function resize() {
  const r = wrap.getBoundingClientRect();
  view.dpr = Math.min(window.devicePixelRatio || 1, 3);
  view.scale = Math.min((r.width - 22) / RW, (r.height - 22) / RH);

  const w = RW * view.scale,
    h = RH * view.scale;
  cvs.style.width = w + "px";
  cvs.style.height = h + "px";
  cvs.width = Math.round(w * view.dpr);
  cvs.height = Math.round(h * view.dpr);
}

export function beginWorld() {
  const s = view.dpr * view.scale;
  ctx.setTransform(s, 0, 0, s, 0, 0);
}
