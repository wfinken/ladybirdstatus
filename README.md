# Ladybird Status

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![WPT Data](https://img.shields.io/badge/Data-wpt.fyi-0A7EFA)](https://wpt.fyi/)

Ladybird Status is a browser-compatibility dashboard that tracks Ladybird's Web Platform Tests (WPT) progress against Chrome, Edge, Firefox, and Safari using live public run data.

**Quick links:** [Features](#features) • [Views](#views) • [Data Methodology](#data-methodology) • [Getting Started](#getting-started) • [Repository](#repository)

## Table of Contents

- [Features](#features)
- [Views](#views)
- [Data Methodology](#data-methodology)
- [Tech Stack](#tech-stack)
- [Theme System](#theme-system)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Repository](#repository)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

## Features

- Tracks aligned WPT history across all five engines.
- Highlights Ladybird momentum with per-run gain/loss analysis.
- Calculates parity percentages against each competitor.
- Breaks results down by top-level WPT directory coverage.
- Supports interactive theme presets (style, palette, and mode).

## Views

- **Progress**: Multi-browser time-series chart of subtest pass counts.
- **Momentum**: Ladybird run-over-run deltas with trend context.
- **Parity**: Radar chart showing Ladybird parity versus each browser.
- **Sunburst**: Directory-level pass-rate heatmap in radial layout.
- **Explorer**: Path-based WPT browser with paginated detail lookup.

## Data Methodology

Data is fetched from the public [wpt.fyi API](https://wpt.fyi/api) and run summary JSON files (`results_url`).

1. Fetch aligned SHAs for tracked products.
2. Select the latest `N` runs (`5`, `25`, `50`, `100`).
3. Aggregate pass/total counts from summary data for current snapshots.
4. Build historical trend points from search results, scaled to full result volume.
5. Pin Explorer queries with `run_ids` to keep folder drill-down consistent.

No API key is required.

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS v4
- Lucide React icons
- Custom SVG chart rendering

## Theme System

The UI supports:

- **Style** presets (visual language)
- **Palette** presets (color system)
- **Mode**: `light`, `dark`, `system`

Theme selections persist in `localStorage` under `lbstatus.theme.v2`.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install and run

```bash
npm install
npm run dev
```

App URL (default): `http://localhost:5173`

## Scripts

- `npm run dev`: Start local development server
- `npm run build`: Type-check and create production build
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint

## Deployment

Build static assets:

```bash
npm run build
```

Deploy the generated `dist/` directory to any static host.

## Repository

- Source code: https://github.com/wfinken/ladybirdstatus

## Contributing

Issues and pull requests are welcome. For changes that alter behavior or UX, include a short description of the problem and the expected outcome.

## Acknowledgments

- [Ladybird](https://ladybird.org/)
- [Web Platform Tests](https://web-platform-tests.org/)
- [wpt.fyi](https://wpt.fyi/)
