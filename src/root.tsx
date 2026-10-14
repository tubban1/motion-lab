import {LiaozhaiLaoshan} from './projects/liaozhai-laoshan-daoshi/LiaozhaiLaoshan';
import React from 'react';
import {Composition} from 'remotion';
import {MentorReview} from './projects/mentor-paper-review/MentorReview';
import timing from './projects/mentor-paper-review/timing.json';
import {OwlVsWorkBuddy} from './projects/owl-vs-workbuddy/OwlVsWorkBuddy';
import {OrbOne} from './projects/orb-one/OrbOne';
import {OrbOneDirectorsCut} from './projects/orb-one/OrbOneDirectorsCut';
import {OrbOnePhysicalCut} from './projects/orb-one/OrbOnePhysicalCut';
import {VibeMonitorDirectorCut} from './projects/vibe-monitor-directors-launch/VibeMonitorDirectorCut';
export const Root:React.FC=()=> <>
 <Composition id="LiaozhaiLaoshan" component={LiaozhaiLaoshan} durationInFrames={1440} fps={24} width={1920} height={1080} />
 <Composition id="VibeMonitorDirectorCut" component={VibeMonitorDirectorCut} durationInFrames={1536} fps={24} width={1920} height={1080} />
 <Composition id="OrbOnePhysicalCut" component={OrbOnePhysicalCut} durationInFrames={1290} fps={24} width={1920} height={1080} />
 <Composition id="OrbOneDirectorsCut" component={OrbOneDirectorsCut} durationInFrames={1290} fps={24} width={1920} height={1080} />
 <Composition id="OrbOne" component={OrbOne} durationInFrames={1152} fps={24} width={1920} height={1080} />
 <Composition id="MentorPaperReview" component={MentorReview} durationInFrames={timing.totalFrames} fps={24} width={1920} height={1080} />
 <Composition id="OwlVsWorkBuddy" component={OwlVsWorkBuddy} durationInFrames={1248} fps={24} width={1920} height={1080} />
</>;
