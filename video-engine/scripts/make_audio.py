#!/usr/bin/env python3
"""Synthesize the sound design, so the videos stop being silent.

Silence was the single loudest "made by a machine" signal left: 35 seconds of
nothing, while every video it competes with in a feed has at least a bed and a
few transients.

Why synthesize rather than download:

  * The render machine may have no internet, and a missing asset must never be
    able to break a batch.
  * Stock audio licences are a liability on a monetised channel. Maths has no
    licence.
  * Every cue can be tuned to the storyboard's exact frames instead of the
    edit being bent around a clip.

Design rules followed here:

  * The bed is a seamless loop, so its length is a whole number of beats and
    every frequency completes a whole number of cycles inside it. Otherwise the
    loop point clicks.
  * Nothing is loud. The bed sits near -26 dBFS and transients peak around
    -9 dBFS. Short-form audio gets normalised by the platform; what matters is
    the gap between bed and accent, not absolute level.
  * Transients get a hard attack and a short decay. A slow attack reads as a
    mistake rather than a hit.
  * Only consonant intervals, and one scale per bed, so 30 videos a day do not
    become 30 different keys fighting each other on a channel page.

Any file here can be replaced by hand with real licensed audio of the same name
and the render will use it — the renderer only cares about the filename.

    python3 scripts/make_audio.py
"""

import argparse
import wave
from pathlib import Path

import numpy as np

RATE = 44100


# --- primitives -------------------------------------------------------------

def t_of(seconds: float) -> np.ndarray:
    return np.arange(int(RATE * seconds)) / RATE


def sine(freq: float, dur: float, phase: float = 0.0) -> np.ndarray:
    return np.sin(2 * np.pi * freq * t_of(dur) + phase)


def env(dur: float, attack: float, decay: float, curve: float = 2.5) -> np.ndarray:
    """Percussive envelope: near-instant attack, exponential-ish decay."""
    n = int(RATE * dur)
    a = max(1, int(RATE * attack))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    d = max(1, int(RATE * decay))
    tail = np.linspace(0, 1, min(d, n - a))
    e[a : a + len(tail)] = (1 - tail) ** curve
    e[a + len(tail) :] = 0
    return e


def noise(dur: float, seed: int) -> np.ndarray:
    # Seeded so a rebuild produces byte-identical files; a batch that resumes
    # must not get a different-sounding half.
    return np.random.default_rng(seed).uniform(-1, 1, int(RATE * dur))


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """One-pole lowpass. Enough to turn white noise into air rather than hiss."""
    a = np.exp(-2 * np.pi * cutoff / RATE)
    out = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = a * acc + (1 - a) * v
        out[i] = acc
    return out


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - lowpass(x, cutoff)


def normalize(x: np.ndarray, peak_db: float) -> np.ndarray:
    peak = np.max(np.abs(x))
    if peak == 0:
        return x
    return x / peak * (10 ** (peak_db / 20))


def write(path: Path, x: np.ndarray) -> None:
    # Soft clip before quantising: a stray sample over 1.0 becomes an audible
    # tick once it wraps.
    x = np.tanh(x * 1.02)
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())
    kb = path.stat().st_size / 1024
    print(f"  {path.name:<18} {len(x)/RATE:5.2f}s  {kb:7.1f} KB")


# --- one-shots --------------------------------------------------------------

def tick() -> np.ndarray:
    """Countdown tick. A click with a pitched body so it reads as deliberate."""
    d = 0.09
    body = sine(1250, d) * env(d, 0.0005, 0.06, 3.0)
    click = highpass(noise(d, 1), 3000) * env(d, 0.0002, 0.012, 4.0)
    return normalize(body * 0.6 + click * 0.5, -10)


def thud() -> np.ndarray:
    """Impact for a beat landing. Pitch drops, which is what sells weight."""
    d = 0.42
    f = np.linspace(150, 48, int(RATE * d))
    sweep = np.sin(2 * np.pi * np.cumsum(f) / RATE)
    body = sweep * env(d, 0.001, 0.40, 2.2)
    knock = lowpass(noise(d, 2), 900) * env(d, 0.001, 0.09, 3.0)
    return normalize(body + knock * 0.35, -7)


def whoosh() -> np.ndarray:
    """Transition between beats: filtered noise swelling then away."""
    d = 0.5
    n = lowpass(noise(d, 3), 1400)
    swell = np.sin(np.linspace(0, np.pi, int(RATE * d))) ** 1.6
    # -9 rather than -14. Broadband noise with a slow swell has far lower RMS
    # than its peak suggests, so at -14 it measured barely 2 dB above the bed and
    # simply did not register as a transition.
    return normalize(n * swell, -9)


def riser(dur: float = 2.6) -> np.ndarray:
    """Tension before the reveal. Rising pitch plus rising noise."""
    n = int(RATE * dur)
    f = np.geomspace(220, 1500, n)
    tone = np.sin(2 * np.pi * np.cumsum(f) / RATE)
    air = highpass(noise(dur, 4), 1800)
    ramp = np.linspace(0, 1, n) ** 2.2
    # Ducks hard at the very end so the impact that follows has room.
    ramp[-int(RATE * 0.05) :] *= np.linspace(1, 0, int(RATE * 0.05))
    return normalize((tone * 0.45 + air * 0.55) * ramp, -12)


def stinger(up: bool) -> np.ndarray:
    """Outcome cue. A major triad rising for a win, minor falling for a loss."""
    root = 293.66  # D4
    steps = [0, 4, 7, 12] if up else [0, -3, -7, -12]
    d = 1.5
    out = np.zeros(int(RATE * d))
    for i, s in enumerate(steps):
        f = root * 2 ** (s / 12)
        start = int(RATE * 0.075 * i)
        note_d = d - start / RATE
        # Two partials: fundamental plus an octave, which reads as a mallet
        # rather than a synth beep.
        v = (sine(f, note_d) + 0.3 * sine(f * 2, note_d)) * env(note_d, 0.002, note_d * 0.85, 2.6)
        out[start : start + len(v)] += v * (0.9 - 0.12 * i)
    return normalize(out, -9)


# --- beds -------------------------------------------------------------------

def add_wrap(out: np.ndarray, start: int, v: np.ndarray) -> None:
    """Add `v` at `start`, wrapping anything past the end back to the beginning.

    This is what actually makes the loop seamless. A note or pulse near the end
    of the loop has a tail that belongs to the *next* repeat; truncating it
    leaves the waveform stepping to a different value at the seam, which ticks
    once per repeat. Wrapping puts that tail where it is heard anyway.
    """
    n = len(out)
    end = start + len(v)
    if end <= n:
        out[start:end] += v
    else:
        cut = n - start
        out[start:] += v[:cut]
        out[: end - n] += v[cut:]


def bed(dark: bool, bars: int = 4, bpm: float = 96.0) -> np.ndarray:
    """Seamless loop. Frequencies are snapped to whole cycles per loop.

    Three separate things have to line up at the seam, and each is handled
    differently: tones are snapped so they complete whole cycles, percussive
    tails are wrapped rather than cut, and the noise layer is filtered over a
    tiled buffer with the settled middle taken, because a one-pole filter has
    memory and would otherwise start and end in different states.
    """
    beats = bars * 4
    dur = beats * 60.0 / bpm
    n = int(RATE * dur)
    # Snap so each partial completes a whole number of cycles in the loop.
    snap = lambda f: max(1, round(f * dur)) / dur  # noqa: E731

    root = 55.0 if dark else 73.42  # A1 for the quiz, D2 for the lesson
    out = np.zeros(n)

    # Drone: root, fifth, and a quiet octave. Slow detune keeps it from
    # sounding like a held test tone.
    for mult, gain in ((1.0, 1.0), (1.5, 0.42), (2.0, 0.22)):
        f = snap(root * mult)
        drift = 1 + 0.0015 * np.sin(2 * np.pi * t_of(dur) / dur)
        out += gain * np.sin(2 * np.pi * f * t_of(dur) * drift)

    # Pulse on every beat, softer off the downbeat: gives a tempo to cut to.
    per_beat = n // beats
    pulse_d = 0.34
    for b in range(beats):
        gain = 1.0 if b % 4 == 0 else 0.42
        f = snap(root * (2 if dark else 4))
        v = sine(f, pulse_d) * env(pulse_d, 0.004, 0.28, 2.4)
        add_wrap(out, b * per_beat, v * gain * 0.5)

    if not dark:
        # Light bed also gets a pentatonic figure, so the lesson formats feel
        # instructional rather than ominous.
        scale = [0, 2, 4, 7, 9, 12]
        for i, step in enumerate([0, 3, 2, 4, 1, 3, 5, 2]):
            f = snap(root * 8 * 2 ** (scale[step] / 12))
            v = sine(f, 0.7) * env(0.7, 0.003, 0.63, 3.0)
            add_wrap(out, int(i * n / 8), v * 0.30)

    # Air: the noise source is itself periodic with the loop length, tiled three
    # times and filtered so the middle copy is taken once the filter has settled.
    src = noise(dur, 5 if dark else 6)
    air = lowpass(np.tile(src, 3), 1100 if dark else 2200)[n : 2 * n]
    out += air * (0.05 if dark else 0.035)

    return normalize(out, -20)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public/audio", help="where the WAVs go")
    args = ap.parse_args()
    d = Path(args.out)

    print("one-shots:")
    write(d / "tick.wav", tick())
    write(d / "thud.wav", thud())
    write(d / "whoosh.wav", whoosh())
    write(d / "riser.wav", riser())
    write(d / "win.wav", stinger(up=True))
    write(d / "loss.wav", stinger(up=False))
    print("beds (seamless loops):")
    write(d / "bed-dark.wav", bed(dark=True))
    write(d / "bed-light.wav", bed(dark=False))

    total = sum(p.stat().st_size for p in d.glob("*.wav")) / 1024
    print(f"\ntotal {total:.0f} KB in {d}")


if __name__ == "__main__":
    main()
