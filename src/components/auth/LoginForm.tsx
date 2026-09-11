import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, Github, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().min(1, "Email or demo name is required"),
  password: z.string().min(1, "Password is required").max(72, "Password is too long"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.63 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.68 0 2.8.71 3.45 1.32l2.35-2.27C16.3 3.87 14.36 3 12 3a9 9 0 1 0 0 18c5.2 0 8.64-3.65 8.64-8.8 0-.59-.06-1.04-.29-2.1Z"
      />
    </svg>
  );
}

export function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setStatus("loading");
      setAuthError("");
      await login(values.email, values.password, values.remember);
      setStatus("success");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setStatus("error");
      setAuthError(getAuthErrorMessage(err));
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  async function handleGoogleLogin() {
    try {
      setStatus("loading");
      setAuthError("");
      await loginWithGoogle();
      setStatus("success");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setStatus("error");
      setAuthError(getAuthErrorMessage(err));
    }
  }

  const inputBase =
    "peer h-14 w-full rounded-2xl border bg-background pt-5 pr-12 pl-11 text-sm outline-none transition-all placeholder:text-transparent focus:ring-4";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass shadow-card w-full max-w-md rounded-3xl p-8 sm:p-10",
        status === "error" && "animate-shake",
      )}
    >
      <Logo />

      <h1 className="mt-8 text-3xl">Welcome Back</h1>
      <p className="text-muted-foreground mt-2 text-sm">Continue your learning journey.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <div className="relative">
            <Mail
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="email"
              type="text"
              autoComplete="email"
              placeholder="you@email.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={cn(
                inputBase,
                errors.email
                  ? "border-destructive focus:ring-destructive/20"
                  : "border-border focus:border-primary/50 focus:ring-primary/20",
              )}
              {...register("email")}
            />
            <label
              htmlFor="email"
              className="text-muted-foreground peer-placeholder-shown:text-muted-foreground peer-focus:text-primary pointer-events-none absolute top-2.5 left-11 text-xs font-medium transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs"
            >
              Email address
            </label>
            {!errors.email && touchedFields.email && watch("email") ? (
              <Check
                className="text-success absolute top-1/2 right-4 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
            ) : null}
          </div>
          <AnimatePresence>
            {errors.email ? (
              <motion.p
                id="email-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-destructive mt-2 text-xs font-medium"
              >
                {errors.email.message}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div>
          <div className="relative">
            <Lock
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={cn(
                inputBase,
                errors.password
                  ? "border-destructive focus:ring-destructive/20"
                  : "border-border focus:border-primary/50 focus:ring-primary/20",
              )}
              {...register("password")}
            />
            <label
              htmlFor="password"
              className="text-muted-foreground peer-focus:text-primary pointer-events-none absolute top-2.5 left-11 text-xs font-medium transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-lg transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password ? (
              <motion.p
                id="password-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-destructive mt-2 text-xs font-medium"
              >
                {errors.password.message}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!watch("remember")}
              onCheckedChange={(v) => setValue("remember", v === true)}
              aria-label="Remember me"
            />
            Remember me
          </label>
          <a href="/forgot-password" className="text-primary text-sm font-semibold hover:underline">
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" /> Signing in…
            </>
          ) : status === "success" ? (
            <>
              <Check aria-hidden="true" /> Welcome back!
            </>
          ) : (
            "Log in"
          )}
        </Button>

        <p aria-live="polite" className="sr-only">
          {status === "error" ? "Login failed, please check your credentials." : ""}
        </p>
        {authError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {authError}
          </p>
        )}
      </form>

      <div className="my-7 flex items-center gap-4">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs font-semibold">OR</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" type="button" onClick={() => void handleGoogleLogin()}>
          <GoogleIcon /> Google
        </Button>
        <Button variant="outline" type="button">
          <Github aria-hidden="true" /> GitHub
        </Button>
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        New to Skill Binimoy?{" "}
        <a href="/register" className="text-primary font-semibold hover:underline">
          Create an account
        </a>
      </p>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        <a href="#" className="hover:text-foreground hover:underline">
          Privacy Policy
        </a>
        <span className="mx-2">·</span>
        <a href="#" className="hover:text-foreground hover:underline">
          Terms
        </a>
        <span className="mx-2">·</span>
        <a href="#" className="hover:text-foreground hover:underline">
          Help
        </a>
      </p>
    </motion.div>
  );
}

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("operation-not-allowed"))
    return "Enable Email/Password in Firebase Console → Authentication → Sign-in method.";
  if (code.includes("configuration-not-found"))
    return "Firebase Auth is not configured for this project yet. Enable a sign-in provider in Firebase Console.";
  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  )
    return "Email or password is incorrect.";
  if (code.includes("invalid-email"))
    return "Enter a valid email address for Firebase Authentication.";
  if (code.includes("popup-blocked"))
    return "Allow popups for localhost to continue with Google sign-in.";
  return error instanceof Error
    ? error.message
    : "Authentication failed. Check your Firebase Auth settings.";
}
