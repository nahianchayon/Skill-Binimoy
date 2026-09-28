
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ListTodo,
  MessageCircle,
  PhoneCall,
  Plus,
  Send,
  Square,
  Star,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ProtectedView } from "@/components/common/ProtectedView";
import { ProfileModal, type ProfileData } from "@/components/profile/ProfileModal";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import {
  createExchangeTask,
  deleteExchangeTask,
  getDefaultStarterTasks,
  getLocalExchangeTasks,
  getOrCreateExchangeForUsers,
  saveLocalExchangeTasks,
  toggleExchangeTaskCompletion,
  type ExchangeTask,
  type SkillExchange,
} from "@/lib/exchange";

type ParticipantInfo = {
  displayName?: string | undefined;
  photoURL?: string | null | undefined;
  email?: string | undefined;
};

type Conversation = {
  id: string;
  participantIds?: string[] | undefined;
  participants?: Record<string, ParticipantInfo> | undefined;
  lastMessage?: string | undefined;
  lastMessageAt?: string | { seconds?: number } | undefined;
  unreadBy?: string[] | undefined;
  exchangeId?: string | undefined;
  exchangeProgress?: number | undefined;
  exchangeTasksCompleted?: number | undefined;
  exchangeTasksTotal?: number | undefined;
  exchangeTasks?: ExchangeTask[] | undefined;
  sessionEnded?: boolean | undefined;
  status?: string | undefined;
  reviewedBy?: string[] | undefined;
};

type Message = {
  id: string;
  senderId?: string | undefined;
  text?: string | undefined;
  isCallInvite?: boolean | undefined;
  callId?: string | undefined;
  readBy?: string[] | undefined;
  createdAt?: { seconds?: number } | string | Date | undefined;
};

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages · Skill Binimoy" }] }),
  component: MessagesPage,
});

function getPartnerInfo(conversation: Conversation, currentUserId?: string | undefined) {
  const partnerId = conversation.participantIds?.find((id) => id !== currentUserId);
  const info =
    partnerId && conversation.participants ? conversation.participants[partnerId] : undefined;
  const name = info?.displayName || info?.email?.split("@")[0] || "Skill Exchange Partner";
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SB";

  return {
    partnerId: partnerId || "",
    name,
    photoURL: info?.photoURL || null,
    initials,
  };
}

function formatMessageTime(createdAt?: { seconds?: number } | string | Date | null | undefined): string {
  if (!createdAt) return "Just now";
  let date: Date;
  if (
    typeof createdAt === "object" &&
    "seconds" in createdAt &&
    typeof (createdAt as { seconds?: number }).seconds === "number"
  ) {
    date = new Date((createdAt as { seconds: number }).seconds * 1000);
  } else if (typeof createdAt === "string" || createdAt instanceof Date) {
    date = new Date(createdAt);
  } else {
    return "Just now";
  }
  if (isNaN(date.getTime())) return "Just now";

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  return isToday
    ? timeStr
    : `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}

function MessagesPage() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const markedMessagesRef = useRef<Set<string>>(new Set());

  // Exchange and Shared Todo List State in Inbox
  const [activeExchangeId, setActiveExchangeId] = useState<string | null>(null);
  const [activeExchange, setActiveExchange] = useState<SkillExchange | null>(null);
  const [activeTasks, setActiveTasks] = useState<ExchangeTask[]>([]);
  const [isTodoExpanded, setIsTodoExpanded] = useState(true);
  const [todoFilter, setTodoFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("BOTH");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Partner Profile Modal State
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);

  // End Session & 1-to-5 Star Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  function selectConversation(conv: Conversation | null) {
    setSelected(conv);
    if (typeof window !== "undefined") {
      if (conv?.id) {
        sessionStorage.setItem("skill_binimoy_active_conversation_id", conv.id);
      } else {
        sessionStorage.removeItem("skill_binimoy_active_conversation_id");
      }
    }
  }

  function handleOpenPartnerProfile(
    partnerId: string,
    partnerName: string,
    partnerPhoto?: string | null | undefined,
  ) {
    if (!partnerId) return;
    setViewingProfile({
      uid: partnerId,
      id: partnerId,
      displayName: partnerName,
      photoURL: partnerPhoto || null,
      role: "MEMBER",
    });
  }

  // Auto-scroll ONLY inside the chat messages container (never scrolls the browser window)
  useEffect(() => {
    const el = chatMessagesRef.current;
    if (!el) return;

    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;

    if (isInitialLoadRef.current) {
      el.scrollTop = el.scrollHeight;
      isInitialLoadRef.current = false;
    } else if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Reset initial load flag and marked messages cache when user selects a conversation
  useEffect(() => {
    isInitialLoadRef.current = true;
    markedMessagesRef.current.clear();
  }, [selected?.id]);

  // Real-time conversations listener
  useEffect(() => {
    if (!user || !db) return;
    return onSnapshot(
      query(
        collection(db, "conversations"),
        where("participantIds", "array-contains", user.uid),
        orderBy("lastMessageAt", "desc"),
      ),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Conversation);
        setConversations(list);
        setSelected((currentSelected) => {
          if (!currentSelected) {
            const savedConvId =
              typeof window !== "undefined"
                ? sessionStorage.getItem("skill_binimoy_active_conversation_id")
                : null;
            if (savedConvId) {
              const found = list.find((c) => c.id === savedConvId);
              if (found) return found;
            }
            return list[0] ?? null;
          }
          return list.find((c) => c.id === currentSelected.id) ?? currentSelected;
        });
      },
      (error) => setNotice(error.message),
    );
  }, [user]);

  const selectedId = selected?.id;

  // Real-time messages listener for selected conversation
  useEffect(() => {
    if (!selectedId || !db) return;
    return onSnapshot(
      query(collection(db, "conversations", selectedId, "messages"), orderBy("createdAt", "asc")),
      (snapshot) =>
        setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Message)),
      (error) => setNotice(error.message),
    );
  }, [selectedId]);

  // Mark incoming messages as read when viewing this conversation
  useEffect(() => {
    if (!selectedId || !user || !db || messages.length === 0) return;
    const database = db;
    const unreadMessages = messages.filter(
      (m) =>
        m.id &&
        m.senderId !== user.uid &&
        (!m.readBy || !m.readBy.includes(user.uid)) &&
        !markedMessagesRef.current.has(m.id),
    );
    if (unreadMessages.length === 0) return;

    unreadMessages.forEach((msg) => {
      markedMessagesRef.current.add(msg.id);
      updateDoc(doc(database, "conversations", selectedId, "messages", msg.id), {
        readBy: arrayUnion(user.uid),
      }).catch(console.warn);
    });

    // Remove user from conversation's unreadBy array
    updateDoc(doc(database, "conversations", selectedId), {
      unreadBy: arrayRemove(user.uid),
    }).catch(console.warn);
  }, [selectedId, messages, user]);

  const selectedPartner = selected ? getPartnerInfo(selected, user?.uid) : null;

  // Deterministic canonical exchange ID for the selected conversation
  const canonicalExchangeId = useMemo(() => {
    if (!selected) return null;
    return selected.exchangeId || `exchange_${selected.id}`;
  }, [selected?.id, selected?.exchangeId]);

  // Sync exchangeId and workspace when conversation is selected
  useEffect(() => {
    if (!user || !selected || !selectedPartner || !selectedPartner.partnerId || !canonicalExchangeId) {
      setActiveExchangeId(null);
      setActiveExchange(null);
      setActiveTasks([]);
      return;
    }

    setActiveExchangeId(canonicalExchangeId);

    // 1. Ensure conversation document has exchangeId in Firestore
    if (!selected.exchangeId && db) {
      void updateDoc(doc(db, "conversations", selected.id), {
        exchangeId: canonicalExchangeId,
      }).catch(console.warn);
    }

    // 2. Ensure exchange document exists in Firestore for both partners
    if (db) {
      const exchangeDocRef = doc(db, "exchanges", canonicalExchangeId);
      void getDoc(exchangeDocRef).then((snap) => {
        if (!snap.exists()) {
          void setDoc(
            exchangeDocRef,
            {
              id: canonicalExchangeId,
              conversationId: selected.id,
              participantIds: [user.uid, selectedPartner.partnerId],
              participants: {
                [user.uid]: {
                  displayName: profile?.displayName || user.displayName || "Member",
                  photoURL: profile?.photoURL || user.photoURL || null,
                },
                [selectedPartner.partnerId]: {
                  displayName: selectedPartner.name,
                  photoURL: selectedPartner.photoURL || null,
                },
              },
              title: `Skill Exchange: ${profile?.displayName || user.displayName || "Member"} & ${selectedPartner.name}`,
              status: "ACTIVE",
              progress: 0,
              totalTasks: 3,
              completedTasks: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      }).catch(console.warn);
    }
  }, [user?.uid, selected?.id, selected?.exchangeId, canonicalExchangeId, selectedPartner?.partnerId, profile?.displayName, profile?.photoURL]);

  // Real-time listener for exchange metadata
  useEffect(() => {
    if (!activeExchangeId || !db) {
      setActiveExchange(null);
      return;
    }

    return onSnapshot(
      doc(db, "exchanges", activeExchangeId),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setActiveExchange({
            id: snap.id,
            requestId: (d["requestId"] as string | null | undefined) || undefined,
            conversationId: (d["conversationId"] as string | null | undefined) || undefined,
            participantIds: (d["participantIds"] as string[]) || [],
            participants: (d["participants"] as SkillExchange["participants"]) || {},
            title: (d["title"] as string | undefined) || undefined,
            skillOffer: (d["skillOffer"] as string | undefined) || undefined,
            skillWanted: (d["skillWanted"] as string | undefined) || undefined,
            status: (d["status"] as "ACTIVE" | "COMPLETED" | "PAUSED") || "ACTIVE",
            progress: typeof d["progress"] === "number" ? d["progress"] : 0,
            totalTasks: typeof d["totalTasks"] === "number" ? d["totalTasks"] : 0,
            completedTasks: typeof d["completedTasks"] === "number" ? d["completedTasks"] : 0,
            createdAt: d["createdAt"],
            updatedAt: d["updatedAt"],
          });
        }
      },
      (err) => console.warn("Failed to listen to exchange:", err),
    );
  }, [activeExchangeId]);

  // Real-time listener for exchange tasks
  useEffect(() => {
    if (!activeExchangeId || !selected) {
      setActiveTasks([]);
      return;
    }

    // 1. Instantly load from conversation document, local storage, or default starters
    const convTasks = selected.exchangeTasks || [];
    let cached = getLocalExchangeTasks(activeExchangeId);
    if (cached.length === 0 && convTasks.length > 0) {
      cached = convTasks;
      saveLocalExchangeTasks(activeExchangeId, convTasks);
    }

    if (cached.length === 0 && user) {
      const starters = getDefaultStarterTasks(
        activeExchangeId,
        user.uid,
        profile?.displayName || user.displayName || "Member",
        selectedPartner?.partnerId || "",
        selectedPartner?.name || "Partner",
      );
      saveLocalExchangeTasks(activeExchangeId, starters);
      cached = starters;

      // Seed starter tasks directly to conversation in Firestore for immediate cross-account availability
      if (db && selected.id) {
        void updateDoc(doc(db, "conversations", selected.id), {
          exchangeTasks: starters,
          exchangeProgress: 0,
          exchangeTasksCompleted: 0,
          exchangeTasksTotal: starters.length,
          exchangeId: activeExchangeId,
        }).catch(console.warn);
      }
    }

    if (cached.length > 0) {
      setActiveTasks(cached);
    }

    if (!db) return;

    // 2. Query Firestore exchange tasks subcollection
    const q = collection(db, "exchanges", activeExchangeId, "tasks");

    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const loaded: ExchangeTask[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              exchangeId: activeExchangeId,
              title: (d["title"] as string) || "Untitled Task",
              description: (d["description"] as string | undefined) || undefined,
              createdBy: (d["createdBy"] as string) || "",
              createdByName: (d["createdByName"] as string | undefined) || undefined,
              assignedTo: (d["assignedTo"] as string | undefined) || undefined,
              assignedToName: (d["assignedToName"] as string | undefined) || undefined,
              status: (d["status"] as "PENDING" | "IN_PROGRESS" | "COMPLETED") || "PENDING",
              dueDate: (d["dueDate"] as string | undefined) || undefined,
              completed: d["completed"] === true,
              completedAt: d["completedAt"],
              completedBy: (d["completedBy"] as string | undefined) || undefined,
              createdAt: d["createdAt"],
              updatedAt: d["updatedAt"],
            };
          });

          // Merge with local tasks and conversation tasks
          const localTasks = getLocalExchangeTasks(activeExchangeId);
          const currentConvTasks = selected?.exchangeTasks || [];
          const remoteIds = new Set(loaded.map((t) => t.id));
          const unmergedLocals = [
            ...localTasks.filter((lt) => !remoteIds.has(lt.id)),
            ...currentConvTasks.filter((ct) => !remoteIds.has(ct.id)),
          ];
          const unmergedMap = new Map<string, ExchangeTask>();
          unmergedLocals.forEach((t) => unmergedMap.set(t.id, t));

          const combined = [...loaded, ...Array.from(unmergedMap.values())];

          combined.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
            return aTime - bTime;
          });

          setActiveTasks(combined);
          saveLocalExchangeTasks(activeExchangeId, combined);

          // Keep conversation document in Firestore updated with full task array
          if (db && selected?.id && combined.length > 0) {
            const cCount = combined.filter((t) => t.completed || t.status === "COMPLETED").length;
            const tCount = combined.length;
            const pVal = Math.round((cCount / tCount) * 100);
            void updateDoc(doc(db, "conversations", selected.id), {
              exchangeTasks: combined,
              exchangeProgress: pVal,
              exchangeTasksCompleted: cCount,
              exchangeTasksTotal: tCount,
            }).catch(console.warn);
          }
        } else {
          // If Firestore subcollection is empty, use conversation tasks or local tasks
          const localTasks = getLocalExchangeTasks(activeExchangeId);
          const currentConvTasks = selected?.exchangeTasks || [];
          const fallback = currentConvTasks.length > 0 ? currentConvTasks : localTasks;
          if (fallback.length > 0) {
            setActiveTasks(fallback);
          }
        }
      },
      (err) => {
        console.warn("Notice: Using local exchange tasks fallback:", err);
        const localTasks = getLocalExchangeTasks(activeExchangeId);
        const currentConvTasks = selected?.exchangeTasks || [];
        const fallback = currentConvTasks.length > 0 ? currentConvTasks : localTasks;
        if (fallback.length > 0) {
          setActiveTasks(fallback);
        }
      },
    );
  }, [activeExchangeId, selected?.id, user?.uid, selectedPartner?.partnerId, profile?.displayName]);

  // Sync tasks when partner modifies conversation exchangeTasks
  useEffect(() => {
    if (selected?.exchangeTasks && selected.exchangeTasks.length > 0 && activeExchangeId) {
      const convTasks = selected.exchangeTasks;
      setActiveTasks((prev) => {
        const prevIds = new Set(prev.map((t) => t.id));
        const convIds = new Set(convTasks.map((t) => t.id));
        const hasDiff =
          convTasks.length !== prev.length ||
          convTasks.some((ct) => {
            const match = prev.find((p) => p.id === ct.id);
            return !match || match.completed !== ct.completed;
          });
        if (hasDiff) {
          const merged = [...convTasks, ...prev.filter((p) => !convIds.has(p.id))];
          saveLocalExchangeTasks(activeExchangeId, merged);
          return merged;
        }
        return prev;
      });
    }
  }, [selected?.exchangeTasks, activeExchangeId]);

  // Dynamic progress calculation
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter((t) => t.completed || t.status === "COMPLETED").length;
  const progressPercent =
    totalTasks === 0
      ? (selected?.exchangeProgress ?? activeExchange?.progress ?? 0)
      : Math.round((completedTasks / totalTasks) * 100);

  const filteredTasks = activeTasks.filter((t) => {
    if (todoFilter === "PENDING") return !t.completed && t.status !== "COMPLETED";
    if (todoFilter === "COMPLETED") return t.completed || t.status === "COMPLETED";
    return true;
  });

  async function handleToggleInboxTask(task: ExchangeTask) {
    if (!user || !selected || !canonicalExchangeId) return;
    const exchangeIdToUse = canonicalExchangeId;

    const nextCompleted = !task.completed;
    const nextTasks = activeTasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            completed: nextCompleted,
            status: (nextCompleted ? "COMPLETED" : "PENDING") as "COMPLETED" | "PENDING",
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            completedBy: nextCompleted ? user.uid : undefined,
          }
        : t,
    );

    // 1. Optimistic local update
    setActiveTasks(nextTasks);
    saveLocalExchangeTasks(exchangeIdToUse, nextTasks);

    // 2. Persist to conversation document in Firestore immediately
    const nextCompletedCount = nextTasks.filter((t) => t.completed || t.status === "COMPLETED").length;
    const nextTotalCount = nextTasks.length;
    const nextProgressVal = nextTotalCount === 0 ? 0 : Math.round((nextCompletedCount / nextTotalCount) * 100);

    if (db) {
      void updateDoc(doc(db, "conversations", selected.id), {
        exchangeTasks: nextTasks,
        exchangeProgress: nextProgressVal,
        exchangeTasksCompleted: nextCompletedCount,
        exchangeTasksTotal: nextTotalCount,
        updatedAt: serverTimestamp(),
      }).catch(console.warn);

      void updateDoc(doc(db, "exchanges", exchangeIdToUse), {
        progress: nextProgressVal,
        completedTasks: nextCompletedCount,
        totalTasks: nextTotalCount,
        status: nextProgressVal === 100 ? "COMPLETED" : "ACTIVE",
        updatedAt: serverTimestamp(),
      }).catch(console.warn);
    }

    // 3. Persist to Firestore exchange subcollection
    try {
      await toggleExchangeTaskCompletion({
        exchangeId: exchangeIdToUse,
        taskId: task.id,
        completed: nextCompleted,
        completedBy: user.uid,
      });
    } catch (err) {
      console.warn("Notice: Task toggled locally (Firestore sync deferred):", err);
    }
  }

  async function handleAddInboxTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !user || !selected || !canonicalExchangeId) return;

    setIsSavingTask(true);

    const targetExchangeId = canonicalExchangeId;

    let assigneeName = "Both Members";
    if (selectedPartner) {
      if (newTaskAssignee === user.uid) {
        assigneeName = profile?.displayName || user.displayName || "You";
      } else if (newTaskAssignee === selectedPartner.partnerId) {
        assigneeName = selectedPartner.name;
      }
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const taskObj: ExchangeTask = {
      id: taskId,
      exchangeId: targetExchangeId,
      title,
      createdBy: user.uid,
      createdByName: profile?.displayName || user.displayName || "Member",
      assignedTo: newTaskAssignee,
      assignedToName: assigneeName,
      status: "PENDING",
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Instantly update UI and localStorage so task appears immediately
    const nextTasks = [...activeTasks, taskObj];
    setActiveTasks(nextTasks);
    saveLocalExchangeTasks(targetExchangeId, nextTasks);

    setNewTaskTitle("");
    setIsAddingTask(false);
    setIsSavingTask(false);

    // 2. Persist directly to conversation document in Firestore (instant for both accounts)
    const nextCompleted = nextTasks.filter((t) => t.completed || t.status === "COMPLETED").length;
    const nextTotal = nextTasks.length;
    const nextProgress = nextTotal === 0 ? 0 : Math.round((nextCompleted / nextTotal) * 100);

    if (db) {
      void updateDoc(doc(db, "conversations", selected.id), {
        exchangeTasks: nextTasks,
        exchangeProgress: nextProgress,
        exchangeTasksCompleted: nextCompleted,
        exchangeTasksTotal: nextTotal,
        exchangeId: targetExchangeId,
        updatedAt: serverTimestamp(),
      }).catch(console.warn);

      void updateDoc(doc(db, "exchanges", targetExchangeId), {
        progress: nextProgress,
        completedTasks: nextCompleted,
        totalTasks: nextTotal,
        status: "ACTIVE",
        updatedAt: serverTimestamp(),
      }).catch(console.warn);
    }

    // 3. Persist to Firestore exchange subcollection & workspace
    try {
      await createExchangeTask({
        exchangeId: targetExchangeId,
        taskId: taskObj.id,
        title,
        createdBy: user.uid,
        createdByName: profile?.displayName || user.displayName || "Member",
        assignedTo: newTaskAssignee,
        assignedToName: assigneeName,
      });
    } catch (err) {
      console.warn("Notice: Task saved locally (Firestore sync deferred):", err);
    }
  }

  async function handleDeleteInboxTask(taskId: string, title: string) {
    if (!selected || !canonicalExchangeId) return;
    const exchangeIdToUse = canonicalExchangeId;
    if (window.confirm(`Delete task "${title}"?`)) {
      const nextTasks = activeTasks.filter((t) => t.id !== taskId);
      setActiveTasks(nextTasks);
      saveLocalExchangeTasks(exchangeIdToUse, nextTasks);

      const nextCompletedCount = nextTasks.filter((t) => t.completed || t.status === "COMPLETED").length;
      const nextTotalCount = nextTasks.length;
      const nextProgressVal = nextTotalCount === 0 ? 0 : Math.round((nextCompletedCount / nextTotalCount) * 100);

      if (db) {
        void updateDoc(doc(db, "conversations", selected.id), {
          exchangeTasks: nextTasks,
          exchangeProgress: nextProgressVal,
          exchangeTasksCompleted: nextCompletedCount,
          exchangeTasksTotal: nextTotalCount,
          updatedAt: serverTimestamp(),
        }).catch(console.warn);

        void updateDoc(doc(db, "exchanges", exchangeIdToUse), {
          progress: nextProgressVal,
          completedTasks: nextCompletedCount,
          totalTasks: nextTotalCount,
          status: nextProgressVal === 100 ? "COMPLETED" : "ACTIVE",
          updatedAt: serverTimestamp(),
        }).catch(console.warn);
      }

      try {
        await deleteExchangeTask({
          exchangeId: exchangeIdToUse,
          taskId,
        });
      } catch (err) {
        console.warn("Notice: Task deleted locally (Firestore sync deferred):", err);
      }
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selected || !selectedPartner || submittingReview) return;
    setSubmittingReview(true);
    try {
      const recipientId = selectedPartner.partnerId;
      const recipientName = selectedPartner.name;
      const reviewerName = profile?.displayName || user.displayName || "Member";
      const reviewerPhoto = profile?.photoURL || user.photoURL || null;
      const exchangeId = canonicalExchangeId || selected.exchangeId || `exchange_${selected.id}`;

      // 1. Create review document in 'reviews' collection
      if (db) {
        await addDoc(collection(db, "reviews"), {
          conversationId: selected.id,
          exchangeId,
          reviewerId: user.uid,
          reviewerName,
          reviewerPhoto,
          recipientId,
          recipientName,
          rating: reviewRating,
          feedback: reviewFeedback.trim(),
          createdAt: serverTimestamp(),
        });

        // 2. Update recipient user's profile with rating stats
        const recipientRef = doc(db, "users", recipientId);
        const recipientSnap = await getDoc(recipientRef);
        if (recipientSnap.exists()) {
          const uData = recipientSnap.data();
          const currentReviewCount = typeof uData["reviewCount"] === "number" ? uData["reviewCount"] : 0;
          const currentRatingSum =
            typeof uData["ratingSum"] === "number"
              ? uData["ratingSum"]
              : (typeof uData["rating"] === "number" ? uData["rating"] * Math.max(1, currentReviewCount) : 0);
          const nextCount = currentReviewCount + 1;
          const nextSum = currentRatingSum + reviewRating;
          const nextAverage = Math.round((nextSum / nextCount) * 10) / 10;
          await updateDoc(recipientRef, {
            reviewCount: nextCount,
            ratingSum: nextSum,
            rating: nextAverage,
            updatedAt: serverTimestamp(),
          }).catch(console.warn);
        }

        // 3. Update conversation document
        await updateDoc(doc(db, "conversations", selected.id), {
          sessionEnded: true,
          status: "COMPLETED",
          reviewedBy: arrayUnion(user.uid),
          updatedAt: serverTimestamp(),
        });

        // 4. Update exchange document
        await updateDoc(doc(db, "exchanges", exchangeId), {
          status: "COMPLETED",
          progress: 100,
          updatedAt: serverTimestamp(),
        }).catch(console.warn);

        // 5. Send automated completion system message
        await addDoc(collection(db, "conversations", selected.id, "messages"), {
          senderId: "system",
          text: `🎉 Skill exchange session marked as completed! ${reviewerName} gave a ${reviewRating}-star rating${reviewFeedback.trim() ? `: "${reviewFeedback.trim()}"` : "."}`,
          createdAt: serverTimestamp(),
        });
      }

      setReviewModalOpen(false);
      setNotice(`Session ended successfully! Your ${reviewRating}-star review has been saved to ${recipientName}'s profile.`);
    } catch (err) {
      console.warn("Error completing session & review:", err);
      setNotice(err instanceof Error ? err.message : "Failed to end session and save review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selected || !db || !text.trim()) return;
    const trimmed = text.trim();
    const partnerId = getPartnerInfo(selected, user.uid).partnerId;
    const convId = selected.id;

    // 1. Immediately clear the input box
    setText("");

    // 2. Optimistic local message insertion
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.uid,
      text: trimmed,
      createdAt: new Date(),
      readBy: [user.uid],
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await addDoc(collection(db, "conversations", convId, "messages"), {
        senderId: user.uid,
        text: trimmed,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });
      await updateDoc(doc(db, "conversations", convId), {
        lastMessage: trimmed,
        lastMessageAt: new Date().toISOString(),
        unreadBy: partnerId ? arrayUnion(partnerId) : [],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setNotice(error instanceof Error ? error.message : "Could not send message.");
    }
  }

  async function startVideoCall(targetConv = selected) {
    if (!user || !targetConv || !db) return;
    const callId = `call_${targetConv.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}_${Date.now()}`;
    const partnerId = getPartnerInfo(targetConv, user.uid).partnerId;

    try {
      await addDoc(collection(db, "conversations", targetConv.id, "messages"), {
        senderId: user.uid,
        text: "🎥 Started a live video call session. Click below to join!",
        isCallInvite: true,
        callId,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });
      await updateDoc(doc(db, "conversations", targetConv.id), {
        lastMessage: "🎥 Started a live video call session",
        lastMessageAt: new Date().toISOString(),
        unreadBy: partnerId ? arrayUnion(partnerId) : [],
        updatedAt: serverTimestamp(),
      });

      if (partnerId) {
        await addDoc(collection(db, "notifications"), {
          recipientId: partnerId,
          type: "VIDEO_CALL_INVITE",
          callId,
          callerId: user.uid,
          callerName: profile?.displayName || user.displayName || user.email?.split("@")[0] || "Skill Partner",
          callerPhoto: profile?.photoURL || user.photoURL || "",
          conversationId: targetConv.id,
          status: "UNREAD",
          createdAt: serverTimestamp(),
          title: "Incoming Live Video Call",
          description: `${profile?.displayName || user.displayName || "Your partner"} started a live video call session.`,
        });
      }

      window.location.assign(`/video-call/${callId}?caller=true`);
    } catch (error) {
      console.error("[VIDEO-CALL] Failed to initiate call:", error);
      setNotice(error instanceof Error ? error.message : "Could not initiate call.");
    }
  }

  return (
    <ProtectedView>
      <WorkspaceShell title="Messages" eyebrow="Your conversations">
        <div className="messages-layout h-[calc(100dvh-13.5rem)] min-h-[540px] max-h-[780px]">
          <aside className="conversation-list overflow-y-auto h-full">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-black">Conversations</h2>
              <MessageCircle className="size-5 text-primary" />
            </div>
            {conversations.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Accept an exchange request to start chatting.
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const partner = getPartnerInfo(conversation, user?.uid);
                  const hasUnread =
                    user && conversation.unreadBy && conversation.unreadBy.includes(user.uid);
                  const isSelected = selected?.id === conversation.id;

                  return (
                    <div
                      key={conversation.id}
                      className={`group flex items-center justify-between rounded-2xl p-1 transition border ${
                        isSelected
                          ? "bg-primary/10 dark:bg-primary/20 border-primary/40 dark:border-primary/50 shadow-xs"
                          : "border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectConversation(conversation)}
                        className="conversation-item relative flex-1 min-w-0"
                      >
                        <div className="relative shrink-0">
                          {partner.photoURL ? (
                            <img
                              src={partner.photoURL}
                              alt={partner.name}
                              className="size-11 rounded-full object-cover ring-2 ring-primary/25 dark:ring-primary/45 shadow-xs"
                            />
                          ) : (
                            <span className="conversation-avatar shrink-0 size-11 ring-2 ring-primary/25 dark:ring-primary/45 font-black text-xs text-primary dark:text-blue-300 bg-primary/10 dark:bg-primary/25">{partner.initials}</span>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        </div>
                        <span className="min-w-0 flex-1 text-left">
                          <strong className="flex items-center justify-between text-slate-900 dark:text-white font-extrabold text-sm">
                            <span className="truncate text-slate-900 dark:text-white group-hover:text-primary transition">{partner.name}</span>
                            {hasUnread && (
                              <span className="size-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-slate-900 shrink-0" />
                            )}
                          </strong>
                          <small
                            className={`truncate block text-xs mt-0.5 ${hasUnread ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}
                          >
                            {typeof conversation.lastMessage === "string"
                              ? conversation.lastMessage
                              : "Conversation started"}
                          </small>
                        </span>
                      </button>

                      {/* Quick Profile & Video Call action buttons in sidebar */}
                      <div className="flex items-center gap-1 mr-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPartnerProfile(partner.partnerId, partner.name, partner.photoURL);
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-300 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          title={`View ${partner.name}'s Profile`}
                        >
                          <User className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectConversation(conversation);
                            void startVideoCall(conversation);
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-300 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition cursor-pointer"
                          title={`Start Video Call with ${partner.name}`}
                        >
                          <Video className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="chat-panel flex flex-col h-full overflow-hidden">
            {selected && selectedPartner ? (
              <>
                {/* Chat Partner Header */}
                <div className="chat-header sticky top-0 z-20 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <div
                    onClick={() => handleOpenPartnerProfile(selectedPartner.partnerId, selectedPartner.name, selectedPartner.photoURL)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group p-1 -m-1 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition"
                    title={`Click to view ${selectedPartner.name}'s profile`}
                  >
                    <div className="relative shrink-0">
                      {selectedPartner.photoURL ? (
                        <img
                          src={selectedPartner.photoURL}
                          alt={selectedPartner.name}
                          className="size-11 rounded-full object-cover ring-2 ring-primary/30 dark:ring-primary/50 shadow-xs group-hover:ring-primary transition"
                        />
                      ) : (
                        <span className="conversation-avatar size-11 ring-2 ring-primary/30 dark:ring-primary/50 font-black text-xs text-primary dark:text-blue-300 bg-primary/10 dark:bg-primary/25 shrink-0 group-hover:ring-primary transition">{selectedPartner.initials}</span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <strong className="truncate block text-slate-900 dark:text-white font-extrabold text-sm sm:text-base group-hover:text-primary transition flex items-center gap-1.5">
                        {selectedPartner.name}
                      </strong>
                      <small className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live skill partner
                        <span className="text-[11px] text-primary dark:text-blue-400 font-semibold group-hover:underline ml-1">
                          · View Profile
                        </span>
                      </small>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPartnerProfile(selectedPartner.partnerId, selectedPartner.name, selectedPartner.photoURL)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-2xs"
                      title={`View ${selectedPartner.name}'s Profile`}
                    >
                      <User className="size-3.5" />
                      <span className="hidden md:inline">Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTodoExpanded(!isTodoExpanded)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer border ${
                        isTodoExpanded
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                      title="Toggle Shared Todo List"
                    >
                      <ListTodo className="size-3.5" />
                      <span className="hidden sm:inline">Tasks</span>
                      <span className="rounded-full bg-white/20 dark:bg-black/20 px-1.5 py-0.2 text-[10px]">
                        {completedTasks}/{totalTasks}
                      </span>
                    </button>
                    <button
                      onClick={() => void startVideoCall()}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 px-3.5 py-2 text-xs font-black text-white shadow-sm transition cursor-pointer shrink-0"
                      title={`Start Live Video Call with ${selectedPartner.name}`}
                    >
                      <Video className="size-4" />
                      <span className="hidden sm:inline">Start Call</span>
                      <span className="sm:hidden">Call</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Shared Todo List in Inbox */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900 backdrop-blur-xs px-4 py-3 shrink-0 transition shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsTodoExpanded(!isTodoExpanded)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white hover:text-primary dark:hover:text-blue-400 transition cursor-pointer min-w-0"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400">
                        <ListTodo className="size-4" />
                      </div>
                      <span className="truncate font-extrabold text-slate-900 dark:text-white">Exchange Todo List</span>
                      <span className="shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-800 dark:text-slate-100">
                        {completedTasks}/{totalTasks}
                      </span>
                      {isTodoExpanded ? (
                        <ChevronUp className="size-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>

                    <div className="flex items-center gap-3 flex-1 max-w-xs sm:max-w-sm justify-end">
                      {/* Visual Progress Bar: 0% ━━━━ 100% */}
                      <div className="flex-1 min-w-[80px] sm:min-w-[130px]">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-600 dark:text-slate-300 mb-1">
                          <span>0%</span>
                          <span
                            className={
                              progressPercent === 100
                                ? "text-emerald-600 dark:text-emerald-400 font-black"
                                : "text-primary dark:text-blue-400 font-black"
                            }
                          >
                            {progressPercent}%
                          </span>
                          <span>100%</span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              progressPercent === 100
                                ? "bg-emerald-500"
                                : "bg-gradient-to-r from-primary to-indigo-500"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {progressPercent === 100 && totalTasks > 0 && (
                        <button
                          type="button"
                          onClick={() => setReviewModalOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 text-xs font-black shadow-xs transition cursor-pointer shrink-0"
                          title="Complete session and leave review"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span className="whitespace-nowrap">
                            {selected?.sessionEnded ? "Reviewed" : "End Session"}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsTodoExpanded(true);
                          setIsAddingTask(!isAddingTask);
                        }}
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 text-primary dark:text-blue-400 transition cursor-pointer"
                        title="Add Shared Task"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Shared Todo List Drawer */}
                  {isTodoExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 max-h-56 overflow-y-auto animate-in fade-in duration-200">
                      {/* Controls & Filters */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg bg-slate-200/80 dark:bg-slate-800 p-0.5 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setTodoFilter("ALL")}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                              todoFilter === "ALL"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            All ({totalTasks})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTodoFilter("PENDING")}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                              todoFilter === "PENDING"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            Pending ({totalTasks - completedTasks})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTodoFilter("COMPLETED")}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                              todoFilter === "COMPLETED"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            Done ({completedTasks})
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsAddingTask(!isAddingTask)}
                          className="text-[11px] font-bold text-primary dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isAddingTask ? "Cancel" : "+ Add Task"}
                        </button>
                      </div>

                      {/* Add Task Input Form */}
                      {isAddingTask && (
                        <form
                          onSubmit={handleAddInboxTask}
                          className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-in fade-in duration-200"
                        >
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="Add task title (e.g. review code together)..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="flex-1 min-w-[160px] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-primary"
                          />
                          <select
                            value={newTaskAssignee}
                            onChange={(e) => setNewTaskAssignee(e.target.value)}
                            className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-900 dark:text-white outline-none"
                          >
                            <option value="BOTH">Both</option>
                            <option value={user?.uid || "ME"}>You</option>
                            {selectedPartner && (
                              <option value={selectedPartner.partnerId}>{selectedPartner.name}</option>
                            )}
                          </select>
                          <button
                            type="submit"
                            disabled={isSavingTask || !newTaskTitle.trim()}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover transition cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {isSavingTask ? "Saving..." : "Save"}
                          </button>
                        </form>
                      )}

                      {/* Task List */}
                      {filteredTasks.length === 0 ? (
                        <div className="py-3 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {todoFilter === "ALL"
                            ? "No tasks yet."
                            : todoFilter === "PENDING"
                              ? "All tasks are completed! Awesome work! 🎉"
                              : "No tasks completed yet."}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredTasks.map((task) => {
                            const isCompleted = task.completed || task.status === "COMPLETED";
                            const isAssignedToMe = Boolean(user?.uid && task.assignedTo === user.uid);
                            const isAssignedToPartner = selectedPartner && task.assignedTo === selectedPartner.partnerId;

                            return (
                              <div
                                key={task.id}
                                className={`group flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border transition ${
                                  isCompleted
                                    ? "bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800/60 opacity-75"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => void handleToggleInboxTask(task)}
                                  className="shrink-0 text-slate-400 hover:text-primary transition cursor-pointer"
                                  title={isCompleted ? "Mark pending" : "Mark completed"}
                                >
                                  {isCompleted ? (
                                    <CheckSquare className="size-4.5 text-emerald-500 dark:text-emerald-400" />
                                  ) : (
                                    <Square className="size-4.5 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <span
                                    className={`text-xs font-bold truncate ${
                                      isCompleted
                                        ? "line-through text-slate-500 dark:text-slate-400"
                                        : "text-slate-900 dark:text-white"
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black border ${
                                      isAssignedToMe
                                        ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300 border-primary/20 dark:border-primary/40"
                                        : isAssignedToPartner
                                          ? "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                                    }`}
                                  >
                                    {isAssignedToMe
                                      ? "You"
                                      : isAssignedToPartner
                                        ? selectedPartner?.name
                                        : "Both"}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => void handleDeleteInboxTask(task.id, task.title)}
                                  className="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition p-0.5 cursor-pointer"
                                  title="Delete task"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div ref={chatMessagesRef} className="chat-messages flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="m-auto text-sm text-slate-500 text-center py-20">
                      Say hello and plan your exchange.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === user?.uid;
                      const isCall = message.isCallInvite || message.text?.includes("video call");
                      const isReadByPartner =
                        message.readBy &&
                        selectedPartner.partnerId &&
                        message.readBy.includes(selectedPartner.partnerId);

                      if (isCall) {
                        return (
                          <div
                            key={message.id}
                            className={`my-2 flex flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft/50 p-4 text-center max-w-sm ${
                              isOwn ? "ml-auto" : "mr-auto"
                            }`}
                          >
                            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-white mb-2 shadow-sm">
                              <Video className="size-5" />
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              Live Video Call Session
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-3">
                              {isOwn
                                ? "You started a live video call room."
                                : `${selectedPartner.name} is inviting you to a live video call.`}
                            </p>
                            <Link
                              to="/video-call/$callId"
                              params={{ callId: message.callId || selected.id }}
                              onClick={() => {
                                console.log("[VIDEO-CALL] Call accepted:", message.callId || selected.id);
                              }}
                              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-sm"
                            >
                              <PhoneCall className="size-3.5" /> Join Live Video Call
                            </Link>
                            <span className="mt-2 text-[10px] text-slate-400">
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className={`my-1 flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                        >
                          <div className={`chat-bubble ${isOwn ? "chat-bubble-own" : ""}`}>
                            {message.text}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {isOwn && (
                              <span className="flex items-center gap-0.5">
                                {isReadByPartner ? (
                                  <span
                                    className="flex items-center gap-0.5 text-primary font-bold"
                                    title="Read"
                                  >
                                    <CheckCheck className="size-3" /> Read
                                  </span>
                                ) : message.id ? (
                                  <span
                                    className="flex items-center gap-0.5 text-slate-400 font-medium"
                                    title="Delivered"
                                  >
                                    <CheckCheck className="size-3" /> Delivered
                                  </span>
                                ) : (
                                  <span
                                    className="flex items-center gap-0.5 text-slate-400 font-medium"
                                    title="Sent"
                                  >
                                    <Check className="size-3" /> Sent
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={send} className="chat-compose shrink-0 flex items-center gap-2.5 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => void startVideoCall()}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition active:scale-95 cursor-pointer shadow-xs"
                    title={`Start Live Video Call with ${selectedPartner.name}`}
                  >
                    <Video className="size-5" />
                  </button>
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={`Write a message to ${selectedPartner.name}...`}
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-sm dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition"
                  />
                  <button
                    aria-label="Send message"
                    type="submit"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-hover active:scale-95 transition cursor-pointer shadow-xs"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="m-auto text-center p-8">
                <MessageCircle className="mx-auto size-10 text-primary/30" />
                <h2 className="mt-3 font-black text-slate-900 dark:text-white">Your conversations live here</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Accept an exchange request to connect with peers and mentors.
                </p>
              </div>
            )}
          </section>
        </div>
        {notice && (
          <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
            {notice}
          </p>
        )}

        {/* End Session & 1-5 Star Review Modal */}
        {reviewModalOpen && selectedPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Award className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-950 dark:text-white">
                      End Session & Review
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Rate your learning exchange with {selectedPartner.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="mt-5 space-y-4">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-border/80 text-center">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Select Your Rating
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (reviewHoverRating || reviewRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setReviewHoverRating(star)}
                          onMouseLeave={() => setReviewHoverRating(0)}
                          onClick={() => setReviewRating(star)}
                          className="p-1 transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                          title={`${star} Star${star > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`size-8 transition-colors ${
                              isFilled
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300 dark:text-slate-600"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs font-extrabold text-amber-500">
                    {reviewRating === 5
                      ? "⭐⭐⭐⭐⭐ Exceptional!"
                      : reviewRating === 4
                        ? "⭐⭐⭐⭐ Very Good!"
                        : reviewRating === 3
                          ? "⭐⭐⭐ Good Experience"
                          : reviewRating === 2
                            ? "⭐⭐ Fair"
                            : "⭐ Needs Improvement"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Feedback & Comments (Saved to {selectedPartner.name}'s Profile)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Describe how the exchange went, what you learned, and how helpful your partner was..."
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  ✓ This review will update {selectedPartner.name}'s overall rating and display on their public profile for the Skill Binimoy community.
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" />
                    {submittingReview ? "Submitting..." : "Complete & Submit Review"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Full Partner Profile Preview Modal */}
        {viewingProfile && (
          <ProfileModal
            profile={viewingProfile}
            onClose={() => setViewingProfile(null)}
          />
        )}
      </WorkspaceShell>
    </ProtectedView>
  );
}
