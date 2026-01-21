# Phase 3: OpenCode Adapter & Multi-Platform Installation - Research

**Researched:** 2026-01-21
**Domain:** Multi-platform CLI installer UX, OpenCode platform integration
**Confidence:** MEDIUM

## Summary

OpenCode is an open-source AI coding assistant with a plugin-based architecture that differs significantly from Claude Code. Commands are markdown files stored in `.opencode/command/` directories, config uses JSONC format with deep merge behavior, and the installation pattern requires copying command files rather than registering through a central config file.

The multi-platform installer should use `@inquirer/checkbox` for interactive TUI (modern, TypeScript-native, 39M+ weekly downloads). Non-interactive mode requires `--platform` flag with clear fallback behavior for CI/Docker environments.

**Primary recommendation:** Create OpenCode adapter mirroring ClaudeCodeAdapter's minimal Phase 2 implementation (paths + config + hooks only). Commands are file-based (copy to directory), not registration-based like Claude Code's settings.json approach.

**Critical finding:** OpenCode's config file location and command discovery differ from what's currently implemented in `OpenCodePaths`. Research shows `~/.config/opencode/opencode.json` (not `opencode.jsonc` necessarily) and `.opencode/command/` (not `commands/`) for command storage.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @inquirer/checkbox | 3.x+ | Multi-select platform chooser | Modern Inquirer rewrite, 39M+ weekly downloads, TypeScript native, progressive migration from legacy inquirer |
| jsonc-parser | 3.x+ | Parse OpenCode's JSONC config | Microsoft's official JSONC parser, used by VS Code, fault-tolerant parsing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| strip-json-comments | 5.x+ | Lightweight JSONC parsing alternative | If jsonc-parser adds too much bundle size, but less robust for malformed files |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @inquirer/checkbox | inquirer (legacy) | Legacy has 39M downloads but modern @inquirer/prompts is actively developed, smaller bundle |
| @inquirer/checkbox | prompts | Prompts has 33M downloads but inquirer ecosystem has better TypeScript support and more examples |
| jsonc-parser | JSON5 | JSON5 is broader spec but OpenCode specifically uses JSONC (JSON with comments), not full JSON5 features |

**Installation:**
```bash
npm install @inquirer/checkbox jsonc-parser
```

## Architecture Patterns

### Recommended Adapter Structure

```
src/platform/adapters/
├── claude-code.ts       # Existing Phase 2 adapter
└── opencode.ts          # NEW: Phase 3 adapter
```

### Pattern 1: Ultra-Minimal Adapter (Phase 2 pattern reuse)

**What:** Implement ONLY methods needed for Phase 3 non-agent commands, stub everything else with clear error messages.

**When to use:** Phase 3 scope explicitly defers agent spawning to Phase 4.

**Example:**
```typescript
// Source: Derived from src/platform/adapters/claude-code.ts
export class OpenCodeAdapter implements PlatformAdapter {
  readonly name: PlatformType = 'opencode';
  readonly version: string = '1.0.0';

  private paths: OpenCodePaths;

  constructor() {
    this.paths = new OpenCodePaths();
  }

  // Path delegation (inherited from PathResolver)
  getConfigDir(): string { return this.paths.getConfigDir(); }
  getCommandsDir(): string { return this.paths.getCommandsDir(); }
  getAgentsDir(): string { return this.paths.getAgentsDir(); }
  getHooksDir(): string { return this.paths.getHooksDir(); }

  // Config management
  async readConfig(): Promise<Record<string, any>> {
    const configPath = path.join(this.getConfigDir(), 'opencode.json');
    if (!fs.existsSync(configPath)) return {};
    const content = fs.readFileSync(configPath, 'utf8');
    return parse(content); // jsonc-parser
  }

  async writeConfig(config: Record<string, any>): Promise<void> {
    const configPath = path.join(this.getConfigDir(), 'opencode.json');
    // OpenCode uses JSONC but write as JSON (comments not needed for GSD-generated config)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }

  // Stubbed for Phase 4
  async spawnAgent(): Promise<AgentInstance> {
    throw new Error('spawnAgent() not implemented in Phase 3 - deferred to Phase 4');
  }

  async registerCommand(): Promise<void> {
    throw new Error('registerCommand() not implemented in Phase 3 - install.js handles command copying');
  }
}
```

### Pattern 2: File-Based Command Registration (NOT Config-Based)

**What:** OpenCode discovers commands by scanning `.opencode/command/` directory for markdown files. No central registration config needed.

**When to use:** OpenCode adapter's registerCommand() implementation (Phase 4+).

**Key difference from Claude Code:**
- Claude Code: Copy to `~/.claude/commands/gsd/`, commands auto-discovered
- OpenCode: Copy to `~/.config/opencode/command/`, commands auto-discovered

Both are file-based, but directory structure differs:
- Claude Code: `/commands/gsd/` subdirectory for namespacing
- OpenCode: `/command/` (singular) flat structure OR nested like `/command/gsd/`

**Example:**
```typescript
// Phase 4 implementation (NOT Phase 3)
async registerCommand(commandPath: string): Promise<void> {
  const commandsDir = this.getCommandsDir();
  fs.mkdirSync(commandsDir, { recursive: true });

  // Copy command file to OpenCode's command directory
  const commandName = path.basename(commandPath);
  const destPath = path.join(commandsDir, commandName);
  fs.copyFileSync(commandPath, destPath);

  // NO config registration needed - OpenCode auto-discovers from filesystem
}
```

### Pattern 3: Interactive Checkbox UI with Fallback

**What:** Multi-select TUI for platform choice with graceful non-interactive fallback.

**When to use:** Installer script (bin/install.js).

**Example:**
```typescript
// Source: https://www.npmjs.com/package/@inquirer/checkbox
import { checkbox } from '@inquirer/prompts';

// Interactive mode
if (process.stdin.isTTY) {
  const platforms = await checkbox({
    message: 'Which platform(s) would you like to install for?',
    choices: [
      { name: 'Claude Code', value: 'claude-code' },
      { name: 'OpenCode', value: 'opencode' }
    ],
    required: true, // Force at least one selection
    // NOTE: default: [] means NONE pre-selected (user must actively choose)
  });
  // platforms = ['claude-code'] or ['opencode'] or ['claude-code', 'opencode']
} else {
  // Non-interactive fallback (CI/Docker)
  const platformFlag = parseFlag('--platform');
  const platforms = platformFlag === 'both'
    ? ['claude-code', 'opencode']
    : platformFlag === 'opencode'
    ? ['opencode']
    : ['claude-code']; // Default to Claude Code for safety
}
```

### Anti-Patterns to Avoid

- **Anti-pattern: Assuming OpenCode config schema matches Claude Code**
  - Why bad: OpenCode has different config structure (plugin array, mcp object, etc.)
  - Do instead: Only write minimal command registration, don't assume deep structure compatibility

- **Anti-pattern: Pre-selecting both platforms in checkbox**
  - Why bad: User accidentally installs to both platforms without realizing
  - Do instead: Default to NONE selected, force explicit choice (user decision requirement)

- **Anti-pattern: Silent fallback when no platform detected**
  - Why bad: User expected both platforms, only one gets installed
  - Do instead: Show TUI question even when neither platform detected (manual override)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONC parsing | Regex-based comment stripping | jsonc-parser OR strip-json-comments | Edge cases: strings containing "//" or "/*", nested comments, EOF handling |
| Terminal checkbox UI | readline loops with ANSI codes | @inquirer/checkbox | TTY detection, arrow key handling, screen buffering, cross-platform terminal quirks |
| Platform detection | Simple file existence checks | Existing detectPlatform() | Handles priority hierarchy (env var > marker > filesystem), ambiguity warnings, edge cases |
| Config file merging | Object.assign() shallow merge | OpenCode does deep merge for non-conflicting keys | Arrays like `plugin` and `instructions` concatenate, not replace |

**Key insight:** Terminal UX libraries handle massive complexity (TTY detection, ANSI escape codes, screen buffering, input handling). Modern @inquirer/prompts ecosystem is battle-tested and TypeScript-native.

## Common Pitfalls

### Pitfall 1: Wrong OpenCode Config Path

**What goes wrong:** Code uses `~/.config/opencode/opencode.jsonc` but OpenCode actually looks for `opencode.json` (or both).

**Why it happens:** Documentation mentions both `.json` and `.jsonc` extensions, easy to assume one is preferred.

**How to avoid:**
- Research shows both extensions work (OpenCode's config loader is extension-agnostic)
- Phase 1 OpenCodePaths implementation uses placeholder paths that need verification
- **CORRECTED PATH:** Commands go in `.opencode/command/` (singular), not `.opencode/commands/` (plural)

**Warning signs:**
- Commands not discovered after installation
- Config changes not taking effect
- OpenCode can't find settings

### Pitfall 2: Treating OpenCode Config Like Claude Code settings.json

**What goes wrong:** Trying to register commands in config file's `command` section instead of copying files to command directory.

**Why it happens:** ClaudeCodeAdapter uses config-based hook registration, easy to assume commands work the same way.

**How to avoid:**
- OpenCode has TWO command definition methods:
  1. **File-based (RECOMMENDED):** Markdown files in `.opencode/command/` directory
  2. **Config-based (ALTERNATIVE):** Defined in `opencode.json` `command` object
- GSD should use file-based approach (matches Claude Code's file-copy pattern)
- Config `command` section is for template-based commands, not file registration

**Warning signs:**
- Commands in config but not showing in TUI
- Slash commands work in config but not when defined as files

### Pitfall 3: Non-Interactive Mode Silent Failure

**What goes wrong:** Installer runs in CI/Docker, falls back to default platform silently, user expects different platform.

**Why it happens:** TTY detection fails in certain environments (WSL2, Docker, SSH without PTY), script defaults without warning.

**How to avoid:**
- Always log which platform(s) being installed and WHY (explicit flag vs. TTY fallback vs. default)
- Example: `"Non-interactive terminal detected, defaulting to Claude Code (use --platform to override)"`
- Make `--platform` flag explicit in docs for CI/automation use cases

**Warning signs:**
- User reports "installed but commands not found"
- CI builds work locally but fail in pipeline

### Pitfall 4: Config Backup Overwriting

**What goes wrong:** Installing for both platforms backs up settings.json, then opencode.json overwrites backup.

**Why it happens:** Single backup file pattern from Phase 2 ClaudeCodeAdapter.

**How to avoid:**
- Platform-specific backup paths: `settings.json.backup` AND `opencode.json.backup`
- Don't assume single config file across platforms

**Warning signs:**
- User can't restore OpenCode config after failed install
- Backup file contains wrong platform's config

### Pitfall 5: Command Directory Structure Mismatch

**What goes wrong:** GSD commands copied to `~/.config/opencode/command/gsd/` but OpenCode expects flat structure in `command/`.

**Why it happens:** Claude Code uses `commands/gsd/` subdirectory for namespacing, easy to mirror this pattern.

**How to avoid:**
- **Research finding:** OpenCode supports nested command paths (e.g., `review/security.md` becomes `/review/security`)
- **DECISION NEEDED:** Does GSD want `/gsd:help` or `/help` on OpenCode?
  - Option A: Copy to `command/gsd-help.md` (flat, prefixed)
  - Option B: Copy to `command/gsd/help.md` (nested, like Claude Code)
  - **RECOMMENDATION:** Option B (nested) keeps command names consistent across platforms

**Warning signs:**
- Commands registered but show wrong names in TUI
- Nested directory structure not working

## Code Examples

Verified patterns from official sources:

### OpenCode Command File Format
```markdown
---
description: Show available GSD commands
agent: default
model: anthropic/claude-sonnet-4-5
---
<objective>
Display the complete GSD command reference.
[... rest of prompt ...]
</objective>
```
*Source: [OpenCode Commands Documentation](https://opencode.ai/docs/commands/)*

### OpenCode Config Structure (Minimal)
```jsonc
{
  // Model configuration
  "model": "anthropic/claude-sonnet-4-5",

  // Optional: Command definitions (alternative to file-based)
  "command": {
    "test": {
      "template": "Run the full test suite",
      "description": "Run tests with coverage",
      "agent": "build"
    }
  },

  // Optional: Plugins
  "plugin": ["some-npm-plugin"],

  // Optional: MCP servers
  "mcp": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "mcp-server-package"]
    }
  }
}
```
*Source: [OpenCode Config Documentation](https://opencode.ai/docs/config/)*

### Multi-Select Checkbox with @inquirer/prompts
```typescript
import { checkbox } from '@inquirer/prompts';

const platforms = await checkbox({
  message: 'Which platform(s) would you like to install for?',
  choices: [
    { name: 'Claude Code', value: 'claude-code', checked: false },
    { name: 'OpenCode', value: 'opencode', checked: false }
  ],
  required: true, // At least one must be selected
  pageSize: 7, // Default page size for lists
});

// Returns: string[] e.g. ['claude-code', 'opencode']
```
*Source: [Inquirer.js Checkbox README](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/checkbox/README.md)*

### TTY Detection Pattern
```javascript
// Check if stdin is interactive terminal
if (!process.stdin.isTTY) {
  console.log('Non-interactive terminal detected, using defaults');
  // Fall back to flag-based or default behavior
} else {
  // Show interactive prompts
}
```
*Source: Derived from existing install.js (lines 497-498)*

### JSONC Parsing with jsonc-parser
```typescript
import { parse } from 'jsonc-parser';

const configContent = fs.readFileSync('opencode.jsonc', 'utf8');
const config = parse(configContent); // Returns parsed object, strips comments

// Alternative: strip-json-comments (lightweight)
import stripComments from 'strip-json-comments';
const json = stripComments(configContent);
const config = JSON.parse(json);
```
*Source: [jsonc-parser npm documentation](https://www.npmjs.com/package/jsonc-parser)*

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| inquirer v9 (legacy) | @inquirer/prompts (modern) | 2023-2024 | Complete rewrite from ground up, smaller bundle, better TypeScript support, progressive migration path |
| Claude Code only | Multi-platform support | Phase 3 (2026) | Users can choose platform based on project needs, not tooling limitations |
| Hardcoded ~/.claude paths | Runtime platform detection | Phase 1 (2026) | Projects portable across platforms |
| Single install.js for Claude Code | Platform-aware installer | Phase 3 (2026) | Multi-select checkbox for platform choice, --platform flag for CI |

**Deprecated/outdated:**
- **inquirer v9.x (legacy):** Still maintained but not actively developed. Use @inquirer/prompts for new code.
- **Assumption that OpenCode uses `.opencode/commands/` (plural):** Actual path is `.opencode/command/` (singular).

## Open Questions

Things that couldn't be fully resolved:

1. **OpenCode version detection mechanism**
   - What we know: OpenCode has `--version` flag
   - What's unclear: How to programmatically detect OpenCode installation vs. just config directory existing
   - Recommendation: Phase 1 detection.ts checks for `~/.config/opencode/opencode.json` file existence. Add version check in Phase 3 if needed for compatibility validation.

2. **OpenCode hook registration format**
   - What we know: OpenCode config has hooks section (mentioned in config schema)
   - What's unclear: Exact format for SessionStart/StatusLine hooks (different from Claude Code's settings.json structure?)
   - Recommendation: Mark as Phase 5 concern (lifecycle hooks). Phase 3 only needs basic config read/write, not hook registration.

3. **Command name collision handling**
   - What we know: OpenCode discovers commands from filesystem, no explicit collision detection mentioned
   - What's unclear: What happens if user has `/help` command and GSD installs `/gsd/help.md`?
   - Recommendation: Use nested structure (`command/gsd/help.md`) to avoid collisions, same as Claude Code's approach.

4. **OpenCode's equivalent of .platform marker file**
   - What we know: Claude Code uses `.platform` marker for installation tracking
   - What's unclear: Where should .platform file go for OpenCode installs? (global config dir? project dir?)
   - Recommendation: Store in package installation directory (same location as Phase 1), not platform-specific. Single `.platform` file tracks which platform(s) are installed.

5. **Multi-platform installation to BOTH platforms simultaneously**
   - What we know: User can check both Claude Code AND OpenCode in installer
   - What's unclear: Should .platform marker contain comma-separated list? JSON array?
   - Recommendation: Store as newline-separated list for simplicity, or JSON array for formality. Decide during implementation.

## Sources

### Primary (HIGH confidence)

- [OpenCode Config Documentation](https://opencode.ai/docs/config/) - Official config schema and structure
- [OpenCode Commands Documentation](https://opencode.ai/docs/commands/) - Official command registration guide
- [@inquirer/checkbox npm](https://www.npmjs.com/package/@inquirer/checkbox) - Modern Inquirer checkbox API
- [Inquirer.js Checkbox README](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/checkbox/README.md) - TypeScript examples and API
- [jsonc-parser npm](https://www.npmjs.com/package/jsonc-parser) - Microsoft's official JSONC parser
- Existing codebase files:
  - `src/platform/adapters/claude-code.ts` - Phase 2 adapter pattern
  - `src/platform/paths.ts` - OpenCodePaths implementation (needs correction)
  - `bin/install.js` - Current installer structure

### Secondary (MEDIUM confidence)

- [OpenCode vs Claude Code comparison (NxCode)](https://www.nxcode.io/resources/news/opencode-vs-claude-code-vs-cursor-2026) - Platform differences
- [OpenCode vs Claude Code (Builder.io)](https://www.builder.io/blog/opencode-vs-claude-code) - Architecture comparison
- [OpenCode GitHub Repository](https://github.com/opencode-ai/opencode) - Project structure insights
- [@inquirer/prompts migration guide](https://www.npmjs.com/package/@inquirer/prompts) - Modern vs legacy API differences

### Tertiary (LOW confidence)

- WebSearch results about OpenCode installation verification - No explicit verification API documented, use file existence checks
- DeepWiki OpenCode documentation aggregations - Secondary sources, defer to official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @inquirer/checkbox and jsonc-parser are well-documented with clear examples
- Architecture: MEDIUM - OpenCode adapter pattern derived from Claude Code adapter (proven), but OpenCode-specific implementation details need verification during development
- Pitfalls: MEDIUM - Config path corrections from research, but some edge cases (multi-platform backup, command collisions) need testing
- Command registration: HIGH - Official OpenCode docs clearly show file-based discovery from `.opencode/command/` directory
- Platform detection: LOW - Current OpenCodePaths implementation has incorrect assumptions (plural "commands" vs singular "command")

**Research date:** 2026-01-21
**Valid until:** ~30 days (OpenCode stable, @inquirer ecosystem stable, low churn expected)

## Critical Path Items for Planner

**MUST FIX in Phase 3:**
1. **Correct OpenCodePaths.getCommandsDir()** - Currently returns `commands/` (plural), should return `command/` (singular)
2. **Add JSONC parsing dependency** - `npm install jsonc-parser` for OpenCode config read/write
3. **Add @inquirer/checkbox dependency** - `npm install @inquirer/checkbox` for installer TUI
4. **Create OpenCodeAdapter** - Mirror ClaudeCodeAdapter's ultra-minimal Phase 2 pattern

**IMPLEMENTATION SCOPE for Phase 3:**
- **Config read/write:** Simple JSONC parse/stringify wrapper (like ClaudeCodeAdapter's JSON wrapper)
- **Path methods:** Delegate to OpenCodePaths (after fixing command directory path)
- **Hook registration:** STUB with "Phase 5" error message (hooks deferred)
- **Command registration:** STUB with "install.js handles command copying" error (file-copy logic stays in install.js)
- **Agent spawning:** STUB with "Phase 4" error message (agent spawning deferred)

**NON-AGENT COMMANDS that must work on OpenCode:**
From CONTEXT.md: `/gsd:help`, `/gsd:progress`, `/gsd:settings`, `/gsd:new-project` (manual PROJECT.md only), `/gsd:plan-phase` (user-written plans)

These commands don't spawn agents, so Phase 3 adapter is sufficient.

**INSTALLER CHANGES:**
1. Add platform selection TUI (checkbox, required, none pre-selected)
2. Add `--platform` flag support (claude-code | opencode | both)
3. Loop over selected platforms and call install() for each
4. Platform-specific backup files (`settings.json.backup`, `opencode.json.backup`)
5. Update help text with multi-platform examples

**VERIFICATION:**
After install completes, check:
- Commands exist in `~/.config/opencode/command/gsd/` (nested structure)
- Config file exists at `~/.config/opencode/opencode.json`
- .platform marker file written with selected platform(s)
- Backup files created if configs existed
