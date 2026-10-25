# BOULD — Plan

**Concept (from the kid who invented it):** you're a boulder. Roll around, run over people, and don't land on spikes.

**Style:** chunky pixel art, cute and cartoony (inspired by Dadish). All art is drawn in code, so there are no image files to manage.

**Tech:** plain HTML + Canvas + JavaScript. No build step, no dependencies. Hosted on GitHub Pages.

## Done
- [x] Rolling boulder with momentum, jump (variable height, coyote time, jump buffering)
- [x] Scrolling level with platforms, pits and spikes
- [x] People who wander, panic when you get close, and get squished (+ decals, particles, sound)
- [x] Spikes and pits cost a life, with checkpoints
- [x] Lives, score, win/game-over screens
- [x] Keyboard and touch controls (phone friendly)
- [x] Level 2: the Graveyard (night, zombies that shamble toward you, slow floating ghosts instead of spikes)
- [x] Level 3: the Castle (brick halls with torches and banners, knights with red feathers, laser gates and sweeping lasers instead of spikes)
- [x] Boss: the Giant Knight at the end of the Castle (land on his head from the ledges; his sword only reaches the ground)
- [x] Smash move: jump, then press down (▼ button on phones) to ground-pound; breaks sand (reusable for other smashable things)
- [x] Level 3 ending: the boss drops a key, smash the sand, unlock the brick floor and cage, free the baby rock, and roll off together
- [x] Level progression: beat a level to unlock the next; game over retries the same level

## Ideas backlog (add yours here!)
- [ ] Level 4 and beyond (ideas: ice cave, lava, candy land, space) and a proper level select screen
- [ ] Boulder gets bigger (or faster) as it squishes people
- [ ] More kinds of enemies: runners, archers who shoot back, people who throw things
- [ ] More things to smash (crates, ice, cracked floors that hide secrets) and a proper story ending for the baby rock
- [ ] Power-ups (rocket boulder, bouncy boulder)
- [ ] Bosses for levels 1 and 2 (ideas: a giant ghost, a zombie king)
- [ ] Better title screen, boulder name, and a high-score list
- [ ] Music
- [ ] Hand-drawn pixel sprites (swap the code-drawn art for spritesheets)

## How we work
Describe what you want in plain English from any device, Claude changes the code, and we test it on the live page. See `CLAUDE.md` for the project conventions.
