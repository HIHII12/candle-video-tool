#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node    >/dev/null || { echo "Cần Node.js 18+ : https://nodejs.org"; exit 1; }
command -v python3 >/dev/null || { echo "Cần Python 3    : https://python.org"; exit 1; }
[ -d video-engine/node_modules ] || (cd video-engine && npm install)
node tool/batch.mjs --count 30 --workers 2
