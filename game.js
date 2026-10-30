'use strict';
// BOULD — roll around, squish people, avoid spikes.
// Everything is drawn with code (no image files). Logical screen is 320x180,
// scaled up by CSS with crisp pixels (landscape). In portrait on a phone it is narrower and taller.

// The screen size changes in portrait (see layout()): narrower and taller, with extra sky above the world.
// WORLD_H is the height the levels are built for; the world is drawn bottom-aligned, shifted down by topPad.
const WORLD_H = 180;
let W = 320, H = 180, topPad = 0;
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
  smashSpeed: 8.5, // how fast the boulder drops when you jump and press down (the "smash")
  bossHeight: 64, // head top is this far above the ground: too high to reach with a jump from the ground
  bossWindup: 50, // frames the sword is raised before it swings (the warning)
  bossSwing: 16, // frames the swing lasts; the low sweep at the end is what hurts
  bossReach: 50, // how far in front of him the sword reaches (on the ground)
  bossHurt: 100, // frames he's dazed (and can't attack) after you land on his head
  bossSpeed: 0.45, // walking speed; he gets 0.1 faster after each hit
  brainSpeed: 0.5, // the Big Brain floats toward you this fast (a bit faster after each hit)
  brainWindup: 75, // frames the brain charges up; it follows you at first, then locks on for the last brainLock frames
  brainLock: 30,
  brainZap: 18, // frames the lightning columns stay deadly
  maxFall: 7, // fastest the boulder falls (not counting a smash)
  brainRest: 70, // frames it waits before the next attack
  genieSpeed: 0.5, // the Water Genie floats toward you this fast (0.1 faster after each hit)
  genieWindup: 55, // frames he gathers water (dotted lines show where it will fly) before shooting
  genieShotGap: 55, // frames between the shots in a volley
  genieShotSpeed: 1.8, // how fast the water bolts fly
  genieRest: 60, // frames he rests after a volley
  stormSpeed: 0.5, // the Storm Cloud floats toward you this fast (0.08 faster after each hit)
  stormWindup: 55, // frames he charges up; a dotted line follows you, then locks on for the last stormLock frames
  stormLock: 30,
  stormShotGap: 28, // frames between the lightning bolts in a volley (1 more bolt per hit, max 3)
  stormShotSpeed: 2.2, // how fast his lightning bolts fly (the boulder's top speed is 2.2)
  stormRest: 60, // frames he rests after a volley
  stormStun: 120, // frames you're shocked (can't move) when you touch his bottom or sides: 2 seconds
  stormStunGrace: 60, // frames after the shock wears off when he can't shock you again
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
    [0, GROUND_Y, 700, 30], [750, GROUND_Y, 750, 30], [1550, GROUND_Y, 850, 30],
    // The arena floor. Under the middle is a secret: a patch of sand you can smash (jump, then press down), then a locked
    // brick floor, then a chamber with the caged baby rock and a tunnel out. The ground is thick here so there's room underground.
    [2450, GROUND_Y, 778, 150],                     // ground up to the sand patch (and the chamber's left wall)
    [3228, GROUND_Y, 56, 16, 'sand'],              // smashable sand on top
    [3228, 166, 56, 12, 'brick'],                  // locked brick floor under the sand (the key opens it)
    [3284, GROUND_Y, 116, 62],                     // ground right of the patch (the tunnel's ceiling)
    [3228, 236, 372, 64],                          // chamber floor, which carries on as the tunnel floor (past the edge of the screen)
    [3231, 212, 24, 24, 'cage'],                   // the cage holding the baby rock (removed when you unlock it)
    // stone ledges and steps
    [420, 112, 100, 8], [1020, 108, 90, 8], [1830, 108, 110, 8], [2200, 132, 30, 18], [2230, 114, 30, 36],
    // boss arena: a ledge on each side (the boss's head is too high to reach from the ground) and a wall at the end
    [3124, 112, 64, 8], [3304, 112, 52, 8], [3392, 0, 8, GROUND_Y],
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
    [2780, GROUND_Y, 2730, 2840], [2990, GROUND_Y, 2950, 3040],
  ],
  checkpoints: [790, 1600, 2490, 3010],
  // the underground part: camera scrolls down to follow you in; baby rock starts in the cage
  // lines: what each speech bubble says, in order (who: 'boulder' or 'baby'; time: frames before it moves on)
  underground: {
    x0: 3200, maxCamY: 100, floorY: 236, babyX: 3243, chamberX: 3228, chamberW: 56, tunnelY: 212, babyR: 6, smashHint: 'sand',
    lines: [
      { who: 'boulder', text: "You're safe now, buddy!", time: 170 },
      { who: 'baby', text: 'Ah goo a gah!', time: 130 },
      { who: 'boulder', text: 'We need to get out of here before more stuff chases us!', time: 230 },
    ],
  },
  // The Giant Knight. The fight starts when you cross arenaLeft; the camera then locks onto the arena.
  // zoneMin/zoneMax is how far he can walk (between the two ledges). No goalX: beating the boss wins the level.
  boss: { name: 'THE GIANT KNIGHT', x: 3254, hp: 3, arenaLeft: 3092, camX: 3080, zoneMin: 3202, zoneMax: 3306 },
}, {
  name: 'BRAINTOPIA', theme: 'brain', kind: 'brain', hint: 'Squish the little brains. Dodge the zaps!',
  width: 3400,
  solids: [
    [0, GROUND_Y, 640, 30], [690, GROUND_Y, 560, 30], [1305, GROUND_Y, 700, 30], [2060, GROUND_Y, 520, 30],
    // The arena floor, same layout as the castle's: smashable bones, a locked floor made of bones, then a chamber with the
    // baby pebble in a bone cage and a tunnel out.
    [2630, GROUND_Y, 598, 150],
    [3228, GROUND_Y, 56, 16, 'sand'],              // smashable pile of bones (type 'sand' is "smashable")
    [3228, 166, 56, 12, 'brick'],                  // locked floor of bones (the key opens it)
    [3284, GROUND_Y, 116, 62],
    [3228, 236, 372, 64],
    [3231, 212, 24, 24, 'cage'],                   // the bone cage holding the baby pebble
    // platforms and steps
    [360, 112, 80, 8], [900, 108, 80, 8], [1700, 132, 30, 18], [1730, 114, 30, 36], [2320, 110, 70, 8],
    // boss arena (same shape as the castle's): a ledge on each side to leap from, and a wall at the end
    [3124, 112, 64, 8], [3304, 112, 52, 8], [3392, 0, 8, GROUND_Y],
  ],
  // synapses (in the lasers list): ['synapse', x, width, phase] is an electric arc between two neurons that blinks like a
  // gate (off, yellow sparks as a warning, then zapping). It only reaches up to about knee height, so hop over it or wait.
  lasers: [
    ['synapse', 250, 32, 0], ['synapse', 520, 36, 100], ['synapse', 790, 32, 40], ['synapse', 1050, 36, 120],
    ['synapse', 1430, 32, 60], ['synapse', 1560, 36, 160], ['synapse', 1840, 32, 20], ['synapse', 2180, 36, 80],
    ['synapse', 2455, 32, 140], ['synapse', 2760, 36, 30], ['synapse', 2900, 32, 110],
  ],
  // little brains: [x, floorY, walkMin, walkMax]
  people: [
    [150, GROUND_Y, 100, 230], [400, GROUND_Y, 330, 480], [385, 112, 365, 435], [600, GROUND_Y, 560, 630],
    [740, GROUND_Y, 700, 780], [940, 108, 905, 975], [900, GROUND_Y, 860, 1020], [1160, GROUND_Y, 1110, 1230],
    [1360, GROUND_Y, 1320, 1420], [1520, GROUND_Y, 1480, 1550], [1650, GROUND_Y, 1620, 1690], [1745, 114, 1738, 1752],
    [1950, GROUND_Y, 1900, 1990], [2120, GROUND_Y, 2080, 2170], [2350, 110, 2325, 2385], [2300, GROUND_Y, 2240, 2420],
    [2540, GROUND_Y, 2500, 2570], [2700, GROUND_Y, 2650, 2740], [2840, GROUND_Y, 2810, 2890], [2980, GROUND_Y, 2950, 3050],
  ],
  checkpoints: [725, 1330, 2090, 2670, 3010],
  // The Big Brain floats above the arena. type 'brain' = it calls down lightning columns instead of swinging a sword.
  // Same ledges as the castle arena. hitW is how wide its top is for landing on it.
  boss: {
    name: 'THE BIG BRAIN', type: 'brain', x: 3254, hp: 3, arenaLeft: 3092, camX: 3080, zoneMin: 3214, zoneMax: 3294, hitW: 24,
    tip: 'Land on its brain from above! Dodge the zaps!', colors: ['#ff9ec4', '#ffffff', '#c9a2ff', '#7df0ff'],
  },
  underground: {
    x0: 3200, maxCamY: 100, floorY: 236, babyX: 3243, chamberX: 3228, chamberW: 56, tunnelY: 212, babyR: 4, smashHint: 'bones',
    lines: [
      { who: 'boulder', text: 'My sweet baby pebble! You\'re alive!', time: 170 },
      { who: 'baby', text: 'Yes - and quite cozy, given the warmth provided by the electrical synapses!', time: 230 },
      { who: 'boulder', text: '...What?!', time: 110 },
      { who: 'baby', text: 'Oh, sorry - Electrical synapses occur when neurons connect and transmit a nearly instantaneous burst of ions through protein channels called gap junctions.', time: 420 },
      { who: 'boulder', text: '...You can talk?!', time: 120 },
      { who: 'baby', text: '...goo goo ga ga?', time: 130 },
      { who: 'boulder', text: 'We gotta get out of here...', time: 170 },
    ],
  },
}, {
  name: 'WATERTOPIA', theme: 'water', kind: 'monster', hint: 'Squish the water monsters. Dodge the hot vents!',
  // underwater: slower, drifty and floaty (jump apex ~65px instead of ~52)
  // falling is extra slow (fallGravity and maxFall) so you sink like in water
  tune: { gravity: 0.2, jump: 5.1, maxSpeed: 1.8, accel: 0.3, airAccel: 0.22, friction: 0.2, fallGravity: 0.07, maxFall: 1.8 },
  width: 3400,
  solids: [
    [0, GROUND_Y, 640, 30], [690, GROUND_Y, 560, 30], [1305, GROUND_Y, 700, 30], [2060, GROUND_Y, 520, 30],
    // The arena floor, same layout as the castle's: smashable coral, a locked floor made of coral, then a chamber with the baby
    // rock in a coral cage and a tunnel out. The arena itself is flat (the genie's tail lies on the ground) with a wall at the end.
    [2635, GROUND_Y, 593, 150],
    [3228, GROUND_Y, 56, 16, 'sand'],              // smashable coral (type 'sand' is "smashable"; only once the genie is beaten)
    [3228, 166, 56, 12, 'brick'],                  // locked floor of coral (the key opens it)
    [3284, GROUND_Y, 116, 62],
    [3228, 236, 372, 64],
    [3231, 212, 24, 24, 'cage'],                   // the coral cage holding the baby rock
    // coral platforms and steps
    [360, 112, 80, 8], [900, 108, 80, 8], [1700, 132, 30, 18], [1730, 114, 30, 36], [2320, 110, 70, 8],
    [3392, 0, 8, GROUND_Y],                        // wall at the end of the arena
  ],
  // hydrothermal vents (in the lasers list): ['vent', x, phase] bubbles (off), glows orange (warning), then shoots a column
  // of scalding water far too tall to jump over (deadly). Wait for it to go off, then roll across.
  lasers: [
    ['vent', 230, 0], ['vent', 520, 100], ['vent', 800, 40], ['vent', 1100, 120], ['vent', 1400, 60],
    ['vent', 1580, 160], ['vent', 1850, 20], ['vent', 2150, 80], ['vent', 2480, 140], ['vent', 2750, 30], ['vent', 2900, 110],
  ],
  // little water monsters: [x, floorY, walkMin, walkMax]
  people: [
    [150, GROUND_Y, 100, 200], [400, GROUND_Y, 330, 480], [385, 112, 365, 435], [600, GROUND_Y, 560, 630],
    [740, GROUND_Y, 700, 780], [940, 108, 905, 975], [900, GROUND_Y, 860, 1020], [1160, GROUND_Y, 1110, 1230],
    [1330, GROUND_Y, 1320, 1360], [1500, GROUND_Y, 1450, 1540], [1650, GROUND_Y, 1620, 1690], [1745, 114, 1738, 1752],
    [1950, GROUND_Y, 1900, 1990], [2110, GROUND_Y, 2070, 2130], [2355, 110, 2325, 2385], [2300, GROUND_Y, 2240, 2420],
    [2540, GROUND_Y, 2500, 2570], [2680, GROUND_Y, 2650, 2720], [2830, GROUND_Y, 2790, 2870], [2980, GROUND_Y, 2940, 3010],
  ],
  checkpoints: [725, 1330, 2080, 2670, 3010],
  // The Water Genie: he floats, with his tail lying on the ground, and shoots water bolts. The only way to hurt him is to
  // ground pound (jump, then press down) on the tail. No goalX and no underground: beating him wins the level.
  boss: {
    name: 'THE WATER GENIE', type: 'genie', x: 3254, hp: 3, arenaLeft: 3092, arenaRight: 3392, camX: 3080, zoneMin: 3180, zoneMax: 3330,
    tip: 'Jump, then press DOWN on his tail! Dodge the water!', colors: ['#2a8ad0', '#5fb4f0', '#ffffff', '#bfe8ff'],
  },
  // The baby rock only says bubbly noises (babyBubbles plays a blub sound while it talks). The lines are placeholders.
  underground: {
    x0: 3200, maxCamY: 100, floorY: 236, babyX: 3243, chamberX: 3228, chamberW: 56, tunnelY: 212, babyR: 5, smashHint: 'coral', babyBubbles: true,
    lines: [
      { who: 'boulder', text: 'Another baby rock! I found you!', time: 170 },
      { who: 'baby', text: 'Blublub bublub bub bubble lub blub!', time: 230 },
      { who: 'boulder', text: '...Was that a thank you?', time: 150 },
      { who: 'baby', text: 'Bub bub blub!', time: 130 },
      { who: 'boulder', text: "Let's get out of here!", time: 170 },
    ],
  },
}, {
  name: 'CLOUD WORLD', theme: 'sky', kind: 'cloud', hint: 'Squish the clouds. Dodge the storm clouds!',
  width: 3400,
  solids: [
    // cloud banks with gaps of open sky between them (falling through is a pit)
    [0, GROUND_Y, 640, 30], [690, GROUND_Y, 560, 30], [1305, GROUND_Y, 700, 30], [2060, GROUND_Y, 520, 30],
    // The arena floor, same layout as the castle's: a crackling lightning wall you can smash (jump, then press down), then a
    // locked cloud floor, then a chamber with the baby pebble in an electric cage and a tunnel out.
    [2635, GROUND_Y, 593, 150],
    [3228, GROUND_Y, 56, 16, 'sand'],              // the lightning wall (type 'sand' is "smashable"; only once the Storm Cloud is beaten)
    [3228, 166, 56, 12, 'brick'],                  // locked floor of storm cloud (the key opens it)
    [3284, GROUND_Y, 116, 62],
    [3228, 236, 372, 64],
    [3231, 212, 24, 24, 'cage'],                   // the electric cage holding the baby pebble
    // cloud platforms and steps
    [420, 112, 80, 8], [960, 108, 70, 8], [1700, 132, 30, 18], [1730, 114, 30, 36], [2330, 110, 70, 8],
    // boss arena: a ledge on each side (his top is too high to reach from the ground) and a wall at the end
    [3112, 112, 64, 8], [3336, 112, 48, 8], [3392, 0, 8, GROUND_Y],
  ],
  // storm clouds (these are the "ghosts"): [centerX, centerY, patrolRange, phase]. They float back and forth, drift toward you
  // when you come close, and zap you if you touch them. Jump over them.
  ghosts: [
    [250, 136, 36, 0], [850, 136, 30, 3], [1150, 136, 30, 1], [1480, 136, 36, 2],
    [1900, 136, 36, 4], [2200, 136, 36, 0], [2500, 136, 30, 3], [2800, 136, 36, 1],
  ],
  // little clouds: [x, floorY, walkMin, walkMax]
  people: [
    [120, GROUND_Y, 80, 200], [330, GROUND_Y, 300, 380], [455, 112, 430, 490], [560, GROUND_Y, 530, 620],
    [740, GROUND_Y, 705, 770], [920, GROUND_Y, 900, 950], [995, 108, 970, 1025], [1050, GROUND_Y, 1010, 1100],
    [1220, GROUND_Y, 1190, 1240], [1380, GROUND_Y, 1340, 1420], [1620, GROUND_Y, 1580, 1660], [1745, 114, 1738, 1752],
    [1810, GROUND_Y, 1780, 1840], [1970, GROUND_Y, 1950, 1995], [2130, GROUND_Y, 2090, 2160], [2365, 110, 2338, 2392],
    [2310, GROUND_Y, 2270, 2420], [2570, GROUND_Y, 2550, 2575], [2690, GROUND_Y, 2650, 2730], [2900, GROUND_Y, 2880, 2960],
  ],
  checkpoints: [725, 1330, 2080, 2670, 3010],
  // The Storm Cloud: a big thundercloud that floats over the arena and shoots lightning bolts at you. Touching his bottom or
  // sides shocks you (you're stunned for 2 seconds, but it costs no life). The only way to hurt him is a ground pound
  // (jump, then press down) landing on top of him. No goalX: his ending script wins the level.
  boss: {
    name: 'THE STORM CLOUD', type: 'storm', x: 3254, hp: 3, arenaLeft: 3092, arenaRight: 3392, camX: 3080, zoneMin: 3220, zoneMax: 3292,
    tip: 'Leap off a ledge, then press DOWN on top of him!', colors: ['#555c7e', '#9aa3c4', '#ffd23f', '#fff6b0'],
  },
  underground: {
    x0: 3200, maxCamY: 100, floorY: 236, babyX: 3243, chamberX: 3228, chamberW: 56, tunnelY: 212, babyR: 4, smashHint: 'lightning wall',
    lines: [
      { who: 'boulder', text: "Hey, lil' pebble! Let me guess, you can talk now?", time: 220 },
      { who: 'baby', text: "I don't know. You tell me!", time: 160 },
      { who: 'boulder', text: "So, I guess that's a 'yes'?", time: 160 },
      { who: 'baby', text: "Dad, you know babies can't talk.", time: 170 },
      { who: 'boulder', text: 'Then how are we talking?!', time: 150 },
      { who: 'baby', text: "I know, right? Life's weird.", time: 160 },
      { who: 'boulder', text: 'Man, I gotta stop going through these dimensional portals...', time: 230 },
    ],
  },
}];

// Scenery scattered on solid ground; drawn behind everything.
const DECOR_KINDS = {
  night: ['stone', 'cross', 'tree', 'stone', 'fence'],
  castle: ['barrel', 'brazier', 'crate', 'barrel', 'crate'],
  brain: ['neuron', 'coil', 'sprout', 'coil', 'neuron'],
  water: ['seaweed', 'coral', 'shell', 'seaweed', 'coral'],
  sky: ['puff', 'rainbowlet', 'tuft', 'puff', 'rainbowlet'],
};
function genDecor(level) {
  const out = [];
  const onGround = (x) => level.solids.some(([sx, sy, sw]) => sy === GROUND_Y && x > sx + 8 && x < sx + sw - 8);
  for (let x = 70, i = 0; x < level.width - 60; x += 38 + ((i * 37) % 31), i++) {
    if (!onGround(x)) continue;
    if (level.checkpoints.some((c) => Math.abs(c - x) < 24) || Math.abs(level.goalX - x) < 24) continue;
    if (level.boss && x > level.boss.arenaLeft - 40) continue; // keep the boss arena clear
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

// ---------- No zooming ----------
// iPad/iPhone Safari ignore user-scalable=no, so block pinch-zoom and double-tap-zoom ourselves.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { // two quick taps = double-tap zoom
  const now = Date.now();
  if (now - lastTouchEnd < 350) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());
addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false }); // trackpad pinch on a laptop

// ---------- Screen layout (landscape vs portrait) ----------
// Landscape: 320x180. Portrait phone: about 195 wide and as tall as fits above the buttons, drawn at a whole-number
// scale so pixels stay crisp. The world sits at the bottom of the screen and the extra height is sky.
// The canvas holds SS x as many pixels as the logical size (the game is still drawn in 320x180 units via a transform),
// so text is rendered sharp instead of being drawn tiny and blown up blurry.
const SS = 4;
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const portrait = vh > vw * 1.15 && matchMedia('(pointer: coarse)').matches;
  document.documentElement.classList.toggle('portrait', portrait);
  if (portrait) {
    const scale = Math.max(2, Math.ceil(vw / 230));
    const avail = vh - document.getElementById('controls').offsetHeight;
    W = Math.floor(vw / scale); H = Math.max(WORLD_H, Math.floor(avail / scale));
    canvas.style.width = W * scale + 'px'; canvas.style.height = H * scale + 'px';
  } else {
    W = 320; H = WORLD_H;
    canvas.style.width = ''; canvas.style.height = '';
  }
  topPad = H - WORLD_H;
  if (canvas.width !== W * SS || canvas.height !== H * SS) { canvas.width = W * SS; canvas.height = H * SS; ctx.imageSmoothingEnabled = false; }
}
addEventListener('resize', layout);
addEventListener('orientationchange', layout);

// ---------- Input ----------
const input = { left: false, right: false, jump: false, jumpPressed: false, dirPressed: false, down: false, downPressed: false };
const keyMap = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
  ArrowDown: 'down', s: 'down', S: 'down',
};
function setInput(name, down) {
  if (name === 'jump' && down && !input.jump) input.jumpPressed = true;
  if (name === 'down' && down && !input.down) input.downPressed = true;
  if ((name === 'left' || name === 'right') && down && !input[name]) input.dirPressed = true; // arrows also advance dialogue
  input[name] = down;
}
addEventListener('keydown', (e) => {
  const n = keyMap[e.key];
  if (n) { e.preventDefault(); setInput(n, true); audioInit(); }
  else if (e.key === 'm' || e.key === 'M') { audioInit(); setMuted(!muted); }
  else if ((state !== 'play' || menuOpen) && LEVELS[+e.key - 1]) pickLevel(+e.key - 1);
  else if (e.key === 'Escape') menuOpen = false;
});
addEventListener('keyup', (e) => {
  const n = keyMap[e.key];
  if (n) setInput(n, false);
});
// Gamepad (wired or Bluetooth): left stick or D-pad moves left/right, A or B jumps, X or Y smashes. Polled once per frame; it only calls setInput when the pad's own
// state changes, so it never fights with the keyboard or touch buttons.
const padWas = { left: false, right: false, jump: false, down: false };
function pollGamepad() {
  if (!navigator.getGamepads) return;
  const now = { left: false, right: false, jump: false, down: false };
  for (const p of navigator.getGamepads()) {
    if (!p || !p.connected) continue;
    const bt = (i) => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0;
    now.left = now.left || bt(14) || ax < -0.5;
    now.right = now.right || bt(15) || ax > 0.5;
    now.jump = now.jump || bt(0) || bt(1);
    now.down = now.down || bt(2) || bt(3);
  }
  for (const n in now) if (now[n] !== padWas[n]) { padWas[n] = now[n]; setInput(n, now[n]); if (now[n]) audioInit(); }
}
document.querySelectorAll('#controls button').forEach((b) => {
  const n = b.dataset.key;
  const down = (e) => { e.preventDefault(); b.classList.add('on'); setInput(n, true); audioInit(); };
  const up = (e) => { e.preventDefault(); b.classList.remove('on'); setInput(n, false); };
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
});
// Secret level picker: tap/click the "LEVEL n" label at the top of the screen 3 times quickly.
// (The label is drawn on the canvas, so we work out where on the canvas the pointer landed.)
let menuOpen = false, hudTaps = [];
const hudLabel = () => ({ x: W / 2 - 40, y: 0, w: 80, h: 20 });
const menuX = () => (W < 260 ? 8 : 60);
const menuRow = (i) => { const h = Math.min(24, 96 / LEVELS.length); return { x: menuX() + 10, y: 56 + i * h, w: W - 2 * menuX() - 20, h: h - 3 }; };
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
  if (inRect(x, y, { x: 0, y: 14, w: 50, h: 12 })) { setMuted(!muted); return; } // the SOUND on/off label
  if (inRect(x, y, hudLabel())) {
    const now = performance.now();
    hudTaps = hudTaps.filter((t) => now - t < 700).concat(now); // keep taps from the last 0.7 seconds
    if (hudTaps.length >= 3) { menuOpen = true; hudTaps = []; }
    return;
  }
  if (state !== 'play' || ending) input.jumpPressed = true;
});

// ---------- Sound (all synthesized with Web Audio, no sound files) ----------
// Everything goes through `master` so M / the SOUND button can mute it. `delay` is seconds from now.
let actx = null, master = null, noiseBuf = null, muted = false;
try { muted = localStorage.getItem('bould-muted') === '1'; } catch (e) { /* storage blocked: fine */ }
function audioInit() {
  if (!actx && (window.AudioContext || window.webkitAudioContext)) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(musicTick, 25);
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 1, actx.currentTime, 0.02);
  try { localStorage.setItem('bould-muted', m ? '1' : '0'); } catch (e) { /* storage blocked: fine */ }
}
function beep(freq, dur, type = 'square', vol = 0.05, slide = 0, delay = 0, dest = master) {
  if (!actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur);
}
// A tone that glides from f0 to f1 while its volume goes from v0 to v1 (for charge-ups and humming).
function tone(type, f0, f1, dur, v0, v1, delay = 0, dest = master) {
  if (!actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(v0, t); g.gain.linearRampToValueAtTime(v1, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}
// Filtered noise: the filter sweeps from f0 to f1 and the volume from v0 to v1 (whooshes, crackles, splats, drums).
function noise(filter, f0, f1, q, dur, v0, v1, delay = 0, dest = master) {
  if (!actx) return;
  const t = actx.currentTime + delay;
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(v0, t); g.gain.linearRampToValueAtTime(v1, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const rand = (a, b) => a + Math.random() * (b - a);
const sfx = {
  jump: () => beep(300, 0.15, 'square', 0.04, 300),
  // a cartoony splat: thud + wet noise + a bloop + two sparkly pings (pitch varies a little each time)
  squish: () => {
    const r = rand(0.9, 1.15);
    tone('sine', 230 * r, 60, 0.14, 0.2, 0.15);
    noise('bandpass', 1500, 300, 1.2, 0.16, 0.14, 0);
    tone('triangle', 520 * r, 170, 0.12, 0.08, 0.05, 0.02);
    beep(880 * r, 0.07, 'square', 0.035, 0, 0.1);
    beep(1320 * r, 0.1, 'square', 0.03, 0, 0.16);
  },
  die: () => beep(400, 0.5, 'sawtooth', 0.06, -350),
  win: () => { beep(523, 0.15); setTimeout(() => beep(659, 0.15), 120); setTimeout(() => beep(784, 0.3), 240); },
  checkpoint: () => beep(700, 0.15, 'triangle', 0.06, 300),
  bubble: () => { const r = rand(0.8, 1.4); tone('sine', 260 * r, 700 * r, 0.09, 0.09, 0.03); tone('sine', 520 * r, 1300 * r, 0.05, 0.03, 0.01, 0.03); }, // a little "blub"
  // Big Brain: a 1.25s charge-up (matches TUNE.brainWindup) that crackles faster and faster, with four tense ticks once
  // the warning columns lock on, then a thunder-crack strike.
  brainCharge: () => {
    tone('sawtooth', 70, 1100, 1.25, 0.01, 0.07);
    tone('square', 140, 2200, 1.25, 0.004, 0.03);
    tone('sine', 50, 160, 1.25, 0.02, 0.16);
    for (let i = 0; i < 32; i++) noise('highpass', rand(2500, 5500), 3000, 1, 0.03, (0.02 + 0.07 * i / 32), 0, 1.25 * (1 - (1 - i / 32) ** 2) + rand(0, 0.015));
    for (let i = 0; i < 4; i++) beep(1000, 0.05, 'square', 0.035, 0, 0.75 + i * 0.15);
  },
  brainZap: () => {
    noise('lowpass', 9000, 500, 0.7, 0.4, 0.28, 0); // the crack
    tone('sawtooth', 2800, 80, 0.3, 0.16, 0);
    tone('square', 1800, 200, 0.12, 0.06, 0, 0.05);
    tone('sine', 130, 36, 0.6, 0.3, 0); // thunder boom
    for (let i = 0; i < 16; i++) noise('bandpass', rand(1500, 6000), rand(600, 2500), 3, rand(0.02, 0.05), 0.1 * (1 - i / 16), 0, 0.12 + i * 0.03 + rand(0, 0.02)); // crackling tail
  },
  // Storm Cloud: a ~0.9s charge-up (matches TUNE.stormWindup), a sharp zap for each bolt, a buzzing shock when you touch him,
  // and far-off thunder with each flash of lightning in the background.
  stormCharge: () => {
    tone('sawtooth', 90, 1000, 0.9, 0.01, 0.06);
    tone('sine', 55, 140, 0.9, 0.02, 0.14);
    for (let i = 0; i < 22; i++) noise('highpass', rand(2500, 5500), 3000, 1, 0.03, 0.02 + 0.06 * i / 22, 0, 0.9 * (1 - (1 - i / 22) ** 2) + rand(0, 0.015));
  },
  stormShot: () => {
    tone('sawtooth', 2600, 160, 0.2, 0.12, 0);
    noise('bandpass', 5000, 900, 1.5, 0.18, 0.14, 0);
    tone('square', 1500, 300, 0.1, 0.05, 0, 0.03);
  },
  zap: () => { // you got shocked
    noise('lowpass', 8000, 600, 0.7, 0.35, 0.25, 0);
    tone('sawtooth', 1800, 120, 0.4, 0.12, 0);
    for (let i = 0; i < 14; i++) noise('bandpass', rand(1500, 6000), rand(800, 2500), 3, rand(0.02, 0.05), 0.09 * (1 - i / 14), 0, 0.05 + i * 0.045 + rand(0, 0.02));
  },
  thunder: () => {
    noise('lowpass', 500, 70, 0.7, 1.3, 0.14, 0, 0.3);
    tone('sine', 70, 28, 1.1, 0.12, 0, 0.3);
  },
};

// ----- Hazard sounds: lasers, synapses and vents charge up when they enter their warning, then fire -----
// Each hazard plays through its own volume bus (`d`), and the bus follows the boulder's distance every frame, so a sound
// that starts far away swells as you roll toward it (and never depends on where on screen it was when it began).
// The warning lasts TUNE.gateOnAt - TUNE.gateWarnAt = 30 frames
// (0.5s) and the deadly part 90 frames (1.5s), so the sounds are built to those lengths.
const HAZARD_SFX = {
  gate: {
    charge: (v, d) => { tone('sawtooth', 160, 1400, 0.5, 0.005, 0.055 * v, 0, d); tone('square', 240, 2100, 0.5, 0.002, 0.025 * v, 0, d); },
    fire: (v, d) => {
      tone('sawtooth', 1800, 180, 0.2, 0.09 * v, 0.02 * v, 0, d);
      tone('square', 110, 110, 1.4, 0.04 * v, 0.03 * v, 0, d); tone('square', 113, 113, 1.4, 0.03 * v, 0.02 * v, 0, d); // two close notes beat against each other: a buzzing hum
    },
  },
  synapse: {
    charge: (v, d) => {
      tone('sawtooth', 300, 1800, 0.5, 0.005, 0.04 * v, 0, d);
      for (let i = 0; i < 12; i++) noise('highpass', rand(2500, 5000), 3000, 1, 0.03, 0.05 * v, 0, i * 0.04 + rand(0, 0.02), d); // little crackles
    },
    fire: (v, d) => {
      tone('sawtooth', 2200, 150, 0.15, 0.09 * v, 0.02 * v, 0, d);
      tone('sawtooth', 60, 60, 1.4, 0.05 * v, 0.03 * v, 0, d);
      for (let i = 0; i < 22; i++) noise('bandpass', rand(1500, 6000), rand(800, 3000), 3, rand(0.02, 0.06), 0.09 * v, 0, i * 0.065 + rand(0, 0.04), d); // zzt-zzt-zzt
    },
  },
  vent: {
    charge: (v, d) => {
      tone('sine', 90, 260, 0.5, 0.01, 0.1 * v, 0, d);
      noise('bandpass', 200, 900, 1, 0.5, 0.01, 0.07 * v, 0, d);
      for (let i = 0; i < 6; i++) beep(rand(300, 700), 0.06, 'sine', 0.05 * v, 200, i * 0.08 + rand(0, 0.04), d); // bubbles
    },
    fire: (v, d) => { // WHOOOSH: noise sweeping up then back down
      tone('sine', 80, 50, 0.25, 0.14 * v, 0, 0, d);
      noise('bandpass', 300, 1500, 0.8, 0.45, 0.01, 0.16 * v, 0, d);
      noise('bandpass', 1500, 400, 0.8, 1.05, 0.16 * v, 0, 0.45, d);
    },
  },
};
// Volume falls off in a straight line to silence at HAZARD_RANGE screen widths away, so it scales with the screen (portrait is narrower):
// loud right next to you, about half at the edge of the screen, silent a little beyond it.
const HAZARD_RANGE = 1;
const hazVol = (x) => clamp(1 - Math.abs(x - boulder.x) / (W * HAZARD_RANGE), 0, 1);
let hazPrev = [], hazLevel = null, sweepHum = null, hazBus = [];
// Called every frame: starts the charge / fire sound when a hazard changes state, and keeps the sweeping beams humming.
function updateHazardSound() {
  if (hazLevel !== LEVEL) { hazLevel = LEVEL; hazPrev = []; hazBus.forEach((g) => g && g.disconnect()); hazBus = []; }
  const audible = actx && state === 'play';
  let hum = 0, humY = 0;
  LEVEL.lasers.forEach((l, i) => {
    const type = l[0];
    if (type === 'sweep') {
      const v = hazVol(l[1] + l[2] / 2);
      if (v > hum) { hum = v; humY = sweepY(l[3]); }
      return;
    }
    const st = gateState(type === 'synapse' ? l[3] : l[2]);
    const x = type === 'synapse' ? l[1] + l[2] / 2 : l[1];
    if (actx) {
      if (!hazBus[i]) { hazBus[i] = actx.createGain(); hazBus[i].connect(master); }
      hazBus[i].gain.setTargetAtTime(audible ? hazVol(x) : 0, actx.currentTime, 0.05);
    }
    if (audible && hazPrev[i] !== undefined && st !== hazPrev[i] && st !== 'off') {
      HAZARD_SFX[type][st === 'warn' ? 'charge' : 'fire'](1, hazBus[i]);
    }
    hazPrev[i] = st;
  });
  if (!actx) return;
  if (!sweepHum && hum > 0) { // a low hum whose pitch follows the beam up and down
    const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(master); o.start();
    sweepHum = { o, g };
  }
  if (sweepHum) {
    sweepHum.o.frequency.setTargetAtTime(140 + (144 - humY) * 4, actx.currentTime, 0.05);
    sweepHum.g.gain.setTargetAtTime(audible ? 0.03 * hum : 0, actx.currentTime, 0.1);
  }
}

// ----- Music: a tiny step sequencer, scheduled a little ahead of time -----
// Notes are MIDI numbers (60 = middle C); 0 means a rest. `calm` plays on the levels, `boss` during a boss fight.
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);
const note = (type, n, dur, vol, t, bus) => beep(midiHz(n), dur, type, vol, 0, t - actx.currentTime, bus);
const MUSIC = {
  // Relaxing: C - Am - F - G, 8th notes at 96 bpm. The melody takes a breather every other time through.
  calm: {
    step: 60 / 96 / 2, len: 32,
    roots: [48, 45, 41, 43], tones: [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]],
    melody: [
      [76, 0, 72, 0, 67, 0, 72, 74], [76, 0, 0, 72, 69, 0, 72, 0],
      [77, 0, 76, 0, 72, 0, 69, 72], [74, 0, 71, 0, 67, 0, 0, 0],
    ],
    play(s, t, loop, bus) {
      const bar = s >> 3, k = s & 7, root = this.roots[bar], tones = this.tones[bar];
      const bass = { 0: 0, 4: 7, 6: 12 }[k];
      if (bass !== undefined) note('triangle', root + bass, this.step * 1.8, 0.09, t, bus);
      note('square', root + 12 + tones[[0, 1, 2, 1, 0, 1, 2, 1][k]], this.step * 0.9, 0.016, t, bus);
      const m = this.melody[bar][k];
      if (m && loop % 2 === 0) note('square', m, this.step * 1.8, 0.028, t, bus);
      if (k === 2 || k === 6) noise('highpass', 7000, 7000, 1, 0.03, 0.012, 0, t - actx.currentTime, bus);
    },
  },
  // Intense: Am - F - G - E, 16th notes at 150 bpm, driving bass, kick and snare.
  boss: {
    step: 60 / 150 / 4, len: 64,
    roots: [45, 41, 43, 40], tones: [[0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12]],
    melody: [
      [81, 0, 81, 0, 84, 0, 81, 0, 79, 0, 76, 0, 79, 0, 81, 0], [77, 0, 77, 0, 81, 0, 77, 0, 76, 0, 72, 0, 76, 0, 77, 0],
      [79, 0, 79, 0, 83, 0, 79, 0, 74, 0, 79, 0, 83, 0, 86, 0], [83, 0, 83, 0, 80, 0, 83, 0, 76, 0, 80, 0, 83, 0, 0, 0],
    ],
    play(s, t, loop, bus) {
      const bar = s >> 4, k = s & 15, root = this.roots[bar], tones = this.tones[bar], d = t - actx.currentTime;
      if (k % 2 === 0) note('sawtooth', root + (k === 6 ? 12 : k === 14 ? 7 : 0), this.step * 1.5, 0.05, t, bus);
      note('square', root + 12 + tones[[0, 1, 2, 3, 2, 1, 2, 1][k & 7]], this.step * 0.8, 0.018, t, bus);
      const m = this.melody[bar][k];
      if (m) note('square', m, this.step * 1.8, 0.035, t, bus);
      if (k % 4 === 0) { beep(160, 0.12, 'sine', 0.2, -120, d, bus); } // kick
      if (k === 4 || k === 12 || (bar === 3 && k > 12)) noise('bandpass', 1800, 1200, 0.7, 0.09, 0.07, 0, d, bus); // snare (plus a fill at the end)
      if (k % 4 === 2) noise('highpass', 8000, 8000, 1, 0.03, 0.02, 0, d, bus); // hi-hat
    },
  },
};
let music = null; // the track that's playing: { name, bus, step, next, loop }
function startMusic(name) {
  const now = actx.currentTime;
  if (music) { // fade the old track out
    const old = music.bus;
    old.gain.setTargetAtTime(0, now, 0.05);
    setTimeout(() => old.disconnect(), 600);
  }
  music = null;
  if (!name) return;
  const bus = actx.createGain(); bus.connect(master);
  music = { name, bus, step: 0, next: now + 0.08, loop: 0 };
}
function musicTick() {
  if (!actx || actx.state !== 'running') return;
  const want = state === 'gameover' ? null : boss && boss.active && !boss.dead ? 'boss' : 'calm';
  if ((music ? music.name : null) !== want) startMusic(want);
  if (!music) return;
  const tr = MUSIC[music.name], now = actx.currentTime;
  if (music.next < now) music.next = now + 0.02; // we fell behind (hidden tab?): skip ahead instead of rushing
  while (music.next < now + 0.15) {
    tr.play(music.step, music.next, music.loop, music.bus);
    music.next += tr.step;
    if (++music.step >= tr.len) { music.step = 0; music.loop++; }
  }
}

// Confetti colors when you squish someone, by kind of person.
const SQUISH_COLORS = {
  person: ['#ffe14d', '#fff', '#ff7ab8'],
  zombie: ['#9be07a', '#eaeaea', '#c9b8ff'],
  knight: ['#c8d2e6', '#ffffff', '#e8303a'],
  brain: ['#ff9ec4', '#ffffff', '#c9a2ff', '#8fd8ff'],
  monster: ['#2a8ad0', '#ffffff', '#7ac0ff', '#c9f5ff'],
  cloud: ['#ffffff', '#bfe3ff', '#ffe3f1', '#fff6b0'],
};

// ---------- Game state ----------
let state = 'title'; // title | play | win | gameover
let storm = 0; // 0 = sunny sky, 1 = thunderstorm (fades in while the Storm Cloud fight is on)
let boulder, people, ghosts, boss, bossIntro = 0, solids, hasKey, key, ending, baby, camY = 0, shake = 0, lockedHint = 0, particles, decals, floaters, lives, squished, deadTimer, spawnX, camX, frame = 0, introTimer = 0;

// People never walk onto spikes or through lasers: trim each walk range at the nearest one on their floor.
function walkLimits(x, floorY, min, max) {
  const blocks = [
    ...LEVEL.spikes,
    ...LEVEL.lasers.map((l) => (l[0] === 'gate' ? [l[1] - 4, 8] : l[0] === 'vent' ? [l[1] - 6, 12] : [l[1], l[2]])),
  ];
  for (const [sx, sw, sy = GROUND_Y] of blocks) {
    if (sy !== floorY || sx + sw < min || sx > max) continue;
    if (sx > x) max = Math.min(max, sx - 5); else min = Math.max(min, sx + sw + 5);
  }
  // nobody ever goes past the final flag: touching it wins the level, so you couldn't squish them any more
  if (LEVEL.goalX) { max = Math.min(max, LEVEL.goalX - 12); min = Math.min(min, max); }
  return [min, max];
}

function resetRun() {
  lives = TUNE.lives; squished = 0; spawnX = 40;
  people = LEVEL.people.map(([x, floorY, lo, hi]) => {
    const [min, max] = walkLimits(x, floorY, lo, hi);
    return {
      x: Math.min(x, max), floorY, min, max, dir: Math.random() < 0.5 ? -1 : 1,
      speed: 0.25 + Math.random() * 0.2, hue: Math.floor(Math.random() * 5), alive: true, scared: false,
    };
  });
  ghosts = LEVEL.ghosts.map(([cx, cy, range, phase]) => ({ cx, cy, range, phase, x: cx, y: cy, face: 1, chase: false }));
  decals = [];
  boss = LEVEL.boss ? { hp: LEVEL.boss.hp, dead: false } : null;
  solids = LEVEL.solids.map((sd) => sd.slice()); // a copy, because smashing and unlocking remove pieces
  hasKey = false; key = null; ending = null; camY = 0; shake = 0; lockedHint = 0; storm = 0;
  baby = LEVEL.underground ? { x: LEVEL.underground.babyX, y: LEVEL.underground.floorY - LEVEL.underground.babyR, vx: 0, vy: 0, rot: 0, free: false } : null;
  respawn();
}
function respawn() {
  if (boss) Object.assign(boss, { // the fight starts over when you respawn, but damage you've done stays
    x: LEVEL.boss.x, dir: -1, state: 'idle', timer: 0, invul: 0, active: false, wall: 0, target: 0, strikes: [], shots: [], lanes: [], queue: [], nextShot: 0, tailSide: 1, aimX: 0, aimY: 0, locked: false, left: 0,
  });
  boulder = { x: spawnX, y: GROUND_Y - 30, vx: 0, vy: 0, rot: 0, onGround: false, coyote: 0, jumpBuf: 0, face: 1, age: 0, stun: 0, shockGrace: 0 };
  for (const g of ghosts) { [g.x, g.y] = ghostHome(g); g.chase = false; } // ghosts go back to their patrol
  particles = []; floaters = []; deadTimer = 0;
  camX = Math.max(0, spawnX - W * 0.34);
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

// A few bubbles drifting up from (x, y); Watertopia's version of a puff of dust.
function spawnBubbles(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({ x: x + (Math.random() - 0.5) * 12, y: y - Math.random() * 4, vx: 0, vy: -rand(0.3, 0.6), life: 50 + Math.random() * 40, size: Math.random() < 0.5 ? 4 : 3, bubble: true, phase: Math.random() * 6 });
  }
}

function die() {
  if (ending) return; // nothing can hurt you during the ending
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
const VENT_TOP = 66; // a hot-water column reaches up to this y (a jump only lifts the boulder's bottom to ~y98), so you can't hop over it
const sweepY = (phase, ahead = 0) => 117 + Math.sin((frame + ahead + phase) * TUNE.sweepSpeed) * 27;

function laserHits(l, cx, cy, r) {
  if (l[0] === 'gate') return gateState(l[2]) === 'on' && hitsCircleRect(cx, cy, r, l[1] - 2, 14, 5, GROUND_Y - 14);
  if (l[0] === 'synapse') return gateState(l[3]) === 'on' && hitsCircleRect(cx, cy, r, l[1] - 2, 132, l[2] + 4, GROUND_Y - 132);
  if (l[0] === 'vent') return gateState(l[2]) === 'on' && hitsCircleRect(cx, cy, r, l[1] - 5, VENT_TOP, 10, GROUND_Y - VENT_TOP);
  return hitsCircleRect(cx, cy, r, l[1], sweepY(l[3]) - 2, l[2], 4);
}

function hitsCircleRect(cx, cy, r, rx, ry, rw, rh) {
  const px = clamp(cx, rx, rx + rw), py = clamp(cy, ry, ry + rh);
  const dx = cx - px, dy = cy - py;
  return dx * dx + dy * dy < r * r;
}

const bossWall = () => [LEVEL.boss.arenaLeft - 16, 0, 12, GROUND_Y]; // drops behind you when the boss fight starts

// Smashable pieces of level are solids with a 5th entry, 'sand'. Smashing one removes it.
function smashSolid(sd) {
  solids = solids.filter((o) => o !== sd);
  const bits = { brain: ['#f4efe0', '#d8d0b8', '#b8ae94', '#ffffff'], water: ['#ff8fa0', '#ffb3bd', '#e07388', '#ffffff'], sky: ['#fff6b0', '#ffd23f', '#7df0ff', '#ffffff'] }[LEVEL.theme] || ['#e3c276', '#f0d890', '#c9a75a', '#ffffff'];
  spawnBurst(sd[0] + sd[2] / 2, sd[1] + 2, bits, 26, 2);
  spawnBurst(boulder.x, sd[1], bits.slice(0, 2), 12, 1.6);
  shake = 10; beep(120, 0.3, 'sawtooth', 0.07, -70);
  floaters.push({ x: sd[0] + sd[2] / 2, y: sd[1] - 12, text: 'SMASH!', life: 40 });
}

function updateBoulder() {
  const b = boulder, r = TUNE.radius, prevBottom = b.y + r;
  const T = LEVEL.tune ? { ...TUNE, ...LEVEL.tune } : TUNE; // a level can override how the boulder moves (Watertopia: floaty)
  const c = ending ? ending.ctrl : input; // during the ending the boulder is moved by the script, not by you
  const stunned = b.stun > 0; // shocked by the Storm Cloud: can't move, jump or smash until it wears off
  if (stunned) { c.jumpPressed = false; c.downPressed = false; b.jumpBuf = 0; }
  const dir = stunned ? 0 : (c.right ? 1 : 0) - (c.left ? 1 : 0);
  const acc = b.onGround ? T.accel : T.airAccel;
  if (dir) { b.vx += dir * acc; b.face = dir; }
  else if (b.onGround) {
    b.vx = Math.abs(b.vx) < T.friction ? 0 : b.vx - Math.sign(b.vx) * T.friction;
  }
  b.vx = clamp(b.vx, -T.maxSpeed, T.maxSpeed);

  if (c.jumpPressed) { b.jumpBuf = 6; c.jumpPressed = false; }
  // Smash: jump, then press down to slam straight down. It breaks sand (and anything else smashable).
  if (c.downPressed) {
    c.downPressed = false;
    if (!b.onGround && !b.smashing) { b.smashing = true; b.vy = TUNE.smashSpeed; b.vx = 0; beep(180, 0.2, 'sawtooth', 0.05, -100); }
  }
  if (b.jumpBuf > 0 && b.coyote > 0) {
    b.vy = -T.jump; b.coyote = 0; b.jumpBuf = 0; b.onGround = false; sfx.jump();
    if (LEVEL.theme === 'water') spawnBubbles(b.x, b.y + r, 3);
  }
  if ((!c.jump || stunned) && b.vy < -2.2 && !b.smashing) b.vy = -2.2; // release early = short hop
  b.jumpBuf--;

  b.vy += b.vy > 0 && !b.smashing && T.fallGravity ? T.fallGravity : T.gravity; // a level can make falling gentler than rising
  b.vy = Math.min(b.vy, b.smashing ? TUNE.smashSpeed : T.maxFall);
  b.x += b.vx; b.y += b.vy;
  b.x = Math.max(r, b.x);

  const wasOnGround = b.onGround, fallSpeed = b.vy;
  b.onGround = false;
  const wasSmashing = b.smashing;
  let onBrick = false;
  const list = boss && boss.active ? solids.concat([bossWall()]) : solids;
  for (const sd of list) {
    const [sx, sy, sw, sh, type] = sd;
    const cx = clamp(b.x, sx, sx + sw), cy = clamp(b.y, sy, sy + sh);
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let nx, ny, pen;
    if (d2 > 0.0001) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = r - d; }
    else { nx = 0; ny = -1; pen = r + (b.y - sy); }
    if (type === 'sand' && b.smashing && ny < -0.5 && (!boss || boss.dead)) { smashSolid(sd); b.vy = Math.min(b.vy, 5); continue; } // smashed!
    if (type === 'brick' && ny < -0.6) onBrick = true;
    b.x += nx * pen; b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const bounce = vn < -3 ? 0.25 : 0;
      b.vx -= (1 + bounce) * vn * nx;
      b.vy -= (1 + bounce) * vn * ny;
    }
    if (ny < -0.6) b.onGround = true;
  }
  if (b.onGround && wasSmashing) { // landed from a smash: thud and dust
    b.smashing = false; shake = 8; beep(90, 0.18, 'square', 0.07, -40);
    spawnBurst(b.x, b.y + r, ['#c9c4d8', '#9a96ae', '#ffffff'], 10, 1.3);
    if (boss && boss.active && !boss.dead && LEVEL.boss.type === 'genie' && boss.state !== 'roar' && boss.invul <= 0
      && Math.abs(boss.tailSide) > 0.6 && Math.abs(b.x - genieTail()) < 26) { // ground pound on the Water Genie's tail
      hurtBoss(); b.vy = -T.jump * 0.7; b.onGround = false; b.coyote = 0;
    }
  }
  if (b.onGround && !wasOnGround && !wasSmashing && fallSpeed > 1.5 && !ending) { // landed from a regular jump: a small puff
    if (LEVEL.theme === 'water') spawnBubbles(b.x, b.y - 2, 4);
    else spawnBurst(b.x, b.y + r, ['#c9c4d8', '#9a96ae', '#ffffff'], 4, 0.7);
  }
  if (onBrick) { // the locked brick floor: the key opens it
    if (hasKey && !ending) startEnding();
    else if (!hasKey) lockedHint = 90;
  }
  b.coyote = b.onGround ? 6 : b.coyote - 1;
  b.age++;
  b.rot += b.vx / r;
  if (b.stun > 0) { // shocked: sparks fly until it wears off, then a short grace period before he can shock you again
    b.stun--;
    if (frame % 4 === 0) spawnBurst(b.x, b.y, ['#ffd23f', '#fff6b0', '#7df0ff'], 3, 1.1);
  } else if (b.shockGrace > 0) b.shockGrace--;

  // landing on the boss's head from above (the only way to hurt him); you bounce off either way
  if (boss && boss.active && !boss.dead && LEVEL.boss.type === 'storm') stormContact(prevBottom);
  else if (boss && boss.active && !boss.dead && b.vy > 0 && LEVEL.boss.type !== 'genie') {
    const headTop = GROUND_Y - TUNE.bossHeight;
    if (prevBottom <= headTop + 3 && b.y + r >= headTop && Math.abs(b.x - boss.x) < (LEVEL.boss.hitW || 22)) {
      b.y = headTop - r - 1; b.vy = -T.jump * 0.85; b.onGround = false; b.coyote = 0; b.smashing = false;
      if (boss.invul <= 0) hurtBoss();
      else beep(300, 0.1, 'square', 0.04, 200);
    }
  }

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
  if (b.y > (LEVEL.underground && b.x > LEVEL.underground.x0 ? 330 : WORLD_H + 30)) { die(); return; }

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
  if (LEVEL.goalX && b.x > LEVEL.goalX) { state = 'win'; sfx.win(); }
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

// ----- The Giant Knight -----
// idle -> (you enter the arena) roar -> walk <-> windup -> swing -> recover; a head hit puts him in 'hurt'.
function hurtBoss() {
  boss.hp--;
  boss.invul = TUNE.bossHurt; boss.state = 'hurt'; boss.timer = TUNE.bossHurt;
  const genie = LEVEL.boss.type === 'genie', fx = genie ? genieTail() : boss.x; // the genie is hurt at his tail
  const fy = genie ? GROUND_Y - 8 : LEVEL.boss.type === 'storm' ? STORM.top : GROUND_Y - TUNE.bossHeight;
  spawnBurst(fx, fy, LEVEL.boss.colors || ['#c8d2e6', '#ffffff', '#e8303a', '#ffd23f'], 22, 2.2);
  floaters.push({ x: fx, y: fy - 14, text: boss.hp > 0 ? 'OUCH!' : 'DEFEATED!', life: 60 });
  beep(160, 0.35, 'sawtooth', 0.08, -90);
  if (boss.hp <= 0) {
    boss.dead = true; boss.timer = 150;
    spawnBurst(boss.x, GROUND_Y - 30, (LEVEL.boss.colors || ['#c8d2e6', '#9fb1cf', '#e8303a', '#ffd23f']).concat('#fff'), 60, 3);
    sfx.win();
  }
}

function updateBoss() {
  if (!boss) return;
  const b = boulder, cfg = LEVEL.boss;
  if (boss.dead) {
    boss.timer--;
    boss.strikes = []; boss.shots = [];
    if (!LEVEL.underground) { if (boss.timer <= 0) { state = 'win'; sfx.win(); } } // no secret ending: beating the boss wins
    else if (boss.timer === 80) { // after the explosion, he drops a key
      key = { x: boss.x, y: GROUND_Y - TUNE.bossHeight, vy: -2.5, rest: false };
      floaters.push({ x: boss.x, y: GROUND_Y - 80, text: 'A KEY!', life: 70 });
    }
    return;
  }
  if (!boss.active) {
    if (b.x > cfg.arenaLeft) { boss.active = true; boss.state = 'roar'; boss.timer = 70; bossIntro = 120; beep(110, 0.6, 'sawtooth', 0.08, -40); }
    return;
  }
  boss.wall = Math.min(1, boss.wall + 1 / 25); // the portcullis drops behind you
  if (boss.invul > 0) boss.invul--;
  if (cfg.type === 'genie') { updateGenieShots(); boss.tailSide += clamp(-boss.dir - boss.tailSide, -0.05, 0.05); } // the tail swings round behind him
  if (cfg.type === 'storm') { updateStormShots(); if (frame % 260 === 3) sfx.thunder(); } // thunder rolls in after each flash in the sky
  boss.timer--;
  const dx = b.x - boss.x, reach = TUNE.bossReach;
  const nearGround = b.y + TUNE.radius > 124; // sword only reaches low: ledges and jumps over it are safe
  if (boss.state === 'roar' || boss.state === 'hurt') { if (boss.timer <= 0) { boss.state = 'walk'; boss.timer = 40; } }
  else if (cfg.type === 'brain') updateBigBrain();
  else if (cfg.type === 'genie') updateGenie();
  else if (cfg.type === 'storm') updateStorm();
  else if (boss.state === 'walk') {
    boss.dir = dx >= 0 ? 1 : -1;
    const speed = TUNE.bossSpeed + (cfg.hp - boss.hp) * 0.1;
    const tx = clamp(b.x, cfg.zoneMin, cfg.zoneMax);
    if (Math.abs(tx - boss.x) > speed) boss.x += Math.sign(tx - boss.x) * speed;
    if (nearGround && Math.abs(dx) < reach + 12) { boss.state = 'windup'; boss.timer = TUNE.bossWindup; }
  } else if (boss.state === 'windup') {
    if (boss.timer <= 0) { boss.state = 'swing'; boss.timer = TUNE.bossSwing; beep(220, 0.2, 'square', 0.06, -160); }
  } else if (boss.state === 'swing') {
    const progress = 1 - boss.timer / TUNE.bossSwing;
    if (progress >= 0.55 && deadTimer === 0) { // the low sweep at the end of the swing
      const x0 = boss.dir > 0 ? boss.x + 8 : boss.x - 8 - reach;
      if (hitsCircleRect(b.x, b.y, TUNE.radius - 1, x0, 118, reach, GROUND_Y - 118)) die();
    }
    if (boss.timer <= 0) { boss.state = 'recover'; boss.timer = 40; }
  } else if (boss.state === 'recover') {
    if (boss.timer <= 0) boss.state = 'walk';
  }
}

// ----- The Big Brain -----
// It floats toward you, charges up (a warning column shows where the lightning will land; it follows you at first,
// then locks on so you can step away), zaps, and rests. Each hit you land adds one more column.
const brainColumns = (target, flip, n) => [0, 64 * flip, -64 * flip].slice(0, n).map((o) => target + o);

function updateBigBrain() {
  const b = boulder, cfg = LEVEL.boss, hits = cfg.hp - boss.hp;
  boss.dir = b.x >= boss.x ? 1 : -1;
  if (boss.state === 'walk') {
    const speed = TUNE.brainSpeed + hits * 0.08, tx = clamp(b.x, cfg.zoneMin, cfg.zoneMax);
    if (Math.abs(tx - boss.x) > speed) boss.x += Math.sign(tx - boss.x) * speed;
    if (boss.timer <= 0) { boss.state = 'windup'; boss.timer = TUNE.brainWindup; sfx.brainCharge(); boss.flip = Math.random() < 0.5 ? 1 : -1; }
  } else if (boss.state === 'windup') {
    if (boss.timer > TUNE.brainLock) boss.target = b.x;
    boss.strikes = brainColumns(boss.target, boss.flip, 1 + hits);
    if (boss.timer <= 0) { boss.state = 'swing'; boss.timer = TUNE.brainZap; sfx.brainZap(); shake = 8; }
  } else if (boss.state === 'swing') {
    if (deadTimer === 0) for (const x of boss.strikes) if (hitsCircleRect(b.x, b.y, TUNE.radius - 1, x - 6, 0, 12, GROUND_Y)) { die(); break; }
    if (boss.timer <= 0) { boss.state = 'recover'; boss.timer = TUNE.brainRest; boss.strikes = []; }
  } else if (boss.state === 'recover') {
    if (boss.timer <= 0) { boss.state = 'walk'; boss.timer = 0; }
  }
}

// ----- The Water Genie -----
// walk (floats toward you) -> windup (dotted lines show the lanes) -> swing (shoots a volley) -> recover.
// Bolts fly along the ground ('low': jump over it) or at head height ('high': stay low). Only a ground pound on his tail hurts him.
const genieTail = () => boss.x + boss.tailSide * 26; // center of the tail lying on the ground
const GENIE_LANE_Y = { low: 140, high: 116 };

function updateGenie() {
  const b = boulder, cfg = LEVEL.boss, hits = cfg.hp - boss.hp, gap = TUNE.genieShotGap;
  if (boss.state === 'walk') {
    boss.dir = b.x >= boss.x ? 1 : -1;
    const speed = TUNE.genieSpeed + hits * 0.1, tx = clamp(b.x - boss.dir * 40, cfg.zoneMin, cfg.zoneMax); // keeps a little distance
    if (Math.abs(tx - boss.x) > speed) boss.x += Math.sign(tx - boss.x) * speed;
    if (boss.timer <= 0) {
      const n = Math.min(3, 1 + hits), low = Math.random() < 0.6 ? 1 : 0; // highs first, so you never have to dodge a high one while in the air
      boss.lanes = [...Array(n - low).fill('high'), ...(low ? ['low'] : [])];
      boss.state = 'windup'; boss.timer = TUNE.genieWindup;
    }
  } else if (boss.state === 'windup') {
    if (boss.timer <= 0) { boss.state = 'swing'; boss.queue = boss.lanes.slice(); boss.nextShot = 0; boss.timer = boss.lanes.length * gap + 25; }
  } else if (boss.state === 'swing') {
    if (--boss.nextShot <= 0 && boss.queue.length) {
      boss.shots.push({ x: boss.x + boss.dir * 22, y: GENIE_LANE_Y[boss.queue.shift()], vx: boss.dir * TUNE.genieShotSpeed });
      boss.nextShot = gap; beep(260, 0.18, 'sine', 0.06, -140);
    }
    if (boss.timer <= 0) { boss.state = 'recover'; boss.timer = TUNE.genieRest; }
  } else if (boss.state === 'recover') {
    if (boss.timer <= 0) { boss.state = 'walk'; boss.timer = 35; }
  }
}

function updateGenieShots() {
  const b = boulder, cfg = LEVEL.boss, reach = TUNE.radius - 1 + 5;
  for (const s of boss.shots) {
    s.x += s.vx;
    if (deadTimer === 0 && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 < reach * reach) die();
  }
  boss.shots = boss.shots.filter((s) => s.x > cfg.arenaLeft - 12 && s.x < cfg.arenaRight);
}

// ----- The Storm Cloud -----
// A big thundercloud floating over the arena (not solid: you can roll under him, his underside is at y 128 and you're 132+ on the ground).
// - His top (y 88) is reachable only from the ledges. Landing on it with a smash (ground pound) hurts him; a normal landing just bounces.
// - His bottom and sides shock you: stunned for TUNE.stormStun frames (can't move), but it costs no life.
// - Attack: charge up (a dotted line follows you, then locks on), then shoot 1-3 lightning bolts along it, each aimed at where you were.
const STORM = { top: 88, bottom: 128, half: 28, cy: 108 };

function shockBoulder() {
  const b = boulder, away = b.x >= boss.x ? 1 : -1;
  b.stun = TUNE.stormStun; b.shockGrace = TUNE.stormStunGrace; b.smashing = false;
  b.vx = away * 2.2; b.vy = b.y >= STORM.bottom - 4 ? 2.5 : -2.2; // from below you get knocked down, from the side you hop away
  shake = 10; sfx.zap();
  spawnBurst(b.x, b.y, ['#ffd23f', '#fff6b0', '#7df0ff', '#ffffff'], 20, 2);
  floaters.push({ x: b.x, y: b.y - 16, text: 'ZAP!', life: 60 });
}

// Called every frame while the fight is on: ground pound on top, or shock from the bottom and sides.
function stormContact(prevBottom) {
  const b = boulder, r = TUNE.radius;
  if (b.vy > 0 && prevBottom <= STORM.top + 3 && b.y + r >= STORM.top && Math.abs(b.x - boss.x) < STORM.half + 6) { // landed on top
    const pound = b.smashing;
    b.y = STORM.top - r - 1; b.vy = -TUNE.jump * 0.85; b.onGround = false; b.coyote = 0; b.smashing = false;
    if (pound && boss.invul <= 0 && boss.state !== 'roar') { hurtBoss(); shake = 12; }
    else {
      beep(300, 0.1, 'square', 0.04, 200);
      if (!pound && boss.invul <= 0 && !floaters.some((f) => f.text === 'PRESS DOWN!')) floaters.push({ x: b.x, y: b.y - 16, text: 'PRESS DOWN!', life: 50 });
    }
    return;
  }
  if (b.stun > 0 || b.shockGrace > 0 || boss.invul > 0 || boss.state === 'roar' || ending) return;
  if (hitsCircleRect(b.x, b.y, r - 1, boss.x - STORM.half, STORM.top + 4, STORM.half * 2, STORM.bottom - STORM.top - 4)) shockBoulder();
}

function updateStorm() {
  const b = boulder, cfg = LEVEL.boss, hits = cfg.hp - boss.hp, gap = TUNE.stormShotGap;
  boss.dir = b.x >= boss.x ? 1 : -1;
  if (b.stun > 0 && boss.state !== 'walk') { boss.state = 'walk'; boss.timer = 60; boss.shots = []; boss.locked = false; } // no cheap shots while you're stunned
  if (boss.state === 'walk') {
    const speed = TUNE.stormSpeed + hits * 0.08, tx = clamp(b.x, cfg.zoneMin, cfg.zoneMax);
    if (Math.abs(tx - boss.x) > speed) boss.x += Math.sign(tx - boss.x) * speed;
    if (b.stun > 0) boss.timer = Math.max(boss.timer, 50); // he waits a moment after the shock wears off
    if (boss.timer <= 0) { boss.state = 'windup'; boss.timer = TUNE.stormWindup; boss.left = Math.min(3, 1 + hits); sfx.stormCharge(); }
  } else if (boss.state === 'windup') {
    boss.locked = boss.timer <= TUNE.stormLock;
    if (!boss.locked) { boss.aimX = b.x; boss.aimY = b.y; }
    if (boss.timer <= 0) { boss.state = 'swing'; boss.nextShot = 0; }
  } else if (boss.state === 'swing') {
    if (boss.nextShot > 0) { // between bolts the line shows up again and locks on just before the next one
      boss.nextShot--; boss.locked = boss.nextShot <= 12;
      if (!boss.locked) { boss.aimX = b.x; boss.aimY = b.y; }
    }
    if (boss.nextShot <= 0) {
      const dx = boss.aimX - boss.x, dy = boss.aimY - STORM.cy, d = Math.hypot(dx, dy) || 1;
      boss.shots.push({ x: boss.x, y: STORM.cy, vx: dx / d * TUNE.stormShotSpeed, vy: dy / d * TUNE.stormShotSpeed, age: 0 });
      sfx.stormShot(); boss.left--; boss.locked = false; boss.nextShot = gap;
      if (boss.left <= 0) { boss.state = 'recover'; boss.timer = TUNE.stormRest; }
    }
  } else if (boss.state === 'recover') {
    boss.locked = false;
    if (boss.timer <= 0) { boss.state = 'walk'; boss.timer = 35; }
  }
}

function updateStormShots() {
  const b = boulder, cfg = LEVEL.boss, reach = TUNE.radius - 1 + 4;
  for (const s of boss.shots) {
    s.x += s.vx; s.y += s.vy; s.age++;
    if (deadTimer === 0 && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 < reach * reach) die();
    if (s.y >= GROUND_Y - 2) { s.dead = true; spawnBurst(s.x, GROUND_Y - 2, ['#ffd23f', '#fff6b0', '#ffffff'], 6, 1.2); } // fizzles out on the cloud floor
  }
  boss.shots = boss.shots.filter((s) => !s.dead && s.age < 200 && s.x > cfg.arenaLeft - 12 && s.x < cfg.arenaRight && s.y > -20);
}

// ----- The key, and the ending -----
function updateKey() {
  if (!key || key.taken) return;
  if (!key.rest) {
    key.vy += 0.25; key.y += key.vy;
    if (key.y >= GROUND_Y - 6) { key.y = GROUND_Y - 6; key.vy *= -0.4; if (Math.abs(key.vy) < 0.6) { key.vy = 0; key.rest = true; } }
  }
  if (!ending && deadTimer === 0 && Math.hypot(boulder.x - key.x, boulder.y - key.y) < TUNE.radius + 6) {
    key.taken = true; hasKey = true; sfx.checkpoint();
    spawnBurst(key.x, key.y, ['#ffd23f', '#fff6b0', '#ffffff'], 16, 1.6);
    floaters.push({ x: key.x, y: key.y - 14, text: 'GOT THE KEY!', life: 70 });
  }
}

function startEnding() {
  const u = LEVEL.underground, lockX = 3228 + 28;
  ending = {
    step: 'unlockFloor', t: 0, line: 0, ctrl: { left: false, right: false, jump: false, jumpPressed: false, down: false, downPressed: false },
    floorOpen: 0, cageOpen: 0, key: { x: boulder.x, y: boulder.y, show: true }, lockX, scriptX: u.chamberX + 40, wait: 0,
  };
  boulder.vx = 0; sfx.checkpoint();
}

function flyKey(k, tx, ty, p) { // moves the key icon from where it was toward the lock
  k.x += (tx - k.x) * p; k.y += (ty - k.y) * p;
}

function updateEnding() {
  const e = ending, b = boulder, u = LEVEL.underground, c = e.ctrl;
  e.t++;
  const next = (step) => { e.step = step; e.t = 0; };
  const skip = input.jumpPressed || input.dirPressed; input.jumpPressed = input.dirPressed = false; // jump/arrow/tap advances dialogue
  if (e.step === 'unlockFloor') {
    flyKey(e.key, e.lockX, 172, 0.12);
    if (e.t === 28) { // click! the lock pops
      beep(900, 0.08, 'square', 0.06, 300); spawnBurst(e.lockX, 172, ['#ffd23f', '#fff6b0'], 16, 1.8); e.key.show = false;
    }
    if (e.t > 30) e.floorOpen = Math.min(1, (e.t - 30) / 30);
    if (e.t === 60) { solids = solids.filter((sd) => sd[4] !== 'brick'); beep(130, 0.4, 'sawtooth', 0.06, -60); shake = 12; next('fall'); }
  } else if (e.step === 'fall') { // you drop into the chamber, then roll over next to the cage
    const landed = b.onGround && b.y > u.floorY - 40;
    if (landed || e.t > 240) e.wait++;
    if (e.wait > 15) next('toCage');
  } else if (e.step === 'toCage') {
    const dx = e.scriptX - b.x; c.right = dx > 6; c.left = dx < -6;
    if (Math.abs(dx) <= 6 || e.t > 200) { c.right = c.left = false; e.key = { x: b.x, y: b.y, show: true }; next('cageUnlock'); }
  } else if (e.step === 'cageUnlock') { // the key flies to the cage's lock, the cage lifts away
    flyKey(e.key, u.chamberX + 27, u.floorY - 12, 0.14);
    if (e.t === 26) { beep(900, 0.08, 'square', 0.06, 300); spawnBurst(u.chamberX + 27, u.floorY - 12, ['#ffd23f', '#fff6b0'], 16, 1.8); e.key.show = false; hasKey = false; }
    if (e.t === 30) solids = solids.filter((sd) => sd[4] !== 'cage');
    if (e.t > 30) e.cageOpen = Math.min(1, (e.t - 30) / 30);
    if (e.t === 62) { baby.free = true; baby.vy = -2.6; sfx.checkpoint(); next('talk'); }
  } else if (e.step === 'talk') {
    const line = u.lines[e.line];
    b.face = baby.x > b.x ? 1 : -1; baby.face = -b.face; // they look at each other while they talk
    if (line.who === 'baby' && e.t % 34 === 2) baby.vy = -2.2; // the baby hops while it talks
    if (line.who === 'baby' && u.babyBubbles && frame % 12 === 0) sfx.bubble(); // blub, in time with its mouth
    if (u.babyBubbles && frame % 6 === 0 && isTalking(line.who)) { // little bubbles float up from the speaker's mouth
      const [mx, my] = line.who === 'baby' ? [baby.x + baby.face * 3, baby.y + (u.babyR < 6 ? 2 : 3)] : [b.x + b.face * 4, b.y + 4];
      particles.push({ x: mx, y: my, vx: 0, vy: -rand(0.3, 0.5), life: 70 + Math.random() * 30, size: Math.random() < 0.4 ? 4 : 3, bubble: true, phase: Math.random() * 6 });
    }
    if (skip && e.t > 15) { e.line++; e.t = 0; if (e.line >= u.lines.length) next('rollOut'); }
  } else if (e.step === 'rollOut') { // both roll off to the right through the tunnel
    c.right = true;
    if (e.t > 12) baby.vx = Math.min(TUNE.maxSpeed, baby.vx + 0.2);
    if (b.x > LEVEL.width + 30 && baby.x > LEVEL.width + 30) { state = 'win'; sfx.win(); }
  }
}

function updateBaby() {
  if (!baby) return;
  const floor = LEVEL.underground.floorY - LEVEL.underground.babyR;
  if (baby.free) { baby.vy += TUNE.gravity; baby.y += baby.vy; baby.x += baby.vx; }
  if (baby.y >= floor) { baby.y = floor; baby.vy = 0; }
  baby.rot += baby.vx / 6;
}

function updateFx() {
  for (const q of particles) {
    if (q.bubble) { q.y += q.vy; q.x += Math.sin(q.life * 0.2 + q.phase) * 0.25; q.life--; continue; } // bubbles drift up with a wobble, no gravity
    q.x += q.vx; q.y += q.vy; q.vy += 0.1; q.life--;
  }
  particles = particles.filter((q) => q.life > 0);
  for (const f of floaters) { f.y -= 0.3; f.life--; }
  floaters = floaters.filter((f) => f.life > 0);
}

function update() {
  frame++;
  if (menuOpen) { input.jumpPressed = false; return; } // the level picker pauses the game
  updateHazardSound();
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
      updateBoss();
      updateKey();
      if (ending) updateEnding();
      updateBaby();
    }
    if (introTimer > 0) introTimer--;
  } else if (input.jumpPressed) {
    // after a win go to the next level (wrapping to level 1); after game over retry the same one
    if (state === 'win') setLevel((levelIndex + 1) % LEVELS.length);
    startGame();
  }
  updateGhosts();
  updateFx();
  // (On a narrow portrait screen the whole boss arena doesn't fit, so there the camera follows you inside the arena.)
  const arenaCam = clamp(boulder.x - W / 2, LEVEL.boss ? LEVEL.boss.camX : 0, (LEVEL.boss ? LEVEL.boss.camX : 0) + 320 - W);
  const target = boss && boss.active ? arenaCam : clamp(boulder.x - W * 0.34, 0, LEVEL.width - W);
  if (bossIntro > 0 && state === 'play') bossIntro--;
  storm += ((LEVEL.theme === 'sky' && boss && boss.active && !boss.dead && state === 'play' ? 1 : 0) - storm) * 0.04; // the sky turns stormy when the fight starts and clears when he's beaten
  // once you're underground the camera follows you down (it never scrolls vertically anywhere else)
  const un = LEVEL.underground, targetY = un && boulder.x > un.x0 ? clamp((boulder.y - 152) * 1.2, 0, un.maxCamY) : 0;
  camY += (targetY - camY) * 0.12;
  if (shake > 0) shake--;
  if (lockedHint > 0) lockedHint--;
  camX += (target - camX) * 0.15;
}

// ---------- Drawing ----------
const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

function ellipse(cx, cy, rx, ry, c) {
  ctx.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.5)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    // bigger discs measure to r + 0.5 so the top, bottom and sides are flat instead of a single-pixel "spike"
    const half = Math.floor(Math.sqrt(r >= 3 ? (r + 0.5) ** 2 - dy * dy : r * r - dy * dy + 0.5));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

const hillH = (wx) => 28 + Math.sin(wx * 0.02) * 10 + Math.sin(wx * 0.047) * 5;

function drawBackground() {
  ({ day: drawDayBackground, night: drawNightBackground, castle: drawCastleBackground, brain: drawBrainBackground, water: drawWaterBackground, sky: drawSkyBackground })[LEVEL.theme]();
}

// Blend two '#rrggbb' colors: t = 0 gives a, t = 1 gives b.
const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// Cloud World: a blue sky with a sun, rainbows and drifting clouds. During the Storm Cloud fight (`storm` fades 0 -> 1) it turns
// into a thunderstorm: dark sky, heavy clouds, rain, and flashes of lightning with a bolt far away.
const SKY_DAY = ['#3d9bff', '#6cb8ff', '#9fd4ff', '#c9e8ff'], SKY_STORM = ['#0f111b', '#171a2a', '#212539', '#2c3150'];
const skyTop = () => mix(SKY_DAY[0], SKY_STORM[0], storm);
const RAINBOW = ['#ff5a5a', '#ff9a3c', '#ffe14d', '#5fd36b', '#4da6ff', '#7a5cff'];
function drawSkyBackground() {
  SKY_DAY.forEach((c, i) => px(0, i * 45, W, 45, mix(c, SKY_STORM[i], storm)));
  const calm = 1 - storm;
  if (calm > 0.02) {
    ctx.globalAlpha = calm;
    disc(262, 34, 24, 'rgba(255,245,170,0.3)'); disc(262, 34, 17, '#fff3a0'); disc(262, 34, 14, '#ffe970'); // sun
    ctx.globalAlpha = calm * 0.7;
    repeating(560, 0.25, (sx, i) => { // rainbows, far away
      const cx = Math.round(sx + 280), cyy = GROUND_Y + 14, R = 96 + (i % 2) * 14;
      for (let dx = -R; dx <= R; dx++) {
        if (cx + dx < -1 || cx + dx > W) continue;
        RAINBOW.forEach((c, k) => {
          const rr = R - k * 3;
          if (Math.abs(dx) >= rr) return;
          const y0 = cyy - Math.sqrt(rr * rr - dx * dx), y1 = cyy - Math.sqrt(Math.max(0, rr * rr - (dx + 1) * (dx + 1)));
          px(cx + dx, Math.min(y0, y1), 1, Math.max(3, Math.round(Math.abs(y1 - y0)) + 1), c);
        });
      }
    });
    ctx.globalAlpha = 1;
  }
  const cloud = mix('#ffffff', '#3b4060', storm), cloud2 = mix('#e9f4ff', '#2c3050', storm);
  repeating(150, 0.15, (sx, i) => { // far clouds
    const x = Math.round(sx + (i % 3) * 20 - frame * 0.1), y = 26 + ((i * 37) % 60);
    ellipse(x, y + 2, 18, 5, cloud2); disc(x - 7, y - 1, 5, cloud2); disc(x + 3, y - 4, 7, cloud2); disc(x + 11, y, 5, cloud2);
  });
  repeating(210, 0.35, (sx, i) => { // nearer, bigger clouds
    const x = Math.round(sx + (i % 2) * 40), y = 60 + ((i * 53) % 50);
    ellipse(x, y + 3, 24, 6, cloud); disc(x - 10, y - 1, 7, cloud); disc(x + 3, y - 6, 10, cloud); disc(x + 15, y - 1, 7, cloud);
  });
  if (storm > 0.03) {
    ctx.globalAlpha = storm;
    repeating(64, 0.3, (sx, i) => disc(Math.round(sx + 30), 2 + (i % 3) * 5, 17, '#1b1e32')); // a heavy ceiling of thunderclouds
    for (let i = 0; i < 70; i++) { // slanting rain
      const y = (i * 31 + frame * 7) % WORLD_H, x = ((i * 53 - frame * 2 + y * 0.3 - camX * 0.5) % W + W) % W;
      px(x, y, 1, 4, 'rgba(170,200,255,0.55)');
    }
    const f = frame % 260, n = Math.floor(frame / 260), bx = (n * 97) % (W - 40) + 20; // a flash of lightning with a bolt far away
    if (f < 9) {
      ctx.globalAlpha = storm * (f < 3 ? 0.45 : f < 6 ? 0 : 0.3);
      px(0, -200, W, 500, '#ffffff');
      ctx.globalAlpha = storm;
      for (let y = 0, jx = 0; y < 110; y += 6, jx += ((y * 7 + n * 13) % 9) - 4) px(bx + jx, y, 2, 7, 'rgba(255,255,220,0.9)');
    }
    ctx.globalAlpha = 1;
  }
}

// Under the sea: deep blue water, light rays from the surface, drifting seaweed and fish silhouettes, rising bubbles.
function drawWaterBackground() {
  ['#0a3a66', '#0c4a80', '#0e5a96', '#1068a8'].forEach((c, i) => px(0, i * 38, W, 38, c));
  repeating(110, 0.2, (sx, i) => { // slanted light rays
    for (let y = 0; y < 120; y += 4) px(sx + y * 0.35 + (i % 3) * 8, y, 14 - y / 14, 4, 'rgba(160,230,255,0.06)');
  });
  repeating(90, 0.35, (sx, i) => { // far-away seaweed
    const h = 26 + ((i * 7) % 5) * 5;
    for (let y = 0; y < h; y += 2) px(sx + Math.sin(frame * 0.03 + y * 0.2 + i) * 3, GROUND_Y - y, 3, 2, '#0b4a6a');
  });
  for (let i = 0; i < 4; i++) { // fish swimming by
    const dir = i % 2 ? -1 : 1, x = (((i * 140 + dir * frame * 0.4 - camX * 0.5) % (W + 60)) + (W + 60)) % (W + 60) - 30, y = 24 + i * 22;
    const fx = Math.round(x), fy = Math.round(y), body = '#0a3256';
    ellipse(fx, fy, 6, 3, body); // oval body
    for (let k = 0; k < 4; k++) px(fx - dir * (6 + k), fy - k, 1, k * 2 + 1, body); // forked tail: a triangle that widens behind it
    px(fx - dir, fy - 4, 3, 1, body); // top fin
    px(fx + dir * 3, fy - 1, 1, 1, '#9fd8ff'); // eye
  }
  for (let i = 0; i < 16; i++) { // bubbles rising
    const x = (((i * 71 - camX * 0.8) % W) + W) % W, y = WORLD_H - ((frame * (0.25 + (i % 3) * 0.1) + i * 29) % WORLD_H);
    px(x + Math.sin(frame * 0.05 + i) * 2, y, 2, 2, 'rgba(200,240,255,0.4)');
  }
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
  px(0, 0, W, WORLD_H, '#241f33');
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

// Inside a brain: pink-purple folds, drifting neurons with arms, and electric pulses running along them.
function drawBrainBackground() {
  ['#2a0d2e', '#3a1240', '#4a1a4e', '#5c2060'].forEach((c, i) => px(0, i * 38, W, 38, c));
  // soft folds (gyri) at two depths
  for (const [par, base, amp, col] of [[0.15, 50, 16, '#56215a'], [0.3, 92, 14, '#6a2a6e']]) {
    for (let sx = 0; sx < W; sx++) {
      const wx = sx + camX * par;
      px(sx, base + Math.sin(wx * 0.03) * amp + Math.sin(wx * 0.071) * 5, 1, 2, col);
      px(sx, base + 22 + Math.sin(wx * 0.025 + 2) * amp, 1, 1, col);
    }
  }
  // neurons: a round body with arms, and a pulse of light travelling along an arm
  repeating(130, 0.5, (sx, i) => {
    const n = ((i % 7) + 7) % 7, y = 30 + n * 11, arms = [[-14, -9], [13, -7], [-11, 10], [15, 11]];
    for (const [ax, ay] of arms) {
      for (let t = 0; t <= 6; t++) px(sx + (ax * t) / 6, y + (ay * t) / 6, 1, 1, '#8a3d9e');
      px(sx + ax - 1, y + ay - 1, 3, 3, '#b86fe0');
    }
    disc(sx, y, 5, '#8a3d9e'); disc(sx, y, 3, '#c98cf0'); px(sx - 1, y - 1, 2, 2, '#ffe9ff');
    const t = ((frame + n * 23) % 60) / 60, [ax, ay] = arms[n % 4]; // pulse travels from the body out along one arm
    px(sx + ax * t, y + ay * t, 2, 2, '#7df0ff');
  });
  // tiny bubbles floating up
  for (let i = 0; i < 14; i++) {
    const x = (((i * 83 - camX * 0.8) % W) + W) % W, y = WORLD_H - ((frame * (0.2 + (i % 3) * 0.1) + i * 31) % WORLD_H);
    px(x, y, 2, 2, 'rgba(255,180,230,0.35)');
  }
}

function drawDayBackground() {
  px(0, 0, W, WORLD_H, '#8fd3ff');
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
  brain: {
    ground: ['#b24a72', '#8f3a5e', '#ff8fb3', '#d9608a'],
    stone: ['#7d4fa8', '#5f3a85', '#b58ae0', '#9467c4'],
  },
  water: {
    ground: ['#3a6f8c', '#2c5873', '#e6d29a', '#c3b078'], // seabed with a sandy top
    stone: ['#d9667a', '#b84a62', '#ff9aa8', '#e07388'], // coral
  },
  sky: { ground: ['#f5f9ff', '#dbe7f7', '#ffffff', '#e4eefb'] }, // clouds (drawn by drawCloudSolid; the colors darken in the storm)
};

// A bone: a shaft with a knob on each end
function bone(x, y, len, vertical) {
  const c = '#f4efe0', sh = '#c9c0a4';
  if (vertical) { px(x, y + 1, 3, len - 2, c); px(x + 2, y + 1, 1, len - 2, sh); px(x - 1, y, 2, 2, c); px(x + 2, y, 2, 2, c); px(x - 1, y + len - 2, 2, 2, c); px(x + 2, y + len - 2, 2, 2, c); }
  else { px(x + 1, y, len - 2, 3, c); px(x + 1, y + 2, len - 2, 1, sh); px(x, y - 1, 2, 2, c); px(x, y + 2, 2, 2, c); px(x + len - 2, y - 1, 2, 2, c); px(x + len - 2, y + 2, 2, 2, c); }
}

// The smashable pile of bones in Braintopia (same job as the sand)
function drawBonePile(sx, y, w, h) {
  px(sx, y, w, h, '#d8d0b8');
  for (let i = 0; i < w; i += 14) { bone(sx + 1 + i, y + 2 + ((i / 14) % 2) * 5, 12, false); }
  for (let i = 0; i < w; i += 14) { bone(sx + 7 + i, y + 8 + ((i / 14) % 2) * -3, 10, false); }
  px(sx + 6, y + 1, 3, 3, '#f4efe0'); px(sx + 7, y + 2, 1, 1, '#2a2238'); px(sx + 20, y + 2, 1, 1, '#2a2238'); // a tiny skull peeks out
  px(sx, y + h - 1, w, 1, '#b8ae94');
}

// The smashable pile of coral in Watertopia (same job as the sand)
function drawCoralPile(sx, y, w, h) {
  px(sx, y, w, h, '#e07388');
  for (let i = 0; i < w; i += 7) {
    px(sx + i + 1, y + 1 + ((i / 7) % 2) * 3, 4, h - 2, '#ff9aa8'); px(sx + i + 1, y + 1 + ((i / 7) % 2) * 3, 1, h - 2, '#ffc2cb');
    px(sx + i, y + ((i / 7) % 2) * 2, 2, 2, '#ffc2cb'); px(sx + i + 4, y + 2 + ((i / 7) % 2) * 2, 2, 2, '#ffc2cb'); // little branch tips
  }
  px(sx, y + h - 1, w, 1, '#b84a62');
}

// The smashable lightning wall in Cloud World (same job as the sand): a slab of dark storm cloud with bolts crackling through it
function drawLightningWall(sx, y, w, h) {
  px(sx, y, w, h, '#2b3050'); px(sx, y, w, 2, '#5a6390'); px(sx, y + h - 1, w, 1, '#1b1f38');
  for (let i = 0; i < w; i += 8) { // bolts zig-zagging up and down through it, re-rolled a few times a second
    const seed = (frame >> 2) + i * 3;
    for (let k = 0; k < h; k += 2) px(sx + i + 2 + (((seed + k * 5) * 7) % 5) - 2, y + k, 2, 2, (k + (frame >> 2)) % 4 ? '#ffd23f' : '#fff6b0');
  }
  if ((frame >> 3) % 3 === 0) px(sx, y - 1, w, 1, 'rgba(255,240,150,0.6)');
}

function drawSand(sx, y, w, h) {
  if (LEVEL.theme === 'sky') return drawLightningWall(sx, y, w, h);
  if (LEVEL.theme === 'brain') return drawBonePile(sx, y, w, h);
  if (LEVEL.theme === 'water') return drawCoralPile(sx, y, w, h);
  px(sx, y, w, h, '#e3c276');
  for (let i = 0; i < w; i += 4) px(sx + i, y, 4, 2 + ((i / 4) % 2), '#f0d890'); // bumpy top
  for (let i = 0; i < w; i += 3) for (let j = 4; j < h; j += 5) if ((i * 5 + j * 11) % 7 < 2) px(sx + i, y + j, 1, 1, '#c9a75a');
  px(sx, y + h - 1, w, 1, '#c9a75a');
}

// The locked floor under the sand: two brick halves with a padlock. When the key opens it they slide apart into the walls.
function drawBrick(sx, y, w, h) {
  const boneFloor = LEVEL.theme === 'brain', coralFloor = LEVEL.theme === 'water', stormFloor = LEVEL.theme === 'sky';
  const p = ending ? ending.floorOpen : 0, half = w / 2, slide = Math.round(p * half);
  ctx.save(); ctx.beginPath(); ctx.rect(sx, y, w, h); ctx.clip(); // the halves vanish into the walls, not over them
  const bricks = (x0, w0) => {
    if (boneFloor) { // the locked floor is a layer of bones laid side by side
      px(x0, y, w0, h, '#8f866c');
      for (let r = 0; r < 2; r++) for (let k = (r % 2) * 6; k < w0; k += 12) bone(x0 + k, y + 2 + r * 5, 12, false);
      return;
    }
    if (stormFloor) { // the locked floor is a layer of grey storm cloud puffs
      px(x0, y, w0, h, '#6a7298');
      for (let r = 0; r < 2; r++) for (let k = (r % 2) * 5; k < w0; k += 10) { disc(x0 + k + 4, y + 3 + r * 5, 4, r ? '#8b94b8' : '#a4acce'); }
      return;
    }
    if (coralFloor) { // the locked floor is a layer of coral branches
      px(x0, y, w0, h, '#9a3f58');
      for (let r = 0; r < 2; r++) for (let k = (r % 2) * 4; k < w0; k += 8) { px(x0 + k, y + 1 + r * 5, 6, 4, r ? '#d9667a' : '#e07388'); px(x0 + k, y + 1 + r * 5, 6, 1, '#ffb3bd'); }
      return;
    }
    px(x0, y, w0, h, '#8a4f3b'); px(x0, y, w0, 1, '#b06a52');
    for (let r = 0; r < 3; r++) {
      px(x0, y + 4 + r * 4 - 1, w0, 1, '#4a2a22');
      for (let k = (r % 2) * 5; k < w0; k += 10) px(x0 + k, y + r * 4, 1, 4, '#4a2a22');
    }
  };
  bricks(sx - slide, half); bricks(sx + half + slide, half);
  ctx.restore();
  if (!ending || ending.step !== 'unlockFloor' || ending.t < 28) { // the padlock
    const cx = sx + half, ly = y + 2 + (lockedHint > 0 && frame % 4 < 2 ? 1 : 0);
    px(cx - 3, ly, 6, 1, '#b8860b'); px(cx - 3, ly, 1, 4, '#b8860b'); px(cx + 2, ly, 1, 4, '#b8860b');
    px(cx - 4, ly + 3, 8, 7, '#ffd23f'); px(cx - 4, ly + 3, 8, 1, '#fff6b0'); px(cx - 1, ly + 5, 2, 3, '#3b2a18');
  }
}

function drawSolid([x, y, w, h, type]) {
  const sx = Math.round(x - camX);
  if (sx > W || sx + w < 0) return;
  if (type === 'sand') return drawSand(sx, y, w, h);
  if (type === 'brick') return drawBrick(sx, y, w, h);
  if (type === 'cage') return; // drawn together with the baby rock
  if (LEVEL.theme === 'sky') return drawCloudSolid(x, sx, y, w, h);
  const st = SOLID_STYLE[LEVEL.theme];
  const [body, speck, top, shade] = st.stone && y !== GROUND_Y ? st.stone : st.ground;
  px(sx, y, w, h, body);
  for (let i = 0; i < w; i += 6) for (let j = 6; j < h; j += 7) {
    if (((i * 7 + j * 13 + x) | 0) % 5 === 0) px(sx + i, y + j, 2, 2, speck);
  }
  px(sx, y, w, 3, top);
  px(sx, y + 3, w, 1, shade);
}

// Cloud World's solids are clouds: pale, with a bright top edge, soft swirls inside and little puffs sticking out of the sides
// and underneath. (The puffs only stick out 2-3px, so the hitbox is still the plain rectangle.) They go grey in the storm.
function drawCloudSolid(x, sx, y, w, h) {
  const [body, speck, top, shade] = SOLID_STYLE.sky.ground, k = storm * 0.6;
  const cBody = mix(body, '#8a92b2', k), cSpeck = mix(speck, '#6a7294', k), cTop = mix(top, '#b4bad4', k), cShade = mix(shade, '#9aa2c0', k);
  px(sx, y, w, h, cBody);
  for (let i = 0; i < w; i += 14) for (let j = 7; j < h; j += 9) { // little swirls
    const o = ((i * 7 + j * 13 + x) | 0) % 5;
    if (o < 2) { px(sx + i + o * 2, y + j, 5, 1, cSpeck); px(sx + i + o * 2 + 4, y + j + 1, 2, 1, cSpeck); }
  }
  px(sx, y, w, 2, cTop); px(sx, y + 2, w, 1, cShade);
  const thin = h < 40; // platforms get a puffy underside; the tall banks only need puffs down their sides
  if (thin) for (let i = 3; i < w; i += 9) ellipse(sx + i + 2, y + h, 5, 2, i % 2 ? cShade : cBody);
  for (let j = thin ? 0 : 4; j < Math.min(h, 40); j += 9) { disc(sx, y + j + 3, 3, cBody); disc(sx + w - 1, y + j + 3, 3, cBody); }
}

// Pits are the gaps between ground pieces. Fill them with a dark void and a glowing bottom
// so they're easy to spot against the background.
let pitGround = null, pitGroundFor = null; // sorted ground pieces, cached per level (not rebuilt every frame)
function drawPits() {
  const theme = LEVEL.theme, night = theme === 'night';
  if (theme === 'sky') return; // the gaps between the clouds are just open sky
  if (pitGroundFor !== LEVEL) { pitGround = LEVEL.solids.filter((s) => s[1] === GROUND_Y).sort((a, b) => a[0] - b[0]); pitGroundFor = LEVEL; }
  const ground = pitGround;
  for (let i = 0; i < ground.length - 1; i++) {
    const a = ground[i][0] + ground[i][2], w = ground[i + 1][0] - a, sx = Math.round(a - camX);
    if (sx > W || sx + w < 0) continue;
    px(sx, GROUND_Y, w, WORLD_H - GROUND_Y, { day: '#24150d', night: '#04020a', castle: '#0a0508', brain: '#10031a', water: '#030c18' }[theme]);
    const hot = { castle: '255,100,40', brain: '90,210,255', water: '255,120,50' }[theme]; // castle: red-hot dungeon pit; brain: crackling blue void; water: glowing trench
    if (hot) { // not animated, but easy to see
      for (let k = 0; k < 4; k++) px(sx, WORLD_H - 16 + k * 4, w, 4, `rgba(${hot},${0.12 + k * 0.1})`);
      for (let k = 0; k < 4; k++) px(sx, GROUND_Y - 12 + k * 3, w, 3, `rgba(${hot},${0.04 + k * 0.04})`);
    }
    if (night) { // spooky green glow, mist and rising wisps (daytime pits are just dirt holes)
      const glow = '110,255,150';
      for (let k = 0; k < 4; k++) px(sx, WORLD_H - 16 + k * 4, w, 4, `rgba(${glow},${0.1 + k * 0.1})`);
      for (let k = 0; k < 4; k++) px(sx, GROUND_Y - 12 + k * 3, w, 3, `rgba(${glow},${0.05 + k * 0.05})`);
      for (let k = 0; k < 3; k++) { // rise at a constant speed: depends only on time, not on scrolling
        const wy = WORLD_H - ((frame * 0.4 + k * 11 + a) % 30);
        px(sx + 6 + ((k * 17 + 5) % Math.max(1, w - 12)), wy, 2, 2, `rgba(${glow},0.7)`);
      }
    }
    // darker walls so the hole has depth
    px(sx, GROUND_Y, 2, WORLD_H - GROUND_Y, 'rgba(0,0,0,0.5)'); px(sx + w - 2, GROUND_Y, 2, WORLD_H - GROUND_Y, 'rgba(0,0,0,0.5)');
  }
}

// The dark hollow under the arena floor: the chamber under the brick floor and the tunnel leading out. Drawn behind the solids.
function drawCavity() {
  const u = LEVEL.underground;
  if (!u) return;
  const sx = Math.round(u.chamberX - camX);
  const dark = { brain: '#1c0a22', water: '#0a2238', sky: '#2a3150' }[LEVEL.theme] || '#120e1a';
  const top = LEVEL.theme === 'sky' ? GROUND_Y : 178; // in the sky the hole under the lightning wall would show the sky, so the dark goes all the way up
  px(sx, top, u.chamberW, u.floorY - top, dark); px(sx + u.chamberW, u.tunnelY, 130, u.floorY - u.tunnelY, dark);
  for (let y = 182; y < u.floorY; y += 8) for (let x = sx + ((y / 8) % 2) * 6; x < sx + u.chamberW; x += 12) px(x, y, 1, 8, '#1d1727');
  for (let y = 186; y < u.floorY; y += 8) px(sx, y, u.chamberW, 1, '#1d1727');
  disc(sx + 28, 205, 26, 'rgba(255,170,80,0.05)'); // faint warm light
}

function drawKey(x, y) {
  const bob = Math.round(Math.sin(frame * 0.12) * 1);
  const sx = Math.round(x), sy = Math.round(y) + bob;
  px(sx - 7, sy - 3, 6, 6, '#ffd23f'); px(sx - 6, sy - 2, 4, 4, '#b8860b'); px(sx - 5, sy - 1, 2, 2, '#ffd23f'); // ring
  px(sx - 1, sy - 1, 9, 2, '#ffd23f'); px(sx + 5, sy + 1, 2, 3, '#ffd23f'); px(sx + 2, sy + 1, 2, 2, '#ffd23f'); // shaft and teeth
  px(sx - 7, sy - 3, 6, 1, '#fff6b0');
  if (frame % 30 < 4) px(sx + 3, sy - 4, 1, 1, '#fff');
}

// True while `who` ('boulder' or 'baby') is the one talking in the ending; the mouth flaps open and shut.
function isTalking(who) {
  return !!ending && ending.step === 'talk' && LEVEL.underground.lines[ending.line].who === who && frame % 12 < 8;
}

function drawBaby() {
  if (!baby) return;
  const x = Math.round(baby.x - camX), y = Math.round(baby.y), r = LEVEL.underground.babyR;
  if (x < -20 || x > W + 20) return;
  disc(x, y, r + 1, '#3a3a46'); disc(x, y, r, '#b9b9cc');
  for (let i = 0; i < 3; i++) { const a = baby.rot + i * 2.1; px(x + Math.cos(a) * r / 2, y + Math.sin(a) * r / 2, 1, 1, '#8b8ba0'); }
  px(x - 1, y - r - 2, 1, 2, '#7fcf86'); px(x + 1, y - r - 3, 1, 3, '#7fcf86'); // a little tuft of baby grass
  const f = baby.face || 1, open = isTalking('baby'), look = f > 0 ? 1 : 0; // the face and pupils turn toward who it's looking at
  if (r < 6) { // a smaller baby: smaller face
    px(x - 2 + f, y - 2, 2, 2, '#fff'); px(x + 1 + f, y - 2, 2, 2, '#fff'); px(x - 2 + f + look, y - 1, 1, 1, '#111'); px(x + 1 + f + look, y - 1, 1, 1, '#111');
    if (open) px(x - 1 + f, y + 1, 2, 2, '#111'); else px(x + f, y + 1, 1, 1, '#111');
    px(x - 3, y + 1, 1, 1, '#ffb3c8'); px(x + 3, y + 1, 1, 1, '#ffb3c8');
    return;
  }
  px(x - 3 + f, y - 2, 2, 3, '#fff'); px(x + 1 + f, y - 2, 2, 3, '#fff'); px(x - 3 + f + look, y - 1, 1, 2, '#111'); px(x + 1 + f + look, y - 1, 1, 2, '#111'); // big eyes
  if (open) px(x - 1 + f, y + 2, 2, 2, '#111'); else px(x - 1 + f, y + 2, 2, 1, '#111');
  px(x - 5, y + 1, 2, 1, '#ffb3c8'); px(x + 4, y + 1, 2, 1, '#ffb3c8'); // blushing cheeks
}

function drawCage() {
  const u = LEVEL.underground;
  if (!u) return;
  const p = ending ? ending.cageOpen : 0;
  if (p >= 1) return;
  const x = Math.round(3231 - camX), y = 212 - Math.round(p * 28), w = 24, h = 24;
  if (LEVEL.theme === 'brain') { // a cage of bones
    for (let i = 1; i < w; i += 6) bone(x + i, y + 2, h - 4, true);
    bone(x - 1, y - 1, w + 2, false); bone(x - 1, y + h - 3, w + 2, false);
  } else if (LEVEL.theme === 'sky') { // a cage of glowing electric bars
    for (let i = 1; i < w; i += 6) { px(x + i - 1, y + 2, 5, h - 4, 'rgba(255,230,120,0.25)'); px(x + i, y + 2, 3, h - 4, '#ffd23f'); px(x + i + 1, y + 2, 1, h - 4, '#fff6b0'); }
    px(x - 1, y - 1, w + 2, 3, '#8b94b8'); px(x - 1, y + h - 2, w + 2, 3, '#8b94b8');
    if (frame % 10 < 5) for (let i = 4; i < w; i += 6) px(x + i, y + 4 + ((i * 7 + frame) % (h - 10)), 2, 2, '#ffffff'); // sparks
  } else if (LEVEL.theme === 'water') { // a cage of coral branches
    for (let i = 1; i < w; i += 6) { px(x + i, y + 2, 3, h - 4, '#ff7a8a'); px(x + i, y + 2, 1, h - 4, '#ffb3bd'); }
    px(x - 1, y - 1, w + 2, 3, '#d9667a'); px(x - 1, y + h - 2, w + 2, 3, '#d9667a');
  } else {
    for (let i = 0; i < w; i += 5) px(x + i, y, 2, h, '#9aa3bd');
    px(x - 1, y, w + 2, 3, '#6a728c'); px(x - 1, y + h - 2, w + 2, 2, '#6a728c');
  }
  if (!ending || ending.step !== 'cageUnlock' || ending.t < 26) { // the cage's padlock
    px(x + w - 6, y + 9, 7, 6, '#ffd23f'); px(x + w - 5, y + 7, 5, 2, '#b8860b'); px(x + w - 3, y + 11, 1, 2, '#3b2a18');
  }
}

function drawBubble(speakerX, speakerY, msg, pink) {
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  const lines = []; let cur = '';
  for (const word of msg.split(' ')) {
    if (cur && ctx.measureText(cur + ' ' + word).width > 120) { lines.push(cur); cur = word; } else cur = cur ? cur + ' ' + word : word;
  }
  lines.push(cur);
  const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 12, h = lines.length * 9 + 7;
  const sx = speakerX - camX, sy = speakerY - camY + topPad;
  const bx = Math.round(clamp(sx - w / 2, 6, W - 6 - w)), by = Math.max(8, Math.round(sy - 22 - h));
  px(bx - 1, by - 1, w + 2, h + 2, '#1b1f3a'); px(bx, by, w, h, pink ? '#ffe3f1' : '#ffffff');
  const tx = Math.round(clamp(sx, bx + 5, bx + w - 6)); // little tail pointing at who's talking
  px(tx - 3, by + h, 7, 1, pink ? '#ffe3f1' : '#fff'); px(tx - 2, by + h + 1, 5, 2, pink ? '#ffe3f1' : '#fff'); px(tx - 1, by + h + 3, 3, 2, pink ? '#ffe3f1' : '#fff');
  px(tx - 1, by + h + 5, 1, 1, '#1b1f3a');
  ctx.fillStyle = '#1b1f3a';
  lines.forEach((l, i) => ctx.fillText(l, bx + 6, by + 9 + i * 9));
  if (frame % 40 < 28) px(bx + w - 8, by + h - 5, 4, 1, '#8a8fb0'), px(bx + w - 7, by + h - 4, 2, 1, '#8a8fb0'); // "tap to go on"
}

// Little bouncing arrow (pointing down) at a world position
function drawArrow(x, y) {
  const bob = Math.round(Math.sin(frame * 0.15) * 3), sx = Math.round(x - camX);
  for (let r = 0; r < 4; r++) px(sx - 3 + r, y + r + bob, 7 - 2 * r, 1, '#ffd23f');
  px(sx - 1, y - 4 + bob, 3, 4, '#ffd23f');
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
  } else if (kind === 'neuron') {
    px(sx - 1, y - 8, 3, 8, '#8a3d9e'); disc(sx, y - 11, 4, '#b86fe0'); px(sx - 1, y - 12, 2, 2, '#ffe9ff');
    px(sx - 6, y - 14, 3, 1, '#8a3d9e'); px(sx + 4, y - 14, 3, 1, '#8a3d9e');
    if ((frame >> 3) % 4 === 0) disc(sx, y - 11, 7, 'rgba(125,240,255,0.15)');
  } else if (kind === 'coil') { // a squiggly wire
    for (let k = 0; k < 14; k++) px(sx - 7 + k, y - 4 + Math.round(Math.sin(k * 0.9) * 2), 1, 2, '#e8607f');
  } else if (kind === 'sprout') {
    px(sx, y - 7, 1, 7, '#6fcf86'); px(sx - 3, y - 7, 3, 2, '#8fe3a0'); px(sx + 1, y - 9, 3, 2, '#8fe3a0');
  } else if (kind === 'seaweed') {
    for (let k = 0; k < 14; k += 2) px(sx - 1 + Math.round(Math.sin(frame * 0.05 + k * 0.5 + x) * 2), y - k, 3, 2, '#2fb36b');
  } else if (kind === 'coral') {
    px(sx - 1, y - 8, 3, 8, '#ff7a8a'); px(sx - 4, y - 11, 2, 6, '#ff7a8a'); px(sx - 4, y - 6, 4, 2, '#ff7a8a'); px(sx + 2, y - 10, 2, 5, '#ff7a8a'); px(sx + 2, y - 6, 3, 2, '#ff7a8a');
    px(sx - 1, y - 8, 1, 7, '#ffb3bd');
  } else if (kind === 'shell') {
    px(sx - 4, y - 5, 8, 5, '#f6d9e6'); px(sx - 3, y - 6, 6, 1, '#f6d9e6'); px(sx - 2, y - 5, 1, 5, '#d9a8c0'); px(sx + 1, y - 5, 1, 5, '#d9a8c0'); px(sx - 4, y - 1, 8, 1, '#d9a8c0');
  } else if (kind === 'puff') { // a little bump of cloud fluff
    disc(sx - 3, y - 2, 3, '#ffffff'); disc(sx + 2, y - 4, 4, '#ffffff'); disc(sx + 6, y - 2, 3, '#ffffff'); px(sx - 5, y - 1, 13, 2, '#e4eefb');
  } else if (kind === 'tuft') { // wispy cloud tufts
    for (let k = 0; k < 5; k++) px(sx - 5 + k * 3, y - 3 - (k % 2) * 2, 2, 3 + (k % 2) * 2, '#ffffff');
  } else if (kind === 'rainbowlet') { // a tiny rainbow stuck in the cloud
    RAINBOW.forEach((c, k) => { for (let dx = -(9 - k); dx <= 9 - k; dx++) { const yy = Math.round(Math.sqrt((9 - k) ** 2 - dx * dx)); px(sx + dx, y - yy, 1, 1, c); } });
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

// A little brain person: a pink brain on stubby legs.
const BRAIN_COLORS = ['#ff9ec4', '#ffb08a', '#c9a2ff', '#8fd8ff', '#a6e88f'];
function drawLittleBrain(p) {
  const x = Math.round(p.x - camX), y = Math.round(p.floorY);
  if (x < -10 || x > W + 10) return;
  const step = Math.floor(frame / (p.scared ? 4 : 10)) % 2, fold = 'rgba(110,30,90,0.5)';
  px(x - 2, y - 3, 1, 3 - step, '#5a3a6e'); px(x + 1, y - 3, 1, 2 + step, '#5a3a6e');
  ellipse(x, y - 7, 5, 4, BRAIN_COLORS[p.hue]);
  px(x, y - 10, 1, 4, fold); px(x - 3, y - 8, 2, 1, fold); px(x + 2, y - 6, 2, 1, fold); px(x - 3, y - 6, 2, 1, fold);
  px(x - 2, y - 7, 1, 2, '#222'); px(x + 1, y - 7, 1, 2, '#222'); // eyes
  if (p.scared) { px(x - 6, y - 9 - step, 1, 3, BRAIN_COLORS[p.hue]); px(x + 6, y - 9 - step, 1, 3, BRAIN_COLORS[p.hue]); px(x - 1, y - 5, 2, 1, '#222'); }
}

// A little water monster: a gooey blue water blob with a fin on top, one big eye or two, and wiggly tentacle feet.
// They're made of water, so they're blues close to (but never exactly) the background bands #0a3a66 ... #1068a8.
const MONSTER_COLORS = ['#0b4f89', '#0f5f9d', '#1470b4', '#1a78bd', '#0a4270'];
function drawWaterMonster(p) {
  const x = Math.round(p.x - camX), y = Math.round(p.floorY);
  if (x < -10 || x > W + 10) return;
  const step = Math.floor(frame / (p.scared ? 4 : 10)) % 2, c = MONSTER_COLORS[p.hue], dark = 'rgba(0,40,80,0.35)';
  px(x - 3, y - 3, 1, 3 - step, c); px(x - 1, y - 3, 1, 2 + step, c); px(x + 1, y - 3, 1, 3 - step, c); px(x + 3, y - 3, 1, 2 + step, c); // tentacles
  ellipse(x, y - 7, 5, 4, c);
  px(x - 5, y - 6, 10, 3, c); px(x - 4, y - 4, 8, 1, dark); // jelly-like belly
  px(x - 1, y - 13, 2, 2, c); px(x - 2, y - 12, 4, 1, c); px(x, y - 14, 1, 1, c); // fin
  px(x - 3, y - 8, 3, 3, '#fff'); px(x + 1, y - 8, 3, 3, '#fff'); px(x - 2, y - 7, 1, 2, '#123'); px(x + 2, y - 7, 1, 2, '#123'); // eyes
  if (p.scared) { px(x - 7, y - 9 - step, 2, 3, c); px(x + 6, y - 9 - step, 2, 3, c); px(x - 1, y - 4, 2, 1, '#123'); }
}

// A little cloud person: a fluffy white cloud with two tiny feet, a smile and rosy cheeks (pastel tints so they aren't all the same).
const CLOUD_TINTS = ['#ffffff', '#fff0f6', '#eaf4ff', '#fff7d6', '#eaffef'];
function drawCloudling(p) {
  const x = Math.round(p.x - camX), y = Math.round(p.floorY);
  if (x < -10 || x > W + 10) return;
  const step = Math.floor(frame / (p.scared ? 4 : 10)) % 2, c = CLOUD_TINTS[p.hue], shade = '#c9d8ee';
  px(x - 2, y - 2, 2, 2 - step, '#8aa0c8'); px(x + 1, y - 2, 2, 1 + step, '#8aa0c8'); // feet
  disc(x - 3, y - 6, 3, c); disc(x + 3, y - 6, 3, c); disc(x - 1, y - 8, 4, c); disc(x + 2, y - 9, 3, c); // puffs
  px(x - 5, y - 5, 10, 3, c); px(x - 4, y - 3, 8, 1, shade); // flat-ish bottom
  px(x - 2, y - 7, 1, 2, '#223'); px(x + 1, y - 7, 1, 2, '#223'); // eyes
  px(x - 3, y - 5, 1, 1, '#ffb3c8'); px(x + 3, y - 5, 1, 1, '#ffb3c8'); // cheeks
  if (p.scared) { px(x - 7, y - 9 - step, 2, 3, c); px(x + 6, y - 9 - step, 2, 3, c); px(x - 1, y - 4, 2, 1, '#223'); } // arms up, little "o" mouth
  else px(x - 1, y - 4, 2, 1, '#223');
}

// A storm cloud enemy (Cloud World's version of the ghost): a dark grumpy thundercloud with yellow eyes. When it's after you
// it flashes and a bolt crackles underneath it.
function drawStormCloud(g) {
  const x = Math.round(g.x - camX), y = Math.round(g.y), face = g.face;
  if (x < -20 || x > W + 20) return;
  const body = g.chase && frame % 8 < 4 ? '#6b7396' : '#555c7e', shade = '#3e4462', hi = '#7b84a8';
  disc(x, y, 12, g.chase ? 'rgba(255,230,120,0.2)' : 'rgba(120,130,170,0.14)'); // glow
  ellipse(x, y + 2, 9, 4, shade); disc(x - 5, y, 4, body); disc(x + 5, y, 4, body); disc(x - 1, y - 3, 5, body); disc(x + 3, y - 2, 4, body);
  px(x - 6, y - 4, 4, 1, hi); px(x - 2, y - 7, 4, 1, hi); // highlights
  px(x - 4 + face, y - 2, 3, 2, '#ffd23f'); px(x + 2 + face, y - 2, 3, 2, '#ffd23f'); // glowing eyes
  px(x - 5 + face, y - 4, 4, 1, '#22263c'); px(x + 2 + face, y - 4, 4, 1, '#22263c'); // grumpy brows
  px(x - 2 + face, y + 2, 4, 1, '#22263c');
  if (g.chase) { // zzzt: a little bolt underneath
    const bx = x + ((frame >> 2) % 3) - 1;
    if (frame % 8 < 5) { px(bx, y + 5, 2, 3, '#ffd23f'); px(bx - 2, y + 7, 3, 2, '#ffd23f'); px(bx, y + 9, 2, 3, '#fff6b0'); }
  } else if ((frame >> 3) % 2) px(x - 6 + ((frame >> 4) % 3) * 5, y + 5, 1, 3, 'rgba(150,190,255,0.7)'); // a drip of rain
}

const DRAW_PERSON = { person: drawPerson, zombie: drawZombie, knight: drawKnight, brain: drawLittleBrain, monster: drawWaterMonster, cloud: drawCloudling };

// Hydrothermal vent: a rocky chimney on the seabed. Off: lazy bubbles. Warn: glows orange and rumbles. On: a scalding column.
function drawVent([, x, phase]) {
  const sx = Math.round(x - camX), st = gateState(phase);
  if (sx < -20 || sx > W + 20) return;
  const mouth = GROUND_Y - 9;
  if (st === 'on') {
    const flick = frame % 4 < 2 ? 0.34 : 0.26;
    px(sx - 5, VENT_TOP, 11, mouth - VENT_TOP, `rgba(255,140,60,${flick})`); // hugs the hitbox in laserHits
    px(sx - 2, VENT_TOP, 5, mouth - VENT_TOP, `rgba(255,220,150,${flick + 0.3})`);
    for (let k = 0; k < 9; k++) { // streaks of hot water racing up
      const y = mouth - ((frame * 4 + k * 17) % (mouth - VENT_TOP));
      px(sx - 3 + ((k * 5) % 7), y, 1, 4, '#fff6d8');
    }
  } else if (st === 'warn') {
    disc(sx, mouth - 2, 8, 'rgba(255,140,60,0.35)');
    for (let k = 0; k < 4; k++) px(sx - 3 + ((frame + k * 5) % 7), mouth - 4 - ((frame * 2 + k * 9) % 22), 2, 2, '#ffb36b');
  } else {
    for (let k = 0; k < 3; k++) px(sx - 1 + Math.round(Math.sin(frame * 0.1 + k * 2) * 2), mouth - 3 - ((frame * 0.6 + k * 14) % 34), 2, 2, 'rgba(210,240,255,0.55)');
  }
  px(sx - 8, GROUND_Y - 3, 17, 3, '#2a3a4a'); px(sx - 6, GROUND_Y - 6, 13, 3, '#34485c'); px(sx - 4, GROUND_Y - 9, 9, 3, '#3f566d'); // the chimney
  px(sx - 3, mouth, 7, 1, { off: '#1a2530', warn: '#ff9a30', on: '#fff0b0' }[st]);
}

// Synapse: two neurons with an electric arc that jumps between them (off: faint glow, warn: yellow sparks, on: deadly).
function drawSynapse([, x, w, phase]) {
  const sx = Math.round(x - camX), st = gateState(phase);
  if (sx > W + 10 || sx + w < -10) return;
  const light = { off: '#7df0ff', warn: '#ffd23f', on: '#ffffff' }[st];
  if (st === 'on') {
    const glow = frame % 4 < 2 ? 0.3 : 0.2; // hugs the bolt: same zone as the hitbox in laserHits
    px(sx, 134, w, GROUND_Y - 134, `rgba(125,240,255,${glow})`);
    px(sx, 132, w, 2,`rgba(125,240,255,${glow * 0.5})`); // softer top edge
    for (let i = 0; i < w; i += 2) { // jagged bolt, re-rolled every frame
      const j = ((i * 13 + frame * 7) % 11) - 5;
      px(sx + i, 138 + j, 3, 3, '#7df0ff'); px(sx + i, 139 + j, 2, 1, '#fff');
    }
  } else if (st === 'warn') {
    for (let i = 0; i < w; i += 7) if ((frame + i) % 6 < 3) px(sx + i + 2, 134 + ((i * 5) % 9), 2, 2, '#ffd23f');
  } else for (let i = 4; i < w; i += 9) px(sx + i, 144, 1, 1, 'rgba(125,240,255,0.5)');
  for (const nx of [sx, sx + w]) { // the neurons
    px(nx - 2, GROUND_Y - 10, 5, 10, '#7b3f9e'); disc(nx, GROUND_Y - 13, 4, '#b86fe0');
    px(nx - 1, GROUND_Y - 14, 2, 2, light);
    px(nx - 7, GROUND_Y - 4, 4, 1, '#7b3f9e'); px(nx + 4, GROUND_Y - 4, 4, 1, '#7b3f9e');
  }
}

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
  if (l[0] === 'synapse') return drawSynapse(l);
  if (l[0] === 'vent') return drawVent(l);
  const [, x, w, phase] = l, sx = Math.round(x - camX), y = Math.round(sweepY(phase));
  if (sx > W + 10 || sx + w < -10) return;
  px(sx - 1, 84, 2, GROUND_Y - 84, '#3a3550'); px(sx + w - 1, 84, 2, GROUND_Y - 84, '#3a3550'); // rails
  px(sx + 2, y - 3, w - 4, 7, `rgba(255,60,80,${frame % 4 < 2 ? 0.28 : 0.2})`);
  px(sx + 2, y - 1, w - 4, 3, '#ff3b4f'); px(sx + 2, y, w - 4, 1, '#ffd6dc');
  px(sx - 4, y - 4, 7, 9, '#3a3550'); px(sx + w - 3, y - 4, 7, 9, '#3a3550'); // emitters riding the rails
  px(sx - 1, y - 1, 2, 2, '#ff3b4f'); px(sx + w - 1, y - 1, 2, 2, '#ff3b4f');
}

// A sword drawn as a line of pixels from the hand: angle 0 = straight ahead, -90 = straight up, 90 = straight down.
function drawSword(hx, hy, dir, deg, len, glow) {
  const a = (deg * Math.PI) / 180;
  for (let t = 0; t <= len; t++) {
    const x = hx + dir * Math.cos(a) * t, y = hy + Math.sin(a) * t;
    if (glow) px(x - 2, y - 2, 5, 5, 'rgba(255,90,90,0.28)');
    px(x - 1, y - 1, 3, 3, t < 7 ? '#d9b44a' : '#e8eef8');
  }
}

function drawBoss() {
  if (!boss || boss.dead) return;
  // the portcullis that drops behind you
  if (boss.active && boss.wall > 0) {
    const bottom = Math.round(GROUND_Y * boss.wall), x = Math.round(bossWall()[0] - camX);
    px(x, 0, 12, bottom, '#2a2738');
    for (let k = 0; k < 12; k += 4) px(x + k, 0, 2, bottom, '#6a728c');
    for (let y = 10; y < bottom; y += 18) px(x, y, 12, 2, '#6a728c');
  }
  const shake = boss.state === 'roar' && frame % 4 < 2 ? 1 : 0;
  if (LEVEL.boss.type === 'brain') return drawBigBrain(shake);
  if (LEVEL.boss.type === 'genie') return drawGenie(shake);
  if (LEVEL.boss.type === 'storm') return drawStormBoss(shake);
  const bx = Math.round(boss.x - camX) + shake, y = GROUND_Y, d = boss.dir;
  if (bx < -40 || bx > W + 40) return;
  if (boss.invul > 0 && (frame >> 2) % 2) return; // blinks while dazed
  const walking = boss.state === 'walk' && Math.floor(frame / 12) % 2;
  // legs and boots
  px(bx - 11, y - 16, 9, 16 - (walking ? 3 : 0), '#5a627a'); px(bx + 2, y - 16, 9, 16 - (walking ? 0 : 3), '#5a627a');
  px(bx - 13, y - 5 - (walking ? 3 : 0), 12, 5, '#3d4357'); px(bx + 1, y - 5 - (walking ? 0 : 3), 12, 5, '#3d4357');
  // gold shield on the back arm
  px(d > 0 ? bx - 23 : bx + 13, y - 40, 10, 18, '#d9b44a'); px(d > 0 ? bx - 20 : bx + 16, y - 35, 4, 8, '#e8303a');
  // armored body, belt and shoulders
  px(bx - 14, y - 42, 28, 27, '#9fb1cf'); px(bx - 14, y - 42, 28, 3, '#c8d2e6');
  px(bx - 8, y - 36, 16, 12, '#b8c2d4'); px(bx - 14, y - 24, 28, 4, '#6a728c'); px(bx - 2, y - 25, 4, 6, '#d9b44a');
  px(bx - 19, y - 45, 9, 9, '#c8d2e6'); px(bx + 10, y - 45, 9, 9, '#c8d2e6');
  // helmet: the top of it (y - bossHeight) is where you have to land
  px(bx - 9, y - 64, 18, 22, '#b8c2d4'); px(bx - 9, y - 64, 18, 3, '#e8eef8'); px(bx - 9, y - 43, 18, 2, '#8a96ae');
  px(bx - 7 + (d > 0 ? 2 : 0), y - 56, 12, 4, '#2a2f45');
  px(bx - 4 + d * 3, y - 55, 2, 2, '#ff5a5a'); px(bx + 2 + d * 3, y - 55, 2, 2, '#ff5a5a'); // glowing red eyes
  // the big red feather, swept back
  px(bx - 1, y - 72, 3, 8, '#e8303a'); px(bx - 1 - d * 4, y - 76, 3, 7, '#e8303a'); px(bx - 1 - d * 8, y - 75, 3, 6, '#ff6670'); px(bx - 1 - d * 11, y - 71, 2, 5, '#e8303a');
  // sword: hangs low while walking, rises for the windup (warning), sweeps low on the swing
  const hx = bx + d * 15, hy = y - 46;
  let deg = 70, glow = false;
  if (boss.state === 'windup') { deg = 70 - 150 * (1 - boss.timer / TUNE.bossWindup); glow = frame % 6 < 3; }
  else if (boss.state === 'swing') { deg = -80 + 160 * (1 - boss.timer / TUNE.bossSwing); glow = true; }
  else if (boss.state === 'recover') deg = 82;
  else if (boss.state === 'hurt') deg = 85;
  drawSword(hx, hy, d, deg, 48, glow);
  px(hx - 3, hy - 3, 7, 7, '#c8d2e6'); // fist
  if (boss.state === 'windup') text('!', bx, y - 84, '#ff5a5a', 'center', 14);
  if (boss.state === 'hurt') for (let k = 0; k < 3; k++) { // dazed stars circling his head
    const a = frame * 0.15 + k * 2.1;
    px(bx + Math.cos(a) * 14, y - 70 + Math.sin(a) * 4, 3, 3, '#ffd23f');
  }
  // bouncing arrow over his head: "land here!"
  if (boss.active && boss.invul <= 0 && ['walk', 'recover', 'swing'].includes(boss.state)) {
    const bob = Math.round(Math.sin(frame * 0.15) * 3);
    for (let r = 0; r < 4; r++) px(bx - 3 + r, y - 92 + r + bob, 7 - 2 * r, 1, '#ffd23f');
  }
}

// The Big Brain: a huge pink brain hovering over the arena (top at y - bossHeight, the part you land on), with an angry
// face and a dangling stalk. Charging up: it crackles and warning columns show where lightning will land.
function drawBigBrain(shake) {
  const bx = Math.round(boss.x - camX) + shake, d = boss.dir, hover = Math.round(Math.sin(frame * 0.07) * 2);
  const y = GROUND_Y + hover, cy = y - 44, charging = boss.state === 'windup', zapping = boss.state === 'swing';
  // lightning columns: dotted while the warning is on, a solid bolt while zapping
  for (const wx of boss.strikes) {
    const sx = Math.round(wx - camX);
    if (zapping) {
      px(sx - 6, -100, 12, GROUND_Y + 100, `rgba(125,240,255,${frame % 4 < 2 ? 0.4 : 0.28})`);
      for (let yy = -100; yy < GROUND_Y; yy += 4) px(sx - 2 + (((yy * 7 + frame * 5) % 5) - 2), yy, 3, 4, yy % 8 ? '#7df0ff' : '#fff');
    } else {
      const late = boss.timer <= TUNE.brainLock; // locked on: the warning gets brighter and denser
      for (let yy = 0; yy < GROUND_Y; yy += late ? 6 : 10) px(sx, yy, 1, 3, late ? '#ffd23f' : 'rgba(255,210,63,0.6)');
      px(sx - 6, GROUND_Y - 2, 12, 2, late ? 'rgba(255,210,63,0.9)' : 'rgba(255,210,63,0.4)');
    }
  }
  if (boss.invul > 0 && (frame >> 2) % 2) return; // blinks while dazed
  const base = charging && frame % 6 < 3 ? '#ffc2dc' : '#ff9ec4', fold = 'rgba(120,30,90,0.55)';
  // stalk and wiggling tendrils underneath
  for (let k = 0; k < 6; k++) px(bx - 3 + (k % 2) + Math.round(Math.sin(frame * 0.1 + k) * 2), y - 26 + k * 2, 6, 2, '#e8607f');
  for (const t of [-18, -9, 10, 19]) { px(bx + t, y - 27, 2, 4 + (Math.abs(t) % 3), '#e8607f'); px(bx + t, y - 23 + (Math.abs(t) % 3), 2, 1, '#ffc2dc'); }
  // the brain itself: two lobes, wrinkly folds
  ellipse(bx, cy + 1, 31, 21, '#c8527f');
  ellipse(bx, cy, 30, 20, base);
  px(bx, cy - 20, 1, 22, fold); // the line between the two halves
  for (let k = -2; k <= 1; k++) for (let i = -27; i <= 27; i++) {
    const py = cy + k * 8 + 2 + Math.round(Math.sin(i * 0.5 + k * 2) * 2), edge = (i / 30) ** 2 + ((py - cy) / 20) ** 2;
    if (edge < 0.8 && Math.abs(i) > 1 && !(py > cy - 3 && py < cy + 12 && Math.abs(i) < 14)) px(bx + i, py, 1, 1, fold);
  }
  px(bx - 18, cy - 12, 10, 2, '#ffd0e4'); px(bx - 20, cy - 9, 2, 3, '#ffd0e4'); // shine
  // angry face on the front
  const ex = d * 2;
  px(bx - 16 + ex, cy + 3, 11, 9, '#fff'); px(bx + 5 + ex, cy + 3, 11, 9, '#fff');
  px(bx - 12 + ex + d * 2, cy + 6, 4, 5, charging || zapping ? '#ff3b4f' : '#2a1030'); px(bx + 9 + ex + d * 2, cy + 6, 4, 5, charging || zapping ? '#ff3b4f' : '#2a1030');
  for (let k = 0; k < 11; k++) { px(bx - 16 + ex + k, cy + Math.floor(k / 3), 1, 2, '#6a1d4d'); px(bx + 5 + ex + k, cy + Math.floor((10 - k) / 3), 1, 2, '#6a1d4d'); } // angry brows, slanting down toward the middle
  px(bx - 8 + ex, cy + 15, 16, 2, '#6a1d4d'); // mouth
  if (charging || zapping) for (let k = 0; k < 7; k++) { // crackling sparks over the brain
    const a = frame * 0.4 + k * 0.9;
    px(bx + Math.cos(a) * (14 + k * 2), cy - 8 + Math.sin(a * 1.3) * 12, 2, 2, k % 2 ? '#7df0ff' : '#fff');
  }
  if (charging) text('!', bx, y - 76, '#ff5a5a', 'center', 14);
  if (boss.state === 'hurt') for (let k = 0; k < 3; k++) { // dazed stars circling the top
    const a = frame * 0.15 + k * 2.1;
    px(bx + Math.cos(a) * 18, y - 70 + Math.sin(a) * 4, 3, 3, '#ffd23f');
  }
  if (boss.active && boss.invul <= 0 && ['walk', 'recover', 'swing'].includes(boss.state)) { // bouncing arrow: "land here!"
    const bob = Math.round(Math.sin(frame * 0.15) * 3);
    for (let r = 0; r < 4; r++) px(bx - 3 + r, y - 92 + r + bob, 7 - 2 * r, 1, '#ffd23f');
  }
}

// The Water Genie: a blue genie with horns, iron cuffs and chains on his wrists, and a swirly tail that lies along the ground
// (the part you ground pound). Charging: he gathers a ball of water and dotted lines show where the bolts will fly.
function drawGenie(shake) {
  const bx = Math.round(boss.x - camX) + shake, d = boss.dir, y = GROUND_Y, hover = Math.round(Math.sin(frame * 0.07) * 2);
  const charging = boss.state === 'windup', shooting = boss.state === 'swing', hurt = boss.state === 'hurt';
  const body = '#2a8ad0', light = '#5fb4f0', dark = '#1a5f9a';
  // aiming lines (one per lane in the volley) while he charges: they get brighter just before he fires
  if (charging) for (const lane of new Set(boss.lanes)) {
    for (let k = 26; k < 320; k += 8) px(bx + d * k - (d < 0 ? 3 : 0), GENIE_LANE_Y[lane], 3, 1, boss.timer < 18 ? '#ffd23f' : 'rgba(255,210,63,0.55)');
  }
  for (const s of boss.shots) { // water bolts: a dark-rimmed ball with a trail of droplets
    const sx = Math.round(s.x - camX), sy = s.y, dir = Math.sign(s.vx);
    for (let k = 1; k <= 3; k++) px(sx - dir * (7 + k * 4), sy - 1 + ((k + frame) % 3) - 1, 3 - (k > 2 ? 1 : 0), 2, 'rgba(95,180,240,0.7)');
    disc(sx, sy, 6, '#0a2a5a'); disc(sx, sy, 5, '#3aa0f0'); px(sx - 2, sy - 3, 2, 2, '#bfe8ff'); px(sx + 1, sy + 1, 2, 1, '#1a5f9a');
  }
  if (boss.invul > 0 && (frame >> 2) % 2) return; // blinks while dazed
  // tail: the lower body swirls down and curls along the ground behind him
  const ts = boss.tailSide, tl = Math.round(ts * 52), sg = tl < 0 ? -1 : 1;
  for (let yy = y - 36; yy < y - 6; yy += 2) {
    const t = (yy - (y - 36)) / 30, w = Math.round(22 - 16 * t), sway = Math.round(Math.sin(frame * 0.08 + yy * 0.2) * 2);
    px(bx - w / 2 + sway, yy + hover * (1 - t), w, 2, t > 0.5 ? dark : body); px(bx - w / 2 + sway + 2, yy + hover * (1 - t), 2, 2, light);
  }
  for (let i = 0; i <= Math.abs(tl); i += 2) {
    const t = i / 52, th = Math.max(2, Math.round(8 - 6 * t));
    px(bx + sg * i - (sg < 0 ? 1 : 0), y - th, 2, th, body); px(bx + sg * i - (sg < 0 ? 1 : 0), y - th, 2, 1, light); px(bx + sg * i - (sg < 0 ? 1 : 0), y - 1, 2, 1, dark);
  }
  if (Math.abs(tl) > 30) { const tx = bx + tl; px(tx - (sg < 0 ? 0 : 2), y - 6 - ((frame >> 3) % 2), 2, 4, body); } // the tip flicks up
  // torso, gold sash and shoulders
  const ty = y - 58 + hover;
  px(bx - 11, ty, 22, 24, body); px(bx - 11, ty, 22, 3, light); px(bx - 4, ty + 6, 8, 1, dark); px(bx, ty + 4, 1, 8, dark); px(bx - 12, ty + 20, 24, 4, '#d9b44a'); px(bx - 2, ty + 20, 4, 4, '#fff6b0');
  // head with horns, glowing eyes and a mean grin
  px(bx - 7, ty - 14, 14, 14, body); px(bx - 7, ty - 14, 14, 2, light);
  for (const sd of [-1, 1]) { // curved dark horns
    const hx = bx + sd * 8; px(hx - (sd < 0 ? 2 : 0), ty - 17, 3, 5, '#2a1a3a'); px(hx + sd * 2 - (sd < 0 ? 2 : 0), ty - 21, 3, 5, '#2a1a3a'); px(hx + sd * 4 - (sd < 0 ? 1 : 0), ty - 24, 2, 4, '#4a3260');
  }
  const eye = charging || shooting ? '#ff3b2f' : '#ff9a30';
  px(bx - 5 + d, ty - 9, 3, 2, eye); px(bx + 2 + d, ty - 9, 3, 2, eye);
  for (let k = 0; k < 4; k++) { px(bx - 6 + d + k, ty - 11 + (k > 1 ? 0 : 1), 1, 1, '#0a2a5a'); px(bx + 5 + d - k, ty - 11 + (k > 1 ? 0 : 1), 1, 1, '#0a2a5a'); } // angry brows
  px(bx - 4 + d, ty - 4, 8, 2, '#0a2a5a'); if (charging || shooting) for (let k = 0; k < 4; k++) px(bx - 3 + d + k * 2, ty - 4, 1, 1, '#fff'); // fangs when angry
  // arms: hang down, rise together to gather water, thrust forward to shoot, hold the head when dazed
  const hands = hurt ? [[d * 11, -72], [-d * 11, -72]]
    : charging ? [[d * 20, -60], [d * 17, -54]]
    : shooting ? [[d * 27, -58], [d * 22, -52]]
    : [[d * 16, -38 + Math.round(Math.sin(frame * 0.07) * 1)], [-d * 16, -38]];
  hands.forEach(([hx, hy], i) => {
    const sx0 = bx + (i ? -d : d) * 11, sy0 = ty + 4, hX = bx + hx, hY = y + hy + hover;
    for (let k = 0; k <= 6; k++) px(sx0 + ((hX - sx0) * k) / 6 - 2, sy0 + ((hY - sy0) * k) / 6 - 2, 5, 5, k % 2 ? body : light); // arm
    px(hX - 3, hY - 1, 6, 4, '#8a8fa0'); px(hX - 3, hY + 2, 6, 1, '#4a4f60'); // iron cuff on the wrist
    for (let k = 0; k < 4; k++) px(hX - 1 + Math.round(Math.sin(frame * 0.1 + k + i) * 1), hY + 4 + k * 3, 2, 2, k % 2 ? '#c2c8d6' : '#6a7084'); // dangling chain
  });
  if (charging) { // the water ball swells in his hands
    const r = 2 + Math.round(5 * (1 - boss.timer / TUNE.genieWindup)), wx = bx + d * 26, wy = y - 62 + hover;
    disc(wx, wy, r + 1, '#0a2a5a'); disc(wx, wy, r, frame % 6 < 3 ? '#5fb4f0' : '#3aa0f0'); px(wx - 1, wy - r + 1, 2, 1, '#fff');
    text('!', bx, y - 88, '#ff5a5a', 'center', 14);
  }
  if (hurt) for (let k = 0; k < 3; k++) { // dazed stars circling his head
    const a = frame * 0.15 + k * 2.1;
    px(bx + Math.cos(a) * 14, y - 88 + Math.sin(a) * 4, 3, 3, '#ffd23f');
  }
  if (boss.active && boss.invul <= 0 && Math.abs(ts) > 0.6 && boss.state !== 'roar') { // bouncing arrow over his tail: "ground pound here!"
    const bob = Math.round(Math.sin(frame * 0.15) * 3), ax = bx + Math.round(ts * 26);
    for (let r = 0; r < 4; r++) px(ax - 3 + r, y - 30 + r + bob, 7 - 2 * r, 1, '#ffd23f');
    px(ax - 1, y - 34 + bob, 3, 4, '#ffd23f');
  }
}

// A lightning bolt flying along (vx, vy): a bright head with a jagged yellow trail behind it.
function drawBolt(sx, sy, vx, vy) {
  const l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
  for (let k = 1; k < 8; k++) {
    const j = (((k * 5 + frame * 3) % 5) - 2) * (k < 4 ? 1 : 2);
    px(sx - ux * k * 3 - uy * j, sy - uy * k * 3 + ux * j, 3, 3, k % 2 ? '#ffd23f' : '#fff6b0');
  }
  disc(sx, sy, 5, 'rgba(255,240,150,0.45)'); disc(sx, sy, 3, '#ffd23f'); disc(sx, sy, 2, '#ffffff');
}

// The Storm Cloud: a huge dark thundercloud with an angry face. His top (y 88) is what you ground pound; underneath it rains.
// Charging: the cloud crackles and a dotted line from him to the spot he's aiming at gets brighter and then locks on.
function drawStormBoss(shake) {
  const bx = Math.round(boss.x - camX) + shake, cy = STORM.cy, d = boss.dir;
  const charging = boss.state === 'windup', firing = boss.state === 'swing', hurt = boss.state === 'hurt';
  if ((charging || (firing && boss.left > 0 && boss.nextShot <= 24)) && boss.state !== 'hurt') { // aiming line + target mark
    const ax = boss.aimX - camX, ay = boss.aimY, len = Math.hypot(ax - bx, ay - cy), steps = Math.floor(len / 7);
    for (let k = 2; k < steps; k++) px(bx + (ax - bx) * k / steps, cy + (ay - cy) * k / steps, 2, 2, boss.locked ? '#ffd23f' : 'rgba(255,210,63,0.5)');
    px(ax - 5, ay, 11, 1, boss.locked ? '#ffd23f' : 'rgba(255,210,63,0.5)'); px(ax, ay - 5, 1, 11, boss.locked ? '#ffd23f' : 'rgba(255,210,63,0.5)');
  }
  for (const s of boss.shots) drawBolt(Math.round(s.x - camX), Math.round(s.y), s.vx, s.vy);
  if (boss.invul > 0 && (frame >> 2) % 2) return; // blinks while dazed
  const base = charging && frame % 6 < 3 ? '#6b7396' : '#555c7e', shade = '#3e4462', hi = '#7b84a8', shine = '#9aa3c4';
  for (let k = 0; k < 9; k++) { // rain falling from underneath
    const ry = STORM.bottom + 1 + ((frame * 3 + k * 11) % 16);
    px(bx - 24 + k * 6 + (k % 2) * 2, ry, 1, 3, 'rgba(170,200,255,0.8)');
  }
  // the cloud: a dark underside, a lumpy body, and bumps on top (the highest is at y STORM.top)
  for (const o of [-20, -7, 7, 20]) disc(bx + o, STORM.bottom - 8, 8, shade); // bottom puffs reach y STORM.bottom
  ellipse(bx, cy + 2, 29, 15, shade); ellipse(bx, cy, 28, 14, base);
  disc(bx - 21, cy + 1, 8, base); disc(bx + 21, cy + 1, 8, base);
  disc(bx - 15, cy - 6, 10, base); disc(bx + 4, cy - 9, 11, base); disc(bx + 19, cy - 5, 9, base);
  px(bx + 1, STORM.top, 7, 1, shine); px(bx - 18, cy - 15, 6, 1, hi); px(bx + 17, cy - 12, 5, 1, hi); px(bx - 28, cy - 2, 1, 5, hi); // shine
  for (let k = 0; k < 6; k++) px(bx - 24 + k * 9, cy + 13 + (k % 2), 4, 1, 'rgba(30,34,60,0.6)'); // dark belly
  // angry face: glowing yellow eyes and a jagged frown
  const ex = d * 2, eye = charging || firing ? '#fff6b0' : '#ffd23f';
  if (hurt) { for (const sx of [-13, 5]) for (let k = 0; k < 6; k++) { px(bx + sx + ex + k, cy - 3 + k, 2, 1, '#22263c'); px(bx + sx + ex + 5 - k, cy - 3 + k, 2, 1, '#22263c'); } } // dazed X eyes
  else {
    px(bx - 14 + ex, cy - 3, 9, 7, eye); px(bx + 5 + ex, cy - 3, 9, 7, eye);
    px(bx - 11 + ex + d * 2, cy - 1, 3, 5, '#22263c'); px(bx + 8 + ex + d * 2, cy - 1, 3, 5, '#22263c');
    for (let k = 0; k < 9; k++) { px(bx - 14 + ex + k, cy - 6 + Math.floor(k / 3), 1, 2, '#22263c'); px(bx + 5 + ex + k, cy - 4 - Math.floor(k / 3), 1, 2, '#22263c'); } // brows slanting down toward the middle
  }
  for (let k = 0; k < 10; k++) px(bx - 10 + ex + k * 2, cy + 8 + (k % 2) * 2, 2, 2, '#22263c'); // jagged mouth
  if (charging || firing) for (let k = 0; k < 5; k++) { // electricity crackling over the cloud
    const sx = bx - 24 + ((frame * 5 + k * 23) % 48), sy = cy - 12 + ((frame * 3 + k * 17) % 24);
    px(sx, sy, 2, 2, '#fff6b0'); px(sx + 1, sy + 2, 2, 2, '#ffd23f');
  }
  if (charging) text('!', bx, STORM.top - 8, '#ff5a5a', 'center', 14);
  if (hurt) for (let k = 0; k < 3; k++) { // dazed stars circling the top
    const a = frame * 0.15 + k * 2.1;
    px(bx + Math.cos(a) * 18, STORM.top - 10 + Math.sin(a) * 4, 3, 3, '#ffd23f');
  }
  if (boss.active && boss.invul <= 0 && ['walk', 'recover', 'swing'].includes(boss.state)) { // bouncing arrow: "ground pound here!"
    const bob = Math.round(Math.sin(frame * 0.15) * 3);
    for (let r = 0; r < 4; r++) px(bx - 3 + r, STORM.top - 28 + r + bob, 7 - 2 * r, 1, '#ffd23f');
    px(bx - 1, STORM.top - 32 + bob, 3, 4, '#ffd23f');
  }
}

function drawBossHud() {
  if (!boss || !boss.active || boss.dead) return;
  const cfg = LEVEL.boss;
  text(cfg.name, W / 2, 30, '#fff', 'center', 7);
  px(W / 2 - 41, 33, 82, 8, '#2a1018');
  for (let i = 0; i < cfg.hp; i++) px(W / 2 - 40 + i * 27, 34, 26, 6, i < boss.hp ? '#e8303a' : '#4a2a33');
  if (bossIntro > 0) {
    text('BOSS FIGHT!', W / 2, 56, '#ff5a5a', 'center', 12);
    text(cfg.tip || 'Jump off a ledge and land on his head!', W / 2, 67, '#fff', 'center', 7);
  }
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
  if (LEVEL.theme === 'sky') return drawStormCloud(g);
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
  if (LEVEL.kind === 'cloud') { px(x - 5, d.y - 1, 10, 1, '#ffffff'); px(x - 2, d.y - 2, 4, 1, '#bfe3ff'); px(x + 3, d.y - 2, 2, 1, '#ffe3f1'); return; }
  if (LEVEL.kind === 'knight') { px(x - 5, d.y - 1, 10, 1, '#9fb1cf'); px(x - 1, d.y - 2, 3, 1, '#c8d2e6'); px(x + 3, d.y - 2, 2, 1, '#e8303a'); return; }
  if (LEVEL.kind === 'monster') { px(x - 5, d.y - 1, 10, 1, '#1470b4'); px(x - 2, d.y - 2, 4, 1, '#2a8ad0'); px(x + 3, d.y - 2, 2, 1, '#1a78bd'); return; }
  if (LEVEL.kind === 'brain') { px(x - 5, d.y - 1, 10, 1, '#ff9ec4'); px(x - 2, d.y - 2, 4, 1, '#ffc2dc'); px(x + 3, d.y - 2, 2, 1, '#c9a2ff'); return; }
  if (LEVEL.kind === 'zombie') { px(x - 5, d.y - 1, 10, 1, '#86c97e'); px(x - 2, d.y - 2, 4, 1, '#9be07a'); px(x + 3, d.y - 2, 2, 1, '#eaeaea'); return; }
  px(x - 4, d.y - 1, 8, 1, SHIRTS[d.hue]); px(x - 2, d.y - 2, 4, 1, '#ffd8b0');
}

function drawBoulder() {
  const b = boulder;
  if (deadTimer > 0) return;
  const stunned = b.stun > 0, cx = Math.round(b.x - camX) + (stunned ? (frame % 2 ? 1 : -1) : 0), cy = Math.round(b.y), r = TUNE.radius; // shocked: shakes
  disc(cx, cy, r + 1, '#3a3a46');
  disc(cx, cy, r, '#9a9aa8');
  // rolling cracks/bumps
  for (let i = 0; i < 4; i++) {
    const a = b.rot + (i * Math.PI) / 2 + i * 0.3;
    const d = r * (0.45 + 0.15 * (i % 2));
    px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2, '#6c6c7a');
  }
  px(cx - r + 2, cy - r + 3, 2, 2, '#c4c4d0');
  if (b.smashing) for (let k = -1; k <= 1; k++) px(cx + k * 5, cy - r - 9 - ((frame * 2) % 5), 1, 6, 'rgba(255,255,255,0.75)'); // speed lines
  // face (does not rotate)
  const ex = b.face * 1;
  px(cx - 4 + ex, cy - 3, 3, 4, '#fff'); px(cx + 1 + ex, cy - 3, 3, 4, '#fff');
  px(cx - 3 + ex + b.face, cy - 2, 1, 2, '#111'); px(cx + 2 + ex + b.face, cy - 2, 1, 2, '#111');
  if (isTalking('boulder')) px(cx - 1 + ex, cy + 3, 3, 3, '#111'); // mouth open while it's talking
  else px(cx - 2 + ex, cy + 3, 5, 1, '#111');
  if (b.vx * b.face > 1.5) px(cx - 1 + ex, cy + 4, 3, 1, '#111');
  if (stunned) { // electric sparks around you and dizzy stars over your head
    for (let k = 0; k < 6; k++) {
      const a = frame * 0.35 + k * 1.05, rr = r + 2 + (k % 2) * 2;
      px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 2, k % 2 ? '#ffd23f' : '#fff6b0');
    }
    for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; px(cx + Math.cos(a) * 9, cy - r - 6 + Math.sin(a) * 2, 3, 3, '#ffd23f'); }
  }
}

function drawFlag(x, label) {
  const sx = Math.round(x - camX);
  px(sx, GROUND_Y - 30, 2, 30, '#ddd');
  px(sx + 2, GROUND_Y - 30, 12, 8, label);
}

function text(str, x, y, color = '#fff', align = 'left', size = 8) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1, W - 8);
  ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y), W - 8);
}

function draw() {
  ctx.setTransform(SS, 0, 0, SS, 0, 0);
  px(0, 0, W, H, '#000');
  ctx.save();
  const sh = shake > 0 ? Math.min(2, Math.ceil(shake / 4)) * (frame % 2 ? 1 : -1) : 0;
  ctx.translate(sh, topPad - Math.round(camY)); // the world layer: scrolls down when you go underground, shakes on a smash
  px(0, -topPad - 100, W, topPad + 100, { day: '#8fd3ff', night: '#0b1030', castle: '#16121f', brain: '#2a0d2e', water: '#0a3a66', sky: skyTop() }[LEVEL.theme]); // sky above the world (portrait)
  drawBackground();
  drawPits();
  drawCavity();
  solids.forEach(drawSolid);
  LEVEL.decor.forEach(drawDecor);
  LEVEL.checkpoints.forEach((cp) => drawFlag(cp, spawnX >= cp ? '#4fe36b' : '#999'));
  if (LEVEL.goalX) drawFlag(LEVEL.goalX, '#ffd23f');
  if (LEVEL.underground && LEVEL.theme === 'castle') { // red carpet into the arena (not over the sand patch)
    px(LEVEL.boss.arenaLeft - 12 - camX, GROUND_Y - 1, 3228 - LEVEL.boss.arenaLeft + 12, 1, '#a3212e');
    px(3284 - camX, GROUND_Y - 1, 108, 1, '#a3212e');
  }
  LEVEL.spikes.forEach(drawSpikes);
  LEVEL.lasers.forEach(drawLaser);
  decals.forEach(drawDecal);
  people.forEach((p) => p.alive && DRAW_PERSON[LEVEL.kind](p));
  drawBoss();
  if (key && !key.taken) drawKey(key.x - camX, key.y);
  if (boss && boss.dead && !ending) {
    if (key && !key.taken) drawArrow(key.x, key.y - 26);
    else if (hasKey && solids.some((sd) => sd[4] === 'sand')) drawArrow(3256, 124);
  }
  drawBaby();
  drawCage();
  drawBoulder();
  if (ending && ending.key.show) drawKey(ending.key.x - camX, ending.key.y);
  ghosts.forEach(drawGhost);
  for (const q of particles) {
    if (!q.bubble) { px(q.x - camX, q.y, q.size, q.size, q.color); continue; }
    const bx = Math.round(q.x - camX), by = Math.round(q.y), n = q.size, c = q.life < 12 ? 'rgba(200,240,255,0.5)' : 'rgba(200,240,255,0.9)'; // a little ring
    px(bx + 1, by, n - 2, 1, c); px(bx + 1, by + n - 1, n - 2, 1, c); px(bx, by + 1, 1, n - 2, c); px(bx + n - 1, by + 1, 1, n - 2, c);
    px(bx + 1, by + 1, 1, 1, '#fff');
  }
  for (const f of floaters) text(f.text, f.x - camX, f.y, '#fff', 'center');
  ctx.restore();

  // HUD
  text('SQUISHED ' + squished + '/' + LEVEL.people.length, 6, 12);
  text('LEVEL ' + (levelIndex + 1), W / 2, 12, '#ffd23f', 'center');
  text(muted ? 'SOUND OFF (M)' : 'SOUND ON (M)', 6, 22, muted ? '#ff9a9a' : '#aaa', 'left', 6);
  drawBossHud();
  if (hasKey && !ending) drawKey(W - 14, 26); // the key you're carrying
  text('LIVES ' + Math.max(0, lives), W - 6, 12, '#ffb3b3', 'right');

  if (state === 'play' && boss && boss.dead && !ending) {
    const msg = lockedHint > 0 ? 'LOCKED! You need the key.' : key && !key.taken ? 'Grab the key!'
      : hasKey && solids.some((sd) => sd[4] === 'sand') ? 'Jump, then press DOWN to smash the ' + LEVEL.underground.smashHint + '!' : '';
    if (msg) text(msg, W / 2, 58, '#ffd23f', 'center', 8);
  }
  if (ending && ending.step === 'talk') {
    const line = LEVEL.underground.lines[ending.line];
    if (line.who === 'baby') drawBubble(baby.x, LEVEL.underground.floorY - LEVEL.underground.babyR - 8, line.text, true); // anchored to the floor so the bubble doesn't hop;
    else drawBubble(boulder.x, boulder.y - TUNE.radius, line.text, false);
  }

  const lastLevel = levelIndex === LEVELS.length - 1;
  const PANEL_X = W < 260 ? 6 : 40;
  if (state === 'title') {
    px(PANEL_X, 52, W - 2 * PANEL_X, 70, 'rgba(0,0,0,0.55)');
    text('BOULD', W / 2, 78, '#ffd23f', 'center', 16);
    text(LEVEL.hint, W / 2, 96, '#fff', 'center');
    text(W < 260 ? 'Use the buttons' : 'Arrows/WASD + Space  or  tap buttons', W / 2, 108, '#ccc', 'center');
    text('Press jump to start', W / 2, 118, '#fff', 'center');
  } else if (state === 'win' || state === 'gameover') {
    px(PANEL_X, 52, W - 2 * PANEL_X, 70, 'rgba(0,0,0,0.55)');
    const title = state === 'gameover' ? 'GAME OVER' : LEVEL.underground ? 'YOU SAVED THE BABY ROCK!' : lastLevel ? 'YOU BEAT THE GAME!' : 'LEVEL CLEAR!';
    text(title, W / 2, 78, state === 'win' ? '#4fe36b' : '#ff6b6b', 'center', title.length > 20 ? 12 : 16);
    text('Squished ' + squished + ' of ' + LEVEL.people.length, W / 2, 98, '#fff', 'center');
    text(state === 'win' && !lastLevel ? 'Press jump for the next level' : state === 'win' ? 'Press jump to play again' : 'Press jump to try again', W / 2, 112, '#ccc', 'center');
  } else if (introTimer > 0) {
    text('LEVEL ' + (levelIndex + 1) + ': ' + LEVEL.name, W / 2, 50, '#ffd23f', 'center', 12);
    text(LEVEL.hint, W / 2, 64, '#fff', 'center');
  }

  if (menuOpen) {
    px(0, 0, W, H, 'rgba(0,0,0,0.65)');
    const mx = menuX(); px(mx, 28, W - 2 * mx, 124, '#1d1a2b'); px(mx, 28, W - 2 * mx, 2, '#ffd23f'); px(mx, 150, W - 2 * mx, 2, '#ffd23f');
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
layout();
frame = 0;
const STEP = 1000 / 60;
let last = performance.now(), acc = 0;
function loop(now) {
  let dt = Math.min(100, now - last); last = now;
  // rAF times jitter by a millisecond or two, and 90/120/144Hz screens don't divide evenly into 60.
  // Snap to the nearest whole fraction of a step (1, 1/2, 1/3, 1/4) when close, so every frame runs the
  // same number of updates instead of an uneven 0, 2, 1, 1 that looks like stutter.
  for (let k = 1; k <= 4; k++) if (Math.abs(dt - STEP / k) < STEP / k * 0.15) { dt = STEP / k; break; }
  acc += dt;
  pollGamepad();
  let ran = false;
  while (acc >= STEP - 0.001) { update(); acc -= STEP; ran = true; }
  if (ran) draw(); // nothing changed otherwise, so skip the redraw (halves the work on 120Hz+ screens)
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Test hook for automated checks (harmless in the browser).
window.__game = { get state() { return state; }, get boulder() { return boulder; }, get squished() { return squished; }, get particles() { return particles; }, get alive() { return deadTimer === 0; }, get lives() { return lives; }, get people() { return people; }, get ghosts() { return ghosts; }, get level() { return LEVEL; }, get levelIndex() { return levelIndex; }, setLevel, startGame, get boss() { return boss; }, get ending() { return ending; }, get hasKey() { return hasKey; }, get key() { return key; }, get baby() { return baby; }, get camY() { return camY; }, get storm() { return storm; }, get solids() { return solids; }, get menuOpen() { return menuOpen; }, gateState, sweepY, laserHits, input, update };
