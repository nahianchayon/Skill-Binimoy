import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  ArrowRight,
  CheckCircle2,
  ListTodo,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { ExchangeTask, SkillExchange } from "@/lib/exchange";
import { ExchangeWorkspaceCard } from "./ExchangeWorkspaceCard";

export function ExchangeWorkspacesView() {
  const { user, profile } = useAuth();
  const [exchanges, setExchanges] = useState<SkillExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    let exchangesList: SkillExchange[] = [];
    let convExchangesList: SkillExchange[] = [];

    const mergeAll = () => {
      const mergedMap = new Map<string, SkillExchange>();
      exchangesList.forEach((e) => mergedMap.set(e.id, e));
      convExchangesList.forEach((c) => {
        if (!mergedMap.has(c.id)) {
          mergedMap.set(c.id, c);
        } else {
          const existing = mergedMap.get(c.id)!;
          if (
            c.progress > existing.progress ||
            c.completedTasks > existing.completedTasks ||
            !existing.conversationId ||
            c.sessionEnded ||
            (c.reviewedBy && c.reviewedBy.length > (existing.reviewedBy?.length || 0))
          ) {
            mergedMap.set(c.id, {
              ...existing,
              ...c,
              conversationId: c.conversationId || existing.conversationId,
              sessionEnded: existing.sessionEnded || c.sessionEnded,
              reviewedBy: Array.from(new Set([...(existing.reviewedBy || []), ...(c.reviewedBy || [])])),
            });
          }
        }
      });
      setExchanges(Array.from(mergedMap.values()));
      setLoading(false);
    };

    const q = query(
      collection(db, "exchanges"),
      where("participantIds", "array-contains", user.uid),
    );

    const unsubscribeExchanges = onSnapshot(
      q,
      (snapshot) => {
        exchangesList = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
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
            sessionEnded: d["sessionEnded"] === true || d["status"] === "COMPLETED",
            reviewedBy: (d["reviewedBy"] as string[]) || [],
            createdAt: d["createdAt"],
            updatedAt: d["updatedAt"],
          };
        });
        mergeAll();
      },
      (error) => {
        console.warn("Notice: Error fetching exchanges:", error);
        setLoading(false);
      },
    );

    const qConv = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", user.uid),
    );

    const unsubscribeConv = onSnapshot(
      qConv,
      (snapshot) => {
        convExchangesList = snapshot.docs
          .filter((d) => {
            const data = d.data();
            return (
              Array.isArray(data["exchangeTasks"]) ||
              typeof data["exchangeProgress"] === "number" ||
              Boolean(data["exchangeId"])
            );
          })
          .map((docSnap) => {
            const d = docSnap.data();
            const pIds = (d["participantIds"] as string[]) || [];
            const partnerId = pIds.find((id) => id !== user.uid) || "";
            const parts = (d["participants"] as Record<string, { displayName?: string; photoURL?: string }>) || {};
            const partnerName = parts[partnerId]?.displayName || "Skill Partner";
            const myName = parts[user.uid]?.displayName || profile?.displayName || "You";
            const convTasks = (d["exchangeTasks"] as ExchangeTask[]) || [];
            const completed =
              typeof d["exchangeTasksCompleted"] === "number"
                ? (d["exchangeTasksCompleted"] as number)
                : convTasks.filter((t) => t.completed || t.status === "COMPLETED").length;
            const total =
              typeof d["exchangeTasksTotal"] === "number"
                ? (d["exchangeTasksTotal"] as number)
                : convTasks.length || 3;
            const prog =
              typeof d["exchangeProgress"] === "number"
                ? (d["exchangeProgress"] as number)
                : total === 0
                  ? 0
                  : Math.round((completed / total) * 100);

            return {
              id: (d["exchangeId"] as string) || `exchange_${docSnap.id}`,
              conversationId: docSnap.id,
              participantIds: pIds,
              participants: parts,
              title: `Skill Exchange: ${myName} & ${partnerName}`,
              status: (prog === 100 || d["sessionEnded"] === true ? "COMPLETED" : "ACTIVE") as "ACTIVE" | "COMPLETED",
              progress: prog,
              totalTasks: total,
              completedTasks: completed,
              sessionEnded: d["sessionEnded"] === true || prog === 100,
              reviewedBy: (d["reviewedBy"] as string[]) || [],
              createdAt: d["createdAt"],
              updatedAt: d["updatedAt"],
            };
          });
        mergeAll();
      },
      (err) => {
        console.warn("Conversations listener notice:", err);
      },
    );

    return () => {
      unsubscribeExchanges();
      unsubscribeConv();
    };
  }, [user, profile?.displayName]);

  const activeExchanges = exchanges.filter(
    (e) => e.status === "ACTIVE" && e.progress < 100,
  );
  const completedExchanges = exchanges.filter(
    (e) => e.status === "COMPLETED" || e.progress === 100,
  );

  const totalExchanges = exchanges.length;
  const totalTasksCompleted = exchanges.reduce((acc, curr) => acc + curr.completedTasks, 0);
  const averageProgress =
    totalExchanges === 0
      ? 0
      : Math.round(exchanges.reduce((acc, curr) => acc + curr.progress, 0) / totalExchanges);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Exchanges
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {activeExchanges.length}
            </span>
            <span className="text-xs text-slate-500">ongoing partnerships</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tasks Completed
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalTasksCompleted}
            </span>
            <span className="text-xs text-slate-500">learning goals achieved</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Average Progress
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ListTodo className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {averageProgress}%
            </span>
            <span className="text-xs text-slate-500">completion rate</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "ACTIVE"
                ? "bg-primary text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>Active Exchanges</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "ACTIVE"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {activeExchanges.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "COMPLETED"
                ? "bg-primary text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>Completed</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "COMPLETED"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {completedExchanges.length}
            </span>
          </button>
        </div>

        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline self-start sm:self-auto"
        >
          <Sparkles className="size-3.5" />
          <span>Find more partners to exchange skills</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Exchanges List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
          Loading your skill exchange workspaces...
        </div>
      ) : activeTab === "ACTIVE" ? (
        activeExchanges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
            <Users className="size-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              No active skill exchanges right now
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Send an exchange request from Explore Skills, or accept pending requests in your learning loop to automatically open an exchange workspace with a shared todo list.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover shadow-sm transition"
              >
                <Sparkles className="size-3.5" /> Explore Skills
              </Link>
              <Link
                to="/$section"
                params={{ section: "requests" }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                View Exchange Requests
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {activeExchanges.map((ex) => (
              <ExchangeWorkspaceCard
                key={ex.id}
                exchange={ex}
                currentUserId={user?.uid || ""}
                currentUserName={profile?.displayName || user?.displayName || "You"}
              />
            ))}
          </div>
        )
      ) : completedExchanges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
          <CheckCircle2 className="size-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            No completed exchanges yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Work through your exchange todo list with your partner. Once all shared tasks reach 100%, the exchange will appear here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {completedExchanges.map((ex) => (
            <ExchangeWorkspaceCard
              key={ex.id}
              exchange={ex}
              currentUserId={user?.uid || ""}
              currentUserName={profile?.displayName || user?.displayName || "You"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

