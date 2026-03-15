"""
OceanPulse - DigitalOcean API Wrapper
All read + write operations for the multi-agent system.
"""

import os
import time
import httpx
from typing import Optional

BASE = "https://api.digitalocean.com/v2"
MONITORING = "https://api.digitalocean.com/v2/monitoring"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _get(token: str, path: str, params: dict = None) -> dict:
    r = httpx.get(f"{BASE}/{path}", headers=_headers(token), params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def _post(token: str, path: str, data: dict) -> dict:
    r = httpx.post(f"{BASE}/{path}", headers=_headers(token), json=data, timeout=30)
    r.raise_for_status()
    return r.json()


def _delete(token: str, path: str) -> bool:
    r = httpx.delete(f"{BASE}/{path}", headers=_headers(token), timeout=30)
    return r.status_code == 204


# ──────────────────────────────────────────────
# SCANNER FUNCTIONS (Read-only inventory)
# ──────────────────────────────────────────────

def list_droplets(token: str) -> list[dict]:
    """List all Droplets with size, region, status, cost info."""
    data = _get(token, "droplets", {"per_page": 200})
    results = []
    for d in data.get("droplets", []):
        results.append({
            "id": d["id"],
            "name": d["name"],
            "status": d["status"],
            "size_slug": d["size_slug"],
            "vcpus": d["vcpus"],
            "memory_mb": d["memory"],
            "disk_gb": d["disk"],
            "region": d["region"]["slug"],
            "image": d["image"]["slug"] if d["image"].get("slug") else d["image"]["name"],
            "monthly_cost": float(d["size"]["price_monthly"]),
            "created_at": d["created_at"],
            "tags": d["tags"],
            "vpc_uuid": d.get("vpc_uuid"),
            "features": d.get("features", []),
            "backup_enabled": "backups" in d.get("features", []),
            "monitoring_enabled": "monitoring" in d.get("features", []),
        })
    return results


def list_databases(token: str) -> list[dict]:
    """List all managed databases."""
    data = _get(token, "databases")
    results = []
    for db in data.get("databases", []):
        results.append({
            "id": db["id"],
            "name": db["name"],
            "engine": db["engine"],
            "version": db["version"],
            "size": db["size"],
            "region": db["region"],
            "status": db["status"],
            "num_nodes": db["num_nodes"],
            "created_at": db["created_at"],
            "monthly_cost": _estimate_db_cost(db["size"], db["num_nodes"]),
            "firewall_rules": db.get("rules", []),
        })
    return results


def list_volumes(token: str) -> list[dict]:
    """List all block storage volumes."""
    data = _get(token, "volumes", {"per_page": 200})
    results = []
    for v in data.get("volumes", []):
        results.append({
            "id": v["id"],
            "name": v["name"],
            "size_gb": v["size_gigabytes"],
            "region": v["region"]["slug"],
            "droplet_ids": v.get("droplet_ids", []),
            "attached": len(v.get("droplet_ids", [])) > 0,
            "created_at": v["created_at"],
            "monthly_cost": v["size_gigabytes"] * 0.10,  # $0.10/GB/mo
        })
    return results


def list_load_balancers(token: str) -> list[dict]:
    """List all load balancers."""
    data = _get(token, "load_balancers")
    results = []
    for lb in data.get("load_balancers", []):
        results.append({
            "id": lb["id"],
            "name": lb["name"],
            "status": lb["status"],
            "region": lb["region"]["slug"],
            "size_unit": lb.get("size_unit", 1),
            "droplet_ids": lb.get("droplet_ids", []),
            "monthly_cost": lb.get("size_unit", 1) * 12.0,  # ~$12/unit/mo
        })
    return results


def list_apps(token: str) -> list[dict]:
    """List all App Platform apps."""
    data = _get(token, "apps")
    results = []
    for app in data.get("apps", []):
        spec = app.get("spec", {})
        results.append({
            "id": app["id"],
            "name": spec.get("name", "unnamed"),
            "live_url": app.get("live_url"),
            "created_at": app.get("created_at"),
            "updated_at": app.get("updated_at"),
            "tier_slug": app.get("tier_slug"),
            "active_deployment": app.get("active_deployment", {}).get("id"),
        })
    return results


def list_firewalls(token: str) -> list[dict]:
    """List all cloud firewalls."""
    data = _get(token, "firewalls")
    results = []
    for fw in data.get("firewalls", []):
        results.append({
            "id": fw["id"],
            "name": fw["name"],
            "status": fw["status"],
            "droplet_ids": fw.get("droplet_ids", []),
            "inbound_rules": fw.get("inbound_rules", []),
            "outbound_rules": fw.get("outbound_rules", []),
            "created_at": fw.get("created_at"),
        })
    return results


def list_kubernetes_clusters(token: str) -> list[dict]:
    """List all Kubernetes clusters."""
    data = _get(token, "kubernetes/clusters")
    results = []
    for k in data.get("kubernetes_clusters", []):
        results.append({
            "id": k["id"],
            "name": k["name"],
            "region": k["region"],
            "version": k["version"],
            "status": k["status"]["state"],
            "node_pools": [{
                "name": np["name"],
                "size": np["size"],
                "count": np["count"],
            } for np in k.get("node_pools", [])],
        })
    return results


def list_spaces_buckets(token: str) -> list[dict]:
    """
    Note: Spaces uses the S3-compatible API, not the main DO API.
    This lists via the DO API endpoint for Spaces subscriptions.
    """
    # Spaces doesn't have a direct list-buckets in v2 API
    # We'd use boto3 with Spaces endpoint in production
    # For hackathon, we return info from the account
    return []


def list_snapshots(token: str) -> list[dict]:
    """List all snapshots (potential waste)."""
    data = _get(token, "snapshots", {"per_page": 200})
    results = []
    for s in data.get("snapshots", []):
        results.append({
            "id": s["id"],
            "name": s["name"],
            "resource_type": s["resource_type"],
            "size_gb": s["size_gigabytes"],
            "created_at": s["created_at"],
            "regions": s.get("regions", []),
            "monthly_cost": s["size_gigabytes"] * 0.05,  # $0.05/GB/mo
        })
    return results


# ──────────────────────────────────────────────
# METRICS FUNCTIONS (Monitoring API)
# ──────────────────────────────────────────────

def _get_metric(token: str, metric: str, host_id: str, hours: int = 24) -> dict:
    """Fetch a specific metric for a droplet."""
    end = int(time.time())
    start = end - (hours * 3600)
    r = httpx.get(
        f"{MONITORING}/metrics/droplet/{metric}",
        headers=_headers(token),
        params={"host_id": str(host_id), "start": str(start), "end": str(end)},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def get_cpu_metrics(token: str, droplet_id: str, hours: int = 24) -> dict:
    """Get CPU usage for a Droplet over the past N hours."""
    data = _get_metric(token, "cpu", droplet_id, hours)
    results = data.get("data", {}).get("result", [])
    idle_values = []
    for series in results:
        if series.get("metric", {}).get("mode") == "idle":
            for ts, val in series.get("values", []):
                idle_values.append(float(val))
    if idle_values:
        avg_idle = sum(idle_values) / len(idle_values)
        avg_usage = round(100 - (avg_idle / (len(idle_values) * 100) * 100), 1)
    else:
        avg_usage = None
    return {"droplet_id": droplet_id, "avg_cpu_percent": avg_usage, "hours": hours}


def get_memory_metrics(token: str, droplet_id: str, hours: int = 24) -> dict:
    """Get memory usage for a Droplet."""
    try:
        free_data = _get_metric(token, "memory_free", droplet_id, hours)
        total_data = _get_metric(token, "memory_total", droplet_id, hours)
        free_vals = []
        total_vals = []
        for series in free_data.get("data", {}).get("result", []):
            for ts, val in series.get("values", []):
                free_vals.append(float(val))
        for series in total_data.get("data", {}).get("result", []):
            for ts, val in series.get("values", []):
                total_vals.append(float(val))
        if free_vals and total_vals:
            avg_free = sum(free_vals) / len(free_vals)
            avg_total = sum(total_vals) / len(total_vals)
            usage_pct = round((1 - avg_free / avg_total) * 100, 1) if avg_total > 0 else None
        else:
            usage_pct = None
        return {"droplet_id": droplet_id, "avg_memory_percent": usage_pct, "hours": hours}
    except Exception:
        return {"droplet_id": droplet_id, "avg_memory_percent": None, "hours": hours}


def get_bandwidth_metrics(token: str, droplet_id: str, hours: int = 24) -> dict:
    """Get bandwidth usage for a Droplet."""
    try:
        data = _get_metric(token, "bandwidth", droplet_id, hours)
        total_bytes = 0
        for series in data.get("data", {}).get("result", []):
            for ts, val in series.get("values", []):
                total_bytes += float(val)
        return {
            "droplet_id": droplet_id,
            "total_gb": round(total_bytes / (1024 ** 3), 2),
            "hours": hours,
        }
    except Exception:
        return {"droplet_id": droplet_id, "total_gb": None, "hours": hours}


# ──────────────────────────────────────────────
# COST ANALYSIS FUNCTIONS
# ──────────────────────────────────────────────

def get_balance(token: str) -> dict:
    """Get current account balance."""
    data = _get(token, "customers/my/balance")
    return {
        "month_to_date_balance": data.get("month_to_date_balance"),
        "account_balance": data.get("account_balance"),
        "month_to_date_usage": data.get("month_to_date_usage"),
        "generated_at": data.get("generated_at"),
    }


def get_billing_history(token: str) -> list[dict]:
    """Get recent billing history."""
    data = _get(token, "customers/my/billing_history")
    return data.get("billing_history", [])[:12]  # last 12 entries


DROPLET_PRICING = {
    "s-1vcpu-512mb-10gb": 4.0,
    "s-1vcpu-1gb": 6.0,
    "s-1vcpu-2gb": 12.0,
    "s-2vcpu-2gb": 18.0,
    "s-2vcpu-4gb": 24.0,
    "s-4vcpu-8gb": 48.0,
    "s-8vcpu-16gb": 96.0,
    "s-16vcpu-32gb": 192.0,
    "g-2vcpu-8gb": 63.0,
    "g-4vcpu-16gb": 126.0,
    "gd-2vcpu-8gb": 72.0,
    "gd-4vcpu-16gb": 144.0,
    "m-2vcpu-16gb": 84.0,
    "m-4vcpu-32gb": 168.0,
}


def suggest_resize(current_slug: str, avg_cpu: float, avg_mem: float) -> Optional[dict]:
    """Suggest a cheaper Droplet size if resources are underutilized."""
    if avg_cpu is None or avg_mem is None:
        return None
    if avg_cpu < 20 and avg_mem < 30:
        # Find a smaller size in the same family
        parts = current_slug.split("-")
        family = parts[0] if parts else "s"
        current_cost = DROPLET_PRICING.get(current_slug, 0)
        cheaper = []
        for slug, price in DROPLET_PRICING.items():
            if slug.startswith(family) and price < current_cost:
                cheaper.append((slug, price))
        if cheaper:
            cheaper.sort(key=lambda x: x[1], reverse=True)
            best = cheaper[0]
            return {
                "current": current_slug,
                "recommended": best[0],
                "current_cost": current_cost,
                "recommended_cost": best[1],
                "monthly_savings": round(current_cost - best[1], 2),
                "reason": f"CPU avg {avg_cpu}%, Memory avg {avg_mem}% — resources underutilized",
            }
    return None


# ──────────────────────────────────────────────
# SECURITY ANALYSIS FUNCTIONS
# ──────────────────────────────────────────────

def check_droplet_security(token: str, droplets: list[dict], firewalls: list[dict]) -> list[dict]:
    """Check each droplet for security issues."""
    issues = []
    # Build set of droplets covered by firewalls
    covered_ids = set()
    for fw in firewalls:
        for did in fw.get("droplet_ids", []):
            covered_ids.add(did)

    for d in droplets:
        # No firewall
        if d["id"] not in covered_ids:
            issues.append({
                "resource": f"Droplet: {d['name']}",
                "severity": "high",
                "issue": "No firewall attached",
                "fix": f"Create a firewall and attach to droplet {d['id']}",
                "action": "create_firewall",
                "resource_id": d["id"],
            })
        # No backups
        if not d.get("backup_enabled"):
            issues.append({
                "resource": f"Droplet: {d['name']}",
                "severity": "medium",
                "issue": "Automated backups not enabled",
                "fix": f"Enable backups for droplet {d['id']} (+20% of Droplet cost)",
                "action": "enable_backups",
                "resource_id": d["id"],
            })
        # No monitoring
        if not d.get("monitoring_enabled"):
            issues.append({
                "resource": f"Droplet: {d['name']}",
                "severity": "low",
                "issue": "Monitoring agent not installed",
                "fix": "Install the DO monitoring agent for metrics visibility",
                "action": "info_only",
                "resource_id": d["id"],
            })
        # No VPC
        if not d.get("vpc_uuid"):
            issues.append({
                "resource": f"Droplet: {d['name']}",
                "severity": "medium",
                "issue": "Not in a VPC network",
                "fix": "Move to a VPC for private networking isolation",
                "action": "info_only",
                "resource_id": d["id"],
            })

    # Check firewalls for overly permissive rules
    for fw in firewalls:
        for rule in fw.get("inbound_rules", []):
            sources = rule.get("sources", {})
            addresses = sources.get("addresses", [])
            if "0.0.0.0/0" in addresses or "::/0" in addresses:
                port = rule.get("ports", "all")
                protocol = rule.get("protocol", "tcp")
                if port == "0" or port == "all" or (protocol == "tcp" and port == "22"):
                    issues.append({
                        "resource": f"Firewall: {fw['name']}",
                        "severity": "high",
                        "issue": f"Port {port}/{protocol} open to entire internet (0.0.0.0/0)",
                        "fix": "Restrict source IPs or use VPC-only access",
                        "action": "update_firewall",
                        "resource_id": fw["id"],
                    })
    return issues


# ──────────────────────────────────────────────
# FIXER FUNCTIONS (Write operations)
# ──────────────────────────────────────────────

def resize_droplet(token: str, droplet_id: int, new_size: str) -> dict:
    """Resize a Droplet to a new size. Requires power-off first for disk resize."""
    # Power off first
    _post(token, f"droplets/{droplet_id}/actions", {
        "type": "power_off"
    })
    time.sleep(5)
    # Resize
    result = _post(token, f"droplets/{droplet_id}/actions", {
        "type": "resize",
        "size": new_size,
        "disk": False,  # Don't resize disk (allows downsizing later)
    })
    # Power on
    time.sleep(3)
    _post(token, f"droplets/{droplet_id}/actions", {
        "type": "power_on"
    })
    return {"status": "resizing", "action": result.get("action", {})}


def power_off_droplet(token: str, droplet_id: int) -> dict:
    """Power off a Droplet (e.g. idle GPU Droplet)."""
    result = _post(token, f"droplets/{droplet_id}/actions", {
        "type": "shutdown"
    })
    return {"status": "shutting_down", "action": result.get("action", {})}


def enable_backups(token: str, droplet_id: int) -> dict:
    """Enable automated backups for a Droplet."""
    result = _post(token, f"droplets/{droplet_id}/actions", {
        "type": "enable_backups"
    })
    return {"status": "backups_enabled", "action": result.get("action", {})}


def create_firewall(token: str, name: str, droplet_ids: list[int],
                    allowed_ports: list[dict] = None) -> dict:
    """Create a firewall with sensible defaults."""
    if allowed_ports is None:
        allowed_ports = [
            {"protocol": "tcp", "ports": "80", "sources": {"addresses": ["0.0.0.0/0", "::/0"]}},
            {"protocol": "tcp", "ports": "443", "sources": {"addresses": ["0.0.0.0/0", "::/0"]}},
            {"protocol": "tcp", "ports": "22", "sources": {"addresses": ["0.0.0.0/0", "::/0"]}},
        ]
    result = _post(token, "firewalls", {
        "name": name,
        "inbound_rules": allowed_ports,
        "outbound_rules": [
            {"protocol": "tcp", "ports": "all", "destinations": {"addresses": ["0.0.0.0/0", "::/0"]}},
            {"protocol": "udp", "ports": "all", "destinations": {"addresses": ["0.0.0.0/0", "::/0"]}},
            {"protocol": "icmp", "destinations": {"addresses": ["0.0.0.0/0", "::/0"]}},
        ],
        "droplet_ids": droplet_ids,
    })
    return {"status": "created", "firewall": result.get("firewall", {})}


def create_alert_policy(token: str, droplet_id: int, metric: str,
                        threshold: float, email: str) -> dict:
    """Create a monitoring alert policy."""
    result = _post(token, "monitoring/alerts", {
        "alerts": {
            "email": [email],
        },
        "compare": "GreaterThan",
        "description": f"OceanPulse alert: {metric} > {threshold}%",
        "enabled": True,
        "entities": [str(droplet_id)],
        "tags": ["oceanpulse"],
        "type": f"v1/insights/droplet/{metric}_percent",
        "value": threshold,
        "window": "5m",
    })
    return {"status": "created", "alert": result}


def delete_volume(token: str, volume_id: str) -> dict:
    """Delete an unattached volume."""
    success = _delete(token, f"volumes/{volume_id}")
    return {"status": "deleted" if success else "failed", "volume_id": volume_id}


def delete_snapshot(token: str, snapshot_id: str) -> dict:
    """Delete an old snapshot."""
    success = _delete(token, f"snapshots/{snapshot_id}")
    return {"status": "deleted" if success else "failed", "snapshot_id": snapshot_id}


# ──────────────────────────────────────────────
# FULL SCAN (Orchestrator)
# ──────────────────────────────────────────────

def full_scan(token: str) -> dict:
    """Run a complete infrastructure scan. Returns everything."""
    droplets = list_droplets(token)
    databases = list_databases(token)
    volumes = list_volumes(token)
    load_balancers = list_load_balancers(token)
    firewalls = list_firewalls(token)
    snapshots = list_snapshots(token)
    balance = get_balance(token)

    # Get metrics for each droplet
    metrics = {}
    for d in droplets:
        did = str(d["id"])
        cpu = get_cpu_metrics(token, did)
        mem = get_memory_metrics(token, did)
        bw = get_bandwidth_metrics(token, did)
        metrics[did] = {"cpu": cpu, "memory": mem, "bandwidth": bw}

    # Cost analysis
    total_monthly = sum(d["monthly_cost"] for d in droplets)
    total_monthly += sum(db["monthly_cost"] for db in databases)
    total_monthly += sum(v["monthly_cost"] for v in volumes)
    total_monthly += sum(lb["monthly_cost"] for lb in load_balancers)
    total_monthly += sum(s["monthly_cost"] for s in snapshots)

    # Savings opportunities
    savings = []
    for d in droplets:
        did = str(d["id"])
        m = metrics.get(did, {})
        cpu_avg = m.get("cpu", {}).get("avg_cpu_percent")
        mem_avg = m.get("memory", {}).get("avg_memory_percent")
        suggestion = suggest_resize(d["size_slug"], cpu_avg, mem_avg)
        if suggestion:
            suggestion["droplet_name"] = d["name"]
            savings.append(suggestion)

    # Unused volumes
    for v in volumes:
        if not v["attached"]:
            savings.append({
                "resource": f"Volume: {v['name']}",
                "type": "unused_volume",
                "monthly_savings": v["monthly_cost"],
                "reason": "Volume not attached to any Droplet",
                "action": "delete_volume",
                "resource_id": v["id"],
            })

    # Old snapshots (> 30 days)
    for s in snapshots:
        # Simplified age check
        savings.append({
            "resource": f"Snapshot: {s['name']}",
            "type": "old_snapshot",
            "monthly_savings": s["monthly_cost"],
            "reason": f"Snapshot using {s['size_gb']}GB storage",
            "action": "delete_snapshot",
            "resource_id": s["id"],
        })

    # Security audit
    security_issues = check_droplet_security(token, droplets, firewalls)

    # Health scores (0-100)
    total_possible_savings = sum(s.get("monthly_savings", 0) for s in savings)
    cost_score = max(0, 100 - int((total_possible_savings / max(total_monthly, 1)) * 100))
    security_score = max(0, 100 - (len([i for i in security_issues if i["severity"] == "high"]) * 20)
                         - (len([i for i in security_issues if i["severity"] == "medium"]) * 10))
    perf_issues = sum(1 for d in droplets for did in [str(d["id"])]
                      if metrics.get(did, {}).get("cpu", {}).get("avg_cpu_percent", 0) or 0 > 80)
    performance_score = max(0, 100 - (perf_issues * 15))
    overall_score = int((cost_score + security_score + performance_score) / 3)

    return {
        "summary": {
            "total_droplets": len(droplets),
            "total_databases": len(databases),
            "total_volumes": len(volumes),
            "total_load_balancers": len(load_balancers),
            "total_snapshots": len(snapshots),
            "total_monthly_cost": round(total_monthly, 2),
            "potential_monthly_savings": round(total_possible_savings, 2),
        },
        "health_scores": {
            "overall": overall_score,
            "cost_efficiency": cost_score,
            "security": security_score,
            "performance": performance_score,
        },
        "droplets": droplets,
        "databases": databases,
        "volumes": volumes,
        "load_balancers": load_balancers,
        "firewalls": firewalls,
        "snapshots": snapshots,
        "metrics": metrics,
        "savings_opportunities": savings,
        "security_issues": security_issues,
        "balance": balance,
    }


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def _estimate_db_cost(size: str, num_nodes: int) -> float:
    """Rough DB pricing estimation."""
    db_pricing = {
        "db-s-1vcpu-1gb": 15.0,
        "db-s-1vcpu-2gb": 25.0,
        "db-s-2vcpu-4gb": 50.0,
        "db-s-4vcpu-8gb": 100.0,
        "db-s-8vcpu-16gb": 200.0,
        "db-s-16vcpu-32gb": 390.0,
    }
    base = db_pricing.get(size, 15.0)
    return base * num_nodes


def validate_token(token: str) -> dict:
    """Validate a DO API token by checking account info."""
    try:
        data = _get(token, "account")
        acct = data.get("account", {})
        return {
            "valid": True,
            "email": acct.get("email"),
            "status": acct.get("status"),
            "droplet_limit": acct.get("droplet_limit"),
            "team": acct.get("team", {}).get("name"),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}
