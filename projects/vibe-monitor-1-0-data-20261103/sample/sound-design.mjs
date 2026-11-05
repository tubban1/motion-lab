// Sound design + final mix for the visual-first Vibe Monitor sample. Everything is synthesized here (no third-party audio),
// timed from the same cityLayout.ts the picture uses. VO = existing Edge TTS clips (vo-02, vo-03), EQ'd + compressed.
// Usage: node projects/vibe-monitor-1-0-data-20261103/sample/sound-design.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const SLUG = 'vibe-monitor-1-0-data-20261103';
const lay = await import(pathToFileURL(path.join(root, `src/projects/${SLUG}/sample/cityLayout.ts`)).href);
const {T, FPS, SAMPLE_FRAMES} = lay;
const ev = lay.soundEvents();
const AUDIO = path.join(root, `public/${SLUG}/audio`);

const SR = 48000;
const DUR = SAMPLE_FRAMES / FPS;
const N = Math.round(DUR * SR);
const sec = (f) => f / FPS;
const db = (d) => Math.pow(10, d / 20);
const TAU = Math.PI * 2;

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
const R = rng(4242);
const noise = () => R() * 2 - 1;
const bus = () => ({L: new Float32Array(N), R: new Float32Array(N)});
const VOX = bus();
const MUS = bus();
const SFX = bus();
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

// RBJ biquad
function biq(type, f0, Q, gainDb = 0) {
  const A = Math.pow(10, gainDb / 40);
  const w = (TAU * f0) / SR;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') [b0, b1, b2, a0, a1, a2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + al, -2 * cw, 1 - al];
  else if (type === 'hp') [b0, b1, b2, a0, a1, a2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al];
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
    const g = Math.tan((Math.PI * Math.min(fc(i), SR * 0.45)) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2;
  }
  return out;
}
const blep = (t, dt) => (t < dt ? ((t /= dt), t + t - t * t - 1) : t > 1 - dt ? ((t = (t - 1) / dt), t * t + t + t + 1) : 0);
const noiseArr = (len) => tone(len, () => noise());

// ---------------- read + process VO ----------------
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
  filt(x, biq('peak', 3200, 0.9, 2.5));
  filt(x, biq('hs', 10000, 0.707, 1.5));
  const at = Math.exp(-1 / (0.004 * SR)), rt = Math.exp(-1 / (0.09 * SR));
  let lev = -120;
  for (let i = 0; i < x.length; i++) {
    const l = 20 * Math.log10(Math.abs(x[i]) + 1e-9);
    lev = l > lev ? at * lev + (1 - at) * l : rt * lev + (1 - rt) * l;
    const over = lev - -26;
    if (over > 0) x[i] *= db(-over * (1 - 1 / 3.2));
  }
  return x;
}
const vo2 = processVo(readWav(path.join(AUDIO, 'vo-02.wav')));
const vo3 = processVo(readWav(path.join(AUDIO, 'vo-03.wav')));
// makeup: speech RMS (frames above -45 dB) -> -17.5 dBFS
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
const voGain = db(-16) / speechRms(new Float32Array([...vo2, ...vo3]));
// gentle look-ahead peak limiter on the voice itself (ceiling -3 dBFS after makeup)
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
const vo2L = limitMono(vo2, voGain, -3, 4, 60);
const vo3L = limitMono(vo3, voGain, -3, 4, 60);
for (const [arr, f] of [[vo2L, T.vo2], [vo3L, T.vo3]]) {
  const s0 = Math.round(sec(f) * SR);
  for (let j = 0; j < arr.length; j++) {
    const i = s0 + j;
    if (i >= N) break;
    VOX.L[i] += arr[j];
    VOX.R[i] += arr[j];
    add(REV, i, arr[j] * 0.06);
  }
}

// ---------------- music bed (written to picture) ----------------
const FREEZE = sec(T.freeze), IMPACT = sec(T.impact);
// A. drone 0 -> freeze, with a tape-stop at the freeze
{
  const len = FREEZE + 0.35;
  const ph = [0, 0, 0, 0];
  const freqs = [36.71, 73.42 * Math.pow(2, -5 / 1200), 73.42 * Math.pow(2, 5 / 1200), 110];
  const L = new Float32Array(Math.round(len * SR)), Rr = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const stop = t < FREEZE ? 1 : Math.max(0.08, Math.pow(1 - (t - FREEZE) / 0.3, 2));
    const amp = Math.min(1, t / 1.4) * (0.55 + 0.45 * (t / FREEZE)) * (t < FREEZE ? 1 : Math.max(0, 1 - (t - FREEZE) / 0.32));
    let l = 0, r = 0;
    for (let k = 0; k < 4; k++) {
      const f = freqs[k] * stop;
      ph[k] = (ph[k] + f / SR) % 1;
      const v = k === 0 ? Math.sin(TAU * ph[k]) * 1.2 : 2 * ph[k] - 1 - blep(ph[k], f / SR);
      if (k === 1) l += v; else if (k === 2) r += v; else { l += v * 0.7; r += v * 0.7; }
    }
    L[i] = l * amp;
    Rr[i] = r * amp;
  }
  const cut = (i) => 160 * Math.pow(650 / 160, Math.min(1, i / SR / FREEZE)) * (i / SR < FREEZE ? 1 : Math.max(0.3, 1 - (i / SR - FREEZE) / 0.3));
  const fl = svf(L, cut, 0.9, 'lp'), fr = svf(Rr, cut, 0.9, 'lp');
  for (let i = 0; i < fl.length; i++) {
    add(MUS, i, fl[i] * db(-23), -1);
    add(MUS, i, fr[i] * db(-23), 1);
  }
}
// D. riser under phrase 2/3, hard cut at the freeze (the silence is the effect)
{
  const t0 = 2.6, len = FREEZE - t0;
  const nz = svf(noiseArr(len), (i) => 300 * Math.pow(5000 / 300, i / SR / len), 2.5, 'bp');
  let ph = 0;
  const arr = tone(len, (t, i) => {
    const u = t / len;
    const trem = 0.75 + 0.25 * Math.sin(TAU * (6 + 8 * u) * t);
    const f = 220 * Math.pow(4, u) * (1 + 0.004 * u * Math.sin(TAU * 5.5 * t));
    ph = (ph + f / SR) % 1;
    const fade = Math.min(1, (len - t) / 0.01);
    return (nz[i] * db(-40 + 26 * u * u) * 3 + Math.sin(TAU * ph) * db(-34 + 13 * u)) * trem * fade;
  });
  place(MUS, t0, arr, 1, 0, 0.15);
}
// C. heartbeat on the core pulses
const heart = tone(0.6, (t) => {
  const b = (tt) => (tt < 0 ? 0 : Math.sin(TAU * (50 * tt + 60 * 0.03 * (1 - Math.exp(-tt / 0.03)))) * env(tt, 0.002, 0.15));
  return b(t) + 0.6 * b(t - 0.15);
});
for (const p of T.pulses) place(SFX, sec(p), heart, db(-9), 0, 0.08);
// E. freeze: faint tinnitus tone + reverse swell into the impact
place(SFX, FREEZE, tone(0.9, (t) => Math.sin(TAU * 6200 * t) * Math.min(1, t / 0.05) * Math.max(0, 1 - t / 0.9)), db(-46));
{
  const len = 0.55;
  const raw = svf(noiseArr(len), (i) => 400 + 6000 * Math.pow(i / SR / len, 2), 0.8, 'lp');
  const arr = tone(len, (t, i) => raw[i] * Math.pow(t / len, 3) * Math.min(1, (len - t) / 0.004));
  place(SFX, IMPACT - len, arr, db(-12), 0, 0.3);
}
// F. impact: sub drop + crack + bright bell partials
{
  const sub = tone(2.6, (t) => Math.sin(TAU * (38 * t + 54 * 0.12 * (1 - Math.exp(-t / 0.12)))) * env(t, 0.003, 0.6));
  place(SFX, IMPACT, sub, db(-8), 0, 0.1);
  const crack = filt(tone(0.08, () => noise()), biq('hp', 2000, 0.7));
  for (let i = 0; i < crack.length; i++) crack[i] *= Math.exp(-i / SR / 0.012);
  place(SFX, IMPACT, crack, db(-14), 0, 0.4);
  const partials = [587.33, 880, 1174.66, 1479.98, 1760];
  const bell = tone(3, (t) => partials.reduce((s, f, k) => s + Math.sin(TAU * f * t) * env(t, 0.002, 2.2 - k * 0.35) * (1 / (k + 1.5)), 0));
  place(SFX, IMPACT, bell, db(-22), 0, 0.6);
}
// G. scan whoosh: bandpass sweep, widening to full stereo as the ring expands
{
  const len = 1.0;
  const nL = noiseArr(len), nR = noiseArr(len), nC = noiseArr(len);
  const fc = (i) => 600 * Math.pow(7000 / 600, Math.min(1, i / SR / 0.85));
  const sweep = (x) => svf(x, fc, 1.2, 'bp');
  const fL = sweep(nL), fR = sweep(nR), fC = sweep(nC);
  const s0 = Math.round(IMPACT * SR);
  let ph = 0;
  for (let i = 0; i < fL.length; i++) {
    const t = i / SR;
    const a = Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5 * db(-12);
    const w = Math.min(1, t / 0.6);
    ph = (ph + (1320 * Math.pow(2, t / len)) / SR) % 1;
    const sh = Math.sin(TAU * ph) * db(-30) * Math.sin(Math.PI * Math.min(1, t / len));
    const l = (fC[i] * (1 - w) + fL[i] * w) * a + sh, r = (fC[i] * (1 - w) + fR[i] * w) * a + sh;
    if (s0 + i < N) {
      SFX.L[s0 + i] += l;
      SFX.R[s0 + i] += r;
      REV.L[s0 + i] += l * 0.3;
      REV.R[s0 + i] += r * 0.3;
    }
  }
}
// J. resolve pad: Dmaj9, opens after the impact, releases at the end
{
  const t0 = IMPACT, len = DUR - t0;
  const notes = [146.83, 220.0, 277.18, 329.63, 369.99, 440.0];
  const ph = notes.map(() => [R(), R(), R()]);
  const L = new Float32Array(Math.round(len * SR)), Rr = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    let l = 0, r = 0;
    notes.forEach((f0, n) => {
      [-7, 0, 7].forEach((c, v) => {
        const f = f0 * Math.pow(2, c / 1200);
        ph[n][v] = (ph[n][v] + f / SR) % 1;
        const s = 2 * ph[n][v] - 1 - blep(ph[n][v], f / SR);
        const pan = (n % 2 ? 0.35 : -0.35) + (v - 1) * 0.25;
        l += s * (1 - pan) * 0.5;
        r += s * (1 + pan) * 0.5;
      });
    });
    const a = Math.min(1, t / 1.6) * Math.min(1, (len - t) / 1.2) / 6;
    L[i] = l * a;
    Rr[i] = r * a;
  }
  const cut = (i) => 500 * Math.pow(2600 / 500, Math.min(1, i / SR / 3));
  const fl = svf(L, cut, 0.8, 'lp'), fr = svf(Rr, cut, 0.8, 'lp');
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < fl.length && s0 + i < N; i++) {
    const subv = Math.sin((TAU * 73.42 * i) / SR) * Math.min(1, i / SR / 1.2) * Math.min(1, (len - i / SR) / 1.2) * db(-24);
    MUS.L[s0 + i] += fl[i] * db(-15) + subv;
    MUS.R[s0 + i] += fr[i] * db(-15) + subv;
    REV.L[s0 + i] += fl[i] * db(-15) * 0.25;
    REV.R[s0 + i] += fr[i] * db(-15) * 0.25;
  }
}
// K. title bell (FM) + tagline chime; L. shimmer on the light sweep
const fmBell = (fc, ratio, idx, tau) => tone(3, (t) => Math.sin(TAU * fc * t + idx * Math.exp(-t / 0.35) * Math.sin(TAU * fc * ratio * t)) * env(t, 0.002, tau));
place(MUS, sec(T.title), fmBell(1174.66, 2.0, 2.5, 1.4), db(-19), -0.1, 0.5);
place(MUS, sec(T.title), tone(2.5, (t) => Math.sin(TAU * 2349.3 * t) * env(t, 0.002, 1.0)), db(-31), 0.1, 0.5);
place(MUS, sec(T.tagline), fmBell(880, 3.0, 1.5, 1.2), db(-24), 0.15, 0.5);
{
  const t0 = sec(T.glint[0]), len = sec(T.glint[1]) - t0;
  place(MUS, t0, tone(len, (t) => {
    const u = t / len;
    return [2637, 3520, 4186].reduce((s, f, k) => s + Math.sin(TAU * f * t + k), 0) * Math.sin(Math.PI * u) ** 2 * (0.6 + 0.4 * Math.sin(TAU * 9 * t)) / 3;
  }), db(-33), 0, 0.6);
}

// ---------------- SFX tied to picture events ----------------
const panX = (x) => Math.max(-0.8, Math.min(0.8, x / 16));
const tr = rng(91);
for (const e of ev.landings) {
  const f = 1700 + tr() * 1700;
  const tick = tone(0.05, (t) => Math.sin(TAU * f * t) * Math.exp(-t / 0.009) + noise() * Math.exp(-t / 0.0012) * 0.4);
  place(SFX, sec(e.f), tick, db(-35 + (tr() - 0.5) * 5), panX(e.x), 0.15);
  if (e.k === 0 || e.core) {
    const thud = tone(0.15, (t) => Math.sin(TAU * (e.core ? 70 : 95) * t) * env(t, 0.002, e.core ? 0.07 : 0.045));
    place(SFX, sec(e.f), thud, db(e.core ? -22 : -27), panX(e.x), 0.05);
  }
}
for (const e of ev.arcs) {
  const [fa, fb] = e.red ? [500, 2500] : [900, 4500];
  const len = 0.12;
  const z = svf(noiseArr(len), (i) => fa * Math.pow(fb / fa, Math.min(1, i / SR / 0.07)), 4, 'bp');
  const arr = tone(len, (t, i) => {
    const v = z[i] * env(t, 0.003, 0.03) * 3;
    return e.red ? Math.tanh(v * 2) / 2 : v;
  });
  place(SFX, sec(e.f), arr, db(e.red ? -29 : -32), panX(e.x), 0.2);
}
for (const m of ev.moves) {
  const t0 = sec(m.f0), len = sec(m.f1) - t0;
  const z = svf(noiseArr(len), (i) => 400 + 2600 * Math.sin((Math.PI * i) / SR / len), 0.7, 'lp');
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < z.length; i++) {
    const u = i / SR / len;
    add(SFX, s0 + i, z[i] * Math.sin(Math.PI * u) ** 2 * db(m.hub ? -22 : -30), panX(m.x0 + (m.x1 - m.x0) * u));
  }
  const tock = tone(0.12, (t) => (Math.sin(TAU * 1100 * t) * Math.exp(-t / 0.025) + 0.5 * Math.sin(TAU * 2200 * t) * Math.exp(-t / 0.012) + noise() * Math.exp(-t / 0.002) * 0.3));
  place(SFX, sec(m.f1), tock, db(-27), panX(m.x1), 0.25);
  if (m.hub) place(SFX, sec(m.f1), tone(0.4, (t) => Math.sin(TAU * 140 * t) * env(t, 0.002, 0.12)), db(-15), 0, 0.2);
}

// ---------------- reverb (Freeverb) ----------------
function freeverb(inL, inR, room = 0.84, damp = 0.35) {
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

// ---------------- mix: duck music/SFX under VO, sum, limit ----------------
const duck = new Float32Array(N);
{
  const at = Math.exp(-1 / (0.015 * SR)), rt = Math.exp(-1 / (0.25 * SR));
  let e = 0;
  for (let i = 0; i < N; i++) {
    const x = Math.abs(VOX.L[i]);
    e = x > e ? at * e + (1 - at) * x : rt * e + (1 - rt) * x;
    duck[i] = Math.min(1, e / 0.06);
  }
}
const OUT = bus();
const WET = 0.85;
for (let i = 0; i < N; i++) {
  const gm = 1 - 0.55 * duck[i], gs = 1 - 0.45 * duck[i];
  OUT.L[i] = VOX.L[i] + MUS.L[i] * gm + SFX.L[i] * gs + rv.L[i] * WET;
  OUT.R[i] = VOX.R[i] + MUS.R[i] * gm + SFX.R[i] * gs + rv.R[i] * WET;
}
{
  const W = [['speech1', 0.73, 4.63], ['freeze', 5.0, 5.95], ['impact', 6.0, 6.9], ['speech2', 6.87, 10.7], ['tail', 10.7, 12]];
  const r = (b, a, z, g) => { let e = 0, n = 0; for (let i = Math.round(a * SR); i < Math.min(N, Math.round(z * SR)); i++) { const k = g ? g(i) : 1; e += (b.L[i] * k) ** 2 + (b.R[i] * k) ** 2; n += 2; } return (20 * Math.log10(Math.sqrt(e / n) + 1e-12)).toFixed(1); };
  for (const [nm, a0, z0] of W) console.log(`[diag] ${nm}: VO ${r(VOX, a0, z0)} | MUS ${r(MUS, a0, z0, (i) => 1 - 0.55 * duck[i])} | SFX ${r(SFX, a0, z0, (i) => 1 - 0.45 * duck[i])} | REV ${r(rv, a0, z0, () => WET)}`);
  let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(OUT.L[i]), Math.abs(OUT.R[i]));
  console.log(`[diag] pre-limiter peak ${(20 * Math.log10(pk)).toFixed(1)} dBFS`);
  for (const [nm, bb] of [['VO', VOX], ['MUS', MUS], ['SFX', SFX], ['REV', rv]]) { let m = 0, at = 0; for (let i = 0; i < N; i++) { const v = Math.max(Math.abs(bb.L[i]), Math.abs(bb.R[i])); if (v > m) { m = v; at = i; } } console.log(`[diag] ${nm} peak ${(20 * Math.log10(m + 1e-12)).toFixed(1)} dBFS at ${(at / SR).toFixed(2)}s`); }
  let gr = 0; { const ceil = db(-1); let n = 0; for (let i = 0; i < N; i++) { const v = Math.max(Math.abs(OUT.L[i]), Math.abs(OUT.R[i])); if (v > ceil) n++; } console.log(`[diag] samples over -1 dBFS before limiting: ${n} (${(100 * n / N).toFixed(2)}%)`); }
}
filt(OUT.L, biq('hp', 25, 0.707));
filt(OUT.R, biq('hp', 25, 0.707));
// lookahead peak limiter @ -1 dBFS
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
// tail fade (last 0.25 s) + head guard
for (let i = 0; i < N; i++) {
  const f = Math.min(1, (N - 1 - i) / (0.25 * SR), i / (0.01 * SR));
  OUT.L[i] *= f;
  OUT.R[i] *= f;
}

// ---------------- write 16-bit WAV (TPDF dither) ----------------
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
let clip = 0;
for (let i = 0; i < N; i++) {
  for (const [c, arr] of [[0, OUT.L], [1, OUT.R]]) {
    let v = Math.round(arr[i] * 32767 + (R() - R()));
    if (v > 32767 || v < -32768) clip++;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * 4 + c * 2);
  }
}
const dest = path.join(AUDIO, 'sample-mix.wav');
fs.writeFileSync(dest, out);

// ---------------- report ----------------
const lv = (x) => 20 * Math.log10(x + 1e-12);
let pk = 0, ss = 0;
for (let i = 0; i < N; i++) { pk = Math.max(pk, Math.abs(OUT.L[i]), Math.abs(OUT.R[i])); ss += OUT.L[i] ** 2 + OUT.R[i] ** 2; }
const seg = [];
for (let s = 0; s < DUR; s += 0.5) {
  let e = 0, n = 0;
  for (let i = Math.round(s * SR); i < Math.min(N, Math.round((s + 0.5) * SR)); i++) { e += OUT.L[i] ** 2 + OUT.R[i] ** 2; n += 2; }
  seg.push(`${s.toFixed(1)}:${lv(Math.sqrt(e / n)).toFixed(0)}`);
}
console.log(`wrote ${path.relative(root, dest)} ${DUR}s ${SR}Hz stereo`);
console.log(`peak ${lv(pk).toFixed(1)} dBFS, rms ${lv(Math.sqrt(ss / (2 * N))).toFixed(1)} dBFS, clipped samples ${clip}, voGain ${lv(voGain).toFixed(1)} dB`);
console.log('rms per 0.5s:', seg.join(' '));
