import React from 'react';

// A fake mouse pointer that the scene moves between annotation targets,
// mimicking a human drawing on the chart.
export const VirtualCursor: React.FC<{
  x: number;
  y: number;
  opacity?: number;
  pressed?: boolean;
}> = ({x, y, opacity = 1, pressed = false}) => {
  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
      {pressed && (
        <circle cx={0} cy={0} r={26} fill="rgba(255,209,102,0.25)" />
      )}
      <path
        d="M0 0 L0 30 L8 22 L14 34 L19 32 L13 20 L24 20 Z"
        fill="#ffffff"
        stroke="#0b0e14"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </g>
  );
};
