import { loadEnvConfig } from '@next/env';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

loadEnvConfig(process.cwd());

const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };

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