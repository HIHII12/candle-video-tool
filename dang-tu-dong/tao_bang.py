#!/usr/bin/env python3
"""Sinh bang CSV de dan vao Google Sheets — hang doi cho Make.

Vi sao la bang chu khong phai thu muc: Make chay tren may chu cua ho, no khong
doc duoc o cung nha minh. Video phai len Google Drive truoc. Ma tren Drive thi
tieu de va mo ta khong the nam trong file .txt ben canh — Make doc mot o trong
bang de hon nhieu so voi mo mot file text roi tach chu.

Mot dong = mot video. Cot "trang_thai" la thu Make sua sau khi dang xong, nen
chay lai bao nhieu lan cung khong dang trung.

    python3 dang-tu-dong/tao_bang.py
    python3 dang-tu-dong/tao_bang.py --loc quiz --ra /tmp/quiz.csv
"""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent
DA_PHAN_LOAI = Path.home() / "giao-hang" / "da-phan-loai"


def doc_note(txt: Path) -> dict:
    if not txt.exists():
        return {}
    khoi, khoa = {}, None
    for dong in txt.read_text(encoding="utf-8", errors="ignore").splitlines():
        d = dong.strip()
        if re.match(r"^(TITLE|TIÊU ĐỀ):$", d):
            khoa = "tieu_de"; khoi[khoa] = []
        elif re.match(r"^(DESCRIPTION|MÔ TẢ):$", d):
            khoa = "mo_ta"; khoi[khoa] = []
        elif re.match(r"^(HASHTAGS|HASHTAG):$", d):
            khoa = "hashtag"; khoi[khoa] = []
        elif re.match(r"^(FILE):", d):
            khoa = None
        elif khoa:
            khoi[khoa].append(dong.rstrip())
    return {k: "\n".join(v).strip() for k, v in khoi.items()}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nguon", default=str(DA_PHAN_LOAI))
    ap.add_argument("--loc", default="", help="chi lay thu muc loai co chuoi nay")
    ap.add_argument("--ra", default=str(Path.home() / "giao-hang" / "hang-doi-make.csv"))
    a = ap.parse_args()

    nguon = Path(a.nguon)
    if not nguon.exists():
        print(f"chua co {nguon} — chay  python3 dang-tu-dong/sap_xep.py  truoc")
        return 1

    dong = []
    thieu_note = 0
    for tieng_dir in sorted(nguon.iterdir()):
        if not tieng_dir.is_dir():
            continue
        for loai_dir in sorted(tieng_dir.iterdir()):
            if not loai_dir.is_dir() or (a.loc and a.loc not in loai_dir.name):
                continue
            for mp4 in sorted(loai_dir.glob("*.mp4")):
                note = doc_note(mp4.with_suffix(".txt"))
                if not note.get("tieu_de"):
                    thieu_note += 1
                dong.append({
                    "ten_file": mp4.name,
                    "kenh": "GoldFather FX" if tieng_dir.name == "global" else "Van Thang Invest",
                    "loai": loai_dir.name,
                    "tieu_de": note.get("tieu_de", ""),
                    "mo_ta": note.get("mo_ta", ""),
                    "hashtag": note.get("hashtag", ""),
                    "trang_thai": "cho",
                    "link_youtube": "",
                })

    ra = Path(a.ra)
    ra.parent.mkdir(parents=True, exist_ok=True)
    with ra.open("w", newline="", encoding="utf-8-sig") as f:
        # utf-8-sig: Google Sheets va Excel doc dau tieng Viet dung nho dau BOM.
        # Thieu no thi "Tiêu đề" thanh "TiÃªu Ä‘á»", va khong ai sua tay noi
        # sau tram dong.
        w = csv.DictWriter(f, fieldnames=list(dong[0].keys()) if dong else [])
        w.writeheader()
        w.writerows(dong)

    print(f"{len(dong)} dong -> {ra}")
    if thieu_note:
        print(f"  ⚠ {thieu_note} video CHUA CO tieu de — phai viet tay truoc khi dang")
    theo_loai: dict[str, int] = {}
    for d in dong:
        theo_loai[d["loai"]] = theo_loai.get(d["loai"], 0) + 1
    for k in sorted(theo_loai, key=lambda x: -theo_loai[x]):
        print(f"  {theo_loai[k]:4d}  {k}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
