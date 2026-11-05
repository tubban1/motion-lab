import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {SampleEngine} from './sampleEngine';
import {SAMPLE_FRAMES, SUBS, clamp01} from './sampleLayout';

// "Outside the Window" — B1→B2 sample (inside the window → the door → the night sea). English VO + subtitles.
export const OTW_SAMPLE_FRAMES = SAMPLE_FRAMES;
const SLUG = 'outside-the-window-20261104';
const SANS = '"Segoe UI","Helvetica Neue",Arial,sans-serif';
const HAS_MIX = true;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<SampleEngine | null>(null);
  const [handle] = useState(() => delayRender('Building the sample engine'));
  const released = useRef(false);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const e = new SampleEngine(ref.current);
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

export const OutsideWindowSample: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Stage />
    <Subtitles />
    {HAS_MIX ? <Audio src={staticFile(`${SLUG}/audio/sample-mix.wav`)} /> : null}
  </AbsoluteFill>
);
