import { NextRequest, NextResponse } from "next/server";

const AGENT_ENDPOINT = process.env.AGENT_ENDPOINT || "";
const AGENT_ACCESS_KEY = process.env.AGENT_ACCESS_KEY || "";
const DO_TOKEN = process.env.DIGITALOCEAN_API_TOKEN || "";
const INFERENCE_URL = "https://inference.do-ai.run/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, do_token, scan_data } = body;

    // Route 1: If agent access key exists, use the Gradient agent
    if (AGENT_ENDPOINT && AGENT_ACCESS_KEY) {
      const res = await fetch(`${AGENT_ENDPOINT}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AGENT_ACCESS_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply =
          data.choices?.[0]?.message?.content ||
          data.response ||
          "I'm processing your request...";
        return NextResponse.json({ response: reply });
      }
    }

    // Route 2: Fallback — call DO serverless inference directly
    const token = do_token || DO_TOKEN;
    if (!token) {
      return NextResponse.json({
        response: "I need a DigitalOcean API token to analyze your infrastructure. Please connect your account first.",
      });
    }

    // Fetch current infra context for the LLM
    let context = "";
    try {
      const dropletsRes = await fetch("https://api.digitalocean.com/v2/droplets?per_page=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dropletsData = await dropletsRes.json();
      const droplets = (dropletsData.droplets || []).map((d: any) => ({
        name: d.name,
        size: d.size_slug,
        status: d.status,
        region: d.region?.slug,
        monthly_cost: d.size?.price_monthly,
        vcpus: d.vcpus,
        memory_mb: d.memory,
        backup: (d.features || []).includes("backups"),
        monitoring: (d.features || []).includes("monitoring"),
      }));

      const fwRes = await fetch("https://api.digitalocean.com/v2/firewalls", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fwData = await fwRes.json();

      const volRes = await fetch("https://api.digitalocean.com/v2/volumes?per_page=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const volData = await volRes.json();
      const volumes = (volData.volumes || []).map((v: any) => ({
        name: v.name,
        size_gb: v.size_gigabytes,
        attached: (v.droplet_ids || []).length > 0,
      }));

      context = `Current infrastructure:
Droplets: ${JSON.stringify(droplets)}
Firewalls: ${fwData.firewalls?.length || 0} configured
Volumes: ${JSON.stringify(volumes)}`;
    } catch {
      context = "Unable to fetch live infrastructure data.";
    }

    // Call DO serverless inference (OpenAI-compatible)
    // Uses the same token for billing
    const inferRes = await fetch(INFERENCE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are OceanPulse, a friendly AI infrastructure health agent for DigitalOcean. You speak as a warm, knowledgeable ocean creature. Analyze infrastructure and give specific, actionable recommendations with exact cost savings. Be concise.

${context}`,
          },
          { role: "user", content: message },
        ],
        max_completion_tokens: 800,
      }),
    });

    if (inferRes.ok) {
      const data = await inferRes.json();
      const reply = data.choices?.[0]?.message?.content || "Let me check on that...";
      return NextResponse.json({ response: reply });
    }

    // Route 3: Final fallback
    return NextResponse.json({
      response: "I'm having trouble connecting to the AI service right now. Your infrastructure scan data is still available in the dashboard above. Try asking again in a moment.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ response: `Something went wrong: ${message}. Try again.` });
  }
}
