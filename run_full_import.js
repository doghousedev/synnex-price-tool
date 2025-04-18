// NOTE: For large imports, run with increased memory, e.g.:
//   node --max-old-space-size=4096 run_full_import.js ...
// If you see 'heap out of memory', increase the value further.
//
// If you haven't already:
//   pnpm add cli-progress

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import pkg from 'pg';
import cliProgress from 'cli-progress';
import { parseApToCsv } from './parse_ap_to_csv.js';

// --- Logging setup ---
const now = new Date();
const pad = n => n.toString().padStart(2, '0');
const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const logPath = `run_${timestamp}.log`;
const logStream = fs.createWriteStream(logPath, { flags: 'a' });
const origConsoleLog = console.log;
const origConsoleError = console.error;
console.log = (...args) => {
  origConsoleLog(...args);
  logStream.write(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n');
};
console.error = (...args) => {
  origConsoleError(...args);
  logStream.write('[ERROR] ' + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n');
};

const { Client } = pkg;

// --- CLI argument parsing ---
const args = process.argv.slice(2);
function getArg(flag, def) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return def;
}

const inputPath = getArg('--input', path.join('data', 'test.ap'));
const outputPath = getArg('--output', path.join('data', 'test.csv'));
const dbName = getArg('--db', process.env.PGDATABASE || 'postgres');
const tableName = getArg('--table', 'synnex_flat_file');
const batchSize = parseInt(getArg('--batch', '500'), 10);

console.log(`Input: ${inputPath}`);
console.log(`Output: ${outputPath}`);
console.log(`Database: ${dbName}`);
console.log(`Table: ${tableName}`);
console.log(`Batch size: ${batchSize}`);

// --- Database connection setup ---
const client = process.env.DATABASE_URL
  ? new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Client({
      host: process.env.PGHOST,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      database: dbName,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false },
    });

async function importCsvToDb(csvPath, table, batchSize) {
  // Track record stats
  let totalImported = 0;
  let totalUpdated = 0;
  let columns = null;
  let totalRows = 0;
  const TIMESTAMP_COLUMNS = ['created_at', 'updated_at'];

  // First, count the number of rows for progress bar
  await new Promise((resolve, reject) => {
    let rowCount = 0;
    Papa.parse(fs.createReadStream(csvPath), {
      header: true,
      skipEmptyLines: true,
      step: () => { rowCount++; },
      complete: () => { totalRows = rowCount; resolve(); },
      error: reject
    });
  });

  const totalBatches = Math.ceil(totalRows / batchSize);
  const bar = new cliProgress.SingleBar({
    format: 'DB Import |{bar}| {percentage}% || {value}/{total} batches',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  bar.start(totalBatches, 0);

  // Now, stream and batch insert
  await new Promise((resolve, reject) => {
    let batch = [];
    Papa.parse(fs.createReadStream(csvPath), {
      header: true,
      skipEmptyLines: true,
      step: async (results, parser) => {
        if (!columns) columns = Object.keys(results.data);
        batch.push(results.data);
        if (batch.length >= batchSize) {
          parser.pause();
          await insertBatch(batch);
          batch = [];
          bar.increment();
          parser.resume();
        }
      },
      complete: async () => {
        if (batch.length > 0) {
          await insertBatch(batch);
          bar.increment();
        }
        bar.stop();
        console.log(`\nImport complete for table ${table}:`);
        console.log(`  Imported: ${totalImported}`);
        console.log(`  Updated: ${totalUpdated}`);
        resolve();
      },
      error: reject
    });

    async function insertBatch(batch) {
      const pk = 'td_synnex_sku';
      const updateColumns = columns.filter(col => col !== pk);
      const updateSet = updateColumns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');
      const values = batch.map(row =>
        columns.map(col => {
          if (TIMESTAMP_COLUMNS.includes(col) && (!row[col] || row[col].trim() === '')) {
            return null;
          }
          return row[col] === '' ? null : row[col];
        })
      );
      const placeholders = values.map(
        (row, r) => '(' + row.map((_, c) => `$${r * columns.length + c + 1}`).join(',') + ')'
      ).join(', ');
      const flatValues = values.flat();
      const query = `INSERT INTO ${table} (${columns.map(c => '"' + c + '"').join(',')}) VALUES ${placeholders} ON CONFLICT (${pk}) DO UPDATE SET ${updateSet} RETURNING xmax`;
      const result = await client.query(query, flatValues);
      const batchInserted = result.rows.filter(row => row.xmax === '0' || row.xmax === 0).length;
      const batchUpdated = result.rows.length - batchInserted;
      totalImported += batchInserted;
      totalUpdated += batchUpdated;
    }
  });
}


(async () => {
  try {
    // 1. Parse .ap to CSV
    await parseApToCsv(inputPath, outputPath);
    // 2. Connect to DB
    await client.connect();
    // 3. Import CSV
    await importCsvToDb(outputPath, tableName, batchSize);
  } catch (err) {
    console.error('Error during import:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
    logStream.end();
  }
})();
