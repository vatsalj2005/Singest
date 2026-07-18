"""
Data Access Layer — every table name, column list, and SQL template for the
Backend ingestion pipeline lives here.

If a table is renamed or a column changes, this is the ONLY file you need to
touch.  The individual ingest scripts import from here instead of hard-coding
table names / SQL.
"""

import os
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

_PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
_local_env = os.path.join(_PROJECT_ROOT, ".env")
_parent_env = os.path.join(os.path.dirname(_PROJECT_ROOT), ".env")
if os.path.exists(_local_env):
    load_dotenv(_local_env)
else:
    load_dotenv(_parent_env)

DATABASE_URL = os.getenv("DATABASE_URL")

# ---------------------------------------------------------------------------
# Table names — single source of truth
# ---------------------------------------------------------------------------

T_CUSTOM_SCAN = "custom_scan"
T_LIVE_NEWS = "live_news"
T_INGESTION_METADATA = "ingestion_metadata"

T_CA_DIVIDENDS = "corporate_actions_dividends"
T_CA_BONUS = "corporate_actions_bonus"
T_CA_SPLITS = "corporate_actions_splits"
T_CA_RIGHTS = "corporate_actions_rights"
T_CA_BUYBACKS = "corporate_actions_buybacks"
T_CA_QUARTERLY_RESULTS = "corporate_actions_quarterly_results"

# Ordered list of all corporate-action tables (used for init_tables, etc.)
CORPORATE_ACTION_TABLES = [
    T_CA_QUARTERLY_RESULTS,
    T_CA_BONUS,
    T_CA_DIVIDENDS,
    T_CA_SPLITS,
    T_CA_RIGHTS,
    T_CA_BUYBACKS,
]

# Maps API action-type strings to their table names
ACTION_TYPE_TO_TABLE = {
    "QUARTERLY RESULT ANNOUNCEMENT": T_CA_QUARTERLY_RESULTS,
    "BONUS": T_CA_BONUS,
    "DIVIDEND": T_CA_DIVIDENDS,
    "Splits": T_CA_SPLITS,
    "Rights": T_CA_RIGHTS,
    "Buyback": T_CA_BUYBACKS,
}

# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------

def get_connection():
    """Return a new psycopg2 connection using DATABASE_URL."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set in the environment or .env file.")
    return psycopg2.connect(DATABASE_URL)


# ---------------------------------------------------------------------------
# Ingestion metadata queries
# ---------------------------------------------------------------------------

def init_metadata_table():
    """CREATE TABLE IF NOT EXISTS for ingestion_metadata."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {T_INGESTION_METADATA} (
                    script_name VARCHAR(100) PRIMARY KEY,
                    last_run_date DATE NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                );
            """)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_last_run_date(script_name):
    """Return the last_run_date for *script_name*, or None if never run."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT last_run_date FROM {T_INGESTION_METADATA} WHERE script_name = %s",
                (script_name,),
            )
            row = cur.fetchone()
            return row[0] if row else None
    finally:
        conn.close()


def update_last_run_date(script_name, run_date):
    """Upsert the last_run_date for *script_name*."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
                INSERT INTO {T_INGESTION_METADATA} (script_name, last_run_date, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (script_name) DO UPDATE SET
                    last_run_date = EXCLUDED.last_run_date,
                    updated_at = EXCLUDED.updated_at
            """, (script_name, run_date))
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Corporate-actions table init + queries
# ---------------------------------------------------------------------------

def init_corporate_action_tables(logger):
    """CREATE TABLE IF NOT EXISTS for every corporate-action table."""
    logger.info("Initializing corporate actions tables...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for table in CORPORATE_ACTION_TABLES:
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


def load_existing_hashes(conn, table_name, logger):
    """Return the set of row_hash values already in *table_name*."""
    existing = set()
    with conn.cursor() as cur:
        try:
            cur.execute(f"SELECT row_hash FROM {table_name};")
            for row in cur.fetchall():
                existing.add(row[0])
        except Exception as e:
            logger.warning(f"Could not load existing records for {table_name}: {e}")
    return existing


def insert_corporate_action_records(table_name, records, logger):
    """Upsert corporate-action tuples into *table_name*."""
    if not records:
        return

    sql = f"""
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
            execute_values(cur, sql, records)
        conn.commit()
        logger.info(f"Inserted {len(records)} records into '{table_name}'.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to insert records into '{table_name}': {e}")
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# custom_scan table init + queries
# ---------------------------------------------------------------------------

def init_custom_scan_table(logger):
    """CREATE TABLE IF NOT EXISTS for custom_scan."""
    logger.info("Initializing custom_scan table...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {T_CUSTOM_SCAN} (
                isin VARCHAR(20) NOT NULL,
                sym VARCHAR(20) NOT NULL,
                disp_sym VARCHAR(100),
                exch VARCHAR(10),
                inst VARCHAR(20),
                seg VARCHAR(10),
                seosym VARCHAR(100),
                mcap DOUBLE PRECISION,
                mcapclass VARCHAR(50),
                pe DOUBLE PRECISION,
                div_yeild DOUBLE PRECISION,
                revenue DOUBLE PRECISION,
                year_1_revenue_growth DOUBLE PRECISION,
                net_profit_margin DOUBLE PRECISION,
                yoy_last_qtrly_profit_growth DOUBLE PRECISION,
                ebidta_margin DOUBLE PRECISION,
                volume BIGINT,
                price_perchng_1year DOUBLE PRECISION,
                price_perchng_3year DOUBLE PRECISION,
                price_perchng_5year DOUBLE PRECISION,
                ind_pe DOUBLE PRECISION,
                pb DOUBLE PRECISION,
                eps DOUBLE PRECISION,
                day_sma_50_current_candle DOUBLE PRECISION,
                day_sma_200_current_candle DOUBLE PRECISION,
                day_rsi_14_current_candle DOUBLE PRECISION,
                roce DOUBLE PRECISION,
                ltp DOUBLE PRECISION,
                roe DOUBLE PRECISION,
                rt_away_from_5_year_high DOUBLE PRECISION,
                rt_away_from_1_month_high DOUBLE PRECISION,
                high_5yr DOUBLE PRECISION,
                high_3yr DOUBLE PRECISION,
                high_1yr DOUBLE PRECISION,
                high_1wk DOUBLE PRECISION,
                price_perchng_1mon DOUBLE PRECISION,
                price_perchng_1week DOUBLE PRECISION,
                price_perchng_3mon DOUBLE PRECISION,
                yearly_earning_per_share DOUBLE PRECISION,
                ocf_growth_on_yr DOUBLE PRECISION,
                year_1_cagr_eps_growth DOUBLE PRECISION,
                net_change_in_cash DOUBLE PRECISION,
                free_cash_flow DOUBLE PRECISION,
                price_perchng_2week DOUBLE PRECISION,
                day_bb_upper_sub_bb_lower DOUBLE PRECISION,
                day_atr_14_current_candle_mul_2 DOUBLE PRECISION,
                min_5_high_current_candle DOUBLE PRECISION,
                min_15_high_current_candle DOUBLE PRECISION,
                min_5_ema_50_current_candle DOUBLE PRECISION,
                min_15_ema_50_current_candle DOUBLE PRECISION,
                min_15_sma_100_current_candle DOUBLE PRECISION,
                open DOUBLE PRECISION,
                bc_close DOUBLE PRECISION,
                rmp DOUBLE PRECISION,
                pledge_benefit DOUBLE PRECISION,
                lot_size INTEGER,
                low_1yr DOUBLE PRECISION,
                multiplier INTEGER,
                pchange DOUBLE PRECISION,
                pperchange DOUBLE PRECISION,
                tick_size DOUBLE PRECISION,
                fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
                PRIMARY KEY (isin)
            );
            """)
        conn.commit()
        logger.info("custom_scan table initialized successfully.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to initialize table: {e}")
        raise e
    finally:
        conn.close()


def load_existing_isins(conn, logger):
    """Return the set of ISINs already in custom_scan."""
    existing = set()
    with conn.cursor() as cur:
        try:
            cur.execute(f"SELECT isin FROM {T_CUSTOM_SCAN};")
            for row in cur.fetchall():
                existing.add(row[0])
        except Exception as e:
            logger.warning(f"Could not load existing records: {e}")
    return existing


def upsert_custom_scan_records(records, logger):
    """Upsert custom_scan tuples."""
    if not records:
        return

    sql = f"""
        INSERT INTO {T_CUSTOM_SCAN} (
            isin, sym, disp_sym, exch, inst, seg, seosym, mcap, mcapclass, pe, div_yeild, revenue,
            year_1_revenue_growth, net_profit_margin, yoy_last_qtrly_profit_growth, ebidta_margin, volume,
            price_perchng_1year, price_perchng_3year, price_perchng_5year, ind_pe, pb, eps,
            day_sma_50_current_candle, day_sma_200_current_candle, day_rsi_14_current_candle, roce, ltp, roe,
            rt_away_from_5_year_high, rt_away_from_1_month_high, high_5yr, high_3yr, high_1yr, high_1wk,
            price_perchng_1mon, price_perchng_1week, price_perchng_3mon, yearly_earning_per_share,
            ocf_growth_on_yr, year_1_cagr_eps_growth, net_change_in_cash, free_cash_flow, price_perchng_2week,
            day_bb_upper_sub_bb_lower, day_atr_14_current_candle_mul_2, min_5_high_current_candle,
            min_15_high_current_candle, min_5_ema_50_current_candle, min_15_ema_50_current_candle,
            min_15_sma_100_current_candle, open, bc_close, rmp, pledge_benefit, lot_size, low_1yr,
            multiplier, pchange, pperchange, tick_size, fetched_at
        ) VALUES %s
        ON CONFLICT (isin) DO UPDATE SET
            sym = EXCLUDED.sym,
            disp_sym = EXCLUDED.disp_sym,
            exch = EXCLUDED.exch,
            inst = EXCLUDED.inst,
            seg = EXCLUDED.seg,
            seosym = EXCLUDED.seosym,
            mcap = EXCLUDED.mcap,
            mcapclass = EXCLUDED.mcapclass,
            pe = EXCLUDED.pe,
            div_yeild = EXCLUDED.div_yeild,
            revenue = EXCLUDED.revenue,
            year_1_revenue_growth = EXCLUDED.year_1_revenue_growth,
            net_profit_margin = EXCLUDED.net_profit_margin,
            yoy_last_qtrly_profit_growth = EXCLUDED.yoy_last_qtrly_profit_growth,
            ebidta_margin = EXCLUDED.ebidta_margin,
            volume = EXCLUDED.volume,
            price_perchng_1year = EXCLUDED.price_perchng_1year,
            price_perchng_3year = EXCLUDED.price_perchng_3year,
            price_perchng_5year = EXCLUDED.price_perchng_5year,
            ind_pe = EXCLUDED.ind_pe,
            pb = EXCLUDED.pb,
            eps = EXCLUDED.eps,
            day_sma_50_current_candle = EXCLUDED.day_sma_50_current_candle,
            day_sma_200_current_candle = EXCLUDED.day_sma_200_current_candle,
            day_rsi_14_current_candle = EXCLUDED.day_rsi_14_current_candle,
            roce = EXCLUDED.roce,
            ltp = EXCLUDED.ltp,
            roe = EXCLUDED.roe,
            rt_away_from_5_year_high = EXCLUDED.rt_away_from_5_year_high,
            rt_away_from_1_month_high = EXCLUDED.rt_away_from_1_month_high,
            high_5yr = EXCLUDED.high_5yr,
            high_3yr = EXCLUDED.high_3yr,
            high_1yr = EXCLUDED.high_1yr,
            high_1wk = EXCLUDED.high_1wk,
            price_perchng_1mon = EXCLUDED.price_perchng_1mon,
            price_perchng_1week = EXCLUDED.price_perchng_1week,
            price_perchng_3mon = EXCLUDED.price_perchng_3mon,
            yearly_earning_per_share = EXCLUDED.yearly_earning_per_share,
            ocf_growth_on_yr = EXCLUDED.ocf_growth_on_yr,
            year_1_cagr_eps_growth = EXCLUDED.year_1_cagr_eps_growth,
            net_change_in_cash = EXCLUDED.net_change_in_cash,
            free_cash_flow = EXCLUDED.free_cash_flow,
            price_perchng_2week = EXCLUDED.price_perchng_2week,
            day_bb_upper_sub_bb_lower = EXCLUDED.day_bb_upper_sub_bb_lower,
            day_atr_14_current_candle_mul_2 = EXCLUDED.day_atr_14_current_candle_mul_2,
            min_5_high_current_candle = EXCLUDED.min_5_high_current_candle,
            min_15_high_current_candle = EXCLUDED.min_15_high_current_candle,
            min_5_ema_50_current_candle = EXCLUDED.min_5_ema_50_current_candle,
            min_15_ema_50_current_candle = EXCLUDED.min_15_ema_50_current_candle,
            min_15_sma_100_current_candle = EXCLUDED.min_15_sma_100_current_candle,
            open = EXCLUDED.open,
            bc_close = EXCLUDED.bc_close,
            rmp = EXCLUDED.rmp,
            pledge_benefit = EXCLUDED.pledge_benefit,
            lot_size = EXCLUDED.lot_size,
            low_1yr = EXCLUDED.low_1yr,
            multiplier = EXCLUDED.multiplier,
            pchange = EXCLUDED.pchange,
            pperchange = EXCLUDED.pperchange,
            tick_size = EXCLUDED.tick_size,
            fetched_at = EXCLUDED.fetched_at;
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, records)
        conn.commit()
        logger.info(f"Upserted {len(records)} records into {T_CUSTOM_SCAN}.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to upsert records: {e}")
        raise e
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# live_news table init + queries
# ---------------------------------------------------------------------------

def init_live_news_table(logger):
    """CREATE TABLE IF NOT EXISTS for live_news."""
    logger.info("Initializing live_news table...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {T_LIVE_NEWS} (
                    article_id BIGINT PRIMARY KEY,
                    title TEXT NOT NULL,
                    text TEXT,
                    overall_sentiment VARCHAR(50),
                    category VARCHAR(100),
                    sub_category VARCHAR(100),
                    publish_date TIMESTAMP WITH TIME ZONE,
                    stock_name VARCHAR(255),
                    isin_code VARCHAR(50),
                    sm_symbol VARCHAR(100),
                    nse_scrip_code INTEGER,
                    bse_scrip_code INTEGER,
                    seo_symbol VARCHAR(100),
                    display_symbol VARCHAR(100),
                    article_slug VARCHAR(255),
                    article_cat VARCHAR(100),
                    article_subcat VARCHAR(100),
                    metadata_json JSONB,
                    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL
                );
            """)
        conn.commit()
        logger.info("live_news table initialized successfully.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to initialize table: {e}")
        raise
    finally:
        conn.close()


def load_existing_article_ids(conn, logger):
    """Return the set of article_id values already in live_news."""
    existing = set()
    with conn.cursor() as cur:
        try:
            cur.execute(f"SELECT article_id FROM {T_LIVE_NEWS};")
            for row in cur.fetchall():
                existing.add(row[0])
        except Exception as e:
            logger.warning(f"Could not load existing records: {e}")
    return existing


def insert_live_news_records(records, logger):
    """Upsert live_news tuples."""
    if not records:
        return

    sql = f"""
        INSERT INTO {T_LIVE_NEWS} (
            article_id, title, text, overall_sentiment, category, sub_category,
            publish_date, stock_name, isin_code, sm_symbol, nse_scrip_code,
            bse_scrip_code, seo_symbol, display_symbol, article_slug,
            article_cat, article_subcat, metadata_json, fetched_at
        ) VALUES %s
        ON CONFLICT (article_id) DO UPDATE SET
            title = EXCLUDED.title,
            text = EXCLUDED.text,
            overall_sentiment = EXCLUDED.overall_sentiment,
            category = EXCLUDED.category,
            sub_category = EXCLUDED.sub_category,
            publish_date = EXCLUDED.publish_date,
            stock_name = EXCLUDED.stock_name,
            isin_code = EXCLUDED.isin_code,
            sm_symbol = EXCLUDED.sm_symbol,
            nse_scrip_code = EXCLUDED.nse_scrip_code,
            bse_scrip_code = EXCLUDED.bse_scrip_code,
            seo_symbol = EXCLUDED.seo_symbol,
            display_symbol = EXCLUDED.display_symbol,
            article_slug = EXCLUDED.article_slug,
            article_cat = EXCLUDED.article_cat,
            article_subcat = EXCLUDED.article_subcat,
            metadata_json = EXCLUDED.metadata_json,
            fetched_at = EXCLUDED.fetched_at;
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, records)
        conn.commit()
        logger.info(f"Inserted {len(records)} records into {T_LIVE_NEWS}.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to insert news: {e}")
        raise
    finally:
        conn.close()
