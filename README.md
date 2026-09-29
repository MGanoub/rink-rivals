## About this project

Rink Rivals is a self-directed practice project focused on building a real-time multiplayer browser game from first principles: no game engine, no framework and no physics library. The goal was to gain a deep, hands-on understanding of how the core systems of a game work and how they fit together.

**Key engineering areas:**
- **Game loop and physics:** frame-rate-independent simulation with delta time, fixed substeps to prevent tunneling, and custom collision response for circles, walls and curved corners
- **Real-time networking:** host-authoritative architecture over Firebase Realtime Database, with client-side prediction, extrapolation and interpolation to hide latency
- **Concurrency and cleanup:** atomic transactions for room creation and joining, and server-side disconnect handling
- **Architecture:** modular ES module structure with a clear separation of rendering, game logic, UI and networking, so the network layer can be replaced (for example with an ASP.NET Core SignalR backend) without touching the rest of the game

**Development approach:** This project was developed with AI assistance, used as a pair-programming and learning tool. The work was done incrementally, one system at a time, with each part reviewed, implemented, tested on real devices and debugged before moving on. Issues found during testing, such as puck pinning in corners and guest-side latency, were diagnosed and resolved iteratively.

▶ Play it online here: **[Rink rivals](https://mganoub.github.io/rink-rivals/)**

<p align="center">
<img width="381" height="802"  alt="Screenshot 2026-09-29 184057" src="https://github.com/user-attachments/assets/93a637b3-93d4-4d52-9d82-7f7abf2d4d99" /> &nbsp; &nbsp; &nbsp;  <img width="374" height="802" alt="image" src="https://github.com/user-attachments/assets/a6aa55f6-a390-472d-954b-e504bd2244c0" />
</p>

## Features

- **Online 1v1**: create a room, share the 4-letter code, and play in real time on two phones
- **Same-phone mode**: lay the phone flat between you, each player controls one half with multi-touch
- **Practice vs computer**: a simple AI opponent that attacks, gets behind the puck and defends
- **Ice physics**: low-friction puck, bouncing boards, rounded corners, goal posts, drifting skaters
- **First to 3, 5 or 7** goals, with a saved same-phone win record
- **Sound effects** generated in code (no audio files) and vibration on goals
- **Mobile-first**: scales to any screen and stays sharp on high-DPI displays

## How to play

Drag anywhere in your half of the rink to skate. Your skater follows your finger with a bit of ice drift. Hit the puck while moving to shoot, stand still to block. Score in the goal on the other side.

---

## Tech stack

| Part | Technology |
|---|---|
| Language | Vanilla JavaScript (ES modules), HTML, CSS |
| Rendering | Canvas 2D API |
| Game loop | `requestAnimationFrame` with delta time and physics substeps |
| Input | Pointer Events (multi-touch, mouse) |
| Audio | Web Audio API (synthesized sounds) |
| Online play | Firebase Realtime Database |
| Hosting | GitHub Pages |

No build step, no bundler, no dependencies to install.

## Project structure

```
rink-rivals/
├── index.html
├── css/style.css
└── js/
    ├── main.js              # entry point and game loop
    ├── config.js            # constants: rink size, radii, colors
    ├── canvas.js            # canvas setup, world-to-screen scaling
    ├── audio.js             # synthesized sound effects
    ├── render/
    │   ├── renderer.js      # draw order, screen flip for the online guest
    │   ├── rink.js          # rink markings, goals, rounded corners
    │   ├── entities.js      # puck and skaters
    │   └── hud.js           # score and goal animation
    ├── game/
    │   ├── state.js         # shared game state
    │   ├── rules.js         # faceoffs, scoring, win condition
    │   ├── physics.js       # movement, collisions, walls
    │   ├── input.js         # touch handling
    │   └── ai.js            # computer opponent
    ├── ui/
    │   └── screens.js       # menus and overlays
    └── net/
        ├── firebase-config.js
        └── room.js          # rooms, state sync, prediction and smoothing
```

The code is split by responsibility: `render/` only draws, `game/` only computes, `ui/` handles HTML screens and `net/` is the only part that talks to Firebase.

## How online play works

```
 HOST (creates room)                       GUEST (joins with code)
 runs the real physics                     simulates only her own skater
      │  writes rooms/CODE/s  ──► Firebase ──►  reads puck, opponent, score
      │  reads  rooms/CODE/in ◄── Firebase ◄──  writes own position
```

- **Host-authoritative**: only the host runs puck physics and game rules, so both players always agree on goals and score.
- **Client-side prediction**: the guest moves her own skater instantly and sends its position about 30 times per second.
- **Extrapolation and interpolation**: the host sends state about 20 times per second; the guest predicts ahead using velocity and smoothly eases toward each update.
- **Transactions** prevent duplicate room codes and a third player joining a full room.
- **`onDisconnect`** cleans up the room on the server if a phone loses connection.
- The guest's view is rotated 180°, so each player always defends the goal at the bottom of their screen.

---

## Running it yourself

### 1. Set up Firebase
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web app** and copy its config.
3. Create a **Realtime Database** (not Firestore).
4. In the database **Rules** tab, publish:
   ```json
   {
     "rules": {
       "rooms": {
         "$code": {
           ".read": true,
           ".write": true,
           ".validate": "$code.length === 4"
         }
       }
     }
   }
   ```
5. Paste your config into `js/net/firebase-config.js`, including the `databaseURL` shown at the top of the Realtime Database page.

### 2. Run locally
Open `http://localhost:5500`. To test online play on one computer, open two separate browser **windows** (not tabs), create a room in one and join from the other.

### 3. Deploy
Push to GitHub and enable **Settings → Pages → Deploy from a branch → main / root**.

---

## Known limitations

- Online play relays through Firebase, so expect roughly 50–150 ms of latency. The host has a slight edge on puck contact.
- Rooms are protected only by their random code. Fine for casual play with friends, not a secure matchmaking system.
- The Firebase free plan allows 100 simultaneous connections and 10 GB of downloads per month, which is plenty for personal use.

## Ideas for the future

- Custom player names and colors
- Power-ups and special shots
- A C# **ASP.NET Core + SignalR** server running the physics, for lower latency and fair play
- Online win/loss history

---

*A practice project, built for fun. Feedback and suggestions are welcome.*
