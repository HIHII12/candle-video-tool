#!/usr/bin/env python3
"""Create one enhanced Piper preview with the production vocal chain."""
import argparse
import wave
from pathlib import Path
from make_showcase_voice import VOICES, VENDOR, enhance, peak_normalize, piper_exe, synthesize

parser = argparse.ArgumentParser()
parser.add_argument('--locale', choices=('vi', 'en'), default='vi')
parser.add_argument('--text', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--pace', type=float, default=.94)
parser.add_argument('--gain-db', type=float, default=3)
parser.add_argument('--clarity', type=float, default=.72)
args = parser.parse_args()
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
model = VENDOR / f"{VOICES[args.locale]}.onnx"
rate, samples = synthesize(piper_exe(), model, args.text, output, args.pace)
samples = peak_normalize(enhance(samples, rate, args.clarity, args.gain_db))
with wave.open(str(output), 'wb') as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(samples.tobytes())
print(output)
