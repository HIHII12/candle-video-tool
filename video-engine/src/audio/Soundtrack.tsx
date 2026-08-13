import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

/**
 * The soundtrack, driven by a format's storyboard rather than laid over it.
 *
 * Each format passes the frames where its beats land, so a cue always coincides
 * with something happening on screen. That is the whole difference between a
 * video with music on it and a video that feels cut to sound.
 *
 * Levels are deliberate: the bed sits far enough under the accents that a
 * platform's loudness normalisation cannot flatten the two together. Files can
 * be swapped for licensed audio of the same name without touching this.
 */

export type Cue = {
  /** Frame the cue fires on. */
  at: number;
  /** File in public/audio, without the extension. */
  sound: 'tick' | 'thud' | 'whoosh' | 'riser' | 'win' | 'loss';
  /** Multiplier on the file's own level. */
  gain?: number;
};

const DUR: Record<Cue['sound'], number> = {
  tick: 0.09,
  thud: 0.42,
  whoosh: 0.5,
  riser: 2.6,
  win: 1.5,
  loss: 1.5,
};

export const Soundtrack: React.FC<{
  bed: 'dark' | 'light';
  cues: Cue[];
  durationInFrames: number;
  fps: number;
  /** Per-frame multiplier on the bed, used to duck it under narration. */
  bedGain?: (frame: number) => number;
}> = ({bed, cues, durationInFrames, fps, bedGain}) => {
  const fadeFrames = Math.round(fps * 0.8);

  return (
    <>
      {/* The bed is a 10s seamless loop, so it repeats rather than being a long
          file. It fades at both ends: starting at full level reads as the video
          having been cut off from something before it. */}
      <Audio
        src={staticFile('audio/bed-' + bed + '.wav')}
        loop
        volume={(f) =>
          Math.min(
            1,
            f / fadeFrames,
            Math.max(0, (durationInFrames - f) / fadeFrames),
          ) *
          0.9 *
          (bedGain ? bedGain(f) : 1)
        }
      />

      {cues.map((c, i) => (
        // Sequence rather than a raw start offset: it bounds the clip to its own
        // length, so a cue near the end cannot run past the composition and get
        // abruptly cut.
        <Sequence
          key={`${c.sound}-${c.at}-${i}`}
          from={Math.max(0, c.at)}
          durationInFrames={Math.ceil(DUR[c.sound] * fps) + 2}
          layout="none"
        >
          <Audio src={staticFile(`audio/${c.sound}.wav`)} volume={c.gain ?? 1} />
        </Sequence>
      ))}
    </>
  );
};
