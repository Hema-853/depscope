import neo4j, { Driver, Session } from "neo4j-driver";

/**
 * CognoDB speaks openCypher over Bolt, so the official Neo4j driver works
 * unmodified — we just point it at the CognoDB Cloud URI.
 *
 * The driver is memoized on `globalThis` so hot-reloads in dev (and
 * concurrent server actions) don't open a new connection pool per request.
 */

declare global {
  // eslint-disable-next-line no-var
  var __depscopeDriver: Driver | undefined;
}

export class DbConfigError extends Error {}
export class DbConnectionError extends Error {}

function buildDriver(): Driver {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    throw new DbConfigError(
      "Missing CognoDB connection details. Set COGNODB_URI, COGNODB_USER and " +
        "COGNODB_PASSWORD (see .env.example)."
    );
  }

  return neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });
}

export function getDriver(): Driver {
  if (!global.__depscopeDriver) {
    global.__depscopeDriver = buildDriver();
  }
  return global.__depscopeDriver;
}

/**
 * Run a unit of work against a fresh session, translating driver-level
 * connectivity failures into a typed error the API routes can render
 * nicely instead of a raw stack trace.
 */
export async function withSession<T>(
  work: (session: Session) => Promise<T>
): Promise<T> {
  let driver: Driver;
  try {
    driver = getDriver();
  } catch (err) {
    if (err instanceof DbConfigError) throw err;
    throw new DbConnectionError("Could not initialize the database driver.");
  }

  const session = driver.session();
  try {
    return await work(session);
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    const isConnectivity =
      err?.code === "ServiceUnavailable" ||
      /ServiceUnavailable|ECONNREFUSED|ENOTFOUND|timeout|Unable to connect/i.test(
        msg
      );
    if (isConnectivity) {
      throw new DbConnectionError(
        "Could not reach the CognoDB instance. Check that it's running and " +
          "that COGNODB_URI / credentials are correct."
      );
    }
    throw err;
  } finally {
    await session.close();
  }
}
