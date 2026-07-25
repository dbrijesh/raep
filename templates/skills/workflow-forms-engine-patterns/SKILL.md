---
name: workflow-forms-engine-patterns
description: RapidX workflow forms engine patterns skill — JSON-Schema-driven form design conventions for the workflow platform scaffold's Form Designer.
origin: RapidX
---

# Skill: Workflow Forms Engine Patterns

## Purpose

Documents how forms are modeled and bound to workflow tasks in the scaffold,
so `workflow-forms-generator` (extraction) and `workflow-forward-engineer`
(generation) produce forms the target Form Designer can actually render and
validate.

## When to use

- Converting legacy form/UI definitions (Appian SAIL, Pega
  sections/harnesses, IBM BAW coaches) into target forms.
- Designing a new form for a `task` or `esign` node during Blueprint.

## Form model

Every form is a standard JSON Schema object, attached to the `task`/`esign`
node's `config.form_schema`:

```json
{
  "type": "object",
  "required": ["project_id"],
  "properties": {
    "project_id": { "type": "string", "title": "Project ID" },
    "materials": { "type": "array", "title": "Materials" }
  }
}
```

- **Validation** — use standard JSON Schema keywords (`pattern`, `enum`,
  `minimum`/`maximum`, `minItems`) for anything the legacy platform enforced
  client-side; do not defer validation to the workflow's business-rule layer
  if JSON Schema can express it directly.
- **Role-based visibility** — legacy platforms often vary a form by
  participant role. Encode this as a `roleVisibility` extension map
  (`{ "field_name": ["role1", "role2"] }`) on the form object rather than
  generating multiple near-duplicate forms per role.
- **Layout intent, not layout pixels** — capture section/field grouping and
  order; the Form Designer renders schema-driven, so pixel-for-pixel parity
  with the legacy UI is not a goal and should not be attempted.
- **Step binding** — every form must declare which node `id` (from the
  process's `logic-model.json` / `graph_json`) it belongs to; forms are not
  reusable across steps even if the schema looks similar, since role and SLA
  context differ per step.

## Handling non-declarative legacy forms

Legacy forms with embedded scripting (Pega client-side JS validation, Appian
`a!queryRecordType` calls with side effects inside form logic) cannot be
mechanically converted to a declarative schema. Flag these as
`needs_review` on the generated form rather than guessing at equivalent
JSON Schema — an architect must decide whether the logic becomes a `logic`
node before the form, a backend validation rule, or is dropped as
no-longer-needed legacy cruft.

## Anti-patterns to avoid

- Generating one form per role instead of using `roleVisibility`.
- Trying to replicate legacy pixel layout instead of schema-driven rendering.
- Silently dropping client-side scripting logic instead of flagging it
  `needs_review`.
- Binding the same form object to multiple workflow steps.
