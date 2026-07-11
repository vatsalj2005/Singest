<div align="center">
  <h1>📈 Singest</h1>
  <p><strong>Your Ultimate Indian Equity Markets Dashboard & Screener</strong></p>
  <p>
    Built for speed, power, and clarity. Singest empowers you to track, analyze, and screen stocks across the NSE and BSE with real-time technical indicators, live news, and comprehensive corporate actions.
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=nextdotjs" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python" alt="Python" />
    <img src="https://img.shields.io/badge/CockroachDB-PostgreSQL-244c5a?style=flat-square&logo=cockroachlabs" alt="CockroachDB" />
  </p>
</div>

---

## 🌟 Introduction

Finding the right stocks in the Indian stock market can feel like searching for a needle in a haystack. **Singest** solves this by providing a lightning-fast, beautiful, and deeply powerful dashboard to analyze public companies listed on the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE).

### Key Features

- **🏠 The Dashboard:** A bird's-eye view of the market showing today's market movers (top gainers/losers), popular tickers, and a live news feed driven by sentiment analysis.
- **🔍 The Screener:** An advanced multi-metric filter that parses thousands of stocks in milliseconds based on custom P/E ranges, ROCE, ROE, Dividend Yields, and market capitalization classes.
- **📊 Stock Deep-Dives:** Comprehensive profile pages showing dynamic pricing metrics, 5-year performance charts, technical moving averages, real-time custom SVG RSI gauges, peer comparison tables, and historical corporate action tables.
- **⚙️ Python Ingestion Backend:** A robust, resume-capable background data pipeline that fetches, cleans, deduplicates, and upserts corporate events, news, and scanner metrics directly from the Dhan API.

---

## 🏗️ System Architecture

Singest splits concerns between an interactive **Next.js Web Frontend** (App Router) and an isolated **Python Ingestion Backend**, connected by a shared **CockroachDB** instance.

```mermaid
graph TD
    subgraph Web App (Next.js 15 + React 19)
        UI[User UI: Dashboard / Screener / Stock Profile] -->|Client Components| CC[React Client: State, Interactivity, Charts]
        UI -->|Server Components| SC[Next.js Server Pages: SEO & Pre-fetching]
        CC -->|Fetch| API[Next.js API Routes]
        API -->|Pool Query| DB[(CockroachDB)]
        SC -->|Pool Cache Query| DB
    end

    subgraph Background Data Pipeline (Python)
        Orch[main.py Orchestrator] -->|Runs Subprocesses| Scripts[scripts/*.py Ingestion Modules]
        Scripts -->|API Requests| Dhan[External Dhan Analytics API]
        Scripts -->|Upsert & Resume Metadata| DB
    end
```

---

## 📂 Codebase File Directory Breakdown

Below is a detailed guide to every core file in the project, explaining their purpose, why they are needed, and key interviewer talking points.

<details>
<summary><b>1. Project Configuration & Controls (Root Folder)</b></summary>

### 1. `package.json`

- **What is it?** The recipe book for the Node.js project. It lists dependencies, devDependencies, and run scripts (e.g. `npm run dev`, `npm run build`).
- **Why do we need it?** Without it, Node.js wouldn't know which packages to install or how to trigger dev servers.
- **Interviewer talking point:** _"It manages project dependencies and scripts, ensuring standard environment setups across dev machines."_

### 2. `next.config.ts`

- **What is it?** The master configuration file for the Next.js framework.
- **Why do we need it?** It allows tweaking framework compilation, setting redirects, headers, and bundling optimizations.
- **Interviewer talking point:** _"It configures the Next.js compiler, allowing us to hook into routing rules and optimize asset compilation."_

### 3. `tsconfig.json` & Typings

- **What are they?** Controls TypeScript compiler rules, module resolutions, and strictness levels.
- **Why do we need them?** They enforce type safety during development, preventing runtime type crashes (e.g., trying to run arithmetic on strings).
- **Interviewer talking point:** _"They configure the TypeScript compiler, caching previous builds for faster compilation and enforcing strict static type checks."_

### 4. `eslint.config.js` & `.prettierrc`

- **What are they?** Code quality linter and code formatting configuration files.
- **Why do we need them?** ESLint catches bugs (like unused variables or imports) while Prettier enforces consistent spacing, layout, and style.
- **Interviewer talking point:** _"They enforce standard coding patterns and style conventions across the development team."_

### 5. `postcss.config.mjs`

- **What is it?** Integrates PostCSS plugins, specifically Tailwind CSS v4.
- **Why do we need it?** It compiles Tailwind utility classes into standardized browser-readable CSS files.
- **Interviewer talking point:** _"It connects PostCSS with Tailwind v4, translating modern utility classes into standard CSS."_

### 6. `.env` & `.env.example`

- **What are they?** Variables defining credentials like `DATABASE_URL` (database string).
- **Why do we need them?** Kept local to prevent committing sensitive passwords to GitHub, with `.example` serving as a mock template.
- **Interviewer talking point:** _"They segregate configuration variables and secrets from code, keeping database passwords safe."_

### 7. `.gitignore`

- **What is it?** A list of files/folders Git should ignore.
- **Why do we need it?** Prevents committing bulky folders like `node_modules` or local credentials like `.env`.
- **Interviewer talking point:** _"It shields the remote repository from code junk and private credential leaks."_
</details>

<details>
<summary><b>2. Global Styling & Typings (`src/`)</b></summary>

### 8. `custom.d.ts`

- **What is it?** A tiny ambient module declaration file containing `declare module "*.css";`.
- **Why do we need it?** Prevents TypeScript from raising warnings when importing CSS files inside React modules.
- **Interviewer talking point:** _"It teaches the TypeScript compiler how to handle CSS imports as valid module references."_

### 9. `styles.css`

- **What is it?** The master styling sheet for the website.
- **Why do we need it?** Initializes Tailwind v4, defines the OKLCH theme palettes for dark/light modes, and custom styles like glassmorphism.
- **Interviewer talking point:** _"It builds the design system, declaring OKLCH variables and custom animations to give the UI a premium look."_
</details>

<details>
<summary><b>3. Shared Utilities & Drivers (`src/lib/`)</b></summary>

### 10. `corporate-tables.ts`

- **What is it?** A TypeScript map dictionary translating UI tab names (e.g. `"dividends"`) to their exact database table names.
- **Why do we need it?** Keeps table mappings DRY (Don't Repeat Yourself). Renaming a table in this file updates both routing APIs and count lookups.
- **Interviewer talking point:** _"It provides a type-safe mapping dictionary matching frontend keys with PostgreSQL tables."_

### 11. `types.ts`

- **What is it?** Houses TypeScript definitions (like `StockSummary` and `ScreenerRow`).
- **Why do we need it?** Guarantees data shapes between database API routes and React components remain synced.
- **Interviewer talking point:** _"It enforces the canonical shape of our data payloads, preventing runtime reference exceptions."_

### 12. `format.ts`

- **What is it?** The formatting helper module.
- **Why do we need it?** Serializes raw database values into clean text (e.g., using `toLocaleString("en-IN")` for Indian rupee comma formatting).
- **Interviewer talking point:** _"It implements locale-aware formatting, ensuring visual consistency across all pages."_

### 13. `db.server.ts`

- **What is it?** The server-side database connection runner.
- **Why do we need it?** Establishes a connection pool (`max: 10`) and implements a global singleton pattern to prevent HMR (Hot Module Replacement) from leaking TCP connections during local development.
- **Interviewer talking point:** _"It handles PostgreSQL pooling via a singleton pattern, exposing secure parameterized query wrappers to prevent SQL injection."_
</details>

<details>
<summary><b>4. Shared Components (`src/components/`)</b></summary>

### 14. `CorporateActions.tsx`

- **What is it?** Handles the corporate actions section on stock profile pages.
- **Why do we need it?** Lazily fetches splits, bonuses, dividends, and earnings tables only when a user selects their tab, reducing database load.
- **Interviewer talking point:** _"It is a client-side component using lazy loading and `recharts` to render corporate events dynamically."_

### 15. `ThemeToggle.tsx`

- **What is it?** The Sun/Moon toggle button.
- **Why do we need it?** Flipped state triggers dark/light classes on the HTML node, storing selections in `localStorage` safely inside a `try/catch` to avoid private-mode crashes.
- **Interviewer talking point:** _"It manages dark mode toggles with hydration-safe mounting to prevent console mismatch warnings."_

### 16. `PeerComparison.tsx`

- **What is it?** A comparison grid matching a stock against 10 similar capitalization size companies.
- **Why do we need it?** Helps investors analyze valuations (P/E, ROCE) relative to industry peers.
- **Interviewer talking point:** _"It runs client-side sorting algorithms on pre-calculated database parameters, highlighting the researched company dynamically."_
</details>

<details>
<summary><b>5. Route Views & Layouts (`src/app/`)</b></summary>

### 17. `error.tsx`

- **What is it?** React client-side error boundary fallback screen.
- **Why do we need it?** Intercepts client-side exceptions, preventing full-page white-screen crashes and exposing a `reset()` button.
- **Interviewer talking point:** _"It isolates runtime client-side exceptions, allowing route segments to try recovery without page reloads."_

### 18. `layout.tsx`

- **What is it?** The root layout shell.
- **Why do we need it?** Bootstraps `<html>`, Google Inter font optimizations, and embeds a blocking `<script>` in the head to apply theme settings before rendering, eliminating theme flash (FOUC).
- **Interviewer talking point:** _"It bootstraps root HTML structures and applies inline script checks to prevent light/dark theme flash on initial load."_

### 19. `not-found.tsx`

- **What is it?** Custom 404 handler.
- **Why do we need it?** Replaces browser default 404 screens with styled lookups when dynamic routes fail.
- **Interviewer talking point:** _"It is a static server-side component compiling at build time to serve fast 404 routes."_

### 20. `page.tsx` (Dashboard / Home)

- **What is it?** The main home dashboard.
- **Why do we need it?** Handles background polling (30s overview stats, 60s news feed) with active-flag cleanup patterns, and features a 200ms debounced search bar.
- **Interviewer talking point:** _"It implements memory-safe background polling loops and debounced search triggers to optimize database overhead."_

### 21. `screener/page.tsx` (Stock Screener)

- **What is it?** The interactive stock filtering page.
- **Why do we need it?** Implements a **Dual-State Filter Pattern** (draft vs. applied state) so database requests only execute when users click search, preventing keypress request storms.
- **Interviewer talking point:** _"It couples draft-applied filter bounds with whitelisted server sorting parameters to prevent SQL injection."_

### 22. `stock/[isin]/page.tsx` (Dynamic Stock Orchestrator)

- **What is it?** The server-side page wrapper that pre-fetches stock details and news headlines.
- **Why do we need it?** Pre-fetches values server-side for search engine indexation (SEO), and wraps lookups inside React's `cache` request memoization to prevent duplicate database calls between metadata and page layout passes.
- **Interviewer talking point:** _"It uses React cache memoization to deduplicate raw SQL queries between metadata and rendering passes."_

### 23. `stock/[isin]/StockPageClient.tsx` (Stock Detail Client View)

- **What is it?** Draws the visual metrics grids, charts, and indicators for a single stock.
- **Why do we need it?** Renders price performance charts, indicator stats (SMA, Bollinger), and maps coordinates to a custom SVG semicircular gauge for RSI.
- **Interviewer talking point:** _"It renders dynamic layouts, price metrics, and hand-crafted trigonometric SVG gauges to prevent layout shift."_
</details>

---

## 💾 Database Schema

The database connection supports the following schemas, initialized on first run of the ingestion scripts:

| Table Name                            | Primary Key   | Purpose                                                                                     |
| :------------------------------------ | :------------ | :------------------------------------------------------------------------------------------ |
| `custom_scan`                         | `isin`        | Houses all metrics, valuation ratios, prices, and indicator values for all stocks.          |
| `live_news`                           | `article_id`  | Stores incoming stock market news articles alongside their categories and sentiment labels. |
| `corporate_actions_dividends`         | `row_hash`    | Cash/Stock dividend announcements.                                                          |
| `corporate_actions_quarterly_results` | `row_hash`    | Quarterly earnings reports.                                                                 |
| `corporate_actions_bonus`             | `row_hash`    | Bonus share issue details.                                                                  |
| `corporate_actions_splits`            | `row_hash`    | Stock splitting ratio details.                                                              |
| `corporate_actions_rights`            | `row_hash`    | Rights issue parameters.                                                                    |
| `corporate_actions_buybacks`          | `row_hash`    | Share buyback details.                                                                      |
| `ingestion_metadata`                  | `script_name` | Stores execution dates (`last_run_date`) to support incremental runs.                       |

---

## 🐍 Ingestion Pipeline Backend (`Backend/`)

The Python backend feeds the web database with fresh statistics, running independently via a master controller:

### Ingestion Modules (`Backend/scripts/`)

- **`ingest_corporate_actions.py`:** Incremental fetcher retrieving corporate adjustments from `last_run_date - 1 day` up to `today + 90 days`. Hashing details (`["isin", "ann_date", "ann_ltp", "ex_date"]`) generates a unique `row_hash` to eliminate duplicate database entries.
- **`ingest_live_news.py`:** Inserts new headlines. Compares incoming articles against existing keys, executing inserts only on missing records.
- **`ingest_custom_scan.py`:** Connects to Dhan's analytics API, sanitizes numeric values, and runs database `UPSERT` queries to overwrite all active tickers with their latest market parameters.

### Orchestration (`Backend/main.py`)

- Coordinates the sequence: `Corporate Actions ➔ Live News ➔ Custom Scan`.
- Runs scripts as subprocesses, logs batch details, and updates the `ingestion_metadata` run date _only_ if all subprocesses exit successfully.

---

## ⚙️ Setup & Local Run Instructions

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Credentials
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>?sslmode=require"

# Ingestion Settings
CORP_ACT_LOOKAHEAD_DAYS=90
```

### 2. Launch the Web Application

```bash
# Install packages
npm install

# Run formatter
npm run format

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the web dashboard.

### 3. Run the Python Ingestion Pipeline

```bash
cd Backend
pip install -r requirements.txt

# Run full pipeline
python main.py
```
