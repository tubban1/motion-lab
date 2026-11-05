import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {CityEngine} from './cityEngine';
import {SAMPLE_FRAMES, T, clamp01, easeOutCubic, easeOutExpo, range} from './cityLayout';

// Visual-first A/B sample: one continuous shot (code city -> tangle -> freeze -> scan -> the city becomes the V).
export const VM_SAMPLE_FRAMES = SAMPLE_FRAMES;
const SLUG = 'vibe-monitor-1-0-data-20261103';
const SANS = '"Noto Sans SC","Microsoft YaHei",sans-serif';
const DISPLAY = 'Bahnschrift,"Segoe UI",sans-serif';

const City: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<CityEngine | null>(null);
  const [handle] = useState(() => delayRender('Building the city engine'));
  const released = useRef(false);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const e = new CityEngine(ref.current);
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

const SUBS: {at: [number, number]; text: string}[] = [
  {at: T.p1, text: '功能一层层叠上去'},
  {at: T.p2, text: '依赖越缠越紧'},
  {at: T.p3, text: '直到没人敢改'},
];
const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SUBS.map(({at, text}) => {
        const inn = clamp01((f - (at[0] - 4)) / 7);
        const out = 1 - clamp01((f - (at[1] + 5)) / 7);
        const o = Math.min(inn, out);
        if (o <= 0) return null;
        return (
          <div key={text} style={{position: 'absolute', left: 0, right: 0, bottom: 92, textAlign: 'center', opacity: o, filter: `blur(${(1 - inn) * 8}px)`}}>
            <span style={{fontFamily: SANS, fontWeight: 350, fontSize: 40, letterSpacing: '0.16em', paddingLeft: '0.16em', color: 'rgba(240,246,250,0.94)', textShadow: '0 2px 18px rgba(0,0,0,0.65)'}}>{text}</span>
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

const Title: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.title - 1) return null;
  const line = easeOutExpo(clamp01((f - (T.tagline - 6)) / 22));
  const tag = clamp01((f - T.tagline) / 26);
  const sweep = range(f, T.glint[0], T.glint[1]);
  const p = -20 + sweep * 140;
  const titleStyle: React.CSSProperties = {fontFamily: DISPLAY, fontSize: 108, letterSpacing: '0.01em', lineHeight: 1.05, whiteSpace: 'nowrap'};
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center'}}>
      <div style={{position: 'relative', display: 'inline-block'}}>
        <div style={titleStyle}>
          <Word text="Vibe" start={T.title} /> <Word text="Monitor" start={T.title + 4} /> <Word text="1.0" start={T.title + 9} color="#4AE8C3" weight={300} />
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
        }}
      >
        AI 编程时代的本地架构顾问
      </div>
    </div>
  );
};

export const VibeMonitorVisualSample: React.FC = () => (
  <AbsoluteFill style={{background: '#050A12'}}>
    <City />
    <Subtitles />
    <Title />
    <Audio src={staticFile(`${SLUG}/audio/sample-mix.wav`)} />
  </AbsoluteFill>
);
