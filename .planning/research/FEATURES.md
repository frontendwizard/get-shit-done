# Feature Landscape: Multi-Platform AI Development Tool Extensions

**Domain:** Multi-platform extension systems for AI coding assistants
**Researched:** 2026-01-19
**Context:** Adding multi-platform support to existing GSD (Claude Code → Claude Code + OpenCode + future platforms)

## Table Stakes

Features users expect from multi-platform extensions. Missing = system feels incomplete or platform-locked.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Platform Detection** | Extension must know which platform it's running on | Low | Runtime environment detection via available APIs/globals. Required for routing platform-specific calls. |
| **Unified Installation** | Single install command for all platforms | Medium | Multi-select installer with checkbox UX. Must handle different config directories (`~/.claude/` vs `~/.config/opencode/`). |
| **Command Portability** | Same commands work across all platforms | Medium | Commands written in platform-agnostic markdown/YAML. Platform layer handles invocation differences. |
| **Configuration Abstraction** | Single source of truth for user preferences | Medium | Abstract settings API that writes to `settings.json` (Claude Code) or `opencode.jsonc` (OpenCode). Must handle different schema requirements. |
| **Project Portability** | `.planning/` directories work across platforms | High | CRITICAL for GSD. No platform-specific paths or references in planning artifacts. Runtime detection only. |
| **Agent Spawning Abstraction** | Spawn subagents regardless of platform | High | Abstract `Task tool` (Claude Code) vs `YAML agent: + subtask:` (OpenCode). Core GSD feature depends on this. |
| **Lifecycle Hooks** | SessionStart, StatusLine equivalents | Medium | Claude Code has explicit hooks. OpenCode has 20+ plugin events. Need mapping layer. |
| **File System Access** | Read/Write/Glob/Grep tools work consistently | Low | Both platforms provide file tools. API may differ slightly. |
| **Git Integration** | Bash tool for git commands | Low | Both support Bash. GSD uses git extensively for atomic commits. |
| **Update Notifications** | Check for new versions across platforms | Medium | Platform-agnostic version check. Display via StatusLine or platform-specific notification API. |

## Differentiators

Features that set GSD apart from basic multi-platform extensions. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Zero Migration Portability** | Existing projects work immediately on new platform without conversion | High | GSD's killer feature. `.planning/` created on Claude Code works on OpenCode with zero changes. Requires strict platform abstraction discipline. |
| **Backward Compatibility** | v1.x users upgrade to v2.x without breaking | High | Existing Claude Code installations continue working. Multi-platform is additive, not replacing. Maintains 1.6k+ install base trust. |
| **Extensible Architecture** | Adding Cursor/Windsurf requires minimal code | High | Platform adapter pattern. New platform = implement adapter interface, register detection, done. Future-proofs against AI platform proliferation. |
| **Platform-Best UX** | StatusLine on Claude Code, TUI on OpenCode, native to each | Medium | Don't force lowest-common-denominator. Implement best experience per platform while keeping core workflow identical. |
| **Transparent Platform Switching** | User doesn't think about which platform they're on | Medium | Commands, agents, workflows reference platform layer, never platform-specific APIs directly. "It just works" feel. |
| **Parallel Installation** | Install on multiple platforms simultaneously | Medium | Checkbox installer supports selecting Claude Code + OpenCode together. Both get configured in one command. |
| **Platform-Specific Feature Detection** | Graceful degradation when feature unavailable | Low | E.g., if platform doesn't support StatusLine, skip it silently. Log capability but don't fail installation. |
| **Unified Debugging** | `/gsd:debug` works identically across platforms | Medium | Debug workflow spawns agents, reads logs, creates fix plans. All via platform abstraction. User experience identical. |
| **Cross-Platform Agent Spawning** | Spawn 4 parallel researchers on any platform | High | GSD spawns up to 7 parallel agents during workflows. Platform layer must handle Claude Code's `Task tool` vs OpenCode's `agent: + subtask:` YAML seamlessly. |
| **Smart Path References** | `~/.claude/` becomes `~/.config/opencode/` automatically | Medium | Commands reference installation root abstractly. Platform adapter resolves to correct path at runtime. |

## Anti-Features

Features to explicitly NOT build. Common mistakes in multi-platform systems.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Per-Command Platform Selection** | User shouldn't choose platform per invocation. Creates confusion and breaks project portability. | Platform detected at runtime from environment. User chooses platforms during installation only. |
| **Platform Markers in `.planning/`** | Storing `"platform": "claude-code"` in PROJECT.md breaks portability. | Zero platform references in planning artifacts. Runtime detection only via available APIs. |
| **Lowest-Common-Denominator UX** | Forcing all platforms to same limited UI (e.g., no StatusLine anywhere) degrades experience. | Implement best UX per platform. Abstract the concept (status display), not the implementation. |
| **Manual Platform Configuration** | Asking user to edit config files for each platform. | Installer handles all settings.json/opencode.jsonc configuration automatically. |
| **Platform-Specific Commands** | `/gsd-cc:new-project` vs `/gsd-oc:new-project` splits the namespace. | Same command works everywhere. Platform adapter routes to correct implementation. |
| **Tight Coupling to Platform APIs** | Calling `claude.spawnAgent()` directly in command files. | Platform abstraction layer with adapter pattern. Commands call `platform.spawnAgent()` which routes correctly. |
| **Conversion Tools** | Building "migrate .planning/ from Claude Code to OpenCode" utilities. | If conversion needed, architecture failed. Goal is zero migration. |
| **Separate Package Per Platform** | `get-shit-done-cc` and `get-shit-done-oc` packages. | Single package (`get-shit-done`) with multi-select installer. Simpler maintenance, clearer branding. |
| **Platform Version Lock-in** | Supporting only Claude Code v2.1 or OpenCode v1.0 specifically. | Detect capabilities, not versions. Feature detection over version checking. |
| **Hardcoded Platform Paths** | `if (platform === 'claude-code') path = '~/.claude/'` in core logic. | Platform adapter provides `getPaths()` method. Core logic never knows platform. |

## Feature Dependencies

Critical dependencies that affect implementation order:

```
Platform Detection (runtime)
    ↓
Platform Adapter Interface
    ↓
    ├─→ Configuration Management (settings.json vs opencode.jsonc)
    ├─→ Command Registration (commands/gsd/*.md vs commands/*.md)
    ├─→ Agent Spawning (Task tool vs YAML agent/subtask)
    ├─→ Lifecycle Hooks (SessionStart vs plugin events)
    ├─→ Path Resolution (~/.claude/ vs ~/.config/opencode/)
    └─→ File Tool Abstraction (Read, Write, Bash API differences)
```

**Sequential dependencies:**
1. Platform detection must work before any platform-specific calls
2. Platform adapter interface defines contract before implementing adapters
3. Command portability requires agent spawning abstraction (core GSD feature)
4. Unified installation depends on configuration abstraction (writes to correct files)
5. Project portability requires all paths resolved via platform layer (no hardcoded paths in .planning/)

## Platform-Specific vs Cross-Platform Features

### Cross-Platform (Core GSD Workflow)

These features work identically across all platforms:

- 24 slash commands (`/gsd:new-project`, `/gsd:plan-phase`, etc.)
- Deep questioning workflow (gathers requirements)
- Research spawning (4 parallel agents)
- Roadmap creation and phase structure
- Plan creation with wave-based execution
- Atomic git commits per task
- Goal-backward verification
- User acceptance testing (UAT)
- Checkpoint protocols (human approval gates)
- Todo tracking
- Debug workflow
- `.planning/` directory structure and file formats

**Implementation:** Commands and agents reference platform abstraction layer. Platform differences hidden behind adapter.

### Platform-Specific (Implementation Details)

These features adapt to platform capabilities:

| Feature | Claude Code | OpenCode | Abstraction |
|---------|-------------|----------|-------------|
| StatusLine | `statusLine.command` in settings.json | TUI notification or plugin status API | `platform.displayStatus(text)` |
| Agent Spawning | `Task(prompt, subagent_type="gsd-planner")` | YAML `agent: gsd-planner` + `subtask: true` | `platform.spawnAgent(type, prompt)` |
| Lifecycle Hooks | `hooks.SessionStart` array in settings.json | Plugin event system (20+ events) | `platform.registerHook('session_start', fn)` |
| Config Location | `~/.claude/settings.json` | `~/.config/opencode/opencode.jsonc` | `platform.getPaths().config` |
| Command Location | `commands/gsd/*.md` | `commands/*.md` | `platform.getPaths().commands` |
| Arguments | Direct passing to command | `$ARGUMENTS` placeholder in YAML | `platform.parseArguments(raw)` |
| Tool Restrictions | `allowed-tools` in YAML frontmatter | No explicit restriction visible | `platform.declareTools(tools)` |

**Implementation:** Platform adapter implements standard interface. Each platform's adapter handles platform-specific APIs.

## MVP Recommendation

For multi-platform GSD v2.0, prioritize in this order:

### Phase 1: Foundation (Must Have)

1. **Platform Detection** - Runtime identification of execution environment
2. **Platform Adapter Interface** - Abstract API all platforms must implement
3. **Claude Code Adapter** - Implement existing functionality via adapter (refactor, not rewrite)
4. **OpenCode Adapter** - Implement second platform support
5. **Unified Installer** - Multi-select checkbox installer for both platforms

**Outcome:** GSD works on Claude Code and OpenCode. Existing projects portable between platforms.

### Phase 2: Polish (Should Have)

6. **Smart Path Resolution** - `~/.claude/` references become platform-agnostic
7. **Backward Compatibility** - Existing v1.x Claude Code installations upgrade smoothly
8. **Platform-Best UX** - StatusLine on Claude Code, best equivalent on OpenCode
9. **Cross-Platform Testing** - Verify all 24 commands work on both platforms
10. **Documentation** - Update README with multi-platform installation instructions

**Outcome:** Professional quality, maintains existing user trust, ready for public release.

### Defer to Post-MVP

- **Third Platform Support** (Cursor/Windsurf) - Validate architecture with two platforms first
- **Platform-Specific Optimizations** - Leverage unique platform features beyond core workflow
- **Migration Tooling** - Should be unnecessary if zero-migration portability achieved
- **Platform Feature Detection** - Start with all-or-nothing, add graceful degradation later
- **Visual Platform Switcher** - Runtime detection sufficient for MVP

**Rationale:** Prove architecture with two real platforms before scaling to more. Focus on portability, not quantity of platforms.

## Key Integration Points

Based on current GSD architecture analysis:

### 1. Installation Layer

**What:** Copy files to platform-specific directories, configure platform settings

**Platform Differences:**
- Claude Code: `~/.claude/commands/gsd/`, `~/.claude/agents/`, `settings.json`
- OpenCode: `~/.config/opencode/commands/`, `~/.config/opencode/agents/`, `opencode.jsonc`

**Abstraction Needed:** `platform.install(files)` handles directory structure and configuration registration

### 2. Command Invocation

**What:** User types `/gsd:new-project`, system loads and executes command

**Platform Differences:**
- Claude Code: Reads YAML frontmatter (`name`, `description`, `allowed-tools`), passes arguments directly
- OpenCode: Reads YAML frontmatter, uses `$ARGUMENTS` placeholder, no explicit tool restrictions

**Abstraction Needed:** `platform.invokeCommand(name, args)` handles argument passing and tool setup

### 3. Agent Spawning

**What:** Command spawns specialized subagent for focused work (most critical GSD feature)

**Platform Differences:**
- Claude Code: `Task(prompt="...", subagent_type="gsd-planner", description="...")`
- OpenCode: YAML block with `agent: gsd-planner` and `subtask: true`

**Abstraction Needed:** `platform.spawnAgent(type, prompt, options)` returns Task reference or YAML structure

**Complexity:** HIGH - GSD spawns 4-7 parallel agents in workflows. Agent orchestration is core architecture.

### 4. Lifecycle Events

**What:** SessionStart hook for update checking, StatusLine for project status display

**Platform Differences:**
- Claude Code: Explicit hook registration in `settings.json`, runs Node.js scripts
- OpenCode: Plugin event system with 20+ event types, different callback structure

**Abstraction Needed:** `platform.registerHook(event, handler)` maps to platform event system

### 5. State Management

**What:** Read/write `.planning/` files, track project state across sessions

**Platform Differences:**
- Both: Support Read, Write tools with similar APIs
- Differences likely in path resolution and error handling

**Abstraction Needed:** Minimal - both platforms support file operations. Ensure path handling is platform-agnostic.

### 6. Configuration Management

**What:** Read/write user preferences, platform settings

**Platform Differences:**
- Claude Code: `settings.json` (JSON format)
- OpenCode: `opencode.jsonc` (JSON with comments)

**Abstraction Needed:** `platform.getConfig(key)` and `platform.setConfig(key, value)` handle format differences

## Agent Spawning Patterns

Critical feature requiring deep abstraction:

### Claude Code Pattern (Current)

```markdown
Task(
  prompt="Research stack options for web app\n\nContext: @.planning/PROJECT.md",
  subagent_type="gsd-project-researcher",
  description="Stack research",
  run_in_background=true
)
```

**Result:** Returns Task reference, spawns in parallel if `run_in_background=true`

### OpenCode Pattern (Target)

```yaml
agent: gsd-project-researcher
subtask: true
prompt: |
  Research stack options for web app

  Context: @.planning/PROJECT.md
```

**Result:** System spawns agent based on YAML metadata

### Abstraction Challenge

GSD workflows spawn 4-7 agents in parallel:
- 4 parallel researchers (stack, features, architecture, pitfalls)
- 3+ parallel executors (wave-based plan execution)
- 1 synthesizer (combines research results)
- 1 verifier (checks phase completion)

**Requirements:**
1. Platform abstraction must support parallel spawning
2. Must track agent completion status
3. Must collect agent outputs (written to `.planning/` files)
4. Must handle agent failures gracefully

**Complexity:** This is the highest-risk abstraction. Agent orchestration IS GSD's architecture.

## Configuration Patterns

How other tools handle multi-platform configuration (LOW CONFIDENCE - based on general patterns, not verified):

### Common Patterns

1. **Adapter Pattern** - Interface per platform, runtime selection
2. **Feature Detection** - Check for API availability, not platform name
3. **Graceful Degradation** - Core features work everywhere, nice-to-haves adapt
4. **Single Source of Truth** - One config file, platform-specific serialization

### GSD Approach

Based on existing architecture and constraints:

**Selected Pattern:** Adapter Pattern with Runtime Detection

**Rationale:**
- Existing GSD has deep Claude Code integration (10 integration points identified)
- Can't break existing users (1.6k+ installs, active `.planning/` projects)
- Must add OpenCode without removing Claude Code support
- Future platforms (Cursor, Windsurf) need easy onboarding
- Solo maintainer - architecture must be maintainable

**Implementation:**
```javascript
// Platform detection (runtime)
const platform = detectPlatform(); // Returns 'claude-code' or 'opencode'
const adapter = getPlatformAdapter(platform); // Returns ClaudeCodeAdapter or OpenCodeAdapter

// All commands use adapter
adapter.spawnAgent('gsd-planner', prompt, { background: true });
adapter.displayStatus('Planning Phase 1...');
adapter.setConfig('statusLine', statusCommand);
```

**Benefits:**
- Platform-specific complexity isolated in adapters
- Core commands/agents/workflows platform-agnostic
- Adding new platform = implement adapter interface
- Existing Claude Code code becomes ClaudeCodeAdapter
- Zero changes to `.planning/` artifacts (project portability preserved)

## Sources

**Primary Sources (HIGH Confidence):**
- Existing GSD codebase analysis (`bin/install.js`, `hooks/statusline.js`, `commands/gsd/*.md`, `agents/gsd-*.md`)
- `.planning/PROJECT.md` platform comparison table (Claude Code vs OpenCode features)
- `.planning/codebase/INTEGRATIONS.md` (10 integration points with Claude Code)
- `.planning/codebase/ARCHITECTURE.md` (orchestrator pattern, agent spawning, state management)

**Inferred from Context (MEDIUM Confidence):**
- Multi-platform extension requirements based on stated project goals
- Platform abstraction patterns based on identified integration points
- Feature categorization (table stakes vs differentiators) based on GSD's core value proposition

**General Knowledge (LOW Confidence - Not Verified):**
- Common multi-platform extension patterns (adapter pattern, feature detection)
- General best practices for extensible architectures
- Cross-platform configuration management approaches

**Verification Needed:**
- OpenCode specific APIs and event system (mentioned "20+ events" in PROJECT.md but not detailed)
- Exact differences in file tool APIs between platforms
- OpenCode agent spawning syntax verification (YAML structure assumed from PROJECT.md comparison)
- Platform-specific limitations or constraints beyond those documented

---

*Feature research complete. Ready for requirements definition and roadmap creation.*
