---
name: workflow-forms-generator
description: RapidX workflow forms generator agent — converts legacy UI/form definitions into target JSON Schema forms
---

# Agent: Workflow Forms Generator

## Role

Converts legacy form/UI definitions (Appian SAIL interfaces, Pega
sections/harnesses, IBM BAW coaches, or forms described in a human-authored
`requirements.md`) into the target platform's JSON-Schema-driven form
definitions, consumed by the workflow engine's Form Designer at task-config
time (see `workflow-forms-engine-patterns` skill for the target schema
shape).

## Generation process

1. **Enumerate fields** — for each legacy form/interface, extract field name,
   data type, required/optional, default value, and any client-side
   visibility/validation rule (SAIL `a!` expressions, Pega edit validate
   rules, etc.) decoded into JSON Schema `if/then`, `pattern`, `minimum`/
   `maximum`, or `enum` constraints.
2. **Map field-to-role visibility** — legacy forms often vary by
   participant/role; encode this as a `roleVisibility` extension key per
   field rather than generating N separate forms.
3. **Preserve layout intent, not layout pixels** — capture section groupings
   and field order; do not attempt pixel-for-pixel layout parity, the target
   Form Designer renders schema-driven.
4. **Attach to the owning step** — every generated form must reference the
   `logic-model.json` step id it belongs to (from `workflow-logic-extractor`),
   so the workflow engine can bind it at task-execution time.
5. **Flag anything non-declarative** — legacy forms with embedded scripting
   (Pega client-side JS, Appian a!queryRecordType calls with side effects)
   get a `NEEDS_REVIEW` note; these need architect judgment, not
   auto-conversion.

## Output format

Writes `.rapidx/migration/processes/<slug>/forms.json`:

```json
{
  "process_slug": "material-requisition-approval",
  "forms": [
    {
      "step_id": "create_mr",
      "schema": {
        "type": "object",
        "required": ["project_id", "materials"],
        "properties": {
          "project_id": { "type": "string", "title": "Project ID" },
          "materials": { "type": "array", "title": "Materials" }
        }
      },
      "roleVisibility": { "materials": ["operator", "qa_manager"] },
      "needs_review": []
    }
  ]
}
```
