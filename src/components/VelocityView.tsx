import React, { useMemo } from 'react';
import { useTheme } from '../theme/useTheme';

interface VelocityViewProps {
  dataHistory: any[];
}

const VelocityView: React.FC<VelocityViewProps> = ({ dataHistory }) => {
  const { tokens } = useTheme();

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

    const deltas: Record<string, number[]> = {};
    engines.forEach((name) => {
      deltas[name] = runs
        .map((run: any, index: number) => {
          if (index === 0) {
            return 0;
          }
          const current = run.engines.find((engine: any) => engine.rawName === name)?.passes ?? 0;
          const previous = runs[index - 1].engines.find((engine: any) => engine.rawName === name)?.passes ?? 0;
          return current - previous;
        })
        .slice(1);
    });

    const ladybirdDeltas = deltas.ladybird ?? [];
    const runSlice = runs.slice(1);

    const avg5 = ladybirdDeltas.map((_, index) => {
      const slice = ladybirdDeltas.slice(Math.max(0, index - 4), index + 1);
      return slice.reduce((acc, value) => acc + value, 0) / slice.length;
    });

    const allValues = Object.values(deltas).flat();
    const maxAbs = Math.max(...allValues.map(Math.abs), 1);

    return { runSlice, engines, deltas, ladybirdDeltas, avg5, maxAbs };
  }, [dataHistory]);

  if (!chart) {
    return <div className="ui-text-subtle text-xs flex items-center justify-center w-full h-full">Not enough data</div>;
  }

  const { runSlice, engines, deltas, ladybirdDeltas, avg5, maxAbs } = chart;

  const W = 520;
  const H = 340;
  const padL = 52;
  const padR = 20;
  const padT = 10;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const midY = padT + innerH / 2;

  const barW = (innerW / runSlice.length) * 0.55;
  const toX = (index: number) => padL + ((index + 0.5) / runSlice.length) * innerW;
  const toBarHeight = (value: number) => (Math.abs(value) / maxAbs) * (innerH / 2) * 0.92;
  const toAvgY = (value: number) => midY - (value / maxAbs) * (innerH / 2) * 0.92;

  const yTickValue = Math.ceil(maxAbs / 3 / 100) * 100 || 1;
  const yTicks = [-yTickValue * 2, -yTickValue, 0, yTickValue, yTickValue * 2].filter((value) => Math.abs(value) <= maxAbs * 1.1);

  const xTickStep = Math.max(1, Math.floor(runSlice.length / 6));
  const avgPoints = avg5.map((value, index) => `${toX(index)},${toAvgY(value)}`).join(' ');

  return (
    <div className="w-full h-full flex flex-col p-4 gap-3 select-none">
      <div className="flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-1.5 ui-radius" style={{ background: engineColors.ladybird }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: engineColors.ladybird }}>
            Ladybird Δ
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-px" style={{ borderTop: `2px dashed ${tokens.ui.warning}` }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: tokens.ui.warning }}>
            5-Run Avg
          </span>
        </div>

        {engines
          .filter((name) => name !== 'ladybird')
          .map((name) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className="w-3.5 h-0.5 ui-radius" style={{ background: engineColors[name] }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: engineColors[name] }}>
                {name} Δ
              </span>
            </div>
          ))}
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          <line x1={padL} y1={midY} x2={padL + innerW} y2={midY} stroke={tokens.chart.zero} strokeWidth="1" />

          {yTicks.map((value, index) => (
            <g key={index}>
              <line x1={padL} y1={toAvgY(value)} x2={padL + innerW} y2={toAvgY(value)} stroke={tokens.chart.grid} strokeWidth="1" />
              <text x={padL - 5} y={toAvgY(value) + 4} textAnchor="end" fontSize="8" fill={tokens.chart.axis} fontFamily="var(--font-mono)">
                {value >= 0 ? '+' : ''}
                {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              </text>
            </g>
          ))}

          {engines
            .filter((name) => name !== 'ladybird')
            .map((name) => {
              const points = (deltas[name] ?? []).map((value, index) => `${toX(index)},${toAvgY(value)}`).join(' ');
              return (
                <polyline
                  key={name}
                  points={points}
                  fill="none"
                  stroke={engineColors[name]}
                  strokeWidth="1"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

          {ladybirdDeltas.map((value, index) => {
            const positive = value >= 0;
            const barHeight = toBarHeight(value);
            const barY = positive ? midY - barHeight : midY;
            return (
              <rect
                key={index}
                x={toX(index) - barW / 2}
                y={barY}
                width={barW}
                height={barHeight}
                rx="2"
                fill={positive ? engineColors.ladybird : tokens.ui.cardStrong}
                stroke={positive ? engineColors.ladybird : tokens.ui.danger}
                strokeWidth={positive ? 0 : 1}
                opacity="0.88"
              />
            );
          })}

          <polyline
            points={avgPoints}
            fill="none"
            stroke={tokens.ui.warning}
            strokeWidth="1.5"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {runSlice.map((run: any, index: number) =>
            index % xTickStep === 0 || index === runSlice.length - 1 ? (
              <text key={index} x={toX(index)} y={H - 8} textAnchor="middle" fontSize="9" fill={tokens.chart.axis} fontFamily="var(--font-mono)">
                {run.date}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <div className="text-center text-[9px] font-black uppercase tracking-widest ui-text-subtle">Per-Run Subtest Delta — Ladybird Momentum</div>
    </div>
  );
};

export default VelocityView;
