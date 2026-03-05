import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme } from '../theme/useTheme';

interface SunburstViewProps {
  rawSummaries: Map<string, Record<string, [number, number]>>;
  PRODUCTS: string[];
  onNavigateExplorer?: (path: string) => void;
}

const RING_ORDER = ['chrome', 'edge', 'firefox', 'safari', 'ladybird'];

const ENGINE_SHORT: Record<string, string> = {
  chrome: 'Chr',
  edge: 'Edge',
  firefox: 'FF',
  safari: 'Saf',
  ladybird: 'LB',
};

interface Tooltip {
  x: number;
  y: number;
  dir: string;
  browser: string;
  passes: number;
  total: number;
  pct: number;
}

const MIN_TESTS = 1;
const GAP = 0.008;

function parseColor(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const match = color.match(/\d+/g);
  if (!match || match.length < 3) {
    return [127, 127, 127];
  }

  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

function interpolateColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bChannel = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bChannel})`;
}

function heatColor(pct: number, low: string, mid: string, high: string): string {
  if (pct <= 0) {
    return low;
  }
  if (pct < 0.5) {
    return interpolateColor(low, mid, pct / 0.5);
  }
  return interpolateColor(mid, high, (pct - 0.5) / 0.5);
}

function describeAnnularSector(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const si = { x: cx + innerR * Math.cos(startAngle), y: cy + innerR * Math.sin(startAngle) };
  const ei = { x: cx + innerR * Math.cos(endAngle), y: cy + innerR * Math.sin(endAngle) };
  const so = { x: cx + outerR * Math.cos(startAngle), y: cy + outerR * Math.sin(startAngle) };
  const eo = { x: cx + outerR * Math.cos(endAngle), y: cy + outerR * Math.sin(endAngle) };
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${si.x} ${si.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${ei.x} ${ei.y}`,
    `L ${eo.x} ${eo.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${so.x} ${so.y}`,
    'Z',
  ].join(' ');
}

const SunburstView: React.FC<SunburstViewProps> = ({ rawSummaries, PRODUCTS, onNavigateExplorer }) => {
  const { tokens } = useTheme();

  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [animated, setAnimated] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const maxScrollRef = useRef(0);

  const engineColors: Record<string, string> = {
    chrome: tokens.engine.chrome,
    edge: tokens.engine.edge,
    firefox: tokens.engine.firefox,
    safari: tokens.engine.safari,
    ladybird: tokens.engine.ladybird,
  };

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const element = svgRef.current;
    if (!element) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScrollPos((current) => {
        const next = current + event.deltaY * 0.002;
        return Math.max(0, Math.min(maxScrollRef.current, next));
      });
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const browserNames = useMemo(() => PRODUCTS.map((product) => product.split('[')[0]), [PRODUCTS]);

  const orderedBrowsers = useMemo(
    () => RING_ORDER.filter((browser) => browserNames.includes(browser) && rawSummaries.has(browser)),
    [browserNames, rawSummaries],
  );

  const { items, totalTrackLength, totalTests } = useMemo(() => {
    if (rawSummaries.size === 0) {
      return { items: [] as any[], totalTrackLength: 0, totalTests: 0 };
    }

    const refBrowser = orderedBrowsers[0] ?? [...rawSummaries.keys()][0];
    const refSummary = rawSummaries.get(refBrowser) ?? {};

    const dirTotals = new Map<string, number>();
    const dirData = new Map<string, Record<string, [number, number]>>();

    for (const [testPath, [, total]] of Object.entries(refSummary)) {
      const segment = testPath.replace(/^\//, '').split('/')[0];
      if (!segment) {
        continue;
      }
      dirTotals.set(segment, (dirTotals.get(segment) ?? 0) + total);
    }

    for (const browser of orderedBrowsers) {
      const summary = rawSummaries.get(browser) ?? {};
      for (const [testPath, [passes, total]] of Object.entries(summary)) {
        const segment = testPath.replace(/^\//, '').split('/')[0];
        if (!segment) {
          continue;
        }

        if (!dirData.has(segment)) {
          dirData.set(segment, {});
        }

        const record = dirData.get(segment);
        if (!record) {
          continue;
        }

        if (!record[browser]) {
          record[browser] = [0, 0];
        }

        record[browser][0] += passes;
        record[browser][1] += total;
      }
    }

    const lbBrowser = orderedBrowsers.includes('ladybird') ? 'ladybird' : orderedBrowsers[0];

    const allDirs = [...dirTotals.entries()]
      .filter(([, tests]) => tests >= MIN_TESTS)
      .map(([dir, tests]) => {
        const data = dirData.get(dir) ?? {};
        const [passes, total] = data[lbBrowser] ?? [0, tests];
        const failures = Math.max(0, total - passes);
        const size = Math.max(total * 0.02, failures);
        return { dir, tests, size, perBrowser: data };
      });

    allDirs.sort((a, b) => b.size - a.size);

    const weights = allDirs.map((dir) => 16 + Math.pow(Math.max(1, dir.size), 0.6));
    const topWeight = weights.slice(0, 25).reduce((sum, weight) => sum + weight, 0);
    const thetaScale = (1.85 * Math.PI) / (topWeight || 1);

    let cursor = 0;
    const result = allDirs.map((dir, index) => {
      const width = weights[index] * thetaScale;
      cursor += width;
      return {
        dir: dir.dir,
        tests: dir.tests,
        absStart: cursor - width,
        absEnd: cursor,
        width,
        perBrowser: dir.perBrowser,
      };
    });

    const grandTotal = allDirs.reduce((sum, dir) => sum + dir.tests, 0);
    return { items: result, totalTrackLength: cursor, totalTests: grandTotal };
  }, [rawSummaries, orderedBrowsers]);

  useEffect(() => {
    maxScrollRef.current = Math.max(0, totalTrackLength - 2 * Math.PI);
    setScrollPos((current) => Math.min(current, maxScrollRef.current));
  }, [totalTrackLength]);

  const SIZE = 760;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const innerR = 80;
  const ringWidth = 54;
  const startOffset = -Math.PI / 2;

  const VIEWPORT = 2 * Math.PI;

  const visibleSectors = useMemo(() => {
    if (!items.length) {
      return [] as any[];
    }

    return items
      .map((item) => {
        if (item.absEnd <= scrollPos || item.absStart >= scrollPos + VIEWPORT) {
          return null;
        }

        let localStart = Math.max(0, item.absStart - scrollPos);
        let localEnd = Math.min(VIEWPORT, item.absEnd - scrollPos);
        const span = localEnd - localStart;

        if (span > GAP) {
          localStart += GAP / 2;
          localEnd -= GAP / 2;
        } else {
          return null;
        }

        const renderStart = startOffset + localStart;
        const renderEnd = startOffset + localEnd;
        return { ...item, renderStart, renderEnd, span: renderEnd - renderStart };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [items, scrollPos]);

  const handleMouseMove = (
    event: React.MouseEvent<SVGElement>,
    dir: string,
    browser: string,
    passes: number,
    total: number,
  ) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      dir,
      browser,
      passes,
      total,
      pct: total > 0 ? passes / total : 0,
    });
  };

  if (rawSummaries.size === 0) {
    return <div className="w-full h-full flex items-center justify-center ui-text-subtle text-xs">Loading summary data...</div>;
  }

  const numRings = orderedBrowsers.length;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 relative overflow-hidden">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE + 80}
        viewBox={`0 0 ${SIZE} ${SIZE + 80}`}
        className="overflow-visible max-h-[84%] w-auto max-w-full shrink-0"
        onMouseLeave={() => setTooltip(null)}
      >
        <circle cx={cx} cy={cy} r={innerR + ringWidth * numRings + 22} fill={tokens.chart.centerBg} opacity="0.55" />

        {orderedBrowsers.map((browser, ringIndex) => {
          const rInner = innerR + ringIndex * ringWidth;
          const rOuter = rInner + ringWidth - 2;
          const browserColor = engineColors[browser] ?? tokens.ui.textSubtle;

          return (
            <g key={browser}>
              {visibleSectors.map((sector) => {
                const [passes, total] = sector.perBrowser[browser] ?? [0, 0];
                const pct = total > 0 ? passes / total : 0;
                const fill = animated
                  ? heatColor(pct, tokens.chart.heatLow, tokens.chart.heatMid, tokens.chart.heatHigh)
                  : tokens.chart.heatLow;

                const path = describeAnnularSector(cx, cy, rInner, rOuter, sector.renderStart, sector.renderEnd);

                return (
                  <path
                    key={`${browser}-${sector.dir}`}
                    d={path}
                    fill={fill}
                    stroke={tokens.chart.centerBg}
                    strokeWidth={sector.span < 0.02 ? '0.5' : '1'}
                    opacity={animated ? 0.92 : 0}
                    style={{ transition: 'fill 0.6s ease, opacity 0.4s ease' }}
                    onMouseMove={(event) => handleMouseMove(event, sector.dir, browser, passes, total)}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (onNavigateExplorer) {
                        onNavigateExplorer(`/${sector.dir}/`);
                      }
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                );
              })}

              <text
                x={cx + (rInner + ringWidth / 2) + 2}
                y={cy}
                fill={browserColor}
                fontSize="8"
                fontWeight="900"
                fontFamily="var(--font-mono)"
                opacity={animated ? 0.9 : 0}
                style={{ transition: 'opacity 0.4s ease 0.4s', pointerEvents: 'none', userSelect: 'none' }}
              >
                {ENGINE_SHORT[browser] ?? browser}
              </text>
            </g>
          );
        })}

        <line x1={cx} y1={cy - innerR} x2={cx} y2={cy - (innerR + ringWidth * numRings)} stroke={tokens.chart.seam} strokeWidth="3" opacity="0.8" />
        <line
          x1={cx}
          y1={cy - (innerR + ringWidth * numRings)}
          x2={cx}
          y2={cy - (innerR + ringWidth * numRings) - 40}
          stroke="url(#slitFade)"
          strokeWidth="3"
          opacity="0.8"
        />

        <defs>
          <linearGradient id="slitFade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={tokens.chart.seam} stopOpacity="0.8" />
            <stop offset="100%" stopColor={tokens.chart.seam} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={tokens.chart.centerGlow} stopOpacity="0.3" />
            <stop offset="100%" stopColor={tokens.chart.centerBg} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="heatLegend" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={heatColor(0, tokens.chart.heatLow, tokens.chart.heatMid, tokens.chart.heatHigh)} />
            <stop offset="50%" stopColor={heatColor(0.5, tokens.chart.heatLow, tokens.chart.heatMid, tokens.chart.heatHigh)} />
            <stop offset="100%" stopColor={heatColor(1, tokens.chart.heatLow, tokens.chart.heatMid, tokens.chart.heatHigh)} />
          </linearGradient>
        </defs>

        {visibleSectors.map((sector, sectorIndex) => {
          const mid = (sector.renderStart + sector.renderEnd) / 2;
          const outerR = innerR + numRings * ringWidth;
          const staggerOffset = sectorIndex % 2 === 0 ? 12 : 32;
          const labelR = outerR + staggerOffset;
          const lx = cx + labelR * Math.cos(mid);
          const ly = cy + labelR * Math.sin(mid);

          const showLabel = sector.width > 0.02 && sector.span > 0.01;
          const anchor = Math.cos(mid) > 0.15 ? 'start' : Math.cos(mid) < -0.15 ? 'end' : 'middle';

          const localDist = sector.renderStart - startOffset;
          const endDist = VIEWPORT - localDist;
          const slitOpacity = Math.max(0, Math.min(1, localDist * 2, endDist * 2));
          const baseOpacity = sector.span < 0.03 ? 0.6 : 1;
          const labelOpacity = animated ? slitOpacity * baseOpacity : 0;

          return (
            <g key={`label-${sector.dir}`}>
              {showLabel && (
                <g>
                  <line
                    x1={cx + outerR * Math.cos(mid)}
                    y1={cy + outerR * Math.sin(mid)}
                    x2={cx + (labelR - 4) * Math.cos(mid)}
                    y2={cy + (labelR - 4) * Math.sin(mid)}
                    stroke={tokens.chart.axis}
                    strokeWidth="0.5"
                    opacity={labelOpacity * 0.5}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fontSize={sector.span < 0.03 ? '7' : '9'}
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                    fill={tokens.chart.label}
                    opacity={labelOpacity}
                    style={{
                      transition: 'opacity 0.2s ease',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {sector.dir}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={innerR - 4} fill={tokens.chart.centerBg} />
        <circle cx={cx} cy={cy} r={innerR - 4} fill="url(#centerGrad)" opacity="0.4" />

        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fontFamily="var(--font-mono)"
          fill={tokens.engine.ladybird}
          letterSpacing="3"
          opacity={animated ? 1 : 0}
          style={{ transition: 'opacity 0.6s ease 0.5s' }}
        >
          LADYBIRD
        </text>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fontFamily="var(--font-mono)"
          fill={tokens.chart.axis}
          letterSpacing="2"
          opacity={animated ? 1 : 0}
          style={{ transition: 'opacity 0.6s ease 0.5s' }}
        >
          WPT STATUS
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="6"
          fontWeight="400"
          fontFamily="var(--font-mono)"
          fill={tokens.chart.axis}
          opacity={animated ? 1 : 0}
          style={{ transition: 'opacity 0.6s ease 0.6s' }}
        >
          {items.length} dirs · {totalTests.toLocaleString()} tests
        </text>

        {animated && (
          <g transform={`translate(${SIZE - 90}, ${SIZE - 10})`}>
            <rect x={0} y={0} width={90} height={8} rx={4} fill="url(#heatLegend)" />
            <text x={0} y={18} fontSize="7" fontFamily="var(--font-mono)" fill={tokens.chart.axis}>
              0%
            </text>
            <text x={36} y={18} fontSize="7" fontFamily="var(--font-mono)" fill={tokens.chart.axis}>
              50%
            </text>
            <text x={72} y={18} fontSize="7" fontFamily="var(--font-mono)" fill={tokens.chart.axis}>
              100%
            </text>
            <text x={45} y={-4} textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill={tokens.chart.axis} letterSpacing="2">
              PASS RATE
            </text>
          </g>
        )}
      </svg>

      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none ui-radius p-3 shadow-2xl"
          style={{
            background: tokens.chart.tooltipBg,
            border: `1px solid ${tokens.chart.tooltipBorder}`,
            left: tooltip.x + 12,
            top: tooltip.y - 12,
            transform: tooltip.x > SIZE * 0.65 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: tokens.ui.accent }}>
            {tooltip.dir}
          </div>
          <div className="text-[10px] font-bold mb-1.5" style={{ color: engineColors[tooltip.browser] ?? tokens.ui.textSubtle }}>
            {tooltip.browser}
          </div>
          <div className="text-lg font-black tracking-tighter leading-none" style={{ color: tokens.chart.tooltipText }}>
            {(tooltip.pct * 100).toFixed(1)}%
          </div>
          <div className="text-[8px] mt-1" style={{ fontFamily: 'var(--font-mono)', color: tokens.ui.textMuted }}>
            {tooltip.passes.toLocaleString()} / {tooltip.total.toLocaleString()} tests
          </div>
          {onNavigateExplorer && (
            <div className="text-[8px] mt-1.5" style={{ fontFamily: 'var(--font-mono)', color: tokens.ui.textSubtle }}>
              Click to explore →
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 mt-1 flex-wrap justify-center">
        {orderedBrowsers.map((browser, index) => {
          const color = engineColors[browser] ?? tokens.ui.textSubtle;
          return (
            <div key={browser} className="flex items-center gap-1.5">
              <div className="w-3 h-3 ui-radius" style={{ background: color, opacity: 0.5 }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
                {browser}
              </span>
              <span className="text-[8px]" style={{ fontFamily: 'var(--font-mono)', color: tokens.ui.textSubtle }}>
                ring {index + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SunburstView;
