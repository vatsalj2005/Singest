# Signalz Ingestion Pipeline Backend

A robust, resume-capable data ingestion pipeline that fetches, filters, deduplicates, and stores corporate actions, live news, and custom scanner results from the Dhan API into CockroachDB.

---

## 📁 Project Structure

```
Backend/
├── .env                                   # Environment variables (DB connection, config)
├── README.md
├── main.py                                # Master pipeline orchestrator
├── logs/
│   ├── ingest_corporate_actions.log       # Skipped/duplicate corporate action records
│   ├── ingest_live_news.log               # Skipped/duplicate news records
│   └── ingest_custom_scan.log             # Skipped/duplicate scan records
└── scripts/
    ├── ingest_corporate_actions.py        # Corporate actions ingestion module
    ├── ingest_live_news.py                # Live news ingestion module
    └── ingest_custom_scan.py              # Custom scan ingestion module
```

---

## 🚀 Pipeline Overview

The backend ingestion suite consists of three core ingestion modules orchestrating data from Dhan API to a PostgreSQL-compatible CockroachDB instance. The pipeline supports:

1. **Dynamic Resume**: Automatically resumes from the last run date, checking only active lookahead ranges to minimize execution time and API overhead.
2. **Per-Action-Type Hash Keys**: Avoids duplicate listings across exchanges while preserving distinct corporate actions.
3. **Selective Logging**: Console displays process execution, while log files (in `logs/`) only capture skipped/duplicate records to prevent log files from growing excessively.
4. **Isolated Orchestration**: A master runner script (`main.py`) coordinates the entire pipeline.

---

## 🛠️ Repository Components

### 1. Ingestion Modules (in `scripts/`)

- **[`ingest_corporate_actions.py`](file:///e:/Signalz/Backend/scripts/ingest_corporate_actions.py)**
  - Fetches corporate events: `QUARTERLY RESULT ANNOUNCEMENT`, `BONUS`, `DIVIDEND`, `Splits`, `Rights`, and `Buyback`.
  - **Per-Type Hashing**: De-duplicates entries by generating a SHA-256 hash using key columns: `["isin", "ann_date", "ann_ltp", "ex_date"]` for all corporate action types.
  - **Metadata Integration**: Queries `ingestion_metadata` to retrieve the `last_run_date`. It resumes from `last_run_date - 1 day` up to `today + 90 days`.

- **[`ingest_live_news.py`](file:///e:/Signalz/Backend/scripts/ingest_live_news.py)**
  - Streams and stores live market news.
  - Uses `article_id` as the primary key.
  - **Insert-Only Model**: Compares fetched articles against existing database keys and _only_ inserts new articles, avoiding unnecessary database writes.

- **[`ingest_custom_scan.py`](file:///e:/Signalz/Backend/scripts/ingest_custom_scan.py)**
  - Fetches custom technical scan outputs (e.g., volume spikes, breakout tickers).
  - Uses `isin` as the primary key.
  - **Upsert-All Model**: Fetches scan results and updates all tickers with their latest market metrics.

### 2. Orchestration

- **[`main.py`](file:///e:/Signalz/Backend/main.py)**
  - A master pipeline coordinator that sequences all three ingestion scripts.
  - Executes them as independent subprocesses, streaming their output live to the console, timing their runs, and reporting a pipeline status summary at the end.

---

## 💾 Database Schema

The pipeline automatically initializes the following tables on first run:

| Table Name                            | Primary Key   | Purpose                                                     |
| :------------------------------------ | :------------ | :---------------------------------------------------------- |
| `corporate_actions_quarterly_results` | `row_hash`    | Stores quarterly earnings results                           |
| `corporate_actions_bonus`             | `row_hash`    | Stores bonus share issue details                            |
| `corporate_actions_dividends`         | `row_hash`    | Stores cash and stock dividend records                      |
| `corporate_actions_splits`            | `row_hash`    | Stores stock splits                                         |
| `corporate_actions_rights`            | `row_hash`    | Stores rights issues                                        |
| `corporate_actions_buybacks`          | `row_hash`    | Stores share buybacks                                       |
| `live_news`                           | `article_id`  | Stores incoming stock market news articles                  |
| `custom_scan`                         | `isin`        | Stores custom scan details & current stock statistics       |
| `ingestion_metadata`                  | `script_name` | Stores last run dates (`last_run_date`) for resume tracking |

---

## ⚙️ Configuration & Environment Setup

Configure parameters using a `.env` file placed in the repository root directory:

```env
# Database Connection String
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<db>?sslmode=require

# Ingestion Range Configuration
CORP_ACT_LOOKAHEAD_DAYS=90
```

> [!NOTE]
> The historical lookback duration is controlled automatically by the pipeline. On the very first run (or after dropping the tables), the script will automatically perform a full lookback (~20 years). Subsequent runs retrieve the `last_run_date` and run in incremental mode.

---

## 🚀 Execution Instructions

### Run the Combined Pipeline (Recommended)

To run all ingestions in sequence (Corporate Actions ➔ Live News ➔ Custom Scan):

```bash
python main.py
```

### Run Scripts Individually

```bash
# Ingest corporate actions
python scripts/ingest_corporate_actions.py

# Ingest live market news
python scripts/ingest_live_news.py

# Ingest custom scan tickers
python scripts/ingest_custom_scan.py
```

---

## 📝 Logging Strategy

The logging framework splits logs into two channels to prevent local files from bloating:

1. **Console (stdout)**: Prints general progress, timing, page numbers, and upload confirmation counts in real time.
2. **Log Files (`logs/*.log`)**: Only record entries that were fetched but skipped.
   - `BATCH_DUP`: The record was present multiple times in the API payload itself.
   - `DB_EXISTS`: The record is already present in the database.
