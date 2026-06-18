import type { DbClient, DbStatement, Env } from "../types";
import { json } from "./http";

const dbTimeoutMs = 8000;

export function getDb(env: Env): DbClient {
  if (env.USE_REMOTE_D1_HTTP !== "true") {
    return env.DB;
  }

  if (!env.CF_ACCOUNT_ID || !env.CF_D1_DATABASE_ID || !env.CF_API_TOKEN) {
    throw new Error("Remote D1 HTTP API credentials are not configured.");
  }

  return new HttpD1Database(env.CF_ACCOUNT_ID, env.CF_D1_DATABASE_ID, env.CF_API_TOKEN);
}

class HttpD1Database implements DbClient {
  constructor(
    private readonly accountId: string,
    private readonly databaseId: string,
    private readonly apiToken: string
  ) {}

  prepare(query: string): DbStatement {
    return new HttpD1Statement(this, query);
  }

  async query(sql: string, params: unknown[]): Promise<D1Result> {
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
    const payload = await response.json<{
      success: boolean;
      errors?: Array<{ message?: string }>;
      result?: D1Result[];
    }>();
    const result = payload.result?.[0];

    if (!response.ok || !payload.success || !result?.success) {
      const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ");
      throw new Error(message || "Remote D1 HTTP API request failed.");
    }

    return result;
  }
}

class HttpD1Statement implements DbStatement {
  private params: unknown[] = [];

  constructor(
    private readonly database: HttpD1Database,
    private readonly query: string
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.params = values;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    const result = await this.database.query(this.query, this.params);
    return (result.results?.[0] as T | undefined) ?? null;
  }

  run(): Promise<D1Result> {
    return this.database.query(this.query, this.params);
  }

  all<T = unknown>(): Promise<D1Result<T>> {
    return this.database.query(this.query, this.params) as Promise<D1Result<T>>;
  }
}

export async function withDbTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
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

export function dbUnavailableResponse(): Response {
  return json({ error: "数据库连接失败，请检查远程 D1 配置或连接。" }, { status: 504 });
}
