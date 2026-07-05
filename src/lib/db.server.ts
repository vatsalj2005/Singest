import pg from "pg";

declare global {
  var __singestPool: pg.Pool | undefined;
}

export function getPool(): pg.Pool {
  if (!globalThis.__singestPool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL not set");
    // Tolerate values pasted as `DATABASE_URL=postgres://...`
    connectionString = connectionString.replace(/^\s*DATABASE_URL\s*=\s*/i, "").trim();
    globalThis.__singestPool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return globalThis.__singestPool;
}

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(text, params);
  return res.rows as T[];
}
