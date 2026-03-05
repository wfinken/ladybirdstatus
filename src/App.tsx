import React, { useState, useEffect, useMemo } from 'react';
import { Target, Shield, Zap, Globe, Loader2 } from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import VectorFieldView from './components/VectorFieldView';
import VelocityView from './components/VelocityView';
import ConstellationView from './components/ConstellationView';
import ExplorerView from './components/ExplorerView';
import SunburstView from './components/SunburstView';
import ViewInfoCard from './components/ViewInfoCard';
import { useTheme } from './theme/useTheme';
import './App.css';

const WPT_API_BASE = 'https://wpt.fyi/api';
const PRODUCTS = [
  'chrome[experimental]',
  'edge[experimental]',
  'firefox[experimental]',
  'safari[experimental]',
  'ladybird',
];

const App: React.FC = () => {
  const { tokens } = useTheme();

  const [dataHistory, setDataHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState('vector');
  const [runCount, setRunCount] = useState<number>(25);

  const [pinnedRunIds, setPinnedRunIds] = useState<string>('');
  const [rawSummaries, setRawSummaries] = useState<Map<string, Record<string, [number, number]>>>(new Map());
  const [explorerPath, setExplorerPath] = useState('/');

  const abortRef = React.useRef<AbortController | null>(null);

  const fetchData = async (count?: number) => {
    const maxCount = count ?? runCount;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    setDataHistory([]);
    setLoading(true);
    setError(null);

    try {
      const productsParam = PRODUCTS.map((product) => `product=${encodeURIComponent(product)}`).join('&');
      const shasUrl = `${WPT_API_BASE}/shas?${productsParam}&aligned=true&max-count=${maxCount}&label=master`;
      const shasResponse = await fetch(shasUrl, { signal });
      const shas: string[] = await shasResponse.json();
      if (signal.aborted) {
        return;
      }
      if (!shas || shas.length === 0) {
        throw new Error('No aligned runs found.');
      }

      const latestRunsResp = await fetch(`${WPT_API_BASE}/runs?sha=${shas[0]}&${productsParam}`, { signal });
      const latestRuns: any[] = await latestRunsResp.json();
      if (signal.aborted) {
        return;
      }

      if (latestRuns.length > 0) {
        setPinnedRunIds(latestRuns.map((run: any) => run.id).join(','));
      }

      const latestSummaries = new Map<string, Record<string, [number, number]>>();

      const latestEngines = await Promise.all(
        latestRuns.map(async (run: any) => {
          let passes = 0;
          let total = 0;
          try {
            const response = await fetch(run.results_url, { signal });
            if (response.ok && !signal.aborted) {
              const summary = await response.json();
              const browserMap: Record<string, [number, number]> = {};
              for (const [path, value] of Object.entries(summary) as [string, any][]) {
                if (value?.c) {
                  passes += value.c[0] ?? 0;
                  total += value.c[1] ?? 0;
                  browserMap[path] = [value.c[0] ?? 0, value.c[1] ?? 0];
                }
              }
              latestSummaries.set(run.browser_name, browserMap);
            }
          } catch {
            // swallow per-browser errors
          }

          return {
            name: run.browser_name.charAt(0).toUpperCase() + run.browser_name.slice(1),
            rawName: run.browser_name,
            passes,
            total,
          };
        }),
      );

      setRawSummaries(latestSummaries);

      const latestPoint = {
        sha: shas[0].substring(0, 7),
        date: new Date(latestRuns[0]?.created_at).toLocaleDateString(),
        engines: latestEngines,
      };

      if (!signal.aborted) {
        setDataHistory([latestPoint]);
        setLoading(false);
      }

      const historyMap = new Map<string, any>();
      historyMap.set(shas[0].substring(0, 7), latestPoint);

      await Promise.all(
        shas.slice(1).map(async (sha: string) => {
          try {
            const runsResp = await fetch(`${WPT_API_BASE}/runs?sha=${sha}&${productsParam}`, { signal });
            const runs: any[] = await runsResp.json();
            if (signal.aborted || !runs?.length) {
              return;
            }

            const runIds = runs.map((run: any) => run.id).join(',');
            const searchResp = await fetch(`${WPT_API_BASE}/search?run_ids=${runIds}&page=1`, { signal });
            if (signal.aborted) {
              return;
            }
            const searchData = await searchResp.json();
            const results: any[] = searchData.results ?? [];

            const enginePasses = new Array(runs.length).fill(0);
            const engineTotals = new Array(runs.length).fill(0);

            for (const result of results) {
              result.legacy_status?.forEach((status: any, index: number) => {
                enginePasses[index] += status?.passes ?? 0;
                engineTotals[index] += status?.total ?? 0;
              });
            }

            const scale = results.length > 0 ? (searchData.total ?? results.length) / results.length : 1;

            historyMap.set(sha.substring(0, 7), {
              sha: sha.substring(0, 7),
              date: new Date(runs[0]?.created_at).toLocaleDateString(),
              engines: runs.map((run: any, index: number) => ({
                name: run.browser_name.charAt(0).toUpperCase() + run.browser_name.slice(1),
                rawName: run.browser_name,
                passes: Math.round(enginePasses[index] * scale),
                total: Math.round(engineTotals[index] * scale),
              })),
            });

            if (!signal.aborted) {
              setDataHistory(shas.map((value) => historyMap.get(value.substring(0, 7))).filter(Boolean));
            }
          } catch {
            // swallow per-sha errors
          }
        }),
      );

      if (!signal.aborted) {
        setDataHistory(shas.map((value) => historyMap.get(value.substring(0, 7))).filter(Boolean));
      }
    } catch (err: any) {
      if (signal.aborted) {
        return;
      }
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(runCount);
  }, [runCount]);

  const handleExplorerPath = (path: string) => {
    setExplorerPath(path);
  };

  const chartFrameClass =
    viewMode === 'sunburst'
      ? 'aspect-square'
      : viewMode === 'constellation'
        ? 'aspect-[4/3] lg:aspect-[16/10]'
        : viewMode === 'explorer'
          ? 'aspect-square'
          : 'aspect-[16/10]';

  const metrics = useMemo(() => {
    if (dataHistory.length < 2) {
      return null;
    }

    const current = dataHistory[0];
    const oldest = dataHistory[dataHistory.length - 1];
    const lbCurrent = current.engines.find((engine: any) => engine.rawName === 'ladybird');
    const lbOldest = oldest.engines.find((engine: any) => engine.rawName === 'ladybird');
    const totalGain = lbCurrent.passes - lbOldest.passes;

    const targets = current.engines
      .filter((engine: any) => engine.rawName !== 'ladybird')
      .map((satellite: any, index: number) => {
        const parity = (lbCurrent.passes / satellite.passes) * 100;
        const delta = satellite.passes - lbCurrent.passes;
        const satOldest = oldest.engines.find((engine: any) => engine.rawName === satellite.rawName);
        const velocity = totalGain - (satellite.passes - satOldest.passes);

        return {
          ...satellite,
          parity,
          delta,
          velocity,
          color: [tokens.engine.chrome, tokens.engine.edge, tokens.engine.firefox, tokens.engine.safari][index],
          Icon: [Target, Shield, Zap, Globe][index],
        };
      });

    return {
      lb: lbCurrent,
      targets,
      gainPerRun: totalGain / 24,
      totalGain,
      sha: current.sha,
      oldestDate: oldest.date,
    };
  }, [dataHistory, tokens.engine.chrome, tokens.engine.edge, tokens.engine.firefox, tokens.engine.safari]);

  if (loading && dataHistory.length === 0) {
    return (
      <div className="app-shell min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: tokens.ui.accent }} />
        <p className="font-black uppercase tracking-[0.3em] text-xs ui-text">Loading Current Run...</p>
      </div>
    );
  }

  if (error && dataHistory.length === 0) {
    return (
      <div className="app-shell min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-black uppercase tracking-[0.3em] text-xs" style={{ color: tokens.ui.danger }}>
          Error: {error}
        </p>
        <button
          onClick={() => fetchData(runCount)}
          className="px-4 py-2 text-sm font-bold ui-radius"
          style={{ background: tokens.ui.accentActive, color: tokens.ui.textInverse }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen p-4 md:p-8 overflow-hidden flex flex-col items-center">
      <div className="w-full max-w-7xl space-y-5 md:space-y-6">
        <Header
          sha={metrics?.sha}
          viewMode={viewMode}
          setViewMode={setViewMode}
          fetchData={() => fetchData(runCount)}
          runCount={runCount}
          setRunCount={setRunCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 flex flex-col gap-5">
            {viewMode === 'vector' && (
              <ViewInfoCard title="Vector Field View" description="Tracks total subtest passes for all browser engines over aligned historical runs." />
            )}
            {viewMode === 'velocity' && (
              <ViewInfoCard
                title="Velocity View"
                description="Shows the momentum of Ladybird's development by plotting the change in subtest passes between consecutive runs."
              />
            )}
            {viewMode === 'explorer' && (
              <ViewInfoCard
                title="Test Explorer"
                description="A directory-based browser for navigating through individual Web Platform Test files and folders to see granular pass rates."
              />
            )}
            {viewMode === 'constellation' && (
              <ViewInfoCard
                title="Constellation View"
                description="Compares test pass rate parity between the baseline browser (Ladybird) and established browsers across all tracked directories."
              />
            )}
            {viewMode === 'sunburst' && (
              <ViewInfoCard
                title="Sunburst Visualization"
                description="Displays pass rates across different browsers in a radial layout. The innermost ring represents the baseline browser, moving outward to established browsers."
                instructions={[
                  { label: 'Scroll', action: 'Rotate the wheel' },
                  { label: 'Hover', action: 'View specific pass rates' },
                  { label: 'Click', action: 'Open directory Explorer' },
                ]}
              />
            )}

            <div className={`relative ${chartFrameClass} ui-chart-frame ui-radius overflow-hidden flex items-center justify-center shadow-inner`}>
              {viewMode === 'vector' && dataHistory.length > 0 && <VectorFieldView dataHistory={dataHistory} />}
              {viewMode === 'velocity' && dataHistory.length > 0 && <VelocityView dataHistory={dataHistory} />}
              {viewMode === 'explorer' && (
                <ExplorerView
                  explorerPath={explorerPath}
                  setExplorerPath={handleExplorerPath}
                  PRODUCTS={PRODUCTS}
                  pinnedRunIds={pinnedRunIds}
                  rawSummaries={rawSummaries}
                />
              )}
              {viewMode === 'constellation' && metrics && <ConstellationView targets={metrics.targets} dataHistory={dataHistory} />}
              {viewMode === 'sunburst' && (
                <SunburstView
                  rawSummaries={rawSummaries}
                  PRODUCTS={PRODUCTS}
                  onNavigateExplorer={(path) => {
                    handleExplorerPath(path);
                    setViewMode('explorer');
                  }}
                />
              )}
            </div>
          </div>

          <Sidebar dataHistory={dataHistory} totalGain={metrics?.totalGain} runCount={runCount} />
        </div>

        <Footer lbTotal={metrics?.lb?.total} />
      </div>
    </div>
  );
};

export default App;
