"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Course { id: string; code: string; title: string; credits: number; }
interface Section {
  id: string; section_code: string; instructor: string;
  schedule: string; seats_total: number; seats_remaining: number;
}

export default function AdminPage() {
  const [queueStats, setQueueStats] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Record<string, Section[]>>({});
  const [newCourse, setNewCourse] = useState({ code: "", title: "", credits: 3 });
  const [newSection, setNewSection] = useState({
    course_id: "", section_code: "", instructor: "", schedule: "", seats_total: 30,
  });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchQueueStats = () => {
    api.get("/queue/admin/stats").then((res) => setQueueStats(res.data));
  };


  const fetchCourses = () => {
    api.get("/courses/").then((res) => setCourses(res.data));
  };

  useEffect(() => {
    fetchCourses();
    fetchQueueStats();
  }, []);
  // useEffect(() => { fetchCourses(); }, []);

  const openRegistration = async () => {
    await api.post("/queue/admin/open");
    fetchQueueStats();
  };

  const closeRegistration = async () => {
    await api.post("/queue/admin/close");
    fetchQueueStats();
  };

  const loadSections = async (courseId: string) => {
    const res = await api.get(`/courses/${courseId}/sections`);
    setSections((prev) => ({ ...prev, [courseId]: res.data }));
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/courses", newCourse);
      setMessage({ text: "Course created!", type: "success" });
      setNewCourse({ code: "", title: "", credits: 3 });
      fetchCourses();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || "Failed", type: "error" });
    }
  };

  const createSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/sections", { ...newSection, seats_total: Number(newSection.seats_total) });
      setMessage({ text: "Section created!", type: "success" });
      loadSections(newSection.course_id);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || "Failed", type: "error" });
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      fetchCourses();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || "Failed", type: "error" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Course Management</h1>
        <p className="text-slate-400 mt-1">Create and manage courses and sections</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          message.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Course */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Add Course</h2>
          <form onSubmit={createCourse} className="space-y-3">
            <input className="input" placeholder="Code (e.g. CSE301)"
              value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} required />
            <input className="input" placeholder="Title"
              value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} required />
            <input className="input" type="number" placeholder="Credits" min={1} max={6}
              value={newCourse.credits} onChange={(e) => setNewCourse({ ...newCourse, credits: Number(e.target.value) })} required />
            <button type="submit" className="btn-primary w-full">Create Course</button>
          </form>
        </div>

        {/* Create Section */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Add Section</h2>
          <form onSubmit={createSection} className="space-y-3">
            <select className="input" value={newSection.course_id}
              onChange={(e) => { setNewSection({ ...newSection, course_id: e.target.value }); loadSections(e.target.value); }} required>
              <option value="">Select course...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
            <input className="input" placeholder="Section code (A, B, C...)"
              value={newSection.section_code} onChange={(e) => setNewSection({ ...newSection, section_code: e.target.value })} required />
            <input className="input" placeholder="Instructor"
              value={newSection.instructor} onChange={(e) => setNewSection({ ...newSection, instructor: e.target.value })} required />
            <input className="input" placeholder="Schedule (e.g. Mon/Wed 9:00-10:30)"
              value={newSection.schedule} onChange={(e) => setNewSection({ ...newSection, schedule: e.target.value })} required />
            <input className="input" type="number" placeholder="Total seats" min={1}
              value={newSection.seats_total} onChange={(e) => setNewSection({ ...newSection, seats_total: Number(e.target.value) })} required />
            <button type="submit" className="btn-primary w-full">Create Section</button>
          </form>
        </div>
      </div>
      {/* Queue Control Panel */}
{queueStats && (
  <div className="card mb-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-white">Registration Window</h2>
      <span className={queueStats.open ? "badge-open" : "badge-full"}>
        {queueStats.open ? "OPEN" : "CLOSED"}
      </span>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="bg-slate-800 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-white">{queueStats.queue_length}</div>
        <div className="text-slate-500 text-xs mt-1">In Queue</div>
      </div>
      <div className="bg-slate-800 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-white">{queueStats.processing}</div>
        <div className="text-slate-500 text-xs mt-1">Processing</div>
      </div>
      <div className="bg-slate-800 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-white">{queueStats.batch_size}</div>
        <div className="text-slate-500 text-xs mt-1">Batch Size</div>
      </div>
    </div>

    <div className="flex gap-3">
      <button onClick={openRegistration} className="btn-primary flex-1">
        Open Registration
      </button>
      <button onClick={closeRegistration} className="btn-danger flex-1">
        Close Registration
      </button>
    </div>
  </div>
)}
      {/* Course list */}
      <div>
        <h2 className="font-semibold text-white mb-4">All Courses ({courses.length})</h2>
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-indigo-400 font-semibold text-sm">{course.code}</span>
                  <span className="font-medium text-white">{course.title}</span>
                  <span className="text-slate-500 text-sm">{course.credits} credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => loadSections(course.id)} className="btn-secondary text-sm py-1.5">
                    View Sections
                  </button>
                  <button onClick={() => deleteCourse(course.id)} className="btn-danger text-sm py-1.5">
                    Delete
                  </button>
                </div>
              </div>

              {sections[course.id] && (
                <div className="border-t border-slate-800 divide-y divide-slate-800">
                  {sections[course.id].map((s) => (
                    <div key={s.id} className="px-6 py-3 flex items-center justify-between text-sm">
                      <div className="text-slate-300">
                        Section {s.section_code} · {s.instructor} · {s.schedule}
                      </div>
                      <div className="flex items-center gap-3">
                        {s.seats_remaining > 0
                          ? <span className="badge-open">{s.seats_remaining}/{s.seats_total} seats</span>
                          : <span className="badge-full">Full</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}