import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
  neutral: "bg-slate-100 text-slate-700",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}

export default function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANTS[variant] || VARIANTS.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
