// ============================================================
// ArxMint — Community Generation API
// POST /api/community — generates deployment config from prompt
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateDeployment, generateApertureConfig } from "@/lib/community-generator";

export async function POST(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      deployment,
      apertureConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate community" },
      { status: 500 }
    );
  }
}
