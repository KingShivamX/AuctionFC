"use client";

import { useState } from "react";
import { Player, LeagueMember } from "@/lib/types";
import { X, UserCheck, RotateCcw } from "lucide-react";

interface DirectAssignModalProps {
  player: Player;
  members: LeagueMember[];
  onClose: () => void;
  onAssign: (targetUsername: string, targetTeamName: string, price: number) => void;
  onUndo?: () => void;
}

export default function DirectAssignModal({ player, members, onClose, onAssign, onUndo }: DirectAssignModalProps) {
  const [selected, setSelected] = useState(members[0]?.username || "");
  const [price, setPrice] = useState<number>(player.soldPrice || player.basePrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mem = members.find(m => m.username === selected);
    if (!mem) return;
    onAssign(mem.username, mem.teamName, Number(price));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="card w-full sm:max-w-sm animate-slide-up overflow-hidden" style={{ background: "var(--panel)" }}>
        <div className="h-1 w-full" style={{ background: "var(--accent)" }} />

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="font-black text-white text-base">Direct Trade</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Admin offline assignment</p>
          </div>
          <button onClick={onClose} className="btn-secondary !p-2 !px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="mx-5 mb-4 p-3.5 rounded-2xl flex items-center justify-between"
          style={{ background: "var(--panel-raised)", border: "1.5px solid var(--black)" }}
        >
          <div>
            <p className="font-black text-white">{player.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {player.franchise} - {player.position}
            </p>
          </div>
          <p className="font-mono font-black text-sm" style={{ color: "var(--accent-strong)" }}>
            ₹{player.basePrice} base
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
              ASSIGN TO TEAM
            </label>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="input text-sm"
            >
              {members.map(m => (
                <option key={m.userId} value={m.username}>
                  {m.teamName} (@{m.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
              AGREED PRICE (CR)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              value={price}
              onChange={e => setPrice(parseFloat(e.target.value) || 0.1)}
              className="input input-mono text-sm"
              style={{ color: "var(--accent-strong)", fontWeight: 700 }}
            />
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button type="submit" className="btn-primary w-full justify-center py-3 text-sm">
              <UserCheck className="w-4 h-4" />
              Confirm Assignment
            </button>

            {player.soldStatus === "sold" && onUndo && (
              <button
                type="button"
                onClick={onUndo}
                className="btn-danger w-full justify-center py-3 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Undo - Mark Unsold
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
