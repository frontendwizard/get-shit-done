# Architecture Research: Multi-Platform GSD

**Domain:** Multi-platform AI development tool extensions
**Researched:** 2026-01-19
**Confidence:** MEDIUM

## Executive Summary

Multi-platform AI coding tools face a fundamental challenge: different platforms (Claude Code, OpenCode, Cursor, Windsurf, etc.) provide different integration points, APIs, and extension models. Success requires abstracting platform-specific concerns behind stable interfaces while maintaining native integration quality.

**Key Finding:** The adapter pattern with a platform registry is the industry-standard approach. Core business logic (commands, agents, workflows) remains platform-agnostic. Platform adapters implement a common interface and register themselves at runtime.

**GSD-Specific Insight:** GSD's current architecture is already well-positioned for multi-platform support. The document-driven, stateless command/agent model means most business logic requires zero changes. The challenge is abstracting the 10 integration points behind platform adapters.

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Commands Layer                       │
│  /gsd:new-project  /gsd:execute-phase  /gsd:verify-work     │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ Orchestr.  │  │ Agents     │  │ Workflows  │             │
│  │ Commands   │  │ (spawned)  │  │ (patterns) │             │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │
│        │               │               │                     │
│        └───────────────┴───────────────┘                     │
│                        │                                     │
├────────────────────────┼─────────────────────────────────────┤
│              Platform Abstraction Layer                      │
│  ┌─────────────────────┴─────────────────────┐               │
│  │          Platform Interface (API)         │               │
│  │  install() config() spawn() hooks() etc.  │               │
│  └─────────────────┬───────────────────────┬─┘               │
│                    │                       │                 │
│  ┌─────────────────┴─────┐   ┌─────────────┴──────────┐      │
│  │  ClaudeCodeAdapter    │   │  OpenCodeAdapter       │      │
│  │  (current impl)       │   │  (new)                 │      │
│  └─────────┬─────────────┘   └─────────┬──────────────┘      │
├────────────┼─────────────────────────────┼────────────────────┤
│            │                             │                    │
│  ┌─────────┴──────────┐      ┌──────────┴─────────┐          │
│  │ Claude Code API    │      │ OpenCode API       │          │
│  │ (settings.json,    │      │ (opencode.jsonc,   │          │
│  │  Task tool, hooks) │      │  YAML agents, etc) │          │
│  └────────────────────┘      └────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Business Logic | Command orchestration, agent definitions, workflow patterns | Markdown files with YAML frontmatter (platform-agnostic) |
| Platform Interface | Abstract API contract all platforms implement | TypeScript interface or JSON schema |
| Platform Adapter | Translates generic operations to platform-specific APIs | JavaScript/TypeScript class implementing interface |
| Platform Registry | Discovers and loads correct adapter at runtime | Singleton registry pattern with detection logic |
| Installation System | Copies files, configures platform, registers hooks | Platform-specific installer (adapts install.js logic) |

## Recommended Project Structure

```
get-shit-done/
├── bin/
│   └── install.js              # Entry point - detects platform, delegates to adapter
├── commands/
│   └── gsd/                    # Platform-agnostic command definitions
│       └── *.md                # NO CHANGES NEEDED (already abstract)
├── agents/
│   └── gsd-*.md                # Platform-agnostic agent definitions (NO CHANGES)
├── get-shit-done/
│   ├── workflows/              # Platform-agnostic workflows (NO CHANGES)
│   ├── templates/              # Platform-agnostic templates (NO CHANGES)
│   └── references/             # Platform-agnostic references (NO CHANGES)
├── platforms/                  # NEW: Platform abstraction layer
│   ├── interface.js            # Platform interface definition (contract)
│   ├── registry.js             # Runtime platform detection and adapter loading
│   ├── claude-code/            # Claude Code adapter
│   │   ├── adapter.js          # Implements platform interface
│   │   ├── installer.js        # Claude Code installation logic
│   │   ├── hooks/              # Claude Code hooks (statusline.js, etc.)
│   │   └── schemas/            # Claude Code-specific schemas
│   ├── opencode/               # OpenCode adapter
│   │   ├── adapter.js          # Implements platform interface
│   │   ├── installer.js        # OpenCode installation logic
│   │   ├── hooks/              # OpenCode hooks (if applicable)
│   │   └── schemas/            # OpenCode-specific schemas
│   └── shared/                 # Shared adapter utilities
│       ├── path-resolver.js    # Resolves ~/.claude/ vs ~/.config/opencode/
│       ├── config-writer.js    # JSON/JSONC writer
│       └── spawn-helper.js     # Agent spawning abstraction
├── hooks/                      # DEPRECATED: Moved to platforms/*/hooks/
└── package.json
```

### Structure Rationale

- **platforms/**: New directory for all platform-specific code. Clean separation from business logic.
- **platforms/interface.js**: Single source of truth for what platforms must implement. All adapters implement this contract.
- **platforms/registry.js**: Runtime detection (checks for Claude Code vs OpenCode vs other). Loads appropriate adapter.
- **platforms/{platform}/adapter.js**: Platform-specific implementation of interface. Knows how to install, configure, spawn agents, register hooks, etc.
- **commands/, agents/, get-shit-done/**: No changes needed. Already platform-agnostic (document-driven, stateless).

## Architectural Patterns

### Pattern 1: Adapter Pattern

**What:** Wrap platform-specific APIs behind a common interface. Business logic calls interface methods, adapters translate to platform-specific operations.

**When to use:** When you have multiple platforms with different APIs but similar concepts (all platforms have "hooks," "config files," "agent spawning," etc.).

**Trade-offs:**
- **Pro:** Business logic is 100% platform-agnostic. Adding new platforms is isolated to new adapter.
- **Pro:** Testable (mock adapter for tests).
- **Con:** Abstraction layer adds indirection (but minimal perf impact for CLI tools).
- **Con:** Interface must be designed carefully (too specific = doesn't fit all platforms, too generic = loses native features).

**Example:**
```typescript
// platforms/interface.js
class PlatformInterface {
  // Installation
  async install(options) { throw new Error('Not implemented'); }
  async getInstallPaths() { throw new Error('Not implemented'); }

  // Configuration
  async readConfig() { throw new Error('Not implemented'); }
  async writeConfig(config) { throw new Error('Not implemented'); }
  async registerHook(event, command) { throw new Error('Not implemented'); }

  // Agent spawning
  async spawnAgent(agentName, prompt, context) { throw new Error('Not implemented'); }
  async spawnParallelAgents(agents) { throw new Error('Not implemented'); }

  // Todo storage
  async readTodos(sessionId) { throw new Error('Not implemented'); }
  async writeTodos(sessionId, todos) { throw new Error('Not implemented'); }

  // Context file references
  resolveContextPath(relativePath) { throw new Error('Not implemented'); }
}

// platforms/claude-code/adapter.js
class ClaudeCodeAdapter extends PlatformInterface {
  async install(options) {
    // Current install.js logic here
    const claudeDir = options.global ? '~/.claude' : './.claude';
    // ... copy files, configure settings.json, etc.
  }

  async spawnAgent(agentName, prompt, context) {
    // Use Task tool (Claude Code specific)
    return Task({
      prompt: prompt,
      subagent_type: agentName,
      description: context.description
    });
  }

  resolveContextPath(relativePath) {
    // Claude Code uses ~/.claude/ prefix
    return relativePath.replace(/^~\/\.claude\//, '~/.claude/');
  }
}

// platforms/opencode/adapter.js
class OpenCodeAdapter extends PlatformInterface {
  async install(options) {
    // OpenCode installation logic
    const opencodeDir = options.global ? '~/.config/opencode' : './.opencode';
    // ... copy files, configure opencode.jsonc, etc.
  }

  async spawnAgent(agentName, prompt, context) {
    // Use YAML agent/subtask (OpenCode specific)
    return agent({
      name: agentName,
      prompt: prompt,
      tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']
    });
  }

  resolveContextPath(relativePath) {
    // OpenCode uses ~/.config/opencode/ prefix
    return relativePath.replace(/^~\/\.claude\//, '~/.config/opencode/');
  }
}
```

### Pattern 2: Registry Pattern

**What:** Singleton registry that detects current platform at runtime and provides the appropriate adapter.

**When to use:** When you need to determine platform dynamically (could be running in Claude Code or OpenCode).

**Trade-offs:**
- **Pro:** Single point of platform detection logic.
- **Pro:** Business logic never needs to know which platform is active.
- **Con:** Detection logic must be robust (check for Claude Code API, OpenCode API, etc.).

**Example:**
```typescript
// platforms/registry.js
class PlatformRegistry {
  constructor() {
    this.adapter = null;
  }

  detect() {
    // Detection heuristics (check for platform-specific APIs)
    if (typeof Task !== 'undefined') {
      // Claude Code exposes Task tool
      return 'claude-code';
    } else if (typeof agent !== 'undefined') {
      // OpenCode exposes agent/subtask
      return 'opencode';
    } else {
      // Fallback or error
      throw new Error('Unknown platform. GSD requires Claude Code or OpenCode.');
    }
  }

  getAdapter() {
    if (!this.adapter) {
      const platform = this.detect();
      if (platform === 'claude-code') {
        this.adapter = new ClaudeCodeAdapter();
      } else if (platform === 'opencode') {
        this.adapter = new OpenCodeAdapter();
      }
    }
    return this.adapter;
  }
}

// Global singleton
const registry = new PlatformRegistry();
module.exports = registry;

// Usage in business logic
const platform = require('./platforms/registry');
const adapter = platform.getAdapter();
await adapter.spawnAgent('gsd-planner', prompt, context);
```

### Pattern 3: Strategy Pattern for Hooks

**What:** Different platforms have different hook systems (Claude Code: settings.json with SessionStart/Stop, OpenCode: 20+ plugin events). Use strategy objects to encapsulate hook registration.

**When to use:** When behavior varies significantly by platform but the concept is the same (lifecycle events).

**Trade-offs:**
- **Pro:** Clean separation of hook logic per platform.
- **Pro:** Easy to add new hook types per platform.
- **Con:** Can't expose platform-specific hooks through generic interface (must be lowest common denominator or expose escape hatch).

**Example:**
```typescript
// platforms/claude-code/hooks/hook-strategy.js
class ClaudeCodeHookStrategy {
  async registerSessionStart(settings, command) {
    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
    settings.hooks.SessionStart.push({
      hooks: [{ type: 'command', command }]
    });
  }

  async registerStatusLine(settings, command) {
    settings.statusLine = { type: 'command', command };
  }
}

// platforms/opencode/hooks/hook-strategy.js
class OpenCodeHookStrategy {
  async registerSessionStart(config, command) {
    // OpenCode might use different event name/structure
    if (!config.plugins) config.plugins = [];
    config.plugins.push({
      event: 'onSessionStart',
      handler: command
    });
  }

  async registerStatusLine(config, command) {
    // OpenCode might not have statusLine, could use statusBar plugin
    config.statusBar = { command };
  }
}
```

### Pattern 4: Factory Pattern for Installation

**What:** Installation process varies significantly by platform (paths, config file formats, hook registration). Use factory to create platform-specific installer.

**When to use:** When you have complex object creation that varies by type (platform).

**Trade-offs:**
- **Pro:** Encapsulates installation complexity per platform.
- **Pro:** Easy to test installers independently.
- **Con:** More classes to maintain.

**Example:**
```typescript
// platforms/installer-factory.js
class InstallerFactory {
  static create(platform) {
    if (platform === 'claude-code') {
      return new ClaudeCodeInstaller();
    } else if (platform === 'opencode') {
      return new OpenCodeInstaller();
    }
    throw new Error(`Unknown platform: ${platform}`);
  }
}

// Usage in bin/install.js
const platform = detectPlatform(); // Check env vars, CLI flags, etc.
const installer = InstallerFactory.create(platform);
await installer.install({ global: true });
```

## Data Flow

### Installation Flow (Multi-Platform)

```
User runs: npx get-shit-done-cc --platform=opencode --global

bin/install.js (Entry Point)
    ↓
Parse CLI args (--platform, --global, --local, --config-dir)
    ↓
Detect platform (if not specified):
  - Check CLAUDE_CONFIG_DIR env var → Claude Code
  - Check OPENCODE_DIR env var → OpenCode
  - Check for Task API → Claude Code
  - Check for agent API → OpenCode
  - Default to Claude Code (backward compat)
    ↓
Load platform adapter:
  platforms/registry.js → platforms/{platform}/adapter.js
    ↓
Adapter.install():
  1. Resolve install paths (adapter.getInstallPaths())
  2. Copy files (commands/, agents/, get-shit-done/)
  3. Path replacement in .md files (adapter.resolveContextPath())
  4. Write config (adapter.writeConfig())
  5. Register hooks (adapter.registerHook())
  6. Copy platform-specific hooks (platforms/{platform}/hooks/)
    ↓
Output: Files installed to platform-specific directory
```

### Command Execution Flow (Multi-Platform)

```
User runs: /gsd:execute-phase 2

Claude Code or OpenCode loads: commands/gsd/execute-phase.md
    ↓
Command orchestrator executes (platform-agnostic markdown)
    ↓
Needs to spawn agents in parallel:
  - Current: Use Task tool (Claude Code specific)
  - New: Use platform.spawnAgent() (abstracted)
    ↓
Platform adapter translates:
  ClaudeCodeAdapter → Task(prompt, subagent_type, description)
  OpenCodeAdapter → agent(name, prompt, tools)
    ↓
Agents execute (platform-agnostic, write to .planning/)
    ↓
Orchestrator continues (platform-agnostic)
```

### Hook Execution Flow (Multi-Platform)

```
Platform Event: SessionStart

Claude Code:
  settings.json hooks.SessionStart[].hooks[].command
    ↓
  node ~/.claude/hooks/gsd-check-update.js
    ↓
  Read VERSION file, check npm registry, write cache

OpenCode:
  opencode.jsonc plugins[].onSessionStart.handler
    ↓
  node ~/.config/opencode/hooks/gsd-check-update.js
    ↓
  Same logic (platform-agnostic hook script)
```

### Key Data Flows

1. **Platform detection → Adapter loading:** Registry pattern ensures correct adapter loaded at runtime
2. **Generic operation → Platform-specific API:** Adapter translates abstract calls (spawnAgent, registerHook) to platform APIs
3. **Path resolution → Platform paths:** Adapter resolves ~/.claude/ vs ~/.config/opencode/ automatically
4. **Config read/write → Platform format:** Adapter handles JSON vs JSONC vs other formats

## Migration Strategy

### Phase 1: Extract Current Claude Code Logic to Adapter

**Goal:** Move existing Claude Code-specific logic into adapter structure without breaking current functionality.

**Changes:**
1. Create `platforms/` directory structure
2. Extract `install.js` logic to `platforms/claude-code/installer.js`
3. Move hooks to `platforms/claude-code/hooks/`
4. Create `platforms/claude-code/adapter.js` implementing interface
5. Update `bin/install.js` to use registry (defaulting to Claude Code)

**Validation:** Current users install with `npx get-shit-done-cc` and get identical behavior.

**Files changed:**
- `bin/install.js` (simplified to use adapter)
- `platforms/claude-code/` (new, contains extracted logic)
- `platforms/interface.js` (new, defines contract)
- `platforms/registry.js` (new, loads Claude Code by default)

**Files unchanged:**
- `commands/` (already platform-agnostic)
- `agents/` (already platform-agnostic)
- `get-shit-done/` (already platform-agnostic)

### Phase 2: Add OpenCode Adapter

**Goal:** Implement OpenCode support without changing business logic.

**Changes:**
1. Create `platforms/opencode/adapter.js` implementing interface
2. Create `platforms/opencode/installer.js` (OpenCode paths, config format)
3. Create `platforms/opencode/hooks/` (if OpenCode supports hooks)
4. Update registry to detect OpenCode
5. Add CLI flag: `--platform=opencode`

**Validation:** Install to OpenCode with `npx get-shit-done-cc --platform=opencode` and verify all commands work.

**Files changed:**
- `platforms/opencode/` (new)
- `platforms/registry.js` (add OpenCode detection)
- `bin/install.js` (add --platform flag)

**Files unchanged:**
- `commands/`, `agents/`, `get-shit-done/` (still platform-agnostic)
- `platforms/claude-code/` (no changes needed)

### Phase 3: Abstract Agent Spawning in Commands

**Goal:** Replace direct Task tool usage with platform.spawnAgent() abstraction.

**Challenge:** Commands are markdown files, not JavaScript. Can't call adapter directly.

**Options:**
1. **Option A (Recommended):** Create thin JavaScript wrapper for commands that call platform adapter, then invoke markdown process
2. **Option B:** Document convention in commands (e.g., "Use Task tool for Claude Code, agent() for OpenCode") and let each platform's API handle it
3. **Option C:** Pre-process markdown at install time to replace platform-specific syntax

**Recommended: Option A**

**Changes:**
1. Create `commands/gsd-wrapper.js` that loads platform adapter and provides helper functions
2. Commands reference wrapper functions (e.g., `spawnAgent('gsd-planner', prompt)`)
3. Wrapper translates to platform-specific API

**Validation:** Existing Claude Code users see no change. OpenCode users get native agent spawning.

**Files changed:**
- `commands/gsd-wrapper.js` (new)
- `commands/gsd/*.md` (minimal changes to use wrapper)

### Phase 4: Abstract Hook Registration

**Goal:** Allow platforms to register hooks in their native format.

**Changes:**
1. Adapter implements `registerHook(event, command)` method
2. Installer calls adapter methods instead of directly manipulating settings.json
3. Each adapter translates to platform-specific hook format

**Validation:** Hooks work correctly on both Claude Code and OpenCode.

**Files changed:**
- `platforms/*/adapter.js` (implement registerHook)
- `platforms/*/installer.js` (use adapter.registerHook)

### Migration Path from Current Architecture

**For existing Claude Code users:**
1. Run `npx get-shit-done-cc@latest --global` (or local)
2. Installer detects Claude Code (default), uses ClaudeCodeAdapter
3. Files installed to ~/.claude/ (unchanged)
4. settings.json configured (unchanged)
5. All commands work identically (no breaking changes)

**For new OpenCode users:**
1. Run `npx get-shit-done-cc --platform=opencode --global`
2. Installer detects/uses OpenCodeAdapter
3. Files installed to ~/.config/opencode/ (OpenCode convention)
4. opencode.jsonc configured (OpenCode format)
5. All commands work via OpenCode agent spawning

**Backward compatibility guarantee:**
- Phase 1 migration: Zero breaking changes (extraction only)
- Existing ~/.claude/ installations: Continue working (adapter loads automatically)
- No config migration needed (adapter reads existing settings.json)

## Component Boundaries

### What's Platform-Specific

| Component | Why Platform-Specific | Abstraction Method |
|-----------|------------------------|-------------------|
| Installation paths | ~/.claude/ vs ~/.config/opencode/ | Adapter.getInstallPaths() |
| Config file format | settings.json vs opencode.jsonc | Adapter.readConfig(), writeConfig() |
| Hook system | settings.json hooks vs plugin events | Adapter.registerHook() |
| Agent spawning | Task tool vs YAML agent | Adapter.spawnAgent() |
| Todo storage | ~/.claude/todos/ format (may vary) | Adapter.readTodos(), writeTodos() |
| Context references | Path prefixes in @-references | Adapter.resolveContextPath() |

### What's Platform-Agnostic

| Component | Why Platform-Agnostic | Location |
|-----------|------------------------|----------|
| Commands | Markdown orchestration logic, no API calls | commands/gsd/*.md |
| Agents | Role definitions, process descriptions | agents/gsd-*.md |
| Workflows | Execution patterns, conceptual | get-shit-done/workflows/ |
| Templates | Document structures | get-shit-done/templates/ |
| Planning artifacts | .planning/ files (PROJECT.md, ROADMAP.md, etc.) | User's project |

**Boundary principle:** If it depends on platform API or file paths → Platform-specific (in adapter). If it's pure logic/documents → Platform-agnostic (stays in existing location).

## Testing Strategy

### Unit Testing

**Platform Interface Contract:**
```typescript
// platforms/__tests__/interface.test.js
describe('PlatformInterface', () => {
  test('All adapters implement required methods', () => {
    const adapters = [new ClaudeCodeAdapter(), new OpenCodeAdapter()];

    for (const adapter of adapters) {
      expect(typeof adapter.install).toBe('function');
      expect(typeof adapter.getInstallPaths).toBe('function');
      expect(typeof adapter.readConfig).toBe('function');
      expect(typeof adapter.writeConfig).toBe('function');
      expect(typeof adapter.registerHook).toBe('function');
      expect(typeof adapter.spawnAgent).toBe('function');
      expect(typeof adapter.resolveContextPath).toBe('function');
    }
  });
});
```

**Adapter Implementation:**
```typescript
// platforms/claude-code/__tests__/adapter.test.js
describe('ClaudeCodeAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter();
  });

  test('getInstallPaths returns ~/.claude/ for global install', async () => {
    const paths = await adapter.getInstallPaths({ global: true });
    expect(paths.root).toContain('.claude');
  });

  test('resolveContextPath replaces ~/.claude/ prefix correctly', () => {
    const resolved = adapter.resolveContextPath('~/.claude/commands/gsd/help.md');
    expect(resolved).toBe('~/.claude/commands/gsd/help.md');
  });

  test('registerHook adds SessionStart hook to settings', async () => {
    const settings = {};
    await adapter.registerHook('SessionStart', 'node script.js', settings);
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('node script.js');
  });
});
```

### Integration Testing

**Installation Test:**
```bash
# Test Claude Code installation
npx get-shit-done-cc --global --config-dir=/tmp/test-claude
# Verify: /tmp/test-claude/commands/gsd/ exists
# Verify: /tmp/test-claude/settings.json contains hooks

# Test OpenCode installation
npx get-shit-done-cc --platform=opencode --global --config-dir=/tmp/test-opencode
# Verify: /tmp/test-opencode/commands/gsd/ exists
# Verify: /tmp/test-opencode/opencode.jsonc contains plugins
```

**Command Execution Test:**
```bash
# Create test project in both platforms
# Run /gsd:new-project (mocked user input)
# Verify .planning/ structure identical
# Verify path references correct per platform
```

### Verification Strategy

**Regression Prevention:**
1. Capture current Claude Code behavior as baseline tests
2. After adapter extraction (Phase 1), run baseline tests → must pass
3. After OpenCode addition (Phase 2), run baseline tests → Claude Code must still pass

**Multi-Platform Verification:**
1. Same command, both platforms → verify .planning/ artifacts identical
2. Agent spawning → verify parallel execution works
3. Hook registration → verify events trigger correctly

**Test Organization:**
```
tests/
├── unit/
│   ├── adapters/
│   │   ├── claude-code.test.js
│   │   └── opencode.test.js
│   └── registry.test.js
├── integration/
│   ├── install-claude-code.test.js
│   ├── install-opencode.test.js
│   └── command-execution.test.js
└── fixtures/
    ├── mock-settings.json
    ├── mock-opencode.jsonc
    └── test-project/
```

## Build Order Implications

### Dependency Graph

```
Phase 1: Extract Claude Code to Adapter
  ├─ Create platforms/interface.js (no dependencies)
  ├─ Create platforms/registry.js (depends on interface.js)
  ├─ Create platforms/claude-code/adapter.js (depends on interface.js)
  ├─ Extract bin/install.js logic to platforms/claude-code/installer.js
  └─ Update bin/install.js to use registry

Phase 2: Add OpenCode Support
  ├─ Create platforms/opencode/adapter.js (depends on interface.js)
  ├─ Create platforms/opencode/installer.js
  ├─ Update platforms/registry.js (add OpenCode detection)
  └─ Add --platform CLI flag to bin/install.js

Phase 3: Abstract Agent Spawning
  ├─ Update commands to use platform abstraction (depends on Phase 1)
  └─ Test with both platforms (depends on Phase 2)

Phase 4: Abstract Hook Registration
  ├─ Implement registerHook in adapters (depends on Phase 1)
  └─ Update installers to use registerHook (depends on Phase 2)
```

### Recommended Implementation Order

1. **Interface first:** Define platform interface before implementing adapters (contract-first design)
2. **Claude Code adapter:** Extract existing logic (prove adapter pattern works)
3. **Registry:** Implement detection and loading (prove switching works)
4. **OpenCode adapter:** Add second platform (prove abstraction is sufficient)
5. **Command abstraction:** Update commands to use platform API (prove end-to-end)
6. **Testing:** Add tests at each phase (prevent regressions)

### Critical Path

```
Interface → Registry → Claude Code Adapter → OpenCode Adapter → Command Updates
```

**Blocker relationships:**
- Can't build adapters without interface (defines contract)
- Can't build registry without adapters (needs something to load)
- Can't add OpenCode without Claude Code adapter working (proves pattern)
- Can't update commands until both adapters work (need to test both)

### Parallel Work Opportunities

**After interface is stable:**
- Claude Code adapter and OpenCode adapter can be built in parallel (independent implementations)
- Testing can be written in parallel with adapter development (test-driven)
- Documentation can be written in parallel with implementation

**Sequential dependencies:**
- bin/install.js refactor depends on registry being stable
- Command updates depend on adapters being complete
- Hook abstraction depends on config abstraction

## Platform-Specific Considerations

### Claude Code

**Strengths:**
- Mature hook system (SessionStart, Stop, StatusLine)
- Task tool provides clean agent spawning
- settings.json is well-documented

**Challenges:**
- settings.json must preserve user's existing config (complex merge logic)
- Hook cleanup required (orphaned entries from previous versions)
- Path resolution tied to ~/.claude/ (not configurable beyond CLAUDE_CONFIG_DIR)

**Adapter requirements:**
- Implement careful settings.json read/modify/write (preserve existing hooks)
- Support CLAUDE_CONFIG_DIR env var (multi-account scenarios)
- Handle hook cleanup (remove orphaned gsd-*.sh entries)

### OpenCode

**Strengths:**
- 20+ plugin events (more lifecycle hooks available)
- YAML-based agent/subtask (more structured than Task tool)
- JSONC config format (supports comments)

**Challenges:**
- Plugin event model may differ from Claude Code hooks (need research)
- Agent spawning syntax different (YAML vs function call)
- Path conventions unknown (assumed ~/.config/opencode/ but need verification)

**Adapter requirements:**
- Research actual OpenCode plugin API (current info is LOW confidence)
- Implement JSONC writer (preserve comments, formatting)
- Map GSD hook concepts to OpenCode events (SessionStart → onSessionStart?)

### Future Platforms (Cursor, Windsurf, etc.)

**Abstraction must support:**
- Different config file formats (JSON, JSONC, YAML, TOML)
- Different agent spawning mechanisms (Task, YAML, API calls)
- Different hook/event models (lifecycle, file watching, etc.)
- Different path conventions (XDG base dir, macOS Library, Windows AppData)

**Interface design principle:**
- Lowest common denominator for core features (install, config, spawn, hooks)
- Escape hatch for platform-specific features (adapter.platformSpecific.*)
- Clear documentation of what's abstracted vs platform-specific

## Anti-Patterns

### Anti-Pattern 1: Leaky Abstraction

**What people do:** Add platform-specific checks in business logic (if Claude Code, do X, else do Y)

**Why it's wrong:** Defeats purpose of abstraction. Every new platform requires changes to business logic.

**Do this instead:** Keep platform checks in registry/adapter only. Business logic calls abstract interface methods.

**Example:**
```typescript
// WRONG (leaky abstraction)
if (platform === 'claude-code') {
  Task({ prompt, subagent_type });
} else if (platform === 'opencode') {
  agent({ prompt, name });
}

// RIGHT (abstraction)
await platform.spawnAgent(agentName, prompt);
```

### Anti-Pattern 2: Over-Abstraction

**What people do:** Try to abstract every tiny difference between platforms, creating 100+ interface methods.

**Why it's wrong:** Interface becomes brittle (changes frequently) and hard to implement (every adapter needs 100+ methods).

**Do this instead:** Abstract common operations (install, config, spawn, hooks). Allow adapters to have platform-specific escape hatches for rare features.

**Example:**
```typescript
// WRONG (over-abstraction)
interface Platform {
  getStatusLineColor();
  getStatusLineFormat();
  getStatusLineAlignment();
  setStatusLineRefreshRate();
  ... // 50 more statusline methods
}

// RIGHT (reasonable abstraction)
interface Platform {
  registerStatusLine(command); // Platform decides format/color/etc.
  platformSpecific; // Escape hatch for rare features
}
```

### Anti-Pattern 3: Premature Generalization

**What people do:** Design interface for 10 hypothetical platforms before implementing 2 real ones.

**Why it's wrong:** You don't know what needs abstracting until you've implemented multiple platforms. Over-engineer too early → wrong abstractions.

**Do this instead:** Build Claude Code adapter, then OpenCode adapter. Extract commonality after seeing real patterns.

**Example:**
```typescript
// WRONG (premature)
// Design interface before knowing what OpenCode needs
interface Platform { ... } // Guessing at requirements

// RIGHT (iterative)
// 1. Extract Claude Code to adapter
// 2. Implement OpenCode adapter (duplicate some logic)
// 3. Extract common patterns to interface
// 4. Refactor both adapters to use common interface
```

### Anti-Pattern 4: Config File Overwriting

**What people do:** Read config, replace entirely with new config, lose user's custom settings.

**Why it's wrong:** Users lose their custom hooks, statusline, agents, etc.

**Do this instead:** Deep merge configs, preserve unknown keys, only update GSD-specific entries.

**Example:**
```typescript
// WRONG
const config = { hooks: { SessionStart: [gsdHook] } };
writeConfig(config); // Overwrites user's hooks

// RIGHT
const existingConfig = await readConfig();
existingConfig.hooks = existingConfig.hooks || {};
existingConfig.hooks.SessionStart = existingConfig.hooks.SessionStart || [];
// Only add if not already present
if (!existingConfig.hooks.SessionStart.some(h => h.includes('gsd-'))) {
  existingConfig.hooks.SessionStart.push(gsdHook);
}
writeConfig(existingConfig); // Preserves user's hooks
```

## Sources

**Adapter Pattern:**
- Design Patterns: Elements of Reusable Object-Oriented Software (Gang of Four, 1994) - foundational reference
- My training data on adapter pattern implementations in plugin systems

**Platform Detection:**
- Common pattern in multi-platform tools (Prettier, ESLint, Jest all do runtime detection)
- My training data on runtime environment detection

**VS Code Extension Architecture:**
- My training data on VS Code extension API (Task, agent spawning concepts)
- Common patterns in VS Code extension development

**Confidence Note:**
This research is MEDIUM confidence because:
- HIGH confidence: Adapter/registry patterns are well-established, proven in my training data
- HIGH confidence: Current GSD architecture analysis (based on reading actual code)
- MEDIUM confidence: OpenCode specifics (API, config format, paths) are assumptions based on typical IDE patterns, not verified documentation
- LOW confidence: Future platforms (Cursor, Windsurf) - no specific knowledge, general principles only

**Recommended validation:**
1. Verify OpenCode plugin API and config format (official docs or source code)
2. Verify OpenCode installation paths (XDG base dir compliance?)
3. Test adapter pattern with real OpenCode installation
4. Adjust interface based on actual OpenCode capabilities

---
*Architecture research for: Multi-platform AI development tools*
*Researched: 2026-01-19*
*Primary author: Claude Sonnet 4.5 (project-researcher agent)*
