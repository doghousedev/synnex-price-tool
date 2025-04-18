import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import pkg from 'pg';
import { parseApToCsv } from './parse_ap_to_csv.js';

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
  const file = fs.readFileSync(csvPath, 'utf8');
  const { data, errors } = Papa.parse(file, { header: true, skipEmptyLines: true });
  if (errors.length) {
    throw new Error('CSV parse errors: ' + JSON.stringify(errors));
  }
  const columns = Object.keys(data[0]);
  let inserted = 0;
  const TIMESTAMP_COLUMNS = ['created_at', 'updated_at']; // Add other timestamp columns if needed
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
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
    const query = `INSERT INTO ${table} (${columns.map(c => '"' + c + '"').join(',')}) VALUES ${placeholders}`;
    await client.query(query, flatValues);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${data.length}`);
  }
  console.log(`Import complete: ${inserted} rows inserted into ${table}`);
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
    console.error('Error during full import:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
