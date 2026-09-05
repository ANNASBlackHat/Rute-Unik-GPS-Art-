import { Client, QueryResult, QueryResultRow } from 'pg';

/**
 * Resolves the appropriate PostgreSQL connection string.
 *
 * Supabase direct database hosts (db.<ref>.supabase.co) use IPv6-only addresses.
 * Serverless platforms like Vercel often do not have IPv6 routing and fail with:
 *   getaddrinfo ENOTFOUND db.<ref>.supabase.co
 *
 * For project 'xtzqtjtksaqsgtyfcexf', the database is located in Tokyo (ap-northeast-1).
 * The Supabase Supavisor pooler is:
 *   aws-0-ap-northeast-1.pooler.supabase.com:5432 (Session mode)
 *   User: postgres.xtzqtjtksaqsgtyfcexf
 */

const KNOWN_PROJECT_REF = 'xtzqtjtksaqsgtyfcexf';
const KNOWN_POOLER_REGION = 'aws-0-ap-northeast-1';

export function getPoolerUrl(ref = KNOWN_PROJECT_REF, password?: string): string {
  const pass = password || process.env.DB_PASS;
  if (!pass) {
    throw new Error(
      'DB_PASS (or a password inside DATABASE_URL / DATABASE_POOLER_URL) must be set to build the pooler connection string.',
    );
  }
  return `postgresql://postgres.${ref}:${pass}@${KNOWN_POOLER_REGION}.pooler.supabase.com:5432/postgres`;
}

export function sanitizeConnectionString(connStr?: string | null): string | null {
  if (!connStr) return null;

  try {
    const url = new URL(connStr);
    const host = url.hostname;

    // Fix incorrect region ap-southeast-1 -> ap-northeast-1 for this project
    if (host.includes('aws-0-ap-southeast-1.pooler.supabase.com')) {
      url.hostname = `${KNOWN_POOLER_REGION}.pooler.supabase.com`;
    }

    return url.toString();
  } catch {
    return connStr;
  }
}

export function getPrimaryAndFallbackConnections(): { primary: string; fallback: string } {
  const envUrl = process.env.DATABASE_URL;
  const poolerEnv = process.env.DATABASE_POOLER_URL || process.env.POSTGRES_URL;

  // Derive password if present in any env var
  let password = process.env.DB_PASS;
  if (!password && envUrl) {
    try {
      password = new URL(envUrl).password;
    } catch {}
  }

  const defaultPooler = getPoolerUrl(KNOWN_PROJECT_REF, password);

  if (!envUrl) {
    const sanitizedPooler = sanitizeConnectionString(poolerEnv) || defaultPooler;
    return { primary: sanitizedPooler, fallback: defaultPooler };
  }

  // If DATABASE_URL is already a pooler, sanitize and use
  if (envUrl.includes('.pooler.supabase.com')) {
    const sanitized = sanitizeConnectionString(envUrl) || defaultPooler;
    return { primary: sanitized, fallback: defaultPooler };
  }

  // If DATABASE_URL is a direct supabase host (db.<ref>.supabase.co),
  // derive pooler URL as fallback or primary when IPv6 fails
  let ref = KNOWN_PROJECT_REF;
  try {
    const m = new URL(envUrl).hostname.match(/^db\.([^.]+)\.supabase\.co$/);
    if (m) ref = m[1];
  } catch {}

  const derivedPooler = getPoolerUrl(ref, password);
  const primary = sanitizeConnectionString(envUrl) || envUrl;
  const fallback = sanitizeConnectionString(poolerEnv) || derivedPooler;

  return { primary, fallback };
}

export async function getDbClient(): Promise<Client> {
  const { primary, fallback } = getPrimaryAndFallbackConnections();

  const connectWithTimeout = async (connStr: string, timeoutMs = 4000): Promise<Client> => {
    const isRemote = connStr.includes('supabase.co') || connStr.includes('pooler.supabase.com');
    const client = new Client({
      connectionString: connStr,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: timeoutMs,
    });
    await client.connect();
    return client;
  };

  try {
    return await connectWithTimeout(primary);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const isDnsOrUserError =
      msg.includes('ENOTFOUND') ||
      msg.includes('getaddrinfo') ||
      msg.includes('tenant/user') ||
      msg.includes('timeout expired') ||
      msg.includes('ETIMEDOUT');

    if (isDnsOrUserError && fallback && fallback !== primary) {
      console.warn(`Primary DB failed (${msg}). Switching to pooler fallback...`);
      return await connectWithTimeout(fallback, 6000);
    }
    throw err;
  }
}

export async function queryDb<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await getDbClient();
  try {
    return await client.query<T>(text, params);
  } finally {
    await client.end();
  }
}
