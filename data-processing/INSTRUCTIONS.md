# Synnex Price Tool: Import & Processing Instructions

## Overview
This tool allows you to efficiently parse large `.ap` files, convert them to `.csv`, and import them into a Postgres/Supabase database with robust validation, deduplication, and logging. The process is fully streaming and memory-safe, supporting millions of records and very large files.

---

## 1. Parse `.ap` File to `.csv` (Streaming & Memory-Efficient)

This command converts your `.ap` file to a `.csv` file using a streaming, line-by-line process (no memory issues, works for huge files):

```powershell
pnpm exec node parse_ap_to_csv.js data/627674.ap data/full-627674.csv
```
- **Input:** `data/627674.ap` (your raw data file)
- **Output:** `data/full-627674.csv` (ready for DB import)
- You can change the filenames as needed for other imports.

---

## 2. Import `.csv` into Postgres/Supabase (Safe Batching & Validation)

This command streams the `.csv` into your Postgres/Supabase database, with automatic batch sizing, deduplication, update-on-conflict, and robust date validation:

```powershell
node --max-old-space-size=4096 run_full_import.js --input data/627674.ap --output data/full-627674.csv --db postgres --table synnex_flat_file --batch 500
```
- `--max-old-space-size=4096` prevents Node memory errors.
- `--input` and `--output` should match your files.
- `--db` is your database name.
- `--table` is your target table.
- `--batch 500` is a safe batch size (script will auto-reduce if needed).

---

## How This Works

1. **Parsing (`parse_ap_to_csv.js`):**
   - Reads your `.ap` file line by line.
   - Converts each line to a CSV row, writing directly to disk (no full-file memory use).
   - Handles field mapping and escaping.
   - Shows a progress bar for parsing.

2. **Importing (`run_full_import.js`):**
   - Reads the CSV in a streaming fashion.
   - Batches rows for efficient DB insertion, auto-adjusting to avoid Postgres limits.
   - Validates date/timestamp fields (invalid dates are set to `null`).
   - Uses `ON CONFLICT ... DO UPDATE` to deduplicate and update by primary key.
   - Logs progress and all output to a timestamped log file.
   - Shows a progress bar for the DB import.

---

## Typical Workflow Example

```powershell
pnpm exec node parse_ap_to_csv.js data/627674.ap data/full-627674.csv
node --max-old-space-size=4096 run_full_import.js --input data/627674.ap --output data/full-627674.csv --db postgres --table synnex_flat_file --batch 500 --logDir logs
```

Or, run both commands one after another in PowerShell.

- You can use the `--logDir <folder>` option with `run_full_import.js` to specify where log files should be placed. If not provided, logs are saved in the current directory.

---

## Troubleshooting & Tips

- If you get memory errors, try lowering the batch size (e.g., `--batch 200`).
- If you get date/time errors, make sure your `.ap` file columns match your DB schema.
- All logs are saved in a `run_YYYY-MM-DDTHH-MM-SS.log` file for each run.

---

**Keep this guide handy for all future imports! If you need to automate or customize further, just ask.**
