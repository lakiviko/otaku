import { NextResponse } from "next/server";

export async function GET(request) {
  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const target = new URL("/api/auth/github/start", request.nextUrl.origin);
  target.searchParams.set("next", nextPath);
  return NextResponse.redirect(target);
}
