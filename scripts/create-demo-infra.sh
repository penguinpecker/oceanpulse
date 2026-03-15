#!/bin/bash
# ═══════════════════════════════════════════════════
# OceanPulse — Demo Infrastructure Setup
# Creates intentionally misconfigured resources for the 3-min demo video
# WARNING: This creates real billable resources. Destroy after recording.
# ═══════════════════════════════════════════════════

set -e

API="https://api.digitalocean.com/v2"
TOKEN="${DIGITALOCEAN_API_TOKEN:?Set DIGITALOCEAN_API_TOKEN first}"
HEADERS=(-H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN")
REGION="nyc1"
SSH_KEYS=$(curl -s "$API/account/keys" "${HEADERS[@]}" | python3 -c "
import sys,json
keys = json.load(sys.stdin).get('ssh_keys',[])
print(json.dumps([k['id'] for k in keys]))
")

echo "═══ Creating Demo Infrastructure ═══"
echo "Region: $REGION"
echo ""

# 1. Production web server — NO FIREWALL (security issue)
echo "[1/5] Creating web-prod-1 (no firewall)..."
D1=$(curl -s -X POST "$API/droplets" "${HEADERS[@]}" -d "{
  \"name\": \"web-prod-1\",
  \"region\": \"$REGION\",
  \"size\": \"s-2vcpu-4gb\",
  \"image\": \"ubuntu-24-04-x64\",
  \"ssh_keys\": $SSH_KEYS,
  \"monitoring\": true,
  \"tags\": [\"oceanpulse-demo\", \"production\"]
}")
D1_ID=$(echo "$D1" | python3 -c "import sys,json; print(json.load(sys.stdin)['droplet']['id'])")
echo "  Created: $D1_ID (no firewall = security issue)"

# 2. API server — OVERSIZED (cost issue: 8GB for a tiny workload)
echo "[2/5] Creating api-server (oversized)..."
D2=$(curl -s -X POST "$API/droplets" "${HEADERS[@]}" -d "{
  \"name\": \"api-server\",
  \"region\": \"$REGION\",
  \"size\": \"s-4vcpu-8gb\",
  \"image\": \"ubuntu-24-04-x64\",
  \"ssh_keys\": $SSH_KEYS,
  \"monitoring\": true,
  \"tags\": [\"oceanpulse-demo\", \"production\"]
}")
D2_ID=$(echo "$D2" | python3 -c "import sys,json; print(json.load(sys.stdin)['droplet']['id'])")
echo "  Created: $D2_ID (oversized = cost issue)"

# 3. Staging server — fine, small
echo "[3/5] Creating staging-01..."
D3=$(curl -s -X POST "$API/droplets" "${HEADERS[@]}" -d "{
  \"name\": \"staging-01\",
  \"region\": \"$REGION\",
  \"size\": \"s-1vcpu-2gb\",
  \"image\": \"ubuntu-22-04-x64\",
  \"ssh_keys\": $SSH_KEYS,
  \"monitoring\": true,
  \"tags\": [\"oceanpulse-demo\", \"staging\"]
}")
D3_ID=$(echo "$D3" | python3 -c "import sys,json; print(json.load(sys.stdin)['droplet']['id'])")
echo "  Created: $D3_ID (staging, ok)"

# 4. Unattached volume — WASTE (cost issue)
echo "[4/5] Creating unattached volume..."
VOL=$(curl -s -X POST "$API/volumes" "${HEADERS[@]}" -d "{
  \"size_gigabytes\": 50,
  \"name\": \"old-data-vol\",
  \"region\": \"$REGION\",
  \"description\": \"Legacy data - forgot to delete\",
  \"tags\": [\"oceanpulse-demo\"]
}")
VOL_ID=$(echo "$VOL" | python3 -c "import sys,json; print(json.load(sys.stdin)['volume']['id'])")
echo "  Created: $VOL_ID (unattached = cost waste)"

# 5. Snapshot some stuff for extra waste
echo "[5/5] Creating a snapshot..."
SNAP=$(curl -s -X POST "$API/droplets/$D3_ID/actions" "${HEADERS[@]}" -d '{
  "type": "snapshot",
  "name": "old-backup-jan-2025"
}')
echo "  Snapshot queued"

echo ""
echo "═══ Demo Infrastructure Ready ═══"
echo ""
echo "Resources created:"
echo "  web-prod-1:  $D1_ID  (no firewall, no backups)"
echo "  api-server:  $D2_ID  (oversized, no backups)"
echo "  staging-01:  $D3_ID  (ok)"
echo "  old-data-vol: $VOL_ID (unattached)"
echo ""
echo "Issues OceanPulse should detect:"
echo "  1. HIGH:   No firewall on web-prod-1"
echo "  2. HIGH:   No firewall on api-server"
echo "  3. HIGH:   api-server oversized (s-4vcpu-8gb for tiny load)"
echo "  4. MEDIUM: No backups on web-prod-1"
echo "  5. MEDIUM: No backups on api-server"
echo "  6. LOW:    Unattached volume old-data-vol ($5/mo)"
echo "  7. LOW:    Old snapshot"
echo ""
echo "To destroy everything after demo:"
echo "  curl -X DELETE '$API/droplets?tag_name=oceanpulse-demo' ${HEADERS[*]}"
echo "  curl -X DELETE '$API/volumes/$VOL_ID' ${HEADERS[*]}"

# Save IDs for cleanup
cat > /tmp/oceanpulse-demo-ids.txt << EOF
D1=$D1_ID
D2=$D2_ID
D3=$D3_ID
VOL=$VOL_ID
EOF
echo ""
echo "Resource IDs saved to /tmp/oceanpulse-demo-ids.txt"
