# Motion Lab: Prosody and Visual Rhythm on Windows

The narration score is semantic, not a fixed slide duration. A director annotates each meaningful phrase with ratePercent, pauseAfterMs, direction, and each block with reactionHoldMs. Speech is recorded as separate real audio takes. Silent frames are intentional audiovisual beats, never fake inhalation effects.

After synthesis, the engine reads actual MP3 lengths and constructs a frame-exact timeline. The reusable visual clock src/director/rhythm.ts slows camera movement during breathing and reaction holds without freezing the scene. Captions appear only while a phrase is audibly speaking.

## Windows workflow

Install edge-tts and mutagen with Python, and npm dependencies as normal. From the Motion Lab root:

    py -m pip install edge-tts mutagen
    py scripts/prosody/rhythm_engine.py --score-only --script projects/hongkong-wind-lyrics-20261031/script.json
    py scripts/prosody/rhythm_engine.py --synthesize --compile --script projects/hongkong-wind-lyrics-20261031/script.json
    py scripts/prosody/retime_story.py
    py scripts/prosody/audit.py
    npm run rhythm:test
    npx remotion studio src/index.ts

Select composition HKContinuousStoryRhythmV4. Old HKContinuousStoryV3 and its audio are preserved for A/B review.

You can update just one emotional passage using --synthesize --ids 06 19, followed by --compile. Fingerprints prevent reusing stale MP3s when you change voice, text, rate or pitch. Missing audio must fail closed.

## Generic projects

For a new project, create projects/<slug>/script.json containing fps, introFrames, voice role mapping and segments. Each segment needs id, role, scene, text, overlay; reactionHoldMs is optional.

An optional projects/<slug>/rhythm-direction.json contains a blocks object keyed by segment id. Each block may specify arc and chunks, where each chunk defines text, ratePercent, pauseAfterMs and direction. The concatenation of all chunk text must match the original segment text exactly. A reactionHolds object may override block reaction hold durations.

Call rhythm_engine.py --script projects/<slug>/script.json --synthesize --compile. The generated audio lives in public/<slug>/voice-rhythm; project timing and score are saved next to script.json. The Hong Kong six-scene retiming adapter is project-specific, while the soundtrack compiler and visual clock are generic.

## Editorial acceptance

- Use speed contrast to express intention. Do not mechanically slow down every sentence.
- Silence must contain a narrative action, a gaze, a camera hold or a continuous space. Do not replace it with PPT title cards.
- Restore speaking subtitles only during actual spoken phrases. Clear them during deliberate pauses.
- Do not add prerecorded gasp, artificial breaths or background music by default.
- Preserve exact quotations and language-specific pronunciation.
- Check speech, naturalness, continuity, alignment and the last quiet ending by listening to actual video, not only by checking the file or the waveform.
- A technical pass is NOT director approval.

The current tested voice backend on Windows is Edge TTS. Its phrase-level pace/pitch controls are real, but emotional acting and lifelike breaths are not guaranteed. Qwen3-TTS is NOT installed on Windows and has not been tested here.

## Tests

    py -m unittest discover -s tests -p test_prosody.py -v
    node --experimental-strip-types --test tests/rhythm.test.mjs
    py scripts/prosody/audit.py
    node_modules\.bin\tsc.cmd --noEmit

Film outputs and QA report: renders/hongkong-wind-lyrics-20261031/story-v3/ and projects/hongkong-wind-lyrics-20261031/rhythm-qa.json.
