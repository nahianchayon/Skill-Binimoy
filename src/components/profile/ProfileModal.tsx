import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getRecord, watchRecords, where } from "@/lib/firestore";

export type ProfileData = {
  uid?: string | undefined;
  id?: string | undefined;
  displayName?: string | undefined;
  name?: string | undefined;
  email?: string | null | undefined;
  photoURL?: string | null | undefined;
  role?: string | undefined;
  bio?: string | undefined;
  skillsOffered?: string[] | undefined;
  skillsWanted?: string[] | undefined;
  skills?: string[] | string | undefined;
  education?: string | undefined;
  location?: string | undefined;
  availability?: string | undefined;
  tutorVerified?: boolean | undefined;
  premium?: boolean | undefined;
  rating?: number | undefined;
  hourlyRate?: string | undefined;
};

interface ProfileModalProps {
  profile: ProfileData | null;
  onClose: () => void;
  onSendExchange?: (profile: ProfileData) => void;
}

type UserPost = {
  id: string;
  title?: string;
  postType?: string;
  category?: string;
  description?: string;
  createdAt?: unknown;
};

export function ProfileModal({ profile: initialProfile, onClose, onSendExchange }: ProfileModalProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [memberPosts, setMemberPosts] = useState<UserPost[]>([]);

  useEffect(() => {
    setProfile(initialProfile);
    const targetUid = initialProfile?.uid || initialProfile?.id;
    if (!targetUid) return;

    let isMounted = true;
    setLoading(true);

    // 1. Fetch complete user profile from Firestore 'users'
    getRecord("users", targetUid)
      .then(async (userSnap) => {
        if (!isMounted) return;
        let userData: Record<string, unknown> = {};
        if (userSnap && userSnap.exists()) {
          userData = userSnap.data() || {};
        }

        // 2. Fetch tutor doc if applicant/verified tutor
        let tutorData: Record<string, unknown> = {};
        try {
          const tutorSnap = await getRecord("tutors", targetUid);
          if (tutorSnap && tutorSnap.exists()) {
            tutorData = tutorSnap.data() || {};
          }
        } catch {
          // ignore
        }

        if (isMounted) {
          setProfile((prev) => {
            if (!prev) return null;

            const userSkillsOffered = Array.isArray(userData["skillsOffered"])
              ? (userData["skillsOffered"] as string[])
              : [];
            const tutorSkills = Array.isArray(tutorData["skillsOffered"])
              ? (tutorData["skillsOffered"] as string[])
              : Array.isArray(tutorData["skills"])
                ? (tutorData["skills"] as string[])
                : [];
            const prevOffered = Array.isArray(prev.skillsOffered) ? prev.skillsOffered : [];

            const skillsOffered =
              userSkillsOffered.length > 0
                ? userSkillsOffered
                : tutorSkills.length > 0
                  ? tutorSkills
                  : prevOffered;

            const userSkillsWanted = Array.isArray(userData["skillsWanted"])
              ? (userData["skillsWanted"] as string[])
              : [];
            const prevWanted = Array.isArray(prev.skillsWanted) ? prev.skillsWanted : [];
            const skillsWanted = userSkillsWanted.length > 0 ? userSkillsWanted : prevWanted;

            const rawBio =
              (typeof userData["bio"] === "string" ? userData["bio"] : "") ||
              (typeof tutorData["bio"] === "string" ? tutorData["bio"] : "") ||
              prev.bio ||
              "";

            const fallbackBio =
              rawBio.trim() ||
              (skillsOffered.length > 0
                ? `Skill Binimoy member active in the community. Passionate about sharing skills in ${skillsOffered.slice(0, 3).join(", ")} and collaborating with peers.`
                : "Active community member on Skill Binimoy. Open for barter skill exchange and collaborative learning.");

            const education =
              (typeof userData["education"] === "string" ? userData["education"] : "") ||
              (typeof tutorData["education"] === "string" ? tutorData["education"] : "") ||
              prev.education ||
              "Verified Student / Learner";

            const location =
              (typeof userData["location"] === "string" ? userData["location"] : "") ||
              (typeof tutorData["location"] === "string" ? tutorData["location"] : "") ||
              prev.location ||
              "Dhaka, Bangladesh";

            const availability =
              (typeof userData["availability"] === "string" ? userData["availability"] : "") ||
              (typeof tutorData["availability"] === "string" ? tutorData["availability"] : "") ||
              prev.availability ||
              "Flexible (Online & Remote)";

            const role =
              (typeof userData["role"] === "string" ? userData["role"] : "") ||
              (typeof tutorData["role"] === "string" ? tutorData["role"] : "") ||
              prev.role ||
              "MEMBER";

            return {
              ...prev,
              uid: targetUid,
              id: targetUid,
              displayName:
                (typeof userData["displayName"] === "string" ? userData["displayName"] : "") ||
                (typeof tutorData["displayName"] === "string" ? tutorData["displayName"] : "") ||
                prev.displayName ||
                "Community Member",
              photoURL:
                (typeof userData["photoURL"] === "string" ? userData["photoURL"] : null) ||
                (typeof tutorData["photoURL"] === "string" ? tutorData["photoURL"] : null) ||
                prev.photoURL,
              email:
                (typeof userData["email"] === "string" ? userData["email"] : null) || prev.email,
              role,
              bio: fallbackBio,
              education,
              location,
              availability,
              skillsOffered,
              skillsWanted,
              tutorVerified:
                Boolean(userData["tutorVerified"]) ||
                tutorData["status"] === "APPROVED" ||
                Boolean(prev.tutorVerified),
              premium: Boolean(userData["premium"]) || Boolean(prev.premium),
              rating:
                typeof tutorData["rating"] === "number"
                  ? tutorData["rating"]
                  : prev.rating,
              hourlyRate:
                (typeof tutorData["hourlyRate"] === "string" ? tutorData["hourlyRate"] : "") ||
                (typeof userData["hourlyRate"] === "string" ? userData["hourlyRate"] : "") ||
                prev.hourlyRate,
            };
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load user profile details:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 3. Query recent posts/offers by this member
    const stopPosts = watchRecords<UserPost>(
      "posts",
      [where("authorId", "==", targetUid)],
      (posts) => {
        if (isMounted) {
          const sorted = [...posts].sort((a, b) => {
            const timeA = typeof a.createdAt === "object" && a.createdAt !== null && "seconds" in a.createdAt
              ? (a.createdAt as { seconds: number }).seconds * 1000
              : new Date((a.createdAt as string) || 0).getTime();
            const timeB = typeof b.createdAt === "object" && b.createdAt !== null && "seconds" in b.createdAt
              ? (b.createdAt as { seconds: number }).seconds * 1000
              : new Date((b.createdAt as string) || 0).getTime();
            return timeB - timeA;
          });
          setMemberPosts(sorted.slice(0, 3));
        }
      },
      () => {},
    );

    return () => {
      isMounted = false;
      stopPosts();
    };
  }, [initialProfile?.uid, initialProfile?.id]);

  if (!profile) return null;

  const isOwnProfile =
    currentUser && (currentUser.uid === profile.uid || currentUser.uid === profile.id);

  const displayName =
    profile.displayName || profile.name || profile.email?.split("@")[0] || "Community Member";

  const rawOffered = profile.skillsOffered || [];
  const offeredList: string[] = Array.isArray(rawOffered)
    ? rawOffered
    : typeof rawOffered === "string"
      ? (rawOffered as string).split(",").map((s) => s.trim())
      : [];

  const rawWanted = profile.skillsWanted || [];
  const wantedList: string[] = Array.isArray(rawWanted)
    ? rawWanted
    : typeof rawWanted === "string"
      ? (rawWanted as string).split(",").map((s) => s.trim())
      : [];

  const isVerified = Boolean(
    profile.tutorVerified ||
    profile.premium ||
    (profile.uid && typeof window !== "undefined" && localStorage.getItem(`sb_premium_${profile.uid}`) === "true") ||
    (profile.id && typeof window !== "undefined" && localStorage.getItem(`sb_premium_${profile.id}`) === "true")
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card text-card-foreground shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover Banner */}
        <div className="relative h-28 w-full bg-gradient-to-r from-primary via-indigo-600 to-sky-500">
          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Avatar & Main Info Row */}
        <div className="relative px-6 pb-6 pt-0">
          <div className="-mt-14 mb-4 flex items-end justify-between">
            <div className="relative">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={displayName}
                  className="size-24 rounded-2xl object-cover ring-4 ring-card shadow-lg"
                />
              ) : (
                <div className="grid size-24 place-items-center rounded-2xl bg-primary text-2xl font-black text-white ring-4 ring-card shadow-lg">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              {isVerified && (
                <span
                  title="Verified Member"
                  className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-primary text-white ring-2 ring-card"
                >
                  <BadgeCheck className="size-4" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {loading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground animate-pulse">
                  <Loader2 className="size-3 animate-spin" /> Syncing...
                </span>
              )}

              {isOwnProfile ? (
                <Link
                  to="/settings"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground shadow-xs transition hover:bg-primary-soft hover:text-primary"
                >
                  Edit Profile
                </Link>
              ) : (
                <>
                  <Link
                    to="/messages"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-foreground shadow-xs transition hover:bg-primary-soft hover:text-primary"
                  >
                    <MessageCircle className="size-3.5" /> Chat
                  </Link>
                  {onSendExchange && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSendExchange(profile);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-95"
                    >
                      <Send className="size-3.5" /> Swap Skills
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{displayName}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                  profile.role === "ADMIN"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    : profile.role === "TUTOR"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {profile.role || "Member"}
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <BadgeCheck className="size-3" /> Verified ID
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  {profile.location}
                </span>
              )}
              {profile.education && (
                <span className="flex items-center gap-1 font-medium">
                  <GraduationCap className="size-3.5 text-primary shrink-0" />
                  {profile.education}
                </span>
              )}
              {profile.availability && (
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="size-3.5 text-primary shrink-0" />
                  {profile.availability}
                </span>
              )}
              {profile.email && isOwnProfile && (
                <span className="flex items-center gap-1 font-medium">
                  <Mail className="size-3.5 text-primary shrink-0" />
                  {profile.email}
                </span>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <User className="size-3.5 text-primary" /> About Me
            </h3>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              {profile.bio}
            </p>
          </div>

          {/* Skill Breakdown: Can Teach vs Wants to Learn */}
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                <Sparkles className="size-3.5" />
                <span>Can Teach (Offered Skills)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {offeredList.length > 0 ? (
                  offeredList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    Open for peer knowledge sharing and guidance.
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                <BookOpen className="size-3.5" />
                <span>Wants to Learn (Desired Skills)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {wantedList.length > 0 ? (
                  wantedList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-300"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    Interested in exploring new topics and expanding skills.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Member's Recent Posts / Swap Offers */}
          {memberPosts.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" /> Community Posts & Offers
              </h3>
              <div className="space-y-2">
                {memberPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-xl border border-border p-3 bg-background/50 hover:bg-background transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                        {post.title || "Community Post"}
                      </span>
                      <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                        {post.postType === "QUESTION" ? "Q&A" : "Skill Swap"}
                      </span>
                    </div>
                    {post.description && (
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {post.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly rate if tutor */}
          {profile.hourlyRate && (
            <div className="mt-5 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <span className="font-bold text-foreground">1-on-1 Mentorship Rate:</span>
              <span className="text-sm font-black text-primary">৳{profile.hourlyRate}/hr</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
