import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme/useTheme';

interface VectorFieldViewProps {
  dataHistory: any[];
}

const ENGINE_LABELS: Record<string, string> = {
  ladybird: 'Ladybird',
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
};

const VectorFieldView: React.FC<VectorFieldViewProps> = ({ dataHistory }) => {
  const { tokens } = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const engineColors: Record<string, string> = {
    ladybird: tokens.engine.ladybird,
    chrome: tokens.engine.chrome,
    edge: tokens.engine.edge,
    firefox: tokens.engine.firefox,
    safari: tokens.engine.safari,
  };

  const chart = useMemo(() => {
    if (!dataHistory || dataHistory.length < 2) {
      return null;
    }

    const runs = [...dataHistory].reverse();
    const engines = runs[0].engines.map((engine: any) => engine.rawName) as string[];
    const seriesMap: Record<string, number[]> = {};

    engines.forEach((name) => {
      seriesMap[name] = runs.map((run) => {
        const engine = run.engines.find((value: any) => value.rawName === name);
        return engine ? engine.passes : 0;
      });
    });

    const allValues = Object.values(seriesMap).flat();
    const minValue = Math.min(...allValues.filter((value) => value > 0));
    const maxValue = Math.max(...allValues);

    return { runs, engines, seriesMap, minValue, maxValue };
  }, [dataHistory]);

  if (!chart) {
    return <div className="ui-text-subtle text-xs flex items-center justify-center w-full h-full">Not enough data</div>;
  }

  const { runs, engines, seriesMap, minValue, maxValue } = chart;
  const W = 520;
  const H = 340;
  const padL = 58;
  const padR = 20;
  const padT = 10;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const range = maxValue - minValue || 1;

  const toX = (index: number) => padL + (index / (runs.length - 1)) * innerW;
  const toY = (value: number) => padT + innerH - ((value - minValue) / range) * innerH;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, index) => minValue + (range / yTicks) * index);

  const xTickStep = Math.max(1, Math.floor(runs.length / 6));
  const xTicks = runs
    .map((run: any, index: number) => ({ index, date: run.date }))
    .filter((_, index) => index % xTickStep === 0 || index === runs.length - 1);

  return (
    <div className="w-full h-full flex flex-col p-4 gap-3 select-none">
      <div className="flex flex-wrap gap-2 justify-center">
        {engines.map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-3.5 h-1.5 ui-radius" style={{ background: engineColors[name] ?? tokens.ui.textSubtle }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: engineColors[name] ?? tokens.ui.textSubtle }}>
              {ENGINE_LABELS[name] ?? name}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" onMouseLeave={() => setHoverIndex(null)}>
          {yTickValues.map((value, index) => (
            <g key={index}>
              <line x1={padL} y1={toY(value)} x2={padL + innerW} y2={toY(value)} stroke={tokens.chart.grid} strokeWidth="1" />
              <text x={padL - 6} y={toY(value) + 4} textAnchor="end" fontSize="9" fill={tokens.chart.axis} fontFamily="var(--font-mono)">
                {value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)}
              </text>
            </g>
          ))}

          {xTicks.map(({ index, date }) => (
            <text key={index} x={toX(index)} y={H - 8} textAnchor="middle" fontSize="9" fill={tokens.chart.axis} fontFamily="var(--font-mono)">
              {date}
            </text>
          ))}

          {engines.map((name) => {
            const values = seriesMap[name];
            const points = values.map((value: number, index: number) => `${toX(index)},${toY(value)}`).join(' ');
            const isLadybird = name === 'ladybird';
            return (
              <polyline
                key={name}
                points={points}
                fill="none"
                stroke={engineColors[name] ?? tokens.ui.textSubtle}
                strokeWidth={isLadybird ? 2.5 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isLadybird ? 1 : 0.65}
              />
            );
          })}

          {runs.map((_, index) => (
            <rect
              key={index}
              x={toX(index) - innerW / (runs.length * 2)}
              y={padT}
              width={innerW / runs.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}

          {hoverIndex !== null && (
            <g>
              <line x1={toX(hoverIndex)} y1={padT} x2={toX(hoverIndex)} y2={padT + innerH} stroke={tokens.chart.zero} strokeWidth="1" strokeDasharray="4 3" />
              {engines.map((name) => {
                const value = seriesMap[name][hoverIndex];
                return (
                  <circle
                    key={name}
                    cx={toX(hoverIndex)}
                    cy={toY(value)}
                    r="4"
                    fill={engineColors[name] ?? tokens.ui.textSubtle}
                    stroke={tokens.chart.pointStroke}
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {hoverIndex !== null && (
          <div
            className="absolute pointer-events-none ui-radius p-3 text-[10px] space-y-1 shadow-2xl"
            style={{
              background: tokens.chart.tooltipBg,
              border: `1px solid ${tokens.chart.tooltipBorder}`,
              color: tokens.chart.tooltipText,
              left: `${(toX(hoverIndex) / W) * 100}%`,
              top: '8px',
              transform: hoverIndex > runs.length / 2 ? 'translateX(-110%)' : 'translateX(10%)',
            }}
          >
            <div className="font-black mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              {runs[hoverIndex].sha} · {runs[hoverIndex].date}
            </div>
            {engines.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-2 h-2 ui-radius shrink-0" style={{ background: engineColors[name] }} />
                <span style={{ color: engineColors[name] }} className="font-black uppercase w-16 shrink-0">
                  {ENGINE_LABELS[name] ?? name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{seriesMap[name][hoverIndex].toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-[9px] font-black uppercase tracking-widest ui-text-subtle">
        {runs.length} Aligned Runs · Subtest Passes — Oldest to Newest
      </div>
    </div>
  );
};

export default VectorFieldView;
