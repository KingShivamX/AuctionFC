import { NextRequest, NextResponse } from "next/server";
import { loginUser, registerUser } from "@/lib/data-store";
import { generateToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, username, teamName, pin } = body;

    if (mode !== "login" && mode !== "register") {
      return NextResponse.json({ error: "Choose whether to log in or register" }, { status: 400 });
    }

    if (typeof username !== "string" || typeof pin !== "string" || (mode === "register" && typeof teamName !== "string") || !username.trim() || !pin.trim() || (mode === "register" && !teamName.trim())) {
      return NextResponse.json(
        { error: mode === "register" ? "Username, Team Name, and 4-digit PIN are required" : "Username and 4-digit PIN are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const user = mode === "register"
      ? await registerUser(username, teamName, pin)
      : await loginUser(username, pin);
    const token = generateToken(user);

    const response = NextResponse.json({ user, token });
    
    // Set 30-day cookie
    response.cookies.set("auctionfc_token", token, {
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Authentication failed" }, { status: 400 });
  }
}
