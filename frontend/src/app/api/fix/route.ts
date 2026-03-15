import { NextRequest, NextResponse } from "next/server";

const DO_API = "https://api.digitalocean.com/v2";

async function doPost(token: string, path: string, body: any) {
  const res = await fetch(`${DO_API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DO API ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function doDelete(token: string, path: string) {
  const res = await fetch(`${DO_API}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 204 && !res.ok) {
    throw new Error(`DO API DELETE ${path}: ${res.status}`);
  }
  return { success: true };
}

export async function POST(req: NextRequest) {
  try {
    const { do_token, action, resource_id, params } = await req.json();

    if (!do_token || !action || !resource_id) {
      return NextResponse.json(
        { error: "Missing required fields: do_token, action, resource_id" },
        { status: 400 }
      );
    }

    let result: any = {};

    switch (action) {
      case "resize_droplet": {
        // Power off → resize → power on
        await doPost(do_token, `droplets/${resource_id}/actions`, {
          type: "power_off",
        });
        // Wait a beat
        await new Promise((r) => setTimeout(r, 3000));
        result = await doPost(do_token, `droplets/${resource_id}/actions`, {
          type: "resize",
          size: params?.new_size || "s-2vcpu-4gb",
          disk: false,
        });
        await new Promise((r) => setTimeout(r, 2000));
        await doPost(do_token, `droplets/${resource_id}/actions`, {
          type: "power_on",
        });
        result.status = "resized";
        break;
      }

      case "power_off": {
        result = await doPost(do_token, `droplets/${resource_id}/actions`, {
          type: "shutdown",
        });
        result.status = "powered_off";
        break;
      }

      case "enable_backups": {
        result = await doPost(do_token, `droplets/${resource_id}/actions`, {
          type: "enable_backups",
        });
        result.status = "backups_enabled";
        break;
      }

      case "create_firewall": {
        result = await doPost(do_token, "firewalls", {
          name: `oceanpulse-fw-${resource_id}`,
          inbound_rules: [
            {
              protocol: "tcp",
              ports: "80",
              sources: { addresses: ["0.0.0.0/0", "::/0"] },
            },
            {
              protocol: "tcp",
              ports: "443",
              sources: { addresses: ["0.0.0.0/0", "::/0"] },
            },
            {
              protocol: "tcp",
              ports: "22",
              sources: { addresses: ["0.0.0.0/0", "::/0"] },
            },
          ],
          outbound_rules: [
            {
              protocol: "tcp",
              ports: "all",
              destinations: { addresses: ["0.0.0.0/0", "::/0"] },
            },
            {
              protocol: "udp",
              ports: "all",
              destinations: { addresses: ["0.0.0.0/0", "::/0"] },
            },
            {
              protocol: "icmp",
              destinations: { addresses: ["0.0.0.0/0", "::/0"] },
            },
          ],
          droplet_ids: [parseInt(resource_id)],
        });
        result.status = "firewall_created";
        break;
      }

      case "delete_volume": {
        result = await doDelete(do_token, `volumes/${resource_id}`);
        result.status = "volume_deleted";
        break;
      }

      case "delete_snapshot": {
        result = await doDelete(do_token, `snapshots/${resource_id}`);
        result.status = "snapshot_deleted";
        break;
      }

      case "create_alert": {
        result = await doPost(do_token, "monitoring/alerts", {
          alerts: { email: [params?.email || ""] },
          compare: "GreaterThan",
          description: `OceanPulse: ${params?.metric || "cpu"} alert`,
          enabled: true,
          entities: [String(resource_id)],
          tags: ["oceanpulse"],
          type: `v1/insights/droplet/${params?.metric || "cpu"}_percent`,
          value: params?.threshold || 80,
          window: "5m",
        });
        result.status = "alert_created";
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      resource_id,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
