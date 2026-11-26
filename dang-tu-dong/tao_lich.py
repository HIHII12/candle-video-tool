#!/usr/bin/env python3
"""Bien mot thu muc video da render thanh hang doi cho n8n dang dan.

Vi sao mot file JSON moi video, khong phai mot bang CSV chung:

    n8n chay nhieu nhanh cung luc va may co the tat giua chung. Sua chung mot
    file CSV thi hai nhanh ghi de len nhau, con tat may giua luc ghi thi mat
    ca bang. Doi cho mot file thi khong bao gio hong: hoac no o hang-doi, hoac
    no o da-dang, khong co trang thai lung chung.

    lich/
      hang-doi/   cho toi luot
      da-dang/    n8n chuyen sang day sau khi dang xong
      loi/        that bai, xem lai roi keo nguoc lai hang-doi

    python3 dang-tu-dong/tao_lich.py video-engine/out/batch/2026-09-10 --kenh gf
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent
LICH = GOC / "lich"


def doc_note(txt: Path) -> dict:
    """Doc file .txt ma upload-kit da viet ben canh moi video."""
    if not txt.exists():
        return {}
    khoi, khoa = {}, None
    for dong in txt.read_text(encoding="utf-8").splitlines():
        d = dong.strip()
        # Cac nhan nay do upload-kit.mjs sinh ra, ca hai thu tieng.
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
    ap.add_argument("nguon", help="thu muc chua .mp4 va .txt")
    ap.add_argument("--kenh", required=True, choices=["gf", "vt"],
                    help="gf = GoldFather FX (English) | vt = Van Thang Trading (tieng Viet)")
    ap.add_argument("--loc", default="", help="chi lay file co chuoi nay trong ten")
    a = ap.parse_args()

    nguon = Path(a.nguon)
    for thu_muc in ("hang-doi", "da-dang", "loi"):
        (LICH / thu_muc).mkdir(parents=True, exist_ok=True)

    # Da nam trong hang doi hoac da dang roi thi khong xep lai. Xep trung mot
    # video la dang hai lan cung mot bai len cung mot kenh.
    da_co = {p.stem for tm in ("hang-doi", "da-dang") for p in (LICH / tm).glob("*.json")}

    them = 0
    for mp4 in sorted(nguon.glob("*.mp4")):
        if a.loc and a.loc not in mp4.name:
            continue
        ma = f"{a.kenh}-{mp4.stem}"
        if ma in da_co:
            continue
        note = doc_note(mp4.with_suffix(".txt"))
        (LICH / "hang-doi" / f"{ma}.json").write_text(json.dumps({
            "ma": ma,
            "kenh": a.kenh,
            "duong_dan": str(mp4.resolve()),
            "tieu_de": note.get("tieu_de", mp4.stem.replace("-", " ")),
            "mo_ta": note.get("mo_ta", ""),
            "hashtag": note.get("hashtag", ""),
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        them += 1

    cho = len(list((LICH / "hang-doi").glob(f"{a.kenh}-*.json")))
    print(f"them {them} video vao hang doi · kenh {a.kenh} dang cho {cho} bai")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
