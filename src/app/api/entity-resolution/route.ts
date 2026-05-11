import { query } from "@/lib/neo4j";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const matches = await query(`
      MATCH (b:Customer {status: 'banked'})-[m:POTENTIAL_MATCH]->(u:Customer {status: 'unbanked'})
      CALL {
        WITH b, u
        OPTIONAL MATCH (b)-[:TRADES_WITH]-(bp:Customer)
        WHERE bp <> u AND bp <> b
        RETURN collect(DISTINCT bp) AS bPartners
      }
      CALL {
        WITH b, u
        OPTIONAL MATCH (u)-[:TRADES_WITH]-(up:Customer)
        WHERE up <> b AND up <> u
        RETURN collect(DISTINCT up) AS uPartners
      }
      WITH b, u, m, bPartners, uPartners,
           [p IN bPartners WHERE p IN uPartners | p] AS sharedNodes
      OPTIONAL MATCH (b)-[:BELONGS_TO]->(bi:Industry)
      OPTIONAL MATCH (u)-[:BELONGS_TO]->(ui:Industry)
      RETURN b.customerId AS bankedId, b.name AS bankedName, b.region AS bankedRegion,
             u.customerId AS unbankedId, u.name AS unbankedName, u.region AS unbankedRegion,
             round(m.confidence, 4) AS confidence,
             round(m.nameSim, 4)    AS nameSim,
             m.industrySim          AS industrySim,
             m.regionSim            AS regionSim,
             round(m.tradingSim, 4) AS tradingSim,
             size(bPartners)        AS bankedPartnerCount,
             size(uPartners)        AS unbankedPartnerCount,
             size(sharedNodes)      AS sharedPartnerCount,
             [n IN sharedNodes | n.name][..5] AS sharedPartnerNames,
             coalesce(bi.name, '—') AS bankedIndustry,
             coalesce(ui.name, '—') AS unbankedIndustry
      ORDER BY m.confidence DESC
    `);
    return NextResponse.json({ matches });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
