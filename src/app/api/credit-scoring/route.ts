import { query } from "@/lib/neo4j";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [diversityScores, concentrationRisk, stabilityScores] = await Promise.all([
      query(`
        MATCH (payer:Customer)-[tw:TRADES_WITH]->(c:Customer {status: 'banked'})
        WITH c, count(DISTINCT payer) AS distinctPayers,
             sum(tw.amount) AS totalInflowZAR, sum(tw.txCount) AS totalInboundTx
        MATCH (c)-[:HAS_ACCOUNT]->(a)<-[:RECEIVED_BY]-(t:Transaction)
        WITH c, distinctPayers, totalInflowZAR, totalInboundTx,
             count(DISTINCT t.channel) AS channelDiversity
        RETURN c.name AS customer, c.customerId AS customerId,
               c.segment AS segment, c.riskScore AS existingRiskScore,
               distinctPayers, channelDiversity, totalInboundTx,
               round(totalInflowZAR, 2) AS totalInflowZAR,
               round(totalInflowZAR / totalInboundTx, 2) AS avgPaymentSize,
               CASE
                 WHEN distinctPayers >= 10 AND channelDiversity >= 3 THEN 'LOW RISK'
                 WHEN distinctPayers >= 5  AND channelDiversity >= 2 THEN 'MEDIUM RISK'
                 ELSE 'HIGHER RISK'
               END AS collateralGrade
        ORDER BY totalInflowZAR DESC LIMIT 30
      `),
      query(`
        MATCH (payer:Customer)-[tw:TRADES_WITH]->(c:Customer {status: 'banked'})
        WITH c, payer, tw.amount AS payerAmount
        ORDER BY payerAmount DESC
        WITH c, collect({name: payer.name, amount: payerAmount}) AS payers,
             sum(payerAmount) AS totalInflow
        WITH c, payers[0] AS topPayer, totalInflow
        RETURN c.name AS customer, c.customerId AS customerId,
               topPayer.name AS largestPayer,
               round(topPayer.amount, 2) AS largestPayerZAR,
               round(totalInflow, 2) AS totalInflowZAR,
               round(topPayer.amount * 100.0 / totalInflow, 1) AS concentrationPct
        ORDER BY concentrationPct DESC LIMIT 20
      `),
      query(`
        MATCH (payer:Customer)-[tw:TRADES_WITH]->(c:Customer {status: 'banked'})
        WHERE tw.avgInterval IS NOT NULL
        WITH c, count(DISTINCT payer) AS payers,
             avg(tw.avgInterval) AS avgIntervalDays,
             stDev(tw.avgInterval) AS intervalStdDev,
             sum(tw.amount) AS totalInflow
        WHERE payers >= 3
        RETURN c.name AS customer, c.customerId AS customerId,
               c.segment AS segment, payers,
               round(avgIntervalDays, 1) AS avgIntervalDays,
               round(intervalStdDev, 1) AS intervalStdDevDays,
               round(totalInflow, 2) AS totalInflowZAR,
               CASE
                 WHEN intervalStdDev < 10 THEN 'HIGHLY STABLE'
                 WHEN intervalStdDev < 30 THEN 'STABLE'
                 ELSE 'VARIABLE'
               END AS stabilityGrade
        ORDER BY intervalStdDev ASC LIMIT 20
      `),
    ]);
    return NextResponse.json({ diversityScores, concentrationRisk, stabilityScores });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
