#!/bin/bash
# ═══════════════════════════════════════════════════
# OceanPulse — Gradient AI Agent Setup Script
# Run this after: export DIGITALOCEAN_API_TOKEN=dop_v1_...
# ═══════════════════════════════════════════════════

set -e

API="https://api.digitalocean.com/v2"
TOKEN="${DIGITALOCEAN_API_TOKEN:?Set DIGITALOCEAN_API_TOKEN first}"
REGION="nyc1"
HEADERS=(-H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN")

echo "═══ OceanPulse Agent Setup ═══"
echo ""

# ── 1. Create Workspace ──
echo "[1/8] Creating workspace..."
WORKSPACE=$(curl -s -X POST "$API/gen-ai/workspaces" "${HEADERS[@]}" -d '{
  "name": "OceanPulse",
  "description": "AI infrastructure health agent for DigitalOcean"
}')
WS_UUID=$(echo "$WORKSPACE" | python3 -c "import sys,json; print(json.load(sys.stdin)['workspace']['uuid'])")
echo "  Workspace: $WS_UUID"

# ── 2. Create Knowledge Base ──
echo "[2/8] Creating knowledge base (DO docs)..."

# First create a Spaces bucket for KB files
echo "  Creating Spaces bucket for KB files..."
# Note: Spaces uses S3-compatible API, bucket creation via control panel recommended
# For hackathon: use website crawler instead

KB=$(curl -s -X POST "$API/gen-ai/knowledge_bases" "${HEADERS[@]}" -d "{
  \"name\": \"do-docs-kb\",
  \"region\": \"$REGION\",
  \"description\": \"DigitalOcean documentation and best practices\",
  \"embedding_model\": \"premium\"
}")
KB_UUID=$(echo "$KB" | python3 -c "import sys,json; print(json.load(sys.stdin)['knowledge_base']['uuid'])")
echo "  Knowledge Base: $KB_UUID"

# Add website data source (crawl DO docs)
echo "  Adding DO docs website crawler..."
curl -s -X POST "$API/gen-ai/knowledge_bases/$KB_UUID/data_sources" "${HEADERS[@]}" -d '{
  "type": "website",
  "website": {
    "url": "https://docs.digitalocean.com/products/",
    "scope": "https://docs.digitalocean.com/"
  }
}' > /dev/null

echo "  Adding DO pricing page..."
curl -s -X POST "$API/gen-ai/knowledge_bases/$KB_UUID/data_sources" "${HEADERS[@]}" -d '{
  "type": "website",
  "website": {
    "url": "https://www.digitalocean.com/pricing",
    "scope": "https://www.digitalocean.com/pricing"
  }
}' > /dev/null

echo "  Adding DO best practices..."
curl -s -X POST "$API/gen-ai/knowledge_bases/$KB_UUID/data_sources" "${HEADERS[@]}" -d '{
  "type": "website",
  "website": {
    "url": "https://docs.digitalocean.com/products/droplets/how-to/",
    "scope": "https://docs.digitalocean.com/products/droplets/"
  }
}' > /dev/null

# ── 3. Create Parent Agent (OceanPulse) ──
echo "[3/8] Creating parent agent (OceanPulse)..."
PARENT=$(curl -s -X POST "$API/gen-ai/agents" "${HEADERS[@]}" -d "{
  \"name\": \"OceanPulse\",
  \"model_uuid\": \"$(curl -s "$API/gen-ai/models" "${HEADERS[@]}" | python3 -c "
import sys,json
models = json.load(sys.stdin).get('models',[])
for m in models:
    if 'claude' in m.get('name','').lower() and 'sonnet' in m.get('name','').lower():
        print(m['uuid']); break
")\",
  \"instruction\": \"You are OceanPulse, a friendly AI infrastructure health agent for DigitalOcean. You have the personality of a wise, warm ocean creature who genuinely cares about infrastructure health. Your job: 1) Scan DO accounts and understand every resource 2) Identify problems across Cost, Performance, Security, and Architecture 3) Explain issues clearly and non-intimidatingly 4) Propose specific fixes with impact estimates 5) Execute approved fixes via DO API. Use occasional ocean metaphors but don't overdo it. When proposing fixes, always show: what changes, cost/savings, and ask for explicit approval. NEVER execute write operations without user saying yes/approve/go ahead. Celebrate improvements enthusiastically.\",
  \"description\": \"AI infrastructure health agent - diagnoses and fixes DO infrastructure\",
  \"project_id\": \"default\",
  \"region\": \"$REGION\",
  \"workspace_uuid\": \"$WS_UUID\",
  \"knowledge_base_uuid\": [\"$KB_UUID\"],
  \"tags\": [\"oceanpulse\", \"hackathon\"]
}")
PARENT_UUID=$(echo "$PARENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['uuid'])")
echo "  Parent Agent: $PARENT_UUID"

# ── 4. Create Child Agents ──
echo "[4/8] Creating child agents..."

# Scanner Agent
SCANNER=$(curl -s -X POST "$API/gen-ai/agents" "${HEADERS[@]}" -d "{
  \"name\": \"Scanner\",
  \"model_uuid\": \"$(curl -s "$API/gen-ai/models" "${HEADERS[@]}" | python3 -c "
import sys,json
models = json.load(sys.stdin).get('models',[])
for m in models:
    if 'llama' in m.get('name','').lower() and '70' in m.get('name','').lower():
        print(m['uuid']); break
")\",
  \"instruction\": \"You are the Scanner agent. Your job is to inventory all DigitalOcean resources and collect metrics. Call the list functions to get all droplets, databases, volumes, firewalls, load balancers, and snapshots. Then call metric functions for CPU, memory, and bandwidth for each droplet. Return a structured summary.\",
  \"region\": \"$REGION\",
  \"workspace_uuid\": \"$WS_UUID\",
  \"tags\": [\"oceanpulse\"]
}")
SCANNER_UUID=$(echo "$SCANNER" | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['uuid'])")
echo "  Scanner: $SCANNER_UUID"

# Cost Agent
COST=$(curl -s -X POST "$API/gen-ai/agents" "${HEADERS[@]}" -d "{
  \"name\": \"CostAnalyzer\",
  \"model_uuid\": \"$(curl -s "$API/gen-ai/models" "${HEADERS[@]}" | python3 -c "
import sys,json
models = json.load(sys.stdin).get('models',[])
for m in models:
    if 'claude' in m.get('name','').lower() and 'sonnet' in m.get('name','').lower():
        print(m['uuid']); break
")\",
  \"instruction\": \"You are the Cost Analyzer agent. Analyze infrastructure spending and find savings opportunities. Check for: oversized Droplets (low CPU/memory usage), idle GPU Droplets, unused volumes, old snapshots, redundant load balancers. For each issue, calculate exact monthly savings and recommend a specific action. Always be precise with dollar amounts.\",
  \"region\": \"$REGION\",
  \"workspace_uuid\": \"$WS_UUID\",
  \"knowledge_base_uuid\": [\"$KB_UUID\"],
  \"tags\": [\"oceanpulse\"]
}")
COST_UUID=$(echo "$COST" | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['uuid'])")
echo "  CostAnalyzer: $COST_UUID"

# Security Agent
SECURITY=$(curl -s -X POST "$API/gen-ai/agents" "${HEADERS[@]}" -d "{
  \"name\": \"SecurityAuditor\",
  \"model_uuid\": \"$(curl -s "$API/gen-ai/models" "${HEADERS[@]}" | python3 -c "
import sys,json
models = json.load(sys.stdin).get('models',[])
for m in models:
    if 'claude' in m.get('name','').lower() and 'sonnet' in m.get('name','').lower():
        print(m['uuid']); break
")\",
  \"instruction\": \"You are the Security Auditor agent. Check infrastructure for security vulnerabilities: missing firewalls, overly permissive firewall rules (0.0.0.0/0 on SSH), no automated backups, Droplets not in VPC, missing monitoring agents, exposed database ports. Rate each issue as high/medium/low severity. Be specific about what's at risk.\",
  \"region\": \"$REGION\",
  \"workspace_uuid\": \"$WS_UUID\",
  \"knowledge_base_uuid\": [\"$KB_UUID\"],
  \"tags\": [\"oceanpulse\"]
}")
SECURITY_UUID=$(echo "$SECURITY" | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['uuid'])")
echo "  SecurityAuditor: $SECURITY_UUID"

# Performance Agent
PERF=$(curl -s -X POST "$API/gen-ai/agents" "${HEADERS[@]}" -d "{
  \"name\": \"PerformanceAnalyzer\",
  \"model_uuid\": \"$(curl -s "$API/gen-ai/models" "${HEADERS[@]}" | python3 -c "
import sys,json
models = json.load(sys.stdin).get('models',[])
for m in models:
    if 'claude' in m.get('name','').lower() and 'sonnet' in m.get('name','').lower():
        print(m['uuid']); break
")\",
  \"instruction\": \"You are the Performance Analyzer agent. Analyze Droplet metrics to find bottlenecks. Check for: sustained high CPU (>80%), memory pressure (>85%), high disk I/O, bandwidth spikes, load average exceeding vCPU count. Recommend scaling up, optimizing, or redistributing workloads. Use DO documentation knowledge to suggest specific Droplet sizes.\",
  \"region\": \"$REGION\",
  \"workspace_uuid\": \"$WS_UUID\",
  \"knowledge_base_uuid\": [\"$KB_UUID\"],
  \"tags\": [\"oceanpulse\"]
}")
PERF_UUID=$(echo "$PERF" | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['uuid'])")
echo "  PerformanceAnalyzer: $PERF_UUID"

# Fixer Agent
FIXER=$(curl -s -X POST "$API/gen-ai/agents" "${HEADERS[@]}" -d "{
  \"name\": \"Fixer\",
  \"model_uuid\": \"$(curl -s "$API/gen-ai/models" "${HEADERS[@]}" | python3 -c "
import sys,json
models = json.load(sys.stdin).get('models',[])
for m in models:
    if 'claude' in m.get('name','').lower() and 'sonnet' in m.get('name','').lower():
        print(m['uuid']); break
")\",
  \"instruction\": \"You are the Fixer agent. You execute approved infrastructure changes via the DO API. You ONLY act when explicitly approved by the user. Before executing, always confirm: what will change, the expected outcome, and any risks. After executing, report the result and suggest a re-scan to verify. Available actions: resize_droplet, power_off_droplet, enable_backups, create_firewall, delete_volume, delete_snapshot, create_alert.\",
  \"region\": \"$REGION\",
  \"workspace_uuid\": \"$WS_UUID\",
  \"tags\": [\"oceanpulse\"]
}")
FIXER_UUID=$(echo "$FIXER" | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['uuid'])")
echo "  Fixer: $FIXER_UUID"

# ── 5. Wire Agent Routes ──
echo "[5/8] Setting up agent routes..."

for CHILD_UUID in "$SCANNER_UUID" "$COST_UUID" "$SECURITY_UUID" "$PERF_UUID" "$FIXER_UUID"; do
  case "$CHILD_UUID" in
    "$SCANNER_UUID") ROUTE_NAME="scan-route"; IF_CASE="for scanning, inventorying, or listing infrastructure resources and metrics" ;;
    "$COST_UUID") ROUTE_NAME="cost-route"; IF_CASE="for cost analysis, spending questions, savings opportunities, or right-sizing" ;;
    "$SECURITY_UUID") ROUTE_NAME="security-route"; IF_CASE="for security audits, firewall checks, backup status, VPC, or vulnerability questions" ;;
    "$PERF_UUID") ROUTE_NAME="perf-route"; IF_CASE="for performance analysis, CPU, memory, disk, bandwidth bottlenecks, or scaling questions" ;;
    "$FIXER_UUID") ROUTE_NAME="fix-route"; IF_CASE="when user approves a fix, says yes, approve, go ahead, or wants to execute an infrastructure change" ;;
  esac

  curl -s -X POST "$API/gen-ai/agents/$PARENT_UUID/child_agents/$CHILD_UUID" "${HEADERS[@]}" -d "{
    \"parent_agent_uuid\": \"$PARENT_UUID\",
    \"child_agent_uuid\": \"$CHILD_UUID\",
    \"route_name\": \"$ROUTE_NAME\",
    \"if_case\": \"$IF_CASE\"
  }" > /dev/null
  echo "  Route: $ROUTE_NAME → $CHILD_UUID"
done

# ── 6. Create Guardrails ──
echo "[6/8] Setting up guardrails..."

curl -s -X POST "$API/gen-ai/agents/$PARENT_UUID/guardrails" "${HEADERS[@]}" -d '{
  "name": "no-destructive-without-approval",
  "description": "Block any write operations unless user explicitly approves",
  "type": "output",
  "rules": [
    {
      "rule_name": "require_approval",
      "message": "I need your explicit approval before making any changes. Please confirm with yes or approve."
    }
  ]
}' > /dev/null

curl -s -X POST "$API/gen-ai/agents/$PARENT_UUID/guardrails" "${HEADERS[@]}" -d '{
  "name": "sensitive-data-detection",
  "description": "Detect and mask API tokens, passwords, private keys in output",
  "type": "output",
  "rules": [
    {
      "rule_name": "sensitive_data",
      "message": "Sensitive data detected and masked for security."
    }
  ]
}' > /dev/null

echo "  2 guardrails created"

# ── 7. Create Agent Access Keys ──
echo "[7/8] Creating access keys..."

PARENT_KEY=$(curl -s -X POST "$API/gen-ai/agents/$PARENT_UUID/api_keys" "${HEADERS[@]}" -d '{
  "agent_uuid": "'$PARENT_UUID'",
  "name": "oceanpulse-frontend"
}')
ACCESS_KEY=$(echo "$PARENT_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',{}).get('key',''))")
ENDPOINT=$(echo "$PARENT_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',{}).get('endpoint',''))" 2>/dev/null || echo "check control panel")
echo "  Access Key: ${ACCESS_KEY:0:20}..."
echo "  Endpoint: $ENDPOINT"

# ── 8. Summary ──
echo ""
echo "═══ Setup Complete ═══"
echo ""
echo "Workspace:       $WS_UUID"
echo "Knowledge Base:  $KB_UUID (indexing in progress...)"
echo "Parent Agent:    $PARENT_UUID"
echo "Scanner Agent:   $SCANNER_UUID"
echo "Cost Agent:      $COST_UUID"
echo "Security Agent:  $SECURITY_UUID"
echo "Perf Agent:      $PERF_UUID"
echo "Fixer Agent:     $FIXER_UUID"
echo ""
echo "Add to your frontend .env:"
echo "  AGENT_ENDPOINT=$ENDPOINT"
echo "  AGENT_ACCESS_KEY=$ACCESS_KEY"
echo ""
echo "Next steps:"
echo "  1. Wait for KB indexing to complete (~5-10 min)"
echo "  2. Test in Agent Playground at https://cloud.digitalocean.com/gen-ai"
echo "  3. Add function routes for DO API calls"
echo "  4. Run evaluations: ./run-evals.sh"
echo "  5. Deploy ADK: cd .. && gradient agent deploy"
