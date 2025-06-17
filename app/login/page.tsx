"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "../lib/axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/auth/session").then((res) => {
      if (res.data?.user) {
        const role = res.data.user.role;
        router.push(role === "admin" ? "/admin" : "/dashboard");
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await axios.post("/api/login", { email, password });
      const sessionRes = await axios.get("/api/auth/session");
      const role = sessionRes.data.user.role;
      router.push(role === "admin" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <main className="min-h-screen bg-fuchsia-pale flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl w-full max-w-md space-y-4 shadow-lg"
      >
        <h2 className="text-2xl font-bold text-center text-fuchsia-electric">
          Login
        </h2>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-fuchsia-electric"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-fuchsia-electric"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-fuchsia-electric text-white py-2 rounded hover:bg-fuchsia-pale"
        >
          Log In
        </button>
      </form>
    </main>
  );
}
