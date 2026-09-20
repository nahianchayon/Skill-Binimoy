import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CheckCheck, MessageCircle, PhoneCall, Send, Video } from "lucide-react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ProtectedView } from "@/components/common/ProtectedView";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";

type ParticipantInfo = {
  displayName?: string;
  photoURL?: string | null;
  email?: string;
};

type Conversation = {
  id: string;
  participantIds?: string[];
  participants?: Record<string, ParticipantInfo>;
  lastMessage?: string;
  lastMessageAt?: string | { seconds?: number };
  unreadBy?: string[];
};

type Message = {
  id: string;
  senderId?: string;
  text?: string;
  isCallInvite?: boolean;
  callId?: string;
  readBy?: string[];
  createdAt?: { seconds?: number } | string | Date;
};

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages · Skill Binimoy" }] }),
  component: MessagesPage,
});

function getPartnerInfo(conversation: Conversation, currentUserId?: string) {
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
    partnerId,
    name,
    photoURL: info?.photoURL || null,
    initials,
  };
}

function formatMessageTime(createdAt?: { seconds?: number } | string | Date | null): string {
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

  // Reset initial load flag when user selects a conversation
  useEffect(() => {
    isInitialLoadRef.current = true;
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
          if (!currentSelected) return null;
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
      (m) => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)),
    );
    if (unreadMessages.length === 0) return;

    unreadMessages.forEach((msg) => {
      updateDoc(doc(database, "conversations", selectedId, "messages", msg.id), {
        readBy: arrayUnion(user.uid),
      }).catch(console.warn);
    });

    // Remove user from conversation's unreadBy array
    updateDoc(doc(database, "conversations", selectedId), {
      unreadBy: arrayRemove(user.uid),
    }).catch(console.warn);
  }, [selectedId, messages, user]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selected || !db || !text.trim()) return;
    const trimmed = text.trim();
    const partnerId = getPartnerInfo(selected, user.uid).partnerId;
    const convId = selected.id;

    // 1. Immediately clear the input box so typed text never remains
    setText("");

    // 2. Optimistic local message insertion for instantaneous UX
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
      // Revert optimistic message and restore text on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setNotice(error instanceof Error ? error.message : "Could not send message.");
    }
  }

  async function startVideoCall(targetConv = selected) {
    if (!user || !targetConv || !db) return;
    const callId = `call_${targetConv.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}_${Date.now()}`;
    const partnerId = getPartnerInfo(targetConv, user.uid).partnerId;

    console.log("[VIDEO-CALL] Call start:", { callId, partnerId, callerId: user.uid });

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
        console.log("[VIDEO-CALL] Call invitation sent to", partnerId);
      }

      // Navigate to fresh video call room with caller parameter
      window.location.assign(`/video-call/${callId}?caller=true`);
    } catch (error) {
      console.error("[VIDEO-CALL] Failed to initiate call:", error);
      setNotice(error instanceof Error ? error.message : "Could not initiate call.");
    }
  }

  const selectedPartner = selected ? getPartnerInfo(selected, user?.uid) : null;

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
                      className={`group flex items-center justify-between rounded-2xl transition ${
                        isSelected
                          ? "bg-primary-soft/80 dark:bg-primary/15"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(conversation)}
                        className="conversation-item relative flex-1 min-w-0"
                      >
                        {partner.photoURL ? (
                          <img
                            src={partner.photoURL}
                            alt={partner.name}
                            className="size-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="conversation-avatar shrink-0">{partner.initials}</span>
                        )}
                        <span className="min-w-0 flex-1 text-left">
                          <strong className="flex items-center justify-between">
                            <span className="truncate">{partner.name}</span>
                            {hasUnread && (
                              <span className="size-2.5 rounded-full bg-primary shrink-0" />
                            )}
                          </strong>
                          <small
                            className={`truncate block ${hasUnread ? "font-bold text-slate-900 dark:text-white" : ""}`}
                          >
                            {typeof conversation.lastMessage === "string"
                              ? conversation.lastMessage
                              : "Conversation started"}
                          </small>
                        </span>
                      </button>

                      {/* Quick Video Call action button in sidebar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(conversation);
                          void startVideoCall(conversation);
                        }}
                        className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition cursor-pointer"
                        title={`Start Video Call with ${partner.name}`}
                      >
                        <Video className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="chat-panel flex flex-col h-full overflow-hidden">
            {selected && selectedPartner ? (
              <>
                <div className="chat-header sticky top-0 z-20 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedPartner.photoURL ? (
                      <img
                        src={selectedPartner.photoURL}
                        alt={selectedPartner.name}
                        className="size-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="conversation-avatar shrink-0">{selectedPartner.initials}</span>
                    )}
                    <div className="min-w-0">
                      <strong className="truncate block">{selectedPartner.name}</strong>
                      <small className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <span className="inline-block size-2 rounded-full bg-emerald-500" />
                        Live skill partner
                      </small>
                    </div>
                  </div>
                  <button
                    onClick={() => void startVideoCall()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 px-4 py-2.5 text-xs font-black text-white shadow-sm transition cursor-pointer shrink-0"
                    title={`Start Live Video Call with ${selectedPartner.name}`}
                  >
                    <Video className="size-4" />
                    <span className="hidden sm:inline">Start Video Call</span>
                    <span className="sm:hidden">Call</span>
                  </button>
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
                            <h4 className="font-bold text-sm text-slate-900">
                              Live Video Call Session
                            </h4>
                            <p className="text-xs text-slate-600 mt-1 mb-3">
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
                <h2 className="mt-3 font-black">Your conversations live here</h2>
                <p className="mt-2 text-sm text-slate-500">
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
      </WorkspaceShell>
    </ProtectedView>
  );
}
