import React, { useEffect, useMemo, useRef } from 'react';
import { Palette, RotateCcw, SunMoon } from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import { STYLE_DEFINITIONS } from '../theme/themes';
import type { ColorMode } from '../theme/themes';

interface ThemeDialogProps {
  open: boolean;
  onClose: () => void;
}

const MODE_OPTIONS: { value: ColorMode; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Always use light mode.' },
  { value: 'dark', label: 'Dark', hint: 'Always use dark mode.' },
  { value: 'system', label: 'System', hint: 'Follow OS preference.' },
];

const ThemeDialog: React.FC<ThemeDialogProps> = ({ open, onClose }) => {
  const ref = useRef<HTMLDialogElement | null>(null);
  const { selection, resolvedMode, tokens, availablePalettes, setStyle, setPalette, setMode, resetTheme } = useTheme();

  const currentStyle = useMemo(
    () => STYLE_DEFINITIONS.find((style) => style.id === selection.style),
    [selection.style],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    const handleClose = () => {
      onClose();
    };

    const handleCancel = (event: Event) => {
      event.preventDefault();
      dialog.close();
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="w-[min(760px,94vw)] ui-radius border border-[var(--ui-border-strong)] p-0 ui-card-strong"
      style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      onClick={(event) => {
        const dialog = ref.current;
        if (!dialog) {
          return;
        }
        if (event.target === dialog) {
          dialog.close();
        }
      }}
    >
      <div className="p-6 md:p-7 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-black ui-text-accent">
              <Palette className="w-3.5 h-3.5" />
              Theme Studio
            </div>
            <h2 className="text-2xl font-black tracking-tight ui-text">Style + Palette + Mode</h2>
            <p className="text-xs ui-text-muted">All changes preview instantly and are saved automatically.</p>
          </div>
          <button
            type="button"
            className="ui-icon-btn px-3 py-2 text-xs font-bold uppercase tracking-widest"
            onClick={resetTheme}
          >
            <span className="inline-flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] ui-text-subtle">Style</span>
            <select
              value={selection.style}
              onChange={(event) => setStyle(event.target.value as typeof selection.style)}
              className="ui-control w-full px-3 py-2 text-xs font-semibold"
            >
              {STYLE_DEFINITIONS.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] ui-text-muted">{currentStyle?.description}</p>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] ui-text-subtle">Palette</span>
            <select
              value={selection.palette}
              onChange={(event) => setPalette(event.target.value as typeof selection.palette)}
              className="ui-control w-full px-3 py-2 text-xs font-semibold"
            >
              {availablePalettes.map((palette) => (
                <option key={palette.id} value={palette.id}>
                  {palette.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] ui-text-muted">
              {availablePalettes.find((palette) => palette.id === selection.palette)?.description}
            </p>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] ui-text-subtle">Color Mode</span>
            <select
              value={selection.mode}
              onChange={(event) => setMode(event.target.value as ColorMode)}
              className="ui-control w-full px-3 py-2 text-xs font-semibold"
            >
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] ui-text-muted">
              {MODE_OPTIONS.find((option) => option.value === selection.mode)?.hint} Now using <span className="font-bold ui-text">{resolvedMode}</span>.
            </p>
          </label>
        </div>

        <div className="ui-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-black ui-text-subtle">
            <SunMoon className="w-3.5 h-3.5" />
            Live Preview
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-black uppercase tracking-widest">
            <div className="ui-radius px-2 py-2 border" style={{ background: tokens.ui.card, borderColor: tokens.ui.border, color: tokens.ui.text }}>
              Surface
            </div>
            <div className="ui-radius px-2 py-2 border" style={{ background: tokens.ui.accentSoft, borderColor: tokens.ui.accent, color: tokens.ui.accent }}>
              Accent
            </div>
            <div className="ui-radius px-2 py-2 border" style={{ background: tokens.ui.successSoft, borderColor: tokens.ui.success, color: tokens.ui.success }}>
              Success
            </div>
            <div
              className="ui-radius px-2 py-2 border"
              style={{
                background: `color-mix(in srgb, ${tokens.ui.warning} 16%, transparent)`,
                borderColor: tokens.ui.warning,
                color: tokens.ui.warning,
              }}
            >
              Warning
            </div>
            <div
              className="ui-radius px-2 py-2 border"
              style={{
                background: `color-mix(in srgb, ${tokens.ui.danger} 16%, transparent)`,
                borderColor: tokens.ui.danger,
                color: tokens.ui.danger,
              }}
            >
              Danger
            </div>
            <div
              className="ui-radius px-2 py-2 border"
              style={{
                background: `color-mix(in srgb, ${tokens.ui.info} 16%, transparent)`,
                borderColor: tokens.ui.info,
                color: tokens.ui.info,
              }}
            >
              Info
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tokens.engine).map(([name, color]) => (
              <span key={name} className="px-2 py-1 ui-radius text-[10px] font-black uppercase tracking-widest" style={{ border: `1px solid ${color}`, color }}>
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="ui-icon-btn px-4 py-2 text-xs font-black uppercase tracking-widest" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ThemeDialog;
