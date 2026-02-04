import { NextResponse } from "next/server";
import { getProxiedImage } from "@/lib/tmdb";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { path } = await params;
    if (!Array.isArray(path) || path.length < 2) {
      return NextResponse.json({ error: "invalid image path" }, { status: 400 });
    }

    const image = await getProxiedImage(path);
    return new NextResponse(image.data, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=604800",
        "X-Image-Cache": image.cacheHeader
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "proxy error", detail: error.message }, { status: error.status || 502 });
  }
}
