import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

// Read connection info from environment variables
const client = new Client({
  host: process.env.PGHOST || 'db.sczeulxpzarqlzdxhzsf.supabase.co',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: 'Scooby1962$$##@@!!', // TEMP: hardcoded for testing
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres!');
    const res = await client.query('SELECT NOW() as now');
    console.log('Server time:', res.rows[0].now);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.end();
  }
}

testConnection();
