import { motion } from "framer-motion";
import { Compass, Repeat2, Trophy, UserPlus } from "lucide-react";

import { SectionHeading } from "@/components/common/Reveal";

const steps = [
  {
    icon: UserPlus,
    title: "Create Profile",
    body: "List what you can teach and what you want to learn. Your profile becomes a living portfolio.",
  },
  {
    icon: Compass,
    title: "Find Skills",
    body: "Smart matching pairs you with mentors and learners whose goals complement yours.",
  },
  {
    icon: Repeat2,
    title: "Learn & Teach",
    body: "Run live sessions, exchange feedback, and complete project checkpoints together.",
  },
  {
    icon: Trophy,
    title: "Earn Reputation",
    body: "Verified reviews and certificates build a reputation that unlocks paid opportunities.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface section border-y">
      <div className="container-x">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps from curious to credible"
          subtitle="A structured exchange loop that keeps both sides accountable and progressing."
        />

        <ol className="relative mx-auto mt-16 max-w-3xl">
          <span
            aria-hidden="true"
            className="from-primary/60 via-primary/30 absolute top-0 bottom-0 left-6 w-px bg-linear-to-b to-transparent sm:left-8"
          />
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-6 pb-12 last:pb-0 sm:gap-8"
            >
              <span className="gradient-primary text-primary-foreground shadow-glow relative z-10 grid size-12 shrink-0 place-items-center rounded-2xl sm:size-16">
                <step.icon className="size-5 sm:size-6" aria-hidden="true" />
              </span>
              <div className="bg-card shadow-soft ring-border min-w-0 flex-1 rounded-2xl p-6 ring-1">
                <p className="text-primary text-xs font-bold tracking-widest uppercase">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
