import React from 'react';
import {Img, staticFile} from 'remotion';

/**
 * The channel's mark, top-right, opposite the title.
 *
 * It started bottom-left, which is where a watermark usually goes and which is
 * wrong here: the bottom of this frame is where the rule panel, the verdict and
 * the statistics all land, so the mark spent half the video lying across the
 * text. The top-right corner is the one region no beat ever claims — the title
 * block only ever occupies the left of it — so the mark can sit there for the
 * whole thirty-five seconds without ever being in the way.
 *
 * It stops short of the right edge for the same reason everything else does:
 * that strip belongs to the platform's own buttons.
 *
 * The file is named per video rather than hardcoded, because the global track
 * and the Vietnam track do not carry the same mark, and because swapping in a
 * new logo should be dropping a PNG into public/brand and naming it — not
 * editing a component.
 */
export const BrandMark: React.FC<{
  /** File name under public/brand. */
  file: string;
  /** Wordmark beside the badge. Skipped when the logo already carries one. */
  label?: string;
  size?: number;
  top?: number;
  right?: number;
  opacity?: number;
  zIndex?: number;
  tone?: string;
}> = ({
  file,
  label,
  size = 104,
  top = 84,
  right = 110,
  opacity = 0.92,
  zIndex = 25,
  tone = 'rgba(230,237,243,0.72)',
}) => (
  <div
    style={{
      position: 'absolute',
      zIndex,
      top,
      right,
      opacity,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <Img
      src={staticFile(`brand/${file}`)}
      style={{width: size, height: size, objectFit: 'contain', display: 'block'}}
    />
    {label ? (
      <span
        style={{
          fontSize: 23,
          fontWeight: 700,
          letterSpacing: 2.4,
          color: tone,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    ) : null}
  </div>
);
