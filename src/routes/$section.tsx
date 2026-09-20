import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Heart,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Plus,
  Send,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Sparkles,
  ThumbsUp,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { createRecord, deleteRecord, orderBy, updateRecord, where, watchRecords } from "@/lib/firestore";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import {
  sendExchangeRequest as sendExchangeRequestHelper,
  acceptExchangeRequest as acceptExchangeRequestHelper,
  rejectExchangeRequest as rejectExchangeRequestHelper,
} from "@/lib/exchange";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";
import { FaqContent } from "@/components/faq/FaqContent";

export const Route = createFileRoute("/$section")({ component: SectionPage });

type CommentItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  text: string;
  createdAt: string;
  premium?: boolean;
  tutorVerified?: boolean;
};

type Row = {
  id: string;
  title?: string;
  name?: string;
  subject?: string;
  description?: string;
  body?: string;
  status?: string;
  type?: string;
  postType?: "EXCHANGE" | "QUESTION";
  category?: string;
  authorId?: string;
  authorName?: string;
  authorPhoto?: string | null;
  recipientId?: string;
  recipientName?: string;
  recipientPhoto?: string | null;
  senderId?: string;
  senderName?: string;
  senderPhoto?: string | null;
  requestId?: string;
  conversationId?: string;
  message?: string;
  skillsOffered?: string[];
  skillsWanted?: string[];
  teachSkills?: string[];
  learnSkills?: string[];
  likes?: string[];
  comments?: CommentItem[];
  tutorId?: string;
  tutorName?: string;
  tutorPhoto?: string | null;
  studentId?: string;
  studentName?: string;
  studentPhoto?: string | null;
  date?: string;
  time?: string;
  topic?: string;
  notes?: string;
  hourlyRate?: string;
  authorBio?: string;
  bio?: string;
  authorRole?: string;
  education?: string;
  location?: string;
  availability?: string;
  tutorVerified?: boolean;
  premium?: boolean;
  createdAt?: unknown;
  [key: string]: unknown;
};

type SectionConfig = {
  title: string;
  eyebrow: string;
  collection: string;
  icon: typeof Bell;
};

const DEFAULT_CONFIG: SectionConfig = {
  title: "Explore skills",
  eyebrow: "Find your next exchange",
  collection: "posts",
  icon: Sparkles,
};

const metadata: Record<string, SectionConfig> = {
  explore: DEFAULT_CONFIG,
  solutions: {
    title: "Quick Solutions Help Desk",
    eyebrow: "Community Q&A · Problem solving help desk",
    collection: "posts",
    icon: HelpCircle,
  },
  posts: {
    title: "Community Posts & Solutions",
    eyebrow: "Exchanges & Q&A help desk",
    collection: "posts",
    icon: FileText,
  },
  requests: {
    title: "Exchange Requests",
    eyebrow: "Your learning loop",
    collection: "requests",
    icon: Users,
  },
  messages: {
    title: "Messages",
    eyebrow: "Real-time conversations",
    collection: "conversations",
    icon: MessageCircle,
  },
  calendar: {
    title: "Session Calendar",
    eyebrow: "Scheduled mentorship & video calls",
    collection: "sessions",
    icon: CalendarDays,
  },
  tutors: {
    title: "Verified Tutors",
    eyebrow: "Learn with confidence",
    collection: "tutors",
    icon: Users,
  },
  shop: {
    title: "Skill Binimoy Shop",
    eyebrow: "Community goods",
    collection: "products",
    icon: ShoppingBag,
  },
  notifications: {
    title: "Notifications",
    eyebrow: "Stay in the loop",
    collection: "notifications",
    icon: Bell,
  },
  support: {
    title: "Support",
    eyebrow: "We are here to help",
    collection: "supportTickets",
    icon: MessageCircle,
  },
  safety: {
    title: "Safety center",
    eyebrow: "Trust and accountability",
    collection: "reports",
    icon: ShieldAlert,
  },
  settings: { title: "Settings", eyebrow: "Your account", collection: "users", icon: Users },
  premium: {
    title: "Skill Binimoy Premium",
    eyebrow: "Verified ID & accelerated learning",
    collection: "subscriptions",
    icon: CircleDollarSign,
  },
  faq: {
    title: "Frequently Asked Questions",
    eyebrow: "Answers to common questions about Skill Binimoy",
    collection: "posts",
    icon: HelpCircle,
  },
  admin: {
    title: "Admin control room",
    eyebrow: "Platform operations",
    collection: "users",
    icon: ShieldAlert,
  },
};

function SectionPage() {
  const { section } = Route.useParams();
  const { user, profile, activatePremium } = useAuth();
  const config = metadata[section] ?? DEFAULT_CONFIG;
  const Icon = config.icon;
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // Posts sub-tab
  const [postsTab, setPostsTab] = useState<"ALL" | "EXCHANGE" | "QUESTION">("ALL");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postFormType, setPostFormType] = useState<"EXCHANGE" | "QUESTION">("EXCHANGE");
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postTeachSkills, setPostTeachSkills] = useState("");
  const [postLearnSkills, setPostLearnSkills] = useState("");
  const [postCategory, setPostCategory] = useState("Programming");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);

  // Active solution/comment reply input map: { [postId]: string }
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Premium Simulated Checkout State
  const [paymentModal, setPaymentModal] = useState<"monthly" | "yearly" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "card">("bkash");
  const [paymentAccount, setPaymentAccount] = useState("01712345678");
  const [paymentPin, setPaymentPin] = useState("1234");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!user || ["settings", "admin"].includes(section)) return;
    if (!user || ["settings", "admin", "premium", "faq"].includes(section)) return;

    if (section === "requests") {
      let sent: Row[] = [];
      let received: Row[] = [];
      const merge = () =>
        setRows(
          [...sent, ...received].filter(
            (row, index, list) => list.findIndex((item) => item.id === row.id) === index,
          ),
        );
      const stopSent = watchRecords<Row>(
        "requests",
        [where("senderId", "==", user.uid)],
        (rows) => {
          sent = rows;
          merge();
        },
        (error) => setNotice(error.message),
      );
      const stopReceived = watchRecords<Row>(
        "requests",
        [where("recipientId", "==", user.uid)],
        (rows) => {
          received = rows;
          merge();
        },
        (error) => setNotice(error.message),
      );
      return () => {
        stopSent();
        stopReceived();
      };
    }

    if (section === "calendar") {
      let studentSessions: Row[] = [];
      let tutorSessions: Row[] = [];
      const merge = () => {
        const combined = [...studentSessions, ...tutorSessions].filter(
          (row, idx, list) => list.findIndex((item) => item.id === row.id) === idx,
        );
        setRows(combined);
      };
      const stopStudent = watchRecords<Row>(
        "sessions",
        [where("studentId", "==", user.uid)],
        (r) => {
          studentSessions = r;
          merge();
        },
        (err) => setNotice(err.message),
      );
      const stopTutor = watchRecords<Row>(
        "sessions",
        [where("tutorId", "==", user.uid)],
        (r) => {
          tutorSessions = r;
          merge();
        },
        (err) => setNotice(err.message),
      );
      return () => {
        stopStudent();
        stopTutor();
      };
    }

    const targetCollection = section === "solutions" ? "posts" : config.collection;
    const constraints =
      section === "notifications"
        ? [where("recipientId", "==", user.uid), orderBy("createdAt", "desc")]
        : section === "support"
          ? [where("userId", "==", user.uid), orderBy("createdAt", "desc")]
          : [orderBy("createdAt", "desc")];

    return watchRecords<Row>(targetCollection, constraints, setRows, () => {
      return watchRecords<Row>(targetCollection, [], setRows, (error) =>
        setNotice(error.message),
      );
    });
  }, [config.collection, section, user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    try {
      await createRecord(section === "safety" ? "reports" : "supportTickets", {
        ...(section === "safety"
          ? { reporterId: user.uid, reason: subject }
          : { userId: user.uid, subject }),
        description,
        status: "OPEN",
      });
      setNotice("Submitted successfully.");
      setSubject("");
      setDescription("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not submit.");
    }
  }

  // Handle Post Creation (Skill Exchange vs Quick Solution)
  async function handleCreatePost(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !postTitle.trim() || !postDescription.trim()) return;
    setPostSubmitting(true);
    try {
      const teachList = postTeachSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const learnList = postLearnSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createRecord("posts", {
        title: postTitle.trim(),
        description: postDescription.trim(),
        category: postCategory,
        postType: postFormType,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || "Member",
        authorPhoto: profile?.photoURL || user.photoURL || null,
        status: "PUBLISHED",
        teachSkills: teachList,
        learnSkills: learnList,
        skillsOffered: teachList,
        skillsWanted: learnList,
        premium: Boolean(profile?.premium),
        tutorVerified: Boolean(profile?.tutorVerified),
        likes: [],
        comments: [],
        replies: 0,
      });

      setNotice(
        postFormType === "EXCHANGE"
          ? "Skill exchange post published! Other members can now send exchange requests."
          : "Quick solution question published! The community can now like and provide solutions.",
      );
      setCreatePostOpen(false);
      setPostTitle("");
      setPostDescription("");
      setPostTeachSkills("");
      setPostLearnSkills("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create post.");
    } finally {
      setPostSubmitting(false);
    }
  }

  // Toggle Like on a Post
  // Toggle Like on a Post with optimistic update
  async function handleToggleLike(post: Row) {
    if (!user) return;
    const currentLikes = Array.isArray(post.likes) ? post.likes : [];
    const hasLiked = currentLikes.includes(user.uid);
    const nextLikes = hasLiked
      ? currentLikes.filter((uid) => uid !== user.uid)
      : [...currentLikes, user.uid];

    // Optimistic local update
    setRows((prev) =>
      prev.map((r) => (r.id === post.id ? { ...r, likes: nextLikes } : r)),
    );

    try {
      const currentLikes = Array.isArray(post.likes) ? post.likes : [];
      const hasLiked = currentLikes.includes(user.uid);
      const nextLikes = hasLiked
        ? currentLikes.filter((uid) => uid !== user.uid)
        : [...currentLikes, user.uid];

      await updateRecord("posts", post.id, { likes: nextLikes });
    } catch (error) {
      console.warn("Could not update like:", error);
      // Revert if error
      setRows((prev) =>
        prev.map((r) => (r.id === post.id ? { ...r, likes: currentLikes } : r)),
      );
      setNotice(error instanceof Error ? error.message : "Failed to update like reaction.");
    }
  }

  // Add Comment / Solution to a Question with optimistic update
  async function handleAddComment(postId: string) {
    if (!user) return;
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const post = rows.find((r) => r.id === postId);
    const currentComments = Array.isArray(post?.comments) ? post.comments : [];
    const newComment: CommentItem = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      authorId: user.uid,
      authorName: profile?.displayName || user.displayName || "Helper",
      authorPhoto: profile?.photoURL || user.photoURL || null,
      text,
      createdAt: new Date().toISOString(),
      premium: Boolean(profile?.premium),
      tutorVerified: Boolean(profile?.tutorVerified),
    };
    const nextComments = [...currentComments, newComment];

    // Optimistic local update & instant input clear
    setRows((prev) =>
      prev.map((r) =>
        r.id === postId
          ? { ...r, comments: nextComments, replies: nextComments.length }
          : r,
      ),
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));

    try {
      await updateRecord("posts", postId, {
        comments: nextComments,
        replies: nextComments.length,
      });

      setNotice(
        section === "solutions"
          ? "Solution submitted successfully."
          : "Comment posted successfully.",
      );
    } catch (error) {
      // Revert if error
      setRows((prev) =>
        prev.map((r) =>
          r.id === postId
            ? { ...r, comments: currentComments, replies: currentComments.length }
            : r,
        ),
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: text }));
      setNotice(error instanceof Error ? error.message : "Could not post solution/comment.");
    }
  }

  // Calendar Session Controls
  async function acceptSession(session: Row) {
    try {
      await updateRecord("sessions", session.id, {
        status: "CONFIRMED",
        confirmedAt: new Date().toISOString(),
      });
      if (session.studentId) {
        await createRecord("notifications", {
          recipientId: session.studentId,
          title: "Session Confirmed!",
          description: `Your session with ${session.tutorName || "your tutor"} on ${session.date || "scheduled date"} has been confirmed!`,
          status: "UNREAD",
          type: "SESSION_CONFIRMED",
          sessionId: session.id,
        }).catch(console.warn);
      }
      setNotice("Session accepted! Video call link is now ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to accept session.");
    }
  }

  async function rejectSession(session: Row) {
    try {
      await updateRecord("sessions", session.id, {
        status: "REJECTED",
        rejectedAt: new Date().toISOString(),
      });
      if (session.studentId) {
        await createRecord("notifications", {
          recipientId: session.studentId,
          title: "Session Request Declined",
          description: `Your session request with ${session.tutorName || "tutor"} was declined.`,
          status: "UNREAD",
          type: "SESSION_REJECTED",
        }).catch(console.warn);
      }
      setNotice("Session declined.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to decline session.");
    }
  }

  // Dummy Premium Payment
  async function completeDummyPremiumPayment() {
    if (!user || !paymentModal) return;
    setPaying(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      await activatePremium();

      try {
        await createRecord("orders", {
          userId: user.uid,
          items: [
            {
              name: `Skill Binimoy Premium (${paymentModal === "monthly" ? "Monthly" : "Yearly"})`,
              quantity: 1,
              price: paymentModal === "monthly" ? 299 : 2999,
            },
          ],
          total: paymentModal === "monthly" ? 299 : 2999,
          paymentMethod: paymentMethod.toUpperCase(),
          status: "PAID",
        });
      } catch (orderError) {
        console.warn("Order record could not be saved to Firestore:", orderError);
      }

      setNotice(
        "Premium activated successfully! Your Verified ID badge is now displayed across the app.",
      );
      setPaymentModal(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Payment simulation failed.");
    } finally {
      setPaying(false);
    }
  }

  async function sendExchangeRequest(row: Row) {
    if (!user || !row.authorId || row.authorId === user.uid) {
      setNotice("You cannot send an exchange request to your own post.");
      return;
    }
    try {
      await sendExchangeRequestHelper({
        sender: {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName,
          email: user.email,
          photoURL: profile?.photoURL || user.photoURL,
        },
        recipientId: row.authorId,
        recipientName: row.authorName || row.name || "Member",
        message: `I would like to exchange skills around “${row.title || "this post"}”.`,
        postId: row.id,
      });
      setNotice("Exchange request sent! The member will see it in their Notifications.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send request.");
    }
  }

  async function handleAccept(row: Row) {
    if (!user) return;
    const partnerId =
      row.senderId || (row.recipientId === user.uid ? row.senderId : row.recipientId);
    if (!partnerId) {
      setNotice("Could not find exchange partner details.");
      return;
    }
    try {
      await acceptExchangeRequestHelper({
        currentUser: {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName,
          email: user.email,
          photoURL: profile?.photoURL || user.photoURL,
        },
        requestId: row.requestId || row.id,
        notificationId: section === "notifications" ? row.id : undefined,
        senderId: partnerId,
        senderName: row.senderName,
        senderPhoto: row.senderPhoto,
      });
      setNotice(
        "Exchange request accepted! A conversation is ready in Messages with live video call.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not accept request.");
    }
  }

  async function handleReject(row: Row) {
    try {
      await rejectExchangeRequestHelper({
        requestId: row.requestId || row.id,
        notificationId: section === "notifications" ? row.id : undefined,
      });
      setNotice("Exchange request declined.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not decline request.");
    }
  }

  async function markAllNotificationsRead() {
    if (!user) return;
    const unread = rows.filter((r) => r.status === "UNREAD" || r.status === "PENDING");
    for (const notif of unread) {
      void updateRecord("notifications", notif.id, { status: "READ" });
    }
    setNotice("Notifications marked as read.");
  }

  const filtered = rows
    .filter((row) => {
      if (section === "solutions") {
        return row.postType === "QUESTION" || (!row.postType && !row.teachSkills?.length);
      }
      if (section === "posts") {
        if (postsTab === "EXCHANGE") {
          return row.postType === "EXCHANGE" || (!row.postType && row.teachSkills?.length);
        }
        if (postsTab === "QUESTION") {
          return row.postType === "QUESTION" || (!row.postType && !row.teachSkills?.length);
        }
      }
      return true;
    })
    .filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));

  return (
    <WorkspaceShell title={config.title} eyebrow={config.eyebrow}>
      <div className="space-y-6">
        {section === "admin" && profile?.role !== "ADMIN" ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6">
            Admin access is restricted to administrators.
          </div>
        ) : section === "faq" ? (
          <FaqContent />
        ) : section === "premium" ? (
          /* PREMIUM SECTION WITH DUMMY CHECKOUT */
          <div className="space-y-8">
            <div className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-amber-500/10 p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-400">
                    <Crown className="size-4" /> Official Verification Program
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-950">
                    Skill Binimoy Verified ID & Pro
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl">
                    Get the trusted <strong>blue verified checkmark</strong> badge on your profile,
                    gain priority listing on Explore skills, and unlock 1-on-1 live video tutoring.
                  </p>
                </div>
                {(profile?.premium || profile?.tutorVerified) && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 p-4 text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck className="size-6 text-emerald-600" />
                    <div>
                      <p className="font-black text-sm">Verified ID Active</p>
                      <p className="text-xs">Your account has full premium verification.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
              {[
                { plan: "monthly" as const, price: "৳299", duration: "/month", label: "Monthly Pass" },
                { plan: "yearly" as const, price: "৳2,999", duration: "/year", label: "Annual Pass (Save 16%)" },
              ].map(({ plan, price, duration, label }) => (
                <div
                  key={plan}
                  className="rounded-3xl border-2 border-primary/40 bg-card p-6 shadow-card hover:shadow-lift transition flex flex-col justify-between"
                >
                  <div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                      {label}
                    </span>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-950">{price}</span>
                      <span className="text-xs text-muted-foreground">{duration}</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-600 shrink-0" />
                        <strong>Verified ID checkmark</strong> on profile & directory
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-600 shrink-0" />
                        Priority ranking on Explore skills
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-600 shrink-0" />
                        Unlimited skill exchange requests
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-600 shrink-0" />
                        Instant tutor booking & live video rooms
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setPaymentModal(plan)}
                    className="mt-6 w-full rounded-xl bg-primary py-3 text-xs font-black text-white hover:bg-primary-hover shadow-sm transition active:scale-98"
                  >
                    Activate with Simulated Payment
                  </button>
                </div>
              ))}
            </div>

            {notice && (
              <p className="text-center text-sm font-bold text-primary bg-primary-soft p-3 rounded-xl max-w-lg mx-auto">
                {notice}
              </p>
            )}

            {/* Payment Modal */}
            {paymentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-950">
                        Simulated Payment Checkout
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {paymentModal === "monthly" ? "Monthly Pass (৳299)" : "Annual Pass (৳2,999)"}
                      </p>
                    </div>
                    <button
                      onClick={() => setPaymentModal(null)}
                      className="rounded-xl p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground">
                        Select Payment Channel
                      </label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          { id: "bkash" as const, label: "bKash", icon: Smartphone },
                          { id: "nagad" as const, label: "Nagad", icon: Smartphone },
                          { id: "card" as const, label: "Card", icon: CreditCard },
                        ].map((method) => {
                          const MethodIcon = method.icon;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentMethod(method.id)}
                              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                                paymentMethod === method.id
                                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                                  : "border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <MethodIcon className="size-4" />
                              {method.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {paymentMethod === "card" ? (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-muted-foreground">
                          Card Number
                          <input
                            type="text"
                            defaultValue="4242 •••• •••• 4242"
                            className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-xs font-bold text-muted-foreground">
                            Expiry
                            <input
                              type="text"
                              defaultValue="12/28"
                              className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                            />
                          </label>
                          <label className="block text-xs font-bold text-muted-foreground">
                            CVC
                            <input
                              type="text"
                              defaultValue="888"
                              className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-muted-foreground">
                          {paymentMethod === "bkash" ? "bKash" : "Nagad"} Mobile Number
                          <input
                            type="text"
                            value={paymentAccount}
                            onChange={(e) => setPaymentAccount(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                          />
                        </label>
                        <label className="block text-xs font-bold text-muted-foreground">
                          PIN (Simulation)
                          <input
                            type="password"
                            value={paymentPin}
                            onChange={(e) => setPaymentPin(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                          />
                        </label>
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-[11px] text-muted-foreground leading-relaxed">
                      💡 <strong>Simulation Mode:</strong> No real money is charged. Clicking
                      Confirm Payment simulates the transaction and instantly unlocks your{" "}
                      <strong>Verified ID</strong> badge.
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setPaymentModal(null)}
                        className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={paying}
                        onClick={() => void completeDummyPremiumPayment()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition"
                      >
                        {paying ? "Processing Payment..." : "Confirm Payment"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ALL OTHER SECTIONS */
          <>
            {/* Top Toolbar */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary shadow-2xs">
                  <Icon className="size-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">{config.title}</h2>
                  <p className="text-xs font-semibold text-muted-foreground">{rows.length} live records</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {section === "notifications" && rows.some((r) => r.status === "UNREAD" || r.status === "PENDING") && (
                  <button
                    onClick={() => void markAllNotificationsRead()}
                    className="h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-slate-100/70 dark:hover:bg-slate-800/60 shadow-2xs transition"
                  >
                    Mark all read
                  </button>
                )}

                {section === "solutions" && (
                  <button
                    onClick={() => {
                      setPostFormType("QUESTION");
                      setCreatePostOpen(true);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-hover shadow-xs active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="size-4" /> Ask a Question
                  </button>
                )}

                {section === "posts" && (
                  <button
                    onClick={() => setCreatePostOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-hover shadow-xs active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="size-4" /> Create Post / Ask
                  </button>
                )}

                <input
                  className="h-10 rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground shadow-2xs transition sm:w-68"
                  placeholder="Search records..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            {/* SEPARATED POSTS TABS (Skill Exchanges vs Quick Solutions) */}
            {section === "posts" && (
              <div className="flex items-center gap-2 border-b border-border pb-3">
                {[
                  { id: "ALL" as const, label: "All Posts" },
                  { id: "EXCHANGE" as const, label: "Skill Exchange Posts" },
                  { id: "QUESTION" as const, label: "Quick Solutions (Q&A)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPostsTab(tab.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      postsTab === tab.id
                        ? "bg-primary text-white shadow-xs"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {notice && (
              <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4 text-xs font-bold text-primary">
                <span>{notice}</span>
                <button onClick={() => setNotice("")} className="hover:opacity-75">
                  <X className="size-4" />
                </button>
              </div>
            )}

            {/* Support/Safety Ticket Form */}
            {["support", "safety"].includes(section) && (
              <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-black text-slate-950">
                  {section === "support" ? "Open a Support Ticket" : "Report a Safety Concern"}
                </h2>
                <div className="mt-4 grid gap-3">
                  <input
                    required
                    className="h-10 rounded-xl border border-input bg-background px-3 text-xs outline-none"
                    placeholder={section === "support" ? "Subject / Issue" : "Reason for reporting"}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                  <textarea
                    required
                    className="min-h-24 rounded-xl border border-input bg-background p-3 text-xs outline-none"
                    placeholder="Provide context and details..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <button className="h-10 w-fit rounded-xl bg-primary px-5 text-xs font-bold text-white hover:bg-primary-hover transition">
                    Submit Ticket
                  </button>
                </div>
              </form>
            )}

            {/* Grid of Records */}
            <div className="grid gap-4">
              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                  No records found in this view.
                </div>
              ) : (
                filtered.map((row) => {
                  const isQuickSolution = section === "solutions" || row.postType === "QUESTION";
                  const isExchangePost = !isQuickSolution && (row.postType === "EXCHANGE" || (section === "posts" && !isQuickSolution));
                  const postLikes = Array.isArray(row.likes) ? row.likes : [];
                  const userLiked = user ? postLikes.includes(user.uid) : false;
                  const comments = Array.isArray(row.comments) ? row.comments : [];
                  const isCommentsOpen = Boolean(expandedComments[row.id]);
                  const authorId = row.authorId || row.senderId;

                  return (
                    <article
                      key={row.id}
                      className="rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/30 transition"
                    >
                      {/* Post / Record Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div
                          onClick={() => {
                            if (authorId) {
                              setViewingProfile({
                                uid: authorId,
                                id: authorId,
                                displayName: row.authorName || row.senderName || "Community Member",
                                photoURL: (row.authorPhoto || row.senderPhoto) as string | null,
                                bio: (row.authorBio || row.bio || row.description) as string | undefined,
                                skillsOffered: (row.teachSkills || row.skillsOffered || (row.category ? [row.category] : [])) as string[],
                                skillsWanted: (row.learnSkills || row.skillsWanted || []) as string[],
                                role: (row.authorRole || "MEMBER") as string,
                                education: row.education as string | undefined,
                                location: row.location as string | undefined,
                                availability: row.availability as string | undefined,
                                tutorVerified: Boolean(row.tutorVerified),
                                premium: Boolean(row.premium),
                              });
                            }
                          }}
                          className="flex items-start gap-3 cursor-pointer group"
                        >
                          {row.authorPhoto || row.senderPhoto ? (
                            <img
                              src={(row.authorPhoto || row.senderPhoto) as string}
                              alt={row.authorName || row.senderName || "Member"}
                              className="size-11 rounded-xl object-cover ring-2 ring-primary/10 group-hover:ring-primary shrink-0 transition"
                            />
                          ) : (
                            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary group-hover:bg-primary group-hover:text-white shrink-0 transition">
                              {(row.authorName || row.senderName || row.name || "M")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                          )}

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition inline-flex items-center gap-1.5">
                                {row.authorName || row.senderName || "Community Member"}
                                {(row.premium || row.tutorVerified || (authorId === user?.uid && (profile?.premium || profile?.tutorVerified))) && (
                                  <span title="Verified Member" className="text-primary shrink-0">
                                    <BadgeCheck className="size-4" />
                                  </span>
                                )}
                              </span>
                              <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                {isQuickSolution ? "Quick Solution Question" : row.category || row.type || "Update"}
                              </span>
                            </div>

                            <h3 className="mt-1.5 text-xl font-black text-slate-900 dark:text-white tracking-tight">
                              {row.title || row.name || row.subject || "Community Update"}
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-normal">
                              {row.description || row.body || row.message || ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {row.status && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                row.status === "ACCEPTED" || row.status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : row.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-primary-soft text-primary"
                              }`}
                            >
                              {row.status}
                            </span>
                          )}

                          {(profile?.role === "ADMIN" || user?.uid === authorId) && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const isAdm = profile?.role === "ADMIN";
                                const confirmText = isAdm
                                  ? `Admin: Are you sure you want to permanently delete post "${row.title || row.name || 'this post'}"?`
                                  : `Delete your post "${row.title || row.name || 'this post'}"?`;
                                if (window.confirm(confirmText)) {
                                  try {
                                    await deleteRecord("posts", row.id);
                                    setNotice("Post was successfully removed.");
                                  } catch (err) {
                                    setNotice(err instanceof Error ? err.message : "Failed to remove post");
                                  }
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition"
                              title={profile?.role === "ADMIN" ? "Admin: Remove this post" : "Delete your post"}
                            >
                              <Trash2 className="size-3.5" />
                              <span>{profile?.role === "ADMIN" ? "Remove Post" : "Delete"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SKILL EXCHANGE POST: Show Can Teach vs Wants to Learn */}
                      {section === "posts" && isExchangePost && (
                        <div className="mt-4 space-y-2 border-t border-border/70 pt-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                              Can Teach:
                            </span>
                            {(row.teachSkills || row.skillsOffered || []).length > 0 ? (
                              (row.teachSkills || row.skillsOffered || []).map((s, i) => (
                                <span
                                  key={i}
                                  className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic">Specified in bio</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px]">
                              Wants to Learn:
                            </span>
                            {(row.learnSkills || row.skillsWanted || []).length > 0 ? (
                              (row.learnSkills || row.skillsWanted || []).map((s, i) => (
                                <span
                                  key={i}
                                  className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic">Open to ideas</span>
                            )}
                          </div>

                          <div className="pt-2">
                            {row.authorId === user?.uid ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                <Check className="size-3.5" /> Your Active Post · Ready for incoming exchange requests
                              </span>
                            ) : (
                              <button
                                onClick={() => void sendExchangeRequest(row)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs active:scale-95 transition"
                              >
                                <Send className="size-3.5" /> Send exchange request
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* REACT (LIKE) & COMMENT SECTION: QUICK SOLUTIONS & POSTS */}
                      {(section === "solutions" || section === "posts") && (
                        <div className="mt-5 border-t border-border/80 pt-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void handleToggleLike(row)}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs ${
                                userLiked
                                  ? "border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                  : "border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <Heart
                                className={`size-4 ${userLiked ? "fill-rose-500 text-rose-500" : ""}`}
                              />
                              <span>{postLikes.length} {postLikes.length === 1 ? "Like" : "Likes"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedComments((prev) => ({
                                  ...prev,
                                  [row.id]: !prev[row.id],
                                }))
                              }
                              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs ${
                                isCommentsOpen
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <MessageSquare className="size-4" />
                              <span>
                                {comments.length}{" "}
                                {section === "solutions"
                                  ? comments.length === 1
                                    ? "Solution"
                                    : "Solutions"
                                  : comments.length === 1
                                    ? "Comment"
                                    : "Comments"}
                              </span>
                            </button>
                          </div>

                          {/* Solutions / Comments List & Input */}
                          {isCommentsOpen && (
                            <div className="mt-4 space-y-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <Sparkles className="size-3.5 text-primary" />
                                  {section === "solutions"
                                    ? "Community Solutions & Answers"
                                    : "Comments & Discussion"}
                                </h4>
                                <span className="text-xs font-bold text-muted-foreground">
                                  {comments.length} {comments.length === 1 ? "response" : "responses"}
                                </span>
                              </div>

                              {comments.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border bg-card/60 p-4 text-center">
                                  <p className="text-xs font-medium text-muted-foreground italic">
                                    {section === "solutions"
                                      ? "No solutions offered yet. Be the first to share your expertise!"
                                      : "No comments yet. Start the conversation!"}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {comments.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="rounded-xl border border-border bg-card p-3.5 sm:p-4 text-xs shadow-2xs transition hover:border-slate-300 dark:hover:border-slate-700"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div
                                          onClick={() => {
                                            if (comment.authorId) {
                                              setViewingProfile({
                                                uid: comment.authorId,
                                                id: comment.authorId,
                                                displayName: comment.authorName || "Community Member",
                                                photoURL: comment.authorPhoto || null,
                                                role: "MEMBER",
                                                bio: `Contributed solution: "${comment.text}"`,
                                              });
                                            }
                                          }}
                                          className="flex items-center gap-2.5 cursor-pointer group"
                                        >
                                          {comment.authorPhoto ? (
                                            <img
                                              src={comment.authorPhoto}
                                              alt={comment.authorName}
                                              className="size-7 rounded-full object-cover ring-1 ring-primary/20 group-hover:ring-primary transition"
                                            />
                                          ) : (
                                            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary group-hover:bg-primary group-hover:text-white transition">
                                              {comment.authorName.slice(0, 1)}
                                            </span>
                                          )}
                                          <span className="font-extrabold text-sm text-slate-950 dark:text-white group-hover:text-primary transition inline-flex items-center gap-1.5">
                                            {comment.authorName}
                                            {(comment.premium || comment.tutorVerified || (comment.authorId === user?.uid && (profile?.premium || profile?.tutorVerified))) && (
                                              <span title="Verified Member" className="text-primary shrink-0">
                                                <BadgeCheck className="size-3.5" />
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                                          {new Date(comment.createdAt).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                      </div>
                                      <p className="mt-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
                                        {comment.text}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Input box to add a solution */}
                              <div className="mt-3 flex items-center gap-2.5">
                                <input
                                  value={commentInputs[row.id] || ""}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [row.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      void handleAddComment(row.id);
                                    }
                                  }}
                                  placeholder={
                                    section === "solutions"
                                      ? "Write a clear, helpful solution with details..."
                                      : "Write a thoughtful reply..."
                                  }
                                  className="h-11 flex-1 rounded-xl border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleAddComment(row.id)}
                                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-extrabold text-white hover:bg-primary-hover shadow-xs active:scale-95 transition cursor-pointer shrink-0"
                                >
                                  <Send className="size-3.5" />{" "}
                                  {section === "solutions" ? "Post Solution" : "Reply"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXCHANGE REQUESTS & NOTIFICATIONS CONTROLS */}
                      {(row.type === "EXCHANGE_REQUEST" || section === "requests") && (
                        <div className="mt-4 border-t border-border/70 pt-3">
                          {row.status === "PENDING" &&
                            (row.recipientId === user?.uid || section === "notifications") && (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => void handleAccept(row)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                                >
                                  <CheckCircle2 className="size-4" /> Accept Request
                                </button>
                                <button
                                  onClick={() => void handleReject(row)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                                >
                                  <XCircle className="size-4" /> Decline
                                </button>
                              </div>
                            )}

                          {row.status === "ACCEPTED" && (
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-3.5" /> Exchange Active
                              </span>
                              <Link
                                to="/messages"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition"
                              >
                                <MessageCircle className="size-3.5" /> Open Chat & Video Call
                              </Link>
                            </div>
                          )}

                          {row.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-500">
                              <XCircle className="size-3.5" /> Request Declined
                            </span>
                          )}
                        </div>
                      )}

                      {/* REQUEST ACCEPTED NOTIFICATION */}
                      {row.type === "REQUEST_ACCEPTED" && (
                        <div className="mt-4">
                          <Link
                            to="/messages"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover"
                          >
                            <MessageCircle className="size-3.5" /> Open Chat & Video Call
                          </Link>
                        </div>
                      )}

                      {/* CALENDAR TUTOR SESSION CARDS */}
                      {section === "calendar" && (
                        <div className="mt-4 border-t border-border/70 pt-3">
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs grid gap-1 sm:grid-cols-2">
                            <p>
                              <strong>Date & Time:</strong> {row.date || "Scheduled"} at {row.time || "TBD"}
                            </p>
                            <p>
                              <strong>Participants:</strong> {row.studentName || "Student"} & {row.tutorName || "Tutor"}
                            </p>
                            {row.topic && (
                              <p className="sm:col-span-2">
                                <strong>Topic:</strong> {row.topic}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {/* Tutor Accept / Reject buttons */}
                            {row.status === "PENDING" && row.tutorId === user?.uid && (
                              <>
                                <button
                                  onClick={() => void acceptSession(row)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="size-3.5" /> Accept Session
                                </button>
                                <button
                                  onClick={() => void rejectSession(row)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                                >
                                  <XCircle className="size-3.5" /> Decline
                                </button>
                              </>
                            )}

                            {/* Confirmed: Direct Video Call */}
                            {row.status === "CONFIRMED" && (
                              <Link
                                to="/video-call/$callId"
                                params={{ callId: row.id }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover"
                              >
                                <Video className="size-3.5" /> Join Live Video Call
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

            {/* Create Post / Ask Question Modal */}
            {createPostOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-card-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xl text-slate-950 dark:text-white tracking-tight">
                        Create Post or Ask Question
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose whether to post a skill exchange or ask for a quick solution.
                      </p>
                    </div>
                    <button
                      onClick={() => setCreatePostOpen(false)}
                      className="rounded-xl p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Post Type Selector */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPostFormType("EXCHANGE")}
                      className={`rounded-2xl border p-3.5 text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        postFormType === "EXCHANGE"
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                          : "border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Sparkles className="size-5" />
                      <span className="font-extrabold text-sm">Skill Exchange Post</span>
                      <span className="text-[11px] font-normal opacity-80">Teach + Learn barter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPostFormType("QUESTION")}
                      className={`rounded-2xl border p-3.5 text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        postFormType === "QUESTION"
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                          : "border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <HelpCircle className="size-5" />
                      <span className="font-extrabold text-sm">Quick Solution</span>
                      <span className="text-[11px] font-normal opacity-80">Community Q&A</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreatePost} className="mt-5 space-y-4">
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {postFormType === "EXCHANGE" ? "Exchange Title" : "Problem / Question Title"}
                      <input
                        required
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder={
                          postFormType === "EXCHANGE"
                            ? "e.g., Offering Python mentoring in exchange for UI Design"
                            : "e.g., How to resolve CORS error in React with Firebase Auth?"
                        }
                        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-2xs transition"
                      />
                    </label>

                    {postFormType === "EXCHANGE" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                          What You Can Teach
                          <input
                            required
                            value={postTeachSkills}
                            onChange={(e) => setPostTeachSkills(e.target.value)}
                            placeholder="e.g. Python, SQL, Git"
                            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-2xs transition"
                          />
                        </label>
                        <label className="block text-xs font-extrabold text-amber-700 dark:text-amber-400">
                          What You Want to Learn
                          <input
                            required
                            value={postLearnSkills}
                            onChange={(e) => setPostLearnSkills(e.target.value)}
                            placeholder="e.g. Figma, Photography"
                            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-2xs transition"
                          />
                        </label>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        Category
                        <select
                          value={postCategory}
                          onChange={(e) => setPostCategory(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-2xs transition"
                        >
                          <option>Programming</option>
                          <option>Web Development</option>
                          <option>Design</option>
                          <option>AI / Machine Learning</option>
                          <option>Photography</option>
                          <option>Languages</option>
                          <option>Business</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {postFormType === "EXCHANGE" ? "Details & Availability" : "Description & Context"}
                      <textarea
                        required
                        rows={3}
                        value={postDescription}
                        onChange={(e) => setPostDescription(e.target.value)}
                        placeholder="Provide details so other members understand your goal..."
                        className="mt-1.5 w-full rounded-xl border border-input bg-background p-3.5 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground shadow-2xs transition"
                      />
                    </label>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setCreatePostOpen(false)}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={postSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover disabled:opacity-50 shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <Send className="size-3.5" />
                        {postSubmitting ? "Publishing..." : "Publish Post"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
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
