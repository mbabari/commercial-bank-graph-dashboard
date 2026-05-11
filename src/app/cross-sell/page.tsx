"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/Card";
import DataTable from "@/components/DataTable";
import CustomerPicker from "@/components/CustomerPicker";
import Badge from "@/components/Badge";
import Loading from "@/components/Loading";
import { formatNumber } from "@/lib/utils";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const PILLAR_COLORS: Record<string, string> = {
  lend: "#009639", transact: "#0ea5e9", invest: "#f59e0b", insure: "#8b5cf6",
};

interface Rec { productId: string; product: string; pillar: string; peersWithProduct: number }
interface CurrentProduct { productId: string; name: string; pillar: string }
interface GapRow { segment: string; product: string; pillar: string; holders: number; segTotal: number; penetrationPct: number }

export default function CrossSellPage() {
  const [customerId, setCustomerId] = useState("CUST-00001");
  const [data, setData] = useState<{
    recommendations: Rec[];
    gapAnalysis: GapRow[];
    currentProducts: CurrentProduct[];
  } | null>(null);

  const load = useCallback(() => {
    setData(null);
    fetch(`/api/cross-sell?customerId=${customerId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [customerId]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Product Cross-Sell</h1>
          <p className="text-muted-foreground mt-1">
            Peer-based product gap analysis for fit-for-purpose recommendations
          </p>
        </div>
        <CustomerPicker value={customerId} onChange={setCustomerId} />
      </div>

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Current Products" subtitle="Products held by selected customer" className="lg:col-span-1">
              <div className="space-y-2">
                {data.currentProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products found</p>
                ) : (
                  data.currentProducts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant={p.pillar === "lend" ? "success" : p.pillar === "transact" ? "info" : p.pillar === "invest" ? "warning" : "neutral"}>
                        {p.pillar}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="Recommended Products" subtitle="Popular with industry peers but not held by customer" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.recommendations} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="product" width={200} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="peersWithProduct" name="Industry Peers" radius={[0, 6, 6, 0]}>
                    {data.recommendations.map((r) => (
                      <Cell key={r.productId} fill={PILLAR_COLORS[r.pillar] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                {Object.entries(PILLAR_COLORS).map(([pillar, color]) => (
                  <span key={pillar} className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                    {pillar}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Segment Product Penetration" subtitle="Product adoption rates by customer segment — low penetration = cross-sell opportunity">
            <DataTable
              columns={[
                { key: "segment", label: "Segment" },
                { key: "product", label: "Product" },
                {
                  key: "pillar",
                  label: "Pillar",
                  render: (v) => (
                    <Badge variant={v === "lend" ? "success" : v === "transact" ? "info" : v === "invest" ? "warning" : "neutral"}>
                      {v as string}
                    </Badge>
                  ),
                },
                { key: "holders", label: "Holders", align: "right" },
                { key: "segTotal", label: "Segment Total", align: "right" },
                {
                  key: "penetrationPct",
                  label: "Penetration",
                  align: "right",
                  render: (v) => {
                    const pct = v as number;
                    const color = pct < 15 ? "text-red-600" : pct < 25 ? "text-amber-600" : "text-emerald-600";
                    return <span className={`font-semibold ${color}`}>{pct}%</span>;
                  },
                },
              ]}
              data={data.gapAnalysis}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
