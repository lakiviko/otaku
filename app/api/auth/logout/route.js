import { NextResponse } from "next/server";
import { getSessionCookieConfig, getSessionCookieName } from "@/lib/github-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", getSessionCookieConfig(0));
  return response;
}
