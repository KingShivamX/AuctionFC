"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { parseToken } from "@/lib/auth";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import Dashboard from "@/components/Dashboard";
import AuctionRoom from "@/components/AuctionRoom";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [, setToken] = useState<string | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("auctionfc_token");
    const savedUserStr = localStorage.getItem("auctionfc_user");

    if (savedToken && savedUserStr) {
      try {
        const parsedUser = JSON.parse(savedUserStr);
        const tokenData = parseToken(savedToken);
        if (tokenData) {
          setUser(parsedUser);
          setToken(savedToken);
        }
      } catch {
        localStorage.removeItem("auctionfc_token");
        localStorage.removeItem("auctionfc_user");
      }
    }

    setInitialized(true);
  }, []);

  const handleAuthSuccess = (authUser: User, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("auctionfc_token");
    localStorage.removeItem("auctionfc_user");
    setUser(null);
    setToken(null);
    setSelectedLeagueId(null);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "var(--ink)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Header
        user={user}
        onLogout={handleLogout}
        onGoHome={() => setSelectedLeagueId(null)}
      />

      <main className="flex-1 pb-12">
        {!user ? (
          <AuthModal onAuthSuccess={handleAuthSuccess} />
        ) : selectedLeagueId ? (
          <AuctionRoom
            leagueId={selectedLeagueId}
            user={user}
            onBackToDashboard={() => setSelectedLeagueId(null)}
          />
        ) : (
          <Dashboard
            user={user}
            onSelectLeague={(id) => setSelectedLeagueId(id)}
          />
        )}
      </main>

      <footer className="py-4 text-center text-xs font-medium" style={{ borderTop: "2px solid var(--black)", color: "var(--muted)" }}>
        AuctionFC © 2026 · Live Fantasy Football Bidding Engine
      </footer>
    </div>
  );
}
