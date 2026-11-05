import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import data from '../data.json';
import {FilmEngine} from './filmEngine';
import {
  DOME_C,
  DOME_R,
  FILM_FRAMES,
  HUB,
  MONITORS,
  RING_C,
  SESSIONS,
  SUBS,
  SURFACED,
  T,
  clamp01,
  easeOutCubic,
  easeOutExpo,
  makeTowns,
  project,
  range,
  ringRadius,
  smooth,
  townsLit,
} from './filmLayout';

// Vibe Monitor 1.0 — full visual-first film. One world (code → city → the V), eight beats, one clock for picture and sound.
export const VM_FILM_FRAMES = FILM_FRAMES;
const SLUG = 'vibe-monitor-1-0-data-20261103';
const SANS = '"Noto Sans SC","Microsoft YaHei",sans-serif';
const DISPLAY = 'Bahnschrift,"Segoe UI",sans-serif';
const MONO = 'Consolas,"Cascadia Mono",monospace';
const TOWNS = makeTowns(data.projects);
const HAS_MIX = true;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FilmEngine | null>(null);
  const [handle] = useState(() => delayRender('Building the film engine'));
  const released = useRef(false);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const e = new FilmEngine(ref.current, {projects: data.projects});
    engine.current = e;
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
    return () => {
      e.dispose();
      engine.current = null;
    };
  }, [handle]);
  useLayoutEffect(() => {
    engine.current?.renderFrame(frame);
  }, [frame]);
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />;
};

const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SUBS.map(({from, to, text}, i) => {
        const next = SUBS[i + 1]?.from ?? Infinity;
        const end = Math.min(to + 5, next - 11);
        const inn = clamp01((f - (from - 4)) / 7);
        const out = 1 - clamp01((f - end) / 6);
        const o = Math.min(inn, out);
        if (o <= 0) return null;
        return (
          <div key={text} style={{position: 'absolute', left: 0, right: 0, bottom: 92, textAlign: 'center', opacity: o, filter: `blur(${(1 - inn) * 8}px)`}}>
            <span style={{fontFamily: SANS, fontWeight: 350, fontSize: 40, letterSpacing: '0.16em', paddingLeft: '0.16em', color: 'rgba(240,246,250,0.94)', textShadow: '0 2px 18px rgba(0,0,0,0.65)', whiteSpace: 'nowrap'}}>
              {text}
            </span>
          </div>
        );
      })}
    </>
  );
};

const Word: React.FC<{text: string; start: number; color?: string; weight?: number}> = ({text, start, color = '#F2F7FC', weight = 600}) => {
  const f = useCurrentFrame();
  const u = easeOutExpo(clamp01((f - start) / 20));
  return (
    <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', padding: '0 0.04em 0.08em'}}>
      <span style={{display: 'inline-block', transform: `translateY(${(1 - u) * 112}%)`, filter: `blur(${(1 - u) * 6}px)`, color, fontWeight: weight}}>{text}</span>
    </span>
  );
};

// "Vibe Monitor 1.0" lockup; used for the reveal (B3) and the end (B8)
const Lockup: React.FC<{start: number; tagAt: number; tagline: string; glint: [number, number]; out?: number}> = ({start, tagAt, tagline, glint, out}) => {
  const f = useCurrentFrame();
  if (f < start - 1) return null;
  const fade = out === undefined ? 1 : 1 - smooth(range(f, out, out + 16));
  if (fade <= 0) return null;
  const line = easeOutExpo(clamp01((f - (tagAt - 6)) / 22));
  const tag = clamp01((f - tagAt) / 26);
  const sweep = range(f, glint[0], glint[1]);
  const p = -20 + sweep * 140;
  const titleStyle: React.CSSProperties = {fontFamily: DISPLAY, fontSize: 108, letterSpacing: '0.01em', lineHeight: 1.05, whiteSpace: 'nowrap'};
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center', opacity: fade}}>
      <div style={{position: 'relative', display: 'inline-block'}}>
        <div style={titleStyle}>
          <Word text="Vibe" start={start} /> <Word text="Monitor" start={start + 4} /> <Word text="1.0" start={start + 9} color="#4AE8C3" weight={300} />
        </div>
        {sweep > 0 && sweep < 1 ? (
          <div
            style={{
              ...titleStyle,
              position: 'absolute',
              inset: 0,
              color: '#FFFFFF',
              textShadow: '0 0 24px rgba(160,255,235,0.9)',
              WebkitMaskImage: `linear-gradient(105deg, transparent ${p - 9}%, black ${p}%, transparent ${p + 9}%)`,
              maskImage: `linear-gradient(105deg, transparent ${p - 9}%, black ${p}%, transparent ${p + 9}%)`,
            }}
          >
            <span style={{padding: '0 0.04em 0.08em', fontWeight: 600}}>Vibe</span> <span style={{padding: '0 0.04em 0.08em', fontWeight: 600}}>Monitor</span>{' '}
            <span style={{padding: '0 0.04em 0.08em', fontWeight: 300}}>1.0</span>
          </div>
        ) : null}
      </div>
      <div style={{margin: '14px auto 0', width: 300 * line, height: 1, background: 'linear-gradient(90deg, transparent, #4AE8C3, transparent)'}} />
      <div
        style={{
          marginTop: 22,
          fontFamily: SANS,
          fontWeight: 300,
          fontSize: 34,
          letterSpacing: `${0.62 - 0.3 * easeOutCubic(tag)}em`,
          paddingLeft: `${0.62 - 0.3 * easeOutCubic(tag)}em`,
          color: '#BFD7EA',
          opacity: tag * 0.95,
          whiteSpace: 'nowrap',
        }}
      >
        {tagline}
      </div>
    </div>
  );
};

// a label pinned to a 3D point, with a hairline down to it
const Pin: React.FC<{x: number; y: number; z: number; lift?: number; o: number; children: React.ReactNode; side?: 'left' | 'right'; tint?: string}> = ({x, y, z, lift = 70, o, children, side = 'right', tint = '200,255,240'}) => {
  const f = useCurrentFrame();
  if (o <= 0.001) return null;
  const p = project(x, y, z, f);
  if (p.depth <= 0) return null;
  const arm = 26;
  return (
    <div style={{position: 'absolute', left: p.x, top: p.y, opacity: o}}>
      <div style={{position: 'absolute', left: -0.5, top: -lift, width: 1, height: lift - 4, background: `linear-gradient(rgba(${tint},0.75), rgba(${tint},0.15))`}} />
      <div style={{position: 'absolute', top: -lift, left: side === 'right' ? 0 : -arm, width: arm, height: 1, background: `rgba(${tint},0.75)`}} />
      <div style={{position: 'absolute', left: -2.5, top: -2.5, width: 5, height: 5, borderRadius: 5, background: '#DFFFF6', boxShadow: '0 0 10px #4AE8C3'}} />
      <div style={{position: 'absolute', top: -lift, left: side === 'right' ? arm + 10 : undefined, right: side === 'left' ? arm + 10 : undefined, transform: 'translateY(-50%)', whiteSpace: 'nowrap', textAlign: side}}>{children}</div>
    </div>
  );
};

const Sessions: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.mcp - 4 || f > T.b5) return null;
  const hubO = smooth(range(f, T.mcp, T.mcp + 10)) * (1 - smooth(range(f, T.still + 18, T.still + 34)));
  const running = f >= T.ignite && f < T.exitEnd - 4;
  const exited = f >= T.exitEnd - 4;
  const status = exited ? '○ 已退出 · 无后台进程' : running ? '● 运行中 · 随会话' : 'MCP 工具 · 随会话启动';
  const statusColor = exited ? '#8AA2B5' : running ? '#4AE8C3' : '#BFD7EA';
  return (
    <>
      <Pin x={HUB.x} y={HUB.h + 0.3} z={HUB.z} lift={84} o={hubO} side="left">
        <div style={{fontFamily: MONO, fontSize: 24, color: '#E9FFF8', letterSpacing: '0.04em', textShadow: '0 0 14px rgba(74,232,195,0.6)'}}>vibe-monitor</div>
        <div style={{fontFamily: SANS, fontWeight: 350, fontSize: 19, color: statusColor, marginTop: 4, letterSpacing: '0.06em'}}>{status}</div>
      </Pin>
      {SESSIONS.map((s) => {
        const o = smooth(range(f, s.land - 2, s.land + 6)) * (1 - smooth(range(f, s.retract + 2, s.retract + 12)));
        return (
          <Pin key={s.name} x={s.b.slot.x} y={s.b.slot.h + 0.2} z={s.b.slot.z} lift={s.i === 2 ? 92 : 128} o={o} side={s.i === 0 ? 'left' : 'right'}>
            <div style={{fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.06em', textShadow: '0 0 18px rgba(160,255,235,0.75)'}}>{s.name}</div>
            <div style={{fontFamily: MONO, fontSize: 14, color: '#8FE9D2', marginTop: 2, letterSpacing: '0.22em'}}>SESSION</div>
          </Pin>
        );
      })}
    </>
  );
};

const STAGES = ['S1', 'S2', 'S3', 'S4', 'S5'];
const Monitors: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.quiet - 6 || f > T.b6 + 40) return null;
  const out = 1 - smooth(range(f, T.b6, T.b6 + 20));
  const inn = smooth(range(f, T.quiet - 4, T.quiet + 8));
  const s3 = smooth(range(f, T.notice + 2, T.notice + 12));
  const labelO = smooth(range(f, T.notice + 8, T.notice + 20)) * out;
  return (
    <>
      <div style={{position: 'absolute', left: 96, top: 92, opacity: inn * out}}>
        <div style={{fontFamily: MONO, fontSize: 15, letterSpacing: '0.3em', color: '#8AA2B5', marginBottom: 14}}>ARCHITECTURE STAGE</div>
        <div style={{display: 'flex', gap: 10}}>
          {STAGES.map((s, i) => {
            const lit = i < 2 ? smooth(range(f, T.quiet + i * 6, T.quiet + 8 + i * 6)) : i === 2 ? s3 : 0;
            const c = i < 2 ? '#4AE8C3' : i === 2 ? '#F6C177' : '#FF6B88';
            return (
              <div key={s} style={{width: 74, textAlign: 'center'}}>
                <div style={{height: 6, borderRadius: 3, background: `rgba(255,255,255,0.08)`, overflow: 'hidden'}}>
                  <div style={{width: `${lit * 100}%`, height: '100%', background: c, boxShadow: `0 0 12px ${c}`}} />
                </div>
                <div style={{fontFamily: DISPLAY, fontSize: 24, marginTop: 10, color: lit > 0.5 ? c : 'rgba(200,215,225,0.35)', letterSpacing: '0.04em'}}>{s}</div>
              </div>
            );
          })}
        </div>
        <div style={{display: 'flex', marginTop: 6, fontFamily: SANS, fontWeight: 350, fontSize: 18, color: '#BFD7EA', letterSpacing: '0.1em'}}>
          <div style={{width: 158, textAlign: 'center', opacity: smooth(range(f, T.quiet + 10, T.quiet + 22))}}>保持安静</div>
          <div style={{width: 84, textAlign: 'center', color: '#F6C177', opacity: s3}}>提醒</div>
        </div>
      </div>
      {SURFACED.map((i, k) => {
        // pin each surfaced family's label on its ring, on the side facing the camera's right
        const ang = (k === 0 ? -0.12 : -0.3) * Math.PI;
        const r = ringRadius(i);
        return (
          <Pin key={i} x={RING_C.x + Math.cos(ang) * r} y={0.06} z={RING_C.z + Math.sin(ang) * r} lift={k === 0 ? 70 : 90} o={labelO} tint="255,226,181">
            <div style={{fontFamily: SANS, fontWeight: 400, fontSize: 24, color: '#FFE2B5', letterSpacing: '0.1em', textShadow: '0 0 16px rgba(246,193,119,0.6)'}}>{MONITORS[i]}</div>
          </Pin>
        );
      })}
    </>
  );
};

const fmt = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)} 万` : Math.round(n).toLocaleString('en-US'));
const Telemetry: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.towns[0] - 2 || f > T.b7 + 40) return null;
  const out = 1 - smooth(range(f, T.b7 + 4, T.b7 + 24));
  const lit = townsLit(TOWNS, f);
  const rows = [
    {at: T.towns[0] + 6, value: String(lit), label: '个项目实例 · 被持续观察', count: false},
    {at: T.nums[1], value: fmt(data.events), label: '条架构证据事件', count: true, v: data.events},
    {at: T.nums[2], value: fmt(data.noticeSurfaced), label: '次提醒被推送', count: true, v: data.noticeSurfaced},
    {at: T.nums[3], value: fmt(data.findingImproved), label: '次发现被确认改善', count: true, v: data.findingImproved, accent: true},
  ];
  const note = data.live ? `数据：Neon 生产库只读聚合 · 截至 ${data.asOf} · 去标识化 · 点位布局为示意` : `数据：生产 Neon 只读核对快照 · 截至 ${data.asOf} · 去标识化 · 点位布局为示意`;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: out}}>
      <div style={{position: 'absolute', left: -200, top: 40, width: 1100, height: 760, background: 'radial-gradient(ellipse at 38% 50%, rgba(3,7,12,0.78) 0%, rgba(3,7,12,0.45) 45%, rgba(3,7,12,0) 72%)', opacity: smooth(range(f, T.towns[0], T.towns[0] + 20))}} />
      <div style={{position: 'absolute', left: 96, top: 176}}>
        {rows.map((r, i) => {
          const u = smooth(range(f, r.at, r.at + 10));
          if (u <= 0) return null;
          const cu = r.count ? easeOutCubic(range(f, r.at, r.at + 16)) : 1;
          const shown = r.count ? fmt((r.v as number) * cu) : r.value;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 14, opacity: u, transform: `translateY(${(1 - u) * 16}px)`, filter: `blur(${(1 - u) * 6}px)`}}>
              <div style={{fontFamily: DISPLAY, fontWeight: 300, fontSize: 84, width: 250, textAlign: 'right', color: r.accent ? '#4AE8C3' : '#F2F7FC', letterSpacing: '0.01em', textShadow: '0 0 30px rgba(0,0,0,0.6)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>{shown}</div>
              <div style={{fontFamily: SANS, fontWeight: 350, fontSize: 26, color: '#BFD7EA', letterSpacing: '0.08em'}}>{r.label}</div>
            </div>
          );
        })}
        <div style={{marginTop: 22, marginLeft: 274, fontFamily: SANS, fontWeight: 350, fontSize: 22, color: '#8AA2B5', letterSpacing: '0.08em', opacity: smooth(range(f, T.nums[1] + 8, T.nums[1] + 20))}}>
          {data.installations} 个安装 · {data.active7d} 个近 7 天活跃
        </div>
      </div>
      <div style={{position: 'absolute', right: 96, top: 64, fontFamily: SANS, fontWeight: 350, fontSize: 17, color: 'rgba(170,190,205,0.8)', letterSpacing: '0.06em', opacity: smooth(range(f, T.towns[0] + 10, T.towns[0] + 26))}}>
        {note}
      </div>
    </div>
  );
};

const Local: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.dome || f > T.cut) return null;
  const a = smooth(range(f, T.dome + 16, T.dome + 28)) * (1 - smooth(range(f, T.open, T.open + 12)));
  const b = smooth(range(f, T.nollm - 2, T.nollm + 10)) * (1 - smooth(range(f, T.open, T.open + 12)));
  return (
    <>
      <Pin x={DOME_C.x + Math.sin(1.87) * DOME_R} y={0.05} z={DOME_C.z + Math.cos(1.87) * DOME_R} lift={110} o={a}>
        <div style={{fontFamily: SANS, fontWeight: 400, fontSize: 26, color: '#E9FFF8', letterSpacing: '0.16em', textShadow: '0 0 16px rgba(74,232,195,0.6)'}}>本机</div>
        <div style={{fontFamily: MONO, fontSize: 14, color: '#8FE9D2', marginTop: 2, letterSpacing: '0.22em'}}>SOURCE STAYS HERE</div>
      </Pin>
      <Pin x={DOME_C.x} y={DOME_R} z={DOME_C.z} lift={46} o={b}>
        <div style={{fontFamily: SANS, fontWeight: 400, fontSize: 24, color: '#E9FFF8', letterSpacing: '0.12em'}}>大模型调用 · 无</div>
        <div style={{fontFamily: MONO, fontSize: 14, color: '#8FE9D2', marginTop: 2, letterSpacing: '0.22em'}}>STRUCTURAL SCAN ONLY</div>
      </Pin>
    </>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const o = smooth(range(f, T.final + 34, T.final + 50));
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 46, textAlign: 'center', opacity: o, fontFamily: MONO, fontSize: 21, color: '#8AA2B5', letterSpacing: '0.06em'}}>
      vibe.fde.fan　·　Apache-2.0　·　npx -y @vibe-monitor/setup@latest install
    </div>
  );
};

// the type layer fades out a beat after the picture does, so the last frame is black
const Overlays: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{opacity: 1 - smooth(range(f, FILM_FRAMES - 15, FILM_FRAMES - 1))}}>{children}</AbsoluteFill>;
};

export const VibeMonitorVisualFilm: React.FC = () => (
  <AbsoluteFill style={{background: '#050A12'}}>
    <Stage />
    <Overlays>
      <Sessions />
      <Monitors />
      <Telemetry />
      <Local />
      <Subtitles />
      <Lockup start={T.title} tagAt={T.tagline} tagline="AI 编程时代的本地架构顾问" glint={T.glint} out={T.b4 - 6} />
      <Lockup start={T.final} tagAt={T.final + 18} tagline="让架构，跟上你的速度。" glint={[1792, 1840]} />
      <EndCard />
    </Overlays>
    {HAS_MIX ? <Audio src={staticFile(`${SLUG}/audio/film-mix.wav`)} /> : null}
  </AbsoluteFill>
);
