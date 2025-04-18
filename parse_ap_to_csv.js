// Node.js script to parse custom .ap file and output to CSV using PapaParse (ESM version)
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import readline from 'readline';
import cliProgress from 'cli-progress';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to input and output files
// Accept input and output file paths as command line arguments
const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'data', 'test.ap');
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, 'data', 'test.csv');

console.log(`Input file: ${inputPath}`);
console.log(`Output file: ${outputPath}`);

// List of field names, in order, as per your table
const FIELD_NAMES = [
  'trading_partner_code', 'detail_record_id', 'manufacturer_part_no', 'td_synnex_internal_use',
  'td_synnex_sku', 'status_code', 'part_description', 'manufacturer_name',
  'td_synnex_internal_use2', 'qty_on_hand_total', 'td_synnex_internal_use3',
  'td_synnex_internal_use4', 'contract_price', 'msrp', 'warehouse_qty_miami_fl',
  'warehouse_qty_tracy_ca_dartmouth_ns', 'returnable_flag', 'warehouse_qty_reserved',
  'parcel_shippable', 'warehouse_qty_calgary_alberta', 'unit_cost',
  'warehouse_qty_romeoville_il_guelph_ontario', 'media_type', 'warehouse_qty_southaven_ms',
  'td_synnex_category_code', 'warehouse_qty_reserved2', 'td_synnex_internal_use5',
  'ship_weight', 'serialized_flag', 'warehouse_qty_columbus_oh', 'map_price',
  'coo_list', 'td_synnex_hc_price', 'upc_code', 'unspsc_code', 'td_synnex_internal_use6',
  'sku_created_date', 'sku_attributes', 'eta_date', 'abc_code', 'kit_stand_alone_flag',
  'state_gov_price', 'federal_gov_price', 'educational_price', 'taa_flag', 'gsa_pricing',
  'promotion_flag', 'promotion_comment', 'promotion_expiration_date', 'long_description1',
  'long_description2', 'long_description3', 'length', 'width', 'height',
  'warehouse_qty_suwanee_ga', 'gsa_nte_price', 'platform_type', 'product_description_fr',
  'product_street_date', 'warehouse_qty_chino_ca_mississauga_ontario',
  'warehouse_qty_swedesboro_nj_richmond_bc', 'warehouse_qty_south_bend_in',
  'warehouse_qty_fort_worth_tx', 'replacement_sku', 'minimum_order_qty',
  'purchasing_requirements', 'gov_class', 'warehouse_qty_fontana_ca',
  'mfg_drop_ship_warehouse_qty', 'created_at', 'updated_at'
];

// List of fields that should be numeric (update as needed)
const NUMERIC_FIELDS = [
  'td_synnex_sku', 'qty_on_hand_total', 'td_synnex_internal_use3', 'td_synnex_internal_use4',
  'contract_price', 'msrp', 'warehouse_qty_miami_fl', 'warehouse_qty_tracy_ca_dartmouth_ns',
  'warehouse_qty_reserved', 'warehouse_qty_calgary_alberta', 'unit_cost',
  'warehouse_qty_romeoville_il_guelph_ontario', 'warehouse_qty_southaven_ms',
  'warehouse_qty_reserved2', 'td_synnex_internal_use5', 'ship_weight',
  'warehouse_qty_columbus_oh', 'map_price', 'td_synnex_hc_price',
  'length', 'width', 'height', 'warehouse_qty_suwanee_ga', 'gsa_nte_price',
  'warehouse_qty_chino_ca_mississauga_ontario', 'warehouse_qty_swedesboro_nj_richmond_bc',
  'warehouse_qty_south_bend_in', 'warehouse_qty_fort_worth_tx', 'minimum_order_qty',
  'warehouse_qty_fontana_ca', 'mfg_drop_ship_warehouse_qty', 'state_gov_price',
  'federal_gov_price', 'educational_price'
];

// Streaming and batching logic with progress bar
const BATCH_SIZE = 1000;
let batch = [];
let isFirstBatch = true;
let totalRecords = 0;
let processedLines = 0;
let totalLines = 0;

// First, count total lines for progress bar
function countLines(filePath) {
  return new Promise((resolve) => {
    let count = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(count));
  });
}

(async () => {
  totalLines = await countLines(inputPath);
  const progressBar = new cliProgress.SingleBar({
    format: 'Processing |{bar}| {percentage}% || {value}/{total} lines',
    barCompleteChar: '\u2588',
    barIncompleteChar: '-',
    hideCursor: true
  });
  progressBar.start(totalLines, 0);

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity
  });

  // Remove old output file if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  function writeBatch(records, writeHeader) {
    if (records.length === 0) return;
    const csv = Papa.unparse(records, { columns: FIELD_NAMES, header: writeHeader });
    fs.appendFileSync(outputPath, csv + '\n', 'utf8');
  }

  rl.on('line', (line) => {
    processedLines++;
    progressBar.update(processedLines);
    if (line.trim()) {
      const values = line.split('~');
      if (values[1] && values[1].trim() === 'HDR') {
        // Skip header record
        return;
      }
      const record = {};
      FIELD_NAMES.forEach((key, idx) => {
        let value = values[idx] !== undefined ? values[idx].trim() : '';
        if (NUMERIC_FIELDS.includes(key) && value && isNaN(Number(value))) {
          value = '';
        }
        record[key] = value;
      });
      batch.push(record);
      totalRecords++;
      if (batch.length >= BATCH_SIZE) {
        writeBatch(batch, isFirstBatch);
        isFirstBatch = false;
        batch = [];
      }
    }
  });

  rl.on('close', () => {
    if (batch.length > 0) {
      writeBatch(batch, isFirstBatch);
    }
    progressBar.update(totalLines);
    progressBar.stop();
    console.log(`Parsed ${totalRecords} records to ${outputPath}`);
  });
})();

