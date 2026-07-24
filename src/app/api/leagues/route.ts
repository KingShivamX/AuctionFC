import { NextRequest, NextResponse } from "next/server";
import { createLeague, getUserLeagues, joinLeague } from "@/lib/data-store";
import { parsePlayerExcel } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const leagues = await getUserLeagues(userId);
    return NextResponse.json({ leagues });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch leagues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const totalPurseStr = formData.get("totalPurse") as string;
    const userStr = formData.get("user") as string;
    const playersJson = formData.get("playersJson") as string | null;
    const file = formData.get("excelFile") as File | null;

    if (!name || !totalPurseStr || !userStr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = JSON.parse(userStr);
    const totalPurse = parseFloat(totalPurseStr) || 100;

    let players: any[] = [];

    if (playersJson !== null) {
      const parsed = JSON.parse(playersJson);
      if (!Array.isArray(parsed)) {
        return NextResponse.json({ error: "Invalid players payload" }, { status: 400 });
      }
      players = parsed;
    } else if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      players = parsePlayerExcel(arrayBuffer);
    }

    if (players.length === 0) {
      return NextResponse.json({ error: "Add at least one player before creating a league" }, { status: 400 });
    }

    const league = await createLeague(name, totalPurse, user, players);
    return NextResponse.json({ league });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create league" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { leagueCode, user } = body;

    if (!leagueCode || !user) {
      return NextResponse.json({ error: "Missing leagueCode or user" }, { status: 400 });
    }

    const league = await joinLeague(leagueCode, user);
    return NextResponse.json({ league });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to join league" }, { status: 400 });
  }
}
