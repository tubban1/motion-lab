import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import data from './data.json';

// Vibe Monitor 1.0 — data film. 30fps, 1920x1080, 62s. Cuts on 2s bars of the measured 120 BPM score.
export const VM_DATA_FPS = 30;
export const VM_DATA_FRAMES = 1860;
const SLUG = 'vibe-monitor-1-0-data-20261103';
const B = [0, 180, 360, 540, 840, 1140, 1440, 1620, 1860];

const K = {
  navy: '#050A12', panel: '#0D1F2E', panel2: '#132B3D', text: '#F2F7FC', teal: '#4AE8C3', sky: '#9CCBFF',
  muted: '#8AA2B5', dim: '#5C7385', red: '#FF6B88', gold: '#F6C177', grid: '#1F4254',
};
const F = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
const M = 'Consolas,"Cascadia Mono",Menlo,monospace';
const ease = Easing.bezier(0.16, 0.84, 0.2, 1);
const ip = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const rise = (f: number, s: number, n = 18) => ({opacity: ip(f, s, s + n), transform: `translateY(${30 * (1 - ip(f, s, s + n))}px)`});
const fmt = (n: number) => (n >= 10000 ? (n / 10000).toFixed(1) + ' 万' : Math.round(n).toLocaleString('en-US'));

// ---------- VO + captions (durations measured from Edge TTS output) ----------
const VO = [
  {id: 'vo-01', at: 12, len: 120, text: 'AI 写代码的速度，已经快过你读懂架构的速度。'},
  {id: 'vo-02', at: 192, len: 143, text: '功能一层层叠上去，依赖越缠越紧，直到没人敢改。'},
  {id: 'vo-03', at: 378, len: 139, text: 'Vibe Monitor 1.0，AI 编程时代的本地架构顾问。'},
  {id: 'vo-04', at: 555, len: 267, text: '它作为 MCP 工具，随 Codex、Claude Code、Cursor 的会话启动；会话结束，进程就退出，不常驻后台。'},
  {id: 'vo-05', at: 852, len: 272, text: '一次扫描，十三类监测。证据先于警报：S1、S2 保持安静，只在架构真正需要跟上时提醒你。'},
  {id: 'vo-06', at: 1155, len: 201, text: '这不是概念演示。画面里的每一个数字，都来自真实安装的去标识化遥测。'},
  {id: 'vo-07', at: 1452, len: 162, text: '源码只在本地分析，从不上传；结构扫描，不调用大模型。'},
  {id: 'vo-08', at: 1632, len: 167, text: 'Apache 2.0 开源，一行命令安装。让架构，跟上你的速度。'},
];

// ---------- shared chrome ----------
const Back: React.FC<{g: number; tint?: string}> = ({g, tint = '#123A4C'}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at ${62 + 8 * Math.sin(g / 140)}% 34%, ${tint} 0%, #0A1626 48%, ${K.navy} 92%)`, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: -400, opacity: 0.12, transform: `perspective(1400px) rotateX(62deg) translateY(${(g * 0.6) % 96}px)`,
      backgroundImage: `linear-gradient(${K.grid} 1px,transparent 1px),linear-gradient(90deg,${K.grid} 1px,transparent 1px)`, backgroundSize: '96px 96px'}} />
    {Array.from({length: 30}, (_, i) => (
      <div key={i} style={{position: 'absolute', left: (i * 389) % 1900, top: (60 + ((i * 677 + g * (0.4 + (i % 4) * 0.18)) % 980)),
        width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: 9, background: i % 6 === 0 ? K.gold : K.teal, opacity: 0.1 + (i % 5) * 0.06}} />
    ))}
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 35%, #01040AB0 100%)'}} />
  </AbsoluteFill>
);

const Scene: React.FC<{i: number; name: string; note: string; tint?: string; children: React.ReactNode}> = ({i, name, note, tint, children}) => {
  const f = useCurrentFrame();
  const d = B[i + 1] - B[i];
  const g = f + B[i];
  const op = Math.min(ip(f, 0, 8), i === 7 ? 1 : ip(f, d - 8, d, 1, 0));
  return (
    <AbsoluteFill style={{opacity: op, fontFamily: F, color: K.text, overflow: 'hidden'}}>
      <Back g={g} tint={tint} />
      {children}
      <div style={{position: 'absolute', left: 96, top: 56, fontFamily: M, fontSize: 24, fontWeight: 700, letterSpacing: 4, color: K.teal}}>VIBE MONITOR <span style={{color: K.muted}}>1.0</span></div>
      <div style={{position: 'absolute', right: 96, top: 58, fontFamily: M, fontSize: 19, letterSpacing: 3, color: K.muted}}>{name}</div>
      <div style={{position: 'absolute', left: 96, right: 96, bottom: 54, height: 1, background: K.grid}} />
      <div style={{position: 'absolute', left: 96, bottom: 54, height: 2, width: 1728 * (g / VM_DATA_FRAMES), background: K.teal, boxShadow: `0 0 18px ${K.teal}`}} />
      <div style={{position: 'absolute', left: 96, bottom: 20, fontFamily: M, fontSize: 15, letterSpacing: 2, color: K.dim}}>{note}</div>
      <div style={{position: 'absolute', right: 96, bottom: 20, fontFamily: M, fontSize: 16, color: K.muted}}>{String(i + 1).padStart(2, '0')} / 08</div>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{c?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({c = K.teal, children, style}) => (
  <div style={{fontFamily: M, fontSize: 20, letterSpacing: 4, fontWeight: 700, color: c, ...style}}>{children}</div>
);

const Title: React.FC<{f: number; a: string; b: string; top?: number; left?: number; size?: number; accent?: string; s?: number}> = ({f, a, b, top = 250, left = 120, size = 84, accent = K.teal, s = 6}) => (
  <div style={{position: 'absolute', left, top, fontWeight: 800, fontSize: size, lineHeight: 1.28, letterSpacing: -1}}>
    <div style={rise(f, s)}>{a}</div>
    <div style={{...rise(f, s + 12), color: accent}}>{b}</div>
  </div>
);

const VMark: React.FC<{f: number; size: number}> = ({f, size}) => (
  <svg width={size} height={size} viewBox="0 0 500 500">
    <g transform={`rotate(${f * 0.5} 250 250)`}>
      {[220, 186, 148].map((r, i) => (
        <circle key={i} cx={250} cy={250} r={r} fill="none" stroke={i === 1 ? K.gold : K.teal} strokeWidth={2.4} strokeDasharray={i === 1 ? '10 16' : '3 14'} opacity={0.5} />
      ))}
    </g>
    <path d="M128 155L248 362L370 155" stroke="#EEF9FB" strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M146 160L246 334" stroke={K.teal} strokeWidth={11} strokeLinecap="round" />
  </svg>
);

// deterministic graph used by scenes 2 & 3
const NODES = Array.from({length: 18}, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.21;
  const r = 250 + ((i * 53) % 110);
  return {x: 430 + Math.cos(a) * r, y: 400 + Math.sin(a) * r * 0.78};
});
const EDGES = Array.from({length: 52}, (_, i) => [(i * 7 + 3) % 18, (i * 11 + 5 + Math.floor(i / 9)) % 18] as const).filter(([a, b]) => a !== b);

// ---------- 01 hook ----------
const CODE = [
  'export async function createOrder(ctx) {', '  const user = await auth.require(ctx);', '  const cart = await carts.load(user.id);',
  '  const price = pricing.quote(cart, user.tier);', '  await payments.charge(user, price);', '  events.emit("order.created", cart);',
  '  return orders.insert({ user, cart, price });', '}', 'import { db } from "../../core/runtime";', 'import { notify } from "../ui/toast";',
  'router.post("/checkout", createOrder);', 'export const retry = withBackoff(sync, 5);',
];
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const lines = Math.floor(ip(f, 0, 170, 0, 1) * 1450) + 37;
  return (
    <Scene i={0} name="01 / VELOCITY" note="动态示意 · 非用户真实代码">
      <div style={{position: 'absolute', right: 96, top: 140, width: 860, height: 800, borderRadius: 22, overflow: 'hidden', background: '#08131FF2',
        border: '1px solid #4A8FB055', boxShadow: '0 40px 120px #000C', transform: `perspective(1400px) rotateY(-12deg) translateX(${20 - f * 0.12}px)`}}>
        <div style={{position: 'relative', zIndex: 2, height: 56, padding: '15px 26px', background: K.panel2, fontFamily: M, fontSize: 20, color: K.muted}}>● ● ●　agent session · writing src/</div>
        <div style={{position: 'absolute', top: 56, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}><div style={{transform: `translateY(${-((f * 7.5) % (CODE.length * 46))}px)`}}>
          {Array.from({length: 40}, (_, i) => (
            <div key={i} style={{height: 46, paddingLeft: 26, fontFamily: M, fontSize: 21, lineHeight: '46px', whiteSpace: 'pre', color: i % 5 === 0 ? K.teal : K.sky, opacity: 0.35 + (i % 4) * 0.15}}>
              <span style={{color: K.dim}}>{String(i + 1).padStart(3, ' ')}  </span>{CODE[i % CODE.length]}
            </div>
          ))}
        </div></div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, background: 'linear-gradient(transparent,#08131F)'}} />
      </div>
      <Tag style={{position: 'absolute', left: 124, top: 210, ...rise(f, 2)}}>THE AGE OF AI CODING</Tag>
      <Title f={f} a="AI 写代码的速度，" b="已经快过你读懂架构。" top={262} size={80} />
      <div style={{position: 'absolute', left: 124, top: 560, display: 'flex', gap: 28, ...rise(f, 40)}}>
        {[[lines.toLocaleString('en-US'), 'LINES / SESSION'], [String(Math.floor(lines / 61)), 'FILES TOUCHED']].map(([v, l]) => (
          <div key={l} style={{padding: '22px 30px', borderRadius: 14, background: '#0D2232CC', border: `1px solid ${K.grid}`}}>
            <div style={{fontFamily: M, fontSize: 52, fontWeight: 700, color: K.text}}>{v}</div>
            <div style={{fontFamily: M, fontSize: 16, letterSpacing: 3, color: K.muted, marginTop: 6}}>{l}</div>
          </div>
        ))}
      </div>
    </Scene>
  );
};

// ---------- 02 conflict ----------
const Graph: React.FC<{f: number; edges: number; hot: number; collapse?: number}> = ({f, edges, hot, collapse = 0}) => {
  const p = (i: number) => {
    const n = NODES[i];
    const jx = Math.sin(f / 23 + i) * 6, jy = Math.cos(f / 29 + i) * 6;
    return {x: n.x + jx + (430 - n.x) * collapse, y: n.y + jy + (400 - n.y) * collapse};
  };
  return (
    <svg width={860} height={800} viewBox="0 0 860 800" style={{overflow: 'visible'}}>
      {EDGES.slice(0, edges).map(([a, b], i) => {
        const A = p(a), Bp = p(b), red = i > 16 && i % 3 !== 0;
        return <path key={i} d={`M${A.x} ${A.y} Q${(A.x + Bp.x) / 2 + Math.sin(i) * 70} ${(A.y + Bp.y) / 2 - 50} ${Bp.x} ${Bp.y}`}
          stroke={red ? K.red : K.sky} strokeWidth={red ? 2.6 : 1.6} opacity={(red ? 0.62 : 0.3) * (1 - collapse)} fill="none" />;
      })}
      {NODES.map((_, i) => {
        const P = p(i), isHot = i % 3 === 0 && hot > i / 18;
        const c = isHot ? K.red : K.teal;
        return (
          <g key={i} opacity={1 - collapse * 0.7}>
            <circle cx={P.x} cy={P.y} r={isHot ? 30 : 22} fill={c} opacity={0.12} />
            <circle cx={P.x} cy={P.y} r={isHot ? 13 : 9} fill="#0F2A36" stroke={c} strokeWidth={2.6} />
          </g>
        );
      })}
    </svg>
  );
};
const Conflict: React.FC = () => {
  const f = useCurrentFrame();
  const edges = Math.round(ip(f, 0, 140, 10, EDGES.length));
  const ring = ip(f, 96, 170, 0, 1);
  return (
    <Scene i={1} name="02 / COUPLING" note="动态示意 · 非用户真实项目" tint="#3A1B2C">
      <div style={{position: 'absolute', right: 70, top: 150}}>
        <Graph f={f} edges={edges} hot={ip(f, 60, 150)} />
        <svg width={860} height={800} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <circle cx={NODES[0].x} cy={NODES[0].y} r={30 + ring * 520} fill="none" stroke={K.red} strokeWidth={3} opacity={0.75 * (1 - ring)} />
          <circle cx={NODES[0].x} cy={NODES[0].y} r={18} fill={K.red} opacity={f > 96 ? 0.9 : 0} />
        </svg>
      </div>
      <Tag c={K.red} style={{position: 'absolute', left: 124, top: 210, ...rise(f, 2)}}>HIDDEN COUPLING · RISING</Tag>
      <Title f={f} a="依赖越缠越紧，" b="直到没人敢改。" top={262} size={84} accent={K.red} />
      <div style={{position: 'absolute', left: 124, top: 560, width: 600, padding: 28, borderRadius: 14, background: '#3A1724CC', border: `1px solid ${K.red}88`, ...rise(f, 100)}}>
        <Tag c={K.red}>BLAST RADIUS</Tag>
        <div style={{fontSize: 30, marginTop: 14}}>改一个模块，牵动 <span style={{color: K.red, fontFamily: M, fontWeight: 700}}>{Math.round(ip(f, 100, 150, 1, 11))}</span> 个。</div>
      </div>
      <div style={{position: 'absolute', left: 124, top: 740, fontFamily: M, fontSize: 22, color: K.muted, ...rise(f, 30)}}>DEPENDENCY EDGES · <span style={{color: K.text}}>{edges}</span></div>
    </Scene>
  );
};

// ---------- 03 reveal ----------
const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: f - 20, fps, config: {damping: 14, stiffness: 120}});
  return (
    <Scene i={2} name="03 / VIBE MONITOR 1.0" note="开源客户端 · npm @vibe-monitor/setup">
      <div style={{position: 'absolute', left: 590, top: 140, opacity: 1 - ip(f, 10, 30)}}><Graph f={f} edges={EDGES.length} hot={1} collapse={ip(f, 0, 26)} /></div>
      <div style={{position: 'absolute', left: 960 - 230, top: 150, transform: `scale(${pop})`, opacity: pop}}><VMark f={f} size={460} /></div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center'}}>
        <div style={{fontSize: 96, fontWeight: 800, letterSpacing: -1, ...rise(f, 34)}}>Vibe Monitor <span style={{color: K.teal}}>1.0</span></div>
        <div style={{fontSize: 40, marginTop: 10, color: K.sky, ...rise(f, 46)}}>AI 编程时代的本地架构顾问</div>
        <div style={{fontFamily: M, fontSize: 21, marginTop: 26, color: K.muted, letterSpacing: 1, ...rise(f, 64)}}>
          You keep building. Vibe Monitor knows when the architecture needs to catch up.
        </div>
      </div>
    </Scene>
  );
};

// ---------- 04 how it runs ----------
const AGENTS = ['Codex', 'Claude Code', 'Cursor', 'Antigravity', 'TRAE'];
const PIPE = ['Evidence', 'Trend', 'Pressure', 'Stage'];
const Box: React.FC<{x: number; y: number; w: number; h: number; on: number; c?: string; children: React.ReactNode}> = ({x, y, w, h, on, c = K.teal, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 14, background: '#0D2232E8', border: `1.5px solid ${c}`,
    boxShadow: `0 0 ${24 * on}px ${c}55`, opacity: on, transform: `scale(${0.92 + 0.08 * on})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: M, fontSize: 24, fontWeight: 700}}>{children}</div>
);
const How: React.FC = () => {
  const f = useCurrentFrame();
  const coreOn = ip(f, 40, 58);
  const pulse = (f % 60) / 60;
  const head = ip(f, 150, 280);
  const alive = head > 0.18 && head < 0.78;
  return (
    <Scene i={3} name="04 / SESSION-SCOPED MCP" note="架构原理图 · 依据开源 README">
      <div style={{position: 'absolute', left: 120, top: 120, fontSize: 54, fontWeight: 800, ...rise(f, 4)}}>随会话启动，<span style={{color: K.teal}}>随会话退出。</span></div>
      {AGENTS.map((a, i) => <Box key={a} x={120} y={250 + i * 84} w={300} h={64} on={ip(f, 8 + i * 5, 24 + i * 5)} c={K.sky}>{a}</Box>)}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {AGENTS.map((_, i) => <path key={i} d={`M420 ${282 + i * 84} C 520 ${282 + i * 84}, 560 452, 700 452`} stroke={K.sky} strokeWidth={2} fill="none" opacity={0.5 * ip(f, 30, 50)} />)}
        <path d="M1100 452 L1290 452" stroke={K.teal} strokeWidth={2.5} opacity={coreOn} />
        <path d="M1460 300 L1460 640" stroke={K.teal} strokeWidth={2} opacity={0.5 * ip(f, 70, 90)} strokeDasharray="6 8" />
        <circle cx={1460} cy={300 + pulse * 340} r={8} fill={K.gold} opacity={ip(f, 90, 100)} />
        <circle cx={420 + ((f * 9) % 280)} cy={452} r={0} />
      </svg>
      <div style={{position: 'absolute', left: 520, top: 520, padding: '6px 14px', borderRadius: 8, background: '#0A1626', border: `1px solid ${K.grid}`, fontFamily: M, fontSize: 18, color: K.sky, letterSpacing: 2, opacity: ip(f, 36, 50)}}>MCP stdio</div>
      <Box x={700} y={392} w={400} h={120} on={coreOn}><div style={{textAlign: 'center'}}>Vibe Monitor Core<div style={{fontSize: 17, color: K.muted, marginTop: 8, fontWeight: 400}}>local · read-only scan</div></div></Box>
      {['Git', 'Source', 'History'].map((s, i) => <Box key={s} x={700 + i * 140} y={270} w={120} h={52} on={ip(f, 52 + i * 5, 66 + i * 5)} c={K.muted}><span style={{fontSize: 19}}>{s}</span></Box>)}
      {PIPE.map((s, i) => <Box key={s} x={1310} y={262 + i * 100} w={300} h={70} on={ip(f, 70 + i * 8, 86 + i * 8)} c={i === 3 ? K.gold : K.teal}>{s}{i === 3 ? '  S1–S5' : ''}</Box>)}
      {/* session lifecycle timeline */}
      <div style={{position: 'absolute', left: 120, top: 676, width: 1680, opacity: ip(f, 130, 148)}}>
        <Tag c={K.muted}>PROCESS LIFECYCLE</Tag>
        <div style={{position: 'relative', marginTop: 22, height: 54}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 25, height: 3, background: K.grid}} />
          <div style={{position: 'absolute', left: '18%', width: `${Math.max(0, Math.min(head, 0.78) - 0.18) * 100}%`, top: 16, height: 22, borderRadius: 11, background: K.teal, boxShadow: `0 0 20px ${K.teal}88`}} />
          <div style={{position: 'absolute', left: `${head * 100}%`, top: 0, width: 3, height: 54, background: K.text}} />
          {[[18, '会话开始 · 进程启动'], [78, '会话结束 · 进程退出']].map(([x, l]) => (
            <div key={l} style={{position: 'absolute', left: `${x}%`, top: 62, transform: 'translateX(-50%)', fontSize: 22, color: K.sky, whiteSpace: 'nowrap'}}>{l}</div>
          ))}
        </div>
        <div style={{marginTop: 50, fontFamily: M, fontSize: 22, color: alive ? K.teal : K.muted}}>
          {head < 0.18 ? '○ idle · 无常驻后台进程' : alive ? '● vibe-monitor running · scanning evidence' : '○ exited · 历史只存本机 ~/.vibe-monitor'}
        </div>
      </div>
    </Scene>
  );
};

// ---------- 05 monitors + stages ----------
const MON = ['代码结构/组件化', '依赖耦合', '平台可移植性', '安全面', '状态/数据', '异步/并发', '可靠性/恢复', '测试/验证', '可观测性', '分布/扩展', 'API/契约演进', '集成复杂度', 'AI 编码实现漂移'];
const SURFACED = [1, 7];
const Monitors: React.FC = () => {
  const f = useCurrentFrame();
  const scan = ip(f, 20, 120);
  const stage = ip(f, 140, 210, 0.6, 2.55); // 0..5 scale
  const surfaced = f > 210;
  return (
    <Scene i={4} name="05 / 13 MONITORS · S1–S5" note="界面示意 · 监测族与阶段规则依据 README">
      <div style={{position: 'absolute', left: 120, top: 120, fontSize: 54, fontWeight: 800, ...rise(f, 4)}}>一次扫描，<span style={{color: K.teal}}>十三类监测。</span></div>
      <Tag c={K.muted} style={{position: 'absolute', left: 122, top: 210, ...rise(f, 14)}}>ONE SHARED EVIDENCE SCAN</Tag>
      <div style={{position: 'absolute', left: 120, top: 262, width: 980, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16}}>
        {MON.map((m, i) => {
          const lit = ip(scan * 13, i, i + 1.2);
          const hot = surfaced && SURFACED.includes(i);
          const c = hot ? K.gold : K.teal;
          return (
            <div key={m} style={{height: 104, borderRadius: 12, padding: '16px 18px', background: hot ? '#3A2D16DD' : '#0D2232DD', border: `1.5px solid ${lit ? c : K.grid}`,
              opacity: 0.35 + 0.65 * lit, boxShadow: hot ? `0 0 26px ${K.gold}66` : 'none'}}>
              <div style={{fontFamily: M, fontSize: 15, color: lit > 0.5 ? c : K.dim, letterSpacing: 2}}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{fontSize: 23, marginTop: 8, fontWeight: 600}}>{m}</div>
            </div>
          );
        })}
      </div>
      {/* scan beam */}
      <div style={{position: 'absolute', left: 110 + scan * 1000, top: 250, width: 4, height: 480, background: K.teal, boxShadow: `0 0 30px ${K.teal}`, opacity: scan > 0 && scan < 1 ? 0.9 : 0}} />
      {/* stage meter */}
      <div style={{position: 'absolute', left: 1200, top: 262, width: 600, ...rise(f, 120)}}>
        <Tag c={K.muted}>ARCHITECTURE STAGE</Tag>
        <div style={{display: 'flex', gap: 8, marginTop: 22}}>
          {['S1', 'S2', 'S3', 'S4', 'S5'].map((s, i) => {
            const fill = Math.max(0, Math.min(1, stage - i));
            const c = i < 2 ? K.teal : i < 3 ? K.gold : K.red;
            return (
              <div key={s} style={{flex: 1}}>
                <div style={{height: 64, borderRadius: 8, background: K.panel, overflow: 'hidden', border: `1px solid ${K.grid}`}}>
                  <div style={{width: `${fill * 100}%`, height: '100%', background: c, opacity: 0.85}} />
                </div>
                <div style={{textAlign: 'center', marginTop: 10, fontFamily: M, fontSize: 22, color: fill > 0 ? c : K.dim}}>{s}</div>
                <div style={{textAlign: 'center', fontSize: 17, color: K.muted}}>{i < 2 ? '安静' : i === 4 ? 'Critical' : ''}</div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 34, padding: 26, borderRadius: 14, background: '#2E2412E6', border: `1px solid ${K.gold}AA`, opacity: ip(f, 212, 230), transform: `translateY(${20 * (1 - ip(f, 212, 230))}px)`}}>
          <Tag c={K.gold}>NOTICE · S3</Tag>
          <div style={{fontSize: 28, marginTop: 14, lineHeight: 1.5}}>依赖耦合、测试/验证<br />需要跟上了。</div>
          <div style={{fontSize: 19, marginTop: 14, color: K.muted, lineHeight: 1.6}}>单一指标不触发 S3+ · 每次最多提示 2 类<br />重复且未变化的发现自动抑制</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 120, top: 800, fontSize: 34, fontWeight: 700, ...rise(f, 236)}}>证据先于警报，<span style={{color: K.teal}}>覆盖更多 ≠ 提醒更多。</span></div>
    </Scene>
  );
};

// ---------- 06 real data ----------
const Data: React.FC = () => {
  const f = useCurrentFrame();
  const kpi = [
    {v: data.installations, l: '累计安装', s: 'installations'},
    {v: data.active7d, l: '近 7 天活跃', s: 'active installs'},
    {v: data.projects, l: '被观察的项目', s: 'project instances'},
    {v: data.events, l: '架构证据事件', s: 'telemetry events'},
  ];
  const other = Math.max(0, data.events - data.findingObserved - data.findingImproved - data.noticeSurfaced);
  const parts = [
    {k: 'finding.observed', v: data.findingObserved, c: K.sky},
    {k: 'finding.improved', v: data.findingImproved, c: K.teal},
    {k: 'notice.surfaced', v: data.noticeSurfaced, c: K.gold},
    {k: 'other', v: other, c: K.dim},
  ];
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  const bar = ip(f, 90, 150);
  const note = data.live ? `数据源：Neon 生产库只读聚合 · 截至 ${data.asOf} · 去标识化` : `数据源：生产 Neon 只读核对快照 · 截至 ${data.asOf} · 去标识化`;
  return (
    <Scene i={5} name="06 / REAL TELEMETRY" note={note}>
      <div style={{position: 'absolute', left: 120, top: 120, fontSize: 54, fontWeight: 800, ...rise(f, 4)}}>这不是概念演示。<span style={{color: K.teal}}>这是真实遥测。</span></div>
      <div style={{position: 'absolute', left: 120, top: 240, width: 1680, display: 'flex', gap: 24}}>
        {kpi.map((k, i) => {
          const t = ip(f, 18 + i * 10, 64 + i * 10);
          return (
            <div key={k.s} style={{flex: 1, padding: '30px 32px', borderRadius: 16, background: '#0D2232E6', border: `1px solid ${t > 0.99 ? K.teal + '99' : K.grid}`, ...rise(f, 14 + i * 10)}}>
              <div style={{fontFamily: M, fontSize: 76, fontWeight: 700, color: K.text}}>{fmt(k.v * t)}</div>
              <div style={{fontSize: 27, marginTop: 6, color: K.sky}}>{k.l}</div>
              <div style={{fontFamily: M, fontSize: 15, letterSpacing: 2, color: K.muted, marginTop: 4}}>{k.s.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 120, top: 520, width: 1040, ...rise(f, 80)}}>
        <Tag c={K.muted}>EVENT COMPOSITION</Tag>
        <div style={{display: 'flex', height: 40, marginTop: 20, borderRadius: 8, overflow: 'hidden', width: `${bar * 100}%`}}>
          {parts.map((p) => <div key={p.k} style={{width: `${(p.v / tot) * 100}%`, background: p.c, minWidth: p.v ? 6 : 0}} />)}
        </div>
        <div style={{display: 'flex', gap: 34, marginTop: 20, fontFamily: M, fontSize: 19, color: K.muted}}>
          {parts.map((p) => <div key={p.k}><span style={{display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: p.c, marginRight: 10}} />{p.k} <span style={{color: K.text}}>{fmt(p.v)}</span></div>)}
        </div>
        <div style={{marginTop: 46}}>
          <Tag c={K.muted}>AGENTS</Tag>
          {data.agents.map((a, i) => (
            <div key={a.name} style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 16}}>
              <div style={{width: 330, fontSize: 22, color: K.sky}}>{a.name}</div>
              <div style={{flex: 1, height: 18, background: K.panel, borderRadius: 9}}><div style={{width: `${a.share * 100 * ip(f, 120 + i * 8, 170 + i * 8)}%`, height: '100%', borderRadius: 9, background: i === 0 ? K.teal : K.sky}} /></div>
              <div style={{width: 80, fontFamily: M, fontSize: 22}}>{Math.round(a.share * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: 1220, top: 520, width: 580, padding: 34, borderRadius: 18, background: '#0E2C2AE6', border: `1.5px solid ${K.teal}AA`, boxShadow: `0 0 40px ${K.teal}33`, ...rise(f, 150)}}>
        <Tag>FINDINGS IMPROVED</Tag>
        <div style={{fontFamily: M, fontSize: 104, fontWeight: 700, color: K.teal, marginTop: 10}}>{fmt(data.findingImproved * ip(f, 160, 220))}</div>
        <div style={{fontSize: 27, lineHeight: 1.5, marginTop: 6}}>次架构发现，<br />在后续扫描中被确认改善。</div>
        <div style={{fontSize: 18, color: K.muted, marginTop: 16}}>语言：{data.languages.join(' · ')}</div>
      </div>
    </Scene>
  );
};

// ---------- 07 privacy ----------
const Privacy: React.FC = () => {
  const f = useCurrentFrame();
  const metric = ip(f, 60, 120);
  const src = ip(f, 30, 70);
  const blocked = f > 70;
  return (
    <Scene i={6} name="07 / LOCAL FIRST" note="原理示意 · 遥测字段见开源 src/telemetry.js">
      <div style={{position: 'absolute', left: 120, top: 120, fontSize: 54, fontWeight: 800, ...rise(f, 4)}}>源码不出本机。<span style={{color: K.teal}}>扫描不调大模型。</span></div>
      <div style={{position: 'absolute', left: 120, top: 250, width: 980, height: 560, borderRadius: 26, border: `2px dashed ${K.teal}AA`, background: '#0A1C2AB0'}}>
        <Tag style={{position: 'absolute', left: 30, top: 24}}>YOUR MACHINE</Tag>
        {['src/order.ts', 'src/runtime.ts', 'api/router.py', 'ui/App.tsx'].map((s, i) => (
          <div key={s} style={{position: 'absolute', left: 50, top: 100 + i * 100, width: 290, height: 72, borderRadius: 10, background: K.panel2, border: `1px solid ${K.grid}`,
            fontFamily: M, fontSize: 21, display: 'flex', alignItems: 'center', paddingLeft: 22, color: K.sky, ...rise(f, 8 + i * 4)}}>▤ {s}</div>
        ))}
        <div style={{position: 'absolute', left: 470, top: 190, width: 420, height: 180, borderRadius: 16, background: '#0D2232', border: `1.5px solid ${K.teal}`, padding: 26, ...rise(f, 20)}}>
          <div style={{fontFamily: M, fontSize: 24, fontWeight: 700}}>本地结构扫描</div>
          <div style={{fontFamily: M, fontSize: 20, color: K.muted, marginTop: 14}}>tree-sitter AST · git history</div>
          <div style={{fontFamily: M, fontSize: 22, color: K.teal, marginTop: 14}}>LLM calls: 0</div>
        </div>
        <div style={{position: 'absolute', left: 340, top: 270, width: 130, height: 2, background: K.teal, opacity: 0.6}} />
      </div>
      {/* cloud */}
      <div style={{position: 'absolute', left: 1400, top: 360, width: 400, height: 220, borderRadius: 110, background: '#0D2232', border: `1.5px solid ${K.sky}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', ...rise(f, 14)}}>
        <div style={{fontFamily: M, fontSize: 26, fontWeight: 700}}>Vibe Cloud</div>
        <div style={{fontSize: 20, color: K.muted, marginTop: 8}}>只收派生指标</div>
      </div>
      {/* metrics packet passes */}
      <div style={{position: 'absolute', left: 900 + metric * 480, top: 450, padding: '10px 18px', borderRadius: 8, background: K.teal, color: K.navy, fontFamily: M, fontSize: 19, fontWeight: 700, opacity: metric > 0 && metric < 1 ? 1 : 0}}>metrics</div>
      {/* source packet blocked at boundary */}
      <div style={{position: 'absolute', left: 340 + src * 700, top: 330, padding: '10px 18px', borderRadius: 8, background: blocked ? '#5A2033' : K.panel2, border: `1.5px solid ${K.red}`, color: K.red, fontFamily: M, fontSize: 19, opacity: ip(f, 30, 36) * (1 - ip(f, 110, 130))}}>
        source.ts {blocked ? '✕' : ''}
      </div>
      <div style={{position: 'absolute', left: 1098, top: 290, width: 6, height: 120, background: K.red, opacity: blocked ? 0.9 * (1 - ip(f, 110, 130)) : 0, boxShadow: `0 0 24px ${K.red}`}} />
      <div style={{position: 'absolute', left: 120, top: 850, fontSize: 22, color: K.muted, lineHeight: 1.6, ...rise(f, 90)}}>
        不上传源码、diff、prompt、项目路径或密钥 · 去标识化遥测默认开启并明示 · <span style={{fontFamily: M, color: K.sky}}>vibe-monitor telemetry off</span> 一键关闭
      </div>
    </Scene>
  );
};

// ---------- 08 CTA ----------
const CMD = `npx -y @vibe-monitor/setup@latest install`;
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const typed = Math.floor(ip(f, 14, 70, 0, CMD.length));
  const end = spring({frame: f - 96, fps, config: {damping: 16}});
  const out = ip(f, 222, 240, 1, 0);
  return (
    <Scene i={7} name="08 / INSTALL" note={`npm @vibe-monitor/setup@${data.npmLatest} · Apache-2.0`}>
      <AbsoluteFill style={{opacity: out}}>
        <div style={{position: 'absolute', left: 240, top: 170, width: 1440, borderRadius: 18, background: '#08131FF2', border: '1px solid #4A8FB066', overflow: 'hidden', opacity: 1 - 0.65 * end, transform: `translateY(${-90 * end}px) scale(${1 - 0.12 * end})`}}>
          <div style={{height: 52, padding: '13px 24px', background: K.panel2, fontFamily: M, fontSize: 19, color: K.muted}}>● ● ●　terminal</div>
          <div style={{padding: '30px 34px', fontFamily: M, fontSize: 34}}>
            <span style={{color: K.teal}}>$ </span>{CMD.slice(0, typed)}<span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: K.teal}}>▋</span>
            <div style={{fontSize: 22, color: K.muted, marginTop: 18, opacity: ip(f, 76, 90)}}>✓ 注册到 {AGENTS.join(' / ')} · 无需激活码</div>
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', opacity: end, transform: `translateY(${40 * (1 - end)}px)`}}>
          <div style={{display: 'inline-block'}}><VMark f={f} size={170} /></div>
          <div style={{fontSize: 92, fontWeight: 800, marginTop: 6}}>让架构，<span style={{color: K.teal}}>跟上你的速度。</span></div>
          <div style={{fontFamily: M, fontSize: 28, color: K.sky, marginTop: 22, letterSpacing: 2}}>vibe.fde.fan · Apache-2.0 开源</div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

const Caption: React.FC<{text: string; len: number}> = ({text, len}) => {
  const f = useCurrentFrame();
  const op = ip(f, 0, 6) * ip(f, len - 6, len, 1, 0);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 82, textAlign: 'center', opacity: op}}>
      <span style={{display: 'inline-block', maxWidth: 1760, padding: '10px 26px', borderRadius: 10, background: '#020710B8', fontFamily: F, fontSize: 30, whiteSpace: 'nowrap', color: '#EAF2F8', lineHeight: 1.45}}>{text}</span>
    </div>
  );
};

export const VibeMonitorDataFilm: React.FC = () => {
  const scenes = [Hook, Conflict, Reveal, How, Monitors, Data, Privacy, Cta];
  return (
    <AbsoluteFill style={{background: K.navy}}>
      {scenes.map((S, i) => (
        <Sequence key={i} from={B[i]} durationInFrames={B[i + 1] - B[i]}><S /></Sequence>
      ))}
      <Audio src={staticFile(`${SLUG}/audio/score.wav`)} volume={(f) => 0.3 * ip(f, 0, 15) * ip(f, VM_DATA_FRAMES - 60, VM_DATA_FRAMES, 1, 0)} />
      {VO.map((v) => (
        <Sequence key={v.id} from={v.at} durationInFrames={v.len + 4}>
          <Audio src={staticFile(`${SLUG}/audio/${v.id}.wav`)} volume={1} />
          <Caption text={v.text} len={v.len + 4} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
