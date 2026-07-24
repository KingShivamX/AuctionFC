import { User } from "./types";

export function generateToken(user: User): string {
  // Safe simple 30-day base64 token
  const payload = {
    id: user.id,
    username: user.username,
    teamName: user.teamName,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  return typeof window !== "undefined"
    ? btoa(encodeURIComponent(JSON.stringify(payload)))
    : Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function parseToken(token: string): { id: string; username: string; teamName: string } | null {
  try {
    const raw = typeof window !== "undefined"
      ? decodeURIComponent(atob(token))
      : Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
