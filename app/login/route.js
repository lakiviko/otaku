import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/github-auth";

export async function GET(request) {
  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const target = new URL("/api/auth/github/start", getAppOrigin());
  target.searchParams.set("next", nextPath);
  return NextResponse.redirect(target);
}
