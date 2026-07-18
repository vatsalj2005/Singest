# Singest 📈

Singest is a modern, high-fidelity stock analysis and market intelligence platform. It provides a fast, interactive interface to screen National Stock Exchange (NSE) listed equities, view detailed performance highlights, track corporate actions (dividends, splits, results, etc.), and monitor live financial news with real-time sentiment analysis.

---

## Key Features

* **Interactive Stock Screener:** 
  Filter and analyze 2,900+ NSE-listed stocks in real-time. Apply combined queries on Market Cap, valuation (P/E, P/B), returns (RoCE, RoE), Dividend Yield, profit margins, 1-Year price changes, and trading volume.
* **Detailed KPI Scans:** 
  View 16 distinct key performance indicators (KPIs) for any given ticker, including moving average crossovers, breakout trends, volume anomalies, and valuation scoring.
* **Historical Corporate Actions:** 
  Tabulated views and interactive timeline charts for dividends, bonus shares, splits, rights, buybacks, and quarterly financial result announcements.
* **Live News Feed & Sentiment Engine:** 
  Aggregation of recent market news, categorizing reports by sector/topic and tagging them with sentiment signals (Positive, Neutral, Negative).
* **High-Performance UI Design:** 
  Vibrant modern aesthetics with GPU-accelerated glassmorphism layouts, hardware-accelerated background gradients to prevent scroll jank, and full dark/light mode support.

---

## Tech Stack & Architecture

### Frontend (Next.js App)
* **Core:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions, API routes)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (v4) with vanilla CSS utility layers
* **Charts:** Recharts (responsive vector charts)
* **Icons:** Lucide React
* **Database Driver:** `pg` (node-postgres with optimized connection pooling)

### Ingestion Backend (Python Pipeline)
* **Core:** Python Ingestion Pipeline (`Backend/`)
* **Libraries:** `requests` (API fetching), `psycopg2-binary` (CockroachDB connection)
* **Functions:** Fetching and upserting records, deduplication using MD5 hashing, and log capturing for synchronization statuses.

### Database
* **CockroachDB / PostgreSQL:** Highly available distributed SQL database hosting real-time security tables, financial facets, historical actions, and news logs.

---

## Project Structure

```text
Singest/
├── Backend/                    # Python Ingestion Pipeline
│   ├── scripts/                # Cron-ready Python ingestion scripts
│   │   ├── ingest_corporate_actions.py
│   │   ├── ingest_custom_scan.py
│   │   └── ingest_live_news.py
│   ├── dal.py                  # Backend Database Access Layer (SQL templates)
│   └── requirements.txt        # Python dependency checklist
├── src/                        # Next.js Application Source
│   ├── app/                    # Routing, layouts, and page controllers
│   │   ├── (home)/             # Main dashboard feed & global search
│   │   ├── api/                # Internal JSON endpoints
│   │   ├── screener/           # Stock screener component group
│   │   └── stock/[isin]/       # Ticker-specific deep-dive charts & logs
│   ├── lib/                    # Shared library abstractions
│   │   ├── dal.ts              # Unified Database Access Layer (frontend queries)
│   │   ├── db.server.ts        # Database connection pool setup
│   │   ├── format.ts           # Number/currency formatting functions
│   │   └── types.ts            # Type definitions & constants
│   └── styles.css              # Main design system & custom CSS variables
```

---

## Getting Started

### 1. Configuration Setup
Create a `.env` file in the project root directory. You can use the `.env.example` file as a reference:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/defaultdb?sslmode=require
PORT=3000
```

### 2. Run the Frontend (Next.js)

First, install the package dependencies:
```bash
npm install
```

Start the application in development mode:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the platform.

To build and run the optimized production application (recommended for fluid performance):
```bash
npm run build
npm run start
```

### 3. Run the Data Ingestion Pipelines (Python)

Navigate to the `Backend/` folder (or run from the root). Create a virtual environment and install the required modules:

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r Backend/requirements.txt
```

You can now run any of the standalone ingestion pipelines to update the database tables:

* **Ingest Corporate Actions (Dividends, splits, results etc.):**
  ```bash
  python Backend/scripts/ingest_corporate_actions.py
  ```
* **Ingest Custom Scans (Price indices, volume metrics, stock metadata):**
  ```bash
  python Backend/scripts/ingest_custom_scan.py
  ```
* **Ingest Live Headlines (Recent stock news with sentiment ratings):**
  ```bash
  python Backend/scripts/ingest_live_news.py
  ```

---

## Code Style and Quality

* **Formatting:** Prettier is configured for uniform spacing and structure. Format all files via:
  ```bash
  npm run format
  ```
* **Linting:** ESLint is configured to catch runtime bugs and syntax issues:
  ```bash
  npm run lint
  ```
* **TypeScript Check:** Strict compilation is enforced. Run the check manually:
  ```bash
  npx tsc --noEmit
  ```
