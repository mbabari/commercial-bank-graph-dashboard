import { query } from "@/lib/neo4j";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId") || "CUST-00001";
  try {
    const [network, ecosystemLeaders] = await Promise.all([
      query(`
        MATCH (c:Customer {customerId: $customerId})-[tw:TRADES_WITH]-(other:Customer)
        WITH c, other, tw
        OPTIONAL MATCH (other)-[tw2:TRADES_WITH]-(hop2:Customer)
        WHERE hop2 <> c AND hop2.customerId <> $customerId
        WITH c, other, tw,
             collect(DISTINCT {name: hop2.name, id: hop2.customerId, status: hop2.status})[0..3] AS secondHops
        RETURN c.name AS centerName, c.customerId AS centerId,
               other.name AS name, other.customerId AS id, other.status AS status,
               other.region AS region, tw.amount AS tradeAmount, tw.txCount AS txCount,
               secondHops
        ORDER BY tw.amount DESC LIMIT 30
      `, { customerId }),
      query(`
        MATCH (c:Customer {status: 'banked'})-[:TRADES_WITH*1..2]-(other:Customer)
        WHERE c <> other
        WITH c, count(DISTINCT other) AS ecosystemSize
        RETURN c.name AS customer, c.customerId AS customerId,
               c.segment AS segment, ecosystemSize
        ORDER BY ecosystemSize DESC LIMIT 15
      `),
    ]);
    return NextResponse.json({ network, ecosystemLeaders });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
