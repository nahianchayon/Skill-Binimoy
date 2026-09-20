import { Link, useRouter } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  Crown,
  HelpCircle,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Logo } from "@/components/common/Logo";
import { ProtectedView } from "@/components/common/ProtectedView";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useTheme } from "@/hooks/use-theme";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";

export function WorkspaceShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Live unread notifications listener
  useEffect(() => {
    if (!user || !db) {
      setUnreadNotifications(0);
      return;
    }
    const q = query(collection(db, "notifications"), where("recipientId", "==", user.uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const count = snapshot.docs.filter((d) => {
          const data = d.data();
          return data["status"] === "PENDING" || data["status"] === "UNREAD";
        }).length;
        setUnreadNotifications(count);
      },
      () => setUnreadNotifications(0),
    );
  }, [user]);

  // Live unread messages listener
  useEffect(() => {
    if (!user || !db) {
      setUnreadMessages(0);
      return;
    }
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", user.uid),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        let count = 0;
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const unreadBy = (data["unreadBy"] as string[] | undefined) || [];
          if (unreadBy.includes(user.uid)) {
            count++;
          }
        });
        setUnreadMessages(count);
      },
      () => setUnreadMessages(0),
    );
  }, [user]);
  return (
    <ProtectedView>
      <div className="workspace-app min-h-dvh">
        <header className="workspace-topbar sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xs">
          <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center gap-5 px-5 sm:px-8">
            <Logo className="shrink-0" to="/dashboard" />
            <span className="hidden h-6 w-px bg-slate-200 dark:bg-slate-800 lg:block" />
            <p className="hidden text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:block">
              Learn · Teach · Grow
            </p>
            <nav className="ml-auto hidden items-center gap-1.5 lg:flex">
              <Link
                to="/dashboard"
                activeProps={{ className: "workspace-top-link workspace-top-link-active" }}
                className="workspace-top-link"
              >
                Home
              </Link>
              <Link
                to="/explore"
                activeProps={{ className: "workspace-top-link workspace-top-link-active" }}
                className="workspace-top-link"
              >
                Explore Skills
              </Link>
              <Link
                to="/tutors"
                activeProps={{ className: "workspace-top-link workspace-top-link-active" }}
                className="workspace-top-link"
              >
                Find Tutors
              </Link>
              <Link
                to="/$section"
                params={{ section: "solutions" }}
                activeProps={{ className: "workspace-top-link workspace-top-link-active" }}
                className="workspace-top-link"
              >
                Quick Solutions
              </Link>
              <Link
                to="/shop"
                activeProps={{ className: "workspace-top-link workspace-top-link-active" }}
                className="workspace-top-link"
              >
                Shop
              </Link>
              <Link
                to="/faq"
                activeProps={{ className: "workspace-top-link workspace-top-link-active" }}
                className="workspace-top-link"
              >
                FAQ
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-2.5 lg:ml-5">
              <Link
                to="/explore"
                aria-label="Search skills"
                className="workspace-icon-button hidden sm:grid"
              >
                <Search className="size-[18px]" />
              </Link>
              <Link
                to="/$section"
                params={{ section: "notifications" }}
                aria-label="Notifications"
                className="workspace-icon-button relative grid"
              >
                <Bell className="size-[18px]" />
                {unreadNotifications > 0 && (
                  <span className="workspace-message-badge !bg-rose-500">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                to="/messages"
                aria-label="Messages"
                className="workspace-icon-button relative hidden sm:grid"
              >
                <MessageCircle className="size-[18px]" />
                {unreadMessages > 0 && (
                  <span className="workspace-message-badge">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/$section"
                params={{ section: "premium" }}
                className="workspace-premium-link hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold sm:flex"
              >
                <Crown className="size-3.5 text-amber-600" />
                <span>{(profile?.tutorVerified || profile?.premium) ? "Pro Member" : "Get Pro"}</span>
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="workspace-icon-button grid"
              >
                {theme === "dark" ? (
                  <Sun className="size-[17px] text-amber-400" />
                ) : (
                  <Moon className="size-[17px] text-slate-600" />
                )}
              </button>
              <div className="relative">
                <button
                  aria-label="Open profile menu"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="workspace-profile-button flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-primary-soft"
                >
                  <div className="relative">
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile.displayName || "Member"}
                        className="size-9 rounded-full object-cover ring-4 ring-primary/10"
                      />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground ring-4 ring-primary/10">
                        {(profile?.displayName || "M").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {(profile?.tutorVerified || profile?.premium) && (
                      <span
                        title="Verified Member"
                        className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-white dark:bg-slate-900 ring-1 ring-primary/40 text-primary shadow-xs"
                      >
                        <BadgeCheck className="size-3.5 fill-primary text-white dark:text-slate-900" />
                      </span>
                    )}
                  </div>
                  <span className="hidden max-w-28 truncate text-left text-xs font-bold sm:inline-flex sm:items-center sm:gap-1">
                    {profile?.displayName || "Member"}
                    {(profile?.tutorVerified || profile?.premium) && (
                      <BadgeCheck className="size-3.5 text-primary shrink-0" />
                    )}
                  </span>
                  <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                </button>
                {profileOpen && (
                  <div className="workspace-profile-menu absolute right-0 top-12 w-60 rounded-2xl border border-border bg-white p-2 shadow-card">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setViewingProfile(
                          profile
                            ? { ...profile, email: user?.email }
                            : user
                              ? {
                                  uid: user.uid,
                                  displayName: user.displayName || "Member",
                                  email: user.email,
                                  photoURL: user.photoURL,
                                  role: "USER",
                                }
                              : null,
                        );
                      }}
                      className="w-full text-left rounded-xl border-b border-border px-3 pb-3 pt-2 hover:bg-primary-soft transition"
                    >
                      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-950">
                        {profile?.displayName || "Member"}
                        {(profile?.tutorVerified || profile?.premium) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary">
                            <BadgeCheck className="size-3" /> Verified
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {profile?.email || "Click to preview public profile"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setViewingProfile(
                          profile
                            ? { ...profile, email: user?.email }
                            : user
                              ? {
                                  uid: user.uid,
                                  displayName: user.displayName || "Member",
                                  email: user.email,
                                  photoURL: user.photoURL,
                                  role: "USER",
                                }
                              : null,
                        );
                      }}
                      className="mt-1.5 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold text-primary hover:bg-primary-soft"
                    >
                      <span>View My Profile</span>
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary">Preview</span>
                    </button>
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-primary-soft"
                    >
                      Edit Profile Settings
                    </Link>
                    <Link
                      to="/faq"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-primary-soft"
                    >
                      Help & FAQ Guide
                    </Link>
                    {!(profile?.tutorVerified || profile?.premium) ? (
                      <Link
                        to="/$section"
                        params={{ section: "premium" }}
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <Crown className="size-3.5" /> Get Verified ID
                        </span>
                        <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase">
                          Upgrade
                        </span>
                      </Link>
                    ) : (
                      <Link
                        to="/$section"
                        params={{ section: "premium" }}
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <BadgeCheck className="size-3.5" /> Verified Member
                        </span>
                        <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase">
                          Active
                        </span>
                      </Link>
                    )}
                    {profile?.role === "ADMIN" && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-primary-soft"
                      >
                        Admin Control Room
                      </Link>
                    )}
                    <button
                      onClick={() => void logout().then(() => router.navigate({ to: "/login" }))}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
              <button
                aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                className="workspace-icon-button grid lg:hidden"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <nav className="border-t border-border bg-white px-5 py-3 lg:hidden">
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                Home
              </Link>
              <Link
                to="/explore"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                Explore Skills
              </Link>
              <Link
                to="/tutors"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                Find Tutors
              </Link>
              <Link
                to="/$section"
                params={{ section: "solutions" }}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                Quick Solutions
              </Link>
              <Link
                to="/shop"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                Shop
              </Link>
              <Link
                to="/faq"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                FAQ & Help Guide
              </Link>
              <Link
                to="/messages"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                <span>Messages</span>
                {unreadMessages > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/$section"
                params={{ section: "notifications" }}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                <span>Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                to="/$section"
                params={{ section: "premium" }}
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-primary hover:bg-primary-soft"
              >
                <span className="flex items-center gap-2">
                  <Crown className="size-4" /> Premium & Verified ID
                </span>
                {(profile?.tutorVerified || profile?.premium) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                    <BadgeCheck className="size-3" /> Active
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setViewingProfile(
                    profile
                      ? { ...profile, email: user?.email }
                      : user
                        ? {
                            uid: user.uid,
                            displayName: user.displayName || "Member",
                            email: user.email,
                            photoURL: user.photoURL,
                            role: "USER",
                          }
                        : null,
                  );
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-primary hover:bg-primary-soft"
              >
                <span>View My Profile</span>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-black">Public</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                <span>Appearance</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  {theme === "dark" ? (
                    <>
                      <Sun className="size-4 text-amber-400" /> Dark
                    </>
                  ) : (
                    <>
                      <Moon className="size-4 text-slate-600" /> Light
                    </>
                  )}
                </span>
              </button>
            </nav>
          )}
        </header>
        <main className="workspace-page mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          {children}
        </main>
        {viewingProfile && (
          <ProfileModal
            profile={viewingProfile}
            onClose={() => setViewingProfile(null)}
          />
        )}
      </div>
    </ProtectedView>
  );
}
