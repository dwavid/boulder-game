'use strict';
// Boulder Game — roll around, squish people, avoid spikes.
// Everything is drawn with code (no image files). Logical screen is 320x180,
// scaled up by CSS with crisp pixels.

const W = 320, H = 180;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- Tunables (tweak these to change how the game feels) ----------
const TUNE = {
  gravity: 0.28,
  jump: 5.4,
  accel: 0.4,
  airAccel: 0.3,
  maxSpeed: 2.2,
  friction: 0.4,
  radius: 9,
  lives: 3,
  fleeRadius: 70,
  fleeSpeed: 0.9,
  chaseRadius: 80, // zombies shamble toward you from this far away
  chaseSpeed: 0.4,
  ghostRadius: 5,
  ghostSpeed: 0.018, // how fast ghosts drift back and forth (smaller = slower)
  ghostChaseRadius: 108, // ghosts notice you within 6 boulder lengths (the boulder is 18px wide)
  ghostChaseSpeed: 0.6, // slow, so you can always outrun them (boulder top speed is 2.2)
  ghostLeash: 40, // a chasing ghost never strays more than this past the ends of its patrol
  knightAlertRadius: 70, // knights stop marching and raise their sword when you're this close
  gateCycle: 240, // laser gates: off, then a 30-frame warning, then on for 90 frames, repeating
  gateWarnAt: 120,
  gateOnAt: 150,
  sweepSpeed: 0.03, // how fast the sweeping lasers bob up and down
};

// ---------- Level ----------
// Solid rectangles are [x, y, w, h]. Ground top is y=150.
const GROUND_Y = 150;
const LEVELS = [{
  name: 'SUNNY HILLS', theme: 'day', kind: 'person', hint: 'Roll over people. Dodge spikes!',
  width: 2900,
  solids: [
    [0, GROUND_Y, 480, 30], [540, GROUND_Y, 320, 30], [920, GROUND_Y, 380, 30],
    [1360, GROUND_Y, 440, 30], [1860, GROUND_Y, 440, 30], [2360, GROUND_Y, 540, 30],
    // floating platforms and steps
    [620, 112, 60, 8], [1010, 104, 50, 8], [1500, 130, 40, 20], [1540, 112, 40, 38],
    [1960, 108, 70, 8], [2480, 100, 50, 8],
  ],
  // spikes: [x, width] on the ground (or [x, width, y] for a custom floor)
  spikes: [
    [300, 24], [720, 16], [1090, 32], [1210, 16], [1420, 24], [1650, 32],
    [2080, 24], [2200, 16], [2560, 40],
  ],
  // people: [x, floorY, walkMin, walkMax]
  people: [
    [180, GROUND_Y, 120, 260], [400, GROUND_Y, 360, 460], [600, GROUND_Y, 570, 700],
    [640, 112, 622, 676], [800, GROUND_Y, 760, 850], [960, GROUND_Y, 940, 1050],
    [1030, 104, 1012, 1056], [1180, GROUND_Y, 1140, 1230], [1380, GROUND_Y, 1370, 1410],
    [1580, 112, 1545, 1575], [1720, GROUND_Y, 1690, 1790], [1900, GROUND_Y, 1870, 1950],
    [1990, 108, 1965, 2025], [2140, GROUND_Y, 2110, 2190], [2300, GROUND_Y, 2260, 2295],
    [2420, GROUND_Y, 2380, 2470], [2500, 100, 2485, 2525], [2680, GROUND_Y, 2630, 2760],
  ],
  checkpoints: [940, 1880, 2380],
  goalX: 2820,
}, {
  name: 'THE GRAVEYARD', theme: 'night', kind: 'zombie', hint: 'Squish the zombies. Dodge the ghosts!',
  width: 3200,
  solids: [
    [0, GROUND_Y, 620, 30], [670, GROUND_Y, 520, 30], [1240, GROUND_Y, 700, 30],
    [1990, GROUND_Y, 520, 30], [2560, GROUND_Y, 640, 30],
    // crypt roofs and tombstone steps
    [880, 112, 90, 8], [1500, 108, 140, 8], [1700, 132, 30, 18], [1730, 114, 30, 36], [2300, 108, 80, 8],
  ],
  // ghosts float back and forth slowly: [centerX, centerY, patrolRange, phase]
  ghosts: [
    [360, 136, 36, 0], [1060, 136, 36, 4], [1570, 94, 25, 3], [2150, 136, 36, 2], [2900, 136, 36, 1],
  ],
  // zombies: [x, floorY, walkMin, walkMax]
  people: [
    [150, GROUND_Y, 100, 260], [300, GROUND_Y, 250, 430], [520, GROUND_Y, 450, 600],
    [740, GROUND_Y, 700, 860], [920, 112, 895, 965], [950, GROUND_Y, 900, 1100],
    [1120, GROUND_Y, 1080, 1180], [1300, GROUND_Y, 1260, 1340], [1540, GROUND_Y, 1500, 1650],
    [1800, GROUND_Y, 1770, 1900], [2060, GROUND_Y, 2010, 2200], [2340, 108, 2310, 2370],
    [2440, GROUND_Y, 2400, 2490], [2780, GROUND_Y, 2740, 2840], [2980, GROUND_Y, 2940, 3060],
  ],
  checkpoints: [1260, 2020, 2600],
  goalX: 3120,
}, {
  name: 'THE CASTLE', theme: 'castle', kind: 'knight', hint: 'Squish the knights. Dodge the lasers!',
  width: 3400,
  solids: [
    [0, GROUND_Y, 700, 30], [750, GROUND_Y, 750, 30], [1550, GROUND_Y, 850, 30], [2450, GROUND_Y, 950, 30],
    // stone ledges and steps
    [420, 112, 100, 8], [1020, 108, 90, 8], [1830, 108, 110, 8], [2200, 132, 30, 18], [2230, 114, 30, 36],
  ],
  // lasers: ['gate', x, phase] blinks on and off from ceiling to floor (wait for it to go off, then roll through);
  //         ['sweep', x, width, phase] is a beam that slowly bobs up and down (go under when high, hop over when low)
  lasers: [
    ['gate', 330, 0], ['gate', 600, 120], ['sweep', 880, 70, 0], ['gate', 1180, 60],
    ['sweep', 1700, 80, 100], ['gate', 1950, 0], ['gate', 2100, 120], ['sweep', 2650, 70, 50], ['gate', 2900, 90],
  ],
  // knights: [x, floorY, walkMin, walkMax]
  people: [
    [150, GROUND_Y, 100, 280], [460, 112, 430, 510], [480, GROUND_Y, 380, 540], [660, GROUND_Y, 640, 690],
    [800, GROUND_Y, 770, 850], [1060, 108, 1030, 1100], [1000, GROUND_Y, 960, 1110], [1300, GROUND_Y, 1230, 1420],
    [1620, GROUND_Y, 1570, 1650], [1880, 108, 1840, 1930], [1800, GROUND_Y, 1790, 1900],
    [2030, GROUND_Y, 2010, 2060], [2330, GROUND_Y, 2260, 2380], [2530, GROUND_Y, 2470, 2600],
    [2780, GROUND_Y, 2730, 2840], [3050, GROUND_Y, 2960, 3150],
  ],
  checkpoints: [790, 1600, 2490],
  goalX: 3250,
}];

// Scenery scattered on solid ground; drawn behind everything.
const DECOR_KINDS = {
  night: ['stone', 'cross', 'tree', 'stone', 'fence'],
  castle: ['barrel', 'brazier', 'crate', 'barrel', 'crate'],
};
function genDecor(level) {
  const out = [];
  const onGround = (x) => level.solids.some(([sx, sy, sw]) => sy === GROUND_Y && x > sx + 8 && x < sx + sw - 8);
  for (let x = 70, i = 0; x < level.width - 60; x += 38 + ((i * 37) % 31), i++) {
    if (!onGround(x)) continue;
    if (level.checkpoints.some((c) => Math.abs(c - x) < 24) || Math.abs(level.goalX - x) < 24) continue;
    out.push([x, DECOR_KINDS[level.theme][i % 5]]);
  }
  return out;
}
LEVELS.forEach((l) => {
  l.spikes = l.spikes || [];
  l.ghosts = l.ghosts || [];
  l.lasers = l.lasers || [];
  l.decor = l.theme === 'day' ? [] : genDecor(l);
});
let levelIndex = 0, LEVEL = LEVELS[0];
function setLevel(i) { levelIndex = i; LEVEL = LEVELS[i]; }
// Visit index.html?level=2 to start on a given level; on the title screen, press 1, 2, ... to pick one.
{
  const n = parseInt(new URLSearchParams(location.search).get('level'), 10);
  if (n >= 1 && n <= LEVELS.length) setLevel(n - 1);
}

// ---------- Input ----------
const input = { left: false, right: false, jump: false, jumpPressed: false };
const keyMap = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
};
function setInput(name, down) {
  if (name === 'jump' && down && !input.jump) input.jumpPressed = true;
  input[name] = down;
}
addEventListener('keydown', (e) => {
  const n = keyMap[e.key];
  if (n) { e.preventDefault(); setInput(n, true); audioInit(); }
  else if ((state !== 'play' || menuOpen) && LEVELS[+e.key - 1]) pickLevel(+e.key - 1);
  else if (e.key === 'Escape') menuOpen = false;
});
addEventListener('keyup', (e) => {
  const n = keyMap[e.key];
  if (n) setInput(n, false);
});
document.querySelectorAll('#controls button').forEach((b) => {
  const n = b.dataset.key;
  const down = (e) => { e.preventDefault(); b.classList.add('on'); setInput(n, true); audioInit(); };
  const up = (e) => { e.preventDefault(); b.classList.remove('on'); setInput(n, false); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
});
// Secret level picker: tap/click the "LEVEL n" label at the top of the screen 3 times quickly.
// (The label is drawn on the canvas, so we work out where on the canvas the pointer landed.)
let menuOpen = false, hudTaps = [];
const HUD_LABEL = { x: 120, y: 0, w: 80, h: 20 };
const menuRow = (i) => { const h = Math.min(24, 96 / LEVELS.length); return { x: 70, y: 56 + i * h, w: 180, h: h - 3 }; };
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function pickLevel(i) { menuOpen = false; setLevel(i); startGame(); }

canvas.addEventListener('pointerdown', (e) => {
  audioInit();
  const box = canvas.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * W, y = ((e.clientY - box.top) / box.height) * H;
  if (menuOpen) {
    const i = LEVELS.findIndex((_, k) => inRect(x, y, menuRow(k)));
    if (i >= 0) pickLevel(i); else menuOpen = false; // tapping outside the rows closes it
    return;
  }
  if (inRect(x, y, HUD_LABEL)) {
    const now = performance.now();
    hudTaps = hudTaps.filter((t) => now - t < 700).concat(now); // keep taps from the last 0.7 seconds
    if (hudTaps.length >= 3) { menuOpen = true; hudTaps = []; }
    return;
  }
  if (state !== 'play') input.jumpPressed = true;
});

// ---------- Sound (tiny synth beeps) ----------
let actx = null;
function audioInit() {
  if (!actx && (window.AudioContext || window.webkitAudioContext)) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep(freq, dur, type = 'square', vol = 0.05, slide = 0) {
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  jump: () => beep(300, 0.15, 'square', 0.04, 300),
  squish: () => beep(500, 0.12, 'square', 0.06, -380),
  die: () => beep(400, 0.5, 'sawtooth', 0.06, -350),
  win: () => { beep(523, 0.15); setTimeout(() => beep(659, 0.15), 120); setTimeout(() => beep(784, 0.3), 240); },
  checkpoint: () => beep(700, 0.15, 'triangle', 0.06, 300),
};

// Confetti colors when you squish someone, by kind of person.
const SQUISH_COLORS = {
  person: ['#ffe14d', '#fff', '#ff7ab8'],
  zombie: ['#9be07a', '#eaeaea', '#c9b8ff'],
  knight: ['#c8d2e6', '#ffffff', '#e8303a'],
};

// ---------- Game state ----------
let state = 'title'; // title | play | win | gameover
let boulder, people, ghosts, particles, decals, floaters, lives, squished, deadTimer, spawnX, camX, frame = 0, introTimer = 0;

// People never walk onto spikes or through lasers: trim each walk range at the nearest one on their floor.
function walkLimits(x, floorY, min, max) {
  const blocks = [
    ...LEVEL.spikes,
    ...LEVEL.lasers.map((l) => (l[0] === 'gate' ? [l[1] - 4, 8] : [l[1], l[2]])),
  ];
  for (const [sx, sw, sy = GROUND_Y] of blocks) {
    if (sy !== floorY || sx + sw < min || sx > max) continue;
    if (sx > x) max = Math.min(max, sx - 5); else min = Math.max(min, sx + sw + 5);
  }
  return [min, max];
}

function resetRun() {
  lives = TUNE.lives; squished = 0; spawnX = 40;
  people = LEVEL.people.map(([x, floorY, lo, hi]) => {
    const [min, max] = walkLimits(x, floorY, lo, hi);
    return {
      x, floorY, min, max, dir: Math.random() < 0.5 ? -1 : 1,
      speed: 0.25 + Math.random() * 0.2, hue: Math.floor(Math.random() * 5), alive: true, scared: false,
    };
  });
  ghosts = LEVEL.ghosts.map(([cx, cy, range, phase]) => ({ cx, cy, range, phase, x: cx, y: cy, face: 1, chase: false }));
  decals = [];
  respawn();
}
function respawn() {
  boulder = { x: spawnX, y: GROUND_Y - 30, vx: 0, vy: 0, rot: 0, onGround: false, coyote: 0, jumpBuf: 0, face: 1, age: 0 };
  for (const g of ghosts) { [g.x, g.y] = ghostHome(g); g.chase = false; } // ghosts go back to their patrol
  particles = []; floaters = []; deadTimer = 0;
  camX = Math.max(0, spawnX - 110);
}
function startGame() { resetRun(); state = 'play'; introTimer = 150; input.jumpPressed = false; }
resetRun();

// ---------- Update ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function spawnBurst(x, y, colors, n, power = 1.6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * power;
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: 25 + Math.random() * 20, color: colors[i % colors.length], size: Math.random() < 0.3 ? 2 : 1,
    });
  }
}

function die() {
  deadTimer = 70;
  sfx.die();
  spawnBurst(boulder.x, boulder.y, ['#8a8a96', '#b9b9c6', '#5d5d69'], 24, 2.4);
}

// Where a ghost's back-and-forth patrol (with a little bobbing) has it right now: [x, y].
function ghostHome({ cx, cy, range, phase }) {
  return [cx + Math.sin(frame * TUNE.ghostSpeed + phase) * range, cy + Math.sin(frame * 0.05 + phase) * 3];
}

// Ghosts patrol until you come within ghostChaseRadius, then drift toward you. When you get
// away (a bit past the radius) they float back to their patrol. They get a short grace
// period after you respawn so you can never be ambushed instantly.
function updateGhosts() {
  const b = boulder, hunting = state === 'play' && deadTimer === 0 && b.age > 60;
  for (const g of ghosts) {
    const dist = Math.hypot(b.x - g.x, b.y - g.y);
    g.chase = hunting && dist < TUNE.ghostChaseRadius * (g.chase ? 1.25 : 1);
    let tx, ty, speed;
    // chasing ghosts only drift sideways at their usual height, so a well-timed jump always clears them
    if (g.chase) {
      tx = clamp(b.x, g.cx - g.range - TUNE.ghostLeash, g.cx + g.range + TUNE.ghostLeash);
      ty = ghostHome(g)[1]; speed = TUNE.ghostChaseSpeed;
    }
    else { [tx, ty] = ghostHome(g); speed = 1; }
    const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
    const step = Math.min(speed, d);
    if (d > 0.001) { g.x += (dx / d) * step; g.y += (dy / d) * step; }
    if (Math.abs(dx) > 0.2) g.face = dx > 0 ? 1 : -1;
  }
}

// Laser gates blink: 'off' (safe), 'warn' (safe, about to fire), 'on' (deadly). `ahead` looks into the future.
function gateState(phase, ahead = 0) {
  const t = (frame + ahead + phase) % TUNE.gateCycle;
  return t >= TUNE.gateOnAt ? 'on' : t >= TUNE.gateWarnAt ? 'warn' : 'off';
}
const sweepY = (phase, ahead = 0) => 117 + Math.sin((frame + ahead + phase) * TUNE.sweepSpeed) * 27;

function laserHits(l, cx, cy, r) {
  if (l[0] === 'gate') return gateState(l[2]) === 'on' && hitsCircleRect(cx, cy, r, l[1] - 2, 14, 5, GROUND_Y - 14);
  return hitsCircleRect(cx, cy, r, l[1], sweepY(l[3]) - 2, l[2], 4);
}

function hitsCircleRect(cx, cy, r, rx, ry, rw, rh) {
  const px = clamp(cx, rx, rx + rw), py = clamp(cy, ry, ry + rh);
  const dx = cx - px, dy = cy - py;
  return dx * dx + dy * dy < r * r;
}

function updateBoulder() {
  const b = boulder, r = TUNE.radius;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const acc = b.onGround ? TUNE.accel : TUNE.airAccel;
  if (dir) { b.vx += dir * acc; b.face = dir; }
  else if (b.onGround) {
    b.vx = Math.abs(b.vx) < TUNE.friction ? 0 : b.vx - Math.sign(b.vx) * TUNE.friction;
  }
  b.vx = clamp(b.vx, -TUNE.maxSpeed, TUNE.maxSpeed);

  if (input.jumpPressed) { b.jumpBuf = 6; input.jumpPressed = false; }
  if (b.jumpBuf > 0 && b.coyote > 0) {
    b.vy = -TUNE.jump; b.coyote = 0; b.jumpBuf = 0; b.onGround = false; sfx.jump();
  }
  if (!input.jump && b.vy < -2.2) b.vy = -2.2; // release early = short hop
  b.jumpBuf--;

  b.vy += TUNE.gravity;
  b.vy = Math.min(b.vy, 7);
  b.x += b.vx; b.y += b.vy;
  b.x = Math.max(r, b.x);

  b.onGround = false;
  for (const [sx, sy, sw, sh] of LEVEL.solids) {
    const cx = clamp(b.x, sx, sx + sw), cy = clamp(b.y, sy, sy + sh);
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let nx, ny, pen;
    if (d2 > 0.0001) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = r - d; }
    else { nx = 0; ny = -1; pen = r + (b.y - sy); }
    b.x += nx * pen; b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const bounce = vn < -3 ? 0.25 : 0;
      b.vx -= (1 + bounce) * vn * nx;
      b.vy -= (1 + bounce) * vn * ny;
    }
    if (ny < -0.6) b.onGround = true;
  }
  b.coyote = b.onGround ? 6 : b.coyote - 1;
  b.age++;
  b.rot += b.vx / r;

  // spikes
  for (const [sx, sw, sy = GROUND_Y] of LEVEL.spikes) {
    if (hitsCircleRect(b.x, b.y, r - 1, sx + 1, sy - 5, sw - 2, 5)) { die(); return; }
  }
  // lasers
  for (const l of LEVEL.lasers) if (laserHits(l, b.x, b.y, r - 1)) { die(); return; }
  // ghosts
  for (const g of ghosts) {
    const reach = r - 1 + TUNE.ghostRadius;
    if ((b.x - g.x) ** 2 + (b.y - g.y) ** 2 < reach * reach) { die(); return; }
  }
  // pits
  if (b.y > H + 30) { die(); return; }

  // people
  for (const p of people) {
    if (!p.alive) continue;
    if (hitsCircleRect(b.x, b.y, r, p.x - 3, p.floorY - 10, 6, 10)) {
      p.alive = false; squished++;
      decals.push({ x: p.x, y: p.floorY, hue: p.hue });
      spawnBurst(p.x, p.floorY - 5, SQUISH_COLORS[LEVEL.kind], 10, 1.4);
      floaters.push({ x: p.x, y: p.floorY - 14, text: '+1', life: 40 });
      sfx.squish();
    }
  }

  // checkpoints & goal
  for (const cp of LEVEL.checkpoints) {
    if (b.x > cp && spawnX < cp) { spawnX = cp; sfx.checkpoint(); floaters.push({ x: cp, y: GROUND_Y - 30, text: 'CHECKPOINT', life: 60 }); }
  }
  if (b.x > LEVEL.goalX) { state = 'win'; sfx.win(); }
}

function updatePeople() {
  for (const p of people) {
    if (!p.alive) continue;
    const dx = p.x - boulder.x;
    if (LEVEL.kind === 'zombie') { // zombies shamble toward you instead of running away
      const chase = Math.abs(dx) < TUNE.chaseRadius && Math.abs(boulder.y - p.floorY) < 40;
      if (chase) p.dir = dx >= 0 ? -1 : 1;
      else if (Math.random() < 0.005) p.dir *= -1;
      p.x += p.dir * (chase ? TUNE.chaseSpeed : p.speed);
      if (p.x < p.min) { p.x = p.min; if (!chase) p.dir = 1; }
      if (p.x > p.max) { p.x = p.max; if (!chase) p.dir = -1; }
      continue;
    }
    if (LEVEL.kind === 'knight') { // knights march back and forth, and stand firm with sword up when you get close
      p.scared = Math.abs(dx) < TUNE.knightAlertRadius && Math.abs(boulder.y - p.floorY) < 40;
      if (p.scared) p.dir = dx >= 0 ? -1 : 1;
      else {
        p.x += p.dir * p.speed;
        if (p.x < p.min) { p.x = p.min; p.dir = 1; }
        if (p.x > p.max) { p.x = p.max; p.dir = -1; }
      }
      continue;
    }
    const near = Math.abs(dx) < TUNE.fleeRadius && Math.abs(boulder.y - p.floorY) < 40;
    p.scared = near;
    if (near) p.dir = dx >= 0 ? 1 : -1;
    else if (Math.random() < 0.005) p.dir *= -1;
    const sp = near ? TUNE.fleeSpeed : p.speed;
    p.x += p.dir * sp;
    if (p.x < p.min) { p.x = p.min; if (!near) p.dir = 1; }
    if (p.x > p.max) { p.x = p.max; if (!near) p.dir = -1; }
  }
}

function updateFx() {
  for (const q of particles) { q.x += q.vx; q.y += q.vy; q.vy += 0.1; q.life--; }
  particles = particles.filter((q) => q.life > 0);
  for (const f of floaters) { f.y -= 0.3; f.life--; }
  floaters = floaters.filter((f) => f.life > 0);
}

function update() {
  frame++;
  if (menuOpen) { input.jumpPressed = false; return; } // the level picker pauses the game
  if (state === 'play') {
    if (deadTimer > 0) {
      deadTimer--;
      if (deadTimer === 0) {
        lives--;
        if (lives < 0) state = 'gameover'; else respawn();
      }
    } else {
      updateBoulder();
      updatePeople();
    }
    if (introTimer > 0) introTimer--;
  } else if (input.jumpPressed) {
    // after a win go to the next level (wrapping to level 1); after game over retry the same one
    if (state === 'win') setLevel((levelIndex + 1) % LEVELS.length);
    startGame();
  }
  updateGhosts();
  updateFx();
  const target = clamp(boulder.x - 110, 0, LEVEL.width - W);
  camX += (target - camX) * 0.15;
}

// ---------- Drawing ----------
const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + 0.5));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

const hillH = (wx) => 28 + Math.sin(wx * 0.02) * 10 + Math.sin(wx * 0.047) * 5;

function drawBackground() {
  ({ day: drawDayBackground, night: drawNightBackground, castle: drawCastleBackground })[LEVEL.theme]();
}

function drawNightBackground() {
  ['#0b1030', '#121a4a', '#1b2760', '#26337a'].forEach((c, i) => px(0, i * 38, W, 38, c));
  // twinkling stars
  for (let i = 0; i < 45; i++) {
    const x = (((i * 97 - camX * 0.05) % W) + W) % W, y = (i * 37) % 105;
    if (((frame >> 4) + i) % 7 !== 0) px(x, y, 1, 1, i % 4 === 0 ? '#fff6b0' : '#cfd8ff');
  }
  // moon
  disc(252, 36, 19, 'rgba(244,239,200,0.12)');
  disc(252, 36, 14, '#f4efc8');
  px(246, 30, 4, 3, '#dcd6a8'); px(256, 38, 5, 4, '#dcd6a8'); px(248, 43, 3, 2, '#dcd6a8');
  // far hills with tombstone, cross and dead-tree silhouettes
  const far = camX * 0.4;
  for (let sx = 0; sx < W; sx++) px(sx, GROUND_Y - hillH(sx + far) + 6, 1, hillH(sx + far) - 6, '#1b2552');
  for (let k = Math.floor(far / 53); k < Math.floor(far / 53) + 8; k++) {
    const sx = k * 53 - far, base = GROUND_Y - hillH(k * 53) + 6, kind = k % 4;
    if (kind === 0) { px(sx - 3, base - 10, 6, 10, '#141b42'); px(sx - 2, base - 12, 4, 2, '#141b42'); }
    else if (kind === 1) { px(sx - 1, base - 14, 2, 14, '#141b42'); px(sx - 4, base - 11, 8, 2, '#141b42'); }
    else if (kind === 2) { px(sx - 1, base - 22, 3, 22, '#141b42'); px(sx - 7, base - 17, 6, 2, '#141b42'); px(sx + 2, base - 13, 7, 2, '#141b42'); px(sx - 8, base - 20, 2, 4, '#141b42'); px(sx + 7, base - 17, 2, 5, '#141b42'); }
  }
  // drifting fog
  for (let i = 0; i < 6; i++) {
    const x = ((i * 90 - camX * 0.7 - frame * 0.15) % (W + 80) + (W + 80)) % (W + 80) - 40;
    px(x, GROUND_Y - 12 - (i % 3) * 5, 60, 4, 'rgba(170,190,255,0.09)');
  }
}

// Parallax helper: x positions (on screen) of things repeating every `spacing` world pixels, scrolled at `par` speed.
function repeating(spacing, par, fn) {
  const first = Math.floor((camX * par) / spacing) - 1;
  for (let i = first; i < first + Math.ceil(W / spacing) + 3; i++) fn(i * spacing - camX * par, i);
}

function drawCastleBackground() {
  px(0, 0, W, H, '#241f33');
  // brick wall: every row is shifted a bit, scrolling slowly behind everything else
  const off = camX * 0.5;
  for (let row = 0; row < 14; row++) {
    px(0, row * 12 + 11, W, 1, '#1c1829');
    const shift = (row % 2) * 16;
    for (let x = -(((off + shift) % 32) + 32) % 32; x < W; x += 32) px(x, row * 12, 1, 11, '#1c1829');
  }
  // arched windows with moonlight
  repeating(170, 0.45, (sx, i) => {
    disc(sx + 9, 41, 11, '#4a4660'); px(sx - 2, 41, 22, 38, '#4a4660');
    disc(sx + 9, 41, 9, '#0f1536'); px(sx, 41, 18, 36, '#0f1536');
    px(sx + 4, 44 + (i * 7) % 9, 1, 1, '#fff6b0'); px(sx + 12, 52 + (i * 5) % 8, 1, 1, '#cfd8ff'); px(sx + 8, 62, 1, 1, '#cfd8ff');
    px(sx + 8, 32, 2, 44, '#4a4660'); px(sx, 55, 18, 2, '#4a4660'); // window bars
  });
  // pillars with flickering torches
  repeating(200, 0.7, (sx) => {
    px(sx, 12, 12, GROUND_Y - 12, '#35304a'); px(sx, 12, 2, GROUND_Y - 12, '#443f5e');
    px(sx - 2, 12, 16, 5, '#4a4660'); px(sx - 2, GROUND_Y - 6, 16, 6, '#4a4660');
    const f = (frame >> 2) % 3; // the flame flickers at a constant speed
    disc(sx + 6, 66, 16, 'rgba(255,170,70,0.08)');
    px(sx + 4, 70, 4, 3, '#6b4a2b');
    px(sx + 5, 64 - f, 2, 6 + f, '#ff9a30'); px(sx + 5, 66, 2, 4, '#ffe27a');
  });
  // red banners hanging from the ceiling
  repeating(200, 0.6, (sx) => {
    const bx = sx + 100;
    px(bx, 12, 14, 36, '#a3212e'); px(bx, 12, 14, 2, '#d9b44a');
    px(bx + 5, 24, 4, 7, '#d9b44a'); px(bx + 3, 48, 3, 3, '#a3212e'); px(bx + 8, 48, 3, 3, '#a3212e');
  });
  // ceiling
  px(0, 0, W, 12, '#16121f'); px(0, 12, W, 2, '#2e2942');
}

function drawDayBackground() {
  px(0, 0, W, H, '#8fd3ff');
  // clouds
  for (let i = 0; i < 8; i++) {
    const x = ((i * 130 - camX * 0.2) % (W + 120) + (W + 120)) % (W + 120) - 60;
    const y = 18 + (i * 37) % 50;
    px(x, y, 30, 6, '#fff'); px(x + 6, y - 4, 16, 4, '#fff');
  }
  // hills
  for (let sx = 0; sx < W; sx++) {
    const wx = sx + camX * 0.4;
    const h = 28 + Math.sin(wx * 0.02) * 10 + Math.sin(wx * 0.047) * 5;
    px(sx, GROUND_Y - h, 1, h, '#7fcf86');
  }
}

// [body, speckles, top edge, top shade]. Night levels use stone for everything above the ground.
const SOLID_STYLE = {
  day: { ground: ['#8a5a35', '#6e4426', '#4fb04f', '#3d8f3d'] },
  night: {
    ground: ['#3b2f45', '#2c2236', '#2f5a45', '#244a38'],
    stone: ['#5c617c', '#484c66', '#8d93ad', '#6e7390'],
  },
  castle: {
    ground: ['#4a4660', '#38344d', '#7a7699', '#5d5a7a'],
    stone: ['#5b5874', '#46435e', '#8e8bb0', '#6a6790'],
  },
};

function drawSolid([x, y, w, h]) {
  const sx = Math.round(x - camX);
  if (sx > W || sx + w < 0) return;
  const st = SOLID_STYLE[LEVEL.theme];
  const [body, speck, top, shade] = st.stone && y !== GROUND_Y ? st.stone : st.ground;
  px(sx, y, w, h, body);
  for (let i = 0; i < w; i += 6) for (let j = 6; j < h; j += 7) {
    if (((i * 7 + j * 13 + x) | 0) % 5 === 0) px(sx + i, y + j, 2, 2, speck);
  }
  px(sx, y, w, 3, top);
  px(sx, y + 3, w, 1, shade);
}

// Pits are the gaps between ground pieces. Fill them with a dark void and a glowing bottom
// so they're easy to spot against the background.
function drawPits() {
  const theme = LEVEL.theme, night = theme === 'night';
  const ground = LEVEL.solids.filter((s) => s[1] === GROUND_Y).sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < ground.length - 1; i++) {
    const a = ground[i][0] + ground[i][2], w = ground[i + 1][0] - a, sx = Math.round(a - camX);
    if (sx > W || sx + w < 0) continue;
    px(sx, GROUND_Y, w, H - GROUND_Y, { day: '#24150d', night: '#04020a', castle: '#0a0508' }[theme]);
    if (theme === 'castle') { // a glowing red-hot dungeon pit: not animated, but easy to see
      for (let k = 0; k < 4; k++) px(sx, H - 16 + k * 4, w, 4, `rgba(255,100,40,${0.12 + k * 0.1})`);
      for (let k = 0; k < 4; k++) px(sx, GROUND_Y - 12 + k * 3, w, 3, `rgba(255,100,40,${0.04 + k * 0.04})`);
    }
    if (night) { // spooky green glow, mist and rising wisps (daytime pits are just dirt holes)
      const glow = '110,255,150';
      for (let k = 0; k < 4; k++) px(sx, H - 16 + k * 4, w, 4, `rgba(${glow},${0.1 + k * 0.1})`);
      for (let k = 0; k < 4; k++) px(sx, GROUND_Y - 12 + k * 3, w, 3, `rgba(${glow},${0.05 + k * 0.05})`);
      for (let k = 0; k < 3; k++) { // rise at a constant speed: depends only on time, not on scrolling
        const wy = H - ((frame * 0.4 + k * 11 + a) % 30);
        px(sx + 6 + ((k * 17 + 5) % Math.max(1, w - 12)), wy, 2, 2, `rgba(${glow},0.7)`);
      }
    }
    // darker walls so the hole has depth
    px(sx, GROUND_Y, 2, H - GROUND_Y, 'rgba(0,0,0,0.5)'); px(sx + w - 2, GROUND_Y, 2, H - GROUND_Y, 'rgba(0,0,0,0.5)');
  }
}

function drawDecor([x, kind]) {
  const sx = Math.round(x - camX), y = GROUND_Y;
  if (sx < -20 || sx > W + 20) return;
  const c = '#4a4f68', dark = '#2f3348', wood = '#2a2238';
  if (kind === 'stone') {
    px(sx - 4, y - 9, 8, 9, c); px(sx - 3, y - 11, 6, 2, c); px(sx - 3, y - 9, 1, 8, '#5d6382');
    px(sx, y - 8, 1, 4, dark); px(sx - 2, y - 7, 5, 1, dark);
  } else if (kind === 'cross') {
    px(sx - 1, y - 14, 3, 14, c); px(sx - 4, y - 11, 9, 3, c);
  } else if (kind === 'tree') {
    px(sx - 1, y - 18, 3, 18, wood); px(sx - 6, y - 14, 6, 2, wood); px(sx - 8, y - 17, 2, 4, wood);
    px(sx + 2, y - 11, 6, 2, wood); px(sx + 6, y - 15, 2, 5, wood); px(sx - 3, y - 21, 2, 4, wood);
  } else if (kind === 'barrel') {
    px(sx - 5, y - 11, 10, 11, '#6b4a2b'); px(sx - 5, y - 9, 10, 1, '#3b2a18'); px(sx - 5, y - 4, 10, 1, '#3b2a18'); px(sx - 4, y - 11, 2, 11, '#7d5a36');
  } else if (kind === 'crate') {
    px(sx - 6, y - 10, 12, 10, '#5a4429'); px(sx - 6, y - 10, 12, 2, '#6b5235'); px(sx - 6, y - 1, 12, 1, '#3b2a18');
    for (let k = 0; k < 10; k++) { px(sx - 6 + k + 1, y - 9 + k * 0.8, 1, 1, '#3b2a18'); }
  } else if (kind === 'brazier') {
    px(sx - 1, y - 7, 3, 7, '#3b3850'); px(sx - 4, y - 10, 9, 3, '#4a4660');
    const f = (frame >> 2) % 3;
    px(sx - 2, y - 14 - f, 4, 4 + f, '#ff9a30'); px(sx - 1, y - 13, 2, 3, '#ffe27a');
    disc(sx, y - 12, 12, 'rgba(255,160,60,0.1)');
  } else if (kind === 'fence') {
    for (let k = 0; k < 4; k++) { px(sx - 8 + k * 5, y - 8, 2, 8, '#35304a'); px(sx - 8 + k * 5, y - 10, 2, 2, '#35304a'); }
    px(sx - 8, y - 6, 17, 1, '#35304a'); px(sx - 8, y - 3, 17, 1, '#35304a');
  }
}

function drawSpikes([x, w, y = GROUND_Y]) {
  const sx = Math.round(x - camX);
  if (sx > W || sx + w < 0) return;
  for (let i = 0; i < w; i += 8) {
    for (let row = 0; row < 6; row++) {
      const half = Math.min(4, 1 + Math.floor(row * 0.6));
      px(sx + i + 4 - half, y - 6 + row, half * 2, 1, row === 0 ? '#fff' : '#c9ccd6');
    }
    px(sx + i, y - 1, 8, 1, '#7d808c');
  }
}

const SHIRTS = ['#e8505b', '#4d9de0', '#f4b942', '#9b5de5', '#2ec4b6'];
function drawPerson(p) {
  const x = Math.round(p.x - camX), y = Math.round(p.floorY);
  if (x < -10 || x > W + 10) return;
  const step = Math.floor(frame / (p.scared ? 4 : 10)) % 2;
  px(x - 2, y - 3, 2, 3 - (step ? 1 : 0), '#3b3b58'); px(x, y - 3, 2, 3 - (step ? 0 : 1), '#3b3b58');
  px(x - 3, y - 7, 6, 4, SHIRTS[p.hue]);
  px(x - 2, y - 11, 4, 4, '#ffd8b0');
  px(x - 2, y - 12, 4, 1, '#5a3a22');
  if (p.scared) { px(x - 4, y - 9 - step, 1, 3, '#ffd8b0'); px(x + 3, y - 9 - step, 1, 3, '#ffd8b0'); px(x - 1, y - 8, 2, 1, '#222'); }
  px(x - 2, y - 10, 1, 1, '#222'); px(x + 1, y - 10, 1, 1, '#222');
}

const ZOMBIE_CLOTHES = ['#5a4a6e', '#3f6e6a', '#7a5a3a', '#6e3f4f', '#4a5e7a'];
function drawKnight(p) {
  const x = Math.round(p.x - camX), y = Math.round(p.floorY), d = p.dir;
  if (x < -12 || x > W + 12) return;
  const step = p.scared ? 0 : Math.floor(frame / 12) % 2; // marching; stands still when alert
  px(x - 2, y - 3, 2, 3 - (step ? 1 : 0), '#5a627a'); px(x, y - 3, 2, 3 - (step ? 0 : 1), '#5a627a');
  px(x - 3, y - 7, 6, 4, '#9fb1cf'); px(x - 3, y - 5, 6, 1, '#6a728c'); // armor and belt
  px(d > 0 ? x - 5 : x + 3, y - 8, 2, 5, '#d9b44a'); // gold shield on the back arm
  px(x - 2, y - 11, 4, 4, '#b8c2d4'); px(x - 2, y - 12, 4, 1, '#d6deec'); // helmet
  px(x - 1 + (d > 0 ? 1 : -1), y - 10, 2, 1, '#2a2f45'); // visor slit looks the way it's walking
  // the red feather on top, swept back
  px(x, y - 14, 1, 2, '#e8303a'); px(x - d, y - 15, 1, 2, '#e8303a'); px(x - 2 * d, y - 15 + (step ? 1 : 0), 1, 1, '#ff6670');
  // sword: carried low while marching, raised when you get close
  if (p.scared) { px(x + d * 3 + (d > 0 ? 0 : -1), y - 15, 1, 8, '#e8eef8'); px(x + d * 3 - 1 + (d > 0 ? 0 : 1), y - 7, 3, 1, '#d9b44a'); }
  else { px(x + d * 3 + (d > 0 ? 0 : -1), y - 6, 1, 5, '#e8eef8'); }
}

const DRAW_PERSON = { person: drawPerson, zombie: drawZombie, knight: drawKnight };

// Lasers. Gates are off (green lights), warn (yellow lights, dotted beam), or on (red beam, deadly).
function drawLaser(l) {
  if (l[0] === 'gate') {
    const sx = Math.round(l[1] - camX), st = gateState(l[2]);
    if (sx < -10 || sx > W + 10) return;
    const light = { off: '#4fe36b', warn: '#ffd23f', on: '#ff3b4f' }[st];
    if (st === 'on') {
      const flick = frame % 4 < 2 ? 0.28 : 0.2;
      px(sx - 4, 20, 9, GROUND_Y - 26, `rgba(255,60,80,${flick})`);
      px(sx - 1, 20, 3, GROUND_Y - 26, '#ff3b4f'); px(sx, 20, 1, GROUND_Y - 26, '#ffd6dc');
    } else if (st === 'warn') {
      for (let y = 20; y < GROUND_Y - 6; y += 8) px(sx, y, 1, 3, '#ffd23f'); // dotted line says "about to fire"
    }
    px(sx - 5, 14, 10, 6, '#3a3550'); px(sx - 1, 17, 2, 2, light);
    px(sx - 5, GROUND_Y - 6, 10, 6, '#3a3550'); px(sx - 1, GROUND_Y - 5, 2, 2, light);
    return;
  }
  const [, x, w, phase] = l, sx = Math.round(x - camX), y = Math.round(sweepY(phase));
  if (sx > W + 10 || sx + w < -10) return;
  px(sx - 1, 84, 2, GROUND_Y - 84, '#3a3550'); px(sx + w - 1, 84, 2, GROUND_Y - 84, '#3a3550'); // rails
  px(sx + 2, y - 3, w - 4, 7, `rgba(255,60,80,${frame % 4 < 2 ? 0.28 : 0.2})`);
  px(sx + 2, y - 1, w - 4, 3, '#ff3b4f'); px(sx + 2, y, w - 4, 1, '#ffd6dc');
  px(sx - 4, y - 4, 7, 9, '#3a3550'); px(sx + w - 3, y - 4, 7, 9, '#3a3550'); // emitters riding the rails
  px(sx - 1, y - 1, 2, 2, '#ff3b4f'); px(sx + w - 1, y - 1, 2, 2, '#ff3b4f');
}

function drawZombie(p) {
  const x = Math.round(p.x - camX), y = Math.round(p.floorY), d = p.dir;
  if (x < -10 || x > W + 10) return;
  const step = Math.floor(frame / 14) % 2; // slow shamble
  px(x - 2, y - 3, 2, 3 - (step ? 1 : 0), '#2e3b4e'); px(x, y - 3, 2, 3 - (step ? 0 : 1), '#2e3b4e');
  px(x - 3, y - 7, 6, 4, ZOMBIE_CLOTHES[p.hue]);
  px(x - 1 + d, y - 5, 1, 2, '#86c97e'); // rip in the shirt
  px(x - 2, y - 11, 4, 4, '#86c97e');
  px(x - 2, y - 12, 1, 1, '#3b4a2e'); px(x + 1, y - 12, 1, 1, '#3b4a2e'); // wispy hair
  px(x - 2, y - 10, 1, 1, '#f5e663'); px(x + 1, y - 10, 1, 1, '#f5e663'); // glowing eyes
  px(x - 1, y - 8, 2, 1, '#2c3a24');
  px(d > 0 ? x + 3 : x - 6, y - 8, 3, 1, '#86c97e'); // arms out front
}

function drawGhost(g) {
  const face = g.face, x = Math.round(g.x - camX), y = Math.round(g.y);
  if (x < -20 || x > W + 20) return;
  disc(x, y, 9, g.chase ? 'rgba(190,225,255,0.3)' : 'rgba(170,215,255,0.16)'); // glow, brighter when it's after you
  ctx.fillStyle = 'rgba(235,245,255,0.92)';
  for (let dy = -6; dy <= 0; dy++) { const half = Math.floor(Math.sqrt(36 - dy * dy + 0.5)); ctx.fillRect(x - half, y + dy, half * 2 + 1, 1); }
  ctx.fillRect(x - 6, y + 1, 13, 5);
  const wave = Math.floor(frame / 8) % 2; // wavy bottom edge: alternate blocks hang down
  for (let i = 0; i < 13; i += 2) if ((i / 2 + wave) % 2 === 0) ctx.fillRect(x - 6 + i, y + 6, 2, 2);
  // wispy tail trailing behind (opposite the way the ghost faces); the tip flutters
  const tail = (dx, dy, w, h) => ctx.fillRect(face > 0 ? x - dx - w : x + dx, y + dy, w, h);
  tail(6, 1, 3, 4); tail(9, 3 - wave, 3, 3); tail(12, 4 - wave * 2, 2, 2);
  const eyeH = g.chase ? 4 : 3; // wide eyes and a bigger mouth when chasing
  px(x - 3 + face, y - 2, 2, eyeH, '#1b1f3a'); px(x + 2 + face, y - 2, 2, eyeH, '#1b1f3a'); // eyes
  px(x - 1 + face, y + 2, 2, g.chase ? 3 : 2, '#1b1f3a'); // little "oooh" mouth
}

function drawDecal(d) {
  const x = Math.round(d.x - camX);
  if (x < -10 || x > W + 10) return;
  if (LEVEL.kind === 'knight') { px(x - 5, d.y - 1, 10, 1, '#9fb1cf'); px(x - 1, d.y - 2, 3, 1, '#c8d2e6'); px(x + 3, d.y - 2, 2, 1, '#e8303a'); return; }
  if (LEVEL.kind === 'zombie') { px(x - 5, d.y - 1, 10, 1, '#86c97e'); px(x - 2, d.y - 2, 4, 1, '#9be07a'); px(x + 3, d.y - 2, 2, 1, '#eaeaea'); return; }
  px(x - 4, d.y - 1, 8, 1, SHIRTS[d.hue]); px(x - 2, d.y - 2, 4, 1, '#ffd8b0');
}

function drawBoulder() {
  const b = boulder;
  if (deadTimer > 0) return;
  const cx = Math.round(b.x - camX), cy = Math.round(b.y), r = TUNE.radius;
  disc(cx, cy, r + 1, '#3a3a46');
  disc(cx, cy, r, '#9a9aa8');
  // rolling cracks/bumps
  for (let i = 0; i < 4; i++) {
    const a = b.rot + (i * Math.PI) / 2 + i * 0.3;
    const d = r * (0.45 + 0.15 * (i % 2));
    px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2, '#6c6c7a');
  }
  px(cx - r + 2, cy - r + 3, 2, 2, '#c4c4d0');
  // face (does not rotate)
  const ex = b.face * 1;
  px(cx - 4 + ex, cy - 3, 3, 4, '#fff'); px(cx + 1 + ex, cy - 3, 3, 4, '#fff');
  px(cx - 3 + ex + b.face, cy - 2, 1, 2, '#111'); px(cx + 2 + ex + b.face, cy - 2, 1, 2, '#111');
  px(cx - 2 + ex, cy + 3, 5, 1, '#111');
  if (b.vx * b.face > 1.5) px(cx - 1 + ex, cy + 4, 3, 1, '#111');
}

function drawFlag(x, label) {
  const sx = Math.round(x - camX);
  px(sx, GROUND_Y - 30, 2, 30, '#ddd');
  px(sx + 2, GROUND_Y - 30, 12, 8, label);
}

function text(str, x, y, color = '#fff', align = 'left', size = 8) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
  ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
}

function draw() {
  drawBackground();
  drawPits();
  LEVEL.solids.forEach(drawSolid);
  LEVEL.decor.forEach(drawDecor);
  LEVEL.checkpoints.forEach((cp) => drawFlag(cp, spawnX >= cp ? '#4fe36b' : '#999'));
  drawFlag(LEVEL.goalX, '#ffd23f');
  LEVEL.spikes.forEach(drawSpikes);
  LEVEL.lasers.forEach(drawLaser);
  decals.forEach(drawDecal);
  people.forEach((p) => p.alive && DRAW_PERSON[LEVEL.kind](p));
  drawBoulder();
  ghosts.forEach(drawGhost);
  for (const q of particles) px(q.x - camX, q.y, q.size, q.size, q.color);
  for (const f of floaters) text(f.text, f.x - camX, f.y, '#fff', 'center');

  // HUD
  text('SQUISHED ' + squished + '/' + LEVEL.people.length, 6, 12);
  text('LEVEL ' + (levelIndex + 1), W / 2, 12, '#ffd23f', 'center');
  text('LIVES ' + Math.max(0, lives), W - 6, 12, '#ffb3b3', 'right');

  const lastLevel = levelIndex === LEVELS.length - 1;
  if (state === 'title') {
    px(40, 52, W - 80, 70, 'rgba(0,0,0,0.55)');
    text('BOULDER GAME', W / 2, 78, '#ffd23f', 'center', 16);
    text(LEVEL.hint, W / 2, 96, '#fff', 'center');
    text('Arrows/WASD + Space  or  tap buttons', W / 2, 108, '#ccc', 'center');
    text('Press jump to start', W / 2, 118, '#fff', 'center');
  } else if (state === 'win' || state === 'gameover') {
    px(40, 52, W - 80, 70, 'rgba(0,0,0,0.55)');
    const title = state === 'gameover' ? 'GAME OVER' : lastLevel ? 'YOU BEAT THE GAME!' : 'LEVEL CLEAR!';
    text(title, W / 2, 78, state === 'win' ? '#4fe36b' : '#ff6b6b', 'center', 16);
    text('Squished ' + squished + ' of ' + LEVEL.people.length, W / 2, 98, '#fff', 'center');
    text(state === 'win' && !lastLevel ? 'Press jump for the next level' : state === 'win' ? 'Press jump to play again' : 'Press jump to try again', W / 2, 112, '#ccc', 'center');
  } else if (introTimer > 0) {
    text('LEVEL ' + (levelIndex + 1) + ': ' + LEVEL.name, W / 2, 50, '#ffd23f', 'center', 12);
    text(LEVEL.hint, W / 2, 64, '#fff', 'center');
  }

  if (menuOpen) {
    px(0, 0, W, H, 'rgba(0,0,0,0.65)');
    px(60, 28, W - 120, 124, '#1d1a2b'); px(60, 28, W - 120, 2, '#ffd23f'); px(60, 150, W - 120, 2, '#ffd23f');
    text('PICK A LEVEL', W / 2, 46, '#ffd23f', 'center', 12);
    LEVELS.forEach((l, i) => {
      const r = menuRow(i);
      px(r.x, r.y, r.w, r.h, i === levelIndex ? '#4a4678' : '#2f2b4a');
      text((i + 1) + '. ' + l.name, r.x + 8, r.y + r.h / 2 + 3, i === levelIndex ? '#ffd23f' : '#fff');
    });
    text('tap outside or press Esc to close', W / 2, 146, '#aaa', 'center', 6);
  }
}

// ---------- Main loop (fixed 60 updates/sec) ----------
frame = 0;
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Test hook for automated checks (harmless in the browser).
window.__game = { get state() { return state; }, get boulder() { return boulder; }, get squished() { return squished; }, get alive() { return deadTimer === 0; }, get lives() { return lives; }, get people() { return people; }, get ghosts() { return ghosts; }, get level() { return LEVEL; }, get levelIndex() { return levelIndex; }, setLevel, startGame, get menuOpen() { return menuOpen; }, gateState, sweepY, laserHits, input, update };
