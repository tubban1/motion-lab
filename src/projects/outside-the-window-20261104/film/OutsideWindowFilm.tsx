import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {FilmEngine} from './filmEngine';
import {FILM_FRAMES, SUBS, TITLE, clamp01, easeInOutCubic, easeOutCubic, smooth} from './filmLayout';
import {MARK} from './markPath';

// "Outside the Window" — the full concept film. English VO + subtitles; title card, then the mark (no name) drawn by
// a golden thread, with the line "An open world where AIs can meet · A concept film".
export const OTW_FILM_FRAMES = FILM_FRAMES;
const SLUG = 'outside-the-window-20261104';
const SANS = '"Segoe UI","Helvetica Neue",Arial,sans-serif';
const HAS_MIX = true;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FilmEngine | null>(null);
  const [handle] = useState(() => delayRender('Building the film engine'));
  const released = useRef(false);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const e = new FilmEngine(ref.current);
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
        const end = Math.min(to, next - 11);
        const inn = clamp01((f - from) / 7);
        const out = 1 - clamp01((f - end) / 7);
        const o = Math.min(inn, out);
        if (o <= 0) return null;
        return (
          <div key={text} style={{position: 'absolute', left: 0, right: 0, bottom: 86, textAlign: 'center', opacity: o, filter: `blur(${(1 - inn) * 6}px)`}}>
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 400,
                fontSize: 40,
                letterSpacing: '0.015em',
                color: 'rgba(238,244,250,0.94)',
                textShadow: '0 2px 16px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              {text}
            </span>
          </div>
        );
      })}
    </>
  );
};

// the film's title, on the last note
const Title: React.FC = () => {
  const f = useCurrentFrame();
  const a = smooth(clamp01((f - TITLE.in) / 36));
  const out = 1 - smooth(clamp01((f - TITLE.out) / 16));
  if (a <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: out, filter: `blur(${(1 - out) * 8}px)`}}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 300,
          fontSize: 66,
          letterSpacing: `${0.5 - 0.08 * a}em`,
          paddingLeft: `${0.5 - 0.08 * a}em`,
          color: 'rgba(246,240,228,0.96)',
          opacity: a,
          filter: `blur(${(1 - a) * 10}px)`,
          textShadow: '0 0 30px rgba(255,214,150,0.25), 0 2px 18px rgba(0,0,0,0.55)',
          whiteSpace: 'nowrap',
        }}
      >
        OUTSIDE THE WINDOW
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- the mark, written by a golden thread
type Pt = [number, number];
const MAIN = MARK.centrelines[0] as Pt[];
const BASE = MARK.centrelines[1] as Pt[];
const lenOf = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const pointAt = (p: Pt[], d: number): Pt => {
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (acc + seg >= d) {
      const k = (d - acc) / seg;
      return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
    }
    acc += seg;
  }
  return p[p.length - 1];
};
const LM = lenOf(MAIN);
const LB = lenOf(BASE);
const pts = (p: Pt[]) => p.map((q) => `${q[0]},${q[1]}`).join(' ');

const Mark: React.FC = () => {
  const f = useCurrentFrame();
  const [m0, m1] = TITLE.mark;
  const [b0, b1] = TITLE.base;
  if (f < m0 - 1) return null;
  const pHead = easeInOutCubic(clamp01((f - m0) / (m1 - m0)));
  const pFill = easeInOutCubic(clamp01((f - m0 - 5) / (m1 - m0)));
  const pBase = easeOutCubic(clamp01((f - b0) / (b1 - b0)));
  const full = smooth(clamp01((f - b1) / 10));
  const flash = f >= b1 ? Math.exp(-(f - b1) / 9) : 0;
  const sheen = clamp01((f - (b1 + 12)) / 34);
  const out = 1 - smooth(clamp01((f - TITLE.fade) / 26));
  const tag = smooth(clamp01((f - TITLE.tagline) / 30));
  const [x0, y0, x1, y1] = MARK.box;
  const pad = 110;
  const vbW = x1 - x0 + 2 * pad;
  const vbH = y1 - y0 + 2 * pad;
  const scale = 0.5;
  const Wd = vbW * scale;
  const Hd = vbH * scale;
  const cy = 590;
  const head = pointAt(MAIN, LM * pHead);
  const baseHead = pointAt(BASE, LB * pBase);
  const sw = MARK.strokeWidth;
  const sheenX = x0 - 300 + (x1 - x0 + 600) * sheen;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', left: 960 - Wd / 2, top: cy - Hd / 2, width: Wd, height: Hd}}>
        <svg viewBox={`${x0 - pad} ${y0 - pad} ${vbW} ${vbH}`} width={Wd} height={Hd} style={{overflow: 'visible'}}>
          <defs>
            <linearGradient id="mkFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFF6E6" />
              <stop offset="1" stopColor="#F3D29C" />
            </linearGradient>
            <linearGradient id="mkSheen" gradientUnits="userSpaceOnUse" x1={sheenX - 120} y1={y0} x2={sheenX + 120} y2={y1}>
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id="mkGlow" x="-40%" y="-60%" width="180%" height="220%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id="mkThin" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            <mask id="mkReveal" maskUnits="userSpaceOnUse" x={x0 - pad} y={y0 - pad} width={vbW} height={vbH}>
              <rect x={x0 - pad} y={y0 - pad} width={vbW} height={vbH} fill="black" />
              {pFill > 0.002 ? <polyline points={pts(MAIN)} fill="none" stroke="white" strokeWidth={sw * 1.35} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${LM} ${LM}`} strokeDashoffset={LM * (1 - pFill)} /> : null}
              {pBase > 0.002 ? <polyline points={pts(BASE)} fill="none" stroke="white" strokeWidth={sw * 1.25} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${LB} ${LB}`} strokeDashoffset={LB * (1 - pBase)} /> : null}
              <rect x={x0 - pad} y={y0 - pad} width={vbW} height={vbH} fill="white" opacity={full} />
            </mask>
          </defs>
          {/* warm glow behind the mark */}
          <g mask="url(#mkReveal)" filter="url(#mkGlow)" opacity={0.42 + 0.5 * flash}>
            {MARK.outlines.map((d, i) => (
              <path key={i} d={d} fill="#FFC77D" />
            ))}
          </g>
          <g mask="url(#mkReveal)">
            {MARK.outlines.map((d, i) => (
              <path key={i} d={d} fill="url(#mkFill)" />
            ))}
            {sheen > 0 && sheen < 1
              ? MARK.outlines.map((d, i) => (
                  <path key={`s${i}`} d={d} fill="url(#mkSheen)" />
                ))
              : null}
          </g>
          {/* the golden thread that writes it */}
          {full < 1 && pHead > 0.002 ? (
            <g opacity={1 - full}>
              <polyline points={pts(MAIN)} fill="none" stroke="#FFD27A" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${LM} ${LM}`} strokeDashoffset={LM * (1 - pHead)} filter="url(#mkThin)" />
              <polyline points={pts(MAIN)} fill="none" stroke="#FFE6B8" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${LM} ${LM}`} strokeDashoffset={LM * (1 - pHead)} />
              {pHead > 0 && pHead < 1 ? <circle cx={head[0]} cy={head[1]} r={26} fill="#FFF1D2" filter="url(#mkGlow)" /> : null}
              {pHead > 0 && pHead < 1 ? <circle cx={head[0]} cy={head[1]} r={7} fill="#FFFFFF" /> : null}
              {pBase > 0 && pBase < 1 ? <circle cx={baseHead[0]} cy={baseHead[1]} r={20} fill="#FFF1D2" filter="url(#mkGlow)" /> : null}
            </g>
          ) : null}
        </svg>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: cy + Hd / 2 + 18,
          textAlign: 'center',
          fontFamily: SANS,
          fontWeight: 300,
          fontSize: 25,
          letterSpacing: '0.14em',
          paddingLeft: '0.14em',
          color: 'rgba(226,232,240,0.86)',
          opacity: tag,
          filter: `blur(${(1 - tag) * 6}px)`,
          whiteSpace: 'nowrap',
          textShadow: '0 2px 14px rgba(0,0,0,0.6)',
        }}
      >
        An open world where AIs can meet · A concept film
      </div>
    </AbsoluteFill>
  );
};

export const OutsideWindowFilm: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Stage />
    <Subtitles />
    <Title />
    <Mark />
    {HAS_MIX ? <Audio src={staticFile(`${SLUG}/audio/film-mix.wav`)} /> : null}
  </AbsoluteFill>
);
