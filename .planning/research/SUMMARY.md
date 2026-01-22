# Project Research Summary

**Project:** GSD Platform Documentation (v2.1)
**Domain:** Technical documentation for platform adapter system
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

GSD's platform abstraction layer is **already well-documented in code**—`adapter.ts` contains 361 lines of behavioral contracts, JSDoc comments, and implementation guidance. The documentation task is about **surfacing and organizing** this information for contributors, not creating it from scratch. This significantly reduces risk and effort.

The recommended approach uses **plain Markdown with Mermaid diagrams**, avoiding doc generators like TypeDoc or VitePress. The rationale: GSD's docs explain *how to create an adapter* (architectural guidance), not *what methods exist* (API reference). Contributors need prose with diagrams, not auto-generated method signatures. The target structure follows the Diataxis framework (tutorials, how-to, reference, explanation) adapted for a solo-maintainer context—just 4 documents in `docs/platform/`.

The critical risks are **undocumented behavioral contracts** (contributors implement methods correctly but miss idempotency requirements) and **missing registration documentation** (adapter works but GSD doesn't use it because registration spans 4 files). Both are mitigated by extracting existing inline documentation and creating explicit checklists.

## Key Findings

### Recommended Stack

**Plain Markdown in `docs/platform/` with Mermaid diagrams embedded inline.**

No doc generator, no build step, no deployment pipeline. GitHub renders Mermaid natively.

**Core tools:**
- **Markdown** — Already have `docs/PLATFORM-SUPPORT.md`, zero setup cost
- **Mermaid diagrams** — Class diagrams for adapter pattern, flowcharts for detection logic, sequence diagrams for hook registration
- **VS Code** — Built-in Markdown preview; optional `bierner.markdown-mermaid` extension for Mermaid preview

**Why NOT TypeDoc:** GSD has 1 interface with ~15 methods. TypeDoc excels for large API surfaces consumed by external developers. Contributors will read `adapter.ts` directly—TypeDoc would duplicate without adding value.

**Why NOT VitePress/Docusaurus:** GSD doesn't need a documentation website. Docs live in the repo, viewed on GitHub. A doc site adds build pipeline, deployment, and version drift for a solo maintainer.

### Expected Features

**Must have (table stakes):**
- Interface contract reference — Contributors must know WHAT methods to implement
- Method-by-method specification with behavioral contracts — Purpose, params, returns, error conditions
- Complete working example — Annotated Claude Code adapter as canonical reference
- Quick start guide — "Your First Adapter" in under 30 minutes
- Testing requirements — What tests must pass before PR accepted
- Directory structure diagram — Where files go

**Should have (differentiators):**
- Pre-PR checklist — Self-verification before submitting
- Common mistakes section — "Don't do X because Y"
- Capability matrix — What each platform supports (hooks, agents, status line)
- Path resolution deep dive — env var overrides, tilde expansion

**Defer (v2+):**
- Annotated source code walkthrough (high effort)
- Troubleshooting FAQ (needs real issues first)
- Architecture Decision Records
- Video tutorials

### Architecture Approach

Four documents following Diataxis, organized by reader intent:

```
docs/platform/
├── README.md                # Hub + navigation (overview)
├── ARCHITECTURE.md          # System design for understanding (explanation)
├── CREATING-ADAPTERS.md     # Step-by-step guide (tutorial/how-to)
└── INTERFACE-REFERENCE.md   # PlatformAdapter contract (reference)
```

**Why this structure:**
1. README as hub — Every visitor starts here, links based on intent
2. Separation of explanation vs reference — Architecture explains *why*, Reference gives *what*
3. Single tutorial — Solo maintainer can't afford separate "learning" and "working" docs
4. Mirrors code structure — `docs/platform/` corresponds to `src/platform/`

### Critical Pitfalls

1. **Interface without behavioral contracts** — Document ALL behavioral requirements explicitly (idempotency, error handling, side effects). Contributors see TypeScript types but miss the "hook registration must be idempotent" requirements buried in inline comments.

2. **Missing complete example adapter** — Provide annotated adapter skeleton template with integration checklist. Methods work in isolation but fail when called in sequence because initialization order isn't clear.

3. **Undocumented registration flow** — Create explicit 4-file checklist (types.ts → detection.ts → registry.ts → adapter.ts). Contributors create perfect adapter classes that GSD never uses.

4. **Testing without contract pattern** — Document the two-tier testing strategy (shared contract tests + platform-specific tests). Contributors write custom tests that miss behavioral requirements.

5. **Implicit capability impact** — Document capability-command matrix showing what breaks when `supportsHooks()` returns false. Contributors return wrong values because impact is undocumented.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Reference Documentation
**Rationale:** Pure extraction from existing code—lowest risk, establishes vocabulary for other docs
**Delivers:** `INTERFACE-REFERENCE.md` with full contract specification
**Addresses:** Interface contract reference (table stakes), behavioral contracts
**Avoids:** Pitfall #1 (interface without behavioral contracts)

**Content:**
- Extract from `adapter.ts` JSDoc (361 lines of contracts)
- PathResolver interface methods
- PlatformAdapter interface methods with behavioral requirements
- AgentInstance and HookType specifications
- 10 binding requirements from inline comments

### Phase 2: Architecture Documentation
**Rationale:** Explains existing implementation—can be verified against code
**Delivers:** `ARCHITECTURE.md` explaining design decisions
**Uses:** Mermaid diagrams for adapter pattern, registry pattern, detection flow
**Implements:** System understanding for contributors

**Content:**
- Design goals (portability without scattered conditionals)
- Component explanations (detection, registry, adapter)
- Patterns used (adapter pattern, factory + singleton)
- Mermaid diagrams for visual understanding

### Phase 3: Tutorial/Guide
**Rationale:** Must reference Phase 1-2 vocabulary; requires thinking through ideal workflow
**Delivers:** `CREATING-ADAPTERS.md` step-by-step guide
**Addresses:** Quick start, complete working example, testing requirements
**Avoids:** Pitfall #2 (missing complete example), Pitfall #3 (undocumented registration)

**Content:**
- Prerequisites and setup
- Step-by-step: Add type → Create paths → Create adapter → Add detection → Register
- Annotated code examples from Claude Code adapter
- Testing section with contract tests
- Pre-PR checklist

### Phase 4: Navigation Hub
**Rationale:** Must be written last—summarizes and links to Phase 1-3 content
**Delivers:** `README.md` hub document for `docs/platform/`
**Addresses:** Directory structure, navigation, integration points

**Content:**
- Overview of platform system
- "Where to go" navigation table by intent
- Quick links to other docs
- Key concepts glossary
- Integration with existing `PLATFORM-SUPPORT.md`

### Phase Ordering Rationale

1. **Reference first** — Behavioral contracts from `adapter.ts` are the foundation. Everything else references these.
2. **Architecture second** — Explains the "why" that the tutorial needs to reference.
3. **Tutorial third** — Uses vocabulary from Phase 1-2. Can reference both docs concretely.
4. **Hub last** — Can't write accurate summaries until content exists.

This order minimizes rewrites—each phase builds on stable content from previous phases.

### Research Flags

**Phases with standard patterns (skip `/gsd:research-phase`):**
- **Phase 1 (Reference):** Pure extraction from existing code. No external research needed.
- **Phase 2 (Architecture):** Explaining existing implementation. Code is the source of truth.
- **Phase 4 (Hub):** Standard navigation pattern. Template-driven.

**Phase potentially needing validation:**
- **Phase 3 (Tutorial):** May benefit from reviewing Gatsby/VS Code tutorial patterns during planning, but existing FEATURES-DOCS.md research is comprehensive. Likely skip research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Plain Markdown is the clear winner for solo maintainer + contributor docs. Mermaid syntax verified against official docs. |
| Features | HIGH | Based on multiple authoritative sources (Gatsby, VS Code, Auth0) that converge on same patterns. |
| Architecture | HIGH | Follows Diataxis, validated against GSD code structure. Build order based on clear dependency analysis. |
| Pitfalls | HIGH | Derived from direct GSD codebase analysis—contracts exist in comments but not docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **OpenCode-specific documentation:** Current docs focus on Claude Code adapter. OpenCode adapter patterns may need section in `CREATING-ADAPTERS.md` once more OpenCode contributors emerge.
- **Real contributor feedback:** MVP priority ordering is judgment call. Adjust based on actual questions/issues from first contributors.
- **Testing coverage:** Contract tests exist but exact coverage of behavioral requirements should be verified during Phase 3.

## Sources

### Primary (HIGH confidence)
- GSD codebase: `src/platform/adapter.ts` (361 lines of behavioral contracts)
- GSD codebase: `src/platform/adapters/claude-code.ts`, `opencode.ts` (implementation patterns)
- GSD codebase: `tests/contract/adapter.contract.ts` (shared contract test pattern)
- Mermaid official documentation (diagram syntax verification)

### Secondary (MEDIUM confidence)
- Gatsby Source Plugin Tutorial structure (documentation patterns)
- VS Code Extension API documentation (adapter/plugin doc patterns)
- Auth0 SDK building principles (empathy-driven documentation)
- Diataxis framework (documentation structure)

### Tertiary (for reference)
- ConvoyPanel documentation principles
- Mattermost developer documentation writing guide
- Solana Wallet Adapter documentation structure

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
