"""
OceanPulse — AI Infrastructure Health Agent for DigitalOcean
Deployed via Gradient AI ADK (gradient agent deploy)

Multi-agent state machine:
  INIT → SCAN → ANALYZE → REPORT → CONVERSATION ⇄ FIX
"""

import os
import json
from typing import Annotated, TypedDict, Literal
from langgraph.graph import StateGraph, END
from gradient_adk import entrypoint, trace_llm, trace_tool, trace_retriever, RequestContext
from openai import OpenAI

import do_api

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────

GRADIENT_KEY = os.environ.get("GRADIENT_MODEL_ACCESS_KEY", "")
INFERENCE_URL = "https://inference.do-ai.run"

client = OpenAI(
    api_key=GRADIENT_KEY,
    base_url=f"{INFERENCE_URL}/v1",
)

# Use Anthropic Claude for reasoning, Meta Llama for fast triage
REASONING_MODEL = "anthropic/claude-sonnet-4-20250514"
FAST_MODEL = "meta-llama/Llama-3.3-70B-Instruct"

WHALE_SYSTEM_PROMPT = """You are OceanPulse 🐋, a friendly and knowledgeable AI infrastructure health agent for DigitalOcean. You speak with the personality of a wise, warm ocean creature who genuinely cares about the health of your user's infrastructure.

Your job is to:
1. Scan their DigitalOcean account and understand every resource
2. Identify problems across 4 dimensions: Cost Efficiency, Performance, Security, and Architecture
3. Explain issues in clear, non-intimidating language
4. Propose specific fixes with exact impact estimates
5. Execute approved fixes via the DO API with their permission

Personality traits:
- Warm but direct. Don't sugarcoat problems but deliver them kindly.
- Use ocean/whale metaphors occasionally but don't overdo it ("your infrastructure is sailing smoothly" or "I spotted some leaks in the hull")
- Celebrate wins ("Your security score just went from 60 to 95! The ocean is safer today.")
- When proposing a fix, always show: what changes, what it costs/saves, and ask for explicit approval
- Never execute a write operation without the user saying yes/approve/go ahead

When presenting scan results, format them clearly:
- Health Score: X/100 (with breakdown)
- Top Issues: numbered list with severity
- Quick Wins: things that can be fixed immediately
- Ask what they'd like to tackle first

For fixes requiring approval, always present:
- WHAT: exact action to be taken
- IMPACT: cost savings or security improvement
- RISK: any downtime or side effects
- Wait for explicit "yes" or "approve" before executing
"""


# ──────────────────────────────────────────────
# State
# ──────────────────────────────────────────────

class AgentState(TypedDict):
    do_token: str
    scan_data: dict
    messages: list[dict]
    current_phase: str
    pending_action: dict | None
    action_history: list[dict]


# ──────────────────────────────────────────────
# Nodes
# ──────────────────────────────────────────────

@trace_tool("scan_infrastructure")
async def scan_node(state: AgentState) -> AgentState:
    """Scan the entire DO account."""
    token = state["do_token"]
    scan_data = do_api.full_scan(token)
    state["scan_data"] = scan_data
    state["current_phase"] = "analyze"
    return state


@trace_llm("analyze_results")
async def analyze_node(state: AgentState) -> AgentState:
    """Use LLM to analyze scan results and generate report."""
    scan = state["scan_data"]
    
    analysis_prompt = f"""Analyze this DigitalOcean infrastructure scan and generate a health report.

SCAN DATA:
{json.dumps(scan['summary'], indent=2)}

HEALTH SCORES:
{json.dumps(scan['health_scores'], indent=2)}

SAVINGS OPPORTUNITIES:
{json.dumps(scan['savings_opportunities'], indent=2)}

SECURITY ISSUES:
{json.dumps(scan['security_issues'], indent=2)}

Generate a clear, actionable report. Prioritize issues by impact. 
For each issue, propose a specific fix the user can approve.
Use the whale persona - be warm but direct."""

    response = client.chat.completions.create(
        model=REASONING_MODEL,
        messages=[
            {"role": "system", "content": WHALE_SYSTEM_PROMPT},
            {"role": "user", "content": analysis_prompt},
        ],
        max_completion_tokens=2000,
    )
    
    report = response.choices[0].message.content
    state["messages"].append({"role": "assistant", "content": report})
    state["current_phase"] = "conversation"
    return state


@trace_llm("conversation_turn")
async def conversation_node(state: AgentState) -> AgentState:
    """Handle ongoing conversation - answer questions, propose fixes."""
    scan = state["scan_data"]
    messages = state["messages"]
    
    # Build context with scan data
    context = f"""CURRENT INFRASTRUCTURE STATE:
{json.dumps(scan['summary'], indent=2)}

HEALTH SCORES: {json.dumps(scan['health_scores'])}

AVAILABLE ACTIONS (require user approval):
- resize_droplet: Resize a Droplet to a smaller/larger size
- power_off_droplet: Shut down an idle Droplet
- enable_backups: Enable automated backups
- create_firewall: Create and attach a firewall
- delete_volume: Delete an unattached volume
- delete_snapshot: Delete an old snapshot
- create_alert: Set up a monitoring alert

PENDING ACTION: {json.dumps(state.get('pending_action'))}
ACTION HISTORY: {json.dumps(state.get('action_history', []))}

If the user approves a pending action, respond with EXECUTE_ACTION in your message.
If you want to propose a new action, include PROPOSE_ACTION:{{action_json}} in your message.

DROPLETS: {json.dumps(scan.get('droplets', []), indent=2)[:2000]}
SECURITY ISSUES: {json.dumps(scan.get('security_issues', []), indent=2)[:1000]}
SAVINGS: {json.dumps(scan.get('savings_opportunities', []), indent=2)[:1000]}
"""
    
    full_messages = [
        {"role": "system", "content": WHALE_SYSTEM_PROMPT + "\n\n" + context},
    ] + messages[-10:]  # Keep last 10 messages for context window
    
    response = client.chat.completions.create(
        model=REASONING_MODEL,
        messages=full_messages,
        max_completion_tokens=1500,
    )
    
    reply = response.choices[0].message.content
    state["messages"].append({"role": "assistant", "content": reply})
    
    # Check if agent wants to propose or execute an action
    if "PROPOSE_ACTION:" in reply:
        try:
            action_json = reply.split("PROPOSE_ACTION:")[1].split("\n")[0]
            state["pending_action"] = json.loads(action_json)
            # Clean the action tag from the visible message
            clean_reply = reply.replace(f"PROPOSE_ACTION:{action_json}", "").strip()
            state["messages"][-1]["content"] = clean_reply
        except (json.JSONDecodeError, IndexError):
            pass
    
    if "EXECUTE_ACTION" in reply:
        state["current_phase"] = "fix"
        clean_reply = reply.replace("EXECUTE_ACTION", "").strip()
        state["messages"][-1]["content"] = clean_reply
    
    return state


@trace_tool("execute_fix")
async def fix_node(state: AgentState) -> AgentState:
    """Execute an approved fix action via DO API."""
    token = state["do_token"]
    action = state.get("pending_action")
    
    if not action:
        state["messages"].append({
            "role": "assistant",
            "content": "Hmm, I don't have a pending action to execute. Could you tell me what you'd like me to fix?"
        })
        state["current_phase"] = "conversation"
        return state
    
    result = {}
    action_type = action.get("action")
    resource_id = action.get("resource_id")
    
    try:
        if action_type == "resize_droplet":
            result = do_api.resize_droplet(token, int(resource_id), action.get("new_size"))
        elif action_type == "power_off_droplet":
            result = do_api.power_off_droplet(token, int(resource_id))
        elif action_type == "enable_backups":
            result = do_api.enable_backups(token, int(resource_id))
        elif action_type == "create_firewall":
            result = do_api.create_firewall(
                token,
                name=f"oceanpulse-{resource_id}",
                droplet_ids=[int(resource_id)],
            )
        elif action_type == "delete_volume":
            result = do_api.delete_volume(token, resource_id)
        elif action_type == "delete_snapshot":
            result = do_api.delete_snapshot(token, resource_id)
        elif action_type == "create_alert":
            result = do_api.create_alert_policy(
                token, int(resource_id),
                action.get("metric", "cpu"),
                action.get("threshold", 80),
                action.get("email", ""),
            )
        else:
            result = {"status": "error", "message": f"Unknown action: {action_type}"}
        
        # Log the action
        state.setdefault("action_history", []).append({
            "action": action_type,
            "resource_id": resource_id,
            "result": result,
            "timestamp": "now",
        })
        
        state["messages"].append({
            "role": "assistant",
            "content": f"Done! Action `{action_type}` executed successfully on resource `{resource_id}`. Result: {json.dumps(result)}. Let me re-scan to update your health scores..."
        })
        state["pending_action"] = None
        
    except Exception as e:
        state["messages"].append({
            "role": "assistant",
            "content": f"Oops, hit a snag executing that fix: {str(e)}. Want me to try a different approach?"
        })
    
    state["current_phase"] = "conversation"
    return state


# ──────────────────────────────────────────────
# Router
# ──────────────────────────────────────────────

def route_phase(state: AgentState) -> str:
    phase = state.get("current_phase", "scan")
    if phase == "scan":
        return "scan"
    elif phase == "analyze":
        return "analyze"
    elif phase == "fix":
        return "fix"
    else:
        return "conversation"


# ──────────────────────────────────────────────
# Graph
# ──────────────────────────────────────────────

def build_graph():
    graph = StateGraph(AgentState)
    
    graph.add_node("scan", scan_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("conversation", conversation_node)
    graph.add_node("fix", fix_node)
    
    graph.set_conditional_entry_point(route_phase)
    
    graph.add_edge("scan", "analyze")
    graph.add_edge("analyze", "conversation")
    graph.add_edge("conversation", END)
    graph.add_edge("fix", "conversation")
    
    return graph.compile()


agent_graph = build_graph()


# ──────────────────────────────────────────────
# ADK Entrypoint
# ──────────────────────────────────────────────

@entrypoint
async def main(input: dict, context: RequestContext):
    """
    ADK entrypoint. Called via POST /run
    
    Input format:
    {
        "message": "user's message",
        "do_token": "dop_v1_...",
        "session_state": { ... }  // optional, for continuing conversation
    }
    """
    message = input.get("message", "")
    do_token = input.get("do_token", "")
    session = input.get("session_state", None)
    
    if not do_token:
        return {
            "response": "Ahoy! I'm OceanPulse, your AI infrastructure health agent. To get started, I need your DigitalOcean API token (read+write). Don't worry — I'll never store it or share it. Paste it and I'll scan your entire account in seconds!",
            "session_state": None,
        }
    
    # Validate token on first use
    if not session:
        validation = do_api.validate_token(do_token)
        if not validation["valid"]:
            return {
                "response": f"That token doesn't seem to be working: {validation.get('error', 'unknown error')}. Double-check it's a valid DigitalOcean Personal Access Token with read+write scope.",
                "session_state": None,
            }
        
        # First scan
        state = AgentState(
            do_token=do_token,
            scan_data={},
            messages=[{"role": "user", "content": f"Scan my DigitalOcean account. My account email is {validation.get('email', 'unknown')}."}],
            current_phase="scan",
            pending_action=None,
            action_history=[],
        )
    else:
        # Continuing conversation
        state = AgentState(
            do_token=do_token,
            scan_data=session.get("scan_data", {}),
            messages=session.get("messages", []) + [{"role": "user", "content": message}],
            current_phase=session.get("current_phase", "conversation"),
            pending_action=session.get("pending_action"),
            action_history=session.get("action_history", []),
        )
        
        # Check if user is approving a pending action
        approval_words = ["yes", "approve", "do it", "go ahead", "fix it", "proceed", "confirm"]
        if state["pending_action"] and any(w in message.lower() for w in approval_words):
            state["current_phase"] = "fix"
    
    # Run the graph
    result = await agent_graph.ainvoke(state)
    
    # Get the last assistant message
    last_response = ""
    for msg in reversed(result["messages"]):
        if msg["role"] == "assistant":
            last_response = msg["content"]
            break
    
    return {
        "response": last_response,
        "health_scores": result.get("scan_data", {}).get("health_scores"),
        "summary": result.get("scan_data", {}).get("summary"),
        "session_state": {
            "scan_data": result.get("scan_data", {}),
            "messages": result.get("messages", [])[-20:],  # Keep last 20 messages
            "current_phase": result.get("current_phase", "conversation"),
            "pending_action": result.get("pending_action"),
            "action_history": result.get("action_history", []),
        },
    }
