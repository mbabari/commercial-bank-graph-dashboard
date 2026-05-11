"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import Card from "@/components/Card";
import DataTable from "@/components/DataTable";
import Loading from "@/components/Loading";
import { formatZAR, formatNumber } from "@/lib/utils";
import { Users, Landmark, ArrowLeftRight, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  EFT: "#009639", NAV: "#0ea5e9", SOF: "#f59e0b", SWIFT: "#8b5cf6",
};

export default function OverviewPage() {
  const [data, setData] = useState<Record<string, unknown[]> | null>(null);

  useEffect(() => {
    fetch("/api/overview").then((r) => r.json()).then(setData).catch(console.error);
  }, []);

  if (!data) return <Loading />;

  const nodeMap = Object.fromEntries(
    (data.nodes as { label: string; count: number }[]).map((n) => [n.label, n.count])
  );
  const relMap = Object.fromEntries(
    (data.rels as { type: string; count: number }[]).map((r) => [r.type, r.count])
  );

  const channels = data.channelBreakdown as { channel: string; count: number; totalAmount: number }[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Commercial Graph — Key Metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Customers"
          value={formatNumber(nodeMap.Customer || 0)}
          icon={<Users className="h-5 w-5" />}
          trend={`${500} banked · ${300} unbanked`}
        />
        <MetricCard
          label="Accounts"
          value={formatNumber(nodeMap.Account || 0)}
          icon={<Landmark className="h-5 w-5" />}
        />
        <MetricCard
          label="Transactions"
          value={formatNumber(nodeMap.Transaction || 0)}
          icon={<ArrowLeftRight className="h-5 w-5" />}
          trend={`${formatNumber(relMap.TRADES_WITH || 0)} trading pairs`}
        />
        <MetricCard
          label="Products"
          value={formatNumber(nodeMap.Product || 0)}
          icon={<Package className="h-5 w-5" />}
          trend={`${formatNumber(relMap.HOLDS_PRODUCT || 0)} holdings`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Transaction Volume by Channel" subtitle="Total count per payment channel">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={channels}>
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => formatNumber(Number(v))}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {channels.map((c) => (
                  <Cell key={c.channel} fill={CHANNEL_COLORS[c.channel] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top Trading Pairs" subtitle="Highest volume customer-to-customer flows">
          <DataTable
            columns={[
              { key: "sender", label: "Sender" },
              { key: "receiver", label: "Receiver" },
              {
                key: "amount",
                label: "Total (ZAR)",
                align: "right",
                render: (v) => formatZAR(v as number),
              },
              { key: "txCount", label: "Tx Count", align: "right" },
            ]}
            data={data.topTraders as Record<string, unknown>[]}
          />
        </Card>
      </div>
    </div>
  );
}
