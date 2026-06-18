import { json } from "./http";
const dbTimeoutMs = 8e3;
function getDb(env) {
  if (env.USE_REMOTE_D1_HTTP !== "true") {
    return env.DB;
  }
  if (!env.CF_ACCOUNT_ID || !env.CF_D1_DATABASE_ID || !env.CF_API_TOKEN) {
    throw new Error("Remote D1 HTTP API credentials are not configured.");
  }
  return new HttpD1Database(env.CF_ACCOUNT_ID, env.CF_D1_DATABASE_ID, env.CF_API_TOKEN);
}
class HttpD1Database {
  constructor(accountId, databaseId, apiToken) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
  }
  prepare(query) {
    return new HttpD1Statement(this, query);
  }
  async query(sql, params) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sql, params })
      }
    );
    const payload = await response.json();
    const result = payload.result?.[0];
    if (!response.ok || !payload.success || !result?.success) {
      const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ");
      throw new Error(message || "Remote D1 HTTP API request failed.");
    }
    return result;
  }
}
class HttpD1Statement {
  constructor(database, query) {
    this.database = database;
    this.query = query;
  }
  params = [];
  bind(...values) {
    this.params = values;
    return this;
  }
  async first() {
    const result = await this.database.query(this.query, this.params);
    return result.results?.[0] ?? null;
  }
  run() {
    return this.database.query(this.query, this.params);
  }
  all() {
    return this.database.query(this.query, this.params);
  }
}
async function withDbTimeout(operation) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Database request timed out.")), dbTimeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
function dbUnavailableResponse() {
  return json({ error: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8FDC\u7A0B D1 \u914D\u7F6E\u6216\u8FDE\u63A5\u3002" }, { status: 504 });
}
export {
  dbUnavailableResponse,
  getDb,
  withDbTimeout
};
