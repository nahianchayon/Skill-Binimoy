import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account · Skill Binimoy" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await register(form.email, form.password, form.name);
      await navigate({ to: "/dashboard" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create your account.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <Link to="/" className="text-xl font-black text-primary">
          skill binimoy
        </Link>
        <h1 className="mt-10 text-3xl font-black">Start your exchange</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a trusted profile and meet your next learning partner.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            required
            minLength={2}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm"
            placeholder="Your name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            required
            type="text"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm"
            placeholder="Email or demo name"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            required
            type="password"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm"
            placeholder="Any password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={saving}
            className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already a member?{" "}
          <Link to="/login" className="font-bold text-primary">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
