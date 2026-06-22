"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Section {
  id: string;
  section_code: string;
  instructor: string;
  schedule: string;
  seats_total: number;
  seats_remaining: number;
}

interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  sections?: Section[];
  expanded?: boolean;
}

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    api.get("/courses/").then((res) => {
      setCourses(res.data);
      setLoading(false);
    });
  }, []);

  const toggleSections = async (course: Course) => {
    if (course.sections) {
      setCourses((prev) =>
        prev.map((c) => c.id === course.id ? { ...c, expanded: !c.expanded } : c)
      );
      return;
    }

    const res = await api.get(`/courses/${course.id}/sections`);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === course.id ? { ...c, sections: res.data, expanded: true } : c
      )
    );
  };

  const enroll = async (sectionId: string) => {
    setEnrolling(sectionId);
    setMessage(null);
    try {
      await api.post("/enrollment/enroll", { section_id: sectionId });
      setMessage({ text: "Enrolled successfully!", type: "success" });
      // Refresh sections to show updated seat count
      setCourses((prev) => prev.map((c) => ({ ...c, sections: undefined, expanded: false })));
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || "Enrollment failed", type: "error" });
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading courses...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Course Catalog</h1>
        <p className="text-slate-400 mt-1">Browse and enroll in available courses</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
          message.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {courses.map((course) => (
          <div key={course.id} className="card p-0 overflow-hidden">
            {/* Course header */}
            <button
              onClick={() => toggleSections(course)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-indigo-400 font-semibold text-sm">
                  {course.code}
                </span>
                <span className="font-medium text-white">{course.title}</span>
                <span className="text-slate-500 text-sm">{course.credits} credits</span>
              </div>
              <span className="text-slate-500 text-sm">
                {course.expanded ? "▲" : "▼"} Sections
              </span>
            </button>

            {/* Sections */}
            {course.expanded && course.sections && (
              <div className="border-t border-slate-800 divide-y divide-slate-800">
                {course.sections.length === 0 ? (
                  <div className="px-6 py-4 text-slate-500 text-sm">
                    No sections available
                  </div>
                ) : (
                  course.sections.map((section) => (
                    <div
                      key={section.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-200">
                            Section {section.section_code}
                          </span>
                          {section.seats_remaining > 0 ? (
                            <span className="badge-open">
                              {section.seats_remaining} seats left
                            </span>
                          ) : (
                            <span className="badge-full">Full</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          {section.instructor} · {section.schedule}
                        </div>
                      </div>

                      <button
                        onClick={() => enroll(section.id)}
                        disabled={section.seats_remaining === 0 || enrolling === section.id}
                        className="btn-primary text-sm py-1.5 ml-4"
                      >
                        {enrolling === section.id ? "Enrolling..." : "Enroll"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}