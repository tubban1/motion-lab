// Imperative three.js renderer for the "Outside the Window" B1→B2 sample. Stateless per frame: renderFrame(f) depends
// only on f, so Remotion can render frames in any order / in parallel tabs.
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
  PANE_Z,
  SAMPLE_FRAMES,
  T,
  TAU,
  cameraAt,
  doorAngle,
  doorCentreY,
  featDoorAngle,
  featDot,
  featSeam,
  heroDot,
  lerp,
  linesWritten,
  range,
  reveal,
  ripples,
  rng,
  samplesAt,
  seamGlow,
  smooth,
  type Featured,
} from './sampleLayout';

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
  attribute vec3 aColor; attribute vec3 aFrost; attribute float aSeed; attribute float aBusy;
  varying vec3 vObj; varying vec3 vObjN; varying vec3 vWN; varying vec3 vWorld;
  varying vec3 vColor; varying vec3 vFrost; varying float vSeed; varying float vBusy;
  void main(){
    vObj = position; vObjN = normal;
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    vWN = normalize(mat3(m) * normal);
    vColor = aColor; vFrost = aFrost; vSeed = aSeed; vBusy = aBusy;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const WIN_FS = `
  uniform float uTime; uniform float uKind; uniform vec2 uHalf; uniform vec3 uRim; uniform float uI; uniform float uDoorGlow;
  varying vec3 vObj; varying vec3 vObjN; varying vec3 vWN; varying vec3 vWorld;
  varying vec3 vColor; varying vec3 vFrost; varying float vSeed; varying float vBusy;
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
const SKY_FS = `uniform float uReveal; varying vec3 vDir;
  ${COMMON}
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 zen = vec3(0.003, 0.006, 0.016);
    vec3 hor = vec3(0.05, 0.085, 0.14);
    vec3 c = mix(hor, zen, smoothstep(0.0, 0.3, abs(h)));
    // a low moon over the open sea, with a wide soft halo
    vec3 moonDir = normalize(vec3(-0.07, 0.07, 1.0));
    float md = acos(clamp(dot(d, moonDir), -1.0, 1.0));
    c += vec3(1.0, 0.94, 0.84) * ((1.0 - smoothstep(0.0112, 0.0125, md)) * 4.0 + exp(-md / 0.035) * 0.3 + exp(-md / 0.22) * 0.06);
    vec3 bandAxis = normalize(vec3(0.42, 0.5, -0.76));
    float band = exp(-pow(dot(d, bandAxis) / 0.16, 2.0));
    float n = hash2(floor(d.xz * 220.0 + d.y * 97.0));
    c += vec3(0.022, 0.026, 0.04) * band * smoothstep(0.03, 0.35, h) * (0.7 + 0.6 * n);
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
  },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 color; uniform float uTime; uniform float uReveal;
    uniform vec4 uRip[${MAX_RIP}]; uniform vec4 uPool[${MAX_POOL}]; uniform vec3 uPoolCol[${MAX_POOL}]; uniform vec3 uMoonDir;
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
      c += vec3(1.0, 0.92, 0.78) * sp * 5.0;
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
  return out;
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
    },
    vertexShader: WIN_VS,
    fragmentShader: WIN_FS,
  });
}

type DotRig = {core: THREE.Mesh; halo: THREE.Mesh; coreU: Record<string, {value: unknown}>; haloU: Record<string, {value: unknown}>};
type FeatRig = {w: Featured; door: THREE.Group; doorMat: THREE.ShaderMaterial; way: THREE.Mesh; wayMat: THREE.ShaderMaterial; dots: DotRig[]};

export class SampleEngine {
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
  private rip = ripples();

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
    this.skyMat = new THREE.ShaderMaterial({uniforms: {uReveal: {value: 0}}, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false});
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
      const stars = new THREE.Points(g, this.starMat);
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
      });
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
      geo.setAttribute('aFrost', new THREE.InstancedBufferAttribute(aFrost, 3));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
      geo.setAttribute('aBusy', new THREE.InstancedBufferAttribute(aBusy, 1));
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

    // sky, stars, sea
    this.skyMat.uniforms.uReveal.value = rv;
    this.starMat.uniforms.uTime.value = s;
    this.starMat.uniforms.uI.value = rv;
    this.farLightMat.uniforms.uTime.value = s;
    this.farLightMat.uniforms.uI.value = rv;
    this.water.visible = rv > 0.001;
    const U = this.waterU;
    U.uTime.value = s;
    U.uReveal.value = rv;
    for (let k = 0; k < (U.uRip.value as THREE.Vector4[]).length; k++) {
      const v = (U.uRip.value as THREE.Vector4[])[k];
      const rp = this.rip[k];
      if (!rp) {
        v.set(0, 0, 0, 0);
        continue;
      }
      v.set(rp.x, rp.z, (t - rp.f) / FPS, rp.amp);
    }

    // far windows
    for (const m of this.winMats) {
      m.uniforms.uTime.value = s;
      m.uniforms.uI.value = 1;
    }

    // hero dots
    const dl: THREE.Vector4[] = this.paneMat.uniforms.uDots.value as THREE.Vector4[];
    const pools: {x: number; z: number; r: number; i: number; c: string}[] = [];
    for (let k = 0; k < 3; k++) {
      const d = heroDot(k, t);
      const wx = d.x;
      const wy = d.local ? d.y + HERO.y : d.y;
      const wz = d.z;
      const rig = this.dots[k];
      const inside = t >= T.cutB && t < T.cutC ? 0.72 : 1; // over-the-shoulder: don't let them burn out the moon path
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
    // the answers
    const L = linesWritten(t);
    const nLine = Math.floor(L);
    const w = L - nLine;
    this.textMat.uniforms.uLine.value = nLine;
    this.textMat.uniforms.uPhase.value = smooth(Math.min(1, w / 0.3));
    this.textMat.uniforms.uWrite.value = Math.max(0, (w - 0.3) / 0.7);
    // door + seam
    const seam = seamGlow(t);
    this.paneMat.uniforms.uSeam.value = seam;
    this.doorMat.uniforms.uSeam.value = seam;
    this.doorPivot.rotation.y = -doorAngle(t);
    const open = smooth(range(t, T.door[0], T.door[1]));
    this.backMat.uniforms.uOpen.value = open;
    this.back.visible = !(t >= T.cutB && t < T.cutC);
    if (open > 0) pools.push({x: 0, z: 0.6, r: 0.9, i: 0.2 * open, c: '#9FE9F0'});

    // featured windows
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
    void SAMPLE_FRAMES;
  }

  dispose() {
    this.composer.dispose();
    this.sampleRT.dispose();
    this.accRT.dispose();
    this.water.dispose();
    this.renderer.dispose();
  }
}
