import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Code2,
  GraduationCap,
  Heart,
  HelpCircle,
  Languages,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { createRecord, orderBy, watchRecords, where } from "@/lib/firestore";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import heroIllustration from "@/assets/hero-illustration.png";
import { mentors, testimonials } from "@/data/content";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";

type Post = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  level: string;
};
type SkillItem = {
  name: string;
  description: string;
  learners: string;
  icon: LucideIcon;
  tint: string;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Home · Skill Binimoy" }] }),
  component: Dashboard,
});

const recommendations: SkillItem[] = [
  {
    name: "JavaScript",
    description: "Build sharper products with modern web craft.",
    learners: "24 people offering",
    icon: Code2,
    tint: "skill-tint-blue",
  },
  {
    name: "Machine Learning",
    description: "Turn curious questions into useful models.",
    learners: "18 people offering",
    icon: Sparkles,
    tint: "skill-tint-lilac",
  },
  {
    name: "UI/UX Design",
    description: "Shape interfaces people love to use.",
    learners: "31 people offering",
    icon: Palette,
    tint: "skill-tint-rose",
  },
  {
    name: "Photography",
    description: "Find your point of view through a lens.",
    learners: "12 people offering",
    icon: Camera,
    tint: "skill-tint-gold",
  },
];
const problems = [
  {
    title: "Need help fixing a React bug",
    category: "Web Development",
    reward: "৳500",
    replies: 8,
    time: "12 min ago",
    color: "problem-blue",
  },
  {
    title: "Photoshop background removal",
    category: "Design",
    reward: "৳300",
    replies: 5,
    time: "34 min ago",
    color: "problem-pink",
  },
  {
    title: "Python assignment debugging",
    category: "Programming",
    reward: "৳700",
    replies: 12,
    time: "1 hr ago",
    color: "problem-gold",
  },
];
const products = [
  { name: "Everyday tee", price: "৳850", type: "T-shirt", color: "shop-blue", icon: "SB" },
  { name: "Learn boldly hoodie", price: "৳1,650", type: "Hoodie", color: "shop-ink", icon: "✦" },
  { name: "Studio mug", price: "৳550", type: "Mug", color: "shop-coral", icon: "◎" },
  { name: "Field notes", price: "৳420", type: "Notebook", color: "shop-sage", icon: "▤" },
];

function Avatar({
  initials,
  tone = "blue",
  size = "md",
}: {
  initials: string;
  tone?: string | undefined;
  size?: ("sm" | "md" | "lg") | undefined;
}) {
  return (
    <span className={`avatar avatar-${tone ?? "blue"} avatar-${size ?? "md"}`}>{initials}</span>
  );
}

function Dashboard() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Programming",
    type: "Skill Exchange",
    level: "Intermediate",
    teachSkills: "",
    learnSkills: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);
  const firstName = profile?.displayName?.split(" ")[0] || "there";

  useEffect(() => {
    if (!user) return;
    return watchRecords<Post>(
      "posts",
      [where("authorId", "==", user.uid), orderBy("createdAt", "desc")],
      setPosts,
      (error) => setMessage(error.message),
    );
  }, [user]);

  async function createPost(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const isExchange = form.type === "Skill Exchange";
      const postType = isExchange ? "EXCHANGE" : "QUESTION";
      const teachList = form.teachSkills
        ? form.teachSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const learnList = form.learnSkills
        ? form.learnSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      await createRecord("posts", {
        ...form,
        postType,
        teachSkills: teachList,
        learnSkills: learnList,
        skillsOffered: teachList,
        skillsWanted: learnList,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || user.email,
        authorPhoto: profile?.photoURL || user.photoURL || null,
        status: "PUBLISHED",
        premium: Boolean(profile?.premium),
        tutorVerified: Boolean(profile?.tutorVerified),
        likes: [],
        comments: [],
        replies: 0,
        savedBy: [],
        reports: 0,
      });
      setForm({
        ...form,
        title: "",
        description: "",
        teachSkills: "",
        learnSkills: "",
      });
      setMessage("Your post is live and visible across the community.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell title="Home" eyebrow="Your learning network">
      <div className="space-y-14">
        <section className="member-hero grid overflow-hidden rounded-[2rem] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10 px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <span className="online-dot" /> Welcome back, {firstName}{" "}
              {(profile?.premium || profile?.tutorVerified) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                  <BadgeCheck className="size-3.5" /> Verified Member
                </span>
              )}
              <span aria-hidden="true">👋</span>
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              What are you learning today?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Connect with skilled peers, book verified 1-on-1 mentors, and get quick solutions to your problems.
            </p>
            <div className="hero-search mt-7 flex max-w-xl items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-soft">
              <Search className="ml-3 size-5 text-slate-400 shrink-0" />
              <input
                aria-label="Search skills"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search skills (e.g. React, Python, UI/UX, English)..."
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
              />
              <Link
                to="/explore"
                className="hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover shadow-xs sm:block"
              >
                Search
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/explore"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover shadow-xs transition"
              >
                Explore skills
              </Link>
              <Link
                to="/tutors"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 hover:border-primary/40 hover:text-primary transition shadow-xs"
              >
                Find a tutor
              </Link>
            </div>
          </div>
          <div className="member-hero-art relative hidden min-h-[390px] lg:block">
            <img
              src={heroIllustration}
              alt="People learning and teaching together"
              className="absolute inset-0 h-full w-full object-cover object-center mix-blend-multiply opacity-90"
            />
            <div className="skill-float skill-float-one">JavaScript</div>
            <div className="skill-float skill-float-two">UI/UX</div>
            <div className="skill-float skill-float-three">Python</div>
          </div>
        </section>

        <section className="action-rail">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">Make a move</p>
              <h2 className="section-title">Start with one small step</h2>
            </div>
            <Link to="/explore" className="section-link hidden sm:flex">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
            <Link to="/dashboard" hash="share" className="action-item group">
              <span className="action-icon">
                <Plus className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>Share a skill</strong>
                <small>Teach what you know</small>
              </span>
              <ArrowRight className="action-arrow size-4" />
            </Link>
            <Link to="/explore" className="action-item group">
              <span className="action-icon">
                <Search className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>Find a skill</strong>
                <small>Explore the network</small>
              </span>
              <ArrowRight className="action-arrow size-4" />
            </Link>
            <Link to="/tutors" className="action-item group">
              <span className="action-icon">
                <GraduationCap className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>Find a tutor</strong>
                <small>Learn from experience</small>
              </span>
              <ArrowRight className="action-arrow size-4" />
            </Link>
            <Link to="/$section" params={{ section: "solutions" }} className="action-item group">
              <span className="action-icon">
                <Sparkles className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>Quick solution</strong>
                <small>Get unstuck today</small>
              </span>
              <ArrowRight className="action-arrow size-4" />
            </Link>
            <Link to="/$section" params={{ section: "calendar" }} className="action-item group">
              <span className="action-icon">
                <CalendarDays className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>Schedule session</strong>
                <small>Make time to grow</small>
              </span>
              <ArrowRight className="action-arrow size-4" />
            </Link>
            <Link to="/faq" className="action-item group">
              <span className="action-icon">
                <HelpCircle className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>FAQ & Guide</strong>
                <small>10 common answers</small>
              </span>
              <ArrowRight className="action-arrow size-4" />
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Curated for you</p>
              <h2 className="section-title">Recommended for You</h2>
              <p className="section-subtitle">Based on the skills you’re interested in.</p>
            </div>
            <Link to="/explore" className="section-link hidden sm:flex">
              Explore skills <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="recommendation-row">
            {recommendations.map(({ name, description, learners, icon: Icon, tint }) => (
              <Link to="/explore" key={name} className="recommendation-item group">
                <span className={`recommendation-icon ${tint}`}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{name}</strong>
                  <small>{description}</small>
                  <em>{learners}</em>
                </span>
                <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="eyebrow">Keep your momentum</p>
                <h2 className="section-title">Continue Learning</h2>
              </div>
              <Link to="/$section" params={{ section: "calendar" }} className="section-link">
                Calendar <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="learning-list">
              <div className="learning-item">
                <Avatar initials="AR" tone="rose" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>Product thinking with Ayesha</strong>
                      <p>UI/UX Design · 6 of 8 sessions</p>
                    </div>
                    <span className="progress-label">75%</span>
                  </div>
                  <div className="progress-track mt-4">
                    <span style={{ width: "75%" }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Next session · Tomorrow, 7:30 PM</span>
                    <Link
                      to="/$section"
                      params={{ section: "calendar" }}
                      className="text-primary hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </div>
              <div className="learning-item">
                <Avatar initials="TH" tone="blue" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>Distributed systems study group</strong>
                      <p>Cloud Architecture · 3 of 6 sessions</p>
                    </div>
                    <span className="progress-label">50%</span>
                  </div>
                  <div className="progress-track mt-4">
                    <span className="progress-sage" style={{ width: "50%" }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Next session · Friday, 8:00 PM</span>
                    <Link
                      to="/$section"
                      params={{ section: "calendar" }}
                      className="text-primary hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="session-panel">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow text-primary">Up next</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  A focused hour
                  <br />
                  with Tanvir
                </h2>
              </div>
              <span className="online-pill">
                <span className="online-dot" /> Online
              </span>
            </div>
            <div className="mt-7 flex items-center gap-3">
              <Avatar initials="TH" tone="blue" size="md" />
              <div>
                <p className="text-sm font-bold text-slate-900">Cloud architecture foundations</p>
                <p className="text-xs text-slate-500">Today · 8:00 PM – 9:00 PM</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="text-xs font-semibold text-slate-500">Starts in</span>
              <strong className="text-sm text-primary">02h 14m</strong>
            </div>
            <Link
              to="/video-call/$callId"
              params={{ callId: "demo-session" }}
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-hover"
            >
              <Video className="size-4" /> Join session
            </Link>
            <Link
              to="/$section"
              params={{ section: "calendar" }}
              className="mt-3 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-primary"
            >
              View calendar <ArrowRight className="ml-1 size-3" />
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Knowledge exchange</p>
              <h2 className="section-title">People You Can Learn From</h2>
              <p className="section-subtitle">
                Real people, practical skills, meaningful progress.
              </p>
            </div>
            <Link to="/explore" className="section-link hidden sm:flex">
              Meet the community <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {mentors.map((mentor, index) => (
              <article key={mentor.name} className="person-card group">
                <div className="flex items-start justify-between">
                  <Avatar
                    initials={mentor.initials}
                    tone={(["rose", "blue", "lilac", "gold"] as const)[index % 4]}
                    size="lg"
                  />
                  <button aria-label={`Save ${mentor.name}`} className="save-button">
                    <Heart className="size-4" />
                  </button>
                </div>
                <div className="mt-5">
                  <div
                    onClick={() =>
                      setViewingProfile({
                        displayName: mentor.name,
                        role: "TUTOR",
                        bio: `${mentor.role} with ${mentor.experience} of mentoring experience.`,
                        skillsOffered: mentor.skills,
                        rating: mentor.rating,
                        tutorVerified: true,
                      })
                    }
                    className="cursor-pointer group/title"
                  >
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-slate-950 group-hover/title:text-primary transition">{mentor.name}</h3>
                      <BadgeCheck className="size-4 text-primary" />
                    </div>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{mentor.role}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-700">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {mentor.rating}{" "}
                    <span className="font-medium text-slate-400">({mentor.reviews})</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {mentor.skills.map((skill) => (
                      <span key={skill} className="skill-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-slate-400">
                      {mentor.experience}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setViewingProfile({
                          displayName: mentor.name,
                          role: "TUTOR",
                          bio: `${mentor.role} with ${mentor.experience} of mentoring experience.`,
                          skillsOffered: mentor.skills,
                          rating: mentor.rating,
                          tutorVerified: true,
                        })
                      }
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View profile
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="tutor-feature">
          <div className="tutor-feature-copy">
            <p className="eyebrow text-primary">Verified tutors</p>
            <h2 className="mt-2 max-w-md text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Learn from experience, not just information.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              Book focused sessions with people who have done the work and know how to help you move
              forward.
            </p>
            <Link
              to="/tutors"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              View all tutors <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="tutor-feature-people">
            <div className="tutor-orbit tutor-orbit-one">
              <Avatar initials="AR" tone="rose" size="lg" />
              <div>
                <strong>Ayesha Rahman</strong>
                <small>Product Design · 4.9 ★</small>
              </div>
            </div>
            <div className="tutor-orbit tutor-orbit-two">
              <Avatar initials="MN" tone="lilac" size="lg" />
              <div>
                <strong>Meherun Nesa</strong>
                <small>AI Research · 4.8 ★</small>
              </div>
            </div>
            <div className="tutor-stat">
              <CheckCircle2 className="size-5 text-primary" />
              <span>
                <strong>12,480+</strong>
                <small>sessions completed</small>
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Community help desk</p>
              <h2 className="section-title">Need Help Right Now?</h2>
              <p className="section-subtitle">
                Post a problem and get a quick solution from someone who knows.
              </p>
            </div>
            <Link
              to="/$section"
              params={{ section: "posts" }}
              className="section-link hidden sm:flex"
            >
              See all problems <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="quick-solution-list">
            {problems.map((problem) => (
              <Link
                to="/$section"
                params={{ section: "posts" }}
                key={problem.title}
                className="quick-solution-item"
              >
                <span className={`problem-mark ${problem.color}`}>
                  <BriefcaseBusiness className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{problem.title}</strong>
                  <small>
                    {problem.category} · {problem.time}
                  </small>
                </span>
                <span className="solution-reward">
                  <b>{problem.reward}</b>
                  <small>{problem.replies} responses</small>
                </span>
                <ChevronRight className="hidden size-4 text-slate-300 sm:block" />
              </Link>
            ))}
          </div>
          <a
            href="#share"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Plus className="size-4" /> Post a problem
          </a>
        </section>

        <section className="premium-strip">
          <div>
            <p className="eyebrow text-primary">Skill Binimoy Premium</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Get more from every exchange.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Be easier to find, learn faster, and get the support that keeps momentum going.
            </p>
          </div>
          <div className="premium-benefits">
            <span>
              <Search className="size-4" /> Priority discovery
            </span>
            <span>
              <BadgeCheck className="size-4" /> Premium badge
            </span>
            <span>
              <MessageCircle className="size-4" /> Priority support
            </span>
          </div>
          <Link
            to="/$section"
            params={{ section: "premium" }}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
          >
            Explore Premium
          </Link>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Wear the exchange</p>
              <h2 className="section-title">Skill Binimoy Store</h2>
            </div>
            <Link to="/shop" className="section-link">
              Visit shop <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="shop-row">
            {products.map((product) => (
              <Link to="/shop" key={product.name} className="shop-item group">
                <div className={`shop-product ${product.color}`}>
                  <span>{product.icon}</span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.type}</small>
                  </div>
                  <b>{product.price}</b>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="testimonial-section">
          <div className="mb-6">
            <p className="eyebrow">From the community</p>
            <h2 className="section-title">What learners are saying</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <article key={testimonial.name} className="testimonial-item">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={testimonial.initials}
                      tone={(["blue", "rose", "gold"] as const)[index % 3]}
                      size="sm"
                    />
                    <div>
                      <strong>{testimonial.name}</strong>
                      <small>{testimonial.role}</small>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600">“{testimonial.quote}”</p>
              </article>
            ))}
          </div>
        </section>

        <section id="share" className="share-section">
          <div>
            <p className="eyebrow text-primary">Give back to the network</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Share what you know
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Turn one useful lesson into a meaningful connection.
            </p>
          </div>
          <form className="share-form" onSubmit={createPost}>
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="What can you teach or solve?"
            />
            <textarea
              required
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Add a little context for the community..."
            />
            {form.type === "Skill Exchange" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.teachSkills}
                  onChange={(event) => setForm({ ...form, teachSkills: event.target.value })}
                  placeholder="Skills you can teach (e.g. React, Python, UI)"
                  className="rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={form.learnSkills}
                  onChange={(event) => setForm({ ...form, learnSkills: event.target.value })}
                  placeholder="Skills you want to learn (e.g. Figma, Guitar)"
                  className="rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  className="rounded-xl border border-input bg-background p-2 text-xs font-bold"
                >
                  <option value="Skill Exchange">Skill Exchange Post</option>
                  <option value="Quick Solution">Quick Solution (Ask Question)</option>
                </select>
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className="rounded-xl border border-input bg-background p-2 text-xs font-bold"
                >
                  <option>Programming</option>
                  <option>Web Development</option>
                  <option>AI/ML</option>
                  <option>Design</option>
                  <option>UI/UX</option>
                  <option>Photography</option>
                  <option>Business</option>
                  <option>Languages</option>
                </select>
              </div>
              {message && <span className="text-xs font-semibold text-slate-500">{message}</span>}
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? (
                  "Publishing..."
                ) : (
                  <>
                    <Send className="size-4" /> Publish post
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {posts.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Your recent exchanges</h2>
              <Link to="/$section" params={{ section: "posts" }} className="section-link">
                View all <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="recent-post-row">
              {posts.slice(0, 3).map((post) => (
                <article key={post.id}>
                  <span>{post.category}</span>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                </article>
              ))}
            </div>
          </section>
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
