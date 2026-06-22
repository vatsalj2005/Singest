import os
import sys
import time
import logging
from datetime import datetime
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

# ---------------------------------------------------------------------------
# Logging Setup
#   Console (stdout): all progress/info messages
#   File (logs/ingest_custom_scan.log): ONLY skipped/duplicate records
# ---------------------------------------------------------------------------
logger = logging.getLogger("ingest_custom_scan")
logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s'))
logger.addHandler(console_handler)

skip_logger = logging.getLogger("skipped_custom_scan")
skip_logger.setLevel(logging.INFO)
skip_logger.propagate = False
skip_file_handler = logging.FileHandler(os.path.join(PROJECT_ROOT, "logs", "ingest_custom_scan.log"), encoding='utf-8')
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

def get_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set in the environment or .env file.")
    return psycopg2.connect(DATABASE_URL)

def load_existing_isins(conn):
    existing = set()
    with conn.cursor() as cur:
        try:
            cur.execute("SELECT isin FROM custom_scan;")
            for row in cur.fetchall():
                existing.add(row[0])
        except Exception as e:
            logger.warning(f"Could not load existing records: {e}")
    return existing


def init_table():
    logger.info("Initializing custom_scan table...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS custom_scan (
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

def make_post_request(session, url, json_payload, timeout=20, max_retries=5, initial_backoff=2):
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

def fetch_custom_scan(session, existing_keys):
    url = "https://ow-scanx-analytics.dhan.co/customscan/fetchdt"
    pgno = 1
    has_more = True
    fetched_records = []
    
    fields = [
        "Mcapclass", "Isin", "DispSym", "Mcap", "Pe", "DivYeild", "Revenue", "Year1RevenueGrowth",
        "NetProfitMargin", "YoYLastQtrlyProfitGrowth", "EBIDTAMargin", "volume", "PricePerchng1year",
        "PricePerchng3year", "PricePerchng5year", "Ind_Pe", "Pb", "Eps", "DaySMA50CurrentCandle",
        "DaySMA200CurrentCandle", "DayRSI14CurrentCandle", "ROCE", "Ltp", "Roe", "RtAwayFrom5YearHigh",
        "RtAwayFrom1MonthHigh", "High5yr", "High3Yr", "High1Yr", "High1Wk", "Sym", "PricePerchng1mon",
        "PricePerchng1week", "PricePerchng3mon", "YearlyEarningPerShare", "OCFGrowthOnYr",
        "Year1CAGREPSGrowth", "NetChangeInCash", "FreeCashFlow", "PricePerchng2week",
        "DayBbUpper_Sub_BbLower", "DayATR14CurrentCandleMul_2", "Min5HighCurrentCandle",
        "Min15HighCurrentCandle", "Min5EMA50CurrentCandle", "Min15EMA50CurrentCandle",
        "Min15SMA100CurrentCandle", "Open", "BcClose", "Rmp", "PledgeBenefit"
    ]
    
    logger.info("Starting API fetch for custom scan...")
    while has_more:
        payload = {
            "data": {
                "sort": "Mcap",
                "sorder": "desc",
                "count": 50,
                "params": [
                    {"field": "OgInst", "op": "", "val": "ES"},
                    {"field": "Exch", "op": "", "val": "NSE"}
                ],
                "fields": fields,
                "pgno": pgno
            }
        }
        
        try:
            response = make_post_request(session, url, payload, timeout=20)
            if not response or response.status_code != 200:
                logger.error(f"Error fetching page {pgno}: Status {response.status_code if response else 'Timeout'}")
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
                if not isin or not sym:
                    continue
                    
                record = {
                    "isin": isin, "sym": sym, "disp_sym": item.get("DispSym"), "exch": item.get("Exch"),
                    "inst": item.get("Inst"), "seg": item.get("Seg"), "seosym": item.get("Seosym"),
                    "mcap": clean_float(item.get("Mcap")), "mcapclass": item.get("Mcapclass"),
                    "pe": clean_float(item.get("Pe")), "div_yeild": clean_float(item.get("DivYeild")),
                    "revenue": clean_float(item.get("Revenue")),
                    "year_1_revenue_growth": clean_float(item.get("Year1RevenueGrowth")),
                    "net_profit_margin": clean_float(item.get("NetProfitMargin")),
                    "yoy_last_qtrly_profit_growth": clean_float(item.get("YoYLastQtrlyProfitGrowth")),
                    "ebidta_margin": clean_float(item.get("EBIDTAMargin")), "volume": clean_int(item.get("volume")),
                    "price_perchng_1year": clean_float(item.get("PricePerchng1year")),
                    "price_perchng_3year": clean_float(item.get("PricePerchng3year")),
                    "price_perchng_5year": clean_float(item.get("PricePerchng5year")),
                    "ind_pe": clean_float(item.get("Ind_Pe")), "pb": clean_float(item.get("Pb")),
                    "eps": clean_float(item.get("Eps")),
                    "day_sma_50_current_candle": clean_float(item.get("DaySMA50CurrentCandle")),
                    "day_sma_200_current_candle": clean_float(item.get("DaySMA200CurrentCandle")),
                    "day_rsi_14_current_candle": clean_float(item.get("DayRSI14CurrentCandle")),
                    "roce": clean_float(item.get("ROCE")), "ltp": clean_float(item.get("Ltp")),
                    "roe": clean_float(item.get("Roe")),
                    "rt_away_from_5_year_high": clean_float(item.get("RtAwayFrom5YearHigh")),
                    "rt_away_from_1_month_high": clean_float(item.get("RtAwayFrom1MonthHigh")),
                    "high_5yr": clean_float(item.get("High5yr")), "high_3yr": clean_float(item.get("High3Yr")),
                    "high_1yr": clean_float(item.get("High1Yr")), "high_1wk": clean_float(item.get("High1Wk")),
                    "price_perchng_1mon": clean_float(item.get("PricePerchng1mon")),
                    "price_perchng_1week": clean_float(item.get("PricePerchng1week")),
                    "price_perchng_3mon": clean_float(item.get("PricePerchng3mon")),
                    "yearly_earning_per_share": clean_float(item.get("YearlyEarningPerShare")),
                    "ocf_growth_on_yr": clean_float(item.get("OCFGrowthOnYr")),
                    "year_1_cagr_eps_growth": clean_float(item.get("Year1CAGREPSGrowth")),
                    "net_change_in_cash": clean_float(item.get("NetChangeInCash")),
                    "free_cash_flow": clean_float(item.get("FreeCashFlow")),
                    "price_perchng_2week": clean_float(item.get("PricePerchng2week")),
                    "day_bb_upper_sub_bb_lower": clean_float(item.get("DayBbUpper_Sub_BbLower")),
                    "day_atr_14_current_candle_mul_2": clean_float(item.get("DayATR14CurrentCandleMul_2")),
                    "min_5_high_current_candle": clean_float(item.get("Min5HighCurrentCandle")),
                    "min_15_high_current_candle": clean_float(item.get("Min15HighCurrentCandle")),
                    "min_5_ema_50_current_candle": clean_float(item.get("Min5EMA50CurrentCandle")),
                    "min_15_ema_50_current_candle": clean_float(item.get("Min15EMA50CurrentCandle")),
                    "min_15_sma_100_current_candle": clean_float(item.get("Min15SMA100CurrentCandle")),
                    "open": clean_float(item.get("Open")), "bc_close": clean_float(item.get("BcClose")),
                    "rmp": clean_float(item.get("Rmp")), "pledge_benefit": clean_float(item.get("PledgeBenefit")),
                    "lot_size": clean_int(item.get("LotSize")), "low_1yr": clean_float(item.get("Low1Yr")),
                    "multiplier": clean_int(item.get("Multiplier")), "pchange": clean_float(item.get("Pchange")),
                    "pperchange": clean_float(item.get("PPerchange")), "tick_size": clean_float(item.get("TickSize"))
                }
                
                if isin not in existing_keys:
                    new_items_count += 1
                page_records.append(record)
                
            if new_items_count > 0:
                logger.info(f"Fetched page {pgno} with {new_items_count} new items.")
                
            fetched_records.extend(page_records)
                
            tot_pg = res_data.get("tot_pg", pgno)
            if pgno >= tot_pg:
                has_more = False
            else:
                pgno += 1
                time.sleep(0.5)
        except Exception as e:
            logger.error(f"Exception fetching page {pgno}: {e}")
            break
            
    return fetched_records

def upsert_records(records):
    if not records:
        return
        
    query = """
        INSERT INTO custom_scan (
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
            execute_values(cur, query, records)
        conn.commit()
        logger.info(f"Upserted {len(records)} records into custom_scan.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to upsert records: {e}")
        raise e
    finally:
        conn.close()

def main():
    logger.info("Starting custom scan ingestion...")
    init_table()
    
    # Load database state
    conn = get_connection()
    existing_records = load_existing_isins(conn)
    conn.close()
    
    logger.info(f"Loaded database state. Total existing keys: {len(existing_records)}")
    
    session = requests.Session()
    records = fetch_custom_scan(session, existing_records)
    if not records:
        logger.info("No records fetched.")
        return
        
    # De-duplicate statefully
    unique_records = {}
    existing_keys = set(existing_records)
    new_records_count = 0
    skipped_count = 0
    for r in records:
        key = r["isin"]
        if key in unique_records:
            skip_logger.info(f"BATCH_DUP | isin={key}")
            skipped_count += 1
            continue
            
        if key not in existing_keys:
            new_records_count += 1
            existing_keys.add(key)
            
        unique_records[key] = r
        
    fetched_at = datetime.now()
    formatted_tuples = []
    for r in unique_records.values():
        tup = (
            r["isin"], r["sym"], r["disp_sym"], r["exch"], r["inst"], r["seg"], r["seosym"],
            r["mcap"], r["mcapclass"], r["pe"], r["div_yeild"], r["revenue"],
            r["year_1_revenue_growth"], r["net_profit_margin"], r["yoy_last_qtrly_profit_growth"], r["ebidta_margin"],
            r["volume"], r["price_perchng_1year"], r["price_perchng_3year"], r["price_perchng_5year"],
            r["ind_pe"], r["pb"], r["eps"], r["day_sma_50_current_candle"], r["day_sma_200_current_candle"],
            r["day_rsi_14_current_candle"], r["roce"], r["ltp"], r["roe"], r["rt_away_from_5_year_high"],
            r["rt_away_from_1_month_high"], r["high_5yr"], r["high_3yr"], r["high_1yr"], r["high_1wk"],
            r["price_perchng_1mon"], r["price_perchng_1week"], r["price_perchng_3mon"], r["yearly_earning_per_share"],
            r["ocf_growth_on_yr"], r["year_1_cagr_eps_growth"], r["net_change_in_cash"], r["free_cash_flow"],
            r["price_perchng_2week"], r["day_bb_upper_sub_bb_lower"], r["day_atr_14_current_candle_mul_2"],
            r["min_5_high_current_candle"], r["min_15_high_current_candle"], r["min_5_ema_50_current_candle"],
            r["min_15_ema_50_current_candle"], r["min_15_sma_100_current_candle"], r["open"], r["bc_close"],
            r["rmp"], r["pledge_benefit"], r["lot_size"], r["low_1yr"], r["multiplier"], r["pchange"],
            r["pperchange"], r["tick_size"], fetched_at
        )
        formatted_tuples.append(tup)
        
    if new_records_count > 0:
        logger.info(f"Writing {len(formatted_tuples)} records ({new_records_count} new, skipped {skipped_count}) to custom_scan...")
        upsert_records(formatted_tuples)
    else:
        logger.info(f"Updating {len(formatted_tuples)} existing records in custom_scan (skipped {skipped_count})...")
        upsert_records(formatted_tuples)
        
    logger.info("Custom scan ingestion completed successfully.")

if __name__ == "__main__":
    main()
