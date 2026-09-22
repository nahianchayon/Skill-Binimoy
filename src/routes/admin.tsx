import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Flag,
  GraduationCap,
  Mail,
  Package,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserCheck,
  UserRound,
  UserRoundCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedView } from "@/components/common/ProtectedView";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useAuth } from "@/lib/auth";
import { createRecord, deleteRecord, updateRecord, watchRecords } from "@/lib/firestore";
import { uploadOrEncodeImage } from "@/lib/storage-upload";

type AdminRow = {
  id: string;
  uid?: string | undefined;
  userId?: string | undefined;
  displayName?: string | undefined;
  name?: string | undefined;
  email?: string | null | undefined;
  photoURL?: string | undefined;
  role?: string | undefined;
  status?: string | undefined;
  title?: string | undefined;
  subject?: string | undefined;
  reason?: string | undefined;
  description?: string | undefined;
  body?: string | undefined;
  postType?: string | undefined;
  type?: string | undefined;
  authorId?: string | undefined;
  authorName?: string | undefined;
  authorPhoto?: string | undefined;
  category?: string | undefined;
  skills?: string[] | string | undefined;
  skillsOffered?: string[] | string | undefined;
  bio?: string | undefined;
  expertise?: string | undefined;
  experience?: string | undefined;
  education?: string | undefined;
  hourlyRate?: string | undefined;
  availability?: string | undefined;
  certificates?: string | undefined;
  portfolio?: string | undefined;
  banned?: boolean | undefined;
  suspended?: boolean | undefined;
  premium?: boolean | undefined;
  tutorVerified?: boolean | undefined;
  createdAt?: unknown;
  items?: Array<{ name?: string; quantity?: number; price?: number }>;
  total?: number;
  paymentMethod?: string;
  [key: string]: unknown;
};

type Product = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  active?: boolean;
};

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin control room · Skill Binimoy" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminRow[]>([]);
  const [reports, setReports] = useState<AdminRow[]>([]);
  const [applications, setApplications] = useState<AdminRow[]>([]);
  const [orders, setOrders] = useState<AdminRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<AdminRow[]>([]);
  const [postSearch, setPostSearch] = useState("");
  const [postFilter, setPostFilter] = useState<"ALL" | "EXCHANGE" | "QUESTION">("ALL");
  const [selectedApplication, setSelectedApplication] = useState<AdminRow | null>(null);
  const [appFilter, setAppFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [userSearch, setUserSearch] = useState("");
  const [rejectionModal, setRejectionModal] = useState<AdminRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "Apparel",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (profile?.role !== "ADMIN") return;
    const stopUsers = watchRecords<AdminRow>("users", [], setUsers, (error) =>
      setNotice(error.message),
    );
    const stopReports = watchRecords<AdminRow>("reports", [], setReports, (error) =>
      setNotice(error.message),
    );
    const stopApplications = watchRecords<AdminRow>(
      "tutorApplications",
      [],
      setApplications,
      (error) => setNotice(error.message),
    );
    const stopOrders = watchRecords<AdminRow>("orders", [], setOrders, (error) =>
      setNotice(error.message),
    );
    const stopProducts = watchRecords<Product>("products", [], setProducts, (error) =>
      setNotice(error.message),
    );
    const stopPosts = watchRecords<AdminRow>("posts", [], setPosts, (error) =>
      setNotice(error.message),
    );
    return () => {
      stopUsers();
      stopReports();
      stopApplications();
      stopOrders();
      stopProducts();
      stopPosts();
    };
  }, [profile?.role]);

  async function updateStatus(collectionName: string, id: string, status: string) {
    try {
      await updateRecord(collectionName, id, { status });
      setNotice(`Updated ${collectionName.replace(/([A-Z])/g, " $1").toLowerCase()}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    try {
      let imageUrl = "";
      if (productImage) {
        if (!productImage.type.startsWith("image/") || productImage.size > 10 * 1024 * 1024)
          throw new Error("Product image must be an image smaller than 10 MB.");
        imageUrl = await uploadOrEncodeImage(`products/covers/cover-${Date.now()}`, productImage);
      }
      await createRecord("products", {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        imageUrl: imageUrl || null,
        active: true,
      });
      setProductForm({ name: "", description: "", price: "", stock: "", category: "Apparel" });
      setProductImage(null);
      setProductImagePreview(null);
      setNotice("Product added to the store with photo successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add product.");
    }
  }

  async function approveTutor(application: AdminRow) {
    try {
      const applicantUser = users.find(
        (u) => u.id === application.userId || u.uid === application.userId,
      );
      const name =
        application.displayName ||
        application.name ||
        applicantUser?.displayName ||
        applicantUser?.name ||
        "Verified Tutor";
      const photo = application.photoURL || applicantUser?.photoURL || "";
      const skills = (
        Array.isArray(application.skills) && application.skills.length > 0
          ? application.skills
          : Array.isArray(applicantUser?.skillsOffered) && applicantUser.skillsOffered.length > 0
            ? applicantUser.skillsOffered
            : typeof application.skills === "string"
              ? (application.skills as string)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : []
      ) as string[];
      const bio =
        application.bio ||
        applicantUser?.bio ||
        "Experienced verified mentor ready to help you make progress.";
      const expertise =
        application.expertise ||
        application.experience ||
        (skills.length > 0 ? skills.join(" · ") : "Skill Mentor");
      const hourlyRate = application.hourlyRate || applicantUser?.hourlyRate || "500";

      await updateRecord("tutorApplications", application.id, {
        status: "APPROVED",
        reviewedAt: new Date().toISOString(),
      });

      if (application.userId) {
        await updateRecord("users", application.userId, {
          tutorVerified: true,
          role: "TUTOR",
        }).catch(console.warn);

        await createRecord("notifications", {
          recipientId: application.userId,
          title: "Congratulations! Tutor Application Approved",
          description: "Your application to become a Skill Binimoy verified tutor has been approved. You are now listed on the tutors directory.",
          status: "UNREAD",
          createdAt: new Date().toISOString(),
        }).catch(console.warn);
      }

      await createRecord("tutors", {
        userId: application.userId,
        status: "APPROVED",
        applicationId: application.id,
        displayName: name,
        name: name,
        photoURL: photo,
        skills: skills,
        skillsOffered: skills,
        expertise: expertise,
        bio: bio,
        education: application.education || "",
        experience: application.experience || "",
        hourlyRate: hourlyRate,
        availability: application.availability || "Flexible",
        rating: 5.0,
        sessionsCompleted: 0,
        createdAt: new Date().toISOString(),
      });
      setSelectedApplication(null);
      setNotice(`Tutor ${name} approved and added to the marketplace.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Tutor approval failed.");
    }
  }

  async function handleRejectTutor(application: AdminRow, reason?: string) {
    try {
      const finalReason = reason?.trim() || "Requirements not met at this time. You may apply again later.";
      await updateRecord("tutorApplications", application.id, {
        status: "REJECTED",
        rejectionReason: finalReason,
        reviewedAt: new Date().toISOString(),
      });

      if (application.userId) {
        await createRecord("notifications", {
          recipientId: application.userId,
          title: "Tutor Application Update",
          description: `Your application to become a verified tutor was reviewed: ${finalReason}`,
          status: "UNREAD",
          createdAt: new Date().toISOString(),
        }).catch(console.warn);
      }

      setRejectionModal(null);
      setSelectedApplication(null);
      setRejectionReason("");
      setNotice(`Application for ${application.displayName || "applicant"} was declined.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Rejection failed.");
    }
  }

  async function toggleUserSuspension(targetUser: AdminRow) {
    try {
      const isSuspended = targetUser.status === "SUSPENDED" || Boolean(targetUser.suspended);
      await updateRecord("users", targetUser.id || (targetUser.uid as string), {
        status: isSuspended ? "ACTIVE" : "SUSPENDED",
        suspended: !isSuspended,
      });
      setNotice(`User ${targetUser.displayName || targetUser.email} ${isSuspended ? "reactivated" : "suspended"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function toggleUserBan(targetUser: AdminRow) {
    try {
      const isBanned = Boolean(targetUser.banned);
      await updateRecord("users", targetUser.id || (targetUser.uid as string), {
        banned: !isBanned,
        status: isBanned ? "ACTIVE" : "BANNED",
      });
      setNotice(`User ${targetUser.displayName || targetUser.email} ${isBanned ? "unbanned" : "banned"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function toggleUserRole(targetUser: AdminRow) {
    try {
      const newRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
      await updateRecord("users", targetUser.id || (targetUser.uid as string), {
        role: newRole,
      });
      setNotice(`Role for ${targetUser.displayName || "user"} updated to ${newRole}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Role update failed.");
    }
  }

  async function toggleUserVerification(targetUser: AdminRow) {
    try {
      const targetId = targetUser.id || (targetUser.uid as string);
      const isCurrentlyVerified = Boolean(targetUser.premium || targetUser.tutorVerified);
      const nextState = !isCurrentlyVerified;
      await updateRecord("users", targetId, {
        premium: nextState,
        tutorVerified: nextState,
      });
      if (typeof window !== "undefined") {
        if (nextState) {
          localStorage.setItem(`sb_premium_${targetId}`, "true");
        } else {
          localStorage.removeItem(`sb_premium_${targetId}`);
        }
      }
      setNotice(
        `User ${targetUser.displayName || targetUser.email || targetId} ${nextState ? "granted Verified ID & Premium badge" : "removed from Verified ID & Premium"}.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Verification update failed.");
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (appFilter === "ALL") return true;
    if (appFilter === "PENDING") return app.status === "PENDING" || !app.status;
    return app.status === appFilter;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    );
  });

  const filteredPosts = posts.filter((p) => {
    const isQuestion = p.postType === "QUESTION" || p.type === "Quick Solution";
    if (postFilter === "EXCHANGE" && isQuestion) return false;
    if (postFilter === "QUESTION" && !isQuestion) return false;
    if (!postSearch.trim()) return true;
    const term = postSearch.toLowerCase();
    return (
      (p.title || "").toLowerCase().includes(term) ||
      (p.description || "").toLowerCase().includes(term) ||
      ((typeof p.authorName === "string" ? p.authorName : "")).toLowerCase().includes(term) ||
      (p.category || "").toLowerCase().includes(term)
    );
  });

  async function deletePost(postId: string, title?: string) {
    if (!window.confirm(`Admin: Permanently delete post "${title || postId}"?`)) return;
    try {
      await deleteRecord("posts", postId);
      setNotice(`Post "${title || postId}" was removed successfully.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to remove post.");
    }
  }

  return (
    <ProtectedView adminOnly>
      <WorkspaceShell title="Admin Control Room" eyebrow="Platform operations">
        <div className="admin-page space-y-8">
          <section className="admin-hero">
            <div>
              <p className="eyebrow text-primary">Operations overview</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Manage members, tutors, safety, and shop.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Review tutor applications with full background details, manage user safety, approve
                products, and fulfill orders.
              </p>
            </div>
            <div className="admin-hero-badge">
              <ShieldCheck className="size-5 text-emerald-500" />
              <span>
                <strong>Protected Access</strong>
                <small>Administrator privileges active</small>
              </span>
            </div>
          </section>

          <section className="admin-metrics">
            <AdminMetric label="Total users" value={users.length} icon={Users} tone="blue" />
            <AdminMetric
              label="Pending tutors"
              value={applications.filter((row) => row.status === "PENDING" || !row.status).length}
              icon={UserRoundCheck}
              tone="violet"
            />
            <AdminMetric label="Community posts" value={posts.length} icon={FileText} tone="blue" />
            <AdminMetric
              label="Open reports"
              value={reports.filter((row) => row.status !== "RESOLVED").length}
              icon={Flag}
              tone="red"
            />
            <AdminMetric label="Orders" value={orders.length} icon={ShoppingBag} tone="gold" />
          </section>

          {notice && (
            <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4 text-sm font-bold text-primary">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} className="hover:opacity-75">
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Tutor Applications Section */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BadgeCheck className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Tutor Applications</h2>
                  <p className="text-xs text-muted-foreground">
                    Inspect applicant qualifications, rate, and experience before deciding.
                  </p>
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border p-1 bg-slate-50 dark:bg-slate-900">
                {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAppFilter(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      appFilter === tab
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "PENDING"
                      ? `Pending (${applications.filter((a) => a.status === "PENDING" || !a.status).length})`
                      : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {filteredApplications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No {appFilter.toLowerCase()} applications found.
                </div>
              ) : (
                filteredApplications.map((app) => {
                  const applicantUser = users.find(
                    (u) => u.id === app.userId || u.uid === app.userId,
                  );
                  const name = app.displayName || app.name || applicantUser?.displayName || "Applicant";
                  const email = app.email || applicantUser?.email || "No email";
                  const photo = app.photoURL || applicantUser?.photoURL;
                  const skills = Array.isArray(app.skills)
                    ? app.skills
                    : typeof app.skills === "string"
                      ? (app.skills as string).split(",")
                      : [];

                  return (
                    <div
                      key={app.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border p-5 bg-background hover:border-primary/40 transition"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {photo ? (
                          <img
                            src={photo}
                            alt={name}
                            className="size-12 rounded-xl object-cover ring-2 ring-primary/10 shrink-0"
                          />
                        ) : (
                          <span className="grid size-12 place-items-center rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 font-bold text-lg shrink-0">
                            {name.slice(0, 1).toUpperCase()}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-950 dark:text-white truncate">{name}</h3>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                app.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : app.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {app.status || "PENDING"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{email}</p>
                          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                            {app.education ? `🎓 ${app.education}` : ""} {app.experience ? `· 💼 ${app.experience}` : ""}
                          </p>
                          {skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {skills.slice(0, 4).map((s, i) => (
                                <span
                                  key={i}
                                  className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                                >
                                  {s.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => setSelectedApplication(app)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="size-3.5" /> View Details
                        </button>
                        {app.status !== "APPROVED" && (
                          <button
                            onClick={() => void approveTutor(app)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            <CheckCircle2 className="size-3.5" /> Approve
                          </button>
                        )}
                        {app.status !== "REJECTED" && (
                          <button
                            onClick={() => setRejectionModal(app)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                          >
                            <XCircle className="size-3.5" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* User Management Section */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">User Management</h2>
                  <p className="text-xs text-muted-foreground">
                    Search and manage roles, suspension, and permissions across all members.
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search members by name or email..."
                  className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-xs outline-none"
                />
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-bold">Member</th>
                    <th className="pb-3 font-bold">Role</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.slice(0, 10).map((u) => {
                    const isBanned = Boolean(u.banned);
                    const isSuspended = u.status === "SUSPENDED" || Boolean(u.suspended);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt={u.displayName || "Member"}
                                className="size-8 rounded-full object-cover ring-1 ring-primary/20"
                              />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {(u.displayName || u.email || "U").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-950 dark:text-white">
                                  {u.displayName || "Unnamed member"}
                                </p>
                                {(u.premium || u.tutorVerified) && (
                                  <span title="Verified Member" className="text-primary shrink-0">
                                    <BadgeCheck className="size-3.5" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{u.email || u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                              u.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                : u.role === "TUTOR"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {u.role || "USER"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isBanned
                                ? "bg-red-100 text-red-700 dark:bg-red-950"
                                : isSuspended
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950"
                            }`}
                          >
                            {isBanned ? "BANNED" : isSuspended ? "SUSPENDED" : "ACTIVE"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => void toggleUserVerification(u)}
                              title={u.premium || u.tutorVerified ? "Remove Verified ID & Premium" : "Grant Verified ID & Premium"}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                u.premium || u.tutorVerified
                                  ? "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
                                  : "border border-border hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <BadgeCheck className="size-3 text-primary" />
                              {u.premium || u.tutorVerified ? "Verified" : "Verify ID"}
                            </button>
                            <button
                              onClick={() => void toggleUserRole(u)}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {u.role === "ADMIN" ? "Demote" : "Make Admin"}
                            </button>
                            <button
                              onClick={() => void toggleUserSuspension(u)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                isSuspended
                                  ? "bg-emerald-600 text-white"
                                  : "border border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                              }`}
                            >
                              {isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                            <button
                              onClick={() => void toggleUserBan(u)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                isBanned
                                  ? "bg-red-600 text-white"
                                  : "border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                              }`}
                            >
                              {isBanned ? "Unban" : "Ban"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Posts & Content Moderation Section */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Community Posts & Q&A Moderation</h2>
                  <p className="text-xs text-muted-foreground">
                    Inspect, review, and remove inappropriate posts or spam across the platform.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search posts or authors..."
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    className="h-9 w-48 sm:w-60 rounded-xl border border-border bg-background pl-8 pr-3 text-xs font-bold text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-border p-1 bg-slate-50 dark:bg-slate-900">
                  {(["ALL", "EXCHANGE", "QUESTION"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPostFilter(tab)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        postFilter === tab
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "ALL" ? `All (${posts.length})` : tab === "EXCHANGE" ? "Skill Swaps" : "Quick Q&A"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {filteredPosts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No community posts found matching your criteria.
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const author = users.find((u) => u.id === post.authorId || u.uid === post.authorId);
                  const isQuestion = post.postType === "QUESTION" || post.type === "Quick Solution";

                  return (
                    <div
                      key={post.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-background hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {post.authorPhoto || author?.photoURL ? (
                          <img
                            src={(post.authorPhoto || author?.photoURL) as string}
                            alt=""
                            className="size-10 rounded-xl object-cover ring-1 ring-border shrink-0"
                          />
                        ) : (
                          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary shrink-0">
                            {((post.authorName || author?.displayName || "M") as string).slice(0, 1).toUpperCase()}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-950 dark:text-white">
                              {(post.authorName || author?.displayName || "Community Member") as string}
                            </span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-muted-foreground">
                              {isQuestion ? "Quick Q&A" : "Skill Swap Offer"}
                            </span>
                            {Boolean(post.category) && (
                              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                                {post.category as string}
                              </span>
                            )}
                          </div>

                          <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white line-clamp-1">
                            {post.title || "Untitled Post"}
                          </h4>

                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {post.description || post.body || "No content preview"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => void deletePost(post.id, post.title as string | undefined)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition shadow-xs"
                          title="Permanently remove post as admin"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Remove Post</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Store Products & Inventory */}
          <AdminPanel title="Store products & inventory" icon={ShoppingBag} action="Live catalog">
            <form onSubmit={createProduct} className="admin-product-form">
              <input
                required
                placeholder="Product name"
                value={productForm.name}
                onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
              />
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="admin-product-file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setProductImage(file);
                    setProductImagePreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                <label
                  htmlFor="admin-product-file"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                >
                  <Camera className="size-4 text-primary" />
                  {productImage ? "Change photo" : "Upload product photo"}
                </label>
                {productImagePreview && (
                  <div className="relative size-10 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                    <img
                      src={productImagePreview}
                      alt="Preview"
                      className="size-full object-cover"
                    />
                  </div>
                )}
              </div>
              <input
                required
                placeholder="Description"
                value={productForm.description}
                onChange={(event) =>
                  setProductForm({ ...productForm, description: event.target.value })
                }
              />
              <select
                value={productForm.category}
                onChange={(event) =>
                  setProductForm({ ...productForm, category: event.target.value })
                }
              >
                <option>Apparel</option>
                <option>Stationery</option>
                <option>Accessories</option>
                <option>Drinkware</option>
              </select>
              <input
                required
                type="number"
                min="0"
                placeholder="Price (৳)"
                value={productForm.price}
                onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
              />
              <input
                required
                type="number"
                min="0"
                placeholder="Stock quantity"
                value={productForm.stock}
                onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}
              />
              <button className="admin-action-button">Add product</button>
            </form>

            <div className="admin-list mt-5">
              {products.length === 0 ? (
                <AdminEmpty text="No products yet. Add the first store product above." />
              ) : (
                products.map((product) => (
                  <div className="admin-list-row" key={product.id}>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name || "Product"}
                        className="size-10 rounded-xl object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <span className="admin-list-avatar gold">
                        <Package className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <strong>{product.name}</strong>
                      <small>
                        ৳{product.price || 0} · {product.stock || 0} in stock
                      </small>
                    </span>
                    <button
                      className="admin-action-button"
                      onClick={() =>
                        void updateRecord("products", product.id, {
                          stock: Math.max(0, Number(product.stock || 0) - 1),
                        })
                      }
                    >
                      -1 stock
                    </button>
                    <button
                      className="admin-action-button"
                      onClick={() =>
                        void deleteRecord("products", product.id).then(() =>
                          setNotice("Product removed."),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>

          {/* Orders & Reports Grid */}
          <div className="grid gap-8 xl:grid-cols-2">
            {/* Orders Management */}
            <AdminPanel title="Customer Orders" icon={ShoppingBag} action="All orders">
              <div className="admin-list">
                {orders.length === 0 ? (
                  <AdminEmpty text="No customer orders placed yet." />
                ) : (
                  orders.slice(0, 6).map((order) => (
                    <div className="admin-list-row" key={order.id}>
                      <span className="admin-list-avatar gold">
                        <ShoppingBag className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong>
                          Order #{order.id.slice(-6)} · ৳{order.total || 0}
                        </strong>
                        <small>
                          {order.paymentMethod || "COD"} · Status: {order.status || "PLACED"}
                        </small>
                      </span>
                      <select
                        value={order.status || "PLACED"}
                        onChange={(e) => void updateStatus("orders", order.id, e.target.value)}
                        className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-bold"
                      >
                        <option value="PLACED">Placed</option>
                        <option value="PAID">Paid</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </AdminPanel>

            {/* Safety Reports */}
            <AdminPanel title="Safety Reports" icon={AlertTriangle} action="Investigate">
              <div className="admin-list">
                {reports.length === 0 ? (
                  <AdminEmpty text="No active safety reports." />
                ) : (
                  reports.slice(0, 6).map((report) => (
                    <div className="admin-list-row" key={report.id}>
                      <span className="admin-list-avatar red">
                        <AlertTriangle className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong>{report.reason || report.subject || "Community report"}</strong>
                        <small>{report.description || "Needs investigation"}</small>
                      </span>
                      {report.status !== "RESOLVED" ? (
                        <button
                          onClick={() => void updateStatus("reports", report.id, "RESOLVED")}
                          className="admin-action-button"
                        >
                          Resolve
                        </button>
                      ) : (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </AdminPanel>
          </div>
        </div>

        {/* Detailed Application Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {selectedApplication.photoURL ? (
                    <img
                      src={selectedApplication.photoURL}
                      alt={selectedApplication.displayName || "Applicant"}
                      className="size-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm"
                    />
                  ) : (
                    <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-2xl font-black text-primary">
                      {(selectedApplication.displayName || selectedApplication.name || "T")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      {selectedApplication.displayName || selectedApplication.name || "Tutor Applicant"}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="size-3.5" /> {selectedApplication.email || "No email available"}
                    </p>
                    <span
                      className={`inline-block mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        selectedApplication.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedApplication.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedApplication.status || "PENDING REVIEW"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Hourly Rate
                    </span>
                    <p className="font-bold text-base mt-0.5">
                      ৳{selectedApplication.hourlyRate || "500"}/hr
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Availability
                    </span>
                    <p className="font-bold text-base mt-0.5">
                      {selectedApplication.availability || "Flexible"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Education & Credentials
                  </span>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {selectedApplication.education || "Not specified by applicant."}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Experience & Background
                  </span>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {selectedApplication.experience || selectedApplication.expertise || "Not specified."}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Teaching Bio
                  </span>
                  <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedApplication.bio || "No detailed bio provided."}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Skills & Topics
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(Array.isArray(selectedApplication.skills)
                      ? selectedApplication.skills
                      : typeof selectedApplication.skills === "string"
                        ? (selectedApplication.skills as string).split(",")
                        : []
                    ).map((s, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary"
                      >
                        {String(s).trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                {selectedApplication.status !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectionModal(selectedApplication);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                  >
                    <XCircle className="size-4" /> Reject Application
                  </button>
                )}
                {selectedApplication.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => void approveTutor(selectedApplication)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 className="size-4" /> Approve & List Tutor
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">
                Decline Tutor Application
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Give {rejectionModal.displayName || "the applicant"} constructive feedback or reasons for declining.
              </p>

              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., We currently require more teaching experience in this specific subject. Please apply again in the future."
                className="mt-4 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none"
              />

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectionModal(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectTutor(rejectionModal, rejectionReason)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </WorkspaceShell>
    </ProtectedView>
  );
}

function AdminMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="admin-metric">
      <span className={`admin-metric-icon ${tone}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function AdminPanel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Users;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="admin-panel-icon">
            <Icon className="size-4" />
          </span>
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
        </div>
        <button className="text-xs font-bold text-primary hover:underline">
          {action} <ArrowSmall />
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ArrowSmall() {
  return <span aria-hidden="true">→</span>;
}

function AdminEmpty({ text }: { text: string }) {
  return <div className="py-7 text-center text-sm text-slate-500 dark:text-slate-400">{text}</div>;
}
