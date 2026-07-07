import { Pool } from "pg";

declare global {
  var __mix10PgPool: Pool | undefined;
  var __mix10SchemaReady: Promise<void> | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add a Postgres database and connect it to this service.");
  }
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
}

export function getPool(): Pool {
  if (!global.__mix10PgPool) {
    global.__mix10PgPool = createPool();
  }
  return global.__mix10PgPool;
}

async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS license_keys (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      duration_days INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      activated_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      revoked BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS trial_claims (
      ip TEXT PRIMARY KEY,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export function ensureSchema(): Promise<void> {
  if (!global.__mix10SchemaReady) {
    global.__mix10SchemaReady = initSchema();
  }
  return global.__mix10SchemaReady;
}
