"use client"

import { useState } from "react"
import { League, Player, LeagueMember } from "@/lib/types"
import { X, ChevronDown, ChevronUp, Search, UserCheck } from "lucide-react"

const POSITION_COLORS: Record<string, string> = {
    Attacker: "#ff6b87",
    Midfielder: "#00d4ff",
    Defender: "#00ff87",
    Goalkeeper: "#f5d800",
}

interface SquadSidebarProps {
    league: League
    players: Player[]
    currentUserId: string
    isOpen: boolean
    onClose: () => void
    isAdmin: boolean
    onOpenDirectAssign?: (player: Player) => void
    onMarkAsUnsold?: (player: Player) => void
}

export default function SquadSidebar({
    league,
    players,
    currentUserId,
    isOpen,
    onClose,
    isAdmin,
    onOpenDirectAssign,
    onMarkAsUnsold,
}: SquadSidebarProps) {
    const [tab, setTab] = useState<"teams" | "all">("teams")
    const [expanded, setExpanded] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<"all" | "unsold" | "sold">("all")

    if (!isOpen) return null

    const teamStats = (league.members || []).map((m: LeagueMember) => {
        const bought = players.filter(
            (p) => p.soldStatus === "sold" && p.soldToUsername === m.username,
        )
        const spent = bought.reduce((s, p) => s + (p.soldPrice ?? 0), 0)
        return {
            member: m,
            bought,
            spent: Math.round(spent),
            remaining: Math.round(league.totalPurse - spent),
        }
    })

    const filteredPlayers = players.filter((p) => {
        const q = search.toLowerCase()
        const matches =
            p.name.toLowerCase().includes(q) ||
            p.franchise.toLowerCase().includes(q) ||
            p.position.toLowerCase().includes(q)
        if (filter === "unsold") return matches && p.soldStatus === "unsold"
        if (filter === "sold") return matches && p.soldStatus === "sold"
        return matches
    })

    return (
        <>
            {/* Backdrop/Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[59] animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <div
                className="fixed right-0 z-[60] w-full sm:w-96 flex flex-col overflow-hidden"
                style={{
                    top: "56px", // Start below header (header is ~56px tall)
                    bottom: 0,
                    background: "var(--panel)",
                    borderLeft: "2px solid var(--black)",
                    boxShadow: "-6px 0 0 var(--black)",
                }}
            >
                <div
                    className="h-1 w-full"
                    style={{ background: "var(--accent)" }}
                />

                <div
                    className="flex items-center justify-between px-4 py-3.5 border-b"
                    style={{ borderColor: "var(--black)" }}
                >
                    <div
                        className="flex items-center gap-1 p-1 rounded-xl"
                        style={{
                            background: "var(--ink)",
                            border: "1.5px solid var(--black)",
                        }}
                    >
                        {(
                            [
                                ["teams", `Teams (${teamStats.length})`],
                                ["all", `Players (${players.length})`],
                            ] as [string, string][]
                        ).map(([t, label]) => (
                            <button
                                key={t}
                                onClick={() => setTab(t as "teams" | "all")}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{
                                    background:
                                        tab === t
                                            ? "var(--accent)"
                                            : "var(--panel-raised)",
                                    color:
                                        tab === t
                                            ? "var(--ink)"
                                            : "var(--muted)",
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onClose}
                        className="btn-secondary !p-3 !px-3 shrink-0"
                        aria-label="Close sidebar"
                        title="Close"
                        style={{
                            background: "var(--accent)",
                            color: "var(--black)",
                        }}
                    >
                        <X className="w-5 h-5" strokeWidth={3} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {tab === "teams" ? (
                        teamStats.map((ts) => {
                            const isMe = ts.member.userId === currentUserId
                            const open = expanded === ts.member.userId
                            const pct = Math.min(
                                100,
                                (ts.spent / league.totalPurse) * 100,
                            )

                            return (
                                <div
                                    key={ts.member.userId}
                                    className="rounded-2xl overflow-hidden"
                                    style={{
                                        background: isMe
                                            ? "var(--panel-raised)"
                                            : "var(--ink)",
                                        border: `1.5px solid ${isMe ? "var(--accent)" : "var(--black)"}`,
                                        boxShadow: "3px 3px 0 var(--black)",
                                    }}
                                >
                                    <div
                                        onClick={() =>
                                            setExpanded(
                                                open ? null : ts.member.userId,
                                            )
                                        }
                                        className="px-4 py-3.5 flex items-center justify-between cursor-pointer"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-white text-sm truncate">
                                                    {ts.member.teamName}
                                                </p>
                                                {isMe && (
                                                    <span
                                                        className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                                        style={{
                                                            background:
                                                                "var(--accent)",
                                                            color: "var(--ink)",
                                                            border: "1px solid var(--black)",
                                                        }}
                                                    >
                                                        YOU
                                                    </span>
                                                )}
                                            </div>
                                            <p
                                                className="text-[11px] mt-0.5"
                                                style={{
                                                    color: "var(--muted)",
                                                }}
                                            >
                                                @{ts.member.username} -{" "}
                                                {ts.bought.length} players
                                            </p>
                                            <div
                                                className="mt-2 h-1.5 rounded-full overflow-hidden"
                                                style={{
                                                    background: "var(--black)",
                                                    width: "120px",
                                                }}
                                            >
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background:
                                                            pct > 80
                                                                ? "#6f4260"
                                                                : pct > 60
                                                                  ? "var(--accent-strong)"
                                                                  : "var(--accent)",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="text-right ml-3 shrink-0">
                                            <p
                                                className="font-mono font-black text-sm"
                                                style={{
                                                    color: "var(--accent)",
                                                }}
                                            >
                                                ₹{Math.round(ts.remaining)}
                                            </p>
                                            <p
                                                className="text-[10px]"
                                                style={{
                                                    color: "var(--muted)",
                                                }}
                                            >
                                                remaining
                                            </p>
                                            {open ? (
                                                <ChevronUp
                                                    className="w-3.5 h-3.5 mt-1 ml-auto"
                                                    style={{
                                                        color: "var(--muted)",
                                                    }}
                                                />
                                            ) : (
                                                <ChevronDown
                                                    className="w-3.5 h-3.5 mt-1 ml-auto"
                                                    style={{
                                                        color: "var(--muted)",
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {open && (
                                        <div
                                            className="px-4 pb-4 pt-1 space-y-2 border-t"
                                            style={{
                                                borderColor: "var(--black)",
                                            }}
                                        >
                                            {ts.bought.length === 0 ? (
                                                <p
                                                    className="text-xs italic text-center py-3"
                                                    style={{
                                                        color: "var(--muted)",
                                                    }}
                                                >
                                                    No players yet
                                                </p>
                                            ) : (
                                                ts.bought.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                                                        style={{
                                                            background:
                                                                "var(--panel)",
                                                            border: "1px solid var(--black)",
                                                        }}
                                                    >
                                                        <div>
                                                            <p className="font-bold text-white">
                                                                {p.name}
                                                            </p>
                                                            <p
                                                                style={{
                                                                    color:
                                                                        POSITION_COLORS[
                                                                            p
                                                                                .position
                                                                        ] ||
                                                                        "var(--accent)",
                                                                    fontSize: 10,
                                                                }}
                                                            >
                                                                {p.position} -{" "}
                                                                {p.franchise}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p
                                                                className="font-mono font-bold"
                                                                style={{
                                                                    color: "var(--accent-strong)",
                                                                }}
                                                            >
                                                                ₹{p.soldPrice}{" "}
                                                                Cr
                                                            </p>
                                                            {isAdmin && (
                                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                                    {onOpenDirectAssign && (
                                                                        <button
                                                                            onClick={() =>
                                                                                onOpenDirectAssign(
                                                                                    p,
                                                                                )
                                                                            }
                                                                            className="text-[9px] font-semibold"
                                                                            style={{
                                                                                color: "var(--muted)",
                                                                            }}
                                                                            onMouseEnter={(
                                                                                e,
                                                                            ) =>
                                                                                (e.currentTarget.style.color =
                                                                                    "var(--accent)")
                                                                            }
                                                                            onMouseLeave={(
                                                                                e,
                                                                            ) =>
                                                                                (e.currentTarget.style.color =
                                                                                    "var(--muted)")
                                                                            }
                                                                        >
                                                                            Edit
                                                                            /
                                                                            Undo
                                                                        </button>
                                                                    )}
                                                                    {onMarkAsUnsold && (
                                                                        <button
                                                                            onClick={() =>
                                                                                onMarkAsUnsold(
                                                                                    p,
                                                                                )
                                                                            }
                                                                            className="text-[9px] font-semibold"
                                                                            style={{
                                                                                color: "#ff6b87",
                                                                            }}
                                                                            onMouseEnter={(
                                                                                e,
                                                                            ) =>
                                                                                (e.currentTarget.style.color =
                                                                                    "#ff2d55")
                                                                            }
                                                                            onMouseLeave={(
                                                                                e,
                                                                            ) =>
                                                                                (e.currentTarget.style.color =
                                                                                    "#ff6b87")
                                                                            }
                                                                        >
                                                                            Mark
                                                                            Unsold
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: "var(--muted)" }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search player, club..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="input pl-9 text-xs"
                                />
                            </div>

                            <div className="flex gap-1">
                                {(["all", "unsold", "sold"] as const).map(
                                    (f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className="flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
                                            style={{
                                                background:
                                                    filter === f
                                                        ? "var(--accent)"
                                                        : "var(--panel)",
                                                border: "1.5px solid var(--black)",
                                                color:
                                                    filter === f
                                                        ? "var(--ink)"
                                                        : "var(--muted)",
                                            }}
                                        >
                                            {f}
                                        </button>
                                    ),
                                )}
                            </div>

                            <div className="space-y-2">
                                {filteredPlayers.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-3 rounded-2xl text-xs flex items-center justify-between"
                                        style={{
                                            background: "var(--panel)",
                                            border: "1.5px solid var(--black)",
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-white">
                                                    {p.name}
                                                </p>
                                                <span
                                                    style={{
                                                        color:
                                                            POSITION_COLORS[
                                                                p.position
                                                            ] ||
                                                            "var(--accent)",
                                                        fontWeight: 700,
                                                        fontSize: 10,
                                                    }}
                                                >
                                                    {p.position}
                                                </span>
                                            </div>
                                            <p
                                                style={{
                                                    color: "var(--muted)",
                                                    fontSize: 10,
                                                }}
                                                className="mt-0.5"
                                            >
                                                {p.franchise}
                                            </p>
                                            {p.soldStatus === "sold" && (
                                                <p
                                                    style={{
                                                        color: "var(--accent)",
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                    }}
                                                    className="mt-0.5"
                                                >
                                                    {"->"} {p.soldToTeam} - ?
                                                    {p.soldPrice} Cr
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right ml-2 shrink-0">
                                            <p
                                                className="font-mono font-bold"
                                                style={{
                                                    color: "var(--accent-strong)",
                                                    fontSize: 11,
                                                }}
                                            >
                                                ₹{p.soldPrice || p.basePrice} Cr
                                            </p>
                                            {isAdmin && (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {onOpenDirectAssign && (
                                                        <button
                                                            onClick={() =>
                                                                onOpenDirectAssign(
                                                                    p,
                                                                )
                                                            }
                                                            className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                                                            style={{
                                                                border: "1px solid var(--black)",
                                                                color: "var(--muted)",
                                                                background:
                                                                    "var(--ink)",
                                                            }}
                                                            onMouseEnter={(
                                                                e,
                                                            ) => {
                                                                e.currentTarget.style.borderColor =
                                                                    "var(--accent)"
                                                                e.currentTarget.style.color =
                                                                    "var(--accent)"
                                                            }}
                                                            onMouseLeave={(
                                                                e,
                                                            ) => {
                                                                e.currentTarget.style.borderColor =
                                                                    "var(--black)"
                                                                e.currentTarget.style.color =
                                                                    "var(--muted)"
                                                            }}
                                                        >
                                                            <UserCheck className="w-2.5 h-2.5" />
                                                            Trade
                                                        </button>
                                                    )}
                                                    {onMarkAsUnsold &&
                                                        p.soldStatus ===
                                                            "sold" && (
                                                            <button
                                                                onClick={() =>
                                                                    onMarkAsUnsold(
                                                                        p,
                                                                    )
                                                                }
                                                                className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                                                                style={{
                                                                    border: "1px solid var(--black)",
                                                                    color: "#ff6b87",
                                                                    background:
                                                                        "var(--ink)",
                                                                }}
                                                                onMouseEnter={(
                                                                    e,
                                                                ) => {
                                                                    e.currentTarget.style.borderColor =
                                                                        "#ff2d55"
                                                                    e.currentTarget.style.color =
                                                                        "#ff2d55"
                                                                }}
                                                                onMouseLeave={(
                                                                    e,
                                                                ) => {
                                                                    e.currentTarget.style.borderColor =
                                                                        "var(--black)"
                                                                    e.currentTarget.style.color =
                                                                        "#ff6b87"
                                                                }}
                                                            >
                                                                ↻ Unsold
                                                            </button>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
