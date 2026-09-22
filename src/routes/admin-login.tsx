import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin-login")({
  head: () => ({ meta: [{ title: "Admin sign in · Skill Binimoy" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { login, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (profile?.role === "ADMIN") {
      void navigate({ to: "/admin" });
    } else if (profile) {
      setError(
        "This Firebase account is valid, but it is not an ADMIN account. Set users/your-user-id/role to ADMIN in Firestore.",
      );
    }
  }, [loading, navigate, profile, user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password, false);
    } catch (reason) {
      setError(getAdminAuthError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page flex min-h-dvh items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-card sm:p-10">
        <Link to="/" className="text-sm font-black tracking-tight text-primary">
          Skill Binimoy
        </Link>
        <div className="mt-10 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ShieldCheck className="size-7" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-primary">
          Restricted workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Admin sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Use an approved Firebase account to manage the Skill Binimoy community.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
          <div className="relative">
            <LockKeyhole className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-11 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-slate-950 dark:bg-primary text-sm font-bold text-white transition hover:bg-primary dark:hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? "Checking access..." : "Enter admin workspace"}
          </button>
        </form>
        <Link
          to="/login"
          className="mt-6 block text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary"
        >
          Return to member sign in
        </Link>
      </section>
    </main>
  );
}

function getAdminAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  )
    return "The Firebase email or password is incorrect. Register this account first at /register.";
  if (code.includes("invalid-email"))
    return "Enter the same valid email used in Firebase Authentication.";
  if (code.includes("operation-not-allowed") || code.includes("configuration-not-found"))
    return "Enable Email/Password in Firebase Console → Authentication → Sign-in method.";
  return error instanceof Error
    ? error.message
    : "Admin sign in failed. Check Firebase Authentication and the Firestore role.";
}
