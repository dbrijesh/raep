# Synthetic Appian sample export

This is a hand-authored fixture, not a real customer export. It mimics the
directory shape of a real Appian application export (`processModel/`,
`expressionRule/`, `recordType/`, `interface/`, `customization.properties`)
closely enough for `/rapidx:workflow-comprehend --source <this dir>` and the
`workflow-logic-extractor` / `workflow-dependency-mapper` /
`workflow-forms-generator` agents to have real content to extract from, for
repeatable manual and automated testing of the Comprehend stage.

Contents model a single process, **Expense Approval**:
start → employee submits (form + record fields) → manager approval →
expression-rule-gated gateway (amount > $1000) → optional finance approval →
integration call to a payment system → end.

It intentionally exercises: a start/end node pair, two human approval tasks,
a gateway driven by an expression rule, an integration node, a backing
record type, and a form interface — enough variety to validate node-type
mapping without needing a real, potentially sensitive customer export.
