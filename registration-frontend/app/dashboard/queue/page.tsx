"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

type QueueStatus =
  | "idle"
  | "joining"
  | "waiting"
  | "admitted"
  | "closed"
  | "not_in_queue";

interface StatusResponse {
  status: QueueStatus;
  position?: number;
  estimated_wait_seconds?: number;
  admission_token?: string;
  message?: string;
}

export default function QueuePage() {
  const { student } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<QueueStatus>("idle");
  const [data, setData] = useState<StatusResponse | null>(null);
  const [admissionToken, setAdmissionToken] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get("/queue/status");
        const d: StatusResponse = res.data;
        setData(d);
        setStatus(d.status);

        if (d.status === "admitted" && d.admission_token) {
          setAdmissionToken(d.admission_token);
          stopPolling();
        }

        if (d.status === "closed" || d.status === "not_in_queue") {
          stopPolling();
        }
      } catch (err) {
        console.error("Poll error", err);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const joinQueue = async () => {
    setStatus("joining");
    setError("");
    try {
      const res = await api.post("/queue/join");
      const d = res.data;

      if (d.admitted) {
        setAdmissionToken(d.admission_token);
        setStatus("admitted");
        return;
      }

      setData(d);
      setStatus("waiting");
      startPolling();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to join queue");
      setStatus("idle");
    }
  };

  const enroll = async () => {
    if (!admissionToken || !selectedSection) return;
    setEnrolling(true);
    setError("");
    try {
      await api.post("/enrollment/enroll", {
        section_id: selectedSection,
        admission_token: admissionToken,
      });
      router.push("/dashboard/my-courses");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Enrollment failed");
      setEnrolling(false);
      if (err.response?.status === 403) {
        // Token expired — go back to queue
        setAdmissionToken(null);
        setStatus("idle");
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Registration Queue</h1>
        <p className="text-slate-400 mt-1">
          Join the queue to enroll in your courses
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border bg-red-500/10 border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* IDLE */}
      {status === "idle" && (
        <div className="card text-center py-10">
          <div className="text-5xl mb-4">🎟️</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Ready to Register?
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            Join the waiting room queue. You'll be admitted when it's your turn.
          </p>
          <button onClick={joinQueue} className="btn-primary px-8">
            Join Queue
          </button>
        </div>
      )}

      {/* JOINING */}
      {status === "joining" && (
        <div className="card text-center py-10">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-slate-400">Joining the queue...</p>
        </div>
      )}

      {/* WAITING */}
      {status === "waiting" && data && (
        <div className="card text-center py-10">
          <div className="text-5xl mb-6">🕐</div>
          <div className="text-6xl font-bold text-indigo-400 mb-2">
            #{(data.position ?? 0) + 1}
          </div>
          <p className="text-slate-300 font-medium mb-1">in line</p>
          <p className="text-slate-500 text-sm mb-6">
            Estimated wait:{" "}
            {Math.ceil((data.estimated_wait_seconds ?? 0) / 60)} min
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(5, 100 - ((data.position ?? 0) / 100) * 100)}%`,
              }}
            />
          </div>

          <p className="text-slate-600 text-xs">
            Checking your position every 5 seconds...
          </p>
        </div>
      )}

      {/* ADMITTED */}
      {status === "admitted" && admissionToken && (
        <div className="card">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-semibold text-white mb-1">
              You're Admitted!
            </h2>
            <p className="text-slate-400 text-sm">
              Select a section and enroll. Your token expires in 5 minutes.
            </p>
          </div>

          {/* Token display */}
          <div className="bg-slate-800 rounded-lg px-4 py-3 mb-6 font-mono text-xs text-slate-400 break-all">
            Token: {admissionToken.slice(0, 8)}...
          </div>

          {/* Section ID input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Section ID
              </label>
              <input
                className="input"
                placeholder="Paste section UUID from the catalog"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              />
              <p className="text-slate-600 text-xs mt-1">
                Go to Course Catalog, expand a course, and copy the section ID
              </p>
            </div>

            <button
              onClick={enroll}
              disabled={!selectedSection || enrolling}
              className="btn-primary w-full"
            >
              {enrolling ? "Enrolling..." : "Confirm Enrollment"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="btn-secondary w-full"
            >
              Back to Catalog to find Section ID
            </button>
          </div>
        </div>
      )}

      {/* CLOSED */}
      {status === "closed" && (
        <div className="card text-center py-10">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Registration Closed
          </h2>
          <p className="text-slate-400 text-sm">
            Registration is not currently open. Check back later.
          </p>
        </div>
      )}
    </div>
  );
}