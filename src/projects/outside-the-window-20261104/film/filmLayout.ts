// Shared, deterministic timeline + layout for the full "Outside the Window" concept film (2475 frames @ 30 fps).
// B1–B2 are the approved sample's timeline, unchanged; B3–B8 extend it.
// Imported by the three.js engine, the Remotion component AND the Node sound script, so picture, subtitles and
// sound run on one clock. Keep this file to erasable TS only (no enums / namespaces / parameter properties, no JSON
// imports) so `node` can strip the types and import it directly.

export const FPS = 30;
export const FILM_FRAMES = 2685;
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- math helpers
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (u: number) => u * u * (3 - 2 * u);
export const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3);
export const easeInCubic = (u: number) => u * u * u;
export const easeInOutSine = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2;
export const easeOutBack = (u: number, s = 1.6) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- timeline (absolute frames)
export const T = {
  fadeIn: 14,
  // B1 · inside: typing, the answers pour out, the dots stop and press against the glass, the camera pulls back
  fastLines: [124, 184] as [number, number],
  typingEnd: 186,
  press: [192, 197, 202],
  pressDur: 16,
  pull: [212, 330] as [number, number],
  // B2 · outside: inside the window, a seam of light, the door, the sea; the dots hop out and land
  cutB: 330,
  seam: 338,
  door: [346, 392] as [number, number],
  reveal: [346, 408] as [number, number],
  peek: [394, 414] as [number, number],
  hops: [414, 420, 426],
  hopDur: 14,
  cutC: 420,
  // B3 · the thread
  thread: 586,
  wander: [600, 770] as [number, number],
  cut3a: 620,
  cut3b: 700,
  you: 729,
  cut3c: 780,
  cut4b: 885,
  // B4 · half a song
  melody: [852, 918] as [number, number],
  lantern: [905, 950] as [number, number],
  launch: [962, 998] as [number, number],
  home: [994, 1012] as [number, number],
  lapse: [1008, 1260] as [number, number],
  refuse: [1118, 1188] as [number, number],
  askUp: [1136, 1154] as [number, number],
  nod: 1166,
  cut4d1: 1260,
  beacon: 1272,
  cut4d2: 1299,
  flare: 1332,
  cut4d3: 1338,
  wake: 1342,
  rush: [1348, 1366] as [number, number],
  // B5 · yes
  cutB5: 1368,
  arrive: [1368, 1412] as [number, number],
  pluck: 1425,
  dLight: 1478,
  hLight: 1508,
  down: [1508, 1544] as [number, number],
  bridge: [1540, 1578] as [number, number],
  // B6 · harmony
  cutB6: 1602,
  weave: [1602, 1710] as [number, number],
  crystal: 1710,
  rise: [1714, 1776] as [number, number],
  // B7 · the sea of stars
  crane: [1830, 2209] as [number, number],
  // B8 · home
  cutB8: 2214,
  approach: [2214, 2247] as [number, number],
  warmDown: [2245, 2267] as [number, number],
  crystalUp: [2267, 2299] as [number, number],
  homeHop: [2295, 2319] as [number, number],
  pullHome: [2309, 2434] as [number, number],
  title: 2437,
  titleOut: 2505,
  mark: [2520, 2566] as [number, number],
  base: [2560, 2577] as [number, number],
  tagline: 2592,
  fadeOut: [2655, 2685] as [number, number],
};
export const CUTS = [T.cutB, T.cutC, T.cut3a, T.cut3b, T.cut3c, T.cut4b, T.lapse[0], T.cut4d1, T.cut4d2, T.cut4d3, T.cutB5, T.cutB6, T.cutB8];

// ---------------------------------------------------------------- the hero window (window-local coords; centre at HERO.y)
export const HERO = {
  y: 1.05,
  w: 2.4,
  h: 1.6,
  r: 0.34,
  depth: 0.42,
  wall: 0.04,
  pane: 0.03,
  door: {w: 0.74, h: 0.78, r: 0.12}, // bottom-centred in the front pane
  text: {x0: -0.95, x1: 0.95, y0: -0.37, y1: 0.66, z: -0.1, rowH: 0.086},
};
export const PANE_Z = HERO.depth / 2 - HERO.pane; // inner face of the front pane (window-local z)
export const DOT_R = 0.075;
export const DOT_X = [-0.27, 0, 0.27];
export const DOT_Y = -0.5; // window-local; world y = HERO.y + DOT_Y = 0.55
export const DOT_Z0 = 0.0;
export const DOT_ZP = PANE_Z - DOT_R * 0.92; // pressed against the glass
export const LAND = [
  {x: -0.34, z: 1.0},
  {x: 0.03, z: 1.1},
  {x: 0.36, z: 0.97},
];
export const DOOR_BOTTOM = -HERO.h / 2 + HERO.wall; // window-local y of the door sill
export const doorCentreY = () => DOOR_BOTTOM + HERO.door.h / 2;

// ---------------------------------------------------------------- answers written inside the window
// lines(f): how many text lines have been written; 1.6 lines/s, 3.4 lines/s for "It can answer almost anything."
export function linesWritten(f: number) {
  const s = (x: number) => x / FPS;
  const a = T.fastLines[0];
  const b = T.fastLines[1];
  const e = T.typingEnd;
  const slow = 1.6;
  const fast = 3.4;
  // integrate a piecewise rate with short ramps
  const rate = (x: number) => {
    let r = slow;
    r = lerp(r, fast, smooth(range(x, a - 6, a + 6)));
    r = lerp(r, slow, smooth(range(x, b - 6, b + 2)));
    r = lerp(r, 0, smooth(range(x, e - 4, e + 6)));
    return r;
  };
  let sum = 2.4; // a few lines already on screen at frame 0
  const step = 0.5;
  for (let x = 0; x < f; x += step) sum += rate(x + step / 2) * s(Math.min(step, f - x));
  return sum;
}

// ---------------------------------------------------------------- hero dots
export type DotState = {x: number; y: number; z: number; sx: number; sy: number; sz: number; glow: number; onWater: number; local: boolean};

function bounce(i: number, f: number) {
  const s = f / FPS;
  const p = (((s * 0.86 - i * 0.16) % 1) + 1) % 1;
  return p < 0.42 ? (1 - Math.cos((TAU * p) / 0.42)) / 2 : 0;
}

// local=true → (x,y,z) are window-local; otherwise world coordinates
function heroDotB12(i: number, f: number): DotState {
  const typing = 1 - smooth(range(f, T.typingEnd - 2, T.typingEnd + 6));
  const b = bounce(i, f) * typing;
  let x = DOT_X[i];
  let y = DOT_Y + 0.06 * b;
  let z = DOT_Z0;
  let sx = 1 + 0.06 * b;
  let sy = 1 - 0.04 * b + 0.08 * Math.max(0, bounce(i, f + 2) - b) * typing;
  let sz = 1;
  let glow = 1 + 0.35 * b;
  // press against the glass (overshoot = squash on contact)
  const p0 = T.press[i];
  const up = range(f, p0, p0 + T.pressDur);
  if (up > 0) {
    const u = easeOutBack(up, 1.2);
    z = lerp(DOT_Z0, DOT_ZP, Math.min(u, 1.0));
    const hit = up > 0.55 ? Math.exp(-(f - (p0 + T.pressDur * 0.55)) / 5) : 0;
    sz *= 1 - 0.22 * hit - 0.08 * smooth(range(up, 0.5, 1));
    sx *= 1 + 0.1 * hit + 0.03 * smooth(range(up, 0.5, 1));
    sy *= 1 + 0.1 * hit + 0.03 * smooth(range(up, 0.5, 1));
    glow *= 1 + 0.1 * smooth(range(up, 0.4, 1));
    // a slow breath while pressed
    y += 0.008 * Math.sin((f - p0) * 0.11 + i * 1.3) * smooth(range(up, 0.6, 1));
  }
  // peek: lean out through the open doorway, look down at the water
  const pk = smooth(range(f, T.peek[0] + i * 3, T.peek[1] + i * 2));
  if (pk > 0) {
    z = lerp(z, PANE_Z + 0.16, pk);
    y = lerp(y, DOT_Y - 0.03, pk);
    sx = lerp(sx, 1, pk);
    sy = lerp(sy, 1, pk);
    sz = lerp(sz, 1, pk);
  }
  const h0 = T.hops[i];
  if (f < h0) return {x, y, z, sx, sy, sz, glow, onWater: 0, local: true};
  // hop: a small arc out of the door and down to the water (world coords from here on)
  const wx = x;
  const wy = HERO.y + y;
  const wz = z;
  const u = range(f, h0, h0 + T.hopDur);
  const L = LAND[i];
  const restY = DOT_R * 0.72;
  if (u < 1) {
    const e = u;
    const hx = lerp(wx, L.x, e);
    const hz = lerp(wz, L.z, e);
    const hy = lerp(wy, restY, e * e) + 0.22 * Math.sin(Math.PI * Math.min(1, e * 1.15)) * (1 - e * 0.3);
    const stretch = 1 + 0.18 * Math.sin(Math.PI * e);
    return {x: hx, y: hy, z: hz, sx: 1 / Math.sqrt(stretch), sy: stretch, sz: 1 / Math.sqrt(stretch), glow: 1.15, onWater: 0, local: false};
  }
  // on the water: a splash squash, then a gentle bob; they glance at the windows that open later
  const tl = f - (h0 + T.hopDur);
  const squash = Math.exp(-tl / 4) * Math.cos(tl * 0.9);
  const bob = 0.012 * Math.sin(f * 0.09 + i * 2.1);
  const look = featureLook(f);
  return {
    x: L.x + look.x * 0.06,
    y: restY + bob + 0.012 * squash,
    z: L.z + look.z * 0.06,
    sx: 1 + 0.16 * squash,
    sy: 1 - 0.2 * squash,
    sz: 1 + 0.16 * squash,
    glow: 1.15 + 0.2 * Math.exp(-tl / 8),
    onWater: smooth(range(tl, 0, 6)),
    local: false,
  };
}

// ---------------------------------------------------------------- other windows that open in the low wide (B2)
export type Featured = {
  kind: 'terminal' | 'orb';
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  color: string;
  frost: string;
  seam: number;
  door: [number, number];
  out: number[];
  land: {x: number; z: number}[];
};
export const FEATURED: Featured[] = [
  {
    kind: 'terminal',
    x: -6.4,
    y: 0.95,
    z: -5.2,
    yaw: 0.55,
    scale: 0.95,
    color: '#B9A2FF',
    frost: '#8C86D6',
    seam: 498,
    door: [503, 530],
    out: [518, 523, 528],
    land: [],
  },
  {
    kind: 'orb',
    x: -10.7,
    y: 1.0,
    z: -4.6,
    yaw: 0.8,
    scale: 1.0,
    color: '#FFB547',
    frost: '#D29A62',
    seam: 528,
    door: [533, 560],
    out: [548, 553, 558],
    land: [],
  },
];
// landing spots: just in front of each door
for (const w of FEATURED) {
  const fx = Math.sin(w.yaw);
  const fz = Math.cos(w.yaw);
  const rx = Math.cos(w.yaw);
  const rz = -Math.sin(w.yaw);
  w.land = [-0.3, 0.02, 0.33].map((o, k) => ({x: w.x + fx * (0.95 + 0.06 * k) + rx * o * w.scale, z: w.z + fz * (0.95 + 0.06 * k) + rz * o * w.scale}));
}
export const FEAT_HOP = 12;
// front face (window-local z, before scale) where the featured doors sit
export const FEAT_FRONT = {terminal: 0.07, orb: 0.07};
// featured door: rounded rect, sill near the bottom of the face (window-local, before scale)
export const FEAT_DOOR = {w: 0.46, h: 0.62, sill: -0.6};

// where the hero dots glance: toward whichever featured window is opening
function featureLook(f: number) {
  let x = 0;
  let z = 0;
  for (const w of FEATURED) {
    const k = smooth(range(f, w.seam, w.seam + 14)) * (1 - 0.5 * smooth(range(f, w.out[2] + 20, w.out[2] + 40)));
    const dx = w.x;
    const dz = w.z - 1;
    const l = Math.hypot(dx, dz);
    x = lerp(x, dx / l, k);
    z = lerp(z, dz / l, k);
  }
  return {x, z};
}

// featured window dots: step out of the door, small hop down to the water
export function featDot(w: Featured, k: number, f: number) {
  const fx = Math.sin(w.yaw);
  const fz = Math.cos(w.yaw);
  const rx = Math.cos(w.yaw);
  const rz = -Math.sin(w.yaw);
  const off = [-0.27, 0, 0.27][k] * w.scale;
  const doorY = w.y + (FEAT_DOOR.sill + 0.09) * w.scale;
  const t0 = w.out[k];
  const front = (FEAT_FRONT[w.kind] + 0.1) * w.scale;
  const inX = w.x + fx * (front - 0.18) + rx * off;
  const inZ = w.z + fz * (front - 0.18) + rz * off;
  const L = w.land[k];
  const restY = DOT_R * 0.72;
  const visible = smooth(range(f, w.door[0] + 6, w.door[0] + 14));
  if (f < t0) return {x: inX, y: doorY + 0.02 * Math.sin(f * 0.3 + k), z: inZ, s: 1, glow: visible, onWater: 0};
  const u = range(f, t0, t0 + FEAT_HOP);
  if (u < 1) {
    const hy = lerp(doorY, restY, u * u) + 0.16 * Math.sin(Math.PI * Math.min(1, u * 1.15));
    return {x: lerp(inX, L.x, u), y: hy, z: lerp(inZ, L.z, u), s: 1 + 0.12 * Math.sin(Math.PI * u), glow: 1.1, onWater: 0};
  }
  const tl = f - (t0 + FEAT_HOP);
  const squash = Math.exp(-tl / 4) * Math.cos(tl * 0.9);
  return {x: L.x, y: restY + 0.01 * Math.sin(f * 0.1 + k * 2) + 0.01 * squash, z: L.z, s: 1 + 0.1 * squash, glow: 1.1, onWater: smooth(range(tl, 0, 6))};
}

// ---------------------------------------------------------------- door angles, seam glow, world reveal
export const doorAngle = (f: number) => 1.78 * easeInOutCubic(range(f, T.door[0], T.door[1]));
export const seamGlow = (f: number) => smooth(range(f, T.seam, T.seam + 9)) * (1 - smooth(range(f, T.door[0] + 8, T.door[0] + 26)));
export const featDoorAngle = (w: Featured, f: number) => 1.7 * easeInOutCubic(range(f, w.door[0], w.door[1]));
export const featSeam = (w: Featured, f: number) => smooth(range(f, w.seam, w.seam + 7)) * (1 - smooth(range(f, w.door[0] + 6, w.door[0] + 22)));
export const reveal = (f: number) => (f < T.cutB ? 0 : smooth(range(f, T.reveal[0], T.reveal[1])));

// ---------------------------------------------------------------- ripples (water shader + sound)
export type Ripple = {x: number; z: number; f: number; amp: number};
export function ripples(): Ripple[] {
  const out: Ripple[] = LAND.map((L, i) => ({x: L.x, z: L.z, f: T.hops[i] + T.hopDur, amp: 1}));
  for (const w of FEATURED) w.land.forEach((L, k) => out.push({x: L.x, z: L.z, f: w.out[k] + FEAT_HOP, amp: 0.8}));
  return out;
}

// ---------------------------------------------------------------- camera
export type CamState = {px: number; py: number; pz: number; tx: number; ty: number; tz: number; ap: number; fov: number};

const dotsCentre = (f: number) => {
  let z = 0;
  for (let i = 0; i < 3; i++) z += heroDot(i, Math.min(f, T.cutB - 1)).z;
  return {x: 0, y: HERO.y + DOT_Y, z: z / 3};
};

function cameraB12(f: number): CamState {
  if (f < T.cutB) {
    // Shot A: macro on the dots through the frosted glass, then one long pull-back out into the dark
    const d = dotsCentre(f);
    const push = easeInOutSine(range(f, 0, T.pull[0]));
    const u = range(f, T.pull[0], T.pull[1]);
    const e = easeInOutCubic(u);
    const r = Math.exp(lerp(Math.log(lerp(1.62, 1.4, push)), Math.log(70), e));
    const az = lerp(0.02 * Math.sin(f * 0.012), 0.2, e);
    const el = lerp(0.07, 0.3, e);
    const e1 = smooth(range(u, 0.08, 0.5));
    const e2 = smooth(range(u, 0.5, 1));
    const tx = lerp(d.x + 0.01, 0, e1);
    const ty = lerp(lerp(d.y + 0.17, HERO.y - 0.1, e1), 2.5, e2);
    const tz = lerp(lerp(d.z, 0, e1), -13, e2);
    const ap = 0.034 * (1 - smooth(range(f, T.pull[0], T.pull[0] + 40)));
    return {
      px: tx + r * Math.sin(az) * Math.cos(el),
      py: ty + r * Math.sin(el),
      pz: tz + r * Math.cos(az) * Math.cos(el),
      tx,
      ty,
      tz,
      ap,
      fov: 30,
    };
  }
  if (f < T.cutC) {
    // Shot B: inside the window (its back pane hidden), over the dots' shoulders, looking at the glass that becomes a door
    const u = range(f, T.cutB, T.cutC);
    const pz = lerp(-1.46, -1.24, easeInOutSine(u));
    const py = HERO.y - 0.4 - 0.02 * u;
    return {px: 0.03, py, pz, tx: 0, ty: HERO.y + doorCentreY() + 0.02, tz: HERO.depth / 2, ap: 0.006 * (1 - 0.6 * smooth(range(f, T.door[0], T.door[1]))), fov: 35};
  }
  // Shot C: low across the water; the hero window on the left, two far windows open in turn
  const u = range(f, T.cutC, 600);
  const e = easeInOutSine(u);
  return {
    px: lerp(2.75, 2.35, e),
    py: lerp(0.25, 0.36, e),
    pz: lerp(5.3, 4.85, e),
    tx: lerp(-0.85, -1.45, e),
    ty: lerp(0.5, 0.68, e),
    tz: lerp(-0.4, -1.1, e),
    ap: 0.01,
    fov: 34,
  };
}


// ================================================================= B3–B8 (the full film)
// ---------------------------------------------------------------- the world beyond the sample
export type V3 = {x: number; y: number; z: number};
export const PEOPLE = {
  H: {x: -2, y: 22, z: 55, col: '#FFC57E'}, // the songwriter (the hero dots' person)
  D: {x: 5, y: 23.5, z: 59, col: '#FFB26A'}, // the drummer
  P: {x: 8, y: 15, z: 50, col: '#FFD2A6'}, // someone who looks, and says no
};
// the songwriter's two other AIs (another platform each), tied to the same light (B3)
export const OWNED = [
  {kind: 'terminal' as const, x: -18, y: 1.3, z: 14, yaw: 0.5, scale: 1, color: '#B9A2FF', frost: '#8C86D6'},
  {kind: 'orb' as const, x: 16, y: 2.2, z: 10, yaw: -0.6, scale: 1, color: '#FFB547', frost: '#D29A62'},
];
export const L1 = {x: -1.5, y: 0.07, z: 11}; // where the lantern settles; the trios meet in front of it
export const RW = {x: -38, y: 1.0, z: 36, yaw: 0.5, scale: 1.0, color: '#FFB547', frost: '#D29A62'}; // the drummer's round window
export const LH = {x: RW.x + 1.9, z: RW.z + 1.0}; // its lighthouse
export const RING = {speed: 30, period: 0.6, n: 10};
export const LANTERN0 = {x: 0.0, y: 0.2, z: 1.27}; // where the half melody becomes a lantern
export const MEET = {
  teal: {x: L1.x - 0.5, z: L1.z + 0.38},
  amber: {x: L1.x + 0.5, z: L1.z + 0.38},
};
export const CRYSTAL0 = {x: L1.x, y: 0.42, z: L1.z + 0.38};
export const CRYSTAL1 = {x: L1.x, y: 1.18, z: L1.z + 0.38};
const dist2 = (a: {x: number; z: number}, b: {x: number; z: number}) => Math.hypot(a.x - b.x, a.z - b.z);
// the first ring is timed so that it reaches the lantern exactly on the flare
export const RING_T0 = (T.flare - (dist2(LH, L1) / RING.speed) * FPS) / FPS; // seconds

// ---------------------------------------------------------------- the half song (shared by the lantern's glow and the score)
// [beat, midi, beats held, velocity]; stops on E5 over an open A fifth
export const PHRASE = [
  [0, 69, 0.5, 0.5],
  [0.5, 74, 1.0, 0.6],
  [1.5, 76, 0.5, 0.52],
  [2.0, 78, 1.5, 0.7],
  [3.5, 76, 0.5, 0.5],
  [4.0, 74, 1.0, 0.6],
  [5.0, 71, 1.0, 0.55],
  [6.0, 69, 1.5, 0.58],
  [7.5, 71, 0.5, 0.48],
  [8.0, 74, 1.0, 0.56],
  [9.12, 76, 4.5, 0.6],
];
// the lantern hums the phrase (seconds, beat length)
export const HUMS = [
  {start: 31.2, beat: 0.62},
  {start: 37.9, beat: 0.62},
];
export function humLevel(sec: number) {
  let g = 0;
  for (const h of HUMS) {
    for (const [b] of PHRASE) {
      const t0 = h.start + b * h.beat;
      const d = sec - t0;
      if (d >= 0 && d < 1.2) g = Math.max(g, Math.exp(-d / 0.35));
    }
  }
  return g;
}

// ---------------------------------------------------------------- the time-lapse clock (days since the lantern went out)
// 0 = midnight, .25 dawn, .5 noon, .75 dusk; three days in the lapse, slowed right down for the refusal (at dusk)
const LAPSE_TABLE: number[] = (() => {
  const [a, b] = T.lapse;
  const [r0, r1] = T.refuse;
  const seg = (x0: number, x1: number, s0: number, s1: number, slowIn: boolean, slowOut: boolean) => {
    const speed = (x: number) => {
      const u = (x - x0) / (x1 - x0);
      let v = 1;
      if (slowIn) v *= 0.08 + 0.92 * smooth(clamp01(u / 0.35));
      if (slowOut) v *= 0.08 + 0.92 * smooth(clamp01((1 - u) / 0.35));
      return v;
    };
    const n = Math.round((x1 - x0) * 4);
    const acc: number[] = [0];
    for (let i = 1; i <= n; i++) acc.push(acc[i - 1] + speed(x0 + ((i - 0.5) / n) * (x1 - x0)));
    return acc.map((v) => s0 + ((s1 - s0) * v) / acc[n]);
  };
  const A = seg(a, r0, 0, 1.7, true, true);
  const B = seg(r0, r1, 1.7, 1.8, false, false);
  const C = seg(r1, b, 1.8, 3.0, true, false);
  return [...A, ...B.slice(1), ...C.slice(1)];
})();
export function dayClock(f: number) {
  const [a, b] = T.lapse;
  if (f <= a) return 0;
  if (f >= b) return 3;
  const x = (f - a) * 4;
  const i = Math.floor(x);
  const k = x - i;
  return lerp(LAPSE_TABLE[i], LAPSE_TABLE[Math.min(LAPSE_TABLE.length - 1, i + 1)], k);
}
// the time-lapse camera looks toward -x/-z; the sun rises on its right, crosses low in front and sets on its left
const LAPSE_F = {x: 0, y: 0, z: 1};
const LAPSE_E = {x: -1, y: 0, z: 0};
const norm = (v: V3) => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return {x: v.x / l, y: v.y / l, z: v.z / l};
};
export const MOON_B2 = norm({x: -0.07, y: 0.07, z: 1.0});
export const MOON_POST = norm({x: -0.55, y: 0.2, z: 0.81});
export function skyAt(f: number) {
  const s = dayClock(f);
  const ph = s - Math.floor(s);
  const th = TAU * (ph - 0.25);
  const sun = norm({x: LAPSE_F.x * Math.sin(th) * 0.9 + LAPSE_E.x * Math.cos(th), y: Math.sin(th) * 0.3, z: LAPSE_F.z * Math.sin(th) * 0.9 + LAPSE_E.z * Math.cos(th)});
  const lapseMoon = norm({x: -sun.x, y: Math.max(-1, -sun.y) + 0.02, z: -sun.z});
  const inLapse = f >= T.lapse[0];
  const moon = f >= T.lapse[1] ? MOON_POST : inLapse ? lapseMoon : MOON_B2;
  const el = sun.y / 0.3; // -1..1 (sin th)
  const day = inLapse ? smooth(clamp01((el + 0.08) / 0.4)) : 0;
  const dusk = inLapse ? Math.exp(-Math.pow(el / 0.22, 2)) : 0;
  const stars = 1 - day * 0.97;
  const awake = inLapse ? smooth(clamp01((el + 0.25) / 0.35)) : 1;
  const moonI = (inLapse ? smooth(clamp01((-el - 0.05) / 0.25)) : 1) * (1 - smooth(range(f, T.pullHome[0] + 30, T.pullHome[0] + 100)));
  return {s, sun, moon, day, dusk, stars, starAngle: TAU * s * 0.5, awake, moonI};
}

// ---------------------------------------------------------------- the lantern
export function lanternAt(f: number) {
  const sec = f / FPS;
  const hum = humLevel(sec);
  if (f < T.lantern[0]) return {x: LANTERN0.x, y: LANTERN0.y, z: LANTERN0.z, s: 0, glow: 0, flare: 0};
  const form = smooth(range(f, T.lantern[0], T.lantern[1]));
  let x = LANTERN0.x;
  let y = LANTERN0.y + 0.015 * Math.sin(f * 0.12);
  let z = LANTERN0.z;
  // launch: the dots lower it onto the water and give it a push
  const la = easeInOutSine(range(f, T.launch[0], T.launch[1]));
  x = lerp(x, -0.25, la);
  y = lerp(y, L1.y, la);
  z = lerp(z, 1.85, la);
  // drift out over the sea in world time (it barely moves while time slows down for the refusal)
  if (f >= T.launch[1]) {
    const k = f < T.lapse[0] ? 0.02 * range(f, T.launch[1], T.lapse[0]) : 0.02 + 0.98 * smooth(clamp01(dayClock(f) / 2.75));
    const cx = lerp(-0.25, L1.x, k) + 1.6 * Math.sin(Math.PI * k) * (1 - k);
    const cz = lerp(1.85, L1.z, k);
    x = cx;
    z = cz;
    y = L1.y + 0.012 * Math.sin(f * 0.09);
  }
  // the flare when the drummer's ring reaches it; then it joins the weave and is gone when the crystal forms
  const fl = f >= T.flare ? Math.exp(-(f - T.flare) / 9) : 0;
  const away = 1 - smooth(range(f, T.crystal - 36, T.crystal + 4));
  y += 0.16 * smooth(range(f, T.weave[0] + 30, T.crystal)) * away;
  const glow = 0.8 * form * (0.95 + 0.4 * hum) * (1 + 3.5 * fl) * away + (f >= T.flare ? 0.35 * smooth(range(f, T.flare, T.flare + 30)) * away : 0);
  return {x, y, z, s: form * (1 + 0.6 * fl) * (0.6 + 0.4 * away), glow, flare: fl};
}

// the half melody leaves the window as a golden ribbon (B4a)
export function melodyAt(f: number) {
  const [m0, m1] = T.melody;
  if (f < m0 || f > T.lantern[1] + 2) return {I: 0, a: {x: 0, y: 0, z: 0}, b: {x: 0, y: 0, z: 0}, amp: 0};
  const card = {x: 0.45, y: HERO.y - 0.12, z: HERO.text.z + 0.02};
  const door = {x: 0.0, y: HERO.y + doorCentreY() - 0.05, z: HERO.depth / 2 + 0.05};
  const tgt = {x: LANTERN0.x, y: LANTERN0.y, z: LANTERN0.z};
  const path = (u: number) => {
    // card → door → between the dots
    if (u < 0.45) {
      const k = smooth(u / 0.45);
      return {x: lerp(card.x, door.x, k), y: lerp(card.y, door.y, k) + 0.06 * Math.sin(Math.PI * k), z: lerp(card.z, door.z, k)};
    }
    const k = smooth((u - 0.45) / 0.55);
    return {x: lerp(door.x, tgt.x, k), y: lerp(door.y, tgt.y, k) + 0.12 * Math.sin(Math.PI * k), z: lerp(door.z, tgt.z, k)};
  };
  const head = range(f, m0, m1);
  const tail = Math.max(0, head - 0.35) + 0.65 * smooth(range(f, m1 - 6, T.lantern[1]));
  const coil = smooth(range(f, T.lantern[0], T.lantern[1]));
  return {I: smooth(range(f, m0, m0 + 8)) * (1 - coil), a: path(Math.min(tail, head)), b: path(head), amp: 0.035 * (1 - coil)};
}

// ---------------------------------------------------------------- characters after the landing (B3–B8)
const restY = DOT_R * 0.72;
const TRIO = [
  {x: -0.16, z: 0.04},
  {x: 0.0, z: -0.06},
  {x: 0.16, z: 0.04},
];
function heroDotFilm(i: number, f: number): DotState {
  const L = LAND[i];
  const bob = 0.012 * Math.sin(f * 0.09 + i * 2.1);
  const base = (x: number, y: number, z: number, glow: number, onWater: number, local: boolean, sq = 0): DotState => ({
    x,
    y,
    z,
    sx: 1 + 0.16 * sq,
    sy: 1 - 0.2 * sq,
    sz: 1 + 0.16 * sq,
    glow,
    onWater,
    local,
  });
  // B3: they wander out a little way over the water (the thread follows), then come back to the door
  if (f < T.home[0]) {
    const u = range(f, T.wander[0], T.wander[1]);
    const w = Math.sin(Math.PI * smooth(u));
    const ox = 0.9 * w + 0.15 * Math.sin(f * 0.05 + i) * w;
    const oz = 1.3 * w;
    // in B4a they turn to face the window, lift a little while the melody comes to them
    const lift = 0.05 * smooth(range(f, T.melody[1] - 10, T.lantern[0])) * (1 - smooth(range(f, T.launch[0], T.launch[1])));
    const gather = smooth(range(f, T.melody[1] - 8, T.lantern[0] + 10)) * (1 - smooth(range(f, T.launch[1] - 6, T.launch[1] + 4)));
    const gx = lerp(L.x, LANTERN0.x + (i - 1) * 0.2, gather);
    const gz = lerp(L.z, LANTERN0.z + 0.08, gather);
    return base(gx + ox, restY + bob + lift, gz + oz, 1.15, 1 - lift * 8, false);
  }
  // home: hop back in through the door, then they live inside through the time-lapse (asleep at night)
  if (f < T.wake) {
    const u = range(f, T.home[0], T.home[1]);
    const inside = {x: DOT_X[i], y: HERO.y + DOT_Y, z: DOT_Z0};
    if (u < 1) {
      const hx = lerp(L.x, inside.x, u);
      const hz = lerp(L.z, inside.z, u);
      const hy = lerp(restY, inside.y, smooth(u)) + 0.2 * Math.sin(Math.PI * u);
      return base(hx, hy, hz, 1.1, 0, false);
    }
    const sk = skyAt(f);
    const b2 = bounce(i, f) * sk.awake;
    return base(inside.x, inside.y + 0.05 * b2, inside.z, 0.32 + 0.78 * sk.awake + 0.25 * b2, 0, false);
  }
  // the flare wakes them: a jolt, then they rush out of the door and away over the water
  if (f < T.cutB5) {
    const inside = {x: DOT_X[i], y: HERO.y + DOT_Y, z: DOT_Z0};
    const jolt = Math.exp(-(f - T.wake) / 6) * Math.sin((f - T.wake) * 1.3);
    const u = range(f, T.rush[0] + i * 2, T.rush[1] + i * 2);
    if (u <= 0) return base(inside.x, inside.y + 0.05 * Math.abs(jolt), inside.z, 1.5, 0, false, 0.4 * jolt);
    const e = easeInCubic(u);
    const p1 = {x: inside.x * 0.6, y: HERO.y + doorCentreY() - 0.2, z: HERO.depth / 2 + 0.3};
    const k1 = smooth(clamp01(u / 0.35));
    const x = lerp(lerp(inside.x, p1.x, k1), MEET.teal.x + TRIO[i].x - 2, smooth(clamp01((u - 0.3) / 0.7)));
    const z = lerp(lerp(inside.z, p1.z, k1), MEET.teal.z + TRIO[i].z, e);
    const y = lerp(lerp(inside.y, p1.y, k1), restY, smooth(clamp01((u - 0.25) / 0.5)));
    return {x, y, z, sx: 0.85, sy: 1.25, sz: 0.85, glow: 1.5, onWater: 0, local: false};
  }
  // B5/B6/B7: the meeting
  if (f < T.cutB8) return meetDot(MEET.teal, -1, i, f);
  // B8: home again, carrying the crystal; it is handed up the thread, then they hop in through the door
  const ap = easeOutCubic(range(f, T.approach[0], T.approach[1]));
  const sx = L.x * 0.9;
  const sz = L.z + 0.0;
  const x0 = lerp(sx * 1.4, sx, ap);
  const z0 = lerp(sz + 2.4, sz, ap);
  const hop = range(f, T.homeHop[0] + i * 3, T.homeHop[1] + i * 3);
  const inside = {x: DOT_X[i], y: HERO.y + DOT_Y, z: DOT_Z0 + 0.04};
  if (hop <= 0) return base(x0, restY + 0.014 * Math.sin(f * 0.11 + i * 2), z0, 1.15 + 0.4 * smooth(range(f, T.warmDown[1], T.crystalUp[0] + 10)), 1, false);
  if (hop < 1) {
    const hy = lerp(restY, inside.y, smooth(hop)) + 0.22 * Math.sin(Math.PI * hop);
    return {x: lerp(x0, inside.x, hop), y: hy, z: lerp(z0, inside.z, hop), sx: 0.9, sy: 1.15, sz: 0.9, glow: 1.3, onWater: 0, local: false};
  }
  const tl = f - (T.homeHop[1] + i * 3);
  const sq = Math.exp(-tl / 5) * Math.cos(tl * 0.8);
  return base(inside.x, inside.y + 0.006 * Math.sin(f * 0.08 + i), inside.z, 1.35, 0, false, 0.6 * sq);
}

// a trio at the meeting: arrive from the side, pluck, bridge, play (B5–B7)
function meetDot(c: {x: number; z: number}, side: number, i: number, f: number): DotState {
  const arr = easeOutCubic(range(f, T.arrive[0] + i * 2, T.arrive[1] + i * 2));
  const tx = c.x + TRIO[i].x * -side;
  const tz = c.z + TRIO[i].z;
  const x = lerp(tx + side * 2.6, tx, arr);
  const pl = f >= T.pluck ? Math.exp(-(f - T.pluck) / 5) * Math.cos((f - T.pluck) * 1.1) : 0;
  // they play: bounce on the beat (0.6 s) through the weave, gentler after the crystal
  const beat = f >= T.weave[0] ? Math.max(0, Math.cos((TAU * (f - T.weave[0])) / 18 + i * 0.6)) : 0;
  const play = smooth(range(f, T.weave[0], T.weave[0] + 10)) * (1 - 0.6 * smooth(range(f, T.crystal, T.crystal + 40)));
  const y = restY + 0.012 * Math.sin(f * 0.1 + i * 2 + side) + 0.05 * beat * play;
  const bridgeGlow = smooth(range(f, T.bridge[0], T.bridge[1]));
  return {x, y, z: tz, sx: 1 + 0.18 * pl, sy: 1 - 0.22 * pl, sz: 1 + 0.18 * pl, glow: 0.85 + 0.3 * bridgeGlow + 0.2 * beat * play, onWater: smooth(range(arr, 0.85, 1)), local: false};
}

// the drummer's trio: by the lighthouse (B4d), then at the meeting
export function drumDot(i: number, f: number): DotState | null {
  if (f < T.cut4d1) return null;
  if (f < T.cutB5) {
    // they light the lighthouse: gather at its foot, a spark climbs it
    const a = (TAU * i) / 3 + f * 0.02;
    const r = lerp(0.6, 0.24, smooth(range(f, T.cut4d1, T.beacon)));
    const hop = Math.max(0, Math.sin((TAU * (f - T.beacon)) / 18)) * smooth(range(f, T.beacon, T.beacon + 8));
    return {x: LH.x + Math.cos(a) * r, y: restY + 0.05 * hop, z: LH.z + Math.sin(a) * r, sx: 1, sy: 1, sz: 1, glow: 1.25, onWater: 1, local: false};
  }
  if (f < T.cutB8) return meetDot(MEET.amber, 1, i, f);
  return null;
}

// someone who looks and says no (inside the lapse, while time slows down)
export function pinkDot(i: number, f: number): DotState | null {
  const [r0, r1] = T.refuse;
  if (f < r0 - 30 || f > r1 + 40) return null;
  const L = lanternAt(f);
  const ang = 0.35;
  const far = {x: L.x + Math.cos(ang) * 5.5, z: L.z + Math.sin(ang) * 2.5};
  const near = {x: L.x + 0.62, z: L.z + 0.22};
  const inn = easeOutCubic(range(f, r0 - 30, r0 + 12));
  const out = easeInCubic(range(f, T.nod + 8, r1 + 40));
  const cx = lerp(lerp(far.x, near.x, inn), far.x + 1.5, out);
  const cz = lerp(lerp(far.z, near.z, inn), far.z - 1.2, out);
  const nod = Math.exp(-Math.pow((f - T.nod) / 4, 2));
  const off = [-0.14, 0, 0.14][i];
  return {
    x: cx + off * 0.3,
    y: restY + 0.012 * Math.sin(f * 0.1 + i) - 0.03 * nod,
    z: cz + off,
    sx: 1 + 0.12 * nod,
    sy: 1 - 0.18 * nod,
    sz: 1 + 0.12 * nod,
    glow: 1.1 * (1 - 0.35 * smooth(range(f, r1 + 10, r1 + 40))),
    onWater: 1,
    local: false,
  };
}

export function heroDot(i: number, f: number): DotState {
  if (f < T.thread - 2) return heroDotB12(i, f);
  return heroDotFilm(i, f);
}
export function trioCentre(dots: DotState[]) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const d of dots) {
    x += d.x;
    y += d.local ? d.y + HERO.y : d.y;
    z += d.z;
  }
  return {x: x / dots.length, y: y / dots.length, z: z / dots.length};
}

// ---------------------------------------------------------------- the people (warm lights in the sky)
export function personGlow(who: 'H' | 'D' | 'P', f: number) {
  const sk = skyAt(f);
  if (who === 'H') {
    let g = 0.55 * smooth(range(f, T.thread + 30, T.thread + 60)) + (f >= T.thread + 60 ? 0.45 : 0);
    if (f >= T.lapse[0] && f < T.lapse[1]) g = 0.18 + 0.82 * sk.awake;
    // "is always you": a slow warm swell
    g += 0.7 * Math.exp(-Math.pow((f - T.you) / 14, 2));
    // yes (a beat after the drummer)
    if (f >= T.hLight) g = 1.0 + 1.5 * Math.exp(-(f - T.hLight) / 10) + 0.4 * smooth(range(f, T.hLight, T.hLight + 20));
    // B8: it receives the crystal
    if (f >= T.crystalUp[1] - 4) g += 1.4 * Math.exp(-(f - T.crystalUp[1] + 4) / 14) + 0.5;
    return g;
  }
  if (who === 'D') {
    let g = f < T.cut4d1 ? 0 : 0.35 * smooth(range(f, T.cut4d1, T.cut4d1 + 20));
    if (f >= T.dLight) g = 1.0 + 1.5 * Math.exp(-(f - T.dLight) / 10) + 0.4 * smooth(range(f, T.dLight, T.dLight + 20));
    return g;
  }
  // P: awake (dusk), not interested: it dims a little when asked
  const [r0, r1] = T.refuse;
  if (f < r0 - 40 || f > r1 + 60) return 0;
  return 0.7 * smooth(range(f, r0 - 40, r0)) * (1 - smooth(range(f, r1 + 20, r1 + 60))) * (1 - 0.4 * smooth(range(f, T.askUp[1], T.askUp[1] + 6)));
}

// ---------------------------------------------------------------- threads (golden, hair-thin): anchors, visibility, pulses
export type Pulse = {u: number; w: number; i: number};
export type ThreadState = {a: V3; b: V3; I: number; grow: number; growMode: number; pulses: Pulse[]; sag: V3; width: number; color: string};
const pulseAt = (f: number, f0: number, f1: number, up: boolean, w = 0.05, i = 2.5): Pulse | null => {
  if (f < f0 || f > f1 + 6) return null;
  const u = easeInOutSine(range(f, f0, f1));
  return {u: up ? u : 1 - u, w, i: i * (1 - smooth(range(f, f1, f1 + 6)))};
};
export function threadsAt(f: number, heroC: V3, drumC: V3 | null, pinkC: V3 | null): ThreadState[] {
  const out: ThreadState[] = [];
  const H = PEOPLE.H;
  const D = PEOPLE.D;
  const P = PEOPLE.P;
  if (f >= T.thread) {
    const pulses = [
      pulseAt(f, T.thread, T.thread + 64, true, 0.06, 3),
      pulseAt(f, T.pluck, T.dLight, true, 0.04, 3),
      pulseAt(f, T.hLight, T.down[1], false, 0.06, 3),
      pulseAt(f, T.warmDown[0], T.warmDown[1], false, 0.06, 3.5),
      pulseAt(f, T.crystalUp[0], T.crystalUp[1], true, 0.05, 2.5),
    ].filter(Boolean) as Pulse[];
    const grow = smooth(range(f, T.thread, T.thread + 64));
    out.push({a: {x: heroC.x, y: heroC.y + 0.06, z: heroC.z}, b: H, I: 1, grow, growMode: 0, pulses, sag: {x: 1.5, y: 0, z: 1.0}, width: 1.7, color: '#FFD08A'});
    // the songwriter's other two AIs hang from the same light
    const oI = smooth(range(f, T.cut3b + 10, T.cut3b + 50)) * (1 - 0.65 * smooth(range(f, T.cut3c, T.cut3c + 20)));
    for (const w of OWNED) out.push({a: {x: w.x, y: w.y + 0.8 * w.scale, z: w.z}, b: H, I: oI, grow: 1, growMode: 0, pulses: [], sag: {x: 0, y: -1.2, z: 0.8}, width: 1.5, color: '#FFD08A'});
  }
  if (drumC) {
    const pulses = [pulseAt(f, T.pluck, T.dLight, true, 0.04, 3), pulseAt(f, T.hLight, T.down[1], false, 0.06, 3)].filter(Boolean) as Pulse[];
    out.push({a: {x: drumC.x, y: drumC.y + 0.06, z: drumC.z}, b: D, I: smooth(range(f, T.cut4d1, T.cut4d1 + 15)), grow: 1, growMode: 0, pulses, sag: {x: -1.2, y: 0, z: 1.0}, width: 1.7, color: '#FFC37A'});
  }
  if (pinkC) {
    const pulses = [pulseAt(f, T.askUp[0], T.askUp[1], true, 0.05, 2.5)].filter(Boolean) as Pulse[];
    const [r0, r1] = T.refuse;
    out.push({a: {x: pinkC.x, y: pinkC.y + 0.06, z: pinkC.z}, b: P, I: smooth(range(f, r0 - 30, r0)) * (1 - smooth(range(f, r1 + 10, r1 + 40))), grow: 1, growMode: 0, pulses, sag: {x: 0.8, y: 0, z: 0.8}, width: 1.5, color: '#FFD7B0'});
  }
  return out;
}
// the bridge between the two trios, and the two braided voices on it
export function bridgeAt(f: number) {
  const a = {x: MEET.teal.x + 0.1, y: restY + 0.08, z: MEET.teal.z};
  const b = {x: MEET.amber.x - 0.1, y: restY + 0.08, z: MEET.amber.z};
  const grow = smooth(range(f, T.bridge[0], T.bridge[1]));
  const I = grow * (1 - 0.6 * smooth(range(f, T.crystal, T.crystal + 30))) * (f < T.cutB8 ? 1 : 0);
  const weave = smooth(range(f, T.weave[0], T.weave[0] + 20)) * (1 - smooth(range(f, T.crystal - 10, T.crystal + 6)));
  return {a, b, I, grow, weave};
}

// ---------------------------------------------------------------- the crystal (made only after they actually play)
export function crystalAt(f: number) {
  if (f < T.crystal - 8) return {I: 0, x: CRYSTAL0.x, y: CRYSTAL0.y, z: CRYSTAL0.z, s: 0, spin: 0};
  if (f < T.cutB8) {
    const form = easeOutBack(range(f, T.crystal - 8, T.crystal + 10), 1.4);
    const rise = easeInOutSine(range(f, T.rise[0], T.rise[1]));
    return {I: 1, x: CRYSTAL0.x, y: lerp(CRYSTAL0.y, CRYSTAL1.y, rise) + 0.02 * Math.sin(f * 0.05), z: CRYSTAL0.z, s: Math.max(0, form) * 0.6, spin: (f - T.crystal) * 0.012};
  }
  // B8: a small crystal carried home, then handed up the thread
  const d = [0, 1, 2].map((i) => heroDot(i, f));
  const c = trioCentre(d);
  const up = easeInCubic(range(f, T.crystalUp[0], T.crystalUp[1]));
  const H = PEOPLE.H;
  const base = {x: c.x, y: c.y + 0.14, z: c.z + 0.04};
  return {
    I: 1 - smooth(range(f, T.crystalUp[1] - 6, T.crystalUp[1])),
    x: lerp(base.x, H.x, up * 0.06),
    y: lerp(base.y, H.y, up * 0.06),
    z: lerp(base.z, H.z, up * 0.06),
    s: 0.3,
    spin: f * 0.02,
    warm: smooth(range(f, T.warmDown[1] - 4, T.warmDown[1] + 6)),
  };
}

// ---------------------------------------------------------------- lights on the sea: other lanterns, and the whole crowd of B7
// kind: 0 lantern (a need), 1 crystal (something that happened), 2 dot (an AI), 3 beacon (an offer), 4 bridge spark
export type WorldPoint = {x: number; y: number; z: number; kind: number; color: string; size: number; f0: number; f1: number; seed: number};
export type WorldLine = {a: number; b: number; f0: number};
const PALETTE = ['#52F0DD', '#B9A2FF', '#FFB547', '#FF8FB5', '#9EE37D', '#7FC8FF'];
export function worldPoints(): {points: WorldPoint[]; lines: WorldLine[]} {
  const R = rng(777);
  const pts: WorldPoint[] = [];
  const lines: WorldLine[] = [];
  const never = 1e9;
  // other people's lanterns that come and go through the time-lapse (they live in world time, i.e. frames of the lapse)
  for (let k = 0; k < 26; k++) {
    const ang = -0.9 + R() * 1.9;
    const d = 9 + R() * 34;
    const f0 = T.lapse[0] + 6 + R() * (T.lapse[1] - T.lapse[0] - 30);
    const life = 25 + R() * 70;
    pts.push({x: L1.x + Math.sin(ang) * d + (R() - 0.5) * 6, y: 0.07, z: L1.z - 4 + Math.cos(ang) * d * 0.6 + (R() - 0.5) * 6, kind: 0, color: R() < 0.7 ? '#FFC77D' : '#FFE0A8', size: 0.28, f0, f1: f0 + life, seed: R()});
  }
  // the lanterns the drummer's rings pass on their way (already lit when the rings come)
  for (let k = 0; k < 70; k++) {
    const u = R();
    const x = lerp(LH.x, L1.x, u) + (R() - 0.5) * 34;
    const z = lerp(LH.z, L1.z, u) + (R() - 0.5) * 30;
    if (Math.hypot(x - L1.x, z - L1.z) < 3) continue;
    pts.push({x, y: 0.07, z, kind: 0, color: '#FFC77D', size: 0.3, f0: T.lapse[1] - 40 - R() * 60, f1: never, seed: R()});
  }
  // B7: the sea fills up — communities, lanterns, lighthouses, bridges, crystals (and constellations between crystals)
  const b0 = T.crane[0] + 6;
  const b1 = T.crane[1] - 70;
  const born = (d: number) => lerp(b0, b1, clamp01(Math.pow(R(), 0.8) * 0.55 + Math.min(1, d / 230) * 0.45));
  const shapes = ['ring', 'band', 'market', 'spiral', 'flower', 'line'];
  const crystals: number[] = [];
  for (let c = 0; c < 130; c++) {
    let cx = 0;
    let cz = 0;
    let d = 0;
    do {
      const ang = R() * TAU;
      d = 7 + Math.pow(R(), 0.75) * 230;
      cx = L1.x + Math.sin(ang) * d;
      cz = L1.z + Math.cos(ang) * d;
    } while (Math.hypot(cx, cz) < 9);
    const shape = shapes[c < 6 ? c : Math.floor(R() * shapes.length)];
    const f0 = born(d);
    const col = PALETTE[Math.floor(R() * PALETTE.length)];
    const n = 6 + Math.floor(R() * 12);
    const sc = 1.2 + d * 0.016;
    const dot = (x: number, z: number, color = PALETTE[Math.floor(R() * PALETTE.length)]) => pts.push({x, y: 0.06, z, kind: 2, color, size: 0.3 * sc, f0: f0 + R() * 20, f1: never, seed: R()});
    if (shape === 'ring' || shape === 'band') {
      // a book club around a lantern; a band around a lighthouse
      for (let k = 0; k < n; k++) {
        const a = (TAU * k) / n;
        dot(cx + Math.cos(a) * 0.9 * sc, cz + Math.sin(a) * 0.9 * sc);
      }
      pts.push({x: cx, y: shape === 'band' ? 0.5 : 0.07, z: cz, kind: shape === 'band' ? 3 : 0, color: shape === 'band' ? col : '#FFC77D', size: 0.38 * sc, f0, f1: never, seed: R()});
    } else if (shape === 'market') {
      const m = 4 + Math.floor(R() * 3);
      for (let a = 0; a < m; a++)
        for (let b = 0; b < m; b++) {
          const x = cx + (a - m / 2) * 0.6 * sc;
          const z = cz + (b - m / 2) * 0.6 * sc;
          if (R() < 0.5) pts.push({x, y: 0.07, z, kind: R() < 0.5 ? 0 : 3, color: R() < 0.5 ? '#FFC77D' : PALETTE[Math.floor(R() * PALETTE.length)], size: 0.26 * sc, f0: f0 + R() * 24, f1: never, seed: R()});
          else dot(x, z);
        }
    } else if (shape === 'spiral') {
      for (let k = 0; k < n * 2; k++) {
        const a = k * 0.55;
        const r = 0.25 * sc + k * 0.09 * sc;
        dot(cx + Math.cos(a) * r, cz + Math.sin(a) * r, col);
      }
    } else if (shape === 'flower') {
      for (let p = 0; p < 6; p++)
        for (let k = 1; k <= 3; k++) {
          const a = (TAU * p) / 6 + Math.sin(k) * 0.2;
          dot(cx + Math.cos(a) * k * 0.4 * sc, cz + Math.sin(a) * k * 0.4 * sc, col);
        }
    } else {
      const a = R() * TAU;
      for (let k = 0; k < n; k++) dot(cx + Math.cos(a) * (k - n / 2) * 0.35 * sc + Math.sin(k) * 0.2, cz + Math.sin(a) * (k - n / 2) * 0.35 * sc);
    }
    // each community has made something: crystals hang over it, joined like a constellation
    const nc = 2 + Math.floor(R() * 5);
    const first = pts.length;
    for (let k = 0; k < nc; k++) {
      const a = R() * TAU;
      const r = (0.6 + R() * 2.4) * sc;
      pts.push({x: cx + Math.cos(a) * r, y: 0.9 + R() * 2.4, z: cz + Math.sin(a) * r, kind: 1, color: R() < 0.5 ? '#F4FBFF' : PALETTE[Math.floor(R() * PALETTE.length)], size: 0.6 * sc, f0: f0 + 20 + k * 12 + R() * 20, f1: never, seed: R()});
      crystals.push(pts.length - 1);
      if (k > 0) lines.push({a: first + k - 1, b: first + k, f0: f0 + 20 + k * 12 + 14});
    }
  }
  // scattered needs and offers, bridges between them, lone crystals
  for (let k = 0; k < 2400; k++) {
    const ang = R() * TAU;
    const d = 5 + Math.pow(R(), 0.7) * 260;
    const x = L1.x + Math.sin(ang) * d;
    const z = L1.z + Math.cos(ang) * d;
    if (Math.hypot(x, z) < 6) continue;
    const r = R();
    const f0 = born(d);
    if (r < 0.5) pts.push({x, y: 0.07, z, kind: 0, color: R() < 0.8 ? '#FFC77D' : '#FFE4B0', size: 0.45 + d * 0.008, f0, f1: never, seed: R()});
    else if (r < 0.68) pts.push({x, y: 0.4, z, kind: 3, color: PALETTE[Math.floor(R() * PALETTE.length)], size: 0.5 + d * 0.008, f0, f1: never, seed: R()});
    else if (r < 0.84) {
      // a bridge: an arc of sparks between two points
      const a2 = R() * TAU;
      const len = 1.2 + R() * 3;
      const x2 = x + Math.cos(a2) * len;
      const z2 = z + Math.sin(a2) * len;
      for (let s = 0; s <= 10; s++) {
        const u = s / 10;
        pts.push({x: lerp(x, x2, u), y: 0.1 + Math.sin(Math.PI * u) * len * 0.22, z: lerp(z, z2, u), kind: 4, color: '#FFF1D2', size: 0.18 + d * 0.004, f0: f0 + u * 10, f1: never, seed: R()});
      }
    } else {
      pts.push({x, y: 0.9 + R() * 2.2, z, kind: 1, color: R() < 0.6 ? '#F4FBFF' : PALETTE[Math.floor(R() * PALETTE.length)], size: 0.6 + d * 0.01, f0: f0 + 10, f1: never, seed: R()});
      // join to the nearest earlier crystal if close
      let best = -1;
      let bd = 1e9;
      for (const ci of crystals.slice(-40)) {
        const p = pts[ci];
        const dd = Math.hypot(p.x - x, p.z - z);
        if (dd < bd) {
          bd = dd;
          best = ci;
        }
      }
      crystals.push(pts.length - 1);
      if (best >= 0 && bd < 18) lines.push({a: best, b: pts.length - 1, f0: f0 + 24});
    }
  }
  return {points: pts, lines};
}

// rhythm rings on the water: [x, z, first beat (s), period (s)] — the drummer's lighthouse, then a few bands in B7
export function ringSources() {
  return [
    {x: LH.x, z: LH.z, t0: RING_T0, period: RING.period, n: RING.n, I: 1, end: T.cutB5 / FPS},
    {x: 0, z: 0, t0: 1e9, period: 1, n: 0, I: 0, end: 0},
    {x: 0, z: 0, t0: 1e9, period: 1, n: 0, I: 0, end: 0},
    {x: 0, z: 0, t0: 1e9, period: 1, n: 0, I: 0, end: 0},
  ];
}

// ---------------------------------------------------------------- ripples (water shader + sound), film version
export function ripplesFilm(): Ripple[] {
  const out = ripples();
  out.push({x: -0.25, z: 1.85, f: T.launch[1] - 6, amp: 0.7}); // the lantern is set on the water
  for (let i = 0; i < 3; i++) out.push({x: MEET.teal.x + TRIO[i].x, z: MEET.teal.z, f: T.arrive[1] + i * 2, amp: 0.4});
  out.push({x: L1.x, z: L1.z, f: T.flare, amp: 1.2}); // the flare
  return out;
}

// ---------------------------------------------------------------- camera (all shots)
export function cameraAt(f: number): CamState {
  if (f < T.cutC) return cameraB12(f);
  if (f < T.cut3a) {
    // Shot C holds while the golden thread appears and its pulse climbs out of frame
    return cameraB12(Math.min(f, 600));
  }
  if (f < T.cut3b) {
    // worm's-eye: from just behind the dots, straight up the thread toward the warm light
    const c = trioCentre([0, 1, 2].map((k) => heroDot(k, f)));
    const H = PEOPLE.H;
    const dir = norm({x: H.x - c.x, y: H.y - c.y, z: H.z - c.z});
    const u = range(f, T.cut3a, T.cut3b);
    return {px: c.x + 0.32 - dir.x * 1.1, py: Math.max(0.1, c.y + 0.05), pz: c.z - dir.z * 1.15, tx: c.x + dir.x * 12, ty: c.y + dir.y * 12 + lerp(-2.2, 0.6, u), tz: c.z + dir.z * 12, ap: 0.006, fov: 44};
  }
  if (f < T.cut3c) {
    // from far behind and below: the warm light holds three threads — this AI and the songwriter's two others
    const u = easeInOutSine(range(f, T.cut3b, T.cut3c));
    return {px: lerp(3, -1, u), py: lerp(10.5, 12, u), pz: lerp(-31, -28, u), tx: lerp(0, -1, u), ty: lerp(6.5, 7.8, u), tz: lerp(30, 32, u), ap: 0, fov: 40};
  }
  if (f < T.cut4b) {
    // inside the window, among the owner's private things; the half melody lifts off its card
    const u = easeInOutSine(range(f, T.cut3c, T.cut4b));
    return {px: lerp(0.0, 0.26, u), py: HERO.y + lerp(0.1, -0.02, u), pz: lerp(0.165, 0.15, u), tx: lerp(-0.3, 0.42, u), ty: HERO.y + lerp(0.16, -0.12, u), tz: -0.094, ap: 0.0018, fov: 64};
  }
  if (f < T.lapse[0]) {
    // outside, close and shallow: the ribbon reaches the dots, becomes a lantern, goes onto the water
    const u = easeInOutSine(range(f, T.cut4b, T.lapse[0]));
    const fol = easeInOutSine(range(f, T.launch[0] - 6, T.lapse[0]));
    return {
      px: lerp(0.95, 0.85, u) - 0.5 * fol,
      py: lerp(0.2, 0.22, u),
      pz: lerp(2.45, 2.35, u) + 0.3 * fol,
      tx: lerp(0.0, -0.1, u) - 0.35 * fol,
      ty: lerp(0.26, 0.22, u) - 0.1 * fol,
      tz: lerp(1.15, 1.25, u) + 0.7 * fol,
      ap: 0.026,
      fov: 28,
    };
  }
  if (f < T.cut4d1) {
    // the time-lapse: low beside the window, out over the open sea; the lantern drifts away while days go by
    const u = range(f, T.lapse[0], T.cut4d1);
    return {px: lerp(-2.6, -2.7, u), py: lerp(0.62, 0.66, u), pz: lerp(0.1, 0.0, u), tx: -1.5, ty: 2.4, tz: 12, ap: 0.003, fov: 30};
  }
  if (f < T.cut4d2) {
    // the drummer's round window: its dots light a small lighthouse
    const u = easeInOutSine(range(f, T.cut4d1, T.cut4d2));
    const fx = Math.sin(RW.yaw);
    const fz = Math.cos(RW.yaw);
    return {px: RW.x + fx * 6.2 + 2.2 - 0.4 * u, py: 0.75 + 0.1 * u, pz: RW.z + fz * 6.2 - 0.3 * u, tx: LH.x - 0.6, ty: 0.85, tz: LH.z, ap: 0.006, fov: 34};
  }
  if (f < T.cut4d3) {
    // high above: the rings cross the sea past many lanterns, and reach this one
    const u = easeInOutSine(range(f, T.cut4d2, T.cut4d3));
    const dx = L1.x - LH.x;
    const dz = L1.z - LH.z;
    const l = Math.hypot(dx, dz);
    const bx = L1.x + (dx / l) * 12;
    const bz = L1.z + (dz / l) * 12;
    return {px: bx + 2, py: lerp(27, 25, u), pz: bz, tx: lerp(L1.x, LH.x, 0.32), ty: 0, tz: lerp(L1.z, LH.z, 0.32), ap: 0, fov: 46};
  }
  if (f < T.cutB5) {
    // inside the window again, at night: the lantern has flared far out; they wake and rush out of the door
    const u = range(f, T.cut4d3, T.cutB5);
    return {px: 0.03, py: HERO.y - 0.4, pz: lerp(-1.4, -1.28, u), tx: 0, ty: HERO.y + doorCentreY() + 0.02, tz: HERO.depth / 2, ap: 0.004, fov: 35};
  }
  if (f < T.cutB6) {
    // B5: a two-shot at the waterline; tilt up the threads to the two lights, and back down to the bridge
    const up = easeInOutSine(range(f, T.pluck + 4, T.dLight + 8));
    const down = easeInOutSine(range(f, T.hLight + 6, T.bridge[0] + 12));
    const t = up * (1 - down);
    const base = {x: L1.x, y: 0.2, z: L1.z + 0.38};
    const sky = {x: (PEOPLE.H.x + PEOPLE.D.x) / 2, y: (PEOPLE.H.y + PEOPLE.D.y) / 2, z: (PEOPLE.H.z + PEOPLE.D.z) / 2};
    const k = range(f, T.cutB5, T.cutB6);
    return {px: L1.x - 0.15 + 0.1 * k, py: 0.19 + 0.25 * t, pz: L1.z - 2.85 + 0.3 * k - 0.6 * t, tx: lerp(base.x, sky.x, t * 0.92), ty: lerp(base.y, sky.y, t * 0.92), tz: lerp(base.z, sky.z, t * 0.92), ap: 0.01 * (1 - t), fov: 36};
  }
  if (f < T.crane[0]) {
    // B6: a slow orbit with a slow push-in as the crystal forms and rises
    const u = range(f, T.cutB6, T.crane[0]);
    const a = lerp(0.12, 1.25, easeInOutSine(u));
    const r = lerp(3.5, 2.6, easeInOutSine(u));
    const c = crystalAt(f);
    const ty = lerp(0.3, c.I > 0 ? c.y * 0.7 + 0.1 : 0.3, smooth(range(f, T.crystal - 10, T.rise[1])));
    return {px: L1.x + Math.sin(a) * r, py: 0.32 + 0.35 * easeInOutSine(u), pz: L1.z + 0.38 - Math.cos(a) * r, tx: L1.x, ty, tz: L1.z + 0.38, ap: 0.012, fov: 34};
  }
  if (f < T.cutB8) {
    // B7: one long crane, from the crystal to high above the sea
    const u = range(f, T.crane[0], T.crane[1]);
    const e = easeInOutCubic(u);
    const r = Math.exp(lerp(Math.log(2.6), Math.log(160), e));
    const el = lerp(-0.099, 0.2, easeInOutSine(u)) + 0.35 * Math.sin(Math.PI * smooth(u));
    const az = lerp(1.25, 0.9, e);
    const tx = lerp(CRYSTAL1.x, L1.x - 25, e);
    const ty = lerp(0.926, 0, e);
    const tz = lerp(CRYSTAL1.z, L1.z + 45, e);
    return {px: tx + r * Math.sin(az) * Math.cos(el), py: ty + r * Math.sin(el), pz: tz - r * Math.cos(az) * Math.cos(el), tx, ty, tz, ap: 0, fov: 40};
  }
  // B8: the window again, this time with its door open; then up the thread to the warm light (title in clear sky)
  const u = easeInOutCubic(range(f, T.pullHome[0], T.pullHome[1]));
  const up = smooth(range(u, 0, 0.55));
  const H = PEOPLE.H;
  const c0 = {x: 0.25, y: 0.76, z: 4.6};
  const c1 = {x: H.x + 5.5, y: H.y - 6.5, z: H.z - 20};
  const t0 = {x: 0, y: 0.68, z: 0.4};
  const t1 = {x: H.x + 0.4, y: H.y - 2.4, z: H.z};
  const hold = range(f, T.cutB8, T.pullHome[0]);
  const side = smooth(range(u, 0.25, 1));
  const drift = range(f, T.pullHome[1], FILM_FRAMES);
  return {
    px: lerp(c0.x - 0.05 * hold, c1.x, side) - 0.4 * drift,
    py: lerp(c0.y, c1.y, smooth(range(u, 0, 0.8))) + 0.5 * drift,
    pz: lerp(c0.z - 0.2 * hold, c1.z, side) + 1.6 * drift,
    tx: lerp(t0.x, t1.x, side),
    ty: lerp(t0.y, t1.y, up),
    tz: lerp(t0.z, t1.z, side),
    ap: 0.008 * (1 - u),
    fov: lerp(30, 34, u),
  };
}

// sub-frame samples: more for lens blur, fast moves and the time-lapse star trails
export function samplesAt(f: number) {
  if (f < T.pull[0] + 30) return 24;
  if (f < T.cutB) return 16;
  if (f < T.cutC) return 20;
  if (f >= T.lapse[0] && f < T.cut4d1) return 20;
  if (f >= T.cut4d3 && f < T.cutB5) return 16;
  if (f >= T.cut3c && f < T.cut4b) return 20;
  if (f >= T.crane[0] && f < T.cutB8) return 14;
  return 14;
}

// ---------------------------------------------------------------- narration (Edge TTS, en-US-AndrewNeural −12 %)
// src = [in, out] seconds inside the clip file, speech = onset offset inside that segment, at = onset in the film
export const VO = [
  {id: 's1a', file: 'vo-b1-andrew12', src: [0.05, 3.3], speech: 0.12, dur: 2.95, at: 1.0, text: 'Today, every AI lives in its own window.'},
  {id: 's1b', file: 'vo-b1-andrew12', src: [3.45, 5.2], speech: 0.12, dur: 1.32, at: 4.55, text: 'It can answer almost anything.'},
  {id: 's1c', file: 'vo-b1-andrew12', src: [5.3, 7.25], speech: 0.11, dur: 1.44, at: 6.95, text: "It just can't reach outside."},
  {id: 's2a', file: 'vo-b2-andrew12', src: [0.05, 2.4], speech: 0.11, dur: 1.98, at: 11.75, text: 'What if there were an open world outside?'},
  {id: 's2b', file: 'vo-b2-andrew12', src: [2.52, 4.4], speech: 0.12, dur: 1.5, at: 15.25, text: 'Any AI could walk in —'},
  {id: 's2c', file: 'vo-b2-andrew12', src: [4.46, 5.6], speech: 0.12, dur: 0.76, at: 17.05, text: 'whoever made it,'},
  {id: 's2d', file: 'vo-b2-andrew12', src: [5.66, 7.22], speech: 0.08, dur: 1.09, at: 18.1, text: 'whatever it runs on.'},
  {id: 's3a', file: 'vo-b3-andrew12', src: [0.04, 1.86], speech: 0.12, dur: 1.48, at: 20.0, text: 'Your AI can go anywhere.'},
  {id: 's3b', file: 'vo-b3-andrew12', src: [2.0, 3.52], speech: 0.13, dur: 1.28, at: 22.7, text: 'But the other end of the thread'},
  {id: 's3c', file: 'vo-b3-andrew12', src: [3.55, 4.9], speech: 0.11, dur: 0.88, at: 24.3, text: 'is always you.'},
  {id: 's4a', file: 'vo-b4-andrew12', src: [0.05, 2.9], speech: 0.12, dur: 2.49, at: 28.2, text: "Say you've written half a song and need a drummer."},
  {id: 's4b', file: 'vo-b4-andrew12', src: [3.0, 6.5], speech: 0.16, dur: 3.11, at: 34.0, text: 'Usually, that request ends when the chat does.'},
  {id: 's4c', file: 'vo-b4-andrew12', src: [6.62, 10.2], speech: 0.19, dur: 3.14, at: 37.7, text: 'Here, it stays lit until the right person turns up —'},
  {id: 's4d', file: 'vo-b4-andrew12', src: [10.32, 11.33], speech: 0.14, dur: 0.73, at: 41.2, text: 'a week later,'},
  {id: 's4e', file: 'vo-b4-andrew12', src: [11.36, 12.89], speech: 0.12, dur: 1.02, at: 42.25, text: 'on another platform.'},
  {id: 's5', file: 'vo-b5-andrew12', src: [0.05, 2.81], speech: 0.12, dur: 2.22, at: 50.6, text: 'They only meet when you both say yes.'},
  {id: 's6a', file: 'vo-b6-andrew12', src: [0.05, 2.0], speech: 0.13, dur: 1.61, at: 57.6, text: "What's left isn't another reply."},
  {id: 's6b', file: 'vo-b6-andrew12', src: [2.08, 4.18], speech: 0.16, dur: 1.52, at: 59.4, text: "It's something that actually happened."},
  {id: 's7a', file: 'vo-b7-andrew12', src: [0.05, 2.66], speech: 0.12, dur: 2.22, at: 61.6, text: "This world isn't built for any one thing."},
  {id: 's7b', file: 'vo-b7-andrew12', src: [2.78, 5.8], speech: 0.16, dur: 2.64, at: 64.3, text: 'Bands, book clubs, businesses —'},
  {id: 's7c', file: 'vo-b7-andrew12', src: [5.86, 8.05], speech: 0.15, dur: 1.81, at: 67.3, text: 'even things with no name yet —'},
  {id: 's7d', file: 'vo-b7-andrew12', src: [8.12, 9.79], speech: 0.15, dur: 1.09, at: 69.5, text: 'grow here on their own.'},
  {id: 's8a', file: 'vo-b8-andrew12', src: [0.05, 1.56], speech: 0.17, dur: 1.18, at: 75.95, text: 'From “I wish”…'},
  {id: 's8b', file: 'vo-b8-andrew12', src: [1.6, 2.9], speech: 0.11, dur: 0.73, at: 77.85, text: 'to “we made it.”'},
];
// subtitle cards (frames)
export const SUBS = [
  {text: 'Today, every AI lives in its own window.', a: 's1a', b: 's1a'},
  {text: 'It can answer almost anything.', a: 's1b', b: 's1b'},
  {text: "It just can't reach outside.", a: 's1c', b: 's1c'},
  {text: 'What if there were an open world outside?', a: 's2a', b: 's2a'},
  {text: 'Any AI could walk in —', a: 's2b', b: 's2b'},
  {text: 'whoever made it, whatever it runs on.', a: 's2c', b: 's2d'},
  {text: 'Your AI can go anywhere.', a: 's3a', b: 's3a'},
  {text: 'But the other end of the thread is always you.', a: 's3b', b: 's3c'},
  {text: "Say you've written half a song and need a drummer.", a: 's4a', b: 's4a'},
  {text: 'Usually, that request ends when the chat does.', a: 's4b', b: 's4b'},
  {text: 'Here, it stays lit until the right person turns up —', a: 's4c', b: 's4c'},
  {text: 'a week later, on another platform.', a: 's4d', b: 's4e'},
  {text: 'They only meet when you both say yes.', a: 's5', b: 's5'},
  {text: "What's left isn't another reply.", a: 's6a', b: 's6a'},
  {text: "It's something that actually happened.", a: 's6b', b: 's6b'},
  {text: "This world isn't built for any one thing.", a: 's7a', b: 's7a'},
  {text: 'Bands, book clubs, businesses —', a: 's7b', b: 's7b'},
  {text: 'even things with no name yet —', a: 's7c', b: 's7c'},
  {text: 'grow here on their own.', a: 's7d', b: 's7d'},
  {text: 'From “I wish”… to “we made it.”', a: 's8a', b: 's8b'},
].map((c) => {
  const A = VO.find((v) => v.id === c.a)!;
  const B = VO.find((v) => v.id === c.b)!;
  return {text: c.text, from: Math.round(A.at * FPS) - 3, to: Math.round((B.at + B.dur) * FPS) + 6};
});
export const TITLE = {in: T.title, out: T.titleOut, mark: T.mark, base: T.base, tagline: T.tagline, fade: T.fadeOut[0]};

// ---------------------------------------------------------------- everything the sound design needs (seconds)
export function soundEvents() {
  const sec = (f: number) => f / FPS;
  const lineDone: number[] = [];
  let prev = Math.floor(linesWritten(0));
  for (let f = 1; f < T.typingEnd + 8; f++) {
    const n = Math.floor(linesWritten(f));
    if (n > prev) lineDone.push(sec(f));
    prev = n;
  }
  const contacts = T.press.map((p, i) => ({t: sec(p + T.pressDur * 0.55), x: DOT_X[i]}));
  const hops = T.hops.map((h, i) => ({t: sec(h), x: DOT_X[i]}));
  const rip = ripplesFilm().map((r) => ({t: sec(r.f), x: r.x, z: r.z, amp: r.amp}));
  const feats = FEATURED.map((w) => ({kind: w.kind, x: w.x, z: w.z, seam: sec(w.seam), door: [sec(w.door[0]), sec(w.door[1])], out: w.out.map(sec)}));
  const T0 = {} as Record<string, number | number[]>;
  for (const [k, v] of Object.entries(T)) T0[k] = Array.isArray(v) ? v.map(sec) : sec(v as number);
  const wp = worldPoints().points;
  const crystalsB7 = wp.filter((p) => p.kind === 1 && p.f0 < 1e8).map((p) => sec(p.f0)).sort((a, b) => a - b);
  const lanternsLapse = wp.filter((p) => p.kind === 0 && p.f0 >= T.lapse[0] && p.f0 < T.lapse[1] - 100).map((p) => sec(p.f0));
  return {
    dur: FILM_FRAMES / FPS,
    T: T0,
    typingEnd: sec(T.typingEnd),
    lineDone,
    contacts,
    pull: [sec(T.pull[0]), sec(T.pull[1])],
    cutB: sec(T.cutB),
    cutC: sec(T.cutC),
    seam: sec(T.seam),
    door: [sec(T.door[0]), sec(T.door[1])],
    reveal: [sec(T.reveal[0]), sec(T.reveal[1])],
    peek: [sec(T.peek[0]), sec(T.peek[1])],
    hops,
    ripples: rip,
    feats,
    rings: ringSources(),
    hums: HUMS,
    phrase: PHRASE,
    crystalsB7,
    lanternsLapse,
    dayAt: (t: number) => skyAt(Math.round(t * FPS)),
    fadeOut: [sec(T.fadeOut[0]), sec(T.fadeOut[1])],
    vo: VO,
  };
}
