import React from 'react';
import {interpolate} from 'remotion';
import type {RiskReward} from '../data/types';
import type {PriceScale} from './geometry';
import {CHART} from './geometry';
import {THEME, FONT} from './theme';

// The TradingView-style long/short position tool: a green profit zone
// (entry -> target) stacked on a red loss zone (entry -> stop).
export const RiskRewardBox: React.FC<{
  rr: RiskReward;
  scale: PriceScale;
  reveal: number; // 0..1 grows the box horizontally
}> = ({rr, scale, reveal}) => {
  const xStart = scale.indexToX(rr.entryIndex);
  const xEnd = interpolate(reveal, [0, 1], [xStart, CHART.x + CHART.width]);
  const width = Math.max(0, xEnd - xStart);

  const yEntry = scale.priceToY(rr.entry);
  const yStop = scale.priceToY(rr.stop);
  const yTarget = scale.priceToY(rr.target);

  const profitTop = Math.min(yEntry, yTarget);
  const profitH = Math.abs(yTarget - yEntry);
  const lossTop = Math.min(yEntry, yStop);
  const lossH = Math.abs(yStop - yEntry);

  const rr_ratio = Math.abs(rr.target - rr.entry) / Math.max(1e-6, Math.abs(rr.stop - rr.entry));

  const labelOpacity = interpolate(reveal, [0.75, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <g>
      <rect x={xStart} y={profitTop} width={width} height={profitH} fill={THEME.rrProfit} />
      <rect x={xStart} y={lossTop} width={width} height={lossH} fill={THEME.rrLoss} />

      <line x1={xStart} x2={xEnd} y1={yTarget} y2={yTarget} stroke={THEME.rrProfitLine} strokeWidth={2.5} />
      <line x1={xStart} x2={xEnd} y1={yStop} y2={yStop} stroke={THEME.rrLossLine} strokeWidth={2.5} />
      <line x1={xStart} x2={xEnd} y1={yEntry} y2={yEntry} stroke={THEME.text} strokeWidth={2} strokeDasharray="6 6" />

      <g opacity={labelOpacity} fontFamily={FONT}>
        <text x={xStart + 14} y={yTarget - 10} fill={THEME.rrProfitLine} fontSize={22} fontWeight={700}>
          TP {Math.round(rr.target)}
        </text>
        <text x={xStart + 14} y={yStop + 28} fill={THEME.rrLossLine} fontSize={22} fontWeight={700}>
          SL {Math.round(rr.stop)}
        </text>
        <rect x={xStart + 12} y={profitTop + 14} width={168} height={40} rx={8} fill="rgba(11,14,20,0.72)" />
        <text x={xStart + 24} y={profitTop + 42} fill={THEME.text} fontSize={26} fontWeight={800}>
          R:R = 1:{rr_ratio.toFixed(1)}
        </text>
      </g>
    </g>
  );
};
