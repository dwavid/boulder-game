# Boulder Game

You're a boulder. Roll around, run over people, and don't land on spikes.

**Controls:** Arrow keys / WASD to roll, Space / Up to jump. On a phone, use the on-screen buttons.

**Run locally:** `python3 -m http.server 8000` and open http://localhost:8000

**Play online:** deployed with GitHub Pages at https://dwavid.github.io/boulder-game/ (once Pages is enabled; see below).

**Levels:** 1 Sunny Hills (spikes), 2 The Graveyard (zombies and ghosts), 3 The Castle (knights and lasers). Add `?level=3` to the URL to jump straight to a level.

See [PLAN.md](PLAN.md) for the roadmap.

## Enabling GitHub Pages (one time)
Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `/ (root)`**. After that, every push to `main` redeploys the game (give it a minute or two).
