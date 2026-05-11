"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Card from "@/components/Card";
import DataTable from "@/components/DataTable";
import CustomerPicker from "@/components/CustomerPicker";
import Badge from "@/components/Badge";
import Loading from "@/components/Loading";
import { formatZAR, formatNumber } from "@/lib/utils";

/** Stable pseudo-random in [0, 1) from string (avoids Math.random in render + hydration issues). */
function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

interface NetworkNode {
  name: string;
  id: string;
  status: string;
  region: string;
  tradeAmount: number;
  txCount: number;
  centerName: string;
  centerId: string;
  secondHops: { name: string; id: string; status: string }[];
}

interface EcoLeader {
  customer: string;
  customerId: string;
  segment: string;
  ecosystemSize: number;
}

const MAX_ORBIT_NODES = 24;
const ORBIT_R = 34;
const CX = 50;
const CY = 50;
const NODE_R = 4.5;
const CENTER_R = 7;

function EcosystemNetworkGraph({ network }: { network: NetworkNode[] }) {
  const centerName = network[0]?.centerName ?? "Center";
  const orbitNodes = useMemo(() => network.slice(0, MAX_ORBIT_NODES), [network]);
  const n = orbitNodes.length;

  const placed = useMemo(() => {
    if (n === 0) return [];
    return orbitNodes.map((node, i) => {
      const base = -Math.PI / 2 + (2 * Math.PI * i) / n + (hash01(node.id) - 0.5) * 0.08;
      return {
        node,
        x: CX + ORBIT_R * Math.cos(base),
        y: CY + ORBIT_R * Math.sin(base),
        isBanked: node.status === "banked",
      };
    });
  }, [orbitNodes, n]);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <svg viewBox="0 0 100 100" className="w-full" style={{ aspectRatio: "1/1" }}>
        {/* Edges */}
        {placed.map(({ node, x, y }) => (
          <line key={`e-${node.id}`} x1={CX} y1={CY} x2={x} y2={y} stroke="#94a3b8" strokeWidth={0.3} />
        ))}

        {/* Center node */}
        <circle cx={CX} cy={CY} r={CENTER_R} fill="hsl(221,83%,53%)" />
        <text x={CX} y={CY - 0.2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={2.6} fontWeight={700}>
          {centerName.length > 14 ? `${centerName.slice(0, 13)}…` : centerName}
        </text>
        <text x={CX} y={CY + CENTER_R + 2.8} textAnchor="middle" fill="#64748b" fontSize={2.2}>
          Center Node
        </text>

        {/* Orbit nodes */}
        {placed.map(({ node, x, y, isBanked }) => (
          <g key={node.id}>
            <circle cx={x} cy={y} r={NODE_R} fill={isBanked ? "#10b981" : "#f59e0b"} />
            <text x={x} y={y + 0.2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={2} fontWeight={700}>
              {node.name.slice(0, 6)}
            </text>
            <text x={x} y={y + NODE_R + 2.2} textAnchor="middle" fill="#64748b" fontSize={1.8}>
              {node.name.length > 16 ? `${node.name.slice(0, 15)}…` : node.name}
            </text>
          </g>
        ))}

        {n === 0 && (
          <text x={CX} y={CY + CENTER_R + 10} textAnchor="middle" fill="#94a3b8" fontSize={3}>
            No direct trading partners found.
          </text>
        )}
      </svg>

      <div className="flex gap-4 justify-center mt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-emerald-500" /> Banked</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-amber-500" /> Unbanked</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-primary" /> Center</span>
      </div>
    </div>
  );
}

export default function EcosystemPage() {
  const [customerId, setCustomerId] = useState("CUST-00001");
  const [data, setData] = useState<{ network: NetworkNode[]; ecosystemLeaders: EcoLeader[] } | null>(null);

  const load = useCallback(() => {
    setData(null);
    fetch(`/api/ecosystem?customerId=${customerId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [customerId]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ecosystem Mapping</h1>
          <p className="text-muted-foreground mt-1">
            Multi-hop traversal of customer trading networks
          </p>
        </div>
        <CustomerPicker value={customerId} onChange={setCustomerId} />
      </div>

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <Card title="Network Visualization" subtitle={`Trading partners for ${data.network[0]?.centerName || customerId}`}>
            <EcosystemNetworkGraph network={data.network} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Direct Trading Partners" subtitle="1-hop connections ordered by trade volume">
              <DataTable
                columns={[
                  { key: "name", label: "Partner" },
                  {
                    key: "status",
                    label: "Status",
                    render: (v) => (
                      <Badge variant={v === "banked" ? "success" : "warning"}>
                        {v as string}
                      </Badge>
                    ),
                  },
                  { key: "region", label: "Region" },
                  { key: "txCount", label: "Tx Count", align: "right" },
                  {
                    key: "tradeAmount",
                    label: "Volume (ZAR)",
                    align: "right",
                    render: (v) => formatZAR(v as number),
                  },
                ]}
                data={data.network}
              />
            </Card>

            <Card title="Ecosystem Leaders" subtitle="Customers with the largest trading ecosystems (2-hop reach)">
              <DataTable
                columns={[
                  { key: "customer", label: "Customer" },
                  {
                    key: "segment",
                    label: "Segment",
                    render: (v) => <Badge variant="info">{v as string}</Badge>,
                  },
                  {
                    key: "ecosystemSize",
                    label: "Ecosystem Size",
                    align: "right",
                    render: (v) => (
                      <span className="font-semibold">{formatNumber(v as number)}</span>
                    ),
                  },
                ]}
                data={data.ecosystemLeaders}
                onRowClick={(row) => setCustomerId(row.customerId as string)}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
