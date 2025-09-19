import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

let pool;
function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function one(q, params = []) {
  const { rows } = await getPool().query(q + " LIMIT 1", params);
  return rows[0] || null;
}
export async function many(q, params = []) {
  const { rows } = await getPool().query(q, params);
  return rows;
}
export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
