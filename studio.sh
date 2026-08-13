#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/video-engine"
[ -d node_modules ] || npm install
npx remotion studio
