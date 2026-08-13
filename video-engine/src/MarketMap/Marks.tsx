import React from 'react';
import type {ChochPoint, MapWaypoint, MapZone} from '../data/types';
import type {Coords} from '../XauChart/useLightweightChart';
import {MT, MTEXT, mease, zoneColor} from './theme';

/**
 * A labelled price band.
 *
 * The band grows from its own left edge rather than fading in, so the eye is
 * pulled along it to the label instead of having to hunt for what appeared.
 */
export const ZoneBand: React.FC<{
  zone: MapZone;
  coords: Coords;
  width: number;
  // Right edge for the label pill. Kept clear of the projection space so a plan
  // waypoint cannot land on top of a zone's name — they mean different things
  // and reading one as the other is worse than either being smaller.
  labelRight: number;
  reveal: number;
}> = ({zone, coords, width, labelRight, reveal}) => {
  if (reveal <= 0) return null;
  const color = zoneColor(zone.kind);
  const yTop = coords.priceToY(zone.top);
  const yBot = coords.priceToY(zone.bottom);
  // Liquidity bands are near-zero height by construction; give them a
  // minimum so they read as a marked level rather than vanishing.
  const h = Math.max(6, Math.abs(yBot - yTop));
  const y = Math.min(yTop, yBot);
  const x0 = Math.max(0, coords.indexToX(zone.index));
  const grow = mease(reveal);

  return (
    <g opacity={Math.min(1, reveal * 2.2)}>
      <rect
        x={x0}
        y={y}
        width={Math.max(0, (width - x0) * grow)}
        height={h}
        fill={color}
        fillOpacity={zone.kind === 'liquidity' ? 0.5 : 0.14}
      />
      <line
        x1={x0}
        x2={x0 + (width - x0) * grow}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={zone.kind === 'gap' ? '10 7' : undefined}
      />
      {h > 10 && (
        <line
          x1={x0}
          x2={x0 + (width - x0) * grow}
          y1={y + h}
          y2={y + h}
          stroke={color}
          strokeWidth={2.5}
          strokeDasharray={zone.kind === 'gap' ? '10 7' : undefined}
        />
      )}
      {/* The label rides the right edge of the growing band. */}
      {reveal > 0.45 && (
        <g transform={`translate(${labelRight}, ${y + h / 2})`} opacity={(reveal - 0.45) / 0.55}>
          <rect x={-118} y={-21} width={118} height={42} rx={9} fill={color} />
          <text
            x={-59}
            y={7}
            textAnchor="middle"
            fontFamily={MTEXT}
            fontSize={26}
            fontWeight={800}
            fill="#fff"
            letterSpacing={1.4}
          >
            {zone.label}
          </text>
        </g>
      )}
    </g>
  );
};

/** Change-of-character marker: a dot on the swing plus its name. */
export const ChochMark: React.FC<{
  point: ChochPoint;
  coords: Coords;
  reveal: number;
}> = ({point, coords, reveal}) => {
  if (reveal <= 0) return null;
  const x = coords.indexToX(point.index);
  const y = coords.priceToY(point.price);
  const up = point.dir === 'bullish';
  // Bullish CHoCH prints at a high, so its label belongs above the swing.
  const dy = up ? -46 : 46;

  return (
    <g opacity={reveal}>
      <circle cx={x} cy={y} r={9} fill={MT.ink} />
      <line
        x1={x}
        x2={x}
        y1={y}
        y2={y + dy * 0.6}
        stroke={MT.ink}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <g transform={`translate(${x}, ${y + dy})`}>
        <rect x={-72} y={-20} width={144} height={40} rx={8} fill={MT.ink} />
        <text
          x={0}
          y={7}
          textAnchor="middle"
          fontFamily={MTEXT}
          fontSize={24}
          fontWeight={800}
          fill="#fff"
          letterSpacing={1.2}
        >
          CHoCH
        </text>
      </g>
    </g>
  );
};

/** The line the prevailing leg has been respecting, extended to the right. */
export const TrendLine: React.FC<{
  line: {from: {index: number; price: number}; to: {index: number; price: number}};
  coords: Coords;
  width: number;
  height: number;
  reveal: number;
}> = ({line, coords, width, height, reveal}) => {
  if (reveal <= 0) return null;
  const x1 = coords.indexToX(line.from.index);
  const y1 = coords.priceToY(line.from.price);
  const x2 = coords.indexToX(line.to.index);
  const y2 = coords.priceToY(line.to.price);
  if (x2 === x1) return null;

  // Project past the second point so the line reaches the empty space where the
  // plan is drawn — that intersection is the whole reason the line is on screen.
  //
  // But two swings close together make a steep slope, and projecting that to the
  // right edge sent the line straight out of the chart, leaving a diagonal that
  // pointed at nothing. So the projection stops where it would leave the frame.
  const slope = (y2 - y1) / (x2 - x1);
  let xLimit = width;
  if (slope !== 0) {
    const yBound = slope > 0 ? height : 0;
    const xExit = x1 + (yBound - y1) / slope;
    if (xExit > x1) xLimit = Math.min(xLimit, xExit);
  }

  const xEnd = x1 + (xLimit - x1) * mease(reveal);
  return (
    <line
      x1={x1}
      y1={y1}
      x2={xEnd}
      y2={y1 + slope * (xEnd - x1)}
      stroke={MT.ink}
      strokeWidth={3}
      strokeDasharray="12 9"
      opacity={0.75}
    />
  );
};

/**
 * The plan: a path through the waypoints, into the reserved empty space.
 *
 * Drawn with a stroke-dash wipe so it advances waypoint by waypoint, with an
 * arrowhead on the leading end. It is the only blue in the frame and the only
 * line that is a projection rather than a measurement.
 */
export const PlanPath: React.FC<{
  path: MapWaypoint[];
  coords: Coords;
  width: number;
  reveal: number;
}> = ({path, coords, width, reveal}) => {
  if (reveal <= 0 || path.length < 2) return null;

  const pts = path.map((w) => ({
    x: coords.logicalToX(w.index),
    y: coords.priceToY(w.price),
    label: w.label,
  }));

  // Total path length, so the dash wipe advances at a constant speed rather
  // than jumping between unevenly spaced waypoints.
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = segs.reduce((a, b) => a + b, 0);
  const drawn = total * mease(reveal);

  // Where the leading edge currently sits, for the arrowhead.
  let acc = 0;
  let head = pts[pts.length - 1];
  let prev = pts[pts.length - 2];
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= drawn) {
      const t = segs[i] === 0 ? 0 : (drawn - acc) / segs[i];
      prev = pts[i];
      head = {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
        label: null,
      };
      break;
    }
    acc += segs[i];
  }
  const angle = (Math.atan2(head.y - prev.y, head.x - prev.x) * 180) / Math.PI;

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={MT.plan}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${drawn} ${total}`}
      />
      <g transform={`translate(${head.x},${head.y}) rotate(${angle})`}>
        <path d="M0,0 L-26,-13 L-26,13 Z" fill={MT.plan} />
      </g>
      {/* Waypoints, numbered rather than named.
          Naming them "OB tap" put a blue pill immediately beside the zone's own
          pill saying "OB" — the same word twice, and the two collided. Each
          waypoint already lands on a labelled band, so the only thing the marker
          still has to carry is the order things happen in. */}
      {pts.slice(1).map((p, i) => {
        const reached = segs.slice(0, i + 1).reduce((a, b) => a + b, 0) <= drawn;
        if (!reached || !p.label) return null;
        return (
          <g key={i} transform={`translate(${p.x},${p.y})`}>
            <circle r={22} fill={MT.plan} stroke="#fff" strokeWidth={4} />
            <text
              y={9}
              textAnchor="middle"
              fontFamily={MTEXT}
              fontSize={26}
              fontWeight={900}
              fill="#fff"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
};
