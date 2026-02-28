import crypto from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "otaku_session";
const OAUTH_STATE_COOKIE = "otaku_oauth_state";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
const STATE_TTL_SEC = 60 * 10;
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

function getAuthSecret() {
  const value = String(process.env.AUTH_SECRET || "").trim();
  if (!value) {
    throw new Error("Missing AUTH_SECRET env.");
  }
  return value;
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function timingSafeEqualText(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function buildSignedToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(body);
  return `${body}.${signature}`;
}

function parseSignedToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expectedSignature = signValue(body);
  if (!timingSafeEqualText(signature, expectedSignature)) return null;
  try {
    return JSON.parse(base64UrlDecode(body));
  } catch {
    return null;
  }
}

function normalizePath(pathValue) {
  const value = String(pathValue || "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function getAppOrigin() {
  const configured = String(process.env.HOST_URI || "").trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Ignore invalid HOST_URI and use localhost fallback.
    }
  }
  return "http://localhost:3000";
}

export function createOAuthState(nextPath) {
  const now = Math.floor(Date.now() / 1000);
  return buildSignedToken({
    nonce: crypto.randomBytes(16).toString("hex"),
    nextPath: normalizePath(nextPath),
    exp: now + STATE_TTL_SEC
  });
}

export function readOAuthState(token) {
  const parsed = parseSignedToken(token);
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    nextPath: normalizePath(parsed.nextPath)
  };
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return buildSignedToken({
    login: String(user.login || "").trim(),
    name: String(user.name || user.login || "").trim(),
    avatarUrl: String(user.avatarUrl || "").trim(),
    exp: now + SESSION_TTL_SEC
  });
}

export function readSessionToken(token) {
  const parsed = parseSignedToken(token);
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  const login = String(parsed.login || "").trim();
  if (!login) return null;
  return {
    login,
    name: String(parsed.name || login),
    avatarUrl: String(parsed.avatarUrl || "")
  };
}

export function getSessionCookieConfig(maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getOAuthStateCookieName() {
  return OAUTH_STATE_COOKIE;
}

export async function getServerAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return readSessionToken(token);
}

export function getAllowedGitHubLogins() {
  return String(process.env.GITHUB_ALLOWED_LOGINS || process.env.GITHUB_ALLOWED_LOGIN || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function exchangeGitHubCodeForToken(code) {
  const clientId = String(process.env.GITHUB_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GITHUB_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET env.");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": CHROME_UA
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed (${response.status})`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("GitHub did not return access token.");
  }
  return String(payload.access_token);
}

export async function fetchGitHubViewer(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": CHROME_UA
  };

  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers })
  ]);

  if (!userRes.ok) {
    throw new Error(`GitHub user request failed (${userRes.status})`);
  }

  const user = await userRes.json();
  const emails = emailsRes.ok ? await emailsRes.json() : [];
  const primaryEmail = Array.isArray(emails)
    ? emails.find((item) => item?.primary && item?.verified)?.email || emails.find((item) => item?.verified)?.email || null
    : null;

  return {
    login: String(user.login || "").toLowerCase(),
    name: String(user.name || user.login || ""),
    avatarUrl: String(user.avatar_url || ""),
    email: primaryEmail ? String(primaryEmail).toLowerCase() : null
  };
}

export function isAllowedGitHubUser(viewer) {
  const allowedLogins = getAllowedGitHubLogins();
  if (!allowedLogins.length) return false;
  return allowedLogins.includes(String(viewer?.login || "").toLowerCase());
}
