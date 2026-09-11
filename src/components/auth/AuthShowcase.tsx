import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import authIllustration from "@/assets/auth-illustration.png";

const stats = [
  { value: "20K+", label: "Students" },
  { value: "5K+", label: "Mentors" },
  { value: "120+", label: "Skill categories" },
];

const quotes = [
  {
    quote: "I swapped Python lessons for UX mentoring and landed a product role in six months.",
    name: "Nusrat Jahan",
    role: "Frontend Engineer",
  },
  {
    quote: "The most useful professional network I've joined — everything is proof-based.",
    name: "Imran Kabir",
    role: "Founder, Loop Studio",
  },
  {
    quote: "Teaching here sharpened my own skills more than any course I ever bought.",
    name: "Sadia Anwar",
    role: "Data Analyst",
  },
];

export function AuthShowcase() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % quotes.length), 5500);
    return () => clearInterval(id);
  }, []);

  const active = quotes[i]!;

  return (
    <div className="gradient-deep relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -top-20 -left-16 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-blob absolute top-1/3 -right-24 size-96 rounded-full bg-white/10 blur-3xl [animation-delay:-7s]" />
        <div className="animate-blob absolute -bottom-24 left-1/4 size-72 rounded-full bg-white/10 blur-3xl [animation-delay:-13s]" />
      </div>

      <div className="relative">
        <h2 className="text-primary-foreground max-w-md text-4xl">
          Where knowledge becomes opportunity.
        </h2>
        <p className="text-primary-foreground/75 mt-4 max-w-sm">
          Learn. Teach. Grow Together — with mentors who work in the field today.
        </p>
      </div>

      <motion.img
        src={authIllustration}
        alt="A mentor teaching a small group with skill cards and a community network"
        width={1024}
        height={1024}
        loading="lazy"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="animate-float relative mx-auto min-h-0 w-auto max-w-sm flex-1 object-contain"
      />

      <div className="relative">
        <ul className="grid grid-cols-3 gap-3">
          {stats.map((stat, idx) => (
            <motion.li
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
              className="glass-dark rounded-2xl px-4 py-4 text-center"
            >
              <p className="text-primary-foreground text-2xl font-extrabold">{stat.value}</p>
              <p className="text-primary-foreground/70 mt-1 text-xs">{stat.label}</p>
            </motion.li>
          ))}
        </ul>

        <div className="mt-6 min-h-32">
          <AnimatePresence mode="wait">
            <motion.figure
              key={active.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.4 }}
              className="glass-dark rounded-2xl p-6"
            >
              <span className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="text-warning fill-warning size-3.5" />
                ))}
              </span>
              <blockquote className="text-primary-foreground mt-3 text-sm leading-relaxed">
                “{active.quote}”
              </blockquote>
              <figcaption className="text-primary-foreground/70 mt-3 text-xs">
                {active.name} · {active.role}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
