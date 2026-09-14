#!/usr/bin/env bash
# Dong goi tool thanh mot file .zip de gui / chep sang may khac.
#
# KHONG kem: node_modules, vendor (giong doc), out/ (video da render).
# Nhung thu do may dich tu tai bang CAI-DAT.bat — kem theo thi goi nang gap
# muoi lan va van co the sai kien truc CPU.
set -e
cd "$(dirname "$0")"
OUT="${1:-xau-lab-studio.zip}"
rm -f "$OUT"
git ls-files -z | xargs -0 zip -q -X "$OUT"
echo "$OUT  $(du -h "$OUT" | cut -f1)"
echo "Chep sang may moi -> giai nen -> nhay dup CAI-DAT.bat"
