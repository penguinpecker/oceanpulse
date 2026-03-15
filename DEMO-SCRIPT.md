# OceanPulse — Demo Video Script (3 minutes)

## Pre-recording checklist
- [ ] Demo infra created (`./scripts/create-demo-infra.sh`)
- [ ] Wait 15 min for monitoring metrics to populate
- [ ] Frontend running (`cd frontend && npm run dev`)
- [ ] Browser at `localhost:3000`, clear cache
- [ ] Screen recording at 1080p, mic on
- [ ] DO control panel open in second tab (for Gradient dashboard shots)

---

## [0:00–0:15] Hook

**Show:** OceanPulse landing page

**Say:**
"Ever check your DigitalOcean bill and wonder — am I wasting money? Are my servers actually secure? OceanPulse is an AI agent that scans your entire DO infrastructure, finds problems, and fixes them — with your permission. Let me show you."

---

## [0:15–0:35] Connect & Scan

**Action:** Paste DO API token, click Scan

**Show:** Scanning animation — steps completing one by one

**Say:**
"I paste my DO API token — read and write. OceanPulse immediately starts inventorying everything. Droplets, databases, volumes, firewalls, snapshots. It pulls CPU and memory metrics, checks security configs, analyzes spending."

**Show:** Dashboard loads with health score 47/100

**Say:**
"And we get a health score. 47 out of 100. Let's see what's wrong."

---

## [0:35–1:10] Issues Revealed

**Show:** Scroll through issues list

**Say:**
"Five issues found, three critical. First — my production Droplet has no firewall. Every port is open to the internet. That's a high severity security risk."

**Show:** Point to second issue

"Second — my API server is running on a 4-CPU, 8-gig Droplet but only using 12% CPU and 23% memory. I'm paying $48 a month for resources I don't need. OceanPulse says I can save $24 by downsizing."

**Show:** Point to volume issue

"And there's a 50-gig volume sitting unattached, costing me $5 a month for nothing."

---

## [1:10–1:50] Fix with Approval

**Action:** Click "Fix" on the firewall issue

**Show:** Chat panel — approval card appears

**Say:**
"Now here's where it gets real. I click Fix on the firewall issue, and OceanPulse shows me exactly what it'll do — create a firewall allowing ports 80, 443, and 22, block everything else. I approve..."

**Action:** Click Approve button

**Show:** Success toast appears, issue disappears from list

"Done. Firewall created. The issue is gone from the list. Now let me resize that oversized Droplet."

**Action:** Click Resize on the API server issue, approve

**Show:** Success toast, cost savings confirmed

"Resized from 8 gigs to 4 gigs. Saving $24 a month, every month."

---

## [1:50–2:20] Chat Interaction

**Action:** Type in chat: "Is my database secure?"

**Show:** Bot responds with analysis

**Say:**
"I can also just ask questions. 'Is my database secure?' — and OceanPulse checks the actual configuration against DO best practices from the knowledge base."

**Action:** Type: "What's my biggest cost risk right now?"

**Show:** Bot gives cost analysis

"It's not a static report — it's a conversation with an agent that understands my specific infrastructure."

---

## [2:20–2:50] Gradient AI Under the Hood

**Switch to:** DO Gradient AI control panel

**Show:** Agent workspace with 6 agents

**Say:**
"Under the hood, OceanPulse runs on DigitalOcean Gradient AI. Six agents in one workspace — a parent that routes to specialized child agents for scanning, cost analysis, security auditing, performance analysis, and executing fixes."

**Show:** Agent traces/traceability view

"Every step is traced. You can see exactly how the agent reasoned through each recommendation."

**Show:** Knowledge base

"The knowledge base crawls DigitalOcean's own documentation so recommendations are always current."

**Show:** Guardrails

"And guardrails ensure no destructive action happens without explicit approval."

**Show:** Evaluations

"We run 30 evaluation test cases to make sure the agent is accurate and stays in character."

---

## [2:50–3:00] Close

**Switch back to:** Dashboard with improved score

**Say:**
"In three minutes, we went from a health score of 47 to 85. That's real firewalls created, real Droplets resized, real money saved — all through AI agents built entirely on DigitalOcean Gradient. OceanPulse. Your AI infrastructure health agent."

**Show:** Logo + GitHub link

---

## Post-recording
- [ ] Destroy demo infra: `curl -X DELETE` from the setup script output
- [ ] Upload to YouTube, set as Public
- [ ] Submit on Devpost with repo link
