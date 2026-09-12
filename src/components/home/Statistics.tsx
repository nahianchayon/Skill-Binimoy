import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { Reveal } from "@/components/common/Reveal";

const stats = [
  { value: 25000, suffix: "+", label: "Students" },
  { value: 6500, suffix: "+", label: "Mentors" },
  { value: 18000, suffix: "+", label: "Courses" },
  { value: 96, suffix: "%", label: "Success rate" },
];

export function Statistics() {
  return (
    <section className="bg-surface section border-y">
      <div className="container-x">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="text-gradient text-4xl font-extrabold sm:text-5xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-muted-foreground mt-2 text-sm font-semibold tracking-wide uppercase">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
