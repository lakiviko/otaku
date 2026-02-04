import { NextResponse } from "next/server";
import { getSeasonDetails, normalizeLanguage, normalizeSeasonNumber } from "@/lib/tmdb";

export async function GET(request, { params }) {
  const { id, seasonNumber } = await params;
  const numericId = Number(id);
  const normalizedSeasonNumber = normalizeSeasonNumber(seasonNumber);
  const language = normalizeLanguage(new URL(request.url).searchParams.get("language"));

  if (Number.isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "id must be a positive number" }, { status: 400 });
  }

  if (normalizedSeasonNumber === null) {
    return NextResponse.json({ error: "seasonNumber must be a non-negative integer" }, { status: 400 });
  }

  try {
    const data = await getSeasonDetails({ id: numericId, seasonNumber: normalizedSeasonNumber, language });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Season lookup failed", detail: error.body || error.message }, { status: error.status || 502 });
  }
}
