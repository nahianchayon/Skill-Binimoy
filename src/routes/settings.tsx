import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Camera, Check, Crown, Eye, UserRound } from "lucide-react";
import { useState } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useAuth } from "@/lib/auth";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { updateRecord } from "@/lib/firestore";
import { uploadOrEncodeImage } from "@/lib/storage-upload";
import { ProfileModal } from "@/components/profile/ProfileModal";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Profile settings · Skill Binimoy" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, activatePremium } = useAuth();
  const [activatingPremium, setActivatingPremium] = useState(false);
  const [form, setForm] = useState({
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    education: (profile as UserProfileWithDetails | null)?.education || "",
    location: (profile as UserProfileWithDetails | null)?.location || "",
    skillsOffered: profile?.skillsOffered?.join(", ") || "",
    skillsWanted: profile?.skillsWanted?.join(", ") || "",
    availability: (profile as UserProfileWithDetails | null)?.availability || "Weekday evenings",
  });
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewProfileOpen, setPreviewProfileOpen] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setNotice("");
    try {
      await updateRecord("users", user.uid, {
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        education: form.education.trim(),
        location: form.location.trim(),
        skillsOffered: form.skillsOffered
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        skillsWanted: form.skillsWanted
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        availability: form.availability,
      });
      setNotice("Profile saved successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }
  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setNotice("Choose an image smaller than 10 MB.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setPhotoUploading(true);
    setNotice("");
    try {
      const photoURL = await uploadOrEncodeImage(
        `users/${user.uid}/profile/avatar-${Date.now()}`,
        file,
      );
      await updateRecord("users", user.uid, { photoURL });
      setPreviewUrl(photoURL);
      if (auth?.currentUser && photoURL.startsWith("http")) {
        await updateProfile(auth.currentUser, { photoURL }).catch(console.warn);
      }
      setNotice("Profile photo updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }
  const displayPhoto =
    previewUrl || profile?.photoURL || (user && "photoURL" in user ? user.photoURL : null);

  return (
    <WorkspaceShell title="Profile settings" eyebrow="Your member identity">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="profile-cover">
          <div className="profile-avatar-large relative flex items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-white">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={form.displayName || "Profile photo"}
                className="size-full object-cover rounded-full"
              />
            ) : (
              <UserRound className="size-8 text-primary" />
            )}
          </div>
          <div>
            <p className="eyebrow text-primary">Your public profile</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              Make it easier for the right people to find you.
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              A complete profile earns better matches and builds trust.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewProfileOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-primary-soft hover:text-primary transition"
            >
              <Eye className="size-4" /> Preview Public Profile
            </button>
            <label className="profile-photo-button cursor-pointer">
              <Camera className="size-4" /> {photoUploading ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void uploadPhoto(event)}
              />
            </label>
          </div>
        </section>

        {/* Verification & Premium Status Card */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-12 place-items-center rounded-2xl ${
                  profile?.premium || profile?.tutorVerified
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {profile?.premium || profile?.tutorVerified ? (
                  <BadgeCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Crown className="size-6 text-primary" />
                )}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                    {profile?.premium || profile?.tutorVerified
                      ? "Verified ID & Premium Active"
                      : "Account Verification & Premium"}
                  </h3>
                  {profile?.premium || profile?.tutorVerified ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Standard
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile?.premium || profile?.tutorVerified
                    ? "Your verified ID badge is displayed next to your name across explore, posts, solutions, and profile."
                    : "Unlock the verified ID blue checkmark, priority ranking in search, and unlimited exchanges."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {!(profile?.premium || profile?.tutorVerified) ? (
                <>
                  <button
                    type="button"
                    disabled={activatingPremium}
                    onClick={async () => {
                      setActivatingPremium(true);
                      try {
                        await activatePremium();
                        setNotice("Verified ID & Premium activated successfully!");
                      } catch (err) {
                        setNotice(err instanceof Error ? err.message : "Activation failed");
                      } finally {
                        setActivatingPremium(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-98 transition disabled:opacity-50"
                  >
                    <BadgeCheck className="size-3.5" />
                    {activatingPremium ? "Activating..." : "Activate Verified ID"}
                  </button>
                  <Link
                    to="/$section"
                    params={{ section: "premium" }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-primary-soft hover:text-primary transition"
                  >
                    <Crown className="size-3.5 text-amber-500" /> View Plans
                  </Link>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3.5 text-emerald-600" /> Verified Member
                </div>
              )}
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_0.72fr]">
          <section className="settings-section">
            <div>
              <p className="eyebrow">About you</p>
              <h2 className="settings-heading">Tell the community who you are</h2>
            </div>
            <div className="settings-fields">
              <label>
                Display name
                <input
                  required
                  value={form.displayName}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                />
              </label>
              <label>
                Short bio
                <textarea
                  required
                  minLength={10}
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                  placeholder="What are you curious about? What can you help with?"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  Education
                  <input
                    value={form.education}
                    onChange={(event) => setForm({ ...form, education: event.target.value })}
                    placeholder="e.g. Computer Science"
                  />
                </label>
                <label>
                  Location
                  <input
                    value={form.location}
                    onChange={(event) => setForm({ ...form, location: event.target.value })}
                    placeholder="e.g. Dhaka, Bangladesh"
                  />
                </label>
              </div>
            </div>
          </section>
          <section className="settings-section">
            <div>
              <p className="eyebrow">Skills & availability</p>
              <h2 className="settings-heading">Shape your learning loop</h2>
            </div>
            <div className="settings-fields">
              <label>
                Skills you offer
                <input
                  value={form.skillsOffered}
                  onChange={(event) => setForm({ ...form, skillsOffered: event.target.value })}
                  placeholder="React, Figma, Excel"
                />
                <small>Separate skills with commas.</small>
              </label>
              <label>
                Skills you want to learn
                <input
                  value={form.skillsWanted}
                  onChange={(event) => setForm({ ...form, skillsWanted: event.target.value })}
                  placeholder="Python, marketing, photography"
                />
              </label>
              <label>
                Availability
                <select
                  value={form.availability}
                  onChange={(event) => setForm({ ...form, availability: event.target.value })}
                >
                  <option>Weekday mornings</option>
                  <option>Weekday evenings</option>
                  <option>Weekends</option>
                  <option>Flexible</option>
                </select>
              </label>
            </div>
            <div className="mt-7 flex items-center justify-between gap-3">
              {notice && <p className="text-sm font-semibold text-primary">{notice}</p>}
              <button
                disabled={saving}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="size-4" /> Save profile
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
        {previewProfileOpen && (
          <ProfileModal
            profile={{
              ...profile,
              displayName: form.displayName,
              bio: form.bio,
              education: form.education,
              location: form.location,
              availability: form.availability,
              skillsOffered: form.skillsOffered
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              skillsWanted: form.skillsWanted
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              photoURL: displayPhoto,
              email: user?.email,
              role: profile?.role || "USER",
              tutorVerified: profile?.tutorVerified,
              premium: profile?.premium,
            }}
            onClose={() => setPreviewProfileOpen(false)}
          />
        )}
      </div>
    </WorkspaceShell>
  );
}
type UserProfileWithDetails = { education?: string; location?: string; availability?: string };
