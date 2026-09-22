import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  ListTodo,
  MessageCircle,
  Plus,
  Square,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  createExchangeTask,
  deleteExchangeTask,
  getDefaultStarterTasks,
  getLocalExchangeTasks,
  saveLocalExchangeTasks,
  toggleExchangeTaskCompletion,
  type ExchangeTask,
  type SkillExchange,
} from "@/lib/exchange";

interface ExchangeWorkspaceCardProps {
  exchange: SkillExchange;
  currentUserId: string;
  currentUserName?: string | undefined;
  defaultExpanded?: boolean | undefined;
}

export function ExchangeWorkspaceCard({
  exchange,
  currentUserId,
  currentUserName,
  defaultExpanded = true,
}: ExchangeWorkspaceCardProps) {
  const [tasks, setTasks] = useState<ExchangeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("BOTH");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Partner identification
  const partnerId = exchange.participantIds.find((id) => id !== currentUserId) || "";
  const partner = exchange.participants[partnerId];
  const partnerName = partner?.displayName || partner?.email?.split("@")[0] || "Skill Partner";
  const partnerPhoto = partner?.photoURL || null;
  const partnerInitials = partnerName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "SP";

  // Real-time listener for tasks
  useEffect(() => {
    if (!exchange.id) return;

    // 1. Instantly check local storage or generate default starter tasks
    let cached = getLocalExchangeTasks(exchange.id);
    if (cached.length === 0 && currentUserId) {
      const starters = getDefaultStarterTasks(
        exchange.id,
        currentUserId,
        currentUserName || "Member",
        partnerId,
        partnerName,
      );
      saveLocalExchangeTasks(exchange.id, starters);
      cached = starters;
    }
    if (cached.length > 0) {
      setTasks(cached);
      setLoading(false);
    }

    if (!db) return;

    // 2. Query Firestore without orderBy constraint
    const colRef = collection(db, "exchanges", exchange.id, "tasks");

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedTasks: ExchangeTask[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              exchangeId: exchange.id,
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

          loadedTasks.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
            return aTime - bTime;
          });

          setTasks(loadedTasks);
          saveLocalExchangeTasks(exchange.id, loadedTasks);
        } else {
          const currentLocal = getLocalExchangeTasks(exchange.id);
          if (currentLocal.length > 0) {
            setTasks(currentLocal);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Notice: Using local exchange tasks fallback:", error);
        const currentLocal = getLocalExchangeTasks(exchange.id);
        if (currentLocal.length > 0) {
          setTasks(currentLocal);
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [exchange.id, currentUserId, partnerId, currentUserName, partnerName]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed || t.status === "COMPLETED").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "PENDING") return !t.completed && t.status !== "COMPLETED";
    if (filter === "COMPLETED") return t.completed || t.status === "COMPLETED";
    return true;
  });

  async function handleToggle(task: ExchangeTask) {
    const nextCompleted = !task.completed;
    // 1. Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: nextCompleted,
              status: nextCompleted ? "COMPLETED" : "PENDING",
            }
          : t,
      ),
    );

    try {
      await toggleExchangeTaskCompletion({
        exchangeId: exchange.id,
        taskId: task.id,
        completed: nextCompleted,
        completedBy: currentUserId,
      });
      const updated = getLocalExchangeTasks(exchange.id);
      if (updated.length > 0) {
        setTasks(updated);
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
      // Rollback
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, completed: task.completed, status: task.status }
            : t,
        ),
      );
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    const dueDate = newTaskDueDate || undefined;
    let assigneeName = "Both Members";
    if (newTaskAssignee === currentUserId) {
      assigneeName = currentUserName || "You";
    } else if (newTaskAssignee === partnerId) {
      assigneeName = partnerName;
    }

    // 1. Optimistic task add
    const tempId = `temp_${Date.now()}`;
    const optimisticTask: ExchangeTask = {
      id: tempId,
      exchangeId: exchange.id,
      title,
      createdBy: currentUserId,
      createdByName: currentUserName || "Member",
      assignedTo: newTaskAssignee,
      assignedToName: assigneeName,
      status: "PENDING",
      completed: false,
      dueDate,
      createdAt: new Date(),
    };

    setTasks((prev) => [...prev, optimisticTask]);
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setIsAddingTask(false);

    try {
      await createExchangeTask({
        exchangeId: exchange.id,
        title,
        createdBy: currentUserId,
        createdByName: currentUserName || "Member",
        assignedTo: newTaskAssignee,
        assignedToName: assigneeName,
        dueDate,
      });
      const updated = getLocalExchangeTasks(exchange.id);
      if (updated.length > 0) {
        setTasks(updated);
      }
    } catch (err) {
      console.error("Failed to add task:", err);
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  }

  async function handleDeleteTask(taskId: string, title: string) {
    if (window.confirm(`Delete task "${title}"?`)) {
      // Optimistic delete
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        await deleteExchangeTask({
          exchangeId: exchange.id,
          taskId,
        });
        const updated = getLocalExchangeTasks(exchange.id);
        setTasks(updated);
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {partnerPhoto ? (
              <img
                src={partnerPhoto}
                alt={partnerName}
                className="size-12 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
              />
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary font-black text-sm shrink-0 ring-2 ring-primary/20">
                {partnerInitials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {partnerName}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    progressPercent === 100
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  {progressPercent === 100 ? (
                    <>
                      <CheckCircle2 className="size-3" /> Exchange Completed
                    </>
                  ) : (
                    <>
                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      Active Exchange
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {exchange.title || "Mutual Skill Exchange Session"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/messages"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
            >
              <MessageCircle className="size-3.5 text-primary" />
              <span>Inbox & Chat</span>
            </Link>
            <Link
              to="/messages"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover px-3.5 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
            >
              <Video className="size-3.5" />
              <span>Video Call</span>
            </Link>
          </div>
        </div>

        {/* Progress Bar Component */}
        <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Exchange Progress</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                ({completedTasks} of {totalTasks} tasks completed)
              </span>
            </div>
            <span
              className={`font-black text-sm ${
                progressPercent === 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-primary"
              }`}
            >
              {progressPercent}%
            </span>
          </div>

          {/* Visual Progress Track */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                progressPercent === 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs shadow-emerald-500/50"
                  : "bg-gradient-to-r from-primary to-indigo-500 shadow-xs shadow-primary/40"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <span>0%</span>
            <span className="hidden sm:inline">25%</span>
            <span>50%</span>
            <span className="hidden sm:inline">75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Todo List Header & Controls */}
      <div className="bg-slate-50/70 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 hover:text-primary transition cursor-pointer"
        >
          <ListTodo className="size-4 text-primary" />
          <span>Shared Learning Todo List ({tasks.length})</span>
          {isExpanded ? (
            <ChevronUp className="size-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="size-3.5 text-slate-400" />
          )}
        </button>

        <div className="flex items-center gap-1">
          {/* Filters */}
          <div className="flex items-center rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                filter === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("PENDING")}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                filter === "PENDING"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setFilter("COMPLETED")}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                filter === "COMPLETED"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              Done
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* Todo List Content */}
      {isExpanded && (
        <div className="p-5 space-y-3">
          {/* Inline Add Task Form */}
          {isAddingTask && (
            <form
              onSubmit={handleAddTask}
              className="p-3.5 rounded-xl border border-primary/30 bg-primary-soft/30 dark:bg-primary/5 space-y-3 animate-in fade-in duration-200"
            >
              <div>
                <input
                  type="text"
                  required
                  placeholder="Task title (e.g. Master React Hooks, Practice 10 problems)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Users className="size-3.5 text-slate-400" />
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="BOTH">Both Members</option>
                    <option value={currentUserId}>Assigned to You</option>
                    <option value={partnerId}>Assigned to {partnerName}</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Calendar className="size-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-200 outline-none"
                  />
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary-hover transition cursor-pointer shadow-xs"
                  >
                    Save Task
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Task Items */}
          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              {filter === "ALL"
                ? "No tasks in this workspace yet. Click 'Add Task' above to add your first goal!"
                : filter === "PENDING"
                  ? "All tasks are completed! Great job! 🎉"
                  : "No completed tasks yet. Check off items as you make progress!"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const isCompleted = task.completed || task.status === "COMPLETED";
                const isAssignedToMe = task.assignedTo === currentUserId;
                const isAssignedToPartner = task.assignedTo === partnerId;

                return (
                  <div
                    key={task.id}
                    className={`group flex items-start justify-between gap-3 p-3.5 rounded-xl border transition ${
                      isCompleted
                        ? "bg-slate-50/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60 opacity-75"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 shadow-2xs text-slate-900 dark:text-white"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => void handleToggle(task)}
                        className="mt-0.5 shrink-0 text-slate-400 hover:text-primary transition cursor-pointer"
                        title={isCompleted ? "Mark as pending" : "Mark as completed"}
                      >
                        {isCompleted ? (
                          <CheckSquare className="size-5 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <Square className="size-5 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-bold leading-snug break-words ${
                            isCompleted
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Assignee Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black border ${
                              isAssignedToMe
                                ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300 border-primary/20 dark:border-primary/40"
                                : isAssignedToPartner
                                  ? "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                            }`}
                          >
                            <Users className="size-2.5" />
                            {isAssignedToMe
                              ? "You"
                              : isAssignedToPartner
                                ? partnerName
                                : "Both"}
                          </span>

                          {/* Due date if present */}
                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-bold">
                              <Clock className="size-2.5" />
                              {task.dueDate}
                            </span>
                          )}

                          {isCompleted && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeleteTask(task.id, task.title)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Delete Task"
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
  );
}

