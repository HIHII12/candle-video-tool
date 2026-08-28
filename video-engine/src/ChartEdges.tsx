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
  /**
   * Opaque band before the fade begins.
   *
   * A pure linear ramp never quite reaches zero at the frame edge: a bar sitting
   * in the outermost few pixels still shows a few per cent of itself, which is
   * faint to look at and still reads as ink to the frame check. A short solid
   * band first makes the edge genuinely empty, and the dissolve then happens
   * where there is room for it to look like a dissolve.
   */
  solid?: number;
  zIndex?: number;
  /** Must match any transform on the chart element, or the fade drifts off it. */
  transform?: string;
}> = ({box, bg, side = 92, top = 40, bottom = 44, solid = 20, zIndex = 5, transform}) => (
  <div
    style={{
      position: 'absolute',
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      pointerEvents: 'none',
      zIndex,
      transform,
      background: [
        `linear-gradient(90deg, ${bg} 0px, ${bg} ${solid}px, transparent ${side}px,` +
          ` transparent calc(100% - ${side}px), ${bg} calc(100% - ${solid}px), ${bg} 100%)`,
        `linear-gradient(180deg, ${bg} 0px, ${bg} ${Math.min(solid, top - 4)}px, transparent ${top}px,` +
          ` transparent calc(100% - ${bottom}px), ${bg} calc(100% - ${Math.min(solid, bottom - 4)}px), ${bg} 100%)`,
      ].join(', '),
    }}
  />
);
