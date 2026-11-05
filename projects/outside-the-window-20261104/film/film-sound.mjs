// Sound design + score + mix for the full "Outside the Window" concept film (84.3 s). B1–B2 = the approved sample's sound.
// Everything is synthesized here (no third-party audio) and timed from the same sampleLayout.ts the picture uses.
// The score is "half a song": a piano phrase that stops on an unresolved note. Inside the window it is muffled;
// the door opens the filter, the sea and a long reverb. Two other windows answer the hanging note (A, then C#),
// so the three AIs on the water spell an A-major chord that is still waiting to resolve.
// VO = Edge TTS en-US-AndrewNeural (-12 %) cut into sentences, EQ'd, compressed and limited.
// Usage: node projects/outside-the-window-20261104/film/film-sound.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const SLUG = 'outside-the-window-20261104';
const lay = await import(pathToFileURL(path.join(root, `src/projects/${SLUG}/film/filmLayout.ts`)).href);
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
  ev.ripples.slice(3, 9).forEach((r, k) => {
    const isOrb = k >= 3;
    const notes = isOrb ? orbNotes : termNotes;
    const p = plip(hz(notes[k % 3]), 0.8);
    filt(p, biq('hp', 400, 0.7));
    filt(p, biq('lp', 7000, 0.7));
    place(SFX, r.t, p, db(-33), isOrb ? pOrb : pTerm, 0.6);
  });
}


// ================================================================= film · B3–B8
const TT = ev.T; // every timeline key, in seconds
const BEAT = 0.6; // 100 bpm: the lighthouse, the groove
const G0 = TT.crystal; // cycle 1 of the full song starts on the crystal (the first resolution)
// ---- instruments
function hum(midi, vel, hold) {
  const f0 = hz(midi), len = hold + 0.9, n = Math.round(len * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * f0 * (1 + 0.0035 * Math.sin(TAU * 5.1 * t) * Math.min(1, t / 0.4))) / SR;
    const a = Math.min(1, t / 0.07) * (t > hold ? Math.exp(-(t - hold) / 0.25) : 1);
    out[i] = (Math.sin(ph) + 0.32 * Math.sin(2 * ph + 0.3) + 0.1 * Math.sin(3 * ph + 1.1)) * a * vel;
  }
  return out;
}
function ks(midi, vel, len = 2.5, bright = 0.5) {
  const f = hz(midi), P = Math.max(2, Math.round(SR / f)), n = Math.round(len * SR), out = new Float32Array(n);
  const buf = new Float32Array(P);
  let lp = 0;
  for (let i = 0; i < P; i++) {
    lp += (noise() - lp) * (0.2 + 0.7 * bright);
    buf[i] = lp * vel;
  }
  let idx = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    buf[idx] = 0.9965 * 0.5 * (cur + prev);
    prev = cur;
    idx = (idx + 1) % P;
    out[i] = cur;
  }
  for (let i = 0; i < Math.min(n, 96); i++) out[i] *= i / 96;
  return out;
}
function gliss(f0, f1, len) {
  const n = Math.round(len * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    ph += (TAU * f0 * Math.pow(f1 / f0, u)) / SR;
    out[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.2)), 2);
  }
  return out;
}
const fmBell2 = (f, len, idx, ratio, tau) => tone(len, (tt) => Math.sin(TAU * f * tt + idx * Math.exp(-tt / 0.4) * Math.sin(TAU * f * ratio * tt)) * env(tt, 0.004, tau));
const marimba2 = (f, len = 1.6) => tone(len, (tt) => Math.sin(TAU * f * tt) * env(tt, 0.002, 0.7) + 0.35 * Math.sin(TAU * f * 3.98 * tt) * env(tt, 0.001, 0.06) + 0.12 * Math.sin(TAU * f * 9.9 * tt) * env(tt, 0.001, 0.02));
const celesta = (midi, vel, len = 2.2) => {
  const f = hz(midi);
  return tone(len, (tt) => (Math.sin(TAU * f * tt) + 0.42 * Math.sin(TAU * f * 4 * tt) * Math.exp(-tt / 0.12) + 0.15 * Math.sin(TAU * f * 7.1 * tt) * Math.exp(-tt / 0.05)) * env(tt, 0.002, 0.7) * vel);
};
function padChord(t0, len, midis, gainDb, cutoff, o = {}) {
  const att = o.att ?? 1.0, rel = o.rel ?? 1.2, send = o.send ?? 0.35, cutFn = o.cutFn;
  const n = Math.round((len + rel) * SR);
  const L = new Float32Array(n), Rr = new Float32Array(n);
  for (const m of midis) {
    const f = hz(m);
    for (let v = 0; v < 3; v++) {
      const det = 1 + (v - 1) * 0.0035;
      const a = (((v - 1) * 0.6 + 1) * Math.PI) / 4;
      const cl = Math.cos(a) * 0.5, cr = Math.sin(a) * 0.5;
      let ph = R();
      for (let i = 0; i < n; i++) {
        ph += (f * det) / SR;
        if (ph >= 1) ph -= 1;
        const saw = 2 * ph - 1;
        L[i] += saw * cl;
        Rr[i] += saw * cr;
      }
    }
  }
  const fc = (i) => (cutFn ? cutFn(t0 + i / SR) : cutoff);
  const fl = svf(L, fc, 0.7, 'lp'), fr = svf(Rr, fc, 0.7, 'lp');
  const g = db(gainDb) / Math.sqrt(midis.length * 3);
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = Math.min(1, t / att) * (t > len ? Math.exp(-(t - len) / (rel / 3)) : 1);
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    MUS.L[k] += fl[i] * g * e;
    MUS.R[k] += fr[i] * g * e;
    REV.L[k] += fl[i] * g * e * send;
    REV.R[k] += fr[i] * g * e * send;
  }
}
function choirChord(t0, len, midis, gainDb) {
  // saws through three "ah" formants, a slow vibrato
  const n = Math.round((len + 1.5) * SR);
  const x = new Float32Array(n);
  for (const m of midis) {
    const f = hz(m);
    let ph = R();
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      ph += (f * (1 + 0.004 * Math.sin(TAU * 4.7 * t + m))) / SR;
      if (ph >= 1) ph -= 1;
      x[i] += 2 * ph - 1;
    }
  }
  const f1 = filt(Float32Array.from(x), biq('bp', 730, 3)), f2 = filt(Float32Array.from(x), biq('bp', 1150, 4)), f3 = filt(Float32Array.from(x), biq('bp', 2700, 6));
  const g = db(gainDb) / Math.sqrt(midis.length);
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 1.4) * (t > len ? Math.exp(-(t - len) / 0.5) : 1);
    const v = (f1[i] + 0.6 * f2[i] + 0.25 * f3[i]) * g * e;
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    add(MUS, k, v, Math.sin(t * 0.7) * 0.3);
    add(REV, k, v * 0.6, 0);
  }
}
// drums
const kick = (vel = 1) => tone(0.5, (t) => Math.sin(TAU * (45 * t + (120 - 45) * 0.035 * (1 - Math.exp(-t / 0.035)))) * env(t, 0.002, 0.16) * vel + (R() * 2 - 1) * Math.exp(-t / 0.002) * 0.25 * vel);
const snare = (vel = 1) => {
  const nz = svf(noiseArr(0.25), () => 2300, 0.8, 'bp');
  return tone(0.25, (t, i) => (nz[i] * 1.5 * Math.exp(-t / 0.075) + Math.sin(TAU * 190 * t) * Math.exp(-t / 0.05) * 0.45) * vel);
};
const hat = (vel = 1, open = false) => {
  const len = open ? 0.35 : 0.08;
  const nz = svf(noiseArr(len), () => 8500, 0.7, 'hp');
  return tone(len, (t, i) => nz[i] * Math.exp(-t / (open ? 0.12 : 0.018)) * vel);
};
const shaker = (vel = 1) => {
  const nz = svf(noiseArr(0.09), () => 6000, 1.2, 'bp');
  return tone(0.09, (t, i) => nz[i] * Math.sin(Math.PI * Math.min(1, t / 0.09)) * vel);
};
const tom = (midi, vel = 1) => {
  const f = hz(midi);
  return tone(0.7, (t) => Math.sin(TAU * f * (t + 0.6 * 0.03 * (1 - Math.exp(-t / 0.03)))) * env(t, 0.002, 0.24) * vel);
};
const crash = (vel = 1) => {
  const nz = svf(noiseArr(2.2), () => 5200, 0.6, 'hp');
  return tone(2.2, (t, i) => nz[i] * env(t, 0.003, 0.65) * vel);
};
const bassNote = (midi, vel, hold) => {
  const f = hz(midi);
  return tone(hold + 0.3, (t) => {
    const a = Math.min(1, t / 0.01) * (t > hold ? Math.exp(-(t - hold) / 0.08) : 1) * (0.75 + 0.25 * Math.exp(-t / 0.25));
    return Math.tanh((Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) + 0.08 * Math.sin(TAU * 3 * f * t)) * 1.2) * a * vel;
  });
};
const subBoom = (f, len, tau) => tone(len, (t) => Math.sin(TAU * f * t) * env(t, 0.01, tau));
const brightPiano = (midi, vel, hold, t0, gainDb, pan = 0, send = 0.3) => place(MUS, t0, piano(midi, vel, hold), db(gainDb), pan, send);

// ---------------------------------------------------------------- B3 · the thread (the A chord from B2 still hangs)
padChord(TT.thread - 0.4, TT.cut3c - TT.thread + 1.2, [45, 52, 57, 61, 64], -34, 1500, {att: 1.5});
place(MUS, TT.thread, ks(57, 0.9, 3.5, 0.6), db(-23), 0.1, 0.45);
place(MUS, TT.thread + 0.05, gliss(880, 1760, 2.2), db(-37), 0, 0.55);
[81, 85, 88].forEach((m, k) => place(MUS, TT.cut3b + 0.5 + k * 0.42, ks(m, 0.7, 2.5, 0.7), db(-31), (k - 1) * 0.5, 0.5));
// "…is always you": a warm swell on the light
place(MUS, TT.you - 0.15, hum(64, 0.55, 1.9), db(-29), 0, 0.5);
place(MUS, TT.you - 0.1, hum(69, 0.45, 1.9), db(-30), 0, 0.5);
place(MUS, TT.you, fmBell2(hz(76), 3.5, 0.8, 2.0, 1.4), db(-31), 0, 0.6);

// ---------------------------------------------------------------- B4a · the private things; the half melody leaves as a ribbon; the lantern
padChord(TT.cut3c - 0.3, TT.lapse[0] - TT.cut3c + 0.6, [43, 50, 55, 59, 62], -35, 1300, {att: 1.6});
[81, 86, 88, 90].forEach((m, k) => place(MUS, TT.melody[0] + 0.1 + [0, 0.31, 0.93, 1.24][k], celesta(m, 0.8), db(-31), 0.4 - k * 0.15, 0.5));
for (let k = 0; k < 10; k++) place(MUS, TT.melody[0] + 1.4 + k * 0.09, celesta([86, 88, 90, 93, 95][k % 5] + 12 * (k % 2), 0.5, 0.8), db(-40 + k * 0.3), 0.3 - k * 0.05, 0.6);
// the lantern blooms, and hums the half song
place(MUS, TT.lantern[0] + 0.1, hum(62, 0.45, 1.3), db(-31), 0, 0.5);
place(MUS, TT.lantern[0] + 0.2, hum(69, 0.4, 1.2), db(-32), 0, 0.5);
place(MUS, TT.lantern[0] + 0.3, hum(74, 0.35, 1.1), db(-33), 0, 0.5);
place(MUS, TT.lantern[1] - 0.6, fmBell2(hz(81), 3, 1.0, 2.0, 1.2), db(-31), 0, 0.5);
for (const h of ev.hums) for (const [b, m, d, v] of ev.phrase) place(MUS, h.start + b * h.beat, hum(m, v, d * h.beat * (b > 9 ? 0.7 : 1)), db(-24), -0.15, 0.45);
// home: three little hops back in
for (let k = 0; k < 3; k++) {
  const f = hz([86, 90, 93][k]);
  place(SFX, TT.home[0] + 0.12 + k * 0.1, tone(0.12, (tt) => Math.sin(TAU * (f * 0.7 + f * 0.3 * (1 - Math.exp(-tt / 0.03))) * tt) * env(tt, 0.003, 0.03)), db(-36), 0.2, 0.2);
}

// ---------------------------------------------------------------- B4c · days go by (the pad follows the light), someone says no
{
  const dayAt = (t) => ev.dayAt(t);
  padChord(TT.lapse[0] - 0.2, TT.lapse[1] - TT.lapse[0] + 0.2, [43, 50, 57, 59, 64], -31, 900, {att: 0.8, cutFn: (t) => {
    const k = dayAt(t);
    return 380 + 2600 * k.day + 900 * k.dusk;
  }});
  // daylight air over the water
  const len = TT.lapse[1] - TT.lapse[0];
  const air = svf(noiseArr(len), () => 1500, 0.6, 'bp');
  for (let i = 0; i < air.length; i += 1) {
    const t = TT.lapse[0] + i / SR;
    const k = i % 480 === 0 ? dayAt(t) : null;
    if (k) air._g = 0.3 + 0.9 * k.day + 0.5 * k.dusk;
    add(AMB, Math.round(t * SR), air[i] * db(-46) * (air._g ?? 0.3), Math.sin(t * 0.3) * 0.4);
  }
  // other people's lanterns come and go
  const pent = [93, 95, 98, 100, 102];
  ev.lanternsLapse.forEach((t, k) => place(MUS, t, celesta(pent[k % 5], 0.5, 1.4), db(-41), (k % 2 ? 0.5 : -0.5) * Math.random(), 0.6));
  // the one who looks, and says no
  const [r0, r1] = TT.refuse;
  place(MUS, r0 - 0.4, marimba2(hz(78)), db(-31), 0.55, 0.35);
  place(MUS, r0 - 0.05, marimba2(hz(81)), db(-31), 0.5, 0.35);
  place(MUS, TT.askUp[0], gliss(600, 1250, TT.askUp[1] - TT.askUp[0] + 0.2), db(-34), 0.45, 0.5);
  place(MUS, TT.askUp[1] + 0.1, marimba2(hz(78)), db(-32), 0.45, 0.4);
  place(MUS, TT.askUp[1] + 0.42, marimba2(hz(75)), db(-33), 0.45, 0.4); // a soft, slightly off "no"
  place(SFX, TT.nod, celesta(83, 0.5, 0.6), db(-37), 0.45, 0.3);
  place(MUS, r1 - 0.3, marimba2(hz(81)), db(-37), 0.65, 0.6);
  place(MUS, r1 + 0.1, marimba2(hz(78)), db(-39), 0.7, 0.7);
}

// ---------------------------------------------------------------- B4d · a far round window lights a lighthouse; its drumbeat; the lantern flares
{
  place(SFX, TT.beacon, subBoom(55, 1.2, 0.35), db(-23), -0.3, 0.2);
  place(MUS, TT.beacon, gliss(220, 440, 0.6), db(-33), -0.3, 0.4);
  place(MUS, TT.beacon + 0.05, fmBell2(hz(69), 3, 0.9, 2.0, 1.2), db(-29), -0.3, 0.5);
  // the first beats at the lighthouse, heard over the water (muffled)
  for (const t of [ev.rings[0].t0, ev.rings[0].t0 + BEAT]) {
    const kk = kick(1);
    const tm = tom(45, 0.7);
    filt(kk, biq('lp', 900, 0.7));
    filt(tm, biq('lp', 900, 0.7));
    place(MUS, t, kk, db(-21), -0.5, 0.3);
    place(MUS, t, tm, db(-27), -0.5, 0.4);
  }
  // the resonance: melody and drums lock for the first time
  const F = TT.flare;
  place(MUS, F, kick(1), db(-17), 0, 0.2);
  place(MUS, F, crash(0.8), db(-25), 0, 0.4);
  place(MUS, F, subBoom(55, 1.6, 0.5), db(-21), 0, 0.1);
  [81, 88, 93].forEach((m, k) => place(MUS, F + k * 0.012, fmBell2(hz(m), 3.5, 1.2, 2.0, 1.6), db(-25 - k * 2), (k - 1) * 0.3, 0.55));
  [[0, 69, 0.5], [0.5, 74, 1.0], [1.5, 76, 0.5], [2.0, 78, 1.5]].forEach(([b, m, d]) => brightPiano(m, 0.72, d * BEAT, F + b * BEAT, -19, 0.05, 0.3));
  [[0, 50], [0.5, 57]].forEach(([b, m]) => brightPiano(m, 0.55, 1.4, F + b * BEAT + 0.01, -23, -0.1, 0.3));
  for (let k = 0; k < 3; k++) place(MUS, F + k * BEAT, kick(0.9), db(-19), 0, 0.15);
  place(MUS, F + BEAT, snare(0.8), db(-25), 0.1, 0.25);
  for (let k = 0; k < 6; k++) place(MUS, F + k * BEAT * 0.5, hat(k % 2 ? 0.5 : 0.8), db(-34), 0.3, 0.1);
  // they wake, and rush out
  [86, 90, 93].forEach((m, k) => place(SFX, TT.wake + k * 0.05, celesta(m, 0.7, 0.6), db(-31), 0, 0.3));
  const wl = TT.rush[1] - TT.rush[0] + 0.3;
  const w = svf(noiseArr(wl), (i) => 600 + 4000 * (i / (wl * SR)), 1.2, 'bp');
  for (let i = 0; i < w.length; i++) w[i] *= Math.sin(Math.PI * (i / w.length));
  place(SFX, TT.rush[0], w, db(-30), -0.2, 0.3);
}

// ---------------------------------------------------------------- B5 · they meet; two strings, plucked in turn: a perfect fifth
{
  padChord(TT.cutB5 - 0.1, TT.cutB6 - TT.cutB5, [45, 52, 57, 64], -35, 1100, {att: 1.2});
  for (const [t0, pan] of [[TT.arrive[0], -0.6], [TT.arrive[0] + 0.15, 0.6]]) {
    const l = 1.3;
    const g = svf(noiseArr(l), (i) => 400 + 900 * Math.sin(Math.PI * (i / (l * SR))), 1.0, 'bp');
    for (let i = 0; i < g.length; i++) g[i] *= Math.sin(Math.PI * (i / g.length));
    place(SFX, t0, g, db(-36), pan, 0.3);
  }
  place(MUS, TT.pluck, ks(45, 0.8, 3, 0.4), db(-26), -0.2, 0.4);
  place(MUS, TT.pluck + 0.02, ks(52, 0.8, 3, 0.4), db(-26), 0.2, 0.4);
  place(MUS, TT.pluck + 0.05, gliss(440, 880, TT.dLight - TT.pluck), db(-38), -0.3, 0.5);
  place(MUS, TT.pluck + 0.05, gliss(660, 1320, TT.dLight - TT.pluck), db(-38), 0.3, 0.5);
  // the drummer says yes (A); a beat later, the songwriter (E)
  place(MUS, TT.dLight, fmBell2(hz(69), 4, 0.9, 2.0, 1.8), db(-23), 0.3, 0.55);
  place(MUS, TT.dLight, ks(57, 0.8, 3, 0.6), db(-27), 0.3, 0.45);
  place(MUS, TT.hLight, fmBell2(hz(76), 4, 0.9, 2.0, 1.8), db(-23), -0.3, 0.55);
  place(MUS, TT.hLight, ks(64, 0.8, 3, 0.6), db(-27), -0.3, 0.45);
  place(MUS, TT.down[0] + 0.05, gliss(2640, 880, TT.down[1] - TT.down[0]), db(-37), 0, 0.6);
  padChord(TT.bridge[0], TT.cutB6 - TT.bridge[0] + 0.2, [57, 61, 64, 69], -31, 2200, {att: 0.9, rel: 0.6});
}

// ---------------------------------------------------------------- B6–B7 · the song, finished together; then every crystal adds a voice
// cycle beats: question 0–9 (D Bm G A), answer 10–16 (A G A → D on the next downbeat)
const ANSWER = [[10, 76, 0.5], [10.5, 78, 0.5], [11, 81, 1.5], [12.5, 79, 0.5], [13, 78, 1], [14, 76, 1], [15, 73, 1]];
const chordAt = (b) => {
  const k = ((b % 16) + 16) % 16;
  if (k < 4) return {root: 38, tones: [50, 54, 57, 62]};
  if (k < 6) return {root: 35, tones: [47, 50, 54, 59]};
  if (k < 8) return {root: 31, tones: [43, 50, 55, 59]};
  if (k < 12) return {root: 33, tones: [45, 52, 57, 61]};
  if (k < 14) return {root: 31, tones: [43, 50, 55, 59]};
  return {root: 33, tones: [45, 52, 57, 61]};
};
const END = TT.cutB8; // the groove stops on the cut home
{
  const b0 = Math.round((TT.cutB6 - G0) / BEAT); // -6
  const bEnd = Math.round((END - G0) / BEAT);
  for (let b = b0; b < bEnd; b++) {
    const t = G0 + b * BEAT;
    const inB7 = t >= TT.crane[0];
    const full = t >= G0 - 0.01;
    const build = clamp01((t - TT.crane[0]) / (END - TT.crane[0]));
    const k = ((b % 4) + 4) % 4;
    if (k === 0 || k === 2) place(MUS, t, kick(1), db(-19 + 1.5 * build), 0, 0.12);
    if (inB7 && k === 1 && b % 8 === 5) place(MUS, t + BEAT / 2, kick(0.7), db(-22), 0, 0.1);
    if (full && (k === 1 || k === 3)) place(MUS, t, snare(0.85), db(-24 + 1.5 * build), 0.08, 0.28);
    if (!full && (k === 1 || k === 3)) place(MUS, t, snare(0.5), db(-30), 0.08, 0.3);
    for (const h of [0, 0.5]) place(MUS, t + h * BEAT, hat(h ? 0.55 : 0.85, (b % 8 === 7 && h)), db(-33 + build), 0.35, 0.08);
    if (inB7) for (const s of [0.25, 0.75]) place(MUS, t + s * BEAT, shaker(0.6), db(-39 + 2 * build), -0.35, 0.1);
    // bass: root on each beat, octave pickups
    const ch = chordAt(b);
    place(MUS, t, bassNote(ch.root + (k === 3 ? 12 : 0), 0.85, BEAT * 0.8), db(-21), 0, 0.05);
    // tom fills at the end of each cycle
    const kc = ((b % 16) + 16) % 16;
    if (kc >= 14 && t > G0) for (let s = 0; s < 2; s++) place(MUS, t + s * BEAT * 0.5, tom(kc === 14 ? 50 - s * 3 : 45 - s * 3, 0.8), db(-25), (s - 0.5) * 0.6, 0.25);
    // chord pad, one per two beats
    if (k === 0 || k === 2) padChord(t, BEAT * 2, ch.tones, -33 + 4 * build, 1800 + 2200 * build, {att: 0.25, rel: 0.5, send: 0.3});
  }
  for (const t of [TT.cutB6, G0, G0 + 16 * BEAT]) place(MUS, t, crash(0.7), db(-26), 0, 0.4);
  // B6: the answer — the half song is finished for the first time, and lands on D with the crystal
  for (const [b, m, d] of ANSWER) {
    const t = G0 + (b - 16) * BEAT;
    brightPiano(m, 0.7, d * BEAT, t, -19, 0.05, 0.3);
    place(MUS, t, hum(m, 0.5, d * BEAT), db(-30), -0.1, 0.4);
  }
  // the crystal: D, at last
  brightPiano(74, 0.75, 2 * BEAT, G0, -18, 0, 0.35);
  [86, 90, 93, 98].forEach((m, k) => place(MUS, G0 + k * 0.015, fmBell2(hz(m), 4, 1.0, 2.0, 1.8), db(-23 - k * 1.5), (k - 1.5) * 0.3, 0.6));
  place(MUS, G0, subBoom(73.4, 2, 0.6), db(-20), 0, 0.1);
  for (let k = 0; k < 14; k++) place(MUS, G0 + 0.05 + k * 0.08 + Math.random() * 0.03, celesta([98, 100, 102, 105, 107][k % 5], 0.45, 0.9), db(-36), (Math.random() - 0.5) * 1.4, 0.6);
  // the braid while they play (B6 weave): a soft shimmering arpeggio
  for (let t = TT.weave[0]; t < G0 - 0.1; t += BEAT / 4) {
    const notes = [74, 78, 81, 83, 86];
    place(MUS, t, celesta(notes[Math.round((t - TT.weave[0]) / (BEAT / 4)) % 5] + 12, 0.35, 0.5), db(-38), Math.sin(t * 3) * 0.6, 0.5);
  }
  // cycles 1 and 2: the whole song over the groove
  const cycles = [G0, G0 + 16 * BEAT];
  cycles.forEach((c0, ci) => {
    for (const [b, m, d, v] of ev.phrase) {
      const t = c0 + b * BEAT;
      if (t >= END) continue;
      brightPiano(m, v + 0.1, Math.min(d, b > 9 ? 1 : d) * BEAT, t, -20 + ci, 0.05, 0.3);
      if (ci === 1) place(MUS, t, celesta(m + 12, 0.5, 1.2), db(-31), 0.3, 0.4);
    }
    for (const [b, m, d] of ANSWER) {
      const t = c0 + b * BEAT;
      if (t >= END - 0.05) continue;
      brightPiano(m, 0.72, d * BEAT, t, -20 + ci, 0.05, 0.3);
    }
  });
  // B7: strings and choir come in; every crystal adds a voice
  for (let b = Math.round((TT.crane[0] - G0) / BEAT); b < bEnd; b += 2) {
    const t = G0 + b * BEAT;
    const ch = chordAt(b);
    const build = clamp01((t - TT.crane[0]) / (END - TT.crane[0]));
    padChord(t, BEAT * 2, ch.tones.map((m) => m + 12), -32 + 5 * build, 3200, {att: 0.4, rel: 0.6, send: 0.45});
    if (t >= TT.crane[0] + 3.2) choirChord(t, BEAT * 2, ch.tones.slice(1).map((m) => m + 12), -34 + 6 * build);
  }
  const pent = [74, 76, 78, 81, 83];
  ev.crystalsB7.forEach((t, k) => {
    if (k % 4 !== 0 || t >= END) return;
    const q = G0 + Math.round((t - G0) / (BEAT / 4)) * (BEAT / 4);
    const m = pent[k % 5] + 12 * (1 + (k % 3 === 0 ? 1 : 0));
    place(MUS, q, celesta(m, 0.55, 1.3), db(-35), ((k * 37) % 100) / 50 - 1, 0.55);
  });
  // a descant over the last cycle
  [[0, 86], [2, 88], [4, 83], [6, 81], [8, 85]].forEach(([b, m]) => {
    const t = G0 + (16 + b) * BEAT;
    if (t < END) place(MUS, t, fmBell2(hz(m), 2.5, 0.7, 2.0, 1.2), db(-30), 0.4, 0.5);
  });
}

// ---------------------------------------------------------------- B8 · home; the last phrase, slowly; D on the title; then only the sea
{
  place(MUS, END, crash(0.9), db(-25), 0, 0.6);
  place(MUS, END, subBoom(73.4, 2.5, 0.8), db(-24), 0, 0.3);
  padChord(END, TT.title - END + 3, [50, 57, 64], -34, 1200, {att: 1.5, rel: 2.5});
  // the answer continues out of the cut, rubato, waiting before the last note
  [[74.4, 79], [75.1, 78], [75.75, 76], [77.3, 73]].forEach(([t, m]) => brightPiano(m, 0.6, 0.9, t, -21, 0.05, 0.4));
  padChord(77.2, TT.title - 77.2, [45, 52, 57, 61], -36, 900, {att: 1.0, rel: 0.4});
  // the warm pulse down the thread, the crystal handed up
  place(MUS, TT.warmDown[0], gliss(1760, 880, TT.warmDown[1] - TT.warmDown[0] + 0.1), db(-35), 0, 0.5);
  place(MUS, TT.warmDown[1], fmBell2(hz(86), 3, 0.8, 2.0, 1.4), db(-28), 0, 0.5);
  place(MUS, TT.crystalUp[0], gliss(880, 3520, TT.crystalUp[1] - TT.crystalUp[0] + 0.2), db(-35), 0, 0.6);
  for (let k = 0; k < 3; k++) {
    const f = hz([86, 90, 93][k]);
    place(SFX, TT.homeHop[0] + 0.15 + k * 0.1, tone(0.12, (tt) => Math.sin(TAU * (f * 0.7 + f * 0.3 * (1 - Math.exp(-tt / 0.03))) * tt) * env(tt, 0.003, 0.03)), db(-35), (k - 1) * 0.3, 0.2);
  }
  // the last note, on the title
  const T0 = TT.title;
  brightPiano(74, 0.62, 3.2, T0, -19, 0, 0.45);
  [38, 45, 54, 62].forEach((m, k) => brightPiano(m, 0.45, 3.2, T0 + 0.01 * k, -23, -0.1, 0.45));
  place(MUS, T0 + 0.02, fmBell2(hz(86), 4.5, 0.6, 2.0, 2.2), db(-30), 0.1, 0.6);
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

// ---------------------------------------------------------------- the mark: a golden thread writes it to the song's first notes; it settles on D
{
  const m0 = TT.mark[0], m1 = TT.mark[1], b1 = TT.base[1];
  place(MUS, m0, gliss(660, 1320, m1 - m0 + 0.2), db(-42), 0, 0.55);
  [[0.02, 81], [0.3, 86], [0.62, 88], [0.9, 90]].forEach(([k, m]) => place(MUS, m0 + (m1 - m0) * k, celesta(m, 0.7, 1.8), db(-35), (k - 0.5) * 0.8, 0.55));
  place(MUS, b1 - 0.05, fmBell2(hz(86), 4.5, 0.7, 2.0, 2.2), db(-32), 0, 0.6);
  place(MUS, b1 - 0.04, fmBell2(hz(90), 4.5, 0.6, 2.0, 2.0), db(-35), 0.2, 0.6);
  place(MUS, b1 - 0.03, fmBell2(hz(93), 4.5, 0.5, 2.0, 1.8), db(-37), -0.2, 0.6);
  place(MUS, b1, subBoom(73.4, 2.5, 0.9), db(-31), 0, 0.2);
  place(MUS, b1, piano(50, 0.45, 2.5), db(-32), 0, 0.5);
}

// ---------------------------------------------------------------- music level by section: the groove and the climax sit up, the last chord rings
{
  const TTm = ev.T;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let gdb = 0;
    gdb += 6.5 * smooth(clamp01((t - (TTm.cutB6 - 0.1)) / 0.3)) * (1 - smooth(clamp01((t - (TTm.cutB8 + 0.4)) / 1.2)));
    gdb += 2.5 * smooth(clamp01((t - 69.5) / 2.0)) * (1 - smooth(clamp01((t - (TTm.cutB8 + 0.4)) / 1.2)));
    gdb += 6 * smooth(clamp01((t - (TTm.title - 0.3)) / 0.4));
    if (gdb !== 0) {
      const g = db(gdb);
      MUS.L[i] *= g;
      MUS.R[i] *= g;
    }
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
  const gm = 1 - 0.68 * duck[i], gs = 1 - 0.4 * duck[i];
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
    console.log(`[diag] ${v.id} ${a0.toFixed(2)}-${z0.toFixed(2)}s: VO ${r(VOX, a0, z0)} | PNO ${r(PNO, a0, z0, (i) => GP * (1 - 0.68 * duck[i]))} | MUS ${r(MUS, a0, z0, (i) => 1 - 0.68 * duck[i])} | SFX ${r(SFX, a0, z0, (i) => 1 - 0.4 * duck[i])} | REV ${r(rv, a0, z0, (i) => WET * (1 - 0.3 * duck[i]))} | AMB ${r(AMB, a0, z0)}`);
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
const dest = path.join(AUDIO, 'film-mix.wav');
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
