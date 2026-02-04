import { NextResponse } from "next/server";
import { getPersonDetails, normalizeLanguage } from "@/lib/tmdb";

export async function GET(request, { params }) {
  const { id } = await params;
  const numericId = Number(id);
  const language = normalizeLanguage(new URL(request.url).searchParams.get("language"));

  if (Number.isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "id must be a positive number" }, { status: 400 });
  }

  try {
    const data = await getPersonDetails({ id: numericId, language });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Person lookup failed", detail: error.body || error.message }, { status: error.status || 502 });
  }
}
