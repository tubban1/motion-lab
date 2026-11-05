// Shared, deterministic layout + timeline for the visual-first Vibe Monitor sample.
// Imported by the Remotion scene (cityEngine.ts) AND by the Node sound-design script, so picture and sound share one clock.
// Keep this file free of non-erasable TS syntax (no enums/namespaces) so `node` can strip types and import it directly.

export const FPS = 30;
export const SAMPLE_FRAMES = 360;

// Frame timeline (30fps). VO phrase windows were measured from the Edge TTS waveforms (pauses at 1.53/1.79s, 2.87/3.08s, 1.54/1.87s).
export const T = {
  vo2: 15, // vo-02 file start: 功能一层层叠上去 / 依赖越缠越紧 / 直到没人敢改
  p1: [22, 61] as [number, number],
  p2: [69, 101] as [number, number],
  p3: [107, 139] as [number, number],
  pulses: [105, 120, 135], // core heartbeat, 120 BPM grid
  freeze: 150, // world time stops: bullet-time orbit
  impact: 180, // scan wave leaves the core
  scanDur: 26,
  vo3: 200, // vo-03 file start: Vibe Monitor 1.0 (f206-246) / AI 编程时代的本地架构顾问 (f256-321)
  craneStart: 186,
  craneEnd: 250,
  title: 234,
  tagline: 256,
  pings: [240, 262],
  glint: [292, 340] as [number, number],
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

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

// World time for the city's own animation; it stops during the bullet-time beat.
export const worldTime = (f: number) => Math.min(Math.max(f, 0), T.freeze);
export const particleTime = (f: number) => (f < T.freeze ? f : f < T.impact ? T.freeze : f - (T.impact - T.freeze));

export type Slot = {x: number; z: number; yaw: number; w: number; d: number; h: number; accent: boolean; hub: boolean};
export type Building = {
  id: number;
  core: boolean;
  x: number;
  z: number;
  w: number;
  d: number;
  yaw: number;
  floors: number;
  floorH: number;
  growStart: number;
  interval: number;
  dist: number;
  slot: Slot;
  scanPass: number;
  moveStart: number;
  moveDur: number;
  infectedAt: number;
};
export type Arc = {a: number; b: number; spawn: number; red: boolean; lift: number; phase: number; pass: number; core: boolean};

export const DROP_FRAMES = 9;
export const DROP_HEIGHT = 4.2;
export const ARC_SEG = 28;
export const RMAX = 19;
const DEG = Math.PI / 180;

export const waveRadius = (f: number) => RMAX * easeOutCubic(range(f, T.impact, T.impact + T.scanDur));
export const wavePass = (d: number) => T.impact + (1 - Math.cbrt(Math.max(0, 1 - Math.min(d, RMAX) / RMAX))) * T.scanDur;

// ---- the V (logo) the city resolves into: vertex at +z (screen bottom in the final top-down shot) ----
export const V0 = {x: 0, z: 6.3};
export const ARM_S0 = 3.0;
export const ARM_PITCH = 1.3;
export const ARM_ROWS = 9;
export const ARM_COL = 0.66;
export const armDir = (side: number) => ({x: side * Math.sin(30 * DEG), z: -Math.cos(30 * DEG)});
export const armPerp = (side: number) => ({x: -side * Math.cos(30 * DEG), z: -Math.sin(30 * DEG)}); // points into the V

function makeSlots(r: () => number): Slot[] {
  const slots: Slot[] = [];
  for (const side of [-1, 1]) {
    const dir = armDir(side);
    const perp = armPerp(side);
    const yaw = Math.atan2(dir.x, dir.z);
    for (let j = 0; j < ARM_ROWS; j++) {
      const s = ARM_S0 + j * ARM_PITCH;
      for (const c of [-ARM_COL, ARM_COL]) {
        slots.push({
          x: V0.x + dir.x * s + perp.x * c,
          z: V0.z + dir.z * s + perp.z * c,
          yaw,
          w: 1.15,
          d: 1.1,
          h: 2.3 - j * 0.1 + r() * 0.45,
          accent: side === -1 && c > 0,
          hub: false,
        });
      }
    }
  }
  return slots;
}
export const HUB: Slot = {x: 0, z: V0.z - 1.379, yaw: Math.PI / 4, w: 1.95, d: 1.95, h: 2.9, accent: false, hub: true};

function makeCity(): {buildings: Building[]; arcs: Arc[]} {
  const r = rng(20261104);
  const cells: {x: number; z: number; k: number}[] = [];
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      if (i === 0 && j === 0) continue;
      const x = i * 3.0 + (r() - 0.5) * 0.8;
      const z = j * 3.0 + (r() - 0.5) * 0.8;
      cells.push({x, z, k: Math.hypot(x, z) + r() * 2.2});
    }
  }
  cells.sort((p, q) => p.k - q.k);
  const picked = cells.slice(0, 36);
  const slots = makeSlots(r);

  // Pair chaos positions with V slots by angle (best cyclic offset) so flight paths stay short and don't cross.
  const bOrder = picked.map((c, i) => ({i, a: Math.atan2(c.z, c.x)})).sort((p, q) => p.a - q.a);
  const sOrder = slots.map((s, i) => ({i, a: Math.atan2(s.z, s.x)})).sort((p, q) => p.a - q.a);
  let best = 0;
  let bestCost = Infinity;
  for (let off = 0; off < 36; off++) {
    let cost = 0;
    for (let k = 0; k < 36; k++) {
      const c = picked[bOrder[k].i];
      const s = slots[sOrder[(k + off) % 36].i];
      cost += Math.hypot(c.x - s.x, c.z - s.z);
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = off;
    }
  }

  const buildings: Building[] = [
    {
      id: 0, core: true, x: 0, z: 0, w: 2.0, d: 2.0, yaw: 0.12, floors: 15, floorH: 0.48, growStart: 6, interval: 2.1, dist: 0,
      slot: HUB, scanPass: T.impact, moveStart: T.impact + 6, moveDur: 44, infectedAt: Infinity,
    },
  ];
  for (let k = 0; k < 36; k++) {
    const c = picked[bOrder[k].i];
    const dist = Math.hypot(c.x, c.z);
    const scanPass = wavePass(dist);
    buildings.push({
      id: k + 1,
      core: false,
      x: c.x,
      z: c.z,
      w: 0.95 + r() * 0.55,
      d: 0.95 + r() * 0.55,
      yaw: (r() - 0.5) * 0.9,
      floors: Math.round(3 + r() * 6 + Math.max(0, 1 - dist / 14) * 4),
      floorH: 0.44 + r() * 0.1,
      growStart: 10 + dist * 3.0 + r() * 9,
      interval: 1.8 + r() * 1.0,
      dist,
      slot: slots[sOrder[(k + best) % 36].i],
      scanPass,
      moveStart: scanPass + 4 + r() * 5,
      moveDur: 36 + r() * 10,
      infectedAt: Infinity,
    });
  }

  const arcs: Arc[] = [];
  const ar = rng(77);
  const N = 66;
  for (let n = 0; n < N; n++) {
    const red = n >= 18;
    const spawn = red ? 88 + 57 * Math.pow((n - 18) / (N - 19), 0.75) : 60 + 30 * (n / 17);
    const toCore = n % 4 === 3 || (red && n % 5 === 0);
    let a = toCore ? 0 : 1 + Math.floor(ar() * 36);
    let b = 0;
    for (let tries = 0; tries < 200; tries++) {
      b = 1 + Math.floor(ar() * 36);
      const A = buildings[a];
      const B = buildings[b];
      const ok = b !== a && Math.hypot(A.x - B.x, A.z - B.z) > 3.5 && A.growStart + DROP_FRAMES < spawn && B.growStart + DROP_FRAMES < spawn;
      if (ok) break;
      if (tries === 199) a = 0;
    }
    const A = buildings[a];
    const B = buildings[b];
    const dist = Math.hypot(A.x - B.x, A.z - B.z);
    const mid = Math.hypot((A.x + B.x) / 2, (A.z + B.z) / 2);
    arcs.push({a, b, spawn, red, lift: 1.4 + dist * 0.28 + ar() * 1.4, phase: ar(), pass: wavePass(mid), core: a === 0 || b === 0});
    if (red) {
      for (const id of [a, b]) buildings[id].infectedAt = Math.min(buildings[id].infectedAt, spawn + 10);
    }
  }
  return {buildings, arcs};
}

const CITY = makeCity();
export const BUILDINGS = CITY.buildings;
export const ARCS = CITY.arcs;
export const FLOORS: {b: number; k: number}[] = BUILDINGS.flatMap((b) => Array.from({length: b.floors}, (_, k) => ({b: b.id, k})));

export const floorLandFrame = (b: Building, k: number) => b.growStart + k * b.interval + DROP_FRAMES;
export const floorsLanded = (b: Building, f: number) => {
  const wt = worldTime(f);
  let n = 0;
  for (let k = 0; k < b.floors; k++) if (floorLandFrame(b, k) <= wt) n++;
  return n;
};

const nearestYaw = (a: number, target: number, period: number) => target + period * Math.round((a - target) / period);

export type FloorState = {visible: boolean; x: number; y: number; z: number; w: number; h: number; d: number; yaw: number; move: number};

export function floorState(b: Building, k: number, f: number, out: FloorState): FloorState {
  const wt = worldTime(f);
  const land = floorLandFrame(b, k);
  const dropStart = land - DROP_FRAMES;
  if (wt < dropStart) {
    out.visible = false;
    return out;
  }
  out.visible = true;
  const m = clamp01((f - b.moveStart - k * 0.5) / b.moveDur);
  const e = easeInOutCubic(m);
  const fh = lerp(b.floorH, b.slot.h / b.floors, e);
  let drop = 0;
  let bump = 0;
  if (wt < land) {
    const u = (wt - dropStart) / DROP_FRAMES;
    drop = DROP_HEIGHT * (1 - u * u);
  } else {
    bump = Math.exp(-(wt - land) * 0.85);
  }
  const trem = b.core ? 0.035 * smooth(range(wt, 100, 140)) * (1 - range(f, T.impact, T.impact + 8)) : 0;
  out.h = fh * (1 - 0.22 * bump);
  out.y = k * fh + out.h / 2 + drop + Math.sin(Math.PI * m) * 2.3;
  out.x = lerp(b.x, b.slot.x, e) + trem * Math.sin(wt * 2.7 + k);
  out.z = lerp(b.z, b.slot.z, e) + trem * Math.cos(wt * 3.1 + k * 1.3);
  out.yaw = lerp(b.yaw, nearestYaw(b.yaw, b.slot.yaw, b.slot.hub ? Math.PI / 2 : Math.PI), e);
  out.w = lerp(b.w, b.slot.w, e) * (1 + 0.07 * bump);
  out.d = lerp(b.d, b.slot.d, e) * (1 + 0.07 * bump);
  out.move = m;
  return out;
}

export const buildingTop = (b: Building, f: number) => floorsLanded(b, f) * b.floorH;

export const corePulse = (f: number) => {
  const wt = worldTime(f);
  let p = 0;
  for (const t of T.pulses) if (wt >= t) p += Math.exp(-(wt - t) / 5);
  return p;
};

export function danger(b: Building, f: number) {
  const wt = worldTime(f);
  let d = Number.isFinite(b.infectedAt) ? smooth(range(wt, b.infectedAt, b.infectedAt + 10)) : 0;
  if (b.core) d = Math.max(d, smooth(range(wt, 96, 132)));
  return d * (1 - smooth(range(f, b.scanPass, b.scanPass + 6)));
}
export const scanFlash = (b: Building, f: number) => (f >= b.scanPass ? Math.exp(-(f - b.scanPass) / 3.5) : 0);
export const settled = (b: Building, f: number) => smooth(range(f, b.moveStart + b.moveDur - 6, b.moveStart + b.moveDur + 12));

export type CamState = {px: number; py: number; pz: number; tx: number; ty: number; tz: number};
export function cameraAt(f: number): CamState {
  let phi: number;
  let theta: number;
  let r: number;
  let ty: number;
  let tz = 0;
  if (f < T.freeze) {
    const u = range(f, 0, T.freeze);
    phi = lerp(38, 16, easeInOutSine(u));
    theta = lerp(76, 70, u);
    r = lerp(42, 23.5, Math.pow(u, 1.25));
    ty = lerp(1.4, 2.8, smooth(u));
  } else if (f < T.impact) {
    const u = easeInOutSine(range(f, T.freeze, T.impact));
    phi = lerp(16, 3, u);
    theta = lerp(70, 69, u);
    r = lerp(23.5, 22.5, u);
    ty = 2.8;
  } else if (f < T.craneStart) {
    const u = easeOutCubic(range(f, T.impact, T.craneStart));
    phi = 3;
    theta = 69;
    r = lerp(22.5, 23.2, u);
    ty = 2.8;
  } else if (f < T.craneEnd) {
    const u = easeInOutCubic(range(f, T.craneStart, T.craneEnd));
    phi = lerp(3, 0, u);
    theta = lerp(69, 0.5, u);
    r = lerp(23.2, 52, u);
    ty = lerp(2.8, 0, u);
    tz = lerp(0, 3.0, u);
  } else {
    const u = Math.sin((range(f, T.craneEnd, SAMPLE_FRAMES) * Math.PI) / 2);
    phi = lerp(0, -0.8, u);
    theta = 0.5;
    r = lerp(52, 49.5, u);
    ty = 0;
    tz = 3.0;
  }
  // handheld tension in phase 3 (frozen + eased out during bullet time), plus an impact kick
  const wt = Math.min(f, T.freeze);
  const amp = 0.12 * smooth(range(wt, 96, 148)) * (1 - smooth(range(f, T.freeze, T.freeze + 15)));
  const kick = f >= T.impact ? 0.22 * Math.exp(-(f - T.impact) / 3.5) : 0;
  const sx = amp * (Math.sin(wt * 1.9) + 0.6 * Math.sin(wt * 4.3 + 1.1)) + kick * Math.sin(f * 7.1);
  const sy = amp * 0.7 * (Math.sin(wt * 2.6 + 0.4) + 0.5 * Math.sin(wt * 5.1)) + kick * 0.8 * Math.sin(f * 8.3 + 0.5);
  const st = Math.sin(theta * DEG);
  const ct = Math.cos(theta * DEG);
  return {px: r * st * Math.sin(phi * DEG) + sx, py: ty + r * ct + sy, pz: tz + r * st * Math.cos(phi * DEG), tx: 0, ty, tz};
}

// Everything the sound design needs, in frames.
export function soundEvents() {
  const landings: {f: number; x: number; core: boolean; k: number}[] = [];
  for (const b of BUILDINGS) for (let k = 0; k < b.floors; k++) landings.push({f: floorLandFrame(b, k), x: b.x, core: b.core, k});
  landings.sort((p, q) => p.f - q.f);
  const arcs = ARCS.map((a) => ({f: a.spawn, x: (BUILDINGS[a.a].x + BUILDINGS[a.b].x) / 2, red: a.red})).sort((p, q) => p.f - q.f);
  const moves = BUILDINGS.map((b) => ({f0: b.moveStart, f1: b.moveStart + b.moveDur, x0: b.x, x1: b.slot.x, hub: b.slot.hub}));
  return {landings, arcs, moves, T, FPS, SAMPLE_FRAMES};
}
