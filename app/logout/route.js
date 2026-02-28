import { NextResponse } from "next/server";
import { getAppOrigin, getSessionCookieConfig, getSessionCookieName } from "@/lib/github-auth";

export async function GET(request) {
  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const target = new URL(nextPath, getAppOrigin());
  const response = NextResponse.redirect(target);
  response.cookies.set(getSessionCookieName(), "", getSessionCookieConfig(0));
  return response;
}
