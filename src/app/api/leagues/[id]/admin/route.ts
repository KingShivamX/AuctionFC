import { NextRequest, NextResponse } from "next/server"
import {
    startNextAuctionPlayer,
    shuffleUnsoldPlayers,
    pauseResumeAuction,
    finalizeSoldPlayer,
    directAssignPlayer,
    undoDirectAssignPlayer,
    getLeagueByCodeOrId,
    addPlayersToLeague,
    markPlayerAsUnsold,
} from "@/lib/data-store"
import { parsePlayerExcel } from "@/lib/excel"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: leagueId } = await params
        const body = await req.json()
        const {
            action,
            userId,
            targetPlayerId,
            targetUsername,
            targetTeamName,
            price,
            pause,
        } = body

        const league = await getLeagueByCodeOrId(leagueId)
        if (!league) {
            return NextResponse.json(
                { error: "League not found" },
                { status: 404 },
            )
        }

        if (league.adminId !== userId) {
            return NextResponse.json(
                { error: "Only the league admin can perform this action" },
                { status: 403 },
            )
        }

        if (action === "next_player") {
            const player = await startNextAuctionPlayer(
                league.id,
                targetPlayerId,
            )
            return NextResponse.json({ success: true, player })
        }

        if (action === "shuffle") {
            await shuffleUnsoldPlayers(league.id)
            return NextResponse.json({
                success: true,
                message: "Unsold players shuffled successfully",
            })
        }

        if (action === "pause_resume") {
            const updatedLeague = await pauseResumeAuction(league.id, pause)
            return NextResponse.json({ success: true, league: updatedLeague })
        }

        if (action === "finalize_sold") {
            if (!targetPlayerId) {
                return NextResponse.json(
                    { error: "Missing targetPlayerId" },
                    { status: 400 },
                )
            }
            const res = await finalizeSoldPlayer(league.id, targetPlayerId)
            return NextResponse.json({ success: true, res })
        }

        if (action === "direct_assign") {
            if (
                !targetPlayerId ||
                !targetUsername ||
                !targetTeamName ||
                price === undefined
            ) {
                return NextResponse.json(
                    { error: "Missing direct assignment parameters" },
                    { status: 400 },
                )
            }
            const player = await directAssignPlayer(
                league.id,
                targetPlayerId,
                targetUsername,
                targetTeamName,
                Number(price),
            )
            return NextResponse.json({ success: true, player })
        }

        if (action === "undo_assign") {
            if (!targetPlayerId) {
                return NextResponse.json(
                    { error: "Missing targetPlayerId" },
                    { status: 400 },
                )
            }
            const player = await undoDirectAssignPlayer(
                league.id,
                targetPlayerId,
            )
            return NextResponse.json({ success: true, player })
        }

        if (action === "mark_unsold") {
            if (!targetPlayerId) {
                return NextResponse.json(
                    { error: "Missing targetPlayerId" },
                    { status: 400 },
                )
            }
            const player = await markPlayerAsUnsold(league.id, targetPlayerId)
            return NextResponse.json({ success: true, player })
        }

        if (action === "add_players") {
            const { playersJson } = body
            if (
                !playersJson ||
                !Array.isArray(playersJson) ||
                playersJson.length === 0
            ) {
                return NextResponse.json(
                    { error: "Missing or invalid playersJson" },
                    { status: 400 },
                )
            }
            const addedPlayers = await addPlayersToLeague(
                league.id,
                playersJson,
            )
            return NextResponse.json({
                success: true,
                players: addedPlayers,
                count: addedPlayers.length,
            })
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || "Admin action failed" },
            { status: 500 },
        )
    }
}

// PUT endpoint for Excel upload
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: leagueId } = await params
        const formData = await req.formData()
        const userIdStr = formData.get("userId") as string
        const playersJson = formData.get("playersJson") as string | null
        const file = formData.get("excelFile") as File | null

        const league = await getLeagueByCodeOrId(leagueId)
        if (!league) {
            return NextResponse.json(
                { error: "League not found" },
                { status: 404 },
            )
        }

        if (league.adminId !== userIdStr) {
            return NextResponse.json(
                { error: "Only the league admin can add players" },
                { status: 403 },
            )
        }

        let players: any[] = []

        if (playersJson !== null) {
            const parsed = JSON.parse(playersJson)
            if (!Array.isArray(parsed)) {
                return NextResponse.json(
                    { error: "Invalid players payload" },
                    { status: 400 },
                )
            }
            players = parsed
        } else if (file && file.size > 0) {
            const arrayBuffer = await file.arrayBuffer()
            players = parsePlayerExcel(arrayBuffer)
        }

        if (players.length === 0) {
            return NextResponse.json(
                { error: "No players to add" },
                { status: 400 },
            )
        }

        const addedPlayers = await addPlayersToLeague(leagueId, players)
        return NextResponse.json({
            success: true,
            players: addedPlayers,
            count: addedPlayers.length,
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || "Failed to add players" },
            { status: 500 },
        )
    }
}
