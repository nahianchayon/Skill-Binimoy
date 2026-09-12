import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Radio, Star, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

import heroIllustration from "@/assets/hero-illustration.png";
import { Button } from "@/components/ui/button";

const floatingCards = [
  { icon: Star, label: "4.9 Rating", sub: "Avg. mentor score", pos: "left-0 top-10", delay: 0 },
  {
    icon: GraduationCap,
    label: "Top Mentor",
    sub: "Verified this week",
    pos: "right-0 top-28",
    delay: 0.6,
  },
  {
    icon: Users,
    label: "1,500 Students",
    sub: "Learning right now",
    pos: "left-2 bottom-16",
    delay: 1.2,
  },
  {
    icon: Radio,
    label: "Live Classes",
    sub: "42 sessions today",
    pos: "right-4 bottom-4",
    delay: 1.8,
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/20 animate-blob absolute -top-24 -left-24 size-[26rem] rounded-full blur-3xl" />
        <div className="bg-primary-glow/20 animate-blob absolute top-40 -right-32 size-[30rem] rounded-full blur-3xl [animation-delay:-6s]" />
        <div className="bg-chart-5/10 animate-blob absolute bottom-0 left-1/3 size-[22rem] rounded-full blur-3xl [animation-delay:-12s]" />
      </div>

      <div className="container-x grid items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass text-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
          >
            <span className="bg-success size-1.5 rounded-full" />
            Skill exchange, not just course sales
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl"
          >
            Exchange Skills.
            <br />
            <span className="text-gradient">Build Your Future.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed"
          >
            Learn from real experts. Teach what you know. Grow together in a community where
            reputation is earned through knowledge shared.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Button variant="hero" size="lg" asChild>
              <Link to="/login">
                Start Learning <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#how-it-works">Become a Mentor</a>
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="border-border mt-12 grid max-w-lg grid-cols-3 gap-6 border-t pt-8"
          >
            {[
              ["25K+", "Active learners"],
              ["6.5K+", "Verified mentors"],
              ["120+", "Skill categories"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-extrabold">{value}</dt>
                <dd className="text-muted-foreground text-sm">{label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <img
            src={heroIllustration}
            alt="Learners and mentors exchanging programming, design, business and AI skills"
            width={1280}
            height={1024}
            className="relative z-10 w-full drop-shadow-2xl"
          />

          {floatingCards.map(({ icon: Icon, label, sub, pos, delay }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: [0, -12, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.5 + delay * 0.2 },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
              }}
              className={`glass shadow-card absolute z-20 hidden items-center gap-3 rounded-2xl px-4 py-3 sm:flex ${pos}`}
            >
              <span className="bg-accent text-primary grid size-9 place-items-center rounded-xl">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold">{label}</span>
                <span className="text-muted-foreground block text-xs">{sub}</span>
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
