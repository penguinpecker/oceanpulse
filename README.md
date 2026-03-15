# OceanPulse

**AI Infrastructure Health Agent for DigitalOcean**

OceanPulse connects to your DigitalOcean account, scans every resource, generates a health score across cost, performance, security, and architecture — then surfaces issues with one-click fixes. You approve, the agent executes via the DO API, and the health score updates live.

**Live Demo:** [sea-turtle-app-vshj7.ondigitalocean.app](https://sea-turtle-app-vshj7.ondigitalocean.app)

**Hackathon:** [DigitalOcean Gradient™ AI Hackathon](https://digitalocean.devpost.com/)

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                │
│                                                                 │
│  Paste DO Token ──► Scan Animation ──► Health Dashboard         │
│                                           │                     │
│                    ┌──────────────────────┤                     │
│                    │                      │                     │
│                    ▼                      ▼                     │
│              AI Chat Advisor        Issues List                 │
│              "How can I cut         [Fix] [Enable] [Delete]     │
│               costs?"                     │                     │
│                    │                      │                     │
│                    ▼                      ▼                     │
│              Proposes Fix ◄──────── User Clicks Fix             │
│                    │                                            │
│                    ▼                                            │
│              [Approve] [Cancel]                                 │
│                    │                                            │
│                    ▼                                            │
│              Executes via DO API                                │
│                    │                                            │
│                    ▼                                            │
│              Score Updates Live                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DO App Platform (Next.js 15)                     │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │  /api/scan   │  │  /api/chat   │  │  /api/fix    │                │
│  │             │  │              │  │              │                │
│  │ Inventories │  │ AI Advisor   │  │ Executes     │                │
│  │ all DO      │  │ w/ live      │  │ approved     │                │
│  │ resources   │  │ infra data   │  │ actions      │                │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘                │
│         │                │                  │                        │
│         ▼                ▼                  ▼                        │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              DigitalOcean API (v2)                       │        │
│  │                                                         │        │
│  │  READ                          WRITE                    │        │
│  │  • GET /droplets               • POST /firewalls        │        │
│  │  • GET /databases              • POST /droplets/actions │        │
│  │  • GET /volumes                  (resize, backup, power)│        │
│  │  • GET /firewalls              • DELETE /volumes         │        │
│  │  • GET /snapshots              • POST /monitoring/alerts│        │
│  │  • GET /customers/balance                               │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│         ┌──────────────────────────────────┐                         │
│         │   DO Serverless Inference        │                         │
│         │   Model: openai-gpt-oss-20b      │                         │
│         │   Context: live infra + issues   │                         │
│         └──────────────────────────────────┘                         │
│                                                                      │
│         ┌──────────────────────────────────┐                         │
│         │   DO Gradient Agent Platform     │                         │
│         │   Agent: OceanPulse              │                         │
│         │   Workspace: OceanPulse          │                         │
│         └──────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

## DigitalOcean Gradient Features Used

| Feature | How It's Used |
|---|---|
| **Gradient Agent Platform** | OceanPulse agent with custom instructions, workspace, and endpoint |
| **Serverless Inference** | AI chat advisor calls `openai-gpt-oss-20b` via DO inference API with live infrastructure context injected into the system prompt |
| **Model Access Keys** | Authenticates serverless inference requests |
| **App Platform** | Hosts the Next.js 15 frontend with auto-deploy on git push |
| **DO API v2 (read)** | Scans Droplets, databases, volumes, firewalls, snapshots, and billing |
| **DO API v2 (write)** | Creates firewalls, enables backups, resizes Droplets, deletes volumes, creates monitoring alerts |

## Health Scoring

OceanPulse generates scores across four dimensions:

- **Security (0–100)** — Deducts 25 points per Droplet without a firewall, 10 per Droplet without backups. A score of 0 means every server is exposed.
- **Cost (0–100)** — Flags unused volumes, unattached storage, and waste. Lower score = more money being burned.
- **Performance (0–100)** — Analyzes CPU, memory, and disk utilization patterns to identify bottlenecks and oversized instances.
- **Architecture (0–100)** — Checks VPC isolation, monitoring, and best practice adherence.
- **Overall** = average of all four.

## Actions the Agent Can Execute

All write operations require explicit user approval before execution.

| Action | What It Does | DO API Call |
|---|---|---|
| **Create Firewall** | Adds firewall allowing HTTP/HTTPS/SSH only | `POST /v2/firewalls` |
| **Enable Backups** | Turns on automated weekly backups | `POST /v2/droplets/{id}/actions` |
| **Resize Droplet** | Power off → resize to smaller instance → power on | `POST /v2/droplets/{id}/actions` |
| **Delete Volume** | Removes unattached block storage | `DELETE /v2/volumes/{id}` |
| **Power Off** | Graceful shutdown of idle Droplets | `POST /v2/droplets/{id}/actions` |
| **Create Alert** | Sets up CPU/memory monitoring alerts | `POST /v2/monitoring/alerts` |

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **AI:** DigitalOcean Serverless Inference (`openai-gpt-oss-20b`), Gradient Agent Platform
- **Infrastructure API:** DigitalOcean API v2 (read + write)
- **Hosting:** DigitalOcean App Platform
- **Typography:** Instrument Sans (body) + IBM Plex Mono (data)
- **Markdown rendering:** `marked` library for chat messages

## Project Structure

```
oceanpulse/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 # Main 3-screen state machine
│   │   │   ├── layout.tsx               # Root layout + fonts
│   │   │   ├── globals.css              # Tailwind v4 theme config
│   │   │   └── api/
│   │   │       ├── scan/route.ts        # DO API scan — inventories all resources, calculates scores
│   │   │       ├── chat/route.ts        # AI advisor — agent → serverless inference fallback
│   │   │       └── fix/route.ts         # Executes approved write actions via DO API
│   │   ├── components/
│   │   │   ├── Topbar.tsx               # Nav bar with connection status
│   │   │   ├── ScoreStrip.tsx           # 5-cell health score display
│   │   │   ├── ChatPanel.tsx            # AI chat with markdown rendering + approval cards
│   │   │   ├── IssuesList.tsx           # Filterable issues with severity + action buttons
│   │   │   ├── ResourceTable.tsx        # Tabbed resource inventory (Droplets, DBs, Volumes, LBs)
│   │   │   ├── ActionHistory.tsx        # Timeline of executed actions
│   │   │   └── Screens.tsx              # Onboard + scanning animation screens
│   │   └── lib/
│   │       └── data.ts                  # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── main.py                              # LangGraph state machine (ADK entrypoint)
├── do_api.py                            # Python DO API wrapper (20+ endpoints)
├── requirements.txt
├── evaluations/
│   └── test-cases.json                  # 30 agent evaluation test cases
├── scripts/
│   ├── setup-agents.sh                  # Creates agents + KB + routes via DO API
│   ├── create-demo-infra.sh             # Creates intentionally misconfigured test resources
│   └── cleanup-demo.sh                  # Destroys demo resources after recording
├── DEMO-SCRIPT.md                       # 3-minute demo video script with timestamps
├── DEVPOST-SUBMISSION.md                # Copy-paste Devpost submission text
├── LICENSE                              # MIT
└── README.md
```

## Running Locally

```bash
git clone https://github.com/penguinpecker/oceanpulse.git
cd oceanpulse/frontend
npm install
```

Create `.env.local`:

```
DIGITALOCEAN_API_TOKEN=dop_v1_your_token
GRADIENT_MODEL_ACCESS_KEY=sk-do-your_key
AGENT_ENDPOINT=https://your-agent.agents.do-ai.run
```

```bash
npm run dev
# → http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DIGITALOCEAN_API_TOKEN` | Yes | DO API token with read+write scope |
| `GRADIENT_MODEL_ACCESS_KEY` | Yes | Model access key from DO Serverless Inference |
| `AGENT_ENDPOINT` | Optional | Gradient agent endpoint URL |
| `AGENT_ACCESS_KEY` | Optional | Agent endpoint access key (if private) |

## Demo Infrastructure

The repo includes scripts to create intentionally misconfigured resources for demo purposes:

```bash
export DIGITALOCEAN_API_TOKEN=your_token

# Create 3 Droplets + 1 unattached volume with security gaps
bash scripts/create-demo-infra.sh

# After recording, destroy everything
bash scripts/cleanup-demo.sh
```

Creates:

| Resource | Config | Issue |
|---|---|---|
| `web-prod-1` | s-2vcpu-4gb, nyc1 | No firewall, no backups |
| `api-server` | s-4vcpu-8gb, nyc1 | No firewall, no backups |
| `staging-01` | s-1vcpu-2gb, nyc1 | No firewall, no backups |
| `old-data-vol` | 50GB block storage | Unattached (waste) |

Total: ~$89/mo (covered by $200 DO free credits).

## What Makes OceanPulse Different

Most infrastructure monitoring tools are read-only dashboards. OceanPulse is different:

1. **Reads AND writes** — doesn't just show problems, fixes them with user approval
2. **AI with live context** — the chat advisor sees your actual resource names, costs, and issues — not generic advice
3. **100% DigitalOcean stack** — Agent Platform + Serverless Inference + App Platform + DO API. No external dependencies.
4. **Human-in-the-loop** — every write operation requires explicit approval. No surprise changes.

## License

[MIT](LICENSE)

## Author

Built by [@penguinpecker](https://github.com/penguinpecker) for the DigitalOcean Gradient™ AI Hackathon 2026.
