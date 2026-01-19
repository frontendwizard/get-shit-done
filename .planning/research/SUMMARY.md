# Project Research Summary

**Project:** Multi-Platform GSD (Platform Abstraction Layer)
**Domain:** Platform-agnostic AI development tool extensions
**Researched:** 2026-01-19
**Confidence:** MEDIUM-HIGH

## Executive Summary

GSD's expansion to multi-platform support (Claude Code + OpenCode + future platforms) requires a runtime platform abstraction layer using the adapter pattern. The research reveals that GSD's current architecture is already well-positioned for this transition—commands and agents are document-driven (Markdown + YAML) and platform-agnostic by design. The challenge is abstracting the 10 integration points (agent spawning, hook registration, config management, etc.) behind platform adapters.

The recommended approach is **adapter pattern with dependency injection**: create a platform interface that all platforms must implement, build platform-specific adapters (ClaudeCodeAdapter, OpenCodeAdapter), and use a registry for runtime detection. Core business logic (24 commands, 7+ agents, workflows) requires zero changes—only the platform layer changes. This enables backward compatibility for existing 1.6k+ Claude Code installations while adding OpenCode support through additive architecture.

The key risk is agent spawning API incompatibility—GSD spawns 4-7 parallel agents during workflows, and Claude Code's Task tool syntax differs completely from OpenCode's YAML agent/subtask syntax. Silent failures are likely if abstraction isn't bulletproof. Mitigation: build adapter pattern first, verify both platforms spawn agents correctly before shipping, add timeouts and verification after spawning to catch silent failures early.

## Key Findings

### Recommended Stack

Multi-platform plugin systems require runtime abstraction over platform-specific APIs, not compile-time conditionals. The standard 2025 approach uses the adapter pattern with dependency injection. GSD's existing Node.js foundation (16.7.0+) is the correct choice—cross-platform runtimes provide stable abstractions while TypeScript adds type safety for adapter contracts.

**Core technologies:**
- **Node.js >=16.7.0** (existing): Cross-platform runtime, already used by GSD, no additional dependency
- **TypeScript ^5.3.0** (optional): Type-safe adapter contracts, prevents "forgot to implement method X" bugs
- **Adapter pattern**: Interface per platform, runtime selection via factory, industry standard for plugin systems
- **env-paths ^3.0.0**: Cross-platform config directory resolution (~/.claude/ vs ~/.config/opencode/)
- **json5 ^2.2.3**: Parse/write both JSON (settings.json) and JSONC (opencode.jsonc) with single parser

**Critical architectural decision:** Abstract platform APIs behind interfaces, detect platform at runtime, inject appropriate adapter. Single codebase with platform-specific implementations swapped at initialization. Total added dependencies: ~2-3MB (acceptable for developer tool).

### Expected Features

**Must have (table stakes):**
- Platform Detection: Runtime environment detection to route platform-specific calls
- Unified Installation: Single install command with checkbox for multiple platforms
- Command Portability: Same 24 commands work across all platforms without modification
- Configuration Abstraction: Single source of truth writes to settings.json or opencode.jsonc appropriately
- Project Portability: .planning/ directories work across platforms with zero migration (CRITICAL for GSD value prop)
- Agent Spawning Abstraction: Spawn subagents via Task tool (Claude Code) or YAML (OpenCode) transparently

**Should have (competitive differentiators):**
- Zero Migration Portability: Existing projects work immediately on new platform without conversion (killer feature)
- Backward Compatibility: v1.x users upgrade to v2.x without breaking existing installations
- Extensible Architecture: Adding Cursor/Windsurf requires minimal code (future-proofs against platform proliferation)
- Platform-Best UX: StatusLine on Claude Code, best equivalent on OpenCode (not lowest-common-denominator)
- Transparent Platform Switching: User doesn't think about which platform they're on

**Defer (v2+):**
- Third platform support (Cursor/Windsurf): Validate architecture with two platforms first
- Platform-specific optimizations: Leverage unique platform features beyond core workflow
- Migration tooling: Should be unnecessary if zero-migration portability achieved
- Visual platform switcher: Runtime detection sufficient for MVP

### Architecture Approach

The adapter pattern with registry pattern is the industry-standard solution. Core business logic (commands, agents, workflows) remains platform-agnostic. Platform-specific code isolated in adapters that implement a common interface. Registry detects platform at runtime and loads appropriate adapter.

**Major components:**
1. **Platform Interface** (platforms/interface.js) — Abstract API contract all platforms implement (install, config, spawn, hooks, paths)
2. **Platform Adapters** (platforms/claude-code/, platforms/opencode/) — Platform-specific implementations of interface
3. **Platform Registry** (platforms/registry.js) — Runtime detection and adapter loading (singleton pattern)
4. **Installation System** — Platform-specific installers (ClaudeCodeInstaller, OpenCodeInstaller) created via factory pattern
5. **Business Logic** (commands/, agents/, get-shit-done/) — NO CHANGES NEEDED (already platform-agnostic)

**Key patterns identified:**
- Adapter Pattern: Translate generic operations to platform-specific APIs
- Registry Pattern: Single point of platform detection, loads correct adapter
- Strategy Pattern: Different hook systems (Claude Code settings.json vs OpenCode plugin events)
- Factory Pattern: Create platform-specific installers based on detected/selected platform

### Critical Pitfalls

1. **Installation Path Hardcoding Breaking Backward Compatibility** — When adding multi-platform support, changing paths globally breaks existing .planning/ references. Prevention: Use symlinks for shared content, runtime path resolution, multi-platform coexistence, never rewrite existing .planning/ files. MUST solve in Phase 1 before any installation logic changes.

2. **Platform Detection Race Conditions** — Runtime detection fails intermittently when run before platform APIs available. Prevention: Eager synchronous detection at module load, single source of truth (detect once, cache globally), fail-fast on unknown platform with clear error. Critical for Phase 1.

3. **Agent Spawning API Incompatibility** — Claude Code uses Task(subagent_type="..."), OpenCode uses YAML agent: + subtask: true. Silent failures when wrong API used. Prevention: Adapter pattern for spawning, verification after spawn, timeouts with clear errors. Highest risk area—GSD spawns 4-7 agents in parallel during workflows.

4. **Hook System Impedance Mismatch** — Claude Code hooks (SessionStart, StatusLine) may have no equivalent on OpenCode. Prevention: Best-effort equivalents, feature detection (not platform detection), critical features fail loudly, nice-to-haves degrade gracefully. Phase 3 concern.

5. **Configuration File Format Divergence** — settings.json (JSON) vs opencode.jsonc (JSONC with comments, different schema). Prevention: Platform-specific config writers, schema validation after write, backup before modification, don't assume config exists. Phase 1 concern.

## Implications for Roadmap

Based on research, suggested 5-phase structure with clear dependency chain:

### Phase 1: Platform Abstraction Layer
**Rationale:** Foundation that all other phases depend on. Must extract Claude Code logic to adapter structure without breaking existing users. Proves adapter pattern works with zero regression.

**Delivers:**
- Platform interface contract (platforms/interface.js)
- ClaudeCodeAdapter wrapping existing logic
- Platform registry with Claude Code detection
- Backward-compatible installation (existing users see no change)

**Addresses:**
- Platform Detection (table stakes)
- Configuration Abstraction groundwork
- Path resolution infrastructure

**Avoids:**
- Pitfall 1 (path hardcoding) via runtime resolution
- Pitfall 2 (detection races) via eager sync detection
- Pitfall 5 (config divergence) via adapter-specific writers

**Research flag:** LOW—well-documented pattern, high confidence. No phase-specific research needed.

### Phase 2: OpenCode Adapter Implementation
**Rationale:** Adding second platform proves abstraction is sufficient. Must happen after Phase 1 (depends on interface). Before command migration (need both adapters working to test).

**Delivers:**
- OpenCodeAdapter implementing platform interface
- OpenCodeInstaller for platform-specific paths/config
- Registry detection for OpenCode
- CLI flag: --platform=opencode

**Uses:**
- TypeScript for type safety (optional but recommended)
- env-paths for ~/.config/opencode/ resolution
- json5 for opencode.jsonc parsing

**Avoids:**
- Pitfall 5 (config divergence) via JSONC-aware writer
- Pitfall 8 (non-TTY installs) via interactive detection
- Pitfall 10 (command collisions) via namespace preservation

**Research flag:** MEDIUM—needs OpenCode API verification. Phase-specific research recommended for:
- OpenCode agent spawning API (YAML agent: + subtask: syntax verification)
- OpenCode plugin event system (mapping to Claude Code hooks)
- OpenCode config schema (opencode.jsonc structure)

### Phase 3: Agent Spawning Abstraction
**Rationale:** Core GSD feature depends on agent orchestration (4-7 parallel agents per workflow). Must abstract Task tool vs YAML syntax. Depends on both adapters working (Phase 1-2 complete).

**Delivers:**
- platform.spawnAgent() abstraction in adapters
- Verification after spawn (detect silent failures)
- Timeout handling with clear errors
- Parallel agent spawning on both platforms

**Addresses:**
- Agent Spawning Abstraction (must-have)
- Cross-Platform Agent Spawning (differentiator)

**Avoids:**
- Pitfall 3 (agent spawning incompatibility) via adapter translation
- Silent failures via verification + timeouts

**Research flag:** HIGH—highest risk area. Phase-specific research REQUIRED:
- Test agent spawning on real OpenCode installation
- Verify parallel spawning works (4+ agents simultaneously)
- Confirm agent completion detection mechanism

### Phase 4: Hook System & Lifecycle Abstraction
**Rationale:** StatusLine and SessionStart hooks are key UX features. Different hook models require strategy pattern. Depends on config abstraction (Phase 1-2).

**Delivers:**
- platform.registerHook() abstraction
- SessionStart mapping (Claude Code vs OpenCode plugin events)
- StatusLine with graceful degradation
- Feature detection (not platform detection)

**Addresses:**
- Lifecycle Hooks (table stakes)
- Platform-Best UX (differentiator)

**Avoids:**
- Pitfall 4 (hook impedance mismatch) via best-effort equivalents
- Pitfall 14 (platform-specific errors) via context-aware messages

**Implements:**
- Hook strategy pattern from ARCHITECTURE.md

**Research flag:** MEDIUM—needs OpenCode event system mapping. Phase-specific research for:
- Which OpenCode events map to SessionStart/Stop
- OpenCode equivalent for StatusLine (TUI notification? plugin status API?)
- Event data available in OpenCode callbacks

### Phase 5: Testing, Validation & Polish
**Rationale:** Prevent version drift between platforms. Ensure all 24 commands work identically. Catch platform-specific bugs before shipping.

**Delivers:**
- Shared test suite (platform-agnostic assertions)
- Platform matrix CI (test on both platforms)
- Regression prevention (baseline tests from v1.x)
- Update mechanism for multi-install
- Documentation updates

**Addresses:**
- Cross-Platform Testing
- Backward Compatibility validation

**Avoids:**
- Pitfall 6 (version drift) via shared tests + CI matrix
- Pitfall 9 (orphaned files) via cleanup migration
- Pitfall 15 (update breaks multi-platform) via detect-all-installations

**Research flag:** LOW—standard testing patterns. No research needed, execution-focused phase.

### Phase Ordering Rationale

**Sequential dependencies enforced:**
1. Interface → Adapters → Command Updates (can't build adapters without contract, can't update commands until adapters work)
2. Claude Code adapter → OpenCode adapter (prove pattern works before adding second platform)
3. Config abstraction → Hook abstraction (hooks require config manipulation)
4. Agent spawning → Full workflow testing (agent orchestration is GSD's core architecture)

**Parallel work opportunities:**
- After Phase 1: OpenCode adapter and testing can start in parallel
- After Phase 2: Agent spawning abstraction and hook system can be built in parallel
- Documentation can be written throughout

**Grouping rationale:**
- Phase 1-2: Foundation (platform layer exists, both adapters implemented)
- Phase 3-4: Feature abstraction (agent spawning and hooks work on both platforms)
- Phase 5: Quality assurance (prevent regressions, ensure reliability)

**Pitfall mapping to phases:**
- Phase 1 prevents: Pitfalls 1, 2, 5 (path hardcoding, detection races, config divergence)
- Phase 2 prevents: Pitfalls 8, 9, 10 (non-TTY, orphaned files, collisions)
- Phase 3 prevents: Pitfall 3 (agent spawning incompatibility—highest risk)
- Phase 4 prevents: Pitfall 4, 14 (hook mismatch, error messages)
- Phase 5 prevents: Pitfall 6, 15 (version drift, update mechanism)

### Research Flags

**Needs phase-specific research:**
- **Phase 2 (OpenCode Adapter):** OpenCode API verification, agent syntax testing, plugin event enumeration
- **Phase 3 (Agent Spawning):** Real OpenCode installation testing, parallel spawn verification, completion detection

**Standard patterns (skip research):**
- **Phase 1 (Platform Abstraction):** Adapter pattern is well-documented, high confidence from training data
- **Phase 5 (Testing):** Standard testing patterns, execution-focused

**Critical validation points:**
- After Phase 1: Existing Claude Code users must upgrade with zero regression
- After Phase 2: Basic command execution must work on OpenCode
- After Phase 3: new-project workflow must spawn 4 researchers + 1 synthesizer on both platforms
- After Phase 4: StatusLine and SessionStart must work (or gracefully degrade) on both platforms

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Adapter pattern is proven, Node.js already used, TypeScript standard for this problem |
| Features | HIGH | Based on GSD codebase analysis + stated project goals in PROJECT.md |
| Architecture | HIGH | Adapter/registry patterns are well-established, existing GSD structure supports it |
| Pitfalls | MEDIUM-HIGH | High confidence on installation/path issues (based on GSD changelog), medium on OpenCode specifics |

**Overall confidence:** MEDIUM-HIGH

**Confidence breakdown:**
- HIGH: Adapter pattern applicability, backward compatibility strategy, existing GSD architecture analysis
- MEDIUM: OpenCode API specifics (agent spawning syntax, plugin events, config schema—inferred but not verified)
- LOW: Future platforms (Cursor, Windsurf—general principles only, no specific knowledge)

### Gaps to Address

**During Phase 2 planning:**
- Verify OpenCode agent spawning syntax (YAML agent: + subtask: true assumed from PROJECT.md, needs official docs)
- Enumerate OpenCode plugin events (PROJECT.md mentions "20+ events" but doesn't list them)
- Confirm opencode.jsonc schema (assumed JSONC format, need structure verification)
- Check OpenCode command registration mechanism (flat vs directory structure confirmed, but registration API unknown)

**During Phase 3 planning:**
- Test OpenCode parallel agent spawning (does it support 4+ simultaneous agents like Claude Code?)
- Verify agent completion detection (how does OpenCode signal agent finished?)
- Confirm MCP tool availability on OpenCode (affects research agents using Context7)

**During Phase 4 planning:**
- Map OpenCode plugin events to Claude Code hooks (which event = SessionStart? which event = StatusLine equivalent?)
- Determine OpenCode lifecycle hook data (what context is passed to event handlers?)

**Mitigation strategy:**
- Flag Phase 2 for /gsd:research-phase (OpenCode API deep dive before implementation)
- Flag Phase 3 for OpenCode installation testing (validate agent spawning on real platform)
- Build adapters iteratively: Claude Code first (high confidence), OpenCode second (validate assumptions), extract common interface third (refine abstraction)

## Sources

### Primary (HIGH confidence)
- GSD codebase analysis: bin/install.js, hooks/statusline.js, commands/gsd/new-project.md, CHANGELOG.md
- .planning/PROJECT.md platform comparison table (Claude Code vs OpenCode features)
- .planning/codebase/ directory (INTEGRATIONS.md with 10 integration points, ARCHITECTURE.md with orchestrator pattern)
- Design Patterns: Gang of Four (adapter pattern, registry pattern, strategy pattern)
- Multi-platform Node.js development patterns (path.join, os.homedir, TTY detection, env var handling)

### Secondary (MEDIUM confidence)
- npm package ecosystem: env-paths (3.0.0, 81M weekly downloads), json5 (2.2.3), which (4.0.0)—versions from Jan 2025 training data, need verification against current npm registry
- Common multi-platform extension patterns (Prettier, ESLint, VSCode extensions do runtime detection)
- TypeScript 5.3.0 decorator support for platform registry (training data, not verified)

### Tertiary (LOW confidence—needs validation)
- OpenCode plugin event system (PROJECT.md mentions "20+ events" but doesn't enumerate them)
- OpenCode agent spawning syntax (YAML agent: + subtask: assumed from PROJECT.md comparison, not verified with official docs)
- OpenCode config file location (~/.config/opencode/opencode.jsonc inferred from XDG pattern, not confirmed)
- OpenCode command registration API (directory structure mentioned but registration mechanism unknown)
- Cursor/Windsurf extensibility (no specific knowledge, general principles only)

**Recommended validation before Phase 2:**
1. Verify npm package versions with `npm info env-paths version`, `npm info json5 version`, etc.
2. Research OpenCode official documentation (plugin API, event system, agent spawning)
3. Test OpenCode installation if available (verify paths, config format, command registration)
4. Adjust platform interface based on actual OpenCode capabilities discovered

---
*Research completed: 2026-01-19*
*Ready for roadmap: yes*
