#!/usr/bin/env python3
"""Chia mot thu muc video thanh cac file zip vua nguong gui file.

Vi sao can: cho gui file gioi han 30 MiB moi file, con mot me 100 video thi
nang gan 400 MB. Chia tay thi de sot; chia bang zip -s thi phai co du moi
manh moi mo duoc — hong mot manh la mat ca me. O day moi zip la mot zip HOAN
CHINH, mo rieng duoc, nen thieu mot goi thi chi thieu dung nhung video trong
goi do.

    python3 tool/dong-goi.py video-engine/out/batch/2026-09-10 ~/giao-hang \\
        --loc en-quiz --ten quiz-global
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

CAP = 29 * 1024 * 1024  # chua 1 MiB cho phan dau zip


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--loc", default="", help="chi lay file co chuoi nay trong ten")
    ap.add_argument("--ten", default="goi", help="ten goi")
    ap.add_argument("--da-gui", default="", help="file liet ke ten video da gui roi, moi dong mot ten")
    a = ap.parse_args()

    src, dst = Path(a.src), Path(a.dst)
    dst.mkdir(parents=True, exist_ok=True)
    # Nhung video da gui dot truoc thi khong gui lai: gui trung thi nguoi nhan
    # phai tu ngoi loc, ma loc 100 file thi de sot hon la khong loc.
    sent = set()
    if a.da_gui and Path(a.da_gui).exists():
        sent = {l.strip() for l in Path(a.da_gui).read_text().splitlines() if l.strip()}
    vids = sorted(p for p in src.glob("*.mp4") if a.loc in p.name and p.name not in sent)
    if not vids:
        print(f"khong co video nao khop '{a.loc}' trong {src}")
        return 1

    goi, cur, size = [], [], 0
    for v in vids:
        # Moi video di kem file .txt tieu de/mo ta cua no; tach hai cai ra hai
        # goi khac nhau la cach chac chan de sau nay khong biet cai nao cua cai
        # nao.
        note = v.with_suffix(".txt")
        w = v.stat().st_size + (note.stat().st_size if note.exists() else 0)
        if cur and size + w > CAP:
            goi.append(cur)
            cur, size = [], 0
        cur.append(v)
        size += w
    if cur:
        goi.append(cur)

    for i, batch in enumerate(goi, 1):
        out = dst / f"{a.ten}-{i:02d}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as z:
            for v in batch:
                z.write(v, v.name)
                note = v.with_suffix(".txt")
                if note.exists():
                    z.write(note, note.name)
        mb = out.stat().st_size / 1024 / 1024
        print(f"{out.name}  {len(batch)} video  {mb:.1f} MB")
    if a.da_gui:
        with open(a.da_gui, "a") as fh:
            for v in vids:
                fh.write(v.name + "\n")
    print(f"tong {len(vids)} video trong {len(goi)} goi")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
