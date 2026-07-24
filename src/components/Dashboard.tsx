"use client";

import { useState, useEffect } from "react";
import { User, League } from "@/lib/types";
import CreateLeagueModal from "./CreateLeagueModal";
import { Trophy, Plus, LogIn, Users, ArrowRight } from "lucide-react";

interface DashboardProps {
  user: User;
  onSelectLeague: (leagueId: string) => void;
}

const STATUS_CONFIG = {
  live: { label: "LIVE", bg: "var(--accent)", border: "var(--black)", color: "var(--ink)" },
  draft: { label: "DRAFT", bg: "var(--panel-raised)", border: "var(--black)", color: "var(--text)" },
  completed: { label: "DONE", bg: "var(--ink)", border: "var(--black)", color: "var(--muted)" },
};

export default function Dashboard({ user, onSelectLeague }: DashboardProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leagues?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setLeagues(data.leagues || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, [user.id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinLoading(true);
    setJoinError("");

    try {
      const res = await fetch("/api/leagues", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueCode: joinCode.trim().toUpperCase(), user }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "League not found");
      onSelectLeague(data.league.id);
    } catch (err: any) {
      setJoinError(err.message || "Failed to join league");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div
        className="card overflow-hidden"
        style={{ background: "var(--panel)" }}
      >
        <div className="h-1 w-full" style={{ background: "var(--accent)" }} />
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <p className="text-xs font-bold mb-1.5" style={{ color: "var(--accent)", letterSpacing: "0.1em" }}>
              WELCOME BACK
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {user.teamName}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              @{user.username} - Ready to bid?
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-sm py-3 px-6 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create League
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-3" style={{ color: "var(--muted)", letterSpacing: "0.1em" }}>
          JOIN WITH CODE
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter 6-char code (e.g. AFC123)"
            maxLength={6}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            className="input input-mono flex-1 tracking-widest text-sm"
          />
          <button
            type="submit"
            disabled={joinLoading || !joinCode.trim()}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">{joinLoading ? "Joining..." : "Join"}</span>
          </button>
        </form>
        {joinError && (
          <p className="mt-2 text-xs font-semibold" style={{ color: "#ffd0e1" }}>{joinError}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold" style={{ color: "var(--muted)", letterSpacing: "0.1em" }}>
            YOUR LEAGUES - {leagues.length}
          </p>
          <button
            onClick={fetchLeagues}
            className="text-xs font-semibold transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
          >
            Refresh <span aria-hidden="true">→</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-44 rounded-2xl"
                style={{ background: "var(--panel)", border: "2px solid var(--black)" }}
              />
            ))}
          </div>
        ) : leagues.length === 0 ? (
          <div
            className="flex flex-col items-center py-16 rounded-3xl text-center card"
            style={{ background: "var(--panel-raised)", borderStyle: "dashed" }}
          >
            <Trophy className="w-10 h-10 mb-3" style={{ color: "var(--muted)" }} />
            <h3 className="font-bold text-white mb-1">No leagues yet</h3>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              Create one or join a friend&apos;s league with a code.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Create First League
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map(l => {
              const isAdmin = l.adminId === user.id;
              const isLive = l.status === "live";
              const sc = STATUS_CONFIG[l.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;

              return (
                <div
                  key={l.id}
                  onClick={() => onSelectLeague(l.id)}
                  className="card card-hover relative group cursor-pointer overflow-hidden"
                >
                  {isLive && (
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "var(--accent)" }} />
                  )}
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="font-mono font-black text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: "var(--ink)", border: "1.5px solid var(--black)", color: "var(--accent)", letterSpacing: "0.05em" }}
                      >
                        {l.code}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase"
                        style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, color: sc.color }}
                      >
                        {isLive && <span className="live-dot" style={{ width: 6, height: 6 }} />}
                        {sc.label}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-white text-base leading-tight group-hover:text-[var(--accent)] transition-colors">
                        {l.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--muted)" }}>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {l.members?.length || 1} teams
                        </span>
                        <span className="flex items-center gap-1 font-mono" style={{ color: "var(--accent-strong)" }}>
                          <span className="font-bold">₹{l.totalPurse} Cr</span>
                          <span style={{ color: "var(--muted)" }}>purse</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--black)" }}>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        by {l.adminTeamName}{isAdmin ? " - you" : ""}
                      </span>
                      <span className="text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "var(--accent)" }}>
                        Enter <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateLeagueModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onLeagueCreated={newLeague => {
            setShowCreateModal(false);
            onSelectLeague(newLeague.id);
          }}
        />
      )}
    </div>
  );
}
