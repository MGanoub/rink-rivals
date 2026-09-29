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
import { game, puck, players, trail } from "../game/state.js";
import { clampHalf } from "../game/physics.js";
import { horn } from "../audio.js";

// the UI subscribes to these
export const netHooks = {
  onGuestJoined: null,
  onGuestLeft: null,
  onHostLeft: null,
  onRemoteMode: null,
  onRematchRequest: null,
};

const STATE_MS = 50; // host sends 20 times/s
const INPUT_MS = 33; // guest sends 30 times/s
const R = Math.round;

let db = null,
  roomRef = null,
  unsubs = [],
  lastSend = 0;
let lastMode = null,
  lastF = -1; // host: what we sent last
let remote = null,
  remoteT = 0; // host: latest guest input
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
const at = (name) => child(roomRef, name); // rooms/CODE/name
function listen(r, fn) {
  unsubs.push(onValue(r, fn));
} // onValue returns an unsubscribe function

function genCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1: easy to read out loud
  let c = "";
  for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
}

// ---------- create / join / leave ----------
export async function createRoom() {
  const d = getDb();
  for (let i = 0; i < 6; i++) {
    const r = ref(d, "rooms/" + genCode());
    // only write if the code is free, even if two people try at the same moment
    const res = await runTransaction(r, (cur) =>
      cur === null ? { created: Date.now() } : undefined,
    );
    if (res.committed) {
      roomRef = r;
      onDisconnect(r).remove(); // server deletes the room if my phone drops
      lastMode = null;

      listen(at("guest"), (s) => {
        if (s.exists()) netHooks.onGuestJoined?.();
        else {
          remote = null;
          remove(at("s"));
          netHooks.onGuestLeft?.();
        }
      });
      listen(at("in"), (s) => {
        remote = s.val();
        remoteT = performance.now();
      });
      listen(at("req"), (s) => {
        if (s.val() === "rematch") {
          remove(at("req"));
          netHooks.onRematchRequest?.();
        }
      });
      return r.key; // the 4-letter code
    }
  }
  throw new Error("Could not create a room. Try again.");
}

export async function joinRoom(code) {
  const d = getDb();
  code = code.toUpperCase().trim();
  if (code.length !== 4) throw new Error("Room codes are 4 characters.");

  const r = ref(d, "rooms/" + code);
  const snap = await get(r);
  if (!snap.exists()) throw new Error("No room with that code.");

  // claim the guest slot atomically, so a third person can't also join
  const res = await runTransaction(child(r, "guest"), (cur) =>
    cur ? undefined : { joined: Date.now() },
  );
  if (!res.committed) throw new Error("That room is already full.");

  roomRef = r;
  guestF = -1;
  onDisconnect(at("guest")).remove();
  listen(at("s"), (s) => onState(s.val()));
  listen(at("created"), (s) => {
    if (!s.exists()) netHooks.onHostLeft?.();
  }); // room deleted
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
  remote = null;
  rs = null;
}

export function requestRematch() {
  if (roomRef) set(at("req"), "rematch");
}

// ---------- host side ----------
export function sendState() {
  if (!roomRef) return;
  const now = performance.now();
  const important = game.mode !== lastMode || game.faceoffN !== lastF; // send these instantly
  if (!important && now - lastSend < STATE_MS) return;
  lastSend = now;
  lastMode = game.mode;
  lastF = game.faceoffN;

  const red = players[0];
  set(at("s"), {
    p: [R(puck.x), R(puck.y), R(puck.vx), R(puck.vy)],
    r: [R(red.x), R(red.y), R(red.vx), R(red.vy)],
    sc: [...game.score],
    m: game.mode,
    g: game.goalBy,
    f: game.faceoffN,
    t: game.target,
  });
}

// put Blue where the guest says she is, guessing ahead by the message's age
export function applyRemotePlayer() {
  const b = players[1];
  if (!remote || remote.f !== game.faceoffN) {
    b.vx = b.vy = 0;
    return;
  } // she hasn't reset yet
  const age = Math.min(0.1, (performance.now() - remoteT) / 1000);
  [b.x, b.y] = clampHalf(
    1,
    remote.x + remote.vx * age,
    remote.y + remote.vy * age,
  );
  b.vx = remote.vx;
  b.vy = remote.vy;
}

// ---------- guest side ----------
function onState(s) {
  if (!s) return;
  rs = s;
  rsT = performance.now();
  game.target = s.t;

  if (s.f !== guestF) {
    // new faceoff → reset my skater, snap everything
    guestF = s.f;
    const b = players[1];
    b.x = RW / 2;
    b.y = 110;
    b.vx = b.vy = 0;
    b.tx = b.x;
    b.ty = b.y;
    puck.x = s.p[0];
    puck.y = s.p[1];
    players[0].x = s.r[0];
    players[0].y = s.r[1];
    trail.length = 0;
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
  if (now - lastSend < INPUT_MS) return;
  lastSend = now;
  const b = players[1];
  set(at("in"), { x: R(b.x), y: R(b.y), vx: R(b.vx), vy: R(b.vy), f: guestF });
}

// extrapolate (guess ahead) + interpolate (ease toward) the puck and Red
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
    } // way off → snap
    else {
      o.x += (tx - o.x) * k;
      o.y += (ty - o.y) * k;
    } // close → glide
    o.vx = a[2];
    o.vy = a[3];
  };
  follow(puck, rs.p);
  follow(players[0], rs.r);
}
