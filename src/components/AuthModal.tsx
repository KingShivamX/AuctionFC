"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Trophy, Lock, ArrowRight, User as UserIcon, Sparkles, LogIn, UserPlus } from "lucide-react";

interface AuthModalProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthModal({ onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [teamName, setTeamName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !pin.trim() || (mode === "register" && !teamName.trim())) {
      setError(mode === "register" ? "Fill in all three fields to create your account." : "Enter your username and PIN to log in.");
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          username: username.trim(),
          ...(mode === "register" ? { teamName: teamName.trim() } : {}),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      localStorage.setItem("auctionfc_token", data.token);
      localStorage.setItem("auctionfc_user", JSON.stringify(data.user));
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="card animate-pop relative w-full max-w-sm overflow-hidden" style={{ background: "var(--panel)" }}>
        <div className="h-1 w-full" style={{ background: "var(--accent)" }} />

        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: "var(--accent)",
                border: "2px solid var(--black)",
                boxShadow: "3px 3px 0 var(--black)",
              }}
            >
              <Trophy className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tight text-white">
                Auction<span style={{ color: "var(--accent)" }}>FC</span>
              </h2>
              <p className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                Fantasy Football Auction
              </p>
            </div>
          </div>

          <p className="text-sm font-medium mb-5" style={{ color: "var(--muted)" }}>
            {mode === "login" ? "Welcome back. Enter your username and PIN." : "Choose a unique username for your auction account."}
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl p-1" style={{ background: "var(--bg)", border: "1.5px solid var(--black)" }}>
            <button type="button" onClick={() => switchMode("login")} className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition-colors" style={{ background: mode === "login" ? "var(--accent)" : "transparent", color: mode === "login" ? "var(--black)" : "var(--muted)" }}>
              <LogIn className="w-3.5 h-3.5" /> LOG IN
            </button>
            <button type="button" onClick={() => switchMode("register")} className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition-colors" style={{ background: mode === "register" ? "var(--accent)" : "transparent", color: mode === "register" ? "var(--black)" : "var(--muted)" }}>
              <UserPlus className="w-3.5 h-3.5" /> REGISTER
            </button>
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold animate-slide-up"
              style={{
                background: "#6f4260",
                border: "1.5px solid var(--black)",
                color: "#10101d",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
                USERNAME
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--accent)" }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. shivam"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="input pl-14"
                />
              </div>
            </div>

            {mode === "register" && <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
                TEAM NAME
              </label>
              <div className="relative">
                <Sparkles className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--accent)" }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Devils FC"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="input pl-14"
                />
              </div>
            </div>}

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
                4-DIGIT PIN
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--accent)" }} />
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                  className="input input-mono pl-14 text-center text-xl tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 py-3 text-sm"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-[var(--ink)] border-r-[var(--accent)] rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "login" ? "Log in to AuctionFC" : "Create account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
