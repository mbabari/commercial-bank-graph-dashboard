import { query } from "@/lib/neo4j";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const customers = await query(`
      MATCH (c:Customer {status: 'banked'})
      RETURN c.customerId AS customerId, c.name AS name, c.segment AS segment, c.region AS region
      ORDER BY c.name
    `);
    return NextResponse.json(customers);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
