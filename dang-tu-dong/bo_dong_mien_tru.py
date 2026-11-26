#!/usr/bin/env python3
"""Bo doan mien tru ra khoi cot mo_ta cua bang hang doi.

Doan do giong het nhau o ca 200 dong. De trong bang thi phai mang no qua moi
lan sao chep; go thang vao o Description cua module YouTube trong Make thi no
luon co mat va bang nhe di mot phan tu (91 KB -> 72 KB).

    python3 dang-tu-dong/bo_dong_mien_tru.py /root/giao-hang/hang-doi-VIET.csv
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

MIEN_TRU = {
    "Educational content only. Constructed examples where stated. Not investment advice.",
    "Chỉ mang tính giáo dục. Ví dụ dựng lại ở những chỗ đã ghi rõ. Không phải lời khuyên đầu tư.",
}


def main() -> int:
    for duong in sys.argv[1:]:
        p = Path(duong)
        rows = list(csv.DictReader(p.open(encoding="utf-8-sig")))
        for r in rows:
            giu = [d for d in r["mo_ta"].split("\n") if d.strip() not in MIEN_TRU]
            # Bo mot dong giua doan de lai hai dong trong lien nhau — gop lai,
            # khong thi mo ta tren YouTube ho mot khoang trang giua bai.
            r["mo_ta"] = re.sub(r"\n{3,}", "\n\n", "\n".join(giu)).strip()
        ra = p.with_name(p.stem + "-gon.csv")
        with ra.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
        print(f"{ra.name}: {len(rows)} dong · {ra.stat().st_size} byte "
              f"(truoc {p.stat().st_size})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
