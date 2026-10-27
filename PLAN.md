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
- [x] Gamepad support (stick/D-pad to move, A or Start to jump, D-pad down or shoulder to smash)
- [x] Level 2: the Graveyard (night, zombies that shamble toward you, slow floating ghosts instead of spikes)
- [x] Level 3: the Castle (brick halls with torches and banners, knights with red feathers, laser gates and sweeping lasers instead of spikes)
- [x] Boss: the Giant Knight at the end of the Castle (land on his head from the ledges; his sword only reaches the ground)
- [x] Smash move: jump, then press down (▼ button on phones) to ground-pound; breaks sand (reusable for other smashable things)
- [x] Landing puffs: a small dust splash when you land from a jump; in Watertopia, bubbles float up when you jump and land
- [x] Level 3 ending: the boss drops a key, smash the sand, unlock the brick floor and cage, free the baby rock, and roll off together
- [x] Portrait mode on phones: tall, narrow view with the buttons underneath (landscape unchanged)
- [x] Level 4: Braintopia (inside a brain: little brains instead of people, blinking synapse zaps, and the Big Brain boss who calls down lightning columns)
- [x] Level 4 ending: the Big Brain drops a key, smash the pile of bones, unlock the bone floor and bone cage, free an even smaller baby pebble (who talks about synapses)
- [x] Level 5: Watertopia (underwater: little water monsters, and hydrothermal vents that bubble, glow, then shoot a scalding column you wait out)
- [x] Level 5 boss: the Water Genie (horns, chained wrists, shoots water bolts; ground pound his tail to hurt him)
- [x] Level 5 ending: the Water Genie drops a key, smash the coral, unlock the coral floor and coral cage, free another baby rock (who only says "blublub bublub bub bubble lub blub"; real dialogue still to come)
- [x] Level progression: beat a level to unlock the next; game over retries the same level
- [x] Sound: cartoony squish, charge-up and zap/laser/whoosh sounds for lasers, synapses and vents, calm chiptune loop, boss loop, mute (M)

## Ideas backlog (add yours here!)
- [ ] Level 5 and beyond (ideas: ice cave, lava, candy land, space) and a proper level select screen
- [ ] Boulder gets bigger (or faster) as it squishes people
- [ ] More kinds of enemies: runners, archers who shoot back, people who throw things
- [ ] More things to smash (crates, ice, cracked floors that hide secrets) and a proper story ending for the baby rock
- [ ] Power-ups (rocket boulder, bouncy boulder)
- [ ] Bosses for levels 1 and 2 (ideas: a giant ghost, a zombie king)
- [ ] Better title screen, boulder name, and a high-score list
- [ ] Different music for each level (so far: one calm loop for every level and one intense boss loop)
- [ ] Hand-drawn pixel sprites (swap the code-drawn art for spritesheets)

## How we work
Describe what you want in plain English from any device, Claude changes the code, and we test it on the live page. See `CLAUDE.md` for the project conventions.
