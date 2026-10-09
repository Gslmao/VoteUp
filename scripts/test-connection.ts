import { pool, query } from '../src/lib/db';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required; configure it for the disposable development database');
  }

  const expectedTables = [
  'states',
  'constituencies',
  'parties',
  'candidates',
  'nominations',
  'voters',
  'elections',
  'polling_booths',
  'evms',
  'has_voted',
  'vote_events',
  'results',
  'complaints',
  'observers',
  'audit_log',
  ];

  try {
  const tables = await query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const names = tables.rows.map((row) => row.table_name);
  const baseTables = names.filter((name) => name !== 'admins');
  const missing = expectedTables.filter((name) => !baseTables.includes(name));
  const unexpected = baseTables.filter((name) => !expectedTables.includes(name));

  console.log('Base tables:', baseTables.join(', '));
  console.log('Additive auth tables:', names.includes('admins') ? 'admins' : 'none');

  if (!names.includes('admins')) {
    throw new Error('Expected admins from the additive sql/03_auth.sql migration');
  }
  if (missing.length || unexpected.length) {
    throw new Error(`Table mismatch. Missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}`);
  }

  const procedure = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = 'cast_vote'
         AND p.prokind = 'p'
     ) AS exists`
  );
  if (!procedure.rows[0]?.exists) throw new Error('cast_vote procedure not found');
  console.log('cast_vote: present');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});