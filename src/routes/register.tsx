import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account · Skill Binimoy" }] }),
  component: RegisterPage,
});

function getFriendlyAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: string }).code)
      : String(err);

  if (code.includes("email-already-in-use")) {
    return "An account with this email already exists. Please log in.";
  }
  if (code.includes("weak-password")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code.includes("invalid-email")) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }
  if (code.includes("network-request-failed")) {
    return "Network connection issue. Please check your internet and try again.";
  }
  if (code.includes("operation-not-allowed")) {
    return "Email/Password sign-up is currently disabled in Firebase Console.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Could not create your account. Please check your information and try again.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.63 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.68 0 2.8.71 3.45 1.32l2.35-2.27C16.3 3.87 14.36 3 12 3a9 9 0 1 0 0 18c5.2 0 8.64-3.65 8.64-8.8 0-.59-.06-1.04-.29-2.1Z"
      />
    </svg>
  );
}

function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await register(form.email, form.password, form.name);
      await navigate({ to: "/dashboard" });
    } catch (reason) {
      console.error("Registration error:", reason);
      setError(getFriendlyAuthError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function handleGoogleSignUp() {
    setSaving(true);
    setError("");
    try {
      await loginWithGoogle();
      await navigate({ to: "/dashboard" });
    } catch (reason) {
      console.error("Google sign-up error:", reason);
      setError(getFriendlyAuthError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-card">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-xl font-black text-primary hover:opacity-90 transition">
            skill binimoy
          </Link>
          <Link
            to="/login"
            className="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
          >
            <ArrowLeft className="size-3.5" /> Back to Log in
          </Link>
        </div>

        <h1 className="text-3xl font-black text-foreground">Start your exchange</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a trusted profile and meet your next learning partner.
        </p>

        {/* 1-Click Google Sign Up */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => void handleGoogleSignUp()}
            disabled={saving}
            className="w-full h-11 inline-flex items-center justify-center gap-2.5 rounded-xl border border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-foreground transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            or with email
          </span>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p>{error}</p>
              {error.includes("already exists") && (
                <Link to="/login" className="mt-1 block text-primary hover:underline font-bold">
                  Go to Login page →
                </Link>
              )}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                required
                minLength={2}
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary transition"
                placeholder="e.g. Nahian Chayon"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                required
                type="email"
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary transition"
                placeholder="name@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Password <span className="text-muted-foreground font-normal">(min. 6 characters)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                required
                type="password"
                minLength={6}
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary transition"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </div>
          </div>

          <button
            disabled={saving}
            className="mt-2 h-11 w-full rounded-xl bg-primary font-bold text-sm text-primary-foreground hover:bg-primary-hover shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing up, you agree to Skill Binimoy's{" "}
          <Link to="/" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground pt-4 border-t border-border">
          Already a member?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
