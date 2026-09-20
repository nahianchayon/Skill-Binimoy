import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { createRecord, watchRecords } from "@/lib/firestore";
import { useAuth } from "@/lib/auth";
import { mentors as defaultMentors } from "@/data/content";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";

type Tutor = {
  id: string;
  userId?: string | undefined;
  applicationId?: string | undefined;
  displayName?: string | undefined;
  name?: string | undefined;
  photoURL?: string | undefined;
  expertise?: string | undefined;
  role?: string | undefined;
  skills?: string[] | undefined;
  skillsOffered?: string[] | undefined;
  rating?: number | undefined;
  sessionsCompleted?: number | undefined;
  hourlyRate?: string | undefined;
  bio?: string | undefined;
  status?: string | undefined;
  availability?: string | undefined;
  education?: string | undefined;
  experience?: string | undefined;
};

type AppUser = {
  id: string;
  uid?: string | undefined;
  displayName?: string | undefined;
  name?: string | undefined;
  photoURL?: string | undefined;
  bio?: string | undefined;
  skillsOffered?: string[] | undefined;
  skillsWanted?: string[] | undefined;
  tutorVerified?: boolean | undefined;
  role?: string | undefined;
  hourlyRate?: string | undefined;
};

type TutorApp = {
  id: string;
  userId?: string | undefined;
  displayName?: string | undefined;
  name?: string | undefined;
  photoURL?: string | undefined;
  skills?: string[] | undefined;
  skillsOffered?: string[] | undefined;
  education?: string | undefined;
  experience?: string | undefined;
  bio?: string | undefined;
  hourlyRate?: string | undefined;
  availability?: string | undefined;
  status?: string | undefined;
};

export const Route = createFileRoute("/tutors")({
  head: () => ({ meta: [{ title: "Find tutors · Skill Binimoy" }] }),
  component: TutorsPage,
});

function TutorsPage() {
  const { user, profile } = useAuth();
  const [dbTutors, setDbTutors] = useState<Tutor[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [applications, setApplications] = useState<TutorApp[]>([]);
  const [search, setSearch] = useState("");
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("18:00");
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);

  async function handleBookSession(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !bookingTutor) return;
    setBookingSubmitting(true);
    try {
      const tutorUserId = bookingTutor.userId || bookingTutor.id;
      const studentName = profile?.displayName || user.displayName || "Student";
      const tutorName = bookingTutor.displayName || bookingTutor.name || "Tutor";

      const sessionDoc = await createRecord("sessions", {
        participantIds: [user.uid, tutorUserId],
        studentId: user.uid,
        studentName: studentName,
        studentPhoto: profile?.photoURL || user.photoURL || null,
        tutorId: tutorUserId,
        tutorName: tutorName,
        tutorPhoto: bookingTutor.photoURL || null,
        date: bookingDate,
        time: bookingTime,
        topic: bookingTopic.trim(),
        notes: bookingNotes.trim(),
        hourlyRate: bookingTutor.hourlyRate || "500",
        status: "PENDING",
        title: `Mentorship: ${bookingTopic.trim()}`,
        description: `Session between ${studentName} and ${tutorName} on ${bookingDate} at ${bookingTime}.`,
      });

      await createRecord("notifications", {
        recipientId: tutorUserId,
        title: "New Session Booking Request",
        description: `${studentName} requested a mentorship session on “${bookingTopic.trim()}” (${bookingDate} at ${bookingTime}).`,
        status: "UNREAD",
        type: "SESSION_REQUEST",
        sessionId: sessionDoc.id,
      }).catch(console.warn);

      setBookingNotice(`Session booked with ${tutorName}! You can manage it under Calendar.`);
      setBookingTutor(null);
      setBookingTopic("");
      setBookingNotes("");
    } catch (error) {
      setBookingNotice(error instanceof Error ? error.message : "Could not book session.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  useEffect(() => {
    const unsubTutors = watchRecords<Tutor>("tutors", [], setDbTutors);
    const unsubUsers = watchRecords<AppUser>("users", [], setUsers);
    const unsubApps = watchRecords<TutorApp>("tutorApplications", [], setApplications);
    return () => {
      unsubTutors();
      unsubUsers();
      unsubApps();
    };
  }, []);

  const allTutors = useMemo(() => {
    const map = new Map<string, Tutor>();

    // 1. Process records from the "tutors" collection
    dbTutors.forEach((t) => {
      const user = users.find((u) => u.id === t.userId || u.uid === t.userId);
      const app = applications.find((a) => a.id === t.applicationId || a.userId === t.userId);

      const nameCandidate =
        (t.displayName &&
        t.displayName !== "Verified tutor" &&
        t.displayName !== "Skill Binimoy tutor"
          ? t.displayName
          : "") ||
        t.name ||
        user?.displayName ||
        user?.name ||
        app?.displayName ||
        app?.name ||
        t.displayName ||
        "Verified Tutor";

      const photo = t.photoURL || user?.photoURL || app?.photoURL || "";

      const rawSkills = (t.skills && t.skills.length > 0 ? t.skills : null) ||
        (t.skillsOffered && t.skillsOffered.length > 0 ? t.skillsOffered : null) ||
        (app?.skills && app.skills.length > 0 ? app.skills : null) ||
        (app?.skillsOffered && app.skillsOffered.length > 0 ? app.skillsOffered : null) ||
        (user?.skillsOffered && user.skillsOffered.length > 0 ? user.skillsOffered : null) ||
        (t.expertise
          ? t.expertise
              .split(/[,·]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : null) || ["Skill Mentorship", "Career Coaching", "Practical Practice"];

      const expertise =
        t.expertise ||
        t.role ||
        app?.experience ||
        app?.education ||
        (rawSkills.length > 0 ? rawSkills.join(" · ") : "Skill Specialist");

      const bio =
        t.bio ||
        app?.bio ||
        user?.bio ||
        "Verified member offering focused 1-on-1 skill guidance, mentorship, and practical projects.";

      const enriched: Tutor = {
        ...t,
        displayName: nameCandidate,
        name: nameCandidate,
        photoURL: photo,
        skills: rawSkills,
        skillsOffered: rawSkills,
        expertise,
        bio,
        hourlyRate: t.hourlyRate || app?.hourlyRate || user?.hourlyRate || "500",
        rating: t.rating || 5.0,
        sessionsCompleted: t.sessionsCompleted || 1,
      };

      map.set(t.id || t.userId || nameCandidate, enriched);
    });

    // 2. Include any users who are marked as tutorVerified or have role === "TUTOR"
    users
      .filter((u) => u.tutorVerified === true || u.role === "TUTOR")
      .forEach((u) => {
        const key = u.uid || u.id;
        if (!map.has(key)) {
          const skills = (u.skillsOffered && u.skillsOffered.length > 0
            ? u.skillsOffered
            : null) || ["Skill Mentorship", "1-on-1 Coaching"];
          map.set(key, {
            id: key,
            userId: key,
            displayName: u.displayName || u.name || "Verified Tutor",
            photoURL: u.photoURL,
            skills,
            skillsOffered: skills,
            expertise: skills.join(" · "),
            bio: u.bio || "Verified community tutor ready to guide your learning journey.",
            hourlyRate: u.hourlyRate || "500",
            rating: 5.0,
            sessionsCompleted: 1,
            status: "APPROVED",
          });
        }
      });

    // 3. Fallback to default verified community mentors so the page is always complete
    defaultMentors.forEach((m, idx) => {
      const key = `mentor-seed-${idx}`;
      if (!map.has(m.name)) {
        map.set(key, {
          id: key,
          displayName: m.name,
          name: m.name,
          expertise: m.role,
          role: m.role,
          skills: m.skills,
          skillsOffered: m.skills,
          rating: m.rating,
          sessionsCompleted: m.reviews,
          hourlyRate: "600",
          bio: `${m.role} with ${m.experience}. Offering focused 1-on-1 mentorship, technical reviews, and practical guidance.`,
          status: "APPROVED",
        });
      }
    });

    return Array.from(map.values());
  }, [dbTutors, users, applications]);

  const visible = allTutors.filter((tutor) => {
    const text = [
      tutor.displayName,
      tutor.name,
      tutor.expertise,
      tutor.bio,
      ...(tutor.skills || []),
      ...(tutor.skillsOffered || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <WorkspaceShell title="Find a tutor" eyebrow="Learn from experience">
      <div className="space-y-8">
        <section className="tutors-hero">
          <div>
            <p className="eyebrow text-primary">Verified teaching community</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Find someone who has done the work.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Browse verified tutors, view the exact skills they offer, compare experience, and book
              a focused session around your goal.
            </p>
          </div>
          <Link
            to="/become-tutor"
            className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-hover transition"
          >
            Become a tutor
          </Link>
        </section>

        <div className="flex items-center gap-3 rounded-2xl border border-input bg-card px-4 shadow-2xs text-foreground">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tutors by name or what they offer (e.g. React, Python, UI/UX)..."
            className="h-12 flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {bookingNotice && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4 text-sm font-bold text-primary">
            <span>{bookingNotice}</span>
            <button onClick={() => setBookingNotice("")} className="hover:opacity-75">
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <BookOpen className="mx-auto size-10 text-primary mb-3" />
              <h3 className="text-lg font-black text-slate-950 dark:text-white">No tutors found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Try searching for a different skill or name.
              </p>
            </div>
          ) : (
            visible.map((tutor) => {
              const tutorName = tutor.displayName || tutor.name || "Verified Tutor";
              const initials =
                tutorName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "T";
              const skillsList = tutor.skills || tutor.skillsOffered || [];

              return (
                <article
                  key={tutor.id}
                  className="tutor-card flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 hover:shadow-lift transition-all"
                >
                  <div>
                    {/* Top: Profile Photo/Avatar, Name, and Verified Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() =>
                          setViewingProfile({
                            uid: tutor.userId || tutor.id,
                            id: tutor.userId || tutor.id,
                            displayName: tutorName,
                            photoURL: tutor.photoURL,
                            role: "TUTOR",
                            bio: tutor.bio,
                            hourlyRate: tutor.hourlyRate,
                            education: tutor.education,
                            availability: tutor.availability,
                            skillsOffered: tutor.skillsOffered || tutor.skills,
                            tutorVerified: true,
                          })
                        }
                        className="flex items-center gap-3.5 cursor-pointer group flex-1 min-w-0"
                      >
                        {tutor.photoURL ? (
                          <img
                            src={tutor.photoURL}
                            alt={tutorName}
                            className="size-14 rounded-2xl object-cover ring-2 ring-primary/20 group-hover:ring-primary shrink-0 transition"
                          />
                        ) : (
                          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-lg font-black text-primary ring-2 ring-primary/10 group-hover:bg-primary group-hover:text-white shrink-0 shadow-xs transition">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black text-slate-950 dark:text-white truncate leading-snug group-hover:text-primary transition">
                            {tutorName}
                          </h3>
                          <p className="text-xs font-extrabold text-primary truncate mt-0.5">
                            {tutor.expertise || "Skill Mentor"}
                          </p>
                        </div>
                      </div>
                      <span className="verified-badge shrink-0">
                        <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400" /> Verified
                      </span>
                    </div>

                    {/* What they offer - Prominently Displayed Skills */}
                    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 p-3.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        <Sparkles className="size-3.5 text-primary" />
                        <span>What they offer:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {skillsList.length > 0 ? (
                          skillsList.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center rounded-lg bg-card px-2.5 py-1 text-xs font-extrabold text-foreground border border-border shadow-2xs"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            1-on-1 mentorship & skill guidance
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bio & Details */}
                    <p className="mt-3.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-3 font-normal">
                      {tutor.bio || "Passionate tutor dedicated to helping learners excel in practical skills."}
                    </p>
                  </div>

                  {/* Bottom: Rating, Price, & Action Buttons */}
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        <span>{tutor.rating || 5.0}</span>
                        <span className="font-medium text-muted-foreground">
                          ({tutor.sessionsCompleted || 1})
                        </span>
                      </div>
                      <div className="mt-0.5 text-base font-black text-primary">
                        ৳{tutor.hourlyRate || "500"}
                        <span className="text-xs font-normal text-muted-foreground">/hr</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to="/messages"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
                        title="Chat with tutor"
                      >
                        <MessageCircle className="size-4" /> Chat
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingTutor(tutor);
                          setBookingTopic(
                            `Mentorship in ${(tutor.skillsOffered || tutor.skills || [])[0] || "skills"}`,
                          );
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setBookingDate(tomorrow.toISOString().split("T")[0] || "");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <CalendarDays className="size-4" /> Book Session
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Booking Modal */}
        {bookingTutor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {bookingTutor.photoURL ? (
                    <img
                      src={bookingTutor.photoURL}
                      alt={bookingTutor.displayName || "Tutor"}
                      className="size-12 rounded-xl object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
                      {(bookingTutor.displayName || bookingTutor.name || "T").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h3 className="font-black text-base text-slate-950">
                      Book Session with {bookingTutor.displayName || "Tutor"}
                    </h3>
                    <p className="text-xs text-primary font-bold">
                      ৳{bookingTutor.hourlyRate || "500"}/hour · 1-on-1 Mentorship
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBookingTutor(null)}
                  className="rounded-xl p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleBookSession} className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Date
                    <input
                      required
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Time Slot
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="10:00 AM">10:00 AM - 11:00 AM</option>
                      <option value="11:30 AM">11:30 AM - 12:30 PM</option>
                      <option value="02:00 PM">02:00 PM - 03:00 PM</option>
                      <option value="04:00 PM">04:00 PM - 05:00 PM</option>
                      <option value="06:00 PM">06:00 PM - 07:00 PM</option>
                      <option value="08:00 PM">08:00 PM - 09:00 PM</option>
                      <option value="09:30 PM">09:30 PM - 10:30 PM</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-bold text-muted-foreground">
                  Session Topic / Goal
                  <input
                    required
                    value={bookingTopic}
                    onChange={(e) => setBookingTopic(e.target.value)}
                    placeholder="e.g., Code review for React project, Python algorithms..."
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  Additional Notes (Optional)
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Share any background or specific questions you have..."
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setBookingTutor(null)}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition"
                  >
                    <CalendarDays className="size-3.5" />
                    {bookingSubmitting ? "Requesting..." : "Confirm & Send Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {viewingProfile && (
          <ProfileModal
            profile={viewingProfile}
            onClose={() => setViewingProfile(null)}
          />
        )}
      </div>
    </WorkspaceShell>
  );
}
