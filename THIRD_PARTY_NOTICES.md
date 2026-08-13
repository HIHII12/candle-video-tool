# Third-party notices

This project keeps downloaded runtimes and voice models outside Git. The case-001
QA report records exactly which assets were used.

## Remotion

- Project: <https://github.com/remotion-dev/remotion>
- Version: 4.0.509
- License: Remotion License (commercial video creation permitted under the
  applicable free-license company-size conditions; verify before redistribution).

## node-qrcode

- Project: <https://github.com/soldair/node-qrcode>
- Package: `qrcode` 1.5.4
- License: MIT
- Use: vector QR generation for `https://zalo.me/g/vuqtnr406`.

## Piper runtime

- Runtime source: <https://github.com/rhasspy/piper/releases/tag/2023.11.14-2>
- License: MIT for this archived runtime release. The runtime is downloaded
  locally by `scripts/setup_voice.py` and is not committed or redistributed.

## Vietnamese Piper voice

- Voice: `vi_VN-vais1000-medium`
- Model card: <https://huggingface.co/rhasspy/piper-voices/blob/main/vi/vi_VN/vais1000/medium/MODEL_CARD>
- Dataset license: CC BY 4.0
- Attribution: VAIS-1000 Vietnamese speech synthesis corpus contributors.

## English Piper voice

- Voice: `en_US-norman-medium`
- Model card: <https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/norman/medium/MODEL_CARD>
- Dataset license: Public domain (LibriVox recordings), as stated by the model card.

## Fonts

- Inter and Archivo Black font assets already included by the original tool.
- License notes remain in `video-engine/public/fonts/README.md`.

## Original audio assets

The soundtrack and cue WAV files under `video-engine/public/audio` were generated
by the original tool's deterministic `scripts/make_audio.py`; no third-party music
recording was added for case-001.
