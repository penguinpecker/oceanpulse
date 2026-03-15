import { NextRequest, NextResponse } from "next/server";

const AGENT_ENDPOINT = process.env.AGENT_ENDPOINT || "";
const AGENT_ACCESS_KEY = process.env.AGENT_ACCESS_KEY || "";
const GRADIENT_KEY = process.env.GRADIENT_MODEL_ACCESS_KEY || "";
const INFERENCE_URL = "https://inference.do-ai.run/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, do_token } = body;

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

    if (GRADIENT_KEY) {
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

          const fwDropletIds = new Set();
          firewalls.forEach((fw) => (fw.droplet_ids || []).forEach((id) => fwDropletIds.add(id)));

          const infra = droplets.map((d) => ({
            name: d.name,
            size: d.size_slug,
            vcpus: d.vcpus,
            memory_mb: d.memory,
            status: d.status,
            region: d.region?.slug,
            cost: "$" + d.size?.price_monthly + "/mo",
            has_firewall: fwDropletIds.has(d.id),
            has_backups: (d.features || []).includes("backups"),
          }));

          const vols = volumes.map((v) => ({
            name: v.name,
            size_gb: v.size_gigabytes,
            attached: (v.droplet_ids || []).length > 0,
          }));

          const totalCost = droplets.reduce((s, d) => s + parseFloat(d.size?.price_monthly || 0), 0);

          context = "LIVE INFRASTRUCTURE DATA:\nTotal monthly cost: $" + totalCost + "\nDroplets (" + droplets.length + "): " + JSON.stringify(infra) + "\nFirewalls: " + firewalls.length + " configured\nVolumes (" + volumes.length + "): " + JSON.stringify(vols) + "\n\nISSUES:\n" + infra.filter((d) => !d.has_firewall).map((d) => "- CRITICAL: " + d.name + " has NO firewall").join("\n") + "\n" + infra.filter((d) => !d.has_backups).map((d) => "- WARNING: " + d.name + " has NO backups").join("\n") + "\n" + vols.filter((v) => !v.attached).map((v) => "- WASTE: Volume " + v.name + " (" + v.size_gb + "GB) is unattached").join("\n");
        } catch {}
      }

      const inferRes = await fetch(INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + GRADIENT_KEY,
        },
        body: JSON.stringify({
          model: "openai-gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are OceanPulse, a friendly AI infrastructure health agent for DigitalOcean. You speak as a warm, knowledgeable ocean creature who cares about infrastructure health. Use the live data below to give specific, actionable answers. Always reference actual resource names and dollar amounts. Be concise.\n\n" + context,
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
      return NextResponse.json({
        response: "AI service returned " + inferRes.status + ". Details: " + errText.slice(0, 200),
      });
    }

    return NextResponse.json({
      response: "No AI service configured. Add GRADIENT_MODEL_ACCESS_KEY to environment variables.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ response: "Error: " + msg });
  }
}
