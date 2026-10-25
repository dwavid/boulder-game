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
};

// ---------- Level ----------
// Solid rectangles are [x, y, w, h]. Ground top is y=150.
const GROUND_Y = 150;
const LEVEL = {
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
    [2080, 24], [2200, 16], [2560, 40], [1985, 16, 108],
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
};

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
canvas.addEventListener('pointerdown', () => { audioInit(); if (state !== 'play') input.jumpPressed = true; });

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

// ---------- Game state ----------
let state = 'title'; // title | play | win | gameover
let boulder, people, particles, decals, floaters, lives, squished, deadTimer, spawnX, camX, frame;

function resetRun() {
  lives = TUNE.lives; squished = 0; spawnX = 40;
  people = LEVEL.people.map(([x, fy, min, max]) => ({
    x, floorY: fy, min, max, dir: Math.random() < 0.5 ? -1 : 1,
    speed: 0.25 + Math.random() * 0.2, hue: Math.floor(Math.random() * 5), alive: true, scared: false,
  }));
  decals = [];
  respawn();
}
function respawn() {
  boulder = { x: spawnX, y: GROUND_Y - 30, vx: 0, vy: 0, rot: 0, onGround: false, coyote: 0, jumpBuf: 0, face: 1 };
  particles = []; floaters = []; deadTimer = 0;
  camX = Math.max(0, spawnX - 110);
}
function startGame() { resetRun(); state = 'play'; input.jumpPressed = false; }
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
  b.rot += b.vx / r;

  // spikes
  for (const [sx, sw, sy = GROUND_Y] of LEVEL.spikes) {
    if (hitsCircleRect(b.x, b.y, r - 1, sx + 1, sy - 5, sw - 2, 5)) { die(); return; }
  }
  // pits
  if (b.y > H + 30) { die(); return; }

  // people
  for (const p of people) {
    if (!p.alive) continue;
    if (hitsCircleRect(b.x, b.y, r, p.x - 3, p.floorY - 10, 6, 10)) {
      p.alive = false; squished++;
      decals.push({ x: p.x, y: p.floorY, hue: p.hue });
      spawnBurst(p.x, p.floorY - 5, ['#ffe14d', '#fff', '#ff7ab8'], 10, 1.4);
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
  } else if (input.jumpPressed) {
    startGame();
  }
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

function drawBackground() {
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

function drawSolid([x, y, w, h]) {
  const sx = Math.round(x - camX);
  if (sx > W || sx + w < 0) return;
  px(sx, y, w, h, '#8a5a35');
  for (let i = 0; i < w; i += 6) for (let j = 6; j < h; j += 7) {
    if (((i * 7 + j * 13 + x) | 0) % 5 === 0) px(sx + i, y + j, 2, 2, '#6e4426');
  }
  px(sx, y, w, 3, '#4fb04f');
  px(sx, y + 3, w, 1, '#3d8f3d');
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

function drawDecal(d) {
  const x = Math.round(d.x - camX);
  if (x < -10 || x > W + 10) return;
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
  LEVEL.solids.forEach(drawSolid);
  LEVEL.checkpoints.forEach((cp) => drawFlag(cp, spawnX >= cp ? '#4fe36b' : '#999'));
  drawFlag(LEVEL.goalX, '#ffd23f');
  LEVEL.spikes.forEach(drawSpikes);
  decals.forEach(drawDecal);
  people.forEach((p) => p.alive && drawPerson(p));
  drawBoulder();
  for (const q of particles) px(q.x - camX, q.y, q.size, q.size, q.color);
  for (const f of floaters) text(f.text, f.x - camX, f.y, '#fff', 'center');

  // HUD
  text('SQUISHED ' + squished + '/' + LEVEL.people.length, 6, 12);
  text('LIVES ' + Math.max(0, lives), W - 6, 12, '#ffb3b3', 'right');

  if (state === 'title') {
    px(40, 52, W - 80, 70, 'rgba(0,0,0,0.55)');
    text('BOULDER GAME', W / 2, 78, '#ffd23f', 'center', 16);
    text('Roll over people. Dodge spikes!', W / 2, 96, '#fff', 'center');
    text('Arrows/WASD + Space  or  tap buttons', W / 2, 108, '#ccc', 'center');
    text('Press jump to start', W / 2, 118, '#fff', 'center');
  } else if (state === 'win' || state === 'gameover') {
    px(40, 52, W - 80, 70, 'rgba(0,0,0,0.55)');
    text(state === 'win' ? 'YOU MADE IT!' : 'GAME OVER', W / 2, 78, state === 'win' ? '#4fe36b' : '#ff6b6b', 'center', 16);
    text('Squished ' + squished + ' of ' + LEVEL.people.length, W / 2, 98, '#fff', 'center');
    text('Press jump to play again', W / 2, 112, '#ccc', 'center');
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
window.__game = { get state() { return state; }, get boulder() { return boulder; }, get squished() { return squished; }, get lives() { return lives; }, input, update };
