import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

const rawUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('Missing DIRECT_DATABASE_URL or DATABASE_URL in root .env');
  process.exit(1);
}

const cs = rawUrl.replace(/[?&]sslmode=[^&]*/g, '');

async function connectClient() {
  try {
    const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    await c.connect();
    return c;
  } catch (err) {
    const u = new URL(cs);
    const refMatch = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!refMatch) throw err;
    u.hostname = 'aws-1-ap-south-1.pooler.supabase.com';
    u.username = `postgres.${refMatch[1]}`;
    u.port = '5432';
    const c = new pg.Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } });
    await c.connect();
    return c;
  }
}

const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
const files = [
  '001_mudra_schema.sql',
  '002_mudra_rpc.sql',
  '003_mudra_realtime_storage.sql',
  '004_mudra_upi.sql',
];

async function main() {
  const client = await connectClient();
  console.log('Connected to Postgres (DATABASE_URL=***)');

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    console.log(`Applying ${file}...`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Applied ${file} successfully.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed ${file}:`, err.message);
      throw err;
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash';
  if (geminiKey) {
    await client.query(
      `insert into mudra.secrets(key, value) values ('gemini_api_key', $1)
       on conflict (key) do update set value = excluded.value`,
      [geminiKey]
    );
  }
  await client.query(
    `insert into mudra.secrets(key, value) values ('gemini_model', $1)
     on conflict (key) do update set value = excluded.value`,
    [geminiModel]
  );
  console.log('Upserted mudra.secrets (gemini_api_key=***, gemini_model=' + geminiModel + ')');

  await client.query(`notify pgrst, 'reload schema'`);
  console.log('Executed notify pgrst, reload schema');
  await client.end();
}

main().catch((err) => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
