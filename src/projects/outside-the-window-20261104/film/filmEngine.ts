// Imperative three.js renderer for the full "Outside the Window" concept film. Stateless per frame: renderFrame(f)
// depends only on f, so Remotion can render frames in any order / in parallel tabs. B1–B2 render exactly as the
// approved sample; B3–B8 add the golden threads, the people, the lantern, the time-lapse sky, the lighthouse rings,
// the bridge, the crystal and the sea of stars.
// Per frame: 16–24 sub-frame renders accumulated in HDR (motion blur + lens blur), then bloom, ACES and a film finish.
// Everything is emissive (frosted glass lit from inside, glowing dots, stars); the sea is a planar reflection
// distorted by swell + landing ripples.
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {FullScreenQuad} from 'three/examples/jsm/postprocessing/Pass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {TexturePass} from 'three/examples/jsm/postprocessing/TexturePass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {
  CUTS,
  DOT_R,
  FEATURED,
  FEAT_DOOR,
  FPS,
  HERO,
  L1,
  LH,
  OWNED,
  PANE_Z,
  PEOPLE,
  RING,
  RING_T0,
  RW,
  T,
  TAU,
  bridgeAt,
  cameraAt,
  crystalAt,
  doorAngle,
  doorCentreY,
  drumDot,
  featDoorAngle,
  featDot,
  featSeam,
  heroDot,
  lanternAt,
  lerp,
  linesWritten,
  melodyAt,
  personGlow,
  pinkDot,
  range,
  reveal,
  ringSources,
  ripplesFilm,
  rng,
  samplesAt,
  seamGlow,
  skyAt,
  smooth,
  threadsAt,
  trioCentre,
  worldPoints,
  type DotState,
  type Featured,
  type Pulse,
  type V3,
} from './filmLayout';

const W = 1920;
const H = 1080;
const col = (hex: string, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const TEAL = '#52F0DD';
const FROST = '#7FA6D6';
const RIM = '#D6E8FF';

// ---------------------------------------------------------------- shapes
function roundRect(w: number, h: number, r: number, cx = 0, cy = 0, path: THREE.Path = new THREE.Shape()) {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  path.moveTo(x0 + r, y0);
  path.lineTo(x0 + w - r, y0);
  path.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x0 + w, y0 + h - r);
  path.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x0 + r, y0 + h);
  path.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + r);
  path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}
// chat bubble: rounded rect whose bottom-left corner becomes a small tail
function bubbleShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  s.moveTo(x0 + 0.62, y0);
  s.lineTo(x0 + w - r, y0);
  s.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x0 + w, y0 + h - r);
  s.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y0 + h);
  s.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + 0.3);
  s.quadraticCurveTo(x0, y0 - 0.02, x0 - 0.13, y0 - 0.21);
  s.quadraticCurveTo(x0 + 0.3, y0 - 0.1, x0 + 0.62, y0);
  return s;
}
function extrude(shape: THREE.Shape, depth: number, seg = 10) {
  const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: seg});
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---------------------------------------------------------------- shaders
const COMMON = `
  float hash(float n){ return fract(sin(n) * 43758.5453123); }
  float hash2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float sdRoundRect(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  float capsule(vec2 q, float x0, float x1, float y, float hh, float soft){
    float dx = max(max(x0 - q.x, q.x - x1), 0.0);
    float d = length(vec2(dx, q.y - y)) - hh;
    return 1.0 - smoothstep(-soft, soft, d);
  }
`;

// far windows (instanced): frosted body lit from inside, answers + typing dots on the front face, glowing edges
const WIN_VS = `
  attribute vec3 aColor; attribute vec3 aFrost; attribute float aSeed; attribute float aBusy; attribute float aOpenT;
  varying vec3 vObj; varying vec3 vObjN; varying vec3 vWN; varying vec3 vWorld;
  varying vec3 vColor; varying vec3 vFrost; varying float vSeed; varying float vBusy; varying float vOpenT;
  void main(){
    vObj = position; vObjN = normal; vOpenT = aOpenT;
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    vWN = normalize(mat3(m) * normal);
    vColor = aColor; vFrost = aFrost; vSeed = aSeed; vBusy = aBusy;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const WIN_FS = `
  uniform float uTime; uniform float uKind; uniform vec2 uHalf; uniform vec3 uRim; uniform float uI; uniform float uDoorGlow; uniform vec3 uSky;
  varying vec3 vObj; varying vec3 vObjN; varying vec3 vWN; varying vec3 vWorld;
  varying vec3 vColor; varying vec3 vFrost; varying float vSeed; varying float vBusy; varying float vOpenT;
  ${COMMON}
  void main(){
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vWN);
    float ndv = abs(dot(N, V));
    float F = pow(1.0 - ndv, 3.0);
    vec2 q = vObj.xy / uHalf;
    float front = smoothstep(0.35, 0.8, vObjN.z);
    float t = uTime + vSeed * 37.0;
    float busy = vBusy;
    float inner = exp(-dot(q * vec2(0.85, 1.1), q * vec2(0.85, 1.1)) * 1.3);
    vec3 col = vFrost * 0.008;
    float edge = uKind > 1.5 && uKind < 2.5 ? smoothstep(0.82, 1.0, length(q)) : smoothstep(0.86, 1.0, max(abs(q.x), abs(q.y)));
    col += front * vFrost * (0.022 + 0.08 * inner * (0.4 + 0.6 * busy) + 0.3 * edge * (0.5 + 0.5 * busy));
    float content = 0.0;
    vec2 dc = vec2(-0.48, -0.56);
    if (uKind > 1.5 && uKind < 2.5) {
      // voice orb: soft breathing ring + dots in the middle
      float rr = length(q);
      content += 0.22 * exp(-pow((rr - 0.6 - 0.04 * sin(t * 2.3)) / 0.07, 2.0)) * busy;
      dc = vec2(-0.2, -0.02);
    } else {
      float rowH = 0.15;
      float scroll = t * (0.22 + 0.45 * busy);
      float s = (q.y + 0.2) / rowH + fract(scroll);
      float k = floor(s);
      float v = fract(s);
      float id = k - floor(scroll);
      float len = 0.3 + 0.6 * hash(id * 1.7 + vSeed * 91.0);
      float blank = step(0.8, hash(id * 3.1 + vSeed * 13.0));
      float inArea = step(-0.2, q.y) * (1.0 - smoothstep(0.62, 0.78, q.y));
      float x0 = uKind > 0.5 && uKind < 1.5 ? -0.86 : -0.8;
      content += capsule(vec2(q.x, v), x0, x0 + 1.6 * len, 0.5, 0.16, 0.14) * (1.0 - blank) * inArea * 0.3;
      if (uKind > 0.5 && uKind < 1.5) content += 0.12 * (1.0 - smoothstep(0.0, 0.03, abs(q.y - 0.84))); // terminal title bar
    }
    float dots = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float p = fract(t * (0.55 + 0.5 * busy) - fi * 0.16);
      float bump = p < 0.42 ? 0.5 - 0.5 * cos(6.2831853 * p / 0.42) : 0.0;
      vec2 c = dc + vec2(fi * 0.2, bump * 0.09 * busy);
      vec2 dd = (q - c) * vec2(uHalf.x / uHalf.y, 1.0);
      float d2 = dot(dd, dd);
      dots += exp(-d2 / 0.0032) * 2.3 + exp(-d2 / 0.028) * 0.38;
    }
    vec3 inside = vec3(0.72, 0.84, 1.0) * content * 0.8 + vColor * dots * (0.3 + 0.7 * busy);
    col += front * inside;
    float back = smoothstep(0.35, 0.8, -vObjN.z);
    col += back * (vFrost * (0.02 + 0.06 * inner * busy + 0.16 * edge) + vColor * dots * 0.12 * busy);
    col += mix(uRim, vFrost, 0.5) * pow(1.0 - ndv, 6.0) * 0.22 * (0.45 + 0.55 * busy);
    col += uSky * (0.22 + 0.7 * pow(1.0 - ndv, 2.0));
    // B7: more and more windows open their doors
    float opened = smoothstep(vOpenT, vOpenT + 0.6, uTime);
    if (opened > 0.0) {
      vec2 dq = (uKind > 1.5 && uKind < 2.5) ? q - vec2(0.0, -0.42) : q - vec2(0.0, -0.58);
      float door = 1.0 - smoothstep(-0.02, 0.03, sdRoundRect(dq, vec2(0.17, 0.3), 0.08));
      col += front * opened * (door * (vColor * 1.1 + vec3(0.3)) * (0.55 + 0.45 * busy) + vColor * 0.06);
    }
    float dist = length(cameraPosition - vWorld);
    col *= mix(1.0, 0.5, smoothstep(80.0, 700.0, dist));
    col *= uI;
    gl_FragColor = vec4(col, 1.0);
  }`;

// hero: glass rim (edge-lit), front pane (frosted haze + light scattered from the dots + the door seam),
// back pane (soft interior light), text-light plane (answers being written)
const HERO_VS = `
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld; varying vec3 vON;
  void main(){
    vObj = position; vON = normal;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const RIM_FS = `
  uniform vec3 uFrost; uniform vec3 uRim; uniform float uI;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld; varying vec3 vON;
  void main(){
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = abs(dot(normalize(vWN), V));
    float F = pow(1.0 - ndv, 4.0);
    float cap = smoothstep(0.7, 0.95, abs(vON.z));
    // edge-lit glass: the rim's faces glow, its walls stay dark with a thin silhouette
    vec3 c = uFrost * 0.012 + uRim * (cap * 0.2 + (1.0 - cap) * (0.008 + 0.12 * F));
    gl_FragColor = vec4(c * uI, 1.0);
  }`;
const PANE_FS = `
  uniform vec3 uFrost; uniform vec3 uRim; uniform vec3 uDotCol; uniform vec3 uOrigin;
  uniform vec4 uDots[3]; uniform float uDotR; uniform float uPaneZ;
  uniform vec2 uSeamC; uniform vec2 uSeamHalf; uniform float uSeamR; uniform float uSeam; uniform float uHaze; uniform float uI;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld;
  ${COMMON}
  void main(){
    vec3 L = vWorld - uOrigin;
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = abs(dot(normalize(vWN), V));
    float F = pow(1.0 - ndv, 3.0);
    // light from inside, brightest behind the answers and around the dots
    float inner = 0.55 * exp(-pow((L.y - 0.25) / 0.5, 2.0)) * (1.0 - smoothstep(0.6, 1.3, abs(L.x))) + 0.25;
    vec3 haze = uFrost * (0.018 + 0.06 * inner);
    vec3 scat = vec3(0.0);
    float clearSpot = 0.0;
    for (int i = 0; i < 3; i++) {
      vec4 d = uDots[i];
      float depth = max(uPaneZ - (d.z + uDotR), 0.0);
      float sig = 0.035 + depth * 0.55;
      vec2 dv = L.xy - d.xy;
      float r2 = dot(dv, dv);
      scat += uDotCol * d.w * (0.2 * exp(-r2 / (sig * sig)) + 0.03 * exp(-r2 / 0.05));
      float contact = 1.0 - smoothstep(0.0, 0.03, depth);
      clearSpot = max(clearSpot, contact * (1.0 - smoothstep(uDotR * 0.8, uDotR * 1.25, sqrt(r2))));
    }
    // fine etched grain
    float g = hash2(floor(vObj.xy * 900.0));
    haze *= 0.85 + 0.3 * g;
    float sd = sdRoundRect(vObj.xy - uSeamC, uSeamHalf, uSeamR);
    vec3 seam = vec3(0.8, 1.0, 0.96) * uSeam * (exp(-abs(sd) / 0.003) * 0.9 + exp(-abs(sd) / 0.02) * 0.08);
    float a = uHaze * (1.0 - clearSpot);
    vec3 c = haze * a + scat * (1.0 - 0.7 * clearSpot) + seam;
    gl_FragColor = vec4(c * uI, a);
  }`;
const BACK_FS = `
  uniform vec3 uFrost; uniform vec3 uDotCol; uniform vec3 uOrigin; uniform vec4 uDots[3]; uniform float uI; uniform float uOpen; uniform vec2 uDoorC;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld;
  ${COMMON}
  void main(){
    vec3 L = vWorld - uOrigin;
    float text = 0.5 * exp(-pow((L.y - 0.25) / 0.42, 2.0)) * (1.0 - smoothstep(0.5, 1.25, abs(L.x)));
    vec3 c = uFrost * (0.012 + 0.07 * text);
    for (int i = 0; i < 3; i++) { vec2 dv = L.xy - uDots[i].xy; c += uDotCol * uDots[i].w * 0.05 * exp(-dot(dv, dv) / 0.05); }
    float sd = sdRoundRect(L.xy - uDoorC, vec2(0.37, 0.39), 0.12);
    float sill = (1.0 - smoothstep(uDoorC.y - 0.4, uDoorC.y + 0.4, L.y));
    c += vec3(0.55, 0.95, 0.92) * uOpen * (0.13 * exp(-max(sd, 0.0) / 0.1) * (0.35 + 0.9 * sill) + 0.03);
    gl_FragColor = vec4(c * uI, 1.0);
  }`;
const TEXT_FS = `
  uniform float uLine; uniform float uPhase; uniform float uWrite; uniform float uRowH; uniform vec2 uX; uniform vec2 uY; uniform float uI;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld;
  ${COMMON}
  void main(){
    float y = vObj.y - uY.x;
    float s = y / uRowH - uPhase + 1.0;
    float k = floor(s);
    float v = fract(s);
    float m = uLine - k;
    float para = floor(m / 4.0);
    float blank = step(3.0, mod(m, 4.0 + floor(hash(para) * 2.0)));
    float len = 0.42 + 0.53 * hash(m * 1.73 + 4.1);
    len *= mix(1.0, 0.55, step(2.0, mod(m, 4.0 + floor(hash(para) * 2.0))));
    float wlen = k < 0.5 ? len * uWrite : len;
    float w = uX.y - uX.x;
    float u = (vObj.x - uX.x) / w;
    float bar = capsule(vec2(u * w, v * uRowH), 0.0, wlen * w, uRowH * 0.5, uRowH * 0.1, uRowH * 0.2);
    // word gaps
    float seg = floor(u * 13.0 + hash(m) * 7.0);
    float q = fract(u * 13.0 + hash(m) * 7.0);
    bar *= 1.0 - smoothstep(0.86, 0.93, q) * (1.0 - smoothstep(0.97, 1.0, q)) * step(0.55, hash(m * 31.0 + seg)) * 0.8;
    bar *= (1.0 - blank) * step(0.0, m);
    float top = 1.0 - smoothstep(uY.y - uY.x - 0.22, uY.y - uY.x, y);
    float bottom = smoothstep(-0.02, 0.03, y);
    // the line being written has a bright head
    float head = k < 0.5 ? exp(-pow((u - wlen) * w / 0.025, 2.0)) * step(0.001, uWrite) * step(uWrite, 0.999) : 0.0;
    vec3 c = vec3(0.7, 0.84, 1.0) * bar * 0.62 * top * bottom + vec3(0.55, 1.0, 0.92) * head * 1.6 * bottom * (1.0 - blank);
    gl_FragColor = vec4(c * uI, 1.0);
  }`;
const DOT_VS = `varying vec3 vN; varying vec3 vV;
  void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const DOT_FS = `uniform vec3 uColor; uniform float uGlow;
  varying vec3 vN; varying vec3 vV;
  void main(){ float ndv = max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 c = uColor * (0.18 + 1.9 * pow(ndv, 2.6)) + vec3(0.6) * pow(ndv, 9.0);
    gl_FragColor = vec4(c * uGlow, 1.0); }`;
const HALO_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HALO_FS = `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
  void main(){ vec2 c = vUv - 0.5; float d = length(c) * 2.0; float a = exp(-d * d * 7.0) * (1.0 - smoothstep(0.8, 1.0, d));
    gl_FragColor = vec4(uColor * a * uI, 1.0); }`;
// door panel of the featured windows / door-way light
const GLOWQUAD_FS = `uniform vec3 uColor; uniform float uI; uniform vec2 uHalf; uniform float uR; uniform float uSeam; uniform float uGrad;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld;
  ${COMMON}
  void main(){ float sd = sdRoundRect(vObj.xy, uHalf, uR);
    float inside = 1.0 - smoothstep(-0.012, 0.004, sd);
    float g = mix(1.0, 0.45 + 0.75 * (1.0 - smoothstep(-uHalf.y, uHalf.y, vObj.y)), uGrad);
    float rim = mix(1.0, 0.7 + 0.6 * smoothstep(-0.12, 0.0, sd), uGrad);
    vec3 c = uColor * inside * uI * g * rim + vec3(0.85, 1.0, 1.0) * uSeam * (exp(-abs(sd) / 0.004) * 1.6 + exp(-abs(sd) / 0.02) * 0.15);
    gl_FragColor = vec4(c, 1.0); }`;

const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; vec4 wp = modelMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const SKY_FS = `uniform float uReveal; uniform float uDay; uniform float uDusk; uniform vec3 uSun; uniform vec3 uMoon; uniform float uMoonI; uniform float uSunI;
  varying vec3 vDir;
  ${COMMON}
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 zen = mix(vec3(0.003, 0.006, 0.016), vec3(0.07, 0.17, 0.38), uDay);
    vec3 hor = mix(vec3(0.05, 0.085, 0.14), vec3(0.3, 0.44, 0.6), uDay);
    vec2 dh = normalize(d.xz + vec2(1e-5));
    vec2 sh = normalize(uSun.xz + vec2(1e-5));
    float toward = max(dot(dh, sh), 0.0);
    hor = mix(hor, vec3(0.78, 0.37, 0.2), uDusk * (0.3 + 0.7 * toward));
    zen = mix(zen, vec3(0.12, 0.1, 0.25), uDusk * 0.6);
    vec3 c = mix(hor, zen, smoothstep(0.0, 0.32, abs(h)));
    float sd = acos(clamp(dot(d, uSun), -1.0, 1.0));
    c += vec3(1.0, 0.86, 0.66) * uSunI * ((1.0 - smoothstep(0.011, 0.014, sd)) * 9.0 + exp(-sd / 0.05) * 0.7 + exp(-sd / 0.32) * 0.18);
    float md = acos(clamp(dot(d, uMoon), -1.0, 1.0));
    c += vec3(1.0, 0.94, 0.84) * uMoonI * ((1.0 - smoothstep(0.0112, 0.0125, md)) * 4.0 + exp(-md / 0.035) * 0.3 + exp(-md / 0.22) * 0.06);
    vec3 bandAxis = normalize(vec3(0.42, 0.5, -0.76));
    float band = exp(-pow(dot(d, bandAxis) / 0.16, 2.0));
    float n = hash2(floor(d.xz * 220.0 + d.y * 97.0));
    c += vec3(0.022, 0.026, 0.04) * band * smoothstep(0.03, 0.35, h) * (0.7 + 0.6 * n) * (1.0 - uDay);
    gl_FragColor = vec4(c * uReveal, 1.0);
  }`;
const STAR_VS = `attribute float aSize; attribute float aB; attribute vec3 aCol; attribute float aSeed;
  uniform float uTime; uniform float uI; uniform float uPx;
  varying vec3 vC;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.75 + 0.25 * sin(uTime * (1.3 + aSeed * 2.0) + aSeed * 50.0);
    vC = aCol * aB * tw * uI;
    gl_PointSize = aSize * uPx;
    gl_Position = projectionMatrix * mv; }`;
const STAR_FS = `varying vec3 vC;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; float a = exp(-d * d * 4.5) * (1.0 - smoothstep(0.8, 1.0, d));
    gl_FragColor = vec4(vC * a, 1.0); }`;

const MAX_RIP = 12;
const MAX_POOL = 16;
const WATER_SHADER = {
  name: 'NightSea',
  uniforms: {
    color: {value: null},
    tDiffuse: {value: null},
    textureMatrix: {value: null},
    uTime: {value: 0},
    uReveal: {value: 0},
    uRip: {value: Array.from({length: MAX_RIP}, () => new THREE.Vector4())},
    uPool: {value: Array.from({length: MAX_POOL}, () => new THREE.Vector4())},
    uPoolCol: {value: Array.from({length: MAX_POOL}, () => new THREE.Vector3())},
    uMoonDir: {value: new THREE.Vector3(-0.07, 0.07, 1.0).normalize()},
    uSun: {value: new THREE.Vector3(0, -1, 0)},
    uSunI: {value: 0},
    uMoonI: {value: 1},
    uDay: {value: 0},
    uRingSrc: {value: Array.from({length: 4}, () => new THREE.Vector4())},
    uRingP: {value: Array.from({length: 4}, () => new THREE.Vector4())},
    uRingSpeed: {value: RING.speed},
  },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 color; uniform float uTime; uniform float uReveal;
    uniform vec4 uRip[${MAX_RIP}]; uniform vec4 uPool[${MAX_POOL}]; uniform vec3 uPoolCol[${MAX_POOL}]; uniform vec3 uMoonDir;
    uniform vec3 uSun; uniform float uSunI; uniform float uMoonI; uniform float uDay;
    uniform vec4 uRingSrc[4]; uniform vec4 uRingP[4]; uniform float uRingSpeed;
    varying vec4 vUv; varying vec3 vWorld;
    vec2 swell(vec2 p, float t){
      vec2 g = vec2(0.0);
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float ang = fi * 2.39 + 0.7;
        vec2 d = vec2(cos(ang), sin(ang));
        float k = 0.9 * pow(1.62, fi);
        float A = 0.016 / pow(1.75, fi);
        float w = sqrt(9.8 * k) * 0.55;
        g += d * k * A * cos(dot(d, p) * k - w * t + fi * 2.1);
      }
      return g;
    }
    vec2 fine(vec2 p, float t){
      vec2 g = vec2(0.0);
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float ang = fi * 1.31 + 0.4;
        vec2 d = vec2(cos(ang), sin(ang));
        float k = 6.0 * pow(1.5, fi);
        float A = 0.02 / pow(1.42, fi);
        float w = sqrt(9.8 * k) * 0.5;
        g += d * k * A * cos(dot(d, p) * k - w * t + fi * 1.7);
      }
      return g;
    }
    void main(){
      vec3 toCam = cameraPosition - vWorld;
      float dist = length(toCam);
      vec3 V = toCam / dist;
      vec2 g = swell(vWorld.xz, uTime) * mix(1.0, 0.25, smoothstep(30.0, 300.0, dist));
      float ripE = 0.0;
      for (int i = 0; i < ${MAX_RIP}; i++) {
        vec4 r = uRip[i];
        if (r.z <= 0.0 || r.w <= 0.0) continue;
        vec2 dv = vWorld.xz - r.xy;
        float d = length(dv) + 1e-4;
        float age = r.z;
        float x = d - 0.42 * age;
        float wdt = 0.035 + 0.06 * age;
        float env = exp(-x * x / (wdt * wdt)) * exp(-age / 1.5) * r.w;
        float k = 42.0 / (1.0 + age * 0.8);
        float dh = env * (k * cos(k * x) - 2.0 * x / (wdt * wdt) * sin(k * x)) * 0.0045;
        // a second, slower ring
        float x2 = d - 0.24 * age;
        float env2 = exp(-x2 * x2 / (wdt * wdt * 1.6)) * exp(-age / 1.2) * r.w * 0.55;
        dh += env2 * (k * cos(k * x2) - 2.0 * x2 / (wdt * wdt * 1.6) * sin(k * x2)) * 0.0045;
        g += dh * dv / d;
        ripE += env + env2;
      }
      // rhythm rings from lighthouses: an amber band of light and a ripple, one per beat
      float ringL = 0.0;
      for (int sI = 0; sI < 4; sI++) {
        vec4 src = uRingSrc[sI];
        vec4 pr = uRingP[sI];
        if (pr.y <= 0.0) continue;
        float tt = uTime - src.z;
        if (tt < 0.0) continue;
        float kmax = min(floor(tt / src.w), pr.x - 1.0);
        vec2 dv = vWorld.xz - src.xy;
        float d = length(dv) + 1e-4;
        for (int j = 0; j < 6; j++) {
          float k = kmax - float(j);
          if (k < 0.0) break;
          if (src.z + k * src.w > pr.z) continue;
          float age = tt - k * src.w;
          float x = d - uRingSpeed * age;
          float wd = 0.1 + age * 0.3;
          float band = exp(-x * x / (wd * wd)) * exp(-age / 1.8) * pr.y;
          ringL += band;
          g += band * 0.05 * (dv / d) * sin(x * 9.0);
        }
      }
      vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
      vec4 uv = vUv;
      uv.xy += N.xz * uv.w * 0.055;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;
      float cosT = clamp(dot(N, V), 0.0, 1.0);
      float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
      vec3 c = refl * mix(0.28, 1.0, F);
      c += vec3(0.002, 0.005, 0.01);
      float gl = length(g);
      for (int i = 0; i < ${MAX_POOL}; i++) {
        vec4 p = uPool[i];
        if (p.w <= 0.0) continue;
        vec2 dv = vWorld.xz - p.xy;
        float d2 = dot(dv, dv) / (p.z * p.z);
        c += uPoolCol[i] * p.w * exp(-d2) * (0.3 + 3.0 * gl);
      }
      vec2 gg = g + fine(vWorld.xz, uTime) * mix(1.0, 0.45, smoothstep(10.0, 400.0, dist));
      vec3 Ng = normalize(vec3(-gg.x, 1.0, -gg.y));
      vec3 Rv = reflect(-V, Ng);
      float sp = pow(max(dot(Rv, uMoonDir), 0.0), 650.0);
      c += vec3(1.0, 0.92, 0.78) * sp * 5.0 * uMoonI;
      float sps = pow(max(dot(Rv, uSun), 0.0), 260.0);
      c += vec3(1.0, 0.84, 0.6) * sps * 3.5 * uSunI;
      c += vec3(1.0, 0.6, 0.22) * ringL * 0.55;
      c += vec3(0.008, 0.016, 0.03) * uDay;
      float far = smoothstep(250.0, 1400.0, dist);
      c = mix(c, vec3(0.02, 0.04, 0.075), far * 0.7);
      gl_FragColor = vec4(c * uReveal, 1.0);
    }`,
};

const FINISH = {
  uniforms: {tDiffuse: {value: null}, uFade: {value: 1}, uSeed: {value: 0}, uRes: {value: new THREE.Vector2(W, H)}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFade; uniform float uSeed; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 c = vUv - 0.5;
      vec2 off = c * dot(c, c) * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float v = 1.0 - smoothstep(0.3, 0.95, length(c * vec2(1.0, 0.8)) * 1.1);
      col *= mix(0.45, 1.0, v);
      col += (hash(vUv * uRes + uSeed * 61.7) - 0.5) * 0.024;
      gl_FragColor = vec4(clamp(col * uFade, 0.0, 1.0), 1.0);
    }`,
};


// ---------------------------------------------------------------- film-only shaders
// hair-thin ribbon with a constant on-screen width; a curve from uA to uB with sag, sway and an optional helix wave
const RIB_VS = `
  attribute float aU; attribute float aSide;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uSag; uniform float uWidth; uniform vec2 uRes;
  uniform vec4 uWave; uniform vec3 uN1; uniform vec3 uN2; uniform float uTime; uniform float uSway;
  varying float vU; varying float vSide;
  vec3 curve(float u){
    vec3 p = mix(uA, uB, u) + uSag * (4.0 * u * (1.0 - u));
    float env = sin(3.14159265 * u);
    float ph = 6.2831853 * (uWave.y * u - uWave.z * uTime) + uWave.w;
    p += (uN1 * sin(ph) + uN2 * cos(ph)) * uWave.x * env;
    p.x += uSway * sin(uTime * 0.7 + u * 5.0) * env;
    p.z += uSway * cos(uTime * 0.53 + u * 4.0) * env;
    return p;
  }
  void main(){
    vU = aU; vSide = aSide;
    vec3 p = curve(aU);
    vec3 q1 = curve(min(1.0, aU + 0.003));
    vec3 q0 = curve(max(0.0, aU - 0.003));
    mat4 vp = projectionMatrix * viewMatrix;
    vec4 cp = vp * vec4(p, 1.0);
    vec4 c1 = vp * vec4(q1, 1.0);
    vec4 c0 = vp * vec4(q0, 1.0);
    if (cp.w < 0.05 || c1.w < 0.05 || c0.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uRes;
    float l = length(d);
    d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
    vec2 nrm = vec2(-d.y, d.x);
    cp.xy += nrm * aSide * uWidth / uRes * cp.w;
    gl_Position = cp;
  }`;
const RIB_FS = `
  uniform vec3 uColor; uniform float uI; uniform float uGrow; uniform float uGrowMode; uniform vec4 uP[5];
  varying float vU; varying float vSide;
  void main(){
    float vis;
    if (uGrowMode < 0.5) vis = 1.0 - smoothstep(uGrow - 0.015, uGrow + 0.0001, vU);
    else { float e = min(vU, 1.0 - vU); vis = 1.0 - smoothstep(uGrow * 0.5 - 0.015, uGrow * 0.5 + 0.0001, e); }
    float across = 1.0 - vSide * vSide;
    float pulse = 0.0;
    for (int i = 0; i < 5; i++) { vec4 p = uP[i]; if (p.z <= 0.0) continue; float x = (vU - p.x) / p.y; pulse += p.z * exp(-x * x); }
    vec3 c = (uColor * (0.6 + pulse) + vec3(1.0, 0.95, 0.85) * pulse * 0.4) * across * vis * uI;
    gl_FragColor = vec4(c, 1.0);
  }`;
// a person: a warm star with a soft halo
const PERSON_FS = `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
  void main(){ vec2 c = vUv - 0.5; float d = length(c) * 2.0;
    float a = exp(-d * d * 140.0) * 4.0 + exp(-d * d * 18.0) * 0.32 + exp(-d * d * 3.0) * 0.06;
    a *= 1.0 - smoothstep(0.85, 1.0, d);
    gl_FragColor = vec4(uColor * a * uI, 1.0); }`;
// the lantern: warm frosted glass with a hot core
const LANTERN_FS = `uniform vec3 uColor; uniform float uGlow;
  varying vec3 vN; varying vec3 vV;
  void main(){ float ndv = max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 c = uColor * (0.25 + 1.5 * pow(ndv, 1.8)) + vec3(1.0, 0.95, 0.85) * 0.55 * pow(ndv, 8.0);
    gl_FragColor = vec4(c * uGlow, 1.0); }`;
// lights on the sea (lanterns, crystals, dots, beacons, bridge sparks)
const PTS_VS = `
  attribute float aKind; attribute vec3 aCol; attribute float aSize; attribute float aF0; attribute float aF1; attribute float aSeed;
  uniform float uF; uniform float uScale; uniform float uI; uniform float uTime;
  varying vec3 vC; varying float vKind;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float on = smoothstep(aF0, aF0 + 10.0, uF) * (1.0 - smoothstep(aF1, aF1 + 12.0, uF));
    float pop = 1.0 + 1.6 * exp(-max(uF - aF0, 0.0) / 6.0) * step(aF0, uF);
    float tw = (aKind > 0.5 && aKind < 1.5) ? 0.72 + 0.28 * sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 40.0) : 0.9 + 0.1 * sin(uTime * 1.3 + aSeed * 20.0);
    float bright = aKind < 0.5 ? 1.4 : aKind < 1.5 ? 2.8 : aKind < 2.5 ? 1.6 : aKind < 3.5 ? 2.0 : 1.1;
    float px = aSize * uScale / max(-mv.z, 0.01);
    vC = aCol * bright * on * pop * tw * uI * (0.7 + 0.3 * min(1.0, px / 2.4));
    vKind = aKind;
    gl_PointSize = clamp(px, 2.3, 90.0);
    gl_Position = projectionMatrix * mv;
  }`;
const PTS_FS = `varying vec3 vC; varying float vKind;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0;
    float a = exp(-d * d * 7.0) + 0.7 * exp(-d * d * 45.0);
    if (vKind > 0.5 && vKind < 1.5) a += 0.35 * (exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 5.0) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 5.0));
    a *= 1.0 - smoothstep(0.9, 1.0, d);
    gl_FragColor = vec4(vC * a, 1.0); }`;
const LINES_VS = `attribute float aF0; uniform float uF; uniform float uI; varying float vA;
  void main(){ vA = smoothstep(aF0, aF0 + 24.0, uF) * uI; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINES_FS = `varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * 0.3 * vA, 1.0); }`;
// the crystal: clear, faceted, two colours inside, prismatic edges
const CRYSTAL_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vObj;
  void main(){ vObj = position; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const CRYSTAL_FS = `uniform float uI; uniform float uWarm;
  varying vec3 vN; varying vec3 vV; varying vec3 vObj;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(vV);
    float ndv = abs(dot(N, V));
    float F = pow(1.0 - ndv, 2.5);
    vec3 inner = mix(vec3(0.32, 0.94, 0.87), vec3(1.0, 0.71, 0.28), smoothstep(-0.1, 0.1, vObj.x + 0.06 * sin(vObj.y * 22.0)));
    inner = mix(inner, vec3(1.0, 0.82, 0.55), uWarm);
    float h = fract(dot(N, vec3(0.31, 0.77, 0.55)) * 2.0 + ndv * 1.5);
    vec3 prism = 0.5 + 0.5 * cos(6.2831853 * (h + vec3(0.0, 0.33, 0.67)));
    vec3 R = reflect(-V, N);
    float spec = pow(max(dot(R, normalize(vec3(-0.3, 0.8, 0.5))), 0.0), 40.0) + pow(max(dot(R, normalize(vec3(0.6, 0.3, -0.7))), 0.0), 60.0);
    vec3 c = inner * (0.22 + 0.62 * ndv) + prism * F * 0.9 + vec3(1.0) * spec * 1.1;
    gl_FragColor = vec4(c * uI * 0.75, 1.0);
  }`;
// the owner's private things, soft behind the frosted glass; the half melody is the golden card
const PRIV_FS = `uniform float uI; uniform float uMel; uniform float uTime;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld;
  ${COMMON}
  float card(vec2 p, vec2 c, vec2 h, float r, float soft){ return 1.0 - smoothstep(-soft, soft, sdRoundRect(p - c, h, r)); }
  float disc(vec2 p, vec2 c, float r, float soft){ return 1.0 - smoothstep(r - soft, r + soft, length(p - c)); }
  void main(){
    vec2 p = vObj.xy;
    vec3 c = vec3(0.0);
    // photos: soft images
    c += card(p, vec2(-0.66, 0.42), vec2(0.17, 0.13), 0.03, 0.02) * (mix(vec3(0.62, 0.36, 0.5), vec3(0.3, 0.55, 0.78), smoothstep(0.29, 0.55, p.y)) + 0.55 * disc(p, vec2(-0.7, 0.38), 0.06, 0.04) * vec3(1.0, 0.82, 0.55)) * 0.48;
    c += card(p, vec2(-0.26, 0.45), vec2(0.15, 0.11), 0.03, 0.02) * (mix(vec3(0.78, 0.5, 0.3), vec3(0.95, 0.72, 0.45), smoothstep(0.36, 0.54, p.y)) + 0.45 * disc(p, vec2(-0.22, 0.47), 0.05, 0.03) * vec3(0.5, 0.75, 1.0)) * 0.44;
    c += card(p, vec2(0.64, 0.44), vec2(0.18, 0.14), 0.03, 0.02) * (mix(vec3(0.26, 0.48, 0.42), vec3(0.6, 0.56, 0.4), smoothstep(0.52, 0.72, p.x))) * 0.38;
    // notes
    float n1 = card(p, vec2(0.16, 0.36), vec2(0.17, 0.16), 0.02, 0.015);
    float ln = 0.0;
    for (int i = 0; i < 4; i++) { float y = 0.44 - float(i) * 0.055; ln += capsule(p, 0.02, 0.27 - float(i) * 0.04 * mod(float(i), 2.0), y, 0.007, 0.01); }
    c += n1 * (vec3(0.55, 0.6, 0.72) * 0.12 + vec3(0.8, 0.85, 0.95) * ln * 0.35);
    float n2 = card(p, vec2(-0.48, 0.08), vec2(0.2, 0.1), 0.02, 0.015);
    float ln2 = capsule(p, -0.64, -0.36, 0.11, 0.007, 0.01) + capsule(p, -0.64, -0.44, 0.06, 0.007, 0.01);
    c += n2 * (vec3(0.55, 0.6, 0.72) * 0.1 + vec3(0.8, 0.85, 0.95) * ln2 * 0.3);
    // contacts
    for (int i = 0; i < 4; i++) {
      vec2 cc = vec2(-0.74 + float(i) * 0.16, -0.22);
      vec3 tint = 0.5 + 0.5 * cos(6.2831853 * (float(i) * 0.23 + vec3(0.0, 0.33, 0.67)));
      c += disc(p, cc, 0.052, 0.012) * (tint * 0.3 + 0.08) + (disc(p, cc, 0.062, 0.006) - disc(p, cc, 0.052, 0.006)) * 0.15;
    }
    // the half melody: a golden card with a waveform
    float m = card(p, vec2(0.45, -0.12), vec2(0.2, 0.08), 0.03, 0.015);
    float xw = p.x - 0.27;
    float wy = -0.12 + 0.032 * sin(xw * 42.0 + uTime * 3.0) * sin(xw * 8.0);
    float wave = exp(-pow((p.y - wy) / 0.008, 2.0)) * step(0.27, p.x) * step(p.x, 0.63);
    c += (m * vec3(1.0, 0.72, 0.32) * 0.2 + wave * vec3(1.0, 0.82, 0.45) * 1.4) * uMel;
    c *= vec3(1.7, 1.6, 1.5);
    gl_FragColor = vec4(c * uI, 1.0);
  }`;
// a lighthouse: a slim column that brightens toward its beacon
const LH_FS = `uniform vec3 uColor; uniform float uI; uniform float uPulse;
  varying vec3 vObj; varying vec3 vWN; varying vec3 vWorld;
  void main(){ float y = clamp(vObj.y / 0.9 + 0.5, 0.0, 1.0);
    vec3 c = uColor * (0.12 + 1.1 * pow(y, 3.0) * (1.0 + uPulse)) + vec3(1.0, 0.9, 0.75) * pow(y, 12.0) * 2.0 * (1.0 + uPulse);
    gl_FragColor = vec4(c * uI, 1.0); }`;

// ---------------------------------------------------------------- far windows
type Kind = 'bubble' | 'terminal' | 'orb' | 'tile';
const KINDS: Kind[] = ['bubble', 'terminal', 'orb', 'tile'];
const KIND_STYLE: Record<Kind, {dot: string; frost: string; half: [number, number]; h: number}> = {
  bubble: {dot: TEAL, frost: FROST, half: [1.2, 0.8], h: 1.6},
  terminal: {dot: '#B9A2FF', frost: '#8C86D6', half: [1.1, 0.72], h: 1.45},
  orb: {dot: '#FFB547', frost: '#D29A62', half: [0.85, 0.85], h: 1.7},
  tile: {dot: '#FF8FB5', frost: '#C98AA6', half: [0.75, 0.75], h: 1.5},
};
type Win = {kind: Kind; x: number; y: number; z: number; yaw: number; s: number; seed: number; busy: number};
function makeWindows(): Win[] {
  const R = rng(20261104);
  const gauss = () => {
    let s = 0;
    for (let i = 0; i < 4; i++) s += R();
    return (s - 2) * 1.2;
  };
  const out: Win[] = [];
  const blocked = (x: number, z: number) => {
    if (Math.hypot(x, z) < 5.5) return true; // around the hero
    const ang = Math.atan2(x, z);
    const d = Math.hypot(x, z);
    if (Math.abs(ang) < 0.62 && d < 2000) return true; // the open sea in front of the door
    if (z > 10 && d < 150) return true; // the wide's foreground stays dark water
    if (x > -1 && x < 9 && z > -1.5 && z < 9) return true; // the low-wide camera's corridor
    for (const w of FEATURED) if (Math.hypot(x - w.x, z - w.z) < 3) return true;
    if (Math.hypot(x + 6, z + 3) < 21) return true; // open water behind the two windows that open in the low wide
    return false;
  };
  const cluster = (kind: Kind, cx: number, cz: number, rad: number, n: number, high: number) => {
    for (let i = 0; i < n; i++) {
      const x = cx + gauss() * rad;
      const z = cz + gauss() * rad;
      if (blocked(x, z)) continue;
      const s = 0.82 + R() * 0.32;
      const hh = (KIND_STYLE[kind].h / 2) * s;
      const y = 0.3 + hh + Math.abs(gauss()) * high + R() * 0.25;
      const busy = R() < 0.14 ? 0.12 : 0.35 + R() * 0.65;
      out.push({kind, x, y, z, yaw: (R() - 0.5) * TAU, s, seed: R(), busy});
    }
  };
  // the hero's own neighbourhood: chat bubbles behind it
  cluster('bubble', 0, -22, 9, 120, 0.6);
  for (let c = 0; c < 110; c++) {
    let ang = 0;
    let d = 0;
    do {
      ang = (R() - 0.5) * TAU;
      d = 22 + Math.pow(R(), 1.35) * 560;
    } while (Math.abs(ang) < 0.7);
    const r = R();
    const kind: Kind = r < 0.34 ? 'bubble' : r < 0.6 ? 'terminal' : r < 0.8 ? 'orb' : 'tile';
    const n = Math.round(18 + R() * 60 * (0.6 + d / 400));
    const rad = 3 + R() * 6 + d * 0.025;
    const high = R() < 0.45 ? 4 + R() * 12 : 0.8;
    cluster(kind, Math.sin(ang) * d, Math.cos(ang) * d, rad, n, high);
  }
  // a few scattered loners
  for (let i = 0; i < 160; i++) {
    const ang = (R() - 0.5) * TAU;
    const d = 12 + R() * 300;
    cluster(KINDS[Math.floor(R() * 4)], Math.sin(ang) * d, Math.cos(ang) * d, 0.01, 1, 2);
  }
  const keep = [...OWNED.map((w) => ({x: w.x, z: w.z, r: 3.5})), {x: RW.x, z: RW.z, r: 4}, {x: LH.x, z: LH.z, r: 3}];
  return out.filter((w) => !keep.some((k) => Math.hypot(w.x - k.x, w.z - k.z) < k.r));
}
// when each field window opens its door in B7 (seconds; never for most far ones)
function openTime(w: Win) {
  const d = Math.hypot(w.x - L1.x, w.z - L1.z);
  const h1 = Math.abs(Math.sin(w.seed * 9973.1)) % 1;
  const h2 = Math.abs(Math.sin(w.seed * 7919.7)) % 1;
  if (d > 280 || h1 > 0.78) return 1e9;
  return (T.crane[0] + 20) / FPS + 8.6 * Math.pow(d / 280, 0.8) + 0.8 * h2;
}

function kindGeometry(kind: Kind) {
  if (kind === 'bubble') return extrude(bubbleShape(2.4, 1.6, 0.34), 0.16, 6);
  if (kind === 'terminal') return extrude(roundRect(2.2, 1.45, 0.08) as THREE.Shape, 0.14, 4);
  if (kind === 'orb') return new THREE.CylinderGeometry(0.85, 0.85, 0.14, 48, 1).rotateX(Math.PI / 2);
  return extrude(roundRect(1.5, 1.5, 0.3) as THREE.Shape, 0.14, 6);
}

function winMaterial(kind: Kind) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: {value: 0},
      uKind: {value: KINDS.indexOf(kind)},
      uHalf: {value: new THREE.Vector2(...KIND_STYLE[kind].half)},
      uRim: {value: col(RIM)},
      uI: {value: 1},
      uDoorGlow: {value: 0},
      uSky: {value: new THREE.Vector3()},
    },
    vertexShader: WIN_VS,
    fragmentShader: WIN_FS,
  });
}

type DotRig = {core: THREE.Mesh; halo: THREE.Mesh; coreU: Record<string, {value: unknown}>; haloU: Record<string, {value: unknown}>};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sprite = {mesh: THREE.Mesh; u: Record<string, {value: any}>};
type Pool = {x: number; z: number; r: number; i: number; c: string};
type FeatRig = {w: Featured; door: THREE.Group; doorMat: THREE.ShaderMaterial; way: THREE.Mesh; wayMat: THREE.ShaderMaterial; dots: DotRig[]};

export class FilmEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, W / H, 0.04, 3600);
  private sampleRT: THREE.WebGLRenderTarget;
  private accRT: THREE.WebGLRenderTarget;
  private accMat: THREE.ShaderMaterial;
  private accQuad: FullScreenQuad;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private finish: ShaderPass;
  private shutter = 0.5;
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  private skyMat: THREE.ShaderMaterial;
  private starMat: THREE.ShaderMaterial;
  private farLightMat: THREE.ShaderMaterial;
  private water: Reflector;
  private waterU: Record<string, {value: any}>;
  private winMats: THREE.ShaderMaterial[] = [];
  private hero = new THREE.Group();
  private rimMat: THREE.ShaderMaterial;
  private paneMat: THREE.ShaderMaterial;
  private doorMat: THREE.ShaderMaterial;
  private backMat: THREE.ShaderMaterial;
  private back: THREE.Mesh;
  private textMat: THREE.ShaderMaterial;
  private doorPivot = new THREE.Group();
  private dots: DotRig[] = [];
  private feats: FeatRig[] = [];
  private rip = ripplesFilm();
  // film
  private stars!: THREE.Points;
  private pole = new THREE.Vector3(0.0, 0.8, -0.6).normalize();
  private people: Record<string, Sprite> = {};
  private ribbons: Sprite[] = [];
  private lantern!: THREE.Mesh;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private lanternU!: Record<string, {value: any}>;
  private lanternHalo!: Sprite;
  private drumDots: DotRig[] = [];
  private pinkDots: DotRig[] = [];
  private crystal!: THREE.Mesh;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private crystalU!: Record<string, {value: any}>;
  private crystalHalo!: Sprite;
  private privMat!: THREE.ShaderMaterial;
  private ptsMat!: THREE.ShaderMaterial;
  private linesMat!: THREE.ShaderMaterial;
  private rwWayMat!: THREE.ShaderMaterial;
  private rwDoor = new THREE.Group();
  private lh!: THREE.Mesh;
  private lhMat!: THREE.ShaderMaterial;
  private lhBeacon!: Sprite;
  private rings = ringSources();

  constructor(canvas: HTMLCanvasElement) {
    const r = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor('#000000');
    this.renderer = r;
    const sc = this.scene;
    sc.background = new THREE.Color('#000000');

    // ---- sky + stars + far lights (revealed when the door opens)
    this.skyMat = new THREE.ShaderMaterial({uniforms: {uReveal: {value: 0}, uDay: {value: 0}, uDusk: {value: 0}, uSun: {value: new THREE.Vector3(0, -1, 0)}, uMoon: {value: new THREE.Vector3(0, 0, 1)}, uMoonI: {value: 1}, uSunI: {value: 0}}, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false});
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), this.skyMat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    sc.add(sky);
    {
      const R = rng(77);
      const n = 7000;
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const b = new Float32Array(n);
      const c = new Float32Array(n * 3);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const az = R() * TAU;
        const el = Math.asin(Math.pow(R(), 1.25)) * 0.995 + 0.004;
        const rr = 2600;
        pos.set([Math.cos(el) * Math.sin(az) * rr, Math.sin(el) * rr, Math.cos(el) * Math.cos(az) * rr], i * 3);
        const m = Math.pow(R(), 6);
        size[i] = 1.4 + m * 4.2;
        b[i] = 0.12 + Math.pow(R(), 3) * 0.6 + m * 3.2;
        const warm = R();
        const cc = warm < 0.15 ? col('#FFD9B0') : warm < 0.4 ? col('#CFE0FF') : col('#F2F6FF');
        c.set([cc.r, cc.g, cc.b], i * 3);
        seed[i] = R();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aB', new THREE.BufferAttribute(b, 1));
      g.setAttribute('aCol', new THREE.BufferAttribute(c, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      this.starMat = new THREE.ShaderMaterial({
        uniforms: {uTime: {value: 0}, uI: {value: 0}, uPx: {value: 1}},
        vertexShader: STAR_VS,
        fragmentShader: STAR_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const stars = (this.stars = new THREE.Points(g, this.starMat));
      stars.frustumCulled = false;
      stars.renderOrder = -5;
      sc.add(stars);
      // a few lights far out on the open sea
      const m = 9;
      const fp = new Float32Array(m * 3);
      const fs = new Float32Array(m);
      const fb = new Float32Array(m);
      const fc = new Float32Array(m * 3);
      const fseed = new Float32Array(m);
      const palette = ['#FFC27A', '#7FF2E0', '#FFB0C8', '#C7B4FF', '#FFE2A8'];
      for (let i = 0; i < m; i++) {
        const az = (R() - 0.5) * 1.5;
        const d = 260 + R() * 520;
        fp.set([Math.sin(az) * d, 0.6 + R() * 1.6, Math.cos(az) * d], i * 3);
        fs[i] = 4 + R() * 4;
        fb[i] = 1.6 + R() * 2.0;
        const cc = col(palette[i % palette.length]);
        fc.set([cc.r, cc.g, cc.b], i * 3);
        fseed[i] = R();
      }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      fg.setAttribute('aSize', new THREE.BufferAttribute(fs, 1));
      fg.setAttribute('aB', new THREE.BufferAttribute(fb, 1));
      fg.setAttribute('aCol', new THREE.BufferAttribute(fc, 3));
      fg.setAttribute('aSeed', new THREE.BufferAttribute(fseed, 1));
      this.farLightMat = this.starMat.clone();
      const fl = new THREE.Points(fg, this.farLightMat);
      fl.frustumCulled = false;
      sc.add(fl);
    }

    // ---- the sea
    this.water = new Reflector(new THREE.PlaneGeometry(9000, 9000), {textureWidth: 1600, textureHeight: 900, clipBias: 0.0, shader: WATER_SHADER, multisample: 4});
    this.water.rotation.x = -Math.PI / 2;
    this.waterU = (this.water.material as THREE.ShaderMaterial).uniforms;
    this.water.visible = false;
    sc.add(this.water);

    // ---- far windows
    const wins = makeWindows();
    for (const kind of KINDS) {
      const list = wins.filter((w) => w.kind === kind);
      const geo = kindGeometry(kind);
      const mat = winMaterial(kind);
      this.winMats.push(mat);
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      const aColor = new Float32Array(list.length * 3);
      const aFrost = new Float32Array(list.length * 3);
      const aSeed = new Float32Array(list.length);
      const aBusy = new Float32Array(list.length);
      const aOpenT = new Float32Array(list.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const st = KIND_STYLE[kind];
      list.forEach((w, i) => {
        q.setFromEuler(new THREE.Euler((Math.sin(w.seed * 40) * 0.06), w.yaw, Math.sin(w.seed * 77) * 0.05));
        m4.compose(new THREE.Vector3(w.x, w.y, w.z), q, new THREE.Vector3(w.s, w.s, w.s));
        mesh.setMatrixAt(i, m4);
        const dc = col(st.dot);
        const fc = col(st.frost);
        aColor.set([dc.r, dc.g, dc.b], i * 3);
        aFrost.set([fc.r, fc.g, fc.b], i * 3);
        aSeed[i] = w.seed;
        aBusy[i] = w.busy;
        aOpenT[i] = openTime(w);
      });
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
      geo.setAttribute('aFrost', new THREE.InstancedBufferAttribute(aFrost, 3));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
      geo.setAttribute('aBusy', new THREE.InstancedBufferAttribute(aBusy, 1));
      geo.setAttribute('aOpenT', new THREE.InstancedBufferAttribute(aOpenT, 1));
      mesh.frustumCulled = false;
      sc.add(mesh);
    }

    // ---- the hero window
    const origin = new THREE.Vector3(0, HERO.y, 0);
    this.hero.position.copy(origin);
    sc.add(this.hero);
    const innerW = HERO.w - HERO.wall * 2;
    const innerH = HERO.h - HERO.wall * 2;
    const innerR = HERO.r - HERO.wall;
    {
      const shell = bubbleShape(HERO.w, HERO.h, HERO.r);
      shell.holes.push(roundRect(innerW, innerH, innerR, 0, 0, new THREE.Path()));
      this.rimMat = new THREE.ShaderMaterial({uniforms: {uFrost: {value: col(FROST)}, uRim: {value: col(RIM).lerp(col(TEAL), 0.3)}, uI: {value: 1}}, vertexShader: HERO_VS, fragmentShader: RIM_FS});
      this.hero.add(new THREE.Mesh(extrude(shell, HERO.depth, 24), this.rimMat));
    }
    const dotUniform = () => Array.from({length: 3}, () => new THREE.Vector4());
    const paneUniforms = (seamC: THREE.Vector2) => ({
      uFrost: {value: col(FROST)},
      uRim: {value: col(RIM)},
      uDotCol: {value: col(TEAL)},
      uOrigin: {value: origin.clone()},
      uDots: {value: dotUniform()},
      uDotR: {value: DOT_R},
      uPaneZ: {value: PANE_Z},
      uSeamC: {value: seamC},
      uSeamHalf: {value: new THREE.Vector2(HERO.door.w / 2, HERO.door.h / 2)},
      uSeamR: {value: HERO.door.r},
      uSeam: {value: 0},
      uHaze: {value: 0.45},
      uI: {value: 1},
    });
    const paneMaterial = (seamC: THREE.Vector2) =>
      new THREE.ShaderMaterial({
        uniforms: paneUniforms(seamC),
        vertexShader: HERO_VS,
        fragmentShader: PANE_FS,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendEquation: THREE.AddEquation,
      });
    {
      const dc = doorCentreY();
      const pane = roundRect(innerW, innerH, innerR) as THREE.Shape;
      pane.holes.push(roundRect(HERO.door.w, HERO.door.h, HERO.door.r, 0, dc, new THREE.Path()));
      this.paneMat = paneMaterial(new THREE.Vector2(0, dc));
      const paneMesh = new THREE.Mesh(extrude(pane, HERO.pane, 24), this.paneMat);
      paneMesh.position.z = HERO.depth / 2 - HERO.pane / 2;
      this.hero.add(paneMesh);
      // door: hinged on its left edge
      this.doorMat = paneMaterial(new THREE.Vector2(HERO.door.w / 2, 0));
      const doorShape = roundRect(HERO.door.w - 0.006, HERO.door.h - 0.006, HERO.door.r - 0.003, HERO.door.w / 2, 0) as THREE.Shape;
      const door = new THREE.Mesh(extrude(doorShape, HERO.pane, 16), this.doorMat);
      this.doorPivot.position.set(-HERO.door.w / 2, dc, HERO.depth / 2 - HERO.pane / 2);
      this.doorPivot.add(door);
      this.hero.add(this.doorPivot);
      // back pane
      this.backMat = new THREE.ShaderMaterial({
        uniforms: {uFrost: {value: col(FROST)}, uDotCol: {value: col(TEAL)}, uOrigin: {value: origin.clone()}, uDots: {value: dotUniform()}, uI: {value: 1}, uOpen: {value: 0}, uDoorC: {value: new THREE.Vector2(0, doorCentreY())}},
        vertexShader: HERO_VS,
        fragmentShader: BACK_FS,
      });
      this.back = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(innerW, innerH, innerR) as THREE.Shape, 24), this.backMat);
      this.back.position.z = -HERO.depth / 2 + HERO.pane;
      this.hero.add(this.back);
      // answers being written
      const tx = HERO.text;
      this.textMat = new THREE.ShaderMaterial({
        uniforms: {
          uLine: {value: 0},
          uPhase: {value: 1},
          uWrite: {value: 0},
          uRowH: {value: tx.rowH},
          uX: {value: new THREE.Vector2(tx.x0, tx.x1)},
          uY: {value: new THREE.Vector2(tx.y0, tx.y1)},
          uI: {value: 1},
        },
        vertexShader: HERO_VS,
        fragmentShader: TEXT_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const tg = new THREE.PlaneGeometry(tx.x1 - tx.x0, tx.y1 - tx.y0);
      tg.translate((tx.x0 + tx.x1) / 2, (tx.y0 + tx.y1) / 2, 0);
      const text = new THREE.Mesh(tg, this.textMat);
      text.position.z = tx.z;
      this.hero.add(text);
    }
    for (let i = 0; i < 3; i++) this.dots.push(this.makeDot(TEAL, DOT_R, sc));

    // ---- featured windows (open in the low wide)
    for (const w of FEATURED) {
      const kind: Kind = w.kind;
      const st = KIND_STYLE[kind];
      const mat = winMaterial(kind);
      this.winMats.push(mat);
      const geo = kindGeometry(kind);
      const one = new THREE.InstancedMesh(geo, mat, 1);
      const g = new THREE.Group();
      g.position.set(w.x, w.y, w.z);
      g.rotation.y = w.yaw;
      g.scale.setScalar(w.scale);
      one.setMatrixAt(0, new THREE.Matrix4());
      const dc = col(w.color);
      const fc = col(w.frost);
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array([dc.r, dc.g, dc.b]), 3));
      geo.setAttribute('aFrost', new THREE.InstancedBufferAttribute(new Float32Array([fc.r, fc.g, fc.b]), 3));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array([0.37 + FEATURED.indexOf(w) * 0.2]), 1));
      geo.setAttribute('aBusy', new THREE.InstancedBufferAttribute(new Float32Array([0.9]), 1));
      geo.setAttribute('aOpenT', new THREE.InstancedBufferAttribute(new Float32Array([1e9]), 1));
      one.frustumCulled = false;
      g.add(one);
      const front = 0.07 + 0.006;
      const dw = FEAT_DOOR.w;
      const dh = FEAT_DOOR.h;
      const doorY = FEAT_DOOR.sill + dh / 2;
      // door-way light (the inside, seen once the door swings open)
      const wayMat = new THREE.ShaderMaterial({
        uniforms: {uColor: {value: col(w.color).lerp(col('#FFFFFF'), 0.1)}, uI: {value: 0}, uHalf: {value: new THREE.Vector2(dw / 2, dh / 2)}, uR: {value: 0.08}, uSeam: {value: 0}, uGrad: {value: 1}},
        vertexShader: HERO_VS,
        fragmentShader: GLOWQUAD_FS,
      });
      const way = new THREE.Mesh(new THREE.PlaneGeometry(dw + 0.04, dh + 0.04), wayMat);
      way.position.set(0, doorY, front - 0.004);
      g.add(way);
      const doorMat = new THREE.ShaderMaterial({
        uniforms: {uColor: {value: col(w.frost, 0.05)}, uI: {value: 1}, uHalf: {value: new THREE.Vector2(dw / 2, dh / 2)}, uR: {value: 0.08}, uSeam: {value: 0}, uGrad: {value: 0}},
        vertexShader: HERO_VS,
        fragmentShader: GLOWQUAD_FS,
        side: THREE.DoubleSide,
      });
      const doorPanel = new THREE.Mesh(new THREE.PlaneGeometry(dw + 0.04, dh + 0.04), doorMat);
      doorPanel.position.x = dw / 2;
      const door = new THREE.Group();
      door.position.set(-dw / 2, doorY, front + 0.01);
      door.add(doorPanel);
      g.add(door);
      sc.add(g);
      const dots: DotRig[] = [];
      for (let k = 0; k < 3; k++) dots.push(this.makeDot(w.color, DOT_R, sc));
      this.feats.push({w, door, doorMat, way, wayMat, dots});
    }

    // ================================================================ film additions
    // the songwriter's other two AIs; the drummer's round window with its door open and its lighthouse
    OWNED.forEach((w, k) => this.singleWindow(w.kind, w.x, w.y, w.z, w.yaw, w.scale, w.color, w.frost, 0.61 + k * 0.13, 0.85, sc));
    {
      const g = this.singleWindow('orb', RW.x, RW.y, RW.z, RW.yaw, RW.scale, RW.color, RW.frost, 0.83, 0.9, sc);
      const dw = FEAT_DOOR.w;
      const dh = FEAT_DOOR.h;
      const doorY = FEAT_DOOR.sill + dh / 2;
      const front = 0.07 + 0.006;
      this.rwWayMat = new THREE.ShaderMaterial({
        uniforms: {uColor: {value: col(RW.color).lerp(col('#FFFFFF'), 0.1)}, uI: {value: 0}, uHalf: {value: new THREE.Vector2(dw / 2, dh / 2)}, uR: {value: 0.08}, uSeam: {value: 0}, uGrad: {value: 1}},
        vertexShader: HERO_VS,
        fragmentShader: GLOWQUAD_FS,
      });
      const way = new THREE.Mesh(new THREE.PlaneGeometry(dw + 0.04, dh + 0.04), this.rwWayMat);
      way.position.set(0, doorY, front - 0.004);
      g.add(way);
      const doorMat = new THREE.ShaderMaterial({
        uniforms: {uColor: {value: col(RW.frost, 0.05)}, uI: {value: 1}, uHalf: {value: new THREE.Vector2(dw / 2, dh / 2)}, uR: {value: 0.08}, uSeam: {value: 0}, uGrad: {value: 0}},
        vertexShader: HERO_VS,
        fragmentShader: GLOWQUAD_FS,
        side: THREE.DoubleSide,
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(dw + 0.04, dh + 0.04), doorMat);
      panel.position.x = dw / 2;
      this.rwDoor.position.set(-dw / 2, doorY, front + 0.01);
      this.rwDoor.add(panel);
      g.add(this.rwDoor);
      this.lhMat = new THREE.ShaderMaterial({uniforms: {uColor: {value: col('#FFB547')}, uI: {value: 0}, uPulse: {value: 0}}, vertexShader: HERO_VS, fragmentShader: LH_FS});
      this.lh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.9, 16, 1), this.lhMat);
      this.lh.position.set(LH.x, 0.45, LH.z);
      this.lh.visible = false;
      sc.add(this.lh);
      this.lhBeacon = this.makeSprite('#FFC46B', 1.6, sc, PERSON_FS);
    }
    // the people: warm lights in the sky
    for (const who of ['H', 'D', 'P'] as const) this.people[who] = this.makeSprite(PEOPLE[who].col, 6, sc, PERSON_FS);
    // threads, the bridge, the braid, the melody
    for (let k = 0; k < 13; k++) this.ribbons.push(this.makeRibbon(sc));
    // the lantern
    {
      const coreU = {uColor: {value: col('#FFC66E')}, uGlow: {value: 0}};
      this.lantern = new THREE.Mesh(new THREE.SphereGeometry(0.085, 28, 20), new THREE.ShaderMaterial({uniforms: coreU, vertexShader: DOT_VS, fragmentShader: LANTERN_FS}));
      this.lanternU = coreU;
      this.lantern.visible = false;
      sc.add(this.lantern);
      this.lanternHalo = this.makeSprite('#FFC066', 1.2, sc, HALO_FS);
    }
    // the drummer's dots and the one who says no
    for (let k = 0; k < 3; k++) this.drumDots.push(this.makeDot('#FFB547', DOT_R, sc));
    for (let k = 0; k < 3; k++) this.pinkDots.push(this.makeDot('#FF8FB5', DOT_R, sc));
    // the crystal
    {
      const g = new THREE.OctahedronGeometry(0.2, 0).toNonIndexed();
      g.scale(1, 1.45, 1);
      g.computeVertexNormals();
      this.crystalU = {uI: {value: 0}, uWarm: {value: 0}};
      this.crystal = new THREE.Mesh(g, new THREE.ShaderMaterial({uniforms: this.crystalU, vertexShader: CRYSTAL_VS, fragmentShader: CRYSTAL_FS}));
      this.crystal.visible = false;
      sc.add(this.crystal);
      this.crystalHalo = this.makeSprite('#CFF7F0', 1.6, sc, HALO_FS);
    }
    // the owner's private things inside the hero window (B4 on)
    {
      const tx = HERO.text;
      this.privMat = new THREE.ShaderMaterial({uniforms: {uI: {value: 0}, uMel: {value: 1}, uTime: {value: 0}}, vertexShader: HERO_VS, fragmentShader: PRIV_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
      const pg = new THREE.PlaneGeometry(tx.x1 - tx.x0, tx.y1 - tx.y0 + 0.12);
      pg.translate((tx.x0 + tx.x1) / 2, (tx.y0 + tx.y1) / 2 + 0.04, 0);
      const priv = new THREE.Mesh(pg, this.privMat);
      priv.position.z = tx.z + 0.006;
      this.hero.add(priv);
    }
    // the crowd of lights on the sea, and the constellations between crystals
    {
      const {points, lines} = worldPoints();
      const nP = points.length;
      const pos = new Float32Array(nP * 3);
      const kind = new Float32Array(nP);
      const colA = new Float32Array(nP * 3);
      const size = new Float32Array(nP);
      const f0 = new Float32Array(nP);
      const f1 = new Float32Array(nP);
      const seed = new Float32Array(nP);
      points.forEach((p, k) => {
        pos.set([p.x, p.y, p.z], k * 3);
        kind[k] = p.kind;
        const c = col(p.color);
        colA.set([c.r, c.g, c.b], k * 3);
        size[k] = p.size;
        f0[k] = p.f0;
        f1[k] = p.f1;
        seed[k] = p.seed;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
      g.setAttribute('aCol', new THREE.BufferAttribute(colA, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aF0', new THREE.BufferAttribute(f0, 1));
      g.setAttribute('aF1', new THREE.BufferAttribute(f1, 1));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      this.ptsMat = new THREE.ShaderMaterial({uniforms: {uF: {value: 0}, uScale: {value: 1}, uI: {value: 1}, uTime: {value: 0}}, vertexShader: PTS_VS, fragmentShader: PTS_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
      const pts = new THREE.Points(g, this.ptsMat);
      pts.frustumCulled = false;
      sc.add(pts);
      const lp = new Float32Array(lines.length * 6);
      const lf = new Float32Array(lines.length * 2);
      lines.forEach((l, k) => {
        const a = points[l.a];
        const b = points[l.b];
        lp.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
        lf[k * 2] = l.f0;
        lf[k * 2 + 1] = l.f0;
      });
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
      lg.setAttribute('aF0', new THREE.BufferAttribute(lf, 1));
      this.linesMat = new THREE.ShaderMaterial({uniforms: {uF: {value: 0}, uI: {value: 0}}, vertexShader: LINES_VS, fragmentShader: LINES_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
      const ls = new THREE.LineSegments(lg, this.linesMat);
      ls.frustumCulled = false;
      sc.add(ls);
    }

    // ---- HDR pipeline: sample (MSAA) -> accumulate (motion + lens blur) -> bloom -> tone map -> film finish
    this.sampleRT = new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType, samples: 4});
    this.accRT = new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType});
    this.accMat = new THREE.ShaderMaterial({
      uniforms: {tex: {value: null}, w: {value: 1}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, 1.0); }',
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
    });
    this.accQuad = new FullScreenQuad(this.accMat);
    this.composer = new EffectComposer(r);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new TexturePass(this.accRT.texture));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.34, 0.55, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FINISH);
    this.composer.addPass(this.finish);
  }

  private makeDot(hex: string, radius: number, sc: THREE.Scene): DotRig {
    const coreU = {uColor: {value: col(hex)}, uGlow: {value: 1}};
    const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), new THREE.ShaderMaterial({uniforms: coreU, vertexShader: DOT_VS, fragmentShader: DOT_FS}));
    const haloU = {uColor: {value: col(hex)}, uI: {value: 0.12}};
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 9, radius * 9),
      new THREE.ShaderMaterial({uniforms: haloU, vertexShader: HALO_VS, fragmentShader: HALO_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    );
    sc.add(core);
    sc.add(halo);
    return {core, halo, coreU, haloU};
  }

  renderFrame(f: number) {
    const r = this.renderer;
    const n = samplesAt(f);
    const cutBefore = CUTS.filter((c) => c <= f).pop() ?? -Infinity;
    const cutAfter = CUTS.find((c) => c > f) ?? Infinity;
    for (let i = 0; i < n; i++) {
      let t = f + ((i + 0.5) / n - 0.5) * this.shutter;
      t = Math.max(0, Math.max(cutBefore, Math.min(cutAfter - 0.01, t)));
      this.update(t, i, n, f);
      r.autoClear = true;
      r.setRenderTarget(this.sampleRT);
      r.render(this.scene, this.camera);
      this.accMat.uniforms.tex.value = this.sampleRT.texture;
      this.accMat.uniforms.w.value = 1 / n;
      this.accMat.blending = i === 0 ? THREE.NoBlending : THREE.CustomBlending;
      r.autoClear = false;
      r.setRenderTarget(this.accRT);
      this.accQuad.render(r);
    }
    r.autoClear = true;
    r.setRenderTarget(null);
    const u = this.finish.uniforms;
    u.uFade.value = smooth(range(f, 0, T.fadeIn)) * (1 - smooth(range(f, T.fadeOut[0], T.fadeOut[1] - 1)));
    u.uSeed.value = f;
    this.composer.render();
  }

  private makeSprite(hex: string, size: number, sc: THREE.Scene, fs: string): Sprite {
    const u = {uColor: {value: col(hex)}, uI: {value: 0}};
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.ShaderMaterial({uniforms: u, vertexShader: HALO_VS, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    );
    mesh.frustumCulled = false;
    mesh.visible = false;
    sc.add(mesh);
    return {mesh, u};
  }

  private makeRibbon(sc: THREE.Scene): Sprite {
    const N = 160;
    const n = (N + 1) * 2;
    const aU = new Float32Array(n);
    const aSide = new Float32Array(n);
    for (let i = 0; i <= N; i++) {
      aU[i * 2] = i / N;
      aU[i * 2 + 1] = i / N;
      aSide[i * 2] = -1;
      aSide[i * 2 + 1] = 1;
    }
    const idx: number[] = [];
    for (let i = 0; i < N; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    g.setIndex(idx);
    const u = {
      uA: {value: new THREE.Vector3()},
      uB: {value: new THREE.Vector3()},
      uSag: {value: new THREE.Vector3()},
      uWidth: {value: 1.7},
      uRes: {value: new THREE.Vector2(W, H)},
      uWave: {value: new THREE.Vector4()},
      uN1: {value: new THREE.Vector3(1, 0, 0)},
      uN2: {value: new THREE.Vector3(0, 1, 0)},
      uTime: {value: 0},
      uSway: {value: 0},
      uColor: {value: new THREE.Color()},
      uI: {value: 0},
      uGrow: {value: 1},
      uGrowMode: {value: 0},
      uP: {value: Array.from({length: 5}, () => new THREE.Vector4())},
    };
    const mesh = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({uniforms: u, vertexShader: RIB_VS, fragmentShader: RIB_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide}),
    );
    mesh.frustumCulled = false;
    mesh.visible = false;
    sc.add(mesh);
    return {mesh, u};
  }

  private setRibbon(
    rb: Sprite,
    a: V3,
    b: V3,
    sag: V3,
    width: number,
    color: string,
    I: number,
    grow: number,
    growMode: number,
    pulses: Pulse[],
    wave: {amp: number; cycles: number; speed: number; phase: number; n1: THREE.Vector3; n2: THREE.Vector3} | null,
    time: number,
    sway: number,
  ) {
    const u = rb.u;
    rb.mesh.visible = I > 0.001;
    u.uA.value.set(a.x, a.y, a.z);
    u.uB.value.set(b.x, b.y, b.z);
    u.uSag.value.set(sag.x, sag.y, sag.z);
    u.uWidth.value = width;
    u.uColor.value.set(color);
    u.uI.value = I;
    u.uGrow.value = grow;
    u.uGrowMode.value = growMode;
    u.uTime.value = time;
    u.uSway.value = sway;
    const P = u.uP.value as THREE.Vector4[];
    for (let k = 0; k < 5; k++) {
      const p = pulses[k];
      if (p) P[k].set(p.u, p.w, p.i, 0);
      else P[k].set(0, 1, 0, 0);
    }
    if (wave) {
      u.uWave.value.set(wave.amp, wave.cycles, wave.speed, wave.phase);
      u.uN1.value.copy(wave.n1);
      u.uN2.value.copy(wave.n2);
    } else u.uWave.value.set(0, 0, 0, 0);
  }

  private singleWindow(kind: Kind, x: number, y: number, z: number, yaw: number, scale: number, color: string, frost: string, seed: number, busy: number, sc: THREE.Scene) {
    const mat = winMaterial(kind);
    this.winMats.push(mat);
    const geo = kindGeometry(kind);
    const one = new THREE.InstancedMesh(geo, mat, 1);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    g.scale.setScalar(scale);
    one.setMatrixAt(0, new THREE.Matrix4());
    const dc = col(color);
    const fc = col(frost);
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array([dc.r, dc.g, dc.b]), 3));
    geo.setAttribute('aFrost', new THREE.InstancedBufferAttribute(new Float32Array([fc.r, fc.g, fc.b]), 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array([seed]), 1));
    geo.setAttribute('aBusy', new THREE.InstancedBufferAttribute(new Float32Array([busy]), 1));
    geo.setAttribute('aOpenT', new THREE.InstancedBufferAttribute(new Float32Array([1e9]), 1));
    one.frustumCulled = false;
    g.add(one);
    sc.add(g);
    return g;
  }

  private placeDot(rig: DotRig, d: DotState | null, hexPool: string, pools: Pool[], glowK = 1) {
    const on = !!d;
    rig.core.visible = on;
    rig.halo.visible = on;
    if (!d) return;
    rig.core.position.set(d.x, d.y, d.z);
    rig.core.scale.set(d.sx, d.sy, d.sz);
    rig.coreU.uGlow.value = d.glow * glowK;
    rig.halo.position.set(d.x, d.y, d.z);
    rig.halo.quaternion.copy(this.camera.quaternion);
    rig.haloU.uI.value = 0.12 * d.glow * glowK;
    if (d.onWater > 0) pools.push({x: d.x, z: d.z, r: 0.3, i: 0.16 * d.onWater, c: hexPool});
  }

  private update(t: number, i: number, n: number, f: number) {
    const cam = cameraAt(t);
    let px = cam.px;
    let py = cam.py;
    let pz = cam.pz;
    if (cam.ap > 0) {
      const fx = cam.tx - cam.px;
      const fy = cam.ty - cam.py;
      const fz = cam.tz - cam.pz;
      const fl = Math.hypot(fx, fy, fz);
      this.v1.set(fx / fl, fy / fl, fz / fl);
      this.v2.crossVectors(this.v1, this.up).normalize();
      this.v3.crossVectors(this.v2, this.v1);
      const rr = Math.sqrt((i + 0.5) / n) * cam.ap;
      const a = i * 2.39996 + f * 0.73;
      px += this.v2.x * Math.cos(a) * rr + this.v3.x * Math.sin(a) * rr;
      py += this.v2.y * Math.cos(a) * rr + this.v3.y * Math.sin(a) * rr;
      pz += this.v2.z * Math.cos(a) * rr + this.v3.z * Math.sin(a) * rr;
    }
    if (this.camera.fov !== cam.fov) {
      this.camera.fov = cam.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);
    this.camera.updateMatrixWorld();
    const s = t / FPS;
    const rv = reveal(t);
    const sk = skyAt(t);
    const inLapse = t >= T.lapse[0] && t < T.lapse[1];
    const sunI = inLapse ? smooth(range(sk.sun.y, -0.03, 0.04)) : 0;

    // sky, stars, sea
    const SU = this.skyMat.uniforms;
    SU.uReveal.value = rv;
    SU.uDay.value = sk.day;
    SU.uDusk.value = sk.dusk;
    SU.uSun.value.set(sk.sun.x, sk.sun.y, sk.sun.z);
    SU.uMoon.value.set(sk.moon.x, sk.moon.y, sk.moon.z);
    SU.uSunI.value = sunI;
    SU.uMoonI.value = sk.moonI;
    this.starMat.uniforms.uTime.value = s;
    this.starMat.uniforms.uI.value = rv * sk.stars;
    this.stars.quaternion.setFromAxisAngle(this.pole, t >= T.lapse[0] ? sk.starAngle : 0);
    this.farLightMat.uniforms.uTime.value = s;
    this.farLightMat.uniforms.uI.value = rv * (1 - 0.85 * sk.day);
    this.water.visible = rv > 0.001;
    const U = this.waterU;
    U.uTime.value = s;
    U.uReveal.value = rv;
    U.uSun.value.set(sk.sun.x, sk.sun.y, sk.sun.z);
    U.uSunI.value = sunI;
    U.uMoonDir.value.set(sk.moon.x, sk.moon.y, sk.moon.z);
    U.uMoonI.value = sk.moonI;
    U.uDay.value = sk.day;
    for (let k = 0; k < (U.uRip.value as THREE.Vector4[]).length; k++) {
      const v = (U.uRip.value as THREE.Vector4[])[k];
      const rp = this.rip[k];
      if (!rp) {
        v.set(0, 0, 0, 0);
        continue;
      }
      v.set(rp.x, rp.z, (t - rp.f) / FPS, rp.amp);
    }
    const RS = U.uRingSrc.value as THREE.Vector4[];
    const RP = U.uRingP.value as THREE.Vector4[];
    this.rings.forEach((r, k) => {
      const vis = k === 0 ? (t >= T.cut4d1 - 2 && t < T.cutB6 + 60 ? 1 : 0) : smooth(range(t, T.crane[0], T.crane[0] + 30)) * (t < T.cutB8 ? 1 : 0);
      RS[k].set(r.x, r.z, r.t0, r.period);
      RP[k].set(r.n, r.I * vis, r.end, 0);
    });

    // far windows
    const skyK = 0.32 * sk.day + 0.18 * sk.dusk;
    for (const m of this.winMats) {
      m.uniforms.uTime.value = s;
      m.uniforms.uI.value = 1;
      (m.uniforms.uSky.value as THREE.Vector3).set(0.32 * skyK + 0.5 * sk.dusk * 0.2, 0.44 * skyK, 0.6 * skyK);
    }

    // hero dots
    const dl: THREE.Vector4[] = this.paneMat.uniforms.uDots.value as THREE.Vector4[];
    const pools: Pool[] = [];
    const hd: DotState[] = [];
    for (let k = 0; k < 3; k++) {
      const d = heroDot(k, t);
      hd.push(d);
      const wx = d.x;
      const wy = d.local ? d.y + HERO.y : d.y;
      const wz = d.z;
      const rig = this.dots[k];
      const inside = (t >= T.cutB && t < T.cutC ? 0.72 : 1) * (t >= T.cutB5 && t < T.cutB8 ? 0.85 : 1); // over-the-shoulder / close two-shots: keep them from burning out
      rig.core.position.set(wx, wy, wz);
      rig.core.scale.set(d.sx, d.sy, d.sz);
      rig.coreU.uGlow.value = d.glow * inside;
      rig.halo.position.set(wx, wy, wz);
      rig.halo.quaternion.copy(this.camera.quaternion);
      rig.haloU.uI.value = 0.12 * d.glow * inside;
      dl[k].set(wx, wy - HERO.y, wz, d.glow * (d.local ? 1 : 0.4));
      if (d.onWater > 0) pools.push({x: wx, z: wz, r: 0.3, i: 0.16 * d.onWater, c: TEAL});
    }
    for (let k = 0; k < 3; k++) {
      (this.doorMat.uniforms.uDots.value as THREE.Vector4[])[k].copy(dl[k]);
      (this.backMat.uniforms.uDots.value as THREE.Vector4[])[k].copy(dl[k]);
    }
    // the answers (B1–B3), then the owner's private things (B4 on)
    const L = linesWritten(t);
    const nLine = Math.floor(L);
    const w = L - nLine;
    this.textMat.uniforms.uLine.value = nLine;
    this.textMat.uniforms.uPhase.value = smooth(Math.min(1, w / 0.3));
    this.textMat.uniforms.uWrite.value = Math.max(0, (w - 0.3) / 0.7);
    const priv = smooth(range(t, T.cut3c, T.cut3c + 20));
    this.textMat.uniforms.uI.value = 1 - priv;
    this.privMat.uniforms.uI.value = priv * (inLapse ? 0.35 + 0.65 * sk.awake : 1);
    this.privMat.uniforms.uMel.value = 1 - smooth(range(t, T.melody[0], T.melody[0] + 16));
    this.privMat.uniforms.uTime.value = s;
    // door + seam; at home again (B8) the glass is clearer
    const seam = seamGlow(t);
    this.paneMat.uniforms.uSeam.value = seam;
    this.doorMat.uniforms.uSeam.value = seam;
    const haze = 0.45 - 0.18 * smooth(range(t, T.cutB8, T.cutB8 + 40));
    this.paneMat.uniforms.uHaze.value = haze;
    this.doorMat.uniforms.uHaze.value = haze;
    this.doorPivot.rotation.y = -doorAngle(t);
    const open = smooth(range(t, T.door[0], T.door[1]));
    this.backMat.uniforms.uOpen.value = open;
    this.back.visible = !((t >= T.cutB && t < T.cutC) || (t >= T.cut4d3 && t < T.cutB5));
    if (open > 0) pools.push({x: 0, z: 0.6, r: 0.9, i: 0.2 * open, c: '#9FE9F0'});

    // featured windows (B2); their dots stay out on the water afterwards
    for (const fr of this.feats) {
      const fw = fr.w;
      fr.door.rotation.y = -featDoorAngle(fw, t);
      const fs = featSeam(fw, t);
      fr.doorMat.uniforms.uSeam.value = fs;
      const fo = smooth(range(t, fw.door[0], fw.door[1]));
      fr.wayMat.uniforms.uI.value = 0.62 * fo;
      fr.wayMat.uniforms.uSeam.value = fs;
      if (fo > 0) {
        const fx = Math.sin(fw.yaw);
        const fz = Math.cos(fw.yaw);
        pools.push({x: fw.x + fx * 0.8, z: fw.z + fz * 0.8, r: 0.9 * fw.scale, i: 0.2 * fo, c: fw.color});
      }
      for (let k = 0; k < 3; k++) {
        const d = featDot(fw, k, t);
        const rig = fr.dots[k];
        rig.core.position.set(d.x, d.y, d.z);
        rig.core.scale.setScalar(d.s);
        rig.coreU.uGlow.value = d.glow;
        rig.core.visible = d.glow > 0.01;
        rig.halo.visible = d.glow > 0.01;
        rig.halo.position.set(d.x, d.y, d.z);
        rig.halo.quaternion.copy(this.camera.quaternion);
        rig.haloU.uI.value = 0.12 * d.glow;
        if (d.onWater > 0) pools.push({x: d.x, z: d.z, r: 0.28, i: 0.15 * d.onWater, c: fw.color});
      }
    }

    // ---- film: the drummer's trio, the one who says no
    const dd = [0, 1, 2].map((k) => drumDot(k, t));
    dd.forEach((d, k) => this.placeDot(this.drumDots[k], d, '#FFB547', pools));
    const drumC = dd[0] ? trioCentre(dd as DotState[]) : null;
    const pd = [0, 1, 2].map((k) => pinkDot(k, t));
    pd.forEach((d, k) => this.placeDot(this.pinkDots[k], d, '#FF8FB5', pools));
    const pinkC = pd[0] ? trioCentre(pd as DotState[]) : null;

    // ---- threads, the bridge, the braid, the melody ribbon
    const heroC = trioCentre(hd);
    let ri = 0;
    const craneDim = 1 - 0.5 * smooth(range(t, T.crane[0] + 60, T.crane[0] + 200)) * (t < T.cutB8 ? 1 : 0);
    for (const th of threadsAt(t, heroC, drumC, pinkC)) {
      if (ri >= this.ribbons.length) break;
      this.setRibbon(this.ribbons[ri++], th.a, th.b, th.sag, th.width, th.color, th.I * rv * craneDim, th.grow, th.growMode, th.pulses, null, s, 0.25);
    }
    const br = bridgeAt(t);
    if (br.I > 0.001 && ri < this.ribbons.length) this.setRibbon(this.ribbons[ri++], br.a, br.b, {x: 0, y: 0.34, z: 0}, 2.8, '#FFE6BE', br.I * 1.7, br.grow, 1, [], null, s, 0);
    if (br.weave > 0.001 && ri + 1 < this.ribbons.length) {
      const n1 = new THREE.Vector3(0, 0, 1);
      const n2 = new THREE.Vector3(0, 1, 0);
      const mid = {x: (br.a.x + br.b.x) / 2, y: br.a.y, z: br.a.z};
      void mid;
      this.setRibbon(this.ribbons[ri++], br.a, br.b, {x: 0, y: 0.34, z: 0}, 2.6, '#5CF2DF', br.weave * 2.4, 1, 0, [], {amp: 0.085, cycles: 3, speed: 0.9, phase: 0, n1, n2}, s, 0);
      this.setRibbon(this.ribbons[ri++], br.a, br.b, {x: 0, y: 0.34, z: 0}, 2.6, '#FFB54D', br.weave * 2.4, 1, 0, [], {amp: 0.085, cycles: 3, speed: 0.9, phase: 0.5, n1, n2}, s, 0);
    }
    const me = melodyAt(t);
    if (me.I > 0.001 && ri < this.ribbons.length) {
      const dir = new THREE.Vector3(me.b.x - me.a.x, me.b.y - me.a.y, me.b.z - me.a.z);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      dir.normalize();
      const n1 = new THREE.Vector3().crossVectors(dir, this.up);
      if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0);
      n1.normalize();
      const n2 = new THREE.Vector3().crossVectors(n1, dir).normalize();
      this.setRibbon(this.ribbons[ri++], me.a, me.b, {x: 0, y: 0.03, z: 0}, 3.4, '#FFD27A', me.I * 2.6, 1, 0, [], {amp: me.amp * 1.6, cycles: 4, speed: 1.4, phase: 0, n1, n2}, s, 0);
    }
    for (; ri < this.ribbons.length; ri++) this.ribbons[ri].mesh.visible = false;

    // ---- the people
    for (const who of ['H', 'D', 'P'] as const) {
      const p = PEOPLE[who];
      const sp = this.people[who];
      const g = personGlow(who, t) * rv * (who === 'P' ? 1 : craneDim + (1 - craneDim) * 0.4);
      sp.mesh.visible = g > 0.001;
      sp.mesh.position.set(p.x, p.y, p.z);
      sp.mesh.quaternion.copy(this.camera.quaternion);
      sp.u.uI.value = g;
    }

    // ---- the lantern
    const la = lanternAt(t);
    const lOn = la.s > 0.001 && la.glow > 0.001;
    this.lantern.visible = lOn;
    this.lanternHalo.mesh.visible = lOn;
    if (lOn) {
      this.lantern.position.set(la.x, la.y, la.z);
      this.lantern.scale.setScalar(la.s);
      this.lanternU.uGlow.value = la.glow;
      this.lanternHalo.mesh.position.set(la.x, la.y, la.z);
      this.lanternHalo.mesh.quaternion.copy(this.camera.quaternion);
      this.lanternHalo.mesh.scale.setScalar(1 + 2.5 * la.flare);
      this.lanternHalo.u.uI.value = 0.3 * la.glow;
      pools.push({x: la.x, z: la.z, r: 0.55 + 1.6 * la.flare, i: 0.32 * la.glow, c: '#FFC066'});
    }

    // ---- the crystal
    const cr = crystalAt(t) as ReturnType<typeof crystalAt> & {warm?: number};
    const cOn = cr.I > 0.001 && cr.s > 0.001;
    this.crystal.visible = cOn;
    this.crystalHalo.mesh.visible = cOn;
    if (cOn) {
      this.crystal.position.set(cr.x, cr.y, cr.z);
      this.crystal.scale.setScalar(cr.s);
      this.crystal.rotation.set(0.1, cr.spin, 0.05);
      this.crystalU.uI.value = cr.I;
      this.crystalU.uWarm.value = cr.warm ?? 0;
      this.crystalHalo.mesh.position.set(cr.x, cr.y, cr.z);
      this.crystalHalo.mesh.quaternion.copy(this.camera.quaternion);
      this.crystalHalo.mesh.scale.setScalar(cr.s);
      this.crystalHalo.u.uI.value = 0.12 * cr.I;
      pools.push({x: cr.x, z: cr.z, r: 1.1 * cr.s + 0.2, i: 0.22 * cr.I, c: (cr.warm ?? 0) > 0.5 ? '#FFD49A' : '#BFEFE6'});
    }

    // ---- the drummer's window and lighthouse
    const rwOpen = t >= T.cut4d1 - 2 ? 1 : 0;
    this.rwDoor.rotation.y = -1.7 * rwOpen;
    this.rwWayMat.uniforms.uI.value = 0.62 * rwOpen;
    const lhOn = smooth(range(t, T.cut4d1 - 2, T.beacon));
    this.lh.visible = lhOn > 0.001;
    this.lh.scale.y = Math.max(0.001, lhOn);
    this.lh.position.y = 0.45 * lhOn;
    const ph = (s - RING_T0) / RING.period;
    const pulse = ph > -0.5 ? Math.exp(-(((ph % 1) + 1) % 1) * 5) * (t < T.cutB6 + 60 ? 1 : 0.4) : 0;
    this.lhMat.uniforms.uI.value = lhOn;
    this.lhMat.uniforms.uPulse.value = pulse;
    this.lhBeacon.mesh.visible = lhOn > 0.001;
    this.lhBeacon.mesh.position.set(LH.x, 0.9 * lhOn + 0.02, LH.z);
    this.lhBeacon.mesh.quaternion.copy(this.camera.quaternion);
    this.lhBeacon.u.uI.value = smooth(range(t, T.beacon - 4, T.beacon + 6)) * (0.8 + 1.2 * pulse);
    if (lhOn > 0) {
      pools.push({x: LH.x, z: LH.z, r: 0.9, i: 0.3 * lhOn * (1 + pulse), c: '#FFB547'});
      const fx = Math.sin(RW.yaw);
      const fz = Math.cos(RW.yaw);
      pools.push({x: RW.x + fx * 0.8, z: RW.z + fz * 0.8, r: 0.9, i: 0.2, c: RW.color});
    }

    // ---- the crowd on the sea and its constellations
    const scale = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
    this.ptsMat.uniforms.uF.value = t;
    this.ptsMat.uniforms.uScale.value = scale;
    this.ptsMat.uniforms.uTime.value = s;
    this.ptsMat.uniforms.uI.value = rv;
    this.linesMat.uniforms.uF.value = t;
    this.linesMat.uniforms.uI.value = smooth(range(t, T.crane[0] + 110, T.crane[1] - 40)) * (t < T.cutB8 ? 1 : 0.6);

    // light pools on the water: the nearest 16
    const cx = this.camera.position.x;
    const cz = this.camera.position.z;
    pools.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    const P = U.uPool.value as THREE.Vector4[];
    const PC = U.uPoolCol.value as THREE.Vector3[];
    for (let k = 0; k < P.length; k++) {
      const p = pools[k];
      if (!p) {
        P[k].set(0, 0, 1, 0);
        continue;
      }
      P[k].set(p.x, p.z, p.r, p.i);
      const c = col(p.c);
      PC[k].set(c.r, c.g, c.b);
    }
    // star pixel scale follows the camera fov a little
    this.starMat.uniforms.uPx.value = 30 / cam.fov;
    this.farLightMat.uniforms.uPx.value = 30 / cam.fov;
    void lerp;
  }

  dispose() {
    this.composer.dispose();
    this.sampleRT.dispose();
    this.accRT.dispose();
    this.water.dispose();
    this.renderer.dispose();
  }
}
