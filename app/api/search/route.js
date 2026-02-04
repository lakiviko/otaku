import { NextResponse } from "next/server";
import { normalizeLanguage, normalizePage, sanitizeQuery, searchTitles } from "@/lib/tmdb";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = sanitizeQuery(searchParams.get("query"));
  const language = normalizeLanguage(searchParams.get("language"));
  const page = normalizePage(searchParams.get("page"));

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const data = await searchTitles({ query, language, page });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Search failed", detail: error.body || error.message }, { status: error.status || 502 });
  }
}
