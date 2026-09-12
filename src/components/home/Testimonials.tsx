import { AnimatePresence, motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/common/Reveal";
import { testimonials } from "@/data/content";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(id);
  }, []);

  const active = testimonials[index]!;

  return (
    <section id="testimonials" className="section relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/10 animate-blob absolute top-10 left-1/4 size-96 rounded-full blur-3xl" />
      </div>

      <div className="container-x">
        <SectionHeading
          eyebrow="Testimonials"
          title="Careers changed by an exchange"
          subtitle="Real outcomes from learners who taught as much as they studied."
        />

        <div className="relative mx-auto mt-14 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.figure
              key={active.name}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="glass shadow-card rounded-3xl p-8 sm:p-12"
            >
              <Quote className="text-primary size-8" aria-hidden="true" />
              <blockquote className="mt-6 text-lg leading-relaxed font-medium sm:text-xl">
                “{active.quote}”
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <span className="gradient-primary text-primary-foreground grid size-12 place-items-center rounded-2xl font-extrabold">
                  {active.initials}
                </span>
                <span>
                  <span className="block font-bold">{active.name}</span>
                  <span className="text-muted-foreground block text-sm">{active.role}</span>
                </span>
                <span className="ml-auto flex gap-0.5" aria-label={`${active.rating} out of 5`}>
                  {Array.from({ length: active.rating }).map((_, i) => (
                    <Star key={i} className="fill-warning text-warning size-4" aria-hidden="true" />
                  ))}
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show testimonial from ${t.name}`}
                aria-current={i === index}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "gradient-primary w-8" : "bg-border w-2 hover:bg-muted-foreground",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
