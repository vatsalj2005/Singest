import os
import sys
import time
import logging
from datetime import datetime
import requests
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

# Ensure dal.py can be imported from Backend/
sys.path.insert(0, PROJECT_ROOT)
from dal import (
    get_connection,
    init_custom_scan_table,
    load_existing_isins,
    upsert_custom_scan_records,
)

# ---------------------------------------------------------------------------
# Logging Setup
#   Console (stdout): all progress/info messages
#   File (logs/ingest_custom_scan.log): ONLY skipped/duplicate records
# ---------------------------------------------------------------------------
logs_dir = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(logs_dir, exist_ok=True)

logger = logging.getLogger("ingest_custom_scan")
logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s'))
logger.addHandler(console_handler)

skip_logger = logging.getLogger("skipped_custom_scan")
skip_logger.setLevel(logging.INFO)
skip_logger.propagate = False
skip_file_handler = logging.FileHandler(os.path.join(logs_dir, "ingest_custom_scan.log"), encoding='utf-8')
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

def main():
    logger.info("Starting custom scan ingestion...")
    init_custom_scan_table(logger)
    
    # Load database state
    conn = get_connection()
    existing_records = load_existing_isins(conn, logger)
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
        upsert_custom_scan_records(formatted_tuples, logger)
    else:
        logger.info(f"Updating {len(formatted_tuples)} existing records in custom_scan (skipped {skipped_count})...")
        upsert_custom_scan_records(formatted_tuples, logger)
        
    logger.info("Custom scan ingestion completed successfully.")

if __name__ == "__main__":
    main()
