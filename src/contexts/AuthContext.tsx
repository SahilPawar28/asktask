import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      setProfile({ id: snap.id, ...snap.data() } as UserProfile);
    } else {
      setProfile(null);
    }
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.uid);
  }

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // Clean up any previous profile listener
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (u) {
        // Do an initial load immediately so UI isn't blank
        await loadProfile(u.uid);
        // Then keep it live — rating, reviewCount, avatarUrl all update in real-time
        unsubProfile = onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  async function signUp(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const profileData: Omit<UserProfile, "id"> = {
      uid: cred.user.uid,
      name,
      email,
      avatarSeed: name,
      city: "",
      bio: "",
      rating: 0,
      reviewCount: 0,
      completedTasks: 0,
      activeTasks: 0,
      postedTasks: 0,
      verified: false,
      onboardingComplete: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    await setDoc(doc(db, "users", cred.user.uid), profileData);
    await loadProfile(cred.user.uid);
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle(): Promise<{ isNewUser: boolean }> {
    const cred = await signInWithPopup(auth, googleProvider);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    const isNewUser = !snap.exists();
    if (isNewUser) {
      const profileData: Omit<UserProfile, "id"> = {
        uid: cred.user.uid,
        name: cred.user.displayName || "User",
        email: cred.user.email || "",
        avatarUrl: cred.user.photoURL || undefined,
        avatarSeed: cred.user.displayName || "User",
        city: "",
        bio: "",
        rating: 0,
        reviewCount: 0,
        completedTasks: 0,
        activeTasks: 0,
        postedTasks: 0,
        verified: false,
        onboardingComplete: false,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      await setDoc(doc(db, "users", cred.user.uid), profileData);
    }
    await loadProfile(cred.user.uid);
    return { isNewUser };
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
