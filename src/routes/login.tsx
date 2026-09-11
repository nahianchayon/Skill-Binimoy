import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in · Skill Binimoy" },
      {
        name: "description",
        content:
          "Sign in to Skill Binimoy to continue learning, mentoring and exchanging skills with a verified community.",
      },
      { property: "og:title", content: "Log in · Skill Binimoy" },
      {
        property: "og:description",
        content: "Continue your learning journey on Skill Binimoy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <AuthShowcase />
      <div className="relative flex items-center justify-center px-6 py-12 sm:px-10">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back home
        </Link>
        <LoginForm />
      </div>
    </main>
  );
}
