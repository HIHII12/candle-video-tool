#!/usr/bin/env python3
"""Cat nen gia ra khoi file logo, de no dat len video khong bi vien.

Vi sao can: file logo tai ve thuong da bi "nuong" san cai nen ca-ro xam-trang
mo phong trong suot. Tren nen trang thi khong ai thay. Tren video nen toi thi
no thanh mot o vuong sang bao quanh logo tron — nhin la biet dan anh vao.

Cach lam: do mau nen tu bon goc, xoa moi diem giong nen do, roi vi hau het
logo la hinh tron nen cat them bang mot mat na tron mem 1px cho khong ram via.

    python3 scripts/lam_sach_logo.py public/brand/logo-moi.png
    python3 scripts/lam_sach_logo.py anh-gui.png --out public/brand/van-thang.png
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def clean(src: Path, dst: Path, tolerance: int, circle: bool) -> str:
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(np.int16)
    h, w = a.shape[:2]

    # Background is read from the corners, not assumed to be white: a checker
    # pattern has two shades and both have to go.
    box = 24
    corners = np.concatenate([
        a[:box, :box, :3].reshape(-1, 3), a[:box, -box:, :3].reshape(-1, 3),
        a[-box:, :box, :3].reshape(-1, 3), a[-box:, -box:, :3].reshape(-1, 3),
    ])
    shades = np.unique(corners.reshape(-1, 3), axis=0)
    # A checker has a handful of shades; a photo corner has hundreds. If the
    # corners are busy, this file has no flat background to remove.
    if len(shades) > 400:
        return "goc anh khong phai nen phang — khong cat gi ca"

    alpha = np.full((h, w), 255, dtype=np.uint8)
    for shade in shades:
        near = np.abs(a[:, :, :3] - shade).max(axis=2) <= tolerance
        alpha[near] = 0

    if circle:
        # Radius from the content that survived, so a logo that does not fill
        # its own canvas is not clipped.
        ys, xs = np.where(alpha > 0)
        if len(xs) == 0:
            return "khong con diem nao sau khi cat — kiem lai --tolerance"
        cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
        r = max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 + 1
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
        # One pixel of feather, so the rim is not stair-stepped.
        soft = np.clip((r - d) + 0.5, 0, 1)
        alpha = (alpha * soft).astype(np.uint8)

    out = np.dstack([a[:, :, :3].astype(np.uint8), alpha])
    Image.fromarray(out, "RGBA").save(dst)
    kept = int((alpha > 0).sum())
    return f"giu {kept * 100 // (h * w)}% diem anh -> {dst}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="")
    ap.add_argument("--tolerance", type=int, default=14)
    ap.add_argument("--no-circle", action="store_true",
                    help="logo khong phai hinh tron")
    a = ap.parse_args()

    src = Path(a.src)
    if not src.exists():
        print(f"khong thay file {src}", file=sys.stderr)
        return 2
    dst = Path(a.out) if a.out else src.with_name(src.stem + "-sach.png")
    print(clean(src, dst, a.tolerance, not a.no_circle))
    return 0


if __name__ == "__main__":
    sys.exit(main())
