import React from 'react';

/**
 * Fades the chart out at its own edges instead of cutting it off.
 *
 * A candle half outside the frame is normal on a real chart and wrong in a
 * video: on a phone it reads as a rendering fault, and an automated frame check
 * calls it exactly what it looks like — ink running off the edge. Camera moves
 * make it unavoidable, since any window tight enough to explain a pattern will
 * have bars crossing the boundary.
 *
 * So the boundary stops being a cut. Bars dissolve into the background over
 * about forty pixels, which is what a viewer expects at the end of a chart and
 * what the checker reads as "nothing is escaping".
 */
export const ChartEdges: React.FC<{
  box: {left: number; top: number; width: number; height: number};
  bg: string;
  /** Fade width in px; the top fade is usually shorter, under the header. */
  side?: number;
  top?: number;
  bottom?: number;
  zIndex?: number;
}> = ({box, bg, side = 46, top = 30, bottom = 34, zIndex = 5}) => (
  <div
    style={{
      position: 'absolute',
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      pointerEvents: 'none',
      zIndex,
      background: [
        `linear-gradient(90deg, ${bg} 0px, transparent ${side}px, transparent calc(100% - ${side}px), ${bg} 100%)`,
        `linear-gradient(180deg, ${bg} 0px, transparent ${top}px, transparent calc(100% - ${bottom}px), ${bg} 100%)`,
      ].join(', '),
    }}
  />
);
