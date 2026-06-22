"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

interface Registration {
  id: string;
  section_id: string;  
  registered_at: string;
  status: string;
  sections: {
    section_code: string;
    instructor: string;
    schedule: string;
    courses: {
      code: string;
      title: string;
      credits: number;
    };
  };
}

export default function MyCoursesPage() {
  const { student } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState<string | null>(null);

  const fetchRegistrations = () => {
    if (!student) return;
    api.get("/students/me/registrations").then((res) => {
      setRegistrations(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchRegistrations();
  }, [student]);

  const drop = async (sectionId: string) => {
    setDropping(sectionId);
    try {
        await api.post("/enrollment/drop", { section_id: sectionId });
        fetchRegistrations();
    } catch (err: any) {
        alert(err.response?.data?.detail || "Drop failed");
    } finally {
        setDropping(null);
    }
};

  if (loading) return <div className="text-slate-400">Loading...</div>;

  const totalCredits = registrations.reduce(
    (sum, r) => sum + (r.sections?.courses?.credits || 0),
    0
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Courses</h1>
          <p className="text-slate-400 mt-1">
            {registrations.length} course{registrations.length !== 1 ? "s" : ""} · {totalCredits} total credits
          </p>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-slate-400">You haven't enrolled in any courses yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => (
            <div key={reg.id} className="card flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-indigo-400 font-semibold text-sm">
                    {reg.sections?.courses?.code}
                  </span>
                  <span className="font-medium text-white">
                    {reg.sections?.courses?.title}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {reg.sections?.courses?.credits} credits
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  Section {reg.sections?.section_code} · {reg.sections?.instructor} · {reg.sections?.schedule}
                </div>
                <div className="text-xs text-slate-600">
                  Enrolled {new Date(reg.registered_at).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => drop(reg.section_id)}
                disabled={dropping !== null}
                className="btn-danger text-sm py-1.5 ml-4"
            >
                {dropping === reg.section_id ? "Dropping..." : "Drop"}
            </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}