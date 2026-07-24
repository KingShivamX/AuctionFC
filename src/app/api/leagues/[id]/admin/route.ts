import { NextRequest, NextResponse } from "next/server";
import {
  startNextAuctionPlayer,
  shuffleUnsoldPlayers,
  pauseResumeAuction,
  finalizeSoldPlayer,
  directAssignPlayer,
  undoDirectAssignPlayer,
  getLeagueByCodeOrId,
} from "@/lib/data-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leagueId } = await params;
    const body = await req.json();
    const { action, userId, targetPlayerId, targetUsername, targetTeamName, price, pause } = body;

    const league = await getLeagueByCodeOrId(leagueId);
    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    if (league.adminId !== userId) {
      return NextResponse.json({ error: "Only the league admin can perform this action" }, { status: 403 });
    }

    if (action === "next_player") {
      const player = await startNextAuctionPlayer(league.id, targetPlayerId);
      return NextResponse.json({ success: true, player });
    }

    if (action === "shuffle") {
      await shuffleUnsoldPlayers(league.id);
      return NextResponse.json({ success: true, message: "Unsold players shuffled successfully" });
    }

    if (action === "pause_resume") {
      const updatedLeague = await pauseResumeAuction(league.id, pause);
      return NextResponse.json({ success: true, league: updatedLeague });
    }

    if (action === "finalize_sold") {
      if (!targetPlayerId) {
        return NextResponse.json({ error: "Missing targetPlayerId" }, { status: 400 });
      }
      const res = await finalizeSoldPlayer(league.id, targetPlayerId);
      return NextResponse.json({ success: true, res });
    }

    if (action === "direct_assign") {
      if (!targetPlayerId || !targetUsername || !targetTeamName || price === undefined) {
        return NextResponse.json({ error: "Missing direct assignment parameters" }, { status: 400 });
      }
      const player = await directAssignPlayer(league.id, targetPlayerId, targetUsername, targetTeamName, Number(price));
      return NextResponse.json({ success: true, player });
    }

    if (action === "undo_assign") {
      if (!targetPlayerId) {
        return NextResponse.json({ error: "Missing targetPlayerId" }, { status: 400 });
      }
      const player = await undoDirectAssignPlayer(league.id, targetPlayerId);
      return NextResponse.json({ success: true, player });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Admin action failed" }, { status: 500 });
  }
}
