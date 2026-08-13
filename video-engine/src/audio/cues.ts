import type {Cue} from './Soundtrack';
import {SB, RESOLUTION_FRAME} from '../XauChart/storyboard';
import {LSB} from '../LessonShort/theme';
import {CB} from '../CandleLesson/theme';
import {MB} from '../MarketMap/theme';

/**
 * Where each format's cues fire.
 *
 * Kept next to nothing else so the beat frames stay the single source of truth:
 * a cue is always expressed as a storyboard beat, never as a hardcoded frame.
 * Move a beat and the sound moves with it.
 *
 * The shared grammar across formats:
 *   whoosh  a new layer of markup arrives
 *   riser   tension into a reveal, ending exactly as the reveal starts
 *   thud    something lands and matters
 *   tick    the countdown, one per second
 *   win/loss  the outcome, and only where an outcome is a fact
 */

/** Quiz: markup, countdown, answer, then the trade resolving. */
export const quizCues = (win: boolean): Cue[] => [
  {at: SB.level[0], sound: 'whoosh', gain: 1},
  {at: SB.fvg[0], sound: 'whoosh', gain: 1},
  {at: SB.fibo[0], sound: 'whoosh', gain: 0.9},
  {at: SB.box[0], sound: 'thud', gain: 0.65},
  // Three ticks on the three counted seconds.
  {at: SB.countdown[0], sound: 'tick'},
  {at: SB.countdown[0] + Math.round((SB.countdown[1] - SB.countdown[0]) / 3), sound: 'tick'},
  {at: SB.countdown[0] + Math.round((2 * (SB.countdown[1] - SB.countdown[0])) / 3), sound: 'tick'},
  {at: SB.answer, sound: 'thud'},
  // The riser is placed so it *ends* on the resolution, not starts there.
  {at: RESOLUTION_FRAME - 156, sound: 'riser', gain: 0.85},
  {at: RESOLUTION_FRAME, sound: win ? 'win' : 'loss'},
];

/** Named setup: drawn in steps, so one whoosh per step, then the reveal. */
export const lessonCues = (win: boolean): Cue[] => [
  {at: LSB.structure[0], sound: 'whoosh', gain: 0.9},
  {at: LSB.labels[0], sound: 'whoosh', gain: 0.85},
  {at: LSB.neckline[0], sound: 'whoosh', gain: 0.9},
  {at: LSB.ob[0], sound: 'thud', gain: 0.5},
  {at: LSB.trade[0], sound: 'thud', gain: 0.6},
  {at: LSB.reveal[1] - 156, sound: 'riser', gain: 0.8},
  {at: LSB.reveal[1], sound: win ? 'win' : 'loss'},
];

/**
 * Candle lesson: the pattern landing is the moment, so it gets the impact.
 * `resolved` is false when the trade is still open — there is no outcome to
 * announce, so no stinger fires.
 */
export const candleCues = (win: boolean, resolved: boolean): Cue[] => [
  {at: CB.patternIn[0], sound: 'thud', gain: 0.55},
  {at: CB.focus[0], sound: 'whoosh', gain: 0.9},
  {at: CB.anatomy[0], sound: 'whoosh', gain: 0.8},
  {at: CB.rule[0], sound: 'whoosh', gain: 0.8},
  {at: CB.zoomOut[0], sound: 'whoosh', gain: 0.9},
  {at: CB.reveal[1] - 156, sound: 'riser', gain: 0.75},
  ...(resolved ? [{at: CB.reveal[1], sound: win ? 'win' : 'loss'} as Cue] : []),
  // The recap is content, so it gets scored like content.
  {at: CB.result[0], sound: 'whoosh', gain: 0.6},
];

/**
 * Market map: no outcome ever, because the plan is a projection. A win stinger
 * here would announce a result that has not happened — the audio has to keep the
 * same promise the captions do.
 */
export const mapCues = (): Cue[] => [
  {at: MB.trend[0], sound: 'whoosh', gain: 0.9},
  {at: MB.zones[0], sound: 'whoosh', gain: 0.85},
  {at: MB.choch[0], sound: 'thud', gain: 0.45},
  {at: MB.path[0], sound: 'whoosh', gain: 0.95},
  {at: MB.summary[0], sound: 'thud', gain: 0.5},
];
