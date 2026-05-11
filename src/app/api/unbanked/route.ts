import { query } from "@/lib/neo4j";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [topTargets, multiPayer, industryDist] = await Promise.all([
      query(`
        MATCH (banked:Customer {status: 'banked'})-[tw:TRADES_WITH]->(unbanked:Customer {status: 'unbanked'})
        WITH unbanked, count(DISTINCT banked) AS bankedPayerCount,
             sum(tw.amount) AS totalInboundZAR, sum(tw.txCount) AS totalTxCount
        RETURN unbanked.customerId AS entityId, unbanked.name AS entityName,
               unbanked.region AS region, bankedPayerCount, totalTxCount,
               round(totalInboundZAR, 2) AS totalInboundZAR
        ORDER BY totalInboundZAR DESC LIMIT 25
      `),
      query(`
        MATCH (banked:Customer {status: 'banked'})-[tw:TRADES_WITH]->(unbanked:Customer {status: 'unbanked'})
        WITH unbanked, collect(DISTINCT banked.name) AS payerNames, sum(tw.amount) AS totalZAR
        WHERE size(payerNames) >= 3
        RETURN unbanked.name AS unbankedEntity, unbanked.region AS region,
               size(payerNames) AS distinctBankedPayers,
               round(totalZAR, 2) AS totalInboundZAR, payerNames[0..5] AS topPayers
        ORDER BY totalZAR DESC LIMIT 20
      `),
      query(`
        MATCH (banked:Customer {status: 'banked'})-[tw:TRADES_WITH]->(unbanked:Customer {status: 'unbanked'})
        WITH unbanked, sum(tw.amount) AS totalZAR
        WHERE totalZAR > 1000000
        MATCH (unbanked)-[:BELONGS_TO]->(i:Industry)
        RETURN i.name AS industry, i.sector AS sector,
               count(unbanked) AS unbankedCount, round(sum(totalZAR), 2) AS aggregateInboundZAR
        ORDER BY aggregateInboundZAR DESC
      `),
    ]);
    return NextResponse.json({ topTargets, multiPayer, industryDist });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
