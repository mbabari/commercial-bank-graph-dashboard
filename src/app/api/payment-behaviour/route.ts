import { query } from "@/lib/neo4j";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId") || "CUST-00001";
  try {
    const [topPairs, channelBreakdown, monthlyTrend] = await Promise.all([
      query(`
        MATCH (sender:Customer)-[tw:TRADES_WITH]->(receiver:Customer)
        RETURN sender.name AS senderName, sender.status AS senderStatus,
               receiver.name AS receiverName, receiver.status AS receiverStatus,
               tw.txCount AS transactionCount, tw.amount AS totalAmountZAR,
               tw.avgInterval AS avgDaysBetweenPayments
        ORDER BY tw.txCount DESC LIMIT 20
      `),
      query(`
        MATCH (c:Customer {customerId: $customerId})-[:HAS_ACCOUNT]->(a)-[:SENT]->(t:Transaction)
        RETURN t.channel AS channel, count(t) AS txCount,
               round(avg(t.amount), 2) AS avgAmount, round(sum(t.amount), 2) AS totalAmount
        ORDER BY txCount DESC
      `, { customerId }),
      query(`
        MATCH (c:Customer {customerId: $customerId})-[:HAS_ACCOUNT]->(a)-[:SENT]->(t:Transaction)
        WITH t.date.year AS year, t.date.month AS month, t
        RETURN year, month, count(t) AS txCount, round(sum(t.amount), 2) AS totalAmount
        ORDER BY year, month
      `, { customerId }),
    ]);
    return NextResponse.json({ topPairs, channelBreakdown, monthlyTrend });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
