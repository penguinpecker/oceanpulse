import { NextRequest, NextResponse } from "next/server";

const AGENT_ENDPOINT = process.env.AGENT_ENDPOINT || "";
const AGENT_ACCESS_KEY = process.env.AGENT_ACCESS_KEY || "";
const GRADIENT_KEY = process.env.GRADIENT_MODEL_ACCESS_KEY || "";
const INFERENCE_URL = "https://inference.do-ai.run/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, do_token } = body;

    // Route 1: Gradient agent (if access key configured)
    if (AGENT_ENDPOINT && AGENT_ACCESS_KEY) {
      try {
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
          const reply = data.choices?.[0]?.message?.content || "Processing...";
          return NextResponse.json({ response: reply });
        }
      } catch {}
    }

    // Route 2: DO serverless inference with model access key
    if (GRADIENT_KEY) {
      // Fetch infra context
      let context = "No infrastructure data available.";
      const token = do_token || process.env.DIGITALOCEAN_API_TOKEN || "";
      if (token) {
        try {
          const [drRes, fwRes, volRes] = await Promise.all([
            fetch("https://api.digitalocean.com/v2/droplets?per_page=50", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://api.digitalocean.com/v2/firewalls", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://api.digitalocean.com/v2/volumes?per_page=50", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          const droplets = (await drRes.json()).droplets || [];
          const firewalls = (await fwRes.json()).firewalls || [];
          const volumes = (await volRes.json()).volumes || [];

          const fwDropletIds = new Set<number>();
          firewalls.forEach((fw: any) => (fw.droplet_ids || []).forEach((id: number) => fwDropletIds.add(id)));

          const infra = droplets.map((d: any) => ({
            name: d.name,
            size: d.size_slug,
            vcpus: d.vcpus,
            memory_mb: d.memory,
            status: d.status,
            region: d.region?.slug,
            cost: `$${d.size?.price_monthly}/mo`,
            has_firewall: fwDropletIds.has(d.id),
            has_backups: (d.features || []).includes("backups"),
            has_monitoring: (d.features || []).includes("monitoring"),
          }));

          const vols = volumes.map((v: any) => ({
            name: v.name,
            size_gb: v.size_gigabytes,
            attached: (v.droplet_ids || []).length > 0,
          }));

          const totalCost = droplets.reduce((s: number, d: any) => s + parseFloat(d.size?.price_monthly || 0), 0);

          context = `LIVE INFRASTRUCTURE DATA:
Total monthly cost: $${totalCost}
Droplets (${droplets.length}): ${JSON.stringify(infra, null, 1)}
Firewalls: ${firewalls.length} configured
Volumes (${volumes.length}): ${JSON.stringify(vols, null, 1)}

ISSUES DETECTED:
${infra.filter((d: any) => !d.has_firewall).map((d: any) => `- CRITICAL: ${d.name} has NO firewall`).join("\n")}
${infra.filter((d: any) => !d.has_backups).map((d: any) => `- WARNING: ${d.name} has NO backups`).join("\n")}
${vols.filter((v: any) => !v.attached).map((v: any) => `- WASTE: Volume ${v.name} (${v.size_gb}GB) is unattached`).join("\n")}`;
        } catch {}
      }

      const inferRes = await fetch(INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GRADIENT_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are OceanPulse, a friendly AI infrastructure health agent for DigitalOcean. You speak as a warm, knowledgeable ocean creature who cares about infrastructure health. Use the live data below to give specific, actionable answers. Always reference actual resource names and dollar amounts. Be concise — 2-3 paragraphs max.

${context}`,
            },
            { role: "user", content: message },
          ],
          max_completion_tokens: 600,
        }),
      });

      if (inferRes.ok) {
        const data = await inferRes.json();
        const reply = data.choices?.[0]?.message?.content || "Let me check on that...";
        return NextResponse.json({ response: reply });
      }

      const errText = await inferRes.text();
      console.error("Inference error:", inferRes.status, errText);
      return NextResponse.json({
        response: `AI service returned ${inferRes.status}. Check that GRADIENT_MODEL_ACCESS_KEY is valid.`,
      });
    }

    return NextResponse.json({
      response: "No AI service configured. Add GRADIENT_MODEL_ACCESS_KEY to environment variables.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ response: `Error: ${msg}` });
  }
}
