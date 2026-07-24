import { NextRequest, NextResponse } from "next/server";
import { getLeagueByCodeOrId, getLeaguePlayers, getBidsForPlayer } from "@/lib/data-store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const league = await getLeagueByCodeOrId(id);

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    const players = await getLeaguePlayers(league.id);
    let activePlayer = null;
    let activeBids: any[] = [];

    if (league.currentAuctionPlayerId) {
      activePlayer = players.find((p) => p.id === league.currentAuctionPlayerId) || null;
      if (activePlayer) {
        activeBids = await getBidsForPlayer(league.id, activePlayer.id);
      }
    }

    return NextResponse.json({
      league,
      players,
      activePlayer,
      activeBids,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load league data" }, { status: 500 });
  }
}
