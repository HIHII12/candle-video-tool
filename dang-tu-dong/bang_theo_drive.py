#!/usr/bin/env python3
"""Bang hang doi dung DUNG ten file dang nam tren Google Drive.

Hai thu muc Drive cua anh (tao 3/9) chua lo 2026-09-06 (viet) va 2026-09-10
(global). Ten file o do la kieu cu (vi-nen-*, vi-sosanh-*, en-quiz-*), KHAC
voi ten trong hang-doi-SACH.csv (candle-*, vi-candle-*). Make do tim file
tren Drive theo TEN, nen bang phai theo ten Drive, khong phai ten o dia nha.
"""
import csv, re, sys
from pathlib import Path

GOC = Path("/home/user/candle-video-tool")
BATCH = GOC / "video-engine" / "out" / "batch"
LO = {"Van Thang Invest": "2026-09-06", "GoldFather FX": "2026-09-10"}

def doc_note(txt):
    if not txt.exists():
        return {}
    khoi, khoa = {}, None
    for dong in txt.read_text(encoding="utf-8", errors="ignore").splitlines():
        d = dong.strip()
        if re.match(r"^(TITLE|TIÊU ĐỀ):$", d): khoa = "tieu_de"; khoi[khoa] = []
        elif re.match(r"^(DESCRIPTION|MÔ TẢ):$", d): khoa = "mo_ta"; khoi[khoa] = []
        elif re.match(r"^(HASHTAGS|HASHTAG):$", d): khoa = "hashtag"; khoi[khoa] = []
        elif re.match(r"^(FILE):", d): khoa = None
        elif khoa is not None: khoi[khoa].append(dong.rstrip())
    return {k: "\n".join(v).strip() for k, v in khoi.items()}

def loai(ten):
    if "-sosanh-" in ten or "-quiz-vs-" in ten: return "so-sanh"
    if "-quiz-" in ten: return "quiz"
    return "giai-phau-nen"

dong = []
thieu = []
for kenh, lo in LO.items():
    for mp4 in sorted((BATCH / lo).glob("*.mp4")):
        n = doc_note(mp4.with_suffix(".txt"))
        if not n.get("tieu_de"):
            thieu.append(mp4.name); continue
        dong.append({
            "ten_file": mp4.name,
            "kenh": kenh,
            "loai": loai(mp4.name),
            "tieu_de": n["tieu_de"],
            "mo_ta": n.get("mo_ta", ""),
            "hashtag": n.get("hashtag", ""),
            "trang_thai": "cho",
            "link_youtube": "",
        })

# Xen ke hai kenh: Make loc theo cot kenh, nhung xen ke thi nhin bang de doi chieu.
viet = [d for d in dong if d["kenh"] == "Van Thang Invest"]
glob_ = [d for d in dong if d["kenh"] == "GoldFather FX"]
xen = []
for i in range(max(len(viet), len(glob_))):
    if i < len(viet): xen.append(viet[i])
    if i < len(glob_): xen.append(glob_[i])

ra = Path("/root/giao-hang/hang-doi-DRIVE.csv")
with ra.open("w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(xen[0].keys()))
    w.writeheader(); w.writerows(xen)

print(f"{len(xen)} dong -> {ra}")
print(f"  Van Thang Invest {len(viet)} · GoldFather FX {len(glob_)}")
print(f"  thieu tieu de (bo qua): {len(thieu)}")
print(f"  kich thuoc: {ra.stat().st_size} byte")
