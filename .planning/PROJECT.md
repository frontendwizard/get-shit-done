# Multi-Platform GSD

## What This Is

A platform-agnostic workflow orchestration system for AI-assisted software development. GSD provides the same project planning, execution, and verification experience across Claude Code, OpenCode, and future AI coding platforms. Users can switch between platforms seamlessly without losing workflow capabilities or project state.

## Core Value

Platform independence - users choose AI platforms based on project needs, not tooling limitations. GSD workflow remains consistent regardless of which platform executes it.

## Current State (v2.0)

**Shipped:** 2026-01-22

Multi-platform support for Claude Code and OpenCode with:
- Runtime platform detection and adapter pattern
- Multi-platform installer (TUI + CLI flags)
- 15/24 commands cross-platform (9 require Claude Code Task tool)
- Zero-migration .planning/ portability
- 176 tests with 81% coverage

**Tech stack:**
- TypeScript platform abstraction (1,724 LOC)
- Vitest test suite (1,970 LOC)
- Node.js 16.7.0+ compatible

## Requirements

### Validated

- ✓ Platform abstraction layer (PLAT-01 through PLAT-07) — v2.0
- ✓ Multi-platform installer with TUI (INST-01 through INST-07) — v2.0
- ✓ Agent spawning infrastructure (AGENT-01 through AGENT-05) — v2.0
- ✓ Lifecycle hooks with graceful degradation (HOOK-01 through HOOK-04) — v2.0
- ✓ Project portability (PORT-01 through PORT-04) — v2.0
- ✓ Backward compatibility (COMPAT-01 through COMPAT-05) — v2.0
- ✓ Test suite (TEST-01 through TEST-05) — v2.0

### Active

(None — milestone complete. Define in next milestone via `/gsd:new-milestone`)

### Out of Scope

- Building custom AI platforms — GSD integrates with existing platforms only
- Full feature parity on UI/UX details — platform-specific rendering can differ
- Migration tools for `.planning/` directories — zero migration by design
- Per-command platform selection — runtime detection sufficient

## Constraints

- **Backward compatibility**: Existing Claude Code installations upgrade without breaking
- **Zero migration**: .planning/ directories work on any platform without modification
- **Feature preservation**: All 24 commands work on Claude Code (15 on OpenCode)
- **Maintenance**: Solo maintainer — architecture must be maintainable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Platform abstraction via adapter pattern | Enables multi-platform without breaking existing users | ✓ Good |
| Runtime platform detection | Projects are portable, platform detected from environment | ✓ Good |
| Multi-select installer | User explicitly chooses platforms | ✓ Good |
| TypeScript for platform layer | Compile-time contract verification | ✓ Good |
| Promise.allSettled for parallel agents | Prevents cascading failures | ✓ Good |
| Capability-based hook registration | Graceful degradation on unsupported platforms | ✓ Good |
| 15/24 command split | Realistic scope given Task tool limitation | ✓ Acceptable |

## Context

**Platform comparison:**

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| Config location | `~/.claude/` | `~/.config/opencode/` |
| Commands | `commands/gsd/*.md` | `command/gsd/*.md` |
| Agent spawning | Task tool (native) | CLI spawn (TypeScript) |
| Hooks | settings.json | Silent skip (no equivalent) |

**Known limitations:**
- 9 commands require Claude Code Task tool for multi-agent workflows
- OpenCode hook support pending platform feature

---
*Last updated: 2026-01-22 after v2.0 milestone*
