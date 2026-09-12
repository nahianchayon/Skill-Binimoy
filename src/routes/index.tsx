import { createFileRoute } from "@tanstack/react-router";

import { AiAssistantButton } from "@/components/common/AiAssistantButton";
import { BackToTop } from "@/components/common/BackToTop";
import { ScrollProgress } from "@/components/common/ScrollProgress";
import { Footer } from "@/components/footer/Footer";
import { CallToAction } from "@/components/home/CallToAction";
import { Categories } from "@/components/home/Categories";
import { Features } from "@/components/home/Features";
import { FeaturedMentors } from "@/components/home/FeaturedMentors";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PopularCourses } from "@/components/home/PopularCourses";
import { Statistics } from "@/components/home/Statistics";
import { Testimonials } from "@/components/home/Testimonials";
import { TrustedBy } from "@/components/home/TrustedBy";
import { Navbar } from "@/components/navbar/Navbar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skill Binimoy — Learn. Teach. Grow Together." },
      {
        name: "description",
        content:
          "Skill Binimoy is a skill-exchange marketplace: learn from verified mentors, teach what you know, and build a reputation that opens real opportunities.",
      },
      { property: "og:title", content: "Skill Binimoy — Learn. Teach. Grow Together." },
      {
        property: "og:description",
        content:
          "Exchange skills with verified mentors and learners. Live classes, certificates and a reputation that travels with you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <TrustedBy />
        <Categories />
        <FeaturedMentors />
        <PopularCourses />
        <HowItWorks />
        <Features />
        <Statistics />
        <Testimonials />
        <CallToAction />
      </main>
      <Footer />
      <BackToTop />
      <AiAssistantButton />
    </>
  );
}
