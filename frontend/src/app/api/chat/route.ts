import { NextRequest, NextResponse } from "next/server";

const AGENT_ENDPOINT = process.env.AGENT_ENDPOINT || "";
const AGENT_ACCESS_KEY = process.env.AGENT_ACCESS_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, do_token, session_state } = body;

    if (!do_token) {
      return NextResponse.json(
        { error: "Missing DO API token" },
        { status: 400 }
      );
    }

    // If agent endpoint is configured, proxy to Gradient AI agent
    if (AGENT_ENDPOINT) {
      const res = await fetch(`${AGENT_ENDPOINT}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AGENT_ACCESS_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: JSON.stringify({
                message,
                do_token,
                session_state,
              }),
            },
          ],
          stream: false,
          include_functions_info: true,
          include_retrieval_info: true,
          include_guardrails_info: true,
        }),
      });

      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback: direct DO API scan (for local dev without agent)
    const scanRes = await fetch("https://api.digitalocean.com/v2/account", {
      headers: { Authorization: `Bearer ${do_token}` },
    });

    if (!scanRes.ok) {
      return NextResponse.json(
        { error: "Invalid DO token", status: scanRes.status },
        { status: 401 }
      );
    }

    const account = await scanRes.json();
    return NextResponse.json({
      response: `Token validated. Account: ${account.account?.email}. Agent endpoint not configured — set AGENT_ENDPOINT in .env to connect to your deployed OceanPulse agent.`,
      account: account.account,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
