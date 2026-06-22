"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    student_id: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/students/register", form);
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Register as a new student</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: "student_id", label: "Student ID", placeholder: "2021-1234" },
              { name: "full_name", label: "Full Name", placeholder: "Sadman Sakib" },
              { name: "email", label: "Email", placeholder: "you@university.edu" },
              { name: "password", label: "Password", placeholder: "••••••••", type: "password" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type || "text"}
                  name={field.name}
                  className="input"
                  placeholder={field.placeholder}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}