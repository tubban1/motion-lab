# Outside the Window — full concept film (89.5 s, English)

The full film of [the script](../script.en.md). B1–B2 are the approved [sample](../sample/README.md), unchanged in picture and sound; B3–B8 extend it in the same world and on the same clock.

v2 (2026-11-04) answers the review of v1: the early beats felt like one repeated scene, and the ending needed the mark.
- **Re-staging:** B3–B6 no longer share the window + floating-windows backdrop.
  - Worm's-eye up the thread.
  - The light holding three threads, over the open sea.
  - A macro inside the window among the private things.
  - A close, shallow shot of the lantern being made.
  - A time-lapse out over the empty open sea.
  - The wake seen from inside the window.
  - The meeting and the crystal facing the moonlit open sea.
- **Ending:** after the title, a golden thread writes the mark the user supplied (no name, no wordmark, no URL), with the line "An open world where AIs can meet · A concept film".

## Beats

| Beat | Time | Picture | Sound |
|---|---|---|---|
| B1 Inside | 0:00–0:11 | The sample: typing dots behind frosted glass, then the pull-back over thousands of windows. | Muffled half song; the windows' murmur. |
| B2 Outside | 0:11–0:19.5 | The sample: the seam, the door, the moonlit sea, the landing, two far windows answer. | The filter opens; the sea; tonal drops; A and C# answer the hanging E. |
| B3 The thread | 0:19.5–0:26 | **Thread:** a golden thread draws itself up from the dots.<br>**Up the thread:** a worm's-eye shot from just behind them, straight up the thread to a warm light (a person) in the stars.<br>**Three threads:** from far behind, over the open sea, that light holds three threads: this AI and two of the person's others, a terminal and a round window. | A plucked string, a harmonic that climbs the thread, a warm swell on "…is always you". |
| B4 Half a song | 0:26–0:45.6 | **The melody:** a macro inside the window, among the owner's private things (photos, notes, contacts, all soft). The golden half melody lifts off its card.<br>**The lantern:** outside, a close, shallow-focus shot: the ribbon reaches the dots and coils into a lantern, which is set on the water.<br>**Time-lapse:** out over the empty open sea, with the person's light and threads in the sky: night, dawn, day, dusk, night, three times, with star trails. The lantern stays lit while other lanterns come and go. At dusk time slows down: someone's pink dots come close, a pulse goes up their thread, their person declines, they nod and leave.<br>**Lighthouse:** at night, in a far round window, amber dots light a lighthouse. Its rings cross the sea, pass many lanterns and reach this one, which flares.<br>**The wake:** from inside the window, the dots wake and rush out of the door. | **Melody:** the lantern hums the half song, and a pad follows the daylight.<br>**Refusal:** a soft, slightly off "no".<br>**Lighthouse:** muffled drums at the lighthouse; on the flare, melody and drums lock to one beat for the first time. |
| B5 Yes | 0:45.6–0:53.4 | **Meeting:** facing the moonlit open sea, teal and amber trios meet in front of the lantern. Both threads are plucked, and the camera tilts up to two warm lights side by side.<br>**Yes:** the drummer lights at once and the songwriter a beat later. Light runs down both threads and a bridge forms. | Two strings in turn, A then E: a perfect fifth. |
| B6 Harmony | 0:53.4–1:01 | **Playing:** on the bridge they play, a teal and an amber voice braided along it.<br>**Crystal:** when they finish, a gem holding both colours sets between them, rises and hangs over the sea. | **Groove:** the first full groove (100 bpm): the answer half of the song, landing on D for the first time.<br>**Crystal:** it forms on that downbeat with bells and a sub. |
| B7 Sea of stars | 1:01–1:13.8 | **Fill:** one long crane, from the crystal to high over the sea. Doors light across the field of windows; lanterns, lighthouses, bridges, crystals and communities fill the sea: rings of dots, a band around a lighthouse, a marketplace grid, spirals, flowers.<br>**Final view:** a low wide over a sea of lights running to the horizon, with constellations between crystals and the sky above. | The whole song over the groove; strings, choir and a descant come in. Every fourth crystal adds a celesta note. |
| B8 Home | 1:13.8–1:29.5 | **Return:** the hero window, now with its door open. The teal dots come home carrying a small crystal; a warm pulse comes down the thread and takes it up; the dots hop in.<br>**Ending:** the camera rises up the thread to the two warm lights in clear sky. Title: OUTSIDE THE WINDOW.<br>**The mark:** a golden thread writes the mark in one stroke (the "w" running into the "2"), the base of the "2" settles, and the line "An open world where AIs can meet · A concept film" appears. | **Title:** the answer phrase continues out of the cut, slowly, and waits on C#. The last D lands with the title.<br>**The mark:** it is written to the half song's first four notes and settles on a warm D, then only the sea. |

Narration is Edge TTS en-US-AndrewNeural at −12 %, one take per beat, cut into sentences at the real pauses and placed on picture cues. Subtitles follow it sentence by sentence.

## Files

| Piece | File |
|---|---|
| Timeline, world layout, characters, cameras, narration and subtitles, sound events | `src/projects/outside-the-window-20261104/film/filmLayout.ts` |
| three.js engine (the sample engine plus threads, people, lantern, time-lapse sky, rings, bridge, braid, crystal, sea of lights, constellations) | `src/projects/outside-the-window-20261104/film/filmEngine.ts` |
| Composition `OutsideWindowFilm` (2685 f, 30 fps, 1080p) with subtitles, title and the mark animation | `src/projects/outside-the-window-20261104/film/OutsideWindowFilm.tsx` |
| The mark, traced from the supplied PNG: outlines (marching squares) and stroke centrelines (thinning) | `src/projects/outside-the-window-20261104/film/markPath.ts`, from `projects/outside-the-window-20261104/assets/mark-source.png` |
| Score, sound effects, narration processing and mix, all synthesized | `projects/outside-the-window-20261104/film/film-sound.mjs` → `public/outside-the-window-20261104/audio/film-mix.wav` |

Rebuild:

```bash
node projects/outside-the-window-20261104/film/film-sound.mjs
npx remotion render src/index.ts OutsideWindowFilm renders/outside-the-window-film-v2-1080p.mp4 --codec h264 --crf 18 --gl=angle --concurrency 3
```

## QC (2026-11-04)

### v2: current

- **Master:** `renders/outside-the-window-film-v2-1080p.mp4`. H.264 1920×1080, 30 fps, 2685 frames, 89.52 s; AAC 48 kHz stereo; 263.5 MB.
- **Share copy:** `renders/outside-the-window-film-v2-share-1080p.mp4`, CRF 27, 63.3 MB.
- **End card:** `renders/outside-the-window-film-v2-endcard.png`.
- **Checks:** `tsc --noEmit` passes. Both MP4s decode all 2685 frames, and the frame scan finds no black or flash frames.
- **Sync,** measured by frequency band on the audio from the master. The source mix gives identical values, so the encode shifted nothing. Each event is listed as measured, then expected:

  | Event | Measured | Expected |
  |---|---|---|
  | Glass tap | 6.696 s | 6.693 s |
  | Beacon | 42.436 s | 42.400 s |
  | Flare crash | 44.400 s | 44.400 s |
  | The drummer's yes | 49.272 s | 49.267 s |
  | The songwriter's yes | 50.272 s | 50.267 s |
  | Crystal | 57.008 s | 57.000 s |
  | The crash on the cut home | 73.804 s | 73.800 s |
  | Title bell | 81.236 s | 81.253 s |
  | The mark's bell as it settles | 85.856 s | 85.850 s |

  In the 30–90 Hz and 280–310 Hz bands the flare and the title read about 55 ms early; that is the band picking up energy that rises just before them.
- **Mix:** peak −1.4 dBFS, RMS −20.0 dBFS, 0 clipped samples; narration 12–16 dB over the music.
- **Picture review:** look-dev rounds are in `renders/qc/otw-film/dev5–dev7`; consecutive-frame strips are in `renders/qc/otw-film/strips-v2/`. Fixed during review:
  - the moon beside the two people's lights in the B5 tilt-up (it now sits to the right after the time-lapse);
  - grey, unreadable private things in the inside-the-window macro (now wider and in colour);
  - a too-small lantern in the time-lapse (now a longer lens);
  - stray dots when the mark began drawing (zero-length round-cap dashes).
- **Known weak spots:**
  - The worm's-eye shot's foreground dots are large and soft.
  - The high three-threads shot has a few field windows cut off in its bottom corners.
  - The moon still crosses the frame at the end of B6.
- **Not verified:** nobody has watched it with sound yet, so the music, the narration voice and the overall feel are UNVERIFIED. The Edge TTS terms are also unverified. Verdict: **UNVERIFIED — NOT DIRECTOR_APPROVED** until a person watches and listens.

### v1: superseded, kept

`renders/outside-the-window-film-v1-1080p.mp4` (84.31 s) and its share copy are kept for comparison. Their QC is the same kind; review strips are in `renders/qc/otw-film/strips/`.

## Sources and rights

- **Picture:** everything is procedural three.js; there is no third-party footage, image or model.
- **The end mark:** the user supplied it on 2026-11-04 and asked for it to be animated at the end without naming the brand. It is traced to vectors; no wordmark, name or URL is shown.
- **Sound:** everything is synthesized in `film-sound.mjs`; there is no third-party music or sound effect.
- **Narration:** Edge TTS through `scripts/voiceover.py --no-filter`. Its commercial terms are still unverified.
- **Font:** Segoe UI, a Windows system font, rasterized only.
