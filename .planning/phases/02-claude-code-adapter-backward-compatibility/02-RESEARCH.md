# Phase 2: Claude Code Adapter & Backward Compatibility - Research

**Researched:** 2026-01-20
**Domain:** TypeScript adapter pattern, Node.js configuration management, installation script design
**Confidence:** HIGH

## Summary

This research investigated the technical domains needed to implement the ClaudeCodeAdapter (PlatformAdapter interface implementation) and refactor the existing install.js installer to ensure zero regression for 1.6k+ existing GSD users upgrading from v1.x to v2.x.

The standard approach combines:
1. **TypeScript adapter pattern** - Encapsulating platform-specific logic behind a common interface while preserving exact v1.x behavior
2. **Deep merge configuration** - Using native approaches or lightweight libraries to preserve existing user settings when merging hooks/statusLine configuration
3. **Simple string templating** - Native JavaScript string replacement for command file placeholders ({{config_dir}}, {{commands_dir}})
4. **Atomic file operations** - Write-then-rename pattern for critical configuration changes with backup-before-modify
5. **Non-interactive detection** - TTY checking for CI/Docker environments with safe defaults

**Primary recommendation:** Use native Node.js capabilities for all core operations (no runtime dependencies), implement adapter methods directly in TypeScript targeting existing install.js patterns, and leverage simple string.replace() for template rendering to maintain zero-dependency runtime.

## Standard Stack

The established libraries/tools for implementing adapter patterns and installation scripts in TypeScript/Node.js:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.3+ | Type-safe adapter implementation | Industry standard for Node.js type safety, native support in Node 22+ |
| Node.js fs/promises | Built-in | Async file operations | Native API, no dependencies, Promise-based |
| Node.js path | Built-in | Path manipulation | Native, cross-platform path handling |

### Supporting (Optional - NOT needed for Phase 2)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/deepmerge | Latest | High-performance object merging | If native merge proves insufficient (605k ops/sec vs lodash 89k) |
| jsonc-parser | 3.3+ | JSONC parsing for OpenCode | Phase 3 only - OpenCode uses opencode.jsonc format |
| write-file-atomic | Latest | Atomic writes with temp+rename | Only if backup strategy needs enhancement |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native string.replace() | string-template npm | Adds dependency for simple {{placeholder}} replacement |
| Native object spread | deepmerge/lodash.merge | Simple spread is shallow; deep merge needed for nested config |
| Manual adapter implementation | Code generation | Over-engineered for single adapter implementation |

**Installation:**
```bash
# Already satisfied by existing package.json
npm install --save-dev typescript @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/platform/
├── types.ts              # Platform type definitions
├── detection.ts          # Runtime platform detection
├── paths.ts              # Path resolution (ClaudeCodePaths class)
├── adapter.ts            # PlatformAdapter interface (360 lines)
├── adapters/             # NEW: Adapter implementations
│   └── claude-code.ts    # ClaudeCodeAdapter (Phase 2)
├── registry.ts           # Platform adapter registry
└── install-adapter.ts    # Installation-time bridge

bin/
└── install.js            # REFACTOR: Use adapter methods

commands/gsd/
└── *.md                  # REFACTOR: Add {{placeholders}}
```

### Pattern 1: Adapter Pattern with Interface Segregation

**What:** Implement PlatformAdapter interface methods to encapsulate all Claude Code-specific logic (settings.json, hooks, commands) while preserving exact v1.x behavior.

**When to use:** When supporting multiple platforms that share a common abstraction but have different implementation details.

**Example:**
```typescript
// Source: Adapter pattern best practices from refactoring.guru
export class ClaudeCodeAdapter implements PlatformAdapter {
  readonly name: PlatformType = 'claude-code';
  readonly version: string;

  // Inherit path resolution from ClaudeCodePaths
  private paths: ClaudeCodePaths;

  constructor() {
    this.paths = new ClaudeCodePaths();
    this.version = this.readVersionFromPackageJson();
  }

  // PathResolver interface methods (delegated)
  getConfigDir(): string { return this.paths.getConfigDir(); }
  getCommandsDir(): string { return this.paths.getCommandsDir(); }
  getAgentsDir(): string { return this.paths.getAgentsDir(); }
  getHooksDir(): string { return this.paths.getHooksDir(); }

  // Configuration management
  async readConfig(): Promise<Record<string, any>> {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');
    if (!fs.existsSync(settingsPath)) return {};

    const content = await fs.promises.readFile(settingsPath, 'utf8');
    return JSON.parse(content);
  }

  async writeConfig(config: Record<string, any>): Promise<void> {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');

    // INST-05: Backup before modifying
    await this.backupFile(settingsPath);

    // Format with 2-space indent, trailing newline (match v1.x)
    const content = JSON.stringify(config, null, 2) + '\n';
    await fs.promises.writeFile(settingsPath, content, 'utf8');
  }

  async mergeConfig(updates: Record<string, any>): Promise<void> {
    const existing = await this.readConfig();
    const merged = this.deepMerge(existing, updates);
    await this.writeConfig(merged);
  }

  // Hook registration
  async registerHook(hookType: HookType, hookPath: string): Promise<void> {
    const config = await this.readConfig();

    if (!config.hooks) config.hooks = {};
    if (!config.hooks[hookType]) config.hooks[hookType] = [];

    // Idempotency: check if hook already registered
    const alreadyExists = config.hooks[hookType].some((entry: any) =>
      entry.hooks?.some((h: any) => h.command?.includes(path.basename(hookPath)))
    );

    if (!alreadyExists) {
      config.hooks[hookType].push({
        hooks: [{ type: 'command', command: hookPath }]
      });
    }

    await this.writeConfig(config);
  }

  // Command registration
  async registerCommand(commandPath: string): Promise<void> {
    const commandName = path.basename(commandPath);
    const destPath = path.join(this.getCommandsDir(), commandName);

    // INST-03: Collision detection
    if (fs.existsSync(destPath)) {
      const existing = await fs.promises.readFile(destPath, 'utf8');
      const newContent = await fs.promises.readFile(commandPath, 'utf8');

      // Allow if content is identical (re-installation)
      if (existing === newContent) return;

      throw new Error(
        `Command collision: ${commandName} already exists at ${destPath}`
      );
    }

    // Copy command file
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.copyFile(commandPath, destPath);
  }

  // Platform capabilities
  supportsParallelAgents(): boolean { return true; }
  supportsStatusLine(): boolean { return true; }
  supportsHooks(): boolean { return true; }

  // Helper methods
  private deepMerge(target: any, source: any): any {
    // Native implementation for Phase 2 (can optimize later)
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private async backupFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    const backupPath = `${filePath}.backup`;
    await fs.promises.copyFile(filePath, backupPath);
  }
}
```

### Pattern 2: Template Rendering with Simple String Replacement

**What:** Replace {{placeholder}} tokens in command markdown files during installation with actual platform-specific paths.

**When to use:** When commands need to reference platform directories but must remain platform-agnostic in source.

**Example:**
```typescript
// Simple native approach - no dependencies needed
async function renderTemplate(
  templateContent: string,
  variables: Record<string, string>
): Promise<string> {
  let rendered = templateContent;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  }

  return rendered;
}

// Usage during installation
const templateVars = {
  config_dir: adapter.getConfigDir().replace(os.homedir(), '~'),
  commands_dir: adapter.getCommandsDir().replace(os.homedir(), '~'),
  agents_dir: adapter.getAgentsDir().replace(os.homedir(), '~'),
  hooks_dir: adapter.getHooksDir().replace(os.homedir(), '~'),
};

const commandContent = await fs.promises.readFile(sourceFile, 'utf8');
const rendered = await renderTemplate(commandContent, templateVars);
await fs.promises.writeFile(destFile, rendered);
```

### Pattern 3: Non-Interactive Installation Detection

**What:** Detect CI/Docker environments by checking process.stdin.isTTY and provide safe defaults.

**When to use:** Installation scripts that normally prompt users but must support automated environments.

**Example:**
```typescript
// Source: install.js lines 484-490 (existing pattern)
function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}

function promptOrDefault<T>(
  question: string,
  defaultValue: T,
  interactive: boolean
): Promise<T> {
  if (!interactive) {
    console.log(`Non-interactive mode: using default (${defaultValue})`);
    return Promise.resolve(defaultValue);
  }

  // Use readline for interactive prompting
  return promptUser(question, defaultValue);
}
```

### Pattern 4: Best-Effort Installation with Partial Success

**What:** Continue installing components even if individual steps fail, collecting failures for final reporting.

**When to use:** Installation scripts where partial success is better than complete failure.

**Example:**
```typescript
// Source: install.js lines 263-362 (existing pattern)
const failures: string[] = [];

try {
  await installCommands();
  console.log('✓ Installed commands');
} catch (error) {
  failures.push('commands');
  console.error(`✗ Failed to install commands: ${error.message}`);
}

try {
  await installHooks();
  console.log('✓ Installed hooks');
} catch (error) {
  failures.push('hooks');
  console.error(`✗ Failed to install hooks: ${error.message}`);
}

// Continue for all components...

if (failures.length > 0) {
  console.error(`Installation incomplete. Failed: ${failures.join(', ')}`);
  process.exit(1);
}
```

### Anti-Patterns to Avoid

- **Global state in adapters:** Adapters should be stateless or use instance state only. Don't modify global process.env within adapter methods.
- **Synchronous fs operations in production code:** Use fs.promises for all file operations. Only use fs.existsSync() for quick checks before async operations.
- **Deep merge with Object.assign():** Object.assign and spread operators create shallow merges. Nested config requires recursive merge.
- **Template libraries for simple placeholders:** String.replace() is sufficient for {{key}} replacement. Don't add Handlebars/Mustache dependencies.
- **git add . in installation:** Always stage files explicitly by path to avoid unintended commits.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep object merging | Custom recursive function | Native approach first, @fastify/deepmerge if needed | Handles edge cases (arrays, null, circular refs), 605k ops/sec performance |
| JSONC parsing | Regex-based comment stripping | Built-in JSON.parse for Phase 2, jsonc-parser for Phase 3 | Handles edge cases (comments in strings, nested structures) |
| Atomic file writes | Write-then-check pattern | write-file-atomic or native temp+rename | Prevents corruption on crash/SIGKILL during write |
| Semantic versioning | String splitting/parsing | semver npm package (if needed) | Handles pre-release tags, version ranges, edge cases |
| Path collision detection | Case-sensitive string compare | Normalize paths with path.normalize() + case folding | Handles case-insensitive filesystems (Windows, macOS) |

**Key insight:** Configuration file merging is deceptively complex. Settings.json has nested hooks arrays with objects containing arrays of hook definitions. Shallow merge destroys existing hooks. Use proven deep merge implementation.

## Common Pitfalls

### Pitfall 1: Shallow Merge Destroys Existing Configuration

**What goes wrong:** Using Object.assign() or spread operator to merge settings.json overwrites entire hooks object, deleting user's existing hooks.

**Why it happens:** Developers assume simple merge is sufficient, not realizing nested structure of settings.json.

**How to avoid:**
- Use recursive deep merge for all configuration updates
- Test merge with existing settings containing hooks, statusLine, other user customizations
- Preserve arrays by concatenating, not replacing (or use last-wins for non-array values)

**Warning signs:**
- User reports hooks disappeared after upgrade
- Settings.json contains only GSD hooks after installation
- Existing statusLine configuration was replaced

### Pitfall 2: Race Conditions in File Operations

**What goes wrong:** Check-then-write pattern creates window where another process can create/delete file between check and write.

**Why it happens:** Developer checks fs.existsSync() then writes, assuming file state won't change.

**How to avoid:**
- Use atomic operations: write to temp file, verify, rename (atomic on POSIX)
- For backups: copy file, catch ENOENT if it doesn't exist
- For collision detection: try open with 'wx' flag (exclusive write)

**Warning signs:**
- Intermittent "file not found" errors in CI environments
- Settings backup sometimes missing despite existsSync check
- Configuration corruption in rare cases

### Pitfall 3: Template Placeholders in Committed Files

**What goes wrong:** Commands in ~/.claude/commands/gsd/ contain {{config_dir}} placeholders instead of actual paths, causing runtime errors.

**Why it happens:** Template rendering was skipped or failed during installation.

**How to avoid:**
- Render templates during copyWithPathReplacement in install.js
- Verify rendered content doesn't contain {{ before writing
- Test installation by checking installed command files for placeholders

**Warning signs:**
- Commands reference `@{{config_dir}}/get-shit-done/...` in installed location
- File not found errors when commands try to load execution context
- Grep for `{{` in ~/.claude/commands/gsd/*.md finds matches

### Pitfall 4: Assuming TTY for Interactive Prompts

**What goes wrong:** Installation hangs indefinitely in Docker/CI because readline waits for stdin that never arrives.

**Why it happens:** Developer uses readline.question() without checking process.stdin.isTTY.

**How to avoid:**
- Check process.stdin.isTTY before any interactive prompts
- Provide sensible defaults for all prompts
- Document --global and --local flags for non-interactive use
- Handle stdin close event (npx in WSL2 may close stdin early)

**Warning signs:**
- Installation hangs in Docker build
- CI pipeline times out during npm install
- WSL2 users report installation hangs

### Pitfall 5: Not Preserving User's Existing Commands

**What goes wrong:** Installation deletes user's custom commands in ~/.claude/commands/gsd/ by wiping directory before copy.

**Why it happens:** copyWithPathReplacement uses fs.rmSync(destDir, {recursive: true}) to clean install.

**How to avoid:**
- Only delete known GSD files (gsd-*.md pattern)
- Preserve files that don't match GSD naming convention
- Warn user if unknown files detected in commands/gsd/
- Or use different directory (commands/gsd-official/) to avoid collision

**Warning signs:**
- User reports custom commands disappeared after upgrade
- GitHub issues about lost work
- Commands directory completely empty then repopulated

### Pitfall 6: Forgetting to Backup Configuration

**What goes wrong:** Installation corrupts settings.json and user has no way to recover.

**Why it happens:** Developer forgot to backup before writeConfig, or backup failed silently.

**How to avoid:**
- ALWAYS backup before modifying settings.json (INST-05 requirement)
- Verify backup was created successfully
- Use timestamped backups for multiple installations (settings.json.backup-TIMESTAMP)
- Catch backup errors and abort installation if backup fails

**Warning signs:**
- No settings.json.backup file after installation
- Corrupted settings.json with no recovery option
- User forced to manually recreate settings

## Code Examples

Verified patterns from official sources and existing codebase:

### Deep Merge for Nested Configuration

```typescript
// Native approach (sufficient for Phase 2, can optimize later)
// Source: Adapted from existing install.js patterns
function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Usage
const existing = await readConfig();
const merged = deepMerge(existing, {
  hooks: {
    SessionStart: [
      { hooks: [{ type: 'command', command: 'node ~/.claude/hooks/gsd-check-update.js' }] }
    ]
  }
});
await writeConfig(merged);
```

### Hook Registration with Idempotency

```typescript
// Source: install.js lines 375-397 (existing pattern, to be moved to adapter)
async function registerHook(
  hookType: 'SessionStart' | 'StatusLine',
  hookCommand: string
): Promise<void> {
  const config = await this.readConfig();

  if (!config.hooks) config.hooks = {};
  if (!config.hooks[hookType]) config.hooks[hookType] = [];

  // Check if hook already exists (idempotency)
  const hookIdentifier = hookCommand.includes('/')
    ? path.basename(hookCommand)
    : hookCommand;

  const alreadyRegistered = config.hooks[hookType].some((entry: any) =>
    entry.hooks?.some((h: any) =>
      h.command && h.command.includes(hookIdentifier)
    )
  );

  if (!alreadyRegistered) {
    config.hooks[hookType].push({
      hooks: [
        {
          type: 'command',
          command: hookCommand
        }
      ]
    });

    await this.writeConfig(config);
    return true; // Hook was added
  }

  return false; // Hook already existed
}
```

### Command File Templating

```typescript
// Source: install.js lines 144-153 (copyWithPathReplacement pattern)
async function installCommand(
  sourcePath: string,
  destPath: string,
  pathPrefix: string
): Promise<void> {
  let content = await fs.promises.readFile(sourcePath, 'utf8');

  // Replace hardcoded ~/.claude/ references with platform-specific prefix
  // In Phase 2: pathPrefix = '~/.claude/' (Claude Code)
  // In Phase 3: pathPrefix could be '~/.config/opencode/' (OpenCode)
  content = content.replace(/~\/\.claude\//g, pathPrefix);

  // Verify no placeholders remain
  if (content.includes('{{')) {
    throw new Error(
      `Template rendering incomplete: ${sourcePath} still contains placeholders`
    );
  }

  await fs.promises.writeFile(destPath, content);
}
```

### Orphaned File Cleanup

```typescript
// Source: install.js lines 158-170 (existing pattern)
async function cleanupOrphanedFiles(configDir: string): Promise<void> {
  const orphanedFiles = [
    'hooks/gsd-notify.sh',  // Removed in v1.6.x
    // Add other known orphaned files here
  ];

  for (const relPath of orphanedFiles) {
    const fullPath = path.join(configDir, relPath);

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log(`✓ Removed orphaned ${relPath}`);
    }
  }
}
```

### Collision Detection for Commands

```typescript
// Pattern: Check before copy, allow re-installation if content matches
async function registerCommand(commandPath: string): Promise<void> {
  const commandName = path.basename(commandPath);
  const destPath = path.join(this.getCommandsDir(), commandName);

  if (fs.existsSync(destPath)) {
    // Read both files to compare
    const existing = await fs.promises.readFile(destPath, 'utf8');
    const newContent = await fs.promises.readFile(commandPath, 'utf8');

    // Allow if content is identical (re-installation/upgrade)
    if (existing === newContent) {
      return; // Already installed with same content
    }

    // Collision: different content
    throw new Error(
      `Command collision: ${commandName} already exists with different content.\n` +
      `Location: ${destPath}\n` +
      `Use --force to overwrite or manually review the conflict.`
    );
  }

  // No collision, install normally
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.copyFile(commandPath, destPath);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node for TypeScript execution | Native Node.js type stripping | Node 22.18.0 (July 2025) | Zero dependency TypeScript execution with --experimental-strip-types |
| lodash.merge for deep merging | @fastify/deepmerge or native | 2024-2025 | 6.8x performance improvement (605k vs 89k ops/sec) |
| Handlebars/Mustache for templates | Native string.replace() | Always | Simple {{key}} replacement doesn't need templating library |
| fs.existsSync + fs.writeFileSync | fs.promises with await | Node 10+ (2018) | Non-blocking I/O, better error handling |
| Manual recursive directory copy | fs.cp(src, dest, {recursive: true}) | Node 16.7.0 (2021) | Native recursive copy, simpler code |

**Deprecated/outdated:**
- **fs.exists()**: Deprecated since Node 1.0.0 - use fs.existsSync() for sync checks or fs.access() for async
- **new Buffer()**: Deprecated since Node 6.0.0 - use Buffer.from() or Buffer.alloc()
- **process.binding()**: Deprecated - use public APIs instead

## Open Questions

Things that couldn't be fully resolved:

1. **Hook array merge strategy**
   - What we know: Settings.json hooks are arrays of entries, each with a hooks array. Deep merge handles objects, but arrays have merge semantics (concat vs replace).
   - What's unclear: Should we concat SessionStart hook arrays or replace? What if user has 10 SessionStart hooks?
   - Recommendation: Concat arrays during merge (preserve all hooks), but implement idempotency check to prevent duplicate GSD hooks. Test with realistic settings.json containing multiple hooks.

2. **Optimal backup naming convention**
   - What we know: install.js uses settings.json.backup (single backup, gets overwritten on re-install)
   - What's unclear: Should we use timestamped backups (settings.json.backup-20260120-1430) to preserve multiple installation attempts?
   - Recommendation: Start with simple .backup suffix (match v1.x behavior exactly). Can enhance later if users request it. Document that backup gets overwritten on re-install.

3. **Command collision resolution strategy**
   - What we know: Current install.js deletes entire commands/gsd/ directory, preventing collisions but also deleting user customizations
   - What's unclear: How to handle user who modified a GSD command file? Overwrite silently? Prompt? Skip?
   - Recommendation: Phase 2 - preserve v1.x behavior (delete and reinstall). Phase 3+ - consider collision detection with content comparison, allow skip/overwrite/backup.

4. **Settings.json formatting preservation**
   - What we know: JSON.stringify(config, null, 2) + '\n' matches current formatting
   - What's unclear: What if user manually formatted settings.json with different spacing, or added comments (JSONC)?
   - Recommendation: Phase 2 - use standard formatting (2 spaces, trailing newline). Comments aren't valid in settings.json anyway. Phase 3 - consider preserving user formatting if OpenCode uses JSONC.

## Sources

### Primary (HIGH confidence)

- [TypeScript Adapter Pattern - refactoring.guru](https://refactoring.guru/design-patterns/adapter/typescript/example)
- [Microsoft JSONC Parser - GitHub](https://github.com/microsoft/node-jsonc-parser)
- [Node.js File System API](https://nodejs.org/api/fs.html)
- [Claude Code Hooks Configuration Guide](https://code.claude.com/docs/en/hooks-guide)
- [Semantic Versioning 2.0.0](https://semver.org/)
- Existing codebase: bin/install.js (557 lines), src/platform/adapter.ts (360 lines)

### Secondary (MEDIUM confidence)

- [@fastify/deepmerge performance comparison](https://npm-compare.com/deepmerge,lodash.merge,merge-deep,merge-options,object-assign-deep)
- [Node.js atomic file operations - write-file-atomic](https://github.com/npm/write-file-atomic)
- [Native TypeScript execution in Node.js 22.18+](https://betterstack.com/community/guides/scaling-nodejs/ts-node-alternatives/)
- [CI/CD Best Practices for Node.js](https://developers.redhat.com/articles/2023/11/01/cicd-best-practices-nodejs)
- [Settings.json Claude Code Developer Guide](https://www.eesel.ai/blog/settings-json-claude-code)

### Tertiary (LOW confidence - WebSearch only)

- [Template string libraries comparison](https://www.npmjs.com/search?q=keywords:string-template)
- [Docker Node.js best practices](https://betterstack.com/community/guides/scaling-nodejs/dockerize-nodejs/)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TypeScript and Node.js built-ins verified through official documentation
- Architecture patterns: HIGH - Adapter pattern sourced from authoritative refactoring.guru, existing codebase validates approach
- Pitfalls: HIGH - Directly observed in install.js (race conditions, TTY checking, backup logic) and verified through Node.js docs
- Deep merge: MEDIUM - @fastify/deepmerge performance verified via npm-compare, but not yet tested with GSD settings.json structure
- Template rendering: HIGH - Simple string.replace() sufficient for {{placeholder}} pattern, verified in existing install.js
- Hook configuration format: HIGH - Claude Code official documentation provides authoritative format specification

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable Node.js/TypeScript ecosystem)

**Critical findings for planner:**
1. Zero runtime dependencies possible - use native Node.js fs/promises, path, string operations
2. Deep merge is critical - shallow merge will destroy user's existing hooks
3. Template rendering is simple - don't overcomplicate with template libraries
4. Backup-before-modify is mandatory - INST-05 requirement, prevents data loss
5. Idempotency in hook registration prevents duplicate hooks on re-install
6. TTY detection essential for CI/Docker support
7. Best-effort installation with failure collection better than all-or-nothing
