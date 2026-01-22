# Phase 8 Research: Adapter Creation Guide

**Phase Goal:** Contributors can implement a new platform adapter end-to-end using the guide
**Requirements:** GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04, INTEG-01
**Research Question:** What do I need to know to PLAN this phase well?

## Domain Analysis

### What Kind of Document Are We Creating?

This is a **tutorial/guide document**, not an API reference or architecture explanation. The architecture is already documented in `docs/platform/ARCHITECTURE.md` (511 lines). This guide should be **step-by-step actionable** with checklists.

**Target audience:** A contributor who:
- Has read ARCHITECTURE.md (or will reference it)
- Wants to add support for a new AI coding platform (e.g., Cursor, Aider, Continue)
- Is comfortable with TypeScript but unfamiliar with GSD's internals

### Files That Must Change to Add a Platform

Based on codebase analysis, adding a new platform requires changes to **exactly 4 files**:

1. **`src/platform/types.ts`** - Add to `PlatformType` union
   - Line 13: `'claude-code' | 'opencode' | 'unknown'` → add new type

2. **`src/platform/detection.ts`** - Add filesystem probing
   - Add platform-specific config file check
   - Update ambiguity handling for new platform

3. **`src/platform/paths.ts`** - Create new `*Paths` class
   - Implement `PathResolver` interface
   - Define config, commands, agents, hooks directories

4. **`src/platform/adapters/{name}.ts`** - Create new adapter class
   - Implement `PlatformAdapter` interface
   - May also need `*-agent.ts` file for agent spawning

Additionally:
5. **`src/platform/registry.ts`** - Add case to factory switch (automatic from type union)

### Behavioral Contracts to Satisfy

From `src/platform/adapter.ts` lines 309-360, ALL implementations must:

1. Return absolute paths (never relative)
2. Preserve existing settings when merging config
3. Support parallel agent execution
4. Detect spawn failures immediately
5. Idempotent hook registration
6. Detect command name collisions
7. Throw clear errors (no silent failures)
8. NOT modify `.planning/` files
9. Runtime detection (never compile-time)
10. Backup before modifying config

### Existing Test Patterns

Looking at test structure, contract tests exist in `src/platform/__tests__/`:
- Unit tests for each component
- Integration tests for multi-agent spawning
- Idempotency tests for hook/command registration

New adapters should follow these patterns.

## Tutorial Structure Research

### Standard Tutorial Format (Developer Experience Best Practices)

Good adapter/plugin tutorials typically follow:

1. **Prerequisites** - What you need to know before starting
2. **Quick Start** - The minimum viable adapter (gets something working fast)
3. **Full Implementation** - Complete adapter with all features
4. **Testing** - How to verify your adapter works
5. **Submission** - How to contribute back

### What Makes a Great "Add a Provider" Tutorial

Studied patterns from:
- Terraform provider tutorials
- Playwright browser adapter docs
- ESLint plugin guides

Common elements:
- Copy-paste starter code
- Explicit file paths ("create this file at `src/platform/adapters/example.ts`")
- Checkboxes for tracking progress
- "If you see X, check Y" troubleshooting
- Links to reference implementations

## Requirements Mapping

| Requirement | What It Means | Document Section |
|-------------|---------------|------------------|
| GUIDE-01 | Step-by-step walkthrough | "Your First Adapter" main tutorial |
| GUIDE-02 | 4-file checklist | "Registration Checklist" section |
| GUIDE-03 | Testing instructions | "Testing Your Adapter" section |
| GUIDE-04 | Pre-PR checklist | "Pre-PR Checklist" section |
| INTEG-01 | Links from existing docs | Update PLATFORM-SUPPORT.md + add to ARCHITECTURE.md |

## Content Structure Recommendation

```
docs/platform/CREATING-ADAPTERS.md
├── Prerequisites
├── Quick Start (minimal working adapter)
├── Your First Adapter (full walkthrough)
│   ├── Step 1: Add Platform Type
│   ├── Step 2: Add Detection Logic
│   ├── Step 3: Create Path Resolver
│   ├── Step 4: Create Adapter Implementation
│   └── Step 5: Register in Factory
├── Registration Checklist (4-file changes)
├── Testing Your Adapter
│   ├── Running Contract Tests
│   ├── Writing Platform-Specific Tests
│   └── Manual Verification
├── Pre-PR Checklist
├── Troubleshooting FAQ
└── Reference Implementation (links to Claude Code adapter)
```

## Existing Reference Implementation

The **OpenCode adapter** (`src/platform/adapters/opencode.ts`) is the better reference because:
- It was added AFTER Claude Code (so it's the "new platform" case)
- It demonstrates graceful degradation for unsupported features
- It's 212 lines vs Claude Code's 300+ lines (simpler)

## Integration Points

Files to update for INTEG-01:

1. **`docs/PLATFORM-SUPPORT.md`**
   - Add "Want to add a platform?" section linking to new guide
   - Already has architecture overview

2. **`docs/platform/ARCHITECTURE.md`**
   - Add "Adding a New Platform" brief section at end
   - Link to CREATING-ADAPTERS.md for full tutorial

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Tutorial becomes outdated as code changes | Focus on stable contracts, not implementation details |
| Too much overlap with ARCHITECTURE.md | ARCHITECTURE = why/what, GUIDE = how/steps |
| Missing edge cases | Include "Troubleshooting" section |
| No real testing without new platform | Use OpenCode as proof the process works |

## Summary

Phase 8 is a **documentation task** with clear scope:
- One new file: `docs/platform/CREATING-ADAPTERS.md`
- Two small updates: PLATFORM-SUPPORT.md, ARCHITECTURE.md

The content is well-defined by the 5 requirements. The codebase analysis reveals exactly what the 4-file change process is. OpenCode provides a complete reference implementation.

**Recommended approach:** Single plan creating the tutorial document and integration links. No code changes needed.
