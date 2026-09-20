import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { where } from "firebase/firestore";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useAuth } from "@/lib/auth";
import { createRecord, deleteRecord, watchRecords } from "@/lib/firestore";
import { sendExchangeRequest } from "@/lib/exchange";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";

type Person = {
  id: string;
  uid?: string | undefined;
  displayName?: string | undefined;
  email?: string | null | undefined;
  photoURL?: string | null | undefined;
  bio?: string | undefined;
  skillsOffered?: string[] | undefined;
  skillsWanted?: string[] | undefined;
  location?: string | undefined;
  education?: string | undefined;
  availability?: string | undefined;
  role?: string | undefined;
  tutorVerified?: boolean | undefined;
  premium?: boolean | undefined;
};

type ExchangePost = {
  id: string;
  authorId?: string;
  authorName?: string;
  authorPhoto?: string | null;
  title?: string;
  description?: string;
  teachSkills?: string[];
  learnSkills?: string[];
  category?: string;
  createdAt?: string;
};

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Skill Exchange Network · Skill Binimoy" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  const { user, profile } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [exchangePosts, setExchangePosts] = useState<ExchangePost[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "offers">("members");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  // Modals
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);

  // Broadcast skill swap offer modal
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [swapTitle, setSwapTitle] = useState("");
  const [swapTeach, setSwapTeach] = useState("");
  const [swapLearn, setSwapLearn] = useState("");
  const [swapNote, setSwapNote] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    const stopUsers = watchRecords<Person>("users", [], setPeople, (err) =>
      setNotice(err.message),
    );
    const stopPosts = watchRecords<ExchangePost>(
      "posts",
      [],
      (posts) => {
        setExchangePosts(
          posts.filter(
            (p: any) =>
              p.postType === "EXCHANGE" ||
              p.category === "Skill Exchange" ||
              p.type === "Skill Exchange" ||
              (Array.isArray(p.teachSkills) && p.teachSkills.length > 0) ||
              (Array.isArray(p.skillsOffered) && p.skillsOffered.length > 0),
          ),
        );
      },
      (err) => setNotice(err.message),
    );
    return () => {
      stopUsers();
      stopPosts();
    };
  }, []);

  const visiblePeople = people.filter((person) => {
    if (person.uid === user?.uid) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (person.displayName || "").toLowerCase().includes(term) ||
      (person.location || "").toLowerCase().includes(term) ||
      (person.bio || "").toLowerCase().includes(term) ||
      (person.skillsOffered || []).some((s) => s.toLowerCase().includes(term)) ||
      (person.skillsWanted || []).some((s) => s.toLowerCase().includes(term))
    );
  });

  const visibleOffers = exchangePosts.filter((post) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (post.title || "").toLowerCase().includes(term) ||
      (post.description || "").toLowerCase().includes(term) ||
      (post.authorName || "").toLowerCase().includes(term) ||
      (post.teachSkills || []).some((s) => s.toLowerCase().includes(term)) ||
      (post.learnSkills || []).some((s) => s.toLowerCase().includes(term))
    );
  });

  async function handleSendRequest() {
    if (!user || !selectedPerson || !selectedPerson.uid) return;
    setSending(true);
    try {
      await sendExchangeRequest({
        sender: {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName,
          email: user.email,
          photoURL: profile?.photoURL || user.photoURL,
        },
        recipientId: selectedPerson.uid,
        recipientName: selectedPerson.displayName || "Member",
        message:
          requestMessage.trim() ||
          `Hello ${selectedPerson.displayName || ""}, I would love to exchange skills with you on Skill Binimoy!`,
      });
      setNotice(
        `Exchange request successfully sent to ${selectedPerson.displayName || "this member"}. They can accept it in Notifications.`,
      );
      setSelectedPerson(null);
      setRequestMessage("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send request.");
    } finally {
      setSending(false);
    }
  }

  async function handleBroadcastSwap(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !swapTitle.trim() || !swapTeach.trim() || !swapLearn.trim()) return;
    setBroadcasting(true);
    try {
      await createRecord("posts", {
        title: swapTitle.trim(),
        description: swapNote.trim() || "Looking for a mutual skill exchange partner.",
        postType: "EXCHANGE",
        teachSkills: swapTeach
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        learnSkills: swapLearn
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || "Member",
        authorPhoto: profile?.photoURL || user.photoURL || null,
        category: "Skill Exchange",
        status: "PUBLISHED",
        premium: Boolean(profile?.premium),
        tutorVerified: Boolean(profile?.tutorVerified),
        createdAt: new Date().toISOString(),
      });
      setSwapTitle("");
      setSwapTeach("");
      setSwapLearn("");
      setSwapNote("");
      setBroadcastOpen(false);
      setActiveTab("offers");
      setNotice("Your Skill Swap Offer is live! Other members can now propose an exchange.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not broadcast skill swap.");
    } finally {
      setBroadcasting(false);
    }
  }

  return (
    <WorkspaceShell title="Skill Exchange Network" eyebrow="Peer-to-peer skill barter">
      <div className="space-y-8">
        {/* Hero Header */}
        <section className="tutors-hero rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-card">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300 mb-3">
              <Sparkles className="size-3.5" /> 100% Peer Skill Exchange · No Money Exchanged
            </span>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight sm:text-4xl">
              Exchange what you know for what you want to learn.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Find partners for direct mutual skill swaps. Teach someone a skill (e.g. Python, Guitar,
              Graphic Design) and learn their craft in return.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setBroadcastOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition"
              >
                <Plus className="size-4" /> Post a Skill Swap Offer
              </button>
            </div>
          </div>
          <Users className="hidden size-24 text-primary/15 lg:block shrink-0" />
        </section>

        {/* View Switcher & Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("members")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "members"
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" />
              <span>Exchange Members</span>
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-black">
                {visiblePeople.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("offers")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "offers"
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Skill Swap Offers</span>
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-black">
                {visibleOffers.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by skill (React, Python, Design) or name..."
              className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {notice && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4 text-xs font-bold text-primary">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-primary hover:opacity-75">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* TAB 1: EXCHANGE MEMBERS DIRECTORY */}
        {activeTab === "members" && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visiblePeople.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <Users className="mx-auto size-10 text-primary/40 mb-3" />
                <h3 className="text-lg font-black text-slate-950">No exchange partners found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching with another skill keyword or clear the search filter.
                </p>
              </div>
            ) : (
              visiblePeople.map((person) => {
                const offered = person.skillsOffered || [];
                const wanted = person.skillsWanted || [];

                return (
                  <article
                    className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 hover:shadow-lift transition"
                    key={person.id}
                  >
                    <div>
                      {/* Member Info Row (Clickable to View Profile) */}
                      <div
                        onClick={() => setViewingProfile(person)}
                        className="flex items-start gap-3.5 cursor-pointer group"
                      >
                        {person.photoURL ? (
                          <img
                            src={person.photoURL}
                            alt={person.displayName || "Member"}
                            className="size-13 rounded-2xl object-cover ring-2 ring-primary/20 shadow-xs group-hover:ring-primary transition"
                          />
                        ) : (
                          <span className="grid size-13 place-items-center rounded-2xl bg-primary/10 text-lg font-black text-primary ring-2 ring-primary/10 group-hover:bg-primary group-hover:text-white transition">
                            {(person.displayName || "M").slice(0, 1).toUpperCase()}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-base font-black text-slate-950 group-hover:text-primary transition">
                              {person.displayName || "Skill Binimoy Member"}
                            </h3>
                            {(person.tutorVerified || person.premium) && (
                              <span title="Verified ID Member" className="text-primary shrink-0">
                                <BadgeCheck className="size-4" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-primary shrink-0" />
                            {person.location || "Bangladesh"}
                          </p>
                          <span className="text-xs font-extrabold text-primary hover:underline mt-0.5 inline-block">
                            View public profile →
                          </span>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="mt-3.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-2">
                        {person.bio || "Open to mutual peer skill swaps."}
                      </p>

                      {/* High Contrast Skills Section */}
                      <div className="mt-5 space-y-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        {/* Can Teach */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                            <Sparkles className="size-3.5" /> Can Teach (Offered):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {offered.length > 0 ? (
                              offered.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-2xs"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                General mentorship & discussion
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Wants to Learn */}
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                            <BookOpen className="size-3.5" /> Wants to Learn (Desired):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {wanted.length > 0 ? (
                              wanted.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2.5 py-1 text-xs font-extrabold text-amber-800 dark:text-amber-300 shadow-2xs"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Open to exploring new topics
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3.5 border-t border-border">
                      <button
                        onClick={() => {
                          setSelectedPerson(person);
                          setRequestMessage(
                            `Hi ${person.displayName || ""}, I would love to do a skill swap with you! I can help you with what I know, and learn ${person.skillsOffered?.[0] ? `“${person.skillsOffered[0]}”` : "from you"}.`,
                          );
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-hover active:scale-98 cursor-pointer"
                      >
                        <Send className="size-3.5" /> Send Exchange Request
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE SKILL SWAP OFFERS */}
        {activeTab === "offers" && (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleOffers.length === 0 ? (
              <div className="md:col-span-2 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <Sparkles className="mx-auto size-10 text-primary/40 mb-3" />
                <h3 className="text-lg font-black text-slate-950">No skill swap offers posted yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Be the first to post a skill barter request to the community!
                </p>
                <button
                  onClick={() => setBroadcastOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover"
                >
                  <Plus className="size-3.5" /> Post Skill Swap
                </button>
              </div>
            ) : (
              visibleOffers.map((offer) => {
                const author = people.find((p) => p.uid === offer.authorId);

                return (
                  <article
                    key={offer.id}
                    className="rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => {
                            const profileData: ProfileData = {
                              uid: offer.authorId,
                              id: offer.authorId,
                              displayName: offer.authorName || author?.displayName || "Community Member",
                              photoURL: offer.authorPhoto || author?.photoURL,
                              skillsOffered: (offer.teachSkills && offer.teachSkills.length > 0)
                                ? offer.teachSkills
                                : author?.skillsOffered || [],
                              skillsWanted: (offer.learnSkills && offer.learnSkills.length > 0)
                                ? offer.learnSkills
                                : author?.skillsWanted || [],
                              bio: author?.bio || offer.description,
                              role: author?.role || "MEMBER",
                              education: author?.education,
                              location: author?.location,
                              availability: author?.availability,
                              tutorVerified: author?.tutorVerified,
                              premium: author?.premium,
                            };
                            setViewingProfile(profileData);
                          }}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          {offer.authorPhoto ? (
                            <img
                              src={offer.authorPhoto}
                              alt={offer.authorName || "Author"}
                              className="size-10 rounded-xl object-cover ring-1 ring-primary/20 group-hover:ring-primary transition"
                            />
                          ) : (
                            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary group-hover:bg-primary group-hover:text-white transition">
                              {(offer.authorName || "M").slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-extrabold text-slate-950 dark:text-white group-hover:text-primary transition">
                                {offer.authorName || "Community Member"}
                              </p>
                              {(author?.tutorVerified || author?.premium || (offer.authorId === user?.uid && (profile?.tutorVerified || profile?.premium))) && (
                                <span title="Verified Member" className="text-primary shrink-0">
                                  <BadgeCheck className="size-4" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">
                              {offer.createdAt
                                ? new Date(offer.createdAt).toLocaleDateString()
                                : "Recent offer"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary uppercase tracking-wide border border-primary/20">
                            Skill Swap Offer
                          </span>
                          {(profile?.role === "ADMIN" || user?.uid === offer.authorId) && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const isAdm = profile?.role === "ADMIN";
                                const confirmText = isAdm
                                  ? `Admin: Permanently delete skill swap offer "${offer.title}"?`
                                  : `Delete your skill swap offer "${offer.title}"?`;
                                if (window.confirm(confirmText)) {
                                  try {
                                    await deleteRecord("posts", offer.id);
                                    setNotice("Skill swap offer removed.");
                                  } catch (err) {
                                    setNotice(err instanceof Error ? err.message : "Failed to remove offer");
                                  }
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
                              title={profile?.role === "ADMIN" ? "Admin: Remove this post" : "Delete your post"}
                            >
                              <Trash2 className="size-3.5" />
                              <span>{profile?.role === "ADMIN" ? "Remove" : "Delete"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-3.5 text-lg font-black text-slate-950 dark:text-white leading-snug">
                        {offer.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {offer.description}
                      </p>

                      <div className="mt-4 space-y-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                            Will Teach:
                          </span>
                          {(offer.teachSkills || []).map((s, i) => (
                            <span
                              key={i}
                              className="rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-2xs"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-2.5">
                          <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                            Looking For:
                          </span>
                          {(offer.learnSkills || []).map((s, i) => (
                            <span
                              key={i}
                              className="rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2.5 py-1 text-xs font-extrabold text-amber-800 dark:text-amber-300 shadow-2xs"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const profileData: ProfileData = {
                            uid: offer.authorId,
                            id: offer.authorId,
                            displayName: offer.authorName || author?.displayName || "Community Member",
                            photoURL: offer.authorPhoto || author?.photoURL,
                            skillsOffered: (offer.teachSkills && offer.teachSkills.length > 0)
                              ? offer.teachSkills
                              : author?.skillsOffered || [],
                            skillsWanted: (offer.learnSkills && offer.learnSkills.length > 0)
                              ? offer.learnSkills
                              : author?.skillsWanted || [],
                            bio: author?.bio || offer.description,
                            role: author?.role || "MEMBER",
                            education: author?.education,
                            location: author?.location,
                            availability: author?.availability,
                            tutorVerified: author?.tutorVerified,
                            premium: author?.premium,
                          };
                          setViewingProfile(profileData);
                        }}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-primary-soft hover:text-primary transition shrink-0"
                      >
                        View Profile
                      </button>

                      {offer.authorId !== user?.uid ? (
                        <button
                          onClick={() => {
                            if (author) {
                              setSelectedPerson(author);
                              setRequestMessage(
                                `Hi ${author.displayName || ""}, I saw your skill swap offer "${offer.title}". I would love to exchange skills with you!`,
                              );
                            } else {
                              setSelectedPerson({
                                id: offer.authorId || "member",
                                uid: offer.authorId,
                                displayName: offer.authorName || "Member",
                                photoURL: offer.authorPhoto,
                                skillsOffered: offer.teachSkills,
                                skillsWanted: offer.learnSkills,
                              });
                              setRequestMessage(
                                `Hi ${offer.authorName || ""}, I saw your skill swap offer "${offer.title}". I would love to exchange skills with you!`,
                              );
                            }
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs transition active:scale-98"
                        >
                          <Send className="size-3.5" /> Send Exchange Request
                        </button>
                      ) : (
                        <span className="flex-1 text-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl py-2">
                          ✓ Your Active Swap Post
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Modal: Send Exchange Request */}
        {selectedPerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedPerson.photoURL ? (
                    <img
                      src={selectedPerson.photoURL}
                      alt={selectedPerson.displayName || "Member"}
                      className="size-12 rounded-2xl object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-base font-black text-primary">
                      {(selectedPerson.displayName || "M").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h3 className="font-black text-base text-slate-950">
                      Swap Skills with {selectedPerson.displayName || "Member"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Propose a mutual skill trade. No payments involved.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="rounded-xl p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-border text-xs space-y-1.5">
                <p>
                  <strong className="text-emerald-700 dark:text-emerald-300">They can teach:</strong>{" "}
                  {(selectedPerson.skillsOffered || []).join(", ") || "Skills in their profile"}
                </p>
                <p>
                  <strong className="text-amber-700 dark:text-amber-300">They want to learn:</strong>{" "}
                  {(selectedPerson.skillsWanted || []).join(", ") || "Open to suggestions"}
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-muted-foreground">
                  Your Skill Swap Proposal Message
                </label>
                <textarea
                  rows={4}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Explain what you can teach them, what you'd like to learn, and when you are free to meet..."
                  className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedPerson(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void handleSendRequest()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  <Send className="size-3.5" />
                  {sending ? "Sending Proposal..." : "Send Proposal"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Broadcast Skill Swap Offer */}
        {broadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-950">Post a Skill Swap Offer</h3>
                  <p className="text-xs text-muted-foreground">
                    Broadcast your mutual skill exchange to the community.
                  </p>
                </div>
                <button
                  onClick={() => setBroadcastOpen(false)}
                  className="rounded-xl p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleBroadcastSwap} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Offer Headline
                  </label>
                  <input
                    required
                    value={swapTitle}
                    onChange={(e) => setSwapTitle(e.target.value)}
                    placeholder="e.g., Teaching React & Next.js in exchange for Spanish / Guitar"
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Skills You Can Teach (comma-separated)
                    </label>
                    <input
                      required
                      value={swapTeach}
                      onChange={(e) => setSwapTeach(e.target.value)}
                      placeholder="e.g., React, TypeScript, Tailwind"
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                      Skills You Want in Return (comma-separated)
                    </label>
                    <input
                      required
                      value={swapLearn}
                      onChange={(e) => setSwapLearn(e.target.value)}
                      placeholder="e.g., Spanish, Video Editing, UI Design"
                      className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Additional Context / Availability
                  </label>
                  <textarea
                    rows={3}
                    value={swapNote}
                    onChange={(e) => setSwapNote(e.target.value)}
                    placeholder="Describe what kind of project or swap you are looking for, and when you can meet..."
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition"
                  >
                    <Sparkles className="size-3.5" />
                    {broadcasting ? "Broadcasting..." : "Publish Skill Swap"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {viewingProfile && (
          <ProfileModal
            profile={viewingProfile}
            onClose={() => setViewingProfile(null)}
            onSendExchange={(p) => {
              setViewingProfile(null);
              setSelectedPerson(p as Person);
            }}
          />
        )}
      </div>
    </WorkspaceShell>
  );
}
