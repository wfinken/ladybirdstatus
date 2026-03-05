import React from 'react';
import { TrendingUp } from 'lucide-react';
import MiniSparkline from './MiniSparkline';
import { useTheme } from '../theme/useTheme';

interface SidebarProps {
  dataHistory: any[];
  totalGain?: number;
  runCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ dataHistory, totalGain, runCount = 25 }) => {
  const { tokens } = useTheme();

  const engineMeta = [
    { rawName: 'ladybird', label: 'Ladybird', color: tokens.engine.ladybird },
    { rawName: 'chrome', label: 'Chrome', color: tokens.engine.chrome },
    { rawName: 'edge', label: 'Edge', color: tokens.engine.edge },
    { rawName: 'firefox', label: 'Firefox', color: tokens.engine.firefox },
    { rawName: 'safari', label: 'Safari', color: tokens.engine.safari },
  ];

  const seriesMap: Record<string, number[]> = {};
  engineMeta.forEach(({ rawName }) => {
    seriesMap[rawName] = [...dataHistory]
      .reverse()
      .map((run) => run.engines.find((engine: any) => engine.rawName === rawName)?.passes ?? 0);
  });

  const currentRun = dataHistory[0];
  const ladybirdPasses = currentRun?.engines.find((engine: any) => engine.rawName === 'ladybird')?.passes ?? 0;

  const comparisonCards = engineMeta
    .filter(({ rawName }) => rawName !== 'ladybird')
    .map(({ rawName, label, color }) => {
      const competitorPasses = currentRun?.engines.find((engine: any) => engine.rawName === rawName)?.passes ?? 0;
      const percentOff = competitorPasses > 0 ? ((competitorPasses - ladybirdPasses) / competitorPasses) * 100 : 0;
      const parity = competitorPasses > 0 ? (ladybirdPasses / competitorPasses) * 100 : 0;
      const parityClamped = Math.max(0, Math.min(100, parity));
      const behind = percentOff >= 0;
      const gapTests = competitorPasses - ladybirdPasses;
      return {
        rawName,
        label,
        color,
        competitorPasses,
        percentOff,
        parity,
        parityClamped,
        gapTests,
        behind,
      };
    });

  return (
    <div className="lg:col-span-4 space-y-5">
      <div className="ui-panel p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest ui-text">How Close Ladybird Is</h3>
          <p className="text-[9px] ui-text-subtle leading-relaxed">
            Latest aligned run only. Bar shows Ladybird parity vs each browser, where 100% means equal pass count.
          </p>
        </div>

        <div className="space-y-3">
          {comparisonCards.map((card) => (
            <div key={card.rawName} className="ui-card p-4 ui-radius space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: card.color }}>
                  vs {card.label}
                </div>
                <div className="text-[9px] font-mono ui-text-muted">{card.competitorPasses.toLocaleString()} passes</div>
              </div>

              <div className="h-2 w-full ui-radius overflow-hidden" style={{ background: tokens.ui.surfaceMuted }}>
                <div
                  className="h-full ui-radius transition-all"
                  style={{ width: `${card.parityClamped}%`, background: card.color }}
                />
              </div>

              <div className="flex items-end justify-between gap-2">
                <div className="text-xl font-black tracking-tighter leading-none ui-text">{card.parity.toFixed(1)}%</div>
                <div className="text-right text-[8px] font-mono uppercase tracking-wider">
                  <div style={{ color: card.behind ? tokens.ui.warning : tokens.ui.success }}>
                    {card.behind ? `${card.percentOff.toFixed(1)}% behind` : `${Math.abs(card.percentOff).toFixed(1)}% ahead`}
                  </div>
                  <div className="ui-text-subtle">
                    {card.gapTests >= 0 ? `${card.gapTests.toLocaleString()} tests to catch up` : `${Math.abs(card.gapTests).toLocaleString()} tests ahead`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ui-panel p-5 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b pb-3 ui-text ui-divider">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: tokens.ui.success }} /> Browser Trends
        </h3>
        <div className="space-y-3 pt-1">
          {engineMeta.map(({ rawName, label, color }) => {
            const values = seriesMap[rawName];
            const currentPasses = currentRun?.engines.find((engine: any) => engine.rawName === rawName)?.passes ?? 0;
            if (!values || values.every((value) => value === 0)) {
              return null;
            }

            return (
              <div key={rawName} className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-[70px]">
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
                    {label}
                  </span>
                  <span className="text-[10px] font-mono ui-text-muted">{currentPasses.toLocaleString()}</span>
                </div>
                <MiniSparkline values={values} color={color} width={90} height={28} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="ui-card p-5 relative overflow-hidden" style={{ background: tokens.ui.successSoft, borderColor: tokens.ui.success }}>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase mb-2" style={{ color: tokens.ui.success }}>
          <TrendingUp className="w-3.5 h-3.5" /> {runCount}-Run Growth
        </div>
        <div className="text-4xl font-black tracking-tighter ui-text">+{totalGain?.toLocaleString()}</div>
        <div className="text-[9px] font-mono mt-1" style={{ color: tokens.ui.success }}>
          Ladybird subtest passes gained
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
