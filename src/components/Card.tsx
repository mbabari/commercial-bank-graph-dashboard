import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, subtitle, children, className }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 shadow-sm", className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-card-foreground">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
