// Imperative three.js renderer for the visual-first sample. Stateless per frame: renderFrame(f) depends only on f,
// so Remotion can render frames in any order / in parallel tabs. Motion blur = 6 sub-frame renders accumulated in HDR.
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
  BUILDINGS,
  DROP_FRAMES,
  FLOORS,
  T,
  buildingTop,
  cameraAt,
  clamp01,
  corePulse,
  danger,
  easeOutCubic,
  floorLandFrame,
  floorState,
  lerp,
  particleTime,
  range,
  rng,
  scanFlash,
  settled,
  smooth,
  waveRadius,
  worldTime,
  type FloorState,
} from './cityLayout';

const W = 1920;
const H = 1080;
const col = (hex: string, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const TEAL = col('#4AE8C3');
const RED = col('#FF2D55');
const WHITE = col('#F2FFFB');
const DARK = col('#0B1620');
const SICK = col('#2C0E17');
const PALE = col('#D3E3EA');
const RING_TEAL = col('#4AE8C3', 1.6);
const RING_GOLD = col('#F6C177', 1.4);

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
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + on) / segs) * Math.PI * 2;
    ls.pos.set([Math.cos(a0), 0, Math.sin(a0), Math.cos(a1), 0, Math.sin(a1)], i * 6);
    ls.col.set([color.r, color.g, color.b, color.r, color.g, color.b], i * 6);
  }
  commit(ls, segs);
  return ls;
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

export class CityEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
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
  private glint: THREE.DirectionalLight;
  private corePoint: THREE.PointLight;
  private sampleRT: THREE.WebGLRenderTarget;
  private accRT: THREE.WebGLRenderTarget;
  private accMat: THREE.ShaderMaterial;
  private accQuad: FullScreenQuad;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private finish: ShaderPass;
  private st: FloorState = {visible: false, x: 0, y: 0, z: 0, w: 1, h: 1, d: 1, yaw: 0, move: 0};
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private seamCol = BUILDINGS.map(() => new THREE.Color());
  private bodyCol = BUILDINGS.map(() => new THREE.Color());
  private emisCol = BUILDINGS.map(() => new THREE.Color());
  private tmp = new THREE.Color();
  private tmp2 = new THREE.Color();
  samples = 12;
  shutter = 0.5;

  constructor(canvas: HTMLCanvasElement) {
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

    // lights
    sc.add(new THREE.HemisphereLight('#7FB2CF', '#0A1118', 0.6));
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
    this.glint = new THREE.DirectionalLight('#FFFFFF', 0);
    sc.add(this.glint);
    this.corePoint = new THREE.PointLight('#FF3355', 0, 0, 2);
    sc.add(this.corePoint);

    // ground + grid
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({color: '#08121B', roughness: 0.72, metalness: 0.12}));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    sc.add(ground);
    this.gridMat = new THREE.ShaderMaterial({
      uniforms: {uColor: {value: col('#4AE8C3', 0.32)}, uOpacity: {value: 1}, uFadeR: {value: 26}},
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity; uniform float uFadeR; varying vec3 vW;
        float gl1(vec2 p, float s){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          float l = gl1(vW.xz, 1.5) * 0.22 + gl1(vW.xz, 7.5) * 0.6;
          float d = length(vW.xz);
          float a = l * exp(-(d * d) / (uFadeR * uFadeR)) * uOpacity;
          gl_FragColor = vec4(uColor * a, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), this.gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.015;
    sc.add(grid);

    // floors (bodies) + glowing seams, instanced
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

    // dependency arcs, scan wave, pings, logo rings, accent street
    this.arcs = makeLineSet(ARCS.length * ARC_SEG + 4, 1.8);
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

    // dust
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

    // HDR pipeline: sample (MSAA) -> accumulate (motion blur) -> bloom -> tone map -> film finish
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
    const n = f >= T.craneStart - 2 && f <= T.craneEnd ? 16 : this.samples;
    for (let i = 0; i < n; i++) {
      const t = f + ((i + 0.5) / n - 0.5) * this.shutter;
      this.update(Math.max(0, t));
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
    const u = this.finish.uniforms;
    u.uFade.value = smooth(range(f, 0, 16));
    u.uSat.value = 1 - 0.45 * smooth(range(f, T.freeze, T.freeze + 8)) * (1 - smooth(range(f, T.impact, T.impact + 6)));
    u.uFlash.value = 0.1 * flash;
    u.uSeed.value = f;
    this.bloom.strength = 0.42 + 0.35 * flash;
    r.toneMappingExposure = 1.0 + 0.25 * flash;
    this.composer.render();
  }

  private update(t: number) {
    const cam = cameraAt(t);
    this.camera.position.set(cam.px, cam.py, cam.pz);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);
    (this.scene.fog as THREE.FogExp2).density = lerp(0.024, 0.0035, smooth(range(t, T.craneStart, T.craneEnd - 12)));
    this.updateFloors(t);
    this.updateArcs(t);
    this.updateFx(t);
  }

  private updateFloors(t: number) {
    const wt = worldTime(t);
    const pulse = corePulse(t);
    for (let bi = 0; bi < BUILDINGS.length; bi++) {
      const b = BUILDINGS[bi];
      const dg = danger(b, t);
      const fl = scanFlash(b, t);
      const se = settled(b, t);
      const sc = this.seamCol[bi].copy(TEAL).multiplyScalar(1.25).lerp(this.tmp.copy(RED).multiplyScalar(1.6), dg);
      if (b.core) sc.add(this.tmp.copy(RED).multiplyScalar(2.4 * pulse * dg));
      sc.add(this.tmp.copy(WHITE).multiplyScalar(2.4 * fl));
      const finalK = b.slot.accent ? 1.7 : b.slot.hub ? 1.6 : 1.1;
      sc.lerp(this.tmp.copy(TEAL).multiplyScalar(finalK), se);
      this.bodyCol[bi].copy(DARK).lerp(SICK, dg * 0.7).lerp(PALE, se);
      const em = this.emisCol[bi].setRGB(0, 0, 0);
      if (b.core) em.add(this.tmp.copy(RED).multiplyScalar(0.18 * dg + 0.9 * pulse * dg));
      em.add(this.tmp.copy(TEAL).multiplyScalar(0.35 * fl));
      em.add(this.tmp.setRGB(0.1, 0.115, 0.12).multiplyScalar(se));
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
      this.q.setFromAxisAngle(this.up, s.yaw);
      this.m4.compose(this.p.set(s.x, s.y, s.z), this.q, this.s.set(s.w, s.h, s.d));
      this.body.setMatrixAt(i, this.m4);
      const prot = lerp(0.03, 0.085, settled(b, t));
      this.m4.compose(this.p.set(s.x, s.y + s.h / 2 - 0.03, s.z), this.q, this.s.set(s.w + prot * 2, 0.05, s.d + prot * 2));
      this.seam.setMatrixAt(i, this.m4);
      const land = floorLandFrame(b, k);
      const bump = wt >= land ? Math.exp(-(wt - land) * 0.6) : wt >= land - DROP_FRAMES ? 0.7 : 0;
      this.tmp2.copy(this.seamCol[bi]).multiplyScalar(1 + 1.5 * bump * (1 - settled(b, t)));
      this.seam.setColorAt(i, this.tmp2);
      this.body.setColorAt(i, this.bodyCol[bi]);
      const em = this.emisCol[bi];
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
    commit(this.arcs, seg);
  }

  private updateFx(t: number) {
    // scan wave
    const R = Math.max(0.01, waveRadius(t));
    const waveI = t >= T.impact ? 1 - range(t, T.impact + T.scanDur - 8, T.impact + T.scanDur + 8) : 0;
    this.wall.visible = waveI > 0;
    this.wall.scale.set(R, 1, R);
    this.wallMat.uniforms.uI.value = waveI * smooth(range(t, T.impact, T.impact + 4));
    this.waveRing.mesh.visible = waveI > 0;
    this.waveRing.mesh.scale.set(R, 1, R);
    this.waveRing.mat.opacity = waveI;

    // core light: red heartbeat before the wave, teal burst at impact
    const core = BUILDINGS[0];
    const pulse = corePulse(t);
    const dg = danger(core, t);
    this.corePoint.position.set(core.x, buildingTop(core, t) + 1.2, core.z);
    if (t < T.impact) {
      this.corePoint.color.set('#FF3355');
      this.corePoint.intensity = dg * (25 + 110 * pulse);
    } else {
      this.corePoint.color.set('#4AE8C3');
      this.corePoint.intensity = 110 * Math.exp(-(t - T.impact) / 4);
    }

    // logo rings draw on from the top; the half behind the title stays dark
    this.logoRings.forEach((ls, i) => {
      const reveal = Math.PI * easeOutCubic(range(t, 238 + i * 7, 284 + i * 7));
      const ringA = smooth(range(t, 238 + i * 7, 250 + i * 7));
      ls.mesh.visible = ringA > 0;
      const rr = i === 0 ? 11.8 : 13.4;
      const rot = (i === 0 ? 1 : -0.7) * t * 0.0025;
      ls.mesh.scale.set(rr, 1, rr);
      ls.mesh.rotation.y = rot;
      ls.mat.opacity = ringA * (i === 0 ? 0.55 : 0.45);
      const segs = ls.max;
      const on = i === 0 ? 0.22 : 0.55;
      const c = i === 0 ? RING_TEAL : RING_GOLD;
      for (let k = 0; k < segs; k++) {
        const a = ((k + on / 2) / segs) * Math.PI * 2;
        const fromTop = Math.abs(((a - rot + Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
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
    this.dustMat.opacity = lerp(0.5, 0.1, smooth(range(t, 196, 246)));
    this.gridMat.uniforms.uOpacity.value = lerp(1, 0.22, smooth(range(t, 200, 250)));

    // light sweep over the finished V
    const gu = range(t, T.glint[0], T.glint[1]);
    this.glint.intensity = gu > 0 && gu < 1 ? 2.2 * Math.sin(Math.PI * gu) : 0;
    this.glint.position.set(lerp(-30, 30, gu), 18, lerp(8, -8, gu));
  }

  dispose() {
    this.composer.dispose();
    this.sampleRT.dispose();
    this.accRT.dispose();
    this.renderer.dispose();
  }
}
