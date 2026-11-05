// Shared, deterministic timeline + layout for the "Outside the Window" B1→B2 sample (615 frames @ 30 fps).
// Imported by the three.js engine, the Remotion component AND the Node sound script, so picture, subtitles and
// sound run on one clock. Keep this file to erasable TS only (no enums / namespaces / parameter properties, no JSON
// imports) so `node` can strip the types and import it directly.

export const FPS = 30;
export const SAMPLE_FRAMES = 615;
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
  fadeOut: [590, 615] as [number, number],
};
export const CUTS = [T.cutB, T.cutC];

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
export function heroDot(i: number, f: number): DotState {
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

export function cameraAt(f: number): CamState {
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
  const u = range(f, T.cutC, SAMPLE_FRAMES);
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

// sub-frame samples: more for the lens-blurred macro and the fast pull-back
export function samplesAt(f: number) {
  if (f < T.pull[0] + 30) return 24;
  if (f < T.cutB) return 16;
  if (f < T.cutC) return 20;
  return 16;
}

// ---------------------------------------------------------------- narration (Edge TTS, en-US-AndrewNeural −12 %)
// src = [in, out] seconds inside the clip file, speech = onset offset inside that segment, at = onset in the sample
export const VO = [
  {id: 's1a', file: 'vo-b1-andrew12', src: [0.05, 3.3], speech: 0.12, dur: 2.95, at: 1.0, text: 'Today, every AI lives in its own window.'},
  {id: 's1b', file: 'vo-b1-andrew12', src: [3.45, 5.2], speech: 0.12, dur: 1.32, at: 4.55, text: 'It can answer almost anything.'},
  {id: 's1c', file: 'vo-b1-andrew12', src: [5.3, 7.25], speech: 0.11, dur: 1.44, at: 6.95, text: "It just can't reach outside."},
  {id: 's2a', file: 'vo-b2-andrew12', src: [0.05, 2.4], speech: 0.11, dur: 1.98, at: 11.75, text: 'What if there were an open world outside?'},
  {id: 's2b', file: 'vo-b2-andrew12', src: [2.52, 4.4], speech: 0.12, dur: 1.5, at: 15.25, text: 'Any AI could walk in —'},
  {id: 's2c', file: 'vo-b2-andrew12', src: [4.46, 5.6], speech: 0.12, dur: 0.76, at: 17.05, text: 'whoever made it,'},
  {id: 's2d', file: 'vo-b2-andrew12', src: [5.66, 7.22], speech: 0.08, dur: 1.09, at: 18.1, text: 'whatever it runs on.'},
];
// subtitle cards (frames): one sentence per card, the last line split at the dash
export const SUBS = [
  {text: 'Today, every AI lives in its own window.', a: 's1a', b: 's1a'},
  {text: 'It can answer almost anything.', a: 's1b', b: 's1b'},
  {text: "It just can't reach outside.", a: 's1c', b: 's1c'},
  {text: 'What if there were an open world outside?', a: 's2a', b: 's2a'},
  {text: 'Any AI could walk in —', a: 's2b', b: 's2b'},
  {text: 'whoever made it, whatever it runs on.', a: 's2c', b: 's2d'},
].map((c) => {
  const A = VO.find((v) => v.id === c.a)!;
  const B = VO.find((v) => v.id === c.b)!;
  return {text: c.text, from: Math.round(A.at * FPS) - 3, to: Math.round((B.at + B.dur) * FPS) + 6};
});

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
  const rip = ripples().map((r) => ({t: sec(r.f), x: r.x, z: r.z, amp: r.amp}));
  const feats = FEATURED.map((w) => ({kind: w.kind, x: w.x, z: w.z, seam: sec(w.seam), door: [sec(w.door[0]), sec(w.door[1])], out: w.out.map(sec)}));
  return {
    dur: SAMPLE_FRAMES / FPS,
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
    fadeOut: [sec(T.fadeOut[0]), sec(T.fadeOut[1])],
    vo: VO,
  };
}
