import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Realtime sessions are not supported with Ollama" },
    { status: 400 }
  );
}
