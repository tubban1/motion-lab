// Imperative three.js renderer for the full visual-first Vibe Monitor 1.0 film. Stateless per frame: renderFrame(f)
// depends only on f, so Remotion can render frames in any order / in parallel tabs.
// Per frame: 12–24 sub-frame renders accumulated in HDR (motion blur; plus lens blur in the macro shots), then bloom,
// ACES tone mapping and a film finish (grain, vignette, slight chromatic aberration).
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {FullScreenQuad} from 'three/examples/jsm/postprocessing/Pass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {TexturePass} from 'three/examples/jsm/postprocessing/TexturePass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {
  ARCS,
  ARC_SEG,
  BEAM_DROP,
  BUILDINGS,
  CMD,
  CMD_POS,
  CUTS,
  DOME_C,
  DOME_R,
  DROP_FRAMES,
  FILM_FRAMES,
  FLOORS,
  HUB,
  MONITORS,
  NOTICE_B,
  O,
  RING_C,
  SESSIONS,
  SURFACED,
  T,
  TOK_H,
  TOK_TH,
  buildingTop,
  cameraAt,
  carpetGlow,
  cityAct,
  clamp01,
  cmdTyped,
  corePulse,
  danger,
  domeReveal,
  easeInCubic,
  easeOutCubic,
  floorLandFrame,
  floorState,
  hubAct,
  keepFront,
  lerp,
  makeCarpet,
  makeTowns,
  particleTime,
  range,
  ringBorn,
  ringRadius,
  rng,
  samplesAt,
  scanFlash,
  scanI,
  scanY,
  settled,
  smooth,
  waveRadius,
  worldTime,
  type FloorState,
  type Town,
} from './filmLayout';

const W = 1920;
const H = 1080;
const TAU = Math.PI * 2;
const col = (hex: string, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const TEAL = col('#4AE8C3');
const RED = col('#FF2D55');
const WHITE = col('#F2FFFB');
const DARK = col('#0B1620');
const SICK = col('#2C0E17');
const PALE = col('#D3E3EA');
const GOLD = col('#F6C177');
const SKY = col('#9CCBFF');
const SLATE = col('#5C7385');
const RING_TEAL = col('#4AE8C3', 1.6);
const RING_GOLD = col('#F6C177', 1.4);
const POINT_SCALE = H / 2 / Math.tan((15 * Math.PI) / 180); // world size → pixels at depth 1

type LineSet = {mesh: LineSegments2; geo: LineSegmentsGeometry; mat: LineMaterial; pos: Float32Array; col: Float32Array; max: number};
function makeLineSet(max: number, width: number): LineSet {
  const geo = new LineSegmentsGeometry();
  const pos = new Float32Array(max * 6);
  const colArr = new Float32Array(max * 6);
  geo.setPositions(pos);
  geo.setColors(colArr);
  const mat = new LineMaterial({linewidth: width, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, worldUnits: false});
  mat.resolution.set(W, H);
  const mesh = new LineSegments2(geo, mat);
  mesh.frustumCulled = false;
  return {mesh, geo, mat, pos, col: colArr, max};
}
function commit(ls: LineSet, n: number) {
  (ls.geo.attributes.instanceStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
  (ls.geo.attributes.instanceColorStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
  ls.geo.instanceCount = n;
}
// unit circle in the XZ plane; `on` < 1 makes it dotted/dashed
function circleSet(segs: number, width: number, color: THREE.Color, on = 1): LineSet {
  const ls = makeLineSet(segs, width);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * TAU;
    const a1 = ((i + on) / segs) * TAU;
    ls.pos.set([Math.cos(a0), 0, Math.sin(a0), Math.cos(a1), 0, Math.sin(a1)], i * 6);
    ls.col.set([color.r, color.g, color.b, color.r, color.g, color.b], i * 6);
  }
  commit(ls, segs);
  return ls;
}
function recolor(ls: LineSet, c: THREE.Color) {
  for (let i = 0; i < ls.max; i++) ls.col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
  commit(ls, ls.max);
}

const FINISH = {
  uniforms: {
    tDiffuse: {value: null},
    uFade: {value: 1},
    uSat: {value: 1},
    uFlash: {value: 0},
    uSeed: {value: 0},
    uRes: {value: new THREE.Vector2(W, H)},
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFade; uniform float uSat; uniform float uFlash; uniform float uSeed; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 c = vUv - 0.5;
      vec2 off = c * dot(c, c) * 0.010;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col += uFlash * vec3(0.75, 1.0, 0.95);
      float v = 1.0 - smoothstep(0.32, 0.92, length(c * vec2(1.0, 0.82)) * 1.1);
      col *= mix(0.42, 1.0, v);
      col += (hash(vUv * uRes + uSeed * 61.7) - 0.5) * 0.028;
      gl_FragColor = vec4(clamp(col * uFade, 0.0, 1.0), 1.0);
    }`,
};

// additive vertical light column; uv.y = 0 at the bottom end
const BEAM_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const BEAM_FS = `uniform vec3 uColor; uniform float uI; uniform float uHead; uniform float uFall; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float core = pow(f, 3.0);
    float y = vUv.y; float a = (core * 0.9 + 0.08) * (0.3 + 0.7 * exp(-y * uFall)) + uHead * core * exp(-y * 60.0) * 3.0;
    gl_FragColor = vec4(uColor * a * uI, 1.0); }`;
function beamMaterial(color: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {uColor: {value: color.clone()}, uI: {value: 0}, uHead: {value: 0}, uFall: {value: 4}},
    vertexShader: BEAM_VS,
    fragmentShader: BEAM_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

// soft additive points that pop in at aT and twinkle
const GLOW_VS = `attribute float aT; attribute float aSeed; attribute float aSize;
  uniform float uTime; uniform float uScale; uniform float uI; uniform float uPop; uniform float uMin;
  varying float vA;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float on = smoothstep(aT, aT + 4.0, uTime);
    float pop = 1.0 + uPop * exp(-max(uTime - aT, 0.0) / 5.0) * step(aT, uTime);
    float tw = 0.78 + 0.22 * sin(uTime * 0.23 + aSeed * 40.0);
    vA = on * pop * tw * uI;
    gl_PointSize = max(uMin, aSize * uScale / -mv.z);
    gl_Position = projectionMatrix * mv; }`;
const GLOW_FS = `uniform vec3 uColor; varying float vA;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; float a = exp(-d * d * 5.0) * (1.0 - smoothstep(0.85, 1.0, d));
    gl_FragColor = vec4(uColor * a * vA, 1.0); }`;
function glowMaterial(color: THREE.Color, pop = 2) {
  return new THREE.ShaderMaterial({
    uniforms: {uColor: {value: color.clone()}, uTime: {value: 0}, uScale: {value: POINT_SCALE}, uI: {value: 0}, uPop: {value: pop}, uMin: {value: 1.5}},
    vertexShader: GLOW_VS,
    fragmentShader: GLOW_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export type FilmData = {projects: number};

export class FilmEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 1200);
  // city
  private body: THREE.InstancedMesh;
  private seam: THREE.InstancedMesh;
  private emissive: THREE.InstancedBufferAttribute;
  private arcs: LineSet;
  private waveRing: LineSet;
  private logoRings: LineSet[];
  private wall: THREE.Mesh;
  private wallMat: THREE.ShaderMaterial;
  private gridMat: THREE.ShaderMaterial;
  private dust: THREE.Points;
  private dustMat: THREE.PointsMaterial;
  private dustBase: Float32Array;
  private key: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private glint: THREE.DirectionalLight;
  private rim: THREE.DirectionalLight;
  private corePoint: THREE.PointLight;
  // code carpet
  private carpetU: Record<string, {value: unknown}>;
  private caret: THREE.Mesh;
  // sessions
  private beams: THREE.Mesh[] = [];
  private landRings: LineSet[] = [];
  private procRing: LineSet;
  // monitors
  private scanDisk: THREE.Mesh;
  private scanMat: THREE.ShaderMaterial;
  private monRings: LineSet[] = [];
  private monGold: boolean[] = [];
  private motes: THREE.Points;
  private motesMat: THREE.ShaderMaterial;
  private beacon: THREE.Mesh;
  private beaconRing: LineSet;
  private beaconHead: THREE.Points;
  private beaconHeadMat: THREE.ShaderMaterial;
  // towns
  private towns: Town[];
  private townMesh: THREE.InstancedMesh;
  private townU: Record<string, {value: unknown}>;
  private townGlow: THREE.Points;
  private townGlowMat: THREE.ShaderMaterial;
  private events: THREE.Points;
  private eventsMat: THREE.ShaderMaterial;
  // dome
  private dome: THREE.Mesh;
  private domeMat: THREE.ShaderMaterial;
  private streams: THREE.InstancedMesh;
  private streamData: {sx: number; sy: number; sz: number; dx: number; dy: number; dz: number; hit: number; t0: number; v: number; len: number; c: THREE.Color}[] = [];
  private dots: THREE.Points;
  private dotsBase: Float32Array;
  private dotsMat: THREE.PointsMaterial;
  // install line
  private cmdMesh: THREE.Mesh;
  private cmdMat: THREE.ShaderMaterial;
  private cmdLayout: {pad: number; cw: number; width: number};
  // post
  private sampleRT: THREE.WebGLRenderTarget;
  private accRT: THREE.WebGLRenderTarget;
  private accMat: THREE.ShaderMaterial;
  private accQuad: FullScreenQuad;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private finish: ShaderPass;
  // scratch
  private st: FloorState = {visible: false, x: 0, y: 0, z: 0, w: 1, h: 1, d: 1, yaw: 0, move: 0};
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private preSeam = BUILDINGS.map(() => new THREE.Color());
  private preBody = BUILDINGS.map(() => new THREE.Color());
  private preEm = BUILDINGS.map(() => new THREE.Color());
  private tmp = new THREE.Color();
  private tmp2 = new THREE.Color();
  private tmp3 = new THREE.Color();
  shutter = 0.5;

  constructor(canvas: HTMLCanvasElement, data: FilmData) {
    const r = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor('#050A12');
    this.renderer = r;
    const sc = this.scene;
    sc.background = new THREE.Color('#050A12');
    sc.fog = new THREE.FogExp2('#050A12', 0.024);

    // ---- lights
    this.hemi = new THREE.HemisphereLight('#7FB2CF', '#0A1118', 0.6);
    sc.add(this.hemi);
    const key = new THREE.DirectionalLight('#FFE0BA', 2.4);
    key.position.set(-16, 26, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const scam = key.shadow.camera as THREE.OrthographicCamera;
    scam.left = -22;
    scam.right = 22;
    scam.top = 22;
    scam.bottom = -22;
    scam.near = 1;
    scam.far = 80;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 2.5;
    sc.add(key);
    this.key = key;
    const rim = new THREE.DirectionalLight('#4AE8C3', 1.2);
    rim.position.set(14, 8, -18);
    sc.add(rim);
    this.rim = rim;
    this.glint = new THREE.DirectionalLight('#FFFFFF', 0);
    sc.add(this.glint);
    this.corePoint = new THREE.PointLight('#FF3355', 0, 0, 2);
    sc.add(this.corePoint);

    // ---- ground + grid
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({color: '#08121B', roughness: 0.72, metalness: 0.12}));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    sc.add(ground);
    this.gridMat = new THREE.ShaderMaterial({
      uniforms: {uColor: {value: col('#4AE8C3', 0.32)}, uOpacity: {value: 1}, uFadeR: {value: 26}, uFine: {value: 1}, uCoarse: {value: 7.5}},
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity; uniform float uFadeR; uniform float uFine; uniform float uCoarse; varying vec3 vW;
        float gl1(vec2 p, float s){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          float l = gl1(vW.xz, 1.5) * 0.22 * uFine + gl1(vW.xz, uCoarse) * 0.6;
          float d = length(vW.xz);
          float a = l * exp(-(d * d) / (uFadeR * uFadeR)) * uOpacity;
          gl_FragColor = vec4(uColor * a, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), this.gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.012;
    sc.add(grid);

    // ---- code carpet: ~40k token bars, written on the GPU from per-instance start times
    {
      const cp = makeCarpet();
      const geo = new THREE.BoxGeometry(1, 1, 1);
      geo.translate(0.5, 0, 0);
      const tok = new Float32Array(cp.count * 4);
      const mat = new THREE.MeshStandardMaterial({color: '#0A1219', roughness: 0.85, metalness: 0.05});
      this.carpetU = {
        uTime: {value: 0},
        uGlow: {value: 0.5},
        uFresh: {value: 2.2},
        uCaret: {value: 5},
        uWaveR: {value: 0},
        uWaveI: {value: 0},
        uFrontR: {value: 0},
        uFrontI: {value: 0},
        uFadeR: {value: 66},
        uPal: {value: [TEAL.clone().multiplyScalar(1.1), SKY.clone().multiplyScalar(0.9), GOLD.clone().multiplyScalar(0.95), SLATE.clone().multiplyScalar(0.8)]},
      };
      const U = this.carpetU;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
attribute vec4 aTok;
uniform float uTime;
varying float vU; varying float vProg; varying float vCls; varying float vAge; varying float vLen; varying vec2 vXZ;`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float prog = clamp((uTime - aTok.x) / max(aTok.y, 0.001), 0.0, 1.0);
vU = position.x; vProg = prog; vCls = aTok.z; vLen = aTok.w; vAge = uTime - aTok.x - aTok.y;
transformed.x *= prog;
if (prog <= 0.0) transformed = vec3(0.0);
vXZ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;`,
          );
        sh.fragmentShader = sh.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
uniform float uGlow; uniform float uFresh; uniform float uCaret; uniform float uWaveR; uniform float uWaveI; uniform float uFrontR; uniform float uFrontI; uniform float uFadeR; uniform vec3 uPal[4];
varying float vU; varying float vProg; varying float vCls; varying float vAge; varying float vLen; varying vec2 vXZ;`,
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
{
  vec3 pc = vCls < 0.5 ? uPal[0] : vCls < 1.5 ? uPal[1] : vCls < 2.5 ? uPal[2] : uPal[3];
  float rr = length(vXZ);
  float edge = 1.0 - smoothstep(uFadeR * 0.72, uFadeR, rr);
  float fresh = vAge < 0.0 ? 1.0 : exp(-vAge / 9.0);
  float writing = 1.0 - step(0.999, vProg);
  float headW = 0.05 / max(vLen * vProg, 0.02);
  float head = writing * smoothstep(1.0 - headW, 1.0, vU);
  float dw = (rr - uWaveR) / 0.9;
  float wave = uWaveI * exp(-dw * dw);
  float df = (rr - uFrontR) / 1.4;
  float front = uFrontI * ((1.0 - smoothstep(uFrontR - 4.0, uFrontR + 0.5, rr)) * 0.55 + exp(-df * df) * 1.8);
  totalEmissiveRadiance += (pc * (uGlow * (1.0 + uFresh * fresh) + wave * 1.6 + front) + vec3(1.0, 0.97, 0.9) * head * uCaret) * edge;
}`,
          );
      };
      const mesh = new THREE.InstancedMesh(geo, mat, cp.count);
      for (let i = 0; i < cp.count; i++) {
        const o = i * 8;
        this.q.setFromAxisAngle(this.up, cp.data[o + 2]);
        this.m4.compose(this.p.set(cp.data[o], TOK_H / 2, cp.data[o + 1]), this.q, this.s.set(cp.data[o + 3], TOK_H, TOK_TH));
        mesh.setMatrixAt(i, this.m4);
        tok[i * 4] = cp.data[o + 4];
        tok[i * 4 + 1] = cp.data[o + 5];
        tok[i * 4 + 2] = cp.data[o + 6];
        tok[i * 4 + 3] = cp.data[o + 3];
      }
      geo.setAttribute('aTok', new THREE.InstancedBufferAttribute(tok, 4));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      sc.add(mesh);
      const L0 = cp.coreLine0;
      this.caret = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: col('#F2FFFB', 2.6)}));
      this.caret.scale.set(0.028, 0.05, TOK_TH * 1.1);
      this.caret.rotation.y = Math.atan2(-L0.dz, L0.dx);
      this.caret.position.set(L0.x + L0.dx * 0.014, 0.025, L0.z + L0.dz * 0.014);
      sc.add(this.caret);
    }

    // ---- city floors (bodies) + glowing seams, instanced
    {
      const n = FLOORS.length;
      const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
      this.emissive = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      bodyGeo.setAttribute('aEmissive', this.emissive);
      const bodyMat = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.4, metalness: 0.18});
      bodyMat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nattribute vec3 aEmissive;\nvarying vec3 vEmissiveI;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmissiveI = aEmissive;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vEmissiveI;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmissiveI;');
      };
      this.body = new THREE.InstancedMesh(bodyGeo, bodyMat, n);
      this.body.castShadow = true;
      this.body.receiveShadow = true;
      this.body.frustumCulled = false;
      this.seam = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: '#ffffff'}), n);
      this.seam.frustumCulled = false;
      for (let i = 0; i < n; i++) {
        this.body.setColorAt(i, DARK);
        this.seam.setColorAt(i, TEAL);
      }
      sc.add(this.body, this.seam);
    }

    // ---- dependency arcs + session links, scan wave, logo rings
    this.arcs = makeLineSet(ARCS.length * ARC_SEG + SESSIONS.length * ARC_SEG + 8, 1.8);
    sc.add(this.arcs.mesh);
    this.wallMat = new THREE.ShaderMaterial({
      uniforms: {uColor: {value: col('#4AE8C3', 1.6)}, uI: {value: 0}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
        void main(){ float h = vUv.y; float a = pow(max(1.0 - h, 0.0), 2.6) * 0.2 + (1.0 - smoothstep(0.0, 0.04, h)) * 1.4; gl_FragColor = vec4(uColor * a * uI, 1.0); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const wallGeo = new THREE.CylinderGeometry(1, 1, 7, 160, 1, true);
    wallGeo.translate(0, 3.5, 0);
    this.wall = new THREE.Mesh(wallGeo, this.wallMat);
    this.wall.frustumCulled = false;
    sc.add(this.wall);
    this.waveRing = circleSet(160, 3, col('#4AE8C3', 4));
    this.waveRing.mesh.position.y = 0.03;
    sc.add(this.waveRing.mesh);
    this.logoRings = [circleSet(120, 2, RING_TEAL, 0.22), circleSet(48, 2, RING_GOLD, 0.55)];
    for (const ls of this.logoRings) {
      ls.mesh.position.set(0, 0.04, 0.1);
      sc.add(ls.mesh);
    }

    // ---- sessions: beams from the sky, landing rings, the hub's process ring
    for (let i = 0; i < SESSIONS.length; i++) {
      const g = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true);
      g.translate(0, 0.5, 0);
      const m = new THREE.Mesh(g, beamMaterial(col('#BFFFF0', 1.2)));
      m.frustumCulled = false;
      m.visible = false;
      this.beams.push(m);
      sc.add(m);
      const lr = circleSet(72, 2.5, col('#E8FFF8', 2.2));
      lr.mesh.visible = false;
      this.landRings.push(lr);
      sc.add(lr.mesh);
    }
    this.procRing = circleSet(72, 2.2, col('#4AE8C3', 2.2), 0.5);
    this.procRing.mesh.visible = false;
    sc.add(this.procRing.mesh);

    // ---- monitors: one scan plane, 13 rings, evidence motes, one notice beacon
    {
      const g = new THREE.CircleGeometry(1, 160);
      g.rotateX(-Math.PI / 2);
      this.scanMat = new THREE.ShaderMaterial({
        uniforms: {uColor: {value: col('#7FF5DA', 1.4)}, uI: {value: 0}},
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
          void main(){ float r = length(vUv - 0.5) * 2.0;
            float rim = smoothstep(0.972, 0.996, r) * (1.0 - smoothstep(0.996, 1.0, r));
            float rings = 1.0 - smoothstep(0.0, 0.06, abs(fract(r * 14.0) - 0.5) * 2.0 - 0.9);
            float a = 0.006 + rim * 0.9 + rings * 0.02 * r;
            gl_FragColor = vec4(uColor * a * uI, 1.0); }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      this.scanDisk = new THREE.Mesh(g, this.scanMat);
      this.scanDisk.frustumCulled = false;
      this.scanDisk.visible = false;
      sc.add(this.scanDisk);
    }
    for (let i = 0; i < MONITORS.length; i++) {
      const ls = circleSet(96 + i * 12, 1.7, col('#4AE8C3', 1.3), 0.28 + (i % 3) * 0.16);
      ls.mesh.position.set(RING_C.x, 0.05, RING_C.z);
      ls.mesh.visible = false;
      this.monRings.push(ls);
      this.monGold.push(false);
      sc.add(ls.mesh);
    }
    {
      const mr = rng(918);
      const pos: number[] = [];
      const at: number[] = [];
      const seed: number[] = [];
      const size: number[] = [];
      for (const b of BUILDINGS) {
        const k = b.slot.hub ? 6 : 2 + Math.floor(mr() * 3);
        for (let i = 0; i < k; i++) {
          const lx = (mr() - 0.5) * b.slot.w * 0.8;
          const lz = (mr() - 0.5) * b.slot.d * 0.8;
          const c = Math.cos(b.slot.yaw);
          const s = Math.sin(b.slot.yaw);
          pos.push(b.slot.x + lx * c + lz * s, b.slot.h + 0.12 + mr() * 0.25, b.slot.z - lx * s + lz * c);
          at.push(T.evidence + mr() * 40);
          seed.push(mr());
          size.push(0.12 + mr() * 0.1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1));
      g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
      g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
      this.motesMat = glowMaterial(col('#B8FFEC', 2.2), 2.5);
      this.motes = new THREE.Points(g, this.motesMat);
      this.motes.frustumCulled = false;
      this.motes.visible = false;
      sc.add(this.motes);
    }
    {
      const g = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
      g.translate(0, 0.5, 0);
      const m = beamMaterial(col('#F6C177', 1.6));
      (m.uniforms.uFall as {value: number}).value = 0.6;
      this.beacon = new THREE.Mesh(g, m);
      this.beacon.visible = false;
      this.beacon.frustumCulled = false;
      sc.add(this.beacon);
      this.beaconRing = circleSet(56, 2, col('#F6C177', 2.0));
      this.beaconRing.mesh.visible = false;
      sc.add(this.beaconRing.mesh);
      const hg = new THREE.BufferGeometry();
      hg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      hg.setAttribute('aT', new THREE.Float32BufferAttribute([0], 1));
      hg.setAttribute('aSeed', new THREE.Float32BufferAttribute([0.3], 1));
      hg.setAttribute('aSize', new THREE.Float32BufferAttribute([0.9], 1));
      this.beaconHeadMat = glowMaterial(col('#FFD9A0', 3.0), 0);
      this.beaconHead = new THREE.Points(hg, this.beaconHeadMat);
      this.beaconHead.frustumCulled = false;
      this.beaconHead.visible = false;
      sc.add(this.beaconHead);
    }

    // ---- towns: one per observed project instance (count from data.json), event sparks rising from them
    this.towns = makeTowns(data.projects);
    {
      const tr = rng(1970);
      const mats: number[] = [];
      const lit: number[] = [];
      for (const t of this.towns) {
        if (t.ours) continue;
        const k = 3 + Math.floor(t.seed * 6);
        for (let i = 0; i < k; i++) {
          const a = tr() * TAU;
          const d = i === 0 ? 0 : 0.6 + tr() * 1.3;
          const h = i === 0 ? 1.6 + tr() * 1.4 : 0.4 + tr() * 1.4;
          const w = 0.5 + tr() * 0.55;
          const dd = 0.5 + tr() * 0.55;
          this.q.setFromAxisAngle(this.up, tr() * Math.PI);
          this.m4.compose(this.p.set(t.x + Math.cos(a) * d, h / 2, t.z + Math.sin(a) * d), this.q, this.s.set(w, h, dd));
          mats.push(...this.m4.elements);
          lit.push(t.lit, 0.35 + tr() * 0.4);
        }
      }
      const n = lit.length / 2;
      const geo = new THREE.BoxGeometry(1, 1, 1);
      geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array(lit), 2));
      const mat = new THREE.MeshStandardMaterial({color: '#AFC4CF', roughness: 0.5, metalness: 0.1});
      this.townU = {uTime: {value: 0}, uTownI: {value: 1}, uTownCol: {value: col('#4AE8C3', 1.0)}, uSink: {value: 0}};
      const U = this.townU;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute vec2 aLit;\nuniform float uTime;\nuniform float uTownI;\nuniform float uSink;\nvarying float vLitA;')
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float on = smoothstep(aLit.x, aLit.x + 6.0, uTime);
float flash = exp(-max(uTime - aLit.x, 0.0) / 6.0) * step(aLit.x, uTime);
vLitA = (on * aLit.y + flash * 2.2) * uTownI;
transformed.y = (transformed.y + 0.5) * max(1.0 - uSink, 0.001) - 0.5;`,
          );
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uTownCol;\nvarying float vLitA;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uTownCol * vLitA;');
      };
      this.townMesh = new THREE.InstancedMesh(geo, mat, n);
      (this.townMesh.instanceMatrix.array as Float32Array).set(mats);
      this.townMesh.instanceMatrix.needsUpdate = true;
      this.townMesh.frustumCulled = false;
      this.townMesh.visible = false;
      sc.add(this.townMesh);

      const gp: number[] = [];
      const ga: number[] = [];
      const gs: number[] = [];
      const gz: number[] = [];
      for (const t of this.towns) {
        gp.push(t.x, t.ours ? 3 : 1.4, t.z);
        ga.push(t.lit);
        gs.push(t.seed);
        gz.push(t.ours ? 0 : 7 + t.seed * 4);
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
      gg.setAttribute('aT', new THREE.Float32BufferAttribute(ga, 1));
      gg.setAttribute('aSeed', new THREE.Float32BufferAttribute(gs, 1));
      gg.setAttribute('aSize', new THREE.Float32BufferAttribute(gz, 1));
      this.townGlowMat = glowMaterial(col('#4AE8C3', 0.9), 3);
      this.townGlow = new THREE.Points(gg, this.townGlowMat);
      this.townGlow.frustumCulled = false;
      this.townGlow.visible = false;
      sc.add(this.townGlow);

      const NE = 16000;
      const ep = new Float32Array(NE * 3);
      const eP = new Float32Array(NE * 4);
      const eS = new Float32Array(NE);
      for (let i = 0; i < NE; i++) {
        const t = this.towns[Math.floor(tr() * this.towns.length)];
        const spread = t.ours ? 9 : 1.6;
        eP.set([t.x + (tr() - 0.5) * spread, t.z + (tr() - 0.5) * spread, t.lit + 2 + tr() * (T.b7 + 30 - t.lit), 0.12 + tr() * 0.22], i * 4);
        eS[i] = tr();
      }
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      eg.setAttribute('aP', new THREE.BufferAttribute(eP, 4));
      eg.setAttribute('aSeed', new THREE.BufferAttribute(eS, 1));
      this.eventsMat = new THREE.ShaderMaterial({
        uniforms: {uTime: {value: 0}, uScale: {value: POINT_SCALE}, uI: {value: 0}, uColor: {value: col('#BFFFF0', 1.4)}},
        vertexShader: `attribute vec4 aP; attribute float aSeed; uniform float uTime; uniform float uScale; uniform float uI; varying float vA;
          void main(){ float age = uTime - aP.z; float life = 64.0;
            if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; vA = 0.0; return; }
            vec3 p = vec3(aP.x + sin(aSeed * 30.0 + age * 0.05) * 0.4, 0.8 + age * aP.w, aP.y + cos(aSeed * 17.0 + age * 0.04) * 0.4);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vA = smoothstep(0.0, 6.0, age) * (1.0 - smoothstep(life * 0.45, life, age)) * uI;
            gl_PointSize = max(1.2, 0.55 * uScale / -mv.z);
            gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GLOW_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.events = new THREE.Points(eg, this.eventsMat);
      this.events.frustumCulled = false;
      this.events.visible = false;
      sc.add(this.events);
    }

    // ---- the machine boundary (dome), source streams that stop at it, metric dots that pass
    {
      const g = new THREE.SphereGeometry(DOME_R, 144, 48, 0, TAU, 0, Math.PI / 2);
      this.domeMat = new THREE.ShaderMaterial({
        uniforms: {uColor: {value: col('#7FF5DA', 1.0)}, uI: {value: 0}, uReveal: {value: 0}, uTime: {value: 0}, uImp: {value: Array.from({length: 12}, () => new THREE.Vector4(0, -100, 0, -1000))}},
        vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform vec3 uColor; uniform float uI; uniform float uReveal; uniform float uTime; uniform vec4 uImp[12]; varying vec3 vW; varying vec3 vN;
          float gline(float v, float n){ float g = fract(v * n); float d = min(g, 1.0 - g) / max(fwidth(v * n), 1e-4); return 1.0 - clamp(d, 0.0, 1.0); }
          void main(){
            float h = clamp(vW.y / ${DOME_R.toFixed(1)}, 0.0, 1.0);
            float vis = 1.0 - smoothstep(uReveal - 0.03, uReveal, h);
            float eh = (h - uReveal) / 0.01;
            float edge = exp(-eh * eh) * step(0.002, uReveal) * (1.0 - step(0.998, uReveal));
            vec3 V = normalize(cameraPosition - vW);
            float fres = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
            float lon = atan(vW.z - ${DOME_C.z.toFixed(2)}, vW.x - ${DOME_C.x.toFixed(2)}) / 6.2831853;
            float lat = asin(h) / 1.5707963;
            float gridA = gline(lon, 36.0) * 0.14 + gline(lat, 9.0) * 0.12;
            float a = (fres * 0.42 + gridA + 0.008) * vis + edge * 1.4;
            for (int i = 0; i < 12; i++) {
              vec4 im = uImp[i]; float age = uTime - im.w;
              if (age > 0.0 && age < 40.0) {
                float d = distance(vW, im.xyz);
                float rd = (d - age * 0.11) / 0.12;
                float ring = exp(-rd * rd) * exp(-age / 10.0);
                float spot = exp(-d * d / 0.25) * exp(-age / 3.0);
                a += (ring * 1.1 + spot * 2.4) * vis;
              }
            }
            gl_FragColor = vec4(uColor * a * uI, 1.0);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      this.dome = new THREE.Mesh(g, this.domeMat);
      this.dome.position.set(DOME_C.x, 0, DOME_C.z);
      this.dome.frustumCulled = false;
      this.dome.visible = false;
      sc.add(this.dome);

      const sr = rng(1436);
      const NS = 110;
      for (let i = 0; i < NS; i++) {
        const b = BUILDINGS[Math.floor(sr() * BUILDINGS.length)];
        const sx = b.slot.x + (sr() - 0.5) * 0.8;
        const sz = b.slot.z + (sr() - 0.5) * 0.8;
        const sy = b.slot.h + 0.2;
        const ox = sx - DOME_C.x;
        const oz = sz - DOME_C.z;
        const ol = Math.hypot(ox, oz) || 1;
        const out = 0.35 + sr() * 0.9;
        let dx = (ox / ol) * out + (sr() - 0.5) * 0.4;
        let dy = 1;
        let dz = (oz / ol) * out + (sr() - 0.5) * 0.4;
        const dl = Math.hypot(dx, dy, dz);
        dx /= dl;
        dy /= dl;
        dz /= dl;
        // distance along the ray to the dome: |S + D s - C| = R
        const px = sx - DOME_C.x;
        const py = sy;
        const pz = sz - DOME_C.z;
        const bq = px * dx + py * dy + pz * dz;
        const cq = px * px + py * py + pz * pz - DOME_R * DOME_R;
        const hit = -bq + Math.sqrt(bq * bq - cq);
        const cls = sr();
        this.streamData.push({
          sx, sy, sz, dx, dy, dz, hit: hit - 0.15,
          t0: T.streams + sr() * 20,
          v: 0.75 + sr() * 0.5,
          len: 0.25 + sr() * 0.45,
          c: (cls < 0.45 ? TEAL : cls < 0.8 ? SKY : GOLD).clone().multiplyScalar(2.2),
        });
      }
      this.streams = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: '#ffffff'}), NS);
      this.streams.frustumCulled = false;
      this.streams.visible = false;
      for (let i = 0; i < NS; i++) this.streams.setColorAt(i, this.streamData[i].c);
      sc.add(this.streams);

      const ND = 26;
      this.dotsBase = new Float32Array(ND * 4);
      for (let i = 0; i < ND; i++) {
        const b = BUILDINGS[Math.floor(sr() * BUILDINGS.length)];
        this.dotsBase.set([b.slot.x + (sr() - 0.5) * 0.6, b.slot.z + (sr() - 0.5) * 0.6, T.streams + 6 + sr() * 56, b.slot.h + 0.3], i * 4);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
      this.dotsMat = new THREE.PointsMaterial({size: 0.16, color: col('#DFFFF6', 2.5), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true});
      this.dots = new THREE.Points(dg, this.dotsMat);
      this.dots.frustumCulled = false;
      this.dots.visible = false;
      sc.add(this.dots);
    }

    // ---- the install line, typed on the ground
    {
      const font = '600 120px Consolas, "Cascadia Mono", monospace';
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d')!;
      cx.font = font;
      const cw = cx.measureText('M').width;
      const pad = 40;
      cv.width = Math.ceil(cw * CMD.length + pad * 2);
      cv.height = 200;
      const c2 = cv.getContext('2d')!;
      c2.fillStyle = '#000';
      c2.fillRect(0, 0, cv.width, cv.height);
      c2.font = font;
      c2.textBaseline = 'middle';
      c2.fillStyle = '#fff';
      for (let i = 0; i < CMD.length; i++) c2.fillText(CMD[i], pad + i * cw, cv.height / 2 + 4);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 8;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      this.cmdLayout = {pad, cw, width: cv.width};
      const width = CMD_POS.x1 - CMD_POS.x0;
      const height = width * (cv.height / cv.width);
      const g = new THREE.PlaneGeometry(width, height);
      g.rotateX(-Math.PI / 2);
      this.cmdMat = new THREE.ShaderMaterial({
        uniforms: {uTex: {value: tex}, uHead: {value: 0}, uI: {value: 0}, uCaret: {value: 0}, uColor: {value: col('#7FF5DA', 1.0)}, uHot: {value: col('#F2FFFB', 3.0)}},
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D uTex; uniform float uHead; uniform float uI; uniform float uCaret; uniform vec3 uColor; uniform vec3 uHot; varying vec2 vUv;
          void main(){ float m = texture2D(uTex, vUv).r;
            float shown = 1.0 - smoothstep(uHead - 0.002, uHead, vUv.x);
            float hot = exp(-max(uHead - vUv.x, 0.0) / 0.035);
            vec3 c = mix(uColor * 1.3, uHot, hot) * m * shown;
            float caret = uCaret * (1.0 - smoothstep(0.0, 0.004, abs(vUv.x - uHead - 0.006))) * step(0.18, vUv.y) * step(vUv.y, 0.82);
            gl_FragColor = vec4((c + uHot * caret) * uI, 1.0); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.cmdMesh = new THREE.Mesh(g, this.cmdMat);
      this.cmdMesh.position.set((CMD_POS.x0 + CMD_POS.x1) / 2, 0.04, CMD_POS.z);
      this.cmdMesh.frustumCulled = false;
      this.cmdMesh.visible = false;
      sc.add(this.cmdMesh);
    }

    // ---- dust
    {
      const dr = rng(9);
      const N = 900;
      this.dustBase = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) this.dustBase.set([(dr() - 0.5) * 44, 0.2 + dr() * 10, (dr() - 0.5) * 44, dr()], i * 4);
      const dgeo = new THREE.BufferGeometry();
      dgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      const dot = document.createElement('canvas');
      dot.width = 64;
      dot.height = 64;
      const g = dot.getContext('2d')!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(dot);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.dustMat = new THREE.PointsMaterial({size: 0.09, map: tex, color: '#9FF5E1', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true});
      this.dust = new THREE.Points(dgeo, this.dustMat);
      this.dust.frustumCulled = false;
      sc.add(this.dust);
      this.dotsMat.map = tex;
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
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.42, 0.3, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FINISH);
    this.composer.addPass(this.finish);
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
    const flash = f >= T.impact ? Math.exp(-(f - T.impact) / 2.5) : 0;
    const ign = f >= T.ignite ? Math.exp(-(f - T.ignite) / 4) : 0;
    const u = this.finish.uniforms;
    u.uFade.value = 1 - smooth(range(f, FILM_FRAMES - 20, FILM_FRAMES - 1));
    u.uSat.value = 1 - 0.45 * smooth(range(f, T.freeze, T.freeze + 8)) * (1 - smooth(range(f, T.impact, T.impact + 6)));
    u.uFlash.value = 0.1 * flash;
    u.uSeed.value = f;
    this.bloom.strength = 0.42 + 0.35 * flash + 0.12 * ign;
    r.toneMappingExposure = 1.0 + 0.25 * flash;
    this.composer.render();
  }

  private update(t: number, i: number, n: number, f: number) {
    const cam = cameraAt(t);
    // lens blur: jitter the eye on a disk, keep looking at the focus point
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
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);
    const fog = this.scene.fog as THREE.FogExp2;
    let fd = 0.024;
    fd = lerp(fd, 0.0035, smooth(range(t, T.craneStart, T.craneEnd - 12)));
    fd = lerp(fd, 0.008, smooth(range(t, T.b4 + 5, 604)));
    fd = lerp(fd, 0.0012, smooth(range(t, T.b6 + 3, 1230)));
    fd = lerp(fd, 0.008, smooth(range(t, T.b7 + 20, 1442)));
    fd = lerp(fd, 0.02, t >= T.cut ? 1 : 0);
    fd = lerp(fd, 0.0035, smooth(range(t, T.crane[0] + 10, T.crane[1] - 10)));
    fog.density = fd;
    this.updateCarpet(t);
    this.updateFloors(t);
    this.updateArcs(t);
    this.updateFx(t);
    this.updateSessions(t);
    this.updateMonitors(t);
    this.updateTowns(t);
    this.updateDome(t);
    this.updateCommand(t);
  }

  private updateCarpet(t: number) {
    const U = this.carpetU;
    U.uTime.value = t;
    U.uGlow.value = carpetGlow(t);
    U.uFresh.value = 2.2;
    U.uCaret.value = 3.6;
    const R = waveRadius(t);
    U.uWaveR.value = R;
    U.uWaveI.value = t >= T.impact ? 1 - range(t, T.impact + T.scanDur - 6, T.impact + T.scanDur + 10) : 0;
    U.uFrontR.value = keepFront(t);
    U.uFrontI.value = t >= T.crane[0] ? 0.38 * (1 - 0.75 * smooth(range(t, T.final - 10, T.final + 40))) : 0;
    // caret blink before typing starts
    const blinkOn = t < T.blink && t >= 2 && Math.floor((t - 2) / 8) % 2 === 0;
    this.caret.visible = blinkOn;
  }

  private updateFloors(t: number) {
    const wt = worldTime(t);
    const pulse = corePulse(t);
    const sY = scanY(t);
    const sI = scanI(t);
    const s7 = 5.2 * smooth(range(t, T.scan7, T.scan7 + 20));
    const s7I = smooth(range(t, T.scan7 - 2, T.scan7 + 3)) * (1 - smooth(range(t, T.scan7 + 17, T.scan7 + 25)));
    const notice = smooth(range(t, T.notice + 3, T.notice + 14)) * (1 - smooth(range(t, T.b6, T.b6 + 30)));
    for (let bi = 0; bi < BUILDINGS.length; bi++) {
      const b = BUILDINGS[bi];
      const dg = danger(b, t);
      const fl = scanFlash(b, t);
      const sc = this.preSeam[bi].copy(TEAL).multiplyScalar(1.25).lerp(this.tmp.copy(RED).multiplyScalar(1.6), dg);
      if (b.core) sc.add(this.tmp.copy(RED).multiplyScalar(2.4 * pulse * dg));
      sc.add(this.tmp.copy(WHITE).multiplyScalar(2.4 * fl));
      this.preBody[bi].copy(DARK).lerp(SICK, dg * 0.7);
      const em = this.preEm[bi].setRGB(0, 0, 0);
      if (b.core) em.add(this.tmp.copy(RED).multiplyScalar(0.18 * dg + 0.9 * pulse * dg));
      em.add(this.tmp.copy(TEAL).multiplyScalar(0.35 * fl));
    }
    for (let i = 0; i < FLOORS.length; i++) {
      const {b: bi, k} = FLOORS[i];
      const b = BUILDINGS[bi];
      const s = floorState(b, k, t, this.st);
      if (!s.visible) {
        this.body.setMatrixAt(i, this.zero);
        this.seam.setMatrixAt(i, this.zero);
        continue;
      }
      const se = settled(b, t);
      this.q.setFromAxisAngle(this.up, s.yaw);
      this.m4.compose(this.p.set(s.x, s.y, s.z), this.q, this.s.set(s.w, s.h, s.d));
      this.body.setMatrixAt(i, this.m4);
      const prot = lerp(0.03, 0.085, se);
      this.m4.compose(this.p.set(s.x, s.y + s.h / 2 - 0.03, s.z), this.q, this.s.set(s.w + prot * 2, 0.05, s.d + prot * 2));
      this.seam.setMatrixAt(i, this.m4);
      const act = cityAct(b, s.y, t);
      const finalK = (b.slot.accent ? 1.7 : b.slot.hub ? 1.6 : 1.1) * (0.06 + 0.94 * act);
      const land = floorLandFrame(b, k);
      const bump = wt >= land ? Math.exp(-(wt - land) * 0.6) : wt >= land - DROP_FRAMES ? 0.7 : 0;
      const seam = this.tmp2.copy(this.preSeam[bi]).multiplyScalar(1 + 1.5 * bump * (1 - se));
      seam.lerp(this.tmp.copy(TEAL).multiplyScalar(finalK), se);
      // B5/B7 scan planes, B4 landings, B5 notice
      const sy = s.y + s.h / 2;
      const k5 = sI * Math.exp(-Math.pow((sY - sy) / 0.35, 2));
      const k7 = s7I * Math.exp(-Math.pow((s7 - sy) / 0.35, 2));
      seam.add(this.tmp.copy(WHITE).multiplyScalar(2.2 * (k5 + k7)));
      for (const ss of SESSIONS) if (ss.b.id === b.id && t >= ss.land) seam.add(this.tmp.copy(WHITE).multiplyScalar(1.6 * Math.exp(-(t - ss.land) / 4)));
      if (b.id === NOTICE_B.id) seam.lerp(this.tmp.copy(GOLD).multiplyScalar(1.9), notice);
      this.seam.setColorAt(i, seam);
      const body = this.tmp3.copy(this.preBody[bi]).lerp(PALE, se);
      if (t >= T.dormant) body.multiplyScalar(lerp(0.4, 1, Math.sqrt(act)));
      this.body.setColorAt(i, body);
      const em = this.tmp.copy(this.preEm[bi]);
      em.r += 0.1 * se * (0.25 + 0.75 * act);
      em.g += 0.115 * se * (0.25 + 0.75 * act);
      em.b += 0.12 * se * (0.25 + 0.75 * act);
      if (b.slot.hub) {
        em.r += TEAL.r * 0.18 * se * act;
        em.g += TEAL.g * 0.18 * se * act;
        em.b += TEAL.b * 0.18 * se * act;
      }
      if (b.id === NOTICE_B.id) {
        em.r += GOLD.r * 0.2 * notice;
        em.g += GOLD.g * 0.2 * notice;
        em.b += GOLD.b * 0.2 * notice;
      }
      this.emissive.setXYZ(i, em.r, em.g, em.b);
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.seam.instanceMatrix.needsUpdate = true;
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
    if (this.seam.instanceColor) this.seam.instanceColor.needsUpdate = true;
    this.emissive.needsUpdate = true;
  }

  private updateArcs(t: number) {
    const wt = worldTime(t);
    const pulse = corePulse(t);
    const P = this.arcs.pos;
    const C = this.arcs.col;
    let seg = 0;
    const g = (x: number, s: number) => Math.exp(-(x * x) / (s * s));
    for (const a of ARCS) {
      const prog = easeOutCubic(range(wt, a.spawn, a.spawn + 11));
      if (prog <= 0) continue;
      const fade = 1 - smooth(range(t, a.pass, a.pass + 7));
      if (fade <= 0) continue;
      const sparkle = t >= a.pass ? 0.9 * Math.exp(-(t - a.pass) / 2.5) : 0;
      const A = BUILDINGS[a.a];
      const B = BUILDINGS[a.b];
      const ay = buildingTop(A, t) + 0.05;
      const by = buildingTop(B, t) + 0.05;
      const mx = (A.x + B.x) / 2;
      const mz = (A.z + B.z) / 2;
      const my = Math.max(ay, by) + a.lift;
      const base = a.red ? RED : TEAL;
      const baseK = a.red ? 1.15 : 0.9;
      const flow = (wt / 22 + a.phase) % 1;
      const bez = (u: number, o: number) => {
        const v = 1 - u;
        P[o] = v * v * A.x + 2 * v * u * mx + u * u * B.x;
        P[o + 1] = v * v * ay + 2 * v * u * my + u * u * by;
        P[o + 2] = v * v * A.z + 2 * v * u * mz + u * u * B.z;
        const k = fade * baseK * (1 + 1.8 * g(u - flow, 0.06) + (prog < 1 ? 3 * g(u - prog, 0.05) : 0) + (a.core && a.red ? 1.6 * pulse : 0));
        C[o] = base.r * k + WHITE.r * sparkle;
        C[o + 1] = base.g * k + WHITE.g * sparkle;
        C[o + 2] = base.b * k + WHITE.b * sparkle;
      };
      for (let i = 0; i < ARC_SEG && seg < this.arcs.max; i++) {
        const u0 = i / ARC_SEG;
        if (u0 >= prog) break;
        bez(u0, seg * 6);
        bez(Math.min((i + 1) / ARC_SEG, prog), seg * 6 + 3);
        seg++;
      }
    }
    // B4 · MCP links from each session's landing to the hub
    for (const s of SESSIONS) {
      const prog = easeOutCubic(range(t, s.linkAt, s.linkAt + s.linkDur));
      if (prog <= 0) continue;
      const off = easeInCubic(range(t, s.retract + 2, s.retract + 14));
      if (off >= 1) continue;
      const A = s.b.slot;
      const ay = A.h + 0.06;
      const by = HUB.h + 0.06;
      const mx = (A.x + HUB.x) / 2;
      const mz = (A.z + HUB.z) / 2;
      const my = Math.max(ay, by) + 1.6 + Math.hypot(A.x - HUB.x, A.z - HUB.z) * 0.12;
      const flow = (t / 9) % 1;
      const bez = (u: number, o: number) => {
        const v = 1 - u;
        P[o] = v * v * A.x + 2 * v * u * mx + u * u * HUB.x;
        P[o + 1] = v * v * ay + 2 * v * u * my + u * u * by;
        P[o + 2] = v * v * A.z + 2 * v * u * mz + u * u * HUB.z;
        const k = 1.1 + 1.6 * g(u - flow, 0.07) + (prog < 1 ? 3.5 * g(u - prog, 0.05) : 0);
        C[o] = (WHITE.r * 0.45 + TEAL.r * 0.9) * k;
        C[o + 1] = (WHITE.g * 0.45 + TEAL.g * 0.9) * k;
        C[o + 2] = (WHITE.b * 0.45 + TEAL.b * 0.9) * k;
      };
      for (let i = 0; i < ARC_SEG && seg < this.arcs.max; i++) {
        const u0 = i / ARC_SEG;
        const u1 = Math.min((i + 1) / ARC_SEG, prog);
        if (u0 >= prog) break;
        if (u1 <= off) continue;
        bez(Math.max(u0, off), seg * 6);
        bez(u1, seg * 6 + 3);
        seg++;
      }
    }
    commit(this.arcs, seg);
  }

  private updateFx(t: number) {
    // scan wave (B3)
    const R = Math.max(0.01, waveRadius(t));
    const waveI = t >= T.impact ? 1 - range(t, T.impact + T.scanDur - 8, T.impact + T.scanDur + 8) : 0;
    this.wall.visible = waveI > 0;
    this.wall.scale.set(R, 1, R);
    this.wallMat.uniforms.uI.value = waveI * smooth(range(t, T.impact, T.impact + 4));
    this.waveRing.mesh.visible = waveI > 0;
    this.waveRing.mesh.scale.set(R, 1, R);
    this.waveRing.mat.opacity = waveI;

    // core light: red heartbeat before the wave, teal burst at impact; later the hub's process light
    const core = BUILDINGS[0];
    const pulse = corePulse(t);
    const dg = danger(core, t);
    if (t < T.impact) {
      this.corePoint.position.set(core.x, buildingTop(core, t) + 1.2, core.z);
      this.corePoint.color.set('#FF3355');
      this.corePoint.intensity = dg * (25 + 110 * pulse);
    } else if (t < T.b4) {
      this.corePoint.position.set(core.x, buildingTop(core, t) + 1.2, core.z);
      this.corePoint.color.set('#4AE8C3');
      this.corePoint.intensity = 110 * Math.exp(-(t - T.impact) / 4);
    } else {
      this.corePoint.position.set(HUB.x, HUB.h + 1.4, HUB.z);
      this.corePoint.color.set('#4AE8C3');
      const live = t < T.b6 ? clamp01((hubAct(t) - 0.2) / 0.8) * (t > T.beams[0] ? 1 : 0) : 0;
      this.corePoint.intensity = 26 * live + (t >= T.ignite ? 90 * Math.exp(-(t - T.ignite) / 5) : 0);
    }

    // logo rings: draw on from the top for the title (B3) and the final lockup (B8)
    this.logoRings.forEach((ls, i) => {
      const a3 = O + 238 + i * 7;
      const a8 = T.final - 4 + i * 7;
      const in3 = smooth(range(t, a3, a3 + 12)) * (1 - smooth(range(t, T.b4 - 2, T.b4 + 18)));
      const in8 = smooth(range(t, a8, a8 + 12));
      const ringA = Math.max(in3, in8);
      const reveal = Math.PI * (t < T.b6 ? easeOutCubic(range(t, a3, a3 + 46)) : easeOutCubic(range(t, a8, a8 + 46)));
      ls.mesh.visible = ringA > 0;
      if (!ls.mesh.visible) return;
      const rr = i === 0 ? 11.8 : 13.4;
      const rot = (i === 0 ? 1 : -0.7) * t * 0.0025;
      ls.mesh.scale.set(rr, 1, rr);
      ls.mesh.rotation.y = rot;
      ls.mat.opacity = ringA * (i === 0 ? 0.55 : 0.45);
      const segs = ls.max;
      const on = i === 0 ? 0.22 : 0.55;
      const c = i === 0 ? RING_TEAL : RING_GOLD;
      for (let k = 0; k < segs; k++) {
        const a = ((k + on / 2) / segs) * TAU;
        const fromTop = Math.abs(((a - rot + Math.PI / 2 + Math.PI * 3) % TAU) - Math.PI);
        const zf = (1 - smooth(clamp01((Math.sin(a - rot) - 0.05) / 0.6))) * clamp01((reveal - fromTop) / 0.3);
        ls.col.set([c.r * zf, c.g * zf, c.b * zf, c.r * zf, c.g * zf, c.b * zf], k * 6);
      }
      commit(ls, segs);
    });

    // dust (stops during bullet time)
    const pt = particleTime(t);
    const pos = (this.dust.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const base = this.dustBase;
    for (let i = 0; i < base.length / 4; i++) {
      const s = base[i * 4 + 3];
      pos[i * 3] = base[i * 4] + Math.sin(pt * 0.013 + i) * 0.6;
      pos[i * 3 + 1] = 0.2 + ((base[i * 4 + 1] + pt * 0.012 * (0.5 + s)) % 10);
      pos[i * 3 + 2] = base[i * 4 + 2] + Math.cos(pt * 0.011 + i * 1.7) * 0.6;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    let dop = lerp(0, 0.5, smooth(range(t, 110, 170)));
    dop = lerp(dop, 0.1, smooth(range(t, O + 196, O + 246)));
    dop = lerp(dop, 0.3, smooth(range(t, T.b4 + 5, 604)));
    dop = lerp(dop, 0, smooth(range(t, T.b6 + 3, T.b6 + 60)));
    dop = lerp(dop, 0.25, smooth(range(t, 1400, 1442)));
    dop = lerp(dop, 0.12, smooth(range(t, T.crane[0], T.crane[1])));
    this.dustMat.opacity = dop;

    // ground grid
    const G = this.gridMat.uniforms;
    let go = smooth(range(t, 70, 150));
    go = lerp(go, 0.22, smooth(range(t, O + 200, O + 250)));
    go = lerp(go, 0.35, smooth(range(t, T.b4 + 5, 604)));
    go = lerp(go, 0.5, smooth(range(t, T.b6 + 3, 1230)));
    go = lerp(go, 0.3, smooth(range(t, T.b7 + 2, 1442)));
    go = lerp(go, 0.5, t >= T.cut ? 1 : 0);
    go = lerp(go, 0.2, smooth(range(t, T.crane[0], T.crane[1])));
    G.uOpacity.value = go;
    G.uFadeR.value = lerp(26, 210, smooth(range(t, T.b6 + 3, 1230)) * (1 - smooth(range(t, T.b7 + 2, 1442))));
    G.uFine.value = 1 - smooth(range(t, T.b6 + 3, 1200)) * (1 - smooth(range(t, T.b7 + 2, 1442)));
    G.uCoarse.value = 7.5;

    // light: dusk for the dormant/no-daemon beat, night from above for the data
    let kI = 2.4;
    kI = lerp(kI, 1.75, smooth(range(t, T.dormant, T.dormant + 30)));
    kI = lerp(kI, 1.35, smooth(range(t, T.exitStart, T.still + 10)));
    kI = lerp(kI, 2.1, smooth(range(t, T.scan, T.scan + 24)));
    kI = lerp(kI, 1.6, smooth(range(t, T.b6, T.b6 + 60)));
    kI = lerp(kI, 2.1, smooth(range(t, T.b7, T.b7 + 60)));
    kI = lerp(kI, 2.4, smooth(range(t, T.crane[0], T.crane[1])));
    this.key.intensity = kI;
    // no teal ground sheen in the low macro opening / install shots
    this.rim.intensity = 1.2 * smooth(range(t, 100, 170)) * (t >= T.cut && t < T.crane[0] + 20 ? 0.25 : 1);
    this.hemi.intensity = 0.6 * (kI / 2.4);

    // light sweep over the finished V (title) and over the final lockup
    for (const [g0, g1, gk] of [[T.glint[0], T.glint[1], 0.7], [1792, 1840, 0.55]] as [number, number, number][]) {
      const gu = range(t, g0, g1);
      if (gu > 0 && gu < 1) {
        this.glint.intensity = gk * Math.sin(Math.PI * gu);
        this.glint.position.set(lerp(-30, 30, gu), 18, lerp(8, -8, gu));
        return;
      }
    }
    this.glint.intensity = 0;
  }

  private updateSessions(t: number) {
    for (const s of SESSIONS) {
      const m = this.beams[s.i];
      const lr = this.landRings[s.i];
      const dropU = range(t, s.land - BEAM_DROP, s.land);
      const retU = range(t, s.retract, s.retract + 12);
      const vis = dropU > 0 && retU < 1;
      m.visible = vis;
      lr.mesh.visible = false;
      if (!vis) continue;
      const top = 80;
      const landY = s.b.slot.h + 0.02;
      let bottom = lerp(top, landY, easeInCubic(dropU));
      bottom = lerp(bottom, top, easeInCubic(retU));
      m.position.set(s.b.slot.x, bottom, s.b.slot.z);
      const rad = 0.3 * (1 - 0.5 * retU);
      m.scale.set(rad, Math.max(0.01, top - bottom), rad);
      const U = (m.material as THREE.ShaderMaterial).uniforms;
      const since = t - s.land;
      U.uI.value = (0.75 + (since >= 0 ? 1.6 * Math.exp(-since / 5) : 0.4)) * (1 - 0.5 * retU);
      U.uHead.value = dropU < 1 ? 1.4 : 0.5 * Math.exp(-since / 8);
      if (since >= 0 && since < 18) {
        const u = since / 18;
        lr.mesh.visible = true;
        lr.mesh.position.set(s.b.slot.x, landY + 0.03, s.b.slot.z);
        const rr = lerp(0.4, 2.8, easeOutCubic(u));
        lr.mesh.scale.set(rr, 1, rr);
        lr.mat.opacity = 1 - u;
      }
    }
    // the process ring around the hub: alive while a session runs Vibe Monitor
    const live = t >= T.beams[0] ? clamp01((hubAct(t) - 0.25) / 0.45) : 0;
    const showProc = live > 0.01 && t < T.b6 + 20;
    this.procRing.mesh.visible = showProc;
    if (showProc) {
      this.procRing.mesh.position.set(HUB.x, HUB.h + 0.12, HUB.z);
      const rr = 1.75 + 0.06 * Math.sin(t * 0.3);
      this.procRing.mesh.scale.set(rr, 1, rr);
      this.procRing.mesh.rotation.y = t * 0.035;
      this.procRing.mat.opacity = live * (1 - smooth(range(t, T.b6, T.b6 + 20)));
    }
  }

  private updateMonitors(t: number) {
    // B5 scan plane, and the B7 scan inside the dome
    const i5 = scanI(t);
    const i7 = smooth(range(t, T.scan7 - 2, T.scan7 + 3)) * (1 - smooth(range(t, T.scan7 + 17, T.scan7 + 25)));
    if (i5 > 0.001) {
      this.scanDisk.visible = true;
      this.scanDisk.position.set(RING_C.x, scanY(t), RING_C.z);
      this.scanDisk.scale.set(12.5, 1, 12.5);
      this.scanMat.uniforms.uI.value = i5;
    } else if (i7 > 0.001) {
      this.scanDisk.visible = true;
      this.scanDisk.position.set(DOME_C.x, 5.2 * smooth(range(t, T.scan7, T.scan7 + 20)), DOME_C.z);
      this.scanDisk.scale.set(DOME_R - 0.6, 1, DOME_R - 0.6);
      this.scanMat.uniforms.uI.value = i7;
    } else this.scanDisk.visible = false;

    // 13 monitor rings, born from the scan; two turn gold when they surface a notice
    const out = 1 - smooth(range(t, T.b6, T.b6 + 34));
    const goldU = smooth(range(t, T.notice, T.notice + 12));
    for (let i = 0; i < this.monRings.length; i++) {
      const ls = this.monRings[i];
      const born = ringBorn(i);
      const grow = easeOutCubic(range(t, born, born + 16));
      const a = smooth(range(t, born, born + 5)) * out;
      ls.mesh.visible = a > 0.001 && t < T.b6 + 40;
      if (!ls.mesh.visible) continue;
      const rr = Math.max(0.01, ringRadius(i) * (0.15 + 0.85 * grow));
      ls.mesh.scale.set(rr, 1, rr);
      ls.mesh.rotation.y = (i % 2 ? 1 : -1) * t * 0.0018 * (1 + i * 0.08);
      const surfaced = SURFACED.includes(i);
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.09 + i * 0.7);
      ls.mat.opacity = a * breathe * (surfaced ? lerp(0.55, 1, goldU) : lerp(0.55, 0.32, goldU));
      if (surfaced) {
        const c = this.tmp.copy(TEAL).multiplyScalar(1.3).lerp(this.tmp2.copy(GOLD).multiplyScalar(1.8), goldU);
        recolor(ls, c);
      }
    }
    // evidence motes on the rooftops
    this.motes.visible = t >= T.evidence - 2 && t < T.b6 + 40;
    this.motesMat.uniforms.uTime.value = t;
    this.motesMat.uniforms.uI.value = 1 - smooth(range(t, T.b6, T.b6 + 30));
    // the one notice: a gold beacon over a single building
    const nb = NOTICE_B.slot;
    const bu = easeOutCubic(range(t, T.notice + 4, T.notice + 20));
    const bOut = 1 - smooth(range(t, T.b6, T.b6 + 26));
    const showB = bu > 0 && bOut > 0;
    this.beacon.visible = showB;
    this.beaconRing.mesh.visible = showB;
    this.beaconHead.visible = showB;
    if (showB) {
      const hgt = 3.2 * bu;
      this.beacon.position.set(nb.x, nb.h + 0.05, nb.z);
      this.beacon.scale.set(0.04, Math.max(0.01, hgt), 0.04);
      const U = (this.beacon.material as THREE.ShaderMaterial).uniforms;
      U.uI.value = (0.9 + 0.3 * Math.sin(t * 0.25)) * bOut;
      U.uHead.value = 0;
      this.beaconHead.position.set(nb.x, nb.h + 0.05 + hgt, nb.z);
      this.beaconHeadMat.uniforms.uTime.value = t;
      this.beaconHeadMat.uniforms.uI.value = bOut * (0.85 + 0.15 * Math.sin(t * 0.25));
      const pu = ((t - T.notice) % 30) / 30;
      const rr = lerp(0.8, 2.2, easeOutCubic(pu));
      this.beaconRing.mesh.position.set(nb.x, nb.h + 0.08, nb.z);
      this.beaconRing.mesh.scale.set(rr, 1, rr);
      this.beaconRing.mat.opacity = (1 - pu) * bOut;
    }
  }

  private updateTowns(t: number) {
    const on = t >= T.b6 - 10 && t < T.b7 + 60;
    this.townMesh.visible = on;
    this.townGlow.visible = on;
    this.events.visible = on;
    if (!on) return;
    const fadeOut = 1 - smooth(range(t, T.b7 + 2, T.b7 + 50));
    this.townU.uTime.value = t;
    this.townU.uTownI.value = fadeOut;
    this.townU.uSink.value = smooth(range(t, T.b7 + 6, T.b7 + 40)); // the towns sink away as we dive back to our own
    this.townGlowMat.uniforms.uTime.value = t;
    this.townGlowMat.uniforms.uI.value = 0.5 * fadeOut;
    this.eventsMat.uniforms.uTime.value = t;
    this.eventsMat.uniforms.uI.value = smooth(range(t, T.nums[1] - 30, T.nums[1])) * fadeOut;
  }

  private updateDome(t: number) {
    const rev = domeReveal(t);
    const on = t >= T.dome - 2 && t < T.open + 40;
    this.dome.visible = on && rev > 0.001;
    this.domeMat.uniforms.uReveal.value = Math.min(1, rev * 1.02);
    this.domeMat.uniforms.uTime.value = t;
    this.domeMat.uniforms.uI.value = 1;
    // source streams: rise, stop at the boundary, fall back
    const sOn = t >= T.streams - 1 && t < T.streams + 70;
    this.streams.visible = sOn;
    const imp = this.domeMat.uniforms.uImp.value as THREE.Vector4[];
    let ni = 0;
    if (sOn) {
      for (let i = 0; i < this.streamData.length; i++) {
        const d = this.streamData[i];
        const age = t - d.t0;
        const tHit = d.hit / d.v;
        if (age <= 0 || age > tHit + 14) {
          this.streams.setMatrixAt(i, this.zero);
          continue;
        }
        let sd: number;
        let fall = 0;
        let fade = 1;
        if (age < tHit) {
          const u = age / tHit;
          sd = d.hit * u * (1.15 - 0.15 * u);
        }
        else {
          sd = d.hit * 0.985;
          const a2 = age - tHit;
          fall = 0.012 * a2 * a2;
          fade = Math.max(0, 1 - a2 / 14);
        }
        this.p.set(d.sx + d.dx * sd, d.sy + d.dy * sd - fall, d.sz + d.dz * sd);
        this.v1.set(d.dx, d.dy, d.dz);
        this.q.setFromUnitVectors(this.up, this.v1);
        const stretch = age < tHit ? 1 : Math.max(0.05, 1 - (age - tHit) / 4);
        this.m4.compose(this.p, this.q, this.s.set(0.05 * fade + 0.001, d.len * stretch + 0.001, 0.05 * fade + 0.001));
        this.streams.setMatrixAt(i, this.m4);
        this.tmp.copy(d.c).multiplyScalar(age >= tHit ? 1 + 2.5 * Math.exp(-(age - tHit) / 2) : 1);
        this.streams.setColorAt(i, this.tmp);
        if (ni < 12 && i % 9 === 0) {
          imp[ni].set(d.sx + d.dx * d.hit, d.sy + d.dy * d.hit, d.sz + d.dz * d.hit, d.t0 + tHit);
          ni++;
        }
      }
      this.streams.instanceMatrix.needsUpdate = true;
      if (this.streams.instanceColor) this.streams.instanceColor.needsUpdate = true;
    }
    for (; ni < 12; ni++) imp[ni].set(0, -100, 0, -1000);
    // metric dots pass straight through
    const dOn = t >= T.streams && t < T.cut;
    this.dots.visible = dOn;
    if (dOn) {
      const pos = (this.dots.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const B = this.dotsBase;
      for (let i = 0; i < B.length / 4; i++) {
        const age = t - B[i * 4 + 2];
        const y = age < 0 ? -50 : B[i * 4 + 3] + age * 0.42;
        pos[i * 3] = B[i * 4];
        pos[i * 3 + 1] = y > 60 ? -50 : y;
        pos[i * 3 + 2] = B[i * 4 + 1];
      }
      this.dots.geometry.attributes.position.needsUpdate = true;
      this.dotsMat.opacity = 1 - smooth(range(t, T.open, T.cut));
    }
  }

  private updateCommand(t: number) {
    const on = t >= T.cut && t < T.crane[1] + 2;
    this.cmdMesh.visible = on;
    if (!on) return;
    const head = cmdTyped(t); // whole characters, like real typing
    const L = this.cmdLayout;
    this.cmdMat.uniforms.uHead.value = (L.pad + head * L.cw) / L.width;
    const typing = t < T.type[1] + 4;
    this.cmdMat.uniforms.uCaret.value = typing ? 1 : Math.floor(t / 8) % 2 === 0 ? 1 : 0;
    this.cmdMat.uniforms.uI.value = smooth(range(t, T.cut, T.cut + 3)) * (1 - smooth(range(t, T.crane[0] + 34, T.crane[1] - 6)));
  }

  dispose() {
    this.composer.dispose();
    this.sampleRT.dispose();
    this.accRT.dispose();
    this.renderer.dispose();
  }
}

