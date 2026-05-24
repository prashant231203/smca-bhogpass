"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getDb, auth } from "@/lib/firebase";
const db = getDb();
import { User } from "@/lib/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: FirebaseUser | null;
  roleData: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [roleData, setRoleData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        try {
          // Check bootstrapped admin FIRST to bypass AdBlocker database issues
          if (currUser.email === "admin@smcachennai.in" || currUser.email === "prashant23122003@gmail.com" || currUser.email === "surelyshubham@gmail.com" || currUser.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
            setRoleData({ uid: currUser.uid, email: currUser.email, role: "admin", name: "Super Admin" });
          } else {
            const userDoc = await getDoc(doc(db!, "users", currUser.uid));
            if (userDoc.exists()) {
              setRoleData({ uid: currUser.uid, ...userDoc.data() } as User);
            } else {
              setRoleData(null); // No assigned role
            }
          }
        } catch (error) {
          console.error("Failed to fetch user role", error);
          setRoleData(null);
        }
      } else {
        setRoleData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error: unknown) {
      toast.error(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
      router.push("/");
    } catch (error: unknown) {
      toast.error(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setRoleData(null);
    router.push("/");
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, roleData, loading, login, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
