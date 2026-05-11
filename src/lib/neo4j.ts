import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );
  }
  return driver;
}

export async function query<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE || "neo4j" });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const obj: Record<string, unknown> = {};
      for (const key of record.keys) {
        obj[String(key)] = serialize(record.get(key as string));
      }
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value)) return neo4j.integer.toNumber(value as { low: number; high: number });
  if (
    neo4j.isDate(value) || neo4j.isDateTime(value) || neo4j.isLocalDateTime(value) ||
    neo4j.isTime(value) || neo4j.isLocalTime(value) || neo4j.isDuration(value)
  ) {
    return value.toString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}
