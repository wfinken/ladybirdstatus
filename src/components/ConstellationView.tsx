import React, { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../theme/useTheme';

interface ConstellationViewProps {
  targets?: any[];
  dataHistory?: any[];
}

const ConstellationView: React.FC<ConstellationViewProps> = ({ targets, dataHistory }) => {
  const { tokens } = useTheme();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(timeout);
  }, []);

  const engineColors: Record<string, string> = {
    chrome: tokens.engine.chrome,
    edge: tokens.engine.edge,
    firefox: tokens.engine.firefox,
    safari: tokens.engine.safari,
    ladybird: tokens.engine.ladybird,
  };

  const stats = useMemo(() => {
    if (!targets || !dataHistory || dataHistory.length < 2) {
      return null;
    }

    const oldest = dataHistory[dataHistory.length - 1];
    const lbOldest = oldest.engines.find((engine: any) => engine.rawName === 'ladybird')?.passes ?? 0;

    return targets.map((target) => {
      const oldSat = oldest.engines.find((engine: any) => engine.rawName === target.rawName)?.passes ?? 1;
      const oldParity = (lbOldest / oldSat) * 100;
      const parityDelta = target.parity - oldParity;
      return { ...target, parityDelta };
    });
  }, [targets, dataHistory]);

  if (!targets || targets.length === 0) {
    return <div className="ui-text-subtle text-xs flex items-center justify-center w-full h-full">No data</div>;
  }

  const cx = 260;
  const cy = 190;
  const r = 150;
  const n = targets.length;

  const getPoint = (angleIndex: number, radius: number) => {
    const angle = (angleIndex / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  };

  const rings = [25, 50, 75, 100];
  const axes = targets.map((_, index) => getPoint(index, r));

  const ladybirdPoints = targets.map((target, index) => {
    const pct = Math.min(100, Math.max(0, target.parity));
    return getPoint(index, (pct / 100) * r);
  });

  const ladybirdPolygon = ladybirdPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-stretch gap-4 p-4">
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <svg width="520" height="380" viewBox="0 0 520 380" className="overflow-visible max-w-full h-auto">
          {rings.map((pct) => {
            const ringRadius = (pct / 100) * r;
            const points = targets.map((_, index) => {
              const point = getPoint(index, ringRadius);
              return `${point.x},${point.y}`;
            });

            return (
              <g key={pct}>
                <polygon points={points.join(' ')} fill="none" stroke={tokens.chart.grid} strokeWidth="1" />
                <text x={cx + 4} y={cy - ringRadius + 3} fontSize="8" fill={tokens.chart.axis} fontFamily="var(--font-mono)">
                  {pct}%
                </text>
              </g>
            );
          })}

          {axes.map((point, index) => (
            <line key={index} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke={tokens.chart.grid} strokeWidth="1" />
          ))}

          <polygon
            points={ladybirdPolygon}
            fill={tokens.engine.ladybird}
            fillOpacity={animated ? 0.2 : 0}
            stroke={tokens.engine.ladybird}
            strokeWidth="2"
            strokeOpacity={animated ? 0.92 : 0}
            style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />

          {targets.map((target, index) => {
            const pct = Math.min(100, Math.max(0, target.parity));
            const point = getPoint(index, (pct / 100) * r);
            const labelPoint = getPoint(index, r + 22);
            const color = engineColors[target.rawName] ?? tokens.ui.textSubtle;

            return (
              <g key={target.name}>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={color}
                  fontWeight="900"
                  fontFamily="var(--font-mono)"
                >
                  {target.name}
                </text>
                <circle cx={axes[index].x} cy={axes[index].y} r="3" fill={color} opacity="0.3" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={animated ? 5 : 0}
                  fill={tokens.engine.ladybird}
                  stroke={tokens.chart.pointStroke}
                  strokeWidth="2"
                  style={{ transition: 'r 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s' }}
                />
                <text
                  x={point.x + 8}
                  y={point.y - 6}
                  fontSize="9"
                  fill={tokens.chart.tooltipText}
                  fontWeight="900"
                  fontFamily="var(--font-mono)"
                  opacity={animated ? 1 : 0}
                  style={{ transition: 'opacity 0.5s ease 0.9s' }}
                >
                  {pct.toFixed(1)}%
                </text>
              </g>
            );
          })}

          <circle cx={cx} cy={cy} r="5" fill={tokens.engine.ladybird} />
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize="8" fill={tokens.engine.ladybird} fontWeight="900" fontFamily="var(--font-mono)" letterSpacing="3">
            LADYBIRD
          </text>
        </svg>
      </div>

      <div className="w-full lg:w-[240px] xl:w-[280px] flex flex-col gap-4">
        <div className="text-[9px] font-black uppercase tracking-widest ui-text-subtle mb-1">Parity vs. Established Browsers</div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {(stats ?? targets).map((target: any) => {
            const parityDelta = target.parityDelta;
            const color = engineColors[target.rawName] ?? tokens.ui.textSubtle;
            const TrendIcon = parityDelta > 0.05 ? TrendingUp : parityDelta < -0.05 ? TrendingDown : Minus;
            const trendColor = parityDelta > 0.05 ? tokens.ui.success : parityDelta < -0.05 ? tokens.ui.danger : tokens.ui.textSubtle;

            return (
              <div key={target.name} className="ui-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                    {target.name}
                  </span>
                  <div className="flex items-center gap-0.5" style={{ color: trendColor }}>
                    <TrendIcon className="w-3 h-3" />
                    {parityDelta !== undefined && (
                      <span className="text-[9px] font-black" style={{ fontFamily: 'var(--font-mono)' }}>
                        {parityDelta > 0 ? '+' : ''}
                        {parityDelta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-2xl font-black ui-text tracking-tighter">{target.parity.toFixed(1)}%</div>
                <div className="h-1 w-full ui-radius overflow-hidden" style={{ background: 'var(--ui-surface-muted)' }}>
                  <div
                    className="h-full ui-radius transition-all duration-1000"
                    style={{
                      width: `${animated ? Math.min(100, target.parity) : 0}%`,
                      background: color,
                      opacity: 0.76,
                    }}
                  />
                </div>
                <div className="text-[8px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ui-text-subtle)' }}>
                  Gap: {(target.delta ?? 0).toLocaleString()} tests
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConstellationView;
