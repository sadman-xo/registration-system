"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { student, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!student || student.role !== "admin")) {
      router.push("/login");
    }
  }, [student, loading, router]);

  if (loading || !student) return null;

  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-white flex items-center gap-2">
              <span>⚙️</span> UniReg Admin
            </Link>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors">
              Courses
            </Link>
            <Link href="/admin/students" className="text-sm text-slate-400 hover:text-white transition-colors">
              Students
            </Link>
            <Link href="/admin/registrations" className="text-sm text-slate-400 hover:text-white transition-colors">
              Registrations
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="badge-admin">Admin</span>
            <button onClick={logout} className="btn-secondary text-sm py-1.5">Sign out</button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}