import { NextResponse } from "next/server";
import {
  createSessionToken,
  exchangeGitHubCodeForToken,
  fetchGitHubViewer,
  getAppOrigin,
  getOAuthStateCookieName,
  getSessionCookieConfig,
  getSessionCookieName,
  isAllowedGitHubUser,
  readOAuthState
} from "@/lib/github-auth";

function redirectWithError(request, reason) {
  const appOrigin = getAppOrigin(request.nextUrl.origin);
  const url = new URL("/", appOrigin);
  url.searchParams.set("auth", reason);
  const response = NextResponse.redirect(url);
  response.cookies.set(getOAuthStateCookieName(), "", getSessionCookieConfig(0));
  return response;
}

export async function GET(request) {
  const appOrigin = getAppOrigin(request.nextUrl.origin);
  const code = String(request.nextUrl.searchParams.get("code") || "").trim();
  const state = String(request.nextUrl.searchParams.get("state") || "").trim();
  if (!code || !state) {
    return redirectWithError(request, "missing_oauth_params");
  }

  const cookieState = request.cookies.get(getOAuthStateCookieName())?.value || "";
  if (!cookieState || cookieState !== state) {
    return redirectWithError(request, "invalid_oauth_state");
  }

  const statePayload = readOAuthState(state);
  if (!statePayload) {
    return redirectWithError(request, "expired_oauth_state");
  }

  try {
    const token = await exchangeGitHubCodeForToken(code);
    const viewer = await fetchGitHubViewer(token);
    if (!isAllowedGitHubUser(viewer)) {
      return redirectWithError(request, "not_allowed");
    }

    const sessionToken = createSessionToken(viewer);
    const redirectUrl = new URL(statePayload.nextPath || "/", appOrigin);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(getOAuthStateCookieName(), "", getSessionCookieConfig(0));
    response.cookies.set(getSessionCookieName(), sessionToken, getSessionCookieConfig(60 * 60 * 24 * 30));
    return response;
  } catch (error) {
    const response = redirectWithError(request, "oauth_failed");
    response.headers.set("X-Auth-Error", error instanceof Error ? error.message : "unknown");
    return response;
  }
}
