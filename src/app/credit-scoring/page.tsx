"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import DataTable from "@/components/DataTable";
import Badge from "@/components/Badge";
import Loading from "@/components/Loading";
import { formatZAR, formatNumber } from "@/lib/utils";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ZAxis,
} from "recharts";

interface DiversityRow {
  customer: string; customerId: string; segment: string; existingRiskScore: number;
  distinctPayers: number; channelDiversity: number; totalInboundTx: number;
  totalInflowZAR: number; avgPaymentSize: number; collateralGrade: string;
}
interface ConcentrationRow {
  customer: string; customerId: string; largestPayer: string;
  largestPayerZAR: number; totalInflowZAR: number; concentrationPct: number;
}
interface StabilityRow {
  customer: string; customerId: string; segment: string; payers: number;
  avgIntervalDays: number; intervalStdDevDays: number;
  totalInflowZAR: number; stabilityGrade: string;
}

const gradeVariant = (grade: string) => {
  if (grade === "LOW RISK" || grade === "HIGHLY STABLE") return "success";
  if (grade === "MEDIUM RISK" || grade === "STABLE") return "warning";
  return "danger";
};

export default function CreditScoringPage() {
  const [data, setData] = useState<{
    diversityScores: DiversityRow[];
    concentrationRisk: ConcentrationRow[];
    stabilityScores: StabilityRow[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/credit-scoring").then((r) => r.json()).then(setData).catch(console.error);
  }, []);

  if (!data) return <Loading />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Credit & Collateral Scoring</h1>
        <p className="text-muted-foreground mt-1">
          Payment diversity, stability, and concentration as creditworthiness proxies
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Payer Diversity vs Inflow" subtitle="Bubble size = channel diversity">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="distinctPayers"
                  name="Distinct Payers"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Distinct Payers", position: "bottom", fontSize: 12 }}
                />
                <YAxis
                  dataKey="totalInflowZAR"
                  name="Total Inflow"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R${(v / 1e6).toFixed(0)}M`}
                />
                <ZAxis dataKey="channelDiversity" range={[40, 300]} name="Channel Diversity" />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Total Inflow" ? formatZAR(Number(value)) : formatNumber(Number(value))
                  }
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Scatter
                  data={data.diversityScores}
                  fill="#009639"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Revenue Concentration Risk" subtitle="% of inflow from single largest payer">
            <DataTable
              columns={[
                { key: "customer", label: "Customer" },
                { key: "largestPayer", label: "Largest Payer" },
                {
                  key: "concentrationPct",
                  label: "Concentration",
                  align: "right",
                  render: (v) => {
                    const pct = v as number;
                    const color = pct > 50 ? "text-red-600 font-bold" : pct > 30 ? "text-amber-600 font-semibold" : "text-emerald-600";
                    return <span className={color}>{pct}%</span>;
                  },
                },
                {
                  key: "totalInflowZAR",
                  label: "Total Inflow",
                  align: "right",
                  render: (v) => formatZAR(v as number),
                },
              ]}
              data={data.concentrationRisk}
            />
          </Card>
        </div>

        <Card title="Payment Diversity Scores" subtitle="Collateral grading based on payer count, channel diversity, and inflow volume">
          <DataTable
            columns={[
              { key: "customer", label: "Customer" },
              { key: "segment", label: "Segment" },
              { key: "distinctPayers", label: "Payers", align: "right" },
              { key: "channelDiversity", label: "Channels", align: "right" },
              { key: "totalInboundTx", label: "Inbound Tx", align: "right" },
              {
                key: "totalInflowZAR",
                label: "Total Inflow",
                align: "right",
                render: (v) => formatZAR(v as number),
              },
              {
                key: "avgPaymentSize",
                label: "Avg Payment",
                align: "right",
                render: (v) => formatZAR(v as number),
              },
              {
                key: "collateralGrade",
                label: "Grade",
                render: (v) => <Badge variant={gradeVariant(v as string)}>{v as string}</Badge>,
              },
            ]}
            data={data.diversityScores}
          />
        </Card>

        <Card title="Payment Stability Scores" subtitle="Customers with consistent, regular payment patterns">
          <DataTable
            columns={[
              { key: "customer", label: "Customer" },
              { key: "segment", label: "Segment" },
              { key: "payers", label: "Payers", align: "right" },
              { key: "avgIntervalDays", label: "Avg Interval (days)", align: "right" },
              { key: "intervalStdDevDays", label: "Std Dev (days)", align: "right" },
              {
                key: "totalInflowZAR",
                label: "Total Inflow",
                align: "right",
                render: (v) => formatZAR(v as number),
              },
              {
                key: "stabilityGrade",
                label: "Stability",
                render: (v) => <Badge variant={gradeVariant(v as string)}>{v as string}</Badge>,
              },
            ]}
            data={data.stabilityScores}
          />
        </Card>
      </div>
    </div>
  );
}
