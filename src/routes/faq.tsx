import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { FaqContent } from "@/components/faq/FaqContent";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "Frequently Asked Questions · Skill Binimoy" }] }),
  component: FaqPage,
});

function FaqPage() {
  const { user } = useAuth();

  if (user) {
    return (
      <WorkspaceShell title="Frequently Asked Questions" eyebrow="Learn how Skill Binimoy works">
        <FaqContent />
      </WorkspaceShell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navbar />
      <main className="pt-24 pb-16 flex-1">
        <div className="container-x">
          <FaqContent />
        </div>
      </main>
      <Footer />
    </div>
  );
}
