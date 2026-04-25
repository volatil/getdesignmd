import { NextResponse } from "next/server";
import { analyzeUrl } from "@/lib/analyze-design";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };

    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "Ingresa una URL valida." }, { status: 400 });
    }

    const result = await analyzeUrl(body.url.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo analizar la URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
