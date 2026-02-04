import { NextResponse } from "next/server";
import { getTitleCast, normalizeLanguage } from "@/lib/tmdb";

export async function GET(request, { params }) {
  const { type, id } = await params;
  const language = normalizeLanguage(new URL(request.url).searchParams.get("language"));
  const numericId = Number(id);

  if (!["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "type must be movie or tv" }, { status: 400 });
  }

  if (Number.isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "id must be a positive number" }, { status: 400 });
  }

  try {
    const data = await getTitleCast({ type, id: numericId, language });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Cast lookup failed", detail: error.body || error.message }, { status: error.status || 502 });
  }
}
