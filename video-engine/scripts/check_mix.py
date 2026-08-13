#!/usr/bin/env python3
"""Confirm a rendered video's audio is present, audible, and cued to its beats.

Rendering a soundtrack can fail in ways that leave a perfectly valid file: the
assets resolve to silence, the bed plays but no accent triggers, or every cue
lands in the wrong place. None of those show up in a file listing, and whoever
runs the build may not be able to listen.

So this measures the loudness envelope in short windows and reports where the
peaks are. A cued edit has visible spikes near its beat frames; music laid over
a video has a flat envelope.

    python3 scripts/check_mix.py out/au-hammer.mp4 --cues 500,660,810,1060,1360,1674,1830
"""

import argparse
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

COMPOSITOR = Path(__file__).resolve().parents[1] / (
    "node_modules/@remotion/compositor-linux-x64-gnu"
)


def decode(video: Path) -> tuple[np.ndarray, int]:
    wav = Path("/tmp/_mix.wav")
    subprocess.run(
        [str(COMPOSITOR / "ffmpeg"), "-y", "-v", "error", "-i", str(video),
         "-vn", "-acodec", "pcm_s16le", str(wav)],
        env=dict(os.environ, LD_LIBRARY_PATH=str(COMPOSITOR)),
        check=True,
    )
    with wave.open(str(wav), "rb") as w:
        ch, rate, n = w.getnchannels(), w.getframerate(), w.getnframes()
        a = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float64) / 32768
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    return a, rate


def db(v: float) -> float:
    return -120.0 if v <= 0 else 20 * np.log10(v)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--fps", type=float, default=60)
    ap.add_argument("--cues", default="", help="comma-separated frames a cue should land on")
    args = ap.parse_args()

    x, rate = decode(Path(args.video))
    dur = len(x) / rate
    peak, rms = np.max(np.abs(x)), np.sqrt(np.mean(x**2))
    print(f"{Path(args.video).name}: {dur:.1f}s  peak {db(peak):.1f}  rms {db(rms):.1f} dBFS")

    problems = []
    if peak == 0:
        print("\nSILENT — the soundtrack did not reach the render.")
        sys.exit(1)
    if db(peak) < -30:
        problems.append(f"barely audible: peak {db(peak):.1f} dBFS")
    if db(peak) > -0.5:
        problems.append(f"clipping: peak {db(peak):.1f} dBFS")

    # Envelope in 0.1s windows.
    win = int(rate * 0.1)
    envelope = np.array([
        np.sqrt(np.mean(x[i : i + win] ** 2)) for i in range(0, len(x) - win, win)
    ])
    quiet, loud = np.percentile(envelope, 20), np.percentile(envelope, 99)
    dynamics = db(loud) - db(quiet)
    print(f"dynamics: accents sit {dynamics:.1f} dB above the quiet floor", end="")
    if dynamics < 5:
        print(" — flat, this reads as music laid over the video")
        problems.append("envelope is flat, no accents detectable")
    else:
        print("")

    # The last two seconds must not be dead: a silent tail is the audio version
    # of the frozen final frames.
    tail = envelope[-20:]
    if db(np.max(tail)) < db(np.percentile(envelope, 50)) - 12:
        problems.append("the last 2s are near-silent while the video is still running")

    if args.cues:
        cues = [int(c) for c in args.cues.split(",") if c.strip()]
        print("\ncue           window peak   vs floor")
        for c in cues:
            i = int(c / args.fps / 0.1)
            # Wide enough to contain a long cue's payoff: a riser ramps for
            # 2.6s, so measuring only just after its start reported it missing
            # when it was in fact the loudest thing in the video.
            seg = envelope[max(0, i - 2) : i + 28]
            if len(seg) == 0:
                continue
            lift = db(np.max(seg)) - db(quiet)
            ok = lift > 4
            print(f"  frame {c:<6} {db(np.max(seg)):6.1f} dBFS  {lift:+5.1f} dB  "
                  f"{'ok' if ok else 'NOT AUDIBLE'}")
            if not ok:
                problems.append(f"no accent detectable at frame {c}")

    print()
    for p in problems:
        print(f"  - {p}")
    print(f"{len(problems)} problem(s)")
    print("\nLevels only. Nobody has heard this — listen before publishing.")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
