# Codachi

**Code + Tomodachi**

I built Codachi so I'd have a little buddy watching over my Claude Code sessions. Drop a VRoid character in the corner of your screen — she floats above everything, reacts to what your agents are doing, and talks back in whatever personality fits the mood. Electron + Three.js + [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) under the hood.

> Sits bottom-left, always on top, and keeps you company while the AI does its thing.

---

## Requirements

- macOS (Linux / Windows untested)
- Node.js 18+
- A `.vrm` model — [VRoid Studio](https://vroid.com/studio) is free, and you can make one in an afternoon

## Quick start

```bash
git clone <repo> tomodachi
cd tomodachi
npm install
npm start
```

She shows up bottom-left. No VRM loaded yet? Drag one onto the window or click **Load VRM Model**.

---

## Controls

**Right-click the character** for the context menu:

| Action | Description |
|---|---|
| Settings… | Open the settings drawer |
| Always on Top | Toggle float-over-all-windows |
| Click-Through | Let mouse events pass through the window |
| Quit tomodachi | Exit completely |

**Menu bar icon** (top-right of screen):

| Action | Description |
|---|---|
| Show / Hide | Toggle visibility without quitting |
| Click-Through | Same as above |
| Always on Top | Same as above |
| Settings… | Open settings |
| Change Model… | Swap the VRM model |

---

## Agent states

Codachi reads `~/.claude/projects/**/*.jsonl` — the live transcripts Claude Code writes — and maps what's happening to an animation and a speech bubble phrase:

| Claude Code activity | State | Animation |
|---|---|---|
| Writing / editing files | **Typing** | notadevil (looping) |
| Reading files, glob, grep, web | **Reading** | happysynth (looping) |
| Running bash commands | **Running** | spin (looping) |
| Text-only assistant response | **Done** | peace_sign |
| Tool result with error keyword | **Error** | greeting (looping) |
| No activity for 30 s | **Waiting** | squat (looping) |
| Manually triggered | **Idle** | model_pose (looping) |
| Needs attention | **Alert** | Bling-Bang-Bang-Born |

Every state change swaps the animation and puts a new line in the speech bubble.

---

## Sessions

Codachi watches every Claude Code session you have open, all at once. Each `.jsonl` transcript gets a colored dot in the sidebar:

| Dot color | Meaning |
|---|---|
| 🟢 Green | Active session — this one drives the character. Never switches automatically. |
| 🔵 Blue | Background session got new activity. Fades back to red after 30 seconds of quiet. |
| 🔴 Red | Idle / inactive. |
| 🔴 Red (pulsing) | Something errored in that session. |

Click any dot to peek at that session's project name and state in the speech bubble.

Only the green session drives the character — background updates register as blue dots but don't interrupt anything. New sessions get picked up every 10 seconds, so no restart needed when you open a new Claude Code window.

---

## Personality

Pick how she talks about what's happening:

| Personality | Vibe | Sample (idle) |
|---|---|---|
| 🌸 Kawaii | Cute, uwu energy | `~(˘▾˘)~ chillin uwu` |
| 😏 Tsundere | Acts like she doesn't care | `...not that I care` |
| 🧠 Scholar | Precise, analytical | `in contemplation` |
| 🌙 Cozy | Calm, tea-sipping | `just vibing... ☕` |
| ⚡ Hype | Maximum energy | `READY TO GO!! 🔥` |

Swap it in the Settings drawer whenever the vibe needs to change.

---

## Themes

Four options in Settings. Each theme changes the UI palette, fonts, and the live background behind the character.

### Glass
Dark-blue frosted panel. Whatever is on your desktop bleeds through as a blurred, slightly saturated surface. Best with a colorful desktop wallpaper.

### Cute
Soft pink base with three pastel orbs (pink, lavender, rose) that drift independently across. Each orb follows its own path with a slow-floating ambient light.

### Terminal
Dark scanline grid with a phosphor-green palette. The background slot accepts a **looping video or GIF** — load a `.mp4`, `.webm`, or `.gif` from Settings (Matrix rain, CRT noise, etc). The file path persists between launches and reloads automatically on startup. Without a file loaded the dark scanline pattern shows.

### Airy
Warm off-white with a golden shimmer that sweeps across the viewport on a slow loop — a wide light band (110° angle) sliding through. Earth-toned accents.

---

### Background at a glance

| Theme | Background type | User upload |
|---|---|---|
| Glass | Frosted `backdrop-filter` blur | — |
| Cute | Animated CSS orbs (`@property`) | — |
| Terminal | Looping video / GIF | `.mp4` `.webm` `.gif` |
| Airy | CSS shimmer sweep | — |
| Default (dark) | Static image slideshow (up to 8) | `.jpg` `.png` `.webp` etc |

---

## Your VRM model

Drag any `.vrm` file onto the window or hit **Load VRM Model**. The path sticks between launches.

Want custom animations per state? Go to **Settings → Animation Per State** and assign your own `.vrma` clips. Anything without a custom clip falls back to the built-ins.

---

## Hotkeys

Configurable in Settings. Defaults:

| Action | Shortcut |
|---|---|
| Toggle show/hide | `⌘⇧P` |
| Trigger wave | `⌘⇧W` |
| Trigger sleep | `⌘⇧S` |

---

## Development

```bash
npm start       # run normally
npm run dev     # run with DevTools attached
```

To simulate a Claude Code event (appends a fake tool-use line to a test transcript):

```bash
node -e "
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(os.homedir(), '.claude', 'projects', '_tomodachi-test');
fs.mkdirSync(dir, { recursive: true });
const fp  = path.join(dir, 'sim.jsonl');
const line = JSON.stringify({
  message: { role: 'assistant', content: [{ type: 'tool_use', name: 'bash' }] }
});
fs.appendFileSync(fp, line + '\n');
console.log('Event written →', fp);
"
```

Valid tool names: `bash`, `read_file`, `write_file`, `str_replace`, `str_replace_based_edit_tool`, `create_file`, `glob`, `grep`, `web_search`, `web_fetch`, and more. Full map in [`src/transcript-watcher.js`](src/transcript-watcher.js).

---

## Project layout

```
src/               Main process — Electron windows, IPC, tray, config, transcript watcher
renderer/          Renderer process — HTML, CSS, Three.js scene, VRM/VRMA, UI
renderer/assets/   Emote SVGs and built-in VRMA animation clips
```

---

## Build

```bash
npm run build:mac    # DMG + ZIP
npm run build:win    # NSIS installer
npm run build:linux  # AppImage + deb
```
