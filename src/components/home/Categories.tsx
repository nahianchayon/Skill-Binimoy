import * as Icons from "lucide-react";
import { motion } from "framer-motion";

import { Reveal, SectionHeading } from "@/components/common/Reveal";
import { categories } from "@/data/content";

export function Categories() {
  return (
    <section id="categories" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Explore"
          title="Skill categories built for real careers"
          subtitle="Seventeen live tracks and more than a hundred sub-skills, each curated with mentors who work in the field today."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category, i) => {
            const Icon =
              (Icons as unknown as Record<string, Icons.LucideIcon>)[category.icon] ??
              Icons.Sparkles;
            return (
              <motion.li
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: (i % 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <a
                  href="#courses"
                  className="group bg-card hover-lift shadow-soft relative block h-full overflow-hidden rounded-2xl p-6 ring-1 ring-border"
                >
                  <span
                    aria-hidden="true"
                    className="gradient-primary absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-400 group-hover:scale-x-100"
                  />
                  <span className="bg-accent text-primary grid size-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-base font-bold">{category.name}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {category.description}
                  </p>
                  <p className="text-primary mt-4 text-xs font-semibold">
                    {category.courses.toLocaleString()} courses
                  </p>
                </a>
              </motion.li>
            );
          })}
        </ul>

        <Reveal delay={0.1} className="mt-10 text-center">
          <p className="text-muted-foreground text-sm">
            Trending now:{" "}
            <span className="text-foreground font-semibold">
              Prompt Engineering · Rust · Motion Design · Financial Modelling
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
