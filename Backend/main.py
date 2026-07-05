import os
import sys
import subprocess
import time
from datetime import datetime, date
import psycopg2
from dotenv import load_dotenv

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Load environment variables (from Backend/.env or parent Next.js root folder .env)
local_env = os.path.join(PROJECT_ROOT, ".env")
parent_env = os.path.join(os.path.dirname(PROJECT_ROOT), ".env")
if os.path.exists(local_env):
    load_dotenv(local_env)
else:
    load_dotenv(parent_env)


# List of scripts to run in order
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, "scripts")
SCRIPTS = [
    os.path.join(SCRIPTS_DIR, "ingest_corporate_actions.py"),
    os.path.join(SCRIPTS_DIR, "ingest_live_news.py"),
    os.path.join(SCRIPTS_DIR, "ingest_custom_scan.py"),
]


def update_last_run_date(script_name, run_date):
    """Update ingestion_metadata only after all scripts succeed."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not set. Cannot update last run date.")
        return
    conn = psycopg2.connect(database_url)
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
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Updated last run date for '{script_name}' to {run_date}.")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Failed to update last run date: {e}")
    finally:
        conn.close()


def run_script(script_path):
    display_name = os.path.basename(script_path)
    print(f"\n========================================================")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] STARTING: {display_name}")
    print(f"========================================================\n")
    
    start_time = time.time()
    try:
        # Run script and stream output directly to console
        process = subprocess.Popen(
            [sys.executable, script_path],
            stdout=sys.stdout,
            stderr=sys.stderr,
            text=True
        )
        process.wait()
        
        duration = time.time() - start_time
        print(f"\n========================================================")
        if process.returncode == 0:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] SUCCESS: {display_name}")
            print(f"Duration: {duration:.2f} seconds")
            print(f"========================================================\n")
            return True
        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] FAILED: {display_name} (Exit Code: {process.returncode})")
            print(f"Duration: {duration:.2f} seconds")
            print(f"========================================================\n")
            return False
            
    except Exception as e:
        duration = time.time() - start_time
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR launching {display_name}: {e}")
        print(f"Duration: {duration:.2f} seconds\n")
        return False

def main():
    print(f"Starting combined ingestion pipeline at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    failed_scripts = []
    
    for script in SCRIPTS:
        success = run_script(script)
        if not success:
            failed_scripts.append(script)
            
    print("\n========================================================")
    print("Ingestion Pipeline Run Summary:")
    print("========================================================")
    for script in SCRIPTS:
        display_name = os.path.basename(script)
        status = "FAILED" if script in failed_scripts else "SUCCESS"
        print(f"- {display_name:30} : {status}")
    print("========================================================\n")
    
    if failed_scripts:
        print("Pipeline finished with errors. Last run date NOT updated.")
        sys.exit(1)
    else:
        # Update metadata only when ALL scripts succeed
        update_last_run_date("corporate_actions", date.today())
        print("Pipeline finished successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
