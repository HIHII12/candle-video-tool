import type {ForexChartProps} from '../data/types';
import type {PriceWindow} from './useLightweightChart';
import {DURATION, SB, lastRevealIndex, ramp} from './storyboard';
import {slowPush} from '../camera';

const spread = (prices: number[], pad = 0.07): PriceWindow => {
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const p = (hi - lo) * pad || 1;
  return {minValue: lo - p, maxValue: hi + p};
};

/**
 * The vertical window, animated.
 *
 * Pinning it to the full dataset up front leaves the setup candles squashed
 * into a band, because the withheld candles reach further than the setup ever
 * does. So the window starts tight around the setup and widens during the
 * reveal — the zoom-out doubles as a cue that something is happening.
 */
export const priceWindowAt = (props: ForexChartProps, frame: number): PriceWindow => {
  const rr = props.riskReward;
  const anchors = [
    ...props.levels.map((l) => l.price),
    ...(rr ? [rr.entry, rr.stop, rr.target] : []),
  ];

  const setupPrices = props.candles
    .slice(0, props.setupCount)
    .flatMap((c) => [c.high, c.low]);
  // Only to the resolving candle. Padding for bars the reveal never reaches
  // squashes everything the viewer does see into a narrower band.
  const allPrices = props.candles
    .slice(0, lastRevealIndex(props) + 1)
    .flatMap((c) => [c.high, c.low]);

  const tight = spread([...setupPrices, ...anchors]);
  const wide = spread([...allPrices, ...anchors]);

  const t = ramp(frame, SB.reveal);
  // Same reason as the lesson: everything before the reveal shared one window,
  // and the countdown beat in particular sat perfectly still for three seconds.
  return slowPush(
    {
      minValue: tight.minValue + (wide.minValue - tight.minValue) * t,
      maxValue: tight.maxValue + (wide.maxValue - tight.maxValue) * t,
    },
    frame / DURATION,
  );
};
