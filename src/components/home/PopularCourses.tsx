import { motion } from "framer-motion";
import { Bookmark, Clock, Star, Users } from "lucide-react";
import { useState } from "react";

import { SectionHeading } from "@/components/common/Reveal";
import { Button } from "@/components/ui/button";
import { courses } from "@/data/content";
import { cn } from "@/lib/utils";

export function PopularCourses() {
  const [saved, setSaved] = useState<string[]>([]);

  return (
    <section id="courses" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Popular"
          title="Courses learners finish and recommend"
          subtitle="Project-based curricula with live checkpoints, peer review, and a certificate that links to your public profile."
        />

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {courses.map((course, i) => {
            const isSaved = saved.includes(course.title);
            return (
              <motion.li
                key={course.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <article className="bg-card hover-lift shadow-soft ring-border group flex h-full flex-col overflow-hidden rounded-3xl ring-1">
                  <div className={cn("relative aspect-[16/10] bg-linear-to-br", course.tint)}>
                    <span className="glass-dark text-primary-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold">
                      {course.tag}
                    </span>
                    <button
                      type="button"
                      aria-label={
                        isSaved ? `Remove ${course.title} from saved` : `Save ${course.title}`
                      }
                      aria-pressed={isSaved}
                      onClick={() =>
                        setSaved((prev) =>
                          prev.includes(course.title)
                            ? prev.filter((t) => t !== course.title)
                            : [...prev, course.title],
                        )
                      }
                      className="glass-dark text-primary-foreground absolute top-3 right-3 grid size-11 place-items-center rounded-xl transition-transform hover:scale-105"
                    >
                      <Bookmark
                        className={cn("size-4", isSaved && "fill-current")}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="text-muted-foreground flex items-center gap-3 text-xs font-semibold">
                      <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-1">
                        {course.level}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {course.duration}
                      </span>
                    </div>

                    <h3 className="mt-4 text-base leading-snug font-bold">{course.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">by {course.instructor}</p>

                    <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Star className="fill-warning text-warning size-4" aria-hidden="true" />
                        <span className="text-foreground font-bold">{course.rating}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-4" aria-hidden="true" />
                        {course.students.toLocaleString()}
                      </span>
                    </div>

                    <Button variant="hero" className="mt-6 w-full">
                      Enroll now
                    </Button>
                  </div>
                </article>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
