// ============================================================
// ArxMint — Community Generation API
// POST /api/community — generates + persists deployment config from prompt
// GET  /api/community — lists all saved communities from DB
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateDeployment, generateApertureConfig } from "@/lib/community-generator";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import {
  requireSessionUserId,
  SessionUserError,
} from "@/lib/session-user";
import { validatePrompt, errorResponse, errorStatus } from "@/lib/validation";
import { logger } from "@/lib/logger";

async function getUserIdOrAuthError(
  request: NextRequest
): Promise<string | NextResponse> {
  try {
    return await requireSessionUserId(request);
  } catch (error: unknown) {
    if (error instanceof SessionUserError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 503;
      return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status });
    }
    return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const userId = await getUserIdOrAuthError(request);
  if (userId instanceof NextResponse) return userId;

  try {
    const communities = await db.community.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prompt: true, config: true, createdAt: true },
    });
    return NextResponse.json({ communities });
  } catch (error: unknown) {
    // DB not configured — return empty list so app degrades gracefully
    logger.warn("Could not fetch communities from DB", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ communities: [] });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const userId = await getUserIdOrAuthError(request);
  if (userId instanceof NextResponse) return userId;

  try {
    const body = await request.json();
    const { network = "testnet" } = body;

    const prompt = validatePrompt(body.prompt);
    if (prompt.length < 10)
      return NextResponse.json(
        { error: "Prompt must be at least 10 characters", code: "VALIDATION_PROMPT" },
        { status: 400 }
      );

    const deployment = generateDeployment(prompt, network);
    const apertureConfig = deployment.community.agents.enabled
      ? generateApertureConfig(deployment.community)
      : null;

    // Persist to database (gracefully skipped if DB not configured)
    let savedId: string | undefined;
    try {
      const saved = await db.community.create({
        data: {
          userId,
          name: deployment.community.name,
          prompt: prompt.trim(),
          config: deployment.community as object,
        },
      });
      savedId = saved.id;
    } catch (error: unknown) {
      logger.warn("Community not persisted", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({
      success: true,
      deployment,
      apertureConfig,
      ...(savedId ? { id: savedId } : {}),
    });
  } catch (error: unknown) {
    if (!(error instanceof Error) || error.name !== "ValidationError") {
      logger.error("POST /api/community error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json(errorResponse(error), { status: errorStatus(error) });
  }
}
