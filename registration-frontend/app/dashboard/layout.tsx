"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { student, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !student) {
      router.push("/login");
    }
  }, [student, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-white flex items-center gap-2">
              <span>🎓</span> UniReg
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
              Courses
            </Link>
            <Link href="/dashboard/my-courses" className="text-sm text-slate-400 hover:text-white transition-colors">
              My Courses
            </Link>
            <Link href="/dashboard/queue" className="text-sm text-slate-400 hover:text-white transition-colors">
              Register
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">
              {student.full_name}
            </span>
            {student.role === "admin" && (
              <Link href="/admin" className="badge-admin">Admin Panel</Link>
            )}
            <button onClick={logout} className="btn-secondary text-sm py-1.5">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}