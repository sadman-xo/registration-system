"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  student: Student | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      api.get("/students/me")
        .then((res) => setStudent(res.data))
        .catch(() => {
          Cookies.remove("token");
          setStudent(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/students/login", { email, password });
    const { token, student } = res.data;
    Cookies.set("token", token, { expires: 1 }); // 1 day
    setStudent(student);
    if (student.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  const logout = () => {
    Cookies.remove("token");
    setStudent(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ student, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}