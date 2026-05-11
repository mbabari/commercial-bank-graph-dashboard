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
/** Radius in viewBox units (0–100); keeps nodes inside the card. */
const ORBIT_RADIUS = 36;

function EcosystemNetworkGraph({ network }: { network: NetworkNode[] }) {
  const centerName = network[0]?.centerName ?? "Center";
  const orbitNodes = useMemo(() => network.slice(0, MAX_ORBIT_NODES), [network]);
  const n = orbitNodes.length;

  const placed = useMemo(() => {
    if (n === 0) return [];
    return orbitNodes.map((node, i) => {
      // Evenly distribute around circle; tiny deterministic offset spreads labels when n is small
      const base = (-Math.PI / 2 + (2 * Math.PI * i) / n) + (hash01(node.id) - 0.5) * 0.08;
      const x = 50 + ORBIT_RADIUS * Math.cos(base);
      const y = 50 + ORBIT_RADIUS * Math.sin(base);
      return { node, x, y, isBanked: node.status === "banked" };
    });
  }, [orbitNodes, n]);

  return (
    <div className="relative mx-auto w-full max-w-[440px] aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/10">
      {/* Edges: hub-and-spoke in normalized coordinates */}
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {placed.map(({ node, x, y }) => (
          <line
            key={`edge-${node.id}`}
            x1={50}
            y1={50}
            x2={x}
            y2={y}
            className="stroke-border"
            strokeWidth={0.35}
            strokeOpacity={0.9}
          />
        ))}
      </svg>

      {/* Center */}
      <div
        className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-center text-[10px] font-bold leading-tight text-primary-foreground shadow-lg">
          {centerName.length > 12 ? `${centerName.slice(0, 11)}…` : centerName}
        </div>
        <span className="text-xs font-medium text-muted-foreground">Center</span>
      </div>

      {/* Orbit partners */}
      {placed.map(({ node, x, y, isBanked }) => (
        <div
          key={node.id}
          className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
          style={{ left: `${x}%`, top: `${y}%` }}
          title={`${node.name}\n${node.status} · ${node.region}\n${formatNumber(node.txCount)} tx · ${formatZAR(node.tradeAmount)}`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-md transition-transform hover:scale-110 ${
              isBanked ? "bg-emerald-500" : "bg-amber-500"
            }`}
          >
            {node.name.slice(0, 5)}
          </div>
          <span className="max-w-[72px] truncate text-center text-[10px] text-muted-foreground">
            {node.name}
          </span>
        </div>
      ))}

      {n === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          No direct trading partners found for this customer in the graph.
        </div>
      )}
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
            <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Banked</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-500" /> Unbanked</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-primary" /> Center</span>
            </div>
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
