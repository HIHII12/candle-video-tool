#!/usr/bin/env python3
"""Check the generated audio against the things that make audio sound broken.

This exists because whoever runs the build cannot necessarily listen to the
result — and a loop seam click, a DC offset or a clipped transient is obvious to
an ear and invisible to a file listing. Each check below corresponds to a defect
that would be audible.

    python3 scripts/check_audio.py
"""

import sys
import wave
from pathlib import Path

import numpy as np

LOOPS = {"bed-dark.wav", "bed-light.wav"}


def read(p: Path):
    with wave.open(str(p), "rb") as w:
        n = w.getnframes()
        a = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float64) / 32768
        return a, w.getframerate()


def db(x: float) -> float:
    return -np.inf if x <= 0 else 20 * np.log10(x)


def check(p: Path) -> list[str]:
    x, rate = read(p)
    bad = []
    peak, rms = np.max(np.abs(x)), np.sqrt(np.mean(x**2))

    if peak >= 0.999:
        bad.append(f"clipping: peak {db(peak):.1f} dBFS touches full scale")
    if peak < 0.02:
        bad.append(f"effectively silent: peak {db(peak):.1f} dBFS")
    # A bed that is as loud as an accent leaves no headroom for the accent.
    limit = -16 if p.name in LOOPS else -4
    if db(peak) > limit:
        bad.append(f"too loud for its role: peak {db(peak):.1f} dBFS, want under {limit}")

    dc = float(np.mean(x))
    if abs(dc) > 0.005:
        bad.append(f"DC offset {dc:+.4f} — wastes headroom and can thump on start")

    # A one-shot must begin and end *at zero*, or the jump from silence to the
    # first sample is itself a click.
    #
    # An earlier version of this check measured the peak over the first 2 ms and
    # flagged tick, thud and loss. That was the test being wrong, not the audio:
    # a percussive hit is supposed to reach full level almost instantly, and
    # slowing its attack to satisfy the check would have made every accent
    # mushy. What matters is continuity at the edges, not how fast the envelope
    # rises after them.
    if p.name not in LOOPS:
        if abs(x[0]) > 0.01:
            bad.append(f"first sample {x[0]:+.3f} — steps out of silence, will click")
        if abs(x[-1]) > 0.01:
            bad.append(f"last sample {x[-1]:+.3f} — does not settle, will click")

    # A loop's seam is the join between its last and first sample. If the step
    # there is larger than the steps found inside the file, the seam will tick
    # once per repeat, which is the most recognisable amateur audio defect.
    if p.name in LOOPS:
        seam = abs(x[0] - x[-1])
        typical = float(np.percentile(np.abs(np.diff(x)), 99.9))
        if seam > max(typical * 4, 0.01):
            bad.append(f"loop seam steps {seam:.4f} vs {typical:.4f} typical — will tick")

    print(f"{'ok  ' if not bad else 'FAIL'} {p.name:<16} "
          f"{len(x)/rate:5.2f}s  peak {db(peak):6.1f}  rms {db(rms):6.1f} dBFS")
    for b in bad:
        print(f"       - {b}")
    return bad


def main() -> None:
    d = Path(sys.argv[1] if len(sys.argv) > 1 else "public/audio")
    files = sorted(d.glob("*.wav"))
    if not files:
        raise SystemExit(f"no wav files in {d} — run scripts/make_audio.py first")

    failures = sum(len(check(p)) for p in files)

    # The point of a bed is that accents sit above it. If that gap closes, the
    # mix reads as mush however clean each file is on its own.
    beds = [read(d / n)[0] for n in LOOPS if (d / n).exists()]
    hits = [read(p)[0] for p in files if p.name not in LOOPS]
    if beds and hits:
        gap = db(max(np.max(np.abs(h)) for h in hits)) - db(max(np.max(np.abs(b)) for b in beds))
        print(f"\naccent sits {gap:.1f} dB above the bed", end="")
        if gap < 6:
            print(" — too close, accents will not read")
            failures += 1
        else:
            print(" (want 6 dB or more)")

    print(f"{len(files)} files checked, {failures} problem(s)")
    print("\nNumbers only. Nobody has heard these — listen before publishing.")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
