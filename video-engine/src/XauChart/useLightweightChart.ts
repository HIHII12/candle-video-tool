import {useEffect, useRef, useState} from 'react';
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import {continueRender, delayRender} from 'remotion';
import type {Candle} from '../data/types';
import {CHART_BOX, TV, FONT} from './chartTheme';

export type Coords = {
  priceToY: (price: number) => number;
  indexToX: (index: number) => number;
  // Same as indexToX but valid past the last candle, so a format can draw into
  // the empty space it reserved to the right. indexToX reads the candle's own
  // timestamp and has nothing to read there.
  logicalToX: (index: number) => number;
};

export type PriceWindow = {minValue: number; maxValue: number};

/** Horizontal window, in candle-index space. */
export type LogicalWindow = {from: number; to: number};

export type ChartLook = {
  bg: string;
  up: string;
  down: string;
  box: {left: number; top: number; width: number; height: number};
};

const DEFAULT_LOOK: ChartLook = {
  bg: TV.bg,
  up: TV.up,
  down: TV.down,
  box: CHART_BOX,
};

/**
 * Drives a real TradingView lightweight-charts instance from Remotion's frame
 * clock. The chart owns the candles; annotations are drawn as an SVG overlay
 * using the coordinate helpers returned here.
 *
 * Both scales are pinned explicitly every frame rather than left to autofit,
 * which would refit to whatever data is currently loaded and slide the candles
 * around unpredictably. Because the coordinate helpers are recomputed from the
 * live scales on every frame, the annotation overlay tracks whatever window the
 * caller asks for — so both axes can be animated as a camera.
 */
export const useLightweightChart = (
  props: {candles: Candle[]},
  shownCount: number,
  priceWindow: PriceWindow,
  look: ChartLook = DEFAULT_LOOK,
  logicalWindow?: LogicalWindow,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const windowRef = useRef(priceWindow);
  const [coords, setCoords] = useState<Coords | null>(null);

  windowRef.current = priceWindow;
  const total = props.candles.length;

  // Default: reserve a slot for every candle in the series. Fine for a static
  // chart, but it leaves the right-hand third of the frame empty until the
  // withheld candles arrive, so formats that animate pass their own window.
  const logical = logicalWindow ?? {from: -0.6, to: total - 0.4};

  // Create the chart once.
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      width: look.box.width,
      height: look.box.height,
      layout: {
        background: {color: look.bg},
        textColor: TV.textDim,
        fontFamily: FONT,
        fontSize: 20,
        attributionLogo: false,
      },
      // Axes and grid are switched off entirely. On a phone they shrink the
      // candles and add clutter the viewer never reads; prices that matter are
      // called out by the annotation labels instead.
      grid: {vertLines: {visible: false}, horzLines: {visible: false}},
      rightPriceScale: {visible: false, scaleMargins: {top: 0.03, bottom: 0.03}},
      leftPriceScale: {visible: false},
      timeScale: {visible: false},
      // Headless Chromium reports the locale as "en-US@posix", which Intl
      // rejects; pin a valid tag so date/number formatting cannot throw.
      localization: {locale: 'en-US'},
      crosshair: {mode: 0, vertLine: {visible: false}, horzLine: {visible: false}},
      // A video is not interactive; disabling input also removes kinetic
      // animations that would make frames non-deterministic.
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: look.up,
      downColor: look.down,
      borderUpColor: look.up,
      borderDownColor: look.down,
      wickUpColor: look.up,
      wickDownColor: look.down,
      priceLineVisible: false,
      lastValueVisible: false,
      // Read through a ref so the pinned window can widen frame by frame.
      autoscaleInfoProvider: () => ({priceRange: windowRef.current}),
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push the current slice of candles and republish coordinate helpers.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const handle = delayRender(`lightweight-charts frame (${shownCount} candles)`);

    // Whitespace entries reserve an x-slot for every future candle, so the
    // horizontal layout is identical from the first frame to the last.
    const data = props.candles.map((c, i) =>
      i < shownCount
        ? {
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }
        : {time: c.time as UTCTimestamp},
    );
    series.setData(data);

    // Re-assert both scales. applyOptions re-runs autoscaleInfoProvider, which
    // is what makes the vertical window animate.
    series.applyOptions({autoscaleInfoProvider: () => ({priceRange: windowRef.current})});
    chart.timeScale().setVisibleLogicalRange(logical);

    // priceToCoordinate/timeToCoordinate only return real values once the pane
    // has been laid out and painted, so publish the helpers after a paint and
    // give React one more frame to commit the overlay before releasing.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      const timeScale = chart.timeScale();
      setCoords({
        priceToY: (price) => series.priceToCoordinate(price) ?? 0,
        indexToX: (index) =>
          timeScale.timeToCoordinate(props.candles[index].time as UTCTimestamp) ?? 0,
        logicalToX: (index) => timeScale.logicalToCoordinate(index as never) ?? 0,
      });
      raf2 = requestAnimationFrame(() =>
        requestAnimationFrame(() => continueRender(handle)),
      );
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownCount, priceWindow.minValue, priceWindow.maxValue, logical.from, logical.to]);

  return {containerRef, coords};
};
