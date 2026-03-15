# OceanPulse 🐋

**AI-Powered Infrastructure Health Agent for DigitalOcean**

> Connect your DigitalOcean account → OceanPulse scans your entire infrastructure → generates a health score across cost, performance, security, and architecture → surfaces issues with one-click fixes → you approve → the agent executes via the DO API → health score updates live.

Built for the [DigitalOcean Gradient™ AI Hackathon](https://digitalocean.devpost.com/).

---

## What it does

OceanPulse is an AI DevOps engineer that lives inside your DigitalOcean account. It:

1. **Scans** every resource: Droplets, databases, volumes, load balancers, firewalls, snapshots, App Platform apps
2. **Diagnoses** problems across 4 dimensions:
   - **Cost Efficiency** — oversized Droplets, idle GPUs, unused volumes, forgotten snapshots
   - **Performance** — CPU/memory bottlenecks, high disk I/O, bandwidth spikes
   - **Security** — missing firewalls, open ports, no backups, no VPC isolation
   - **Architecture** — best practice violations, missing monitoring, suboptimal configurations
3. **Proposes fixes** with exact impact estimates (e.g. "Resize this Droplet → save $32/month")
4. **Executes approved fixes** via the DigitalOcean API with human-in-the-loop approval
5. **Stays alive** as a conversational agent you can ask anything about your infrastructure

## How it uses DigitalOcean Gradient™ AI (Full Stack)

### Gradient AI Platform
- **6 agents** in one workspace: Parent (OceanPulse whale persona), Scanner, Cost Analyzer, Performance Analyzer, Security Auditor, Fixer
- **Multi-agent routing**: Parent routes queries to specialized child agents based on intent
- **Knowledge bases**: DO documentation crawled via website crawler + best practices guides + pricing tables uploaded to Spaces
- **Function calling**: 20+ DO API functions wired as function routes (list_droplets, get_cpu_metrics, resize_droplet, create_firewall, etc.)
- **Guardrails**: No destructive action without explicit user approval, sensitive data detection for API tokens, block hallucinated resource IDs
- **Agent evaluations**: 30+ test cases covering oversized Droplet detection, missing firewall catch, idle GPU detection, resize approval flow, persona tone
- **Agent versioning**: Multiple iterations tracked with performance comparison
- **Traceability**: Full trace of every scan → analysis → recommendation → action chain
- **Agent Playground**: Test the agent directly in DO control panel
- **Embeddable chatbot widget**: Drop-in `<script>` tag for any website

### Serverless Inference
- **Anthropic Claude** (reasoning mode) for complex root cause analysis and architecture recommendations
- **Meta Llama 3.3 70B** for fast initial triage and classification
- Multiple model comparison via evaluations to find optimal model per task

### GPU Droplet
- **1-Click Llama** deployment for anomaly pattern detection on metric time-series data
- Self-hosted model for heavy code generation tasks (Terraform, infrastructure-as-code)

### Agent Development Kit (ADK)
- Full LangGraph state machine: SCAN → ANALYZE → REPORT → CONVERSATION ⇄ FIX
- Custom trace decorators on every node (`@trace_tool`, `@trace_llm`, `@trace_retriever`)
- Deployed via `gradient agent deploy` to production `/run` endpoint
- Local development with `gradient agent run`

### DigitalOcean Ecosystem
- **App Platform**: Next.js frontend dashboard with health score visualization, resource inventory, chat interface, action approval buttons
- **Managed PostgreSQL**: Scan history, action audit log, session persistence
- **Spaces**: Knowledge base file storage, scan report archives
- **DO API**: Both read (inventory, metrics, billing) and write (resize, firewall, backups, power off) operations
- **Monitoring API**: CPU, memory, disk I/O, bandwidth, load average metrics

## Agent Persona

OceanPulse speaks as a friendly, knowledgeable whale who genuinely cares about your infrastructure's health. It uses occasional ocean metaphors, celebrates improvements, and delivers bad news kindly but directly. Every destructive action requires explicit approval — the whale never goes rogue.

## Setup

### Prerequisites
- DigitalOcean account with $200 free credits (via [MLH signup](https://mlh.link/digitalocean-signup))
- Python 3.10+
- Gradient ADK Feature Preview enabled

### Quick Start

```bash
# Clone
git clone https://github.com/penguinpecker/oceanpulse.git
cd oceanpulse

# Install
pip install -r requirements.txt

# Configure
cp .env.example .env
# Add your GRADIENT_MODEL_ACCESS_KEY and DIGITALOCEAN_API_TOKEN

# Run locally
gradient agent run

# Deploy to production
gradient agent deploy
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
User → Next.js Dashboard (App Platform)
         ↓
    OceanPulse Parent Agent (Gradient AI)
         ↓ multi-agent routing
    ┌────┼────┬────┬────┐
    ↓    ↓    ↓    ↓    ↓
 Scanner Cost  Perf  Sec  Fixer
    ↓    ↓    ↓    ↓    ↓
 DO API Functions (read + write)
    ↓
 DigitalOcean Infrastructure
```

## Demo

[3-minute demo video](https://youtube.com/watch?v=TODO)

1. Connect a DO account with intentionally misconfigured resources
2. OceanPulse scans and generates health score: 47/100
3. Surfaces 5 issues: oversized Droplet, no firewall, idle GPU, no backups, unused volume
4. User approves fixes one by one
5. Agent executes: resizes Droplet, creates firewall, powers off GPU, enables backups, deletes volume
6. Health score updates live: 47 → 92/100
7. Show Gradient dashboard: agent traces, evaluation results, knowledge base citations

## Judging Criteria Alignment

| Criteria | How OceanPulse delivers |
|---|---|
| **Technological Implementation** | 6 agents, multi-routing, RAG, function calling (20+ functions), guardrails, evaluations, ADK deployment, LangGraph state machine, GPU Droplet, full traceability |
| **Design** | Clean Next.js dashboard, health score visualization, chat interface with whale persona, one-click approval buttons, real-time score updates |
| **Potential Impact** | Every one of DO's 600K+ customers can use this. Especially impactful for startups and small teams who can't afford a DevOps engineer |
| **Quality of Idea** | Not just monitoring — it's an AI that diagnoses AND fixes. Human-in-the-loop ensures safety. The whale persona makes complex infrastructure decisions accessible |

## License

MIT

## Team

Built by [@penguinpecker](https://github.com/penguinpecker) for the DigitalOcean Gradient™ AI Hackathon 2026.
