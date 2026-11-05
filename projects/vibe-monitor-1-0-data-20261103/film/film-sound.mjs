// Sound design + score + final mix for the full visual-first Vibe Monitor 1.0 film (62 s).
// Everything is synthesized here (no third-party audio), timed from the same filmLayout.ts the picture uses.
// VO = the existing Edge TTS clips vo-01..vo-08, EQ'd, compressed and peak-limited.
// Usage: node projects/vibe-monitor-1-0-data-20261103/film/film-sound.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const SLUG = 'vibe-monitor-1-0-data-20261103';
const lay = await import(pathToFileURL(path.join(root, `src/projects/${SLUG}/film/filmLayout.ts`)).href);
const data = JSON.parse(fs.readFileSync(path.join(root, `src/projects/${SLUG}/data.json`), 'utf8'));
const {T, FPS, FILM_FRAMES, O, VO_CLIPS, SESSIONS, BUILDINGS, DOME_R, DOME_C} = lay;
const ev = lay.soundEvents();
const towns = lay.makeTowns(data.projects);
const AUDIO = path.join(root, `public/${SLUG}/audio`);

const SR = 48000;
const DUR = FILM_FRAMES / FPS;
const N = Math.round(DUR * SR);
const sec = (f) => f / FPS;
const db = (d) => Math.pow(10, d / 20);
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

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
const AMB = bus(); // room tone: never ducked
const REV = bus(); // reverb send

function add(b, i, v, pan = 0) {
  if (i < 0 || i >= N) return;
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  b.L[i] += v * Math.cos(a);
  b.R[i] += v * Math.sin(a);
}
function add2(b, i, l, r) {
  if (i < 0 || i >= N) return;
  b.L[i] += l;
  b.R[i] += r;
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
    const g = Math.tan((Math.PI * Math.min(Math.max(fc(i), 10), SR * 0.45)) / SR);
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

// ---------------------------------------------------------------- instruments
const NOTE = {
  B1: 61.74, D2: 73.42, E2: 82.41, Fs2: 92.5, G2: 98.0, A2: 110.0, B2: 123.47, Cs3: 138.59, D3: 146.83, E3: 164.81, Fs3: 185.0, G3: 196.0,
  A3: 220.0, B3: 246.94, Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88, Cs5: 554.37, D5: 587.33,
  E5: 659.26, Fs5: 739.99, G5: 783.99, A5: 880.0, B5: 987.77, Cs6: 1108.73, D6: 1174.66, E6: 1318.51, Fs6: 1479.98, A6: 1760.0, B6: 1975.53,
};
const PENTA = [NOTE.D4, NOTE.E4, NOTE.Fs4, NOTE.A4, NOTE.B4, NOTE.D5, NOTE.E5, NOTE.Fs5, NOTE.A5, NOTE.B5, NOTE.D6, NOTE.E6, NOTE.Fs6];

// detuned saw pad through a (moving) low-pass; placed on MUS with a reverb send
function pad(t0, len, notes, o = {}) {
  const {gain = -18, att = 1.2, rel = 1.5, cut = (t) => 400 * Math.pow(6, Math.min(1, t / 2)), q = 0.8, send = 0.25, det = 7, amp = null, width = 0.35} = o;
  const n = Math.round(len * SR);
  const L = new Float32Array(n), Rr = new Float32Array(n);
  const ph = notes.map(() => [R(), R(), R()]);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let l = 0, r = 0;
    for (let k = 0; k < notes.length; k++) {
      for (let v = 0; v < 3; v++) {
        const f = notes[k] * Math.pow(2, ((v - 1) * det) / 1200);
        ph[k][v] = (ph[k][v] + f / SR) % 1;
        const s = 2 * ph[k][v] - 1 - blep(ph[k][v], f / SR);
        const pan = (k % 2 ? width : -width) + (v - 1) * 0.25;
        l += s * (1 - pan) * 0.5;
        r += s * (1 + pan) * 0.5;
      }
    }
    const a = (Math.min(1, t / att) * Math.min(1, Math.max(0, (len - t) / rel)) * (amp ? amp(t) : 1)) / (notes.length * 1.5);
    L[i] = l * a;
    Rr[i] = r * a;
  }
  const fl = svf(L, (i) => cut(i / SR), q, 'lp'), fr = svf(Rr, (i) => cut(i / SR), q, 'lp');
  const s0 = Math.round(t0 * SR), g = db(gain);
  for (let i = 0; i < n; i++) {
    add2(MUS, s0 + i, fl[i] * g, fr[i] * g);
    add2(REV, s0 + i, fl[i] * g * send, fr[i] * g * send);
  }
}
// sine "string" pad: softer, for the quiet beats
function softPad(t0, len, notes, o = {}) {
  const {gain = -22, att = 1.5, rel = 2, send = 0.3, trem = 0.15, amp = null} = o;
  const n = Math.round(len * SR);
  const s0 = Math.round(t0 * SR), g = db(gain);
  const ph = notes.map(() => R());
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let l = 0, r = 0;
    for (let k = 0; k < notes.length; k++) {
      const f = notes[k];
      const s = Math.sin(TAU * (f * t + ph[k])) + 0.3 * Math.sin(TAU * (2 * f * t + ph[k])) + 0.12 * Math.sin(TAU * (3 * f * t));
      const tr = 1 - trem + trem * Math.sin(TAU * (0.21 + 0.07 * k) * t + k);
      const pan = ((k / Math.max(1, notes.length - 1)) * 2 - 1) * 0.5;
      l += s * tr * (1 - pan);
      r += s * tr * (1 + pan);
    }
    const a = (g * Math.min(1, t / att) * Math.min(1, Math.max(0, (len - t) / rel)) * (amp ? amp(t) : 1)) / (notes.length * 1.4);
    add2(MUS, s0 + i, l * a, r * a);
    add2(REV, s0 + i, l * a * send, r * a * send);
  }
}
const fmBell = (fc, ratio, idx, tau, len = 3) => tone(len, (t) => Math.sin(TAU * fc * t + idx * Math.exp(-t / 0.35) * Math.sin(TAU * fc * ratio * t)) * env(t, 0.002, tau));
const glass = (f, tau = 0.05) => tone(Math.min(0.6, tau * 8), (t) => (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / (tau * 0.4))) * env(t, 0.0015, tau));
function whoosh(t0, len, f0, f1, gainDb, {pan = 0, send = 0.3, q = 1.1, shape = 1.5, width = 1} = {}) {
  const nL = noiseArr(len), nR = noiseArr(len);
  const fc = (i) => f0 * Math.pow(f1 / f0, Math.min(1, i / SR / len));
  const fL = svf(nL, fc, q, 'bp'), fR = svf(nR, fc, q, 'bp');
  const s0 = Math.round(t0 * SR), g = db(gainDb);
  for (let i = 0; i < fL.length; i++) {
    const u = i / SR / len;
    const a = Math.pow(Math.sin(Math.PI * Math.min(1, u)), shape) * g;
    const m = (fL[i] + fR[i]) * 0.5;
    const l = (m * (1 - width) + fL[i] * width) * a, r = (m * (1 - width) + fR[i] * width) * a;
    const pl = 1 - Math.max(0, pan), pr = 1 + Math.min(0, pan);
    add2(SFX, s0 + i, l * pl, r * pr);
    add2(REV, s0 + i, l * send, r * send);
  }
}
function keyClick(t0, gainDb, pan = 0, bright = 1) {
  const len = 0.06;
  const z = svf(noiseArr(len), () => 2600 + 2400 * bright, 1.6, 'bp');
  const arr = tone(len, (t, i) => z[i] * Math.exp(-t / 0.0022) * 2.2 + Math.sin(TAU * (210 + 80 * bright) * t) * Math.exp(-t / 0.012) * 0.55 + Math.sin(TAU * 1450 * t) * Math.exp(-t / 0.004) * 0.25);
  place(SFX, t0, arr, db(gainDb), pan, 0.12);
}
const subDrop = (f0, f1, tau, len = 2) => tone(len, (t) => Math.sin(TAU * (f1 * t + (f0 - f1) * 0.12 * (1 - Math.exp(-t / 0.12)))) * env(t, 0.003, tau));
const panX = (x, s = 16) => Math.max(-0.8, Math.min(0.8, x / s));

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
const vos = VO_CLIPS.map((c) => ({...c, x: processVo(readWav(path.join(AUDIO, `${c.id}.wav`)))}));
const voGain = db(-16) / speechRms(Float32Array.from(vos.flatMap((v) => Array.from(v.x))));
for (const v of vos) {
  const y = limitMono(v.x, voGain, -3, 4, 60);
  const s0 = Math.round(sec(v.at) * SR);
  for (let j = 0; j < y.length; j++) {
    const i = s0 + j;
    if (i >= N) break;
    VOX.L[i] += y[j];
    VOX.R[i] += y[j];
    add(REV, i, y[j] * 0.06);
  }
}

// ---------------------------------------------------------------- room tone (whole film)
{
  const z = svf(noiseArr(DUR), () => 1800, 0.6, 'lp');
  const z2 = svf(noiseArr(DUR), () => 1800, 0.6, 'lp');
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const g = db(-60) * Math.min(1, t / 0.5) * (t > sec(T.cut) && t < sec(T.type[1]) ? 1.6 : 1);
    AMB.L[i] += z[i] * g;
    AMB.R[i] += z2[i] * g;
  }
}

// ================================================================= B1 · velocity (0–180)
// caret blink pings, then the core file's keystrokes, then the front: a rain of keystrokes that becomes a rush
for (const f of [2, 18]) place(SFX, sec(f), glass(2093, 0.03), db(-42), -0.2, 0.3);
{
  const kr = rng(28);
  for (const f of ev.coreTicks) keyClick(sec(f), -25 + (kr() - 0.5) * 3, -0.25 + kr() * 0.3, 0.6 + kr() * 0.6);
}
{
  const gr = rng(60);
  const dens = ev.density;
  for (let f = 0; f < dens.length; f++) {
    const n = dens[f];
    if (!n) continue;
    const level = db(-36 + 14 * clamp01(Math.log10(n) / 3)) * (1 - clamp01((f - 128) / 22));
    const grains = Math.min(n, 40);
    const a = level / Math.sqrt(grains);
    for (let g = 0; g < grains; g++) {
      const t0 = sec(f + gr());
      const fc = 2200 + gr() * 5200;
      const len = 0.012;
      const z = svf(noiseArr(len), () => fc, 2.2, 'bp');
      const arr = tone(len, (t, i) => z[i] * Math.exp(-t / 0.0016) * 3);
      place(SFX, t0, arr, a, (gr() - 0.5) * 1.6, 0.2);
    }
  }
  // the rush bed under the front
  const len = sec(160) - sec(58);
  const nL = svf(noiseArr(len), (i) => 900 * Math.pow(5.5, Math.min(1, i / SR / len)), 0.7, 'bp');
  const nR = svf(noiseArr(len), (i) => 900 * Math.pow(5.5, Math.min(1, i / SR / len)), 0.7, 'bp');
  const s0 = Math.round(sec(58) * SR);
  for (let i = 0; i < nL.length; i++) {
    const f = 58 + (i / SR) * FPS;
    const d = dens[Math.min(dens.length - 1, Math.floor(f))] || 0;
    const lv = d > 0 ? db(-40 + 16 * clamp01(Math.log10(d + 1) / 3)) : 0;
    const a = lv * Math.min(1, (i / SR) / 0.3) * (1 - clamp01((f - 125) / 35));
    add2(SFX, s0 + i, nL[i] * a, nR[i] * a);
    add2(REV, s0 + i, nL[i] * a * 0.25, nR[i] * a * 0.25);
  }
}
// low drone fades in under the voice, a tonal riser under "已经快过你读懂架构的速度", a wide shimmer for the reveal
pad(sec(36), sec(200) - sec(36), [NOTE.D2, NOTE.A2, NOTE.D3], {gain: -24, att: 2.2, rel: 1.4, cut: (t) => 140 + 260 * clamp01(t / 3)});
pad(sec(76), sec(136) - sec(76), [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.E4], {gain: -22, att: 0.6, rel: 0.12, cut: (t) => 300 * Math.pow(12, clamp01(t / 1.7)), q: 1.4, send: 0.2});
softPad(sec(128), sec(205) - sec(128), [NOTE.A4, NOTE.D5, NOTE.E5, NOTE.A5], {gain: -23, att: 0.35, rel: 1.3, send: 0.6, trem: 0.25});
place(MUS, sec(131), fmBell(NOTE.D6, 2.0, 1.6, 1.6), db(-26), 0.1, 0.6);

// ================================================================= B2 · tangle + B3 · reveal (the A/B sample's score, + O)
const FREEZE = sec(T.freeze), IMPACT = sec(T.impact), O_S = sec(O);
{
  // drone O → freeze, tape-stop at the freeze
  const len = FREEZE - O_S + 0.35;
  const ph = [0, 0, 0, 0];
  const freqs = [36.71, 73.42 * Math.pow(2, -5 / 1200), 73.42 * Math.pow(2, 5 / 1200), 110];
  const L = new Float32Array(Math.round(len * SR)), Rr = new Float32Array(L.length);
  const span = FREEZE - O_S;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const stop = t < span ? 1 : Math.max(0.08, Math.pow(1 - (t - span) / 0.3, 2));
    const amp = Math.min(1, t / 1.4) * (0.55 + 0.45 * (t / span)) * (t < span ? 1 : Math.max(0, 1 - (t - span) / 0.32));
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
  const cut = (i) => 160 * Math.pow(650 / 160, Math.min(1, i / SR / span)) * (i / SR < span ? 1 : Math.max(0.3, 1 - (i / SR - span) / 0.3));
  const fl = svf(L, cut, 0.9, 'lp'), fr = svf(Rr, cut, 0.9, 'lp');
  const s0 = Math.round(O_S * SR);
  for (let i = 0; i < fl.length; i++) {
    add(MUS, s0 + i, fl[i] * db(-23), -1);
    add(MUS, s0 + i, fr[i] * db(-23), 1);
  }
}
{
  // riser under phrases 2/3, hard cut at the freeze
  const t0 = O_S + 2.6, len = FREEZE - t0;
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
const heart = tone(0.6, (t) => {
  const b = (tt) => (tt < 0 ? 0 : Math.sin(TAU * (50 * tt + 60 * 0.03 * (1 - Math.exp(-tt / 0.03)))) * env(tt, 0.002, 0.15));
  return b(t) + 0.6 * b(t - 0.15);
});
for (const p of T.pulses) place(SFX, sec(p), heart, db(-9), 0, 0.08);
place(SFX, FREEZE, tone(0.9, (t) => Math.sin(TAU * 6200 * t) * Math.min(1, t / 0.05) * Math.max(0, 1 - t / 0.9)), db(-46));
{
  const len = 0.55;
  const raw = svf(noiseArr(len), (i) => 400 + 6000 * Math.pow(i / SR / len, 2), 0.8, 'lp');
  const arr = tone(len, (t, i) => raw[i] * Math.pow(t / len, 3) * Math.min(1, (len - t) / 0.004));
  place(SFX, IMPACT - len, arr, db(-12), 0, 0.3);
}
{
  place(SFX, IMPACT, subDrop(92, 38, 0.6, 2.6), db(-8), 0, 0.1);
  const crack = filt(tone(0.08, () => noise()), biq('hp', 2000, 0.7));
  for (let i = 0; i < crack.length; i++) crack[i] *= Math.exp(-i / SR / 0.012);
  place(SFX, IMPACT, crack, db(-14), 0, 0.4);
  const partials = [587.33, 880, 1174.66, 1479.98, 1760];
  const bell = tone(3, (t) => partials.reduce((s, f, k) => s + Math.sin(TAU * f * t) * env(t, 0.002, 2.2 - k * 0.35) * (1 / (k + 1.5)), 0));
  place(SFX, IMPACT, bell, db(-22), 0, 0.6);
}
{
  const len = 1.0;
  const nL = noiseArr(len), nR = noiseArr(len), nC = noiseArr(len);
  const fc = (i) => 600 * Math.pow(7000 / 600, Math.min(1, i / SR / 0.85));
  const fL = svf(nL, fc, 1.2, 'bp'), fR = svf(nR, fc, 1.2, 'bp'), fC = svf(nC, fc, 1.2, 'bp');
  const s0 = Math.round(IMPACT * SR);
  let ph = 0;
  for (let i = 0; i < fL.length; i++) {
    const t = i / SR;
    const a = Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5 * db(-12);
    const w = Math.min(1, t / 0.6);
    ph = (ph + (1320 * Math.pow(2, t / len)) / SR) % 1;
    const sh = Math.sin(TAU * ph) * db(-30) * Math.sin(Math.PI * Math.min(1, t / len));
    const l = (fC[i] * (1 - w) + fL[i] * w) * a + sh, r = (fC[i] * (1 - w) + fR[i] * w) * a + sh;
    add2(SFX, s0 + i, l, r);
    add2(REV, s0 + i, l * 0.3, r * 0.3);
  }
}
// Dmaj9 resolve pad from the impact through the title; it dims as the V goes dormant (B4)
pad(IMPACT, sec(T.dormant + 40) - IMPACT, [NOTE.D3, NOTE.A3, NOTE.Cs4, NOTE.E4, NOTE.Fs4, NOTE.A4], {
  gain: -15, att: 1.6, rel: 1.4, send: 0.25,
  cut: (t) => (t < 3 ? 500 * Math.pow(2600 / 500, t / 3) : 2600) * (t + IMPACT > sec(T.dormant) ? Math.max(0.15, 1 - (t + IMPACT - sec(T.dormant)) / 1.2) : 1),
});
{
  const t0 = IMPACT, len = sec(T.dormant + 30) - t0;
  place(MUS, t0, tone(len, (t) => Math.sin(TAU * 73.42 * t) * Math.min(1, t / 1.2) * Math.min(1, (len - t) / 1.2)), db(-24), 0);
}
place(MUS, sec(T.title), fmBell(1174.66, 2.0, 2.5, 1.4), db(-19), -0.1, 0.5);
place(MUS, sec(T.title), tone(2.5, (t) => Math.sin(TAU * 2349.3 * t) * env(t, 0.002, 1.0)), db(-31), 0.1, 0.5);
place(MUS, sec(T.tagline), fmBell(880, 3.0, 1.5, 1.2), db(-24), 0.15, 0.5);
function shimmer(f0, f1, gainDb) {
  const t0 = sec(f0), len = sec(f1) - t0;
  place(MUS, t0, tone(len, (t) => {
    const u = t / len;
    return ([2637, 3520, 4186].reduce((s, f, k) => s + Math.sin(TAU * f * t + k), 0) * Math.sin(Math.PI * u) ** 2 * (0.6 + 0.4 * Math.sin(TAU * 9 * t))) / 3;
  }), db(gainDb), 0, 0.6);
}
shimmer(T.glint[0], T.glint[1], -33);
// floors landing, dependency arcs, buildings flying into the V
{
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
    const tock = tone(0.12, (t) => Math.sin(TAU * 1100 * t) * Math.exp(-t / 0.025) + 0.5 * Math.sin(TAU * 2200 * t) * Math.exp(-t / 0.012) + noise() * Math.exp(-t / 0.002) * 0.3);
    place(SFX, sec(m.f1), tock, db(-27), panX(m.x1), 0.25);
    if (m.hub) place(SFX, sec(m.f1), tone(0.4, (t) => Math.sin(TAU * 140 * t) * env(t, 0.002, 0.12)), db(-15), 0, 0.2);
  }
}

// ================================================================= B4 · session-scoped MCP (520–820)
// the V goes dormant: a low Bm9 bed; three sessions land as a D major triad; the process pulses while alive and stops dead
softPad(sec(T.dormant + 10), sec(T.ignite + 4) - sec(T.dormant + 10), [NOTE.B2, NOTE.Fs3, NOTE.A3, NOTE.Cs4, NOTE.D4], {gain: -25, att: 1.4, rel: 0.25, trem: 0.1, send: 0.35});
const beamNotes = [NOTE.A4, NOTE.D5, NOTE.Fs5];
for (const s of SESSIONS) {
  const p = panX(s.b.slot.x, 12);
  whoosh(sec(s.land - 9), sec(10), 5200, 900, -24, {pan: p, send: 0.25, shape: 2.2});
  place(SFX, sec(s.land), subDrop(150, 60, 0.12, 0.5), db(-20), p, 0.1);
  place(MUS, sec(s.land), fmBell(beamNotes[s.i], 2.0, 1.2, 1.6), db(-21), p, 0.45);
  place(MUS, sec(s.land), fmBell(beamNotes[s.i] * 2, 3.0, 0.6, 0.6), db(-33), p, 0.5);
  // link to the hub: a soft glide, a tick on arrival
  {
    const t0 = sec(s.linkAt), len = sec(s.linkDur);
    let ph = 0;
    place(SFX, t0, tone(len, (t) => {
      const u = t / len;
      ph = (ph + (beamNotes[s.i] * (1 + u)) / SR) % 1;
      return Math.sin(TAU * ph) * Math.sin(Math.PI * u) * 0.7;
    }), db(-31), p * (1 - 0.5), 0.3);
    place(SFX, sec(s.linkAt + s.linkDur), glass(2640, 0.04), db(-30), 0, 0.3);
  }
  // retract
  whoosh(sec(s.retract), sec(12), 700, 4800, -28, {pan: p, send: 0.3, shape: 2});
}
{
  // ignition: reverse swell into a bright D add9 bloom + sub
  const len = 0.45;
  const raw = svf(noiseArr(len), (i) => 600 + 7000 * Math.pow(i / SR / len, 2), 0.8, 'lp');
  place(SFX, sec(T.ignite) - len, tone(len, (t, i) => raw[i] * Math.pow(t / len, 3) * Math.min(1, (len - t) / 0.004)), db(-17), 0, 0.3);
  place(SFX, sec(T.ignite), subDrop(110, 45, 0.35, 1.4), db(-12), 0, 0.1);
  place(MUS, sec(T.ignite), fmBell(NOTE.D6, 2.0, 2.0, 1.2), db(-22), 0, 0.5);
}
// Dadd9 while the process lives; it closes down with the exit
pad(sec(T.ignite), sec(T.exitEnd + 6) - sec(T.ignite), [NOTE.D3, NOTE.A3, NOTE.E4, NOTE.Fs4, NOTE.A4, NOTE.D5], {
  gain: -18, att: 0.08, rel: 0.2, send: 0.3,
  cut: (t) => {
    const ta = t + sec(T.ignite);
    const open = 3200 * Math.exp(-t / 1.4) + 1100;
    return ta < sec(T.exitStart) ? open : open * Math.max(0.06, 1 - (ta - sec(T.exitStart)) / (sec(T.exitEnd) - sec(T.exitStart)));
  },
});
{
  // process pulse: 8th notes on D, tape-stops at the exit
  const t0 = sec(T.ignite + 2), t1 = sec(T.exitEnd + 2), len = t1 - t0;
  const ex0 = sec(T.exitStart + 6) - t0, ex1 = sec(T.exitEnd) - t0;
  let ph = 0, beatPh = 0;
  const raw = new Float32Array(Math.round(len * SR));
  for (let i = 0; i < raw.length; i++) {
    const t = i / SR;
    const warp = t < ex0 ? 1 : Math.max(0.05, 1 - (t - ex0) / (ex1 - ex0));
    beatPh += (4 * warp) / SR; // 8th notes at 120 BPM
    const bt = (beatPh % 1) / 4; // seconds since the note (at nominal tempo)
    const f = NOTE.D2 * warp * (Math.floor(beatPh) % 4 === 3 ? 2 : 1);
    ph = (ph + f / SR) % 1;
    const s = 2 * ph - 1 - blep(ph, f / SR);
    raw[i] = s * Math.exp(-bt / 0.07) * (t > ex1 ? 0 : 1);
  }
  const fl = svf(raw, (i) => 300 + 1500 * Math.exp(-(((i / SR) * 4) % 1) / 0.25), 1.6, 'lp');
  place(MUS, t0, fl, db(-21), 0, 0.12);
  // a soft tick on the beats
  for (let t = 0.5; t < ex0; t += 0.5) place(SFX, t0 + t, glass(5200, 0.012), db(-38), 0.3, 0.1);
}
{
  // power down: a falling sine and a relay click when the process exits
  const t0 = sec(T.exitStart), len = sec(T.exitEnd) - t0;
  let ph = 0;
  place(SFX, t0, tone(len, (t) => {
    const u = t / len;
    ph = (ph + (220 * Math.pow(0.18, u)) / SR) % 1;
    return Math.sin(TAU * ph) * Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.8;
  }), db(-26), 0, 0.25);
  place(SFX, sec(T.exitEnd), tone(0.05, (t) => noise() * Math.exp(-t / 0.002) + Math.sin(TAU * 900 * t) * Math.exp(-t / 0.008) * 0.6), db(-26), 0, 0.15);
}

// ================================================================= B5 · one scan, 13 monitors, quiet by default (820–1125)
function radar(f0, gainDb) {
  const t0 = sec(f0), len = sec(19);
  let ph = 0;
  place(SFX, t0, tone(len, (t) => {
    const u = t / len;
    ph = (ph + (320 * Math.pow(4.5, u)) / SR) % 1;
    return Math.sin(TAU * ph) * Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(TAU * 18 * t));
  }), db(gainDb), 0, 0.45);
  whoosh(t0, len, 500, 6000, gainDb - 4, {send: 0.4, shape: 1.2});
}
radar(T.scan, -24);
lay.MONITORS.forEach((_, i) => {
  const p = (i % 2 ? 1 : -1) * (0.15 + 0.5 * (i / 12));
  place(MUS, sec(lay.ringBorn(i)), fmBell(PENTA[i], 2.0, 1.0, 1.1), db(-25 - i * 0.25), p, 0.5);
});
softPad(sec(T.rings + 20), sec(T.notice) - sec(T.rings + 20) + 1.2, [NOTE.G2, NOTE.D3, NOTE.Fs3, NOTE.A3, NOTE.B3], {gain: -23, att: 1.8, rel: 1.4, send: 0.35});
softPad(sec(T.notice - 8), sec(T.b6 + 12) - sec(T.notice - 8), [NOTE.Fs2, NOTE.A3, NOTE.D4, NOTE.Fs4, NOTE.A4], {gain: -22, att: 1.0, rel: 0.6, send: 0.35});
{
  const mr = rng(918);
  for (let k = 0; k < 40; k++) place(SFX, sec(T.evidence + mr() * 40), glass(4200 + mr() * 3000, 0.02), db(-41), (mr() - 0.5) * 1.4, 0.4);
}
for (const [f, n] of [[T.quiet, NOTE.D6], [T.quiet + 6, NOTE.E6]]) place(SFX, sec(f), glass(n, 0.05), db(-34), -0.5, 0.3);
{
  // the notice: gentle, warm, two notes — not an alarm
  place(MUS, sec(T.notice + 2), fmBell(NOTE.A5, 2.0, 1.4, 1.3), db(-21), 0.2, 0.5);
  place(MUS, sec(T.notice + 6), fmBell(NOTE.Fs5, 2.0, 1.2, 1.5), db(-22), 0.25, 0.5);
  let ph = 0;
  const len = sec(16);
  place(SFX, sec(T.notice + 4), tone(len, (t) => {
    const u = t / len;
    ph = (ph + (600 * Math.pow(1.5, u)) / SR) % 1;
    return Math.sin(TAU * ph) * Math.sin(Math.PI * u) * 0.6;
  }), db(-33), -0.3, 0.4);
}

// ================================================================= B6 · real telemetry (1125–1370)
whoosh(sec(T.b6 + 3), sec(1262) - sec(T.b6 + 3), 160, 2600, -19, {send: 0.35, shape: 1.8, q: 0.7});
pad(sec(1128), sec(1176) - sec(1128), [NOTE.G2, NOTE.D3, NOTE.A3, NOTE.B3, NOTE.D4], {gain: -14, att: 0.7, rel: 0.5, cut: (t) => 600 + 900 * t});
pad(sec(1166), sec(1210) - sec(1166), [NOTE.A2, NOTE.E3, NOTE.A3, NOTE.Cs4, NOTE.E4], {gain: -13, att: 0.5, rel: 0.5, cut: (t) => 1100 + 700 * t});
pad(sec(1200), sec(1246) - sec(1200), [NOTE.B2, NOTE.Fs3, NOTE.A3, NOTE.D4, NOTE.Fs4], {gain: -13, att: 0.5, rel: 0.5, cut: (t) => 1400 + 600 * t});
pad(sec(1236), sec(T.b7 + 30) - sec(1236), [NOTE.D3, NOTE.A3, NOTE.E4, NOTE.Fs4, NOTE.A4, NOTE.D5], {gain: -13, att: 0.6, rel: 1.4, cut: (t) => 2200 - 600 * clamp01(t / 4)});
{
  // a soft pulse carries the data beat
  const t0 = sec(1200), len = sec(T.b7 + 12) - t0;
  const roots = (t) => (t + t0 < sec(1246) ? NOTE.B2 : NOTE.D3);
  let ph = 0;
  const raw = tone(len, (t) => {
    const bt = (t * 4) % 1 / 4;
    const f = roots(t);
    ph = (ph + f / SR) % 1;
    return (2 * ph - 1) * Math.exp(-bt / 0.06) * Math.min(1, t / 0.5) * Math.min(1, (len - t) / 0.6);
  });
  const fl = svf(raw, (i) => 400 + 1400 * Math.exp(-(((i / SR) * 4) % 1) / 0.2), 1.4, 'lp');
  place(MUS, t0, fl, db(-25), 0.1, 0.15);
}
{
  // one tiny chime per town as it lights (the counter on screen counts the same towns)
  const tr = rng(197);
  const high = [NOTE.D6, NOTE.E6, NOTE.Fs6, NOTE.A6, NOTE.B5, NOTE.A5, NOTE.B6];
  for (const t of towns) {
    if (t.ours) continue;
    place(SFX, sec(t.lit), glass(high[Math.floor(tr() * high.length)], 0.06), db(-35 + (tr() - 0.5) * 4), Math.max(-0.9, Math.min(0.9, t.x / 120)), 0.45);
  }
  for (const f of T.nums.slice(1)) place(SFX, sec(f), glass(NOTE.D6 / 2, 0.08), db(-31), -0.6, 0.3);
  // telemetry sparks: a high shimmer bed
  const t0 = sec(T.nums[1] - 20), len = sec(T.b7 + 30) - t0;
  const zL = svf(noiseArr(len), () => 7500, 2.5, 'bp'), zR = svf(noiseArr(len), () => 7500, 2.5, 'bp');
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < zL.length; i++) {
    const t = i / SR;
    const a = db(-40) * Math.min(1, t / 1) * Math.min(1, (len - t) / 1) * (0.6 + 0.4 * Math.sin(TAU * 0.7 * t));
    add2(SFX, s0 + i, zL[i] * a, zR[i] * a);
  }
}

// ================================================================= B7 · local first (1370–1590)
whoosh(sec(T.b7 + 2), sec(1442) - sec(T.b7 + 2), 2600, 220, -20, {send: 0.35, shape: 1.6, q: 0.8});
softPad(sec(T.vo7 - 6), sec(T.open + 34) - sec(T.vo7 - 6), [NOTE.B2, NOTE.Fs3, NOTE.A3, NOTE.Cs4, NOTE.D4, NOTE.Fs4], {gain: -19, att: 1.4, rel: 1.0, send: 0.35});
{
  // the boundary rises: a glassy hum that follows the dome's reveal
  const t0 = sec(T.dome), len = sec(T.open + 30) - t0;
  place(SFX, t0, tone(len, (t) => {
    const f = t * FPS + T.dome;
    const rev = lay.domeReveal(f);
    const s = Math.sin(TAU * 880 * t) + 0.6 * Math.sin(TAU * 1320 * t + 1) + 0.35 * Math.sin(TAU * 1760 * t + 2);
    return s * (0.25 + 0.75 * rev) * (f < T.dome + 34 ? 1.6 : 0.5) * (0.85 + 0.15 * Math.sin(TAU * 5 * t)) / 2;
  }), db(-36), 0, 0.5);
}
{
  // source streams: a zip up, then a muffled stop at the boundary
  const sr = rng(1436);
  const NS = 110;
  for (let i = 0; i < NS; i++) {
    // mirror the engine's stream generation (same seed and draw order)
    const b = BUILDINGS[Math.floor(sr() * BUILDINGS.length)];
    const sx = b.slot.x + (sr() - 0.5) * 0.8;
    const sz = b.slot.z + (sr() - 0.5) * 0.8;
    const sy = b.slot.h + 0.2;
    const ox = sx - DOME_C.x, oz = sz - DOME_C.z;
    const ol = Math.hypot(ox, oz) || 1;
    const out = 0.35 + sr() * 0.9;
    let dx = (ox / ol) * out + (sr() - 0.5) * 0.4, dy = 1, dz = (oz / ol) * out + (sr() - 0.5) * 0.4;
    const dl = Math.hypot(dx, dy, dz);
    dx /= dl; dy /= dl; dz /= dl;
    const px = sx - DOME_C.x, py = sy, pz = sz - DOME_C.z;
    const bq = px * dx + py * dy + pz * dz;
    const cq = px * px + py * py + pz * pz - DOME_R * DOME_R;
    const hit = -bq + Math.sqrt(bq * bq - cq) - 0.15;
    sr(); // class
    const t0 = T.streams + sr() * 20;
    const v = 0.75 + sr() * 0.5;
    sr(); // len
    const tHit = t0 + hit / v;
    const p = panX(sx + dx * hit, 24);
    if (i % 3 === 0) place(SFX, sec(t0), glass(3000 + (i % 7) * 300, 0.015), db(-42), panX(sx), 0.2);
    const thunk = tone(0.12, (t) => Math.sin(TAU * (130 + (i % 5) * 12) * t) * env(t, 0.001, 0.03) + noise() * Math.exp(-t / 0.004) * 0.3);
    filt(thunk, biq('lp', 900, 0.7));
    place(SFX, sec(tHit), thunk, db(-31 + (i % 4)), p, 0.25);
    if (i % 4 === 0) place(SFX, sec(tHit), glass(2200 + (i % 9) * 140, 0.03), db(-37), p, 0.5);
  }
  // metric dots pass through untouched: clean, tiny pings as they cross the boundary (same draws as the engine)
  for (let i = 0; i < 26; i++) {
    const b = BUILDINGS[Math.floor(sr() * BUILDINGS.length)];
    const x = b.slot.x + (sr() - 0.5) * 0.6;
    const z = b.slot.z + (sr() - 0.5) * 0.6;
    const t0 = T.streams + 6 + sr() * 56;
    const y0 = b.slot.h + 0.3;
    const rr = Math.hypot(x - DOME_C.x, z - DOME_C.z);
    const yc = Math.sqrt(Math.max(0, DOME_R * DOME_R - rr * rr));
    const tc = t0 + (yc - y0) / 0.42;
    if (tc < T.cut) place(SFX, sec(tc), glass(5600, 0.03), db(-40), panX(x, 24), 0.5);
  }
}
radar(T.scan7, -27);

// ================================================================= B8 · open source, one line, keep pace (1590–1860)
{
  // the boundary dissolves from the top: falling sparkles
  const fr = rng(1598);
  const notes = [NOTE.B6, NOTE.A6, NOTE.Fs6, NOTE.E6, NOTE.D6, NOTE.B5, NOTE.A5];
  for (let k = 0; k < 14; k++) place(SFX, sec(T.open + k * 2.6), glass(notes[k % notes.length], 0.09), db(-32), (fr() - 0.5) * 1.4, 0.6);
  shimmer(T.open, T.cut - 2, -34);
}
for (let i = 0; i < ev.cmdTimes.length; i++) {
  const ch = ev.cmd[i];
  keyClick(sec(ev.cmdTimes[i]), ch === ' ' ? -22 : -23.5, -0.5 + (i / ev.cmd.length) * 1.0, ch === ' ' ? 0.2 : 0.8);
}
place(SFX, sec(ev.cmdTimes.at(-1) + 3), glass(NOTE.A5, 0.12), db(-28), 0.4, 0.4);
{
  // rise and land on "跟上"
  whoosh(sec(T.crane[0]), sec(T.crane[1]) - sec(T.crane[0]), 180, 3200, -21, {send: 0.4, shape: 1.6, q: 0.7});
  pad(sec(T.crane[0]), sec(T.keep) - sec(T.crane[0]) + 0.2, [NOTE.A2, NOTE.E3, NOTE.A3, NOTE.D4, NOTE.E4], {gain: -16, att: 0.9, rel: 0.12, cut: (t) => 500 * Math.pow(7, clamp01(t / 1.0))});
  const len = 0.4;
  const raw = svf(noiseArr(len), (i) => 600 + 7000 * Math.pow(i / SR / len, 2), 0.8, 'lp');
  place(SFX, sec(T.keep) - len, tone(len, (t, i) => raw[i] * Math.pow(t / len, 3) * Math.min(1, (len - t) / 0.004)), db(-16), 0, 0.3);
  place(SFX, sec(T.keep), subDrop(96, 40, 0.5, 2.2), db(-11), 0, 0.12);
  const partials = [NOTE.D5, NOTE.A5, NOTE.D6, NOTE.Fs6, NOTE.A6];
  place(SFX, sec(T.keep), tone(3, (t) => partials.reduce((s, f, k) => s + Math.sin(TAU * f * t) * env(t, 0.002, 2.4 - k * 0.35) * (1 / (k + 1.5)), 0)), db(-23), 0, 0.6);
  pad(sec(T.keep), sec(T.end) - sec(T.keep), [NOTE.D2, NOTE.D3, NOTE.A3, NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.E5], {
    gain: -13, att: 0.25, rel: 2.6, send: 0.3, width: 0.45,
    cut: (t) => 900 + 2400 * (1 - Math.exp(-t / 0.8)) - 1400 * clamp01((t - 2.5) / 3),
  });
  // the keep-pace front: the keystroke rain once more, now in time with the rise
  const gr = rng(1716);
  for (let f = T.crane[0] + 6; f < T.final + 6; f++) {
    const u = (f - T.crane[0]) / (T.final - T.crane[0]);
    const grains = Math.round(4 + 26 * Math.sin(Math.PI * Math.min(1, u)) ** 2);
    const a = db(-34 + 8 * Math.sin(Math.PI * Math.min(1, u))) / Math.sqrt(grains);
    for (let g = 0; g < grains; g++) {
      const fc = 2600 + gr() * 4800;
      const z = svf(noiseArr(0.01), () => fc, 2.2, 'bp');
      place(SFX, sec(f + gr()), tone(0.01, (t, i) => z[i] * Math.exp(-t / 0.0015) * 3), a, (gr() - 0.5) * 1.8, 0.25);
    }
  }
}
place(MUS, sec(T.final), fmBell(1174.66, 2.0, 2.5, 1.6), db(-19), -0.1, 0.55);
place(MUS, sec(T.final), tone(2.5, (t) => Math.sin(TAU * 2349.3 * t) * env(t, 0.002, 1.0)), db(-31), 0.1, 0.5);
place(MUS, sec(T.final + 18), fmBell(880, 3.0, 1.5, 1.4), db(-24), 0.15, 0.5);
shimmer(1792, 1840, -33);

// ---------------------------------------------------------------- reverb (Freeverb)
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

// ---------------------------------------------------------------- mix: duck music/SFX under VO, sum, limit
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
  OUT.L[i] = VOX.L[i] + MUS.L[i] * gm + SFX.L[i] * gs + rv.L[i] * WET + AMB.L[i];
  OUT.R[i] = VOX.R[i] + MUS.R[i] * gm + SFX.R[i] * gs + rv.R[i] * WET + AMB.R[i];
}
{
  const r = (b, a, z, g) => {
    let e = 0, n = 0;
    for (let i = Math.round(a * SR); i < Math.min(N, Math.round(z * SR)); i++) {
      const k = g ? g(i) : 1;
      e += (b.L[i] * k) ** 2 + (b.R[i] * k) ** 2;
      n += 2;
    }
    return (20 * Math.log10(Math.sqrt(e / n) + 1e-12)).toFixed(1);
  };
  for (const v of VO_CLIPS) {
    const a0 = sec(v.at) + 0.2, z0 = sec(v.at) + 3.2;
    console.log(`[diag] ${v.id} ${a0.toFixed(1)}-${z0.toFixed(1)}s: VO ${r(VOX, a0, z0)} | MUS ${r(MUS, a0, z0, (i) => 1 - 0.55 * duck[i])} | SFX ${r(SFX, a0, z0, (i) => 1 - 0.45 * duck[i])} | REV ${r(rv, a0, z0, () => WET)}`);
  }
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(OUT.L[i]), Math.abs(OUT.R[i]));
  console.log(`[diag] pre-limiter peak ${(20 * Math.log10(pk)).toFixed(1)} dBFS`);
  for (const [nm, bb] of [['VO', VOX], ['MUS', MUS], ['SFX', SFX], ['REV', rv]]) {
    let m = 0, at = 0;
    for (let i = 0; i < N; i++) {
      const v = Math.max(Math.abs(bb.L[i]), Math.abs(bb.R[i]));
      if (v > m) { m = v; at = i; }
    }
    console.log(`[diag] ${nm} peak ${(20 * Math.log10(m + 1e-12)).toFixed(1)} dBFS at ${(at / SR).toFixed(2)}s`);
  }
  const ceil = db(-1);
  let n = 0;
  for (let i = 0; i < N; i++) if (Math.max(Math.abs(OUT.L[i]), Math.abs(OUT.R[i])) > ceil) n++;
  console.log(`[diag] samples over -1 dBFS before limiting: ${n} (${((100 * n) / N).toFixed(3)}%)`);
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
// fade with the picture (last 20 frames) + head guard
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const f = Math.min(1, (DUR - t) / sec(20), i / (0.01 * SR));
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

const lv = (x) => 20 * Math.log10(x + 1e-12);
let pk = 0, ss = 0;
for (let i = 0; i < N; i++) { pk = Math.max(pk, Math.abs(OUT.L[i]), Math.abs(OUT.R[i])); ss += OUT.L[i] ** 2 + OUT.R[i] ** 2; }
const seg = [];
for (let s = 0; s < DUR; s += 1) {
  let e = 0, n = 0;
  for (let i = Math.round(s * SR); i < Math.min(N, Math.round((s + 1) * SR)); i++) { e += OUT.L[i] ** 2 + OUT.R[i] ** 2; n += 2; }
  seg.push(`${s}:${lv(Math.sqrt(e / n)).toFixed(0)}`);
}
console.log(`wrote ${path.relative(root, dest)} ${DUR}s ${SR}Hz stereo`);
console.log(`peak ${lv(pk).toFixed(1)} dBFS, rms ${lv(Math.sqrt(ss / (2 * N))).toFixed(1)} dBFS, clipped samples ${clip}, voGain ${lv(voGain).toFixed(1)} dB`);
console.log('rms per 1s:', seg.join(' '));
