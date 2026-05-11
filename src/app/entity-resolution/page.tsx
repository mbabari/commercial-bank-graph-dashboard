"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import MetricCard from "@/components/MetricCard";
import DataTable from "@/components/DataTable";
import Badge from "@/components/Badge";
import Loading from "@/components/Loading";
import { GitMerge, Target, Type, ArrowLeftRight } from "lucide-react";

/** Stable pseudo-random in [0, 1) from string (avoids Math.random in render + hydration issues). */
function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

interface Match {
  bankedId: string;
  bankedName: string;
  bankedRegion: string;
  unbankedId: string;
  unbankedName: string;
  unbankedRegion: string;
  confidence: number;
  nameSim: number;
  industrySim: number;
  regionSim: number;
  tradingSim: number;
  bankedPartnerCount: number;
  unbankedPartnerCount: number;
  sharedPartnerCount: number;
  sharedPartnerNames: string[];
  bankedIndustry: string;
  unbankedIndustry: string;
}

interface Cluster {
  bankedId: string;
  bankedName: string;
  bankedRegion: string;
  bankedIndustry: string;
  bankedPartnerCount: number;
  matches: Match[];
}

const ORBIT_RADIUS = 34;
const MAX_ORBIT_NODES = 12;

function confidenceVariant(c: number): "success" | "warning" | "neutral" {
  if (c >= 0.85) return "success";
  if (c >= 0.7) return "warning";
  return "neutral";
}

function MatchTooltip({ match }: { match: Match }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[110%] z-40 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 text-left text-xs shadow-xl">
      <p className="truncate font-semibold text-popover-foreground">{match.unbankedName}</p>
      <p className="mb-2 text-[11px] text-muted-foreground">
        {match.unbankedRegion} · {match.unbankedIndustry}
      </p>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground">Confidence</span>
        <Badge variant={confidenceVariant(match.confidence)}>{match.confidence.toFixed(3)}</Badge>
      </div>

      <div className="space-y-1">
        <SignalRow label="Name similarity" value={match.nameSim.toFixed(3)} />
        <SignalRow label="Trading similarity" value={match.tradingSim.toFixed(3)} />
        <SignalRow label="Industry match" value={match.industrySim ? "yes" : "no"} />
        <SignalRow label="Region match" value={match.regionSim ? "yes" : "no"} />
      </div>

      <div className="mt-2 border-t border-border pt-2">
        <p className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Shared trading partners</span>
          <span className="font-semibold text-popover-foreground">
            {match.sharedPartnerCount} / {match.unbankedPartnerCount}
          </span>
        </p>
        {match.sharedPartnerNames.length > 0 ? (
          <ul className="space-y-0.5 text-[11px]">
            {match.sharedPartnerNames.map((n) => (
              <li key={n} className="truncate text-popover-foreground/80">• {n}</li>
            ))}
            {match.sharedPartnerCount > match.sharedPartnerNames.length && (
              <li className="text-[10px] text-muted-foreground">
                …and {match.sharedPartnerCount - match.sharedPartnerNames.length} more
              </li>
            )}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">No overlap on TRADES_WITH neighbours.</p>
        )}
      </div>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-popover-foreground">{value}</span>
    </div>
  );
}

function ClusterGraph({ cluster }: { cluster: Cluster }) {
  const orbit = useMemo(() => cluster.matches.slice(0, MAX_ORBIT_NODES), [cluster.matches]);
  const n = orbit.length;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const placed = useMemo(() => {
    if (n === 0) return [];
    return orbit.map((m, i) => {
      const base =
        -Math.PI / 2 + (2 * Math.PI * i) / n + (hash01(m.unbankedId) - 0.5) * 0.08;
      const x = 50 + ORBIT_RADIUS * Math.cos(base);
      const y = 50 + ORBIT_RADIUS * Math.sin(base);
      return { match: m, x, y };
    });
  }, [orbit, n]);

  const truncatedCenter =
    cluster.bankedName.length > 12 ? `${cluster.bankedName.slice(0, 11)}…` : cluster.bankedName;

  const totalShared = cluster.matches.reduce((s, m) => s + m.sharedPartnerCount, 0);

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{cluster.bankedName}</p>
          <p className="text-[11px] text-muted-foreground">
            {cluster.bankedRegion} · {cluster.bankedIndustry} · {cluster.matches.length} candidate
            {cluster.matches.length === 1 ? "" : "s"}
            {totalShared > 0 && ` · ${totalShared} shared partner${totalShared === 1 ? "" : "s"}`}
          </p>
        </div>
        <Badge variant="success">banked</Badge>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-visible rounded-lg border border-border/60 bg-muted/10">
        <svg
          className="pointer-events-none absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {placed.map(({ match, x, y }) => {
            const sw = 0.25 + match.confidence * 1.0;
            const highlighted = hoveredId === match.unbankedId;
            return (
              <line
                key={`edge-${match.unbankedId}`}
                x1={50}
                y1={50}
                x2={x}
                y2={y}
                className={highlighted ? "stroke-primary" : "stroke-primary/70"}
                strokeWidth={highlighted ? sw + 0.6 : sw}
                strokeOpacity={highlighted ? 1 : 0.55 + match.confidence * 0.4}
              />
            );
          })}
        </svg>

        {/* Center: banked */}
        <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-center text-[10px] font-bold leading-tight text-white shadow-lg">
            {truncatedCenter}
          </div>
        </div>

        {/* Orbit: unbanked candidates */}
        {placed.map(({ match, x, y }) => {
          const isHovered = hoveredId === match.unbankedId;
          return (
            <div
              key={match.unbankedId}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ left: `${x}%`, top: `${y}%` }}
              onMouseEnter={() => setHoveredId(match.unbankedId)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(match.unbankedId)}
              onBlur={() => setHoveredId(null)}
              tabIndex={0}
            >
              <div
                className={`relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-md transition-transform ${
                  isHovered ? "scale-125 ring-2 ring-primary" : "hover:scale-110"
                }`}
              >
                {match.unbankedName.slice(0, 5)}
                {match.sharedPartnerCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow">
                    {match.sharedPartnerCount}
                  </span>
                )}
              </div>
              <span className="max-w-[80px] truncate text-center text-[10px] text-muted-foreground">
                {match.unbankedName}
              </span>
              <span className="text-[10px] font-semibold text-primary">
                {match.confidence.toFixed(2)}
              </span>
              {isHovered && <MatchTooltip match={match} />}
            </div>
          );
        })}

        {n === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            No candidate matches at this threshold.
          </div>
        )}
      </div>
    </div>
  );
}

export default function EntityResolutionPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.7);

  useEffect(() => {
    fetch("/api/entity-resolution")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setMatches(d.matches ?? []);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(
    () => (matches ?? []).filter((m) => m.confidence >= threshold),
    [matches, threshold]
  );

  const clusters: Cluster[] = useMemo(() => {
    const map = new Map<string, Cluster>();
    for (const m of filtered) {
      const existing = map.get(m.bankedId);
      if (existing) existing.matches.push(m);
      else
        map.set(m.bankedId, {
          bankedId: m.bankedId,
          bankedName: m.bankedName,
          bankedRegion: m.bankedRegion,
          bankedIndustry: m.bankedIndustry,
          bankedPartnerCount: m.bankedPartnerCount,
          matches: [m],
        });
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        Math.max(...b.matches.map((x) => x.confidence)) -
        Math.max(...a.matches.map((x) => x.confidence))
    );
  }, [filtered]);

  const avgConfidence = useMemo(() => {
    if (filtered.length === 0) return 0;
    return filtered.reduce((s, m) => s + m.confidence, 0) / filtered.length;
  }, [filtered]);

  const nameDriven = useMemo(
    () => filtered.filter((m) => m.nameSim > 0.8 && m.tradingSim < 0.1).length,
    [filtered]
  );
  const tradingDriven = useMemo(
    () => filtered.filter((m) => m.tradingSim > 0.15).length,
    [filtered]
  );

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Entity Resolution</h1>
          <p className="text-muted-foreground mt-1">
            High-confidence matches between unbanked entities and existing banked customers
          </p>
        </div>
        <Card title="Could not load matches">
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: run <code>cypher/06_entity_resolution.cypher</code> in the Aura console to populate{" "}
            <code>POTENTIAL_MATCH</code> relationships, then refresh this page.
          </p>
        </Card>
      </div>
    );
  }

  if (!matches) return <Loading />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Entity Resolution</h1>
        <p className="text-muted-foreground mt-1">
          High-confidence matches between unbanked entities and existing banked customers
        </p>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Confidence threshold</p>
            <p className="text-xs text-muted-foreground">
              Pairs with confidence ≥ this value are shown below
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0.45}
              max={1.0}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-64 accent-primary"
            />
            <Badge variant={confidenceVariant(threshold)} className="min-w-[64px] justify-center">
              ≥ {threshold.toFixed(2)}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total matches"
          value={filtered.length}
          icon={<GitMerge className="h-5 w-5" />}
          trend={`of ${matches.length} total pairs`}
        />
        <MetricCard
          label="Avg. confidence"
          value={avgConfidence.toFixed(3)}
          icon={<Target className="h-5 w-5" />}
        />
        <MetricCard
          label="Name-driven"
          value={nameDriven}
          icon={<Type className="h-5 w-5" />}
          trend="nameSim > 0.8 · tradingSim < 0.1"
        />
        <MetricCard
          label="Trading-driven"
          value={tradingDriven}
          icon={<ArrowLeftRight className="h-5 w-5" />}
          trend="tradingSim > 0.15"
        />
      </div>

      <Card
        title="Match clusters"
        subtitle="Each banked customer with its potential unbanked twins · edge thickness = confidence · badge = shared trading partners"
        className="mb-6"
      >
        {clusters.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No matches at this threshold. Lower the slider to see more candidates.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clusters.slice(0, 12).map((c) => (
              <ClusterGraph key={c.bankedId} cluster={c} />
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500" /> Banked (center)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-amber-500" /> Unbanked candidate
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-primary" /> Shared-partner count
          </span>
          <span className="text-muted-foreground/70">Hover an unbanked node for full signal breakdown</span>
        </div>
      </Card>

      <Card
        title="Signal breakdown"
        subtitle="Per-pair similarity components · trading overlap shown as shared TRADES_WITH partners"
      >
        <DataTable
          columns={[
            { key: "bankedName", label: "Banked" },
            { key: "unbankedName", label: "Unbanked" },
            {
              key: "confidence",
              label: "Confidence",
              align: "right",
              render: (v) => {
                const c = v as number;
                return (
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(1, c)) * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold tabular-nums">{c.toFixed(3)}</span>
                  </div>
                );
              },
            },
            {
              key: "nameSim",
              label: "Name",
              align: "right",
              render: (v) => <span className="tabular-nums">{(v as number).toFixed(3)}</span>,
            },
            {
              key: "industrySim",
              label: "Industry",
              align: "center",
              render: (v) =>
                (v as number) > 0 ? <Badge variant="success">yes</Badge> : <Badge variant="neutral">no</Badge>,
            },
            {
              key: "regionSim",
              label: "Region",
              align: "center",
              render: (v) =>
                (v as number) > 0 ? <Badge variant="success">yes</Badge> : <Badge variant="neutral">no</Badge>,
            },
            {
              key: "tradingSim",
              label: "Trading",
              align: "right",
              render: (v) => <span className="tabular-nums">{(v as number).toFixed(3)}</span>,
            },
            {
              key: "sharedPartnerCount",
              label: "Shared partners",
              align: "left",
              render: (v, row) => {
                const count = v as number;
                const names = row.sharedPartnerNames as string[];
                if (count === 0)
                  return <span className="text-xs text-muted-foreground">—</span>;
                const preview = names.slice(0, 2).join(", ");
                const more = count - Math.min(2, names.length);
                return (
                  <div
                    className="flex items-center gap-2"
                    title={names.join("\n") + (more > 0 ? `\n…and ${count - names.length} more` : "")}
                  >
                    <Badge variant="info">{count}</Badge>
                    <span className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {preview}
                      {more > 0 && ` +${more}`}
                    </span>
                  </div>
                );
              },
            },
          ]}
          data={filtered}
        />
      </Card>
    </div>
  );
}
