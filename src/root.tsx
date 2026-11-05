import {HKContinuousStoryEmotionV5,EMOTION_V5_FRAMES} from './projects/hongkong-wind-lyrics-20261031/HKContinuousStoryEmotionV5';
import {HKContinuousStoryRhythmV4,RHYTHM_V4_FRAMES} from './projects/hongkong-wind-lyrics-20261031/HKContinuousStoryRhythmV4';
import {HKContinuousStoryV3,CONTINUOUS_STORY_FRAMES} from './projects/hongkong-wind-lyrics-20261031/HKContinuousStoryV3';
import {HKWindLyricsDirectorCut,HK_DIRECTOR_FRAMES} from './projects/hongkong-wind-lyrics-20261031/HKWindLyricsDirectorCut';
import {HKWindLyricsFilm,HK_WIND_FRAMES} from './projects/hongkong-wind-lyrics-20261031/HKWindLyrics';
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
import {VibeMonitorDataFilm,VM_DATA_FRAMES,VM_DATA_FPS} from './projects/vibe-monitor-1-0-data-20261103/VibeMonitorDataFilm';
import {VibeMonitorVisualSample,VM_SAMPLE_FRAMES} from './projects/vibe-monitor-1-0-data-20261103/sample/VibeMonitorVisualSample';
import {VibeMonitorVisualFilm,VM_FILM_FRAMES} from './projects/vibe-monitor-1-0-data-20261103/film/VibeMonitorVisualFilm';
import {OutsideWindowSample,OTW_SAMPLE_FRAMES} from './projects/outside-the-window-20261104/sample/OutsideWindowSample';
import {OutsideWindowFilm,OTW_FILM_FRAMES} from './projects/outside-the-window-20261104/film/OutsideWindowFilm';
export const Root:React.FC=()=> <>
 <Composition id="OutsideWindowFilm" component={OutsideWindowFilm} durationInFrames={OTW_FILM_FRAMES} fps={30} width={1920} height={1080} />
 <Composition id="OutsideWindowSample" component={OutsideWindowSample} durationInFrames={OTW_SAMPLE_FRAMES} fps={30} width={1920} height={1080} />
 <Composition id="VibeMonitorVisualFilm" component={VibeMonitorVisualFilm} durationInFrames={VM_FILM_FRAMES} fps={30} width={1920} height={1080} />
 <Composition id="VibeMonitorVisualSample" component={VibeMonitorVisualSample} durationInFrames={VM_SAMPLE_FRAMES} fps={30} width={1920} height={1080} />
 <Composition id="VibeMonitorDataFilm" component={VibeMonitorDataFilm} durationInFrames={VM_DATA_FRAMES} fps={VM_DATA_FPS} width={1920} height={1080} />
 <Composition id="HKContinuousStoryEmotionV5" component={HKContinuousStoryEmotionV5} durationInFrames={EMOTION_V5_FRAMES} fps={24} width={720} height={1280} />
 <Composition id="HKContinuousStoryRhythmV4" component={HKContinuousStoryRhythmV4} durationInFrames={RHYTHM_V4_FRAMES} fps={24} width={720} height={1280} />
 <Composition id="HKContinuousStoryV3" component={HKContinuousStoryV3} durationInFrames={CONTINUOUS_STORY_FRAMES} fps={24} width={720} height={1280} />
 <Composition id="HKWindLyricsDirectorV2" component={HKWindLyricsDirectorCut} durationInFrames={HK_DIRECTOR_FRAMES} fps={24} width={720} height={1280} />
 <Composition id="HKWindLyrics20261031" component={HKWindLyricsFilm} durationInFrames={HK_WIND_FRAMES} fps={24} width={720} height={1280} />
 <Composition id="LiaozhaiLaoshan" component={LiaozhaiLaoshan} durationInFrames={1440} fps={24} width={1920} height={1080} />
 <Composition id="VibeMonitorDirectorCut" component={VibeMonitorDirectorCut} durationInFrames={1536} fps={24} width={1920} height={1080} />
 <Composition id="OrbOnePhysicalCut" component={OrbOnePhysicalCut} durationInFrames={1290} fps={24} width={1920} height={1080} />
 <Composition id="OrbOneDirectorsCut" component={OrbOneDirectorsCut} durationInFrames={1290} fps={24} width={1920} height={1080} />
 <Composition id="OrbOne" component={OrbOne} durationInFrames={1152} fps={24} width={1920} height={1080} />
 <Composition id="MentorPaperReview" component={MentorReview} durationInFrames={timing.totalFrames} fps={24} width={1920} height={1080} />
 <Composition id="OwlVsWorkBuddy" component={OwlVsWorkBuddy} durationInFrames={1248} fps={24} width={1920} height={1080} />
</>;