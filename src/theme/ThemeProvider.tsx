import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME_SELECTION,
  getPalettesForStyle,
  getStyleDefinition,
  getThemeTokens,
  normalizeSelection,
  resolveCompatiblePalette,
  resolveMode,
  THEME_STORAGE_KEY,
} from './themes';
import type { ColorMode, ThemeSelection, ThemeTokens, VisualStyle, PaletteId, ResolvedMode } from './themes';

interface ThemeContextValue {
  selection: ThemeSelection;
  resolvedMode: ResolvedMode;
  tokens: ThemeTokens;
  setStyle: (style: VisualStyle) => void;
  setPalette: (palette: PaletteId) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  resetTheme: () => void;
  availablePalettes: ReturnType<typeof getPalettesForStyle>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readInitialSelection(): ThemeSelection {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_THEME_SELECTION;
    }
    const parsed = JSON.parse(raw) as Partial<ThemeSelection>;
    return normalizeSelection(parsed);
  } catch {
    return DEFAULT_THEME_SELECTION;
  }
}

function applyRootTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  const styleDef = getStyleDefinition(tokens.style);

  root.dataset.style = tokens.style;
  root.dataset.palette = tokens.palette;
  root.dataset.mode = tokens.mode;
  root.style.colorScheme = tokens.mode;

  root.style.setProperty('--font-body', styleDef.fontBody);
  root.style.setProperty('--font-display', styleDef.fontDisplay);
  root.style.setProperty('--font-mono', styleDef.fontMono);
  root.style.setProperty('--radius-base', styleDef.radiusBase);
  root.style.setProperty('--surface-blur', styleDef.surfaceBlur);
  root.style.setProperty('--panel-shadow', styleDef.panelShadow);

  root.style.setProperty('--ui-bg', tokens.ui.bg);
  root.style.setProperty('--ui-bg-gradient-a', tokens.ui.bgGradientA);
  root.style.setProperty('--ui-bg-gradient-b', tokens.ui.bgGradientB);
  root.style.setProperty('--ui-surface', tokens.ui.surface);
  root.style.setProperty('--ui-surface-muted', tokens.ui.surfaceMuted);
  root.style.setProperty('--ui-card', tokens.ui.card);
  root.style.setProperty('--ui-card-strong', tokens.ui.cardStrong);
  root.style.setProperty('--ui-control-bg', tokens.ui.controlBg);
  root.style.setProperty('--ui-control-hover', tokens.ui.controlHover);
  root.style.setProperty('--ui-border', tokens.ui.border);
  root.style.setProperty('--ui-border-strong', tokens.ui.borderStrong);
  root.style.setProperty('--ui-text', tokens.ui.text);
  root.style.setProperty('--ui-text-muted', tokens.ui.textMuted);
  root.style.setProperty('--ui-text-subtle', tokens.ui.textSubtle);
  root.style.setProperty('--ui-text-inverse', tokens.ui.textInverse);
  root.style.setProperty('--ui-accent', tokens.ui.accent);
  root.style.setProperty('--ui-accent-soft', tokens.ui.accentSoft);
  root.style.setProperty('--ui-accent-active', tokens.ui.accentActive);
  root.style.setProperty('--ui-success', tokens.ui.success);
  root.style.setProperty('--ui-success-soft', tokens.ui.successSoft);
  root.style.setProperty('--ui-warning', tokens.ui.warning);
  root.style.setProperty('--ui-danger', tokens.ui.danger);
  root.style.setProperty('--ui-info', tokens.ui.info);

  root.style.setProperty('--chart-grid', tokens.chart.grid);
  root.style.setProperty('--chart-axis', tokens.chart.axis);
  root.style.setProperty('--chart-zero', tokens.chart.zero);
  root.style.setProperty('--chart-tooltip-bg', tokens.chart.tooltipBg);
  root.style.setProperty('--chart-tooltip-border', tokens.chart.tooltipBorder);
  root.style.setProperty('--chart-tooltip-text', tokens.chart.tooltipText);
  root.style.setProperty('--chart-center-bg', tokens.chart.centerBg);
  root.style.setProperty('--chart-center-glow', tokens.chart.centerGlow);
  root.style.setProperty('--chart-heat-low', tokens.chart.heatLow);
  root.style.setProperty('--chart-heat-mid', tokens.chart.heatMid);
  root.style.setProperty('--chart-heat-high', tokens.chart.heatHigh);
  root.style.setProperty('--chart-seam', tokens.chart.seam);
  root.style.setProperty('--chart-label', tokens.chart.label);
  root.style.setProperty('--chart-point-stroke', tokens.chart.pointStroke);
  root.style.setProperty('--chart-spark-up', tokens.chart.sparkUp);
  root.style.setProperty('--chart-spark-down', tokens.chart.sparkDown);

  root.style.setProperty('--engine-ladybird', tokens.engine.ladybird);
  root.style.setProperty('--engine-chrome', tokens.engine.chrome);
  root.style.setProperty('--engine-edge', tokens.engine.edge);
  root.style.setProperty('--engine-firefox', tokens.engine.firefox);
  root.style.setProperty('--engine-safari', tokens.engine.safari);
}

function useSystemPrefersDark(): boolean {
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return true;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  return systemPrefersDark;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<ThemeSelection>(readInitialSelection);
  const systemPrefersDark = useSystemPrefersDark();

  const resolvedMode = useMemo(
    () => resolveMode(selection.mode, systemPrefersDark),
    [selection.mode, systemPrefersDark],
  );

  const normalizedSelection = useMemo<ThemeSelection>(
    () => ({
      ...selection,
      palette: resolveCompatiblePalette(selection.style, selection.palette),
    }),
    [selection],
  );

  const tokens = useMemo(
    () => getThemeTokens(normalizedSelection.style, normalizedSelection.palette, resolvedMode),
    [normalizedSelection, resolvedMode],
  );

  const availablePalettes = useMemo(
    () => getPalettesForStyle(normalizedSelection.style),
    [normalizedSelection.style],
  );

  useEffect(() => {
    applyRootTheme(tokens);
  }, [tokens]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(normalizedSelection));
    } catch {
      // Ignore persistence errors (private mode / storage quotas).
    }
  }, [normalizedSelection]);

  useEffect(() => {
    if (normalizedSelection.palette !== selection.palette) {
      setSelection((current) => ({ ...current, palette: normalizedSelection.palette }));
    }
  }, [normalizedSelection.palette, selection.palette]);

  const setStyle = useCallback((style: VisualStyle) => {
    setSelection((current) => {
      const palette = resolveCompatiblePalette(style, current.palette);
      return {
        ...current,
        style,
        palette,
      };
    });
  }, []);

  const setPalette = useCallback((palette: PaletteId) => {
    setSelection((current) => ({
      ...current,
      palette: resolveCompatiblePalette(current.style, palette),
    }));
  }, []);

  const setMode = useCallback((mode: ColorMode) => {
    setSelection((current) => ({ ...current, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setSelection((current) => {
      const currentResolved = resolveMode(current.mode, systemPrefersDark);
      const nextMode: ColorMode = currentResolved === 'dark' ? 'light' : 'dark';
      return {
        ...current,
        mode: nextMode,
      };
    });
  }, [systemPrefersDark]);

  const resetTheme = useCallback(() => {
    setSelection(DEFAULT_THEME_SELECTION);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      selection: normalizedSelection,
      resolvedMode,
      tokens,
      setStyle,
      setPalette,
      setMode,
      toggleMode,
      resetTheme,
      availablePalettes,
    }),
    [availablePalettes, normalizedSelection, resolvedMode, resetTheme, setMode, setPalette, setStyle, tokens, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export { ThemeContext };
