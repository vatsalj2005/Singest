import os
import sys
import time
import logging
import json
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
    init_live_news_table,
    load_existing_article_ids,
    insert_live_news_records,
)

# ---------------------------------------------------------------------------
# Logging Setup
#   Console (stdout): all progress/info messages
#   File (logs/ingest_live_news.log): ONLY skipped/duplicate records
# ---------------------------------------------------------------------------
logs_dir = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(logs_dir, exist_ok=True)

logger = logging.getLogger("ingest_live_news")
logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s'))
logger.addHandler(console_handler)

skip_logger = logging.getLogger("skipped_live_news")
skip_logger.setLevel(logging.INFO)
skip_logger.propagate = False
skip_file_handler = logging.FileHandler(os.path.join(logs_dir, "ingest_live_news.log"), encoding='utf-8')
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


def clean_int(value):
    if value is None or value in ("NA", "null", "None"):
        return None
    try:
        return int(value)
    except ValueError:
        return None


# ── Fetch from API ─────────────────────────────────────────────────────────

def fetch_live_news(session, existing_keys):
    url = "https://news-live.dhan.co/v2/news/getLiveNews"
    categories_list = [[], ["stocks"]]
    all_news_items = {}

    for cats in categories_list:
        payload = {
            "categories": cats,
            "page_no": 0,
            "limit": 100,
            "first_news_timeStamp": 0,
            "last_news_timeStamp": 0,
            "news_feed_type": "live",
            "stock_list": ["ALL"],
            "sub_category": ["ALL"],
            "entity_id": "",
        }

        try:
            logger.info(f"Fetching news for categories: {cats}")
            response = make_post_request(session, url, payload, timeout=15)
            if not response or response.status_code != 200:
                logger.error(f"Error fetching news for {cats}: Status {response.status_code if response else 'Timeout'}")
                continue

            res_json = response.json()
            data = res_json.get("data", {})
            latest_news = data.get("latest_news", [])

            new_news_count = 0
            for item in latest_news:
                article_id = item.get("article_id")
                if not article_id:
                    continue
                if article_id not in existing_keys:
                    new_news_count += 1
                all_news_items[article_id] = item

            if new_news_count > 0:
                logger.info(f"Fetched {len(latest_news)} items ({new_news_count} new) for categories {cats}")
        except Exception as e:
            logger.error(f"Exception fetching news for {cats}: {e}")

    return list(all_news_items.values())


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    logger.info("Starting live news ingestion...")
    init_live_news_table(logger)

    # Load database state
    conn = get_connection()
    existing_records = load_existing_article_ids(conn, logger)
    conn.close()

    logger.info(
        f"Loaded database state. Total existing keys: {len(existing_records)}"
    )

    session = requests.Session()
    items = fetch_live_news(session, existing_records)
    if not items:
        logger.info("No news items fetched.")
        return

    # ── Process items: only insert new ones, skip existing ──
    new_items = []
    skipped_count = 0
    seen_ids = set()

    for item in items:
        art_id = item.get("article_id")
        if not art_id:
            continue

        if art_id in seen_ids:
            skip_logger.info(f"BATCH_DUP | article_id={art_id}")
            skipped_count += 1
            continue
        seen_ids.add(art_id)

        if art_id in existing_records:
            skip_logger.info(f"DB_EXISTS | article_id={art_id}")
            skipped_count += 1
            continue

        new_items.append(item)

    if new_items:
        fetched_at = datetime.now()
        formatted_tuples = []
        for item in new_items:
            news_obj = item.get("news_object", {})
            title = news_obj.get("title", "")
            text = news_obj.get("text", "")
            sentiment = news_obj.get("overall_sentiment", "")

            pub_date_raw = item.get("publish_date")
            publish_date = None
            if pub_date_raw:
                try:
                    publish_date = datetime.fromtimestamp(pub_date_raw / 1000.0)
                except Exception:
                    pass

            metadata = item.get("metadata", {})
            metadata_json = json.dumps(metadata)

            tup = (
                item.get("article_id"), title, text, sentiment,
                item.get("category"), item.get("sub_category"),
                publish_date, item.get("stock_name"), item.get("isin_code"),
                item.get("sm_symbol"),
                clean_int(item.get("nse_scrip_code")),
                clean_int(item.get("bse_scrip_code")),
                item.get("seo_symbol"), item.get("display_symbol"),
                item.get("article_slug"), item.get("article_cat"),
                item.get("article_subcat"), metadata_json,
                fetched_at,
            )
            formatted_tuples.append(tup)

        logger.info(f"Inserting {len(new_items)} new news records (skipped {skipped_count})...")
        insert_live_news_records(formatted_tuples, logger)
    else:
        logger.info(f"No new news records. Skipped {skipped_count} existing.")

    logger.info("Live news ingestion completed successfully.")


if __name__ == "__main__":
    main()
