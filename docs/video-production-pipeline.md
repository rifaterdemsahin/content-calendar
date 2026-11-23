# Video production pipeline

From a raw take on a drive to a rendered short. Each stage has a check. Don't move on until the check passes.

Rule for every stage: **play the clip first** (VLC, with the sound settings) before any other step.

## Stage 1. Ingest

Get the take off the camera and onto a drive we can read.

- **Where:** NINJAV (2 TB, exfat) holds the raw takes as `NINJAV_S001_S001_T0NN.MOV`. The Samsung Portable SSD T5 holds the project folders (`MemoryPalace`, `Apps`).
- **Check:** `ls -lt /Volumes/NINJAV` shows the new clip with today's date, and `ffprobe` opens it. If the folder listing fails with `Input/output error`, unplug and replug the drive, then check again.
- **Free space:** the system disk needs room for every copy we make. Check `df -h /` before copying. Delete our own intermediate copies when they're no longer needed.

## Stage 2. Audio check

Find which channels carry the voice.

```
scripts/video/inspect_audio.sh /Volumes/NINJAV/NINJAV_S001_S001_T020.MOV
```

- **Check:** channels near -90 dB are silent. Channels with real speech sit around -26 to -38 dB mean.
- **Record:** note the channel numbers that carry speech (the camera's 4-channel recordings have had them on channels 2 and 3, counted from 0). Note the level and any hiss.
- **Quality bar:** no clipping (peaks below 0 dBFS), noise floor below about -50 dBFS. Quieter takes need a gain lift in stage 5.

## Stage 3. Playback copy

A normal stereo player plays only the front pair, so it can sound silent. Make a copy with the speech channels moved to left and right:

```
scripts/video/stereo_playback.sh /Volumes/NINJAV/NINJAV_S001_S001_T020.MOV ~/Movies/current-video-recordings/t020-stereo.mov 2 3
open -a VLC ~/Movies/current-video-recordings/t020-stereo.mov
```

- **Check:** play it in VLC. You hear the speech in both speakers. If it's silent, try the other channel pair from stage 2.
- **Space:** the copy is about the size of the source. The script refuses to start if there isn't room.
- **Clean up** the copy when the take is finished.

## Stage 4. Transcribe the last sentences

Only the ending of the take is needed for the short.

```
python3 scripts/video/transcribe_last.py ~/Movies/current-video-recordings/t020-stereo.mov --last 5 --out ~/Movies/current-video-recordings/t020-last.txt
```

- **Install once:** `python3.10 -m venv ~/venvs/transcribe && ~/venvs/transcribe/bin/pip install faster-whisper`. Use Python 3.10 to 3.13. The system `python3` here is 3.8 and too old.
- **Check:** the printed lines match what you said at the end of the take. Mark the in and out times of the sentences to keep.

## Stage 5. Edit in Hyperframes

The short is a composition: HTML, CSS and GSAP, rendered to MP4 by the Hyperframes CLI. The project's own `AGENTS.md` and the `/hyperframes` skill govern the details.

Short-format practices:
- **Hook in the first 2 seconds:** start on the strongest sentence, not on the setup.
- **Tight cuts:** cut the pauses and filler words. Keep one idea per cut.
- **Captions on every line:** most viewers watch with the sound off. Use the transcript timings from stage 4.
- **Vertical frame:** 1080 × 1920 for Shorts and Reels.
- **Length:** under 60 seconds.
- **Gain:** lift quiet speech about 6–8 dB before captioning. Keep peaks below 0 dBFS.
- **One call to action at the end,** pointing to deliverypilot.net. Don't add claims the take doesn't make.

Commands (run inside the composition folder):

```
npx --yes hyperframes@0.9.81 preview --background     # Studio preview
npx --yes hyperframes@0.9.81 preview --status         # check it's listening
npx --yes hyperframes@0.9.81 snapshot --at 1,3,5      # look at frames before rendering
npx --yes hyperframes@0.9.81 lint                     # checks
```

## Stage 6. Review

- Watch the full render in VLC with the sound on.
- Check captions against the transcript for spelling and timing.
- Check the first two seconds and the last two seconds.
- Check the level: speech should be clearly louder than the room noise.

## Stage 7. Render

```
npx --yes hyperframes@0.9.81 render
```

Save the MP4 to `images/generated/` for images and to a `videos/` folder for finished shorts. Keep the transcript next to it.

## Stage 8. Publish to the site

- Add the finished file or its link to the current-video page, with a line saying what it is.
- Run the tests: `python3 -m unittest discover -s tests`.
- Commit, push to `main`, and watch the Fly.io deploy until it succeeds, then check the live page.
- Keep the raw takes on the drives. Don't commit them to git.

## Stage checklist

| # | Stage | Done when |
|---|---|---|
| 1 | Ingest | the new clip lists and plays |
| 2 | Audio check | speech channels and levels are noted |
| 3 | Playback copy | the speech plays in VLC in both speakers |
| 4 | Transcribe | the last sentences are timed |
| 5 | Edit | the Hyperframes preview looks right |
| 6 | Review | the full render passes the review list |
| 7 | Render | the MP4 is saved |
| 8 | Publish | the live page shows it |
