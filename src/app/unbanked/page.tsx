"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import MetricCard from "@/components/MetricCard";
import DataTable from "@/components/DataTable";
import Badge from "@/components/Badge";
import Loading from "@/components/Loading";
import { formatZAR, formatNumber } from "@/lib/utils";
import { UserSearch, TrendingUp, Building2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface TargetRow { entityId: string; entityName: string; region: string; bankedPayerCount: number; totalTxCount: number; totalInboundZAR: number }
interface IndustryRow { industry: string; sector: string; unbankedCount: number; aggregateInboundZAR: number }
interface MultiPayerRow { unbankedEntity: string; region: string; distinctBankedPayers: number; totalInboundZAR: number; topPayers: string[] }

export default function UnbankedPage() {
  const [data, setData] = useState<{ topTargets: TargetRow[]; multiPayer: MultiPayerRow[]; industryDist: IndustryRow[] } | null>(null);

  useEffect(() => {
    fetch("/api/unbanked").then((r) => r.json()).then(setData).catch(console.error);
  }, []);

  if (!data) return <Loading />;

  const totalVolume = data.topTargets.reduce((s, t) => s + t.totalInboundZAR, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Unbanked Client Identification</h1>
        <p className="text-muted-foreground mt-1">
          Non-banked entities receiving significant payment volume — conversion targets
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Top 25 Target Volume"
          value={formatZAR(totalVolume)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          label="Multi-Payer Targets"
          value={data.multiPayer.length}
          icon={<UserSearch className="h-5 w-5" />}
          trend="Receiving from 3+ banked customers"
        />
        <MetricCard
          label="Industries Represented"
          value={data.industryDist.length}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Industry Distribution" subtitle="High-value unbanked entities by industry (>R1M inbound)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.industryDist} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1e6).toFixed(0)}M`} />
              <YAxis type="category" dataKey="industry" width={180} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => formatZAR(Number(v))}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="aggregateInboundZAR" name="Inbound (ZAR)" fill="#009639" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Multi-Payer Targets" subtitle="Unbanked entities paid by 3+ distinct banked customers">
          <DataTable
            columns={[
              { key: "unbankedEntity", label: "Entity" },
              { key: "region", label: "Region" },
              { key: "distinctBankedPayers", label: "Payers", align: "right" },
              {
                key: "totalInboundZAR",
                label: "Inbound (ZAR)",
                align: "right",
                render: (v) => formatZAR(v as number),
              },
            ]}
            data={data.multiPayer}
          />
        </Card>
      </div>

      <Card title="Top 25 Unbanked Conversion Targets" subtitle="Ranked by total inbound payment volume from banked customers">
        <DataTable
          columns={[
            { key: "entityName", label: "Entity" },
            { key: "region", label: "Region" },
            { key: "bankedPayerCount", label: "Banked Payers", align: "right" },
            { key: "totalTxCount", label: "Transactions", align: "right" },
            {
              key: "totalInboundZAR",
              label: "Inbound (ZAR)",
              align: "right",
              render: (v) => <span className="font-semibold">{formatZAR(v as number)}</span>,
            },
            {
              key: "bankedPayerCount",
              label: "Priority",
              render: (v) => {
                const n = v as number;
                if (n >= 5) return <Badge variant="success">High</Badge>;
                if (n >= 3) return <Badge variant="warning">Medium</Badge>;
                return <Badge variant="neutral">Low</Badge>;
              },
            },
          ]}
          data={data.topTargets}
        />
      </Card>
    </div>
  );
}
