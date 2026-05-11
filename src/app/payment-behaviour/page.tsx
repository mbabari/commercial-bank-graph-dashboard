"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/Card";
import DataTable from "@/components/DataTable";
import CustomerPicker from "@/components/CustomerPicker";
import Loading from "@/components/Loading";
import { formatZAR, formatNumber } from "@/lib/utils";
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  EFT: "#009639", NAV: "#0ea5e9", SOF: "#f59e0b", SWIFT: "#8b5cf6",
};

export default function PaymentBehaviourPage() {
  const [customerId, setCustomerId] = useState("CUST-00001");
  const [data, setData] = useState<Record<string, unknown[]> | null>(null);

  const load = useCallback(() => {
    setData(null);
    fetch(`/api/payment-behaviour?customerId=${customerId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [customerId]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payment Behaviour</h1>
          <p className="text-muted-foreground mt-1">
            Frequency, volume, and regularity of client payment flows
          </p>
        </div>
        <CustomerPicker value={customerId} onChange={setCustomerId} />
      </div>

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Channel Breakdown" subtitle={`Payment channels for selected customer`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.channelBreakdown as Record<string, unknown>[]}>
                  <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "totalAmount" ? formatZAR(Number(v)) : formatNumber(Number(v))
                    }
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  />
                  <Bar dataKey="txCount" name="Transactions" radius={[6, 6, 0, 0]}>
                    {(data.channelBreakdown as { channel: string }[]).map((c) => (
                      <Cell key={c.channel} fill={CHANNEL_COLORS[c.channel] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Monthly Payment Trend" subtitle="Transaction volume over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={(data.monthlyTrend as { year: number; month: number; txCount: number; totalAmount: number }[]).map(
                    (d) => ({ ...d, period: `${d.year}-${String(d.month).padStart(2, "0")}` })
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Line
                    type="monotone"
                    dataKey="txCount"
                    name="Transactions"
                    stroke="#009639"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Top 20 Trading Pairs by Frequency" subtitle="Most active customer-to-customer payment flows across the network">
            <DataTable
              columns={[
                { key: "senderName", label: "Sender" },
                { key: "senderStatus", label: "Status" },
                { key: "receiverName", label: "Receiver" },
                { key: "receiverStatus", label: "Status" },
                { key: "transactionCount", label: "Tx Count", align: "right" },
                {
                  key: "totalAmountZAR",
                  label: "Total (ZAR)",
                  align: "right",
                  render: (v) => formatZAR(v as number),
                },
                { key: "avgDaysBetweenPayments", label: "Avg Days", align: "right" },
              ]}
              data={data.topPairs as Record<string, unknown>[]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
