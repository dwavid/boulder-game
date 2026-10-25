# Boulder Game

A browser side-scroller: you're a boulder, squish people, avoid spikes. Plain HTML/Canvas/JS, no build step, no dependencies. The owner "vibe codes" this from phone and desktop, so keep changes small, readable and easy to test.

## Layout
- `index.html`: page, canvas, on-screen touch buttons
- `game.js`: all game code (tunables at the top in `TUNE`, level in `LEVEL`, then input, sound, update, draw, main loop)
- `PLAN.md`: concept, done list, ideas backlog. Update it when features land.
- `.github/workflows/pages.yml`: deploys the repo root to GitHub Pages on push to `main`

## Conventions
- Logical resolution is 320x180; CSS scales it with `image-rendering: pixelated`. Draw with integer coordinates and the `px()` / `disc()` helpers.
- All art is drawn in code. No image files unless the owner asks for them.
- Keep it a single `game.js` until it gets painful; then split into plain `<script>` files (no bundler).
- Game feel numbers live in `TUNE`; level layout lives in `LEVEL`. Prefer editing those over scattering magic numbers.
- Level design rules learned the hard way: checkpoints must be on solid ground (not over a pit); don't put a platform within ~50px above the ground where a spike jump happens (the boulder bonks its head); don't pack a spike right before a pit.
- Kid-friendly: squishing is cartoony (stars and confetti, no gore).

## Running and testing
- `python3 -m http.server 8000` then open http://localhost:8000
- `window.__game` exposes state for automated tests (Playwright is available in cloud sessions).
- After a change, check the browser console for errors and play through the part you changed.
