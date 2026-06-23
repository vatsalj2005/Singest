import os
import sys
import time
import logging
import hashlib
from datetime import datetime, timedelta, date
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Project root is one level up from this script's directory (scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables (from Backend/.env or parent Next.js root folder .env)
local_env = os.path.join(PROJECT_ROOT, ".env")
parent_env = os.path.join(os.path.dirname(PROJECT_ROOT), ".env")
if os.path.exists(local_env):
    load_dotenv(local_env)
else:
    load_dotenv(parent_env)


DATABASE_URL = os.getenv("DATABASE_URL")
LOOKAHEAD_DAYS = int(os.getenv("CORP_ACT_LOOKAHEAD_DAYS", 90))
INITIAL_LOOKBACK_DAYS = 7300  # ~20 years for first run

# ---------------------------------------------------------------------------
# Logging Setup
#   Console (stdout): all progress/info messages
#   File (logs/ingest_corporate_actions.log): ONLY skipped/duplicate records
# ---------------------------------------------------------------------------
logs_dir = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(logs_dir, exist_ok=True)

logger = logging.getLogger("ingest_corporate_actions")
logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s'))
logger.addHandler(console_handler)

skip_logger = logging.getLogger("skipped_corporate_actions")
skip_logger.setLevel(logging.INFO)
skip_logger.propagate = False
skip_file_handler = logging.FileHandler(os.path.join(logs_dir, "ingest_corporate_actions.log"), encoding='utf-8')
skip_file_handler.setFormatter(logging.Formatter('%(asctime)s [SKIPPED] %(message)s'))
skip_logger.addHandler(skip_file_handler)

HEADERS = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'content-type': 'application/json; charset=UTF-8',
    'origin': 'https://dhan.co',
    'referer': 'https://dhan.co/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
}

# Per-action-type hash fields
HASH_FIELDS = {
    "QUARTERLY RESULT ANNOUNCEMENT": ["isin", "ann_date", "ann_ltp", "ex_date"],
    "BONUS": ["isin", "ann_date", "ann_ltp", "ex_date"],
    "DIVIDEND": ["isin", "ann_date", "ann_ltp", "ex_date"],
    "Splits": ["isin", "ann_date", "ann_ltp", "ex_date"],
    "Rights": ["isin", "ann_date", "ann_ltp", "ex_date"],
    "Buyback": ["isin", "ann_date", "ann_ltp", "ex_date"],
}

# ── Helpers ────────────────────────────────────────────────────────────────

def get_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set in the environment or .env file.")
    return psycopg2.connect(DATABASE_URL)


def calculate_row_hash(record, act_type):
    """SHA-256 hash using only the columns specified for this action type."""
    fields = HASH_FIELDS.get(act_type, ["isin", "ex_date"])
    hash_str = "|".join(str(record.get(f)) for f in fields)
    return hashlib.sha256(hash_str.encode('utf-8')).hexdigest()


def load_existing_hashes(conn, table_name):
    existing = set()
    with conn.cursor() as cur:
        try:
            cur.execute(f"SELECT row_hash FROM {table_name};")
            for row in cur.fetchall():
                existing.add(row[0])
        except Exception as e:
            logger.warning(f"Could not load existing records for {table_name}: {e}")
    return existing


# ── Metadata table (resume-from-last-run) ──────────────────────────────────

def init_metadata_table():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ingestion_metadata (
                    script_name VARCHAR(100) PRIMARY KEY,
                    last_run_date DATE NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                );
            """)
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to initialize metadata table: {e}")
        raise
    finally:
        conn.close()


def get_last_run_date(script_name):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT last_run_date FROM ingestion_metadata WHERE script_name = %s",
                (script_name,),
            )
            row = cur.fetchone()
            return row[0] if row else None
    finally:
        conn.close()


def update_last_run_date(script_name, run_date):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ingestion_metadata (script_name, last_run_date, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (script_name) DO UPDATE SET
                    last_run_date = EXCLUDED.last_run_date,
                    updated_at = EXCLUDED.updated_at
            """, (script_name, run_date))
        conn.commit()
    finally:
        conn.close()


# ── Table initialisation ───────────────────────────────────────────────────

def init_tables():
    logger.info("Initializing corporate actions tables...")
    corp_tables = [
        "corporate_actions_quarterly_results",
        "corporate_actions_bonus",
        "corporate_actions_dividends",
        "corporate_actions_splits",
        "corporate_actions_rights",
        "corporate_actions_buybacks",
    ]

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for table in corp_tables:
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table} (
                        row_hash VARCHAR(64) PRIMARY KEY,
                        isin VARCHAR(20) NOT NULL,
                        sym VARCHAR(20) NOT NULL,
                        disp_sym VARCHAR(100),
                        exch VARCHAR(10),
                        inst VARCHAR(20),
                        seg VARCHAR(10),
                        seosym VARCHAR(100),
                        ltp DOUBLE PRECISION,
                        volume BIGINT,
                        pchange DOUBLE PRECISION,
                        pperchange DOUBLE PRECISION,
                        act_type VARCHAR(100) NOT NULL,
                        ann_date DATE,
                        ann_ltp DOUBLE PRECISION,
                        div_type VARCHAR(50),
                        ex_date DATE,
                        note TEXT,
                        rec_date DATE,
                        rmk TEXT,
                        fetched_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """)
        conn.commit()
        logger.info("Corporate actions tables initialized successfully.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to initialize tables: {e}")
        raise
    finally:
        conn.close()


# ── Network helpers ────────────────────────────────────────────────────────

def make_post_request(session, url, json_payload, timeout=15, max_retries=5, initial_backoff=2):
    backoff = initial_backoff
    for attempt in range(max_retries):
        try:
            response = session.post(url, json=json_payload, headers=HEADERS, timeout=timeout)
            if response.status_code == 200:
                return response
            elif response.status_code in (429, 502, 503, 504):
                logger.warning(f"Got status {response.status_code} on attempt {attempt + 1}. Retrying in {backoff}s...")
                time.sleep(backoff)
                backoff *= 2
            else:
                logger.error(f"Request failed with status {response.status_code}")
                return response
        except (requests.exceptions.RequestException, Exception) as e:
            logger.warning(f"Request exception on attempt {attempt + 1}: {e}. Retrying in {backoff}s...")
            time.sleep(backoff)
            backoff *= 2
    return None


def clean_date(date_str):
    if not date_str or date_str in ("NA", "null", "None"):
        return None
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        logger.warning(f"Could not parse date: {date_str}")
        return None


def clean_float(value):
    if value is None or value in ("NA", "null", "None"):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def clean_int(value):
    if value is None or value in ("NA", "null", "None"):
        return None
    try:
        return int(value)
    except ValueError:
        return None


# ── Fetch from API ─────────────────────────────────────────────────────────

def fetch_corporate_actions(session, act_type, start_date, end_date, existing_keys):
    url = "https://ow-scanx-analytics.dhan.co/customscan/fetchdt"
    pgno = 1
    has_more = True
    fetched_records = []

    while has_more:
        payload = {
            "data": {
                "sort": "CorpAct.ExDate",
                "sorder": "asc",
                "count": 50,
                "params": [
                    {"field": "Seg", "op": "", "val": "E"},
                    {"field": "OgInst", "op": "", "val": "ES"},
                    {"field": "CorpAct.ActType", "op": "", "val": act_type},
                    {"field": "CorpAct.ExDate", "op": "lte", "val": end_date},
                    {"field": "CorpAct.ExDate", "op": "gte", "val": start_date},
                ],
                "fields": ["CorpAct.ActType", "Sym", "PPerchange"],
                "pgno": pgno,
            }
        }

        try:
            response = make_post_request(session, url, payload, timeout=15)
            if not response or response.status_code != 200:
                logger.error(
                    f"Error fetching page {pgno} for {act_type}: "
                    f"Status {response.status_code if response else 'Timeout'}"
                )
                break

            res_data = response.json()
            items = res_data.get("data", [])
            if not items:
                break

            new_items_count = 0
            page_records = []

            for item in items:
                isin = item.get("Isin")
                sym = item.get("Sym")
                disp_sym = item.get("DispSym")
                exch = item.get("Exch")
                inst = item.get("Inst")
                seg = item.get("Seg")
                seosym = item.get("Seosym")
                ltp = clean_float(item.get("Ltp"))
                volume = clean_int(item.get("Volume"))
                pchange = clean_float(item.get("Pchange"))
                pperchange = clean_float(item.get("PPerchange"))

                corp_acts = item.get("CorpAct", [])
                for act in corp_acts:
                    act_t = act.get("ActType", act_type)
                    ann_date = clean_date(act.get("AnnDate"))
                    ann_ltp = clean_float(act.get("AnnLtp"))
                    div_type = act.get("DivType")
                    ex_date = clean_date(act.get("ExDate"))
                    note = act.get("Note")
                    rec_date = clean_date(act.get("RecDate"))
                    rmk = act.get("Rmk")

                    if not isin:
                        continue

                    record = {
                        "isin": isin, "sym": sym, "disp_sym": disp_sym,
                        "exch": exch, "inst": inst, "seg": seg, "seosym": seosym,
                        "ltp": ltp, "volume": volume, "pchange": pchange,
                        "pperchange": pperchange, "act_type": act_t,
                        "ann_date": ann_date, "ann_ltp": ann_ltp,
                        "div_type": div_type, "ex_date": ex_date,
                        "note": note, "rec_date": rec_date, "rmk": rmk,
                    }

                    row_hash = calculate_row_hash(record, act_type)
                    record["row_hash"] = row_hash

                    if row_hash not in existing_keys:
                        new_items_count += 1

                    page_records.append(record)

            if new_items_count > 0:
                logger.info(f"Fetched page {pgno} with {new_items_count} new items for {act_type}")

            fetched_records.extend(page_records)

            tot_pg = res_data.get("tot_pg", pgno)
            if pgno >= tot_pg:
                has_more = False
            else:
                pgno += 1
                time.sleep(0.5)

        except Exception as e:
            logger.error(f"Exception fetching page {pgno} for {act_type}: {e}")
            break

    return fetched_records


# ── Insert new records ─────────────────────────────────────────────────────

def insert_records(table_name, records):
    if not records:
        return

    query = f"""
        INSERT INTO {table_name} (
            row_hash, isin, sym, disp_sym, exch, inst, seg, seosym,
            ltp, volume, pchange, pperchange,
            act_type, ann_date, ann_ltp, div_type, ex_date, note, rec_date, rmk,
            fetched_at
        ) VALUES %s
        ON CONFLICT (row_hash) DO UPDATE SET
            isin = EXCLUDED.isin,
            sym = EXCLUDED.sym,
            disp_sym = EXCLUDED.disp_sym,
            exch = EXCLUDED.exch,
            inst = EXCLUDED.inst,
            seg = EXCLUDED.seg,
            seosym = EXCLUDED.seosym,
            ltp = EXCLUDED.ltp,
            volume = EXCLUDED.volume,
            pchange = EXCLUDED.pchange,
            pperchange = EXCLUDED.pperchange,
            ann_date = EXCLUDED.ann_date,
            ann_ltp = EXCLUDED.ann_ltp,
            div_type = EXCLUDED.div_type,
            ex_date = EXCLUDED.ex_date,
            note = EXCLUDED.note,
            rec_date = EXCLUDED.rec_date,
            rmk = EXCLUDED.rmk,
            fetched_at = EXCLUDED.fetched_at;
    """

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            execute_values(cur, query, records)
        conn.commit()
        logger.info(f"Inserted {len(records)} records into '{table_name}'.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to insert records into '{table_name}': {e}")
        raise
    finally:
        conn.close()


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    logger.info("Starting corporate actions ingestion pipeline...")
    init_tables()
    init_metadata_table()

    today = date.today()

    # ── Resume logic ──
    last_run = get_last_run_date("corporate_actions")
    if last_run:
        start_date = (last_run - timedelta(days=5)).strftime("%Y-%m-%d")
        logger.info(f"Resuming from last run: {last_run}. Fetching from {start_date}.")
    else:
        start_date = (today - timedelta(days=INITIAL_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
        logger.info(f"First run detected. Fetching full history from {start_date}.")

    end_date = (today + timedelta(days=LOOKAHEAD_DAYS)).strftime("%Y-%m-%d")
    logger.info(f"Date range: {start_date} -> {end_date}")
    fetched_at = datetime.now()

    action_types = {
        "QUARTERLY RESULT ANNOUNCEMENT": "corporate_actions_quarterly_results",
        "BONUS": "corporate_actions_bonus",
        "DIVIDEND": "corporate_actions_dividends",
        "Splits": "corporate_actions_splits",
        "Rights": "corporate_actions_rights",
        "Buyback": "corporate_actions_buybacks",
    }

    session = requests.Session()

    for act_type, table_name in action_types.items():
        logger.info(f"--- Fetching for type: {act_type} ---")

        # Load database state for this table
        conn = get_connection()
        existing_records = load_existing_hashes(conn, table_name)
        conn.close()

        logger.info(f"DB state: existing_keys={len(existing_records)}")

        records = fetch_corporate_actions(session, act_type, start_date, end_date, existing_records)
        if not records:
            logger.info(f"No records fetched for {act_type}.")
            continue

        logger.info(f"Fetched {len(records)} total records for {act_type}. Processing duplicates...")

        # ── De-duplicate (new records only) ──
        unique_new = {}
        existing_keys = set(existing_records)
        new_count = 0
        skipped_count = 0

        for r in records:
            key = r["row_hash"]

            if key in unique_new:
                # Duplicate within this batch
                skip_logger.info(
                    f"{act_type} | BATCH_DUP | isin={r['isin']} | ex_date={r.get('ex_date')} | hash={key[:16]}"
                )
                skipped_count += 1
                continue

            if key in existing_keys:
                # Already in database
                skip_logger.info(
                    f"{act_type} | DB_EXISTS | isin={r['isin']} | ex_date={r.get('ex_date')} | hash={key[:16]}"
                )
                skipped_count += 1
                continue

            new_count += 1
            existing_keys.add(key)
            unique_new[key] = r

        if new_count > 0:
            formatted_tuples = []
            for r in unique_new.values():
                formatted_tuples.append((
                    r["row_hash"], r["isin"], r["sym"], r["disp_sym"],
                    r["exch"], r["inst"], r["seg"], r["seosym"],
                    r["ltp"], r["volume"], r["pchange"], r["pperchange"],
                    r["act_type"], r["ann_date"], r["ann_ltp"], r["div_type"],
                    r["ex_date"], r["note"], r["rec_date"], r["rmk"],
                    fetched_at,
                ))

            logger.info(f"Inserting {new_count} new records into '{table_name}' (skipped {skipped_count})...")
            insert_records(table_name, formatted_tuples)
        else:
            logger.info(f"No new records for {act_type}. Skipped {skipped_count} existing.")

    logger.info("Corporate actions ingestion completed successfully.")


if __name__ == "__main__":
    main()
