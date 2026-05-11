import { query } from "@/lib/neo4j";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId") || "CUST-00001";
  try {
    const [recommendations, gapAnalysis] = await Promise.all([
      query(`
        MATCH (target:Customer {customerId: $customerId})-[:BELONGS_TO]->(i:Industry)<-[:BELONGS_TO]-(peer:Customer)
        WHERE peer <> target AND peer.status = 'banked'
        MATCH (peer)-[:HOLDS_PRODUCT]->(p:Product)
        WHERE NOT (target)-[:HOLDS_PRODUCT]->(p)
        RETURN p.productId AS productId, p.name AS product, p.pillar AS pillar,
               count(DISTINCT peer) AS peersWithProduct
        ORDER BY peersWithProduct DESC
      `, { customerId }),
      query(`
        MATCH (c:Customer {status: 'banked'})
        WITH c.segment AS segment, count(c) AS segTotal
        MATCH (c2:Customer {status: 'banked', segment: segment})-[:HOLDS_PRODUCT]->(p:Product)
        WITH segment, segTotal, p, count(DISTINCT c2) AS holders
        RETURN segment, p.name AS product, p.pillar AS pillar,
               holders, segTotal,
               round(holders * 100.0 / segTotal, 1) AS penetrationPct
        ORDER BY segment, penetrationPct ASC
      `),
    ]);

    const currentProducts = await query(`
      MATCH (c:Customer {customerId: $customerId})-[:HOLDS_PRODUCT]->(p:Product)
      RETURN p.productId AS productId, p.name AS name, p.pillar AS pillar
    `, { customerId });

    return NextResponse.json({ recommendations, gapAnalysis, currentProducts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
