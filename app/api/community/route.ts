// ============================================================
// ArxMint — Community Generation API
// POST /api/community — generates + persists deployment config from prompt
// GET  /api/community — lists all saved communities from DB
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateDeployment, generateApertureConfig } from "@/lib/community-generator";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET() {
  try {
    const communities = await db.community.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prompt: true, config: true, createdAt: true },
    });
    return NextResponse.json({ communities });
  } catch (error: any) {
    // DB not configured — return empty list so app degrades gracefully
    console.warn("Could not fetch communities from DB:", error.message);
    return NextResponse.json({ communities: [] });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { prompt, network = "testnet" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: "Prompt must be at least 10 characters" },
        { status: 400 }
      );
    }

    const deployment = generateDeployment(prompt, network);
    const apertureConfig = deployment.community.agents.enabled
      ? generateApertureConfig(deployment.community)
      : null;

    // Persist to database (gracefully skipped if DB not configured)
    let savedId: string | undefined;
    try {
      const saved = await db.community.create({
        data: {
          name: deployment.community.name,
          prompt: prompt.trim(),
          config: deployment.community as object,
        },
      });
      savedId = saved.id;
    } catch {
      console.warn("Community not persisted: database not configured or unavailable");
    }

    return NextResponse.json({
      success: true,
      deployment,
      apertureConfig,
      ...(savedId ? { id: savedId } : {}),
    });
  } catch (error: any) {
    console.error("[ArxMint] POST /api/community error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
