import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
};

export function Reveal({ children, delay = 0, y = 24, className }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal
      className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-left"}
    >
      {eyebrow ? (
        <span className="bg-accent text-accent-foreground inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem]">{title}</h2>
      {subtitle ? (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed">{subtitle}</p>
      ) : null}
    </Reveal>
  );
}
