"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Registration {
  id: string;
  registered_at: string;
  status: string;
  students: { student_id: string; full_name: string; email: string };
  sections: { section_code: string; courses: { code: string; title: string } };
}

export default function AdminRegistrationsPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState<string | null>(null);

  const fetchRegs = () => {
    api.get("/admin/registrations").then((res) => {
      setRegs(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchRegs(); }, []);

  const forceDrop = async (id: string) => {
    if (!confirm("Force-drop this registration?")) return;
    setDropping(id);
    try {
      await api.delete(`/admin/registrations/${id}`);
      fetchRegs();
    } finally {
      setDropping(null);
    }
  };

  if (loading) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Registrations</h1>
        <p className="text-slate-400 mt-1">{regs.length} total enrollments</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Student", "Course", "Section", "Status", "Date", ""].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {regs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-3">
                  <div className="text-slate-200">{r.students?.full_name}</div>
                  <div className="text-slate-500 text-xs">{r.students?.student_id}</div>
                </td>
                <td className="px-6 py-3">
                  <span className="font-mono text-indigo-400">{r.sections?.courses?.code}</span>
                  <span className="text-slate-400 ml-2">{r.sections?.courses?.title}</span>
                </td>
                <td className="px-6 py-3 text-slate-400">Section {r.sections?.section_code}</td>
                <td className="px-6 py-3">
                  <span className="badge-open">{r.status}</span>
                </td>
                <td className="px-6 py-3 text-slate-500">
                  {new Date(r.registered_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => forceDrop(r.id)}
                    disabled={dropping === r.id}
                    className="btn-danger text-xs py-1"
                  >
                    Force Drop
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}