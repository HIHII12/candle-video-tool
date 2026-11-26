import type {ForexChartProps} from '../data/types';
import type {PriceWindow} from './useLightweightChart';
import {DURATION, EX, SB, lastRevealIndex, ramp} from './storyboard';
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
  const pushed = slowPush(
    {
      minValue: tight.minValue + (wide.minValue - tight.minValue) * t,
      maxValue: tight.maxValue + (wide.maxValue - tight.maxValue) * t,
    },
    frame / DURATION,
  );
  if (!props.explain) return pushed;

  // The walk-through talks about the whole trade — entry, stop, target and
  // where it ended — so the camera steps back to show all of it with room to
  // spare. The slow push had kept tightening until the stop and the final
  // candle were pressed against the top of the chart, under the edge fade.
  const overview = spread([...allPrices, ...anchors], 0.1);
  const k = ease(ramp(frame, [EX.explain[0] - 60, EX.explain[0] + 10]));
  return {
    minValue: pushed.minValue + (overview.minValue - pushed.minValue) * k,
    maxValue: pushed.maxValue + (overview.maxValue - pushed.maxValue) * k,
  };
};

const ease = (x: number) => x * x * (3 - 2 * x);
