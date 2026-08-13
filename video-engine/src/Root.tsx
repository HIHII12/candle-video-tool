import React from 'react';
import {Composition} from 'remotion';
import {ForexChart} from './ForexChart/ForexChart';
import {XauChart} from './XauChart/XauChart';
import {DURATION} from './XauChart/storyboard';
import {LessonShort} from './LessonShort/LessonShort';
import {LESSON_DURATION} from './LessonShort/theme';
import {CandleLesson} from './CandleLesson/CandleLesson';
import {CANDLE_DURATION} from './CandleLesson/theme';
import {MarketMap} from './MarketMap/MarketMap';
import {MAP_DURATION} from './MarketMap/theme';
import type {CandleLessonProps, MarketMapProps} from './data/types';
import candleProps from './data/lesson_bullish-engulfing.json';
import mapProps from './data/map_xau_h1.json';
import type {ForexChartProps} from './data/types';
import defaultProps from './data/config.json';
import {CaseFile, CaseShort, CaseThumbnail} from './Showcase/CaseShowcase';

// XauChart is the production composition: candles are rendered by TradingView's
// lightweight-charts, annotations by an SVG overlay. ForexChart is the earlier
// hand-drawn prototype, kept as a fallback reference.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaseShort"
        component={CaseShort}
        durationInFrames={43 * 60}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{locale: 'vi' as const}}
      />
      <Composition
        id="CaseFile"
        component={CaseFile}
        durationInFrames={300 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{locale: 'vi' as const}}
      />
      <Composition
        id="CaseThumbnail"
        component={CaseThumbnail}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{locale: 'vi' as const}}
      />
      <Composition
        id="XauChart"
        component={XauChart}
        durationInFrames={DURATION}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps as ForexChartProps}
      />
      <Composition
        id="CandleLesson"
        component={CandleLesson}
        durationInFrames={CANDLE_DURATION}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={candleProps as CandleLessonProps}
      />
      <Composition
        id="MarketMap"
        component={MarketMap}
        durationInFrames={MAP_DURATION}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={mapProps as MarketMapProps}
      />
      <Composition
        id="LessonShort"
        component={LessonShort}
        durationInFrames={LESSON_DURATION}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps as ForexChartProps}
      />
      <Composition
        id="ForexChart"
        component={ForexChart}
        durationInFrames={600}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps as ForexChartProps}
      />
    </>
  );
};
