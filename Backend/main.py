import os
import sys
import subprocess
import time
from datetime import datetime, date

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Ensure dal.py can be imported from Backend/
sys.path.insert(0, PROJECT_ROOT)
from dal import update_last_run_date


# List of scripts to run in order
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, "scripts")
SCRIPTS = [
    os.path.join(SCRIPTS_DIR, "ingest_corporate_actions.py"),
    os.path.join(SCRIPTS_DIR, "ingest_live_news.py"),
    os.path.join(SCRIPTS_DIR, "ingest_custom_scan.py"),
]


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
