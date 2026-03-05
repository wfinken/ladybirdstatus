import React from 'react';
import { Github } from 'lucide-react';
import { useTheme } from '../theme/useTheme';

interface FooterProps {
  lbTotal?: number;
}

const Footer: React.FC<FooterProps> = ({ lbTotal }) => {
  const { tokens } = useTheme();

  return (
    <footer className="ui-panel p-5 md:p-6 grid md:grid-cols-2 gap-5 md:gap-6 items-center">
      <div className="space-y-4">
        <h3 className="text-3xl font-black tracking-tighter ui-text italic">How to Read the Dashboard</h3>
        <p className="ui-text-muted text-sm leading-relaxed font-medium">
          Every chart here is built from aligned Web Platform Tests snapshots, so each browser is measured against the
          same subtest set per run. <b>Progress</b> shows absolute pass counts over time, <b>Momentum</b> isolates Ladybird&apos;s
          run-over-run gains and losses, <b>Parity</b> visualizes relative distance against established engines, and{' '}
          <b>Explorer</b> lets you drill into specific WPT directories with paginated per-run results. Read them together:
          trend first, compare gaps second, then inspect folders that explain the movement.
        </p>
        <a
          href="https://github.com/wfinken/ladybirdstatus"
          target="_blank"
          rel="noopener noreferrer"
          className="ui-icon-btn inline-flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest"
          aria-label="Open project source code on GitHub"
        >
          <Github className="w-3.5 h-3.5" />
          View Source
        </a>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="ui-card p-5">
          <h5 className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: tokens.ui.accent }}>
            Aligned Subtests
          </h5>
          <p className="text-2xl font-black ui-text">{lbTotal?.toLocaleString()}</p>
          <p className="text-xs font-semibold ui-text-muted mt-1">Comparable tests in the current aligned run set.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
