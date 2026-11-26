#!/usr/bin/env python3
"""Cai dat toan bo tool bang MOT lenh — va nang cap cung bang lenh do.

    python3 cai-dat.py              # cai lan dau
    python3 cai-dat.py --nang-cap   # keo ban moi tu git roi cai lai
    python3 cai-dat.py --giong      # cai them giong doc (Piper + Hugging Face)
    python3 cai-dat.py --kiem       # chi kiem tra may da du do chua

Vi sao co file nay: truoc do de chay duoc tool phai lam sau viec bang tay theo
dung thu tu (node, npm ci, pip, trinh duyet cua Remotion, ffmpeg, Piper, giong
noi), va bo sot mot viec thi loi bao ra khong he chi ra thieu cai gi. Mot lenh
lam het, va cai gi hong thi noi ro cach chua.

Nguon tai:
  - ma nguon  : git (github.com)
  - thu vien  : npm registry + PyPI
  - trinh duyet: Remotion tu tai Chromium
  - giong noi : ban chay Piper tu GitHub Releases, mo hinh giong tu Hugging Face
                (rhasspy/piper-voices) — xem scripts/setup_voice.py
"""

from __future__ import annotations

import argparse
import platform
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENGINE = ROOT / "video-engine"
PY = sys.executable or "python3"

# Ca hai track deu can giong rieng. Tieng Viet la vais1000 — giong duy nhat
# tren rhasspy/piper-voices doc duoc dau tieng Viet o muc "medium".
VOICES = {"vi": "vi_VN-vais1000-medium", "en": "en_US-norman-medium"}

OK, FAIL, WARN = "  [ok]  ", "  [LOI] ", "  [!]   "


def run(cmd: list[str], cwd: Path | None = None, quiet: bool = True) -> tuple[bool, str]:
    try:
        p = subprocess.run(
            cmd, cwd=cwd, capture_output=quiet, text=True,
            shell=(platform.system() == "Windows"),
        )
    except FileNotFoundError:
        return False, f"khong tim thay lenh: {cmd[0]}"
    if p.returncode != 0:
        # Dong cuoi cua stderr thuong la "Node.js v22.x" — vo nghia. Uu tien
        # dong dau tien co chu Error/LOI, do moi la cai noi ra van de.
        lines = [l.strip() for l in (p.stderr or p.stdout or "").splitlines() if l.strip()]
        hit = next((l for l in lines if "error" in l.lower()), None)
        return False, hit or (lines[-1] if lines else "(khong co thong bao)")
    return True, ""


def step(name: str) -> None:
    print(f"\n>> {name}")


# --- tung buoc --------------------------------------------------------------

def kiem_may() -> list[str]:
    """Nhung thu may PHAI co san. Thieu thi noi ro tai o dau."""
    step("Kiem tra may")
    thieu = []
    for cmd, url, ten in (
        ("node", "https://nodejs.org (ban LTS)", "Node.js 18 tro len"),
        ("npm", "di kem Node.js", "npm"),
        ("git", "https://git-scm.com", "git"),
    ):
        if shutil.which(cmd):
            print(f"{OK}{ten}")
        else:
            print(f"{FAIL}{ten} — chua co. Tai o: {url}")
            thieu.append(ten)
    print(f"{OK}Python {platform.python_version()}")
    return thieu


def keo_git() -> None:
    step("Keo ban moi nhat tu git")
    if not (ROOT / ".git").exists():
        print(f"{WARN}Thu muc nay khong phai ban clone tu git — bo qua.")
        return
    ok, err = run(["git", "pull", "--ff-only"], cwd=ROOT)
    print(f"{OK}da cap nhat ma nguon" if ok
          else f"{WARN}khong keo duoc ({err}). Cai tiep voi ma nguon dang co.")


def cai_node() -> bool:
    step("Thu vien Node (npm)")
    # `npm ci` doi package-lock.json. Neu chua co lock thi `npm install`.
    cmd = ["npm", "ci"] if (ENGINE / "package-lock.json").exists() else ["npm", "install"]
    ok, err = run(cmd, cwd=ENGINE)
    print(f"{OK}xong" if ok else f"{FAIL}{err}")
    return ok


def cai_python() -> bool:
    step("Thu vien Python (PyPI)")
    ok, err = run([PY, "-m", "pip", "install", "-q", "-r", str(ROOT / "requirements.txt")])
    print(f"{OK}xong" if ok else f"{FAIL}{err}")
    # Goi phu: hong cung khong sao, chi mat mot phep kiem QR.
    ok2, _ = run([PY, "-m", "pip", "install", "-q",
                  "-r", str(ROOT / "requirements-optional.txt")])
    if not ok2:
        print(f"{WARN}goi phu (zxing-cpp) khong cai duoc — chi anh huong scripts/qa_showcase.py")
    return ok


def cai_trinh_duyet() -> bool:
    step("Trinh duyet cho Remotion")
    # Remotion tu tai Chromium ve thu muc cache cua no. Neu may da co san (vi du
    # Playwright da cai), dat bien REMOTION_BROWSER tro toi do la du.
    ok, err = run(["npx", "remotion", "browser", "ensure"], cwd=ENGINE)
    if ok:
        print(f"{OK}xong")
        return True
    print(f"{WARN}khong tai duoc ({err}).")
    print("        Neu may da co Chromium: dat bien moi truong REMOTION_BROWSER")
    print("        tro toi file chay cua no, roi chay lai lenh nay.")
    return False


def cai_giong(voices: list[str]) -> bool:
    step("Giong doc (Piper tu GitHub, mo hinh giong tu Hugging Face)")
    good = True
    for v in voices:
        ok, err = run([PY, str(ENGINE / "scripts" / "setup_voice.py"), "--voice", v],
                      cwd=ENGINE)
        print(f"{OK}{v}" if ok else f"{WARN}{v} — {err}")
        good = good and ok
    if not good:
        print("        Giong doc la tuy chon: khong co no video van render binh thuong,")
        print("        chi la khong co loi doc.")
    return good


def kiem_cuoi() -> bool:
    """Render mot khung hinh that. Day la phep thu duy nhat dang tin."""
    step("Kiem tra cuoi — render thu mot khung hinh")
    out = ENGINE / "out" / "qa" / "_caidat.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    # REMOTION_BROWSER cho phep dung Chromium may da co san, thay vi de Remotion
    # tai ban rieng cua no — can thiet tren may bi chan mang ra ngoai.
    browser = os.environ.get("REMOTION_BROWSER", "")
    ok, err = run(["npx", "remotion", "still", "CandleLesson", str(out),
                   "--props=./src/data/lesson_hammer.json", "--frame=1200",
                   "--log=error",
                   *( [f"--browser-executable={browser}"] if browser else [] )], cwd=ENGINE)
    if ok and out.exists():
        print(f"{OK}render duoc — may da san sang. Anh xem thu: {out}")
        return True
    print(f"{FAIL}chua render duoc: {err}")
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nang-cap", action="store_true", help="keo ban moi tu git truoc khi cai")
    ap.add_argument("--giong", action="store_true", help="cai them giong doc")
    ap.add_argument("--khong-giong", action="store_true", help="bo qua giong doc")
    ap.add_argument("--kiem", action="store_true", help="chi kiem tra, khong cai gi")
    ap.add_argument("--track", default="vi,en", help="giong nao can cai: vi,en")
    a = ap.parse_args()

    print("=" * 62)
    print("  CAI DAT XAU LAB STUDIO")
    print("=" * 62)

    thieu = kiem_may()
    if thieu:
        print("\nDung lai: may con thieu " + ", ".join(thieu) + ".")
        print("Cai xong nhung cai do roi chay lai lenh nay.")
        return 1
    if a.kiem:
        return 0 if kiem_cuoi() else 1

    if a.nang_cap:
        keo_git()

    loi = []
    if not cai_node():
        loi.append("thu vien Node")
    if not cai_python():
        loi.append("thu vien Python")
    if not cai_trinh_duyet():
        loi.append("trinh duyet")

    if a.giong or (a.nang_cap and not a.khong_giong):
        want = [VOICES[t.strip()] for t in a.track.split(",") if t.strip() in VOICES]
        cai_giong(want)

    ok = kiem_cuoi()

    print("\n" + "=" * 62)
    if ok and not loi:
        print("  XONG. Chay thu:  node tool/batch.mjs --mix --count 5 --locale vi")
    elif ok:
        print("  Chay duoc, nhung con vuong: " + ", ".join(loi))
    else:
        print("  CHUA CHAY DUOC. Con vuong: " + ", ".join(loi or ["render thu that bai"]))
    print("=" * 62)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
