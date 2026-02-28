import { NextResponse } from "next/server";
import { getSessionCookieConfig, getSessionCookieName } from "@/lib/github-auth";

export async function GET(request) {
  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const target = new URL(nextPath, request.nextUrl.origin);
  const response = NextResponse.redirect(target);
  response.cookies.set(getSessionCookieName(), "", getSessionCookieConfig(0));
  return response;
}
