import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { auth, db, firebaseEnabled } from "./firebase";

export type AppRole = "USER" | "TUTOR" | "ADMIN";
export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  role: AppRole;
  bio?: string;
  skillsOffered?: string[];
  skillsWanted?: string[];
  premium?: boolean;
  tutorVerified?: boolean;
};

type DemoUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: null;
};
type AuthUser = User | DemoUser;
type AuthContextValue = {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  activatePremium: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
};

const DEMO_SESSION_KEY = "skill-binimoy-demo-user";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createDemoUser(email: string, displayName?: string): DemoUser {
  return {
    uid: `demo-${encodeURIComponent(email).replaceAll("%", "-")}`,
    email,
    displayName: displayName || email.split("@")[0] || "Demo learner",
    photoURL: null,
  };
}

function createDemoProfile(user: DemoUser): UserProfile {
  const isCachedPremium =
    typeof window !== "undefined" &&
    localStorage.getItem(`sb_premium_${user.uid}`) === "true";
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: null,
    role: "USER",
    premium: isCachedPremium,
    tutorVerified: isCachedPremium,
  };
}

async function writeSecurityLog(user: Pick<AuthUser, "uid" | "email">, action: string) {
  if (!db) return;
  await addDoc(collection(db, "securityLogs"), {
    uid: user.uid,
    email: user.email,
    action,
    createdAt: serverTimestamp(),
  });
}

async function ensureProfile(user: User, displayName?: string) {
  if (!db) return;
  const isCachedPremium =
    typeof window !== "undefined" &&
    localStorage.getItem(`sb_premium_${user.uid}`) === "true";

  const profileRef = doc(db, "users", user.uid);
  const existing = await getDoc(profileRef);
  if (existing.exists()) {
    const existingData = existing.data();
    const updates: Record<string, unknown> = {
      uid: user.uid,
      email: user.email,
    };
    if (!existingData["displayName"] && (displayName || user.displayName)) {
      updates["displayName"] = displayName || user.displayName;
    }
    if (!existingData["photoURL"] && user.photoURL) {
      updates["photoURL"] = user.photoURL;
    }
    if (isCachedPremium && !existingData["premium"]) {
      updates["premium"] = true;
      updates["tutorVerified"] = true;
    }
    await setDoc(profileRef, updates, { merge: true });
    return;
  }
  await setDoc(
    profileRef,
    {
      uid: user.uid,
      email: user.email,
      displayName:
        displayName || user.displayName || user.email?.split("@")[0] || "Skill Binimoy member",
      photoURL: user.photoURL || null,
      role: "USER",
      premium: isCachedPremium,
      tutorVerified: isCachedPremium,
    },
    { merge: true },
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      const stored =
        localStorage.getItem(DEMO_SESSION_KEY) || sessionStorage.getItem(DEMO_SESSION_KEY);
      if (stored) {
        const demoUser = JSON.parse(stored) as DemoUser;
        setUser(demoUser);
        setProfile(createDemoProfile(demoUser));
      }
      setLoading(false);
      return;
    }
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubProfile?.();
      setUser(nextUser);
      if (nextUser) {
        await ensureProfile(nextUser);
        if (db) {
          unsubProfile = onSnapshot(doc(db, "users", nextUser.uid), (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              const isCachedPremium =
                typeof window !== "undefined" &&
                localStorage.getItem(`sb_premium_${nextUser.uid}`) === "true";
              setProfile({
                ...data,
                premium: Boolean(data.premium || isCachedPremium),
                tutorVerified: Boolean(data.tutorVerified || data.premium || isCachedPremium),
              });
            }
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured: firebaseEnabled,
      async login(email, password, remember = true) {
        if (!auth) {
          const demoUser = createDemoUser(email);
          (remember ? localStorage : sessionStorage).setItem(
            DEMO_SESSION_KEY,
            JSON.stringify(demoUser),
          );
          setUser(demoUser);
          setProfile(createDemoProfile(demoUser));
          return;
        }
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        const result = await signInWithEmailAndPassword(auth, email, password);
        await writeSecurityLog(result.user, "LOGIN_SUCCESS");
      },
      async register(email, password, displayName) {
        if (!auth) {
          const demoUser = createDemoUser(email, displayName);
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
          setUser(demoUser);
          setProfile(createDemoProfile(demoUser));
          return;
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await ensureProfile(result.user, displayName);
        await sendEmailVerification(result.user);
        await writeSecurityLog(result.user, "REGISTERED");
      },
      async loginWithGoogle() {
        if (!auth) {
          const demoUser = createDemoUser("demo@skillbinimoy.local", "Demo learner");
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
          setUser(demoUser);
          setProfile(createDemoProfile(demoUser));
          return;
        }
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        await ensureProfile(result.user);
        await writeSecurityLog(result.user, "GOOGLE_LOGIN_SUCCESS");
      },
      async resetPassword(email) {
        if (!auth) return;
        await sendPasswordResetEmail(auth, email);
      },
      async resendVerification() {
        if (!user) throw new Error("You must be signed in.");
        if (auth && "getIdToken" in user) await sendEmailVerification(user);
      },
      async activatePremium() {
        if (!user) return;
        if (typeof window !== "undefined") {
          localStorage.setItem(`sb_premium_${user.uid}`, "true");
        }
        setProfile((prev) =>
          prev
            ? { ...prev, premium: true, tutorVerified: true }
            : {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || "Member",
                photoURL: user.photoURL,
                role: "USER",
                premium: true,
                tutorVerified: true,
              },
        );
        if (db) {
          try {
            await setDoc(
              doc(db, "users", user.uid),
              { premium: true, tutorVerified: true, updatedAt: serverTimestamp() },
              { merge: true },
            );
          } catch (err) {
            console.warn("Could not sync premium to Firestore:", err);
          }
        }
      },
      async updateProfileData(updates: Partial<UserProfile>) {
        if (!user) return;
        setProfile((prev) => (prev ? { ...prev, ...updates } : null));
        if (updates.premium !== undefined && typeof window !== "undefined") {
          if (updates.premium) {
            localStorage.setItem(`sb_premium_${user.uid}`, "true");
          } else {
            localStorage.removeItem(`sb_premium_${user.uid}`);
          }
        }
        if (db) {
          try {
            await setDoc(
              doc(db, "users", user.uid),
              { ...updates, updatedAt: serverTimestamp() },
              { merge: true },
            );
          } catch (err) {
            console.warn("Could not sync profile updates to Firestore:", err);
          }
        }
      },
      async logout() {
        localStorage.removeItem(DEMO_SESSION_KEY);
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        if (auth) {
          if (user) await writeSecurityLog(user, "LOGOUT");
          await signOut(auth);
        }
      },
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
