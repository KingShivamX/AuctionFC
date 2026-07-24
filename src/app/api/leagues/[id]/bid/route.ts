import { NextRequest, NextResponse } from "next/server";
import { placeBid } from "@/lib/data-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leagueId } = await params;
    const body = await req.json();
    const { playerId, amount, user } = body;

    if (!playerId || amount === undefined || !user) {
      return NextResponse.json({ error: "Missing bidding parameters" }, { status: 400 });
    }

    const result = await placeBid(leagueId, playerId, Number(amount), user);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message || "Bid rejected",
          currentHighest: result.currentHighest,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, bid: result.bid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bidding failed" }, { status: 500 });
  }
}
