// Sound design + score + mix for the "Outside the Window" B1→B2 sample (20.5 s).
// Everything is synthesized here (no third-party audio) and timed from the same sampleLayout.ts the picture uses.
// The score is "half a song": a piano phrase that stops on an unresolved note. Inside the window it is muffled;
// the door opens the filter, the sea and a long reverb. Two other windows answer the hanging note (A, then C#),
// so the three AIs on the water spell an A-major chord that is still waiting to resolve.
// VO = Edge TTS en-US-AndrewNeural (-12 %) cut into sentences, EQ'd, compressed and limited.
// Usage: node projects/outside-the-window-20261104/sample/sample-sound.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const SLUG = 'outside-the-window-20261104';
const lay = await import(pathToFileURL(path.join(root, `src/projects/${SLUG}/sample/sampleLayout.ts`)).href);
const ev = lay.soundEvents();
const AUDIO = path.join(root, `public/${SLUG}/audio`);

const SR = 48000;
const DUR = ev.dur;
const N = Math.round(DUR * SR);
const db = (d) => Math.pow(10, d / 20);
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (u) => u * u * (3 - 2 * u);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(1104);
const noise = () => R() * 2 - 1;
const bus = () => ({L: new Float32Array(N), R: new Float32Array(N)});
const VOX = bus();
const PNO = bus(); // the hero's piano: muffled until the door opens
const MUS = bus(); // other musical voices (chimes, murmur)
const SFX = bus();
const AMB = bus(); // sea + room tone: never ducked
const REV = bus(); // reverb send

function add(b, i, v, pan = 0) {
  if (i < 0 || i >= N) return;
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  b.L[i] += v * Math.cos(a);
  b.R[i] += v * Math.sin(a);
}
function place(b, t0, arr, gain = 1, pan = 0, send = 0) {
  const s0 = Math.round(t0 * SR);
  for (let j = 0; j < arr.length; j++) {
    const v = arr[j] * gain;
    add(b, s0 + j, v, pan);
    if (send) add(REV, s0 + j, v * send, pan);
  }
}
const tone = (len, fn) => {
  const a = new Float32Array(Math.max(1, Math.round(len * SR)));
  for (let i = 0; i < a.length; i++) a[i] = fn(i / SR, i);
  return a;
};
const env = (t, att, tau) => (t < att ? t / att : Math.exp(-(t - att) / tau));
function biq(type, f0, Q, gainDb = 0) {
  const A = Math.pow(10, gainDb / 40);
  const w = (TAU * f0) / SR;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') [b0, b1, b2, a0, a1, a2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + al, -2 * cw, 1 - al];
  else if (type === 'hp') [b0, b1, b2, a0, a1, a2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al];
  else if (type === 'bp') [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cw, 1 - al];
  else if (type === 'peak') [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cw, 1 - al * A, 1 + al / A, -2 * cw, 1 - al / A];
  else {
    const s = 2 * Math.sqrt(A) * al; // high shelf
    [b0, b1, b2] = [A * (A + 1 + (A - 1) * cw + s), -2 * A * (A - 1 + (A + 1) * cw), A * (A + 1 + (A - 1) * cw - s)];
    [a0, a1, a2] = [A + 1 - (A - 1) * cw + s, 2 * (A - 1 - (A + 1) * cw), A + 1 - (A - 1) * cw - s];
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, c) {
  const [b0, b1, b2, a1, a2] = c;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
}
// TPT state-variable filter with per-sample cutoff
function svf(x, fc, Q, mode) {
  let ic1 = 0, ic2 = 0;
  const k = 1 / Q;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const g = Math.tan((Math.PI * Math.min(Math.max(fc(i), 10), SR * 0.45)) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2;
  }
  return out;
}
const noiseArr = (len) => tone(len, () => noise());
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const M = {G2: 43, A2: 45, B2: 47, D3: 50, E3: 52, Fs3: 54, G3: 55, A3: 57, D4: 62, E4: 64, Fs4: 66, A4: 69, B4: 71, Cs5: 73, D5: 74, E5: 76, Fs5: 78, A5: 81, B5: 83, Cs6: 85, D6: 86, E6: 88, Fs6: 90, A6: 93, B6: 95, Cs7: 97};

// ---------------------------------------------------------------- piano (additive, inharmonic, two strings, hammer)
function piano(midi, vel, hold) {
  const f0 = hz(midi);
  const len = hold + 2.8;
  const out = new Float32Array(Math.round(len * SR));
  const Bk = 0.00032 * Math.pow(f0 / 261.6, 0.6);
  const tau1 = 2.4 * Math.pow(261.6 / f0, 0.55);
  const bright = 0.42 - 0.24 * vel;
  for (let n = 1; n <= 16; n++) {
    const fn = n * f0 * Math.sqrt(1 + Bk * n * n);
    if (fn > 15000) break;
    const a = Math.pow(n, -1.05) * Math.exp(-(n - 1) * bright) * (n === 1 ? 0.8 : 1);
    const tn = tau1 / (1 + 0.32 * (n - 1));
    for (const det of [1 - 0.00028, 1 + 0.00031]) {
      const w = (TAU * fn * det) / SR;
      let c = 1, s = 0;
      const cw = Math.cos(w), sw = Math.sin(w);
      const ph = R() * TAU;
      const cp = Math.cos(ph), sp = Math.sin(ph);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        let e = 0.68 * Math.exp(-t / (tn * 0.3)) + 0.32 * Math.exp(-t / tn);
        if (t > hold) e *= Math.exp(-(t - hold) / 0.16);
        if (e < 1e-5) break;
        out[i] += (s * cp + c * sp) * a * e * 0.5;
        const c2 = c * cw - s * sw;
        s = s * cw + c * sw;
        c = c2;
      }
    }
  }
  // hammer: a short felt thump + a breath of high noise
  const ham = svf(noiseArr(0.03), () => 1800 + 2600 * vel, 0.9, 'bp');
  for (let i = 0; i < ham.length; i++) out[i] += ham[i] * 0.14 * vel * Math.exp(-i / (0.004 * SR));
  for (let i = 0; i < Math.min(out.length, 0.0015 * SR); i++) out[i] *= i / (0.0015 * SR);
  const g = 0.32 * (0.35 + 0.65 * vel);
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}

// the half song: [beat, midi, beats held, velocity]; stops on E5 (over an open A fifth)
const PHRASE = [
  [0, M.A4, 0.5, 0.5],
  [0.5, M.D5, 1.0, 0.6],
  [1.5, M.E5, 0.5, 0.52],
  [2.0, M.Fs5, 1.5, 0.7],
  [3.5, M.E5, 0.5, 0.5],
  [4.0, M.D5, 1.0, 0.6],
  [5.0, M.B4, 1.0, 0.55],
  [6.0, M.A4, 1.5, 0.58],
  [7.5, M.B4, 0.5, 0.48],
  [8.0, M.D5, 1.0, 0.56],
  [9.12, M.E5, 4.5, 0.6],
];
const LEFT = [
  [0.5, [M.D3, M.A3], 3.4, 0.42],
  [4.0, [M.B2, M.Fs3], 1.9, 0.4],
  [6.0, [M.G2, M.D3], 2.4, 0.4],
  [9.12, [M.A2, M.E3], 4.5, 0.42],
];
function playPhrase(start, beat, gain, holdScale = 1) {
  const r = rng(Math.round(start * 1000));
  for (const [b, m, d, v] of PHRASE) {
    const t = start + b * beat + (r() - 0.5) * 0.03;
    const hold = d * beat * (b > 9 ? holdScale : 1);
    place(PNO, t, piano(m, v, hold), gain, 0.12, 0);
  }
  for (const [b, ms, d, v] of LEFT) {
    const t = start + b * beat + 0.012;
    for (const m of ms) place(PNO, t, piano(m, v, d * beat * (b > 9 ? holdScale : 1)), gain * 0.8, -0.18, 0);
  }
}
const P1 = {start: ev.typingEnd - 9.12 * 0.66, beat: 0.66};
const P2 = {start: ev.cutB + 0.08, beat: 0.62};
playPhrase(P1.start, P1.beat, 1.0, 0.6);
playPhrase(P2.start, P2.beat, 1.0, 1.5);
const HANG2 = P2.start + 9.12 * P2.beat;

// muffled until the door opens, then the filter (and the reverb) open with it
const OPEN0 = ev.door[0];
const OPEN1 = ev.door[1];
const openAt = (t) => smooth(clamp01((t - OPEN0) / (OPEN1 - OPEN0)));
{
  const cut = (i) => {
    const t = i / SR;
    return 620 * Math.pow(16000 / 620, openAt(t));
  };
  const L = svf(PNO.L, cut, 0.62, 'lp');
  const Rr = svf(PNO.R, cut, 0.62, 'lp');
  // inside the glass: a short boxy reflection; outside: the long reverb send
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const o = openAt(t);
    const lift = 1.35 - 0.35 * o; // the muffled piano sits a touch hotter so it still reads
    PNO.L[i] = L[i] * lift;
    PNO.R[i] = Rr[i] * lift;
    REV.L[i] += L[i] * (0.12 + 0.55 * o);
    REV.R[i] += Rr[i] * (0.12 + 0.55 * o);
  }
}

// ---------------------------------------------------------------- B1 · inside: typing ticks, the glass taps
// soft muffled ticks as the dots bounce (each dot's apex), quieter as the typing stops
{
  for (let k = 0; k < 3; k++) {
    for (let t = 0.2; t < ev.typingEnd; t += 1 / 0.86) {
      const apex = t + k * (0.16 / 0.86) + 0.21 / 0.86;
      if (apex > ev.typingEnd - 0.05) break;
      const f = 2100 + 260 * k;
      const tick = tone(0.05, (tt) => Math.sin(TAU * f * tt) * env(tt, 0.0008, 0.006));
      filt(tick, biq('lp', 1400, 0.7));
      place(SFX, apex, tick, db(-35), (k - 1) * 0.25, 0.05);
    }
  }
  // each answered line: a faint glassy shimmer, muffled
  for (const t of ev.lineDone) {
    if (t < 0.4) continue;
    const sh = tone(0.25, (tt) => (Math.sin(TAU * 3520 * tt) * 0.6 + Math.sin(TAU * 5280 * tt) * 0.4) * env(tt, 0.004, 0.05));
    filt(sh, biq('lp', 1600, 0.7));
    place(SFX, t, sh, db(-44), (R() - 0.5) * 0.6, 0.06);
  }
  // the dots press against the glass: three soft fingertip taps on frosted glass
  ev.contacts.forEach((c, k) => {
    const f = 1650 + 140 * k;
    const tap = tone(0.4, (tt) => (Math.sin(TAU * f * tt) + 0.45 * Math.sin(TAU * f * 2.71 * tt) * Math.exp(-tt / 0.02)) * env(tt, 0.001, 0.07));
    const thump = tone(0.12, (tt) => Math.sin(TAU * 180 * tt) * env(tt, 0.002, 0.025));
    filt(tap, biq('lp', 2400, 0.7));
    place(SFX, c.t, tap, db(-27), c.x * 1.6, 0.12);
    place(SFX, c.t, thump, db(-30), c.x * 1.6, 0);
  });
}

// ---------------------------------------------------------------- B1 · the pull-back: thousands of windows murmur
{
  const [a, b] = ev.pull;
  const cut = ev.cutB;
  const scale = [M.D4, M.E4, M.Fs4, M.A4, M.B4, M.D5, M.E5, M.Fs5, M.A5, M.B5, M.D6];
  const MUR = bus();
  for (let n = 0; n < 240; n++) {
    const t = a - 1.6 + Math.pow(R(), 0.55) * (cut - a + 1.6);
    if (t >= cut - 0.02) continue;
    const m = scale[Math.floor(R() * scale.length)] + (R() < 0.3 ? -12 : 0);
    const f = hz(m) * (1 + (R() - 0.5) * 0.004);
    const len = 0.5;
    const nt = tone(len, (tt) => (Math.sin(TAU * f * tt) + 0.3 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt / 0.08)) * env(tt, 0.002, 0.12 + R() * 0.12));
    const dens = clamp01((t - (a - 1.6)) / (cut - a + 1.6));
    place(MUR, t, nt, db(-41 + 15 * dens) * (0.5 + R() * 0.5), (R() - 0.5) * 1.8, 0);
  }
  // a low hum underneath: an open D fifth with slow beating + breath
  const air = svf(noiseArr(DUR), () => 380, 0.7, 'lp');
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (t > cut) break;
    const g = smooth(clamp01((t - (a - 1.0)) / (cut - a + 0.6)));
    const hum = (Math.sin(TAU * 73.42 * t) + 0.7 * Math.sin(TAU * 110.1 * t) + 0.35 * Math.sin(TAU * 146.6 * t + Math.sin(TAU * 0.3 * t))) * 0.33;
    const v = (hum * 0.6 + air[i] * 1.6) * db(-22) * g;
    MUR.L[i] += v;
    MUR.R[i] += v * 0.96;
  }
  const L = svf(MUR.L, () => 900, 0.7, 'lp');
  const Rr = svf(MUR.R, () => 900, 0.7, 'lp');
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (t > cut + 0.02) break;
    const k = t > cut - 0.012 ? Math.max(0, (cut + 0.008 - t) / 0.02) : 1; // hard cut with the picture
    MUS.L[i] += L[i] * k;
    MUS.R[i] += Rr[i] * k;
    REV.L[i] += L[i] * k * 0.25;
    REV.R[i] += Rr[i] * k * 0.25;
  }
  // the camera's long retreat: a soft falling air sweep
  const len = cut - a;
  const wn = noiseArr(len);
  const sw = svf(wn, (i) => 2400 * Math.pow(0.18, i / wn.length), 1.1, 'bp');
  for (let i = 0; i < sw.length; i++) {
    const u = i / sw.length;
    sw[i] *= Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 2;
  }
  place(SFX, a, sw, db(-31), 0.1, 0.2);
}

// ---------------------------------------------------------------- B2 · inside, the seam, the door, the sea
{
  // inside the window: near-silence, a faint glass room tone
  const rt = svf(noiseArr(DUR - ev.cutB), () => 650, 0.6, 'lp');
  for (let i = 0; i < rt.length; i++) {
    const t = ev.cutB + i / SR;
    const g = db(-50) * (1 - openAt(t));
    add(AMB, Math.round(t * SR), rt[i] * g, 0);
  }
  // the seam: light leaking in; a rising glassy shimmer + air
  const s0 = ev.seam;
  const sl = ev.door[0] - s0 + 0.5;
  const shim = tone(sl, (tt) => {
    const u = clamp01(tt / sl);
    return (Math.sin(TAU * 2637 * tt) * 0.5 + Math.sin(TAU * 3951 * tt + 0.3) * 0.35 + Math.sin(TAU * 5274 * tt) * 0.2) * u * u * Math.exp(-Math.max(0, tt - (sl - 0.5)) / 0.15);
  });
  place(SFX, s0, shim, db(-36), 0, 0.5);
  const hiss = svf(noiseArr(sl), (i) => 3000 + 5000 * (i / (sl * SR)), 1.4, 'bp');
  for (let i = 0; i < hiss.length; i++) hiss[i] *= ((i / hiss.length) ** 2) * Math.exp(-Math.max(0, i / SR - (sl - 0.5)) / 0.15);
  place(SFX, s0, hiss, db(-38), 0, 0.3);
  // the door unseals: a soft low thump and a long breath of outside air
  const d0 = ev.door[0];
  const thump = tone(0.5, (tt) => Math.sin(TAU * (62 + 30 * Math.exp(-tt / 0.05)) * tt) * env(tt, 0.004, 0.12));
  place(SFX, d0, thump, db(-26), 0, 0.15);
  const br = svf(noiseArr(2.4), (i) => 500 + 1800 * Math.exp(-i / (0.6 * SR)), 0.8, 'lp');
  for (let i = 0; i < br.length; i++) {
    const t = i / SR;
    br[i] *= Math.min(1, t / 0.3) * Math.exp(-Math.max(0, t - 0.6) / 0.7);
  }
  place(SFX, d0 + 0.05, br, db(-30), -0.1, 0.35);

  // the sea: soft swells and laps, a little wind; it opens with the door and stays to the end
  const len = DUR - d0;
  const brownL = new Float32Array(Math.round(len * SR));
  const brownR = new Float32Array(brownL.length);
  let bl = 0, br2 = 0;
  for (let i = 0; i < brownL.length; i++) {
    bl = bl * 0.997 + noise() * 0.06;
    br2 = br2 * 0.997 + noise() * 0.06;
    brownL[i] = bl;
    brownR[i] = br2;
  }
  const wl = svf(brownL, () => 520, 0.6, 'lp');
  const wr = svf(brownR, () => 520, 0.6, 'lp');
  const wind = svf(noiseArr(len), (i) => 420 + 160 * Math.sin((TAU * i) / (SR * 7.3)), 2.2, 'bp');
  for (let i = 0; i < wl.length; i++) {
    const t = d0 + i / SR;
    const o = openAt(t);
    const sw1 = 0.62 + 0.38 * Math.sin(TAU * (t / 5.4) + 0.6);
    const sw2 = 0.62 + 0.38 * Math.sin(TAU * (t / 6.1) + 2.2);
    const s = Math.round(t * SR);
    if (s >= N) break;
    AMB.L[s] += (wl[i] * sw1 * db(-24) + wind[i] * db(-47)) * o;
    AMB.R[s] += (wr[i] * sw2 * db(-24) + wind[i] * db(-48)) * o;
  }
  for (let t = d0 + 0.6; t < DUR; t += 0.9 + R() * 1.6) {
    const l = 0.7;
    const lap = svf(noiseArr(l), () => 700 + R() * 700, 1.3, 'bp');
    for (let i = 0; i < lap.length; i++) {
      const tt = i / SR;
      lap[i] *= Math.min(1, tt / 0.09) * Math.exp(-tt / 0.22);
    }
    place(AMB, t, lap, db(-37) * openAt(t), (R() - 0.5) * 1.4, 0.1);
  }

  // peek: three tiny curious rising notes; hops: soft "hup"s
  const [pk0, pk1] = ev.peek;
  [M.A5, M.B5, M.D6].forEach((m, k) => {
    const f = hz(m);
    const t0 = pk0 + 0.12 + k * 0.1;
    const b = tone(0.3, (tt) => Math.sin(TAU * f * (tt + 0.03 * (1 - Math.exp(-tt / 0.05)))) * env(tt, 0.006, 0.07));
    place(SFX, t0, b, db(-36), (k - 1) * 0.3, 0.25);
  });
  void pk1;
  ev.hops.forEach((h, k) => {
    const hup = tone(0.12, (tt) => Math.sin(TAU * (420 + 520 * (1 - Math.exp(-tt / 0.03))) * tt) * env(tt, 0.003, 0.03));
    place(SFX, h.t, hup, db(-34), h.x * 1.2, 0.15);
  });
}

// ---------------------------------------------------------------- the water: plips (tonal drops) + ripple shimmer
function plip(f, size = 1) {
  const len = 0.9;
  return tone(len, (tt) => {
    const sweep = f * (0.62 + 0.38 * (1 - Math.exp(-tt / 0.018)));
    const drop = Math.sin(TAU * sweep * tt) * env(tt, 0.0012, 0.045 * size);
    const ring = Math.sin(TAU * f * 2 * tt) * 0.22 * env(tt, 0.01, 0.35);
    const splash = (R() * 2 - 1) * Math.exp(-tt / 0.004) * 0.25;
    return drop + ring + splash;
  });
}
{
  // hero dots land on a B-minor colour (the phrase is on B4/A4 there)
  const hero = [M.D6, M.Fs6, M.B6];
  ev.ripples.slice(0, 3).forEach((r, k) => {
    const p = plip(hz(hero[k]));
    filt(p, biq('hp', 300, 0.7));
    place(SFX, r.t, p, db(-25), r.x * 1.3, 0.35);
  });
  // the windows that answer: the terminal (A5, glassy FM) and the round one (C#6, warm marimba)
  const fmBell = (f, len, idx, ratio, tau) =>
    tone(len, (tt) => Math.sin(TAU * f * tt + idx * Math.exp(-tt / 0.4) * Math.sin(TAU * f * ratio * tt)) * env(tt, 0.004, tau));
  const marimba = (f, len) =>
    tone(len, (tt) => (Math.sin(TAU * f * tt) * env(tt, 0.002, 0.9) + 0.35 * Math.sin(TAU * f * 3.98 * tt) * env(tt, 0.001, 0.06) + 0.12 * Math.sin(TAU * f * 9.9 * tt) * env(tt, 0.001, 0.02)));
  const [term, orb] = ev.feats;
  const pTerm = -0.55;
  const pOrb = -0.8;
  place(MUS, term.seam + 0.05, fmBell(hz(M.A5), 4.5, 1.6, 2.0, 1.6), db(-26), pTerm, 0.55);
  place(MUS, term.seam + 0.05, fmBell(hz(M.A4), 4.5, 0.6, 1.0, 2.0), db(-33), pTerm, 0.4);
  place(MUS, orb.seam + 0.05, marimba(hz(M.Cs6), 4.0), db(-25), pOrb, 0.55);
  place(MUS, orb.seam + 0.05, marimba(hz(M.Cs5), 4.0), db(-32), pOrb, 0.45);
  // their door swings: a soft breath each
  for (const w of ev.feats) {
    const br = svf(noiseArr(1.2), (i) => 900 * Math.exp(-i / (0.5 * SR)) + 300, 0.9, 'lp');
    for (let i = 0; i < br.length; i++) br[i] *= Math.min(1, i / (0.08 * SR)) * Math.exp(-i / (0.35 * SR));
    place(SFX, w.door[0], br, db(-36), w.kind === 'orb' ? pOrb : pTerm, 0.4);
  }
  // their dots land, further away (smaller, wetter)
  const termNotes = [M.E6, M.A6, M.Cs7];
  const orbNotes = [M.A5, M.Cs6, M.E6];
  ev.ripples.slice(3).forEach((r, k) => {
    const isOrb = k >= 3;
    const notes = isOrb ? orbNotes : termNotes;
    const p = plip(hz(notes[k % 3]), 0.8);
    filt(p, biq('hp', 400, 0.7));
    filt(p, biq('lp', 7000, 0.7));
    place(SFX, r.t, p, db(-33), isOrb ? pOrb : pTerm, 0.6);
  });
}

// ---------------------------------------------------------------- VO
function readWav(file) {
  const b = fs.readFileSync(file);
  let o = 12, ch = 2, bits = 16, dataOff = 0, dataLen = 0;
  while (o < b.length) {
    const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); bits = b.readUInt16LE(o + 22); }
    if (id === 'data') { dataOff = o + 8; dataLen = len; break; }
    o += 8 + len + (len & 1);
  }
  const n = dataLen / (bits / 8) / ch;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < ch; c++) s += b.readInt16LE(dataOff + (i * ch + c) * 2) / 32768;
    mono[i] = s / ch;
  }
  return mono;
}
function processVo(x) {
  filt(x, biq('hp', 85, 0.707));
  filt(x, biq('peak', 280, 1.0, -2.5));
  filt(x, biq('peak', 3200, 0.9, 2.0));
  filt(x, biq('hs', 10000, 0.707, 1.5));
  const at = Math.exp(-1 / (0.004 * SR)), rt = Math.exp(-1 / (0.09 * SR));
  let lev = -120;
  for (let i = 0; i < x.length; i++) {
    const l = 20 * Math.log10(Math.abs(x[i]) + 1e-9);
    lev = l > lev ? at * lev + (1 - at) * l : rt * lev + (1 - rt) * l;
    const over = lev - -26;
    if (over > 0) x[i] *= db(-over * (1 - 1 / 3.0));
  }
  return x;
}
const speechRms = (x) => {
  let s = 0, n = 0;
  for (let i = 0; i < x.length; i += 480) {
    let e = 0;
    for (let j = i; j < Math.min(x.length, i + 480); j++) e += x[j] * x[j];
    e = Math.sqrt(e / 480);
    if (e > db(-45)) { s += e * e; n++; }
  }
  return Math.sqrt(s / Math.max(1, n));
};
function limitMono(x, gain, ceilDb, laMs, relMs) {
  const ceil = db(ceilDb), LA = Math.round(laMs * 0.001 * SR), n = x.length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) need[i] = Math.min(1, ceil / Math.max(1e-9, Math.abs(x[i] * gain)));
  const rel = 1 - Math.exp(-1 / (relMs * 0.001 * SR)), att = 1 - Math.exp(-1 / (0.0008 * SR));
  let g = 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = need[i];
    for (let j = 1; j <= LA && i + j < n; j += 4) m = Math.min(m, need[i + j]);
    g += (m - g) * (m < g ? att : rel);
    g = Math.min(g, need[i]);
    out[i] = x[i] * gain * g;
  }
  return out;
}
const files = {};
for (const v of ev.vo) if (!files[v.file]) files[v.file] = processVo(readWav(path.join(AUDIO, `${v.file}.wav`)));
const segs = ev.vo.map((v) => {
  const x = files[v.file];
  const a = Math.round(v.src[0] * SR);
  const b = Math.min(x.length, Math.round(v.src[1] * SR));
  const seg = x.slice(a, b);
  const fi = Math.round(0.008 * SR), fo = Math.round(0.03 * SR);
  for (let i = 0; i < fi; i++) seg[i] *= i / fi;
  for (let i = 0; i < fo; i++) seg[seg.length - 1 - i] *= i / fo;
  return {...v, x: seg};
});
const voGain = db(-16) / speechRms(Float32Array.from(segs.flatMap((s) => Array.from(s.x))));
for (const s of segs) {
  const y = limitMono(s.x, voGain, -3, 4, 60);
  const s0 = Math.round((s.at - s.speech) * SR);
  for (let j = 0; j < y.length; j++) {
    const i = s0 + j;
    if (i < 0 || i >= N) continue;
    VOX.L[i] += y[j];
    VOX.R[i] += y[j];
    // the voice gets a little air once the world opens
    add(REV, i, y[j] * (0.03 + 0.05 * openAt(i / SR)));
  }
}

// ---------------------------------------------------------------- reverb (Freeverb)
function freeverb(inL, inR, room = 0.86, damp = 0.32) {
  const scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((v) => Math.round(v * scale));
  const apT = [556, 441, 341, 225].map((v) => Math.round(v * scale));
  const fb = room * 0.28 + 0.7, d1 = damp * 0.4, d2 = 1 - d1;
  const mono = new Float32Array(N);
  for (let i = 0; i < N; i++) mono[i] = (inL[i] + inR[i]) * 0.015;
  const run = (off) => {
    const combs = combT.map((t) => ({buf: new Float32Array(t + off), idx: 0, store: 0}));
    const aps = apT.map((t) => ({buf: new Float32Array(t + off), idx: 0}));
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (const c of combs) {
        const y = c.buf[c.idx];
        c.store = y * d2 + c.store * d1;
        c.buf[c.idx] = mono[i] + c.store * fb;
        if (++c.idx >= c.buf.length) c.idx = 0;
        s += y;
      }
      for (const a of aps) {
        const b = a.buf[a.idx];
        const y = -s + b;
        a.buf[a.idx] = s + b * 0.5;
        if (++a.idx >= a.buf.length) a.idx = 0;
        s = y;
      }
      out[i] = s;
    }
    return out;
  };
  return {L: run(0), R: run(Math.round(23 * scale))};
}
const rv = freeverb(REV.L, REV.R);

// ---------------------------------------------------------------- mix: duck the bed under VO, sum, limit
const duck = new Float32Array(N);
{
  const at = Math.exp(-1 / (0.015 * SR)), rt = Math.exp(-1 / (0.3 * SR));
  let e = 0;
  for (let i = 0; i < N; i++) {
    const x = Math.abs(VOX.L[i]);
    e = x > e ? at * e + (1 - at) * x : rt * e + (1 - rt) * x;
    duck[i] = Math.min(1, e / 0.06);
  }
}
const OUT = bus();
const WET = 0.8;
const GP = db(-3);
for (let i = 0; i < N; i++) {
  const gm = 1 - 0.5 * duck[i], gs = 1 - 0.4 * duck[i];
  OUT.L[i] = VOX.L[i] + (PNO.L[i] * GP + MUS.L[i]) * gm + SFX.L[i] * gs + rv.L[i] * WET * (1 - 0.3 * duck[i]) + AMB.L[i];
  OUT.R[i] = VOX.R[i] + (PNO.R[i] * GP + MUS.R[i]) * gm + SFX.R[i] * gs + rv.R[i] * WET * (1 - 0.3 * duck[i]) + AMB.R[i];
}
const lv = (x) => 20 * Math.log10(x + 1e-12);
{
  const r = (b, a, z, g) => {
    let e = 0, n = 0;
    for (let i = Math.round(a * SR); i < Math.min(N, Math.round(z * SR)); i++) {
      const k = g ? g(i) : 1;
      e += (b.L[i] * k) ** 2 + (b.R[i] * k) ** 2;
      n += 2;
    }
    return lv(Math.sqrt(e / n)).toFixed(1);
  };
  for (const v of ev.vo) {
    const a0 = v.at, z0 = v.at + v.dur;
    console.log(`[diag] ${v.id} ${a0.toFixed(2)}-${z0.toFixed(2)}s: VO ${r(VOX, a0, z0)} | PNO ${r(PNO, a0, z0, (i) => GP * (1 - 0.5 * duck[i]))} | MUS ${r(MUS, a0, z0, (i) => 1 - 0.5 * duck[i])} | SFX ${r(SFX, a0, z0, (i) => 1 - 0.4 * duck[i])} | REV ${r(rv, a0, z0, (i) => WET * (1 - 0.3 * duck[i]))} | AMB ${r(AMB, a0, z0)}`);
  }
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(OUT.L[i]), Math.abs(OUT.R[i]));
  console.log(`[diag] pre-limiter peak ${lv(pk).toFixed(1)} dBFS, voGain ${lv(voGain).toFixed(1)} dB, hang ${HANG2.toFixed(2)}s`);
}
filt(OUT.L, biq('hp', 25, 0.707));
filt(OUT.R, biq('hp', 25, 0.707));
{
  const ceil = db(-1), LA = Math.round(0.003 * SR);
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) need[i] = Math.min(1, ceil / Math.max(1e-9, Math.abs(OUT.L[i]), Math.abs(OUT.R[i])));
  const win = new Float32Array(N);
  for (let i = N - 1; i >= 0; i--) {
    let m = need[i];
    for (let j = 1; j <= LA && i + j < N; j += 8) m = Math.min(m, need[i + j]);
    win[i] = m;
  }
  const att = 1 - Math.exp(-1 / (0.001 * SR)), rel = 1 - Math.exp(-1 / (0.08 * SR));
  let g = 1;
  for (let i = 0; i < N; i++) {
    const tgt = Math.min(win[i], need[i]);
    g += (tgt - g) * (tgt < g ? att : rel);
    g = Math.min(g, need[i]);
    OUT.L[i] *= g;
    OUT.R[i] *= g;
  }
}
// fades with the picture
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const f = Math.min(1, t / 0.25, Math.max(0, (DUR - t) / (ev.fadeOut[1] - ev.fadeOut[0])));
  OUT.L[i] *= f;
  OUT.R[i] *= f;
}

// ---------------------------------------------------------------- write 16-bit WAV (TPDF dither)
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
let clip = 0;
for (let i = 0; i < N; i++) {
  for (const [c, arr] of [[0, OUT.L], [1, OUT.R]]) {
    const v = Math.round(arr[i] * 32767 + (R() - R()));
    if (v > 32767 || v < -32768) clip++;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * 4 + c * 2);
  }
}
const dest = path.join(AUDIO, 'sample-mix.wav');
fs.writeFileSync(dest, out);
let pk = 0, ss = 0;
for (let i = 0; i < N; i++) { pk = Math.max(pk, Math.abs(OUT.L[i]), Math.abs(OUT.R[i])); ss += OUT.L[i] ** 2 + OUT.R[i] ** 2; }
const seg = [];
for (let s = 0; s < DUR; s += 1) {
  let e = 0, n = 0;
  for (let i = Math.round(s * SR); i < Math.min(N, Math.round((s + 1) * SR)); i++) { e += OUT.L[i] ** 2 + OUT.R[i] ** 2; n += 2; }
  seg.push(`${s}:${lv(Math.sqrt(e / n)).toFixed(0)}`);
}
console.log(`wrote ${path.relative(root, dest)} ${DUR}s ${SR}Hz stereo`);
console.log(`peak ${lv(pk).toFixed(1)} dBFS, rms ${lv(Math.sqrt(ss / (2 * N))).toFixed(1)} dBFS, clipped samples ${clip}`);
console.log('rms per 1s:', seg.join(' '));
