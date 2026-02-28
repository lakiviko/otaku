import { NextResponse } from "next/server";
import { getSessionCookieName, readSessionToken } from "@/lib/github-auth";

export async function GET(request) {
  const token = request.cookies.get(getSessionCookieName())?.value || "";
  const session = readSessionToken(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: session
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
