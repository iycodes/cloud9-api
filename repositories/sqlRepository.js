export function createSqlRepository(pool) {
  async function query(text, params = []) {
    const result = await pool.query(text, params);
    return result.rows;
  }

  async function one(text, params = []) {
    const rows = await query(text, params);
    return rows[0] ?? null;
  }

  async function withTransaction(work) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    query,
    one,
    withTransaction,
  };
}

