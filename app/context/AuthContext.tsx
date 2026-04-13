"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function ensureUserProfile(user: User) {
  const ref = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? null,
      diet: "Balanced",
      allergies: "None",
      deliveryArea: "Central Bengaluru",
      favoriteCuisines: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Update photo and display name in case they changed on Google side
    await setDoc(
      ref,
      {
        displayName: user.displayName ?? snap.data().displayName,
        photoURL: user.photoURL ?? snap.data().photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const authInstance = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            await ensureUserProfile(firebaseUser);
          } catch {
            // Non-blocking — profile sync failure shouldn't break the app
          }
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Firebase Auth failed to initialize:", error);
      setLoading(false);
    }
  }, []);

  async function signInWithGoogle() {
    await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  }

  async function logout() {
    await signOut(getFirebaseAuth());
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
