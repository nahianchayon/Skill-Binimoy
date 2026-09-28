import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  GraduationCap,
  MessageCircle,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from "firebase/firestore";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { createRecord, watchRecords } from "@/lib/firestore";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { mentors as defaultMentors } from "@/data/content";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";

export type CourseVideo = {
  id: string;
  tutorId?: string | undefined;
  tutorName?: string | undefined;
  tutorPhoto?: string | null | undefined;
  title: string;
  category?: string | undefined;
  description?: string | undefined;
  videoUrl: string;
  duration?: string | undefined;
  level?: string | undefined;
  createdAt?: unknown;
};

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

const defaultCourses: CourseVideo[] = [
  {
    id: "default-course-1",
    tutorId: "seed-mentor-1",
    tutorName: "Nafis Fuad",
    title: "Full-Stack React 19 & Next.js Architecture Masterclass",
    category: "Programming & Tech",
    description: "Hands-on guide to server actions, caching strategies, optimistic updates, and performance tuning.",
    videoUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
    duration: "45 mins",
    level: "Intermediate",
  },
  {
    id: "default-course-2",
    tutorId: "seed-mentor-2",
    tutorName: "Ayesha Siddiqua",
    title: "Design Systems in Figma: Complete Token & Component Workflow",
    category: "Design & Creative",
    description: "Build robust design systems, define color and typography tokens, and organize auto-layout components.",
    videoUrl: "https://www.youtube.com/watch?v=kbZ19WVoHQ4",
    duration: "55 mins",
    level: "All Levels",
  },
  {
    id: "default-course-3",
    tutorId: "seed-mentor-3",
    tutorName: "Zubair Ahmed",
    title: "Python Machine Learning: Neural Networks from Scratch",
    category: "Data Science & AI",
    description: "Master forward and backward propagation, loss functions, and train models using PyTorch.",
    videoUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
    duration: "60 mins",
    level: "Advanced",
  },
];

function getVideoEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("youtube.com/watch?v=")) {
    const id = url.split("watch?v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  if (url.includes("vimeo.com/")) {
    const id = url.split("vimeo.com/")[1]?.split("?")[0];
    return `https://player.vimeo.com/video/${id}?autoplay=1`;
  }
  return url;
}

export const Route = createFileRoute("/tutors")({
  head: () => ({ meta: [{ title: "Find tutors · Skill Binimoy" }] }),
  component: TutorsPage,
});

function TutorsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [dbTutors, setDbTutors] = useState<Tutor[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [applications, setApplications] = useState<TutorApp[]>([]);
  const [courses, setCourses] = useState<CourseVideo[]>([]);
  const [activeTab, setActiveTab] = useState<"tutors" | "videos">("tutors");
  const [search, setSearch] = useState("");
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("18:00");
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);
  const [chattingWithTutorId, setChattingWithTutorId] = useState<string | null>(null);

  // Tutor Studio & Course Video State
  const [uploadVideoOpen, setUploadVideoOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<CourseVideo | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoCategory, setVideoCategory] = useState("Programming & Tech");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState("45 mins");
  const [videoLevel, setVideoLevel] = useState("Beginner to Intermediate");
  const [videoDescription, setVideoDescription] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);

  async function handleChatWithTutor(tutor: Tutor) {
    if (!user) {
      void router.navigate({ to: "/login" });
      return;
    }
    const tutorUserId = tutor.userId || tutor.id;
    if (tutorUserId === user.uid) {
      alert("This is your own tutor listing.");
      return;
    }
    setChattingWithTutorId(tutorUserId);
    try {
      if (db) {
        let convId = "";
        const q = query(
          collection(db, "conversations"),
          where("participantIds", "array-contains", user.uid),
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const ids = (d.data()["participantIds"] as string[]) || [];
          if (ids.includes(tutorUserId)) {
            convId = d.id;
            break;
          }
        }

        const myName = profile?.displayName || user.displayName || "Member";
        const tutorName = tutor.displayName || tutor.name || "Tutor";

        if (!convId) {
          const newDoc = await addDoc(collection(db, "conversations"), {
            participantIds: [user.uid, tutorUserId],
            participants: {
              [user.uid]: {
                displayName: myName,
                photoURL: profile?.photoURL || user.photoURL || null,
              },
              [tutorUserId]: {
                displayName: tutorName,
                photoURL: tutor.photoURL || null,
              },
            },
            lastMessage: `Started a conversation with ${tutorName}.`,
            lastMessageAt: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          convId = newDoc.id;

          await addDoc(collection(db, "conversations", convId, "messages"), {
            senderId: user.uid,
            text: `Hi ${tutorName}! I'm interested in your tutoring and skills. Could we connect?`,
            createdAt: serverTimestamp(),
          });
        }

        if (typeof window !== "undefined") {
          sessionStorage.setItem("skill_binimoy_active_conversation_id", convId);
        }
        void router.navigate({ to: "/messages" });
      }
    } catch (err) {
      console.warn("Could not start chat with tutor:", err);
      void router.navigate({ to: "/messages" });
    } finally {
      setChattingWithTutorId(null);
    }
  }

  async function handlePublishCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!user || savingVideo) return;
    setSavingVideo(true);
    try {
      const tutorName = profile?.displayName || user.displayName || "Verified Tutor";
      const tutorPhoto = profile?.photoURL || user.photoURL || null;

      await createRecord("courses", {
        tutorId: user.uid,
        tutorName,
        tutorPhoto,
        title: videoTitle.trim(),
        category: videoCategory,
        videoUrl: videoUrl.trim(),
        duration: videoDuration.trim() || "45 mins",
        level: videoLevel,
        description: videoDescription.trim(),
        createdAt: new Date().toISOString(),
      });

      setVideoTitle("");
      setVideoUrl("");
      setVideoDescription("");
      setUploadVideoOpen(false);
      setBookingNotice("Course video lesson published successfully!");
    } catch (err) {
      setBookingNotice(err instanceof Error ? err.message : "Failed to publish course video.");
    } finally {
      setSavingVideo(false);
    }
  }

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
    const unsubTutors = watchRecords<Tutor>("tutors", [limit(50)], setDbTutors);
    const unsubUsers = watchRecords<AppUser>("users", [limit(50)], setUsers);
    const unsubApps = watchRecords<TutorApp>("tutorApplications", [limit(50)], setApplications);
    const unsubCourses = watchRecords<CourseVideo>("courses", [limit(50)], setCourses);
    return () => {
      unsubTutors();
      unsubUsers();
      unsubApps();
      unsubCourses();
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

  const combinedCourses = useMemo(() => {
    const list = [...courses];
    defaultCourses.forEach((dc) => {
      if (!list.some((c) => c.id === dc.id || c.title === dc.title)) {
        list.push(dc);
      }
    });
    return list;
  }, [courses]);

  const visibleCourses = useMemo(() => {
    return combinedCourses.filter((course) => {
      const q = search.toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q)) ||
        (course.tutorName && course.tutorName.toLowerCase().includes(q)) ||
        (course.description && course.description.toLowerCase().includes(q))
      );
    });
  }, [combinedCourses, search]);

  const isTutor = Boolean(profile?.tutorVerified || profile?.role === "TUTOR" || profile?.role === "ADMIN");

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
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Find someone who has done the work.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Browse verified tutors, view the exact skills they offer, compare experience, and book
              a focused session around your goal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isTutor && (
              <button
                type="button"
                onClick={() => setUploadVideoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
              >
                <Plus className="size-4" /> Publish Video Lesson
              </button>
            )}
            <Link
              to="/become-tutor"
              className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-hover transition"
            >
              Become a tutor
            </Link>
          </div>
        </section>

        {/* Tab switcher: Verified Tutors vs Course Videos */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tutors")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "tutors"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              <GraduationCap className="size-4" />
              Verified Tutors ({visible.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("videos")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "videos"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              <Film className="size-4" />
              Course Videos & Masterclasses ({visibleCourses.length})
            </button>
          </div>

          {isTutor && (
            <button
              type="button"
              onClick={() => setUploadVideoOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <Video className="size-3.5" /> Upload Lesson
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-input bg-card px-4 shadow-2xs text-foreground">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === "tutors"
                ? "Search tutors by name or what they offer (e.g. React, Python, UI/UX)..."
                : "Search course videos by title, tutor, or topic..."
            }
            className="h-12 flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {bookingNotice && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4 text-sm font-bold text-primary">
            <span>{bookingNotice}</span>
            <button onClick={() => setBookingNotice("")} className="hover:opacity-75 cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Tutors Grid */}
        {activeTab === "tutors" && (
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
                        <button
                          type="button"
                          onClick={() => void handleChatWithTutor(tutor)}
                          disabled={chattingWithTutorId === (tutor.userId || tutor.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer disabled:opacity-60"
                          title="Chat with tutor"
                        >
                          <MessageCircle className="size-4" />
                          {chattingWithTutorId === (tutor.userId || tutor.id) ? "Opening..." : "Chat"}
                        </button>
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
        )}

        {/* Course Videos Grid */}
        {activeTab === "videos" && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <Film className="mx-auto size-10 text-primary mb-3" />
                <h3 className="text-lg font-black text-slate-950 dark:text-white">No course videos found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching for a different keyword or topic.
                </p>
              </div>
            ) : (
              visibleCourses.map((course) => (
                <article
                  key={course.id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-lift transition-all"
                >
                  <div>
                    {/* Thumbnail / Player Placeholder */}
                    <div
                      onClick={() => setSelectedVideo(course)}
                      className="relative aspect-video w-full rounded-2xl bg-slate-900 cursor-pointer overflow-hidden group flex items-center justify-center border border-border"
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-300"
                        style={{
                          backgroundImage: `url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60')`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="size-6 ml-0.5 fill-white" />
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 font-bold backdrop-blur-xs">
                          {course.category || "Skill Course"}
                        </span>
                        <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 font-semibold backdrop-blur-xs">
                          <Clock className="size-3" /> {course.duration || "45m"}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-3.5 text-base font-black text-slate-950 dark:text-white leading-snug line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                      {course.description || "Master new practical skills with step-by-step guidance."}
                    </p>

                    <div className="mt-3.5 flex items-center gap-2.5">
                      {course.tutorPhoto ? (
                        <img
                          src={course.tutorPhoto}
                          alt={course.tutorName || "Tutor"}
                          className="size-7 rounded-lg object-cover ring-1 ring-primary/20"
                        />
                      ) : (
                        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {(course.tutorName || "T").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {course.tutorName || "Verified Tutor"}
                        </p>
                        <p className="text-[10px] font-semibold text-primary truncate">
                          {course.level || "Intermediate"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      Free with Skill Binimoy
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(course)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs transition cursor-pointer"
                    >
                      <Play className="size-3.5 fill-white" /> Watch Lesson
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

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
                    <h3 className="font-black text-base text-slate-950 dark:text-white">
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

        {/* Video Player Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary">
                    <Film className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white line-clamp-1">{selectedVideo.title}</h3>
                    <p className="text-xs text-slate-400">
                      By {selectedVideo.tutorName || "Verified Tutor"} · {selectedVideo.category || "Skill Lesson"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-4 relative aspect-video w-full rounded-2xl overflow-hidden bg-black ring-1 ring-slate-800">
                <iframe
                  src={getVideoEmbedUrl(selectedVideo.videoUrl)}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full border-0"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-bold text-white">
                    {selectedVideo.level || "Intermediate"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {selectedVideo.duration || "45m"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition cursor-pointer"
                >
                  Close Player
                </button>
              </div>
              {selectedVideo.description && (
                <p className="mt-3 text-xs leading-relaxed text-slate-300 bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                  {selectedVideo.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload Course Video Modal */}
        {uploadVideoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Video className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-950 dark:text-white">
                      Publish Course Video Lesson
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Share your expertise with the Skill Binimoy community
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadVideoOpen(false)}
                  className="rounded-xl p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handlePublishCourse} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Lesson / Masterclass Title
                    <input
                      required
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="e.g., Master React State Management from Zero to Hero"
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Category
                    <select
                      value={videoCategory}
                      onChange={(e) => setVideoCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    >
                      <option value="Programming & Tech">Programming & Tech</option>
                      <option value="Design & Creative">Design & Creative</option>
                      <option value="Data Science & AI">Data Science & AI</option>
                      <option value="Business & Marketing">Business & Marketing</option>
                      <option value="Language & Communication">Language & Communication</option>
                      <option value="Academics & Science">Academics & Science</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Estimated Duration
                    <input
                      required
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      placeholder="e.g. 45 mins"
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Level
                    <select
                      value={videoLevel}
                      onChange={(e) => setVideoLevel(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Video Link (YouTube or Vimeo)
                    <input
                      required
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    />
                  </label>
                </div>

                <label className="block text-xs font-bold text-muted-foreground">
                  Lesson Description & Key Learnings
                  <textarea
                    required
                    rows={3}
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Brief overview of what students will learn in this session..."
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  />
                </label>

                <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setUploadVideoOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingVideo}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Video className="size-3.5" />
                    {savingVideo ? "Publishing..." : "Publish Lesson"}
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
