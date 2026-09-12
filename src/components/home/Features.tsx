import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  BrainCircuit,
  Compass,
  Gamepad2,
  MessageSquare,
  Repeat2,
  ScrollText,
  Trophy,
  Users,
  Video,
} from "lucide-react";

import { SectionHeading } from "@/components/common/Reveal";

const features = [
  { icon: Video, title: "Live Classes", body: "HD sessions with recording, whiteboard and notes." },
  {
    icon: ScrollText,
    title: "Certificates",
    body: "Verifiable credentials linked to your profile.",
  },
  { icon: Users, title: "Community", body: "Cohorts, study rooms and local meetups." },
  { icon: MessageSquare, title: "Messaging", body: "Threaded chat with files and code snippets." },
  { icon: Repeat2, title: "Skill Exchange", body: "Trade your expertise instead of paying cash." },
  {
    icon: BrainCircuit,
    title: "AI Recommendations",
    body: "Matches tuned to your goals and pace.",
  },
  { icon: Compass, title: "Career Guidance", body: "Roadmaps built with industry practitioners." },
  { icon: BarChart3, title: "Progress Tracking", body: "Milestones, streaks and weekly reviews." },
  { icon: Gamepad2, title: "Gamification", body: "XP, quests and levels that stay meaningful." },
  { icon: Trophy, title: "Leaderboards", body: "Compare progress with your cohort." },
  { icon: Award, title: "Achievements", body: "Badges that signal proven, reviewed skill." },
];

export function Features() {
  return (
    <section id="features" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Platform"
          title="Everything a serious learner needs"
          subtitle="Purpose-built tools for teaching, learning and proving what you know — in one calm workspace."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.li
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="group bg-card hover-lift shadow-soft ring-border flex gap-4 rounded-2xl p-6 ring-1"
            >
              <span className="bg-accent text-primary grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold">{feature.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{feature.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
