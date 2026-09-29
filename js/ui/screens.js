import { game, players } from "../game/state.js";
import { startLocal, faceoff, hooks } from "../game/rules.js";
import { ensureAudio } from "../audio.js";

const $ = (id) => document.getElementById(id);
const SCREENS = ["menu", "over"];

// show one screen; null = no screen (playing), which shows the leave button
export function show(id) {
  SCREENS.forEach((s) => $(s).classList.toggle("hidden", s !== id));
  $("leave").classList.toggle("hidden", id !== null);
}

// same-phone record, saved in the browser
function loadRecord() {
  try {
    const r = JSON.parse(localStorage.getItem("rinkrivals-record"));
    if (r && typeof r.r === "number") return r;
  } catch (e) {}
  return { r: 0, b: 0 };
}
function saveRecord() {
  try {
    localStorage.setItem("rinkrivals-record", JSON.stringify(record));
  } catch (e) {}
}
let record = loadRecord();
function showRecord() {
  $("recR").textContent = record.r;
  $("recB").textContent = record.b;
}

function start(role) {
  ensureAudio();
  startLocal(role);
  show(null);
}

function toMenu() {
  game.role = "none";
  game.mode = "menu";
  faceoff(-1);
  showRecord();
  show("menu");
}

function showOver() {
  const w = game.score[0] > game.score[1] ? 0 : 1;
  if (game.role === "local") {
    if (w === 0) record.r++;
    else record.b++;
    saveRecord();
  }
  const text =
    game.role === "cpu"
      ? w === 0
        ? "You win"
        : "Computer wins"
      : players[w].name + " wins";
  $("winText").textContent = text;
  $("winText").style.color = players[w].color;
  $("finalScore").textContent = `${game.score[0]}–${game.score[1]}`;
  show("over");
}

export function initScreens() {
  // "first to" buttons
  document.querySelectorAll("#seg button").forEach((b) =>
    b.addEventListener("click", () => {
      document
        .querySelectorAll("#seg button")
        .forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      game.target = +b.dataset.n; // + turns the string "5" into the number 5
    }),
  );

  $("btn2p").onclick = () => start("local");
  $("btnCpu").onclick = () => start("cpu");
  $("btnRematch").onclick = () => start(game.role);
  $("btnMenu").onclick = toMenu;
  $("leave").onclick = toMenu;
  $("resetRec").onclick = () => {
    record = { r: 0, b: 0 };
    saveRecord();
    showRecord();
  };

  hooks.onGameOver = showOver; // subscribe to the rules' "event"
  toMenu();
}
