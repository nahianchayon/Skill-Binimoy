import { Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function ProtectedView({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, profile, loading, configured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [loading, navigate, user]);

  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading your workspace...
      </div>
    );
  if (!user) return null;
  if (adminOnly && profile?.role !== "ADMIN")
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <LockKeyhole className="size-10 text-primary" />
        <h1 className="text-2xl">Admin access required</h1>
        <p className="text-muted-foreground">This area is restricted to platform administrators.</p>
        <Link to="/dashboard" className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">
          Return to dashboard
        </Link>
      </div>
    );
  return (
    <>
      {!configured && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm text-warning-foreground">
          Demo mode is active. Any non-empty login works; add Firebase values later to enable live
          data.
        </div>
      )}
      {children}
    </>
  );
}
