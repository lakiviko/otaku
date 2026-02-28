import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerAuthSession } from "@/lib/github-auth";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

function getEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing ${name} env.`);
  }
  return value;
}

function toBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function normalizeMessage(input, slug, login) {
  const text = String(input || "").trim();
  if (text) return text.slice(0, 160);
  return `Update shelf ${slug} by @${login}`;
}

async function fetchGitHubJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Otaku/0.2"
  };
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function createGitHubAppJwt() {
  const appId = getEnv("GITHUB_APP_ID");
  const privateKey = normalizePrivateKey(getEnv("GITHUB_APP_PRIVATE_KEY"));
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId
  };
  const headerSegment = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payloadSegment = base64UrlJson(payload);
  const unsigned = `${headerSegment}.${payloadSegment}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

async function getGitHubInstallationToken() {
  const installationId = getEnv("GITHUB_APP_INSTALLATION_ID");
  const appJwt = createGitHubAppJwt();
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const { response, payload } = await fetchGitHubJson(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${appJwt}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Otaku/0.2"
    }
  });

  if (!response.ok || !payload?.token) {
    const detail = payload?.message || `GitHub installation token failed (${response.status})`;
    throw new Error(detail);
  }

  return String(payload.token);
}

async function getExistingFileSha({ owner, repo, branch, token, slug }) {
  const candidates = [`data/lists/${slug}.jsonc`, `data/lists/${slug}.json`];

  for (const path of candidates) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    url.searchParams.set("ref", branch);

    const { response, payload } = await fetchGitHubJson(url, { headers: githubHeaders(token) });
    if (response.ok && payload?.sha) {
      return { path, sha: String(payload.sha) };
    }
    if (response.status !== 404) {
      throw new Error(`GitHub read failed (${response.status})`);
    }
  }

  return { path: `data/lists/${slug}.jsonc`, sha: null };
}

export async function POST(request, { params }) {
  try {
    const viewer = await getServerAuthSession();
    if (!viewer) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const safeSlug = String(slug || "").trim();
    if (!SLUG_PATTERN.test(safeSlug)) {
      return NextResponse.json({ error: "invalid slug" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const content = String(body?.content || "");
    if (!content.trim()) {
      return NextResponse.json({ error: "empty content" }, { status: 400 });
    }

    const token = await getGitHubInstallationToken();
    const owner = getEnv("GITHUB_REPO_OWNER");
    const repo = getEnv("GITHUB_REPO_NAME");
    const branch = String(process.env.GITHUB_REPO_BRANCH || "main").trim();
    const committerName = String(process.env.GITHUB_COMMITTER_NAME || "Otaku Bot").trim();
    const committerEmail = String(process.env.GITHUB_COMMITTER_EMAIL || "otaku-bot@users.noreply.github.com").trim();

    const { path, sha } = await getExistingFileSha({
      owner,
      repo,
      branch,
      token,
      slug: safeSlug
    });

    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const message = normalizeMessage(body?.message, safeSlug, viewer.login);
    const putPayload = {
      message,
      content: toBase64(content),
      branch,
      committer: { name: committerName, email: committerEmail },
      author: { name: viewer.name || viewer.login, email: committerEmail }
    };
    if (sha) {
      putPayload.sha = sha;
    }

    const { response, payload } = await fetchGitHubJson(putUrl, {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(putPayload)
    });

    if (!response.ok) {
      const detail = payload?.message || `GitHub write failed (${response.status})`;
      return NextResponse.json({ error: "github_write_failed", detail }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      path,
      sha: payload?.commit?.sha || null,
      commitUrl: payload?.commit?.html_url || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: "commit_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
