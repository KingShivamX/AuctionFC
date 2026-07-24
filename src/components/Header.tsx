"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { sound } from "@/lib/sound";
import { Trophy, Volume2, VolumeX, LogOut } from "lucide-react";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onGoHome?: () => void;
}

export default function Header({ user, onLogout, onGoHome }: HeaderProps) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sound.getMuted());
  }, []);

  const handleToggleMute = () => {
    const isMuted = sound.toggleMute();
    setMuted(isMuted);
  };

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "var(--panel)",
        borderBottom: "2px solid var(--black)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2.5 group focus:outline-none"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--accent)",
              border: "2px solid var(--black)",
              boxShadow: "2px 2px 0 var(--black)",
            }}
          >
            <Trophy className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-lg tracking-tight text-white">
              Auction<span style={{ color: "var(--accent)" }}>FC</span>
            </span>
            <span
              className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
              style={{
                background: "var(--ink)",
                border: "1px solid var(--black)",
                color: "var(--accent)",
              }}
            >
              Live
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            title={muted ? "Unmute" : "Mute"}
            className="btn-secondary !p-2 !px-2"
          >
            {muted
              ? <VolumeX className="w-4 h-4" style={{ color: "#ffd0e1" }} />
              : <Volume2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            }
          </button>

          {user && (
            <div
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
              style={{
                background: "var(--panel-raised)",
                border: "1.5px solid var(--black)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--ink)",
                  border: "1.5px solid var(--black)",
                }}
              >
                <span className="text-[10px] font-black" style={{ color: "var(--accent)" }}>
                  {user.teamName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-bold text-white">{user.teamName}</p>
                <p className="text-[10px]" style={{ color: "var(--muted)" }}>@{user.username}</p>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ffd0e1")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
