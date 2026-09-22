import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Check, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useAuth } from "@/lib/auth";
import { createRecord, where, watchRecords } from "@/lib/firestore";

type Application = {
  id: string;
  status?: string;
  education?: string;
  experience?: string;
  skills?: string[];
  hourlyRate?: string;
};

export const Route = createFileRoute("/become-tutor")({
  head: () => ({ meta: [{ title: "Become a tutor · Skill Binimoy" }] }),
  component: BecomeTutorPage,
});

function BecomeTutorPage() {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [form, setForm] = useState({
    education: "",
    experience: "",
    skills: "",
    certificates: "",
    portfolio: "",
    bio: "",
    availability: "Weekday evenings",
    hourlyRate: "500",
  });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchRecords<Application>(
      "tutorApplications",
      [where("userId", "==", user.uid)],
      setApplications,
    );
  }, [user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const applicantName =
        profile?.displayName || user.displayName || user.email?.split("@")[0] || "Tutor";
      const applicantPhoto = profile?.photoURL || user.photoURL || "";
      const parsedSkills = form.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await createRecord("tutorApplications", {
        ...form,
        userId: user.uid,
        displayName: applicantName,
        name: applicantName,
        email: user.email || "",
        photoURL: applicantPhoto,
        skills: parsedSkills,
        skillsOffered: parsedSkills,
        expertise: form.experience || parsedSkills.join(" · "),
        status: "PENDING",
      });
      setNotice("Application submitted. An admin will review it soon.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not submit application.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell title="Become a tutor" eyebrow="Share your expertise">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="tutor-apply-hero">
          <div className="grid size-14 place-items-center rounded-2xl bg-white dark:bg-slate-800 text-primary">
            <GraduationCap className="size-7" />
          </div>
          <div>
            <p className="eyebrow text-primary">Teach what you know</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Turn your experience into someone else's breakthrough.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Verified tutors build reputation, help learners make progress, and shape the culture
              of Skill Binimoy.
            </p>
          </div>
        </section>
        {applications.length > 0 && (
          <div className="application-status">
            <BadgeCheck className="size-5 text-primary" />
            <span>
              <strong>Application status: {applications[0]?.status || "PENDING"}</strong>
              <small>Your submitted application is visible to the admin team.</small>
            </span>
          </div>
        )}
        <form onSubmit={submit} className="settings-section">
          <p className="eyebrow">Tutor application</p>
          <h2 className="settings-heading">Tell us about your teaching practice</h2>
          <div className="settings-fields mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Education
                <input
                  required
                  value={form.education}
                  onChange={(event) => setForm({ ...form, education: event.target.value })}
                  placeholder="Degree, institution or certification"
                />
              </label>
              <label>
                Years of experience
                <input
                  required
                  value={form.experience}
                  onChange={(event) => setForm({ ...form, experience: event.target.value })}
                  placeholder="e.g. 5 years in product design"
                />
              </label>
            </div>
            <label>
              Skills you teach
              <input
                required
                value={form.skills}
                onChange={(event) => setForm({ ...form, skills: event.target.value })}
                placeholder="React, UI/UX, photography"
              />
              <small>Separate skills with commas.</small>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Certificates
                <textarea
                  value={form.certificates}
                  onChange={(event) => setForm({ ...form, certificates: event.target.value })}
                  placeholder="List relevant certificates or credentials"
                />
              </label>
              <label>
                Portfolio link
                <input
                  type="url"
                  value={form.portfolio}
                  onChange={(event) => setForm({ ...form, portfolio: event.target.value })}
                  placeholder="https://your-portfolio.com"
                />
              </label>
            </div>
            <label>
              Teaching bio
              <textarea
                required
                minLength={20}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                placeholder="How do you help learners make progress?"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <label>
                Hourly demo rate (BDT)
                <input
                  required
                  value={form.hourlyRate}
                  onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })}
                />
              </label>
            </div>
          </div>
          <div className="mt-7 flex items-center justify-end gap-4">
            {notice && <p className="text-sm font-semibold text-primary">{notice}</p>}
            <button
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? (
                "Submitting..."
              ) : (
                <>
                  <Check className="size-4" /> Submit application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </WorkspaceShell>
  );
}
