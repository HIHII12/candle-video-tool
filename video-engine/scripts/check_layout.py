#!/usr/bin/env python3
"""Find content that is cut off, crowding an edge, or hidden behind the platform UI.

Written because "nothing should be off-centre or cut off" cannot be checked by
looking at a frame or two: clipping happens on the frames nobody samples, on the
instruments nobody re-renders, and at the exact moment a label animates past the
edge. The market map's zone pills and its summary heading both shipped clipped.

Three checks, each corresponding to a way a frame goes wrong:

  bleed   ink in the outermost columns/rows. Something is running past the frame.
  safe    ink under the platform's own overlays. YouTube Shorts puts controls and
          the title over the bottom ~14% and the right edge; TikTok is worse.
          Content there is not cut off by us, it is covered by them.
  drift   the composition's ink is lopsided. A layout meant to be centred that
          sits 8% to one side reads as sloppy even when nothing is clipped.

Run it against a rendered file; it samples across the whole timeline, because a
still cannot show you the frame where a label swings out of frame.

    python3 scripts/check_layout.py out/v3-MarketMap.mp4
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

COMPOSITOR = Path(__file__).resolve().parents[1] / (
    "node_modules/@remotion/compositor-linux-x64-gnu"
)

# Fraction of the frame each platform's own UI covers. Numbers are deliberately
# conservative: being wrong here means moving a caption 30px, being wrong the
# other way means the caption is unreadable on every phone.
SAFE = {"bottom": 0.14, "right": 0.10, "top": 0.06}


def frame_at(video: Path, seconds: float) -> np.ndarray:
    out = Path("/tmp/_layout.png")
    subprocess.run(
        [str(COMPOSITOR / "ffmpeg"), "-y", "-v", "error", "-ss", f"{seconds:.2f}",
         "-i", str(video), "-frames:v", "1", str(out)],
        env=dict(os.environ, LD_LIBRARY_PATH=str(COMPOSITOR)),
        check=True,
    )
    return np.asarray(Image.open(out).convert("RGB")).astype(np.int16)


def ink_mask(img: np.ndarray, threshold: int = 42) -> np.ndarray:
    """Pixels that differ from the frame's own background.

    The background is estimated *per row*, from the leftmost and rightmost
    columns, rather than once from the four corners. Every format paints a
    vertical gradient, so a single corner-derived background sits between the top
    and bottom shades and reports the whole frame as ink — which it did, flagging
    all four edges of the quiz as clipped when nothing was wrong. Measuring each
    row against its own background makes the check work on gradients.
    """
    strip = np.concatenate([img[:, :12], img[:, -12:]], axis=1)
    bg = np.median(strip, axis=1, keepdims=True)  # (h, 1, 3)
    return np.abs(img - bg).sum(axis=2) > threshold


# Small print is drawn deliberately low-contrast; anything the viewer is meant
# to read is drawn bright. Measured across the formats, the gap is wide and
# clean: the disclaimer line peaks around 180 on this scale and the dimmest body
# text sits above 600. See src/safeArea.ts — a disclaimer is required to be
# present, not to be prominent, so it is allowed below the line and everything
# else is not. Without this split the safe-area check fired on every frame of
# every format because of that one legal line, and 1400 warnings that are all
# the same accepted thing is the same as no check at all.
READABLE = 200


def check_frame(img: np.ndarray, t: float) -> list[str]:
    h, w = img.shape[:2]
    ink = ink_mask(img)
    total = int(ink.sum())
    if total < 500:
        return []  # essentially empty frame, nothing to judge

    out = []
    edge = max(2, w // 270)  # ~4px at 1080 wide

    # Bleed, top and bottom only.
    #
    # Left and right are deliberately not checked: every format draws a chart
    # that spans the full width, and price levels are *supposed* to run edge to
    # edge, so flagging them produced noise on every frame and buried the real
    # findings. Nothing is meant to touch the top or bottom, so those still count.
    for name, band, span in (("top", ink[:edge, :], w), ("bottom", ink[-edge:, :], w)):
        px = int(band.sum())
        if px > span * 0.06:
            out.append(f"{t:5.1f}s  content touches the {name} edge ({px}px)")

    # safe area: readable ink under where the platform draws its own UI
    read = ink_mask(img, READABLE)
    read_total = max(1, int(read.sum()))
    b = int(h * (1 - SAFE["bottom"]))
    r = int(w * (1 - SAFE["right"]))
    bottom_ink = int(read[b:, :].sum())
    total = read_total
    if bottom_ink > total * 0.04:
        out.append(
            f"{t:5.1f}s  {100*bottom_ink/total:.0f}% of content sits in the bottom "
            f"{SAFE['bottom']:.0%} — under the platform's caption and controls"
        )
    right_ink = int(read[:b, r:].sum())
    if right_ink > total * 0.06:
        out.append(
            f"{t:5.1f}s  {100*right_ink/total:.0f}% of content sits in the right "
            f"{SAFE['right']:.0%} — under the action buttons"
        )

    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--samples", type=int, default=14)
    ap.add_argument("--duration", type=float, default=34.9)
    args = ap.parse_args()

    video = Path(args.video)
    problems: list[str] = []
    centres = []

    for i in range(args.samples):
        t = args.duration * i / (args.samples - 1)
        img = frame_at(video, t)
        problems += check_frame(img, t)

        ink = ink_mask(img)
        if ink.sum() > 500:
            xs = np.nonzero(ink.any(axis=0))[0]
            centres.append((xs.mean() / img.shape[1] - 0.5) * 100)

    # drift is a property of the whole video, not one frame
    if centres:
        drift = float(np.mean(centres))
        print(f"horizontal balance: ink centred {drift:+.1f}% from the middle")
        if abs(drift) > 8:
            problems.append(
                f"       composition sits {abs(drift):.0f}% "
                f"{'right' if drift > 0 else 'left'} of centre across the video"
            )

    print(f"{video.name}: {args.samples} frames sampled\n")
    for p in problems:
        print(f"  - {p}")
    print(f"\n{len(problems)} layout problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
