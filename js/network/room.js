import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  child,
  get,
  set,
  remove,
  onValue,
  onDisconnect,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";
import { RW } from "../config.js";
import { game, puck, players, trail, net } from "../game/state.js";
import { clampHalf } from "../game/physics.js";
import { horn } from "../audio.js";

export const netHooks = {
  onGuestJoined: null,
  onGuestLeft: null,
  onHostLeft: null,
  onRemoteMode: null,
  onRematchRequest: null,
};

const STATE_MS = 33; // host sends 30 times/s
const INPUT_MS = 33; // guest sends 30 times/s
const R = Math.round;

let db = null,
  roomRef = null,
  unsubs = [],
  lastSend = 0;
let lastMode = null,
  lastF = -1,
  lastPK = -1; // host: what we sent last
let lastK = -1,
  lastGoal = false; // guest: what we sent last
let rs = null,
  rsT = 0,
  guestF = -1; // guest: latest host state

// ---------- helpers ----------
function getDb() {
  if (!db) {
    if (
      !FIREBASE_CONFIG.databaseURL ||
      FIREBASE_CONFIG.databaseURL.includes("...")
    )
      throw new Error(
        "Paste your Firebase config into js/net/firebase-config.js",
      );
    db = getDatabase(initializeApp(FIREBASE_CONFIG));
  }
  return db;
}
const at = (name) => child(roomRef, name);
function listen(r, fn) {
  unsubs.push(onValue(r, fn));
}

function genCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
}

// ---------- create / join / leave ----------
export async function createRoom() {
  const d = getDb();
  for (let i = 0; i < 6; i++) {
    const r = ref(d, "rooms/" + genCode());
    const res = await runTransaction(r, (cur) =>
      cur === null ? { created: Date.now(), hostOnline: true } : undefined,
    );
    if (res.committed) {
      roomRef = r;
      listen(ref(d, ".info/connected"), (s) => {
        if (s.val() !== true || !roomRef) return;
        onDisconnect(at("hostOnline")).set(false); // re-arm on every (re)connect
        set(at("hostOnline"), true);
      });
      lastMode = null;
      lastPK = -1;

      listen(at("guest"), (s) => {
        if (s.exists()) netHooks.onGuestJoined?.();
        else {
          net.remote = null;
          remove(at("s"));
          netHooks.onGuestLeft?.();
        }
      });
      listen(at("in"), (s) => {
        net.remote = s.val();
        net.remoteT = performance.now();
      });
      listen(at("req"), (s) => {
        if (s.val() === "rematch") {
          remove(at("req"));
          netHooks.onRematchRequest?.();
        }
      });
      return r.key;
    }
  }
  throw new Error("Could not create a room. Try again.");
}

export async function joinRoom(code) {
  const d = getDb();
  code = code.toUpperCase().trim();
  if (code.length !== 4) throw new Error("Room codes are 4 characters.");

  const snap = await get(r);
  if (!snap.exists()) throw new Error("No room with that code.");

  const room = snap.val();
  const ageMin = (Date.now() - room.created) / 60000;
  if (!room.hostOnline && ageMin > 30)
    throw new Error("That room has expired.");

  const res = await runTransaction(child(r, "guest"), (cur) =>
    cur ? undefined : { joined: Date.now() },
  );
  if (!res.committed) throw new Error("That room is already full.");

  roomRef = r;
  guestF = -1;
  net.guestK = 0;
  net.goalSent = false;
  lastK = -1;
  lastGoal = false;
  onDisconnect(at("guest")).remove();
  listen(at("s"), (s) => onState(s.val()));
  listen(at("created"), (s) => {
    if (!s.exists()) netHooks.onHostLeft?.();
  });
}

export function leaveRoom() {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (roomRef) {
    try {
      if (game.role === "host") {
        onDisconnect(roomRef).cancel();
        remove(roomRef);
      }
      if (game.role === "guest") {
        onDisconnect(at("guest")).cancel();
        remove(at("guest"));
        remove(at("in"));
      }
    } catch (e) {}
  }
  roomRef = null;
  net.remote = null;
  rs = null;
}

export function requestRematch() {
  if (roomRef) set(at("req"), "rematch");
}

// ---------- host side ----------
export function sendState() {
  if (!roomRef) return;
  const now = performance.now();
  // mode changes, faceoffs and puck handoffs go out instantly
  const important =
    game.mode !== lastMode || game.faceoffN !== lastF || game.puckK !== lastPK;
  if (!important && now - lastSend < STATE_MS) return;
  lastSend = now;
  lastMode = game.mode;
  lastF = game.faceoffN;
  lastPK = game.puckK;

  const red = players[0];
  set(at("s"), {
    p: [R(puck.x), R(puck.y), R(puck.vx), R(puck.vy)],
    r: [R(red.x), R(red.y), R(red.vx), R(red.vy)],
    sc: [...game.score],
    m: game.mode,
    g: game.goalBy,
    f: game.faceoffN,
    t: game.target ?? 5,
    k: game.puckK,
  });
}

// put Blue where the guest says she is, guessing ahead by the message's age
export function applyRemotePlayer() {
  const b = players[1],
    r = net.remote;
  if (!r || r.f !== game.faceoffN) {
    b.vx = b.vy = 0;
    return;
  }
  const age = Math.min(0.1, (performance.now() - net.remoteT) / 1000);
  [b.x, b.y] = clampHalf(1, r.x + r.vx * age, r.y + r.vy * age);
  b.vx = r.vx;
  b.vy = r.vy;
}

// ---------- guest side ----------
function onState(s) {
  if (!s) return;
  rs = s;
  rsT = performance.now();
  game.target = s.t;

  if (s.f !== guestF) {
    // new faceoff → reset everything
    guestF = s.f;
    net.guestK = s.k;
    net.goalSent = false;
    const b = players[1];
    b.x = RW / 2;
    b.y = 110;
    b.vx = b.vy = 0;
    b.tx = b.x;
    b.ty = b.y;
    puck.x = s.p[0];
    puck.y = s.p[1];
    puck.vx = s.p[2];
    puck.vy = s.p[3];
    players[0].x = s.r[0];
    players[0].y = s.r[1];
    trail.length = 0;
  } else if (s.k > net.guestK && s.k % 2 === 1) {
    // host handed me the puck → continue from his latest puck
    net.guestK = s.k;
    puck.x = s.p[0];
    puck.y = s.p[1];
    puck.vx = s.p[2];
    puck.vy = s.p[3];
  }

  game.score = [...s.sc];
  if (s.m === "goal" && game.mode !== "goal") {
    game.goalBy = s.g;
    game.goalT = 0;
    horn();
  }
  if (s.m !== game.mode) {
    game.mode = s.m;
    netHooks.onRemoteMode?.(s.m);
  }
}

export function sendInput() {
  if (!roomRef) return;
  const now = performance.now();
  // handoffs and goal reports go out instantly
  const important = net.guestK !== lastK || net.goalSent !== lastGoal;
  if (!important && now - lastSend < INPUT_MS) return;
  lastSend = now;
  lastK = net.guestK;
  lastGoal = net.goalSent;

  const b = players[1];
  set(at("in"), {
    x: R(b.x),
    y: R(b.y),
    vx: R(b.vx),
    vy: R(b.vy),
    f: guestF,
    k: net.guestK,
    p: [R(puck.x), R(puck.y), R(puck.vx), R(puck.vy)],
    goal: net.goalSent ? guestF : -1,
  });
}

// follow the host's puck (only when he owns it) and his skater, smoothly
export function applyRemoteState(dt) {
  if (!rs) return;
  const age = Math.min(0.12, (performance.now() - rsT) / 1000);
  const k = Math.min(1, dt * 22);
  const follow = (o, a) => {
    const tx = Math.max(0, Math.min(RW, a[0] + a[2] * age));
    const ty = a[1] + a[3] * age;
    if (Math.hypot(tx - o.x, ty - o.y) > 90) {
      o.x = tx;
      o.y = ty;
    } else {
      o.x += (tx - o.x) * k;
      o.y += (ty - o.y) * k;
    }
    o.vx = a[2];
    o.vy = a[3];
  };

  const iOwn = net.guestK % 2 === 1;
  const handingBack = !iOwn && rs.k < net.guestK; // I passed it back, he hasn't confirmed yet
  if (!iOwn && !handingBack) follow(puck, rs.p);
  follow(players[0], rs.r);
}
