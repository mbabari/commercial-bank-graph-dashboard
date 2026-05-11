"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  UserSearch,
  Network,
  GitMerge,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/payment-behaviour", label: "Payment Behaviour", icon: ArrowLeftRight },
  { href: "/unbanked", label: "Unbanked Targets", icon: UserSearch },
  { href: "/ecosystem", label: "Ecosystem Map", icon: Network },
  { href: "/entity-resolution", label: "Entity Resolution", icon: GitMerge },
  { href: "/cross-sell", label: "Product Cross-Sell", icon: ShoppingBag },
  { href: "/credit-scoring", label: "Credit Scoring", icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">N4j</span>
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Commercial Graph</p>
          <p className="text-xs text-muted-foreground">Graph Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">Powered by Neo4j Aura</p>
      </div>
    </aside>
  );
}
