# OceanPulse — AI Infrastructure Health Agent for DigitalOcean

## Inspiration

Every DigitalOcean user has the same questions: Am I overpaying? Is my infrastructure secure? Are there performance bottlenecks I'm missing? Small teams and startups can't afford a dedicated DevOps engineer to answer these questions. OceanPulse is that engineer — an AI agent that scans your entire DO account, diagnoses problems across cost, security, performance, and architecture, and fixes them with your approval.

## What it does

Connect your DigitalOcean account → OceanPulse scans every resource (Droplets, databases, volumes, firewalls, load balancers, snapshots) → generates a health score across 4 dimensions → surfaces issues with specific fixes → you approve → the agent executes changes via the DO API → health score updates live.

Key features:
- **Diagnose + Fix**: Not just a monitoring dashboard — OceanPulse actually executes approved changes (resize Droplets, create firewalls, enable backups, power off idle GPUs, delete unused volumes)
- **Human-in-the-loop**: Every write operation requires explicit user approval. The agent shows exactly what will change, the cost/savings impact, and any risks before executing.
- **Conversational**: Ask anything about your infrastructure in plain English. "Why is my app slow?" "Can I handle 10x traffic?" "What's my biggest cost risk?"
- **Whale persona**: OceanPulse speaks as a friendly, knowledgeable ocean creature — making complex infrastructure decisions accessible to non-technical founders

## How we built it — DigitalOcean Gradient™ AI Usage

### Gradient AI Platform
- **6 agents** in one workspace: OceanPulse (parent with whale persona), Scanner, Cost Analyzer, Security Auditor, Performance Analyzer, Fixer
- **Multi-agent routing**: Parent routes queries to specialized child agents based on intent detection
- **Knowledge bases**: DigitalOcean documentation crawled via website crawler + best practices guides + pricing data
- **Function calling**: 20+ DO API functions wired as function routes — both read (list resources, get metrics, check billing) and write (resize, create firewall, enable backups, power off, delete)
- **Guardrails**: No destructive action without explicit approval, sensitive data detection for API tokens
- **Agent evaluations**: 30 test cases across cost detection, security auditing, performance analysis, persona consistency, and action approval flows
- **Traceability**: Full trace of every scan → analysis → recommendation → action chain
- **Agent versioning**: Multiple iterations tracked with performance comparison
- **Embeddable chatbot widget**: Drop-in script tag for any website

### Serverless Inference
- **Anthropic Claude** (with reasoning mode) for complex root cause analysis, architecture recommendations, and natural language understanding
- **Meta Llama 3.3 70B** for fast initial triage, resource classification, and metric summarization
- Model comparison via evaluations to optimize cost vs quality per task

### GPU Droplet
- **1-Click Llama** deployment for anomaly pattern detection on infrastructure metric time-series data

### Agent Development Kit (ADK)
- LangGraph state machine: SCAN → ANALYZE → REPORT → CONVERSATION ⇄ FIX
- Custom trace decorators on every node (@trace_tool, @trace_llm)
- Deployed via `gradient agent deploy` to production /run endpoint

### DigitalOcean Ecosystem
- **App Platform**: Next.js frontend dashboard
- **Managed PostgreSQL**: Scan history and action audit log
- **Spaces**: Knowledge base file storage
- **DO API**: Both read and write operations on real infrastructure
- **Monitoring API**: CPU, memory, disk I/O, bandwidth metrics

## Challenges we ran into

The biggest challenge was making write operations safe. We needed the agent to be helpful enough to actually fix problems, but careful enough to never make destructive changes without explicit approval. The human-in-the-loop approval pattern with guardrails solved this — every action shows exactly what changes, the impact, and waits for a "yes."

Getting accurate cost recommendations required understanding DO's pricing across Droplet families, database tiers, volume storage, snapshot costs, and bandwidth. We built the knowledge base from DO's own documentation to keep recommendations current.

## Accomplishments

- The agent can diagnose AND fix real infrastructure in a single conversation
- 30 evaluation test cases passing across all categories
- Health score improves visibly as issues are resolved
- Whale persona makes infrastructure management genuinely enjoyable

## What we learned

Multi-agent routing is powerful for separating concerns. Having a dedicated Security Auditor agent that only thinks about security produces better results than a single agent trying to do everything. The Gradient AI platform made this orchestration simple.

## What's next

- Real-time monitoring with proactive alerts ("Your CPU just spiked to 95%, want me to investigate?")
- Cost forecasting based on usage trends
- Kubernetes cluster analysis for DOKS users
- Team accounts with role-based approval workflows

## Built With

digitalocean, gradient-ai, next.js, typescript, python, langgraph, tailwindcss, lucide, anthropic-claude, meta-llama
