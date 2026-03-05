import React, { useState } from 'react';
import {
  Compass,
  RefreshCcw,
  TrendingUp,
  Activity,
  Radar,
  Search,
  ChevronDown,
  PieChart,
  Moon,
  Sun,
  Settings2,
  Palette,
} from 'lucide-react';
import ThemeDialog from './ThemeDialog';
import { useTheme } from '../theme/useTheme';
import { STYLE_DEFINITIONS } from '../theme/themes';

interface HeaderProps {
  sha?: string;
  viewMode: string;
  setViewMode: (mode: string) => void;
  fetchData: () => void;
  runCount: number;
  setRunCount: (count: number) => void;
}

const VIEW_MODES = [
  { id: 'vector', icon: TrendingUp, label: 'Progress' },
  { id: 'velocity', icon: Activity, label: 'Momentum' },
  { id: 'constellation', icon: Radar, label: 'Parity' },
  { id: 'sunburst', icon: PieChart, label: 'Sunburst' },
  { id: 'explorer', icon: Search, label: 'Explorer' },
];

const RUN_COUNT_OPTIONS = [5, 25, 50, 100];

const Header: React.FC<HeaderProps> = ({ sha, viewMode, setViewMode, fetchData, runCount, setRunCount }) => {
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const { selection, resolvedMode, tokens, setStyle, setPalette, toggleMode, availablePalettes } = useTheme();

  return (
    <>
      <header className="ui-panel flex flex-col gap-5 p-5 md:p-6 relative overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.5em] font-black ui-text-accent">
              <Compass className="w-4 h-4 animate-spin-slow" />
              Deep Alignment Sync
            </div>
            <h1 className="text-4xl font-black tracking-tighter ui-text">The Parity Multiverse</h1>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] ui-text-subtle">
              <span className="px-2 py-0.5 rounded border" style={{ borderColor: tokens.ui.border, background: tokens.ui.surfaceMuted }}>
                SHA: {sha}
              </span>
              <span
                className="px-2 py-0.5 rounded border"
                style={{
                  color: tokens.ui.success,
                  borderColor: tokens.ui.success,
                  background: tokens.ui.successSoft,
                }}
              >
                VERIFIED DATA
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2 z-10">
            <div className="flex flex-wrap gap-1 p-1 ui-radius border" style={{ background: tokens.ui.controlBg, borderColor: tokens.ui.border }}>
              {VIEW_MODES.map((view) => {
                const active = viewMode === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => setViewMode(view.id)}
                    className="px-3 py-2 ui-radius text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0"
                    style={{
                      background: active ? tokens.ui.accentActive : 'transparent',
                      color: active ? tokens.ui.textInverse : tokens.ui.textMuted,
                    }}
                  >
                    <view.icon className="w-3.5 h-3.5" />
                    {view.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <select
                value={runCount}
                onChange={(event) => setRunCount(Number(event.target.value))}
                className="ui-control pl-3 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest"
              >
                {RUN_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    Last {count} Runs
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ui-text-subtle pointer-events-none" />
            </div>

            <button onClick={fetchData} className="ui-icon-btn p-2.5" title="Refresh data">
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="ui-card p-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-black ui-text-subtle mr-1">
            <Palette className="w-3.5 h-3.5" />
            Theme
          </div>

          <div className="relative">
            <select
              value={selection.style}
              onChange={(event) => setStyle(event.target.value as typeof selection.style)}
              className="ui-control pl-3 pr-8 py-2 text-[10px] font-black uppercase tracking-widest"
              title="Visual style"
            >
              {STYLE_DEFINITIONS.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ui-text-subtle pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selection.palette}
              onChange={(event) => setPalette(event.target.value as typeof selection.palette)}
              className="ui-control pl-3 pr-8 py-2 text-[10px] font-black uppercase tracking-widest"
              title="Palette"
            >
              {availablePalettes.map((palette) => (
                <option key={palette.id} value={palette.id}>
                  {palette.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ui-text-subtle pointer-events-none" />
          </div>

          <button
            onClick={toggleMode}
            className="ui-icon-btn px-3 py-2 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
            title="Toggle light/dark"
          >
            {resolvedMode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {resolvedMode === 'dark' ? 'Dark' : 'Light'}
          </button>

          <button
            onClick={() => setThemeDialogOpen(true)}
            className="ui-icon-btn px-3 py-2 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
            title="Open theme settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </header>

      <ThemeDialog open={themeDialogOpen} onClose={() => setThemeDialogOpen(false)} />
    </>
  );
};

export default Header;
