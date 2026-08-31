import type {LogicalWindow} from './useLightweightChart';

/**
 * Horizontal window for the two real-data formats.
 *
 * Both withhold candles and replay them during the reveal. Reserving a slot for
 * every withheld candle from frame one meant the setup — the part the viewer
 * studies for the first twenty-five seconds — filled only two thirds of the
 * frame, with a permanently empty margin on the right. Growing the window as
 * the candles actually arrive keeps the chart full throughout, and the gradual
 * compression reads as a deliberate zoom-out into the payoff.
 *
 * Unlike the candle lesson there is no push-in on a single bar: the markup spans
 * the whole structure, so the whole structure has to stay on screen.
 */
export const logicalWindowAt = (
  setupCount: number,
  lastShownIndex: number,
  revealProgress: number,
): LogicalWindow => {
  // A full slot of margin at each end rather than half of one. At -0.6 the
  // first bar sat about fifteen pixels off the edge, which on a phone reads as
  // touching it; the same at the other end put the newest bar — the one the
  // question is about — hard against the frame.
  const from = -1.3;
  const to = setupCount + 0.5 + (lastShownIndex + 1.3 - (setupCount + 0.5)) * revealProgress;
  return {from, to};
};
