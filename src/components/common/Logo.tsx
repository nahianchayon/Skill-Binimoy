import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "default",
  to = "/",
}: {
  className?: string;
  tone?: "default" | "inverted";
  to?: "/" | "/dashboard";
}) {
  return (
    <Link
      to={to}
      aria-label="Skill Binimoy home"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span className="gradient-primary shadow-glow grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
          <path
            d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="text-primary-foreground"
          />
          <path
            d="M7 10.6V15c0 1.3 2.2 2.6 5 2.6s5-1.3 5-2.6v-4.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="text-primary-foreground"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-lg font-extrabold tracking-tight whitespace-nowrap",
          tone === "inverted" ? "text-primary-foreground" : "text-foreground",
        )}
      >
        Skill Binimoy
      </span>
    </Link>
  );
}
