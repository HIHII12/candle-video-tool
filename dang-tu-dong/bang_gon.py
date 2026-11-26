#!/usr/bin/env python3
"""Rut bang hang doi xuong con nhung cot THAT SU khac nhau tung dong.

Bang cu co 8 cot. Bon trong so do giong het nhau o ca 100 dong cua mot kenh:
kenh · loai · hashtag · dong khoa SEO · dong mien tru. Nhung thu giong nhau
khong thuoc ve bang — chung thuoc ve o Description cua module YouTube trong
Make, go MOT lan. Loi ich that:

  · doi hashtag cho ca 100 video = sua mot o, khong phai sua 100 dong
  · bang nhe di mot nua, Sheets mo nhanh hon tren dien thoai
  · it cot thi it cho map sai trong Make

Con lai dung bon cot: ten file, tieu de, mo ta, trang thai (+ o trong de dan
link YouTube sau).

    python3 dang-tu-dong/bang_gon.py /root/giao-hang/hang-doi-VIET.csv
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

BO_DI = (
    "Educational content only. Constructed examples where stated. Not investment advice.",
    "Chỉ mang tính giáo dục. Ví dụ dựng lại ở những chỗ đã ghi rõ. Không phải lời khuyên đầu tư.",
    "XAUUSD · vàng · price action · đọc nến — Van Thang Trading",
    "XAUUSD · gold · price action · candlestick reading — GoldFather FX",
)
COT = ["ten_file", "tieu_de", "mo_ta", "trang_thai", "link_youtube"]


def main() -> int:
    for duong in sys.argv[1:]:
        p = Path(duong)
        rows = list(csv.DictReader(p.open(encoding="utf-8-sig")))
        ra_rows = []
        for r in rows:
            giu = [d for d in r["mo_ta"].split("\n") if d.strip() not in BO_DI]
            mo = re.sub(r"\n{3,}", "\n\n", "\n".join(giu)).strip()
            ra_rows.append({
                "ten_file": r["ten_file"],
                "tieu_de": r["tieu_de"],
                "mo_ta": mo,
                "trang_thai": r.get("trang_thai", "cho"),
                "link_youtube": "",
            })
        ra = p.with_name(p.stem.replace("hang-doi-", "BANG-") + ".csv")
        with ra.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=COT)
            w.writeheader(); w.writerows(ra_rows)
        print(f"{ra.name}: {len(ra_rows)} dong · {ra.stat().st_size} byte "
              f"(bang 8 cot cu: {p.stat().st_size})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
