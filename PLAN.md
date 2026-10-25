# Boulder Game — Plan

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

## Ideas backlog (add yours here!)
- [ ] More levels / level select
- [ ] Boulder gets bigger (or faster) as it squishes people
- [ ] Different people: knights with shields, runners, people who throw things
- [ ] Power-ups (rocket boulder, bouncy boulder)
- [ ] Boss at the end of a level
- [ ] Better title screen, boulder name, and a high-score list
- [ ] Music
- [ ] Hand-drawn pixel sprites (swap the code-drawn art for spritesheets)

## How we work
Describe what you want in plain English from any device, Claude changes the code, and we test it on the live page. See `CLAUDE.md` for the project conventions.
