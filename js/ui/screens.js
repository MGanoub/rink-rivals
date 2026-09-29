import { game, players, myIndex } from "../game/state.js";
import { startLocal, startMatch, faceoff, hooks } from "../game/rules.js";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  requestRematch,
  netHooks,
} from "../network/room.js";
import { ensureAudio } from "../audio.js";

const $ = (id) => document.getElementById(id);
const SCREENS = ["menu", "create", "join", "wait", "over", "notice"];

// show one screen; null = no screen (playing), which shows the leave button
export function show(id) {
  SCREENS.forEach((s) => $(s).classList.toggle("hidden", s !== id));
  $("leave").classList.toggle("hidden", id !== null);
}

// ---------- same-phone record ----------
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

// ---------- flow ----------
function start(role) {
  ensureAudio();
  startLocal(role);
  show(null);
}

function toMenu() {
  leaveRoom(); // must run while game.role still says host/guest
  game.role = "none";
  game.mode = "menu";
  faceoff(-1);
  showRecord();
  show("menu");
}

function notice(msg) {
  leaveRoom();
  game.role = "none";
  game.mode = "menu";
  $("noticeText").textContent = msg;
  show("notice");
}

function showOver() {
  const w = game.score[0] > game.score[1] ? 0 : 1;
  if (game.role === "local") {
    if (w === 0) record.r++;
    else record.b++;
    saveRecord();
  }

  let text;
  if (game.role === "cpu") text = w === 0 ? "You win" : "Computer wins";
  else if (game.role === "local") text = players[w].name + " wins";
  else text = w === myIndex() ? "You win" : "Opponent wins";

  $("winText").textContent = text;
  $("winText").style.color = players[w].color;
  const me = myIndex();
  $("finalScore").textContent = `${game.score[me]}–${game.score[1 - me]}`;
  $("btnRematch").textContent = "Rematch";
  $("btnRematch").disabled = false;
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
      game.target = +b.dataset.n;
    }),
  );

  // local modes
  $("btn2p").onclick = () => start("local");
  $("btnCpu").onclick = () => start("cpu");
  $("resetRec").onclick = () => {
    record = { r: 0, b: 0 };
    saveRecord();
    showRecord();
  };

  // every Back / Cancel / Back to menu button
  document
    .querySelectorAll("[data-back]")
    .forEach((b) => b.addEventListener("click", toMenu));
  $("leave").onclick = toMenu;

  $("btnRematch").onclick = () => {
    if (game.role === "guest") {
      requestRematch();
      $("btnRematch").textContent = "Waiting for host…";
      $("btnRematch").disabled = true;
    } else if (game.role === "host") {
      startMatch();
      show(null);
    } else start(game.role);
  };

  // --- create ---
  $("btnCreate").onclick = () => {
    $("createErr").textContent = "";
    show("create");
  };
  $("btnCreateGo").onclick = async () => {
    ensureAudio();
    $("btnCreateGo").disabled = true;
    try {
      const code = await createRoom();
      game.role = "host";
      game.mode = "wait";
      players[1].name = "Blue";
      $("codeText").textContent = code;
      $("waitHint").textContent = "Send your opponent this code.";
      $("waitStatus").textContent = "Waiting for your opponent…";
      show("wait");
    } catch (err) {
      $("createErr").textContent = err.message;
    }
    $("btnCreateGo").disabled = false;
  };

  // --- join ---
  $("btnJoin").onclick = () => {
    $("joinErr").textContent = "";
    show("join");
    $("joinCode").focus();
  };
  $("joinCode").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
  $("btnJoinGo").onclick = async () => {
    ensureAudio();
    $("btnJoinGo").disabled = true;
    try {
      game.role = "guest"; // set first: leaveRoom() needs to know who we are
      game.mode = "wait";
      await joinRoom($("joinCode").value);
      $("codeText").textContent = $("joinCode").value;
      $("waitHint").textContent = "You joined the room.";
      $("waitStatus").textContent = "Starting…";
      show("wait");
    } catch (err) {
      game.role = "none";
      game.mode = "menu";
      $("joinErr").textContent = err.message;
    }
    $("btnJoinGo").disabled = false;
  };

  // --- network events ---
  netHooks.onGuestJoined = () => {
    if (game.role === "host" && game.mode === "wait") {
      startMatch();
      show(null);
    }
  };
  netHooks.onGuestLeft = () => {
    if (game.role === "host" && game.mode !== "wait") {
      game.mode = "wait";
      $("waitStatus").textContent =
        "Your opponent left. Waiting for someone to join…";
      show("wait");
    }
  };
  netHooks.onHostLeft = () => {
    if (game.role === "guest") notice("The host closed the room.");
  };
  netHooks.onRemoteMode = (m) => {
    if (m === "over") showOver();
    else if (m === "play" || m === "goal") show(null);
  };
  netHooks.onRematchRequest = () => {
    if (game.role === "host" && game.mode === "over") {
      startMatch();
      show(null);
    }
  };

  hooks.onGameOver = showOver;
  toMenu();
}
