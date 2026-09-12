import type { LucideIcon } from "lucide-react";
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="metric-card group rounded-2xl border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
