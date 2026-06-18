export interface Env {
  DB: D1Database;
  USE_REMOTE_D1_HTTP?: string;
  CF_ACCOUNT_ID?: string;
  CF_D1_DATABASE_ID?: string;
  CF_API_TOKEN?: string;
}

export type User = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
};

export type DbStatement = {
  bind(...values: unknown[]): DbStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
};

export type DbClient = {
  prepare(query: string): DbStatement;
};
