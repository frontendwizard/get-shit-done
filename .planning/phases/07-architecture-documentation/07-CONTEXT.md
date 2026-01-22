# Phase 7: Architecture Documentation - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Document the platform abstraction system design so contributors understand the adapter pattern, registry, and detection flow. Deliverables: ARCHITECTURE.md with Mermaid diagrams explaining design patterns and decision rationale.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion (Full)

User explicitly delegated all documentation decisions to Claude with guidance:

**Target audience:**
- Human developers wanting to contribute (add new platform adapters)
- LLMs researching the codebase (need structured, parseable content)

**Implied requirements for this audience:**
- Clear headings and structure (LLM-parseable)
- Concrete code references with file paths and line numbers
- Mermaid diagrams that render on GitHub (visual for humans)
- Explanation of WHY decisions were made (not just WHAT exists)
- Top-down flow (concept → component → code) for progressive understanding

**Claude decides:**
- Explanation flow and ordering
- Which diagrams to include
- Depth of trade-off analysis
- How tightly to link to source code

</decisions>

<specifics>
## Specific Ideas

- Documentation should work for both human contributors AND LLMs researching the codebase
- This implies: structured content, clear section headers, explicit file references
- Mermaid diagrams for visual learners; prose for LLM parsing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-architecture-documentation*
*Context gathered: 2026-01-22*
