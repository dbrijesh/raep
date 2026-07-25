"""Seed the built-in workflow templates."""
# TODO({{PLATFORM_NAME}}): replace with your actual process definitions
import asyncio
import json
from .database import SessionFactory
from .schemas import DefinitionCreate, WorkflowGraph
from . import service

EXAMPLE_APPROVAL = {
    "nodes": [
        {"id": "start", "type": "start", "label": "Start", "config": {}, "position": {"x": 100, "y": 200}},
        {
            "id": "submit_request",
            "type": "task",
            "label": "Submit Request",
            "config": {
                "role": "operator",
                "description": "Requester submits the request for approval.",
                "sla_hours": 8,
                "form_schema": {
                    "type": "object",
                    "required": ["title", "description"],
                    "properties": {
                        "title": {"type": "string", "title": "Request Title"},
                        "description": {"type": "string", "title": "Description", "format": "textarea"},
                    },
                },
            },
            "position": {"x": 300, "y": 200},
        },
        {
            "id": "review",
            "type": "task",
            "label": "Review Request",
            "config": {
                "role": "manager",
                "description": "Manager reviews the request and approves or rejects it.",
                "sla_hours": 24,
            },
            "position": {"x": 550, "y": 200},
        },
        {"id": "approve_gate", "type": "gateway", "label": "Approved?", "config": {}, "position": {"x": 800, "y": 200}},
        {
            "id": "sign_off",
            "type": "esign",
            "label": "Approval (E-Sign)",
            "config": {"role": "manager", "meaning": "I approve this request", "sla_hours": 24},
            "position": {"x": 1050, "y": 100},
        },
        {
            "id": "rejected_task",
            "type": "task",
            "label": "Revise Request",
            "config": {"role": "operator", "description": "Revise and resubmit the request.", "sla_hours": 8},
            "position": {"x": 1050, "y": 300},
        },
        {"id": "end", "type": "end", "label": "Complete", "config": {}, "position": {"x": 1300, "y": 200}},
    ],
    "edges": [
        {"id": "e1", "source": "start", "target": "submit_request"},
        {"id": "e2", "source": "submit_request", "target": "review"},
        {"id": "e3", "source": "review", "target": "approve_gate"},
        {"id": "e4", "source": "approve_gate", "target": "sign_off", "label": "Approved", "condition": "approved"},
        {"id": "e5", "source": "approve_gate", "target": "rejected_task", "label": "Rejected", "condition": "rejected"},
        {"id": "e6", "source": "rejected_task", "target": "review"},
        {"id": "e7", "source": "sign_off", "target": "end"},
    ],
}

TEMPLATES = [
    ("Example Approval", "example_approval", "Minimal example: submit, review, e-sign approval.", EXAMPLE_APPROVAL),
]


async def _graph_fingerprint(graph: dict) -> str:
    """Fingerprint the graph by node IDs + key config fields (expression, url)."""
    import hashlib, json
    summary = []
    for n in sorted(graph.get("nodes", []), key=lambda x: x["id"]):
        cfg = n.get("config", {})
        summary.append({
            "id": n["id"], "type": n["type"],
            "expr": cfg.get("expression"), "url": cfg.get("url"),
            "agent": cfg.get("agent_type"),
        })
    return hashlib.md5(json.dumps(summary, sort_keys=True).encode()).hexdigest()


async def seed():
    async with SessionFactory() as db:
        for name, slug, desc, graph in TEMPLATES:
            existing = await service.get_active_definition_by_slug(db, slug)
            if existing:
                expected_fp = await _graph_fingerprint(graph)
                current_fp = await _graph_fingerprint(existing.graph_dict)
                if expected_fp == current_fp:
                    continue  # already up to date
            await service.create_definition(
                db,
                DefinitionCreate(
                    name=name,
                    slug=slug,
                    description=desc,
                    graph=WorkflowGraph(**graph),
                ),
                "system",
            )
        await db.commit()
    print("Workflow templates seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
