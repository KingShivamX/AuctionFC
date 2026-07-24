"use client";

import { useState, useRef } from "react";
import { PlayerPosition } from "@/lib/types";
import { parsePlayerExcel, downloadSampleExcel } from "@/lib/excel";
import { Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, Info, Trash2, Plus } from "lucide-react";

interface AddPlayersModalProps {
  leagueId: string;
  userId: string;
  onClose: () => void;
  onPlayersAdded: (count: number) => void;
}

type PlayerDraft = {
  srNo: number;
  name: string;
  franchise: string;
  position: PlayerPosition;
  pool: string;
  basePrice: string;
};

const POSITION_OPTIONS: PlayerPosition[] = ["Attacker", "Midfielder", "Defender", "Goalkeeper"];

function makeEmptyPlayer(srNo: number): PlayerDraft {
  return {
    srNo,
    name: "",
    franchise: "",
    position: "Attacker",
    pool: "",
    basePrice: "1",
  };
}

function toDraft(player: Partial<PlayerDraft>, index: number): PlayerDraft {
  return {
    srNo: Number(player.srNo || index + 1),
    name: String(player.name || ""),
    franchise: String(player.franchise || ""),
    position: (player.position as PlayerPosition) || "Attacker",
    pool: String(player.pool || ""),
    basePrice: String(player.basePrice || 1),
  };
}

export default function AddPlayersModal({ leagueId, userId, onClose, onPlayersAdded }: AddPlayersModalProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedPlayers, setParsedPlayers] = useState<PlayerDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setExcelFile(file);
    setParseError("");

    try {
      const buffer = await file.arrayBuffer();
      const players = parsePlayerExcel(buffer);
      setParsedPlayers(players.map((p, index) => toDraft(p as Partial<PlayerDraft>, index)));
      if (players.length === 0) {
        setParseError("No player rows found. Make sure the file uses the correct column headers.");
      }
    } catch (err: any) {
      setParseError(err.message || "Could not parse Excel file.");
      setParsedPlayers([]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const addPlayer = () => {
    setParsedPlayers(players => [...players, makeEmptyPlayer(players.length + 1)]);
  };

  const removePlayer = (index: number) => {
    setParsedPlayers(players => players.filter((_, i) => i !== index).map((player, i) => ({ ...player, srNo: i + 1 })));
  };

  const updatePlayer = (index: number, patch: Partial<PlayerDraft>) => {
    setParsedPlayers(players => players.map((player, i) => (i === index ? { ...player, ...patch } : player)));
  };

  const clearAllPlayers = () => {
    setParsedPlayers([]);
    setExcelFile(null);
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedPlayers.length === 0) {
      setError("Add at least one player.");
      return;
    }

    const normalized = parsedPlayers.map((player, index) => ({
      srNo: index + 1,
      name: player.name.trim(),
      franchise: player.franchise.trim() || "Free Agent",
      position: player.position || "Attacker",
      pool: player.pool.trim() || "Pool A",
      basePrice: Number(player.basePrice),
    }));

    if (normalized.some(player => !player.name || !Number.isFinite(player.basePrice) || player.basePrice <= 0)) {
      setError("Every player needs a name and a valid base price.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("playersJson", JSON.stringify(normalized));
      if (excelFile) formData.append("excelFile", excelFile);

      const res = await fetch(`/api/leagues/${leagueId}/admin`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add players");
      onPlayersAdded(data.count || normalized.length);
    } catch (err: any) {
      setError(err.message || "Could not add players");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="card w-full sm:max-w-4xl animate-slide-up overflow-hidden" style={{ background: "var(--panel)" }}>
        <div className="h-1 w-full" style={{ background: "var(--accent)" }} />

        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Add Players to League</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Upload Excel files or add players manually
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary !p-2 !px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#6f4260", border: "1.5px solid var(--black)", color: "#ffd0e1" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                  <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                  PLAYER EXCEL SHEET
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={addPlayer}
                    className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    <Plus className="w-3 h-3" />
                    Add player
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    <Download className="w-3 h-3" />
                    Download Sample
                  </button>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className="relative flex flex-col items-center justify-center py-8 rounded-2xl cursor-pointer transition-all"
                style={{
                  background: isDragging ? "var(--panel-raised)" : "var(--ink)",
                  border: `2px solid ${isDragging ? "var(--accent)" : "var(--black)"}`,
                  boxShadow: isDragging ? "0 0 0 3px var(--accent-strong)" : "none",
                }}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                {excelFile ? (
                  <div className="flex items-center gap-2.5 animate-slide-up">
                    <CheckCircle2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{excelFile.name}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{parsedPlayers.length} players loaded</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-7 h-7 mb-2" style={{ color: "var(--muted)" }} />
                    <p className="text-sm font-semibold text-white">Drop Excel file here, or click</p>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>.xlsx .xls .csv</p>
                  </>
                )}
              </div>

              {parseError && (
                <div className="mt-2 flex items-start gap-2 text-xs" style={{ color: "var(--accent-strong)" }}>
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{parseError} Add players manually if needed.</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 gap-3">
                <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
                  PLAYERS TO ADD - {parsedPlayers.length} TOTAL
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearAllPlayers}
                    className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete all
                  </button>
                  {parsedPlayers.length > 0 && <span className="tag tag-green">Ready</span>}
                </div>
              </div>

              {parsedPlayers.length > 0 ? (
                <div
                  className="rounded-2xl overflow-auto"
                  style={{ border: "1.5px solid var(--black)", maxHeight: "320px" }}
                >
                  <table className="w-full min-w-[760px] text-xs">
                    <thead>
                      <tr style={{ background: "var(--panel-raised)", borderBottom: "1px solid var(--black)" }}>
                        <th className="text-left px-3 py-2 font-bold" style={{ color: "var(--muted)" }}>#</th>
                        <th className="text-left px-3 py-2 font-bold" style={{ color: "var(--muted)" }}>PLAYER</th>
                        <th className="text-left px-3 py-2 font-bold" style={{ color: "var(--muted)" }}>POSITION</th>
                        <th className="text-right px-3 py-2 font-bold" style={{ color: "var(--muted)" }}>BASE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPlayers.map((p, idx) => (
                        <tr key={`${p.name || "player"}-${idx}`} className="table-row-hover" style={{ borderBottom: "1px solid var(--black)" }}>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--muted)" }}>
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={p.name}
                              onChange={e => updatePlayer(idx, { name: e.target.value })}
                              placeholder="Player name"
                              className="input text-sm mb-2"
                            />
                            <input
                              value={p.franchise}
                              onChange={e => updatePlayer(idx, { franchise: e.target.value })}
                              placeholder="Franchise / club"
                              className="input text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={p.position}
                              onChange={e => updatePlayer(idx, { position: e.target.value as PlayerPosition })}
                              className="input text-xs"
                            >
                              {POSITION_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <input
                              value={p.pool}
                              onChange={e => updatePlayer(idx, { pool: e.target.value })}
                              placeholder="Pool"
                              className="input text-xs mt-2"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: "var(--accent-strong)" }}>
                            <div className="flex items-center justify-end gap-2">
                              <input
                                value={p.basePrice}
                                onChange={e => updatePlayer(idx, { basePrice: e.target.value })}
                                placeholder="1"
                                className="input input-mono text-right text-xs"
                                style={{ maxWidth: "88px" }}
                              />
                              <button
                                type="button"
                                onClick={() => removePlayer(idx)}
                                className="p-1 rounded-md"
                                style={{ color: "var(--muted)", background: "var(--ink)", border: "1px solid var(--black)" }}
                                title="Delete player"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl p-5 text-center" style={{ background: "var(--ink)", border: "1.5px solid var(--black)" }}>
                  <p className="text-sm font-semibold text-white">No players added yet.</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    Upload a spreadsheet or click Add player to build manually.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
              <button type="submit" disabled={loading || parsedPlayers.length === 0} className="btn-primary text-sm">
                {loading ? <span className="w-4 h-4 border-2 border-[var(--ink)] border-r-[var(--accent)] rounded-full animate-spin" /> : `Add ${parsedPlayers.length} Players ->`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
