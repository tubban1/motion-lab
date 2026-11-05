// Shared, deterministic layout + timeline for the full visual-first Vibe Monitor 1.0 film (62 s, 1860 frames @ 30 fps).
// Imported by the Remotion scene (filmEngine.ts, VibeMonitorVisualFilm.tsx) AND by the Node sound-design script,
// so picture, typography and sound all run on one clock.
// Keep this file free of non-erasable TS syntax (no enums/namespaces/parameter properties) and free of JSON imports,
// so `node` can strip the types and import it directly.

export const FPS = 30;
export const FILM_FRAMES = 1860;
export const O = 180; // the A/B sample's city timeline is reused from this frame on

// ---------------------------------------------------------------- timeline (absolute frames)
export const T = {
  // B1 · velocity: one caret, then a front of code that outruns the camera
  blink: 28,
  vo1: 30,
  front0: 60,
  frontTau: 18,
  // B2 · tangle (sample timeline + O)
  vo2: 195,
  pulses: [285, 300, 315],
  freeze: 330,
  impact: 360,
  scanDur: 26,
  // B3 · reveal
  craneStart: 366,
  craneEnd: 430,
  vo3: 380,
  title: 414,
  tagline: 436,
  glint: [472, 520] as [number, number],
  // B4 · session-scoped MCP
  b4: 520,
  dormant: 526,
  vo4: 540,
  mcp: 548,
  beams: [600, 632, 657],
  ignite: 672,
  sessionEnd: 702,
  exitStart: 726,
  exitEnd: 752,
  still: 761,
  // B5 · one scan, 13 monitors, quiet by default
  b5: 820,
  vo5: 840,
  scan: 847,
  rings: 875,
  evidence: 918,
  quiet: 960,
  notice: 1027,
  // B6 · real telemetry
  b6: 1125,
  vo6: 1140,
  towns: [1150, 1212] as [number, number],
  nums: [1200, 1244, 1266, 1289],
  // B7 · local first
  b7: 1370,
  vo7: 1380,
  dome: 1387,
  streams: 1436,
  scan7: 1468,
  nollm: 1498,
  // B8 · open source, one-line install, keep pace
  b8: 1575,
  vo8: 1590,
  open: 1598,
  cut: 1636,
  type: [1641, 1682] as [number, number],
  crane: [1684, 1750] as [number, number],
  keep: 1716,
  final: 1745,
  end: 1860,
};
export const CUTS = [T.cut];

export const VO_CLIPS = [
  {id: 'vo-01', at: 30},
  {id: 'vo-02', at: 195},
  {id: 'vo-03', at: 380},
  {id: 'vo-04', at: 540},
  {id: 'vo-05', at: 840},
  {id: 'vo-06', at: 1140},
  {id: 'vo-07', at: 1380},
  {id: 'vo-08', at: 1590},
];
// Phrase windows measured from the Edge TTS waveforms (pauses ≥ 80 ms at −32 dB below the peak).
const sub = (at: number, a: number, b: number, text: string) => ({from: Math.round(at + a * FPS), to: Math.round(at + b * FPS), text});
export const SUBS = [
  sub(30, 0.2, 1.42, 'AI 写代码的速度'),
  sub(30, 1.63, 3.38, '已经快过你读懂架构的速度'),
  sub(195, 0.24, 1.53, '功能一层层叠上去'),
  sub(195, 1.79, 2.87, '依赖越缠越紧'),
  sub(195, 3.08, 4.12, '直到没人敢改'),
  sub(540, 0.21, 1.45, '它作为 MCP 工具'),
  sub(540, 1.75, 4.91, '随 Codex、Claude Code、Cursor 的会话启动'),
  sub(540, 5.35, 7.12, '会话结束　进程就退出'),
  sub(540, 7.38, 8.29, '不常驻后台'),
  sub(840, 0.22, 2.0, '一次扫描　十三类监测'),
  sub(840, 2.66, 3.71, '证据先于警报'),
  sub(840, 4.0, 5.88, 'S1、S2 保持安静'),
  sub(840, 6.22, 8.47, '只在架构真正需要跟上时提醒你'),
  sub(1140, 0.22, 1.26, '这不是概念演示'),
  sub(1140, 2.01, 3.19, '画面里的每一个数字'),
  sub(1140, 3.48, 6.12, '都来自真实安装的去标识化遥测'),
  sub(1380, 0.23, 1.63, '源码只在本地分析'),
  sub(1380, 1.85, 2.65, '从不上传'),
  sub(1380, 2.94, 4.83, '结构扫描　不调用大模型'),
  sub(1590, 0.19, 1.5, 'Apache 2.0 开源'),
  sub(1590, 1.69, 2.77, '一行命令安装'),
];

// ---------------------------------------------------------------- helpers
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

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

// World time for the city's own animation; it stops during the bullet-time beat and never restarts.
export const worldTime = (f: number) => Math.min(Math.max(f, 0), T.freeze);
export const particleTime = (f: number) => (f < T.freeze ? f : f < T.impact ? T.freeze : f - (T.impact - T.freeze));

// ---------------------------------------------------------------- city (identical layout to the A/B sample, times + O)
export type Slot = {x: number; z: number; yaw: number; w: number; d: number; h: number; accent: boolean; hub: boolean; side: number; j: number; inner: boolean};
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

export const waveRadius = (f: number) => RMAX * easeOutCubic(range(f, T.impact, T.impact + T.scanDur));
export const wavePass = (d: number) => T.impact + (1 - Math.cbrt(Math.max(0, 1 - Math.min(d, RMAX) / RMAX))) * T.scanDur;

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
          side,
          j,
          inner: c > 0,
        });
      }
    }
  }
  return slots;
}
export const HUB: Slot = {x: 0, z: V0.z - 1.379, yaw: Math.PI / 4, w: 1.95, d: 1.95, h: 2.9, accent: false, hub: true, side: 0, j: -1, inner: false};

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
      id: 0, core: true, x: 0, z: 0, w: 2.0, d: 2.0, yaw: 0.12, floors: 15, floorH: 0.48, growStart: O + 6, interval: 2.1, dist: 0,
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
      growStart: O + 10 + dist * 3.0 + r() * 9,
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
    const spawn = O + (red ? 88 + 57 * Math.pow((n - 18) / (N - 19), 0.75) : 60 + 30 * (n / 17));
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
    if (red) for (const id of [a, b]) buildings[id].infectedAt = Math.min(buildings[id].infectedAt, spawn + 10);
  }
  return {buildings, arcs};
}

const CITY = makeCity();
export const BUILDINGS = CITY.buildings;
export const ARCS = CITY.arcs;
export const FLOORS: {b: number; k: number}[] = BUILDINGS.flatMap((b) => Array.from({length: b.floors}, (_, k) => ({b: b.id, k})));
const byslot = (side: number, j: number, inner: boolean) => BUILDINGS.find((b) => b.slot.side === side && b.slot.j === j && b.slot.inner === inner)!;

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
  const trem = b.core ? 0.035 * smooth(range(wt, O + 100, O + 140)) * (1 - range(f, T.impact, T.impact + 8)) : 0;
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
  if (b.core) d = Math.max(d, smooth(range(wt, O + 96, O + 132)));
  return d * (1 - smooth(range(f, b.scanPass, b.scanPass + 6)));
}
export const scanFlash = (b: Building, f: number) => (f >= b.scanPass ? Math.exp(-(f - b.scanPass) / 3.5) : 0);
export const settled = (b: Building, f: number) => smooth(range(f, b.moveStart + b.moveDur - 6, b.moveStart + b.moveDur + 12));

// ---------------------------------------------------------------- B4 · sessions (beams land on the V, link to the hub)
export const SESSIONS = [
  {name: 'Codex', land: T.beams[0], b: byslot(-1, 7, false)},
  {name: 'Claude Code', land: T.beams[1], b: byslot(1, 7, false)},
  {name: 'Cursor', land: T.beams[2], b: byslot(1, 2, true)},
].map((s, i) => ({...s, i, retract: T.sessionEnd + i * 3, linkAt: s.land + 3, linkDur: 11}));
export const BEAM_DROP = 8;
export const hubDist = (b: Building) => Math.hypot(b.slot.x - HUB.x, b.slot.z - HUB.z);
const HUB_DMAX = 12.5;

// 0 = dark, 1 = fully lit. Seams/emissive of the V after the title follow this.
export function cityAct(b: Building, y: number, f: number) {
  if (f < T.dormant) return 1;
  const dh = hubDist(b);
  let a = lerp(1, 0.13, smooth(range(f, T.dormant, T.dormant + 34)));
  // each landing session wakes its own building
  for (const s of SESSIONS) if (s.b.id === b.id) a = Math.max(a, 0.5 * smooth(range(f, s.land, s.land + 4)) * (1 - smooth(range(f, s.retract, s.retract + 10))));
  // the hub wakes a little with every link, then the whole V ignites outward from it
  if (b.slot.hub) for (const s of SESSIONS) a = Math.max(a, (0.3 + 0.12 * s.i) * smooth(range(f, s.linkAt + s.linkDur - 2, s.linkAt + s.linkDur + 4)));
  const on = smooth(range(f, T.ignite + dh * 1.1, T.ignite + dh * 1.1 + 7));
  const offAt = T.exitStart + (1 - dh / HUB_DMAX) * (T.exitEnd - T.exitStart - 6);
  const off = smooth(range(f, offAt, offAt + 6));
  a = lerp(a, 1, on);
  a = lerp(a, 0.035, off);
  // B5 · the scan plane relights each floor as it passes, to a calm level
  const sy = T.scan + (19 * Math.acos(1 - 2 * clamp01(y / 5.6))) / Math.PI;
  a = lerp(a, 0.6, smooth(range(f, sy, sy + 5)));
  // B6/B7 · lit as one of many; B8 · the keep-pace front
  a = lerp(a, 0.82, smooth(range(f, T.b6 + 10, T.b6 + 70)));
  const kf = T.crane[0] + 8 + dh * 1.4;
  a = lerp(a, 1, smooth(range(f, kf, kf + 8)));
  return a;
}
export const hubAct = (f: number) => cityAct(BUILDINGS[0], 0.1, f);
export const sessionsAlive = (f: number) => smooth(range(f, T.ignite - 2, T.ignite + 6)) * (1 - smooth(range(f, T.exitStart + 8, T.exitEnd)));

// ---------------------------------------------------------------- B5 · one scan, 13 monitor families
export const MONITORS = ['代码结构/组件化', '依赖耦合', '平台可移植性', '安全面', '状态/数据', '异步/并发', '可靠性/恢复', '测试/验证', '可观测性', '分布/扩展', 'API/契约演进', '集成复杂度', 'AI 编码实现漂移'];
export const SURFACED = [1, 7];
export const RING_C = {x: 0, z: 0.5};
export const ringRadius = (i: number) => 4.6 + i * 1.02;
export const ringBorn = (i: number) => T.rings + i * 2;
export const NOTICE_B = byslot(-1, 4, true);
export const scanY = (f: number) => 5.6 * easeInOutSine(range(f, T.scan, T.scan + 19));
export const scanI = (f: number) => smooth(range(f, T.scan - 2, T.scan + 3)) * (1 - smooth(range(f, T.scan + 16, T.scan + 24)));

// ---------------------------------------------------------------- B6 · one town per observed project instance
export type Town = {x: number; z: number; lit: number; ours: boolean; seed: number};
export function makeTowns(count: number): Town[] {
  const r = rng(197);
  const towns: Town[] = [{x: 0, z: 0.5, lit: T.towns[0], ours: true, seed: 0.5}];
  const centers = Array.from({length: 9}, () => {
    const a = r() * TAU;
    const d = 48 + r() * 80;
    return {x: Math.cos(a) * d, z: Math.sin(a) * d};
  });
  let guard = 0;
  while (towns.length < count && guard++ < 40000) {
    let x: number;
    let z: number;
    if (r() < 0.55) {
      const c = centers[Math.floor(r() * centers.length)];
      const a = r() * TAU;
      const d = Math.sqrt(r()) * 24;
      x = c.x + Math.cos(a) * d;
      z = c.z + Math.sin(a) * d;
    } else {
      const a = r() * TAU;
      const d = 30 + Math.sqrt(r()) * 118;
      x = Math.cos(a) * d;
      z = Math.sin(a) * d;
    }
    const dd = Math.hypot(x, z);
    if (dd < 30 || dd > 150) continue;
    if (towns.some((t) => Math.hypot(t.x - x, t.z - z) < 5.6)) continue;
    towns.push({x, z, lit: 0, ours: false, seed: r()});
  }
  const rest = towns.slice(1).sort((p, q) => Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z));
  rest.forEach((t, i) => (t.lit = T.towns[0] + 3 + (T.towns[1] - T.towns[0] - 3) * Math.pow((i + 1) / rest.length, 0.85)));
  return [towns[0], ...rest];
}
export const townsLit = (towns: Town[], f: number) => towns.reduce((n, t) => n + (t.lit <= f ? 1 : 0), 0);

// ---------------------------------------------------------------- B7 · the machine boundary
export const DOME_R = 21;
export const DOME_C = {x: 0, z: 0.5};
export const domeReveal = (f: number) => easeInOutCubic(range(f, T.dome, T.dome + 34)) * (1 - easeInOutCubic(range(f, T.open, T.open + 36)));

// ---------------------------------------------------------------- B8 · the install line, typed on the ground
export const CMD = 'npx -y @vibe-monitor/setup@latest install';
export const CMD_POS = {x0: -7.2, x1: 7.2, z: 13.0};
export const CMD_TIMES: number[] = (() => {
  const r = rng(4040);
  const out: number[] = [];
  let t = T.type[0];
  for (let i = 0; i < CMD.length; i++) {
    out.push(t);
    t += 0.62 + r() * 0.42 + (CMD[i] === ' ' ? 1.6 : 0);
  }
  return out;
})();
export const cmdTyped = (f: number) => {
  let n = 0;
  for (const t of CMD_TIMES) if (t <= f) n++;
  return n;
};
export const keepFront = (f: number) => 70 * Math.pow(range(f, T.crane[0] + 4, T.crane[1]), 1.6);

// ---------------------------------------------------------------- code carpet: every block is a "file", every bar a token
export const PITCH = 0.135;
export const TOK_H = 0.032;
export const TOK_TH = 0.07;
export type Blk = {cx: number; cz: number; yaw: number; w: number; d: number; bid: number; dist: number; tb: number; D: number};
export type Carpet = {
  count: number;
  data: Float32Array; // per token: x, z, yaw, len, t0, dur, cls, block
  blocks: Blk[];
  coreLine0: {x: number; z: number; dx: number; dz: number};
  coreTicks: number[]; // token start frames in the core file (individually audible)
  density: Float32Array; // token starts per frame (everything else)
};
let carpetCache: Carpet | null = null;
export function makeCarpet(): Carpet {
  if (carpetCache) return carpetCache;
  const r = rng(31337);
  const blocks: Blk[] = [];
  for (const b of BUILDINGS) blocks.push({cx: b.x, cz: b.z, yaw: b.yaw, w: b.w * 0.94, d: b.d * 0.94, bid: b.id, dist: Math.hypot(b.x, b.z), tb: 0, D: 0});
  const clear = (x: number, z: number, rad: number) => BUILDINGS.every((b) => Math.hypot(b.x - x, b.z - z) >= rad);
  const rings: [number, number, number, number][] = [
    [1.75, 0, 26, 1.42],
    [2.7, 27.6, 66, 2.15],
  ];
  for (const [sp, r0, r1, sz] of rings) {
    const n = Math.ceil(r1 / sp);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const x = i * sp + (r() - 0.5) * sp * 0.3;
        const z = j * sp + (r() - 0.5) * sp * 0.3;
        const d = Math.hypot(x, z);
        const skip = r();
        const w = sz * (0.8 + r() * 0.18);
        const dd = sz * (0.66 + r() * 0.3);
        const yaw = (r() - 0.5) * 0.36;
        if (d < r0 || d >= r1 || skip < 0.06) continue;
        if (!clear(x, z, 1.5 + sz * 0.3)) continue;
        blocks.push({cx: x, cz: z, yaw, w, d: dd, bid: -1, dist: d, tb: 0, D: 0});
      }
    }
  }
  for (const B of blocks) {
    if (B.bid === 0) continue;
    B.tb = T.front0 + T.frontTau * Math.log(Math.max(B.dist, 1.8) / 1.8) + r() * 3;
    B.D = Math.min(36, Math.max(5, 36 * Math.exp(-(B.tb - T.front0) / 22)));
  }
  const out: number[] = [];
  const coreTicks: number[] = [];
  const density = new Float32Array(400);
  let coreLine0 = {x: 0, z: 0, dx: 1, dz: 0};
  blocks.forEach((B, bi) => {
    const core = B.bid === 0;
    const nL = Math.max(2, Math.floor((B.d - 0.1) / PITCH));
    const c = Math.cos(B.yaw);
    const s = Math.sin(B.yaw);
    let L = 0;
    let tcur = core ? T.blink : B.tb;
    for (let li = 0; li < nL; li++) {
      const dur = core ? Math.max(1.6, 10 * Math.pow(0.8, li)) : B.D / nL;
      const blank = li > 0 && r() < 0.1;
      if (li > 0) {
        const q = r();
        if (q < 0.27 && L < 3) L++;
        else if (q < 0.52 && L > 0) L--;
      }
      const maxLen = B.w - 0.1 - L * 0.11;
      const lenR = r();
      const comment = r() < 0.07;
      const kR = r();
      if (!blank && maxLen > 0.2) {
        const len = maxLen * (0.22 + 0.78 * Math.pow(lenR, 0.7));
        let k = comment ? 1 : 1 + Math.floor(kR * 3.3);
        const gap = 0.055;
        while (k > 1 && len - gap * (k - 1) < 0.1 * k) k--;
        const wts = Array.from({length: k}, () => 0.4 + r());
        const sw = wts.reduce((p, q) => p + q, 0);
        const avail = len - gap * (k - 1);
        let x = 0;
        const lz = -B.d / 2 + 0.06 + li * PITCH + TOK_TH / 2;
        for (let ti = 0; ti < k; ti++) {
          const tl = (avail * wts[ti]) / sw;
          const cr = r();
          const cls = comment ? 3 : ti === 0 ? (cr < 0.5 ? 0 : 1) : cr < 0.14 ? 2 : cr < 0.42 ? 3 : 1;
          const lx = -B.w / 2 + 0.05 + L * 0.11 + x;
          const wx = B.cx + lx * c + lz * s;
          const wz = B.cz - lx * s + lz * c;
          const t0 = tcur + dur * (x / len);
          const td = Math.max(0.35, dur * (tl / len));
          out.push(wx, wz, B.yaw, tl, t0, td, cls, bi);
          if (core) {
            coreTicks.push(t0);
            if (li === 0 && ti === 0) coreLine0 = {x: wx, z: wz, dx: c, dz: -s};
          } else {
            const fi = Math.floor(t0);
            if (fi >= 0 && fi < density.length) density[fi]++;
          }
          x += tl + gap;
        }
      }
      tcur += core ? dur * 1.05 : dur;
    }
  });
  const data = new Float32Array(out);
  carpetCache = {count: data.length / 8, data, blocks, coreLine0, coreTicks, density};
  return carpetCache;
}

// carpet brightness over the film (the code stays as the ground the city stands on)
export const carpetGlow = (f: number) => {
  let g = 0.55;
  g = lerp(g, 0.15, smooth(range(f, O + 8, O + 80)));
  g = lerp(g, 0.07, smooth(range(f, T.impact + 20, T.craneEnd)));
  g = lerp(g, 0.035, smooth(range(f, T.dormant, T.dormant + 30)));
  g = lerp(g, 0.06, smooth(range(f, T.scan, T.scan + 30)));
  g = lerp(g, 0.015, smooth(range(f, T.b6, T.b6 + 50)));
  g = lerp(g, 0.05, smooth(range(f, T.b7, T.b7 + 40)));
  g = lerp(g, 0.09, smooth(range(f, T.cut - 1, T.cut)));
  g = lerp(g, 0.04, smooth(range(f, T.crane[0] + 20, T.crane[1])));
  return g;
};

// ---------------------------------------------------------------- camera
export type CamState = {px: number; py: number; pz: number; tx: number; ty: number; tz: number; ap: number};
type Pose = {tx: number; ty: number; tz: number; r: number; th: number; ph: number};
const pose = (tx: number, ty: number, tz: number, r: number, th: number, ph: number): Pose => ({tx, ty, tz, r, th, ph});
const mixPose = (a: Pose, b: Pose, u: number, logR = true): Pose => ({
  tx: lerp(a.tx, b.tx, u),
  ty: lerp(a.ty, b.ty, u),
  tz: lerp(a.tz, b.tz, u),
  r: logR ? Math.exp(lerp(Math.log(a.r), Math.log(b.r), u)) : lerp(a.r, b.r, u),
  th: lerp(a.th, b.th, u),
  ph: lerp(a.ph, b.ph, u),
});
const toCam = (p: Pose, ap = 0, sx = 0, sy = 0): CamState => {
  const st = Math.sin(p.th * DEG);
  const ct = Math.cos(p.th * DEG);
  return {px: p.tx + p.r * st * Math.sin(p.ph * DEG) + sx, py: p.ty + p.r * ct + sy, pz: p.tz + p.r * st * Math.cos(p.ph * DEG), tx: p.tx, ty: p.ty, tz: p.tz, ap};
};

// Sample E-phase (top-down hold) as a function so later beats can start from it.
const titlePose = (f: number) => {
  const u = Math.sin((range(f, T.craneEnd, O + 360) * Math.PI) / 2);
  return pose(0, 0, 3.0, lerp(52, 49.5, u), 0.5, lerp(0, -0.8, u));
};
const P_B4 = pose(0, 1.0, 0.5, 38, 50, -2);
const P_B5 = pose(0, 0.8, 0.5, 45, 44, 12);
const P_B6 = pose(0, 0, 0, 300, 24, 32);
const P_B6b = pose(0, 0, 0, 292, 24, 34.5);
const P_B7 = pose(0, 6.5, 0.5, 76, 54, -4);
const P_B7b = pose(0, 6.5, 0.5, 73, 52, 6);
const P_B8a = pose(-2.0, 0.05, CMD_POS.z, 6.8, 80, -72);
const P_B8b = pose(-0.8, 0.05, CMD_POS.z, 5.7, 79, -64);
const P_END = pose(0, 0, 3.0, 50, 0.5, 0);
const P_END2 = pose(0, 0, 3.0, 47.5, 0.5, 0.8);

// monotone cubic (Fritsch–Carlson) through [frame, value] keys
function mono(keys: [number, number][], x: number) {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]));
  m.push(0);
  let i = 0;
  while (x > keys[i + 1][0]) i++;
  const h = keys[i + 1][0] - keys[i][0];
  const t = (x - keys[i][0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h * m[i + 1];
}
// B1: the camera starts at the caret and pulls back roughly as fast as the front of code grows, then loses the race.
const B1_LOGR: [number, number][] = ([
  [0, 2.6],
  [40, 2.75],
  [62, 3.0],
  [80, 5.5],
  [100, 12.5],
  [131, 26],
  [180, 42],
] as [number, number][]).map(([f, r]) => [f, Math.log(r)]);
const B1_TH: [number, number][] = [
  [0, 72],
  [60, 73],
  [100, 77],
  [180, 76],
];
function b1Pose(f: number): Pose {
  const L0 = makeCarpet().coreLine0;
  const normalDeg = Math.atan2(-L0.dz, L0.dx) / DEG; // azimuth of the line's normal (the file's local +z)
  const drift = 0.25 * smooth(range(f, 0, 76));
  const a = {x: L0.x + L0.dx * (0.32 + drift), y: 0.02, z: L0.z + L0.dz * (0.32 + drift)};
  const u = easeInOutCubic(range(f, 58, 180));
  return {
    tx: lerp(a.x, 0, u),
    ty: lerp(a.y, 1.4, u),
    tz: lerp(a.z, 0, u),
    r: Math.exp(mono(B1_LOGR, f)),
    th: mono(B1_TH, f),
    ph: lerp(normalDeg - 20, 38, easeInOutCubic(range(f, 36, 180))),
  };
}

export function cameraAt(f: number): CamState {
  if (f < O) {
    const ap = 0.035 * (1 - smooth(range(f, 66, 108)));
    return toCam(b1Pose(f), ap);
  }
  if (f < T.b4 + 5) {
    // the A/B sample's move, unchanged (tangle → bullet time → crane to the V)
    let phi: number;
    let theta: number;
    let r: number;
    let ty: number;
    let tz = 0;
    if (f < T.freeze) {
      const u = range(f, O, T.freeze);
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
      return toCam(titlePose(f));
    }
    const wt = Math.min(f, T.freeze);
    const amp = 0.12 * smooth(range(wt, O + 96, O + 148)) * (1 - smooth(range(f, T.freeze, T.freeze + 15)));
    const kick = f >= T.impact ? 0.22 * Math.exp(-(f - T.impact) / 3.5) : 0;
    const sx = amp * (Math.sin(wt * 1.9) + 0.6 * Math.sin(wt * 4.3 + 1.1)) + kick * Math.sin(f * 7.1);
    const sy = amp * 0.7 * (Math.sin(wt * 2.6 + 0.4) + 0.5 * Math.sin(wt * 5.1)) + kick * 0.8 * Math.sin(f * 8.3 + 0.5);
    return toCam(pose(0, ty, tz, r, theta, phi), 0, sx, sy);
  }
  if (f < 604) return toCam(mixPose(titlePose(T.b4 + 5), P_B4, easeInOutCubic(range(f, T.b4 + 5, 604))));
  if (f < T.b6 + 3) return toCam(mixPose(P_B4, P_B5, easeInOutSine(range(f, 604, T.b6 + 3)), false));
  if (f < 1262) return toCam(mixPose(P_B5, P_B6, easeInOutCubic(range(f, T.b6 + 3, 1262))));
  if (f < T.b7 + 2) return toCam(mixPose(P_B6, P_B6b, easeInOutSine(range(f, 1262, T.b7 + 2)), false));
  if (f < 1442) return toCam(mixPose(P_B6b, P_B7, easeInOutCubic(range(f, T.b7 + 2, 1442))));
  if (f < T.cut) return toCam(mixPose(P_B7, P_B7b, easeInOutSine(range(f, 1442, T.cut)), false));
  // B8 (after the cut): low along the install line, then rise to the final V
  const track = mixPose(P_B8a, P_B8b, range(f, T.cut, T.crane[0] + 20), false);
  const ap = 0.02 * (1 - smooth(range(f, T.crane[0], T.crane[0] + 26)));
  if (f < T.crane[0]) return toCam(track, ap);
  if (f < T.crane[1]) {
    const ut = easeInOutCubic(range(f, T.crane[0], T.crane[1]));
    const ur = easeInOutSine(range(f, T.crane[0], T.crane[1] - 16));
    return toCam(
      {
        tx: lerp(track.tx, P_END.tx, ut),
        ty: lerp(track.ty, P_END.ty, ut),
        tz: lerp(track.tz, P_END.tz, ut),
        r: Math.exp(lerp(Math.log(track.r), Math.log(P_END.r), ur)),
        th: lerp(track.th, P_END.th, ur),
        ph: lerp(track.ph, P_END.ph, ut),
      },
      ap,
    );
  }
  return toCam(mixPose(P_END, P_END2, easeInOutSine(range(f, T.crane[1], T.end)), false));
}

// sub-frame samples: more for macro (lens blur) and fast moves
export function samplesAt(f: number) {
  if (f < 100 || (f >= T.cut && f < T.crane[0] + 24)) return 24;
  const fast: [number, number][] = [
    [T.craneStart - 2, T.craneEnd],
    [T.b4 + 5, 604],
    [T.b6 + 3, 1262],
    [T.b7 + 2, 1442],
    [T.crane[0], T.crane[1]],
  ];
  for (const [a, b] of fast) if (f >= a && f <= b) return 16;
  return 12;
}

// Project a world point to 1920×1080 pixels with the un-jittered camera of frame f (for DOM labels).
export function project(x: number, y: number, z: number, f: number) {
  const c = cameraAt(f);
  let fx = c.tx - c.px;
  let fy = c.ty - c.py;
  let fz = c.tz - c.pz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = F × up(0,1,0)
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  // up' = R × F
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const dx = x - c.px;
  const dy = y - c.py;
  const dz = z - c.pz;
  const cx = dx * rx + dz * rz;
  const cy = dx * ux + dy * uy + dz * uz;
  const cz = dx * fx + dy * fy + dz * fz;
  const tanH = Math.tan(15 * DEG);
  return {x: (1 + cx / (cz * tanH * (16 / 9))) * 960, y: (1 - cy / (cz * tanH)) * 540, depth: cz};
}

// ---------------------------------------------------------------- everything the sound design needs (frames)
export function soundEvents() {
  const landings: {f: number; x: number; core: boolean; k: number}[] = [];
  for (const b of BUILDINGS) for (let k = 0; k < b.floors; k++) landings.push({f: floorLandFrame(b, k), x: b.x, core: b.core, k});
  landings.sort((p, q) => p.f - q.f);
  const arcs = ARCS.map((a) => ({f: a.spawn, x: (BUILDINGS[a.a].x + BUILDINGS[a.b].x) / 2, red: a.red})).sort((p, q) => p.f - q.f);
  const moves = BUILDINGS.map((b) => ({f0: b.moveStart, f1: b.moveStart + b.moveDur, x0: b.x, x1: b.slot.x, hub: b.slot.hub}));
  const cp = makeCarpet();
  const sessions = SESSIONS.map((s) => ({name: s.name, land: s.land, retract: s.retract, x: s.b.slot.x, link: s.linkAt + s.linkDur}));
  const rings = MONITORS.map((_, i) => ({f: ringBorn(i), i}));
  return {landings, arcs, moves, T, FPS, FILM_FRAMES, coreTicks: cp.coreTicks, density: Array.from(cp.density), sessions, rings, cmdTimes: CMD_TIMES, cmd: CMD};
}
