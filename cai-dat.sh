#!/usr/bin/env bash
# Cai dat toan bo tool tren macOS / Linux.
set -e
cd "$(dirname "$0")"
python3 cai-dat.py "$@"
