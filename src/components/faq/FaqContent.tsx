import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Video,
  GraduationCap,
  ShieldCheck,
  ShoppingBag,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  Users,
  Layers,
  X,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export type FaqItem = {
  id: string;
  category: "exchange" | "video" | "tutors" | "shop" | "safety";
  categoryLabel: string;
  icon: LucideIcon;
  question: string;
  answer: string;
  highlights?: string[];
  tags: string[];
};

export const FAQ_DATA: FaqItem[] = [
  {
    id: "faq-1",
    category: "exchange",
    categoryLabel: "Skill Exchange & Barter",
    icon: Sparkles,
    question: "What is Skill Binimoy and how does it work?",
    answer:
      "Skill Binimoy (স্কিল বিনিময়) is Bangladesh's premier skill-exchange and peer learning network. Instead of paying tuition or subscription fees for every new skill, members barter their knowledge directly: you teach what you are good at (such as Python, Graphic Design, Video Editing, or Spoken English) and learn a skill you desire (such as UI/UX, Guitar, Digital Marketing, or Data Science) in return. We also provide verified 1-on-1 tutor mentorship, an interactive Quick Solutions community help desk, and an official merchandise shop.",
    highlights: [
      "100% mutual skill exchange without money",
      "Direct peer-to-peer learning and networking",
      "Verified profiles with portable community reputation",
    ],
    tags: ["getting started", "overview", "barter", "free", "how it works"],
  },
  {
    id: "faq-2",
    category: "exchange",
    categoryLabel: "Skill Exchange & Barter",
    icon: Layers,
    question: "What is the difference between 'Explore Skills' and 'Quick Solutions'?",
    answer:
      "Explore Skills and Quick Solutions serve two distinct learning needs:\n\n• Explore Skills is exclusively for mutual skill swaps. You post what you know (Can Teach) and what you desire to learn (Wants to Learn), search for matching exchange partners, and propose mutual learning swaps.\n\n• Quick Solutions is an open community Q&A help desk where members post specific technical problems, coding bugs, design dilemmas, or learning questions. Other members can directly answer, leave solutions, and upvote helpful fixes without committing to a bilateral exchange.",
    highlights: [
      "Explore Skills = 100% Peer Barter (Mutual Swaps)",
      "Quick Solutions = Community Q&A & Fast Bug Solving",
      "Different post types tailored for clarity",
    ],
    tags: ["explore skills", "quick solutions", "differences", "posts", "help desk"],
  },
  {
    id: "faq-3",
    category: "exchange",
    categoryLabel: "Skill Exchange & Barter",
    icon: Users,
    question: "How do I send and complete a skill exchange request?",
    answer:
      "Starting an exchange is fast and simple:\n1. Head to Explore Skills to browse member cards or active Skill Swap Offers.\n2. Click 'Send Exchange Request' on any member's card or offer, specifying what skill you can share.\n3. The recipient receives an instant notification with your proposal.\n4. When accepted, a dedicated conversation automatically opens in Messages with live video calling ready.\n5. Meet, learn mutually, and leave reviews to build each other's community reputation!",
    highlights: [
      "Instant notification to exchange partner",
      "Automatic private message room creation",
      "Integrated 1-click video call ready upon acceptance",
    ],
    tags: ["exchange request", "swap", "messages", "notifications", "learning loop"],
  },
  {
    id: "faq-4",
    category: "exchange",
    categoryLabel: "Skill Exchange & Barter",
    icon: BookOpen,
    question: "Are peer skill exchanges completely free of charge?",
    answer:
      "Yes! 100% free. Peer skill exchanges in the Explore network operate entirely on a barter system—no currency is ever charged or exchanged between learning partners. You trade your expertise and time for someone else's expertise and time. The only optional paid components on the platform are hiring professional marketplace tutors who charge an hourly rate, purchasing merchandise in the Shop, or activating Premium Verified ID.",
    highlights: [
      "Zero fees for peer skill swaps",
      "No hidden platform cuts or commission",
      "Completely democratic knowledge sharing",
    ],
    tags: ["free", "pricing", "barter", "cost", "money"],
  },
  {
    id: "faq-5",
    category: "video",
    categoryLabel: "Live Video & Sessions",
    icon: Video,
    question: "How does live video calling work on Skill Binimoy?",
    answer:
      "Skill Binimoy has built-in real-time browser video calling powered by WebRTC and low-latency signaling. Once a skill exchange is accepted or a tutor session is confirmed, a 'Start Video Call' button unlocks inside the conversation in Messages or on the Session Calendar. You can toggle your camera, mute your microphone, send live messages, and learn face-to-face right inside your web browser—no external app downloads like Zoom or Google Meet are required.",
    highlights: [
      "Zero app installation: runs directly in your browser",
      "Camera & microphone toggle with connection indicators",
      "Instant access from Messages and Session Calendar",
    ],
    tags: ["video call", "camera", "microphone", "webrtc", "live session"],
  },
  {
    id: "faq-6",
    category: "video",
    categoryLabel: "Live Video & Sessions",
    icon: Video,
    question: "How do I schedule a session and what happens if a session is declined?",
    answer:
      "You can book a session by visiting any tutor's profile or navigating to the Session Calendar (under Quick Solutions or menu) and selecting 'Schedule Session'. Choose your preferred date, time slot, and topic. The tutor receives the booking in their pending requests. If accepted, the session moves to Confirmed with a live video call room; if declined, you receive an immediate notification with the tutor's feedback and no penalties or fees are incurred.",
    highlights: [
      "Flexible date and time slot selection",
      "Instant status tracking: PENDING, CONFIRMED, or REJECTED",
      "Transparent notifications with tutor feedback",
    ],
    tags: ["schedule", "calendar", "booking", "decline", "sessions"],
  },
  {
    id: "faq-7",
    category: "tutors",
    categoryLabel: "Tutors & Verification",
    icon: GraduationCap,
    question: "How do I become a Verified Tutor and earn on the platform?",
    answer:
      "To become an approved tutor:\n1. Navigate to Find Tutors and click 'Become a Tutor' (or visit /become-tutor).\n2. Fill out your educational background, years of industry experience, skills you offer, portfolio link, and your hourly rate in BDT (৳).\n3. Submit your application for administrator review.\n4. Once reviewed and approved in the Admin Control Room, you receive the official Verified Tutor badge and are showcased in the public tutor directory where students can book paid sessions.",
    highlights: [
      "Transparent hourly rates in BDT (৳)",
      "Official Verified Tutor badge",
      "Direct student bookings and session management",
    ],
    tags: ["become tutor", "verified tutor", "earnings", "application", "mentor"],
  },
  {
    id: "faq-8",
    category: "tutors",
    categoryLabel: "Tutors & Verification",
    icon: BadgeCheck,
    question: "What is the Verified ID & Premium Membership and what are its benefits?",
    answer:
      "Verified ID unlocks the official blue verified checkmark badge across your entire account—visible on your avatar, top navigation bar, Explore cards, tutor listings, community posts, and solutions comments. Premium members also receive priority ranking in Explore search results, unlimited exchange requests, and early access to new learning tools. You can activate Premium anytime in Settings or under the Premium section via simulated payment.",
    highlights: [
      "Blue checkmark badge on profile, topbar, and posts",
      "Top placement in Explore Skills search directory",
      "Unlimited exchange requests and priority community support",
    ],
    tags: ["premium", "verified id", "badge", "verification", "perks"],
  },
  {
    id: "faq-9",
    category: "shop",
    categoryLabel: "Shop & Orders",
    icon: ShoppingBag,
    question: "How do I buy items in the Skill Binimoy Shop and track my product order?",
    answer:
      "Visit the Shop tab to browse official Skill Binimoy community goods including developer t-shirts, hoodies, notebooks, tech stickers, and courses. Add desired items to your Cart and checkout using simulated bKash, Nagad, or credit/debit card. After checkout, you can track your live order progress (PENDING → PROCESSING → SHIPPED → DELIVERED) with tracking IDs and receipt details directly in your order history.",
    highlights: [
      "Official developer apparel and community stationery",
      "bKash, Nagad, and Card checkout support",
      "Real-time order stage tracking and delivery receipts",
    ],
    tags: ["shop", "merchandise", "orders", "tracking", "bkash", "nagad"],
  },
  {
    id: "faq-10",
    category: "safety",
    categoryLabel: "Safety & Community",
    icon: ShieldCheck,
    question: "How does Skill Binimoy ensure community safety and handle reports?",
    answer:
      "Member safety, trust, and respect are paramount. All user posts, offers, and member profiles include built-in reporting controls. If you experience spam, inappropriate behavior, or harassment, submit a report via the Safety Center (/$section?section=safety). Our administrative moderation team monitors reports in real-time. Admins have tools to issue warnings, suspend or permanently ban offenders, and remove non-compliant posts immediately.",
    highlights: [
      "1-click reporting on posts, comments, and member profiles",
      "Real-time Admin Control Room moderation",
      "Zero tolerance for harassment, fraud, or spam",
    ],
    tags: ["safety", "reports", "moderation", "rules", "ban", "trust"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Questions (10)", icon: HelpCircle },
  { id: "exchange", label: "Skill Exchange & Barter", icon: Sparkles },
  { id: "video", label: "Live Video & Sessions", icon: Video },
  { id: "tutors", label: "Tutors & Verification", icon: GraduationCap },
  { id: "shop", label: "Shop & Orders", icon: ShoppingBag },
  { id: "safety", label: "Safety & Community", icon: ShieldCheck },
];

export function FaqContent() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ "faq-1": true, "faq-2": true });
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [search, selectedCategory]);

  function toggleFaq(id: string) {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function expandAll() {
    const allOpen: Record<string, boolean> = {};
    filteredFaqs.forEach((f) => {
      allOpen[f.id] = true;
    });
    setOpenIds(allOpen);
  }

  function collapseAll() {
    setOpenIds({});
  }

  function handleFeedback(id: string, type: "yes" | "no") {
    setFeedback((prev) => ({ ...prev, [id]: type }));
    toast.success(type === "yes" ? "Thanks for your feedback!" : "Thank you. We will improve this answer.");
  }

  function handleCopyLink(faq: FaqItem) {
    const url = `${window.location.origin}/faq#${faq.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(faq.id);
      toast.success("Question link copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-indigo-500/10 p-6 sm:p-10 shadow-card">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary mb-3">
            <HelpCircle className="size-3.5" /> Skill Binimoy Knowledge Base
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Learn everything about mutual skill barter, live video calling, tutor verification,
            Quick Solutions help desk, and how to get the most out of Skill Binimoy.
          </p>

          {/* Search Bar */}
          <div className="mt-6 relative max-w-xl">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keyword (e.g. video, exchange, free, tutor, shop)..."
              className="h-11 w-full rounded-2xl border border-input bg-card pl-10 pr-10 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/25 text-foreground shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feature Highlights Strip */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border/70 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black text-slate-950 dark:text-white">100% Barter</p>
              <p className="text-[11px] text-muted-foreground">Free skill swaps</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Video className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black text-slate-950 dark:text-white">Live Video</p>
              <p className="text-[11px] text-muted-foreground">Built-in rooms</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <BadgeCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black text-slate-950 dark:text-white">Verified ID</p>
              <p className="text-[11px] text-muted-foreground">Trusted badges</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black text-slate-950 dark:text-white">Safe & Secure</p>
              <p className="text-[11px] text-muted-foreground">24/7 Moderation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-primary-soft/40"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* FAQ Count and Filter Indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong>{filteredFaqs.length}</strong> of {FAQ_DATA.length} frequently asked questions
          {search && ` for "${search}"`}
        </span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-primary font-bold hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <HelpCircle className="mx-auto size-12 text-primary/40 mb-3" />
            <h3 className="text-lg font-black text-slate-950 dark:text-white">No questions found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We couldn't find any questions matching "{search}". Try another keyword or browse all topics.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isOpen = Boolean(openIds[faq.id]);
            const Icon = faq.icon;
            const userVote = feedback[faq.id];

            return (
              <article
                key={faq.id}
                id={faq.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-primary/40 bg-card shadow-card"
                    : "border-border bg-card/70 hover:border-primary/30"
                }`}
              >
                {/* Question Header Button */}
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-muted-foreground">
                          <Icon className="size-3" /> {faq.categoryLabel}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white leading-snug">
                        {faq.question}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 mt-1">
                    <span
                      className={`grid size-8 place-items-center rounded-xl border border-border transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-primary-soft text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </div>
                </button>

                {/* Answer Body */}
                {isOpen && (
                  <div className="border-t border-border/60 px-5 pb-6 pt-4 sm:px-6 animate-in fade-in duration-200">
                    <div className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-3 whitespace-pre-line">
                      {faq.answer}
                    </div>

                    {/* Highlights pill tags */}
                    {faq.highlights && faq.highlights.length > 0 && (
                      <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-border/80">
                        <p className="text-[11px] font-black uppercase tracking-wider text-primary mb-2">
                          Key Takeaways:
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {faq.highlights.map((h, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Footer Row: Tags + Was this helpful? + Copy Link */}
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {faq.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(faq)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary transition"
                        >
                          {copiedId === faq.id ? (
                            <>
                              <Check className="size-3 text-emerald-600" /> Copied link
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" /> Share link
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]">Helpful?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(faq.id, "yes")}
                            className={`rounded-lg p-1 transition ${
                              userVote === "yes"
                                ? "bg-emerald-500/20 text-emerald-600"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
                            }`}
                            title="Yes, this was helpful"
                          >
                            <ThumbsUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(faq.id, "no")}
                            className={`rounded-lg p-1 transition ${
                              userVote === "no"
                                ? "bg-rose-500/20 text-rose-600"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
                            }`}
                            title="No, this was not helpful"
                          >
                            <ThumbsDown className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Still Have Questions? Banner */}
      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="size-7" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              Still have a specific question?
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Post your question to the community in Quick Solutions or contact our support team.
              We are here to help you succeed in your skill exchange journey.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
          <Link
            to="/$section"
            params={{ section: "solutions" }}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-hover shadow-xs transition"
          >
            <span>Ask in Quick Solutions</span>
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to="/$section"
            params={{ section: "support" }}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-primary-soft hover:text-primary transition"
          >
            <span>Support Desk</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
