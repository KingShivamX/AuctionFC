"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { User, League, Player, Bid } from "@/lib/types"
import { sound } from "@/lib/sound"
import SquadSidebar from "./SquadSidebar"
import DirectAssignModal from "./DirectAssignModal"
import AddPlayersModal from "./AddPlayersModal"
import confetti from "canvas-confetti"
import {
    ArrowLeft,
    Play,
    Shuffle,
    Pause,
    Clock,
    Zap,
    Award,
    AlertCircle,
    CheckCircle,
    Users,
    TrendingUp,
    RefreshCw,
    UserPlus,
} from "lucide-react"

const POSITION_COLORS: Record<string, string> = {
    Attacker: "#ff6b87",
    Midfielder: "#00d4ff",
    Defender: "#00ff87",
    Goalkeeper: "#f5d800",
}

interface AuctionRoomProps {
    leagueId: string
    user: User
    onBackToDashboard: () => void
}

export default function AuctionRoom({
    leagueId,
    user,
    onBackToDashboard,
}: AuctionRoomProps) {
    const [league, setLeague] = useState<League | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [activePlayer, setActivePlayer] = useState<Player | null>(null)
    const [activeBids, setActiveBids] = useState<Bid[]>([])
    const [loading, setLoading] = useState(true)
    const [biddingLoading, setBiddingLoading] = useState(false)
    const [customBid, setCustomBid] = useState("")
    const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(
        null,
    )
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [directAssignTarget, setDirectAssignTarget] = useState<Player | null>(
        null,
    )
    const [showAddPlayersModal, setShowAddPlayersModal] = useState(false)
    const [timeLeft, setTimeLeft] = useState(0)
    const [timerKey, setTimerKey] = useState(0) // key to re-animate countdown

    const lastAnnouncedId = useRef<string | null>(null)
    const lastHighBidId = useRef<string | null>(null)
    const countdownSpoken = useRef<Set<number>>(new Set())

    const isAdmin = league?.adminId === user.id

    const showToast = (text: string, ok = false) => {
        setToast({ text, ok })
        setTimeout(() => setToast(null), 3200)
    }

    const fetchState = useCallback(async () => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}`)
            if (!res.ok) return
            const data = await res.json()
            setLeague(data.league)
            setPlayers(data.players || [])
            setActivePlayer(data.activePlayer || null)
            setActiveBids(data.activeBids || [])

            // Audio: new player
            if (
                data.activePlayer &&
                data.activePlayer.id !== lastAnnouncedId.current
            ) {
                lastAnnouncedId.current = data.activePlayer.id
                countdownSpoken.current.clear()
                setTimerKey((k) => k + 1)
                sound.announcePlayerEntrance(
                    data.activePlayer.name,
                    data.activePlayer.franchise,
                    data.activePlayer.position,
                    data.activePlayer.basePrice,
                )
            }
            // Audio: new top bid
            if (data.activeBids?.length > 0) {
                const topBid = data.activeBids[0]
                if (topBid.id !== lastHighBidId.current) {
                    lastHighBidId.current = topBid.id
                    sound.announceBid()
                }
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false)
        }
    }, [leagueId])

    const handleFinalize = useCallback(
        async (playerId: string) => {
            try {
                const res = await fetch(`/api/leagues/${leagueId}/admin`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "finalize_sold",
                        targetPlayerId: playerId,
                        userId: user.id,
                    }),
                })
                const data = await res.json()
                if (res.ok && data.res) {
                    const { player, soldTo, amount } = data.res
                    if (soldTo && amount) {
                        confetti({
                            particleCount: 90,
                            spread: 70,
                            origin: { y: 0.65 },
                            colors: ["#a9b7ff", "#f5f6ff", "#c8d1ff"],
                        })
                        sound.announceSold(player.name, soldTo, amount)
                    } else {
                        sound.announceUnsold(player.name)
                    }
                }
                fetchState()
            } catch {
                /* A subsequent poll will refresh the room state. */
            }
        },
        [fetchState, leagueId, user.id],
    )

    useEffect(() => {
        fetchState()
        const id = setInterval(fetchState, 1000)
        return () => clearInterval(id)
    }, [fetchState])

    // Timer
    useEffect(() => {
        if (!league?.timerEnd || league.isPaused || !activePlayer) {
            setTimeLeft(0)
            return
        }
        const tick = () => {
            const secs = Math.max(
                0,
                Math.ceil((league.timerEnd! - Date.now()) / 1000),
            )
            setTimeLeft(secs)
            if (secs <= 3 && secs > 0 && !countdownSpoken.current.has(secs)) {
                countdownSpoken.current.add(secs)
                sound.announceCountdown(secs)
            }
            if (secs === 0 && isAdmin && activePlayer.soldStatus === "live") {
                handleFinalize(activePlayer.id)
            }
        }
        tick()
        const id = setInterval(tick, 500)
        return () => clearInterval(id)
    }, [
        league?.timerEnd,
        league?.isPaused,
        activePlayer,
        handleFinalize,
        isAdmin,
    ])

    const topBid = activeBids[0] || null
    const currentHighest = topBid
        ? topBid.amount
        : (activePlayer?.basePrice ?? 0)

    const myPlayers = players.filter(
        (p) => p.soldStatus === "sold" && p.soldToUsername === user.username,
    )
    const mySpent = myPlayers.reduce((s, p) => s + (p.soldPrice ?? 0), 0)
    const myPurse = (league?.totalPurse ?? 100) - mySpent

    const handleBid = async (amount: number) => {
        if (!activePlayer || biddingLoading) return
        setBiddingLoading(true)
        try {
            const res = await fetch(`/api/leagues/${leagueId}/bid`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playerId: activePlayer.id,
                    amount,
                    user,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                showToast(data.error || "Bid rejected", false)
                fetchState()
            } else {
                showToast(`Bid ₹${amount} Cr placed!`, true)
                setCustomBid("")
                fetchState()
            }
        } catch {
            showToast("Network error — try again", false)
        } finally {
            setBiddingLoading(false)
        }
    }

    const adminAction = async (payload: any) => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}/admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, userId: user.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            fetchState()
        } catch (err: any) {
            showToast(err.message || "Action failed", false)
        }
    }

    const timerPct = league?.timerEnd
        ? Math.max(0, Math.min(100, (timeLeft / 15) * 100))
        : 0
    const timerColor =
        timeLeft <= 3 ? "#ff2d55" : timeLeft <= 7 ? "#f5d800" : "#00ff87"

    const unsoldPlayers = players.filter((p) => p.soldStatus === "unsold")

    if (loading || !league) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div
                        className="w-10 h-10 mx-auto rounded-full border-2 animate-spin"
                        style={{
                            borderColor: "var(--accent)",
                            borderTopColor: "var(--ink)",
                        }}
                    />
                    <p
                        className="text-sm font-semibold"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                        Loading live room…
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 animate-fade-in">
            {/* Top bar */}
            <div
                className="flex items-center justify-between p-3 rounded-2xl gap-3"
                style={{
                    background: "var(--panel)",
                    border: "1.5px solid var(--black)",
                }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={onBackToDashboard}
                        className="btn-secondary !p-2 !px-2 shrink-0"
                        style={{ borderRadius: "10px" }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="font-black text-white text-sm sm:text-base truncate">
                                {league.name}
                            </h1>
                            <span
                                className="font-mono font-black text-[10px] px-2 py-0.5 rounded-md shrink-0"
                                style={{
                                    background: "rgba(0,212,255,0.10)",
                                    border: "1.5px solid rgba(0,212,255,0.25)",
                                    color: "#00d4ff",
                                }}
                            >
                                {league.code}
                            </span>
                        </div>
                        <p
                            className="text-xs mt-0.5"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                            Purse left:{" "}
                            <span
                                className="font-bold font-mono"
                                style={{ color: "#f5d800" }}
                            >
                                ₹{myPurse.toFixed(1)} Cr
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.2)" }}>
                                {" "}
                                · {myPlayers.length} players bought
                            </span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="btn-secondary text-xs shrink-0 !gap-1.5"
                >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Squads</span>
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold animate-slide-up"
                    style={{
                        background: toast.ok
                            ? "rgba(0,255,135,0.10)"
                            : "rgba(255,45,85,0.10)",
                        border: `1.5px solid ${toast.ok ? "rgba(0,255,135,0.35)" : "rgba(255,45,85,0.35)"}`,
                        color: toast.ok ? "#00ff87" : "#ff6b87",
                    }}
                >
                    {toast.ok ? (
                        <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    {toast.text}
                </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT — Auction Stage (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                    {!activePlayer ? (
                        /* Waiting State */
                        <div
                            className="flex flex-col items-center justify-center py-16 rounded-3xl text-center gap-5"
                            style={{
                                background: "var(--panel)",
                                border: "2px solid var(--black)",
                                boxShadow: "4px 4px 0 var(--black)",
                            }}
                        >
                            <div
                                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                                style={{
                                    background: "var(--ink)",
                                    border: "2px solid var(--black)",
                                    boxShadow: "4px 4px 0 var(--black)",
                                }}
                            >
                                <Award
                                    className="w-9 h-9"
                                    style={{ color: "var(--accent)" }}
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    Auction Block Ready
                                </h3>
                                <p
                                    className="text-sm mt-1 max-w-xs mx-auto"
                                    style={{ color: "rgba(255,255,255,0.4)" }}
                                >
                                    {isAdmin
                                        ? "Start the auction to launch the first player."
                                        : "Waiting for the admin to start bidding…"}
                                </p>
                            </div>
                            {isAdmin && (
                                <div className="flex flex-wrap gap-3 justify-center">
                                    <button
                                        onClick={() =>
                                            adminAction({
                                                action: "next_player",
                                            })
                                        }
                                        className="btn-primary text-sm"
                                    >
                                        <Play className="w-4 h-4 fill-black" />{" "}
                                        Start Auction
                                    </button>
                                    <button
                                        onClick={() =>
                                            adminAction({ action: "shuffle" })
                                        }
                                        className="btn-secondary text-sm"
                                    >
                                        <Shuffle className="w-4 h-4" /> Shuffle
                                        Pool
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* LIVE PLAYER CARD */
                        <div
                            className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
                            style={{
                                background: "var(--ink)",
                                border: "2px solid var(--black)",
                                boxShadow: "4px 4px 0 var(--black)",
                            }}
                        >
                            {/* Timer bar */}
                            <div className="timer-bar-track mb-5">
                                <div
                                    className="timer-bar-fill"
                                    style={{
                                        width: `${timerPct}%`,
                                        background: timerColor,
                                    }}
                                />
                            </div>

                            {/* Status row */}
                            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="live-dot" />
                                    <span
                                        className="text-xs font-black uppercase tracking-widest"
                                        style={{ color: "#ff6b87" }}
                                    >
                                        Now on block
                                    </span>
                                </div>
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-black text-sm"
                                    style={{
                                        background:
                                            timeLeft <= 3
                                                ? "#6f4260"
                                                : "var(--panel-raised)",
                                        border: "1.5px solid var(--black)",
                                        color: timerColor,
                                    }}
                                >
                                    <Clock className="w-4 h-4" />
                                    <span
                                        key={timerKey + timeLeft}
                                        className="animate-countdown"
                                    >
                                        {league.isPaused
                                            ? "PAUSED"
                                            : `${timeLeft}s`}
                                    </span>
                                </div>
                            </div>

                            {/* Player info */}
                            <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                                {/* Avatar */}
                                <div
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex flex-col items-center justify-center text-center shrink-0"
                                    style={{
                                        background: "var(--panel)",
                                        border: "2px solid var(--black)",
                                        boxShadow: "4px 4px 0 var(--black)",
                                    }}
                                >
                                    <span
                                        className="text-3xl font-black"
                                        style={{
                                            color:
                                                POSITION_COLORS[
                                                    activePlayer.position
                                                ] || "#00ff87",
                                        }}
                                    >
                                        #{activePlayer.srNo}
                                    </span>
                                    <span
                                        className="text-[9px] font-bold mt-1 uppercase tracking-widest"
                                        style={{
                                            color: "rgba(255,255,255,0.35)",
                                        }}
                                    >
                                        No.
                                    </span>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span
                                            className="tag"
                                            style={{
                                                background: `rgba(${POSITION_COLORS[activePlayer.position] === "#ff6b87" ? "255,107,135" : "100,200,100"},0.12)`,
                                                borderColor: `${POSITION_COLORS[activePlayer.position] || "#00ff87"}50`,
                                                color:
                                                    POSITION_COLORS[
                                                        activePlayer.position
                                                    ] || "#00ff87",
                                            }}
                                        >
                                            {activePlayer.position}
                                        </span>
                                        <span className="tag tag-dim">
                                            {activePlayer.pool}
                                        </span>
                                    </div>

                                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none">
                                        {activePlayer.name}
                                    </h2>
                                    <p
                                        className="text-sm mt-1.5"
                                        style={{
                                            color: "rgba(255,255,255,0.45)",
                                        }}
                                    >
                                        {activePlayer.franchise}
                                    </p>
                                    <p
                                        className="text-xs mt-1 font-mono font-semibold"
                                        style={{
                                            color: "rgba(255,255,255,0.3)",
                                        }}
                                    >
                                        Base price:{" "}
                                        <span
                                            style={{
                                                color: "var(--accent-strong)",
                                            }}
                                        >
                                            ₹{activePlayer.basePrice.toFixed(1)}{" "}
                                            Cr
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Highest bid spotlight */}
                            <div
                                className="p-4 rounded-2xl mb-5 flex items-center justify-between"
                                style={{
                                    background: "var(--panel)",
                                    border: "1.5px solid var(--black)",
                                }}
                            >
                                <div>
                                    <p
                                        className="text-[10px] font-black uppercase tracking-widest mb-1"
                                        style={{
                                            color: "rgba(255,255,255,0.35)",
                                        }}
                                    >
                                        Highest Bidder
                                    </p>
                                    {topBid ? (
                                        <>
                                            <p className="font-black text-white text-base">
                                                {topBid.teamName}
                                            </p>
                                            <p
                                                className="text-xs"
                                                style={{
                                                    color: "rgba(255,255,255,0.35)",
                                                }}
                                            >
                                                @{topBid.username}
                                            </p>
                                        </>
                                    ) : (
                                        <p
                                            className="text-sm italic"
                                            style={{
                                                color: "rgba(255,255,255,0.25)",
                                            }}
                                        >
                                            No bids yet
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p
                                        className="text-[10px] font-black uppercase tracking-widest mb-1"
                                        style={{
                                            color: "rgba(255,255,255,0.35)",
                                        }}
                                    >
                                        Current Bid
                                    </p>
                                    <p
                                        className="font-mono font-black text-3xl sm:text-4xl"
                                        style={{
                                            color: "var(--accent-strong)",
                                        }}
                                    >
                                        ₹{currentHighest.toFixed(2)}
                                        <span
                                            className="text-sm ml-1"
                                            style={{
                                                color: "rgba(255,255,255,0.3)",
                                            }}
                                        >
                                            Cr
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Bid buttons */}
                            <div className="space-y-3">
                                <p
                                    className="text-[10px] font-black uppercase tracking-widest"
                                    style={{ color: "rgba(255,255,255,0.35)" }}
                                >
                                    Quick Bids
                                </p>
                                <div className="grid grid-cols-4 gap-2.5">
                                    {[0.25, 0.5, 1.0, 2.0].map((inc) => {
                                        const next = Number(
                                            (
                                                currentHighest +
                                                (topBid ? inc : 0)
                                            ).toFixed(2),
                                        )
                                        const canAfford = next <= myPurse
                                        const iAmLeading =
                                            topBid?.username === user.username
                                        return (
                                            <button
                                                key={inc}
                                                disabled={
                                                    biddingLoading ||
                                                    !canAfford ||
                                                    !!league.isPaused ||
                                                    iAmLeading
                                                }
                                                onClick={() => handleBid(next)}
                                                className="btn-bid"
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        color: "rgba(255,255,255,0.35)",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    +{inc} Cr
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    ₹{next.toFixed(2)}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Custom amount (Cr)"
                                        value={customBid}
                                        onChange={(e) =>
                                            setCustomBid(e.target.value)
                                        }
                                        className="input input-mono flex-1 text-sm"
                                    />
                                    <button
                                        disabled={
                                            !customBid ||
                                            parseFloat(customBid) <=
                                                currentHighest ||
                                            parseFloat(customBid) > myPurse ||
                                            biddingLoading ||
                                            !!league.isPaused
                                        }
                                        onClick={() =>
                                            handleBid(parseFloat(customBid))
                                        }
                                        className="btn-primary text-sm !px-4 shrink-0"
                                    >
                                        <Zap className="w-4 h-4" /> Bid
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin deck */}
                    {isAdmin && (
                        <div
                            className="p-4 rounded-2xl space-y-2.5"
                            style={{
                                background: "var(--panel)",
                                border: "1.5px solid var(--black)",
                            }}
                        >
                            <p
                                className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: "rgba(255,255,255,0.3)" }}
                            >
                                Admin Controls
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() =>
                                        adminAction({ action: "next_player" })
                                    }
                                    className="btn-primary text-xs !py-2"
                                >
                                    <Play className="w-3.5 h-3.5 fill-black" />{" "}
                                    Next Player
                                </button>
                                <button
                                    onClick={() =>
                                        adminAction({ action: "pause_resume" })
                                    }
                                    className="btn-secondary text-xs !py-2"
                                    style={{ color: "#f5d800" }}
                                >
                                    <Pause className="w-3.5 h-3.5" />{" "}
                                    {league.isPaused ? "Resume" : "Pause"}
                                </button>
                                <button
                                    onClick={() =>
                                        adminAction({ action: "shuffle" })
                                    }
                                    className="btn-secondary text-xs !py-2"
                                >
                                    <Shuffle className="w-3.5 h-3.5" /> Shuffle
                                </button>
                                <button
                                    onClick={() => setShowAddPlayersModal(true)}
                                    className="btn-secondary text-xs !py-2"
                                    style={{ color: "#00ff87" }}
                                >
                                    <UserPlus className="w-3.5 h-3.5" /> Add
                                    Players
                                </button>
                                {activePlayer && (
                                    <button
                                        onClick={() =>
                                            handleFinalize(activePlayer.id)
                                        }
                                        className="btn-danger text-xs !py-2"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />{" "}
                                        Finalize Sold
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT — Bid feed + queue */}
                <div className="space-y-4">
                    {/* Live bid feed */}
                    <div
                        className="p-4 rounded-3xl space-y-3"
                        style={{
                            background: "var(--panel)",
                            border: "1.5px solid var(--black)",
                            boxShadow: "4px 4px 0 var(--black)",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <TrendingUp
                                className="w-4 h-4"
                                style={{ color: "#f5d800" }}
                            />
                            <h3
                                className="text-xs font-black uppercase tracking-widest"
                                style={{ color: "rgba(255,255,255,0.5)" }}
                            >
                                Bid Stream
                            </h3>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                            {activeBids.length === 0 ? (
                                <p
                                    className="text-xs text-center py-8 italic"
                                    style={{ color: "rgba(255,255,255,0.2)" }}
                                >
                                    No bids yet
                                </p>
                            ) : (
                                activeBids.map((b, i) => (
                                    <div
                                        key={b.id}
                                        className="flex items-center justify-between p-2.5 rounded-xl text-xs"
                                        style={{
                                            background:
                                                i === 0
                                                    ? "rgba(0,255,135,0.08)"
                                                    : "rgba(255,255,255,0.03)",
                                            border: `1.5px solid ${i === 0 ? "rgba(0,255,135,0.25)" : "rgba(255,255,255,0.06)"}`,
                                        }}
                                    >
                                        <div>
                                            <p className="font-bold text-white">
                                                {b.teamName}
                                            </p>
                                            <p
                                                style={{
                                                    color: "rgba(255,255,255,0.3)",
                                                    fontSize: 10,
                                                }}
                                            >
                                                @{b.username}
                                            </p>
                                        </div>
                                        <span
                                            className="font-mono font-black"
                                            style={{ color: "#f5d800" }}
                                        >
                                            ₹{b.amount.toFixed(2)} Cr
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upcoming queue */}
                    <div
                        className="p-4 rounded-3xl space-y-3"
                        style={{
                            background: "var(--panel)",
                            border: "1.5px solid var(--black)",
                            boxShadow: "4px 4px 0 var(--black)",
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RefreshCw
                                    className="w-4 h-4"
                                    style={{ color: "#00d4ff" }}
                                />
                                <h3
                                    className="text-xs font-black uppercase tracking-widest"
                                    style={{ color: "rgba(255,255,255,0.5)" }}
                                >
                                    Queue ({unsoldPlayers.length})
                                </h3>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() =>
                                        adminAction({ action: "shuffle" })
                                    }
                                    className="text-[11px] font-bold transition-colors"
                                    style={{ color: "#00d4ff" }}
                                >
                                    Shuffle ↺
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                            {unsoldPlayers.slice(0, 10).map((p, i) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between py-2 px-2.5 rounded-xl text-xs"
                                    style={{
                                        background: "rgba(255,255,255,0.025)",
                                        border: "1px solid rgba(255,255,255,0.05)",
                                    }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="font-mono text-[10px] shrink-0"
                                            style={{
                                                color: "rgba(255,255,255,0.25)",
                                            }}
                                        >
                                            #{i + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white truncate">
                                                {p.name}
                                            </p>
                                            <p
                                                className="text-[10px] truncate"
                                                style={{
                                                    color: "rgba(255,255,255,0.3)",
                                                }}
                                            >
                                                {p.franchise} ·{" "}
                                                <span
                                                    style={{
                                                        color:
                                                            POSITION_COLORS[
                                                                p.position
                                                            ] || "#00ff87",
                                                    }}
                                                >
                                                    {p.position}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="font-mono font-bold shrink-0 ml-2"
                                        style={{
                                            color: "#f5d800",
                                            fontSize: 11,
                                        }}
                                    >
                                        ₹{p.basePrice}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <SquadSidebar
                league={league}
                players={players}
                currentUserId={user.id}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isAdmin={isAdmin}
                onOpenDirectAssign={(p) => setDirectAssignTarget(p)}
                onMarkAsUnsold={async (p) => {
                    await adminAction({
                        action: "mark_unsold",
                        targetPlayerId: p.id,
                    })
                    showToast(`${p.name} marked as unsold`, true)
                }}
            />

            {/* Direct assign modal */}
            {directAssignTarget && (
                <DirectAssignModal
                    player={directAssignTarget}
                    members={league.members || []}
                    onClose={() => setDirectAssignTarget(null)}
                    onAssign={async (targetUsername, targetTeamName, price) => {
                        await adminAction({
                            action: "direct_assign",
                            targetPlayerId: directAssignTarget.id,
                            targetUsername,
                            targetTeamName,
                            price,
                        })
                        setDirectAssignTarget(null)
                        showToast(
                            `${directAssignTarget.name} assigned to ${targetTeamName}!`,
                            true,
                        )
                    }}
                    onUndo={async () => {
                        await adminAction({
                            action: "undo_assign",
                            targetPlayerId: directAssignTarget.id,
                        })
                        setDirectAssignTarget(null)
                        showToast("Assignment undone.", true)
                    }}
                />
            )}

            {/* Add Players Modal */}
            {showAddPlayersModal && (
                <AddPlayersModal
                    leagueId={leagueId}
                    userId={user.id}
                    onClose={() => setShowAddPlayersModal(false)}
                    onPlayersAdded={(count) => {
                        setShowAddPlayersModal(false)
                        showToast(`Successfully added ${count} players!`, true)
                        fetchState()
                    }}
                />
            )}
        </div>
    )
}
