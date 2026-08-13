#!/usr/bin/env python3
"""Fetch the offline speech engine. Run once per machine.

Kept out of the shipped package on purpose, for two reasons. Piper is GPL, and
redistributing a GPL binary inside our zip drags obligations onto the whole
package that downloading it at setup time avoids entirely. And the download is
~90 MB, which would make the package fifteen times larger for every user who
never turns narration on.

Piper rather than Kokoro, despite Kokoro scoring higher: Kokoro needs espeak-ng
installed separately — on Windows that is a second .msi and two environment
variables — and this tool's promise is "install Node and Python, then
double-click". Piper embeds espeak-ng in a single self-contained binary, so
setup stays one command. Quality is a little behind; a working pipeline is worth
more than a better voice nobody can install.

    python3 scripts/setup_voice.py
    python3 scripts/setup_voice.py --voice en_US-ryan-high
"""

import argparse
import platform
import shutil
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor" / "piper"

PIPER = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_{}.{}"
VOICES = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/{name}/{q}/{file}"

BUILDS = {
    ("Linux", "x86_64"): ("linux_x86_64", "tar.gz"),
    ("Linux", "aarch64"): ("linux_aarch64", "tar.gz"),
    ("Darwin", "x86_64"): ("macos_x64", "tar.gz"),
    ("Darwin", "arm64"): ("macos_aarch64", "tar.gz"),
    ("Windows", "AMD64"): ("windows_amd64", "zip"),
}


def fetch(url: str, dest: Path) -> None:
    print(f"  {url.rsplit('/', 1)[-1]} ...", end="", flush=True)
    with urllib.request.urlopen(url, timeout=180) as r, dest.open("wb") as f:
        shutil.copyfileobj(r, f)
    print(f" {dest.stat().st_size / 1e6:.0f} MB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="en_US-amy-medium",
                    help="piper voice id, e.g. en_US-amy-medium or en_US-ryan-high")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    key = (platform.system(), platform.machine())
    if key not in BUILDS:
        raise SystemExit(
            f"No Piper build listed for {key[0]} {key[1]}.\n"
            "See https://github.com/rhasspy/piper/releases and place the binary "
            f"in {VENDOR} by hand."
        )
    build, ext = BUILDS[key]

    VENDOR.mkdir(parents=True, exist_ok=True)
    exe = VENDOR / ("piper.exe" if key[0] == "Windows" else "piper")

    if exe.exists() and not args.force:
        print(f"engine already present at {exe}")
    else:
        print("engine:")
        archive = VENDOR / f"piper.{ext}"
        fetch(PIPER.format(build, ext), archive)
        if ext == "zip":
            with zipfile.ZipFile(archive) as z:
                z.extractall(VENDOR)
        else:
            with tarfile.open(archive) as t:
                t.extractall(VENDOR)
        archive.unlink()
        # The archive contains a piper/ directory; flatten it so the path this
        # script prints is the path that actually works.
        inner = VENDOR / "piper"
        if inner.is_dir():
            for p in inner.iterdir():
                shutil.move(str(p), VENDOR / p.name)
            inner.rmdir()
        if not key[0] == "Windows":
            exe.chmod(0o755)

    # voice
    _, name, quality = args.voice.split("-", 2)
    model = VENDOR / f"{args.voice}.onnx"
    if model.exists() and not args.force:
        print(f"voice already present at {model.name}")
    else:
        print("voice:")
        fetch(VOICES.format(name=name, q=quality, file=f"{args.voice}.onnx"), model)
        fetch(VOICES.format(name=name, q=quality, file=f"{args.voice}.onnx.json"),
              VENDOR / f"{args.voice}.onnx.json")

    total = sum(p.stat().st_size for p in VENDOR.rglob("*") if p.is_file()) / 1e6
    print(f"\nready — {total:.0f} MB in {VENDOR}")
    print("Narration is now available. It stays off unless a render asks for it.")


if __name__ == "__main__":
    main()
