"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Student {
  id: string; student_id: string; full_name: string;
  email: string; role: string; created_at: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/students").then((res) => {
      setStudents(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Students</h1>
        <p className="text-slate-400 mt-1">{students.length} registered students</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Student ID", "Name", "Email", "Role", "Joined"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-3 font-mono text-indigo-400">{s.student_id}</td>
                <td className="px-6 py-3 text-slate-200">{s.full_name}</td>
                <td className="px-6 py-3 text-slate-400">{s.email}</td>
                <td className="px-6 py-3">
                  {s.role === "admin"
                    ? <span className="badge-admin">Admin</span>
                    : <span className="text-slate-500">Student</span>}
                </td>
                <td className="px-6 py-3 text-slate-500">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}