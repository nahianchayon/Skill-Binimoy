import { BadgeCheck, Star } from "lucide-react";

import { Reveal, SectionHeading } from "@/components/common/Reveal";
import { Button } from "@/components/ui/button";
import { mentors } from "@/data/content";

export function FeaturedMentors() {
  return (
    <section className="bg-surface section border-y">
      <div className="container-x">
        <SectionHeading
          eyebrow="Mentors"
          title="Learn beside people who ship every day"
          subtitle="Every mentor is identity-verified and reviewed after each session, so quality stays consistently high."
        />

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {mentors.map((mentor, i) => (
            <Reveal key={mentor.name} delay={i * 0.08}>
              <article className="bg-card hover-lift shadow-soft ring-border flex h-full flex-col rounded-3xl p-6 ring-1">
                <div className="flex items-center gap-4">
                  <span className="gradient-primary text-primary-foreground grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold">
                    {mentor.initials}
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate text-base font-bold">
                      {mentor.name}
                      <BadgeCheck
                        className="text-primary size-4 shrink-0"
                        aria-label="Verified mentor"
                      />
                    </h3>
                    <p className="text-muted-foreground truncate text-xs">{mentor.role}</p>
                  </div>
                </div>

                <div className="text-muted-foreground mt-5 flex items-center gap-2 text-sm">
                  <Star className="fill-warning text-warning size-4" aria-hidden="true" />
                  <span className="text-foreground font-bold">{mentor.rating}</span>
                  <span>({mentor.reviews} reviews)</span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{mentor.experience}</p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {mentor.skills.map((skill) => (
                    <li
                      key={skill}
                      className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>

                <Button variant="outline" className="mt-6 w-full">
                  Book a session
                </Button>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
