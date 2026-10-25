# Boulder Game

A browser side-scroller: you're a boulder, squish people, avoid spikes. Plain HTML/Canvas/JS, no build step, no dependencies. The owner "vibe codes" this from phone and desktop, so keep changes small, readable and easy to test.

## Layout
- `index.html`: page, canvas, on-screen touch buttons
- `game.js`: all game code (tunables at the top in `TUNE`, levels in the `LEVELS` array, then input, sound, update, draw, main loop)
- `PLAN.md`: concept, done list, ideas backlog. Update it when features land.
- Hosting: GitHub Pages deploys the repo root from the `main` branch (no workflow file needed)

## Conventions
- Logical resolution is 320x180; CSS scales it with `image-rendering: pixelated`. Draw with integer coordinates and the `px()` / `disc()` helpers.
- All art is drawn in code. No image files unless the owner asks for them.
- Keep it a single `game.js` until it gets painful; then split into plain `<script>` files (no bundler).
- Game feel numbers live in `TUNE`; level layout lives in the `LEVELS` array (`LEVEL` is the current one). Prefer editing those over scattering magic numbers.
- Adding a level: append an object to `LEVELS` (name, theme `'day'`/`'night'`/`'castle'`, `kind` of person `'person'`/`'zombie'`/`'knight'`, hint, width, solids, and any of spikes / ghosts / lasers, people, checkpoints, goalX). `kind` picks how people look and act: people flee, zombies shamble toward you, knights march and raise their sword when you're close. A new theme needs a background function, a `SOLID_STYLE` entry, a pit style in `drawPits` and (for scenery) a `DECOR_KINDS` entry; a new kind of person needs a draw function in `DRAW_PERSON`, a `SQUISH_COLORS` entry and behavior in `updatePeople`.
- Ghosts are `[centerX, centerY, patrolRange, phase]`. They patrol back and forth, and when you come within `ghostChaseRadius` (6 boulder lengths) they drift toward you sideways only, never farther than `ghostLeash` past their patrol. They kill on touch like spikes. Placement rules: ground ghosts at centerY ~136 (you jump over them); never put a ghost's reach (patrol + leash) under a raised platform, since the low gap is a tunnel you can't jump in; keep their patrol 50px+ from pit edges; keep every checkpoint 40px+ from any ghost's reach.
- Lasers (level 3): `['gate', x, phase]` blinks floor-to-ceiling (off, 30-frame yellow warning, then deadly for 90 frames) and can't be jumped, so you wait for it to turn off; `['sweep', x, width, phase]` is a beam bobbing slowly between y~90 and y~144, so you go under when it's high or hop over when it's low. Keep lasers 80px+ from pits, keep checkpoints 60px+ from lasers, keep lasers out from under platforms, and leave a safe gap of 120px+ between two gates. People never walk through lasers (`walkLimits`). Use `phase` to offset timing between neighbors.
- Platforms you must jump onto should have a top at y >= 108 (jump height is ~50px).
- Level design rules learned the hard way: checkpoints must be on solid ground (not over a pit); don't put a platform within ~50px above the ground where a spike jump happens (the boulder bonks its head); don't pack a spike right before a pit.
- Spikes on a floating platform only make sense if the platform is long enough to jump over them (roughly spike width + 60px of platform on each side). Otherwise leave the platform spike-free.
- People never walk onto spikes or through lasers (`walkLimits` trims their walk range), so no extra work is needed when adding them.
- Pits are drawn automatically as the gaps between ground pieces (`drawPits`: dark void, glowing bottom, mist). Keep pits <= 60px wide.
- Kid-friendly: squishing is cartoony (stars and confetti, no gore).

## Running and testing
- `python3 -m http.server 8000` then open http://localhost:8000
- Jumping to a level: `index.html?level=2`; on the title screen pressing 1, 2, ... works; or click/tap the "LEVEL n" label at the top of the screen 3 times quickly to open a level picker (pauses the game; works mid-game; Esc or tapping outside closes it). The picker lists every entry in `LEVELS` automatically.
- `window.__game` exposes state for automated tests (Playwright is available in cloud sessions).
- After a change, check the browser console for errors and play through the part you changed.
