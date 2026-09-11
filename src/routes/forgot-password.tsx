import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · Skill Binimoy" }] }),
  component: ForgotPasswordPage,
});
function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      await resetPassword(email);
      setStatus("Check your inbox for a password reset link.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the reset email.");
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <Link to="/login" className="text-sm font-bold text-primary">
          Back to login
        </Link>
        <h1 className="mt-10 text-3xl font-black">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We will send a secure reset link to your verified email.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            required
            type="email"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {status && <p className="text-sm text-success">{status}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">
            Send reset link
          </button>
        </form>
      </section>
    </main>
  );
}
