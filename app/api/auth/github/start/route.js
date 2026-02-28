import { NextResponse } from "next/server";
import {
  createOAuthState,
  getOAuthStateCookieName,
  getSessionCookieConfig
} from "@/lib/github-auth";

export async function GET(request) {
  const clientId = String(process.env.GITHUB_CLIENT_ID || "").trim();
  if (!clientId) {
    return NextResponse.json({ error: "Missing GITHUB_CLIENT_ID env." }, { status: 500 });
  }

  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const stateToken = createOAuthState(nextPath);

  const callbackUrl = new URL("/api/auth/github/callback", request.nextUrl.origin);
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  githubAuthUrl.searchParams.set("scope", "read:user user:email");
  githubAuthUrl.searchParams.set("state", stateToken);
  githubAuthUrl.searchParams.set("allow_signup", "false");

  const response = NextResponse.redirect(githubAuthUrl);
  response.cookies.set(getOAuthStateCookieName(), stateToken, getSessionCookieConfig(60 * 10));
  return response;
}
