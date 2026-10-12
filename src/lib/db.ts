import 'server-only';
import { loadEnvConfig } from '@next/env';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());

const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };
const globalForSupabase = globalThis as typeof globalThis & { supabaseClient?: SupabaseClient };

export const pool = globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') {
	globalForPg.pgPool = pool;
}

export function query<Row extends QueryResultRow = QueryResultRow>(
	text: string,
	values: (string | number | boolean | Date | null)[] = []
): Promise<QueryResult<Row>> {
	return pool.query<Row>(text, values);
}

export function getSupabaseClient(): SupabaseClient {
	if (globalForSupabase.supabaseClient) return globalForSupabase.supabaseClient;

	const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error('A Supabase URL and server-only secret key must be configured');
	}

	const client = createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	globalForSupabase.supabaseClient = client;
	return client;
}