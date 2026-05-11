import { query } from "@/lib/neo4j";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [nodes, rels, topTraders, channelBreakdown] = await Promise.all([
      query(`MATCH (n) WITH labels(n)[0] AS label, count(*) AS count RETURN label, count ORDER BY label`),
      query(`MATCH ()-[r]->() WITH type(r) AS type, count(*) AS count RETURN type, count ORDER BY type`),
      query(`
        MATCH (s:Customer)-[tw:TRADES_WITH]->(r:Customer)
        RETURN s.name AS sender, r.name AS receiver, tw.txCount AS txCount,
               tw.amount AS amount, s.status AS senderStatus, r.status AS receiverStatus
        ORDER BY tw.amount DESC LIMIT 10
      `),
      query(`
        MATCH (a:Account)-[:SENT]->(t:Transaction)
        RETURN t.channel AS channel, count(t) AS count, sum(t.amount) AS totalAmount
        ORDER BY count DESC
      `),
    ]);
    return NextResponse.json({ nodes, rels, topTraders, channelBreakdown });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
