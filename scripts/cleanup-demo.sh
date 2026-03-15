#!/bin/bash
# Destroy all OceanPulse demo resources
set -e

API="https://api.digitalocean.com/v2"
TOKEN="${DIGITALOCEAN_API_TOKEN:?Set DIGITALOCEAN_API_TOKEN first}"
HEADERS=(-H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN")

echo "Destroying all resources tagged 'oceanpulse-demo'..."

# Delete Droplets by tag
curl -s -X DELETE "$API/droplets?tag_name=oceanpulse-demo" "${HEADERS[@]}"
echo "  Droplets destroyed"

# Delete volumes
VOLS=$(curl -s "$API/volumes?per_page=200" "${HEADERS[@]}" | python3 -c "
import sys,json
vols = json.load(sys.stdin).get('volumes',[])
for v in vols:
    if 'oceanpulse-demo' in v.get('tags',[]) or 'old-data' in v.get('name',''):
        print(v['id'])
")
for VID in $VOLS; do
  curl -s -X DELETE "$API/volumes/$VID" "${HEADERS[@]}"
  echo "  Volume $VID destroyed"
done

# Delete firewalls created by OceanPulse
FWS=$(curl -s "$API/firewalls" "${HEADERS[@]}" | python3 -c "
import sys,json
fws = json.load(sys.stdin).get('firewalls',[])
for fw in fws:
    if 'oceanpulse' in fw.get('name',''):
        print(fw['id'])
")
for FID in $FWS; do
  curl -s -X DELETE "$API/firewalls/$FID" "${HEADERS[@]}"
  echo "  Firewall $FID destroyed"
done

echo ""
echo "Cleanup complete. Check your DO dashboard to confirm."
