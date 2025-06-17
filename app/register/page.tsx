"use client";

import { useState } from "react";
import axios from "../lib/axios";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await axios.post("/api/register", { email, password, name });
      router.push("/dashboard"); // or check session.role
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <main className="min-h-screen bg-fuchsia-pale flex items-center justify-center">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded-xl w-full max-w-md space-y-4 shadow-lg"
      >
        <h2 className="text-2xl font-bold text-center text-fuchsia-electric">
          Sign Up
        </h2>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <input
          type="text"
          placeholder="Full Name"
          className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-fuchsia-electric"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          Create Account
        </button>
      </form>
    </main>
  );
}
