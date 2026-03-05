import React from 'react';
import { useTheme } from '../theme/useTheme';

interface MiniSparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({ values, color, width = 80, height = 28 }) => {
  const { tokens } = useTheme();

  if (!values || values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;

  const points = values
    .map((value, index) => {
      const x = pad + (index / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const trend = values[0] - values[values.length - 1];
  const trendColor = trend >= 0 ? tokens.chart.sparkUp : tokens.chart.sparkDown;

  const last = values[0];
  const dotX = width - pad;
  const dotY = height - pad - ((last - min) / range) * (height - pad * 2);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx={dotX} cy={dotY} r="2.5" fill={color} />
      <text x={width - 1} y={8} textAnchor="end" fontSize="7" fill={trendColor} fontWeight="900">
        {trend >= 0 ? '▲' : '▼'}
      </text>
    </svg>
  );
};

export default MiniSparkline;
