import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/common/Reveal";
import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section id="cta" className="section">
      <div className="container-x">
        <Reveal>
          <div className="gradient-deep shadow-lift relative overflow-hidden rounded-[2rem] px-8 py-16 text-center sm:px-16 lg:py-24">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="animate-blob absolute -top-16 -left-10 size-72 rounded-full bg-white/10 blur-3xl" />
              <div className="animate-blob absolute -right-10 -bottom-20 size-80 rounded-full bg-white/10 blur-3xl [animation-delay:-8s]" />
            </div>

            <div className="relative">
              <h2 className="text-primary-foreground text-3xl sm:text-4xl lg:text-5xl">
                Ready to Exchange Your Skills?
              </h2>
              <p className="text-primary-foreground/80 mx-auto mt-5 max-w-xl text-lg">
                Join thousands of learners and mentors today.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  asChild
                  className="bg-surface text-primary hover:-translate-y-0.5 hover:opacity-95"
                >
                  <Link to="/login">
                    Start Learning <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="glass" size="lg" asChild>
                  <Link to="/login">Become a Mentor</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
