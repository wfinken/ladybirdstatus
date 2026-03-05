import React, { useMemo, useState } from 'react';
import { ChevronLeft, Folder, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { useTheme } from '../theme/useTheme';

interface ExplorerViewProps {
  explorerPath: string;
  setExplorerPath: (path: string) => void;
  PRODUCTS: string[];
  pinnedRunIds: string;
  rawSummaries: Map<string, Record<string, [number, number]>>;
}

const ENGINE_SHORT: Record<string, string> = {
  chrome: 'Chr',
  edge: 'Edge',
  firefox: 'FF',
  safari: 'Saf',
  ladybird: 'LB',
};

const PassBar: React.FC<{ passes: number; total: number; color: string }> = ({ passes, total, color }) => {
  const pct = total > 0 ? passes / total : 0;
  const barColor = pct === 1 ? 'var(--ui-success)' : pct === 0 && total > 0 ? 'var(--ui-danger)' : color;
  const label = total === 0 ? '-' : pct === 1 ? 'OK' : `${Math.round(pct * 100)}%`;

  return (
    <div className="flex flex-col items-center w-10 gap-0.5">
      <div className="w-8 h-1 ui-radius overflow-hidden" style={{ background: 'var(--ui-surface-muted)' }}>
        <div className="h-full ui-radius transition-all" style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-[8px] font-mono font-bold leading-none" style={{ color: barColor }}>
        {label}
      </span>
    </div>
  );
};

const ExplorerView: React.FC<ExplorerViewProps> = ({
  explorerPath,
  setExplorerPath,
  PRODUCTS,
  pinnedRunIds,
  rawSummaries,
}) => {
  const { tokens } = useTheme();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  const engineColors: Record<string, string> = {
    chrome: tokens.engine.chrome,
    edge: tokens.engine.edge,
    firefox: tokens.engine.firefox,
    safari: tokens.engine.safari,
    ladybird: tokens.engine.ladybird,
  };

  const browserNames = PRODUCTS.map((product) => product.split('[')[0]);

  const { entries, isLoading } = useMemo(() => {
    if (rawSummaries.size === 0) {
      return { entries: [] as [string, { isFile: boolean; fullPath: string; perBrowser: Record<string, [number, number]> }][], isLoading: true };
    }

    const prefix = explorerPath === '/' ? '/' : explorerPath;

    const entryMap = new Map<
      string,
      {
        isFile: boolean;
        fullPath: string;
        perBrowser: Record<string, [number, number]>;
      }
    >();

    for (const browserName of browserNames) {
      const summary = rawSummaries.get(browserName);
      if (!summary) {
        continue;
      }

      for (const [testPath, [passes, total]] of Object.entries(summary)) {
        if (!testPath.startsWith(prefix)) {
          continue;
        }

        const remaining = testPath.slice(prefix.length);
        if (!remaining) {
          continue;
        }

        const segment = remaining.split('/')[0];
        const isDir = remaining.split('/').filter(Boolean).length > 1;
        const key = segment || remaining;

        if (!entryMap.has(key)) {
          entryMap.set(key, {
            isFile: !isDir,
            fullPath: isDir ? `${prefix}${key}/` : testPath,
            perBrowser: {},
          });
        }

        const entry = entryMap.get(key);
        if (!entry) {
          continue;
        }

        if (!entry.perBrowser[browserName]) {
          entry.perBrowser[browserName] = [0, 0];
        }

        entry.perBrowser[browserName][0] += passes;
        entry.perBrowser[browserName][1] += total;
      }
    }

    const sortedEntries = Array.from(entryMap.entries()).sort(([aKey, aVal], [bKey, bVal]) => {
      if (aVal.isFile !== bVal.isFile) {
        return aVal.isFile ? 1 : -1;
      }
      return aKey.localeCompare(bKey);
    });

    return { entries: sortedEntries, isLoading: false };
  }, [rawSummaries, explorerPath, browserNames]);

  const filteredEntries = search
    ? entries.filter(([key]) => key.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginatedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleNavigate = (path: string) => {
    setSearch('');
    setPage(1);
    setExplorerPath(path);
  };

  const pathSegments = explorerPath.split('/').filter(Boolean);

  const wptLink = (testPath: string) => {
    const runParams = pinnedRunIds.split(',').map((id) => `run_id=${id}`).join('&');
    return `https://wpt.fyi/results${testPath}?${runParams}`;
  };

  return (
    <div className="w-full h-full flex flex-col text-sm ui-text p-4 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => handleNavigate('/')} className="ui-icon-btn p-1.5">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 flex-1 overflow-hidden">
          <span className="text-[10px] font-bold cursor-pointer transition-colors ui-text-subtle" onClick={() => handleNavigate('/')}>
            wpt
          </span>
          {pathSegments.map((segment, index) => (
            <React.Fragment key={segment + index}>
              <span className="text-[10px] ui-text-subtle">/</span>
              <span
                className="text-[10px] font-bold cursor-pointer transition-colors ui-text-muted truncate"
                onClick={() => handleNavigate(`/${pathSegments.slice(0, index + 1).join('/')}/`)}
              >
                {segment}
              </span>
            </React.Fragment>
          ))}
        </div>

        {isLoading && <Loader2 className="w-4 h-4 animate-spin ui-text-subtle shrink-0" />}
      </div>

      <div className="shrink-0">
        <input
          type="text"
          placeholder={`Filter ${entries.length} entries...`}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="ui-input w-full px-3 py-1.5 text-xs"
        />
      </div>

      <div className="flex items-center justify-between pb-1 shrink-0">
        <span className="text-[8px] font-black uppercase tracking-widest ui-text-subtle">Test / Directory</span>
        <div className="flex gap-2">
          {browserNames.map((name) => (
            <span
              key={name}
              className="text-[8px] font-black uppercase tracking-widest w-10 text-center"
              style={{ color: engineColors[name] ?? tokens.ui.textSubtle }}
            >
              {ENGINE_SHORT[name] ?? name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pb-1" style={{ contain: 'strict', willChange: 'scroll-position' }}>
        {paginatedEntries.length === 0 && !isLoading && (
          <div className="ui-text-subtle text-xs text-center py-8">{rawSummaries.size === 0 ? 'Loading summary data...' : 'No results found'}</div>
        )}

        {paginatedEntries.map(([key, entry]) => (
          <div
            key={key}
            className="ui-list-row flex items-center justify-between px-3 py-2 ui-radius transition-all cursor-pointer group"
            style={{ minHeight: '38px' }}
            onClick={() => {
              if (entry.isFile) {
                window.open(wptLink(entry.fullPath), '_blank', 'noopener');
              } else {
                handleNavigate(entry.fullPath);
              }
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {entry.isFile ? (
                <FileText className="w-3.5 h-3.5 shrink-0 ui-text-subtle" />
              ) : (
                <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: tokens.ui.accent }} />
              )}

              <span className="text-[10px] font-medium ui-text-muted truncate">{key}</span>

              {entry.isFile && <ExternalLink className="w-2.5 h-2.5 ui-text-subtle shrink-0 ml-0.5" />}
            </div>

            <div className="flex gap-2 shrink-0 ml-2">
              {browserNames.map((name) => {
                const [passes, total] = entry.perBrowser[name] ?? [0, 0];
                return <PassBar key={name} passes={passes} total={total} color={engineColors[name] ?? tokens.ui.textSubtle} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 border-t ui-divider shrink-0">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="ui-icon-btn flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3" /> Prev
          </button>

          <span className="text-[9px] font-mono ui-text-subtle">
            {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="ui-icon-btn flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next &rsaquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default ExplorerView;
