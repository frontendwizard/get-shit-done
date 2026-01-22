# Architecture Research: Platform Documentation

**Domain:** Developer documentation for multi-platform adapter system
**Researched:** 2026-01-22
**Overall confidence:** HIGH

## Executive Summary

GSD's platform abstraction layer is already well-documented in code via JSDoc comments (`adapter.ts` has 361 lines of behavioral contracts). The documentation task is about **surfacing** this information for different audiences, not creating it from scratch.

The recommended structure follows the Diataxis framework (tutorials, how-to, reference, explanation) adapted for a solo-maintainer context. Four documents total, organized by reader intent rather than code structure.

## Recommended Structure

```
docs/
├── PLATFORM-SUPPORT.md          # EXISTING - User-facing support matrix
├── platform/
│   ├── README.md                # Overview + navigation hub (Explanation)
│   ├── ARCHITECTURE.md          # System design for understanding (Explanation)
│   ├── CREATING-ADAPTERS.md     # Step-by-step guide (Tutorial/How-to hybrid)
│   └── INTERFACE-REFERENCE.md   # PlatformAdapter contract (Reference)
```

### File Purposes

| File | Audience | Question Answered |
|------|----------|-------------------|
| `README.md` | Anyone curious | "What is the platform system and where do I start?" |
| `ARCHITECTURE.md` | Contributors, future-self | "Why is it designed this way?" |
| `CREATING-ADAPTERS.md` | Adapter implementers | "How do I add a new platform?" |
| `INTERFACE-REFERENCE.md` | Adapter implementers (mid-work) | "What exactly must I implement?" |

### Why This Structure

1. **README as hub** - Every `docs/platform/` visitor starts here. Links to other docs based on intent. Prevents "which file first?" confusion.

2. **Separation of explanation vs reference** - Architecture explains *why* (mental model building). Reference gives *what* (lookup during implementation). Different reading modes.

3. **Single tutorial** - `CREATING-ADAPTERS.md` combines tutorial and how-to. Solo maintainer can't afford separate "learning" and "working" docs for same task.

4. **Mirrors code structure** - `docs/platform/` corresponds to `src/platform/`. Mental mapping is direct.

### Why NOT a Deeper Structure

Rejected alternative: `docs/platform/adapters/claude-code.md`, `docs/platform/adapters/opencode.md`

**Reasons:**
- Adapter implementations are thin (220 lines each) - not worth separate docs
- Platform-specific quirks belong in `CREATING-ADAPTERS.md` as examples
- Fewer files = easier to keep in sync (solo maintainer)
- Code comments in `adapters/*.ts` already have implementation details

## Document Dependencies

Reading order for different audiences:

### New Contributor (wants to understand system)
```
1. README.md          → Gets orientation
2. ARCHITECTURE.md    → Understands design decisions
3. INTERFACE-REFERENCE.md → Deep dive if curious
```

### Adapter Implementer (wants to add platform)
```
1. README.md                → Finds right doc
2. CREATING-ADAPTERS.md     → Follows step-by-step
3. INTERFACE-REFERENCE.md   → Looks up method contracts during work
4. ARCHITECTURE.md          → Consults if confused about why
```

### Existing User (checking platform details)
```
1. PLATFORM-SUPPORT.md (existing) → Gets support matrix
2. README.md → If wants deeper understanding
```

### Internal Dependencies

```
README.md
  └── Links to all three children
  
CREATING-ADAPTERS.md
  └── References INTERFACE-REFERENCE.md for contract details
  └── References ARCHITECTURE.md for design rationale
  
INTERFACE-REFERENCE.md
  └── Standalone (pure reference, no dependencies)
  
ARCHITECTURE.md
  └── Standalone (conceptual, no dependencies)
```

## Build Order

Write documents in this order based on dependencies:

### Phase 1: Foundation (write first)

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `INTERFACE-REFERENCE.md` | Pure extraction from `adapter.ts`. No creative decisions. Can verify against code. |
| 2 | `ARCHITECTURE.md` | Explains existing code. Registry pattern, adapter pattern, detection flow - all implemented. |

**Why these first:** Both are describing existing implementation. Low risk of needing rewrites. Establishes vocabulary for other docs.

### Phase 2: Practical Guide

| Order | File | Rationale |
|-------|------|-----------|
| 3 | `CREATING-ADAPTERS.md` | Uses vocabulary from Phase 1. Can reference both docs. Requires thinking through "ideal workflow" for adapter creation. |

**Why this order:** Tutorial needs to reference architecture concepts and interface methods. Must come after reference/explanation are stable.

### Phase 3: Navigation

| Order | File | Rationale |
|-------|------|-----------|
| 4 | `README.md` | Hub document that links to others. Must be written last so links are accurate and descriptions match content. |

**Why this last:** README summarizes and links. Can't write accurate summaries until docs exist.

### Build Order Summary

```
1. INTERFACE-REFERENCE.md   ← Pure extraction, verify against code
2. ARCHITECTURE.md          ← Explain existing design
3. CREATING-ADAPTERS.md     ← Practical walkthrough
4. README.md                ← Navigation hub
```

## Navigation

### How Readers Find What They Need

**Entry points:**

1. **From README.md** - User sees "Platform" section, follows link to `docs/platform/`
2. **From code** - Developer in `src/platform/adapter.ts` sees JSDoc link to `docs/platform/INTERFACE-REFERENCE.md`
3. **From PLATFORM-SUPPORT.md** - User wants more detail, follows link to `docs/platform/README.md`

### Within docs/platform/

README.md serves as switchboard:

```markdown
## Where to Go

| I want to... | Read |
|--------------|------|
| Understand the platform architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Add support for a new platform | [CREATING-ADAPTERS.md](./CREATING-ADAPTERS.md) |
| Look up interface requirements | [INTERFACE-REFERENCE.md](./INTERFACE-REFERENCE.md) |
| Check platform support status | [../PLATFORM-SUPPORT.md](../PLATFORM-SUPPORT.md) |
```

### Cross-references Within Docs

| Document | Links to | Purpose |
|----------|----------|---------|
| `CREATING-ADAPTERS.md` | `INTERFACE-REFERENCE.md` | "See X method contract" |
| `CREATING-ADAPTERS.md` | `ARCHITECTURE.md` | "Understand why we use Y pattern" |
| `ARCHITECTURE.md` | `INTERFACE-REFERENCE.md` | "Full contract in reference" |
| All docs | `README.md` | "Back to overview" link in footer |

## Content Outlines

### README.md (~100 lines)

```markdown
# Platform Abstraction Layer

## Overview
[2-3 paragraphs: what it does, why it exists, key concepts]

## Supported Platforms
- Claude Code (full support)
- OpenCode (commands only, no hooks)

## Quick Links
[Table: intent → document]

## Key Concepts
[Brief definitions: adapter, registry, detection, PathResolver]

## Architecture at a Glance
[Simple ASCII diagram or brief description]
```

### ARCHITECTURE.md (~200-300 lines)

```markdown
# Platform Architecture

## Design Goals
[Why platform abstraction exists - portability without scattered conditionals]

## Components

### Platform Detection
[How detection.ts works, priority order]

### Path Resolution
[PathResolver interface, per-platform implementations]

### Platform Registry
[Factory pattern, singleton caching, test injection]

### Platform Adapter
[Full interface, capability detection]

## Patterns Used

### Adapter Pattern
[Why, how applied]

### Factory + Singleton
[Registry design rationale]

## Anti-Patterns Avoided
[Service locator warning from code comments]

## Adding New Platforms
[Brief pointer to CREATING-ADAPTERS.md]
```

### CREATING-ADAPTERS.md (~300-400 lines)

```markdown
# Creating a Platform Adapter

## Prerequisites
[What you need to know, environment setup]

## Overview
[What you'll build, expected outcome]

## Step 1: Add Platform Type
[Edit types.ts]

## Step 2: Create Path Resolver
[Implement PathResolver in paths.ts]

## Step 3: Create Adapter Class
[Implement PlatformAdapter - detailed walkthrough]

## Step 4: Add Detection Logic
[Edit detection.ts]

## Step 5: Register in Factory
[Edit registry.ts]

## Step 6: Test Your Adapter
[Test patterns, what to verify]

## Platform-Specific Considerations
[Claude Code quirks, OpenCode quirks, patterns for new platforms]

## Checklist
[Quick verification before PR]
```

### INTERFACE-REFERENCE.md (~400-500 lines)

```markdown
# Platform Interface Reference

## PathResolver Interface
[Methods, return types, contracts]

## PlatformAdapter Interface

### Properties
- name: PlatformType
- version: string

### Path Methods (inherited)
[getConfigDir, getCommandsDir, getAgentsDir, getHooksDir]

### Configuration Methods
[readConfig, writeConfig, mergeConfig - contracts from adapter.ts]

### Agent Methods
[spawnAgent - contract, AgentInstance interface]

### Hook Methods
[registerHook, unregisterHook - contracts]

### Command Methods
[registerCommand, unregisterCommand - contracts]

### Capability Methods
[supportsParallelAgents, supportsStatusLine, supportsHooks]

## AgentInstance Interface
[id, status, waitForCompletion, getOutput]

## HookType
[SessionStart, StatusLine]

## Behavioral Requirements
[10 binding requirements from adapter.ts comments]
```

## Integration with Existing Docs

### Link from PLATFORM-SUPPORT.md

Add to existing doc after "Platform Detection" section:

```markdown
## Developer Documentation

For contributors wanting to understand or extend the platform system:
- [Platform Architecture Overview](./platform/README.md)
```

### Link from README.md (main)

Add to documentation section if one exists, or create:

```markdown
## Documentation

- [Platform Support](docs/PLATFORM-SUPPORT.md) - Command compatibility across platforms
- [Platform Architecture](docs/platform/README.md) - For contributors extending platform support
```

### Link from Code

Add to `src/platform/adapter.ts` header comment:

```typescript
/**
 * PlatformAdapter Interface Contract
 * 
 * Full documentation: docs/platform/INTERFACE-REFERENCE.md
 * Architecture overview: docs/platform/ARCHITECTURE.md
 * ...
 */
```

## Maintainability Considerations

### Solo Maintainer Optimizations

1. **Minimal docs** - 4 files total, not 8. Less to keep in sync.

2. **Extract from code** - `INTERFACE-REFERENCE.md` is 90% extraction from `adapter.ts` JSDoc. When code changes, diff is visible.

3. **Single source of truth** - Behavioral contracts stay in `adapter.ts`. Docs reference, don't duplicate deeply.

4. **No per-adapter docs** - Platform-specific details in `CREATING-ADAPTERS.md` examples, not separate files.

### Update Triggers

| When This Changes... | Update These Docs |
|---------------------|-------------------|
| `adapter.ts` interface | `INTERFACE-REFERENCE.md` |
| New platform added | `CREATING-ADAPTERS.md` (add as example) |
| Detection logic changes | `ARCHITECTURE.md` |
| Registry pattern changes | `ARCHITECTURE.md` |
| Support matrix changes | `PLATFORM-SUPPORT.md` (existing) |

### Staleness Signals

Docs may be stale if:
- `adapter.ts` has methods not in `INTERFACE-REFERENCE.md`
- New adapter exists without mention in `CREATING-ADAPTERS.md`
- `types.ts` has platform not in `PLATFORM-SUPPORT.md`

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| File structure | HIGH | Follows Diataxis, validated against code structure |
| Build order | HIGH | Based on clear dependency analysis |
| Content outlines | HIGH | Extracted from existing code documentation |
| Integration points | HIGH | Existing docs examined, links are concrete |
| Maintainability | MEDIUM | Solo maintainer context assumed - may need adjustment if team grows |

## Sources

- Diataxis framework: https://diataxis.fr/
- Existing code analysis: `src/platform/adapter.ts` (361 lines of contracts)
- Existing documentation: `docs/PLATFORM-SUPPORT.md`
- Mattermost developer documentation structure (plugin system reference)
