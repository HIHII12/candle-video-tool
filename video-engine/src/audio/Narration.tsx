import React from 'react';
import {Audio, staticFile} from 'remotion';
import {SAFE} from '../safeArea';

export type VoiceMark = {text: string; startFrame: number; endFrame: number};

/**
 * The narration track, plus the subtitle that follows it.
 *
 * One WAV for the whole video, silent between lines, so there is nothing to
 * synchronise at render time — the audio was laid out on the storyboard's own
 * frames when it was generated. That is also why the subtitle is exact: it reads
 * the same marks file the audio was built from, rather than guessing timings
 * from the waveform.
 *
 * Everything here is optional. No voice files means no narration, no subtitle,
 * and a music bed at full level — the video is complete without it.
 */
export const Narration: React.FC<{
  /** Basename under public/voice, without extension. */
  id: string;
  marks: VoiceMark[];
  frame: number;
  /** Dark formats need light text; the light format needs dark. */
  tone: 'light' | 'dark';
  /**
   * Distance from the bottom edge. Each format passes its own, because the
   * subtitle has to go where that format has room: placed at one fixed height it
   * landed directly on the candle lesson's statistics panel and covered the
   * break-even line — the single most important mark in the video.
   */
  bottom?: number;
  /** Long-form 16:9 has no Shorts UI band and can use its own lower-third. */
  respectShortSafeArea?: boolean;
  /**
   * Master voice level.
   *
   * The WAV is peak-normalised to 0 dBFS, so at 1.0 it leaves no headroom at all
   * and any cue landing under a word pushes the sum into the clipper. Backing it
   * off here costs nothing: the loudness pass on the finished file puts the level
   * back where it belongs.
   */
  volume?: number;
  /**
   * Stop printing subtitles from this frame on, without touching the audio.
   *
   * Some formats end on a panel that states the closing line in full. Keeping
   * the subtitle there puts the same sentence on screen twice, and the copy that
   * is redundant is the one lying across the panel that earns it.
   */
  hideCaptionFrom?: number;
  /** Same, for a beat in the middle that already prints the line it speaks. */
  hideCaptionBetween?: readonly [number, number];
}> = ({
  id,
  marks,
  frame,
  tone,
  bottom = 300,
  respectShortSafeArea = true,
  volume = 0.82,
  hideCaptionFrom,
  hideCaptionBetween,
}) => {
  const muted =
    (hideCaptionFrom !== undefined && frame >= hideCaptionFrom) ||
    (hideCaptionBetween !== undefined &&
      frame >= hideCaptionBetween[0] &&
      frame < hideCaptionBetween[1]);
  const current = muted
    ? undefined
    : marks.find((m) => frame >= m.startFrame && frame < m.endFrame + 8);

  const ink = tone === 'dark' ? '#ffffff' : '#0b0f14';
  const scrim = tone === 'dark' ? 'rgba(6,9,13,0.82)' : 'rgba(255,255,255,0.9)';

  return (
    <>
      <Audio src={staticFile(`voice/${id}.wav`)} volume={volume} />
      {current && (
        <div
          style={{
            position: 'absolute',
            // Never below the platform's own UI band; see src/safeArea.ts. A
            // subtitle covered by the Shorts title is worse than none, because
            // the viewer can tell something is there and cannot read it.
            bottom: respectShortSafeArea ? Math.max(bottom, SAFE.bottom) : bottom,
            left: 60,
            right: 60,
            zIndex: 40,
            textAlign: 'center',
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.25,
            color: ink,
            background: scrim,
            borderRadius: 16,
            padding: '16px 22px',
          }}
        >
          {current.text}
        </div>
      )}
    </>
  );
};

/** True while a line is being spoken, with the same lead-in the duck uses. */
export const speakingAt = (marks: VoiceMark[], frame: number, lead = 10) =>
  marks.some((m) => frame >= m.startFrame - lead && frame < m.endFrame + 8);

/**
 * Level for the music bed at a given frame.
 *
 * Ducks under speech. Without this the bed and the voice sit at similar
 * loudness and the words stop being intelligible on a phone speaker, which is
 * where nearly all of this is watched. The ramp is short but not instant: a
 * hard gain step is audible as a click in the music.
 */
export const duckAt = (marks: VoiceMark[], frame: number, fps: number): number => {
  const ramp = Math.round(fps * 0.25);
  const speaking = marks.some(
    (m) => frame >= m.startFrame - ramp && frame < m.endFrame + ramp,
  );
  if (!speaking) return 1;

  // Distance in frames to the nearest edge of a spoken line, so the dip eases.
  const d = Math.min(
    ...marks.map((m) =>
      frame < m.startFrame
        ? m.startFrame - frame
        : frame > m.endFrame
          ? frame - m.endFrame
          : 0,
    ),
  );
  const t = Math.min(1, d / ramp);
  return 0.32 + 0.68 * t;
};
